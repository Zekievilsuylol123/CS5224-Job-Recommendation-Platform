import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchApplications } from '../api/client';
import EmptyState from '../components/EmptyState';
import { useProfileStore } from '../store/profile';

export default function ApplicationsPage(): JSX.Element {
  const profile = useProfileStore((state) => state.profile);
  const applications = useProfileStore((state) => state.applications);
  const setApplications = useProfileStore((state) => state.setApplications);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setStatus('loading');
      try {
        const result = await fetchApplications();
        if (mounted) {
          setApplications(result.items);
          setStatus('idle');
        }
      } catch {
        if (mounted) setStatus('error');
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [setApplications]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <EmptyState
          title="No profile yet"
          description="Complete the assessment to start tracking mock applications."
          action={
            <Link
              to="/assessment"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Start self-assessment
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">Mock applications</h2>
        <p className="mt-2 text-sm text-slate-500">
          Track the roles you&apos;ve expressed interest in. This list stays local until you add persistent storage.
        </p>
      </div>
      {status === 'loading' && <p className="text-sm text-slate-500">Syncing applications…</p>}
      {status === 'error' && (
        <p className="text-sm text-red-500">Unable to refresh mock applications. Try again later.</p>
      )}
      {applications.length === 0 ? (
        <EmptyState
          title="No applications tracked"
          description="Use the Apply (mock) button on a job detail to record your interest."
        />
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <div
              key={application.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:flex sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-sm font-semibold text-slate-700">{application.jobId}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">Status: {application.status}</p>
              </div>
              <p className="mt-3 text-xs text-slate-400 sm:mt-0">
                Updated {new Date(application.updatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
