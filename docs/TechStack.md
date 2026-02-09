# Learning OS – Tech Stack & Architecture

> Complete technology stack and deployment architecture for Learning OS.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│                                                                          │
│     Web Browser          Mobile Browser          Desktop App (Future)   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vercel)                                │
│                                                                          │
│     Next.js 14+ (App Router)  •  TypeScript  •  Tailwind CSS            │
│     Zustand  •  TanStack Query  •  Framer Motion                        │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Railway)                                │
│                                                                          │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────────────┐  │
│  │   Fastify API   │  │   BullMQ Jobs   │  │   Webhook Handlers      │  │
│  │   (Node.js)     │  │   (Background)  │  │   (Payments)            │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────┐ ┌─────────────────┐ ┌─────────────────────────────┐
│  PostgreSQL         │ │  Redis          │ │  Qdrant                     │
│  (Railway)          │ │  (Railway)      │ │  (Qdrant Cloud)             │
│                     │ │                 │ │                             │
│  • Users            │ │  • Sessions     │ │  • Content Embeddings       │
│  • Content          │ │  • Job Queue    │ │  • Semantic Search          │
│  • Purchases        │ │  • Rate Limits  │ │  • RAG Context              │
│  • Subscriptions    │ │  • Caching      │ │                             │
└─────────────────────┘ └─────────────────┘ └─────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         AI PROVIDERS                                     │
│                                                                          │
│     ┌─────────────────────────┐     ┌─────────────────────────────────┐ │
│     │       OpenAI            │     │         DeepSeek                │ │
│     │  • Planner (GPT-4o)     │     │  • Tutor (V3)                   │ │
│     │  • Examiner (GPT-4o)    │     │  • Coach (V3)                   │ │
│     │  • Reviewer (GPT-4o)    │     │                                 │ │
│     │  • Embeddings           │     │                                 │ │
│     └─────────────────────────┘     └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                                   │
│                                                                          │
│   Lemon Squeezy     Paddle          File Storage     Email              │
│   (Sales)           (Donations)     (S3/Cloudflare)  (Resend)           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Technology Stack

### Frontend

| Technology          | Version | Purpose                         |
| ------------------- | ------- | ------------------------------- |
| **Next.js**         | 14+     | React framework with App Router |
| **TypeScript**      | 5.x     | Type safety                     |
| **Tailwind CSS**    | 3.x     | Utility-first styling           |
| **Zustand**         | 4.x     | Lightweight global state        |
| **TanStack Query**  | 5.x     | Server state & caching          |
| **React Hook Form** | 7.x     | Form handling                   |
| **Zod**             | 3.x     | Schema validation               |
| **Recharts**        | 2.x     | Dashboard charts                |
| **Framer Motion**   | 10.x    | Animations                      |

**Design System:** See [VisualLayoutPage.md](./VisualLayoutPage.md)

---

### Backend

| Technology     | Version | Purpose                            |
| -------------- | ------- | ---------------------------------- |
| **Fastify**    | 4.x     | High-performance Node.js framework |
| **TypeScript** | 5.x     | Type safety                        |
| **Prisma**     | 5.x     | Database ORM                       |
| **BullMQ**     | 4.x     | Background job processing          |
| **Zod**        | 3.x     | Input validation                   |
| **Pino**       | 8.x     | Structured JSON logging            |
| **JWT**        | -       | Authentication                     |
| **bcrypt**     | -       | Password hashing                   |

---

### Databases

| Database       | Deployment   | Purpose                      |
| -------------- | ------------ | ---------------------------- |
| **PostgreSQL** | Railway      | Primary data store           |
| **Redis**      | Railway      | Caching, sessions, job queue |
| **Qdrant**     | Qdrant Cloud | Vector embeddings for RAG    |

**Database Schema:** See [Database Schema.md](./Database%20Schema.md)

---

### AI / LLM Strategy

#### Dual Provider Approach

```typescript
// backend/src/ai/llm.config.ts
export const LLM_ROUTING = {
    // Structured output & evaluation → OpenAI
    planner: { provider: "openai", model: "gpt-4o" },
    examiner: { provider: "openai", model: "gpt-4o" },
    reviewer: { provider: "openai", model: "gpt-4o" },

    // Conversational & high-volume → DeepSeek
    tutor: { provider: "deepseek", model: "deepseek-chat" },
    coach: { provider: "deepseek", model: "deepseek-chat" },
};
```

