# Knowledge Base API Documentation

## Overview
The Knowledge Base API allows users to build a comprehensive profile from multiple sources and generate tailored application materials for specific jobs.

## Base URL
```
http://localhost:8080/api
```

## Authentication
All endpoints require authentication via JWT token in the `Authorization` header:
```
Authorization: Bearer <jwt_token>
```

---

## Knowledge Sources Endpoints

### List Knowledge Sources
```http
GET /knowledge-sources
```

**Response**:
```json
{
  "sources": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "source_type": "linkedin",
      "source_identifier": "https://linkedin.com/in/johndoe",
      "processing_status": "completed",
      "parsed_data": { ... },
      "metadata": { ... },
      "created_at": "2025-01-15T10:30:00Z",
      "updated_at": "2025-01-15T10:31:00Z"
    }
  ]
}
```

---

### Upload Document
```http
POST /knowledge-sources/upload
Content-Type: multipart/form-data
```

**Request**:
```
file: <PDF or DOCX file>
```

**Response**:
```json
{
  "source": {
    "id": "uuid",
    "source_type": "resume",
    "processing_status": "completed",
    "parsed_data": {
      "name": "John Doe",
      "email": "john@example.com",
      "skills": ["Python", "JavaScript", "AWS"],
      "experience": [...],
      "education": [...]
    }
  },
  "message": "File uploaded and parsed successfully"
}
```

**Error Responses**:
- `400`: No file uploaded
- `500`: File processing failed

---

### Add LinkedIn Profile
```http
POST /knowledge-sources/linkedin
Content-Type: application/json
```

**Request**:
```json
{
  "url": "https://linkedin.com/in/johndoe"
}
```

**Response**:
```json
{
  "source": {
    "id": "uuid",
    "source_type": "linkedin",
    "processing_status": "pending",
    "created_at": "2025-01-15T10:30:00Z"
  },
  "message": "LinkedIn profile is being processed"
}
```

**Notes**:
- Processing happens asynchronously via Apify API
- Poll the GET endpoint to check when `processing_status` becomes `completed`
- Requires `APIFY_API_TOKEN` environment variable

---

### Add GitHub Profile
```http
POST /knowledge-sources/github
Content-Type: application/json
```

**Request**:
```json
{
  "url": "https://github.com/johndoe"
  // OR
  "url": "johndoe"  // Just username
}
```

**Response**:
```json
{
  "source": {
    "id": "uuid",
    "source_type": "github",
    "processing_status": "pending"
  },
  "message": "GitHub profile is being processed"
}
```

**Notes**:
- Fetches public profile and repositories
- Extracts skills from programming languages and topics
- Optional `GITHUB_PERSONAL_TOKEN` for higher rate limits

---

### Add Personal Website
```http
POST /knowledge-sources/website
Content-Type: application/json
```

**Request**:
```json
{
  "url": "https://johndoe.com"
}
```

**Response**:
```json
{
  "source": {
    "id": "uuid",
    "source_type": "personal_website",
    "processing_status": "pending"
  },
  "message": "Website is being processed"
}
```

**Notes**:
- Scrapes HTML and converts to Markdown
- Uses OpenAI to summarize content
- Good for portfolios, blogs, project pages

---

### Add Manual Text
```http
POST /knowledge-sources/text
Content-Type: application/json
```

**Request**:
```json
{
  "content": "Additional context about my skills and experience that isn't captured elsewhere..."
}
```

**Response**:
```json
{
  "source": {
    "id": "uuid",
    "source_type": "manual_text",
    "processing_status": "completed",
    "parsed_data": {
      "about": "Additional context...",
      "summary": "Additional context..."
    }
  },
  "message": "Manual context added successfully"
}
```

---

### Delete Knowledge Source
```http
DELETE /knowledge-sources/:id
```

**Response**:
```json
{
  "message": "Knowledge source deleted successfully"
}
```

**Notes**:
- Automatically re-aggregates knowledge base after deletion

---

## User Preferences Endpoints

### Get Preferences
```http
GET /preferences
```

