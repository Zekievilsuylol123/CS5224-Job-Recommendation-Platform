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
}

export interface AssessmentInput {
  user: Partial<User>;
  job?: Partial<Job>;
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
  total: number; // percentage (0-100)
  totalRaw: number; // raw points (0-110)
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

export type ApplicationStatus = 'draft' | 'sent' | 'responded' | 'rejected' | 'interview';

export interface Application {
  id: string;
  userId: string;
  jobId: string;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface JobFilters {
  limit?: number;
  search?: string;
  location?: string;
  industry?: string;
  minSalary?: number;
}
