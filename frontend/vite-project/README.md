# Setting Up the Development Environment for InterviewAI

This guide walks you through setting up and running the **React + Vite** frontend and **Flask** backend for the **InterviewAI** project. You can choose to run it locally or using Docker Compose.

---

## Prerequisites

1. **Node.js (>= 14.0.0)**  
   - [Official Download Page](https://nodejs.org/)  

2. **pnpm (>= 7.0.0)**  
   - [pnpm Installation Guide](https://pnpm.io/installation)  
   - After installing, you should be able to run `pnpm --version` to verify your installation.  

3. **Python (>= 3.8)**  
   - [Official Download Page](https://www.python.org/downloads/)  

4. **Poetry**  
   - [Poetry Installation Guide](https://python-poetry.org/docs/#installation)  
   - If Poetry is not installed, you can install it using:
     ```bash
     pip install poetry
     ```
   - After installation, verify by running:
     ```bash
     poetry --version
     ```

5. **Git (optional)**  
   - Use Git for version control or to clone your project repository if it’s hosted on a Git platform like GitHub or GitLab.

---

## Project Structure

For clarity, you might organize your files and folders as follows:

```
team-01/
├─ frontend/vite-project/
│  ├─ index.html
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ src/
│  │  ├─ main.jsx
│  │  └─ App.jsx
│  └─ vite.config.js
└─ backend/
   ├─ pyproject.toml
   ├─ poetry.lock
   └─ app.py
```

- `frontend/` contains the React + Vite app.
- `backend/` contains the Python (Flask) server.
- `.env` file should be created in the **root directory** (`team-01/.env`).

---

## Step 1: Create a `.env` File

Before running the application, create a `.env` file in the **root directory** (`team-01/.env`). This file will store environment variables required for the backend and frontend configurations.

### Local Development `.env` Setup
For running the project locally, use the following configuration in `team-01/.env`:

```bash
SUPABASE_URL=******
SUPABASE_KEY=******
OPENAI_API_KEY=ENTER_YOUR_OPENAI_API_KEY
FRONTEND_URL=http://127.0.0.1:5173
PORT=5001
VITE_API_BASE_URL=http://127.0.0.1:5001
```

_If you need Supabase credentials, please request them from the team._

---

## Running the Project Locally

### **Backend Setup (Flask + Poetry)**

1. Navigate to the backend directory:
   ```bash
   cd team-01/backend
   ```

2. Install dependencies:
   ```bash
   poetry install
   ```

3. Run the backend server:
   ```bash
   poetry run python app.py
   ```
   The backend will run on `http://127.0.0.1:5001`.

---

### **Frontend Setup (React + Vite + pnpm)**

1. Navigate to the frontend directory:
   ```bash
   cd team-01/frontend/vite-project
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Start the development server:
   ```bash
   pnpm dev
   ```
   The frontend will be available at `http://127.0.0.1:5173`.

---

## Running the Project with Docker Compose

If you prefer to run the project with Docker Compose:

1. Ensure **Docker** or **Docker Desktop** is installed.
2. Make sure your `.env` file is properly set up.
3. Navigate to the project root (`team-01/`) and run:
   ```bash
   docker-compose up --build
   ```
4. Once running, access the frontend at `http://127.0.0.1:5173`.

---

## Summary

### **Running Locally:**
- Create `.env` with local URLs.
- Install dependencies (`poetry install`, `pnpm install`).
- Start backend (`poetry run python app.py`).
- Start frontend (`pnpm dev`).

### **Running with Docker Compose:**
- Ensure `.env` is set up properly.
- Ensure **Docker** or **Docker Desktop** is installed.
- Run `docker-compose up --build` from the root directory.


