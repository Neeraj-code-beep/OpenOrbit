import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../lib/useAuth.js";
import { api } from "../../lib/apiClient.js";
import { Button } from "../common/Button.jsx";
import { Input } from "../common/Input.jsx";
import { Icon } from "../common/Icon.jsx";

export function AuthModal() {
  const {
    isAuthModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
  } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);
  const triggerElementRef = useRef(null);

  const isRegister = authModalMode === "register";

  // Capture opening trigger element and restore focus on close
  useEffect(() => {
    if (isAuthModalOpen) {
      triggerElementRef.current = document.activeElement;
    } else if (triggerElementRef.current) {
      if (typeof triggerElementRef.current.focus === "function") {
        triggerElementRef.current.focus();
      }
      triggerElementRef.current = null;
    }
  }, [isAuthModalOpen]);

  // Reset form when modal opens or mode changes
  useEffect(() => {
    if (isAuthModalOpen) {
      setName("");
      setEmail("");
      setPassword("");
      setErrors({});
      setGeneralError("");
      setSubmitting(false);

      // Focus first input (or fallback to first focusable element in dialog)
      setTimeout(() => {
        if (firstInputRef.current) {
          firstInputRef.current.focus();
        } else {
          dialogRef.current?.querySelector("button, input")?.focus();
        }
      }, 50);
    }
  }, [isAuthModalOpen, authModalMode]);

  // Handle ESC key and Tab focus trapping inside the modal
  useEffect(() => {
    if (!isAuthModalOpen) return;

    function handleKeyDown(e) {
      // 1. Escape key handling
      if (e.key === "Escape" && !submitting) {
        closeAuthModal();
        return;
      }

      // 2. Tab focus trap handling
      if (e.key === "Tab") {
        if (!dialogRef.current) return;

        const focusableSelector =
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll(focusableSelector)
        ).filter((el) => !el.disabled && el.getAttribute("aria-hidden") !== "true");

        // Handle case where no focusable elements exist
        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          // Shift + Tab: wrap to last element
          if (
            document.activeElement === firstElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: wrap to first element
          if (
            document.activeElement === lastElement ||
            !dialogRef.current.contains(document.activeElement)
          ) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAuthModalOpen, submitting, closeAuthModal]);

  if (!isAuthModalOpen) return null;

  const validate = () => {
    const errs = {};
    if (isRegister) {
      if (!name.trim()) {
        errs.name = "Full name is required.";
      } else if (name.trim().length < 2 || name.trim().length > 60) {
        errs.name = "Name must be between 2 and 60 characters.";
      }
    }

    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (isRegister) {
      if (password.length < 8) {
        errs.password = "Password must be at least 8 characters long.";
      } else if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
        errs.password = "Password must contain at least one letter and one number.";
      }
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    setGeneralError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        });
      } else {
        await login({
          email: email.trim().toLowerCase(),
          password,
        });
      }
    } catch (err) {
      // If validation details exist from backend
      if (err.details && Array.isArray(err.details)) {
        const fieldErrors = {};
        err.details.forEach((d) => {
          if (d.field) fieldErrors[d.field] = d.message;
        });
        setErrors(fieldErrors);
        setGeneralError(err.message || "Validation failed.");
      } else if (err.code === "EMAIL_ALREADY_EXISTS" || err.status === 409) {
        setErrors({ email: "An account with this email address already exists." });
        setGeneralError("An account with this email address already exists. Please sign in instead.");
      } else if (err.status >= 500) {
        setGeneralError("An unexpected server error occurred. Please try again later.");
      } else {
        setGeneralError(err.message || "Authentication request failed.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !submitting) {
      closeAuthModal();
    }
  };

  const handleOAuthClick = () => {
    window.location.href = api.getGitHubAuthUrl();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        className="modal-container"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <div className="modal-header">
          <div>
            <h2 id="auth-modal-title" className="modal-title">
              {isRegister ? "Create an account" : "Sign in to OpenOrbit"}
            </h2>
            <p className="modal-subtitle">
              {isRegister
                ? "Join to discover issues, plan contributions, and track progress."
                : "Welcome back! Enter your credentials to access your session."}
            </p>
          </div>
          <button
            type="button"
            className="icon-btn modal-close-btn"
            onClick={closeAuthModal}
            disabled={submitting}
            aria-label="Close dialog"
            title="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        {generalError && (
          <div className="auth-error-banner" role="alert">
            <Icon name="alert" size={16} />
            <span>{generalError}</span>
          </div>
        )}

        <div className="oauth-section">
          <Button
            type="button"
            variant="secondary"
            className="btn-oauth"
            onClick={handleOAuthClick}
            disabled={submitting}
          >
            <Icon name="github" size={18} />
            <span>Continue with GitHub</span>
          </Button>
        </div>

        <div className="auth-divider" role="separator" aria-label="Or">
          <span>or continue with email</span>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          {isRegister && (
            <Input
              id="auth-name"
              label="Full Name"
              type="text"
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={errors.name}
              disabled={submitting}
              ref={firstInputRef}
              required
            />
          )}

          <Input
            id="auth-email"
            label="Email Address"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            disabled={submitting}
            ref={!isRegister ? firstInputRef : undefined}
            required
          />

          <Input
            id="auth-password"
            label="Password"
            type="password"
            placeholder={isRegister ? "At least 8 chars (letters & numbers)" : "••••••••"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            disabled={submitting}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="auth-submit-btn"
            isLoading={submitting}
            disabled={submitting}
          >
            {isRegister ? "Create Account" : "Sign In"}
          </Button>
        </form>

        <div className="modal-footer">
          {isRegister ? (
            <p className="modal-footer-text">
              Already have an account?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => openAuthModal("login")}
                disabled={submitting}
              >
                Sign in
              </button>
            </p>
          ) : (
            <p className="modal-footer-text">
              Don't have an account?{" "}
              <button
                type="button"
                className="link-button"
                onClick={() => openAuthModal("register")}
                disabled={submitting}
              >
                Sign up
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
