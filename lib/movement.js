const first = { order: -Infinity };

// generic position corrections for whichever tracked entity (player or npc,
// boss included since it's a live reference into the npcs list) a packet's
// gameId happens to belong to. one hook per packet instead of duplicating
// near-identical handlers across players.js and npcs.js
module.exports = function registerMovement(dispatch, mods) {
    const { util, players, npcs } = mods;

    const resolve = gameId => players.list.get(gameId) || npcs.list.get(gameId);

    const applyAnimSeq = (record, animSeq) => {
        if (!animSeq || !animSeq.length) return;
        let distance = 0;
        for (const seq of animSeq) distance += seq.distance;
        util.applyDistanceAlongHeading(record.loc, record.w, distance);
    };

    // STAGE: midpoint-average base loc (like other "in transit" packets), then
    // layer on animation-driven displacement if the skill carries animSeq data
    dispatch.hook('S_ACTION_STAGE', '*', first, e => {
        const target = resolve(e.gameId);
        if (!target) return;
        target.loc = util.getCenterLoc(e.loc, e.dest);
        target.w = e.w;
        applyAnimSeq(target, e.animSeq);
    });

    // END: raw loc, no averaging, no animSeq field exists on this packet
    dispatch.hook('S_ACTION_END', '*', first, e => {
        const target = resolve(e.gameId);
        if (!target) return;
        target.loc = e.loc;
        target.w = e.w;
    });

    dispatch.hook('S_CREATURE_ROTATE', '*', first, e => {
        const target = resolve(e.gameId);
        if (!target) return;
        target.w = e.w;
    });

    // knockback correction: total reaction animSeq distance, projected backward
    // along heading, so a knocked-back entity's tracked position doesn't go
    // stale until the next real location packet
    dispatch.hook('S_EACH_SKILL_RESULT', '*', first, e => {
        if (!e.reaction || !e.reaction.enable) return;
        const target = resolve(e.target);
        if (!target) return;
        let distance = 0;
        for (const seq of e.reaction.animSeq) distance += seq.distance;
        util.applyDistanceAlongHeading(target.loc, target.w, -distance);
    });

    dispatch.hook('S_STICK_TO_USER_START', '*', first, e => {
        const target = resolve(e.target);
        if (!target) return;
        util.applyDistanceAlongHeading(target.loc, target.w, e.distance);
    });

    dispatch.hook('S_STICK_TO_USER_END', '*', first, e => {
        const target = resolve(e.target);
        if (!target) return;
        target.loc = e.loc;
    });
};
