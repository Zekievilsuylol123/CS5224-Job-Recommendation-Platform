# Job Recommendation Platform - Backend API

RESTful API service for the Job Recommendation Platform, providing job listings, resume analysis, and EP Compass scoring.

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Start development server
pnpm dev

# Run tests
pnpm test
```

The API will be available at `http://localhost:8080/api`

## 📚 Documentation

- **[Quickstart Guide](./docs/QUICKSTART.md)** - Complete setup instructions
- **[API Documentation](./docs/API.md)** - Comprehensive endpoint reference
- **[Environment Configuration](./.env.example)** - Configuration template

## 🛠 Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Language:** TypeScript
- **Testing:** Vitest
- **AI/ML:** OpenAI GPT-4
- **File Processing:** pdf-parse, mammoth
- **Validation:** Zod

## 📋 Features

- ✅ Job listing with smart filtering and scoring
- ✅ Rule-based resume analysis and parsing
- ✅ LLM-powered resume extraction (OpenAI)
- ✅ EP Compass scoring algorithm
- ✅ Job application tracking
- ✅ Rate limiting and CORS protection
- ✅ File upload with validation
- ✅ Comprehensive test coverage

## 🔑 Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/jobs` | GET | List jobs with filtering |
| `/api/jobs/:id` | GET | Get job details with scoring |
| `/api/resume/analyze` | POST | Analyze resume (rule-based) |
| `/api/resume/llm_analyze` | POST | Analyze resume (LLM) |
| `/api/applications` | POST | Submit job application |
| `/api/assessments/compass` | POST | Calculate EP score |

See [API.md](./docs/API.md) for complete documentation.

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run specific test
pnpm test resume.analyze.spec.ts

# Watch mode
pnpm vitest

# Type checking
pnpm lint
```

## 📦 Scripts

```bash
pnpm dev       # Start development server with hot reload
pnpm build     # Build for production
pnpm start     # Start production server
pnpm test      # Run tests
pnpm lint      # Type check
```

## 🔒 Environment Variables

Required:
- `OPENAI_API_KEY` - OpenAI API key for LLM features

Optional:
- `PORT` - Server port (default: 8080)
- `WEB_ORIGIN` - CORS allowed origin (default: http://localhost:5173)
- `SEED_JOBS_COUNT` - Number of sample jobs (default: 30)
- `ALLOW_FILE_STORE` - Enable file persistence (default: false)
- `UPLOAD_MAX_MB` - Max upload size in MB (default: 3)

See [.env.example](./.env.example) for details.

## 🏗 Project Structure

```
api/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Express app & routes
│   ├── config.ts             # Config management
│   ├── storage.ts            # Data storage
│   ├── scoreCompass.ts       # Scoring algorithm
│   ├── resume/
│   │   ├── analyzer.ts       # Rule-based parser
│   │   └── llm_analyzer.ts   # LLM parser
│   └── parse/
│       └── resume.ts         # Text extraction
├── test/                     # Test suites
├── docs/                     # Documentation
├── resources/
│   ├── sample_resumes/       # Test files
│   └── llm_prompts/          # Prompt templates
└── types/                    # Type declarations
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Run `pnpm test` and `pnpm lint`
6. Submit a pull request

## 📄 License

See LICENSE file in the root directory.

## 🆘 Support

- 📖 Documentation: [docs/](./docs/)
- 🐛 Issues: Open a GitHub issue
- 💬 Discussions: GitHub Discussions

---

Built with ❤️ for seamless job recommendations
