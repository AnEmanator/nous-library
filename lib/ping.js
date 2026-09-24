const SAMPLE_INTERVAL = 2000;
const HISTORY_SIZE = 25;
const MIN_JITTER = 0;
const MAX_JITTER = 200;

// round-trip ping tracking. sends its own C_REQUEST_GAMESTAT_PING on an interval
// and times the PONG. doesn't touch anyone else's ping traffic
class Ping {
    constructor(dispatch, mods) {
        this.min = 0;
        this.max = 0;
        this.avg = 0;
        this.jitter = 0;

        const history = [];
        let lastPing = 0;
        let pinging = false;
        let timer = null;

        const sendPing = () => {
            dispatch.send('C_REQUEST_GAMESTAT_PING', '*', {});
            lastPing = Date.now();
            pinging = true;
            timer = dispatch.setTimeout(sendPing, SAMPLE_INTERVAL);
        };

        dispatch.hook('S_RESPONSE_GAMESTAT_PONG', '*', { order: -Infinity }, () => {
            if (!pinging) return;
            pinging = false;

            history.push(Date.now() - lastPing);
            if (history.length > HISTORY_SIZE) history.shift();

            this.min = Math.min(...history);
            this.max = Math.max(...history);
            this.avg = history.reduce((a, b) => a + b, 0) / history.length;
        });

        dispatch.hook('S_LOGIN', '*', { order: -Infinity }, () => {
            // clear any previous cycle so relogging doesn't stack up parallel loops
            dispatch.clearTimeout(timer);
            sendPing();
        });

        // jitter: how far a real skill-stage packet's actual timing deviates from our
        // own recent ping. keyed per skill+stage so overlapping skills don't clobber
        // each other's pending timestamp
        const pendingActions = {};
        const trackJitter = (key, fake) => {
            if (!pendingActions[key]) pendingActions[key] = [];
            if (!fake) {
                const pending = pendingActions[key];
                if (pending.length === 0) return;
                const entry = pending.shift();
                const elapsed = Date.now() - entry.time;
                dispatch.clearTimeout(entry.timer);

                const jitter = elapsed - this.min;
                if (jitter > MAX_JITTER) {
                    pendingActions[key] = [];
                    return;
                }
                this.jitter = Math.min(MAX_JITTER, Math.max(MIN_JITTER, jitter));
                return;
            }

            const entry = { time: Date.now(), timer: null };
            pendingActions[key].push(entry);
            entry.timer = dispatch.setTimeout(() => {
                const index = pendingActions[key].indexOf(entry);
                if (index === -1) return;
                pendingActions[key] = pendingActions[key].filter((_, i) => i !== index);
            }, this.min + this.jitter + 75);
        };

        dispatch.hook('S_ACTION_STAGE', '*', { order: -Infinity, filter: { fake: null } }, (e, fake) => {
            if (!mods.me.is(e.gameId)) return;
            trackJitter(e.skill.id + '-' + e.stage, fake);
        });
    }
}

module.exports = Ping;
