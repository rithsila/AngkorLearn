# Learning OS – PRD (Product Requirements Document)

## 1. Overview

Learning OS is a personal learning web application designed to help users truly understand learning materials (PDFs, courses, notes) through guided, active, and application-based learning.

The system combines structured learning workflows with AI guidance to move users from passive consumption to real understanding and skill application.

---

## 2. Problem Statement

Most learning platforms focus on content delivery and completion tracking, not understanding.

Users:

- Read books but forget them
- Finish courses but can’t apply knowledge
- Lack a clear learning path
- Don’t know what they don’t understand

This product solves that by enforcing:

- Active recall
- Explanation in the user’s own words
- Layered learning
- Practical application

---

## 3. Goals

### Primary Goals

- Help users deeply understand any learning material
- Convert learning into usable skills
- Provide AI-guided learning paths and feedback

### Non-Goals

- Replacing formal education
- Certification or grading systems
- Social learning or community features (v1)

---

## 4. Target Users

- Self-learners
- Engineers
- Founders
- Traders
- Technical learners using books or courses
- Users learning independently without mentors

---

## 5. Core User Flow

1. User uploads a PDF or learning content
2. System analyzes and segments content
3. AI generates a learning map and milestones
4. User starts a learning session
5. AI guides the session:
   - Explains concepts
   - Asks understanding questions
   - Requests user explanations
6. User completes a mini application task
7. System stores learning progress and gaps
8. Next session adapts based on past performance

---

## 6. Core Features (MVP)

### 6.1 Content Ingestion

- Upload PDF
- Extract text
- Segment by chapters or logical sections
- Store raw and cleaned content

### 6.2 Learning Map Generator

AI generates:

- Big-picture overview
- Key concepts per chapter
- Suggested learning order
- Difficulty level per section

Output stored as structured data.

---

### 6.3 AI Learning Guide

AI acts as a tutor, not a chatbot.

Responsibilities:

- Explain concepts in simple language
- Ask follow-up questions
- Prompt user to explain concepts
- Detect confusion or weak understanding
- Suggest when to move forward or review

---

### 6.4 Active Recall & Understanding Checks

- Open-ended questions
- “Explain in your own words”
- Scenario-based questions
- Comparison questions
- “What happens if…” prompts

AI evaluates responses qualitatively.

---

### 6.5 Notes & Explanation Storage

- User-written explanations saved per concept
- AI feedback stored alongside notes
- Notes used for future review and personalization

---

### 6.6 Learning Progress Tracking

Track:

- Chapters completed
- Concepts understood
- Concepts needing review
- User confidence level (AI-estimated)

---

## 7. AI Roles & Responsibilities

Use multiple AI roles instead of one generic assistant.

### 7.1 Planner

- Generates learning maps
- Defines milestones
- Sets learning order

### 7.2 Tutor

- Explains concepts
- Answers questions
- Adjusts explanation depth

### 7.3 Examiner

- Tests understanding
- Evaluates explanations
- Identifies gaps

### 7.4 Coach

- Suggests next steps
- Recommends review or practice
- Encourages application

---

## 8. Personalization Logic

The system adapts based on:

- User struggles
- Repeated mistakes
- Time spent per concept
- Quality of explanations

Adaptations:

- Slower pacing
- More examples
- Revisiting weak concepts
- Skipping mastered content

---

## 9. Technical Architecture (High-Level)

### Frontend

- Next.js
- Learning session UI
- Chat + content + notes view

### Backend

- Node.js (Fastify or NestJS)
- PostgreSQL (core data)
- Redis (sessions, caching)
- Vector DB (pgvector or Qdrant)

### AI

- LLM for tutoring and evaluation
- Embeddings for content retrieval (RAG)
- Prompt templates per AI role

---

## 10. Data Models (Simplified)

### User

- id
- email
- preferences
- learning_history

### Content

- id
- type (PDF, text)
- raw_text
- structured_sections

### LearningMap

- content_id
- concepts
- order
- difficulty

### LearningSession

- user_id
- concept_id
- interactions
- evaluation_result

---

## 11. Success Metrics

- User can explain concepts without notes
- User completes application tasks
- Reduced re-reading of same content
- Increased retention over time
- User builds something using learned material

---

## 12. Future Enhancements (Post-MVP)

- Multi-course knowledge graph
- Project portfolio generation
- Skill gap analysis
- Weekly AI learning plans
- Team or company learning modes
- Agent-based learning orchestration

---

## 13. Guiding Principles

- Understanding over completion
- Explanation over memorization
- Application over theory
- Depth over speed
- Learning as a system, not content

---
