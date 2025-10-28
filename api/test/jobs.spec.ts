import { describe, expect, it } from 'vitest';
import { createSeedJobs } from '../src/seedJobs.js';
import { scoreCompass } from '../src/scoreCompass.js';

describe('jobs ranking', () => {
  it('orders jobs by EP fit and limits to top 3', () => {
    const jobs = createSeedJobs(5, 99);
    const profile = {
      educationLevel: 'Bachelors' as const,
      skills: ['typescript', 'react', 'node.js'],
      yearsExperience: 5,
      expectedSalarySGD: 8500,
      plan: 'pro' as const
    };

    const ranked = jobs
      .map((job) => ({
        job,
        score: scoreCompass({ user: profile, job })
      }))
      .sort((a, b) => b.score.total - a.score.total)
      .slice(0, 3);

    expect(ranked).toHaveLength(3);
    expect(ranked[0].score.total).toBeGreaterThanOrEqual(ranked[1].score.total);
    expect(ranked[1].score.total).toBeGreaterThanOrEqual(ranked[2].score.total);
  });

  it('assigns EP indicator based on score thresholds', () => {
    const resultLikely = scoreCompass({
      user: {
        educationLevel: 'Masters',
        educationInstitution: 'National University of Singapore',
        plan: 'ultimate',
        skills: ['machine learning', 'python', 'statistics'],
        expectedSalarySGD: 9000,
        yearsExperience: 6
      },
      job: {
        title: 'Machine Learning Engineer',
        salaryMinSGD: 8500,
        salaryMaxSGD: 11000,
        requirements: ['machine learning', 'python', '5+ years experience'],
        employer: { size: 'MNC', localHQ: true },
        industry: 'Technology'
      }
    });
    const resultBorderline = scoreCompass({
      user: {
        educationLevel: 'Bachelors',
        educationInstitution: 'Regional University',
        plan: 'standard',
        skills: ['excel'],
        expectedSalarySGD: 5800,
        yearsExperience: 2
      },
      job: {
        title: 'Financial Analyst',
        salaryMinSGD: 6200,
        salaryMaxSGD: 7800,
        requirements: ['excel', 'forecasting', 'financial modeling', '4+ years experience'],
        employer: { size: 'SME', localHQ: false },
        industry: 'Finance'
      }
    });
    const resultUnlikely = scoreCompass({
      user: {
        educationLevel: 'Diploma',
        plan: 'freemium',
        skills: ['figma'],
        expectedSalarySGD: 3200,
        yearsExperience: 1
      },
      job: {
        title: 'Product Designer',
        salaryMinSGD: 6200,
        salaryMaxSGD: 7800,
        requirements: ['roadmap planning', 'stakeholder management', '5+ years experience'],
        employer: { size: 'Startup', localHQ: false },
        industry: 'Product'
      }
    });

    expect(resultLikely.total).toBeGreaterThanOrEqual(55);
    expect(resultLikely.verdict).toBe('Likely');
    expect(resultBorderline.total).toBeGreaterThanOrEqual(20);
    expect(resultBorderline.total).toBeLessThan(55);
    expect(resultBorderline.verdict).toBe('Borderline');
    expect(resultUnlikely.total).toBeLessThan(20);
    expect(resultUnlikely.verdict).toBe('Unlikely');
  });
});
