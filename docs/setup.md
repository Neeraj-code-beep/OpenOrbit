# Reproducible Setup & Getting Started

Follow these steps to set up and run PRPath locally.

## Prerequisites
- **Node.js**: `v20.x` or `v22.x` (tested on Node `v22.18.0`)
- **npm**: `v10.x`
- Modern web browser (Chrome, Edge, Firefox, Safari)

---

## 1. Installation
Clone the repository and install all dependencies:

```bash
# In repository root
npm install

# In backend server
npm --prefix server install

# In frontend client
npm --prefix client install
```

---

## 2. Environment Configuration
Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Open `.env` and set your preferred keys:
- For Google Gemini:
  ```ini
  AI_PROVIDER=gemini
  GEMINI_API_KEY=AIzaSy...
  GEMINI_MODEL=gemini-2.5-flash
  ```
- For Local Ollama:
  ```ini
  AI_PROVIDER=ollama
  OLLAMA_HOST=http://127.0.0.1:11434
  OLLAMA_MODEL=llama3:latest
  ```
- For Higher GitHub rate limits:
  ```ini
  GITHUB_TOKEN=ghp_...
  ```

---

## 3. Running Development Servers
Run the full stack concurrently:

```bash
npm run dev
```

This launches:
- **Express Backend:** `http://localhost:5000`
- **Vite Frontend:** `http://localhost:5173`

Visit [http://localhost:5173](http://localhost:5173) in your browser.

---

## 4. Smoke Verification
Verify everything is operational:
```bash
# Check health
curl http://localhost:5000/api/health

# Run test suites
npm test

# Run frontend linting
npm run lint

# Compile frontend build
npm run build
```
