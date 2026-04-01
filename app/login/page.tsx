"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./login.module.css";
import { readApiError } from "../../lib/apiClient";
import { clearLogoutPending, getSession, setSession, DEMO_EMAIL, DEMO_PASSWORD, DEMO_NAME } from "../../lib/auth";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "">("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (getSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setError("");
    setLoading(true);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.user) {
        // DB may be down — allow admin account to bypass
        if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
          setSession({ email: DEMO_EMAIL, name: DEMO_NAME, isDemo: true }, rememberMe);
          router.replace("/dashboard");
          return;
        }
        setError(payload?.error ?? "Unable to log in.");
        setLoading(false);
        return;
      }

      setSession({
        userId: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        isDemo: false,
      }, rememberMe);

      setLoading(false);
      router.replace("/dashboard");
    } catch {
      // Network completely down — allow admin account to bypass
      if (normalizedEmail === DEMO_EMAIL && password === DEMO_PASSWORD) {
        setSession({ email: DEMO_EMAIL, name: DEMO_NAME, isDemo: true }, rememberMe);
        router.replace("/dashboard");
        return;
      }
      setError("Unable to log in right now. Please try again.");
      setLoading(false);
    }
  }

  async function handleOAuthLogin(provider: "google") {
    setError("");
    setOauthLoading(provider);
    clearLogoutPending();
    await signIn(provider, { callbackUrl: "/dashboard" }, { prompt: "select_account" });
    setOauthLoading("");
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.logo}>L</div>
          <span className={styles.brandName}>Lunivo</span>
        </div>

        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your account to continue</p>

        {error && (
          <div className={styles.errorBanner} role="alert">
            <ErrorIcon />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.field}>
            <label htmlFor="login-email" className={styles.label}>
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(""); }}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className={styles.field}>
            <div className={styles.labelRow}>
              <label htmlFor="login-password" className={styles.label}>
                Password
              </label>
              <span className={styles.forgotLink}>Forgot password?</span>
            </div>
            <div className={styles.inputWrapper}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className={styles.input}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.rememberRow}>
              <input
                type="checkbox"
                className={styles.checkbox}
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className={styles.rememberLabel}>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Sign in"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or continue with</span>
        </div>

        <div className={styles.oauthGrid}>
          <button
            type="button"
            className={styles.oauthBtn}
            onClick={() => handleOAuthLogin("google")}
            disabled={loading || oauthLoading !== ""}
          >
            <GoogleIcon />
            {oauthLoading === "google" ? "Connecting..." : "Sign in with Google"}
          </button>
        </div>

        <p className={styles.switchText}>
          Don&apos;t have an account?{" "}
          <Link href="/register" className={styles.switchLink}>Create one</Link>
        </p>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-4.803m5.596-3.856a3.375 3.375 0 11-4.753 4.753m7.228-1.803a21.042 21.042 0 015.25 5.103m-2.025 2.25a10.08 10.08 0 01-14.794-3.55m12.081-12.402a15.063 15.063 0 012.318 1.979M9.5 9.5L3 3m6 6l-6-6" />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.24-.96 2.3-2.04 3.01l3.3 2.56c1.92-1.77 3.04-4.38 3.04-7.47 0-.7-.06-1.37-.18-2H12z"/>
      <path fill="#34A853" d="M12 22c2.76 0 5.08-.91 6.78-2.47l-3.3-2.56c-.91.61-2.08.98-3.48.98-2.67 0-4.93-1.8-5.74-4.22l-3.41 2.64A10 10 0 0 0 12 22z"/>
      <path fill="#4A90E2" d="M6.26 13.73A6.01 6.01 0 0 1 6 12c0-.6.1-1.17.26-1.73l-3.41-2.64A10 10 0 0 0 2 12c0 1.6.38 3.11 1.05 4.37l3.21-2.64z"/>
      <path fill="#FBBC05" d="M12 6.05c1.5 0 2.84.52 3.9 1.54l2.93-2.93C17.07 2.99 14.76 2 12 2A10 10 0 0 0 3.05 7.63l3.41 2.64C7.07 7.85 9.33 6.05 12 6.05z"/>
    </svg>
  );
}
