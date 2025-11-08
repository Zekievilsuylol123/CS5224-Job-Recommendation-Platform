# User Journey Flow

## Complete User Experience

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         1. AUTHENTICATION                                    │
│                                                                              │
│  Landing Page → Click "Get Started" → Google OAuth → Redirect to Dashboard  │
│                                                                              │
│  ✅ Already implemented with Supabase Auth                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      2. RESUME UPLOAD & PARSING                             │
│                                                                              │
│  Dashboard → "Complete Profile" → Upload Resume (PDF/DOCX)                  │
│                                                                              │
│  Backend: POST /resume/analyze                                              │
│  • Uses extract_resume_info() with OpenAI                                   │
│  • Extracts: name, skills, education, experience, salary                    │
│  • Saves to Supabase: resume_analyses table                                 │
│                                                                              │
│  🔧 CHANGE NEEDED: Switch from hardcoded analyzer to LLM                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    3. PROFILE EDITING & VALIDATION                          │
│                                                                              │
│  • Display parsed fields in editable form                                   │
│  • User can correct/enhance extracted data                                  │
│  • Validation: education level, years experience, salary                    │
│                                                                              │
│  ✅ Form already exists in SelfAssessment.tsx                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     4. INITIAL COMPASS SCORING                              │
│                                                                              │
│  Backend: POST /assessments/compass                                         │
│  • Input: User profile (no job yet)                                         │
│  • Calculates baseline EP eligibility                                       │
│  • Shows: Score gauge + breakdown cards                                     │
│                                                                              │
│  Components:                                                                │
│  • <ScoreGauge score={75} verdict="Likely" />                              │
│  • <BreakdownCards breakdown={...} />                                       │
│                                                                              │
│  ✅ Already implemented                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   5. SAVE PROFILE TO DATABASE                               │
│                                                                              │
│  Backend: PUT /profile                                                      │
│  • Saves to Supabase profiles table                                         │
│  • Row-level security: user can only access their own profile              │
│                                                                              │
│  🔧 NEEDS IMPLEMENTATION: Profile endpoints + Supabase tables               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    6. RECALCULATE OPTION                                    │
│                                                                              │
│  Button: "Recalculate EP Score"                                            │
│  • Useful after user edits profile                                          │
│  • Calls /assessments/compass again                                         │
│  • Updates score display                                                    │
│                                                                              │
│  ✅ Easy to add - just a button + API call                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    7. NAVIGATE TO JOB MATCHING                              │
│                                                                              │
│  Button: "See Matched Jobs" → Navigate to /jobs                            │
│                                                                              │
│  ✅ Just add button + navigation                                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       8. JOB LIST WITH EP FLAGS                             │
│                                                                              │
│  Backend: GET /jobs?search=&industry=&location=                             │
│  • Fetches from external API: eaziym.github.io/sg-jobs/data/jobs.min.json  │
│  • Format: [{c: company, t: title, u: url, m: location, g: tags}]          │
│  • For each job:                                                            │
│    - Calculate compass score vs user profile                                │
│    - Determine EP verdict (Likely/Borderline/Unlikely)                      │
│    - Sort by score (best matches first)                                     │
│                                                                              │
│  Display:                                                                   │
│  ┌────────────────────────────────────────────────────┐                    │
│  │ 🟢 Data Scientist @ TechCorp     Score: 85%        │                    │
│  │ EP Likely • Singapore • Posted 2 days ago          │                    │
│  │ Tags: AI, Python, Machine Learning                 │                    │
│  └────────────────────────────────────────────────────┘                    │
│                                                                              │
│  🔧 NEEDS: External API integration + scoring logic                         │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      9. JOB DETAIL PAGE                                     │
│                                                                              │
│  Route: /jobs/:id                                                           │
│                                                                              │
│  Shows:                                                                     │
│  • Full job details                                                         │
│  • Compass score breakdown                                                  │
│  • EP verdict with explanation                                              │
│  • Score by category (salary, qualifications, skills, etc.)                 │
│                                                                              │
│  ┌─────────────────────────────────────────────────┐                       │
│  │ Overall EP Score: 75%                            │                       │
│  │                                                  │                       │
│  │ Breakdown:                                       │                       │
│  │ • Salary: 20/20 ✅                               │                       │
│  │ • Qualifications: 15/20 ⚠️                       │                       │
│  │ • Skills Match: 18/20 ✅                         │                       │
│  │ • Shortage Occupation: 20/20 ✅                  │                       │
│  └─────────────────────────────────────────────────┘                       │
│                                                                              │
│  ✅ Already implemented                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  10. ASSESS FIT AGAINST JD (LLM)                            │
│                                                                              │
│  Button: "Assess Fit Against Job Description"                              │
│                                                                              │
│  Backend: POST /jobs/:id/analyze                                            │
│  • Retrieves job details                                                    │
│  • Gets mock JD based on job type (since real JDs not available)           │
│  • Calls get_score() LLM function                                           │
│  • Input: user profile + job description                                    │
│  • Output:                                                                  │
│    - Match score (0-100)                                                    │
│    - Strengths: [list of matching points]                                   │
│    - Gaps: [list of missing requirements]                                   │
│    - Recommendations: [suggestions to improve]                              │
│                                                                              │
│  Display Modal:                                                             │
│  ┌──────────────────────────────────────────────────┐                      │
│  │ Fit Analysis: Data Scientist @ TechCorp           │                      │
│  │                                                   │                      │
│  │ Match Score: 82%                                  │                      │
│  │                                                   │                      │
│  │ ✅ Strengths:                                     │                      │
│  │ • Strong Python & ML background                   │                      │
│  │ • Relevant experience in data analytics           │                      │
│  │ • Master's degree matches requirement             │                      │
│  │                                                   │                      │
│  │ ⚠️ Gaps:                                          │                      │
│  │ • Limited cloud platform experience               │                      │
│  │ • No mentioned experience with TensorFlow         │                      │
│  │                                                   │                      │
│  │ 💡 Recommendations:                               │                      │
│  │ • Highlight any cloud projects in cover letter    │                      │
│  │ • Consider AWS certification                      │                      │
│  └──────────────────────────────────────────────────┘                      │
│                                                                              │
│  🔧 NEEDS: Mock JD mapping + endpoint + UI modal                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        11. APPLY TO JOB                                     │
│                                                                              │
│  Button: "Track Application"                                               │
│                                                                              │
│  Backend: POST /applications                                                │
│  • Saves to Supabase applications table                                     │
│  • Fields: user_id, job_id, status, notes, timestamps                      │
│                                                                              │
│  User can later view in Applications page                                   │
│  • Update status: draft → sent → interview → offer                         │
│  • Add notes                                                                │
│                                                                              │
│  ✅ Backend already exists, just needs Supabase integration                 │
└─────────────────────────────────────────────────────────────────────────────┘

