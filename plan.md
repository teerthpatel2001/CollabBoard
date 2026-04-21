# CollabBoard - Production-Grade Trello Clone

## Overview
Building a real-time Kanban project management system with React + Node.js + MongoDB + Redis + Socket.io

## Tech Stack
- **Frontend**: React + Vite + TypeScript + Tailwind CSS + Zustand
- **Backend**: Node.js + Express.js + TypeScript
- **Database**: MongoDB (Mongoose)
- **Cache/Queue**: Redis
- **Real-time**: Socket.io
- **Auth**: JWT
- **DevOps**: Docker + Docker Compose + GitHub Actions CI/CD

## Architecture

### Backend Structure (MVC)
```
backend/
├── src/
│   ├── config/         # Database, Redis config
│   ├── controllers/    # Request handlers
│   ├── models/         # Mongoose schemas
│   ├── routes/         # API routes
│   ├── middleware/     # Auth, validation, error handling
│   ├── services/       # Business logic
│   ├── utils/          # Helpers, JWT
│   ├── types/          # TypeScript interfaces
│   ├── validators/     # Joi/Zod schemas
│   └── socket/         # Socket.io handlers
├── tests/
├── Dockerfile
└── package.json
```

### Frontend Structure
```
frontend/
├── src/
│   ├── components/     # Reusable UI
│   ├── pages/          # Route pages
│   ├── stores/         # Zustand stores
│   ├── hooks/          # Custom hooks
│   ├── services/       # API calls
│   ├── types/          # TypeScript
│   ├── utils/          # Helpers
│   └── styles/         # Tailwind config
├── public/
├── Dockerfile
└── package.json
```

## Implementation Steps

### Phase 1: Backend Foundation
1. Setup project structure with TypeScript
2. Configure MongoDB + Mongoose
3. Configure Redis
4. Setup Express server
5. Implement JWT authentication
6. Create error handling middleware
7. Setup input validation

### Phase 2: Backend Models & APIs
1. User model + auth routes
2. Board model + CRUD
3. List model + CRUD
4. Task model + CRUD
5. Activity log model
6. Role-based access middleware
7. Redis caching layer

### Phase 3: Real-time Features
1. Setup Socket.io
2. Board room management
3. Task update events
4. Live cursor tracking

### Phase 4: Frontend
1. Vite + React + TS setup
2. Tailwind + theme config
3. Zustand stores
4. Auth pages
5. Dashboard
6. Board page with drag-drop
7. Dark mode

### Phase 5: DevOps
1. Dockerize backend
2. Dockerize frontend
3. Docker Compose for full stack
4. GitHub Actions CI/CD
5. Deployment guide

## Critical Files

### Backend
- `src/config/database.ts` - MongoDB connection
- `src/config/redis.ts` - Redis client
- `src/models/User.ts` - User schema
- `src/models/Board.ts` - Board schema
- `src/models/List.ts` - List schema
- `src/models/Task.ts` - Task schema
- `src/models/Activity.ts` - Activity log
- `src/controllers/auth.controller.ts`
- `src/controllers/board.controller.ts`
- `src/controllers/task.controller.ts`
- `src/middleware/auth.ts` - JWT verification
- `src/middleware/errorHandler.ts`
- `src/socket/handlers.ts` - Real-time events

### Frontend
- `src/stores/authStore.ts`
- `src/stores/boardStore.ts`
- `src/pages/Login.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Board.tsx`
- `src/components/KanbanBoard.tsx` - Drag-drop
- `src/services/api.ts` - Axios config

### DevOps
- `docker-compose.yml`
- `.github/workflows/ci-cd.yml`
- `backend/Dockerfile`
- `frontend/Dockerfile`

## Verification Steps
1. Run `docker-compose up` - all services start
2. Register/login flow works
3. Create board, list, task
4. Drag-drop between columns
5. Open two browsers - changes sync in real-time
6. Activity logs appear
7. Dark mode toggle works
8. All tests pass
