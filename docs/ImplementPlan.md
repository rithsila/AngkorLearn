# Learning OS – Implementation Plan

> Complete implementation guide with AI-agent prompts for building Learning OS
> from start to finish.

> **📋 Full Architecture:** See [TechStack.md](./TechStack.md) for complete
> technology stack, deployment architecture, and cost estimates.

---

## Technology Stack Decisions

### LLM Providers: OpenAI + DeepSeek (Dual Strategy)

| Provider     | Use Case                    | Model       | Why                                                  |
| ------------ | --------------------------- | ----------- | ---------------------------------------------------- |
| **OpenAI**   | Planner, Examiner, Reviewer | GPT-4o      | Best for structured JSON output, evaluation accuracy |
| **DeepSeek** | Tutor, Coach                | DeepSeek-V3 | Cost-effective for conversational responses, fast    |

**Implementation Strategy:**

```typescript
// backend/src/ai/llm.adapter.ts
const LLM_ROUTING = {
  planner: "openai", // Needs reliable JSON output
  examiner: "openai", // Needs accurate evaluation
  reviewer: "openai", // Needs structured analysis
  tutor: "deepseek", // Conversational, high volume
  coach: "deepseek", // Conversational, encouraging
};
```

**Cost Optimization:**

- OpenAI: ~$5/1M input tokens, ~$15/1M output tokens (GPT-4o)
- DeepSeek: ~$0.27/1M input tokens, ~$1.10/1M output tokens (V3)
- **Estimated 70% cost reduction** by routing Tutor/Coach to DeepSeek

---

### Vector Database: Qdrant

| Feature                 | Configuration                                 |
| ----------------------- | --------------------------------------------- |
| **Deployment**          | Docker (local dev), Qdrant Cloud (production) |
| **Collection**          | `content_sections`                            |
| **Embedding Dimension** | 1536 (OpenAI) or 1024 (alternative)           |
| **Distance Metric**     | Cosine                                        |

**Why Qdrant over pgvector:**

- Better performance at scale
- Built-in filtering and payload storage
- Horizontal scaling in production
- Dedicated vector operations

**Connection:**

```typescript
// backend/src/config/qdrant.ts
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || "http://localhost:6333",
  apiKey: process.env.QDRANT_API_KEY,
});
```

---

### Frontend Best Practices

| Practice             | Implementation                         |
| -------------------- | -------------------------------------- |
| **Design System**    | Refer to `VisualLayoutPage.md`         |
| **Styling**          | Tailwind CSS with custom design tokens |
| **State Management** | Zustand for global state               |
| **Data Fetching**    | TanStack Query (React Query)           |
| **Forms**            | React Hook Form + Zod validation       |
| **Charts**           | Recharts for analytics                 |
| **Animations**       | Framer Motion                          |

---

### Backend Best Practices

| Practice            | Implementation                        |
| ------------------- | ------------------------------------- |
| **Validation**      | Zod schemas for all inputs            |
| **Error Handling**  | Custom error classes + global handler |
| **Logging**         | Pino (structured JSON logs)           |
| **Background Jobs** | BullMQ with Redis                     |
| **Testing**         | Vitest + Supertest                    |
| **API Docs**        | Swagger/OpenAPI auto-generation       |

---

## Overview

This document contains all implementation tasks organized into 8 phases. Each
task includes prompts designed to work with AI agents, following the project's
documentation and architecture.

**Total Phases:** 8\
**Total Tasks:** 41+\
**Estimated Duration:** 6-8 weeks

### Progress Summary

| Phase                         | Status         | Completion |
| ----------------------------- | -------------- | ---------- |
| Phase 1: Project Setup        | ✅ Complete    | 100%       |
| Phase 2: Core Systems         | ✅ Complete    | 100%       |
| Phase 3: AI Integration       | ✅ Complete    | 100%       |
| Phase 4: Learning Workflow    | 🔲 Not Started | 0%         |
| Phase 5: Evaluation           | 🔲 Not Started | 0%         |
| Phase 6: Polish & Production  | 🔲 Not Started | 0%         |
| Phase 7: Content Sharing      | 🔲 Not Started | 0%         |
| Phase 8: Production Readiness | 🔲 Not Started | 0%         |

**Key Documents:**

- `PRD.md` – Product requirements
- `Database Schema.md` – Data models
- `Backend Architecture.md` – System design
- `AI Prompt Templates.md` – Prompt structures
- `VisualLayoutPage.md` – UI/UX specifications

---

## Phase 1: Project Setup & Bootstrap ✅

### SETUP-01: Initialize Repository Structure ✅

- **Task ID**: `SETUP-01`
- **Objective**: Create the complete repository folder structure for Learning OS
- **Requirements**:
  - Create root directory with `backend/`, `frontend/`, `prompts/`, `docs/`
    folders
  - Initialize git repository with `.gitignore` for Node.js and Next.js
  - Create placeholder README.md with project description
  - Set up folder structure as defined in `GET_STARTED.md`
- **Dependencies**: None
- **Deliverables**:
  - `learning-os/` root directory
  - Proper folder hierarchy
  - Initial git commit
- **Acceptance Criteria**:
  - Directory structure matches `GET_STARTED.md` specification
  - Git is initialized with first commit
  - Run `ls -la` to verify all directories exist

---

### SETUP-02: Backend Skeleton (Fastify) ✅

