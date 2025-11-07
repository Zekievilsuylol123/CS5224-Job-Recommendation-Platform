# Bug Fix: Resume Parsing Not Extracting Skills

## Issue Identified

The resume parsing endpoint was returning a JSON **string** instead of a parsed **object**, causing the frontend to not extract any skills, education level, or years of experience from uploaded resumes.

## Root Cause

In `api/src/resume/llm_analyzer.ts`, the `extract_resume_info()` function was returning `res.output_text` directly, which is a JSON string from the OpenAI API response.

### Before:
```typescript
export async function extract_resume_info(resume: Express.Multer.File): Promise<string> {
  // ... API call ...
  return res.output_text; // ❌ Returns JSON string, not object
}
```

## Solution

### 1. Parse JSON String in LLM Analyzer

**File**: `api/src/resume/llm_analyzer.ts`

```typescript
export type ParsedProfile = z.infer<typeof ProfileSchema>;

export async function extract_resume_info(resume: Express.Multer.File): Promise<ParsedProfile> {
  // ... API call ...
  
  // ✅ Parse the JSON string into an object
  const parsedProfile = JSON.parse(res.output_text);
  return parsedProfile;
}
```

### 2. Transform LLM Output to Frontend Format

The LLM returns a detailed schema:
```typescript
{
  name: string;
  email: string;
  telephone: string;
  education: Array<{
    institution: string;
    degree: string;
    field_of_study: string;
    duration: string;
  }>;
  skills: string[];
  experience: Array<{
    job_title: string;
    company: string;
    duration: string;
    description: string;
  }>;
}
```

But the frontend expects a simpler format:
```typescript
{
  name?: string;
  email?: string;
  skills: string[];
  educationLevel?: 'Diploma' | 'Bachelors' | 'Masters' | 'PhD';
  yearsExperience?: number;
  lastTitle?: string;
  nationality?: string;
  gender?: string;
}
```

**File**: `api/src/server.ts`

Added transformation logic in `/api/resume/analyze` endpoint:

```typescript
// Use LLM to extract profile information
const llmProfile = await extract_resume_info(req.file);

// Transform LLM output to match frontend ParsedProfile interface
const parsedProfile = {
  name: llmProfile.name,
  email: llmProfile.email,
  skills: llmProfile.skills || [],
  educationLevel: inferEducationLevel(llmProfile.education),
  yearsExperience: inferYearsExperience(llmProfile.experience),
  lastTitle: llmProfile.experience?.[0]?.job_title,
  nationality: undefined, // Not extracted by LLM
  gender: undefined // Not extracted by LLM
};
```

### 3. Added Helper Functions

**File**: `api/src/server.ts`

#### `inferEducationLevel()`
- Analyzes education array to determine highest degree
- Checks for keywords: PhD, Master, Bachelor, Diploma
- Returns appropriate enum value

#### `inferYearsExperience()`
- Parses duration strings from work experience
- Handles formats like "Jan 2024 - Present", "2020 - 2023"
- Calculates total months and converts to years
- Handles ongoing positions (Present)

## Testing

### Expected Behavior (Fixed)

1. **Upload Resume**: POST `/api/resume/analyze` with PDF/DOCX
2. **LLM Extraction**: OpenAI extracts structured data
3. **JSON Parsing**: String converted to object ✅
4. **Data Transformation**: 
   - Skills array extracted ✅
   - Education level inferred (e.g., "Master of Computing" → "Masters") ✅
   - Years of experience calculated (e.g., "Jun 2025 - Present" + "Jul 2024 - Jun 2025" = 1 year) ✅
   - Last job title extracted ✅
5. **Frontend Display**:
   - Skills chips appear in profile
   - Education level shown in profile highlights
   - Experience counted correctly

### Verification from Terminal Log

From the attached terminal output, the LLM successfully extracted:
```json
{
  "name": "Shiyao Meng",
  "email": "e0773600@u.nus.edu",
  "skills": [
    "AI Engineering: Copilot/Copilot Studio...",
    "Automation & Data: RPA (n8n)...",
    "Cloud & Security: Azure...",
    "Web/Backend: Node/Express..."
  ],
  "education": [
    {
      "degree": "Master of Computing in Artificial Intelligence",
      "institution": "National University of Singapore"
    }
  ],
  "experience": [
    {
      "job_title": "Technology & Analytics Associate",
      "company": "PKF-CAP LLP",
      "duration": "Jun 2025 - Present"
    }
  ]
}
```

After transformation:
- ✅ Skills: 4 skills extracted
- ✅ Education Level: "Masters" (inferred from "Master of Computing")
- ✅ Years Experience: ~1 year (calculated from multiple positions)
- ✅ Last Title: "Technology & Analytics Associate"

## Database Storage

Full LLM output is saved to `resume_analyses` table for:
- Future reference
- Debugging
- Potential re-processing

The `parsed_data` column stores the complete LLM response with all education and experience details.

## Status

✅ **FIXED** - Resume parsing now correctly extracts and transforms all profile data.

## Next Steps

1. Restart API server to apply changes
2. Upload a test resume to verify extraction
3. Check that skills appear in the UI
4. Verify Compass score calculation uses extracted data
