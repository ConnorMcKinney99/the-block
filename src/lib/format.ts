const cadFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "CAD",
  currencyDisplay: "symbol",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-CA");

const gradeFormatter = new Intl.NumberFormat("en-CA", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-CA", {
  dateStyle: "medium",
  timeStyle: "short",
});

const preservedLabels = new Map([
  ["4wd", "4WD"],
  ["awd", "AWD"],
  ["cvt", "CVT"],
  ["fwd", "FWD"],
  ["rwd", "RWD"],
  ["suv", "SUV"],
]);

export function formatCad(value: number): string {
  return cadFormatter.format(value);
}

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

export function formatOdometer(value: number): string {
  return `${formatNumber(value)} km`;
}

export function formatConditionGrade(value: number): string {
  return `${gradeFormatter.format(value)}/5`;
}

export function formatDisplayValue(value: string): string {
  const normalized = value.toLocaleLowerCase("en-CA");
  const preserved = preservedLabels.get(normalized);

  if (preserved !== undefined) {
    return preserved;
  }

  return value.replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("en-CA"));
}

export function formatLocalDateTime(valueMs: number): string {
  return dateTimeFormatter.format(new Date(valueMs));
}

export function formatBidCount(value: number): string {
  return `${formatNumber(value)} ${value === 1 ? "bid" : "bids"}`;
}

function getWholeSeconds(valueMs: number, rounding: "ceil" | "floor"): number {
  const safeValue = Number.isFinite(valueMs) ? Math.max(0, valueMs) : 0;
  return Math[rounding](safeValue / 1_000);
}

export function formatCountdown(valueMs: number): string {
  const totalSeconds = getWholeSeconds(valueMs, "ceil");
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds}s`;
}

export function formatDemoElapsed(valueMs: number): string {
  const totalSeconds = getWholeSeconds(valueMs, "floor");
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}