- **Task ID**: `SETUP-02`
- **Objective**: Generate a Fastify backend skeleton with modular architecture
- **Requirements**:
  - Read `context.md` and `PRD.md` for system understanding
  - Initialize Node.js project with TypeScript
  - Set up Fastify with the following modules:
    - `auth/` – User registration, login, JWT
    - `content/` – PDF upload, text extraction
    - `learning/` – Session management, progress
    - `ai/` – AI orchestrator, prompt handling
  - Configure basic environment variables (.env.example)
  - Set up ESLint and Prettier for code quality
- **Dependencies**: `SETUP-01`
- **Deliverables**:
  - `backend/package.json`
  - `backend/src/` with module structure
  - `backend/tsconfig.json`
  - `backend/.env.example`
- **Acceptance Criteria**:
  - Run `npm install` without errors
  - Run `npm run dev` – server starts on port 3001
  - Health endpoint responds at `GET /health`

---

### SETUP-03: Frontend Skeleton (Next.js) ✅

- **Task ID**: `SETUP-03`
- **Objective**: Generate a minimal Next.js frontend with core pages
- **Requirements**:
  - Based on `PRD.md`, create Next.js 14+ with App Router
  - Create the following pages:
    - `/` – Landing/home page
    - `/login` – Authentication
    - `/register` – User registration
    - `/dashboard` – User content library
    - `/upload` – Content upload page
    - `/learn/[id]` – Learning session page (chat + content + notes)
  - Set up Tailwind CSS for styling
  - Configure API base URL via environment variables
- **Dependencies**: `SETUP-01`
- **Deliverables**:
  - `frontend/package.json`
  - `frontend/src/app/` with page structure
  - `frontend/.env.example`
  - Basic layout components
- **Acceptance Criteria**:
  - Run `npm install` without errors
  - Run `npm run dev` – app starts on port 3000
  - All pages render without errors
  - Navigate between pages works

---

### SETUP-04: Docker Development Environment ✅

- **Task ID**: `SETUP-04`
- **Objective**: Create Docker Compose setup for local development
- **Requirements**:
  - Create `docker-compose.yml` with:
    - PostgreSQL 15+ (without pgvector, using Qdrant instead)
    - Redis for caching and sessions
    - **Qdrant** for vector search (port 6333)
  - Create initialization scripts for database
  - Configure Qdrant collection on startup
  - Document environment variables needed
- **Dependencies**: `SETUP-01`
- **Deliverables**:
  - `docker-compose.yml`
  - `docker/init.sql` – Database initialization
  - `docker/qdrant-init.sh` – Qdrant collection setup (optional)
  - Updated documentation in README.md
- **Acceptance Criteria**:
  - Run `docker-compose up -d` – all containers start
  - Connect to PostgreSQL on port 5432
  - Connect to Redis on port 6379
  - Qdrant REST API responds at port 6333
  - Qdrant gRPC responds at port 6334

---

## Phase 2: Core Systems Implementation ✅

### DB-01: Database Schema Implementation ✅

- **Task ID**: `DB-01`
- **Objective**: Implement PostgreSQL schema exactly as defined in
  `Database Schema.md`
- **Requirements**:
  - Create migration system (use Prisma or Drizzle ORM)
  - Implement all 8 tables from schema:
    - `users`
    - `contents`
    - `content_sections`
    - `learning_maps`
    - `concepts`
    - `learning_sessions`
    - `interactions`
    - `user_notes`
  - Enable pgvector extension for embeddings
  - Add proper indexes for foreign keys
  - Create seed data for testing
- **Dependencies**: `SETUP-02`, `SETUP-04`
- **Deliverables**:
  - `backend/prisma/schema.prisma` (or equivalent)
  - Migration files
  - `backend/prisma/seed.ts`
- **Acceptance Criteria**:
  - Run migrations without errors
  - All 8 tables created with correct columns
  - Run `npx prisma db push` successfully
  - Seed data populates test user

---

### AUTH-01: User Authentication System ✅

- **Task ID**: `AUTH-01`
- **Objective**: Implement complete user authentication with JWT
- **Requirements**:
  - User registration with email/password
  - Password hashing with bcrypt
  - Login endpoint returning JWT token
  - JWT middleware for protected routes
  - Token refresh mechanism
  - Logout (token invalidation via Redis)
- **Dependencies**: `DB-01`
- **Deliverables**:
  - `backend/src/auth/auth.controller.ts`
  - `backend/src/auth/auth.service.ts`
  - `backend/src/auth/jwt.middleware.ts`
  - API routes: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- **Acceptance Criteria**:
  - Register new user → returns success
  - Login with valid credentials → returns JWT
  - Access protected route without token → 401
  - Access protected route with valid token → 200

---

### AUTH-02: Frontend Authentication Flow ✅

- **Task ID**: `AUTH-02`
- **Objective**: Implement frontend authentication pages and state management
- **Requirements**:
  - Login form with validation
  - Registration form with validation
  - Auth context for global state
  - Protected route wrapper component
  - Token storage in httpOnly cookies (preferred) or localStorage
  - Auto-redirect on auth state change
- **Dependencies**: `SETUP-03`, `AUTH-01`
- **Deliverables**:
  - `frontend/src/components/auth/LoginForm.tsx`
  - `frontend/src/components/auth/RegisterForm.tsx`
  - `frontend/src/context/AuthContext.tsx`
  - `frontend/src/middleware.ts` for route protection
