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

// zone/huntingZoneIds treated as instance/dungeon content. static and patch-pinned,
// ported from an older tracker. revisit if it drifts, no better data-driven source found.
const dungeonZones = [
    2100, 2101, 2102, 2103, 2105, 2106, 2501, 2502, 2503, 2504, 2530, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008,
    3009, 3010, 3011, 3012, 3016, 3017, 3018, 3019, 3020, 3023, 3024, 3025, 3026, 3027, 3028, 3029, 3030, 3031, 3032,
    3033, 3034, 3035, 3036, 3037, 3039, 3040, 3041, 3042, 3043, 3044, 3045, 3046, 3047, 3048, 3049, 3050, 3052, 3053,
    3054, 3055, 3056, 3101, 3102, 3103, 3104, 3105, 3106, 3107, 3108, 3109, 3126, 3201, 3202, 3203, 3204, 3205, 3206,
    3209, 8999, 9001, 9002, 9003, 9005, 9006, 9007, 9008, 9010, 9011, 9012, 9013, 9014, 9016, 9017, 9018, 9019, 9020,
    9021, 9022, 9023, 9024, 9025, 9026, 9027, 9028, 9029, 9031, 9032, 9033, 9034, 9036, 9037, 9038, 9039, 9040, 9041,
    9042, 9043, 9044, 9045, 9046, 9047, 9050, 9051, 9052, 9053, 9054, 9055, 9056, 9057, 9059, 9060, 9061, 9062, 9063,
    9064, 9065, 9066, 9067, 9068, 9069, 9070, 9071, 9072, 9073, 9074, 9075, 9076, 9077, 9078, 9079, 9080, 9081, 9082,
    9083, 9087, 9088, 9089, 9090, 9091, 9092, 9093, 9094, 9095, 9096, 9126, 9151, 9503, 9505, 9506, 9507, 9508, 9509,
    9511, 9611, 9643, 9681, 9710, 9711, 9713, 9714, 9716, 9720, 9724, 9725, 9726, 9727, 9735, 9739, 9743, 9750, 9754,
    9756, 9757, 9759, 9760, 9766, 9767, 9768, 9769, 9770, 9773, 9775, 9776, 9777, 9780, 9781, 9782, 9783, 9793, 9794,
    9795, 9801, 9802, 9803, 9804, 9808, 9809, 9810, 9811, 9813, 9814, 9818, 9820, 9821, 9822, 9823, 9824, 9825, 9826,
    9827, 9828, 9829, 9830, 9833, 9860, 9871, 9872, 9873, 9876, 9879, 9880, 9885, 9886, 9887, 9888, 9889, 9894, 9911,
    9916, 9920, 9935, 9939, 9950, 9969, 9970, 9975, 9979, 9980, 9981, 9982, 9983, 9994, 9998, 9999
];

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
    return {
        class: jobs[(templateId % 100) - 1],
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
    dungeonZones,
    getCenterLoc,
    applyDistanceAlongHeading,
    calculateFutureNPCPos,
    deriveClassRaceGender,
    loopBigIntToString
};
