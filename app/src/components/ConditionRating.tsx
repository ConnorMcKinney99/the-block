import { formatConditionGrade } from "../lib/format";
import styles from "./ConditionRating.module.css";

interface ConditionRatingProps {
  readonly value: number;
  readonly ariaLabel?: string;
  readonly className?: string;
  readonly showValue?: boolean;
  readonly variant?: "default" | "compact";
}

export function ConditionRating({
  value,
  ariaLabel = "Condition grade",
  className = "",
  showValue = true,
  variant = "default",
}: ConditionRatingProps) {
  const finiteValue = Number.isFinite(value) ? value : 0;
  const boundedValue = Math.min(5, Math.max(0, finiteValue));
  const formattedValue = formatConditionGrade(boundedValue);
  const fillPercentage = `${(boundedValue / 5) * 100}%`;
  const ratingClassName = [styles.rating, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={ratingClassName}
      data-variant={variant}
      role="meter"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={boundedValue}
      aria-valuetext={`${formattedValue.replace("/5", " out of 5")} stars`}
    >
      <span className={styles.stars} aria-hidden="true">
        <span className={styles.emptyStars}>★★★★★</span>
        <span className={styles.filledStars} style={{ width: fillPercentage }}>
          ★★★★★
        </span>
      </span>
      {showValue ? (
        <strong className={styles.value}>{formattedValue}</strong>
      ) : null}
    </div>
  );
}
