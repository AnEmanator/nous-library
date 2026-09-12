// tracks skill cooldowns from the real S_START_COOLTIME_SKILL/S_DECREASE_COOLTIME_SKILL
// packets. keyed by skill base (Math.floor(id / 10000)), not the raw skill id, since a
// single ability's combo/stage/charge sub-ids all share one real cooldown on the server.
// both packets are self-only (no gameId field), so no target filtering needed here.
class Cooldowns {
    constructor(dispatch) {
        this.cooldowns = new Map(); // skillBase -> endTimestamp
        const timers = new Map(); // skillBase -> cleanup timer

        const skillBase = id => Math.floor(id / 10000);

        const setCooldown = e => {
            const base = skillBase(e.skill.id);
            this.cooldowns.set(base, Date.now() + e.cooldown);
            dispatch.clearTimeout(timers.get(base));
            timers.set(base, dispatch.setTimeout(() => {
                this.cooldowns.delete(base);
                timers.delete(base);
            }, e.cooldown));
        };

        dispatch.hook('S_START_COOLTIME_SKILL', '*', { order: -Infinity }, setCooldown);
        dispatch.hook('S_DECREASE_COOLTIME_SKILL', '*', { order: -Infinity }, setCooldown);

        // S_GET_USER_LIST is the real login/character-select boundary. cooldowns persist
        // through zoning (S_LOAD_TOPO), same as me.js doesn't clear there either.
        dispatch.hook('S_GET_USER_LIST', '*', { order: -Infinity }, () => {
            this.cooldowns.clear();
            for (const t of timers.values()) dispatch.clearTimeout(t);
            timers.clear();
        });
    }

    isOnCooldown(skillId) {
        const end = this.cooldowns.get(Math.floor(skillId / 10000));
        return end != null && Date.now() < end;
    }

    getEndTime(skillId) {
        return this.cooldowns.get(Math.floor(skillId / 10000)) ?? null;
    }
}

module.exports = Cooldowns;
