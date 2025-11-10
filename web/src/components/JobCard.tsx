import { Link } from 'react-router-dom';
import type { Job } from '../types';

interface Props {
  job: Job & { score?: number; scoreRaw?: number };
  actionable?: boolean;
}

export default function JobCard({ job, actionable = true }: Props): JSX.Element {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-sm uppercase tracking-wide text-slate-500">{job.company}</p>
          <h3 className="mt-1 text-xl font-semibold text-slate-900">{job.title}</h3>
          <p className="mt-2 text-sm text-slate-600">
            {job.location} · {job.industry}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm text-slate-600">{job.description}</p>
      
      {/* Tags Section */}
      <div className="mt-4 flex flex-wrap gap-2">
        {/* Job Type Badge */}
        {job.title.toLowerCase().includes('intern') && (
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
            Internship
          </span>
        )}
        {!job.title.toLowerCase().includes('intern') && (
          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
            Full-time
          </span>
        )}
        
        {/* All Tags (excluding job type tags) */}
        {job.requirements && job.requirements
          .filter(tag => !['internship', 'full-time', 'part-time', 'contract'].includes(tag.toLowerCase()))
          .map((tag) => (
            <span key={tag} className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-700">
              {tag}
            </span>
          ))
        }
      </div>
      
      {actionable && (
        <div className="mt-6 flex justify-end">
          <Link
            to={`/jobs/${job.id}`}
            className="relative z-10 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md hover:text-white active:scale-95"
          >
            View Details
          </Link>
        </div>
      )}
    </div>
  );
}
