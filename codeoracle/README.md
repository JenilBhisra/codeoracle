# CodeOracle

CodeOracle is a hackathon project designed to help developers understand, test, and modernize legacy code. 

This project is split into a completely separated **Frontend** (React + Vite) and **Backend** (FastAPI) to allow seamless independent development across different machines with minimal git conflict risk.

---

## Directory Structure

```text
codeoracle/
├── frontend/             # React + Vite frontend application
│   ├── public/           # Static assets
│   ├── src/              # Application source code
│   │   ├── components/   # Shared UI components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API integration services
│   │   ├── styles/       # CSS stylesheets
│   │   ├── App.jsx       # Root component
│   │   └── main.jsx      # Entry point
│   ├── .env.example      # Environment variables template
│   ├── package.json      # Node dependencies and scripts
│   └── vite.config.js    # Vite configuration
├── backend/              # FastAPI backend application
│   ├── app/              # FastAPI application package
│   │   ├── api/          # API routers and endpoints
│   │   ├── core/         # Configuration and security
│   │   ├── models/       # Pydantic and database models
│   │   ├── services/     # Business logic & AI orchestration
│   │   ├── utils/        # Helper functions
│   │   ├── __init__.py   # Package initialization
│   │   └── main.py       # Application startup and CORS config
│   ├── tests/            # Test suite
│   ├── uploads/          # Directory for zip/file uploads (Git ignored)
│   ├── generated/        # Directory for generated results (Git ignored)
│   ├── .env.example      # Environment variables template
│   ├── requirements.txt  # Python package dependencies
│   └── render.yaml       # Deployment configuration (Render)
├── docs/                 # Hackathon documentation
│   ├── abstract.md       # Project abstract
│   └── demo-script.md    # Presentation/demo script
├── .gitignore            # Global git ignore configuration
└── CONTRIBUTING.md       # Collaboration and file ownership rules
```

---

## Getting Started

Follow the instructions below to get both the frontend and backend applications running locally.

### Prerequisites

- **Node.js** (v18+ recommended)
- **Python** (v3.10+ recommended)

---

### Backend Setup & Execution

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **macOS/Linux:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your local environment file:
   ```bash
   copy .env.example .env
   # or 'cp .env.example .env' on macOS/Linux
   ```
   *(Optionally edit the `.env` file to customize settings like ALLOWED_ORIGINS)*

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```
   The backend server will start at `http://127.0.0.1:8000`. You can access the interactive API docs (Swagger) at `http://127.0.0.1:8000/docs`.

---

### Frontend Setup & Execution

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install the dependencies:
   ```bash
   npm install
   ```

3. Create your local environment file:
   ```bash
   copy .env.example .env
   # or 'cp .env.example .env' on macOS/Linux
   ```
   *(By default, this connects to the backend running at http://localhost:8000)*

4. Run the development server:
   ```bash
   npm run dev
   ```
   The frontend will start at the address shown in your terminal (typically `http://localhost:5173`).
