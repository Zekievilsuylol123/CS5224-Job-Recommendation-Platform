# Backend API Quickstart Guide

Get your Job Recommendation Platform API up and running in minutes!

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** v18 or higher ([Download](https://nodejs.org/))
- **pnpm** package manager ([Install](https://pnpm.io/installation))
  ```bash
  npm install -g pnpm
  ```
- **OpenAI API Key** (required for LLM resume analysis)
  - Sign up at [OpenAI Platform](https://platform.openai.com/)
  - Create an API key from your account dashboard

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Clone and Navigate

```bash
cd /path/to/CS5224-Job-Recommendation-Platform/api
```

### Step 2: Install Dependencies

```bash
pnpm install
```

This will install all required packages for the API server.

### Step 3: Configure Environment Variables

Create a `.env` file in the `api` directory:

```bash
touch .env
```

Open `.env` and add your configuration:

```env
# Required: OpenAI API Key (for LLM resume analysis)
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Server Configuration
PORT=8080
WEB_ORIGIN=http://localhost:5173

# Optional: Data Configuration
SEED_JOBS_COUNT=30
ALLOW_FILE_STORE=false
UPLOAD_MAX_MB=3
```

**Important:** Never commit your `.env` file to version control!

### Step 4: Start the Server

**Development mode (with hot reload):**
```bash
pnpm dev
```

**Production build:**
```bash
pnpm build
pnpm start
```

You should see:
```
{"level":30,"time":1762171898877,"pid":20902,"hostname":"macbook-air","port":8080,"msg":"API listening"}
```

### Step 5: Test the API

Open a new terminal and test the health endpoint:

```bash
curl http://localhost:8080/api/health
```

Expected response:
```json
{"ok":true}
```

🎉 **Congratulations!** Your API is now running!

---

## 🔧 Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM resume analysis | `sk-proj-...` |

### Optional Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Port number for the API server |
| `WEB_ORIGIN` | `http://localhost:5173` | CORS allowed origin (frontend URL) |
| `SEED_JOBS_COUNT` | `30` | Number of sample jobs to seed in storage |
| `ALLOW_FILE_STORE` | `false` | Enable file-based storage (set to `true` for persistence) |
| `UPLOAD_MAX_MB` | `3` | Maximum upload file size in MB (1-10) |

### Example .env File

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-abcdefghijklmnopqrstuvwxyz123456

# Server Configuration
PORT=8080
WEB_ORIGIN=http://localhost:5173

# Storage Configuration
ALLOW_FILE_STORE=true
SEED_JOBS_COUNT=50

# Upload Configuration
UPLOAD_MAX_MB=5
```

---

## 🧪 Testing Your Setup

### 1. Health Check
```bash
curl http://localhost:8080/api/health
```

### 2. Get Jobs List
```bash
curl http://localhost:8080/api/jobs
```

### 3. Test Resume Analysis

**Using sample resume:**
```bash
curl -X POST http://localhost:8080/api/resume/analyze \
  -F "file=@resources/sample_resumes/senior.pdf"
```

**Using LLM analyzer:**
```bash
curl -X POST http://localhost:8080/api/resume/llm_analyze \
  -F "file=@resources/sample_resumes/graduate_cs.pdf"
```

### 4. Run Automated Tests
```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test resume.analyze.spec.ts

# Run tests in watch mode
pnpm vitest
```

---

## 📁 Project Structure

```
api/
├── src/
│   ├── index.ts              # Application entry point
│   ├── server.ts             # Express server setup & routes
│   ├── config.ts             # Environment configuration
│   ├── logger.ts             # Logging utility
│   ├── storage.ts            # Data storage adapter
│   ├── scoreCompass.ts       # Job matching algorithm
│   ├── rateLimiter.ts        # Rate limiting middleware
│   ├── types.ts              # TypeScript type definitions
│   ├── resume/
│   │   ├── analyzer.ts       # Rule-based resume parser
│   │   └── llm_analyzer.ts   # LLM-powered resume parser
│   └── parse/
│       └── resume.ts         # Resume text extraction
├── test/                     # Test files
├── docs/                     # Documentation
│   ├── API.md               # API documentation (you are here!)
│   └── QUICKSTART.md        # This file
├── resources/
│   ├── sample_resumes/      # Sample PDF/DOCX files for testing
│   └── llm_prompts/         # LLM prompt templates
├── .env                     # Environment variables (create this!)
├── package.json             # Dependencies and scripts
└── tsconfig.json            # TypeScript configuration
```

---

## 🎯 Common Tasks

### Starting the Server

**Development (recommended for local work):**
```bash
pnpm dev
```
- Auto-reloads on file changes
- Runs TypeScript directly with `tsx`

**Production:**
```bash
pnpm build    # Compile TypeScript to JavaScript
pnpm start    # Run compiled code
```

### Running Tests

```bash
# All tests
pnpm test

# Specific test file
pnpm test resume.analyze.spec.ts

# Watch mode (re-run on changes)
pnpm vitest

# Type checking
pnpm lint
```

### Seeding Sample Data

Sample jobs are automatically seeded when the server starts. Control the count:

```env
SEED_JOBS_COUNT=100
```

### Enabling File Persistence

By default, data is stored in-memory. For persistence:

```env
ALLOW_FILE_STORE=true
```

Data will be saved to `api/data/` directory.

---

## 🐛 Troubleshooting

### Port Already in Use

**Error:** `EADDRINUSE: address already in use :::8080`

**Solution:**
```bash
# Find and kill process using port 8080
lsof -ti:8080 | xargs kill -9

# Or use a different port
echo "PORT=3000" >> .env
```

### OpenAI API Errors

**Error:** `401 Unauthorized` when using `/api/resume/llm_analyze`

**Solutions:**
- Check that `OPENAI_API_KEY` is set in `.env`
- Verify your API key is valid at [OpenAI Platform](https://platform.openai.com/api-keys)
- Ensure you have API credits available
- Check the key has proper permissions

### Module Not Found Errors

**Error:** `Cannot find module 'dotenv'`

**Solution:**
```bash
cd api
pnpm install
```

### CORS Errors (from frontend)

**Error:** `Origin not allowed by CORS`

**Solution:**
Add your frontend URL to `.env`:
```env
WEB_ORIGIN=http://localhost:5173
```

### File Upload Too Large

**Error:** `File too large`

**Solution:**
Increase upload limit in `.env`:
```env
UPLOAD_MAX_MB=10
```

### TypeScript Errors

**Error:** TypeScript compilation errors

**Solution:**
```bash
# Check for type errors
pnpm lint

# Rebuild
pnpm build
```

---

## 🔐 Security Best Practices

### Protecting Your API Key

1. **Never commit `.env` to Git:**
   ```bash
   # Verify .env is in .gitignore
   cat .gitignore | grep .env
   ```

2. **Use environment-specific keys:**
   - Development: Use a separate API key with lower rate limits
   - Production: Use a different key with appropriate limits

3. **Rotate keys regularly:**
   - Generate new keys every 90 days
   - Revoke old keys after rotation

### Rate Limiting

Resume analysis endpoints are rate-limited to **10 requests/hour** per client. This prevents abuse and manages API costs.

To adjust, modify `RESUME_RATE_LIMITER` in `src/server.ts`.

---

## 🚢 Deployment

### Environment Setup

For production deployment:

1. **Set environment variables** on your hosting platform:
   - Railway, Render, Heroku: Use dashboard UI
   - Docker: Use `.env` file or `-e` flags
   - AWS/Azure: Use secrets manager

2. **Build the application:**
   ```bash
   pnpm build
   ```

3. **Start the server:**
   ```bash
   NODE_ENV=production pnpm start
   ```

### Docker Deployment

A `Dockerfile` is included in the `api/` directory:

```bash
# Build image
docker build -t job-api .

# Run container
docker run -p 8080:8080 \
  -e OPENAI_API_KEY=your-key-here \
  -e WEB_ORIGIN=https://your-frontend.com \
  job-api
```

### Using docker-compose

From the project root:

```bash
docker-compose up api
```

Make sure your `.env` file is configured.

---

## 📚 Next Steps

Now that your API is running:

1. **Read the [API Documentation](./API.md)** - Learn all available endpoints
2. **Explore sample requests** - Try different API endpoints
3. **Integrate with frontend** - Connect your React/Vue/Angular app
4. **Customize scoring logic** - Modify `scoreCompass.ts` for your needs
5. **Add new endpoints** - Extend `server.ts` with custom routes

---

## 🤝 Getting Help

- **API Documentation:** [docs/API.md](./API.md)
- **Sample Resumes:** Available in `resources/sample_resumes/`
- **Test Examples:** Check `test/*.spec.ts` files
- **Issues:** Open a GitHub issue for bug reports

---

## 📝 Quick Reference

### Essential Commands

```bash
# Installation
pnpm install

# Development
pnpm dev

# Testing
pnpm test
pnpm test resume.analyze.spec.ts

# Production
pnpm build
pnpm start

# Type checking
pnpm lint
```

### Essential Files

- `.env` - Environment configuration (create this!)
- `src/index.ts` - Entry point
- `src/server.ts` - Routes and middleware
- `docs/API.md` - Complete API reference

### Essential Endpoints

- `GET /api/health` - Health check
- `GET /api/jobs` - List jobs
- `POST /api/resume/analyze` - Analyze resume (rule-based)
- `POST /api/resume/llm_analyze` - Analyze resume (LLM)

---

## ✅ Checklist

Before deploying to production:

- [ ] `.env` file created with all required variables
- [ ] `OPENAI_API_KEY` is valid and has credits
- [ ] All tests passing (`pnpm test`)
- [ ] No TypeScript errors (`pnpm lint`)
- [ ] CORS configured for production frontend URL
- [ ] Rate limiting configured appropriately
- [ ] File upload limits set correctly
- [ ] Environment variables set on hosting platform
- [ ] `.env` file NOT committed to Git

---

**Happy coding! 🚀**
