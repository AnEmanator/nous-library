// `nous <bucket>` dumps tracked state to the toolbox log (console.log), not
// game chat, since npcs/players dumps especially can get large

function mapToObject(map, transform = v => v) {
    const obj = {};
    for (const [key, value] of map) obj[key] = transform(value);
    return obj;
}

function dump(util, data) {
    console.log(JSON.stringify(util.loopBigIntToString(data), null, '\t'));
}

module.exports = function registerCommands(dispatch, mods) {
    const { util, me, players, npcs, host, ping, cooldowns, passives } = mods;

    dispatch.command.add('nous', arg => {
        switch (arg) {
            case 'me':
                dump(util, { ...me, effects: mapToObject(me.effects) });
                break;
            case 'players':
                dump(
                    util,
                    mapToObject(players.list, p => ({ ...p, effects: mapToObject(p.effects) }))
                );
                break;
            case 'npcs':
                dump(util, mapToObject(npcs.list));
                break;
            case 'boss':
                dump(util, npcs.boss ? { ...npcs.boss } : null);
                break;
            case 'host':
                dump(util, { ...host });
                break;
            case 'ping':
                dispatch.command.message(`min: ${ping.min} max: ${ping.max} avg: ${ping.avg.toFixed(1)}`);
                break;
            case 'cooldowns':
                dump(util, mapToObject(cooldowns.cooldowns));
                break;
            case 'passives':
                dump(util, { crests: [...passives.crests], itemPassives: [...passives.itemPassives] });
                break;
            case 'stats':
                dump(util, me.stats);
                break;
            case 'effects':
                dump(util, mapToObject(me.effects));
                break;
            default:
                dispatch.command.message(
                    'nous: me | players | npcs | boss | host | ping | cooldowns | passives | stats | effects'
                );
        }
    });
};
