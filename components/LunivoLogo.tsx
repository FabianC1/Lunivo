import { useId } from "react";
import styles from "./LunivoLogo.module.css";
import { useTheme } from "./ThemeProvider";
import type { ThemePreset } from "../lib/userSettings";

type LunivoLogoProps = {
  className?: string;
  size?: "nav" | "auth" | "compact";
  showTagline?: boolean;
  variant?: "auto" | "darkmode" | "aurora" | "ember";
};

type LogoVariant = "darkmode" | "aurora" | "ember";

function hexToHue(value: string) {
  const normalized = value.trim().replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return null;
  }

  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  if (delta === 0) {
    return null;
  }

  let hue = 0;
  if (max === red) {
    hue = ((green - blue) / delta) % 6;
  } else if (max === green) {
    hue = ((blue - red) / delta) + 2;
  } else {
    hue = ((red - green) / delta) + 4;
  }

  const degrees = Math.round(hue * 60);
  return degrees < 0 ? degrees + 360 : degrees;
}

function isBetween(hue: number | null, min: number, max: number) {
  if (hue === null) {
    return false;
  }

  if (min <= max) {
    return hue >= min && hue <= max;
  }

  return hue >= min || hue <= max;
}

function resolveAutoVariant(themePreset: ThemePreset): LogoVariant {
  const builtInVariantMap: Record<string, LogoVariant> = {
    light: "darkmode",
    sage: "darkmode",
    ocean: "aurora",
    rose: "ember",
    amber: "ember",
    dark: "darkmode",
    graphite: "darkmode",
    aurora: "aurora",
    ember: "ember",
    "mint-night": "aurora",
    "violet-night": "darkmode",
    "forest-night": "darkmode",
  };

  if (builtInVariantMap[themePreset.id]) {
    return builtInVariantMap[themePreset.id];
  }

  const accentHue = hexToHue(themePreset.colors.accentColor);
  const primaryHue = hexToHue(themePreset.colors.primaryColor);
  const highlightHue = hexToHue(themePreset.colors.highlightColor);

  const looksAurora = isBetween(accentHue, 170, 260)
    || isBetween(primaryHue, 170, 240)
    || isBetween(highlightHue, 170, 220);
  const looksEmber = isBetween(accentHue, 330, 30)
    || isBetween(highlightHue, 0, 70)
    || isBetween(primaryHue, 10, 40);

  if (looksAurora) {
    return "aurora";
  }

  if (looksEmber) {
    return "ember";
  }

  return "darkmode";
}

function getVariantColors(variant: LogoVariant) {
  switch (variant) {
    case "darkmode":
      return {
        start: "#0C1D3D",
        mid: null,
        end: "#2D1B3D",
        barsStart: "#CBD5E1",
        barsEnd: "#94A3B8",
      };
    case "aurora":
      return {
        start: "#0F172A",
        mid: "#1D4ED8",
        end: "#14B8A6",
        barsStart: "#0F172A",
        barsEnd: "#1E293B",
      };
    case "ember":
      return {
        start: "#111827",
        mid: "#312E81",
        end: "#F97316",
        barsStart: "#CBD5E1",
        barsEnd: "#94A3B8",
      };
  }
}

export default function LunivoLogo({
  className = "",
  size = "nav",
  showTagline = true,
  variant = "auto",
}: LunivoLogoProps) {
  const { activeThemePreset } = useTheme();
  const uniqueId = useId().replace(/:/g, "");
  const classes = [styles.brand, className].filter(Boolean).join(" ");
  const resolvedVariant = variant === "auto" ? resolveAutoVariant(activeThemePreset) : variant;
  const colors = getVariantColors(resolvedVariant);
  const orbitGradientId = `lunivo-orbit-${resolvedVariant}-${uniqueId}`;
  const barsGradientId = `lunivo-bars-${resolvedVariant}-${uniqueId}`;

  return (
    <span className={classes} data-size={size}>
      <svg viewBox="0 0 64 64" aria-hidden="true" className={styles.mark}>
        <defs>
          <linearGradient id={orbitGradientId} x1="10%" y1="10%" x2="90%" y2="90%">
            <stop offset="0%" stopColor={colors.start} />
            {colors.mid ? <stop offset="55%" stopColor={colors.mid} /> : null}
            <stop offset="100%" stopColor={colors.end} />
          </linearGradient>
          <linearGradient id={barsGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colors.barsStart} stopOpacity="0.88" />
            <stop offset="100%" stopColor={colors.barsEnd} stopOpacity="0.98" />
          </linearGradient>
        </defs>

  <rect x="4" y="4" width="56" height="56" rx="18" fill={`url(#${orbitGradientId})`} />
        <path d="M21 14c-6.6 3.5-11 10.4-11 18.4C10 44.3 19.7 54 31.6 54c7.7 0 14.5-4.1 18.2-10.2-3.1 2-6.8 3.2-10.8 3.2-11 0-20-8.9-20-20 0-4.7 1.7-9.1 4.4-12.6C22.6 14.1 21.8 13.9 21 14Z" fill="#F8FAFC" fillOpacity="0.95" />
        <rect x="23" y="31" width="6.5" height="12" rx="3.25" fill={`url(#${barsGradientId})`} />
        <rect x="31.5" y="25" width="6.5" height="18" rx="3.25" fill={`url(#${barsGradientId})`} />
        <rect x="40" y="19" width="6.5" height="24" rx="3.25" fill={`url(#${barsGradientId})`} />
      </svg>
      <span className={styles.wordmark}>
        <span className={styles.name}>Lunivo</span>
        {showTagline ? <span className={styles.tag}>Money in orbit</span> : null}
      </span>
    </span>
  );
}