#### Cost Comparison

| Provider      | Input           | Output          | Use Case          |
| ------------- | --------------- | --------------- | ----------------- |
| OpenAI GPT-4o | $5/1M tokens    | $15/1M tokens   | Structured output |
| DeepSeek V3   | $0.27/1M tokens | $1.10/1M tokens | Conversational    |

**Estimated 70% cost reduction** by routing Tutor/Coach to DeepSeek.

#### Embeddings

| Provider | Model                  | Dimensions | Cost            |
| -------- | ---------------------- | ---------- | --------------- |
| OpenAI   | text-embedding-3-small | 1536       | $0.02/1M tokens |

---

### Payment Providers

| Purpose           | Provider      | Features                            |
| ----------------- | ------------- | ----------------------------------- |
| **Sales**         | Lemon Squeezy | MoR, global taxes, Cambodia payouts |
| **Donations**     | Paddle        | International cards                 |
| **Donations**     | ABA KHQR      | Cambodia local (free)               |
| **Donations**     | PayPal        | Global alternative                  |
| **Subscriptions** | Lemon Squeezy | Recurring billing                   |

#### Lemon Squeezy Cambodia Support ✅

- Bank transfer payouts to Cambodia
- 1% international payout fee
- Processes in USD, displays in KHR
- Handles all tax compliance

---

## Deployment Architecture

### Development Environment

```yaml
# docker-compose.yml
services:
    postgres:
        image: postgres:16-alpine
        ports:
            - "5432:5432"
        environment:
            POSTGRES_DB: learningos
            POSTGRES_USER: dev
            POSTGRES_PASSWORD: dev
        volumes:
            - postgres_data:/var/lib/postgresql/data

    redis:
        image: redis:7-alpine
        ports:
            - "6379:6379"

    qdrant:
        image: qdrant/qdrant:latest
        ports:
            - "6333:6333"
        volumes:
            - qdrant_data:/qdrant/storage

volumes:
    postgres_data:
    qdrant_data:
```

### Production Environment (Railway)

| Service           | Railway Config     | Estimated Cost     |
| ----------------- | ------------------ | ------------------ |
| **Fastify API**   | 1 vCPU, 2GB RAM    | ~$15/mo            |
| **PostgreSQL**    | Railway PostgreSQL | ~$7/mo             |
| **Redis**         | Railway Redis      | ~$5/mo             |
| **BullMQ Worker** | 0.5 vCPU, 1GB RAM  | ~$8/mo             |
| **Qdrant**        | Qdrant Cloud (1GB) | Free tier / $25/mo |

**Total Railway estimate: ~$35-60/month**

### Frontend Deployment (Vercel)

| Feature             | Plan                                |
| ------------------- | ----------------------------------- |
| **Hosting**         | Vercel Pro ($20/mo) or Hobby (Free) |
| **Edge Functions**  | Included                            |
| **Analytics**       | Included                            |
| **Preview Deploys** | Automatic                           |

---

## Environment Variables

### Backend (.env)

```env
# Server
NODE_ENV=production
PORT=3000
API_URL=https://api.learningos.app

# Database
DATABASE_URL=postgresql://user:pass@host:5432/learningos

# Redis
REDIS_URL=redis://default:pass@host:6379

# Qdrant
QDRANT_URL=https://xxx.qdrant.cloud:6333
QDRANT_API_KEY=your_qdrant_api_key

# AI Providers
OPENAI_API_KEY=sk-xxx
DEEPSEEK_API_KEY=sk-xxx

# Authentication
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_EXPIRES_IN=7d

# Payments
LEMON_SQUEEZY_API_KEY=xxx
LEMON_SQUEEZY_STORE_ID=xxx
LEMON_SQUEEZY_WEBHOOK_SECRET=xxx
PADDLE_API_KEY=xxx
PADDLE_WEBHOOK_SECRET=xxx

# File Storage
S3_BUCKET=learningos-files
S3_REGION=auto
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_ENDPOINT=https://xxx.r2.cloudflarestorage.com

# Email
RESEND_API_KEY=re_xxx
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=https://api.learningos.app
NEXT_PUBLIC_APP_URL=https://learningos.app
```

