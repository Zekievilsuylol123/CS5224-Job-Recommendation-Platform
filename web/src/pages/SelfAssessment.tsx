import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeResume, assessCompass, type ResumeAnalyzeResponse } from '../api/client';
import BreakdownCards from '../components/BreakdownCards';
import ProfileChips from '../components/ProfileChips';
import ResumeDropzone from '../components/ResumeDropzone';
import ScoreGauge from '../components/ScoreGauge';
import EmptyState from '../components/EmptyState';
import { useProfileStore, type StoredProfile } from '../store/profile';
import type { CompassScore, ParsedProfile, PlanTier } from '../types';

type Tab = 'basic' | 'resume' | 'score';
type ResumeStatus = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

const EDUCATION_OPTIONS = ['Diploma', 'Bachelors', 'Masters', 'PhD'] as const;
const PLAN_OPTIONS: PlanTier[] = ['freemium', 'standard', 'pro', 'ultimate'];
const GENDER_OPTIONS = ['Male', 'Female', 'Other'] as const;
const NATIONALITY_OPTIONS = [
  'Singaporean',
  'Malaysian',
  'Chinese',
  'Indian',
  'Indonesian',
  'Filipino',
  'Vietnamese',
  'Thai',
  'Bangladeshi',
  'Myanmar',
  'American',
  'British',
  'Australian',
  'Canadian',
  'Japanese',
  'Korean',
  'Other'
] as const;

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
    educationInstitution: parsed.educationInstitution ?? base.educationInstitution,
    yearsExperience: parsed.yearsExperience ?? base.yearsExperience,
    expectedSalarySGD: parsed.expectedSalarySGD ?? base.expectedSalarySGD,
    skills: [...new Set([...(base.skills ?? []), ...(parsed.skills ?? [])])],
    plan: base.plan
  };
}

