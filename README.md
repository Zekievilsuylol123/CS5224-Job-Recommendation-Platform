# CS5224-Team-21
# EP-Aware Jobs MVP

Ultra-lean Employment Pass aware job recommender built with a React/Vite frontend (`/web`) and Express/TypeScript backend (`/api`). The system keeps all state in-process by default, provides optional JSON persistence behind a storage interface, and is ready to swap to cloud services later without touching the business logic.

## Repository layout

- `/api` – Express server, resume parsing, scoring, storage adapters, tests. [📚 API Docs](./api/docs/)
- `/web` – Vite + React app, Tailwind UI, Zustand profile store, tests.
- `docker-compose.yml` – Runs both services with sensible defaults.

## Quick start

> Requirements: Node 18+, pnpm 8+

**📖 New to the project? Start here:**
- **Backend Setup:** [API Quickstart Guide](./api/docs/QUICKSTART.md)
- **API Reference:** [Complete API Documentation](./api/docs/API.md)
- **Examples:** [API Usage Examples](./api/docs/EXAMPLES.md)

### First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Configure backend API environment
cd api
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 3. Configure frontend to connect to backend
cd ../web
cp .env.example .env
# Default VITE_API_URL=http://localhost:8080/api is correct for local development

# 4. Return to root and start both services
cd ..
pnpm -w dev            # launches api (8080) and web (5173)
```

**Important:** The frontend (port 5173) makes API calls to the backend (port 8080). The `VITE_API_URL` environment variable must be set in `web/.env` for this to work correctly.

### Testing

```bash
pnpm -w test           # backend + frontend vitest suites
```

### Build

```bash
pnpm --filter api build
pnpm --filter web build
```

### Docker

```bash
docker-compose up --build
```

Frontend is served on <http://localhost:5173>, API on <http://localhost:8080>.

**⚠️ Important:** Make sure both `api/.env` and `web/.env` are configured:
- `api/.env` - Backend configuration (OpenAI API key, port, etc.)
- `web/.env` - Frontend configuration (`VITE_API_URL=http://localhost:8080/api`)

Without these files, the frontend won't be able to communicate with the backend API.

## Key flows (text diagrams)

```
Self-Assessment
  Step A: Basic info form
       ↓
  Step B: Resume upload (PDF/DOCX → parse → Compass score)
       ↓
  Step C: Breakdown + tips → “Use this profile” (updates local store)
       ↓
  Optional tweaks → Re-score via POST /assessments/compass

Job Browsing
  Load /dashboard → GET /jobs?limit=3&rankBy=epFit
       ↓
  View all → GET /jobs with filters
       ↓
  Job detail → GET /jobs/:id (score + rationale)
       ↓
  Assess fit → POST /assessments/compass
       ↓
  Apply (mock) → POST /applications (tracked locally + API echo)
```

## Backend highlights (`/api`)

**📚 Documentation:** [Quickstart](./api/docs/QUICKSTART.md) | [API Reference](./api/docs/API.md) | [Examples](./api/docs/EXAMPLES.md)

- **Routing**: `GET /jobs`, `GET /jobs/:id`, `POST /assessments/compass`, `POST /resume/analyze`, `POST /resume/llm_analyze`, `POST/GET /applications`, `GET /plans`, `GET /health`.
- **Scoring**: `scoreCompass.ts` exposes weights (`SALARY_WEIGHT`, etc.) and verdict thresholds for shared FE tests.
- **Resume parsing**: pdf-parse & mammoth feed heuristics that infer education, skills, experience, salary, title. LLM-powered analysis available via OpenAI. Files never persist; text is sanitised.
- **Storage**: `StorageAdapter` with `InMemoryStore` (default) and `FileStore` (env `ALLOW_FILE_STORE=true`). Seed generator (`seedJobs.ts`) produces 30 deterministic SG roles.
- **Protection**: Token bucket rate limiting (10 resume analyses/IP/hour), file size/type guard (≤3 MB, PDF/DOCX).
- **Logging**: Pino logger, single error handler.
- **Tests**: `scoreCompass`, `resume.analyze`, `jobs` cover verdict boundaries, parsing, and ranking.

Environment variables live in `api/.env.example`. See [Quickstart Guide](./api/docs/QUICKSTART.md) for setup instructions.

## Frontend highlights (`/web`)

- **Stack**: React 18, Vite, TypeScript, Tailwind, React Query, React Router, Zustand (persisted in localStorage).
- **Pages**: Landing, Self-Assessment (3-step wizard), Dashboard (Top-3), Jobs list (filters + EP indicators), Job detail (gauge, breakdown, rationales, mock apply), Applications tracker.
- **Components**: ScoreGauge, JobCard, ProfileChips, ResumeDropzone, BreakdownCards, EmptyState.
- **State**: `useProfileStore` merges basic info + parsed profile, instantly refreshes job queries using profile headers.
- **API client**: Fetch wrapper injects `x-ep-profile` header with current profile JSON.
- **Tests**: Validation for resume upload, EP pill rendering, and assessment re-score interactions.

Environment config lives in `web/.env.example`.

## Extensibility notes

- Storage interface ready for DynamoDB/RDS swap; simply add new adapter implementing `StorageAdapter`.
- Resume parsing abstracted so OCR/Textract integration would replace `analyzeResume`.
- Frontend consumes structured Compass breakdown so web or mobile clients can reuse.
- Docker images include `VITE_API_URL` build arg for deploying behind dedicated domains.

## Troubleshooting

- **Frontend can't connect to API:** Ensure `web/.env` exists with `VITE_API_URL=http://localhost:8080/api`. Restart the dev server after creating/modifying this file.
- **Missing OpenAI API key:** Create `api/.env` and add `OPENAI_API_KEY=your-key-here` for LLM resume analysis to work.
- Resume upload errors >3 MB or wrong MIME return friendly messages from both UI and API.
- Rate limit (HTTP 429) surfaces as toast-friendly error via API response.
- When running Docker locally, set `WEB_ORIGIN` (API) to the public URL the browser uses.

Happy shipping! 🚢

