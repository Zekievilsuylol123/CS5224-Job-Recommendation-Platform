import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import JobCard from '../components/JobCard';
import EmptyState from '../components/EmptyState';
import MultiSelectDropdown from '../components/MultiSelectDropdown';
import { useJobs } from '../hooks/useJobs';
import { fetchJobFilters, fetchUserPreferences } from '../api/client';
import { useProfileStore } from '../store/profile';
import { Sparkles } from 'lucide-react';
import type { Job } from '../types';

interface Filters {
  search: string;
  tags: string[];
  company: string[];
}

const defaultFilters: Filters = {
  search: '',
  tags: [],
  company: []
};

const PAGE_SIZE = 50;

export default function JobsListPage(): JSX.Element {
  const navigate = useNavigate();
  const profile = useProfileStore((state) => state.profile);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPreferenceMatches, setShowPreferenceMatches] = useState(true);
  
  // Redirect to knowledge base if no profile (no longer use /assessment)
  useEffect(() => {
    if (!profile || !profile.id || profile.id === 'local-user' || !profile.skills || profile.skills.length === 0) {
      navigate('/knowledge-base');
    }
  }, [profile, navigate]);
  
  // Fetch user preferences for smart filtering
  const { data: preferencesData } = useQuery({
    queryKey: ['user-preferences'],
    queryFn: fetchUserPreferences,
    retry: false,
  });
  
  const preferences = preferencesData?.preferences;
  const hasPreferences = preferences && (
    preferences.confirmed_industries?.length ||
    preferences.confirmed_roles?.length ||
    preferences.confirmed_companies?.length
  );
  
  // Fetch filter metadata
  const { data: filterMetadata } = useQuery({
    queryKey: ['job-filters'],
    queryFn: fetchJobFilters
  });
  
  const { data, isLoading } = useJobs({
    search: appliedFilters.search,
    tags: appliedFilters.tags.join(','),
    company: appliedFilters.company.join(','),
    page: currentPage,
    pageSize: PAGE_SIZE
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [appliedFilters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAppliedFilters(filters);
  };

  const handleReset = () => {
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setCurrentPage(1);
  };

  // Helper function to check if a job matches user preferences
  const jobMatchesPreferences = useCallback((job: Job): { matches: boolean; reasons: string[]; matchCount: number } => {
    if (!preferences) return { matches: false, reasons: [], matchCount: 0 };

    const roles = preferences.confirmed_roles || [];
    const companies = preferences.confirmed_companies || [];
    const industries = preferences.confirmed_industries || [];
    
    // Use a Set to track unique match reasons (avoid duplicates)
    const matchReasons = new Set<string>();

    // Check if job title matches any preferred role (bidirectional)
    const titleMatches = roles.some(role => {
      const match = role.toLowerCase().includes(job.title.toLowerCase()) || 
                   job.title.toLowerCase().includes(role.toLowerCase());
      if (match) {
        matchReasons.add(role);
      }
      return match;
    });

    // Check if company matches (bidirectional)
    const companyMatches = companies.some(comp => {
      const match = comp.toLowerCase().includes(job.company.toLowerCase()) || 
                   job.company.toLowerCase().includes(comp.toLowerCase());
      if (match) {
        matchReasons.add(comp);
      }
      return match;
    });

    // Check if any job requirement/tag matches preferred industry (bidirectional)
    const requirementsMatch = industries.some(industry => {
      const match = (job.requirements || []).some(req => {
        return industry.toLowerCase().includes(req.toLowerCase()) || 
               req.toLowerCase().includes(industry.toLowerCase());
      });
      if (match) {
        matchReasons.add(industry);
      }
      return match;
    });

    // Check if job industry matches preferred industry (bidirectional)
    const industryMatches = industries.some(industry => {
      const match = industry.toLowerCase().includes(job.industry.toLowerCase()) || 
                   job.industry.toLowerCase().includes(industry.toLowerCase());
      if (match) {
        matchReasons.add(industry);
      }
      return match;
    });

    // Convert Set to Array for final match reasons
    const finalReasons = Array.from(matchReasons);
    
    const matches = titleMatches || companyMatches || requirementsMatch || industryMatches;
    return { 
      matches,
      reasons: finalReasons,
      matchCount: finalReasons.length 
    };
  }, [preferences]);

  // Jobs are already sorted by the backend based on user preferences
  const jobs = data?.items || [];

  const totalPages = data?.totalPages || 0;
  const showingStart = jobs.length ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const showingEnd = jobs.length ? showingStart + jobs.length - 1 : 0;

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="mb-8">
        <h2 className="text-3xl font-semibold text-slate-900">Browse Jobs</h2>
        <p className="mt-2 text-sm text-slate-500">
          Filter by keywords, company, or tags to find your perfect match.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-card md:grid-cols-3"
      >
        <div className="md:col-span-1">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Search</label>
          <input
            type="text"
            value={filters.search}
            onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            placeholder="e.g. data, product, fintech"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        
        <MultiSelectDropdown
          label="Company"
          options={filterMetadata?.companies || []}
          selected={filters.company}
          onChange={(selected) => setFilters((prev) => ({ ...prev, company: selected }))}
          placeholder="All companies"
        />
        
        <MultiSelectDropdown
          label="Tags"
          options={filterMetadata?.tags || []}
          selected={filters.tags}
          onChange={(selected) => setFilters((prev) => ({ ...prev, tags: selected }))}
          placeholder="All tags"
        />
        
        <div className="flex items-end gap-3 md:col-span-3">
          <button
            type="submit"
            className="inline-flex items-center rounded-lg bg-brand-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-brand-700"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
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
            description="Try widening your filters or updating your preferences in the Knowledge Base."
          />
        )}
        {jobs.map((job) => {
          const match = jobMatchesPreferences(job);
          return (
            <div key={job.id} className="relative">
              {match.matches && match.matchCount > 0 && (
                <div className="mb-2 flex flex-wrap items-center gap-2 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-2.5">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-900">
                    Matches your interests:
                  </span>
                  {match.reasons.map((reason, idx) => (
                    <span key={idx} className="inline-flex items-center rounded-full bg-white border border-blue-200 px-3 py-1 text-xs font-medium text-blue-700 shadow-sm">
                      {reason}
                    </span>
                  ))}
                </div>
              )}
              <JobCard job={job} />
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {data && data.items.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 pt-6">
          <div className="text-sm text-slate-600">
            Showing {showingStart}-{showingEnd} of {data.total} results
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition min-w-[40px] ${
                      currentPage === pageNum
                        ? 'bg-brand-600 text-white shadow-sm'
                        : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <svg className="h-4 w-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