- **Acceptance Criteria**:
  - Login form validates email format
  - Successful login redirects to dashboard
  - Protected pages redirect to login if unauthenticated
  - Auth state persists on page refresh

---

### CONTENT-01: PDF Upload & Storage ✅

- **Task ID**: `CONTENT-01`
- **Objective**: Implement PDF file upload and storage system
- **Requirements**:
  - Multipart file upload endpoint
  - File validation (PDF only, max 50MB)
  - Store files locally or in cloud storage (configurable)
  - Create content record in database
  - Return upload status and content ID
- **Dependencies**: `DB-01`, `AUTH-01`
- **Deliverables**:
  - `backend/src/content/content.controller.ts`
  - `backend/src/content/upload.service.ts`
  - `backend/src/content/storage/` (local & cloud adapters)
  - API route: `POST /content/upload`
- **Acceptance Criteria**:
  - Upload PDF file → returns content ID
  - Upload non-PDF → returns error
  - Upload file > 50MB → returns error
  - File is stored and retrievable

---

### CONTENT-02: Text Extraction & Processing ✅

- **Task ID**: `CONTENT-02`
- **Objective**: Extract and process text from uploaded PDFs
- **Requirements**:
  - Use pdf-parse or similar library for extraction
  - Clean extracted text (remove headers, footers, page numbers)
  - Segment content by chapters/sections
  - Store raw and cleaned text in database
  - Queue processing for background execution
- **Dependencies**: `CONTENT-01`
- **Deliverables**:
  - `backend/src/content/extraction.service.ts`
  - `backend/src/content/segmentation.service.ts`
  - `backend/src/jobs/process-content.job.ts`
- **Acceptance Criteria**:
  - Upload PDF → text extracted within 30 seconds
  - Content sections created in database
  - Raw text stored in `contents.raw_text`
  - Sections ordered correctly by `order_index`

---

### CONTENT-03: Embedding Generation (Qdrant) ✅

- **Task ID**: `CONTENT-03`
- **Objective**: Generate embeddings and store in Qdrant vector database
- **Requirements**:
  - Connect to OpenAI embeddings API (text-embedding-3-small)
  - Generate embeddings for each content section
  - **Store embeddings in Qdrant** (not pgvector):
    - Collection: `content_sections`
    - Dimension: 1536 (OpenAI)
    - Distance: Cosine
  - Store metadata as Qdrant payload (content_id, section_id, title)
  - Implement batch processing (max 100 vectors per upsert)
  - Add error handling and retry logic
- **Dependencies**: `CONTENT-02`, `SETUP-04` (Qdrant in Docker)
- **Deliverables**:
  - `backend/src/content/embedding.service.ts`
  - `backend/src/vector/qdrant.client.ts`
  - `backend/src/vector/qdrant.service.ts`
  - Configuration for Qdrant connection
- **Acceptance Criteria**:
  - Process content → embeddings generated
  - Embeddings stored in Qdrant collection
  - Similarity search via Qdrant returns relevant results
  - Cost logged per embedding call
  - Qdrant health check endpoint works

---

### CONTENT-04: Frontend Content Upload UI ✅

- **Task ID**: `CONTENT-04`
- **Objective**: Create content upload page with progress feedback
- **Requirements**:
  - Drag-and-drop file upload zone
  - File type and size validation (client-side)
  - Upload progress indicator
  - Processing status display
  - Redirect to dashboard on completion
- **Dependencies**: `SETUP-03`, `CONTENT-01`
- **Deliverables**:
  - `frontend/src/app/upload/page.tsx`
  - `frontend/src/components/upload/DropZone.tsx`
  - `frontend/src/components/upload/ProgressBar.tsx`
- **Acceptance Criteria**:
  - Drag file → shows file name and size
  - Click upload → shows progress bar
  - Processing complete → redirects to dashboard
  - Invalid file → shows error message

---

## Phase 3: AI System Integration ✅

### AI-01: Prompt Management System ✅

- **Task ID**: `AI-01`
- **Objective**: Implement versioned prompt loading and management
- **Requirements**:
  - Load prompts from `/prompts` directory
  - Support for versioned prompts (v1, v2, etc.)
  - Dynamic context injection (user, concept, history)
  - Prompt template rendering with variables
  - Log prompt version with each AI interaction
- **Dependencies**: `SETUP-02`
- **Deliverables**:
  - `backend/src/ai/prompt.service.ts`
  - `backend/src/ai/prompt.loader.ts`
  - `prompts/planner/v1.txt`
  - `prompts/tutor/v1.txt`
  - `prompts/examiner/v1.txt`
  - `prompts/coach/v1.txt`
  - `prompts/reviewer/v1.txt`
- **Acceptance Criteria**:
  - Load prompt by role and version
  - Inject context variables correctly
  - Fallback to latest version if specified version missing
  - Logs show prompt version used

---

### AI-02: AI Orchestrator Service (Dual LLM) ✅

