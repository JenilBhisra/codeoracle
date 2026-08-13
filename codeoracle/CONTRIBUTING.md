# Contribution Guidelines

To ensure smooth and conflict-free collaboration during the hackathon, we follow a strict directory ownership model and development workflow. Please read and adhere to these guidelines before starting work.

---

## Directory & File Ownership

To prevent Git merge conflicts, code files are divided by developer role:

* **Frontend Developer (`frontend-dev`)**:
  * Exclusive ownership of files inside the `frontend/` directory.
  * Do not modify files in the `backend/` or `docs/` folders.

* **Backend Developer (`backend-dev`)**:
  * Exclusive ownership of files inside the `backend/` directory.
  * Owner of the repository root-level files (such as `.gitignore`, `README.md`, `CONTRIBUTING.md`) and the `docs/` directory.
  * Do not modify files in the `frontend/` folder.

---

## Development Workflow

### 1. Branch Management
* **Never commit directly to the `main` branch.**
* Create a descriptive feature branch for your changes:
  * For frontend features: `feature/fe-<description>`
  * For backend features: `feature/be-<description>`
* Always pull the latest changes from the `main` branch before starting a new feature or creating a Pull Request (PR):
  ```bash
  git checkout main
  git pull origin main
  git checkout -b feature/your-feature-name
  ```

### 2. Commit Rules
* **No Secrets or Credentials**: Never commit API keys, database credentials, or `.env` files. Only commit `.env.example` templates.
* **No Generated files**: Never commit build artifacts, package-lock.json/yarn.lock (unless aligned), Python virtual environments (`venv/`), dependencies (`node_modules/`), or test coverage reports. These are ignored in `.gitignore`.
* **No force-pushing**: Do not use `git push --force` or `git push -f` on shared branches. If you need to update a branch, use safe rebasing or standard merge commits.

### 3. Submission
* Submit a PR to merge your feature branch back into `main`.
* Ensure that both the frontend and backend are functional before merging.
