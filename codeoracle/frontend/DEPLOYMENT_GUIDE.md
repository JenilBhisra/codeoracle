# CodeOracle — Frontend Deployment & Hackathon Presentation Runbook

**Event:** HACKORBIT 2026 at CHARUSAT, Anand  
**Track:** Developer Tools & Education  
**Problem Statement:** PS-06 — AI-Powered Legacy Codebase Explainer & Modernizer  
**Repository:** [https://github.com/JenilBhisra/codeoracle](https://github.com/JenilBhisra/codeoracle)  
**Branch:** `frontend-dev`  

---

## 1. Quick 2-Minute Deployment Options

Because you have approximately two days and need to host the frontend at a public URL, here are the two fastest and most reliable deployment methods for this Vite + React project.

### Option A: Deploy on Vercel (Recommended — 2 Minutes)

1. Go to [https://vercel.com](https://vercel.com) and log in with your GitHub account.
2. Click **Add New Project** and select **`JenilBhisra/codeoracle`**.
3. In the project configuration:
   * **Root Directory**: Select `codeoracle/frontend` (click Edit -> select folder `codeoracle/frontend`).
   * **Framework Preset**: `Vite` (automatically detected).
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
4. Under **Environment Variables**:
   * Add `VITE_API_BASE_URL` = `https://your-backend-url.onrender.com` (or your backend public URL).
5. Click **Deploy**.
   * *Note: The included `vercel.json` will automatically handle all single-page client routing.*

---

### Option B: Deploy on Netlify (Alternative)

1. Go to [https://app.netlify.com](https://app.netlify.com) and connect your GitHub repo.
2. Set **Base directory**: `codeoracle/frontend`
3. Set **Build command**: `npm run build`
4. Set **Publish directory**: `dist`
5. Add `VITE_API_BASE_URL` in Site configuration > Environment variables.
6. Click **Deploy Site**.

---

## 2. Running Locally for Evaluation / Demonstration

If presenting locally from your laptop or connected to a projector:

```bash
# 1. Navigate to frontend directory
cd c:\codeoracle\codeoracle\frontend

# 2. Start the high-performance dev server
npm run dev

# 3. Open browser at http://localhost:5173
```

---

## 3. Recommended 3-Minute Presentation Script for Judges

When demonstrating CodeOracle to the hackathon evaluators, follow this flow:

### Minute 1: The Problem & Live Ingestion (Landing Screen)
1. **The Hook**: *"Millions of legacy Python and JavaScript codebases run the world's infrastructure, but developers spend 70% of their time just trying to understand undocumented architecture before they can write a single test."*
2. **The Solution**: Show the **CodeOracle** landing page.
3. **Action**: Click one of the **Instant Demo Scenarios** (e.g. *Python Flask Auth Service* or *JavaScript Express E-Commerce*) or upload a `.zip` archive / paste a public GitHub URL.

### Minute 2: Architecture & Dependency Graph
1. **Executive Overview**: Show the detected architecture pattern, entry points, and collapsible module breakdown with inputs, outputs, and side effects.
2. **Interactive Dependency Graph**: Switch to the **Dependency Graph** tab.
   * Click **Fullscreen**.
   * Click a module node (e.g., `app.auth.service`) to slide open the **Node Inspection Panel** showing incoming and outgoing dependency connections.

### Minute 3: Tests, Refactored Code & Risk Warnings
1. **Automated Unit Tests**: Show the synthesized PyTest/Jest suite with syntax highlighting, coverage target badges (`Measured` vs `Estimated`), and click the **Copy** or **Download** button.
2. **Modernized Refactored Code**:
   * Highlight the **Breaking Changes Detected** warning box.
   * Switch the code view to **Before/After Diff** mode to visually show the legacy insecure MD5 hashing on the left vs modern Argon2id password hashing on the right.
3. **Artifact Export**: Click **"Export Report (.md)"** in the top bar to show that developers can download a complete audit report instantly.

---

## 4. Emergency Backup Mode (Venue Wi-Fi Failure Safeguard)

If the venue Wi-Fi becomes slow or your backend server is restarting during judging:
* Click the **"Instant Demo Scenarios"** pills on the landing screen.
* The frontend will immediately populate all 4 output tabs with realistic, full AST data, interactive graphs, diff viewers, and test suites without sending an external network call.

---
*Created for HACKORBIT 2026 • PS-06 Team CodeOracle.*
