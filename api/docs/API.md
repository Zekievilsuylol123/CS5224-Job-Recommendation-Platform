# API Documentation

## Base URL
```
http://localhost:8080/api
```

All endpoints are prefixed with `/api`.

---

## Table of Contents
- [Authentication](#authentication)
- [Health Check](#health-check)
- [Plans](#plans)
- [Jobs](#jobs)
- [Resume Analysis](#resume-analysis)
- [Applications](#applications)
- [Assessments](#assessments)
- [HR Prospect Search](#hr-prospect-search)
- [Error Responses](#error-responses)

---

## Authentication

Currently, the API uses profile-based authentication via headers or query parameters.

### Passing User Profile

**Option 1: HTTP Header (Recommended)**
```http
X-EP-Profile: {"educationLevel":"Bachelors","skills":["javascript","python"],"plan":"standard"}
```

**Option 2: Query Parameter**
```
?profile={"educationLevel":"Bachelors","skills":["javascript","python"],"plan":"standard"}
```

### User Profile Schema
```typescript
{
  id?: string;
  name?: string;
  gender?: string;
  nationality?: string;
  educationLevel?: "Diploma" | "Bachelors" | "Masters" | "PhD";
  yearsExperience?: number;
  skills?: string[];
  expectedSalarySGD?: number;
  plan?: "freemium" | "standard" | "pro" | "ultimate";
}
```

---

## Health Check

### GET `/health`

Check if the API server is running.

**Request:**
```bash
curl http://localhost:8080/api/health
```

**Response:** `200 OK`
```json
{
  "ok": true
}
```

---

## Plans

### GET `/plans`

Get available subscription plans and feature gating information.

**Request:**
```bash
curl http://localhost:8080/api/plans
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "freemium",
      "label": "Freemium",
      "price": 0,
      "resumeAnalysis": false
    },
    {
      "id": "standard",
      "label": "Standard",
      "price": 39,
      "resumeAnalysis": true
    },
    {
      "id": "pro",
      "label": "Pro",
      "price": 89,
      "resumeAnalysis": true
    },
    {
      "id": "ultimate",
      "label": "Ultimate",
      "price": 149,
      "resumeAnalysis": true
    }
  ],
  "gating": {
    "resumeAnalysis": true,
    "applications": true
  }
}
```

---

## Jobs

### GET `/jobs`

List all jobs with optional filtering. Jobs are automatically scored based on the user's profile.

**Query Parameters:**

| Parameter  | Type   | Required | Description                           |
|-----------|--------|----------|---------------------------------------|
| limit     | number | No       | Maximum number of jobs to return      |
| search    | string | No       | Search term for job title/description |
| location  | string | No       | Filter by location                    |
| industry  | string | No       | Filter by industry                    |
| minSalary | number | No       | Minimum salary in SGD                 |

**Request:**
```bash
# Basic request
curl http://localhost:8080/api/jobs

# With filters
curl "http://localhost:8080/api/jobs?limit=10&location=Singapore&minSalary=5000"

# With user profile for scoring
curl http://localhost:8080/api/jobs \
  -H "X-EP-Profile: {\"skills\":[\"javascript\",\"react\"],\"educationLevel\":\"Bachelors\"}"
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "job123",
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "Singapore",
      "industry": "Technology",
      "salaryMinSGD": 6000,
      "salaryMaxSGD": 10000,
      "description": "We are looking for...",
      "requirements": ["5+ years experience", "JavaScript", "React"],
      "employer": {
        "size": "MNC",
        "localHQ": true,
        "diversityScore": 85
      },
      "createdAt": "2025-11-01T10:00:00Z",
      "score": 85,
      "epIndicator": "Strong Match"
    }
  ],
  "total": 45
}
```

**Notes:**
- Jobs are sorted by score (highest first) when a user profile is provided
- `epIndicator` values: "Strong Match", "Good Match", "Borderline", "Weak Match"

---

### GET `/jobs/:id`

Get detailed information about a specific job, including score breakdown and rationale.

**Path Parameters:**

| Parameter | Type   | Required | Description |
|-----------|--------|----------|-------------|
| id        | string | Yes      | Job ID      |

**Request:**
```bash
curl http://localhost:8080/api/jobs/job123 \
  -H "X-EP-Profile: {\"skills\":[\"javascript\"],\"educationLevel\":\"Bachelors\"}"
```

**Response:** `200 OK`
```json
{
  "id": "job123",
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "location": "Singapore",
  "industry": "Technology",
  "salaryMinSGD": 6000,
  "salaryMaxSGD": 10000,
  "description": "We are looking for...",
  "requirements": ["5+ years experience", "JavaScript", "React"],
  "employer": {
    "size": "MNC",
    "localHQ": true,
    "diversityScore": 85
  },
  "createdAt": "2025-11-01T10:00:00Z",
  "score": 85,
  "epIndicator": "Strong Match",
  "breakdown": {
    "salary": 20,
    "qualifications": 15,
    "diversity": 10,
    "support": 10,
    "skills": 15,
    "strategic": 15
  },
  "rationale": [
    "C1 Salary · Meets indicative benchmark (20 pts).",
    "C2 Qualifications · QS top-tier degree (15 pts).",
    "C3 Diversity · Strong employer diversity profile (10 pts).",
    "C4 Support · Employer employs significant local PMETs (10 pts)."
  ]
}
```

**Error Response:** `404 Not Found`
```json
{
  "error": "not_found",
  "message": "Job not found"
}
```

---

## Resume Analysis

### POST `/resume/analyze`

Analyze a resume using rule-based text extraction. Returns profile information, score, and improvement tips.

**Rate Limit:** 10 requests per hour per client

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**

| Field  | Type | Required | Description                      |
|--------|------|----------|----------------------------------|
| file   | File | Yes      | Resume file (PDF or DOCX only)   |
| jobId  | string | No     | Job ID to score against          |

**Request:**
```bash
curl -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@/path/to/resume.pdf"

# With specific job
curl -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@/path/to/resume.pdf" \
  -F "jobId=job123"
```

**Response:** `200 OK`
```json
{
  "profile": {
    "email": "john.doe@example.com",
    "skills": ["javascript", "react", "node.js", "sql"],
    "educationLevel": "Bachelors",
    "expectedSalarySGD": 7000,
    "lastTitle": "Software Engineer"
  },
  "score": {
    "total": 75,
    "breakdown": {
      "salary": 20,
      "qualifications": 15,
      "diversity": 5,
      "support": 5,
      "skills": 15,
      "strategic": 15
    },
    "verdict": "Good Match",
    "notes": [
      "C1 Salary · Meets indicative benchmark (20 pts).",
      "C2 Qualifications · Degree recognised (15 pts).",
      "C5 Skills Bonus · Skills match job requirements (+15 pts)."
    ]
  },
  "tips": [
    "Reorder your skills section to highlight the most in-demand tools first.",
    "Call out years of experience in summary bullet points.",
    "Quantify achievements with metrics where possible."
  ]
}
```

**Error Responses:**

`400 Bad Request` - Missing file:
```json
{
  "error": "missing_file",
  "message": "Resume file is required."
}
```

`400 Bad Request` - Unsupported file type:
```json
{
  "error": "unsupported_type",
  "message": "Only PDF or DOCX resumes are supported."
}
```

`429 Too Many Requests` - Rate limit exceeded:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later."
}
```

---

### POST `/resume/llm_analyze`

Analyze a resume using LLM (OpenAI GPT). Provides more detailed structured extraction including work experience and education history.

**Rate Limit:** 10 requests per hour per client

**Requirements:** `OPENAI_API_KEY` must be set in environment variables

**Request Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**

| Field  | Type | Required | Description                      |
|--------|------|----------|----------------------------------|
| file   | File | Yes      | Resume file (PDF or DOCX only)   |
| jobId  | string | No     | Job ID to score against (optional) |

**Request:**
```bash
curl -X POST http://localhost:8080/api/resume/llm_analyze \
  -F "file=@/path/to/resume.pdf"
```

**Response:** `200 OK`
```json
{
  "profile": "{\"name\":\"John Doe\",\"email\":\"john.doe@example.com\",\"telephone\":\"(555) 123-4567\",\"education\":[{\"institution\":\"Stanford University\",\"degree\":\"Bachelor of Science\",\"field_of_study\":\"Computer Science\",\"duration\":\"2015-2019\"}],\"skills\":[\"JavaScript\",\"React\",\"Node.js\",\"Python\",\"SQL\",\"AWS\"],\"experience\":[{\"job_title\":\"Software Engineer\",\"company\":\"Tech Corp\",\"duration\":\"2019-2023\",\"description\":\"Developed scalable web applications using React and Node.js. Led team of 3 engineers on microservices architecture project.\"}]}"
}
```

**Note:** The `profile` field contains a JSON string. Parse it to get structured data:

```javascript
const response = await fetch('/api/resume/llm_analyze', {
  method: 'POST',
  body: formData
});
const data = await response.json();
const profile = JSON.parse(data.profile);
console.log(profile.name); // "John Doe"
```

**Error Responses:**

Same as `/resume/analyze`, plus:

`500 Internal Server Error` - OpenAI API error:
```json
{
  "error": "unknown",
  "message": "Failed to analyze resume with LLM"
}
```

---

## Applications

### POST `/applications`

Submit a job application.

**Request Body:**
```json
{
  "userId": "user123",
  "jobId": "job456"
}
```

**Request:**
```bash
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","jobId":"job456"}'
```

**Response:** `201 Created`
```json
{
  "id": "app789",
  "userId": "user123",
  "jobId": "job456",
  "createdAt": "2025-11-03T12:00:00Z",
  "status": "pending"
}
```

**Error Response:** `400 Bad Request`
```json
{
  "error": "bad_request",
  "message": "Invalid input data"
}
```

---

### GET `/applications`

Get all applications.

**Request:**
```bash
curl http://localhost:8080/api/applications
```

**Response:** `200 OK`
```json
{
  "items": [
    {
      "id": "app789",
      "userId": "user123",
      "jobId": "job456",
      "createdAt": "2025-11-03T12:00:00Z",
      "status": "pending"
    }
  ]
}
```

---

## Assessments

### POST `/assessments/compass`

Calculate EP Compass score for a user-job combination.

**Request Body:**
```json
{
  "user": {
    "educationLevel": "Bachelors",
    "skills": ["javascript", "react", "nodejs"],
    "expectedSalarySGD": 7000,
    "yearsExperience": 5,
    "plan": "standard"
  },
  "job": {
    "title": "Software Engineer",
    "salaryMinSGD": 6000,
    "salaryMaxSGD": 10000,
    "requirements": ["javascript", "react"],
    "employer": {
      "size": "MNC",
      "localHQ": true,
      "diversityScore": 80
    }
  }
}
```

**Request:**
```bash
curl -X POST http://localhost:8080/api/assessments/compass \
  -H "Content-Type: application/json" \
  -d @assessment.json
```

**Response:** `200 OK`
```json
{
  "score": {
    "total": 85,
    "breakdown": {
      "salary": 20,
      "qualifications": 15,
      "diversity": 10,
      "support": 10,
      "skills": 15,
      "strategic": 15
    },
    "verdict": "Strong Match",
    "notes": [
      "C1 Salary · Meets indicative benchmark (20 pts).",
      "C2 Qualifications · Degree recognised (15 pts).",
      "C3 Diversity · Strong employer diversity profile (10 pts).",
      "C4 Support · Employer employs significant local PMETs (10 pts).",
      "C5 Skills Bonus · Skills match job requirements (+15 pts).",
      "C6 Strategic Bonus · Strategic sector participation (+15 pts)."
    ]
  }
}
```

---

## HR Prospect Search

### POST `/hr/search`

Search for HR and recruiter contacts at a specific company. This endpoint queries an external prospect database to find HR professionals, talent acquisition specialists, and recruiters based in Singapore.

**Request Body:**
```json
{
  "company_domain": "okx.com",
  "fetch_count": 2
}
```

| Field           | Type   | Required | Description                                    |
|----------------|--------|----------|------------------------------------------------|
| company_domain | string | Yes      | Company website domain (e.g., "okx.com" or "https://okx.com/") |
| fetch_count    | number | No       | Number of prospects to return (default: 2)     |

**Request:**
```bash
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{
    "company_domain": "okx.com",
    "fetch_count": 2
  }'
```

**Response:** `200 OK`
```json
{
  "prospects": [
    {
      "first_name": "Jane",
      "last_name": "Smith",
      "full_name": "Jane Smith",
      "email": "jane.smith@okx.com",
      "personal_email": null,
      "job_title": "Senior HR Manager",
      "linkedin": "https://linkedin.com/in/janesmith",
      "company_name": "OKX",
      "company_domain": "okx.com",
      "city": "Singapore",
      "country": "Singapore"
    },
    {
      "first_name": "John",
      "last_name": "Tan",
      "full_name": "John Tan",
      "email": "john.tan@okx.com",
      "personal_email": null,
      "job_title": "Talent Acquisition Lead",
      "linkedin": "https://linkedin.com/in/johntan",
      "company_name": "OKX",
      "company_domain": "okx.com",
      "city": "Singapore",
      "country": "Singapore"
    }
  ],
  "company_domain": "okx.com",
  "fetch_count": 2,
  "file_name": "Prospects_2025-11-04T08-30-15",
  "timestamp": "2025-11-04T08:30:15.123Z"
}
```

**Response Fields:**

| Field           | Type   | Description                                    |
|----------------|--------|------------------------------------------------|
| prospects      | array  | List of HR/recruiter contacts found            |
| company_domain | string | Normalized company domain searched             |
| fetch_count    | number | Number of prospects requested                  |
| file_name      | string | Generated file name with timestamp             |
| timestamp      | string | ISO 8601 timestamp of the search               |

**Prospect Object (Essential Fields Only):**

| Field           | Type          | Description                                  |
|----------------|---------------|----------------------------------------------|
| first_name     | string        | First name of the contact                    |
| last_name      | string        | Last name of the contact                     |
| full_name      | string        | Full name of the contact                     |
| email          | string\|null  | Work email address (if available)            |
| personal_email | string\|null  | Personal email address (if available)        |
| job_title      | string        | Job title (e.g., "HR Manager")               |
| linkedin       | string        | LinkedIn profile URL                         |
| company_name   | string        | Company name                                 |
| company_domain | string        | Company website domain                       |
| city           | string        | City location                                |
| country        | string        | Country location                             |

**Search Criteria:**

The search automatically filters for:
- **Job Titles:** HR, Human Resource, Talent Acquisition, Recruiter
- **Location:** Singapore
- **Seniority Levels:** Senior, Entry, Manager
- **Email Status:** Validated, Not Validated, Unknown

**Error Responses:**

`400 Bad Request` - Missing or invalid domain:
```json
{
  "error": "invalid_request",
  "message": "company_domain is required and must be a string"
}
```

`400 Bad Request` - Invalid domain format:
```json
{
  "error": "invalid_domain",
  "message": "Invalid company domain format"
}
```

`500 Internal Server Error` - External API error:
```json
{
  "error": "unknown",
  "message": "Failed to search HR prospects: [error details]"
}
```

**Notes:**
- Domain can be provided with or without protocol (`https://okx.com/` or `okx.com`)
- The API automatically generates a timestamped file name for tracking
- Prospects are filtered to Singapore-based HR roles only
- Email availability depends on the prospect database

---

## Error Responses

All error responses follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code                    | Status | Description                           |
|------------------------|--------|---------------------------------------|
| `missing_file`         | 400    | Required file not provided            |
| `unsupported_type`     | 400    | File type not supported               |
| `bad_request`          | 400    | Invalid request data                  |
| `not_found`            | 404    | Resource not found                    |
| `rate_limit_exceeded`  | 429    | Too many requests                     |
| `upload_error`         | 400    | File upload error                     |
| `unknown`              | 500    | Unexpected server error               |

---

## Rate Limiting

Resume analysis endpoints are rate-limited to **10 requests per hour** per client.

When rate limit is exceeded, you'll receive:
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests. Please try again later."
}
```

---

## File Upload Limits

- **Maximum file size:** 3 MB (configurable via `UPLOAD_MAX_MB` env var)
- **Supported formats:** PDF, DOCX
- **Maximum files per request:** 1

---

## CORS

The API accepts requests from the configured web origin (default: `http://localhost:5173`).

Configure via `WEB_ORIGIN` environment variable.

---

## Examples

### Complete Resume Analysis Workflow

```bash
# 1. Upload and analyze resume
RESUME_RESPONSE=$(curl -s -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf")

# 2. Extract profile skills
SKILLS=$(echo $RESUME_RESPONSE | jq -r '.profile.skills | join(",")')

# 3. Find matching jobs
curl "http://localhost:8080/api/jobs?limit=5" \
  -H "X-EP-Profile: {\"skills\":[\"$SKILLS\"],\"educationLevel\":\"Bachelors\"}"

# 4. Apply to a job
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","jobId":"job456"}'
```

### Using LLM Analysis

```bash
# Analyze with LLM
curl -s -X POST http://localhost:8080/api/resume/llm_analyze \
  -F "file=@resume.pdf" | jq -r '.profile | fromjson | {name, email, skills}'
```

---

## Need Help?

- Check the [Quickstart Guide](./QUICKSTART.md) for setup instructions
- Review example requests in the [examples directory](../examples/)
- Open an issue on GitHub for bug reports or feature requests
