const first = { order: -Infinity };
const last = { order: Infinity };

// other-player tracking, plus the shared status/name/level/death/life/abnormality
// dispatch for "me" (packets like S_USER_STATUS fire for both, not just others)
class Players {
    constructor(dispatch, mods) {
        const { util, me } = mods;

        this.list = new Map();
        const list = this.list;

        const resolveTarget = gameId => (me.is(gameId) ? me : list.get(gameId));

        dispatch.hook('S_GET_USER_LIST', '*', first, () => list.clear());
        dispatch.hook('S_LOAD_TOPO', '*', first, () => list.clear());

        dispatch.hook('S_SPAWN_USER', '*', first, e => {
            const decoded = util.deriveClassRaceGender(e.templateId);
            list.set(e.gameId, {
                gameId: e.gameId,
                name: e.name,
                guild: e.guildName,
                templateId: e.templateId,
                class: decoded.class,
                race: decoded.race,
                gender: decoded.gender,
                serverId: e.serverId,
                playerId: e.playerId,
                level: e.level,
                gm: e.gm,
                alive: e.alive,
                status: e.status,
                inCombat: e.status === 1,
                loc: e.loc,
                w: e.w,
                relation: e.relation,
                effects: new Map()
            });
        });

        dispatch.hook('S_DESPAWN_USER', '*', last, e => {
            // short grace period so any straggling packet for this gameId can
            // still resolve against the record before it disappears
            dispatch.setTimeout(() => list.delete(e.gameId), 1000);
        });

        dispatch.hook('S_USER_LOCATION', '*', first, e => {
            const p = list.get(e.gameId);
            if (!p) return;
            p.loc = util.getCenterLoc(e.loc, e.dest);
            p.w = e.w;
        });

        dispatch.hook('S_USER_LOCATION_IN_ACTION', '*', first, e => {
            const p = list.get(e.gameId);
            if (!p) return;
            p.loc = e.loc;
            p.w = e.w;
        });

        dispatch.hook('S_USER_STATUS', '*', first, e => {
            const target = resolveTarget(e.gameId);
            if (!target) return;
            target.status = e.status;
            target.inCombat = e.status === 1;
        });

        dispatch.hook('S_DEAD_LOCATION', '*', first, e => {
            if (e.type !== 5) return; // 1 = out of view, 5 = dead. only 5 is a real death
            const target = resolveTarget(e.gameId);
            if (!target) return;
            target.alive = false;
            target.loc = e.loc;
        });

        dispatch.hook('S_CREATURE_LIFE', '*', first, e => {
            const target = resolveTarget(e.gameId);
            if (!target) return;
            target.alive = e.alive;
        });

        dispatch.hook('S_USER_LEVELUP', '*', first, e => {
            const target = resolveTarget(e.gameId);
            if (!target) return;
            target.level = e.level;
        });

        dispatch.hook('S_USER_CHANGE_NAME', '*', first, e => {
            const target = resolveTarget(e.gameId);
            if (!target) return;
            target.name = e.name;
        });

        dispatch.hook('S_ABNORMALITY_BEGIN', '*', first, e => {
            const target = resolveTarget(e.target);
            if (!target) return;
            target.effects.set(e.id, {
                id: e.id,
                duration: e.duration,
                stacks: e.stacks,
                source: e.source,
                hitCylinderId: e.hitCylinderId,
                endTime: Date.now() + Number(e.duration)
            });
        });

        dispatch.hook('S_ABNORMALITY_REFRESH', '*', first, e => {
            const target = resolveTarget(e.target);
            if (!target) return;
            const existing = target.effects.get(e.id);
            if (existing) {
                existing.duration = e.duration;
                existing.stacks = e.stacks;
                existing.endTime = Date.now() + Number(e.duration);
            } else {
                target.effects.set(e.id, {
                    id: e.id,
                    duration: e.duration,
                    stacks: e.stacks,
                    source: null,
                    hitCylinderId: null,
                    endTime: Date.now() + Number(e.duration)
                });
            }
        });

        dispatch.hook('S_ABNORMALITY_END', '*', first, e => {
            const target = resolveTarget(e.target);
            if (!target) return;
            target.effects.delete(e.id);
        });
    }
}

module.exports = Players;