## Key Decision Points

### 1. Resume Parsing: LLM vs Hardcoded
**Decision**: Use LLM (`extract_resume_info`)
- More accurate for diverse formats
- Handles international resumes better
- Already implemented in codebase

### 2. Compass Scoring: Rule-based vs LLM
**Decision**: Hybrid approach
- Rules for quantifiable metrics (salary, years, certifications)
- LLM for qualitative assessment (optional enhancement)
- LLM provides reasoning and recommendations

### 3. Job Data Source
**Decision**: External API (eaziym.github.io/sg-jobs)
- Real-time Singapore jobs
- No need to maintain job database
- Cache with 1-hour TTL

### 4. EP Flag Calculation
**Decision**: Real-time with caching
- Job list: Use cached scores (1 hour TTL) for performance
- Job detail: Real-time recalculation for accuracy
- "Assess Fit": Fresh LLM analysis

### 5. Mock Job Descriptions
**Decision**: Template-based mapping
- Map job titles to generic JD templates
- Categories: Software Engineer, Data Scientist, Product Manager, etc.
- Good enough for MVP, can enhance later with web scraping

## What's Already Working ✅

1. Authentication (Supabase + Google OAuth)
2. Resume upload UI
3. Compass scoring logic (rule-based)
4. Score display components (gauge, breakdown cards)
5. Job list and detail pages
6. Application tracking

## What Needs Building 🔧

1. **Supabase Tables** (15 min)
   - profiles
   - saved_jobs (caching)
   - applications
   - resume_analyses

2. **Backend Changes** (1.5 hours)
   - Auth middleware
   - Profile CRUD endpoints
   - Switch to LLM resume parsing
   - External jobs API integration
   - Job analysis endpoint with mock JDs

3. **Frontend Changes** (1 hour)
   - Add auth headers to API calls
   - Profile sync with Supabase
   - "Recalculate" and "See Matched Jobs" buttons
   - Job fit analysis modal
   - Save profile on assessment completion

## Next Steps

1. Create Supabase tables (I'll provide SQL)
2. Add environment variables (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
3. Implement backend endpoints
4. Update frontend to call new endpoints
5. Test end-to-end flow
