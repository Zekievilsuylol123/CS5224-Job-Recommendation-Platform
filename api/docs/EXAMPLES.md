# API Usage Examples

This document provides practical examples of using the Job Recommendation Platform API.

## Table of Contents
- [Basic Requests](#basic-requests)
- [Resume Analysis](#resume-analysis)
- [Job Search & Filtering](#job-search--filtering)
- [Applications](#applications)
- [HR Prospect Search](#hr-prospect-search)
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

## HR Prospect Search

### Basic HR Search

**Search for HR contacts at a company:**
```bash
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{
    "company_domain": "gic.com.sg"
  }'
```

**Search with custom fetch count:**
```bash
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{
    "company_domain": "gic.com.sg",
    "fetch_count": 5
  }'
```

### Domain Format Flexibility

**All these formats work:**
```bash
# Without protocol
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "okx.com"}'

# With https://
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "https://okx.com"}'

# With trailing slash
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "https://okx.com/"}'
```

### Parse and Filter Results

**Extract only names and emails:**
```bash
curl -s -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "gic.com.sg", "fetch_count": 3}' \
  | jq '.prospects[] | {name: .full_name, email: .email, linkedin: .linkedin}'
```

**Get contacts with work emails only:**
```bash
curl -s -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "gic.com.sg"}' \
  | jq '.prospects[] | select(.email != null) | {name: .full_name, email: .email, title: .job_title}'
```

**Export to CSV:**
```bash
curl -s -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "gic.com.sg", "fetch_count": 10}' \
  | jq -r '.prospects[] | [.full_name, .email, .job_title, .linkedin, .city] | @csv' \
  > hr_prospects.csv
```

### Batch Search Multiple Companies

```bash
#!/bin/bash

COMPANIES=("gic.com.sg" "dbs.com" "grab.com" "shopee.sg")

for domain in "${COMPANIES[@]}"; do
  echo "Searching HR at $domain..."
  
  curl -s -X POST http://localhost:8080/api/hr/search \
    -H "Content-Type: application/json" \
    -d "{\"company_domain\": \"$domain\", \"fetch_count\": 3}" \
    | jq -r ".prospects[] | \"$domain,\(.full_name),\(.email),\(.job_title)\"" \
    >> all_hr_prospects.csv
  
  echo "---"
  sleep 1  # Be nice to the API
done
```

### Check Response Metadata

**View search metadata:**
```bash
curl -s -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "gic.com.sg"}' \
  | jq '{
      company: .company_domain,
      count: (.prospects | length),
      timestamp: .timestamp,
      filename: .file_name
    }'
```

### Error Handling

**Handle missing domain:**
```bash
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
# {
#   "error": "invalid_request",
#   "message": "company_domain is required and must be a string"
# }
```

**Handle invalid domain:**
```bash
curl -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "not-a-domain"}'

# Response:
# {
#   "error": "invalid_domain",
#   "message": "Invalid company domain format"
# }
```

### Integration with Cold Outreach

```bash
#!/bin/bash

# 1. Search for HR prospects
echo "Finding HR contacts..."
PROSPECTS=$(curl -s -X POST http://localhost:8080/api/hr/search \
  -H "Content-Type: application/json" \
  -d '{"company_domain": "gic.com.sg", "fetch_count": 5}')

# 2. Extract contacts with valid emails
echo "Filtering valid contacts..."
echo "$PROSPECTS" | jq -r '.prospects[] | 
  select(.email != null or .personal_email != null) | 
  {
    name: .full_name,
    email: (.email // .personal_email),
    title: .job_title,
    linkedin: .linkedin,
    company: .company_name
  }'

# 3. Generate contact list for email campaign
echo "$PROSPECTS" | jq -r '.prospects[] | 
  select(.email != null) | 
  [.full_name, .email, .job_title, .company_name] | 
  @csv' > outreach_list.csv

echo "Generated outreach_list.csv with $(wc -l < outreach_list.csv) contacts"
```

### Python Integration

```python
import requests
import json

def search_hr_prospects(company_domain, fetch_count=2):
    """Search for HR contacts at a company"""
    url = "http://localhost:8080/api/hr/search"
    payload = {
        "company_domain": company_domain,
        "fetch_count": fetch_count
    }
    
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    return response.json()

def filter_valid_contacts(prospects):
    """Filter prospects with valid email addresses"""
    return [
        p for p in prospects
        if p.get('email') or p.get('personal_email')
    ]

# Example usage
result = search_hr_prospects("gic.com.sg", fetch_count=5)
valid_contacts = filter_valid_contacts(result['prospects'])

print(f"Found {len(valid_contacts)} contacts with emails")
for contact in valid_contacts:
    print(f"- {contact['full_name']} ({contact['job_title']})")
    print(f"  Email: {contact['email'] or contact['personal_email']}")
    print(f"  LinkedIn: {contact['linkedin']}\n")
```

### JavaScript Integration

```javascript
// Search for HR prospects
async function searchHRProspects(companyDomain, fetchCount = 2) {
  const response = await fetch('http://localhost:8080/api/hr/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      company_domain: companyDomain,
      fetch_count: fetchCount
    })
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  return await response.json();
}

// Filter and format contacts
function formatContacts(result) {
  return result.prospects
    .filter(p => p.email || p.personal_email)
    .map(p => ({
      name: p.full_name,
      email: p.email || p.personal_email,
      title: p.job_title,
      linkedin: p.linkedin,
      company: p.company_name,
      location: `${p.city}, ${p.country}`
    }));
}

// Example usage
searchHRProspects('gic.com.sg', 5)
  .then(result => {
    const contacts = formatContacts(result);
    console.log(`Found ${contacts.length} HR contacts`);
    contacts.forEach(c => {
      console.log(`${c.name} - ${c.title}`);
      console.log(`  ${c.email}`);
      console.log(`  ${c.linkedin}\n`);
    });
  })
  .catch(error => console.error('Error:', error));
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
