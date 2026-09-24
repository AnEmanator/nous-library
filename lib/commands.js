// `nous <bucket>` dumps tracked state to the toolbox log (console.log)
function mapToObject(map, transform = v => v) {
    const obj = {};
    for (const [key, value] of map) obj[key] = transform(value);
    return obj;
}

// selfExpireTimer is a live Node Timeout handle, not debug data - its internal
// linked list is circular, so dumping it as-is stack-overflows loopBigIntToString
function dumpEffects(effects) {
    return mapToObject(effects, e => ({ ...e, selfExpireTimer: undefined }));
}

function dump(util, data) {
    console.log(JSON.stringify(util.loopBigIntToString(data), null, '\t'));
}

module.exports = function registerCommands(dispatch, mods) {
    const { util, me, players, npcs, host, ping, cooldowns, passives } = mods;

    dispatch.command.add('nous', (arg, name) => {
        switch (arg) {
            case 'me':
                dump(util, { ...me, effects: dumpEffects(me.effects) });
                break;
            case 'players':
                dump(
                    util,
                    mapToObject(players.list, p => ({ ...p, effects: dumpEffects(p.effects) }))
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
                dump(util, dumpEffects(me.effects));
                break;
            case 'reload':
                if (!name) {
                    dispatch.command.message('nous reload <module name>');
                    break;
                }
                dispatch.command.exec(`proxy unload \'${name}\' 1`);
                dispatch.command.exec(`proxy load \'${name}\' 1`);
                dispatch.command.exec(`proxy load \'${name}\'`);
                break;
            default:
                dispatch.command.message(
                    'nous: me | players | npcs | boss | host | ping | cooldowns | passives | stats | effects | reload <module>'
                );
        }
    });
};
