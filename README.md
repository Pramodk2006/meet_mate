# MeetMate

AI-powered meeting notes generator that transforms raw meeting transcripts into structured summaries, actionable tasks, and searchable knowledge — with a built-in RAG-based AI chat.

## Features

- **Transcript upload** — paste or upload raw meeting transcripts
- **AI summarisation** — automatic summaries and key decisions extracted via Groq LLMs
- **Task extraction** — action items pulled out with assignee, due date, and priority
- **AI chat** — ask questions about any meeting using a RAG pipeline (Anthropic Claude + vector embeddings)
- **Workspaces** — organize meetings across teams with role-based access
- **My Tasks** — personal task dashboard across all workspaces
- **CSV export** — export tasks from any meeting

## Tech Stack

| Layer           | Technology                                        |
| --------------- | ------------------------------------------------- |
| Frontend        | Next.js 16, React 19, Tailwind CSS v4, TypeScript |
| Backend         | FastAPI (Python 3.11+), SQLAlchemy 2 (async)      |
| Database        | PostgreSQL 15+                                    |
| AI — Extraction | Groq (Llama 3)                                    |
| AI — Chat / RAG | Anthropic Claude + fastembed (local embeddings)   |
| Auth            | JWT (python-jose) + bcrypt                        |

---

## Prerequisites

- **Node.js** >= 18 and **npm** >= 9
- **Python** >= 3.11 and **pip**
- **PostgreSQL** >= 15 running locally (or Docker)
- A **Groq API key** (free tier available at [console.groq.com](https://console.groq.com))
- An **Anthropic API key** ([console.anthropic.com](https://console.anthropic.com))

---

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/meetmate.git
cd meetmate
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in your real values:

```
POSTGRES_PASSWORD=your_postgres_password
SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
GROQ_API_KEY=your_groq_api_key
CLAUDE_API_KEY=your_claude_api_key
```

### 3. Set up the database

Create the PostgreSQL database:

```bash
psql -U postgres -c "CREATE DATABASE meetmate;"
```

Then run the backend setup script to create all tables:

```bash
cd backend
python create_db.py
```

### 4. Install backend dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 5. Start the backend

From the project **root** (so the `backend` package is importable):

```bash
uvicorn backend.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 6. Install frontend dependencies

```bash
cd frontend
npm install
```

### 7. Start the frontend

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`.

---

## Demo credentials

When the backend starts for the first time it seeds demo users automatically:

| Email                | Password      | Role   |
| -------------------- | ------------- | ------ |
| `alice@meetmate.com` | `password123` | Admin  |
| `bob@meetmate.com`   | `password123` | Member |

---

## Project Structure

```
meetmate/
├── backend/
│   ├── api/routers/        # FastAPI route handlers
│   ├── core/config.py      # Pydantic settings (reads from .env)
│   ├── db/                 # SQLAlchemy models & async engine
│   ├── schemas/            # Pydantic request/response models
│   ├── services/           # Business logic (auth, LLM, RAG)
│   ├── main.py             # FastAPI app entry point
│   └── requirements.txt
├── frontend/
│   ├── src/app/            # Next.js App Router pages
│   ├── src/components/     # Shared UI components
│   ├── src/lib/api.ts      # API client
│   └── src/contexts/       # React context (auth)
├── .env.example            # Template — copy to .env
└── README.md
```

---

## API Overview

| Method | Path                        | Description            |
| ------ | --------------------------- | ---------------------- |
| POST   | `/api/v1/auth/register`     | Create account         |
| POST   | `/api/v1/auth/login`        | Obtain JWT token       |
| GET    | `/api/v1/workspaces/`       | List workspaces        |
| POST   | `/api/v1/workspaces/`       | Create workspace       |
| POST   | `/api/v1/meetings/`         | Upload transcript      |
| GET    | `/api/v1/meetings/{id}`     | Get meeting detail     |
| POST   | `/api/v1/chat/{meeting_id}` | Ask AI about a meeting |
| GET    | `/api/v1/tasks/my-tasks`    | Get personal task list |
| PATCH  | `/api/v1/tasks/{id}`        | Update task            |

Full interactive docs: `http://localhost:8000/docs`

---

## Deployment (Free & Production Ready)

You can deploy the complete stack for free using Render (Backend) and Vercel (Frontend).

### 1. Database (Free Postgres)
- Go to [Neon.tech](https://neon.tech) or [Supabase](https://supabase.com) and create a free PostgreSQL database.
- Copy your connection string to use in the backend deployment.

### 2. Backend (Render)
1. Push your code to GitHub.
2. Log into [Render.com](https://render.com) and connect your GitHub account.
3. Render will automatically detect the `render.yaml` file in the repository.
4. Click **Blueprint** and select your repository to deploy the web service.
5. In the Render Dashboard, fill in the Environment Variables (like `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_SERVER` etc. based on your Neon DB, plus your `CLAUDE_API_KEY`).
6. Your backend will be live at `https://your-backend-app.onrender.com`.

### 3. Frontend (Vercel)
1. Log into [Vercel](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. Important: Set the **Root Directory** to `frontend`.
4. Add the following Environment Variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend-app.onrender.com/api/v1`
5. Click **Deploy**.

**Relevant Domain Name:**
Vercel automatically assigns a domain based on the project name. When importing your project in Vercel, name it something professional like `meetmate` or `meetmate-ai`, which will result in a clean domain like:
`https://meetmate.vercel.app`

---

## Contributing

1. Fork the repo and create a feature branch: `git checkout -b feature/my-feature`
2. Commit your changes: `git commit -m "feat: add my feature"`
3. Push and open a Pull Request

---

## License

MIT
