# API Usage Examples

This document provides practical examples of using the Job Recommendation Platform API.

## Table of Contents
- [Basic Requests](#basic-requests)
- [Resume Analysis](#resume-analysis)
- [Job Search & Filtering](#job-search--filtering)
- [Applications](#applications)
- [Advanced Workflows](#advanced-workflows)

---

## Basic Requests

### Health Check
```bash
curl http://localhost:8080/api/health
```

### Get Available Plans
```bash
curl http://localhost:8080/api/plans
```

---

## Resume Analysis

### Rule-Based Analysis

**Basic resume analysis:**
```bash
curl -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf"
```

**With JSON output formatting:**
```bash
curl -s -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf" | jq '.'
```

**Extract specific fields:**
```bash
curl -s -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf" | jq '{email: .profile.email, score: .score.total, tips: .tips}'
```

### LLM-Powered Analysis

**Analyze with OpenAI:**
```bash
curl -s -X POST http://localhost:8080/api/resume/llm_analyze \
  -F "file=@resume.pdf"
```

**Parse and format LLM response:**
```bash
curl -s -X POST http://localhost:8080/api/resume/llm_analyze \
  -F "file=@resume.pdf" | jq -r '.profile | fromjson | {name, email, skills: .skills[0:5]}'
```

**Full profile extraction:**
```bash
curl -s -X POST http://localhost:8080/api/resume/llm_analyze \
  -F "file=@resume.pdf" | jq -r '.profile | fromjson'
```

### Analyze Against Specific Job

```bash
curl -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf" \
  -F "jobId=job-123"
```

---

## Job Search & Filtering

### Get All Jobs

```bash
curl http://localhost:8080/api/jobs
```

### Filter by Location

```bash
curl "http://localhost:8080/api/jobs?location=Singapore"
```

### Filter by Minimum Salary

```bash
curl "http://localhost:8080/api/jobs?minSalary=5000"
```

### Search Jobs by Keyword

```bash
curl "http://localhost:8080/api/jobs?search=software+engineer"
```

### Combined Filters

```bash
curl "http://localhost:8080/api/jobs?location=Singapore&minSalary=6000&industry=Technology&limit=10"
```

### Get Jobs with User Profile (for personalized scoring)

**Using header:**
```bash
curl http://localhost:8080/api/jobs \
  -H "X-EP-Profile: {\"skills\":[\"javascript\",\"react\"],\"educationLevel\":\"Bachelors\",\"plan\":\"standard\"}"
```

**Using query parameter:**
```bash
curl "http://localhost:8080/api/jobs?profile=%7B%22skills%22%3A%5B%22javascript%22%5D%7D"
```

### Get Specific Job Details

```bash
curl http://localhost:8080/api/jobs/job-123 \
  -H "X-EP-Profile: {\"skills\":[\"python\"],\"educationLevel\":\"Masters\"}"
```

**View score breakdown:**
```bash
curl -s http://localhost:8080/api/jobs/job-123 \
  -H "X-EP-Profile: {\"skills\":[\"python\"],\"educationLevel\":\"Masters\"}" \
  | jq '{title: .title, score: .score, breakdown: .breakdown, rationale: .rationale}'
```

---

## Applications

### Submit Application

```bash
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "jobId": "job-456"
  }'
```

### List All Applications

```bash
curl http://localhost:8080/api/applications
```

---

## Advanced Workflows

### Complete Job Application Flow

```bash
#!/bin/bash

# 1. Analyze resume
echo "Analyzing resume..."
ANALYSIS=$(curl -s -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf")

EMAIL=$(echo $ANALYSIS | jq -r '.profile.email')
SKILLS=$(echo $ANALYSIS | jq -r '.profile.skills | join(",")')
EDU=$(echo $ANALYSIS | jq -r '.profile.educationLevel')

echo "Profile: $EMAIL | Education: $EDU"
echo "Skills: $SKILLS"

# 2. Find matching jobs
echo -e "\nFinding matching jobs..."
PROFILE="{\"skills\":[\"$SKILLS\"],\"educationLevel\":\"$EDU\",\"plan\":\"standard\"}"

curl -s http://localhost:8080/api/jobs?limit=5 \
  -H "X-EP-Profile: $PROFILE" \
  | jq '.items[] | {title: .title, company: .company, score: .score}'

# 3. Apply to top job
TOP_JOB=$(curl -s http://localhost:8080/api/jobs \
  -H "X-EP-Profile: $PROFILE" \
  | jq -r '.items[0].id')

echo -e "\nApplying to job: $TOP_JOB"
curl -X POST http://localhost:8080/api/applications \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user-123\",\"jobId\":\"$TOP_JOB\"}"
```

### Batch Resume Analysis

```bash
#!/bin/bash

RESUMES_DIR="./resumes"

for resume in $RESUMES_DIR/*.pdf; do
  echo "Analyzing: $(basename $resume)"
  
  curl -s -X POST http://localhost:8080/api/resume/analyze \
    -F "file=@$resume" \
    | jq '{
        file: "'$(basename $resume)'",
        email: .profile.email,
        score: .score.total,
        verdict: .score.verdict
      }'
  
  echo "---"
done
```

### Compare Resume Against Multiple Jobs

```bash
#!/bin/bash

# Get profile from resume
PROFILE=$(curl -s -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf" \
  | jq '.profile')

# Get all jobs
JOBS=$(curl -s http://localhost:8080/api/jobs | jq -r '.items[].id')

echo "Comparing resume against jobs..."
echo ""

for job_id in $JOBS; do
  RESULT=$(curl -s "http://localhost:8080/api/jobs/$job_id" \
    -H "X-EP-Profile: $(echo $PROFILE | jq -c '.')")
  
  echo "Job: $(echo $RESULT | jq -r '.title')"
  echo "Company: $(echo $RESULT | jq -r '.company')"
  echo "Score: $(echo $RESULT | jq -r '.score')"
  echo "Verdict: $(echo $RESULT | jq -r '.epIndicator')"
  echo "---"
done
```

### Custom Scoring Assessment

```bash
curl -X POST http://localhost:8080/api/assessments/compass \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "educationLevel": "Masters",
      "skills": ["python", "machine-learning", "tensorflow"],
      "expectedSalarySGD": 8000,
      "yearsExperience": 5,
      "plan": "pro"
    },
    "job": {
      "title": "ML Engineer",
      "salaryMinSGD": 7000,
      "salaryMaxSGD": 12000,
      "requirements": ["python", "machine-learning"],
      "employer": {
        "size": "MNC",
        "localHQ": true,
        "diversityScore": 90
      }
    }
  }' | jq '.'
```

---

## Using with Programming Languages

### JavaScript / Node.js

```javascript
// Using fetch
const analyzeResume = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch('http://localhost:8080/api/resume/analyze', {
    method: 'POST',
    body: formData
  });
  
  return await response.json();
};

// Get jobs with profile
const getJobs = async (userProfile) => {
  const response = await fetch('http://localhost:8080/api/jobs', {
    headers: {
      'X-EP-Profile': JSON.stringify(userProfile)
    }
  });
  
  return await response.json();
};
```

### Python

```python
import requests

# Analyze resume
def analyze_resume(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post(
            'http://localhost:8080/api/resume/analyze',
            files=files
        )
    return response.json()

# Get jobs
def get_jobs(user_profile):
    headers = {'X-EP-Profile': json.dumps(user_profile)}
    response = requests.get(
        'http://localhost:8080/api/jobs',
        headers=headers
    )
    return response.json()

# Example usage
profile = analyze_resume('resume.pdf')['profile']
jobs = get_jobs(profile)
print(f"Found {jobs['total']} matching jobs")
```

### cURL with Variables

```bash
# Store commonly used values
API_URL="http://localhost:8080/api"
USER_PROFILE='{"skills":["javascript","react"],"educationLevel":"Bachelors"}'

# Get jobs
curl "$API_URL/jobs" \
  -H "X-EP-Profile: $USER_PROFILE"

# Analyze resume
curl -X POST "$API_URL/resume/analyze" \
  -F "file=@$HOME/Documents/resume.pdf"
```

---

## Testing Tips

### Pretty Print JSON
Always use `jq` for readable output:
```bash
curl -s http://localhost:8080/api/jobs | jq '.'
```

### Save Response to File
```bash
curl -s http://localhost:8080/api/jobs > jobs.json
```

### Measure Response Time
```bash
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8080/api/jobs

# curl-format.txt:
# time_total: %{time_total}s
```

### Debug Headers
```bash
curl -v http://localhost:8080/api/health
```

---

## Common Patterns

### Pagination
```bash
# Get first 10 jobs
curl "http://localhost:8080/api/jobs?limit=10"

# Get next 10 jobs (note: offset not yet implemented)
# Coming soon: ?limit=10&offset=10
```

### Error Handling
```bash
# Check HTTP status
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/api/jobs)
if [ $STATUS -eq 200 ]; then
  echo "Success"
else
  echo "Error: $STATUS"
fi
```

### Rate Limit Handling
```bash
# Resume endpoints are rate limited (10/hour)
# Check for 429 status
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resume.pdf")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 429 ]; then
  echo "Rate limit exceeded. Please wait."
else
  echo "$BODY" | jq '.'
fi
```

---

For more information, see the [API Documentation](./API.md).
