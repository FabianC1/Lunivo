"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import styles from "./IconPopoverButton.module.css";

interface IconPopoverButtonProps {
  icon: "filter" | "sort";
  label: string;
  title?: string;
  active?: boolean;
  children: ReactNode;
}

export default function IconPopoverButton({
  icon,
  label,
  title,
  active = false,
  children,
}: IconPopoverButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  function renderIcon() {
    if (icon === "sort") {
      return (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 3.25V12.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M2.5 4.75L4 3.25L5.5 4.75" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 12.75V3.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <path d="M10.5 11.25L12 12.75L13.5 11.25" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    }

    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2.25 3.25H13.75L9.5 8.1V12.25L6.5 13.75V8.1L2.25 3.25Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <div className={styles.iconControl} ref={rootRef}>
      <button
        type="button"
        className={`${styles.iconButton} ${active || isOpen ? styles.iconButtonActive : ""}`}
        onClick={() => setIsOpen((open) => !open)}
        aria-label={label}
        title={title ?? label}
      >
        {renderIcon()}
      </button>
      {isOpen && <div className={styles.popoverMenu}>{children}</div>}
    </div>
  );
}