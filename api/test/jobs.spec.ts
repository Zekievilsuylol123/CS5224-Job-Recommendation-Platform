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
        plan: 'ultimate',
        skills: ['machine learning', 'python', 'statistics'],
        expectedSalarySGD: 9000,
        yearsExperience: 6
      },
      job: {
        salaryMinSGD: 8500,
        salaryMaxSGD: 11000,
        requirements: ['machine learning', 'python', '5+ years experience'],
        employer: { size: 'MNC', diversityScore: 0.8 }
      }
    });
    const resultBorderline = scoreCompass({
      user: {
        educationLevel: 'Bachelors',
        plan: 'standard',
        skills: ['excel', 'forecasting'],
        expectedSalarySGD: 8200,
        yearsExperience: 2
      },
      job: {
        salaryMinSGD: 6000,
        salaryMaxSGD: 8000,
        requirements: ['excel', 'forecasting', '3+ years experience'],
        employer: { size: 'SME', diversityScore: 0.5 }
      }
    });
    const resultUnlikely = scoreCompass({
      user: {
        educationLevel: 'Diploma',
        plan: 'freemium',
        skills: ['figma'],
        expectedSalarySGD: 12000,
        yearsExperience: 1
      },
      job: {
        salaryMinSGD: 5000,
        salaryMaxSGD: 7000,
        requirements: ['roadmap planning', 'stakeholder management', '5+ years experience'],
        employer: { size: 'Startup', diversityScore: 0.3 }
      }
    });

    expect(resultLikely.total).toBeGreaterThanOrEqual(70);
    expect(resultLikely.verdict).toBe('Likely');
    expect(resultBorderline.total).toBeGreaterThanOrEqual(50);
    expect(resultBorderline.total).toBeLessThan(70);
    expect(resultBorderline.verdict).toBe('Borderline');
    expect(resultUnlikely.total).toBeLessThan(50);
    expect(resultUnlikely.verdict).toBe('Unlikely');
  });
});
