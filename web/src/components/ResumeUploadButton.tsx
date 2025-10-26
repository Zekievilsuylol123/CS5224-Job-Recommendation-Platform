import { useState } from 'react';
import { Link } from 'react-router-dom';
import { analyzeResume, type ResumeAnalyzeResponse } from '../api/client';
import { useProfileStore, type BasicInfo } from '../store/profile';
import Modal from './Modal';
import ResumeDropzone, { type ResumeUploadStatus } from './ResumeDropzone';
import ScoreGauge from './ScoreGauge';
import BreakdownCards from './BreakdownCards';

export default function ResumeUploadButton(): JSX.Element {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<ResumeUploadStatus>('idle');
  const [error, setError] = useState<string>();
  const [analysis, setAnalysis] = useState<ResumeAnalyzeResponse>();

  const profile = useProfileStore((state) => state.profile);
  const basicInfo = useProfileStore((state) => state.basicInfo);
  const mergeProfile = useProfileStore((state) => state.mergeProfile);
  const setBasicInfo = useProfileStore((state) => state.setBasicInfo);
  const setParsedProfile = useProfileStore((state) => state.setParsedProfile);

  const handleOpen = () => {
    setOpen(true);
    setError(undefined);
    setStatus(analysis ? 'result' : 'idle');
  };

  const handleClose = () => {
    setOpen(false);
    // keep last analysis so users can revisit summary, but reset UI back to idle next time
    setStatus(analysis ? 'result' : 'idle');
  };

  const handleValidationError = (message: string) => {
    setError(message);
    setStatus('error');
  };

  const handleSelect = async (file: File) => {
    setError(undefined);
    setStatus('uploading');
    try {
      setStatus('analyzing');
      const result = await analyzeResume(file);
      setAnalysis(result);
      setStatus('result');

      const parsed = result.profile;
      const nextProfile = {
        id: profile?.id ?? 'local-user',
        name: parsed.name ?? profile?.name,
        gender: parsed.gender ?? profile?.gender,
        nationality: parsed.nationality ?? profile?.nationality,
        educationLevel: parsed.educationLevel ?? profile?.educationLevel ?? basicInfo.educationLevel,
        yearsExperience: parsed.yearsExperience ?? profile?.yearsExperience,
        expectedSalarySGD: parsed.expectedSalarySGD ?? profile?.expectedSalarySGD,
        skills: parsed.skills ?? profile?.skills ?? [],
        plan: profile?.plan ?? basicInfo.plan
      };

      mergeProfile(nextProfile);
      setParsedProfile(parsed);

      const basicUpdates: Partial<BasicInfo> = {};
      if (parsed.name) basicUpdates.name = parsed.name;
      if (parsed.gender) basicUpdates.gender = parsed.gender;
      if (parsed.nationality) basicUpdates.nationality = parsed.nationality;
      if (parsed.educationLevel) basicUpdates.educationLevel = parsed.educationLevel;
      if (Object.keys(basicUpdates).length > 0) {
        setBasicInfo(basicUpdates);
      }
    } catch (cause) {
      setStatus('error');
      setError(cause instanceof Error ? cause.message : 'Unable to analyze resume right now.');
    }
  };

  const score = analysis?.score;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="hidden items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 lg:flex"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path d="M10 4a.75.75 0 0 1 .75.75V9.25h4.5a.75.75 0 0 1 0 1.5h-4.5v4.5a.75.75 0 0 1-1.5 0v-4.5H4.25a.75.75 0 0 1 0-1.5h4.5V4.75A.75.75 0 0 1 10 4Z" />
        </svg>
        Upload Resume
      </button>
      <button
        type="button"
        onClick={handleOpen}
        className="lg:hidden inline-flex items-center justify-center rounded-full border border-brand-200 bg-white px-3 py-1.5 text-xs font-semibold text-brand-600 shadow-sm transition hover:bg-brand-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
      >
        Upload
      </button>
      <Modal
        open={open}
        onClose={handleClose}
        title="Upload your resume"
        description="We parse your resume to refresh your Compass score and highlight top tips instantly."
        footer={
          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
            >
              Close
            </button>
            {analysis && (
              <Link
                to="/dashboard"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                onClick={handleClose}
              >
                View Dashboard
              </Link>
            )}
          </div>
        }
      >
        <ResumeDropzone
          status={status}
          onSelect={handleSelect}
          error={error}
          result={score}
          onValidationError={handleValidationError}
        />
        {analysis && (
          <div className="mt-6 space-y-6">
            <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 md:flex-row md:items-center">
              <ScoreGauge value={score?.total ?? 0} verdict={score?.verdict ?? 'Borderline'} size={140} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">
                  Latest Compass score generated from your resume
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  We&apos;ve merged these details into your profile to keep job recommendations fresh.
                </p>
                {analysis.tips.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm text-slate-600">
                    {analysis.tips.slice(0, 3).map((tip, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="mt-1 inline-block h-2 w-2 rounded-full bg-brand-500" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <BreakdownCards score={score} />
          </div>
        )}
      </Modal>
    </>
  );
}
