# CollabBoard 🚀

A production-grade, real-time collaborative Kanban board application built with the MERN stack (MongoDB, Express, React, Node.js) with TypeScript, Socket.io, and Redis.

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh token rotation
- Role-based access control (Admin, Member)
- Secure password hashing with bcrypt
- Rate limiting on auth endpoints

### 📋 Boards & Tasks
- Create, edit, delete boards
- Custom lists (columns) with drag-and-drop reordering
- Rich task management (title, description, due dates, priority, labels)
- Task assignment to team members
- Checklists within tasks
- File attachments

### ⚡ Real-Time Collaboration
- Live task updates using Socket.io
- Multiple users can collaborate on the same board simultaneously
- Activity logging for all board events

### 🎨 UI/UX
- Modern, responsive design with Tailwind CSS
- Dark mode support
- Smooth drag-and-drop interactions (@dnd-kit)
- Toast notifications
- Loading states and skeletons

### 🚀 Performance & Security
- Redis caching for frequently accessed data
- Request rate limiting
- Input validation with Zod/Joi
- CORS protection
- Helmet security headers
- MongoDB indexing for optimal queries

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS
- **State Management:** Zustand
- **Drag & Drop:** @dnd-kit
- **Real-time:** Socket.io-client
- **HTTP Client:** Axios
- **UI Components:** Headless UI, Heroicons

### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express.js with TypeScript
- **Database:** MongoDB with Mongoose
- **Cache:** Redis
- **Real-time:** Socket.io
- **Auth:** JWT (jsonwebtoken)
- **Validation:** Zod
- **Logging:** Winston

### DevOps
- **Containerization:** Docker & Docker Compose
- **CI/CD:** GitHub Actions
- **Web Server:** Nginx (for production frontend)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose (for containerized setup)
- MongoDB (local or Atlas)
- Redis (local or cloud)

### Option 1: Using Docker (Recommended)

1. Clone the repository:
```bash
git clone https://github.com/teerthpatel2001/CollabBoard.git
cd CollabBoard
```

2. Create environment files:
```bash
cp backend/.env
cp frontend/.env
```

3. Start all services:
```bash
docker-compose up -d
```

4. Access the application:
- Frontend: http://localhost:5174
- Backend API: http://localhost:8000
- MongoDB: localhost:27017
- Redis: localhost:6379

### Option 2: Local Development

#### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env
# Edit .env with your configuration
```

4. Start development server:
```bash
npm run dev
```

The backend will be available at http://localhost:8000

#### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env if needed
```

4. Start development server:
```bash
npm run dev
```

The frontend will be available at http://localhost:5174

## 📁 Project Structure

```
collabboard/
├── backend/
│   ├── src/
│   │   ├── config/          # Database, Redis config
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── socket/          # Socket.io handlers
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Helpers
│   │   ├── validators/      # Zod schemas
│   │   └── index.ts         # Entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/           # Route pages
│   │   ├── stores/          # Zustand stores
│   │   ├── services/        # API services
│   │   ├── types/           # TypeScript types
│   │   ├── styles/          # CSS files
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── Dockerfile
│   └── package.json
├── .github/
│   └── workflows/           # GitHub Actions CI/CD
├── docker-compose.yml
└── README.md
```

## 📚 API Documentation

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| POST | `/api/auth/logout` | Logout user |
| GET | `/api/auth/me` | Get current user |
| PATCH | `/api/auth/profile` | Update profile |
| POST | `/api/auth/refresh-token` | Refresh access token |

### Board Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | Get all boards |
| POST | `/api/boards` | Create board |
| GET | `/api/boards/:id` | Get board by ID |
| PATCH | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| POST | `/api/boards/:id/members` | Add member |
| DELETE | `/api/boards/:id/members/:userId` | Remove member |
| GET | `/api/boards/:id/activity` | Get board activity |

### List Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lists` | Create list |
| PATCH | `/api/lists/:id` | Update list |
| DELETE | `/api/lists/:id` | Delete list |
| POST | `/api/lists/reorder` | Reorder lists |

### Task Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tasks/:id` | Get task |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update task |
| DELETE | `/api/tasks/:id` | Delete task |
| POST | `/api/tasks/move` | Move task |
| POST | `/api/tasks/reorder` | Reorder tasks |


## 🚀 Deployment

### AWS EC2 Deployment

1. Launch an EC2 instance (Ubuntu 22.04 recommended)
2. Install Docker and Docker Compose:
```bash
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu
```

3. Clone the repository and start:
```bash
git clone https://github.com/teerthpatel2001/CollabBoard.git
cd collabboard
docker-compose up -d
```

4. Configure security groups to allow traffic on ports 80 and 8000

### Using CI/CD Pipeline

1. Set up the following GitHub Secrets:
   - `DOCKER_USERNAME`
   - `DOCKER_PASSWORD`
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `EC2_SSH_KEY`
   - `EC2_USER`
   - `EC2_HOST`

2. Push to main branch to trigger deployment


## 🙏 Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/)
- [DND Kit](https://dndkit.com/)
- [Socket.io](https://socket.io/)
- [Zustand](https://github.com/pmndrs/zustand)