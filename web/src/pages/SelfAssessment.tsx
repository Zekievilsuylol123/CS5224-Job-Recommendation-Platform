import { useEffect, useMemo, useState } from 'react';
import { analyzeResume, assessCompass, type ResumeAnalyzeResponse } from '../api/client';
import BreakdownCards from '../components/BreakdownCards';
import ProfileChips from '../components/ProfileChips';
import ResumeDropzone from '../components/ResumeDropzone';
import ScoreGauge from '../components/ScoreGauge';
import EmptyState from '../components/EmptyState';
import { useProfileStore, type StoredProfile } from '../store/profile';
import type { CompassScore, ParsedProfile, PlanTier } from '../types';

type Step = 1 | 2 | 3;
type ResumeStatus = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

const EDUCATION_OPTIONS = ['Diploma', 'Bachelors', 'Masters', 'PhD'] as const;
const PLAN_OPTIONS: PlanTier[] = ['freemium', 'standard', 'pro', 'ultimate'];

const emptyScore: CompassScore = {
  total: 0,
  breakdown: { salary: 0, qualifications: 0, diversity: 0, support: 0, skills: 0, strategic: 0 },
  verdict: 'Borderline',
  notes: []
};

function mergeProfile(base: StoredProfile, parsed: ParsedProfile): StoredProfile {
  return {
    ...base,
    name: parsed.name ?? base.name,
    gender: parsed.gender ?? base.gender,
    nationality: parsed.nationality ?? base.nationality,
    educationLevel: parsed.educationLevel ?? base.educationLevel,
    yearsExperience: parsed.yearsExperience ?? base.yearsExperience,
    expectedSalarySGD: parsed.expectedSalarySGD ?? base.expectedSalarySGD,
    skills: [...new Set([...(base.skills ?? []), ...(parsed.skills ?? [])])],
    plan: base.plan
  };
}

