import { supabase } from '../lib/supabase';
import { useProfileStore } from '../store/profile';
import type { Application, CompassScore, CompassBreakdown, CompassVerdict, Job, ParsedProfile, User, EmployerMeta } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

/**
 * Get authentication headers from Supabase session
 */
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (session?.access_token) {
    return {
      'Authorization': `Bearer ${session.access_token}`
    };
  }
  
  return {};
}

function buildUrl(path: string, query?: Record<string, string | number | undefined>): string {
  const url = new URL(path, 'http://ep-aware.local');
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${base}${url.pathname}${url.search}`;
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { query?: Record<string, string | number | undefined> } = {}
): Promise<T> {
  const { query, headers, body, ...rest } = options;
  const url = buildUrl(path, query);

  // Get auth headers from Supabase
  const authHeaders = await getAuthHeaders();
  
  const mergedHeaders = new Headers(headers);
  
  // Add auth header
  Object.entries(authHeaders).forEach(([key, value]) => {
    mergedHeaders.set(key, value);
  });
  
  if (body && !(body instanceof FormData)) {
    mergedHeaders.set('Content-Type', 'application/json');
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
  page?: number;
  pageSize?: number;
  search?: string;
  location?: string;
  industry?: string;
  minSalary?: number;
  tags?: string;
  company?: string;
}

export interface JobsResponse {
  items: (Job & { score: number; epIndicator: string })[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

export interface JobDetailResponse {
  id: string;
  title: string;
  company: string;
  location: string;
  industry: string;
  salaryMinSGD?: number;
  salaryMaxSGD?: number;
  description: string;
  requirements: string[];
  employer: EmployerMeta;
  createdAt: string;
  url?: string;
  applyUrl?: string;
  score: number;
  epIndicator: string;
  rationale: string[];
  breakdown?: CompassBreakdown;
  isInternSG?: boolean;
  hrName?: string;
  source?: string;
}

export interface JobFiltersMetadata {
  tags: string[];
  companies: string[];
}

export function fetchJobs(params: JobsQueryParams): Promise<JobsResponse> {
  return apiFetch<JobsResponse>('/jobs', { method: 'GET', query: params as Record<string, string | number | undefined> });
}

export function fetchJobFilters(): Promise<JobFiltersMetadata> {
  return apiFetch<JobFiltersMetadata>('/jobs/meta/filters', { method: 'GET' });
}

export function fetchJob(id: string): Promise<JobDetailResponse> {
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

// ============================================================================
// PROFILE API
// ============================================================================

export interface ProfileData {
  id?: string;
  name?: string;
  gender?: string;
  nationality?: string;
  educationLevel?: 'Diploma' | 'Bachelors' | 'Masters' | 'PhD';
  educationInstitution?: string;
  certifications?: string[];
  yearsExperience?: number;
  skills?: string[];
  expectedSalarySGD?: number;
  plan?: 'freemium' | 'standard' | 'pro' | 'ultimate';
  latestCompassScore?: {
    total: number;
    verdict: CompassVerdict;
    breakdown: CompassBreakdown;
    notes: string[];
    calculatedAt?: string;
  } | null;
  createdAt?: string;
  updatedAt?: string;
}

export function fetchProfile(): Promise<ProfileData | null> {
  return apiFetch('/profile', { method: 'GET' });
}

export function saveProfile(profile: ProfileData): Promise<ProfileData> {
  return apiFetch('/profile', {
    method: 'PUT',
    body: JSON.stringify(profile)
  });
}

// ============================================================================
// JOB ANALYSIS API
// ============================================================================

export interface JobAnalysisResponse {
  candidate_name: string;
  candidate_email: string;
  role_title: string;
  overall_score: number;
  must_have_coverage: number;
  subscores: {
    must_have: number;
    nice_to_have: number;
    role_level_match: number;
    domain_fit: number;
    impact_evidence: number;
    tools_stack: number;
    communication: number;
  };
  decision: "strong_match" | "possible_match" | "weak_match" | "reject";
  evidence: {
    matched_must_haves: string[];
    matched_nice_to_haves: string[];
    impact_highlights: string[];
    tools_stack_matched: string[];
  };
  gaps: {
    missing_must_haves: string[];
    risks: string[];
  };
  questions_for_interview: string[];
  recommendations_to_candidate: string[];
  notes: string;
  compass_score?: CompassScore; // Recalculated COMPASS score based on detailed JD
  from_cache?: boolean;
}

export function fetchExistingAssessment(jobId: string): Promise<JobAnalysisResponse> {
  return apiFetch(`/jobs/${jobId}/assessment`, {
    method: 'GET'
  });
}

export function analyzeJobFit(jobId: string, regenerate = false): Promise<JobAnalysisResponse> {
  return apiFetch(`/jobs/${jobId}/analyze`, {
    method: 'POST',
    body: JSON.stringify({ regenerate })
  });
}

// ============================================================================
// APPLICATIONS API
// ============================================================================

export interface CreateApplicationPayload {
  jobId: string;
  jobTitle: string;
  jobCompany: string;
  jobUrl?: string;
  status?: string;
  notes?: string;
  appliedAt?: string;
}

export function createApplication(payload: CreateApplicationPayload): Promise<Application> {
  return apiFetch('/applications', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ============================================================================
// HR OUTREACH API
// ============================================================================

export interface HRProspect {
  first_name: string;
  last_name: string;
  full_name: string;
  email: string | null;
  personal_email: string | null;
  job_title: string;
  linkedin: string;
  company_name: string;
  company_domain: string;
  city: string;
  country: string;
}

export interface HRSearchPayload {
  company_domain: string;
  fetch_count?: number;
}

export interface HRSearchResponse {
  prospects: HRProspect[];
  company_domain: string;
  fetch_count: number;
  file_name: string;
  timestamp: string;
}

export function searchHRContacts(payload: HRSearchPayload): Promise<HRSearchResponse> {
  return apiFetch('/hr/search', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Generate HR outreach message
export interface OutreachMessagePayload {
  job_external_id?: string;
  job_title: string;
  job_company: string;
  hr_name: string;
  hr_email?: string;
  hr_job_title?: string;
}

export interface OutreachMessageResponse {
  subject: string;
  body: string;
}

export function generateOutreachMessage(payload: OutreachMessagePayload): Promise<OutreachMessageResponse> {
  return apiFetch('/hr/outreach/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ============================================================================
// APPLICATIONS API
// ============================================================================

export function fetchApplications(): Promise<{ items: Application[] }> {
  return apiFetch('/applications', { method: 'GET' });
}

export function updateApplication(id: string, updates: { status?: string; notes?: string }): Promise<Application> {
  return apiFetch(`/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates)
  });
}

export function fetchPlans(): Promise<{ items: Array<{ id: string; label: string; price: number }>; gating: Record<string, boolean> }> {
  return apiFetch('/plans', { method: 'GET' });
}
