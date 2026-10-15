# Detailed Contributor Guide

Welcome to the OpenOrbit project! This guide provides in-depth technical practices for contributors.

## Project Structure & Conventions

- **Frontend components:** Located in `client/src/components/`. Components must be modular, accept clean props, and avoid hardcoding API calls directly in UI presentation components.
- **API Services:** Located in `client/src/lib/apiClient.js` for frontend, and `server/src/services/` for backend.
- **Backend Architecture:** Layered pattern: `routes/` -> `controllers/` -> `services/` -> `models/mappers`.
- **Error Handling:** All operational errors must throw `AppError` with a status code and machine-readable error code. All async controller functions must be wrapped with `asyncHandler`.

## Contribution Workflow
1. Check existing issues or open a new one describing your proposed enhancement.
2. Ensure you add unit tests in `server/src/tests/*.test.js` for new backend features.
3. Keep frontend linter clean (`npm run lint`).
4. Ensure PR template is completely filled out with verification steps.
