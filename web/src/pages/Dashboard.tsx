import { Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import JobCard from '../components/JobCard';
import EmptyState from '../components/EmptyState';
import { useTopJobs } from '../hooks/useJobs';
import { useProfileStore } from '../store/profile';

export default function DashboardPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useProfileStore((state) => state.profile);
  const { data, isLoading } = useTopJobs();

  // Redirect to assessment if no profile or no activated profile (not saved to DB)
  useEffect(() => {
    if (!profile || !profile.id || profile.id === 'local-user' || !profile.skills || profile.skills.length === 0) {
      navigate('/assessment');
    }
  }, [profile, navigate]);

  if (!profile) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <EmptyState
          title="No profile yet"
          description="Complete the self-assessment to unlock tailored job recommendations."
          action={
            <Link
              to="/assessment"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              Go to Self-Assessment
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Your EP Compass Dashboard</h2>
          <p className="mt-2 text-sm text-slate-500">Top roles aligned with your current profile.</p>
        </div>
        <Link to="/jobs" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View all jobs →
        </Link>
      </div>
      {isLoading && <p className="text-sm text-slate-500">Loading recommendations...</p>}
      {data && data.items.length === 0 && (
        <EmptyState
          title="No matches yet"
          description="Try broadening your skills or explore the full job list for more options."
        />
      )}
      <div className="grid gap-6 md:grid-cols-2">
        {data?.items.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
