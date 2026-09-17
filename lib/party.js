const first = { order: -Infinity };

// party membership + live per-member status (stat updates, position, alive).
// tera-game-state's own Party mod covers membership but never tracks status,
// this fills that gap
class Party {
    constructor(dispatch, mods) {
        const { me, players } = mods;

        this.list = new Map();
        let unresolved = [];

        dispatch.hook('S_PARTY_MEMBER_LIST', '*', first, e => {
            unresolved = [];
            this.list.clear();
            for (const member of e.members) {
                if (me.is(member.gameId)) continue;
                if (member.gameId) {
                    this.list.set(member.gameId, member);
                    continue;
                }
                let found = null;
                for (const [gameId, p] of players.list) {
                    if (p.serverId === member.serverId && p.playerId === member.playerId) {
                        found = gameId;
                        break;
                    }
                }
                if (found) this.list.set(found, member);
                else unresolved.push(member);
            }
        });

        const mergeStatUpdate = e => {
            for (const [gameId, member] of this.list) {
                if (e.serverId !== member.serverId || e.playerId !== member.playerId) continue;
                this.list.set(gameId, { ...member, ...e });
            }
        };
        dispatch.hook('S_PARTY_MEMBER_STAT_UPDATE', '*', first, mergeStatUpdate);
        dispatch.hook('S_PARTY_MEMBER_INTERVAL_POS_UPDATE', '*', first, mergeStatUpdate);

        dispatch.hook('S_SPAWN_USER', '*', first, e => {
            if (!unresolved.length) return;
            for (let i = 0; i < unresolved.length; i++) {
                const { serverId, playerId } = unresolved[i];
                if (serverId !== e.serverId || playerId !== e.playerId) continue;
                this.list.set(e.gameId, { ...unresolved[i], ...e });
                unresolved.splice(i, 1);
                break;
            }
        });

        dispatch.hook('S_LEAVE_PARTY', '*', first, () => {
            unresolved = [];
            this.list.clear();
        });

        dispatch.hook('S_CREATURE_LIFE', '*', first, e => {
            const member = this.list.get(e.gameId);
            if (member) member.alive = e.alive;
        });
    }
}

module.exports = Party;
