"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "./register.module.css";
import { clearLogoutPending, getSession, setSession } from "../../lib/auth";

function getStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { label: "", color: "" },
    { label: "Very weak", color: "#EF4444" },
    { label: "Weak", color: "#F97316" },
    { label: "Fair", color: "#FBBF24" },
    { label: "Good", color: "#22C55E" },
    { label: "Strong", color: "#10B981" },
  ];
  return { score, ...levels[Math.min(score, 5)] };
}

export default function Register() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "">("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const strength = getStrength(password);

  useEffect(() => {
    if (getSession()) {
      router.replace("/dashboard");
    }
  }, [router]);

  function clearError(key: string) {
    setErrors((prev) => ({ ...prev, [key]: "" }));
  }

  function validate(): Record<string, string> {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = "Full name is required.";
    if (!email.trim()) e.email = "Email address is required.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      e.email = "Enter a valid email address.";
    if (!password) e.password = "Password is required.";
    else if (password.length < 8) e.password = "Password must be at least 8 characters.";
    if (password !== confirmPassword) e.confirmPassword = "Passwords do not match.";
    if (!agreeTerms) e.terms = "You must accept the terms to continue.";
    return e;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate();
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const payload = await response.json();
      if (!response.ok || !payload?.user) {
        setErrors({ email: payload?.error ?? "Unable to create account." });
        setLoading(false);
        return;
      }

      setSession({
        userId: payload.user.id,
        email: payload.user.email,
        name: payload.user.name,
        isDemo: false,
      });

      setLoading(false);
      router.replace("/dashboard");
    } catch {
      setErrors({ email: "Unable to create account right now. Please try again." });
      setLoading(false);
    }
  }

  async function handleOAuthRegister(provider: "google") {
    setErrors({});
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

        <h1 className={styles.title}>Create your account</h1>
        <p className={styles.subtitle}>Start managing your finances for free</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {/* Full name */}
          <div className={styles.field}>
            <label htmlFor="reg-name" className={styles.label}>Full name</label>
            <input
              id="reg-name"
              type="text"
              className={`${styles.input} ${errors.name ? styles.inputError : ""}`}
              value={name}
              onChange={(e) => { setName(e.target.value); clearError("name"); }}
              placeholder="Jane Smith"
              autoComplete="name"
            />
            {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
          </div>

          {/* Email */}
          <div className={styles.field}>
            <label htmlFor="reg-email" className={styles.label}>Email address</label>
            <input
              id="reg-email"
              type="email"
              className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
              value={email}
              onChange={(e) => { setEmail(e.target.value); clearError("email"); }}
              placeholder="you@example.com"
              autoComplete="email"
            />
            {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
          </div>

          {/* Password */}
          <div className={styles.field}>
            <label htmlFor="reg-password" className={styles.label}>Password</label>
            <div className={styles.inputWrapper}>
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                className={`${styles.input} ${errors.password ? styles.inputError : ""}`}
                value={password}
                onChange={(e) => { setPassword(e.target.value); clearError("password"); }}
                placeholder="At least 8 characters"
                autoComplete="new-password"
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
            {password && (
              <div className={styles.strengthRow}>
                <div className={styles.strengthBar}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className={styles.strengthSegment}
                      style={{
                        backgroundColor:
                          i <= strength.score ? strength.color : undefined,
                      }}
                    />
                  ))}
                </div>
                <span className={styles.strengthLabel} style={{ color: strength.color }}>
                  {strength.label}
                </span>
              </div>
            )}
            {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
          </div>

          {/* Confirm password */}
          <div className={styles.field}>
            <label htmlFor="reg-confirm" className={styles.label}>Confirm password</label>
            <div className={styles.inputWrapper}>
              <input
                id="reg-confirm"
                type={showConfirm ? "text" : "password"}
                className={`${styles.input} ${errors.confirmPassword ? styles.inputError : ""}`}
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); clearError("confirmPassword"); }}
                placeholder="Re-enter your password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className={styles.eyeBtn}
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {errors.confirmPassword && (
              <span className={styles.fieldError}>{errors.confirmPassword}</span>
            )}
          </div>

          {/* Terms */}
          <div className={styles.field}>
            <div className={`${styles.checkRow} ${errors.terms ? styles.checkError : ""}`}>
              <input
                id="reg-terms"
                type="checkbox"
                className={styles.checkbox}
                checked={agreeTerms}
                onChange={(e) => { setAgreeTerms(e.target.checked); clearError("terms"); }}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" className={styles.termsLink}>Terms of Service</Link>{" "}and{" "}
                <Link href="/privacy" className={styles.termsLink}>Privacy Policy</Link>
              </span>
            </div>
            {errors.terms && <span className={styles.fieldError}>{errors.terms}</span>}
          </div>

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={loading}
          >
            {loading ? <span className={styles.spinner} /> : "Create account"}
          </button>
        </form>

        <div className={styles.divider}>
          <span>or sign up with</span>
        </div>

        <div className={styles.oauthGrid}>
          <button
            type="button"
            className={styles.oauthBtn}
            onClick={() => handleOAuthRegister("google")}
            disabled={loading || oauthLoading !== ""}
          >
            <GoogleIcon />
            {oauthLoading === "google" ? "Connecting..." : "Sign up with Google"}
          </button>
        </div>

        <p className={styles.switchText}>
          Already have an account?{" "}
          <Link href="/login" className={styles.switchLink}>Sign in</Link>
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
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
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