- **Task ID**: `AI-02`
- **Objective**: Build central AI orchestration service with dual LLM routing
- **Requirements**:
  - Route requests to appropriate AI role (Planner, Tutor, Examiner, Coach,
    Reviewer)
  - **Dual LLM Strategy:**
    - OpenAI (GPT-4o): Planner, Examiner, Reviewer (structured output)
    - DeepSeek (V3): Tutor, Coach (conversational, cost-effective)
  - Enforce role boundaries (each role has specific outputs)
  - Implement token usage tracking and limits per provider
  - Store all interactions in database with provider info
  - Automatic fallback if one provider fails
- **Dependencies**: `AI-01`, `DB-01`
- **Deliverables**:
  - `backend/src/ai/orchestrator.service.ts`
  - `backend/src/ai/roles/` (planner, tutor, examiner, coach, reviewer)
  - `backend/src/ai/token.tracker.ts`
  - `backend/src/ai/providers/openai.adapter.ts`
  - `backend/src/ai/providers/deepseek.adapter.ts`
  - `backend/src/ai/llm.router.ts` (routes roles to providers)
- **Acceptance Criteria**:
  - Call Planner role → routed to OpenAI, returns JSON learning map
  - Call Tutor role → routed to DeepSeek, returns explanation text
  - Token usage tracked per provider
  - Cost logged per interaction
  - Fallback works when primary provider fails

---

### AI-03: RAG Context Assembly (Qdrant) ✅

- **Task ID**: `AI-03`
- **Objective**: Implement RAG with Qdrant for concept-based context retrieval
- **Requirements**:
  - **Query Qdrant** for relevant content sections by embedding similarity
  - Use Qdrant filters for content_id scoping
  - Limit context to current concept (top 3-5 results)
  - Include user notes and past mistakes in context
  - Assemble context with token budget awareness (max 4000 tokens)
  - Cache frequently accessed contexts in Redis
- **Dependencies**: `AI-02`, `CONTENT-03`
- **Deliverables**:
  - `backend/src/ai/context.assembler.ts`
  - `backend/src/ai/retrieval.service.ts` (uses Qdrant)
  - `backend/src/ai/context.cache.ts` (Redis-based)
- **Acceptance Criteria**:
  - Query concept → Qdrant returns relevant sections (< 100ms)
  - Context stays within token limit
  - Filtered by content_id correctly
  - User history included when available
  - Cached context returned on repeated queries (< 10ms)

---

### AI-04: Learning Map Generation ✅

- **Task ID**: `AI-04`
- **Objective**: Implement Planner AI role for learning map creation
- **Requirements**:
  - Take content sections as input
  - Generate structured learning map (JSON)
  - Identify key concepts from content
  - Order concepts logically (dependencies first)
  - Assign difficulty levels (1-5)
  - Store learning map and concepts in database
- **Dependencies**: `AI-02`, `CONTENT-02`
- **Deliverables**:
  - `backend/src/ai/roles/planner.service.ts`
  - `backend/src/learning/learning-map.service.ts`
  - API route: `POST /learning/generate-map`
- **Acceptance Criteria**:
  - Upload content → learning map generated
  - Map has overview and concepts array
  - Concepts have title, description, difficulty, order
  - Data stored in `learning_maps` and `concepts` tables

---

## Phase 4: Learning Workflow Implementation

### LEARN-01: Learning Session State Machine

- **Task ID**: `LEARN-01`
- **Objective**: Implement learning session state machine for guided learning
- **Requirements**:
  - Define session states:
    - `init` – Session started
    - `explain` – Tutor explaining concept
    - `user_explain` – User explaining back
    - `evaluate` – Examiner evaluating understanding
    - `decide_next` – Coach deciding next step
    - `complete` – Session finished
  - State transitions managed by AI Coach
  - Store session state in database
  - Support pause and resume
- **Dependencies**: `AI-02`, `DB-01`
- **Deliverables**:
  - `backend/src/learning/session.service.ts`
  - `backend/src/learning/session-state.machine.ts`
  - API routes: `POST /session/start`, `POST /session/interact`,
    `GET /session/:id`
- **Acceptance Criteria**:
  - Start session → state is `init`
  - Tutor explains → state moves to `explain`
  - User responds → state moves to `user_explain`
  - Evaluation complete → Coach decides next step
  - Session can be paused and resumed

---

### LEARN-02: Tutor AI Implementation

- **Task ID**: `LEARN-02`
- **Objective**: Implement Tutor role for concept explanation
- **Requirements**:
  - Explain concepts in simple language
  - Avoid jargon unless necessary
  - Use examples from content
  - Ask one follow-up question per explanation
  - Do not evaluate or judge user
- **Dependencies**: `AI-02`, `AI-03`
- **Deliverables**:
  - `backend/src/ai/roles/tutor.service.ts`
  - Updated prompt template: `prompts/tutor/v1.txt`
- **Acceptance Criteria**:
  - Request explanation → receives clear response
  - Response includes at least one example
  - Response ends with one follow-up question
  - Response does not include evaluation language

---

### LEARN-03: Examiner AI Implementation

- **Task ID**: `LEARN-03`
- **Objective**: Implement Examiner role for understanding evaluation
- **Requirements**:
  - Ask open-ended questions
  - Request user explanations in their own words
  - Evaluate explanation quality (not correctness)
  - Output structured result:
    - `confidence`: float 0-1
    - `feedback`: string
    - `gaps`: array of identified gaps
  - Do not teach or encourage
- **Dependencies**: `AI-02`, `AI-03`
- **Deliverables**:
  - `backend/src/ai/roles/examiner.service.ts`
  - Updated prompt template: `prompts/examiner/v1.txt`