export default function SelfAssessmentPage(): JSX.Element {
  const navigate = useNavigate();
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const profile = useProfileStore((state) => state.profile);
  const setBasicInfo = useProfileStore((state) => state.setBasicInfo);
  const setProfileStore = useProfileStore((state) => state.setProfile);
  const setParsedProfile = useProfileStore((state) => state.setParsedProfile);
  const saveProfileToDB = useProfileStore((state) => state.saveProfileToDB);
  const isLoading = useProfileStore((state) => state.isLoading);

  const [activeTab, setActiveTab] = useState<Tab>(profile ? 'score' : 'basic');
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
  const [score, setScore] = useState<CompassScore>(emptyScore);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [calculatingScore, setCalculatingScore] = useState(false);

  // Check if current score is already saved (matches DB score)
  const isScoreSaved = useMemo(() => {
    if (!profile?.latestCompassScore || score.total === 0) return false;
    return profile.latestCompassScore.total === score.total &&
           profile.latestCompassScore.verdict === score.verdict;
  }, [profile?.latestCompassScore, score]);

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
      setActiveTab('score');
      
      // Restore latest compass score if available
      if (profile.latestCompassScore) {
        setScore(profile.latestCompassScore);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (!analysis) return;
    const merged = mergeProfile(
      {
        ...draftProfile,
        plan: draftProfile.plan ?? basicInfo.plan,
        skills: draftProfile.skills ?? []
      },
      analysis.profile
    );
    setDraftProfile(merged);
    setParsedProfile(analysis.profile);
    
    // Calculate initial score after parsing (only if we don't have a saved score)
    if (!profile?.latestCompassScore) {
      setCalculatingScore(true);
      assessCompass({ user: merged })
        .then(({ score: newScore }) => {
          setScore(newScore);
          setCalculatingScore(false);
        })
        .catch((err) => {
          console.error('Failed to calculate initial score:', err);
          setCalculatingScore(false);
        });
    }
  }, [analysis, basicInfo.plan, setParsedProfile, profile?.latestCompassScore]);

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
    setActiveTab('resume');
  };

  const handleResumeUpload = async (file: File) => {
    setResumeError(undefined);
    setResumeStatus('uploading');
    try {
      setResumeStatus('analyzing');
      const result = await analyzeResume(file);
      setAnalysis(result);
      setResumeStatus('result');
      setActiveTab('score');
    } catch (error) {
      setResumeStatus('error');
      setResumeError(error instanceof Error ? error.message : 'Unable to analyze resume.');
    }
  };

  const handleUseProfile = async () => {
    const profileToSave = {
      ...draftProfile,
      id: draftProfile.id ?? 'local-user',
      skills: draftProfile.skills ?? [],
      plan: draftProfile.plan ?? 'freemium',
      latestCompassScore: score
    };
    
    setProfileStore(profileToSave);
    
    // Save to Supabase
    setSaving(true);
    try {
      await saveProfileToDB();
      // Score is now saved, button will be disabled via isScoreSaved
    } catch (error) {
      console.error('Failed to save profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSeeMatchedJobs = () => {
    navigate('/jobs');
  };

  const handleTweak = async () => {
    setRescoreError(undefined);
    setRescoring(true);
    try {
      // Send complete profile with all fields for accurate LLM scoring
      const { score: newScore } = await assessCompass({
        user: {
          id: draftProfile.id ?? 'local-user',
          name: draftProfile.name ?? basicInfo.name,
          gender: draftProfile.gender ?? basicInfo.gender,
          nationality: draftProfile.nationality ?? basicInfo.nationality,
          educationLevel: draftProfile.educationLevel ?? basicInfo.educationLevel,
          educationInstitution: draftProfile.educationInstitution,
          certifications: draftProfile.certifications,
          yearsExperience: draftProfile.yearsExperience,
          expectedSalarySGD: draftProfile.expectedSalarySGD,
          skills: draftProfile.skills ?? [],
          plan: draftProfile.plan ?? basicInfo.plan ?? 'freemium'
        }
      });
      setScore(newScore);
      // New score differs from saved score, button will be enabled via isScoreSaved
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

  // Check if resume has been uploaded
  const hasResumeData = !!analysis || !!profile?.skills?.length;
  
  // Check if score has been calculated
  const hasScore = score.total > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      <div className="mb-6 sm:mb-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Self-assessment</p>
        <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900">Get EP-ready in three quick steps</h2>
        <p className="mt-2 text-sm text-slate-500">
          Fill in essentials, upload your resume, and fine-tune your Compass score before shortlisting jobs.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 border-b border-slate-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('basic')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === 'basic'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }
            `}
          >
            1. Basic Info
          </button>
          <button
            onClick={() => setActiveTab('resume')}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === 'resume'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }
            `}
          >
            2. Resume Analysis
            {hasResumeData && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                ✓
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('score')}
            disabled={!hasResumeData}
            className={`
              whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors
              ${activeTab === 'score'
                ? 'border-brand-600 text-brand-600'
                : hasResumeData
                ? 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                : 'border-transparent text-slate-300 cursor-not-allowed'
              }
            `}
          >
            3. Score & Profile
            {hasScore && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                ✓
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'basic' && (
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
            <select
              name="gender"
              defaultValue={basicInfo.gender || ''}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select gender (optional)</option>
              {GENDER_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Nationality</label>
            <select
              name="nationality"
              defaultValue={basicInfo.nationality || ''}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Select nationality</option>
              {NATIONALITY_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
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
          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setActiveTab('resume')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              Skip to Resume
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
            >
              Save & Continue
            </button>
          </div>
        </form>
      )}

      {activeTab === 'resume' && (
        <div className="space-y-6">
          <ResumeDropzone
            status={resumeStatus}
            error={resumeError}
            result={score}
            onSelect={handleResumeUpload}
            onValidationError={(message) => {
              setResumeError(message);
              setResumeStatus('error');
            }}
          />
        </div>
      )}

      {activeTab === 'score' && (
        <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-card flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              {calculatingScore ? (
                <div className="flex flex-col items-center justify-center py-8 w-full">
                  <svg className="animate-spin h-12 w-12 text-brand-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-base sm:text-lg font-semibold text-slate-700">Calculating your Compass score...</p>
                  <p className="text-xs sm:text-sm text-slate-500 mt-2">This may take a few seconds</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-center sm:justify-start">
                    <ScoreGauge value={score.total} verdict={score.verdict} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg sm:text-xl font-semibold text-slate-900 text-center sm:text-left">
                      {isScoreSaved ? 'Profile activated' : 'Compass score ready'}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500 text-center sm:text-left">
                      {isScoreSaved
                        ? 'Tweak parameters above and recalculate to update your score.'
                        : 'Activate this profile to refresh recommendations and EP indicators immediately.'
                      }
                    </p>
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        onClick={handleUseProfile}
                        disabled={saving || isScoreSaved || score.total === 0}
                        className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed min-w-[140px]"
                      >
                        {saving ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Saving...
                          </>
                        ) : isScoreSaved ? (
                          <>
                            <svg className="mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                            Activated
                          </>
                        ) : (
                          'Use this profile'
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleSeeMatchedJobs}
                        className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
                      >
                        See Matched Jobs
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            <BreakdownCards score={score} />
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Fine-tune &amp; rescore</h3>
                <button
                  type="button"
                  onClick={() => setActiveTab('resume')}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
                  title="Upload a new resume to refresh your profile"
                >
                  <svg className="h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 101.09 1.03l2.955-3.129v8.614z" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                  </svg>
                  <span className="hidden sm:inline">Upload New Resume</span>
                  <span className="sm:hidden">New Resume</span>
                </button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                  className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {rescoring && (
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {rescoring ? 'Recalculating...' : 'Recalculate score'}
                </button>
                {rescoreError && <p className="text-sm text-red-500">{rescoreError}</p>}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <ProfileChips profile={draftProfile} />
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-600">Profile extracted</h3>
              <p className="mt-2 text-sm text-slate-600">
                Your resume has been parsed successfully. Review and edit the extracted information above to ensure accuracy before calculating your Compass score.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
