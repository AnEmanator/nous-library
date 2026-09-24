# nous-library

Advanced state tracking library with highly accurate location tracking. Ultimately built to replace tera-game-state and library use across a myriad of mods. It tracks you, other players, NPCs, your party, cooldowns, ping and a few other bits, and exposes them as plain objects.

## Usage

(Optional, but recommended) Add it as a dependency in your mod's `module.json`:

```json
"dependencies": {
  "nous": "https://raw.githubusercontent.com/AnEmanator/nous-library/main/module.json"
}
```

Then grab it from `mod.require`:

```js
module.exports = function MyMod(mod) {
  const nous = mod.require.nous;

  mod.hook('S_SOMETHING', '*', e => {
    if (!nous.me.alive || nous.me.mounted) return;
    console.log(nous.me.name, nous.me.loc, nous.ping.avg);
  });
};
```

## What's in it

| Property | What it is |
| --- | --- |
| `nous.me` | You. Name, class, level, `loc`/`w`, `alive`, `inCombat`, `mounted`, `stats`, `effects`, `aspd`, zone flags |
| `nous.players` | `Map` of gameId to nearby player |
| `nous.npcs` | `Map` of gameId to spawned NPC |
| `nous.boss` | The NPC that last had a boss gauge, or `null` |
| `nous.party` | `Map` of gameId to party member (never includes you) |
| `nous.host` | `accountId`, `serverName`, `proto`, `patch` |
| `nous.ping` | `min`, `max`, `avg`, `jitter` in ms |
| `nous.cooldowns` | `isOnCooldown(skillId)`, `getEndTime(skillId)` |
| `nous.passives` | Active crests and item passives: `has(id)`, `all()` |

A few things worth knowing:

- `me`, `players`, `npcs` and `party` never get reassigned, so it's safe to keep a reference. `boss` can change, so read it each time.
- `me.loc`, `me.stats` and player `loc`s are swapped out as packets arrive. Read them when you need them rather than holding on to them.
- `me.is(gameId)` checks whether a gameId is yours.
- `me.inOverworld`, `inDungeon`, `inBattleground` and `inCivilUnrest` come from the continent data, so they work off `me.zone`.
- Cooldowns are keyed by skill base (`Math.floor(id / 10000)`), so any sub-id of a skill gives the same answer.
- Ping sends its own `C_REQUEST_GAMESTAT_PING` every couple of seconds. It doesn't touch anyone else's ping traffic.

The code is well commented for further analysis if desired or required for learning or use.

## Commands

`nous <thing>` dumps tracked state to the Toolbox log (`ping` prints to chat instead):

```
nous me | players | npcs | boss | host | ping | cooldowns | passives | stats | effects
```

`nous reload <module name>` reloads another mod, handy while developing.

## Support

Issues go [here](https://github.com/AnEmanator/nous-library/issues).