- **Acceptance Criteria**:
  - User explains concept → receives evaluation
  - Evaluation has confidence, feedback, gaps
  - Confidence score correlates with explanation quality
  - No teaching language in response

---

### LEARN-04: Coach AI Implementation

- **Task ID**: `LEARN-04`
- **Objective**: Implement Coach role for learning guidance
- **Requirements**:
  - Analyze evaluation results
  - Decide next step:
    - `proceed` – Move to next concept
    - `review` – Revisit current concept
    - `practice` – Provide application task
  - Suggest mini application tasks when appropriate
  - Encourage reflection without hand-holding
- **Dependencies**: `LEARN-03`
- **Deliverables**:
  - `backend/src/ai/roles/coach.service.ts`
  - Updated prompt template: `prompts/coach/v1.txt`
- **Acceptance Criteria**:
  - High confidence → Coach suggests proceed
  - Low confidence → Coach suggests review
  - Medium confidence → Coach provides practice task
  - Decision is justified in response

---

### LEARN-05: Learning Session UI

- **Task ID**: `LEARN-05`
- **Objective**: Create learning session page with chat, content, and notes
- **Requirements**:
  - Three-column layout:
    - Left: Content panel (current concept)
    - Center: Chat interface with AI
    - Right: User notes panel
  - Real-time chat with AI roles
  - Progress indicator showing concepts completed
  - Note-taking with auto-save
  - Session controls (pause, resume, end)
- **Dependencies**: `LEARN-01`, `AUTH-02`
- **Deliverables**:
  - `frontend/src/app/learn/[id]/page.tsx`
  - `frontend/src/components/learn/ContentPanel.tsx`
  - `frontend/src/components/learn/ChatInterface.tsx`
  - `frontend/src/components/learn/NotesPanel.tsx`
  - `frontend/src/components/learn/ProgressBar.tsx`
- **Acceptance Criteria**:
  - Page loads with three panels
  - Send message → receive AI response
  - Type note → auto-saved after 2 seconds
  - Progress bar updates as concepts complete
  - Session can be paused and resumed

---

### LEARN-06: User Notes & Feedback Storage

- **Task ID**: `LEARN-06`
- **Objective**: Implement user notes storage with AI feedback
- **Requirements**:
  - Save user notes per concept
  - Generate AI feedback on notes quality
  - Store feedback alongside notes
  - Support note history/versioning
  - Enable notes search across concepts
- **Dependencies**: `LEARN-05`, `DB-01`
- **Deliverables**:
  - `backend/src/notes/notes.service.ts`
  - `backend/src/notes/notes.controller.ts`
  - API routes: `POST /notes`, `GET /notes/:conceptId`, `PUT /notes/:id`
- **Acceptance Criteria**:
  - Save note → stored in database
  - Save note → AI feedback generated
  - Retrieve notes → includes feedback
  - Search notes → returns matching results

---

## Phase 5: Evaluation & Adaptation

### EVAL-01: Progress Tracking System

- **Task ID**: `EVAL-01`
- **Objective**: Implement comprehensive learning progress tracking
- **Requirements**:
  - Track per-concept progress:
    - Started/completed status
    - Time spent
    - Confidence score history
    - Gaps identified
  - Track overall content progress:
    - Concepts completed / total
    - Average confidence
    - Weak areas
  - Store progress snapshots for trends
- **Dependencies**: `LEARN-01`, `LEARN-03`
- **Deliverables**:
  - `backend/src/progress/progress.service.ts`
  - `backend/src/progress/progress.controller.ts`
  - API routes: `GET /progress/:contentId`, `GET /progress/summary`
- **Acceptance Criteria**:
  - Complete concept → progress updated
  - Progress shows time spent
  - Confidence history available
  - Summary shows weak areas

---

### EVAL-02: Personalization Engine

- **Task ID**: `EVAL-02`
- **Objective**: Implement adaptive learning based on user performance
- **Requirements**:
  - Analyze user performance patterns:
    - Repeated mistakes
    - Time per concept
    - Explanation quality trends
  - Adapt learning experience:
    - Slower pacing for struggling concepts
    - More examples when confused
    - Skip mastered content
    - Revisit weak concepts automatically
  - Store adaptation decisions for review
- **Dependencies**: `EVAL-01`, `LEARN-04`
- **Deliverables**:
  - `backend/src/personalization/adaptation.service.ts`
  - `backend/src/personalization/pattern.analyzer.ts`
  - Configuration for adaptation rules
- **Acceptance Criteria**:
  - Low confidence concepts → slower pacing applied
  - High confidence concepts → skipping available
  - Repeated mistakes → automatic review scheduled
  - Adaptation log shows all decisions

---

### EVAL-03: Reviewer AI Implementation

- **Task ID**: `EVAL-03`
- **Objective**: Implement Reviewer role for learning summaries
- **Requirements**:
  - Summarize what user learned per session
  - Highlight weak points across content
  - Suggest review schedule (spaced repetition)
  - Generate weekly learning reports
  - Do not teach, only reflect
- **Dependencies**: `EVAL-01`, `AI-02`
- **Deliverables**:
  - `backend/src/ai/roles/reviewer.service.ts`
  - `backend/src/review/review.service.ts`
  - Updated prompt template: `prompts/reviewer/v1.txt`
  - API route: `GET /review/summary`, `GET /review/weekly`
