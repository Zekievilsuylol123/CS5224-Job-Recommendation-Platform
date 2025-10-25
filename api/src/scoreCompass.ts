import { AssessmentInput, CompassScore, CompassVerdict, EducationLevel, PlanTier } from './types.js';

export const SALARY_WEIGHT = 40;
export const QUALIFICATIONS_WEIGHT = 30;
export const EMPLOYER_WEIGHT = 20;
export const DIVERSITY_WEIGHT = 10;
export const TOTAL_WEIGHT = SALARY_WEIGHT + QUALIFICATIONS_WEIGHT + EMPLOYER_WEIGHT + DIVERSITY_WEIGHT;

const EDUCATION_RANK: Record<EducationLevel, number> = {
  Diploma: 1,
  Bachelors: 2,
  Masters: 3,
  PhD: 4
};

const PLAN_MULTIPLIER: Record<PlanTier, number> = {
  freemium: 0.9,
  standard: 0.95,
  pro: 1,
  ultimate: 1.05
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function determineVerdict(score: number): CompassVerdict {
  if (score >= 70) return 'Likely';
  if (score >= 50) return 'Borderline';
  return 'Unlikely';
}

function scoreSalary(userInput: AssessmentInput, notes: string[]): number {
  const expected = userInput.user.expectedSalarySGD;
  const min = userInput.job?.salaryMinSGD;
  const max = userInput.job?.salaryMaxSGD;

  if (!min && !max) {
    notes.push('Salary data missing; assumed neutral fit.');
    return SALARY_WEIGHT * 0.6;
  }

  if (expected === undefined) {
    notes.push('Expected salary unknown; used job band midpoint.');
    return SALARY_WEIGHT * 0.75;
  }

  const effectiveMax = max ?? min ?? expected;
  const effectiveMin = min ?? effectiveMax;

  if (expected >= effectiveMin && expected <= effectiveMax) {
    notes.push('Expected salary fits within job band.');
    return SALARY_WEIGHT;
  }

  if (expected < effectiveMin) {
    notes.push('Expected salary below job minimum; negotiating room.');
    const gapRatio = clamp((effectiveMin - expected) / effectiveMin, 0, 1);
    return SALARY_WEIGHT * clamp(1 - gapRatio * 0.5, 0.5, 1);
  }

  notes.push('Expected salary exceeds job band; may need compromise.');
  const overRatio = clamp((expected - effectiveMax) / effectiveMax, 0, 2);
  return SALARY_WEIGHT * clamp(1 - overRatio, 0.1, 0.85);
}

function scoreQualifications(input: AssessmentInput, notes: string[]): number {
  const targetJob = input.job;
  const skills = new Set((input.user.skills ?? []).map((s) => s.toLowerCase()));
  const jobSkills = new Set((targetJob?.requirements ?? []).map((s) => s.toLowerCase()));
  const intersection = [...skills].filter((skill) => jobSkills.has(skill));
  const skillCoverage = jobSkills.size === 0 ? 0.7 : intersection.length / jobSkills.size;

  const userEducation = input.user.educationLevel;
  const jobPref = inferEducationFromJob(targetJob?.requirements ?? []);
  let educationScore = 0.6;

  if (userEducation && jobPref) {
    const delta = EDUCATION_RANK[userEducation] - EDUCATION_RANK[jobPref];
    if (delta >= 0) {
      educationScore = 1;
      notes.push('Education level matches or exceeds requirement.');
    } else {
      educationScore = clamp(0.6 + 0.1 * delta, 0.3, 0.8);
      notes.push('Education level slightly below preferred requirement.');
    }
  } else if (userEducation) {
    educationScore = clamp(0.6 + EDUCATION_RANK[userEducation] * 0.1, 0.6, 0.95);
    notes.push('Education level evaluated against typical expectations.');
  } else {
    notes.push('Education level missing; conservative score applied.');
    educationScore = 0.5;
  }

  const experienceYears = input.user.yearsExperience ?? 0;
  const jobYears = inferRequiredYears(targetJob?.description ?? '', targetJob?.requirements ?? []);
  let experienceScore = jobYears === 0 ? clamp(experienceYears / 5, 0.4, 1) : clamp(experienceYears / jobYears, 0, 1.1);
  experienceScore = clamp(experienceScore, 0.3, 1);

  if (jobYears > 0) {
    if (experienceYears >= jobYears) {
      notes.push('Experience meets job expectations.');
    } else {
      notes.push('Experience years slightly below stated range.');
    }
  }

  const blended = (educationScore * 0.4 + skillCoverage * 0.4 + experienceScore * 0.2) * QUALIFICATIONS_WEIGHT;
  return clamp(blended, 0, QUALIFICATIONS_WEIGHT);
}

function scoreEmployer(input: AssessmentInput, notes: string[]): number {
  const employer = input.job?.employer;
  const userPlan = input.user.plan ?? 'freemium';
  const planMultiplier = PLAN_MULTIPLIER[userPlan];

  if (!employer) {
    notes.push('Employer data missing; neutral employer score applied.');
    return EMPLOYER_WEIGHT * 0.6 * planMultiplier;
  }

  let base = 0.5;

  switch (employer.size) {
    case 'MNC':
      base = 0.9;
      break;
    case 'Gov':
      base = 0.8;
      break;
    case 'Startup':
      base = 0.7;
      break;
    case 'SME':
      base = 0.65;
      break;
    default:
      base = 0.6;
  }

  if (employer.localHQ) {
    base += 0.05;
  }

  const score = EMPLOYER_WEIGHT * clamp(base * planMultiplier, 0.4, 1.05);

  notes.push(`Employer fit evaluated for ${employer.size} organization.`);
  return clamp(score, 0, EMPLOYER_WEIGHT);
}

function scoreDiversity(input: AssessmentInput, notes: string[]): number {
  const employer = input.job?.employer;
  if (!employer?.diversityScore) {
    notes.push('Diversity data unavailable; using baseline.');
    return DIVERSITY_WEIGHT * 0.5;
  }

  const normalized = clamp(employer.diversityScore, 0, 1);
  if (normalized >= 0.75) {
    notes.push('Employer has strong inclusivity signals.');
  } else if (normalized >= 0.5) {
    notes.push('Employer shows moderate inclusivity.');
  } else {
    notes.push('Employer inclusivity appears limited.');
  }
  return DIVERSITY_WEIGHT * normalized;
}

function inferEducationFromJob(requirements: string[]): EducationLevel | undefined {
  const joined = requirements.join(' ').toLowerCase();
  if (joined.includes('phd')) return 'PhD';
  if (joined.includes("master's") || joined.includes('masters')) return 'Masters';
  if (joined.includes("bachelor's") || joined.includes('degree')) return 'Bachelors';
  if (joined.includes('diploma')) return 'Diploma';
  return undefined;
}

function inferRequiredYears(description: string, requirements: string[]): number {
  const combined = `${description}\n${requirements.join('\n')}`;
  const regex = /(\d+)\s*\+?\s*(?:years?|yrs?)/gi;
  let maxYears = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(combined)) !== null) {
    const value = Number.parseInt(match[1], 10);
    if (!Number.isNaN(value)) {
      maxYears = Math.max(maxYears, value);
    }
  }
  return maxYears;
}

export function scoreCompass(input: AssessmentInput): CompassScore {
  const notes: string[] = [];

  const salaryScore = scoreSalary(input, notes);
  const qualificationScore = scoreQualifications(input, notes);
  const employerScore = scoreEmployer(input, notes);
  const diversityScore = scoreDiversity(input, notes);

  const totalRaw = salaryScore + qualificationScore + employerScore + diversityScore;
  const total = Math.round(totalRaw);
  const verdict = determineVerdict(total);

  return {
    total,
    breakdown: {
      salary: Math.round(salaryScore),
      qualifications: Math.round(qualificationScore),
      employer: Math.round(employerScore),
      diversity: Math.round(diversityScore)
    },
    verdict,
    notes
  };
}
