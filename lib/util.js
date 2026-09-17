// shared, stateless helpers. no packet hooks live here.

const jobs = [
    'warrior',
    'lancer',
    'slayer',
    'berserker',
    'sorcerer',
    'archer',
    'priest',
    'mystic',
    'reaper',
    'gunner',
    'brawler',
    'ninja',
    'valkyrie'
];
const races = ['human', 'high elf', 'aman', 'castanic', 'popori', 'baraka'];

// job 0-7 (the eight OG classes) each got their own aspd divisor. every class since
// Reaper (job 8+) uses a flat 100 instead. see architecture/attack-speed-calculation.md
const ASPD_DIVIDER = [120, 100, 110, 90, 110, 120, 105, 105];

function aspdDivider(className) {
    const job = jobs.indexOf(className);
    return job >= 0 && job < ASPD_DIVIDER.length ? ASPD_DIVIDER[job] : 100;
}


// midpoint between loc and dest, guarded against a zeroed/absent dest
// (some packets only carry a real dest for specific edge cases)
function getCenterLoc(loc, dest) {
    if (!dest || dest.x + dest.y + dest.z === 0) return loc;
    return {
        x: (loc.x + dest.x) / 2,
        y: (loc.y + dest.y) / 2,
        z: (loc.z + dest.z) / 2
    };
}

// mutates loc in place, projecting distance along heading w. used for
// knockback correction and animSeq-driven displacement
function applyDistanceAlongHeading(loc, w, distance) {
    loc.x += Math.cos(w) * distance;
    loc.y += Math.sin(w) * distance;
    return loc;
}

// constant-velocity dead reckoning: how far along w has something moved by now,
// given it started at loc/w with the given speed and the update is valid until endTime
function calculateFutureNPCPos(loc, w, speed, endTime) {
    const curDist = speed - speed * ((endTime - Date.now()) / 1000);
    return {
        x: Math.cos(w) * curDist + loc.x,
        y: Math.sin(w) * curDist + loc.y,
        z: loc.z
    };
}

// templateId -> class/race/gender. same formula independently used by every
// reference mod checked, kept as one shared copy instead of N duplicates
function deriveClassRaceGender(templateId) {
    const gender = Math.floor((templateId - 10000) / 100) % 2;
    let race = races[Math.floor((templateId - 10000) / 100 / 2) + gender - 1];
    if (race === 'popori' && !gender) race = 'elin';
    const job = (templateId % 100) - 1;
    return {
        job,
        class: jobs[job],
        race,
        gender: gender ? 'male' : 'female'
    };
}

// JSON.stringify can't handle BigInt (gameIds etc). walk an object in place
// and stringify any BigInt fields, recursively, so debug dumps don't throw
function loopBigIntToString(obj) {
    for (const key of Object.keys(obj)) {
        const val = obj[key];
        if (typeof val === 'bigint') obj[key] = val.toString();
        else if (val && typeof val === 'object') loopBigIntToString(val);
    }
    return obj;
}

module.exports = {
    getCenterLoc,
    applyDistanceAlongHeading,
    calculateFutureNPCPos,
    deriveClassRaceGender,
    loopBigIntToString,
    aspdDivider
};
