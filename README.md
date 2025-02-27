Below is a step-by-step guide to setting up and running a **React + Vite** application using **pnpm**, along with a **Python** backend using **Poetry** and **Flask**. This guide assumes you have a basic understanding of the terminal/command line and have both **Node.js** and **Python** installed on your system. 

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
   - After installation, verify by running `poetry --version`.  

5. **Git (optional)**  
   - Use Git for version control or to clone your project repository if it’s hosted on a Git platform like GitHub or GitLab.

---

## Project Structure

For clarity, you might organize your files and folders as follows:

```
my-project/
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
- You may have additional directories (e.g., `tests`, `docs`) as needed.

---

## Setting Up the Frontend (React + Vite) with pnpm

1. **Install dependencies with pnpm**  
   Go to `frontend/vite-project/` directory:
   ```bash
   cd frontend/vite-project/
   pnpm install
   ```
   This reads the `package.json` and installs the necessary dependencies, creating a `pnpm-lock.yaml` file.

2. **Project Configuration**  
   - **package.json**: ensures that your `scripts` section includes something like:
     ```json
     {
       "scripts": {
         "dev": "vite",
         "build": "vite build",
         "preview": "vite preview"
       }
     }
     ```

4. **Running the Frontend**  
   From within the `frontend/vite-project/` directory:
   ```bash
   pnpm dev
   ```
   - By default, Vite will start a development server at `http://localhost:5173/` (the exact port may differ).
   - To create a production-ready build:
     ```bash
     pnpm build
     ```
     This will generate static files in the `dist/` folder.

---
## **Setting Up the Backend (Python + Flask) with Poetry**  

Follow these steps to set up and run the `backend` project using **Poetry** for dependency management.

---

### **1. Install Poetry**  
If Poetry is not installed, follow the official guide [here](https://python-poetry.org/docs/#installation) or install it using:  
```bash
pip install poetry
```
After installation, verify it by running:  
```bash
poetry --version
```

---

### **2. Install Dependencies & Create Virtual Environment**  
Navigate to the `backend` directory and install dependencies:  
```bash
cd backend
poetry install
```
This command:
- Creates a virtual environment (stored in `backend/.venv/`).
- Installs all dependencies listed in `pyproject.toml`.

---

### **3. Project Structure**  
After setup, your `backend/` directory should look like this:  
```
backend/
├── pyproject.toml    # Poetry config file
├── poetry.lock       # Dependency lock file
└── app.py            # Main Flask application
```
- **`app.py`** contains your Flask routes and logic.

---

### **4. Run the Flask Server**  
Start the server using:  
```bash
poetry run python app.py
```
Or, if you have activated the Poetry shell:  
```bash
poetry shell
python app.py
```
Our backend, Flask, will run on **`http://127.0.0.1:5001`**.

Run all the Unit Tests in the tests folder with this command:
```bash
poetry run python -m unittest discover tests
```

---

## Summary

1. **Frontend** (React + Vite):
   - Use `pnpm` to install and manage dependencies.
   - Run development server with `pnpm dev`.
   - Build production artifacts with `pnpm build`.

2. **Backend** (Flask):
   - Use `Poetry` for Python dependency management.
   - Run your Flask development server with `poetry run python app.py`.

3. **Combine & Deploy**:
   - In development, run two separate terminals for front and back ends.
   - In production, build the React app and optionally serve static files from Flask or a dedicated static hosting solution. 

By following these steps, you can maintain a clean and modern setup for both your frontend and backend while leveraging the benefits of **pnpm** (faster, disk-space efficient package management) and **Poetry** (reliable, isolated Python environments with clear dependency management).
