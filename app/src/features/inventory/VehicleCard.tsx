import { Link, useLocation } from "react-router-dom";
import { ConditionRating } from "../../components/ConditionRating";
import { VehicleImage } from "../../components/VehicleImage";
import type {
  AuctionTiming,
  SettledAuctionOutcome,
} from "../../domain/auction/auctionLifecycle";
import {
  getAuctionDisplayForLifecycle,
  getReserveStatusLabel,
  hasDeferredBuyerActivity,
} from "../../domain/auction/selectors";
import { isBuyNowAvailable } from "../../domain/auction/buyNow";
import type { Vehicle } from "../../domain/vehicle/types";
import {
  formatBidCount,
  formatCad,
  formatCountdown,
  formatDisplayValue,
  formatOdometer,
} from "../../lib/format";
import { useAuction } from "../../state/useAuction";
import styles from "./Inventory.module.css";

interface VehicleCardProps {
  readonly vehicle: Vehicle;
}

function getOutcomeLabel(outcome: SettledAuctionOutcome | null): string {
  switch (outcome) {
    case "buyer-purchased":
      return "Bought with Buy It Now";
    case "buyer-won":
      return "You won";
    case "competitor-won":
      return "Sold";
    case "no-sale":
    case "no-bids":
      return "No sale";
    case null:
      return "Ended";
  }
}

function getTimingLabel(
  timing: AuctionTiming,
  clockStatus: "paused" | "running",
): string {
  if (timing.lifecycle === "closed") {
    return `Ended · ${getOutcomeLabel(timing.outcome)}`;
  }

  const action = timing.lifecycle === "upcoming" ? "Starts" : "Ends";
  const state =
    clockStatus === "paused"
      ? "Paused"
      : timing.lifecycle === "upcoming"
        ? "Upcoming"
        : "Open";

  return `${state} · ${action} in ${formatCountdown(timing.remainingMs)}`;
}

export function VehicleCard({ vehicle }: VehicleCardProps) {
  const location = useLocation();
  const { clock, getOverlay, getTiming } = useAuction();
  const overlay = getOverlay(vehicle);
  const timing = getTiming(vehicle);
  const auction = getAuctionDisplayForLifecycle(
    vehicle,
    overlay,
    timing.lifecycle,
  );
  const hasSavedActivity = hasDeferredBuyerActivity(
    overlay,
    timing.lifecycle,
  );
  const identity = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const formattedPrice = formatCad(
    auction.purchasePrice ?? auction.publicPrice,
  );
  const priceLabel = auction.purchasePrice !== null
    ? "Purchase price"
    : timing.lifecycle === "closed" && overlay.publicPrice !== null
      ? "Final bid"
      : auction.priceLabel;

  return (
    <article className={styles.card}>
      <Link
        className={styles.cardLink}
        to={`/vehicles/${vehicle.id}`}
        state={{ from: `${location.pathname}${location.search}` }}
        aria-label={`View ${identity}, ${vehicle.trim}, lot ${vehicle.lot}`}
      >
        <figure className={styles.cardMedia}>
          <VehicleImage
            src={vehicle.images[0]}
            alt={`${identity}, lot ${vehicle.lot}`}
            className={styles.cardImage}
          />
          <span
            className={styles.timingBadge}
            data-lifecycle={timing.lifecycle}
            data-outcome={timing.outcome ?? undefined}
          >
            {getTimingLabel(timing, clock.status)}
          </span>
          <ConditionRating
            value={vehicle.conditionGrade}
            ariaLabel={`Condition grade for ${identity}`}
            className={styles.conditionBadge}
            showValue={false}
            variant="compact"
          />
          <span
            className={styles.titleStatusBadge}
            data-status={vehicle.titleStatus}
          >
            {formatDisplayValue(vehicle.titleStatus)} title
          </span>
          <div className={styles.cardPriceOverlay}>
            <span className={styles.cardPriceLabel}>{priceLabel}</span>
            <strong className={styles.cardPrice}>{formattedPrice}</strong>
          </div>
        </figure>

        <div className={styles.cardBody}>
          <p className={styles.eyebrow}>Lot {vehicle.lot}</p>
          <h2 className={styles.cardTitle}>{identity}</h2>
          <p className={styles.trim}>{vehicle.trim}</p>

          <dl className={styles.cardFacts}>
            <div>
              <dt>Odometer</dt>
              <dd>{formatOdometer(vehicle.odometerKm)}</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>
                {vehicle.city}, {vehicle.province}
              </dd>
            </div>
          </dl>

          <p className={styles.dealership}>{vehicle.sellingDealership}</p>
          <div className={styles.auctionMeta}>
            <span>{formatBidCount(auction.bidCount)}</span>
            <span
              className={styles.reserveStatus}
              data-status={auction.reserveStatus}
            >
              {getReserveStatusLabel(auction.reserveStatus)}
            </span>
            {timing.lifecycle === "open" &&
            vehicle.buyNowPrice !== null &&
            isBuyNowAvailable(vehicle, overlay) ? (
              <span className={styles.buyNowPrice}>
                Buy now {formatCad(vehicle.buyNowPrice)}
              </span>
            ) : null}
            {timing.lifecycle === "closed" ? (
              <strong
                className={styles.buyerLeading}
                data-outcome={timing.outcome ?? undefined}
              >
                {getOutcomeLabel(timing.outcome)}
              </strong>
            ) : hasSavedActivity ? (
              <strong className={styles.buyerLeading}>
                Saved maximum resumes at start
              </strong>
            ) : auction.isBuyerLeading ? (
              <strong className={styles.buyerLeading}>You’re leading</strong>
            ) : null}
          </div>
        </div>
      </Link>
    </article>
  );
}
