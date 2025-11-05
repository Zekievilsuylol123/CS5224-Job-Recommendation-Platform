import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import BreakdownCards from '../components/BreakdownCards';
import ProfileChips from '../components/ProfileChips';
import ScoreGauge from '../components/ScoreGauge';
import { assessCompass, createApplication } from '../api/client';
import { useJobDetail } from '../hooks/useJobs';
import { useProfileStore } from '../store/profile';
import type { CompassScore } from '../types';

export default function JobDetailPage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useJobDetail(id);
  const profile = useProfileStore((state) => state.profile);
  const addApplication = useProfileStore((state) => state.addApplication);
  const [scoreOverride, setScoreOverride] = useState(data?.score);
  const [verdictOverride, setVerdictOverride] = useState(data?.epIndicator);
  const [scoreDetails, setScoreDetails] = useState<CompassScore | undefined>(
    data?.score && data.breakdown
      ? {
          total: data.score,
          breakdown: data.breakdown,
          verdict: data.epIndicator ?? 'Borderline',
          notes: data.rationale ?? []
        }
      : undefined
  );
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');

  useEffect(() => {
    if (data?.score !== undefined) {
      setScoreOverride(data.score);
      setVerdictOverride(data.epIndicator);
      if (data.breakdown) {
        setScoreDetails({
          total: data.score,
          breakdown: data.breakdown,
          verdict: data.epIndicator ?? 'Borderline',
          notes: data.rationale ?? []
        });
      }
    }
  }, [data?.score, data?.epIndicator, data?.breakdown, data?.rationale]);

  if (!id) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <p className="text-sm text-red-500">Job not found.</p>
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <p className="text-sm text-slate-500">Loading job details...</p>
      </div>
    );
  }

  const handleAssessFit = async () => {
    if (!profile) {
      navigate('/assessment');
      return;
    }
    setStatus('loading');
    try {
      const { score } = await assessCompass({ user: profile, job: data });
      setScoreOverride(score.total);
      setVerdictOverride(score.verdict);
      setScoreDetails(score);
      setStatus('success');
      setStatusMessage('Fit updated with your latest profile.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Unable to update fit.');
    }
  };

  const handleApply = async () => {
    if (!profile) {
      navigate('/assessment');
      return;
    }
    try {
      const application = await createApplication({
        userId: profile.id ?? 'local-user',
        jobId: data.id
      });
      addApplication(application);
      setStatus('success');
      setStatusMessage('Application recorded. Track it in Applications.');
    } catch (error) {
      setStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Unable to create application.');
    }
  };

  const handleContactHR = () => {
    setStatus('success');
    setStatusMessage('HR contact request sent (mock).');
  };

  const currentScore = scoreOverride ?? data.score ?? 0;
  const currentVerdict = verdictOverride ?? data.epIndicator ?? 'Borderline';

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-10 lg:flex-row">
        <div className="flex-1 space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-slate-500">{data.company}</p>
                <h1 className="text-3xl font-semibold text-slate-900">{data.title}</h1>
                <p className="mt-2 text-sm text-slate-500">
                  {data.location} · {data.industry}
                </p>
              </div>
              <ScoreGauge value={currentScore} verdict={currentVerdict} />
            </div>
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-slate-600">{data.description}</p>
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Requirements</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {data.requirements.map((req) => (
                  <li key={req}>- {req}</li>
                ))}
              </ul>
            </div>
            <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-500">
              <span>
                Salary:{' '}
                {data.salaryMinSGD && data.salaryMaxSGD
                  ? `$${data.salaryMinSGD.toLocaleString()} - $${data.salaryMaxSGD.toLocaleString()}`
                  : 'Pending'}
              </span>
              <span>Employer size: {data.employer.size}</span>
              {data.employer.diversityScore && (
                <span>Diversity: {(data.employer.diversityScore * 100).toFixed(0)}%</span>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-3">
              <button
                type="button"
                onClick={handleAssessFit}
                className="rounded-lg bg-brand-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                Assess fit with my profile
              </button>
              <button
                type="button"
                onClick={handleContactHR}
                className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700"
              >
                Contact HR
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="rounded-lg border border-brand-200 px-5 py-2 text-sm font-semibold text-brand-600 hover:border-brand-400 hover:text-brand-700"
              >
                Apply (mock)
              </button>
            </div>
            {status === 'loading' && <p className="mt-4 text-sm text-slate-500">Recalculating fit...</p>}
            {status !== 'idle' && status !== 'loading' && (
              <p className="mt-4 text-sm text-slate-500">{statusMessage}</p>
            )}
          </div>

          <div className="space-y-6">
            <BreakdownCards score={scoreDetails} />
            <div className="rounded-3xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">EP Rationale</h3>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                {(scoreDetails?.notes ?? data.rationale ?? []).map((item) => (
                  <li key={item}>- {item}</li>
                ))}
                {(scoreDetails?.notes ?? data.rationale ?? []).length === 0 && <li>No rationale provided.</li>}
              </ul>
            </div>
          </div>
        </div>
        <div className="w-full max-w-sm space-y-6">
          <ProfileChips profile={profile} title="Your Profile Snapshot" />
          {data && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Keep improving</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                <li>- Update your profile after tweaking your resume.</li>
                <li>- Save tips and integrate them before re-assessment.</li>
                <li>- Track mock applications from the top navigation.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
