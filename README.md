# Assemble DataFlow Collection

Manufacturing data tracking system for ring assembly operations — MO tracking, scrap logging, returns management, and admin controls.

## Project Structure

```
Assemble DataFlow Collection/
├── backend/
│   ├── server.js          ← Main Node.js server (Express)
│   ├── db.js              ← Database config (lowdb/JSON)
│   ├── routes/            ← API route handlers
│   ├── models/            ← Data models (future)
│   ├── controllers/       ← Business logic (future)
│   ├── data/              ← JSON database files
│   ├── .env               ← Secret keys (never commit!)
│   └── package.json
├── frontend/
│   ├── src/               ← React source code
│   │   ├── components/    ← Reusable UI components
│   │   ├── pages/         ← Page-level components
│   │   ├── context/       ← React context providers
│   │   └── services/      ← API client utilities
│   ├── public/            ← Static assets
│   ├── index.html         ← HTML entry point
│   ├── vite.config.js     ← Vite configuration
│   └── package.json
├── package.json           ← Root orchestrator
├── START-APP.bat          ← One-click launcher (Windows)
└── .gitignore
```

## Quick Start

### Option 1: One-click (Windows)
Double-click `START-APP.bat`

### Option 2: Manual

```bash
# Install all dependencies
npm run install:all

# Run both servers together
npm run dev
```

Or run them separately:

```bash
# Terminal 1 — Backend (port 5000)
cd backend
npm install
npm run dev

# Terminal 2 — Frontend (port 5173)
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Default Credentials

| Role  | Employee ID | Password    |
|-------|-------------|-------------|
| Admin | UltraAss    | Human@2026  |
| User  | Ajay        | 1219        |

## Tech Stack

- **Frontend**: React 19 + Vite
- **Backend**: Express 5 (Node.js)
- **Database**: lowdb (JSON file-based)
- **Styling**: Custom CSS
