# OpenOrbit Automation & Scripts

This folder is reserved for continuous integration, benchmarking, and repository maintenance scripts.

Currently, all lifecycle scripts (dev, test, build, lint) are orchestrated via the root `package.json`:

- `npm run dev`: Starts the Express backend on port 5000 and the Vite frontend on port 5173 concurrently.
- `npm run test`: Runs the Node test runner across all backend integration and unit test suites.
- `npm run lint`: Runs Oxlint static analysis on the React frontend.
- `npm run build`: Compiles the production frontend bundle into `client/dist`.
