# GitHub App OAuth & Identity Setup Guide

This guide documents the setup, security architecture, configuration, and verification of GitHub App authentication and account linking in OpenOrbit.

---

## 1. Required Configuration

All variables are configured in `server/.env` (and documented in `server/.env.example`):

```env
# GitHub App Authentication
GITHUB_APP_CLIENT_ID=your_github_app_client_id
GITHUB_APP_CLIENT_SECRET=your_github_app_client_secret
GITHUB_APP_CALLBACK_URL=http://localhost:5000/api/v1/auth/github/callback

# 32-byte (64-character hex) token encryption key for AES-256-GCM
GITHUB_ENCRYPTION_KEY=your_64_character_hex_encryption_key
```

### Generating an Encryption Key
Generate a cryptographically secure 256-bit (32-byte) hexadecimal key using Node.js:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 2. GitHub App Registration

1. Go to **GitHub Settings** → **Developer Settings** → **GitHub Apps** → **New GitHub App**.
2. **App Name**: OpenOrbit (or your unique development instance name).
3. **Homepage URL**: `http://localhost:5173` (or production client URL).
4. **Callback URL**: `http://localhost:5000/api/v1/auth/github/callback`.
5. **Expire user authorization tokens**: Checked (recommended for automatic token expiration and refresh token rotation).
6. **Request user authorization (OAuth) during installation**: Enabled.
7. **Webhook**: Deactivate "Active" checkbox (webhooks are not required for OAuth identity authentication).

### Minimum Required Permissions:
- **Account Permissions**:
  - `Email addresses`: **Read-only** (allows resolving verified primary email for users whose email is private).
- **User-to-server tokens**:
  - `read:user` and `user:email` scopes are requested during authorization.
- **Permissions NOT yet needed**:
  - Repository write permissions, webhooks, administration, and device flow are not required for this phase.

---

## 3. Architecture & Endpoints

| Endpoint | Method | Access | Description |
|---|---|---|---|
| `/api/v1/auth/reauth` | `POST` | Protected (`requireAuth`) | Validates local password and issues single-use, 5-minute ticket for identity linking |
| `/api/v1/auth/github` | `GET` | Public / Protected for link | Initiates OAuth flow with PKCE S256 and encrypted state cookie |
| `/api/v1/auth/github/callback` | `GET` | Public | Validates state, exchanges code for tokens, verifies profile, establishes session |

### Security Invariants:
1. **No Silent Account Merging**: If an unlinked GitHub profile shares the email of an existing local account, OpenOrbit rejects automatic linking with `409 ACCOUNT_EXISTS_REQUIRES_LINK`. The user must prove account ownership by logging in with their local password and obtaining a single-use reauth ticket.
2. **Atomic Single-Use Tickets**: Tickets are hashed with SHA-256 and consumed atomically in MongoDB via `findOneAndUpdate` (`{ reauthTicketHash: null, reauthTicketExpiresAt: null }`), preventing race conditions and replay attacks.
3. **Encrypted Tokens At Rest**: All GitHub access and refresh tokens are encrypted using AES-256-GCM (`enc:v1:{iv}:{authTag}:{ciphertext}`). Decrypted tokens and ciphertext are strictly excluded from queries (`select: false`), transforms (`toJSON`/`toObject`), and safe API representations (`toSafeObject()`).
4. **Stateless Tamper-Proof State**: OAuth transaction data (state token, PKCE code_verifier, intent, target destination) is stored in a short-lived (10 min), `HttpOnly`, `SameSite=Lax` AES-256-GCM encrypted cookie (`openorbit_oauth_state`), resisting CSRF, session replay, and server restart issues.
5. **Open Redirect Defense**: Post-authentication redirect destinations are strictly sanitized against protocol-relative (`//evil.com`) and external domain attacks.

---

## 4. Verification & Testing

### Automated Test Suites:
Run the complete backend test suite:
```bash
npm test --prefix server
```
This executes:
- `crypto.test.js`: 23 tests verifying AES-256-GCM encryption, PKCE generation, reauth ticket hashing, and user schema compatibility.
- `github-oauth.test.js`: 24 tests verifying OAuth initiation, state validation, open redirect prevention, atomic reauth consumption, duplicate identity collision handling, and route callbacks.
- `auth.test.js`: 14 tests verifying local registration, login, JWT cookies, session validation, and logout.
- `health.test.js`, `github.test.js`, `contribution.test.js`: 10 integration and unit tests.

### Running Frontend Checks:
```bash
npm run lint --prefix client
npm run build --prefix client
```

### Manual Verification with Real GitHub App:
To verify live with GitHub:
1. Ensure MongoDB is running: `mongod`.
2. Populate `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET`, and `GITHUB_ENCRYPTION_KEY` in `server/.env`.
3. Start the backend: `npm run dev --prefix server`.
4. Start the frontend: `npm run dev --prefix client`.
5. Navigate to `http://localhost:5000/api/v1/auth/github` to initiate the live GitHub authorization flow in your browser.
