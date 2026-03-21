"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styles from "@/components/ui/glass-icons.module.css";

/** Shared cyan → blue tile backing — dim, semi-transparent (used when item.color is `cyan`). */
export const GLASS_ICON_CYAN_GRADIENT =
  "linear-gradient(145deg, hsla(190, 53.80%, 50.80%, 0.50), hsla(210, 70.00%, 43.10%, 0.48))";

const DIM_NEUTRAL_TILE = "linear-gradient(hsl(240, 10%, 42%), hsl(240, 10%, 28%))";

export type GlassIconItem = {
  icon: ReactNode;
  color: string;
  label: string;
  customClass?: string;
  /** When set, renders as Next.js navigation link */
  href?: string;
  active?: boolean;
};

type GlassIconsProps = {
  items: GlassIconItem[];
  className?: string;
  colorful?: boolean;
  /** 4 = four columns (e.g. 2×4 grid for eight items) */
  columns?: 2 | 3 | 4;
  /** Smaller tiles for narrow drawers */
  compact?: boolean;
  onItemClick?: () => void;
};

export default function GlassIcons({
  items,
  className,
  colorful = true,
  columns,
  compact = false,
  onItemClick,
}: GlassIconsProps) {
  /** Preset `cyan` = app nav tiles; any other string is used as a raw CSS background (e.g. hex or gradient). */
  const getBackgroundStyle = (color: string) => {
    if (color === "cyan") {
      return { background: colorful ? GLASS_ICON_CYAN_GRADIENT : DIM_NEUTRAL_TILE };
    }
    return { background: color };
  };

  const gridClass =
    columns === 4 ? styles.iconBtnsCols4 : "";

  const rootClass = [
    styles.iconBtns,
    gridClass,
    compact ? styles.iconBtnsCompact : "",
    className || "",
  ]
    .filter(Boolean)
    .join(" ");

  const renderTile = (item: GlassIconItem, index: number) => {
    const btnClass = [
      styles.iconBtn,
      item.active ? styles.iconBtnActive : "",
      item.customClass || "",
    ]
      .filter(Boolean)
      .join(" ");

    const inner = (
      <>
        <span className={styles.iconBtnBack} style={getBackgroundStyle(item.color)} />
        <span className={styles.iconBtnFront}>
          <span className={styles.iconBtnIcon} aria-hidden="true">
            {item.icon}
          </span>
        </span>
        <span className={styles.iconBtnLabel}>{item.label}</span>
      </>
    );

    if (item.href) {
      return (
        <Link
          key={`${item.label}-${index}`}
          href={item.href}
          className={btnClass}
          aria-label={item.label}
          onClick={onItemClick}
          prefetch
        >
          {inner}
        </Link>
      );
    }

    return (
      <button key={`${item.label}-${index}`} type="button" className={btnClass} aria-label={item.label} onClick={onItemClick}>
        {inner}
      </button>
    );
  };

  return <div className={rootClass}>{items.map(renderTile)}</div>;
}
