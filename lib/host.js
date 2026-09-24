const first = { order: -Infinity };

// server/version identity. fields merged in place, object never reassigned
class Host {
    constructor(dispatch) {
        this.accountId = null;
        this.serverName = null;
        this.proto = null;
        this.patch = null;

        dispatch.hook('S_LOGIN_ACCOUNT_INFO', '*', first, e => {
            this.accountId = e.accountId;
            this.serverName = e.dbServerName;
        });

        dispatch.hook('C_CHECK_VERSION', '*', first, e => {
            this.proto = e.version?.[0]?.value || 'Unknown';
        });

        dispatch.hook('C_LOGIN_ARBITER', '*', first, e => {
            this.patch = e.patchVersion;
        });
    }
}

module.exports = Host;