**Response**:
```json
{
  "preferences": {
    "id": "uuid",
    "user_id": "uuid",
    "preferred_industries": ["Technology", "Finance"],
    "preferred_roles": ["Software Engineer", "Data Scientist"],
    "preferred_companies": ["Google", "Meta", "Amazon"],
    "preferred_locations": ["San Francisco", "Remote"],
    "desired_salary_range": {
      "min": 120000,
      "max": 180000,
      "currency": "USD"
    },
    "work_arrangement_preference": "hybrid",
    "is_ai_predicted": true,
    "user_confirmed": true,
    "created_at": "2025-01-15T10:30:00Z",
    "updated_at": "2025-01-15T11:00:00Z"
  }
}
```

---

### Predict Preferences (AI)
```http
POST /preferences/predict
```

**Response**:
```json
{
  "preferences": {
    "preferred_industries": ["Technology", "Financial Services", "Healthcare"],
    "preferred_roles": ["Senior Software Engineer", "Tech Lead", "Engineering Manager"],
    "preferred_companies": ["Google", "Microsoft", "Amazon", "Meta", "Apple"],
    "is_ai_predicted": true,
    "user_confirmed": false
  },
  "message": "Preferences predicted successfully"
}
```

**Notes**:
- Analyzes all knowledge sources using GPT-4o-mini
- Returns top 5 industries, top 5 roles, top 10 companies
- Includes confidence scores in full response

**Error Responses**:
- `400`: Insufficient knowledge base (need at least one source)

---

### Update Preferences
```http
PUT /preferences
Content-Type: application/json
```

**Request**:
```json
{
  "preferred_industries": ["Technology", "Finance"],
  "preferred_roles": ["Software Engineer"],
  "preferred_companies": ["Google", "Stripe"],
  "preferred_locations": ["San Francisco", "New York"],
  "desired_salary_range": {
    "min": 150000,
    "max": 200000,
    "currency": "USD"
  },
  "work_arrangement_preference": "remote",
  "user_confirmed": true
}
```

**Response**:
```json
{
  "preferences": { ... },
  "message": "Preferences updated successfully"
}
```

---

### Delete Preferences
```http
DELETE /preferences
```

**Response**:
```json
{
  "message": "Preferences deleted successfully"
}
```

---

## Material Generation Endpoints

### Generate Resume
```http
POST /generate/resume/:jobId
Content-Type: application/json
```

**Request**:
```json
{
  "tone": "professional"  // Optional: formal | professional | enthusiastic
}
```

**Response**:
```json
{
  "material": {
    "id": "uuid",
    "user_id": "uuid",
    "job_id": "uuid",
    "material_type": "resume",
    "content": "# John Doe\n\n## Summary\nExperienced software engineer...",
    "metadata": {
      "word_count": 450,
      "sections": {
        "summary": "Experienced software engineer...",
        "skills": ["Python", "React", "AWS"],
        "experience": "...",
        "education": "..."
      },
      "generated_at": "2025-01-15T12:00:00Z"
    },
    "created_at": "2025-01-15T12:00:00Z"
  },
  "message": "Resume generated successfully"
}
```

**Notes**:
- Tailored specifically to the job description
- Highlights relevant experience and skills
- Markdown format (can be converted to DOCX later)

---

### Generate Cover Letter
```http
POST /generate/cover-letter/:jobId
Content-Type: application/json
```

**Request**:
```json
{
  "tone": "enthusiastic"  // Optional: formal | professional | enthusiastic
}
```

**Response**:
```json
{
  "material": {
    "id": "uuid",
    "material_type": "cover_letter",
    "content": "Dear Hiring Manager,\n\nI am excited to apply...",
    "metadata": {
      "word_count": 280,
      "tone": "enthusiastic",
      "key_points": [
        "5+ years of Python experience",
        "Led team of 4 engineers at previous company",
        "Built scalable microservices architecture"
      ],
      "generated_at": "2025-01-15T12:05:00Z"
    }
  },
  "message": "Cover letter generated successfully"
}
```

---

### Get All Materials for Job
```http
GET /generate/:jobId/materials
```