- **Acceptance Criteria**:
  - Session complete → summary generated
  - Summary highlights weak areas
  - Review schedule suggested based on performance
  - Weekly report aggregates multiple sessions

---

### EVAL-04: Dashboard & Analytics UI

- **Task ID**: `EVAL-04`
- **Objective**: Create user dashboard with progress and analytics
- **Requirements**:
  - Content library with status indicators
  - Per-content progress visualization
  - Confidence trend charts
  - Weak areas highlight
  - Review schedule calendar
  - Quick actions (resume, review, start new)
- **Dependencies**: `EVAL-01`, `AUTH-02`
- **Deliverables**:
  - `frontend/src/app/dashboard/page.tsx`
  - `frontend/src/components/dashboard/ContentCard.tsx`
  - `frontend/src/components/dashboard/ProgressChart.tsx`
  - `frontend/src/components/dashboard/WeakAreasPanel.tsx`
  - `frontend/src/components/dashboard/ReviewCalendar.tsx`
- **Acceptance Criteria**:
  - Dashboard shows all user content
  - Progress displayed per content
  - Charts render without errors
  - Clicking content → navigates to learning session

---

## Phase 6: Polish & Production

### PROD-01: Prompt Versioning & Evaluation

- **Task ID**: `PROD-01`
- **Objective**: Implement prompt tracking and evaluation system
- **Requirements**:
  - Log prompt_id and version with every AI interaction
  - Enable A/B testing between prompt versions
  - Calculate metrics per prompt version:
    - Average confidence improvement
    - Confusion rate
    - User satisfaction (if collected)
  - Build comparison dashboard
- **Dependencies**: `AI-01`, `EVAL-01`
- **Deliverables**:
  - `backend/src/ai/prompt-tracking.service.ts`
  - `backend/src/analytics/prompt-analytics.service.ts`
  - API routes: `GET /analytics/prompts`, `GET /analytics/prompts/:id`
- **Acceptance Criteria**:
  - Every interaction logged with prompt version
  - Metrics calculated per prompt
  - Comparison between versions available
  - Dashboard shows prompt performance

---

### PROD-02: Security & Rate Limiting

- **Task ID**: `PROD-02`
- **Objective**: Implement security measures and rate limiting
- **Requirements**:
  - Input validation on all endpoints (Zod or Joi)
  - File upload validation (type, size, content)
  - API rate limiting per user (Redis-based)
  - AI usage limits per user tier
  - Audit logging for sensitive actions
  - XSS and CSRF protection on frontend
- **Dependencies**: `AUTH-01`, `SETUP-04`
- **Deliverables**:
  - `backend/src/middleware/validation.middleware.ts`
  - `backend/src/middleware/rate-limit.middleware.ts`
  - `backend/src/middleware/audit.middleware.ts`
  - Security configuration documentation
- **Acceptance Criteria**:
  - Invalid input → returns 400 with details
  - Exceed rate limit → returns 429
  - Exceed AI limit → returns appropriate error
  - Audit log captures auth events

---

### PROD-03: Error Handling & Logging

- **Task ID**: `PROD-03`
- **Objective**: Implement comprehensive error handling and logging
- **Requirements**:
  - Global error handler for backend
  - Structured logging (JSON format)
  - Log levels (debug, info, warn, error)
  - Request ID tracking across services
  - Error reporting integration (Sentry or similar)
  - Frontend error boundary components
- **Dependencies**: `SETUP-02`, `SETUP-03`
- **Deliverables**:
  - `backend/src/middleware/error.handler.ts`
  - `backend/src/utils/logger.ts`
  - `frontend/src/components/ErrorBoundary.tsx`
  - Error reporting configuration
- **Acceptance Criteria**:
  - Unhandled exception → caught and logged
  - Logs include request ID
  - Frontend error → displays fallback UI
  - Errors reported to external service

---

### PROD-04: Testing Setup

- **Task ID**: `PROD-04`
- **Objective**: Set up testing infrastructure for backend and frontend
- **Requirements**:
  - Backend unit tests (Vitest or Jest)
  - Backend integration tests with test database
  - Frontend component tests (React Testing Library)
  - E2E tests (Playwright or Cypress)
  - CI pipeline configuration
  - Test coverage reporting
- **Dependencies**: All previous tasks
- **Deliverables**:
  - `backend/tests/` directory with tests
  - `frontend/__tests__/` directory with tests
  - `e2e/` directory with E2E tests
  - `.github/workflows/test.yml`
  - Coverage configuration
- **Acceptance Criteria**:
  - Run `npm test` → all tests pass
  - Coverage report generated
  - CI pipeline runs on PR
  - E2E tests cover core user flows

---

### PROD-05: Deployment Configuration

- **Task ID**: `PROD-05`
- **Objective**: Prepare application for production deployment
- **Requirements**:
  - Production Docker configuration
  - Environment variable documentation
  - Database migration strategy
  - Secrets management approach
  - Health check endpoints
  - Deployment documentation (Railway, Vercel, or AWS)
- **Dependencies**: All previous tasks
- **Deliverables**:
  - `Dockerfile` (production optimized)
  - `docker-compose.prod.yml`
  - `DEPLOYMENT.md` documentation
  - Health check endpoints
