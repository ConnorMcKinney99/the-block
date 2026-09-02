import { useState } from "react";
import styles from "./VehicleImage.module.css";

interface VehicleImageProps {
  readonly src: string | undefined;
  readonly alt: string;
  readonly loading?: "eager" | "lazy";
  readonly className?: string;
}

export function VehicleImage({
  src,
  alt,
  loading = "lazy",
  className = "",
}: VehicleImageProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    src === undefined ? "error" : "loading",
  );

  const frameClassName = [styles.frame, className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={frameClassName} data-image-status={status}>
      <div
        className={styles.fallback}
        role={status === "error" && alt !== "" ? "img" : undefined}
        aria-label={
          status === "error" && alt !== ""
            ? `${alt}. Image unavailable.`
            : undefined
        }
        aria-hidden={status !== "error" || alt === ""}
      >
        <span className={styles.fallbackMark}>THE BLOCK</span>
        <span className={styles.fallbackText}>
          {status === "error" ? "Image unavailable" : "Loading vehicle photo"}
        </span>
      </div>

      {src !== undefined && status !== "error" ? (
        <img
          className={styles.image}
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
        />
      ) : null}
    </div>
  );
}
