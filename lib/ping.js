const SAMPLE_INTERVAL = 2000;
const HISTORY_SIZE = 25;

// real round-trip ping tracking. sends a genuine C_REQUEST_GAMESTAT_PING to the
// real server on its own interval and times the real S_RESPONSE_GAMESTAT_PONG.
// deliberately does NOT intercept/block anyone's ping traffic, this is a tracking
// library, not a ping spoofer
class Ping {
    constructor(dispatch) {
        this.min = 0;
        this.max = 0;
        this.avg = 0;

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
    }
}

module.exports = Ping;
