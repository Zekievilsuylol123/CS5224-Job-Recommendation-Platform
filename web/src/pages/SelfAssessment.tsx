import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analyzeResume, assessCompass, fetchResumeAnalyses, type ResumeAnalyzeResponse, type ResumeAnalysis } from '../api/client';
import BreakdownCards from '../components/BreakdownCards';
import ProfileChips from '../components/ProfileChips';
import ResumeDropzone from '../components/ResumeDropzone';
import ScoreGauge from '../components/ScoreGauge';
import EmptyState from '../components/EmptyState';
import OnboardingTour from '../components/OnboardingTour';
import { useProfileStore, type StoredProfile } from '../store/profile';
import type { CompassScore, ParsedProfile, PlanTier } from '../types';

type Tab = 'basic' | 'resume' | 'score';
type ResumeStatus = 'idle' | 'uploading' | 'analyzing' | 'result' | 'error';

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
  totalRaw: 0,
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
    plan: base.plan ?? 'freemium'
  };
}

export default function SelfAssessmentPage(): JSX.Element {
  const navigate = useNavigate();
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const profile = useProfileStore((state) => state.profile);
  const hasCompletedOnboarding = useProfileStore((state) => state.hasCompletedOnboarding);
  const setBasicInfo = useProfileStore((state) => state.setBasicInfo);
  const setProfileStore = useProfileStore((state) => state.setProfile);
  const setParsedProfile = useProfileStore((state) => state.setParsedProfile);
  const saveProfileToDB = useProfileStore((state) => state.saveProfileToDB);
  const loadProfileFromDB = useProfileStore((state) => state.loadProfileFromDB);
  const clearNonActivatedProfile = useProfileStore((state) => state.clearNonActivatedProfile);
  const completeOnboarding = useProfileStore((state) => state.completeOnboarding);
  const isLoading = useProfileStore((state) => state.isLoading);

  const [activeTab, setActiveTab] = useState<Tab>('basic');
  const [resumeStatus, setResumeStatus] = useState<ResumeStatus>('idle');
  const [resumeError, setResumeError] = useState<string>();
  const [analysis, setAnalysis] = useState<ResumeAnalyzeResponse>();
  const [resumeAnalyses, setResumeAnalyses] = useState<ResumeAnalysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(false);
  const [draftProfile, setDraftProfile] = useState<StoredProfile>(() => ({
    id: 'local-user',
    name: basicInfo.name,
    gender: basicInfo.gender,
    nationality: basicInfo.nationality,
    educationLevel: 'Bachelors',
    plan: 'freemium',
    skills: []
  }));
  const [score, setScore] = useState<CompassScore>(emptyScore);
  const [rescoring, setRescoring] = useState(false);
  const [rescoreError, setRescoreError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [calculatingScore, setCalculatingScore] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [savingBasicInfo, setSavingBasicInfo] = useState(false);
  const [basicInfoSaved, setBasicInfoSaved] = useState(false);
  const [currentFormValues, setCurrentFormValues] = useState({
    name: basicInfo.name,
    gender: basicInfo.gender,
    nationality: basicInfo.nationality
  });

  // Tour steps
  const tourSteps = [
    {
      target: '[data-tour="basic-info-form"]',
      title: 'Welcome! Start with Basic Info',
      content: 'Fill in your name and basic details here. This is the first step to getting your EP readiness score.',
      position: 'bottom' as const,
    },
    {
      target: '[data-tour="resume-tab"]',
      title: 'Resume Upload Next',
      content: 'After filling basic info, you\'ll unlock the Resume tab. Upload your resume to extract your skills and experience automatically.',
      position: 'bottom' as const,
    },
    {
      target: '[data-tour="score-tab"]',
      title: 'Get Your COMPASS Score',
      content: 'Once your resume is analyzed, the Score tab unlocks. Review your EP readiness score and activate your profile to access job listings.',
      position: 'bottom' as const,
    },
    {
      target: '[data-tour="locked-navigation"]',
      title: 'Complete Onboarding to Unlock',
      content: 'Jobs, Dashboard, and Applications are locked until you activate your profile. Complete the assessment to unlock all features!',
      position: 'bottom' as const,
    },
  ];

  // Check if current score is already saved (matches DB score)
  const isScoreSaved = useMemo(() => {
    if (!profile?.latestCompassScore || score.total === 0) return false;
    return profile.latestCompassScore.total === score.total &&
           profile.latestCompassScore.verdict === score.verdict;
  }, [profile?.latestCompassScore, score]);

  // Clear non-activated profile on mount
  useEffect(() => {
    clearNonActivatedProfile();
  }, [clearNonActivatedProfile]);

  // Show tour for first-time users
  useEffect(() => {
    if (!hasCompletedOnboarding && !profile && !isLoading) {
      // Delay to let the page render first
      const timer = setTimeout(() => {
        setShowTour(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, profile, isLoading]);

  // Fetch resume analyses when tab becomes active
  useEffect(() => {
    if (activeTab === 'resume') {
      setLoadingAnalyses(true);
      fetchResumeAnalyses()
        .then((data) => setResumeAnalyses(data.analyses))
        .catch((err) => console.error('Failed to fetch resume analyses:', err))
        .finally(() => setLoadingAnalyses(false));
    }
  }, [activeTab]);

  useEffect(() => {
    setDraftProfile((prev) => ({
      ...prev,
      name: basicInfo.name,
      gender: basicInfo.gender,
      nationality: basicInfo.nationality
    }));
  }, [basicInfo]);

  useEffect(() => {
    if (profile && profile.id && profile.id !== 'local-user') {
      // Only restore if profile is activated (has real ID from database)
      setDraftProfile((prev) => ({
        ...prev,
        ...profile,
        skills: profile.skills ?? []
      }));
      
      // Restore latest compass score if available
      if (profile.latestCompassScore) {
        // Ensure totalRaw exists (backward compatibility)
        let rawScore = profile.latestCompassScore.totalRaw;
        
        if (!rawScore && profile.latestCompassScore.breakdown) {
          // Calculate from breakdown if totalRaw missing (legacy scores)
          const breakdown = profile.latestCompassScore.breakdown;
          rawScore = (breakdown.salary || 0) + 
                     (breakdown.qualifications || 0) + 
                     (breakdown.diversity || 0) + 
                     (breakdown.support || 0) + 
                     (breakdown.skills || 0) + 
                     (breakdown.strategic || 0);
        }
        
        const restoredScore = {
          ...profile.latestCompassScore,
          totalRaw: rawScore || 0
        };
        setScore(restoredScore as CompassScore);
      }
      
      // Only navigate to score tab if profile is activated
      setActiveTab('score');
    } else {
      // No activated profile, start from basic info
      setActiveTab('basic');
    }
  }, [profile]);

  useEffect(() => {
    if (!analysis) return;
    const merged = mergeProfile(
      {
        ...draftProfile,
        plan: draftProfile.plan ?? 'freemium',
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
  }, [analysis, setParsedProfile, profile?.latestCompassScore]);

  const handleBasicInfoSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextBasicInfo = {
      name: formName,
      gender: formGender || undefined,
      nationality: formNationality || undefined
    };
    
    // Update local state
    setBasicInfo(nextBasicInfo);
    setDraftProfile((prev) => ({
      ...prev,
      ...nextBasicInfo
    }));
    
    // Update profile store with basic info then save to database
    setProfileStore({
      ...draftProfile,
      ...nextBasicInfo,
      id: profile?.id,
      skills: draftProfile.skills || []
    });
    
    // Save to database
    setSavingBasicInfo(true);
    saveProfileToDB()
      .then(() => {
        setBasicInfoSaved(true);
        // Update current form values to match saved values
        setCurrentFormValues({
          name: formName,
          gender: formGender || undefined,
          nationality: formNationality || undefined
        });
        setActiveTab('resume');
      })
      .catch((error) => {
        console.error('Failed to save basic info:', error);
        // Still proceed to resume tab even if save fails
        setActiveTab('resume');
      })
      .finally(() => {
        setSavingBasicInfo(false);
      });
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
    // Just reload from DB - the COMPASS score is already saved there from recalculation
    setSaving(true);
    try {
      await loadProfileFromDB();
      // Score is now loaded from DB, button will be disabled via isScoreSaved
    } catch (error) {
      console.error('Failed to load profile:', error);
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
          educationLevel: draftProfile.educationLevel,
          educationInstitution: draftProfile.educationInstitution,
          certifications: draftProfile.certifications,
          yearsExperience: draftProfile.yearsExperience,
          expectedSalarySGD: draftProfile.expectedSalarySGD,
          skills: draftProfile.skills ?? [],
          plan: draftProfile.plan ?? 'freemium'
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

  // Check if resume has been uploaded (either in this session OR saved to DB with skills)
  const hasResumeData = !!analysis || !!(profile && profile.id && profile.id !== 'local-user' && profile.skills && profile.skills.length > 0);
  
  // Check if score has been calculated
  const hasScore = score.total > 0;

  // Check if basic info has been filled
  // Track current form input values
  const [formName, setFormName] = useState(basicInfo.name);
  const [formGender, setFormGender] = useState(basicInfo.gender || '');
  const [formNationality, setFormNationality] = useState(basicInfo.nationality || '');

  const hasBasicInfo = !!formName;

  // Check if basic info form has changed since last save
  const hasBasicInfoChanged = 
    formName !== currentFormValues.name ||
    formGender !== (currentFormValues.gender || '') ||
    formNationality !== (currentFormValues.nationality || '');

  // Sync form values when basicInfo is loaded from DB
  useEffect(() => {
    if (basicInfo.name && !formName) {
      setFormName(basicInfo.name);
      setFormGender(basicInfo.gender || '');
      setFormNationality(basicInfo.nationality || '');
      setCurrentFormValues({
        name: basicInfo.name,
        gender: basicInfo.gender,
        nationality: basicInfo.nationality
      });
    }
  }, [basicInfo]);

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12">
      {/* Onboarding Tour */}
      <OnboardingTour
        steps={tourSteps}
        isActive={showTour}
        onComplete={() => {
          setShowTour(false);
          completeOnboarding();
        }}
        onSkip={() => {
          setShowTour(false);
          completeOnboarding();
        }}
      />

      <div className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Self-assessment</p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-semibold text-slate-900">Get EP-ready in three quick steps</h2>
            <p className="mt-2 text-sm text-slate-500">
              Fill in essentials, upload your resume, and fine-tune your Compass score before shortlisting jobs.
            </p>
          </div>
          {hasCompletedOnboarding && (
            <button
              onClick={() => setShowTour(true)}
              className="flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition-colors"
              title="Restart onboarding tour"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Help</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-8 border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('basic')}
            className={`
              whitespace-nowrap border-b-2 py-3 sm:py-4 px-1 text-xs sm:text-sm font-medium transition-colors flex-shrink-0
              ${activeTab === 'basic'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }
            `}
          >
            1. Basic Info
            {hasBasicInfo && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                ✓
              </span>
            )}
          </button>
          <button
            data-tour="resume-tab"
            onClick={() => hasBasicInfo && setActiveTab('resume')}
            disabled={!hasBasicInfo}
            className={`
              whitespace-nowrap border-b-2 py-3 sm:py-4 px-1 text-xs sm:text-sm font-medium transition-colors flex-shrink-0
              ${activeTab === 'resume'
                ? 'border-brand-600 text-brand-600'
                : hasBasicInfo
                ? 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                : 'border-transparent text-slate-300 cursor-not-allowed'
              }
            `}
          >
            2. Resume
            {hasResumeData && (
              <span className="ml-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                ✓
              </span>
            )}
          </button>
          <button
            data-tour="score-tab"
            onClick={() => hasResumeData && setActiveTab('score')}
            disabled={!hasResumeData}
            className={`
              whitespace-nowrap border-b-2 py-3 sm:py-4 px-1 text-xs sm:text-sm font-medium transition-colors flex-shrink-0
              ${activeTab === 'score'
                ? 'border-brand-600 text-brand-600'
                : hasResumeData
                ? 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                : 'border-transparent text-slate-300 cursor-not-allowed'
              }
            `}
          >
            3. Score
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
          data-tour="basic-info-form"
          onSubmit={handleBasicInfoSubmit}
          className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card grid gap-6 md:grid-cols-2"
        >
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Name *</label>
            <input
              name="name"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Alex Tan"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Gender</label>
            <select
              name="gender"
              value={formGender}
              onChange={(e) => setFormGender(e.target.value)}
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
              value={formNationality}
              onChange={(e) => setFormNationality(e.target.value)}
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
          <div className="md:col-span-2">
            <p className="text-xs text-slate-500 italic">
              Education level and other details will be extracted from your resume in the next step.
            </p>
          </div>
          <div className="md:col-span-2 flex justify-end gap-3">
            <button
              type="submit"
              disabled={savingBasicInfo || !hasBasicInfoChanged || !hasBasicInfo}
              className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingBasicInfo ? 'Saving...' : 'Save & Continue'}
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

          {/* Resume Analyses History */}
          {loadingAnalyses ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-6 w-6 text-brand-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span className="ml-3 text-sm text-slate-600">Loading resume history...</span>
              </div>
            </div>
          ) : resumeAnalyses.length > 0 && (
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-card">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Resume Upload History</h3>
              <div className="space-y-4">
                {resumeAnalyses.map((analysis, index) => (
                  <details key={analysis.id} className="group border border-slate-200 rounded-lg" open={index === 0}>
                    <summary className="cursor-pointer p-4 hover:bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <svg className="h-5 w-5 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
                            </svg>
                            <div>
                              <p className="font-medium text-slate-900">{analysis.file_name}</p>
                              <p className="text-xs text-slate-500">
                                Uploaded {new Date(analysis.created_at).toLocaleDateString()} at {new Date(analysis.created_at).toLocaleTimeString()} 
                                {' · '}{(analysis.file_size / 1024).toFixed(1)} KB
                                {' · '}Processed in {analysis.processing_time_ms}ms
                              </p>
                            </div>
                          </div>
                        </div>
                        <svg className="h-5 w-5 text-slate-400 group-open:rotate-180 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </summary>
                    <div className="px-4 pb-4 pt-2 border-t border-slate-200 bg-slate-50">
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Basic Info */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Contact Information</h4>
                          <dl className="space-y-1 text-sm">
                            <div>
                              <dt className="inline font-medium text-slate-600">Name: </dt>
                              <dd className="inline text-slate-900">{analysis.parsed_data.name}</dd>
                            </div>
                            <div>
                              <dt className="inline font-medium text-slate-600">Email: </dt>
                              <dd className="inline text-slate-900">{analysis.parsed_data.email}</dd>
                            </div>
                            <div>
                              <dt className="inline font-medium text-slate-600">Phone: </dt>
                              <dd className="inline text-slate-900">{analysis.parsed_data.telephone}</dd>
                            </div>
                          </dl>
                        </div>

                        {/* Skills */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">
                            Skills ({analysis.parsed_data.skills?.length || 0})
                          </h4>
                          <div className="flex flex-wrap gap-1">
                            {analysis.parsed_data.skills?.slice(0, 12).map((skill, i) => (
                              <span key={i} className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700">
                                {skill}
                              </span>
                            ))}
                            {(analysis.parsed_data.skills?.length || 0) > 12 && (
                              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                                +{(analysis.parsed_data.skills?.length || 0) - 12} more
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Education */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Education</h4>
                          <div className="space-y-2">
                            {analysis.parsed_data.education?.map((edu, i) => (
                              <div key={i} className="text-sm">
                                <p className="font-medium text-slate-900">{edu.degree} in {edu.field_of_study}</p>
                                <p className="text-xs text-slate-600">{edu.institution} · {edu.duration}</p>
                              </div>
                            )) || <p className="text-xs text-slate-500">No education data</p>}
                          </div>
                        </div>

                        {/* Experience */}
                        <div>
                          <h4 className="text-sm font-semibold text-slate-700 mb-2">Experience</h4>
                          <div className="space-y-2">
                            {analysis.parsed_data.experience?.slice(0, 3).map((exp, i) => (
                              <div key={i} className="text-sm">
                                <p className="font-medium text-slate-900">{exp.job_title}</p>
                                <p className="text-xs text-slate-600">{exp.company} · {exp.duration}</p>
                                <p className="text-xs text-slate-500 line-clamp-2 mt-1">{exp.description}</p>
                              </div>
                            )) || <p className="text-xs text-slate-500">No experience data</p>}
                            {(analysis.parsed_data.experience?.length || 0) > 3 && (
                              <p className="text-xs text-slate-500">+{(analysis.parsed_data.experience?.length || 0) - 3} more positions</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          )}
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
                    <ScoreGauge value={score.totalRaw} verdict={score.verdict} />
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
                        className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
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
