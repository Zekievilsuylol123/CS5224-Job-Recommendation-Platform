import { useState } from 'react';
import JobCard from '../components/JobCard';
import EmptyState from '../components/EmptyState';
import { useJobs } from '../hooks/useJobs';

interface Filters {
  search: string;
  location: string;
  industry: string;
  minSalary: string;
}

const defaultFilters: Filters = {
  search: '',
  location: '',
  industry: '',
  minSalary: ''
};

export default function JobsListPage(): JSX.Element {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const { data, isLoading } = useJobs({
    search: appliedFilters.search,
    location: appliedFilters.location,
    industry: appliedFilters.industry,
    minSalary: appliedFilters.minSalary ? Number.parseInt(appliedFilters.minSalary, 10) : undefined
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
  };

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">Explore EP-aware roles</h2>
        <p className="mt-2 text-sm text-slate-500">
          Filter by keywords, location, industry, or salary band. EP indicators are refreshed with your saved profile.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:grid-cols-4"
      >
        <div className="md:col-span-2">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="e.g. data, product, fintech"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Location</label>
          <select
            value={filters.location}
            onChange={(event) => setFilters((prev) => ({ ...prev, location: event.target.value }))}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Any</option>
            <option value="Singapore">Singapore</option>
            <option value="Remote - Singapore">Remote - Singapore</option>
            <option value="Singapore (Hybrid)">Singapore (Hybrid)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Industry</label>
          <select
            value={filters.industry}
            onChange={(event) => setFilters((prev) => ({ ...prev, industry: event.target.value }))}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="Technology">Technology</option>
            <option value="Product">Product</option>
            <option value="Finance">Finance</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Min Salary (SGD)</label>
          <input
            type="number"
            min={0}
            value={filters.minSalary}
            onChange={(event) => setFilters((prev) => ({ ...prev, minSalary: event.target.value }))}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end gap-3 md:col-span-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="text-sm font-medium text-slate-500 hover:text-brand-600"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mt-10 grid gap-6">
        {isLoading && <p className="text-sm text-slate-500">Loading results...</p>}
        {data && data.items.length === 0 && (
          <EmptyState
            title="No jobs matched your filters"
            description="Try widening your filters or revisit your self-assessment to refine your profile."
          />
        )}
        {data?.items.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
