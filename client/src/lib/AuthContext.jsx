import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { api, ApiError } from "./apiClient.js";
import { AuthContext } from "./authContext.js";

function extractAndCleanOAuthParams() {
  if (typeof window === "undefined") {
    return { successType: null, errorCode: null, errorMessage: null, githubLinked: false };
  }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hasAuthSuccess = urlParams.has("auth_success");
    const hasAuthError = urlParams.has("auth_error");
    const hasGithubLinked = urlParams.has("github_linked");

    if (hasAuthSuccess || hasAuthError || hasGithubLinked) {
      const result = {
        successType: urlParams.get("auth_success"),
        errorCode: urlParams.get("auth_error"),
        errorMessage: urlParams.get("message"),
        githubLinked: urlParams.get("github_linked") === "true",
      };
      urlParams.delete("auth_success");
      urlParams.delete("auth_error");
      urlParams.delete("message");
      urlParams.delete("github_linked");

      const remainingSearch = urlParams.toString();
      const cleanUrl = `${window.location.pathname}${remainingSearch ? `?${remainingSearch}` : ""}${window.location.hash}`;
      window.history.replaceState({}, document.title, cleanUrl);
      return result;
    }
  } catch {
    // fallback
  }
  return { successType: null, errorCode: null, errorMessage: null, githubLinked: false };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authNotice, setAuthNotice] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState("login"); // 'login' | 'register'

  // Hold any initial OAuth URL parameters across StrictMode remounts without ref-in-render issues
  const [oauthParams] = useState(extractAndCleanOAuthParams);

  // Ref to hold active in-flight session verification promise across StrictMode remounts
  const sessionPromiseRef = useRef(null);

  const clearAuthError = useCallback(() => setAuthError(null), []);
  const clearAuthNotice = useCallback(() => setAuthNotice(null), []);

  const openAuthModal = useCallback((mode = "login") => {
    setAuthModalMode(mode === "register" ? "register" : "login");
    setAuthError(null);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    setAuthError(null);
  }, []);

  /**
   * Refreshes user session by querying /api/v1/auth/me
   */
  const refreshSession = useCallback(async () => {
    try {
      const response = await api.getMe();
      const currentUser = response?.data?.user || null;
      setUser(currentUser);
      return currentUser;
    } catch (err) {
      // 401/403 or network failure means no active session
      setUser(null);
      if (err instanceof ApiError && err.status !== 401) {
        console.warn("Session refresh warning:", err.message);
      }
      return null;
    }
  }, []);

  /**
   * Application startup & OAuth callback inspection
   */
  useEffect(() => {
    let isCurrent = true;

    // 1. Process OAuth error if present
    const { successType, errorCode, errorMessage, githubLinked } = oauthParams || {};
    if (errorCode) {
      const fullError = errorMessage ? `${errorCode}: ${errorMessage}` : errorCode;
      setAuthError(`GitHub authentication failed (${fullError})`);
    }

    // 2. Fetch or reuse startup session verification promise
    if (!sessionPromiseRef.current) {
      sessionPromiseRef.current = api.getMe();
    }

    sessionPromiseRef.current
      .then((response) => {
        if (!isCurrent) return;
        const currentUser = response?.data?.user || null;
        setUser(currentUser);
        if (githubLinked && currentUser) {
          setAuthNotice("Your GitHub account has been connected successfully!");
        } else if (successType && currentUser) {
          setAuthNotice(
            successType === "registered"
              ? "Account created and connected with GitHub successfully!"
              : "Welcome back! Signed in with GitHub successfully."
          );
        }
      })
      .catch(() => {
        if (!isCurrent) return;
        setUser(null);
        if (successType || githubLinked) {
          setAuthError("GitHub authorization succeeded, but could not establish an active session.");
        }
      })
      .finally(() => {
        if (!isCurrent) return;
        setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [oauthParams]);

  /**
   * Local login (email, password)
   */
  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    try {
      const res = await api.login({ email, password });
      const loggedInUser = res?.data?.user;
      setUser(loggedInUser);
      setIsAuthModalOpen(false);
      return loggedInUser;
    } catch (err) {
      const message =
        err.status >= 500
          ? "An unexpected server error occurred. Please try again later."
          : err.message || "Failed to sign in. Please verify your credentials.";
      setAuthError(message);
      throw err;
    }
  }, []);

  /**
   * Local registration (name, email, password)
   */
  const register = useCallback(async ({ name, email, password }) => {
    setAuthError(null);
    try {
      const res = await api.register({ name, email, password });
      const registeredUser = res?.data?.user;
      setUser(registeredUser);
      setIsAuthModalOpen(false);
      return registeredUser;
    } catch (err) {
      const message =
        err.code === "EMAIL_ALREADY_EXISTS" || err.status === 409
          ? "An account with this email address already exists. Please sign in instead."
          : err.status >= 500
            ? "An unexpected server error occurred. Please try again later."
            : err.message || "Failed to register. Please check your details.";
      setAuthError(message);
      throw err;
    }
  }, []);

  /**
   * Reauthenticate using password to acquire reauth ticket for linking
   */
  const reauthenticate = useCallback(async (password) => {
    setAuthError(null);
    const res = await api.reauthenticate({ password });
    return res?.data?.ticket;
  }, []);

  /**
   * Disconnect linked GitHub account
   */
  const unlinkGitHub = useCallback(async () => {
    setAuthError(null);
    try {
      const res = await api.unlinkGitHub();
      const updatedUser = res?.data?.user;
      setUser(updatedUser);
      setAuthNotice("GitHub account disconnected successfully.");
      return updatedUser;
    } catch (err) {
      const message = err.message || "Failed to disconnect GitHub account.";
      setAuthError(message);
      throw err;
    }
  }, []);

  /**
   * Logout
   */
  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn("Backend logout failed or session already expired:", err.message);
    } finally {
      setUser(null);
      setAuthNotice(null);
      setAuthError(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      authError,
      authNotice,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      reauthenticate,
      unlinkGitHub,
      logout,
      refreshSession,
      clearAuthError,
      clearAuthNotice,
    }),
    [
      user,
      loading,
      authError,
      authNotice,
      isAuthModalOpen,
      authModalMode,
      openAuthModal,
      closeAuthModal,
      login,
      register,
      reauthenticate,
      unlinkGitHub,
      logout,
      refreshSession,
      clearAuthError,
      clearAuthNotice,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
