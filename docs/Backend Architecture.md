# Backend Architecture – Learning OS

## 1. High-Level Design

Frontend → API Gateway → Services → AI Layer → Database

---

## 2. Services Breakdown

### Auth Service

- User registration
- Login
- JWT handling

---

### Content Service

- PDF upload
- Text extraction
- Chunking
- Embedding generation

---

### Learning Service

- Learning map generation
- Session management
- Progress tracking

---

### AI Orchestrator

- Prompt selection
- Role routing
- Context assembly
- Cost control

---

## 3. Request Flow Example

1. User uploads PDF
2. Content Service extracts text
3. Embeddings stored
4. Planner AI generates learning map
5. User starts session
6. Tutor AI explains concept
7. Examiner evaluates understanding
8. Coach decides next step

---

## 4. AI Context Strategy

- Use RAG per concept
- Limit token scope
- Include:
  - Concept text
  - User notes
  - Past mistakes
- Exclude full documents

---

## 5. Scalability Notes

- Stateless APIs
- Async AI calls
- Background jobs for ingestion
- Caching embeddings
- Rate limiting AI usage

---

## 6. Security Basics

- JWT auth
- Input sanitization
- File upload validation
- API rate limits
- Audit logs

---
