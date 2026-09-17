const Util = require('./lib/util');
const Host = require('./lib/host');
const Ping = require('./lib/ping');
const Cooldowns = require('./lib/cooldowns');
const Passives = require('./lib/passives');
const Me = require('./lib/me');
const Players = require('./lib/players');
const Npcs = require('./lib/npcs');
const Party = require('./lib/party');
const registerMovement = require('./lib/movement');
const registerCommands = require('./lib/commands');

class Nous {
    constructor(dispatch) {
        // shared bag, instance-scoped so nothing leaks across separate connections
        const mods = { util: Util };
        mods.host = new Host(dispatch, mods);
        mods.ping = new Ping(dispatch, mods);
        mods.cooldowns = new Cooldowns(dispatch);
        mods.passives = new Passives(dispatch);
        mods.me = new Me(dispatch, mods);
        mods.players = new Players(dispatch, mods);
        mods.npcs = new Npcs(dispatch, mods);
        mods.party = new Party(dispatch, mods);
        registerMovement(dispatch, mods);
        registerCommands(dispatch, mods);

        // public surface. me/players/npcs are stable references for the
        // life of the connection, never reassigned, only mutated in place
        this.me = mods.me;
        this.players = mods.players.list;
        this.npcs = mods.npcs.list;
        this.party = mods.party.list;
        this.host = mods.host;
        this.ping = mods.ping;
        this.cooldowns = mods.cooldowns;
        this.passives = mods.passives;

        // boss is a real state transition (no boss -> a boss -> a different boss),
        // so unlike me/players/npcs it's fine for this to change identity
        Object.defineProperty(this, 'boss', {
            get: () => mods.npcs.boss,
            enumerable: true
        });
    }
}

module.exports.NetworkMod = function (dispatch, ...args) {
    return new Nous(dispatch, ...args);
};
module.exports.RequireInterface = (globalMod, clientMod, networkMod) => networkMod;