export default function SelfAssessmentPage(): JSX.Element {
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const profile = useProfileStore((state) => state.profile);
  const setBasicInfo = useProfileStore((state) => state.setBasicInfo);
  const setProfileStore = useProfileStore((state) => state.setProfile);
  const setParsedProfile = useProfileStore((state) => state.setParsedProfile);

  const [step, setStep] = useState<Step>(profile ? 3 : 1);
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>('idle');
  const [resumeError, setResumeError] = useState<string>();
  const [analysis, setAnalysis] = useState<ResumeAnalyzeResponse>();
  const [draftProfile, setDraftProfile] = useState<StoredProfile>(() => ({
    id: profile?.id ?? 'local-user',
    name: basicInfo.name,
    gender: basicInfo.gender,
    nationality: basicInfo.nationality,
    educationLevel: basicInfo.educationLevel,
    plan: basicInfo.plan,
    skills: profile?.skills ?? []
  }));
  const [score, setScore] = useState<CompassScore>(analysis?.score ?? emptyScore);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string>();

  useEffect(() => {
    setDraftProfile((prev) => ({
      ...prev,
      name: basicInfo.name,
      gender: basicInfo.gender,
      nationality: basicInfo.nationality,
      educationLevel: basicInfo.educationLevel,
      plan: basicInfo.plan
    }));
  }, [basicInfo]);

  useEffect(() => {
    if (profile) {
      setDraftProfile((prev) => ({
        ...prev,
        ...profile,
        skills: profile.skills ?? []
      }));
      setStep(3);
    }
  }, [profile]);

  useEffect(() => {
    if (!analysis) return;
    setDraftProfile((prev) =>
      mergeProfile(
        {
          ...prev,
          plan: prev.plan ?? basicInfo.plan,
          skills: prev.skills ?? []
        },
        analysis.profile
      )
    );
    setScore(analysis.score);
    setParsedProfile(analysis.profile);
  }, [analysis, basicInfo.plan, setParsedProfile]);

  const handleBasicInfoSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextBasicInfo = {
      name: String(formData.get('name') ?? ''),
      gender: String(formData.get('gender') ?? '') || undefined,
      nationality: String(formData.get('nationality') ?? '') || undefined,
      educationLevel: formData.get('educationLevel') as (typeof EDUCATION_OPTIONS)[number],
      plan: formData.get('plan') as PlanTier
    };
    setBasicInfo(nextBasicInfo);
    setDraftProfile((prev) => ({
      ...prev,
      ...nextBasicInfo
    }));
    setStep(2);
  };

  const handleResumeUpload = async (file: File) => {
    setResumeError(undefined);
    setResumeStatus('uploading');
    try {
      setResumeStatus('analyzing');
      const result = await analyzeResume(file);
      setAnalysis(result);
      setResumeStatus('result');
      setStep(3);
    } catch (error) {
      setResumeStatus('error');
      setResumeError(error instanceof Error ? error.message : 'Unable to analyze resume.');
    }
  };

  const handleUseProfile = () => {
    setProfileStore({
      ...draftProfile,
      id: draftProfile.id ?? 'local-user',
      skills: draftProfile.skills ?? [],
      plan: draftProfile.plan ?? 'freemium'
    });
  };

  const handleTweak = async () => {
    setRescoreError(undefined);
    setRescoring(true);
    try {
      const { score: newScore } = await assessCompass({
        user: {
          ...draftProfile,
          skills: draftProfile.skills ?? []
        }
      });
      setScore(newScore);
      setRescoring(false);
    } catch (error) {
      setRescoring(false);
      setRescoreError(error instanceof Error ? error.message : 'Unable to recompute score.');
    }
  };

  const handleSkillChange = (value: string) => {
    const nextSkills = value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    setDraftProfile((prev) => ({
      ...prev,
      skills: nextSkills
    }));
  };

  const currentSkills = draftProfile.skills ?? [];

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Self-assessment</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Get EP-ready in three quick steps</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fill in essentials, upload your resume, and fine-tune your Compass score before shortlisting jobs.
        </p>
      </div>

      <ol className="mb-10 flex flex-col gap-3 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
        <li className={step >= 1 ? 'font-semibold text-brand-600' : ''}>1. Basic info</li>
        <li className={step >= 2 ? 'font-semibold text-brand-600' : ''}>2. Resume analysis</li>
        <li className={step >= 3 ? 'font-semibold text-brand-600' : ''}>3. Score &amp; tips</li>
      </ol>

      {step === 1 && (
        <form
          onSubmit={handleBasicInfoSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card grid gap-6 md:grid-cols-2"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
            <input
              name="name"
              defaultValue={basicInfo.name}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Alex Tan"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</label>
            <input
              name="gender"
              defaultValue={basicInfo.gender}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Nationality</label>
            <input
              name="nationality"
              defaultValue={basicInfo.nationality}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Singaporean"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Highest education
            </label>
            <select
              name="educationLevel"
              defaultValue={basicInfo.educationLevel}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {EDUCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Plan</label>
            <select
              name="plan"
              defaultValue={basicInfo.plan}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {PLAN_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Continue to resume upload
            </button>
          </div>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <ResumeDropzone
            status={resumeStatus}
            error={resumeError}
            result={analysis?.score}
            onSelect={handleResumeUpload}
            onValidationError={(message) => {
              setResumeError(message);
              setResumeStatus('error');
            }}
          />
          {analysis?.tips && analysis.tips.length > 0 && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Quick tips</h3>
              <ul className="mt-3 space-y-2 text-sm text-amber-800">
                {analysis.tips.map((tip) => (
                  <li key={tip}>- {tip}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <ScoreGauge value={score.total} verdict={score.verdict} />
              <div>
                <h3 className="text-xl font-semibold text-slate-900">Compass score ready</h3>
                <p className="mt-2 text-sm text-slate-500">
                  Activate this profile to refresh recommendations and EP indicators immediately.
                </p>
                <button
                  type="button"
                  onClick={handleUseProfile}
                  className="mt-4 inline-flex items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Use this profile
                </button>
              </div>
            </div>
            <BreakdownCards score={score} />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Fine-tune &amp; rescore</h3>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Years of experience
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftProfile.yearsExperience ?? ''}
                    onChange={(event) =>
                      setDraftProfile((prev) => ({
                        ...prev,
                        yearsExperience: event.target.value ? Number.parseInt(event.target.value, 10) : undefined
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Expected salary (SGD)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={draftProfile.expectedSalarySGD ?? ''}
                    onChange={(event) =>
                      setDraftProfile((prev) => ({
                        ...prev,
                        expectedSalarySGD: event.target.value ? Number.parseInt(event.target.value, 10) : undefined
                      }))
                    }
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Core skills (comma separated)
                  </label>
                  <textarea
                    value={currentSkills.join(', ')}
                    onChange={(event) => handleSkillChange(event.target.value)}
                    className="mt-2 h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleTweak}
                  disabled={rescoring}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
                >
                  {rescoring ? 'Recalculating...' : 'Recalculate score'}
                </button>
                {rescoreError && <p className="text-sm text-red-500">{rescoreError}</p>}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <ProfileChips profile={draftProfile} />
            {analysis?.tips && analysis.tips.length > 0 ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-emerald-700">Resume tips</h3>
                <ul className="mt-3 space-y-2 text-sm text-emerald-900">
                  {analysis.tips.map((tip) => (
                    <li key={tip}>- {tip}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <EmptyState
                title="Upload a resume to unlock tips"
                description="We surface suggestions once parsing completes. Upload or tweak your resume to get the most accurate score."
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
