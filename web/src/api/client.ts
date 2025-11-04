import { useProfileStore } from '../store/profile';
import type { Application, CompassScore, Job, ParsedProfile, HRProspect  } from '../types';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(path, 'http://ep-aware.local');
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}${url.pathname}${url.search}`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { query, headers, body, ...rest } = options;
  const url = buildUrl(path, query);

  const profile = useProfileStore.getState().profile;
  const mergedHeaders = new Headers(headers);
  if (body && !(body instanceof FormData)) {
    mergedHeaders.set('Content-Type', 'application/json');
  }
  if (profile) {
    mergedHeaders.set('x-ep-profile', JSON.stringify(profile));
  }

  const response = await fetch(url, {
    ...rest,
    headers: mergedHeaders,
    body: body instanceof FormData ? body : (body as string | undefined)
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? 'Request failed');
  }

  return response.json() as Promise<T>;
}

export interface JobsQueryParams {
  limit?: number;
  search?: string;
  location?: string;
  industry?: string;
  minSalary?: number;
}

export interface JobsResponse {
  items: (Job & { score: number; epIndicator: string })[];
  total: number;
}

export function fetchJobs(params: JobsQueryParams): Promise<JobsResponse> {
  return apiFetch<JobsResponse>('/jobs', { method: 'GET', query: params });
}

export function fetchJob(id: string): Promise<Job & { score: number; epIndicator: string; rationale: string[] }> {
  return apiFetch(`/jobs/${id}`, { method: 'GET' });
}

export function assessCompass(payload: { user: Record<string, unknown>; job?: Record<string, unknown> }): Promise<{ score: CompassScore }> {
  return apiFetch('/assessments/compass', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export interface ResumeAnalyzeResponse {
  profile: ParsedProfile;
  score: CompassScore;
  tips: string[];
}

export function analyzeResume(file: File, jobId?: string): Promise<ResumeAnalyzeResponse> {
  const formData = new FormData();
  formData.append('file', file);
  if (jobId) {
    formData.append('jobId', jobId);
  }
  return apiFetch('/resume/analyze', {
    method: 'POST',
    body: formData
  });
}

export function createApplication(payload: { userId: string; jobId: string }): Promise<Application> {
  return apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function fetchApplications(): Promise<{ items: Application[] }> {
  return apiFetch('/applications', { method: 'GET' });
}

export function fetchPlans(): Promise<{ items: Array<{ id: string; label: string; price: number }>; gating: Record<string, boolean> }> {
  return apiFetch('/plans', { method: 'GET' });
}

export interface HRSearchResponse {
  prospects: HRProspect[];
  company_domain: string;
  fetch_count: number;
  file_name: string;
  timestamp: string;
}

export function fetchHRProspects(companyDomain: string, fetchCount = 2): Promise<HRSearchResponse> {
  return apiFetch('/hrsearch', {
    method: 'POST',
    body: JSON.stringify({ company_domain: companyDomain, fetch_count: fetchCount })
  });
}