- **Acceptance Criteria**:
  - Production build completes without errors
  - Docker image size < 500MB
  - Health checks pass
  - Documentation covers full deployment

---

### PROD-06: Performance Optimization

- **Task ID**: `PROD-06`
- **Objective**: Optimize application performance
- **Requirements**:
  - Backend:
    - Database query optimization
    - Response caching (Redis)
    - Async AI calls with queuing
    - Connection pooling
  - Frontend:
    - Code splitting
    - Image optimization
    - API response caching
    - Progressive loading
- **Dependencies**: All previous tasks
- **Deliverables**:
  - Optimized database queries
  - Caching layer implementation
  - Performance monitoring setup
  - LCP, FID, CLS metrics baseline
- **Acceptance Criteria**:
  - API response time < 200ms (95th percentile)
  - Frontend LCP < 2.5s
  - Database queries use indexes
  - AI calls don't block user interactions

---

## Implementation Order Summary

```
Phase 1: Project Setup (SETUP-01 → SETUP-04)
         │
Phase 2: Core Systems (DB-01 → CONTENT-04)
         │
Phase 3: AI Integration (AI-01 → AI-04)
         │
Phase 4: Learning Workflow (LEARN-01 → LEARN-06)
         │
Phase 5: Evaluation (EVAL-01 → EVAL-04)
         │
Phase 6: Content Sharing & Monetization (SHARE-01 → SUB-02)
         │
Phase 7: Production (PROD-01 → PROD-06)
```

---

## Phase 7: Content Sharing & Monetization

> Enable content sharing, sales, donations, subscriptions, and bundles.

---

### SHARE-01: Content Visibility System

- **Task ID**: `SHARE-01`
- **Objective**: Implement content visibility and access control
- **Requirements**:
  - Add visibility column to contents table (private, shared, public, paid)
  - Create content_access table for fine-grained permissions
  - Implement access check middleware
  - Update all content queries to filter by user access
  - Platform content flag for admin-uploaded materials
- **Dependencies**: `DB-01`, `AUTH-01`
- **Deliverables**:
  - Database migrations for new columns and tables
  - `backend/src/content/access.service.ts`
  - `backend/src/middleware/content-access.middleware.ts`
  - Updated content repository with access filtering
- **Acceptance Criteria**:
  - Private content only visible to owner
  - Shared content visible to invited users only
  - Public content visible to all authenticated users
  - Paid content requires purchase or subscription
  - Platform content accessible to all users

---

### SHARE-02: Content Sharing (Invite Users)

- **Task ID**: `SHARE-02`
- **Objective**: Allow users to share content with specific people
- **Requirements**:
  - Share button on content detail page
  - Email invitation system (send invite link)
  - Share link with expiring access code
  - "Shared with Me" section in user library
  - Revoke access functionality
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `backend/src/content/share.service.ts`
  - `frontend/src/components/share/ShareModal.tsx`
  - `backend/src/email/templates/content-invite.html`
  - Shared content library page
- **Acceptance Criteria**:
  - Can invite users by email → they receive link
  - Share link works with code → grants temporary access
  - Shared content appears in recipient's library
  - Owner can see who has access and revoke

---

### MONEY-01: Lemon Squeezy Integration (Sales)

- **Task ID**: `MONEY-01`
- **Objective**: Integrate Lemon Squeezy for content sales
- **Requirements**:
  - Configure Lemon Squeezy store and API
  - Dynamic checkout URL generation per content
  - Webhook handling for purchases
  - Store purchase records in database
  - Grant content access on successful purchase
  - Platform commission calculation (10-20%)
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `backend/src/payment/lemon-squeezy.service.ts`
  - `backend/src/webhook/lemon-squeezy.controller.ts`
  - `backend/src/payment/purchase.service.ts`
  - Purchase success/failure pages
- **Acceptance Criteria**:
  - Click "Buy" → redirect to Lemon Squeezy checkout
  - Complete purchase → webhook triggers access grant
  - Buyer sees content in "Purchased" library
  - Seller sees sale in creator dashboard
  - Platform fee calculated correctly

---

### MONEY-02: Multi-Method Donation System

- **Task ID**: `MONEY-02`
- **Objective**: Implement donations with Paddle, ABA KHQR, and PayPal
- **Requirements**:
  - **Paddle:** Checkout for international card donations
  - **ABA KHQR:** Creator uploads QR image, displayed to donors
  - **PayPal:** Creator enters PayPal.me link
  - Creator settings page to enable/configure each method
  - Paddle webhook for automatic tracking
  - ABA/PayPal: display-only (no tracking required)
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `backend/src/payment/paddle.service.ts`
  - `backend/src/webhook/paddle.controller.ts`
  - `backend/src/donation/donation.service.ts`
  - `backend/src/creator/payment-settings.service.ts`
  - `frontend/src/components/donate/DonateModal.tsx`
  - `frontend/src/app/creator/payment-settings/page.tsx`
- **Acceptance Criteria**:
  - Creator enables/disables each donation method
  - Creator uploads ABA KHQR image successfully
  - Donation modal shows all enabled methods
  - Paddle donations tracked automatically
  - ABA/PayPal display QR code or link correctly

---

### MONEY-03: Creator Dashboard

