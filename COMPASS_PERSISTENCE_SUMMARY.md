# COMPASS Score Persistence Implementation Summary

## Overview
Implemented comprehensive persistence for resume parsing results and COMPASS scores, with proper database storage, state management, and UI flow control.

## Changes Made

### 1. Database Schema Updates (`supabase-schema.sql` & `supabase-migration-compass-scores.sql`)

#### Added to `profiles` table:
- `latest_compass_score` (INTEGER) - Quick access to most recent score
- `latest_compass_verdict` (TEXT) - Latest verdict (Likely/Borderline/Unlikely)
- `latest_compass_breakdown` (JSONB) - Score breakdown by criteria
- `latest_compass_calculated_at` (TIMESTAMPTZ) - Timestamp of calculation

#### New `compass_scores` table:
- Complete history of all COMPASS calculations
- Stores profile snapshot, total score, verdict, breakdown, notes
- Optional job_context for job-specific calculations
- RLS policies for user-scoped access

### 2. Backend Changes (`api/src/server.ts`)

#### POST `/assessments/compass` endpoint (line ~534):
- **Now saves scores to database** after LLM calculation
- Inserts into `compass_scores` history table
- Updates `profiles.latest_compass_*` fields for quick access
- Logs score calculation events

#### GET `/profile` endpoint (line ~249):
- **Now includes `latestCompassScore`** in response
- Converts snake_case DB fields to camelCase
- Returns structured score object with total, verdict, breakdown, calculatedAt

#### POST `/resume/analyze` endpoint (line ~682):
- Already saves to `resume_analyses` table ✅
- Stores full LLM output, processing time, file metadata

### 3. Frontend Type Updates

#### `web/src/types.ts`:
```typescript
export interface User {
  // ... existing fields
  latestCompassScore?: {
    total: number;
    verdict: CompassVerdict;
    breakdown: CompassBreakdown;
    notes: string[];
    calculatedAt?: string;
  } | null;
}
```

#### `web/src/api/client.ts`:
- Updated `ProfileData` interface to include `latestCompassScore`
- Uses proper `CompassBreakdown` type (not generic Record)

### 4. Profile Store (`web/src/store/profile.ts`)

#### `loadProfileFromDB()` method:
- **Now loads and restores COMPASS scores** from DB
- Populates `profile.latestCompassScore` when fetching from Supabase

### 5. Self Assessment Page (`web/src/pages/SelfAssessment.tsx`)

#### New State Variable:
- `hasUsedProfile` (boolean) - Tracks if "Use this profile" was clicked

#### Score Restoration (line ~88):
```typescript
useEffect(() => {
  if (profile?.latestCompassScore) {
    setScore(profile.latestCompassScore);
  }
}, [profile]);
```

#### Smart Score Calculation (line ~96):
- Only calculates initial score if no saved score exists
- Skips calculation when `profile.latestCompassScore` is available
- Prevents unnecessary LLM calls on page revisit

#### Button Logic Updates:

**"Use this profile" button** (line ~356):
```typescript
disabled={saving || hasUsedProfile || score.total === 0}
```
- **Disabled when no score** (`score.total === 0`)
- **Disabled after activation** (`hasUsedProfile`)
- Shows "Profile activated" text when used
- Requires recalculation to re-enable

**Button state flow:**
1. Upload resume → Calculate score → Button enabled
2. Click "Use this profile" → Save to DB → Button disabled
3. Tweak parameters → Click "Recalculate" → Button enabled again

#### handleUseProfile (line ~160):
- Saves complete profile including latest score
- Sets `hasUsedProfile = true` to disable button
- Calls `saveProfileToDB()` to persist to Supabase

#### handleTweak (line ~173):
- Resets `hasUsedProfile = false` after recalculation
- Re-enables "Use this profile" button with new score

## User Flow

### First Time User:
1. Upload resume → LLM parses → Score calculated → Saved to `resume_analyses` + `compass_scores`
2. Click "Use this profile" → Saved to `profiles` with latest score
3. Navigate away and return → Score restored from `profiles.latest_compass_*`

### Returning User:
1. Open Self Assessment → Profile loaded from DB with saved score
2. Score displayed immediately (no recalculation needed)
3. Can tweak and recalculate anytime
4. Must recalculate before using profile again (button disabled after first use)

### Score Persistence:
- **Session storage**: Zustand persist middleware (localStorage)
- **Database storage**: `profiles.latest_compass_*` (quick access) + `compass_scores` (history)
- **Resume storage**: `resume_analyses` table with full LLM output

## Benefits

1. **No score loss** - Scores persist across sessions
2. **Reduced LLM calls** - Only calculate when needed
3. **History tracking** - All calculations stored in `compass_scores`
4. **Better UX** - Clear button states and messaging
5. **Data integrity** - Profile + score saved atomically

## Testing Checklist

- [ ] Upload resume → Verify score saved to DB
- [ ] Click "Use this profile" → Button should disable
- [ ] Navigate to Jobs and back → Score still visible
- [ ] Tweak salary → Click recalculate → Button re-enabled
- [ ] Refresh page → Score restored from DB
- [ ] Check Supabase `compass_scores` table for history
- [ ] Check `profiles` table for `latest_compass_*` fields

## Database Migration

Run `/supabase-migration-compass-scores.sql` in Supabase SQL Editor to add:
- New columns to `profiles` table
- New `compass_scores` table
- RLS policies and indexes

## Notes

- Resume analyses already saved to `resume_analyses` table ✅
- LLM scoring now tracked in both quick-access (profiles) and history (compass_scores)
- Button logic prevents using stale scores
- Recalculation required after profile activation for new changes