**Response**:
```json
{
  "materials": [
    {
      "id": "uuid",
      "material_type": "resume",
      "content": "...",
      "created_at": "2025-01-15T12:00:00Z"
    },
    {
      "id": "uuid",
      "material_type": "cover_letter",
      "content": "...",
      "created_at": "2025-01-15T12:05:00Z"
    }
  ]
}
```

---

### Get Specific Material
```http
GET /generate/:id
```

**Response**:
```json
{
  "material": {
    "id": "uuid",
    "material_type": "resume",
    "content": "...",
    "metadata": { ... }
  }
}
```

---

### Delete Material
```http
DELETE /generate/:id
```

**Response**:
```json
{
  "message": "Material deleted successfully"
}
```

---

## Processing Status Flow

Knowledge sources go through the following states:

1. **`pending`**: Source created, processing not started
2. **`processing`**: Background worker actively processing
3. **`completed`**: Successfully parsed and saved
4. **`failed`**: Error during processing (check `error_message` field)

**Polling Example**:
```javascript
async function waitForCompletion(sourceId) {
  while (true) {
    const response = await fetch(`/api/knowledge-sources`);
    const { sources } = await response.json();
    const source = sources.find(s => s.id === sourceId);
    
    if (source.processing_status === 'completed') {
      return source.parsed_data;
    }
    
    if (source.processing_status === 'failed') {
      throw new Error(source.error_message);
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000)); // Poll every 2s
  }
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error category",
  "message": "Detailed error message",
  "details": []  // Optional: validation errors
}
```

**Common Status Codes**:
- `400`: Bad request (invalid input, missing required fields)
- `401`: Unauthorized (missing or invalid JWT token)
- `404`: Resource not found
- `500`: Internal server error

---

## Rate Limits

- Resume uploads: 10 per hour per user
- LinkedIn/GitHub/Website scraping: No explicit limit (uses external API quotas)
- AI generation: Limited by OpenAI API quotas

---

## Data Models

### ParsedKnowledgeData
```typescript
interface ParsedKnowledgeData {
  // Contact info
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
    gpa?: string;
  }>;
  
  // Projects, certifications, etc.
  projects?: Array<{...}>;
  certifications?: Array<{...}>;
  summary?: string;
  about?: string;
}
```

---

## Examples

### Complete Onboarding Flow
```javascript
// 1. Upload resume
const formData = new FormData();
formData.append('file', resumeFile);
const { source: resume } = await fetch('/api/knowledge-sources/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
}).then(r => r.json());

// 2. Add LinkedIn
await fetch('/api/knowledge-sources/linkedin', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ url: 'https://linkedin.com/in/johndoe' })
});

// 3. Wait for LinkedIn to process
// (poll GET /api/knowledge-sources until status is 'completed')

// 4. Predict preferences
const { preferences } = await fetch('/api/preferences/predict', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json());

// 5. User confirms/modifies preferences
await fetch('/api/preferences', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ...preferences,
    user_confirmed: true
  })
});
```

### Generate Materials for Job Application
```javascript
// 1. Generate resume
const { material: resume } = await fetch(`/api/generate/resume/${jobId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ tone: 'professional' })
}).then(r => r.json());

// 2. Generate cover letter
const { material: coverLetter } = await fetch(`/api/generate/cover-letter/${jobId}`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ tone: 'enthusiastic' })
}).then(r => r.json());

// 3. Download materials
console.log(resume.content);      // Markdown resume
console.log(coverLetter.content); // Markdown cover letter

// 4. Apply to job with generated materials
await fetch('/api/applications', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    jobId,
    resumeId: resume.id,
    coverLetterId: coverLetter.id
  })
});
```

---

## Environment Setup

Required environment variables:
```bash
OPENAI_API_KEY=sk-...
APIFY_API_TOKEN=apify_api_...
GITHUB_PERSONAL_TOKEN=ghp_...  # Optional
SUPABASE_URL=https://....supabase.co
SUPABASE_SECRET_KEY=eyJh...
```

---

## Future Enhancements

Planned features (not yet implemented):
- DOCX export for resumes/cover letters
- Webhook notifications when processing completes
- Bulk operations (delete multiple sources)
- Version history for generated materials
- A/B testing different resume versions
- Integration with more platforms (Twitter, Medium, etc.)
