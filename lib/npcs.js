const first = { order: -Infinity };
const last = { order: Infinity };

// npc + boss tracking. every spawned npc is tracked, no relevance filtering.
// boss is whichever npc last had a boss gauge packet fire for it
class Npcs {
    constructor(dispatch, mods) {
        const { util } = mods;

        this.list = new Map();
        this.boss = null;

        const list = this.list;
        let bossInterval = null;
        let bossTimeout = null;

        const clearBossTimers = () => {
            dispatch.clearInterval(bossInterval);
            dispatch.clearTimeout(bossTimeout);
        };

        dispatch.hook('S_GET_USER_LIST', '*', first, () => {
            list.clear();
            clearBossTimers();
            this.boss = null;
        });

        dispatch.hook('S_LOAD_TOPO', '*', first, () => {
            list.clear();
            clearBossTimers();
            this.boss = null;
        });

        dispatch.hook('S_SPAWN_NPC', '*', first, e => {
            list.set(e.gameId, {
                gameId: e.gameId,
                templateId: e.templateId,
                huntingZoneId: e.huntingZoneId,
                name: e.npcName,
                loc: e.loc,
                w: e.w,
                relation: e.relation,
                villager: e.villager,
                aggressive: e.aggressive,
                spawnType: e.spawnType,
                status: e.status,
                inCombat: e.status === 2, // 0 idle, 1 alert, 2 combat, 3 evade/leash, 4 dead
                enraged: e.mode === 1,
                remainingEnrageTime: e.remainingEnrageTime,
                hpLevel: e.hpLevel,
                hp: null,
                maxHp: null
            });
        });

        dispatch.hook('S_DESPAWN_NPC', '*', last, e => {
            if (this.boss && this.boss.gameId === e.gameId) {
                clearBossTimers();
                this.boss = null;
            }
            list.delete(e.gameId);
        });

        dispatch.hook('S_NPC_STATUS', '*', first, e => {
            const npc = list.get(e.gameId);
            if (!npc) return;
            npc.status = e.status;
            npc.inCombat = e.status === 2;
            npc.enraged = e.enraged;
            npc.remainingEnrageTime = e.remainingEnrageTime;
            npc.hpLevel = e.hpLevel;
        });

        dispatch.hook('S_CREATURE_CHANGE_HP', '*', first, e => {
            const npc = list.get(e.target);
            if (!npc) return;
            npc.hp = e.curHp;
            npc.maxHp = e.maxHp;
        });

        dispatch.hook('S_BOSS_GAGE_INFO', '*', first, e => {
            const npc = list.get(e.id);
            if (!npc) return;
            npc.hp = e.curHp;
            npc.maxHp = e.maxHp;
            // same object as the npcs-list entry, not a copy: any correction
            // applied to the npc (movement.js's knockback/animSeq handling
            // included) is automatically visible on nous.boss too
            this.boss = npc;
        });

        // ordinary npcs: midpoint-average like players. the current boss
        // additionally gets 25ms constant-velocity dead reckoning for ~1s,
        // so it reads smoothly between the ~1Hz real location packets
        dispatch.hook('S_NPC_LOCATION', '*', first, e => {
            const npc = list.get(e.gameId);
            if (npc) {
                npc.loc = util.getCenterLoc(e.loc, e.dest);
                npc.w = e.w;
            }

            if (!this.boss || this.boss.gameId !== e.gameId) return;

            this.boss.loc = e.loc;
            this.boss.w = e.w;

            clearBossTimers();
            const endTime = Date.now() + 1000;
            bossInterval = dispatch.setInterval(() => {
                this.boss.loc = util.calculateFutureNPCPos(e.loc, e.w, e.speed, endTime);
            }, 25);
            bossTimeout = dispatch.setTimeout(() => {
                dispatch.clearInterval(bossInterval);
            }, 985);
        });
    }
}

module.exports = Npcs;
