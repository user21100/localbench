import json
import re

# List of valid NYS Penal Law sections for major offenses (partial, for demo; should be exhaustive in production)
VALID_SECTIONS = set([
    '100.00', '100.05', '100.08', '100.10', '100.13',
    '105.00', '105.05', '105.10', '105.13', '105.15', '105.17',
    '110.00',
    '115.00', '115.01', '115.05', '115.08',
    '120.00', '120.01', '120.02', '120.03', '120.04', '120.04-a', '120.05', '120.06', '120.07', '120.08', '120.09', '120.10', '120.11', '120.12', '120.13', '120.14', '120.15', '120.16', '120.17', '120.18', '120.19', '120.20', '120.23', '120.25', '120.26', '120.27', '120.30', '120.35', '120.45', '120.50', '120.55', '120.60', '120.70',
    '121.11', '121.12', '121.13',
    '125.10', '125.11', '125.12', '125.13', '125.14', '125.15', '125.20', '125.21', '125.22', '125.25', '125.26', '125.27',
    # ... (add all valid sections as needed)
])

# List of VFO sections per NYS Penal Law § 70.02 (partial, for demo)
VFO_SECTIONS = set([
    '120.05', '120.06', '120.07', '120.08', '120.09', '120.10', '120.11', '120.12', '120.13', '120.70',
    '121.12', '121.13',
    '125.10', '125.11', '125.12', '125.13', '125.14', '125.15', '125.20', '125.21', '125.22', '125.25', '125.26', '125.27',
    # ... (add all VFO sections as needed)
])

NYS_CLASSES = {
    'A-I', 'A-II', 'B', 'C', 'D', 'E',
    'A Misd', 'B Misd', 'Unclassified Misd', 'Violation', 'Infraction'
}

def is_criminal(off):
    n = off.get('name', '').lower()
    desc = off.get('classificationDescription', '').lower()
    if any(x in n for x in ['definition', 'purpose', 'general']) or any(x in desc for x in ['definition', 'purpose', 'general']):
        return False
    c = off.get('class', '')
    if c in ('Variable', 'Unknown', '', None):
        return False
    if c not in NYS_CLASSES and not re.match(r'^(A|B|C|D|E)( Misd)?$', c) and c not in ['Unclassified Misd', 'Violation', 'Infraction', 'A-I', 'A-II']:
        return False
    return True

def std_class(off):
    c = off.get('class', '')
    if c in NYS_CLASSES:
        return c
    if c == 'Felony':
        lvl = off.get('offenseLevel', '')
        if lvl in NYS_CLASSES:
            return lvl
        desc = off.get('classificationDescription', '')
        for k in NYS_CLASSES:
            if k in desc:
                return k
        return 'Felony'
    if c == 'Misdemeanor':
        lvl = off.get('offenseLevel', '')
        if lvl in NYS_CLASSES:
            return lvl
        desc = off.get('classificationDescription', '')
        for k in NYS_CLASSES:
            if k in desc:
                return k
        return 'A Misd'
    return c

def valid_section(off):
    sec = off.get('statuteLocationId', '')
    return sec in VALID_SECTIONS

def update_vfo(off):
    sec = off.get('statuteLocationId', '')
    is_vfo = sec in VFO_SECTIONS
    off['vfo'] = is_vfo
    if is_vfo:
        off['vfoLegalBasis'] = 'PL § 70.02'
        off['vfoNotes'] = ['Violent Felony Offense per NYS Penal Law § 70.02']
    else:
        off.pop('vfoLegalBasis', None)
        off.pop('vfoNotes', None)
    return off

def main():
    with open('current_offenses.json') as f:
        data = json.load(f)
    cleaned = []
    removed = []
    for off in data:
        if not is_criminal(off):
            removed.append({'reason': 'not criminal', 'offense': off})
            continue
        if not valid_section(off):
            removed.append({'reason': 'invalid section', 'offense': off})
            continue
        off = dict(off, **{'class': std_class(off)})
        off = update_vfo(off)
        cleaned.append(off)
    with open('cleaned_offenses.json', 'w') as f:
        json.dump(cleaned, f, indent=2)
    with open('offense_cleanup_report.json', 'w') as f:
        json.dump(removed, f, indent=2)
    print('Cleaned offenses:', len(cleaned))
    print('Removed/flagged offenses:', len(removed))

if __name__ == '__main__':
    main() 