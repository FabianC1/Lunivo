"use client";

import Image from "next/image";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  buttonClassName: string;
  iconClassName: string;
  iconSize?: number;
}

export default function ThemeToggle({
  buttonClassName,
  iconClassName,
  iconSize = 22,
}: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "light" ? "dark" : "light";
  const iconSrc = nextTheme === "dark" ? "/icons/dark.png" : "/icons/light.png";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={buttonClassName}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      <Image
        src={iconSrc}
        alt=""
        aria-hidden="true"
        width={iconSize}
        height={iconSize}
        className={iconClassName}
      />
    </button>
  );
}