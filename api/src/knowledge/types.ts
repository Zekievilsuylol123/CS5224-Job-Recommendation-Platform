// Knowledge Base Types

export type KnowledgeSourceType =
  | 'resume'
  | 'linkedin'
  | 'github'
  | 'personal_website'
  | 'project_document'
  | 'portfolio'
  | 'other_document'
  | 'manual_text';

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface KnowledgeSource {
  id: string;
  user_id: string;
  source_type: KnowledgeSourceType;
  source_identifier?: string;
  raw_content?: any;
  parsed_data: ParsedKnowledgeData;
  metadata?: Record<string, any>;
  processing_status: ProcessingStatus;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Normalized format that all sources get parsed into
export interface ParsedKnowledgeData {
  name?: string;
  email?: string;
  phone?: string;
  location?: string;
  
  // Skills
  skills?: string[];
  technical_skills?: string[];
  soft_skills?: string[];
  languages?: Array<{ language: string; proficiency: string }>;
  
  // Experience
  experience?: Array<{
    job_title: string;
    company: string;
    location?: string;
    duration: string;
    description: string;
    start_date?: { year: number; month?: string };
    end_date?: { year: number; month?: string };
    is_current?: boolean;
    skills?: string[];
  }>;
  
  // Education
  education?: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    duration: string;
    start_date?: { year: number };
    end_date?: { year: number };
    gpa?: string;
  }>;
  
  // Certifications
  certifications?: Array<{
    name: string;
    issuer: string;
    issued_date?: string;
    expiry_date?: string;
  }>;
  
  // Projects
  projects?: Array<{
    name: string;
    description: string;
    technologies?: string[];
    url?: string;
    start_date?: string;
    end_date?: string;
  }>;
  
  // Additional context
  summary?: string;
  about?: string;
  interests?: string[];
  publications?: string[];
  awards?: string[];
  
  // Source-specific data
  github_repos?: Array<{
    name: string;
    description: string;
    language: string;
    topics: string[];
    stars: number;
    url: string;
  }>;
  
  linkedin_profile_url?: string;
  github_username?: string;
  personal_website_url?: string;
}

// LinkedIn API response types
export interface LinkedInProfile {
  basic_info: {
    fullname: string;
    first_name: string;
    last_name: string;
    headline: string;
    public_identifier: string;
    profile_url: string;
    profile_picture_url?: string;
    about?: string;
    location: {
      country: string;
      city: string;
      full: string;
      country_code: string;
    };
    email?: string;
    follower_count?: number;
    connection_count?: number;
    current_company?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    description?: string;
    duration: string;
    start_date: { year: number; month?: string };
    end_date?: { year: number; month?: string };
    is_current: boolean;
    skills?: string[];
    company_linkedin_url?: string;
  }>;
  education: Array<{
    school: string;
    degree_name: string;
    field_of_study: string;
    duration: string;
    start_date?: { year: number };
    end_date?: { year: number };
    description?: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    issued_date: string;
  }>;
  languages?: Array<{
    language: string;
    proficiency: string;
  }>;
}

// GitHub API response types
export interface GitHubProfile {
  login: string;
  name: string;
  bio: string;
  location: string;
  email: string;
  public_repos: number;
  followers: number;
  following: number;
  avatar_url: string;
  html_url: string;
}

export interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  topics: string[];
  stargazers_count: number;
  forks_count: number;
  created_at: string;
  updated_at: string;
  html_url: string;
  homepage?: string;
}

export interface GitHubData {
  profile: GitHubProfile;
  repos: GitHubRepo[];
}

// Website scraping result
export interface WebsiteData {
  title: string;
  content: string; // Markdown
  summary: string; // LLM-generated summary
  url: string;
}

// User preferences from database
export interface UserPreferences {
  id: string;
  user_id: string;
  preferred_industries?: string[];
  preferred_roles?: string[];
  preferred_companies?: string[];
  preferred_locations?: string[];
  desired_salary_range?: {
    min?: number;
    max?: number;
    currency?: string;
  };
  work_arrangement_preference?: 'remote' | 'hybrid' | 'onsite' | 'flexible';
  is_ai_predicted: boolean;
  user_confirmed: boolean;
  created_at: string;
  updated_at: string;
}

// AI prediction result
export interface PredictionResult {
  industries: string[];
  roles: string[];
  companies: string[];
  reasoning: string;
}
