import { ParsedProfile, EducationLevel } from '../types.js';

const EDUCATION_KEYWORDS: Record<EducationLevel, RegExp[]> = {
  Diploma: [/diploma/i, /polytechnic/i],
  Bachelors: [/(bachelor|b\.sc|b\.eng|degree)/i],
  Masters: [/(master|m\.sc|mba)/i],
  PhD: [/(phd|doctorate)/i]
};

const SKILL_DICTIONARY: Record<string, string[]> = {
  SWE: ['typescript', 'javascript', 'node', 'react', 'java', 'c++', 'golang', 'python'],
  Data: ['sql', 'pandas', 'spark', 'dbt', 'machine learning', 'statistics', 'warehouse', 'etl'],
  Product: ['roadmap', 'stakeholder', 'agile', 'ux', 'figma', 'design sprint'],
  Finance: ['forecasting', 'excel', 'valuation', 'financial modeling', 'risk', 'derivatives']
};

const NATIONALITY_KEYWORDS = [
  'singaporean',
  'malaysian',
  'indian',
  'indonesian',
  'filipino',
  'vietnamese',
  'chinese'
];

const GENDER_KEYWORDS = ['male', 'female', 'non-binary', 'nonbinary'];

const SALARY_REGEX =
  /\$?\s*(?:sgd)?\s*(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d{1,2})?)(?:k|000)?(?:\s?-\s?\$?\s*(?:sgd)?\s*(\d{1,3}(?:[,\s]\d{3})+|\d+(?:\.\d{1,2})?)(?:k|000)?)?/i;

export function sanitizeResumeText(text: string): string {
  return text
    .replace(/\u0000/g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function detectEducation(text: string): EducationLevel | undefined {
  for (const [level, patterns] of Object.entries(EDUCATION_KEYWORDS)) {
    if (patterns.some((regex) => regex.test(text))) {
      return level as EducationLevel;
    }
  }
  return undefined;
}

function detectSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();

  for (const bucket of Object.values(SKILL_DICTIONARY)) {
    for (const skill of bucket) {
      if (lower.includes(skill)) {
        found.add(skill);
      }
    }
  }

  return [...found];
}

function detectYearsExperience(text: string): number | undefined {
  const rangeRegex = /(\d{4})\s?[–-]\s?(?:present|current|\d{4})/gi;
  const singleRegex = /(\d+)\s*\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:experience|exp)/gi;
  const seenYears = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = rangeRegex.exec(text)) !== null) {
    const startYear = Number.parseInt(match[1], 10);
    const endYearMatch = match[0].match(/\d{4}$/);
    const endYear = endYearMatch ? Number.parseInt(endYearMatch[0], 10) : new Date().getFullYear();
    if (!Number.isNaN(startYear) && !Number.isNaN(endYear) && endYear >= startYear) {
      seenYears.add(endYear - startYear);
    }
  }

  while ((match = singleRegex.exec(text)) !== null) {
    const years = Number.parseInt(match[1], 10);
    if (!Number.isNaN(years)) {
      seenYears.add(years);
    }
  }

  if (seenYears.size === 0) return undefined;
  return Math.max(...seenYears);
}

function detectSalary(text: string): number | undefined {
  const match = SALARY_REGEX.exec(text);
  if (!match) return undefined;

  const normalize = (value: string | undefined): number | undefined => {
    if (!value) return undefined;
    const cleaned = value.replace(/[^\d.]/g, '');
    let amount = Number.parseFloat(cleaned);
    if (match[0].toLowerCase().includes('k') && amount < 1000) {
      amount *= 1000;
    }
    if (Number.isNaN(amount)) return undefined;
    return Math.round(amount);
  };

  const min = normalize(match[1]);
  const max = normalize(match[2]);
  if (max) return Math.round((min ?? max + max) / 2);
  return min;
}

function detectName(text: string): string | undefined {
  const firstLine = text.split('\n')[0]?.trim();
  if (firstLine && firstLine.length <= 60 && /^[a-z ,.'-]+$/i.test(firstLine)) {
    return firstLine;
  }
  return undefined;
}

function detectEmail(text: string): string | undefined {
  const emailRegex = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
  const match = emailRegex.exec(text);
  return match ? match[0] : undefined;
}

function detectLastTitle(text: string): string | undefined {
  const lines = text.split('\n').map((line) => line.trim());
  const titleRegex = /(senior|lead|principal|manager|engineer|designer|analyst|scientist)[^,;\n]*/i;
  for (const line of lines) {
    const match = titleRegex.exec(line);
    if (match) {
      return match[0].replace(/[\d()-]/g, '').trim();
    }
  }
  return undefined;
}

function detectNationality(text: string): string | undefined {
  const lower = text.toLowerCase();
  return NATIONALITY_KEYWORDS.find((nation) => lower.includes(nation));
}

function detectGender(text: string): string | undefined {
  const lower = text.toLowerCase();
  return GENDER_KEYWORDS.find((value) => lower.includes(value));
}

export function parseResumeText(text: string): ParsedProfile {
  const sanitized = sanitizeResumeText(text);
  const profile: ParsedProfile = {
    name: detectName(sanitized),
    email: detectEmail(sanitized),
    skills: detectSkills(sanitized),
    educationLevel: detectEducation(sanitized),
    yearsExperience: detectYearsExperience(sanitized),
    expectedSalarySGD: detectSalary(sanitized),
    lastTitle: detectLastTitle(sanitized),
    nationality: detectNationality(sanitized),
    gender: detectGender(sanitized)
  };

  // Ensure skills array exists even if empty for predictable FE usage.
  if (!profile.skills) {
    profile.skills = [];
  }

  return profile;
}
