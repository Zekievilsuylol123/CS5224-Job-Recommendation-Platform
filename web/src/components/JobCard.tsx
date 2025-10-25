import { Link } from 'react-router-dom';
import clsx from 'clsx';
import type { Job, CompassVerdict } from '../types';

const indicatorClasses: Record<CompassVerdict, string> = {
  Likely: 'bg-verdict-likely/10 text-verdict-likely border-verdict-likely/40',
  Borderline: 'bg-verdict-borderline/10 text-verdict-borderline border-verdict-borderline/40',
  Unlikely: 'bg-verdict-unlikely/10 text-verdict-unlikely border-verdict-unlikely/40'
};

interface Props {
  job: Job & { score?: number; epIndicator?: CompassVerdict };
  actionable?: boolean;
}

export default function JobCard({ job, actionable = true }: Props): JSX.Element {
  const indicator = job.epIndicator ?? 'Borderline';
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-slate-500">{job.company}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{job.title}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {job.location} · {job.industry}
          </p>
        </div>
        <span className={clsx('rounded-full border px-3 py-1 text-sm font-medium', indicatorClasses[indicator])}>
          {indicator}
        </span>
      </div>
      <p className="mt-4 line-clamp-3 text-sm text-slate-600">{job.description}</p>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        {job.salaryMinSGD && job.salaryMaxSGD ? (
          <span>
            Salary: ${job.salaryMinSGD.toLocaleString()} - ${job.salaryMaxSGD.toLocaleString()}
          </span>
        ) : (
          <span>Salary band pending</span>
        )}
        {job.score !== undefined && <span>Compass {job.score}</span>}
      </div>
      {actionable && (
        <div className="mt-6 flex justify-end">
          <Link
            to={`/jobs/${job.id}`}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            View
          </Link>
        </div>
      )}
    </div>
  );
}
