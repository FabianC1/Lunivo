"use client";

import styles from "./ChartLegend.module.css";

interface ChartLegendItem {
  label: string;
  color: string;
  hidden?: boolean;
  variant?: "dot" | "line";
}

interface ChartLegendProps {
  items: ChartLegendItem[];
  onToggle: (label: string) => void;
  spacing?: "default" | "relaxed" | "roomy";
}

export default function ChartLegend({ items, onToggle, spacing = "default" }: ChartLegendProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className={[
        styles.legend,
        spacing === "relaxed" ? styles.legendRelaxed : "",
        spacing === "roomy" ? styles.legendRoomy : "",
      ].join(" ").trim()}
    >
      {items.map((item) => (
        <button
          key={item.label}
          type="button"
          className={[styles.legendItem, item.hidden ? styles.legendItemHidden : ""].join(" ").trim()}
          style={{ ["--legend-color" as string]: item.color }}
          onClick={() => onToggle(item.label)}
          aria-pressed={!item.hidden}
          aria-label={`${item.hidden ? "Show" : "Hide"} ${item.label}`}
        >
          <span className={item.variant === "line" ? styles.lineSwatch : styles.dotSwatch} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}