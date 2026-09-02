import { useState } from "react";
import {
  getAuctionDisplayForLifecycle,
  getReserveStatusLabel,
  hasDeferredBuyerActivity,
} from "../../domain/auction/selectors";
import { isBuyNowAvailable } from "../../domain/auction/buyNow";
import type { SettledAuctionOutcome } from "../../domain/auction/auctionLifecycle";
import type { Vehicle } from "../../domain/vehicle/types";
import {
  formatBidCount,
  formatCad,
  formatCountdown,
  formatLocalDateTime,
} from "../../lib/format";
import { useAuction } from "../../state/useAuction";
import styles from "./AuctionPanel.module.css";
import { BuyNowAction } from "./BuyNowAction";
import { MaximumBidForm } from "./MaximumBidForm";

interface AuctionPanelProps {
  readonly vehicle: Vehicle;
}

function getClosedResult(
  outcome: SettledAuctionOutcome | null,
  displayedPrice: number,
): { readonly heading: string; readonly detail: string } {
  switch (outcome) {
    case "buyer-purchased":
      return {
        heading: "Buy It Now confirmed.",
        detail: `Purchase price ${formatCad(displayedPrice)}. Checkout and payment are not included in this prototype.`,
      };
    case "buyer-won":
      return {
        heading: "You won this auction.",
        detail: `Winning bid ${formatCad(displayedPrice)}.`,
      };
    case "competitor-won":
      return {
        heading: "Sold to another bidder.",
        detail: `Final bid ${formatCad(displayedPrice)}.`,
      };
    case "no-sale":
      return {
        heading: "Auction ended without a sale.",
        detail: "The reserve was not met.",
      };
    case "no-bids":
    case null:
      return {
        heading: "Auction ended without a sale.",
        detail: "No maximum bids were submitted.",
      };
  }
}

export function AuctionPanel({ vehicle }: AuctionPanelProps) {
  const [isBuyNowConfirming, setIsBuyNowConfirming] = useState(false);
  const [isMaximumConfirming, setIsMaximumConfirming] = useState(false);
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
  const displayedPrice = auction.purchasePrice ?? auction.publicPrice;
  const closedResult = getClosedResult(timing.outcome, displayedPrice);
  const priceLabel = auction.purchasePrice !== null
    ? "Purchase price"
    : timing.lifecycle === "closed" && overlay.publicPrice !== null
      ? "Final bid"
      : auction.priceLabel;
  const buyNowAvailable =
    timing.lifecycle === "open" && isBuyNowAvailable(vehicle, overlay);

  return (
    <section className={styles.panel} aria-labelledby="auction-heading">
      <div className={styles.headingRow}>
        <div>
          <p className={styles.kicker}>Public auction</p>
          <h2 id="auction-heading">Auction</h2>
        </div>
        <span
          className={styles.reserveStatus}
          data-status={auction.reserveStatus}
        >
          {getReserveStatusLabel(auction.reserveStatus)}
        </span>
      </div>

      {timing.lifecycle === "closed" ? (
        <div
          className={styles.resultBanner}
          data-outcome={timing.outcome ?? undefined}
          role="status"
        >
          <strong>{closedResult.heading}</strong>
          <span>{closedResult.detail}</span>
        </div>
      ) : (
        <div className={styles.timingBlock}>
          <span>
            {timing.lifecycle === "upcoming"
              ? "Auction starts in"
              : "Auction ends in"}
          </span>
          <strong>{formatCountdown(timing.remainingMs)}</strong>
          {clock.status === "paused" ? <small>Demo time is paused</small> : null}
        </div>
      )}

      <div className={styles.priceBlock}>
        <span>{priceLabel}</span>
        <strong>{formatCad(displayedPrice)}</strong>
        <p>
          {auction.purchasePrice === null
            ? formatBidCount(auction.bidCount)
            : "Buy It Now"}
        </p>
      </div>

      {auction.purchasePrice === null ? null : (
        <div className={styles.priorBidState}>
          <span>{auction.priceLabel} before purchase</span>
          <strong>{formatCad(auction.publicPrice)}</strong>
          <small>{formatBidCount(auction.bidCount)}</small>
        </div>
      )}

      {timing.lifecycle === "open" && auction.isBuyerLeading ? (
        <p className={styles.leadingStatus}>You’re currently leading</p>
      ) : null}

      {auction.buyerMax === null ? null : (
        <div className={styles.buyerMaximum}>
          <span>{hasSavedActivity ? "Your saved maximum" : "Your maximum"}</span>
          <strong>{formatCad(auction.buyerMax)}</strong>
          <small>
            {hasSavedActivity
              ? "Saved on this device; resumes when the auction starts"
              : "Private maximum; public bid shown above"}
          </small>
        </div>
      )}

      {isMaximumConfirming ? null : (
        <BuyNowAction
          vehicle={vehicle}
          overlay={overlay}
          isAuctionOpen={timing.lifecycle === "open"}
          onConfirmingChange={setIsBuyNowConfirming}
        />
      )}

      {timing.lifecycle === "open" ? (
        <div hidden={isBuyNowConfirming}>
          {!buyNowAvailable ? null : (
            <p className={styles.bidDivider}>or place a maximum bid</p>
          )}
          <MaximumBidForm
            vehicle={vehicle}
            overlay={overlay}
            onConfirmingChange={setIsMaximumConfirming}
          />
        </div>
      ) : (
        <p className={styles.closedBidding}>
          {timing.lifecycle === "upcoming"
            ? hasSavedActivity
              ? "Bidding is unavailable until this auction starts. Your saved maximum will resume then."
              : "Bidding is unavailable until this auction starts."
            : timing.outcome === "buyer-purchased"
            ? "This local demo purchase is complete. Bidding is closed."
            : "Maximum bids are no longer accepted."}
        </p>
      )}

      <dl className={styles.meta}>
        <div>
          <dt>Lot</dt>
          <dd>{vehicle.lot}</dd>
        </div>
        <div>
          <dt>Start</dt>
          <dd>
            <time dateTime={new Date(timing.startTimeMs).toISOString()}>
              {formatLocalDateTime(timing.startTimeMs)}
            </time>
          </dd>
        </div>
        <div>
          <dt>End</dt>
          <dd>
            <time dateTime={new Date(timing.endTimeMs).toISOString()}>
              {formatLocalDateTime(timing.endTimeMs)}
            </time>
          </dd>
        </div>
      </dl>

      <p className={styles.scheduleNote}>
        {timing.outcome === "buyer-purchased"
          ? "Buy It Now ended this auction before its scheduled end. Times are shown in your system time zone."
          : "Times are shown in your system time zone and follow the controllable demo clock."}
      </p>
    </section>
  );
}
