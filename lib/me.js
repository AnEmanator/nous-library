const first = { order: -Infinity };
const last = { order: Infinity };

// outgoing packets that already carry our own position. reading these gives
// zero-latency self-location, no need to wait on a server echo. confirmed
// against _temp/definitions: all ten carry loc, only C_PLAYER_FLYING_LOCATION
// lacks w (hence the `e.w ? e.w : this.w` guard below, not dead code)
const selfLocationPackets = [
    'C_START_SKILL',
    'C_START_TARGETED_SKILL',
    'C_START_COMBO_INSTANT_SKILL',
    'C_START_INSTANCE_SKILL',
    'C_START_INSTANCE_SKILL_EX',
    'C_PRESS_SKILL',
    'C_NOTIFY_LOCATION_IN_ACTION',
    'C_NOTIFY_LOCATION_IN_DASH',
    'C_PLAYER_LOCATION',
    'C_PLAYER_FLYING_LOCATION'
];

// self tracking. fields live directly on `this` and are only ever mutated in
// place, never reassigned wholesale, so a reference another mod cached stays
// live for the whole connection
class Me {
    constructor(dispatch, mods) {
        const { util } = mods;

        this.gameId = null;
        this.name = null;
        this.templateId = null;
        this.class = null;
        this.race = null;
        this.gender = null;
        this.serverId = null;
        this.playerId = null;
        this.level = null;
        this.gm = false;
        this.alive = true;
        this.status = 0;
        this.inCombat = false;
        this.zone = null;
        this.inDungeon = false;
        this.channel = null;
        this.mounted = false;
        this.mountId = null;
        this.mountSkill = null;
        this.loc = { x: 0, y: 0, z: 0 };
        this.w = 0;
        this.stats = {};
        this.effects = new Map();

        this.is = gameId => this.gameId !== null && this.gameId === gameId;

        // live getter, not a stored field, so it never needs invalidation when
        // stats/class change (both already tracked in place above)
        Object.defineProperty(this, 'aspd', {
            get: () => ((this.stats.attackSpeed || 0) + (this.stats.attackSpeedBonus || 0)) / util.aspdDivider(this.class),
            enumerable: true
        });

        let pendingCharacters = null;
        let reactionPosTimer = null;

        dispatch.hook('S_GET_USER_LIST', '*', first, e => {
            this.stats = {};
            this.effects.clear();
            pendingCharacters = e.characters;
        });

        dispatch.hook('S_LOGIN', '*', first, e => {
            const decoded = util.deriveClassRaceGender(e.templateId);

            this.name = e.name;
            this.gameId = e.gameId;
            this.templateId = e.templateId;
            this.class = decoded.class;
            this.race = decoded.race;
            this.gender = decoded.gender;
            this.serverId = e.serverId;
            this.playerId = e.playerId;
            this.level = e.level;
            this.alive = e.alive;
            this.status = e.status;
            this.inCombat = e.status === 1;

            this.gm = false;
            if (pendingCharacters) {
                const mine = pendingCharacters.find(c => c.name === e.name);
                if (mine) this.gm = mine.adminLevel > 0;
            }

            // re-login/re-zone shouldn't stack up parallel tick loops
            dispatch.clearInterval(reactionPosTimer);
            reactionPosTimer = dispatch.setInterval(() => {
                dispatch.send('S_REQUEST_REACTION_POS_TICK', '*', { tick: 25n });
            }, 1000);
        });

        dispatch.hook('S_LOAD_TOPO', '*', first, e => {
            this.zone = e.zone;
            this.inDungeon = util.dungeonZones.includes(e.zone);
            this.loc = e.loc;
            if (this.mounted && !e.quick) this.mounted = false;
        });

        dispatch.hook('S_CURRENT_CHANNEL', '*', first, e => {
            this.channel = e.channel;
        });

        dispatch.hook('S_MOUNT_VEHICLE', '*', last, e => {
            if (!this.is(e.gameId)) return;
            this.mounted = true;
            this.mountId = e.id;
            this.mountSkill = e.skill;
        });

        dispatch.hook('S_UNMOUNT_VEHICLE', '*', last, e => {
            if (!this.is(e.gameId)) return;
            this.mounted = false;
        });

        dispatch.hook('S_SPAWN_ME', '*', last, e => {
            this.loc = e.loc;
            this.w = e.w;
            this.alive = e.alive;
        });

        // huge, self-describing packet (hp/mp/level/status/alive/stamina/attackSpeed/...),
        // wholesale assignment is correct here, not a shortcut
        dispatch.hook('S_PLAYER_STAT_UPDATE', '*', first, e => {
            this.stats = e;
        });

        dispatch.hook('S_CREATURE_CHANGE_HP', '*', first, e => {
            if (!this.is(e.target)) return;
            this.stats.hp = e.curHp;
            this.stats.maxHp = e.maxHp;
        });

        dispatch.hook('S_PLAYER_CHANGE_MP', '*', first, e => {
            if (!this.is(e.target)) return;
            this.stats.mp = e.currentMp;
            this.stats.maxMp = e.maxMp;
        });

        // self-only, no gameId field. fires far more often than S_PLAYER_STAT_UPDATE
        // for this one value (RE/willpower/chi - whatever the class's own resource is
        // called, S_PLAYER_STAT_UPDATE's own "stamina" field, not "condition" which is
        // the universal sprint/dodge bar despite its confusing english label)
        dispatch.hook('S_PLAYER_CHANGE_STAMINA', '*', first, e => {
            this.stats.stamina = e.current;
            this.stats.staminaMax = e.max;
        });

        dispatch.hook('S_PLAYER_CHANGE_ACTPOINT', '*', first, e => {
            this.stats.adventureCoins = e.amount;
            this.stats.adventureCoinsMax = e.total;
        });

        // S_USER_STATUS/S_DEAD_LOCATION/S_CREATURE_LIFE/abnormalities also apply to
        // other players, not just self. players.js owns those as one shared dispatch
        // per packet (resolving to `this` or a tracked player) instead of duplicating
        // the handler here and there

        for (const packet of selfLocationPackets) {
            dispatch.hook(packet, '*', first, e => {
                this.loc = e.loc;
                if (e.w) this.w = e.w;
            });
        }

        // reaction-pos handshake: the fabricated tick request above makes the
        // client report its own position back via C_UPDATE_REACTION_POS. treat
        // that self-report as authoritative, then swallow it, the real server
        // never asked for it and shouldn't see an unsolicited reaction-pos update
        dispatch.hook('C_UPDATE_REACTION_POS', '*', { filter: { silenced: null }, order: Infinity }, e => {
            this.loc = e.loc;
            return false;
        });
    }
}

module.exports = Me;
