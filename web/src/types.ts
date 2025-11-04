export type EducationLevel = 'Diploma' | 'Bachelors' | 'Masters' | 'PhD';

export type PlanTier = 'freemium' | 'standard' | 'pro' | 'ultimate';

export interface User {
  id: string;
  name: string;
  gender?: string;
  nationality?: string;
  educationLevel: EducationLevel;
  educationInstitution?: string;
  certifications?: string[];
  yearsExperience?: number;
  skills: string[];
  expectedSalarySGD?: number;
  plan: PlanTier;
}

export interface EmployerMeta {
  size: 'SME' | 'MNC' | 'Gov' | 'Startup';
  localHQ?: boolean;
  diversityScore?: number;
}

export interface Job {
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
  score?: number;
  epIndicator?: CompassVerdict;
}

export type CompassVerdict = 'Likely' | 'Borderline' | 'Unlikely';

export interface CompassBreakdown {
  salary: number;
  qualifications: number;
  diversity: number;
  support: number;
  skills: number;
  strategic: number;
}

export interface CompassScore {
  total: number;
  breakdown: CompassBreakdown;
  verdict: CompassVerdict;
  notes: string[];
}

export interface ParsedProfile {
  name?: string;
  email?: string;
  skills: string[];
  educationLevel?: EducationLevel;
  yearsExperience?: number;
  lastTitle?: string;
  expectedSalarySGD?: number;
  nationality?: string;
  gender?: string;
}

export interface EducationEntry {
  id: string;
  school: string;
  degree: string;
  fieldOfStudy?: string;
  startDate: string;
  endDate?: string;
  currentlyStudying?: boolean;
  description?: string;
}

export interface ExperienceEntry {
  id: string;
  title: string;
  company: string;
  employmentType?: string;
  location?: string;
  startDate: string;
  endDate?: string;
  currentlyWorking?: boolean;
  description?: string;
}

export type ApplicationStatus = 'draft' | 'sent' | 'responded' | 'rejected' | 'interview';

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

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

