# AngkorLearn 🇰🇭

AI-powered learning platform for Cambodia - transform any content into
personalized learning experiences.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- Docker & Docker Compose

### Setup

```bash
# Install dependencies
pnpm install

# Start development databases
docker-compose up -d

# Copy environment files
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local

# Run database migrations
cd backend && pnpm prisma:migrate

# Start development servers
cd .. && pnpm dev
```

### Access

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Health**: http://localhost:3001/api/health

## 📁 Project Structure

```
angkorlearn/
├── backend/           # Fastify API (TypeScript)
│   ├── src/config/    # Environment, database, redis, qdrant
│   ├── src/modules/   # auth, content, learning, ai, health
│   └── prisma/        # Database schema (18 tables)
├── frontend/          # Next.js 14 (TypeScript)
│   └── src/app/       # App router pages
├── docs/              # Documentation
├── docker-compose.yml # PostgreSQL, Redis, Qdrant
└── package.json       # Monorepo config
```

## 🛠️ Technology Stack

| Layer        | Technologies                                  |
| ------------ | --------------------------------------------- |
| **Frontend** | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| **Backend**  | Fastify, TypeScript, Prisma, BullMQ           |
| **Database** | PostgreSQL, Redis, Qdrant                     |
| **AI**       | OpenAI (GPT-4o), DeepSeek (V3)                |
| **Payments** | Lemon Squeezy, Paddle                         |

## 📚 Documentation

- [TechStack.md](./docs/TechStack.md) - Architecture & deployment
- [ImplementPlan.md](./docs/ImplementPlan.md) - Implementation tasks
- [Database Schema.md](./docs/Database%20Schema.md) - Data models
- [VisualLayoutPage.md](./docs/VisualLayoutPage.md) - UI wireframes

## 🔧 Development

```bash
pnpm dev              # Run both servers
pnpm --filter backend dev   # Backend only
pnpm --filter frontend dev  # Frontend only
pnpm db:migrate       # Run migrations
pnpm db:studio        # Open Prisma Studio
pnpm docker:up        # Start databases
pnpm docker:down      # Stop databases
```

## 📦 Deployment

- **Backend**: Railway
- **Frontend**: Vercel
- **Database**: Railway PostgreSQL
- **Vector DB**: Qdrant Cloud

## 📄 License

MIT © 2024 AngkorLearn
