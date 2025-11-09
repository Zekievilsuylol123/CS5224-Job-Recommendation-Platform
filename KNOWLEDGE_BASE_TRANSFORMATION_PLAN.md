# Knowledge Base Transformation Plan

**Date:** November 9, 2025  
**Scope:** Major platform refactor from resume-based to knowledge base-driven job recommendation system

---

## 🎯 Executive Summary

Transform the platform from a traditional resume-based COMPASS scoring system to an AI-powered knowledge base system that:
1. Aggregates context from multiple sources (files, LinkedIn, GitHub, websites)
2. Predicts user interests and generates personalized recommendations
3. Creates tailored resumes and cover letters for each job application
4. Removes COMPASS scoring as the primary focus (calculate on-demand only)

---

## 📋 Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Database Schema Changes](#database-schema-changes)
3. [Backend API Changes](#backend-api-changes)
4. [Frontend Changes](#frontend-changes)
5. [Onboarding Flow Redesign](#onboarding-flow-redesign)
6. [AI Integration Points](#ai-integration-points)
7. [Implementation Phases](#implementation-phases)
8. [Testing Strategy](#testing-strategy)
9. [Migration Considerations](#migration-considerations)

---

## 1. Current State Analysis

### Current Onboarding Flow
```
Login → Basic Info Form → Resume Upload → COMPASS Score → Dashboard
```

### Current Data Model
- **Profile**: Single resume-based profile with fixed fields
- **Scoring**: COMPASS score calculated immediately, prominently displayed
- **Jobs**: Ranked by EP fit score
- **Applications**: Basic tracking without HR contact tracking

### Current Pain Points
- Limited context from single resume
- COMPASS score dominates user experience
- No tailored application materials per job
- Missing industry/role preference prediction

---

## 2. Database Schema Changes

### 2.1 New Tables

#### `knowledge_sources` Table
```sql
CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL CHECK (source_type IN (
    'resume',
    'linkedin',
    'github',
    'personal_website',
    'project_document',
    'portfolio',
    'other_document',
    'manual_text'
  )),
  source_identifier TEXT, -- URL or filename
  raw_content JSONB, -- Structured raw data from source
  parsed_data JSONB NOT NULL, -- Normalized to resume-like format
  metadata JSONB, -- Additional info (file size, scrape date, etc.)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_knowledge_sources_user_id ON knowledge_sources(user_id);
CREATE INDEX idx_knowledge_sources_type ON knowledge_sources(user_id, source_type);
```

#### `user_preferences` Table
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- AI-predicted preferences
  predicted_industries TEXT[], -- ['Tech', 'AI', 'FinTech']
  predicted_roles TEXT[], -- ['Software Engineer', 'Product Manager']
  predicted_companies TEXT[], -- Company names
  
  -- User-confirmed preferences (multi-select checkboxes)
  confirmed_industries TEXT[],
  confirmed_roles TEXT[],
  confirmed_companies TEXT[],
  other_preferences TEXT, -- Free-form text for "Others"
  
  -- Additional context
  additional_context TEXT, -- User's manual input
  
  prediction_confidence JSONB, -- Confidence scores per prediction
  last_predicted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
```

#### `generated_materials` Table
```sql
CREATE TABLE generated_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_external_id TEXT NOT NULL,
  
  material_type TEXT NOT NULL CHECK (material_type IN ('resume', 'cover_letter')),
  content TEXT NOT NULL, -- Markdown or DOCX-compatible format
  format TEXT DEFAULT 'markdown' CHECK (format IN ('markdown', 'docx')),
  
  -- Source data used for generation
  knowledge_base_snapshot JSONB, -- What data was used
  job_description_snapshot JSONB, -- JD at time of generation
  
  -- User modifications
  user_edited BOOLEAN DEFAULT FALSE,
  version INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_generated_materials_user_job ON generated_materials(user_id, job_external_id);
CREATE INDEX idx_generated_materials_type ON generated_materials(material_type);
```

### 2.2 Modified Tables

#### Update `profiles` Table
```sql
-- Remove or deprecate COMPASS-specific columns
ALTER TABLE profiles 
  DROP COLUMN latest_compass_score,
  DROP COLUMN latest_compass_verdict,
  DROP COLUMN latest_compass_breakdown,
  DROP COLUMN latest_compass_calculated_at;

-- Add knowledge base summary
ALTER TABLE profiles
  ADD COLUMN knowledge_base_summary JSONB, -- Aggregated data from all sources
  ADD COLUMN knowledge_base_updated_at TIMESTAMPTZ,
  ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN onboarding_step INTEGER DEFAULT 1;
```

#### Update `applications` Table
```sql
-- Add HR contact tracking
ALTER TABLE applications
  ADD COLUMN hr_contacted BOOLEAN DEFAULT FALSE,
  ADD COLUMN hr_contact_name TEXT,
  ADD COLUMN hr_contact_email TEXT,
  ADD COLUMN hr_contacted_at TIMESTAMPTZ,
  ADD COLUMN outreach_message_id UUID REFERENCES generated_materials(id),
  
  -- Link to generated materials
  ADD COLUMN resume_id UUID REFERENCES generated_materials(id),
  ADD COLUMN cover_letter_id UUID REFERENCES generated_materials(id);
```

#### Update `saved_jobs` Table
```sql
-- Remove COMPASS score prominence
ALTER TABLE saved_jobs
  RENAME COLUMN compass_score TO compass_score_cached;
  
-- Make COMPASS optional, not auto-calculated
ALTER TABLE saved_jobs
  ALTER COLUMN compass_score_cached DROP NOT NULL;
```

---

## 3. Backend API Changes

### 3.1 New Endpoints

#### Knowledge Sources Management
```typescript
POST   /api/knowledge-sources/upload      // Upload files
POST   /api/knowledge-sources/linkedin    // Add LinkedIn profile
POST   /api/knowledge-sources/github      // Add GitHub profile
POST   /api/knowledge-sources/website     // Add personal website
POST   /api/knowledge-sources/text        // Add manual context
GET    /api/knowledge-sources              // List all sources
DELETE /api/knowledge-sources/:id          // Remove source
PUT    /api/knowledge-sources/:id          // Update source
```

#### Preference Prediction
```typescript
POST   /api/preferences/predict           // AI-predict industries/roles/companies
GET    /api/preferences                   // Get current preferences
PUT    /api/preferences                   // Update user-confirmed preferences
```

#### Material Generation
```typescript
POST   /api/generate/resume/:jobId        // Generate tailored resume
POST   /api/generate/cover-letter/:jobId  // Generate tailored cover letter
GET    /api/generate/:jobId/materials     // Get all materials for a job
PUT    /api/generate/:id                  // Update generated material
GET    /api/generate/:id/download         // Download as DOCX
```

#### Job Recommendations
```typescript
GET    /api/jobs/recommended              // Top 10 based on knowledge base
POST   /api/jobs/search                   // Advanced search with filters
```

### 3.2 Modified Endpoints

```typescript
// COMPASS score becomes on-demand only
POST   /api/assessments/compass           // No longer auto-called
  // Add flag: ?forceRecalculate=true

// Profile update with knowledge base
PUT    /api/profile
  // Now includes knowledge_base_summary

// Application creation with HR tracking
POST   /api/applications
  // Add: hr_contacted, resume_id, cover_letter_id
```

### 3.3 New Service Modules

#### `api/src/knowledge/`
```
knowledge/
  ├── sources.ts          // CRUD for knowledge sources
  ├── linkedin.ts         // LinkedIn scraper integration
  ├── github.ts           // GitHub API integration
  ├── website.ts          // Website scraper
  ├── parser.ts           // Unified parser to resume format
  └── aggregator.ts       // Combine all sources into knowledge_base_summary
```

#### `api/src/ai/`
```
ai/
  ├── preference_predictor.ts   // Predict industries/roles/companies
  ├── resume_generator.ts       // Generate tailored resume
  ├── cover_letter_generator.ts // Generate tailored cover letter
  └── prompts/
      ├── predict_preferences.txt
      ├── generate_resume.txt
      └── generate_cover_letter.txt
```

---

## 4. Frontend Changes

### 4.1 Onboarding Flow Redesign

#### New Flow
```
1. Basic Info (no change)
   ↓
2. Knowledge Base Upload
   - Upload files (PDF, DOCX, etc.)
   - Add LinkedIn URL
   - Add GitHub URL
   - Add personal website(s)
   - Add manual context (textarea)
   ↓
3. AI Prediction
   - Show predicted industries/roles/companies
   - Multi-select checkboxes for confirmation
   - "Others" option with free-form input
   ↓
4. Job Recommendations
   - Show top 10 jobs from database
   - No COMPASS score shown yet
   ↓
5. Dashboard
```

### 4.2 New Components

#### `KnowledgeSourceUpload.tsx`
```tsx
// Multi-source upload component
- File dropzone (accepts PDFs, DOCX, etc.)
- LinkedIn URL input with live validation
- GitHub URL input with auto-detection
- Website URL input
- Manual text area for additional context
- Source list with delete option
```

#### `PreferencePrediction.tsx`
```tsx
// AI prediction display
- "Guess you are into..." section
- Industry checkboxes (predicted + manual)
- Role checkboxes (predicted + manual)
- Company suggestions (predicted + manual)
- "Others" free-form input
```

#### `JobRecommendations.tsx`
```tsx
// Top 10 jobs based on preferences
- Remove COMPASS score display
- Show match reason (e.g., "Matches: AI, Software Engineering")
- Quick filters by industry/role
```

#### `MaterialGenerator.tsx`
```tsx
// Resume/Cover Letter generation UI
- Preview pane (Markdown renderer)
- Edit mode (textarea or rich text editor)
- Download button (DOCX format)
- Version history
```

### 4.3 Modified Pages

#### `SelfAssessment.tsx` → `Onboarding.tsx`
```tsx
// Rename and restructure
Steps:
  1. Basic Info (existing)
  2. Knowledge Base (NEW)
  3. Preference Selection (NEW)
  4. Complete & View Jobs (NEW)

// Remove COMPASS score step entirely
```

#### `JobDetail.tsx`
```tsx
// Add material generation section
<section className="generate-materials">
  <h3>Tailor Your Application</h3>
  
  {/* Assess Fit - now collapsed by default */}
  <Collapsible title="Calculate EP Compass Score (Optional)">
    <Button onClick={handleAssessFit}>Calculate Score</Button>
    {compassScore && <ScoreGauge {...compassScore} />}
  </Collapsible>
  
  {/* NEW: Generate materials */}
  <div className="mt-6">
    <Button onClick={generateResume}>Generate Tailored Resume</Button>
    <Button onClick={generateCoverLetter}>Generate Cover Letter</Button>
  </div>
  
  {/* Material preview */}
  {materials && <MaterialGenerator materials={materials} />}
</section>

{/* Enhanced HR Contact section */}
<section className="hr-contact-prominent">
  {/* Make visually appealing with gradient, icons, etc. */}
  <h3>Contact HR Directly</h3>
  <p>Increase your chances by reaching out to hiring managers</p>
  {/* Search and contact flow */}
</section>
```

#### `JobCard.tsx`
```tsx
// Remove COMPASS score display
// Add match reason instead
<div className="match-reason">
  <Icon name="sparkles" />
  <span>Matches: {matchedIndustries.join(', ')}</span>
</div>
```

#### `Dashboard.tsx`
```tsx
// Remove COMPASS score references
// Show preference-based job recommendations
<section className="recommendations">
  <h2>Jobs for You</h2>
  <p>Based on your interests: {confirmedIndustries.join(', ')}</p>
  <JobGrid jobs={recommendedJobs} />
</section>
```

---

## 5. Onboarding Flow Redesign

### Step 1: Basic Info (No Change)
- Name, Gender, Nationality
- Save to DB immediately

### Step 2: Knowledge Base Building
```tsx
<div className="knowledge-base-step">
  <h2>Tell Us About Yourself</h2>
  <p>Add any information that helps us understand your background</p>
  
  {/* File Upload Section */}
  <section>
    <h3>Upload Documents</h3>
    <FileDropzone 
      accept=".pdf,.doc,.docx"
      onUpload={handleFileUpload}
      description="Upload resume, portfolios, project documents, etc."
    />
    <UploadedFilesList sources={fileSources} onRemove={handleRemoveSource} />
  </section>
  
  {/* LinkedIn Section */}
  <section>
    <h3>LinkedIn Profile</h3>
    <Input 
      placeholder="https://linkedin.com/in/your-profile"
      value={linkedinUrl}
      onChange={handleLinkedinChange}
    />
    {linkedinPreview && <LinkedInPreview data={linkedinPreview} />}
  </section>
  
  {/* GitHub Section */}
  <section>
    <h3>GitHub Profile</h3>
    <Input 
      placeholder="https://github.com/username"
      value={githubUrl}
      onChange={handleGithubChange}
    />
    {githubPreview && <GitHubPreview repos={githubPreview} />}
  </section>
  
  {/* Personal Websites */}
  <section>
    <h3>Personal Website(s)</h3>
    <DynamicInputList 
      placeholder="https://yourwebsite.com"
      values={websites}
      onChange={handleWebsitesChange}
    />
  </section>
  
  {/* Manual Context */}
  <section>
    <h3>Additional Information</h3>
    <Textarea 
      placeholder="Tell us anything else about your skills, projects, interests..."
      value={manualContext}
      onChange={handleManualContextChange}
      rows={6}
    />
  </section>
  
  <Button onClick={handleProcessKnowledgeBase} loading={processing}>
    Continue →
  </Button>
</div>
```

### Step 3: AI Preference Prediction
```tsx
<div className="preference-step">
  <h2>Guess You're Into...</h2>
  <p>Based on your background, here's what we think interests you</p>
  
  {/* Industries */}
  <section>
    <h3>Industries</h3>
    <CheckboxGroup
      options={[
        ...predictedIndustries.map(i => ({ label: i, predicted: true })),
        { label: 'Tech', value: 'tech' },
        { label: 'Finance', value: 'finance' },
        { label: 'Healthcare', value: 'healthcare' },
        // ... more options
        { label: 'Other', value: 'other', freeForm: true }
      ]}
      selected={selectedIndustries}
      onChange={handleIndustryChange}
      renderPredicted={(option) => (
        <span className="flex items-center gap-2">
          <Sparkles className="text-purple-500" />
          {option.label}
        </span>
      )}
    />
  </section>
  
  {/* Roles */}
  <section>
    <h3>Roles You'd Enjoy</h3>
    <CheckboxGroup
      options={[
        ...predictedRoles,
        'Software Engineer',
        'Data Scientist',
        'Product Manager',
        // ... more
        { label: 'Other', freeForm: true }
      ]}
      selected={selectedRoles}
      onChange={handleRoleChange}
    />
  </section>
  
  {/* Companies */}
  <section>
    <h3>Companies You Might Like</h3>
    <CheckboxGroup
      options={predictedCompanies}
      selected={selectedCompanies}
      onChange={handleCompanyChange}
    />
  </section>
  
  <Button onClick={handleSavePreferences}>
    See Job Recommendations →
  </Button>
</div>
```

### Step 4: Job Recommendations Preview
```tsx
<div className="recommendations-preview">
  <h2>Top Jobs for You</h2>
  <p>Based on your preferences, here are your best matches</p>
  
  <JobGrid 
    jobs={topJobs} 
    showCompassScore={false}
    showMatchReason={true}
  />
  
  <Button onClick={() => navigate('/dashboard')}>
    Go to Dashboard →
  </Button>
</div>
```

---

## 6. AI Integration Points

### 6.1 LinkedIn Profile Parser

```typescript
// api/src/knowledge/linkedin.ts

interface LinkedInScraperRequest {
  includeEmail: true;
  username: string; // LinkedIn URL
}

interface LinkedInScraperResponse {
  basic_info: {
    fullname: string;
    headline: string;
    about: string;
    location: { country: string; city: string };
    email?: string;
  };
  experience: Array<{
    title: string;
    company: string;
    location: string;
    description: string;
    duration: string;
    start_date: { year: number; month: string };
    end_date?: { year: number; month: string };
    is_current: boolean;
    skills?: string[];
  }>;
  education: Array<{
    school: string;
    degree_name: string;
    field_of_study: string;
    duration: string;
  }>;
  certifications: Array<{
    name: string;
    issuer: string;
    issued_date: string;
  }>;
  languages: Array<{
    language: string;
    proficiency: string;
  }>;
}

export async function fetchLinkedInProfile(url: string): Promise<LinkedInScraperResponse> {
  const response = await fetch(
    'https://api.apify.com/v2/acts/apimaestro~linkedin-profile-detail/run-sync-get-dataset-items',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token: process.env.APIFY_API_TOKEN,
        includeEmail: true,
        username: url
      })
    }
  );
  
  const data = await response.json();
  return data[0]; // Returns array, take first
}

export function normalizeLinkedInToResume(data: LinkedInScraperResponse): ParsedProfile {
  return {
    name: data.basic_info.fullname,
    email: data.basic_info.email,
    skills: extractSkillsFromExperience(data.experience),
    educationLevel: inferEducationLevel(data.education),
    yearsExperience: calculateYearsFromExperience(data.experience),
    // ... map other fields
  };
}
```

### 6.2 GitHub Profile Parser

```typescript
// api/src/knowledge/github.ts

interface GitHubProfile {
  login: string;
  name: string;
  bio: string;
  location: string;
  email: string;
  public_repos: number;
  followers: number;
}

interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  topics: string[];
  stargazers_count: number;
  created_at: string;
  updated_at: string;
}

export async function fetchGitHubProfile(username: string) {
  const [profile, repos] = await Promise.all([
    fetch(`https://api.github.com/users/${username}`).then(r => r.json()),
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=50`)
      .then(r => r.json())
  ]);
  
  return { profile, repos };
}

export function normalizeGitHubToResume(data: { profile: GitHubProfile; repos: GitHubRepo[] }): Partial<ParsedProfile> {
  const skills = extractSkillsFromRepos(data.repos);
  const projects = data.repos.slice(0, 10).map(repo => ({
    name: repo.name,
    description: repo.description,
    technologies: [repo.language, ...repo.topics].filter(Boolean)
  }));
  
  return {
    name: data.profile.name,
    email: data.profile.email,
    skills,
    // Store projects in a separate field or as part of knowledge base
  };
}

function extractSkillsFromRepos(repos: GitHubRepo[]): string[] {
  const languageCount = repos.reduce((acc, repo) => {
    if (repo.language) {
      acc[repo.language] = (acc[repo.language] || 0) + 1;
    }
    repo.topics.forEach(topic => {
      acc[topic] = (acc[topic] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);
  
  // Return top skills by frequency
  return Object.entries(languageCount)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 20)
    .map(([skill]) => skill);
}
```

### 6.3 Website Scraper

```typescript
// api/src/knowledge/website.ts

import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

export async function scrapeWebsite(url: string): Promise<{
  title: string;
  content: string;
  summary: string;
}> {
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);
  
  // Remove scripts, styles, nav, footer
  $('script, style, nav, footer, header').remove();
  
  const title = $('title').text();
  const mainContent = $('main, article, .content, #content').html() || $('body').html() || '';
  
  // Convert to markdown for easier processing
  const turndown = new TurndownService();
  const markdown = turndown.turndown(mainContent);
  
  // Summarize with LLM to avoid context bloat
  const summary = await summarizeWebContent(markdown);
  
  return { title, content: markdown, summary };
}

async function summarizeWebContent(markdown: string): Promise<string> {
  // Use OpenAI to summarize the content
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Extract key skills, experiences, and professional information from this personal website. Focus on technical skills, projects, and achievements.'
      },
      {
        role: 'user',
        content: markdown.slice(0, 10000) // Limit input
      }
    ],
    max_tokens: 500
  });
  
  return response.choices[0].message.content || '';
}
```

### 6.4 Preference Predictor

```typescript
// api/src/ai/preference_predictor.ts

interface PredictionResult {
  industries: Array<{ name: string; confidence: number }>;
  roles: Array<{ name: string; confidence: number }>;
  companies: Array<{ name: string; confidence: number }>;
}

export async function predictPreferences(knowledgeBase: any): Promise<PredictionResult> {
  const prompt = await loadPrompt('predict_preferences.txt');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          skills: knowledgeBase.skills,
          experience: knowledgeBase.experience,
          education: knowledgeBase.education,
          projects: knowledgeBase.projects,
          certifications: knowledgeBase.certifications
        })
      }
    ],
    response_format: { type: 'json_object' }
  });
  
  return JSON.parse(response.choices[0].message.content!);
}
```

### 6.5 Resume Generator

```typescript
// api/src/ai/resume_generator.ts

export async function generateTailoredResume(
  knowledgeBase: any,
  jobDescription: any
): Promise<string> {
  const prompt = await loadPrompt('generate_resume.txt');
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          knowledge_base: knowledgeBase,
          job_description: jobDescription,
          requirements: jobDescription.requirements,
          company: jobDescription.company
        })
      }
    ]
  });
  
  return response.choices[0].message.content!; // Returns Markdown
}
```

### 6.6 Cover Letter Generator

```typescript
// api/src/ai/cover_letter_generator.ts

export async function generateCoverLetter(
  knowledgeBase: any,
  jobDescription: any
): Promise<string> {
  const prompt = await loadPrompt('generate_cover_letter.txt');
  
  // Analyze writing style from manual context
  const writingStyle = await analyzeWritingStyle(knowledgeBase.manual_context);
  
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: prompt },
      {
        role: 'user',
        content: JSON.stringify({
          knowledge_base: knowledgeBase,
          job_description: jobDescription,
          writing_style: writingStyle,
          company: jobDescription.company,
          applicant_name: knowledgeBase.name
        })
      }
    ]
  });
  
  return response.choices[0].message.content!;
}

async function analyzeWritingStyle(text?: string): Promise<string> {
  if (!text || text.length < 100) {
    return 'professional'; // Default
  }
  
  // Analyze tone, formality, sentence structure
  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Analyze the writing style of this text. Describe the tone, formality level, and any distinctive patterns in 2-3 sentences.'
      },
      { role: 'user', content: text.slice(0, 1000) }
    ],
    max_tokens: 150
  });
  
  return response.choices[0].message.content!;
}
```

---

## 7. Implementation Phases

### Phase 1: Database & Backend Foundation (Week 1-2)
**Priority: HIGH**

- [ ] Create new database tables
  - [ ] `knowledge_sources`
  - [ ] `user_preferences`
  - [ ] `generated_materials`
- [ ] Update existing tables
  - [ ] Modify `profiles`
  - [ ] Modify `applications`
  - [ ] Modify `saved_jobs`
- [ ] Write migration scripts
- [ ] Create backend services
  - [ ] Knowledge source manager
  - [ ] LinkedIn scraper integration
  - [ ] GitHub API integration
  - [ ] Website scraper
  - [ ] Unified parser/aggregator
- [ ] Create new API endpoints
  - [ ] Knowledge sources CRUD
  - [ ] Preference prediction
  - [ ] Material generation
- [ ] Update existing endpoints
  - [ ] Make COMPASS optional
  - [ ] Update application tracking

**Deliverables:**
- Migration SQL files
- New service modules in `api/src/knowledge/`
- New AI modules in `api/src/ai/`
- Updated API routes in `api/src/server.ts`
- API tests for new endpoints

---

### Phase 2: Frontend Components (Week 2-3)
**Priority: HIGH**

- [ ] Create new components
  - [ ] `KnowledgeSourceUpload.tsx`
  - [ ] `LinkedInUrlInput.tsx`
  - [ ] `GitHubUrlInput.tsx`
  - [ ] `WebsiteUrlInput.tsx`
  - [ ] `PreferencePrediction.tsx`
  - [ ] `PreferenceCheckboxGroup.tsx`
  - [ ] `MaterialGenerator.tsx`
  - [ ] `MaterialPreview.tsx` (Markdown renderer)
  - [ ] `MaterialEditor.tsx`
- [ ] Update existing components
  - [ ] `JobCard.tsx` - Remove COMPASS, add match reason
  - [ ] `JobDetail.tsx` - Add material generation
  - [ ] `ScoreGauge.tsx` - Make collapsible/optional
- [ ] Create new types
  - [ ] Update `web/src/types.ts` with new interfaces

**Deliverables:**
- New component files in `web/src/components/`
- Updated type definitions
- Component tests

---

### Phase 3: Onboarding Flow Redesign (Week 3-4)
**Priority: HIGH**

- [ ] Redesign `SelfAssessment.tsx`
  - [ ] Rename to `Onboarding.tsx`
  - [ ] Step 1: Basic Info (existing, minimal changes)
  - [ ] Step 2: Knowledge Base Upload (NEW)
  - [ ] Step 3: AI Preference Prediction (NEW)
  - [ ] Step 4: Job Recommendations Preview (NEW)
  - [ ] Remove COMPASS score step
- [ ] Update onboarding tour
  - [ ] New tour steps for knowledge base
  - [ ] New tour steps for preferences
- [ ] Update profile store
  - [ ] Add knowledge base state
  - [ ] Add preferences state
  - [ ] Remove COMPASS-centric logic

**Deliverables:**
- Refactored `Onboarding.tsx`
- Updated `OnboardingTour.tsx`
- Updated `web/src/store/profile.ts`
- Updated routing in `App.tsx`

---

### Phase 4: Job Matching & Recommendations (Week 4-5)
**Priority: MEDIUM**

- [ ] Implement preference-based job filtering
  - [ ] Update `api/src/jobs/external.ts`
  - [ ] Add filtering by industries/roles/companies
  - [ ] Add basic relevance scoring (without COMPASS)
- [ ] Update Dashboard
  - [ ] Show preference-based recommendations
  - [ ] Remove COMPASS score prominence
  - [ ] Add "why this job" explanations
- [ ] Update Jobs List page
  - [ ] Filter by preferences
  - [ ] Sort by relevance
- [ ] Update Job Detail page
  - [ ] Collapse COMPASS score section
  - [ ] Add "Calculate Score" button (on-demand)

**Deliverables:**
- Updated job recommendation logic
- Refactored `Dashboard.tsx`
- Refactored `JobsList.tsx`
- Refactored `JobDetail.tsx`

---

### Phase 5: Material Generation (Week 5-6)
**Priority: MEDIUM**

- [ ] Implement resume generation
  - [ ] AI prompt engineering
  - [ ] Markdown output
  - [ ] DOCX conversion
- [ ] Implement cover letter generation
  - [ ] AI prompt engineering
  - [ ] Writing style analysis
  - [ ] Markdown output
  - [ ] DOCX conversion
- [ ] Build material editor UI
  - [ ] Preview mode (Markdown renderer)
  - [ ] Edit mode (textarea or rich text)
  - [ ] Version control
  - [ ] Download buttons
- [ ] Integrate with job detail page
  - [ ] "Generate Resume" button
  - [ ] "Generate Cover Letter" button
  - [ ] Material preview/edit modal

**Deliverables:**
- AI generation services in `api/src/ai/`
- Material editor components
- DOCX export functionality
- Integration with `JobDetail.tsx`

---

### Phase 6: HR Contact Enhancement (Week 6)
**Priority: LOW**

- [ ] Enhance HR contact UI
  - [ ] Make section visually prominent (gradient, icons)
  - [ ] Improve layout and spacing
- [ ] Update outreach message generation
  - [ ] Use actual user name (not placeholders)
  - [ ] Personalize based on knowledge base
- [ ] Add HR contact tracking
  - [ ] Modal: "Did you contact HR?"
  - [ ] Save contact info to application
  - [ ] Track in Applications page

**Deliverables:**
- Enhanced HR contact section in `JobDetail.tsx`
- Updated outreach message generation
- HR tracking in Applications page

---

### Phase 7: Testing & Refinement (Week 7)
**Priority: HIGH**

- [ ] End-to-end testing
  - [ ] Onboarding flow
  - [ ] Knowledge base upload
  - [ ] Preference selection
  - [ ] Job recommendations
  - [ ] Material generation
- [ ] Performance optimization
  - [ ] LinkedIn/GitHub API caching
  - [ ] Website scraping rate limiting
  - [ ] LLM response caching
- [ ] Error handling
  - [ ] Graceful failures for scrapers
  - [ ] Fallback for missing data
- [ ] UI/UX polish
  - [ ] Loading states
  - [ ] Success/error messages
  - [ ] Responsive design

**Deliverables:**
- Comprehensive test suite
- Performance benchmarks
- Bug fixes
- UX improvements

---

### Phase 8: Migration & Deployment (Week 8)
**Priority: HIGH**

- [ ] Data migration for existing users
  - [ ] Migrate resume data to knowledge sources
  - [ ] Deprecate old COMPASS scores (keep for history)
- [ ] Deployment
  - [ ] Database migrations
  - [ ] Backend deployment
  - [ ] Frontend deployment
- [ ] Monitoring
  - [ ] Error tracking
  - [ ] Performance monitoring
  - [ ] User analytics

**Deliverables:**
- Migration scripts
- Deployment documentation
- Rollback plan
- Monitoring dashboard

---

## 8. Testing Strategy

### 8.1 Unit Tests

```typescript
// Backend
- Knowledge source parsers (LinkedIn, GitHub, website)
- AI prediction accuracy (manual validation)
- Resume/cover letter generation quality
- Database operations

// Frontend
- Component rendering
- Form validation
- State management
- API integration
```

### 8.2 Integration Tests

```typescript
// End-to-end flows
- Onboarding flow (basic info → knowledge base → preferences → dashboard)
- Material generation flow (job detail → generate → preview → download)
- Application flow (job → generate materials → apply → track)
```

### 8.3 Manual Testing Checklist

- [ ] Upload various file types (PDF, DOCX)
- [ ] Test LinkedIn profiles (various formats)
- [ ] Test GitHub profiles (different repo counts)
- [ ] Test personal websites (various structures)
- [ ] Verify AI predictions make sense
- [ ] Check generated resume quality
- [ ] Check cover letter personalization
- [ ] Test DOCX download
- [ ] Verify HR contact tracking
- [ ] Test on mobile devices

---

## 9. Migration Considerations

### 9.1 Existing User Data

```sql
-- Migrate existing resume data to knowledge sources
INSERT INTO knowledge_sources (user_id, source_type, source_identifier, parsed_data, created_at)
SELECT 
  user_id,
  'resume',
  file_name,
  parsed_data,
  created_at
FROM resume_analyses;
```

### 9.2 Backward Compatibility

- Keep old COMPASS score data in `compass_scores` table (historical)
- Add feature flag to toggle between old/new UI during transition
- Provide migration guide for users

### 9.3 Gradual Rollout

1. **Week 1:** Database changes (backward compatible)
2. **Week 2-4:** Backend API (new endpoints, old ones still work)
3. **Week 5:** Frontend (feature flag for new onboarding)
4. **Week 6:** Enable new onboarding for 10% of users
5. **Week 7:** Enable for 50% of users
6. **Week 8:** Enable for 100% of users
7. **Week 9+:** Deprecate old endpoints

---

## 10. Key Decisions & Trade-offs

### Why Remove COMPASS Score Prominence?
- **Pro:** Shifts focus from single metric to holistic matching
- **Pro:** Reduces anxiety around "passing" a score
- **Pro:** More personalized job recommendations
- **Con:** Loses clear EP eligibility signal
- **Mitigation:** Keep COMPASS as on-demand feature for users who want it

### Why Multiple Knowledge Sources?
- **Pro:** Richer context = better matching & generation
- **Pro:** Captures full spectrum of skills/experience
- **Con:** More complex onboarding
- **Con:** Potential for inconsistent data
- **Mitigation:** Smart parsing & conflict resolution

### Why Generate Materials Per Job?
- **Pro:** Tailored applications perform better
- **Pro:** Saves user time
- **Con:** Risk of generic AI-generated content
- **Mitigation:** Encourage user editing, provide preview

### Why Markdown for Materials?
- **Pro:** Easy to render, edit, and version
- **Pro:** Converts to DOCX easily
- **Pro:** Human-readable in database
- **Con:** Less formatting control than DOCX
- **Mitigation:** Provide DOCX download with good formatting

---

## 11. Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| LinkedIn scraper breaks | High | Medium | Fallback to manual input, cache responses |
| GitHub API rate limits | Medium | High | Cache aggressively, use user's token |
| AI-generated content is poor | High | Medium | Iterative prompt engineering, user editing |
| Onboarding too complex | High | Medium | Progressive disclosure, skip options |
| Performance issues (scraping) | Medium | High | Background jobs, async processing |
| Data privacy concerns | High | Low | Clear consent, don't store files long-term |

---

## 12. Success Metrics

### User Engagement
- [ ] Onboarding completion rate > 70%
- [ ] Average knowledge sources per user > 2
- [ ] Preference confirmation rate > 80%

### Job Matching
- [ ] Job application rate increase by 30%
- [ ] User satisfaction with recommendations > 4/5

### Material Generation
- [ ] Resume generation usage > 50% of applications
- [ ] Cover letter generation usage > 40% of applications
- [ ] Material edit rate < 60% (indicates good quality)

### Platform Health
- [ ] API response time < 2s (95th percentile)
- [ ] Scraper success rate > 90%
- [ ] Zero data loss during migration

---

## 13. Future Enhancements (Post-MVP)

- **Knowledge Base Auto-Update:** Periodic re-scraping of LinkedIn/GitHub
- **Multi-Resume Generation:** Generate different resume versions for different job types
- **Application Tracker Enhancement:** Email integration, status auto-detection
- **Interview Prep:** Generate interview questions based on JD
- **Skill Gap Analysis:** Identify missing skills for target roles
- **Learning Recommendations:** Suggest courses/certifications
- **Salary Negotiation:** AI-powered salary insights
- **Network Analysis:** LinkedIn connection analysis for referrals

---

## 14. Appendix: API Examples

### Upload Knowledge Source
```http
POST /api/knowledge-sources/upload
Content-Type: multipart/form-data

file: [binary]
source_type: "project_document"
```

### Add LinkedIn Profile
```http
POST /api/knowledge-sources/linkedin
Content-Type: application/json

{
  "url": "https://linkedin.com/in/username"
}
```

### Predict Preferences
```http
POST /api/preferences/predict
Content-Type: application/json

{
  "user_id": "uuid"
}

Response:
{
  "industries": [
    { "name": "Tech", "confidence": 0.95 },
    { "name": "AI", "confidence": 0.87 }
  ],
  "roles": [
    { "name": "Software Engineer", "confidence": 0.92 },
    { "name": "Product Manager", "confidence": 0.78 }
  ],
  "companies": [
    { "name": "Google", "confidence": 0.85 },
    { "name": "Stripe", "confidence": 0.79 }
  ]
}
```

### Generate Resume
```http
POST /api/generate/resume/:jobId
Content-Type: application/json

Response:
{
  "id": "uuid",
  "content": "# John Doe\n\n## Experience\n...",
  "format": "markdown",
  "job_id": "job-123"
}
```

### Download Material
```http
GET /api/generate/:id/download?format=docx

Response: (binary DOCX file)
```

---

## 15. Timeline Summary

```
Week 1-2:  Database & Backend Foundation
Week 2-3:  Frontend Components
Week 3-4:  Onboarding Flow Redesign
Week 4-5:  Job Matching & Recommendations
Week 5-6:  Material Generation
Week 6:    HR Contact Enhancement
Week 7:    Testing & Refinement
Week 8:    Migration & Deployment

Total: ~8 weeks
```

---

## 16. Next Steps

1. **Review & Approval:** Get stakeholder sign-off on this plan
2. **Environment Setup:** Configure Apify API, GitHub tokens, etc.
3. **Database Migration:** Run schema changes on dev environment
4. **Kickoff Phase 1:** Start backend foundation work
5. **Weekly Reviews:** Track progress against phases

---

**Document Status:** Draft v1.0  
**Last Updated:** November 9, 2025  
**Owner:** Engineering Team  
**Reviewers:** Product, Design, Engineering Leads
