import { Icon } from "../../components/common/Icon.jsx";
import { useAuth } from "../../lib/useAuth.js";

const CURRENT_YEAR = 2026;

export function HomePage() {
  const { openAuthModal, authNotice, authError, clearAuthNotice, clearAuthError } = useAuth();

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="marketing-page" style={{ backgroundColor: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>
      {/* Navbar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          backgroundColor: "rgba(247, 245, 240, 0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--border-subtle)",
          padding: "16px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <Icon name="sparkle" size={20} />
            </div>
            <div>
              <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em", color: "var(--text-primary)" }}>
                OpenOrbit
              </span>
              <span style={{ fontSize: 11, display: "block", color: "var(--text-muted)", fontWeight: 500, letterSpacing: "0.02em" }}>
                CONTRIBUTION ASSISTANT
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav
            style={{
              display: "none",
              alignItems: "center",
              gap: 28,
            }}
            className="marketing-desktop-nav"
          >
            <button
              type="button"
              onClick={() => scrollToSection("features")}
              className="marketing-nav-link"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("workflow")}
              className="marketing-nav-link"
            >
              How it works
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("security")}
              className="marketing-nav-link"
            >
              Security
            </button>
            <button
              type="button"
              onClick={() => scrollToSection("about")}
              className="marketing-nav-link"
            >
              About
            </button>
          </nav>

          {/* Auth Actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              type="button"
              onClick={() => openAuthModal("login")}
              className="btn btn-secondary"
              style={{
                borderRadius: "var(--radius-full)",
                padding: "8px 18px",
                fontSize: 14,
                fontWeight: 600,
                borderColor: "var(--border-medium)",
                backgroundColor: "transparent",
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => openAuthModal("register")}
              className="btn btn-primary"
              style={{
                borderRadius: "var(--radius-full)",
                padding: "8px 20px",
                fontSize: 14,
                fontWeight: 600,
                backgroundColor: "var(--accent-primary)",
                color: "var(--text-on-accent)",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Notice & Error Banners */}
      {(authError || authNotice) && (
        <div style={{ maxWidth: 960, margin: "20px auto 0", padding: "0 24px" }}>
          {authError && (
            <div
              className="callout"
              role="alert"
              style={{
                backgroundColor: "#FEF2F2",
                borderColor: "#FECACA",
                color: "#991B1B",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "var(--radius-lg)",
                boxShadow: "var(--shadow-sm)",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                <Icon name="alert" size={20} />
                <span style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.5 }}>{authError}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="btn btn-secondary"
                  style={{
                    fontSize: 13,
                    padding: "6px 14px",
                    borderRadius: "var(--radius-full)",
                    borderColor: "#FCA5A5",
                    color: "#991B1B",
                    backgroundColor: "#FFFFFF",
                  }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={clearAuthError}
                  aria-label="Dismiss error"
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#991B1B", padding: 4 }}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            </div>
          )}

          {authNotice && (
            <div
              className="callout callout-success"
              role="status"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderRadius: "var(--radius-lg)",
                marginTop: authError ? 10 : 0,
                boxShadow: "var(--shadow-sm)",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Icon name="checkCircle" size={20} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{authNotice}</span>
              </div>
              <button
                type="button"
                onClick={clearAuthNotice}
                aria-label="Dismiss notice"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-primary)", padding: 4 }}
              >
                <Icon name="close" size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hero Section */}
      <section
        style={{
          maxWidth: 1240,
          margin: "0 auto",
          padding: "72px 24px 48px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: "var(--radius-full)", backgroundColor: "var(--accent-subtle)", border: "1px solid var(--accent-subtle-border)", marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--accent-forest)" }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-primary)" }}>
            Open Source Contribution Assistant
          </span>
        </div>

        <h1
          style={{
            fontSize: "clamp(36px, 5.5vw, 62px)",
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: "-0.03em",
            color: "var(--text-primary)",
            maxWidth: 900,
            margin: "0 auto 24px",
          }}
        >
          Your next open-source contribution starts here.
        </h1>

        <p
          style={{
            fontSize: "clamp(16px, 2vw, 20px)",
            color: "var(--text-secondary)",
            maxWidth: 720,
            margin: "0 auto 36px",
            lineHeight: 1.6,
          }}
        >
          OpenOrbit helps developers discover real GitHub issues, explore unfamiliar repositories, gather relevant code context, and build AI-assisted contribution plans while retaining total control over their changes.
        </p>

        <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap", marginBottom: 54 }}>
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className="btn btn-primary"
            style={{
              borderRadius: "var(--radius-full)",
              padding: "14px 28px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
              boxShadow: "var(--shadow-md)",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Start Free Trial <Icon name="arrowRight" size={16} />
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("features")}
            className="btn btn-secondary"
            style={{
              borderRadius: "var(--radius-full)",
              padding: "14px 26px",
              fontSize: 16,
              fontWeight: 600,
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border-medium)",
              color: "var(--text-primary)",
            }}
          >
            Explore Features
          </button>
        </div>

        {/* Hero Product Preview Card (FlowGrid style modular dashboard preview) */}
        <div
          style={{
            maxWidth: 1080,
            margin: "0 auto",
            backgroundColor: "var(--bg-secondary)",
            borderRadius: "var(--radius-xl)",
            border: "1px solid var(--border-medium)",
            boxShadow: "var(--shadow-lg)",
            overflow: "hidden",
            textAlign: "left",
          }}
        >
          {/* Fake Window Header */}
          <div
            style={{
              backgroundColor: "var(--bg-elevated)",
              padding: "12px 20px",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--border-medium)" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--border-medium)" }} />
              <span style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "var(--border-medium)" }} />
              <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-muted)", marginLeft: 12 }}>
                openorbit.dev / workspace / contribution-planner
              </span>
            </div>
            <span className="badge badge-success" style={{ fontSize: 11 }}>
              <Icon name="checkCircle" size={12} /> Live API Grounded
            </span>
          </div>

          {/* Preview Content Grid */}
          <div style={{ padding: 28, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {/* Card 1: Issue Context */}
            <div style={{ backgroundColor: "var(--bg-primary)", padding: 20, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="badge badge-primary">facebook/react #28472</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>good first issue</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "var(--text-primary)" }}>
                Fix event handler teardown in concurrent root mode
              </h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: 16 }}>
                Discovered automatically via verified GitHub API search. Grounded in actual repository source tree.
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "3px 8px", backgroundColor: "#fff", borderRadius: 4, border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  packages/react-dom
                </span>
                <span style={{ fontSize: 11, padding: "3px 8px", backgroundColor: "#fff", borderRadius: 4, border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}>
                  TypeScript / Jest
                </span>
              </div>
            </div>

            {/* Card 2: AI Plan (Deep Forest Green card matching Image 2) */}
            <div style={{ backgroundColor: "var(--bg-card-forest)", color: "#FFFFFF", padding: 20, borderRadius: "var(--radius-lg)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-lime)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="sparkle" size={14} /> AI CONTRIBUTION PLAN
                  </span>
                  <span style={{ fontSize: 11, backgroundColor: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 12 }}>
                    4 Verified Steps
                  </span>
                </div>
                <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                  1. Isolate listener cleanup
                </h4>
                <p style={{ fontSize: 13, opacity: 0.85, lineHeight: 1.5, marginBottom: 14 }}>
                  Ensure clean dismount phase before node removal. Retains full developer agency with suggested unit tests.
                </p>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, opacity: 0.8 }}>Ready for validation</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-lime)" }}>94% Context Match</span>
              </div>
            </div>

            {/* Card 3: Metrics & Speed */}
            <div style={{ backgroundColor: "var(--bg-card-sage)", padding: 20, borderRadius: "var(--radius-lg)", border: "1px solid var(--accent-subtle-border)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)", display: "block", marginBottom: 6 }}>
                  INTEGRATED TOOLING
                </span>
                <strong style={{ fontSize: 24, fontWeight: 800, color: "var(--accent-primary)" }}>
                  5X Faster Onboarding
                </strong>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 8, lineHeight: 1.5 }}>
                  Model Context Protocol (MCP) tool execution, GitHub OAuth token security, and local Python AI analysis.
                </p>
              </div>
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <span className="badge badge-neutral" style={{ fontSize: 11, backgroundColor: "#fff" }}>Zero Blue/Purple</span>
                <span className="badge badge-neutral" style={{ fontSize: 11, backgroundColor: "#fff" }}>Secure Cookies</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section (3 modular cards inspired by Image 3) */}
      <section id="features" style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 54 }}>
          <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 12 }}>
            Streamline your contribution workflow.
          </h2>
          <p style={{ fontSize: 16, color: "var(--text-secondary)", maxWidth: 600, margin: "0 auto" }}>
            Modern tools designed for contributors, maintainers, and open-source teams.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Feature 1 */}
          <div className="card" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-medium)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "var(--accent-primary)" }}>
              <Icon name="search" size={22} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
              Real Issue Discovery
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Query live GitHub repositories using genuine GitHub search filters. Filter by beginner-friendly labels like <code>good-first-issue</code>, programming language, and repository keyword.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-medium)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "var(--accent-primary)" }}>
              <Icon name="repository" size={22} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
              Repository Inspection
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Inspect live README context, commit history, and star metrics. The server-side MCP client navigates codebase structures with token-conscious pruning so you understand architecture instantly.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card" style={{ padding: 32, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-medium)" }}>
            <div style={{ width: 44, height: 44, borderRadius: "var(--radius-md)", backgroundColor: "var(--accent-subtle)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20, color: "var(--accent-primary)" }}>
              <Icon name="sparkle" size={22} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
              AI Contribution Planning
            </h3>
            <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Generate concrete, grounded step-by-step implementation plans. Get recommended file targets, risk warnings, testing criteria, and formatted pull request descriptions without losing human oversight.
            </p>
          </div>
        </div>
      </section>

      {/* 3-Step Workflow Section */}
      <section id="workflow" style={{ backgroundColor: "var(--bg-elevated)", borderTop: "1px solid var(--border-subtle)", borderBottom: "1px solid var(--border-subtle)", padding: "80px 24px" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 54 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--accent-primary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
              HOW IT WORKS
            </span>
            <h2 style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.02em", marginTop: 8 }}>
              From issue discovery to merged pull request.
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 32 }}>
            <div style={{ backgroundColor: "var(--bg-secondary)", padding: 28, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent-sage)", marginBottom: 12 }}>
                01
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Find Your Target Issue</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Search by language or beginner label, or save promising issues into your private workspace backlog for tracking.
              </p>
            </div>

            <div style={{ backgroundColor: "var(--bg-secondary)", padding: 28, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent-sage)", marginBottom: 12 }}>
                02
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Synthesize Repository Context</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                OpenOrbit aggregates README notes, verified project dependencies, and relevant file snippets using the official Model Context Protocol.
              </p>
            </div>

            <div style={{ backgroundColor: "var(--bg-secondary)", padding: 28, borderRadius: "var(--radius-lg)", border: "1px solid var(--border-subtle)" }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent-sage)", marginBottom: 12 }}>
                03
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Generate Plan & Submit PR</h3>
              <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Receive structured implementation blueprints with test plans, draft your PR description, and ship verified changes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="security" style={{ maxWidth: 1240, margin: "0 auto", padding: "80px 24px" }}>
        <div className="card" style={{ padding: "48px 36px", borderRadius: "var(--radius-xl)", backgroundColor: "var(--bg-secondary)", border: "1px solid var(--border-medium)" }}>
          <div style={{ maxWidth: 760 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "4px 12px", borderRadius: "var(--radius-full)", backgroundColor: "var(--status-success-bg)", border: "1px solid var(--status-success-border)", marginBottom: 16 }}>
              <Icon name="shield" size={14} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--status-success)" }}>Zero Token Exposure</span>
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 14 }}>
              Enterprise-grade security and session protection.
            </h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 24 }}>
              OpenOrbit isolates OAuth credentials and API tokens on the backend using AES-256 server-side encryption. The client never handles plaintext tokens. Sessions use hardened HTTP-only, SameSite cookies with mandatory reauthentication tickets for sensitive identity operations.
            </p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <Icon name="checkCircle" size={16} /> HTTP-Only Cookies
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <Icon name="checkCircle" size={16} /> Single-Use Reauth Tickets
              </span>
              <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                <Icon name="checkCircle" size={16} /> No Silent Account Linking
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" style={{ maxWidth: 1240, margin: "0 auto", padding: "40px 24px 80px" }}>
        <div style={{ textAlign: "center", maxWidth: 720, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
            About OpenOrbit
          </h2>
          <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.7, marginBottom: 28 }}>
            OpenOrbit was created to bridge the gap between eager developers and open-source maintainers. By equipping contributors with context-grounded AI planning and real repository telemetry, we help developers submit higher quality PRs that maintainers love to merge.
          </p>
          <button
            type="button"
            onClick={() => openAuthModal("register")}
            className="btn btn-primary"
            style={{
              borderRadius: "var(--radius-full)",
              padding: "12px 28px",
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: "var(--accent-primary)",
              color: "#FFFFFF",
            }}
          >
            Create Your Account
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "36px 24px", backgroundColor: "var(--bg-secondary)" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="sparkle" size={16} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>OpenOrbit</span>
            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>© {CURRENT_YEAR} OpenOrbit. Open-source contribution assistant.</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            <a href="https://github.com/Neeraj-code-beep/OpenOrbit" target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
              <Icon name="github" size={16} /> GitHub Repository
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