- **Task ID**: `MONEY-03`
- **Objective**: Build creator earnings and analytics dashboard
- **Requirements**:
  - Earnings summary (sales + donations + subscription share)
  - Content performance table (views, sales, rating)
  - Payout request system (min $10)
  - Payout history and status tracking
  - Payment method configuration
- **Dependencies**: `MONEY-01`, `MONEY-02`
- **Deliverables**:
  - `frontend/src/app/creator/page.tsx`
  - `frontend/src/app/creator/payouts/page.tsx`
  - `backend/src/creator/analytics.service.ts`
  - `backend/src/payout/payout.service.ts`
- **Acceptance Criteria**:
  - Dashboard shows total earnings breakdown
  - Content performance table displays correctly
  - Can request payout when balance ≥ $10
  - Payout history shows all requests and statuses

---

### PLATFORM-01: Platform Content Library

- **Task ID**: `PLATFORM-01`
- **Objective**: Enable admin to upload free platform content
- **Requirements**:
  - Admin-only upload with platform content flag
  - Platform Library section on discover page
  - Featured content carousel
  - Category organization for discovery
  - Special "Platform" badge on content cards
- **Dependencies**: `SHARE-01`, Admin authentication
- **Deliverables**:
  - Admin content upload interface
  - `backend/src/content/platform.service.ts`
  - Platform library API endpoint
  - Frontend platform library section
- **Acceptance Criteria**:
  - Admin can upload content as platform content
  - Platform content has distinct badge/styling
  - Platform Library section visible on discover page
  - All users can access platform content for free

---

### DISCOVER-01: Content Discovery Page

- **Task ID**: `DISCOVER-01`
- **Objective**: Build public content discovery page
- **Requirements**:
  - Search by title, description, category
  - Filter by: free, paid, platform, category
  - Sort by: popular, new, rating, price
  - Content cards with cover, title, author, price, rating
  - Pagination or infinite scroll
- **Dependencies**: `SHARE-01`
- **Deliverables**:
  - `frontend/src/app/discover/page.tsx`
  - `backend/src/content/discover.service.ts`
  - Search API with filters and pagination
  - Content card component
- **Acceptance Criteria**:
  - Can browse all public content
  - Search returns relevant results
  - Filters work correctly
  - Content cards display all required info

---

### SUB-01: Subscription System

- **Task ID**: `SUB-01`
- **Objective**: Implement all-access subscription with engagement tracking
- **Requirements**:
  - Subscription checkout via Lemon Squeezy or Paddle
  - Plans: Monthly ($9.99), Yearly ($79.99)
  - Subscriber access to all public content
  - Engagement tracking (time spent, sessions, concepts)
  - Monthly revenue calculation and pool distribution
  - Revenue sharing: 70% creators, 30% platform
- **Dependencies**: `SHARE-01`, `MONEY-01`
- **Deliverables**:
  - `backend/src/subscription/subscription.service.ts`
  - `backend/src/subscription/engagement.tracker.ts`
  - `backend/src/subscription/revenue.calculator.ts`
  - `frontend/src/app/subscribe/page.tsx`
  - Subscription management in user settings
- **Acceptance Criteria**:
  - User can subscribe to monthly or yearly plan
  - Subscriber accesses all public content
  - Engagement tracked per content per month
  - Monthly creator payouts calculated by engagement
  - Creator dashboard shows subscription revenue share

---

### SUB-02: Bundle System

- **Task ID**: `SUB-02`
- **Objective**: Implement content bundles with discounted pricing
- **Requirements**:
  - Creator can create bundles from their content
  - Bundle price with 20-50% discount (enforced)
  - Bundle purchase grants access to all included content
  - Multi-creator bundles (platform-curated)
  - Revenue split proportional for multi-creator
- **Dependencies**: `SHARE-01`, `MONEY-01`
- **Deliverables**:
  - `backend/src/bundle/bundle.service.ts`
  - `frontend/src/app/creator/bundles/page.tsx`
  - `frontend/src/app/bundle/[id]/page.tsx`
  - Bundle cards on discover page
  - Bundle checkout flow
- **Acceptance Criteria**:
  - Creator creates bundle with selected books
  - Discount enforced (20-50% off sum of individual prices)
  - Bundle purchase unlocks all contents
  - Multi-creator bundle revenue splits correctly
  - Bundles appear on discover page

---

## Phase 8: Production Readiness

> Rename previous Phase 6 tasks to Phase 8 for production deployment.

_Note: The PROD-01 through PROD-06 tasks remain unchanged but are now Phase 8._

---

## Verification Plan

### Automated Tests

- **Unit Tests**: Run `npm test` in both `backend/` and `frontend/`
- **Integration Tests**: Run `npm run test:integration` with test database
- **E2E Tests**: Run `npx playwright test` for full user flows

### Manual Verification Checkpoints

1. **After Phase 1**: Upload a test PDF, verify server runs, pages load
2. **After Phase 3**: Test learning map generation with sample content
3. **After Phase 4**: Complete full learning session flow
4. **After Phase 5**: Verify progress tracking and dashboard
5. **After Phase 6**: Load testing and security audit

---

## Notes

- Start each phase only after the previous phase is complete
- Test locally before moving to next task
- Log all AI interactions for debugging
- Maintain prompt versions carefully
- Review AI outputs manually during development

---

_Generated for Learning OS project. Follow `GET_STARTED.md` for daily workflow
guidance._
