# LLM-Based COMPASS Scoring Implementation

## Overview

Converted the COMPASS scoring system from hardcoded logic to an LLM-based approach using OpenAI's GPT-4.1-mini with structured outputs.

## Changes Made

### 1. Created System Prompt
**File**: `resources/llm_prompts/compass_scoring.txt`

Comprehensive prompt that includes:
- All 6 COMPASS criteria with detailed scoring rules
- Sector-specific salary benchmarks
- Top-tier institution list
- Professional certifications
- Shortage occupation list
- Verdict mapping (Likely/Borderline/Unlikely)
- Strict JSON output schema
- Instructions for handling missing data

### 2. Created LLM Scorer Module
**File**: `api/src/llm_compass_scorer.ts`

Key functions:
- `scoreCompassWithLLM(input: AssessmentInput): Promise<CompassScore>`
  - Main function that calls OpenAI API
  - Uses Zod schema for structured JSON output
  - Parses and validates response

- `formatAssessmentInput(input: AssessmentInput): string`
  - Converts user profile and job data into clear prompt format
  - Handles optional fields gracefully
  - Structures data for LLM comprehension

**Zod Schema**:
```typescript
CompassScoreSchema = {
  total: number (0-100),
  breakdown: {
    salary: number (0-20),
    qualifications: number (0-20),
    diversity: number (0-20),
    support: number (0-20),
    skills: number (0-20),
    strategic: number (0-10)
  },
  verdict: 'Likely' | 'Borderline' | 'Unlikely',
  notes: string[]
}
```

### 3. Updated API Endpoints

**Using LLM Scoring** (high-value, detailed analysis):
- ✅ `POST /api/assessments/compass` - Explicit scoring requests
- ✅ `POST /api/jobs/:id/analyze` - Detailed job fit assessment

**Using Hardcoded Logic** (bulk operations, performance):
- ⚡ `GET /api/jobs` - List jobs with scores (many jobs at once)
- ⚡ `GET /api/jobs/:id` - Single job detail with quick score

**Rationale**: 
- LLM provides more nuanced analysis for detailed assessments
- Hardcoded logic remains for fast bulk operations (listing jobs)
- Avoids excessive API costs and latency

## API Flow Examples

### Example 1: Self-Assessment (Frontend)
```typescript
// User uploads resume → extracts profile → calculates score
const { score } = await assessCompass({ 
  user: profileData 
});
// Uses LLM scorer via POST /assessments/compass
```

### Example 2: Job List (Bulk)
```typescript
// Fetch jobs with compass scores
const jobs = await fetchJobs({ search: "engineer" });
// Uses hardcoded scorer for each job (fast)
```

### Example 3: Detailed Fit Analysis
```typescript
// User clicks "Assess Fit Against JD"
const analysis = await analyzeJobFit(jobId);
// Uses LLM scorer via POST /jobs/:id/analyze
```

## Benefits of LLM Approach

1. **Flexibility**: Easy to update criteria without code changes
2. **Nuance**: LLM can reason about edge cases and context
3. **Explanations**: Natural language notes in `notes[]` array
4. **Adaptability**: Can handle partial data and infer missing info
5. **Maintainability**: All scoring logic in one prompt file

## Tradeoffs

**Pros**:
- More intelligent scoring
- Better explanations
- Easier to audit and adjust
- Can evolve with policy changes

**Cons**:
- Slower (~2-3 seconds per request)
- Costs per API call ($0.0001 per request)
- Requires OpenAI API key
- Potential for non-deterministic outputs

## Configuration

Requires `OPENAI_API_KEY` in `api/.env`:
```bash
OPENAI_API_KEY=sk-...
```

Model used: `gpt-4.1-mini` (fast, cost-effective)

## Testing

To test the LLM scorer:

```bash
curl -X POST http://localhost:8080/api/assessments/compass \
  -H "Content-Type: application/json" \
  -d '{
    "user": {
      "name": "John Doe",
      "educationLevel": "Masters",
      "educationInstitution": "National University of Singapore",
      "yearsExperience": 5,
      "skills": ["Python", "Machine Learning"],
      "expectedSalarySGD": 7000
    },
    "job": {
      "title": "AI Engineer",
      "company": "Tech Corp",
      "industry": "Technology",
      "location": "Singapore"
    }
  }'
```

Expected response:
```json
{
  "score": {
    "total": 73,
    "breakdown": {
      "salary": 20,
      "qualifications": 20,
      "diversity": 5,
      "support": 5,
      "skills": 20,
      "strategic": 0
    },
    "verdict": "Likely",
    "notes": [
      "C1 Salary · Meets sector benchmark of $7,200 (20 pts).",
      "C2 Qualifications · Degree from NUS (QS top-tier) (20 pts).",
      "C3 Diversity · No employer history data (5 pts).",
      "C4 Support · Employer data unavailable (5 pts).",
      "C5 Skills Bonus · AI Engineer matches shortage list (+20 pts).",
      "C6 Strategic Bonus · No SEP data (+0 pts)."
    ]
  }
}
```

## Future Enhancements

1. **Caching**: Cache scores for same user+job combinations
2. **Batch API**: Use OpenAI batch API for bulk operations
3. **Fallback**: If LLM fails, fall back to hardcoded logic
4. **A/B Testing**: Compare LLM vs hardcoded scores
5. **Fine-tuning**: Create fine-tuned model for COMPASS scoring
6. **Prompt Optimization**: Iterate on prompt based on accuracy

## File Changes Summary

- ✅ Created: `resources/llm_prompts/compass_scoring.txt`
- ✅ Created: `api/src/llm_compass_scorer.ts`
- ✅ Modified: `api/src/server.ts` (2 endpoints updated)
- ⚡ Kept: `api/src/scoreCompass.ts` (for bulk operations)
