const SALARY_MAX = 20;
const QUALIFICATIONS_MAX = 20;
const DIVERSITY_MAX = 20;
const SUPPORT_MAX = 20;
const SKILLS_BONUS_MAX = 20;
const STRATEGIC_BONUS_MAX = 10;
// COMPASS framework (per official MOM documentation):
// - 4 foundational criteria (C1-C4): 20 pts each = 80 pts max
// - 2 bonus criteria (C5-C6): 20 + 10 pts = 30 pts max
// - Total possible: 110 points
// - Pass threshold: 40 points
const TOTAL_MAX = SALARY_MAX + QUALIFICATIONS_MAX + DIVERSITY_MAX + SUPPORT_MAX + SKILLS_BONUS_MAX + STRATEGIC_BONUS_MAX; // 110 points
const PASS_THRESHOLD = 40;
const BORDERLINE_THRESHOLD = 20;
const EXPERIENCE_THRESHOLD_YEARS = 8;
const SECTOR_SALARY_BENCHMARKS = {
    technology: { early: 5600, experienced: 7200 },
    finance: { early: 6000, experienced: 7600 },
    'financial services': { early: 6000, experienced: 7600 },
    product: { early: 5500, experienced: 7000 },
    healthcare: { early: 5400, experienced: 6900 },
    manufacturing: { early: 5300, experienced: 6800 },
    logistics: { early: 5200, experienced: 6600 },
    'professional services': { early: 5600, experienced: 7100 },
    'advanced manufacturing': { early: 5600, experienced: 7200 },
    energy: { early: 5700, experienced: 7300 }
};
const DEFAULT_BENCHMARK = { early: 5400, experienced: 6900 };
const TOP_TIER_INSTITUTIONS = new Set([
    'national university of singapore',
    'nanyang technological university',
    'singapore management university',
    'massachusetts institute of technology',
    'stanford university',
    'harvard university',
    'university of cambridge',
    'university of oxford',
    'imperial college london',
    'eth zurich',
    'university of tokyo',
    'university of melbourne',
    'tsinghua university',
    'peking university',
    'london school of economics',
    'university of chicago',
    'california institute of technology',
    'cornell university',
    'university of hong kong',
    'university of sydney'
].map((name) => name.toLowerCase()));
const PROFESSIONAL_CERTIFICATIONS = new Set([
    'cfa',
    'acca',
    'cpa australia',
    'frmp',
    'cfa charterholder',
    'bar admission',
    'pe license',
    'pmp',
    'sie exam',
    'smc registered doctor',
    'singapore bar'
].map((item) => item.toLowerCase()));
const SHORTAGE_OCCUPATIONS = new Set([
    'artificial intelligence engineer',
    'ai engineer',
    'machine learning engineer',
    'data scientist',
    'analytics engineer',
    'cloud architect',
    'cybersecurity specialist',
    'software architect',
    'semiconductor engineer',
    'quantum engineer',
    'robotics engineer',
    'marine engineer',
    'green finance specialist',
    'biomedical engineer',
    'precision engineering manager',
    'renewable energy engineer'
].map((name) => name.toLowerCase()));
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function determineVerdict(score) {
    if (score >= PASS_THRESHOLD)
        return 'Likely';
    if (score >= BORDERLINE_THRESHOLD)
        return 'Borderline';
    return 'Unlikely';
}
function normalise(text) {
    return text?.trim().toLowerCase();
}
function resolveSectorBenchmark(industry) {
    const key = normalise(industry);
    if (!key)
        return DEFAULT_BENCHMARK;
    const direct = SECTOR_SALARY_BENCHMARKS[key];
    if (direct)
        return direct;
    const matchedEntry = Object.entries(SECTOR_SALARY_BENCHMARKS).find(([sector]) => key.includes(sector));
    return matchedEntry ? matchedEntry[1] : DEFAULT_BENCHMARK;
}
function scoreSalary(input, notes) {
    const expected = input.user.expectedSalarySGD;
    if (!expected || expected === null) {
        notes.push('C1 Salary · Missing expected salary; treated as within benchmark (10 pts).');
        return 10;
    }
    const benchmark = resolveSectorBenchmark(input.job?.industry);
    const years = input.user.yearsExperience ?? 0;
    const band = years >= EXPERIENCE_THRESHOLD_YEARS ? benchmark.experienced : benchmark.early;
    // Extra safety check
    if (!band || band === null) {
        notes.push('C1 Salary · Unable to determine benchmark; treated as within benchmark (10 pts).');
        return 10;
    }
    const ratio = expected / band;
    if (ratio >= 1.0) {
        notes.push(`C1 Salary · Meets or exceeds sector benchmark of $${band.toLocaleString()} (20 pts).`);
        return SALARY_MAX;
    }
    if (ratio >= 0.9) {
        notes.push(`C1 Salary · Within 10% of sector benchmark ($${band.toLocaleString()}) (10 pts).`);
        return 10;
    }
    notes.push('C1 Salary · Falls below the indicative benchmark (0 pts).');
    return 0;
}
function scoreQualifications(input, notes) {
    const institution = normalise(input.user.educationInstitution);
    const certifications = (input.user.certifications ?? []).map((item) => item.toLowerCase());
    const hasTopTierInstitution = institution ? TOP_TIER_INSTITUTIONS.has(institution) : false;
    const hasRecognisedCertification = certifications.some((cert) => PROFESSIONAL_CERTIFICATIONS.has(cert));
    if (hasTopTierInstitution || hasRecognisedCertification) {
        notes.push('C2 Qualifications · Degree or certification recognised within QS/global accreditation (20 pts).');
        return QUALIFICATIONS_MAX;
    }
    const level = input.user.educationLevel;
    if (level === 'Masters' || level === 'PhD' || level === 'Bachelors') {
        notes.push('C2 Qualifications · Degree recognised but outside QS top tier (10 pts).');
        return 10;
    }
    notes.push('C2 Qualifications · No recognised degree/certification detected (0 pts).');
    return 0;
}
function scoreDiversity(notes) {
    notes.push('C3 Diversity · No employer mix data provided; applying conservative baseline (5 pts).');
    return 5;
}
function scoreSupport(notes) {
    notes.push('C4 Support · Employer local PMET data unavailable; applying conservative baseline (5 pts).');
    return 5;
}
function matchesShortageOccupation(job) {
    if (!job)
        return false;
    const title = normalise(job.title);
    if (title && [...SHORTAGE_OCCUPATIONS].some((occupation) => title.includes(occupation))) {
        return true;
    }
    return (job.requirements ?? []).some((req) => {
        const requirement = normalise(req);
        return requirement ? [...SHORTAGE_OCCUPATIONS].some((occupation) => requirement.includes(occupation)) : false;
    });
}
function scoreSkillsBonus(input, notes) {
    if (matchesShortageOccupation(input.job)) {
        notes.push('C5 Skills Bonus · Role aligns with Shortage Occupation List (+20 pts).');
        return SKILLS_BONUS_MAX;
    }
    notes.push('C5 Skills Bonus · Role not in published shortage list (+0 pts).');
    return 0;
}
function scoreStrategicBonus(notes) {
    notes.push('C6 Strategic Bonus · No SEP participation data supplied (+0 pts).');
    return 0;
}
export function scoreCompass(input) {
    const notes = [];
    const salaryScore = scoreSalary(input, notes);
    const qualificationScore = scoreQualifications(input, notes);
    const diversityScore = scoreDiversity(notes);
    const supportScore = scoreSupport(notes);
    const skillsScore = scoreSkillsBonus(input, notes);
    const strategicScore = scoreStrategicBonus(notes);
    const totalRaw = salaryScore + qualificationScore + diversityScore + supportScore + skillsScore + strategicScore;
    const totalPercent = Math.round((totalRaw / TOTAL_MAX) * 100);
    const verdict = determineVerdict(totalRaw);
    return {
        total: totalPercent,
        totalRaw,
        breakdown: {
            salary: salaryScore,
            qualifications: qualificationScore,
            diversity: diversityScore,
            support: supportScore,
            skills: skillsScore,
            strategic: strategicScore
        },
        verdict,
        notes
    };
}
