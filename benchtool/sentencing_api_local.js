// sentencing_api_local.js
// Local Sentencing API for offline benchtool
// All logic is self-contained and uses the local offenseDatabase

// --- Offense Search ---
function searchOffenses(query, maxResults = 20) {
    if (!query || !query.trim()) return [];
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const q = norm(query);
    let results = [];
    for (const group of offenseDatabase) {
        for (const offense of group) {
            if (
                norm(offense.name).includes(q) ||
                (offense.section && norm(offense.section).includes(q))
            ) {
                results.push(offense);
                if (results.length >= maxResults) return results;
            }
        }
    }
    return results;
}

// --- Sentencing Modifiers ---
const ATTEMPT_CLASS_MAP = { "A-I": "B", "B": "C", "C": "D", "D": "E", "E": "A Misd" };

function applyModifiers(baseOffense, modifiers) {
    let offenseClass = baseOffense.class;
    let isViolentFelony = baseOffense.vfo;
    let notes = [];
    if (modifiers.attempt) {
        offenseClass = ATTEMPT_CLASS_MAP[offenseClass] || offenseClass;
        notes.push('Attempt reduces class by one level.');
    }
    // Predicate, violent predicate, persistent, YO handled in sentencing logic
    return { ...baseOffense, class: offenseClass, vfo: isViolentFelony, notes };
}

// --- Sentencing Calculation ---
function getSentencingDetails(offense, modifiers, isYOActive) {
    // Misdemeanor/Infraction logic
    if (offense.class.includes("Misd")) {
        return { sentenceType: "Jail", range: "Up to 1 year", prs: "N/A", restriction: '', isLawful: true };
    }
    if (offense.class.includes("Infraction")) {
        return { sentenceType: "Fine/Points", range: "As per VTL", prs: "N/A", restriction: 'Traffic infractions are not subject to standard felony/misdemeanor sentencing.', isLawful: true };
    }
    // Attempt logic
    let offenseClass = offense.class;
    if (modifiers.attempt) {
        offenseClass = ATTEMPT_CLASS_MAP[offenseClass] || offenseClass;
        if (offenseClass === "A Misd") {
            return { sentenceType: "Jail", range: "Up to 1 year", prs: "N/A", restriction: 'Attempt reduced felony to A Misdemeanor.', isLawful: true };
        }
    }
    // Youthful Offender
    if (isYOActive) {
        return { 
            sentenceType: 'Indeterminate', 
            range: 'Up to 4 years', 
            prs: "N/A", 
            restriction: `Youthful Offender adjudication: Indeterminate sentence capped at 4 years.`, 
            isLawful: true 
        };
    }
    // Felony logic
    let isViolentFelony = offense.vfo;
    let sentenceType = isViolentFelony ? 'Determinate' : 'Indeterminate';
    // Sentencing ranges (simplified, can be expanded)
    const ranges = {
        determinate: {
            'B': { first: [5, 25], prs: '2.5-5 years' },
            'C': { first: [3.5, 15], prs: '2.5-5 years' },
            'D': { first: [2, 7], prs: '1.5-3 years' },
            'E': { first: [1.5, 4], prs: '1.5-3 years' }
        },
        indeterminate: {
            'B': { min: 1, max: 25 },
            'C': { min: 1, max: 15 },
            'D': { min: 1, max: 7 },
            'E': { min: 1, max: 4 }
        }
    };
    if (isViolentFelony && ranges.determinate[offenseClass]) {
        const r = ranges.determinate[offenseClass];
        return { sentenceType: 'Determinate', range: `${r.first[0]}-${r.first[1]} years`, prs: r.prs, restriction:'', isLawful: true };
    } else if (ranges.indeterminate[offenseClass]) {
        const r = ranges.indeterminate[offenseClass];
        return { sentenceType: 'Indeterminate', range: `Min: ${r.min} yr, Max: ${r.max} yrs`, prs: "1-3 years", restriction: "Minimum must be between 1 year and ⅓ of the maximum.", isLawful: true };
    }
    return { sentenceType: 'N/A', range: "Error", prs: "N/A", restriction: `Class ${offenseClass} data not found.`, isLawful: false };
}

// --- Exported API ---
window.SentencingAPI = {
    searchOffenses,
    applyModifiers,
    getSentencingDetails
}; 