---

## File Storage Options

| Provider             | Pros                  | Cons              | Cost               |
| -------------------- | --------------------- | ----------------- | ------------------ |
| **Cloudflare R2** ✅ | No egress fees, fast  | Smaller ecosystem | $0.015/GB stored   |
| **AWS S3**           | Mature, many features | Egress fees       | $0.023/GB + egress |
| **Backblaze B2**     | Cheap                 | Slower            | $0.005/GB stored   |

**Recommendation:** Cloudflare R2 for cost efficiency and no egress fees.

---

## Monitoring & Observability

| Tool                | Purpose           | Cost      |
| ------------------- | ----------------- | --------- |
| **Railway Metrics** | Basic CPU/Memory  | Included  |
| **Sentry**          | Error tracking    | Free tier |
| **Axiom**           | Log aggregation   | Free tier |
| **UptimeRobot**     | Uptime monitoring | Free      |

---

## Security Checklist

- [ ] HTTPS everywhere (Vercel + Railway auto-TLS)
- [ ] JWT with short expiry + refresh tokens
- [ ] Rate limiting (Redis-based)
- [ ] Input validation (Zod on all endpoints)
- [ ] SQL injection prevention (Prisma parameterized queries)
- [ ] XSS prevention (React auto-escaping)
- [ ] CORS configuration
- [ ] Webhook signature verification
- [ ] Environment variable encryption
- [ ] Database connection encryption (SSL)

---

## Scaling Strategy

### Phase 1: Launch (0-1,000 users)

- Single Railway Fastify instance
- PostgreSQL with read replicas (Railway)
- Qdrant Cloud free tier
- Estimated: $50-80/month

### Phase 2: Growth (1,000-10,000 users)

- Horizontal Fastify scaling (2-3 instances)
- PostgreSQL scaling
- Qdrant Cloud paid tier
- CDN for static assets
- Estimated: $150-300/month

### Phase 3: Scale (10,000+ users)

- Auto-scaling on Railway
- Database sharding or managed RDS
- Dedicated Qdrant cluster
- Multi-region deployment
- Estimated: $500+/month

---

## Development Workflow

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Local     │───▶│   Staging   │───▶│ Production  │
│   Dev       │    │   (Railway) │    │  (Railway)  │
└─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │
      ▼                   ▼                  ▼
   Docker            PR Preview           Main Branch
   Compose           Auto-deploy          Auto-deploy
```

### Git Branching

```
main (production)
  └── staging
        └── feature/xxx
        └── fix/xxx
```

---

## Quick Start Commands

```bash
# Clone and install
git clone https://github.com/your-org/learning-os.git
cd learning-os
pnpm install

# Start development databases
docker-compose up -d

# Run database migrations
cd backend && pnpm prisma migrate dev

# Start backend
cd backend && pnpm dev

# Start frontend (new terminal)
cd frontend && pnpm dev
```

---

## Cost Summary (Estimated Monthly)

| Service                | Free Tier     | Production    |
| ---------------------- | ------------- | ------------- |
| Railway (Backend + DB) | $5 credit     | $35-60        |
| Vercel (Frontend)      | Free          | $20           |
| Qdrant Cloud           | 1GB free      | $25           |
| Cloudflare R2          | 10GB free     | $5            |
| OpenAI API             | -             | $30-100       |
| DeepSeek API           | -             | $10-30        |
| Lemon Squeezy          | Free          | 5% + $0.50/tx |
| Resend (Email)         | 3,000/mo free | $20           |
| **Total**              | ~$5           | **$150-260**  |

---

## Key Documents

| Document                                               | Purpose                 |
| ------------------------------------------------------ | ----------------------- |
| [ImplementPlan.md](./ImplementPlan.md)                 | 41 implementation tasks |
| [Database Schema.md](./Database%20Schema.md)           | 18 database tables      |
| [VisualLayoutPage.md](./VisualLayoutPage.md)           | 13 page wireframes      |
| [ContentSharingFeature.md](./ContentSharingFeature.md) | Monetization specs      |

---

_Tech Stack & Architecture Guide for Learning OS – Railway + Self-hosted
PostgreSQL_
