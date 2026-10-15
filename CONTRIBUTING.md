# Contributing to OpenOrbit

Thank you for your interest in contributing to **OpenOrbit**! We welcome bug fixes, documentation improvements, and architectural enhancements.

## Code of Conduct & Philosophy
OpenOrbit follows a "Human-in-the-Loop" architecture:
1. **Deterministic facts first:** All GitHub information is fetched directly from real APIs.
2. **Safe prompts:** All untrusted repository content is bounded in XML delimiters to protect against prompt injection.
3. **Contributor authority:** AI generates proposals, strategies, and draft PR descriptions; developers review, edit, test, and commit code themselves.

## Development Workflow

### Prerequisites
- Node.js `v20+` (tested on Node `v22.18.0`)
- npm `10+`
- (Optional) [Ollama](https://ollama.ai) for local model inference

### Getting Started
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   npm --prefix server install
   npm --prefix client install
   ```
3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
4. Start both frontend and backend concurrently:
   ```bash
   npm run dev
   ```
   - Frontend UI: `http://localhost:5173`
   - Backend API: `http://localhost:5000`
   - Healthcheck: `http://localhost:5000/api/health`

### Testing and Linting
Before opening a Pull Request:
```bash
# Run backend tests
npm test

# Run frontend linting
npm run lint

# Build production bundle
npm run build
```

### Pull Request Process
1. Create a descriptive feature branch: `git checkout -b feat/your-feature-name`.
2. Commit your changes with conventional commit messages (e.g., `fix(github): ...`, `feat(ai): ...`).
3. Ensure automated tests pass and lint is clean.
4. Submit your PR using the provided PR template.
