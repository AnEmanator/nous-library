// tracks which Passivity ids (glyphs/crests, gear-roll item passives) are currently
// active on the character. ids only, looking them up in the datacenter is up to you
class Passives {
    constructor(dispatch) {
        this.crests = new Set();
        this.itemPassives = new Set();

        // S_CREST_INFO is the full snapshot (sent around login)
        // S_CREST_APPLY is a single toggle after that
        dispatch.hook('S_CREST_INFO', '*', { order: -Infinity }, e => {
            this.crests.clear();
            for (const crest of e.crests) {
                if (crest.enable) this.crests.add(crest.id);
            }
        });

        dispatch.hook('S_CREST_APPLY', '*', { order: -Infinity }, e => {
            if (e.enable) this.crests.add(e.id);
            else this.crests.delete(e.id);
        });

        // assumed to carry the full current list each time
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
