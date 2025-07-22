// local_bench_api.js
// Unified Local API for PlatformsCC Benchtool (Offline)
// Exposes OffenseSearchAPI and SentencingAPI on window
// All logic is self-contained and uses the local offenseDatabase

/**
 * Utility: Normalize a string for search
 * @param {string} str
 * @returns {string}
 */
function normalizeString(str) {
    return str.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Utility: Attempt class reduction map
 */
const ATTEMPT_CLASS_MAP = { "A-I": "B", "B": "C", "C": "D", "D": "E", "E": "A Misd" };

/**
 * Shared: Get flat list of all offenses
 * @returns {Array<Object>}
 */
function getAllOffenses() {
    // offenseDatabase is a global var loaded from master_offense_database.js
    if (Array.isArray(offenseDatabase[0])) {
        // Flatten if grouped
        return offenseDatabase.flat();
    }
    return offenseDatabase;
}

/**
 * Offense Search API
 * Provides UI helpers and search logic
 */
window.OffenseSearchAPI = {
    /**
     * Search offenses by query (name or section)
     * @param {string} query
     * @param {number} maxResults
     * @returns {Array<Object>}
     */
    searchOffenses(query, maxResults = 20) {
        if (!query || !query.trim()) return [];
        const q = normalizeString(query);
        const results = [];
        for (const offense of getAllOffenses()) {
            if (
                normalizeString(offense.name).includes(q) ||
                (offense.section && normalizeString(offense.section).includes(q))
            ) {
                results.push(offense);
                if (results.length >= maxResults) break;
            }
        }
        return results;
    },

    /**
     * Attach search UI to input and results container
     * @param {string} searchInputId
     * @param {string} resultsContainerId
     * @param {function} onSelect (offense) => void
     */
    attachSearchUI(searchInputId, resultsContainerId, onSelect) {
        const input = document.getElementById(searchInputId);
        const results = document.getElementById(resultsContainerId);
        let currentFocus = -1;
        let searchTimeout = null;

        function renderResults(items) {
            results.innerHTML = '';
            if (!items.length) {
                results.innerHTML = '<div class="search-message">No offenses found.</div>';
                results.style.display = 'block';
                return;
            }
            items.forEach((offense, idx) => {
                const div = document.createElement('div');
                div.className = 'search-result-item';
                // Fallbacks for missing fields
                const name = offense.name || 'Unknown Offense';
                const section = offense.section || 'Unknown Section';
                const cls = offense.class || 'Unknown Class';
                div.innerHTML = `<div class="offense-name">${name}</div><div class="offense-details">${section} - ${cls}</div>`;
                div.addEventListener('click', () => {
                    input.value = `${name} (${section})`;
                    results.innerHTML = '';
                    if (onSelect) onSelect(offense);
                });
                results.appendChild(div);
            });
            results.style.display = 'block';
        }

        input.addEventListener('input', e => {
            clearTimeout(searchTimeout);
            const val = e.target.value;
            if (val.length < 2) {
                results.innerHTML = '';
                return;
            }
            searchTimeout = setTimeout(() => {
                const found = window.OffenseSearchAPI.searchOffenses(val, 20);
                renderResults(found);
            }, 200);
        });
        input.addEventListener('keydown', e => {
            const items = results.querySelectorAll('.search-result-item');
            if (!items.length) return;
            if (e.key === 'ArrowDown') {
                currentFocus = (currentFocus + 1) % items.length;
                items.forEach((el, idx) => el.classList.toggle('focused', idx === currentFocus));
            } else if (e.key === 'ArrowUp') {
                currentFocus = (currentFocus - 1 + items.length) % items.length;
                items.forEach((el, idx) => el.classList.toggle('focused', idx === currentFocus));
            } else if (e.key === 'Enter') {
                if (currentFocus >= 0 && items[currentFocus]) {
                    items[currentFocus].click();
                }
            }
        });
        document.addEventListener('click', e => {
            if (!input.contains(e.target) && !results.contains(e.target)) {
                results.innerHTML = '';
            }
        });
    }
};

/**
 * Sentencing API
 * Provides modifier handling and sentencing calculation
 */
window.SentencingAPI = {
    /**
     * Apply modifiers to an offense (e.g., attempt)
     * @param {Object} baseOffense
     * @param {Object} modifiers
     * @returns {Object}
     */
    applyModifiers(baseOffense, modifiers) {
        let offenseClass = baseOffense.class;
        let isViolentFelony = baseOffense.vfo;
        let notes = [];
        if (modifiers.attempt) {
            offenseClass = ATTEMPT_CLASS_MAP[offenseClass] || offenseClass;
            notes.push('Attempt reduces class by one level.');
        }
        // Predicate, violent predicate, persistent, YO handled in sentencing logic
        return { ...baseOffense, class: offenseClass, vfo: isViolentFelony, notes };
    },

    /**
     * Get sentencing details for an offense and modifiers
     * @param {Object} offense
     * @param {Object} modifiers
     * @param {boolean} isYOActive
     * @returns {Object}
     */
    getSentencingDetails(offense, modifiers, isYOActive) {
        if (offense.class.includes("Misd")) {
            return { sentenceType: "Jail", range: "Up to 1 year", prs: "N/A", restriction: '', isLawful: true };
        }
        if (offense.class.includes("Infraction")) {
            return { sentenceType: "Fine/Points", range: "As per VTL", prs: "N/A", restriction: 'Traffic infractions are not subject to standard felony/misdemeanor sentencing.', isLawful: true };
        }
        let offenseClass = offense.class;
        if (modifiers.attempt) {
            offenseClass = ATTEMPT_CLASS_MAP[offenseClass] || offenseClass;
            if (offenseClass === "A Misd") {
                return { sentenceType: "Jail", range: "Up to 1 year", prs: "N/A", restriction: 'Attempt reduced felony to A Misdemeanor.', isLawful: true };
            }
        }
        if (isYOActive) {
            return { 
                sentenceType: 'Indeterminate', 
                range: 'Up to 4 years', 
                prs: "N/A", 
                restriction: `Youthful Offender adjudication: Indeterminate sentence capped at 4 years.`, 
                isLawful: true 
            };
        }
        let isViolentFelony = offense.vfo;
        let sentenceType = isViolentFelony ? 'Determinate' : 'Indeterminate';
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
    },

    /**
     * Get full sentencing options (primary and alternative) for an offense and modifiers
     * @param {Object} offense
     * @param {Object} modifiers
     * @returns {Object} { primaryOptions: [...], alternativeOptions: [...] }
     */
    getFullSentencingOptions(offense, modifiers) {
        // --- Modifier toggle logic ---
        const exclusive = ['predicate', 'violentPredicate', 'persistent'];
        let active = exclusive.filter(k => modifiers[k]);
        if (active.length > 1) {
            exclusive.forEach(k => modifiers[k] = false);
            modifiers[active[active.length-1]] = true;
        }
        const isMisdOrInf = offense.class.includes('Misd') || offense.class.includes('Infraction');
        if (isMisdOrInf) exclusive.forEach(k => modifiers[k] = false);

        // --- Primary Sentencing Options ---
        const details = this.getSentencingDetails(offense, modifiers, modifiers.yo);
        let primaryOptions = [];
        // Always show main sentence option
        let color = details.isLawful ? 'eligible' : 'unavailable-option';
        let reason = details.isLawful ? '' : details.restriction;
        let sentenceTitle = modifiers.yo ? "Youthful Offender (Indeterminate)" : `State Prison (${details.sentenceType})`;
        if (details.sentenceType === "Jail" || offense.class.includes("Misd")) sentenceTitle = "Jail Sentence";
        primaryOptions.push({
            html: `<div class="sentence-option ${color}">
                <div class="sentence-type"><strong>${sentenceTitle}</strong></div>
                <div class="sentence-details-grid">
                    <div class="sentence-label">Term:</div><div class="sentence-value prominent-term">${details.range}</div>
                </div>
                <div class="sentence-description">${details.restriction || ''}</div>
                ${reason ? `<div class="unavailable-reason">${reason}</div>` : ''}
            </div>`,
            status: color
        });
        // PRS (always show, gray if not eligible)
        let prsEligible = !modifiers.yo && details.prs && details.prs !== "N/A" && details.sentenceType === 'Determinate';
        primaryOptions.push({
            html: `<div class="sentence-option ${prsEligible ? 'eligible' : 'unavailable-option'}">
                <div class="sentence-type">Post-Release Supervision</div>
                <div class="sentence-details-grid">
                    <div class="sentence-label">Term:</div><div class="sentence-value">${details.prs || 'N/A'}</div>
                </div>
                ${!prsEligible ? '<div class="unavailable-reason">Not applicable for this offense/modifiers.</div>' : ''}
            </div>`,
            status: prsEligible ? 'eligible' : 'unavailable-option'
        });
        // Fines (always show)
        let fineEligible = !!offense.hasFineRange;
        primaryOptions.push({
            html: `<div class="sentence-option ${fineEligible ? 'eligible' : 'unavailable-option'}">
                <div class="sentence-type">Mandatory Fine</div>
                <div class="sentence-details-grid">
                    <div class="sentence-label">Range:</div><div class="sentence-value">${fineEligible ? `$${offense.minFine} - $${offense.maxFine}` : 'N/A'}</div>
                </div>
                ${!fineEligible ? '<div class="unavailable-reason">No fine for this offense.</div>' : ''}
            </div>`,
            status: fineEligible ? 'eligible' : 'unavailable-option'
        });
        // Surcharges (always show)
        let surchargeAmount = '', cvaFee = '';
        if (!isMisdOrInf) { surchargeAmount = '$300'; cvaFee = '$25'; }
        else if (offense.class.includes("Misd")) { surchargeAmount = '$175'; cvaFee = '$25'; }
        primaryOptions.push({
            html: `<div class="sentence-option eligible">
                <div class="sentence-type">Surcharges & Fees</div>
                <ul class="fee-list" style="list-style-type:none; margin-top:8px;">
                    <li>Mandatory Surcharge: <strong>${surchargeAmount || 'N/A'}</strong></li>
                    <li>Crime Victim Assistance Fee: <strong>${cvaFee || 'N/A'}</strong></li>
                    ${!isMisdOrInf ? `<li>DNA Databank Fee: <strong>$50</strong></li>` : ''}
                </ul>
            </div>`,
            status: 'eligible'
        });
        // --- Alternative Dispositions ---
        let alternativeOptions = [];
        const isFelony = !offense.class.includes('Misd') && !offense.class.includes('Infraction');
        const isPredicate = modifiers.predicate || modifiers.violentPredicate || modifiers.persistent;
        const isYOEligible = isFelony && !offense.class.startsWith('A-') && !isPredicate;
        // YO (always show)
        alternativeOptions.push({
            html: `<div class="sentence-option ${isYOEligible ? (modifiers.yo ? 'yo-active' : 'caution-option') : 'unavailable-option'}">
                <div class="sentence-type">Youthful Offender</div>
                <div class="sentence-value" style="grid-column: 1 / -1;">Avoids a criminal conviction. Maximum sentence is 4 years.${!isYOEligible ? '<div class="unavailable-reason">Ineligible due to offense class or predicate status.</div>' : ''}</div>
            </div>`,
            status: isYOEligible ? (modifiers.yo ? 'eligible' : 'caution-option') : 'unavailable-option'
        });
        // Probation (always show)
        const isProbationAvailable = isFelony && !isPredicate && !offense.class.startsWith('A-');
        alternativeOptions.push({
            html: `<div class="sentence-option ${isProbationAvailable ? 'alternative-option' : 'unavailable-option'}">
                <div class="sentence-type">Sentence of Probation</div>
                ${!isProbationAvailable ? '<div class="unavailable-reason">Ineligible for Class A felonies or predicate offenders.</div>' : '<div class="sentence-description">Term: Up to 5 years for a felony.</div>'}
            </div>`,
            status: isProbationAvailable ? 'alternative-option' : 'unavailable-option'
        });
        // SHOCK Incarceration (always show)
        const isShockAvailable = isFelony && !offense.vfo && !isPredicate;
        alternativeOptions.push({
            html: `<div class="sentence-option ${isShockAvailable ? 'alternative-option' : 'unavailable-option'}">
                <div class="sentence-type">SHOCK Incarceration</div>
                ${!isShockAvailable ? '<div class="unavailable-reason">Ineligible for violent felonies or predicate offenders.</div>' : '<div class="sentence-description">A six-month, military-style program.</div>'}
            </div>`,
            status: isShockAvailable ? 'alternative-option' : 'unavailable-option'
        });
        // Conditional Discharge (always show)
        const isConditionalDischargeAvailable = isFelony && !isPredicate && !['A-I', 'A-II', 'B'].includes(offense.class);
        alternativeOptions.push({
            html: `<div class="sentence-option ${isConditionalDischargeAvailable ? 'alternative-option' : 'unavailable-option'}">
                <div class="sentence-type">Conditional Discharge</div>
                ${!isConditionalDischargeAvailable ? '<div class="unavailable-reason">Ineligible for Class A-I, A-II, B felonies or predicate offenders.</div>' : '<div class="sentence-description">Term: Court\'s discretion, up to 3 years.</div>'}
            </div>`,
            status: isConditionalDischargeAvailable ? 'alternative-option' : 'unavailable-option'
        });
        // Judicial Diversion (CASAT) (always show)
        const isJudicialDiversionAvailable = isFelony && offense.isDrugOffense && !isPredicate;
        alternativeOptions.push({
            html: `<div class="sentence-option ${isJudicialDiversionAvailable ? 'alternative-option' : 'unavailable-option'}">
                <div class="sentence-type">Judicial Diversion (CASAT)</div>
                ${!isJudicialDiversionAvailable ? '<div class="unavailable-reason">Only available for drug offenses and non-predicate offenders.</div>' : '<div class="sentence-description">Drug treatment program as alternative to incarceration.</div>'}
            </div>`,
            status: isJudicialDiversionAvailable ? 'alternative-option' : 'unavailable-option'
        });
        // Willard (Drug Treatment) (always show)
        const isWillardAvailable = isFelony && offense.isWillardEligible && !modifiers.violentPredicate && !modifiers.persistent;
        alternativeOptions.push({
            html: `<div class="sentence-option ${isWillardAvailable ? 'alternative-option' : 'unavailable-option'}">
                <div class="sentence-type">Willard (Drug Treatment)</div>
                ${!isWillardAvailable ? '<div class="unavailable-reason">Only available for Willard-eligible drug offenses.</div>' : '<div class="sentence-description">Intensive drug treatment program.</div>'}
            </div>`,
            status: isWillardAvailable ? 'alternative-option' : 'unavailable-option'
        });
        // Interim Probation Supervision (always show)
        const isInterimProbationAvailable = (isFelony || offense.class.includes("Misd")) && !isPredicate && !offense.class.startsWith('A-');
        alternativeOptions.push({
            html: `<div class="sentence-option ${isInterimProbationAvailable ? 'caution-option' : 'unavailable-option'}">
                <div class="sentence-type">Interim Probation Supervision (IPS)</div>
                ${!isInterimProbationAvailable ? '<div class="unavailable-reason">Ineligible for Class A felonies or predicate offenders.</div>' : '<div class="sentence-description">Up to 1 year (may be extended to 2 years with consent and treatment). Time on IPS counts toward final probation sentence.</div>'}
            </div>`,
            status: isInterimProbationAvailable ? 'caution-option' : 'unavailable-option'
        });
        return { primaryOptions, alternativeOptions };
    }
}; 