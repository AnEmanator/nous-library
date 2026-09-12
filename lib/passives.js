// tracks which Passivity-sheet ids (glyphs/crests, gear-roll item passives) are
// currently active on the character. Both id sets index directly into the compiled
// Passivity data (see architecture/attack-speed-calculation.md) - this module only
// tracks which ids are active, it has no DataCenter/compiled-data dependency itself,
// consuming that lookup is prediction-flavored and belongs in Powerlink.
class Passives {
    constructor(dispatch) {
        this.crests = new Set();
        this.itemPassives = new Set();

        // S_CREST_INFO is the full snapshot (sent around login); S_CREST_APPLY is a
        // single toggle after that. Not yet confirmed whether S_CREST_INFO always
        // fires on login before any crest is touched - flagged for live verification.
        dispatch.hook('S_CREST_INFO', '*', { order: -Infinity }, e => {
            this.crests.clear();
            for (const c of e.crests) {
                if (c.enable) this.crests.add(c.id);
            }
        });

        dispatch.hook('S_CREST_APPLY', '*', { order: -Infinity }, e => {
            if (e.enable) this.crests.add(e.id);
            else this.crests.delete(e.id);
        });

        // assumed to carry the full current list each time (not an incremental
        // delta), same caveat as S_CREST_INFO above about initial-login timing
        dispatch.hook('S_CHANGE_ITEM_PASSIVE_LIST', '*', { order: -Infinity }, e => {
            if (!e.success) return;
            this.itemPassives.clear();
            for (const s of e.stats) this.itemPassives.add(s.id);
        });

        dispatch.hook('S_GET_USER_LIST', '*', { order: -Infinity }, () => {
            this.crests.clear();
            this.itemPassives.clear();
        });
    }

    has(id) {
        return this.crests.has(id) || this.itemPassives.has(id);
    }

    *all() {
        yield* this.crests;
        yield* this.itemPassives;
    }
}

module.exports = Passives;
