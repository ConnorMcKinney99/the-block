import { useEffect, useId, useRef, useState } from "react";
import { isBuyNowAvailable } from "../../domain/auction/buyNow";
import type { AuctionOverlay } from "../../domain/auction/types";
import type { Vehicle } from "../../domain/vehicle/types";
import { formatCad } from "../../lib/format";
import { useAuction } from "../../state/useAuction";
import styles from "./AuctionPanel.module.css";

interface BuyNowActionProps {
  readonly vehicle: Vehicle;
  readonly overlay: AuctionOverlay;
  readonly isAuctionOpen: boolean;
  readonly onConfirmingChange: (isConfirming: boolean) => void;
}

export function BuyNowAction({
  vehicle,
  overlay,
  isAuctionOpen,
  onConfirmingChange,
}: BuyNowActionProps) {
  const { completeBuyerBuyNow } = useAuction();
  const [isConfirming, setIsConfirming] = useState(false);
  const [status, setStatus] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const shouldFocusTrigger = useRef(false);
  const confirmationHeadingId = useId();
  const buyNowPrice = vehicle.buyNowPrice;
  const identity = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  useEffect(() => {
    if (isConfirming) {
      const dialog = confirmationRef.current;

      if (dialog !== null && !dialog.open) {
        dialog.showModal();
        dialog.focus();
      }
    } else if (shouldFocusTrigger.current) {
      shouldFocusTrigger.current = false;
      triggerRef.current?.focus();
    }
  }, [isConfirming]);

  useEffect(() => {
    if (status !== "") {
      statusRef.current?.focus();
    }
  }, [status]);

  if (buyNowPrice === null) {
    return null;
  }

  function cancelConfirmation() {
    shouldFocusTrigger.current = true;
    setIsConfirming(false);
    onConfirmingChange(false);
  }

  function confirmPurchase() {
    const result = completeBuyerBuyNow(vehicle);

    if (!result.ok) {
      setIsConfirming(false);
      onConfirmingChange(false);
      setStatus(
        result.code === "auction-closed"
          ? "This auction has ended. Buy It Now was not applied."
          : "Buy It Now is no longer available for this vehicle.",
      );
      return;
    }

    setIsConfirming(false);
    onConfirmingChange(false);
    setStatus(
      result.persisted
        ? `Buy It Now confirmed at ${formatCad(result.price)} on this device. This local demo auction is now closed. Checkout and payment are not included.`
        : `Buy It Now confirmed at ${formatCad(result.price)} for this session. Device storage is unavailable, so it may be lost when you refresh. Checkout and payment are not included.`,
    );
  }

  const canConfirm = isAuctionOpen && isBuyNowAvailable(vehicle, overlay);

  if (!canConfirm && status === "") {
    return null;
  }

  return (
    <div className={styles.buyNowSection}>
      {canConfirm ? (
        isConfirming ? (
          <dialog
            ref={confirmationRef}
            className={styles.confirmationDialog}
            aria-labelledby={confirmationHeadingId}
            onCancel={(event) => {
              event.preventDefault();
              cancelConfirmation();
            }}
            tabIndex={-1}
          >
            <div className={styles.confirmationContent}>
              <p className={styles.confirmationKicker}>Confirm purchase</p>
              <h3 id={confirmationHeadingId}>Confirm Buy It Now</h3>
              <dl className={styles.confirmationDetails}>
                <div>
                  <dt>Vehicle</dt>
                  <dd>
                    {identity} · Lot {vehicle.lot}
                  </dd>
                </div>
                <div>
                  <dt>Purchase price</dt>
                  <dd>{formatCad(buyNowPrice)}</dd>
                </div>
              </dl>
              <p className={styles.acknowledgement}>
                Confirming immediately ends this local demo auction. Checkout and
                payment are not included.
              </p>
              <div className={styles.confirmationActions}>
                <button
                  type="button"
                  className={styles.buyNowButton}
                  onClick={confirmPurchase}
                >
                  Confirm
                </button>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={cancelConfirmation}
                >
                  Cancel
                </button>
              </div>
            </div>
          </dialog>
        ) : (
          <div className={styles.buyNowOffer}>
            <div>
              <span>Fixed purchase price</span>
              <strong>{formatCad(buyNowPrice)}</strong>
              <small>Ends this local demo auction immediately</small>
            </div>
            <button
              ref={triggerRef}
              type="button"
              className={styles.buyNowButton}
              onClick={() => {
                shouldFocusTrigger.current = false;
                setStatus("");
                setIsConfirming(true);
                onConfirmingChange(true);
              }}
            >
              Buy It Now
            </button>
          </div>
        )
      ) : null}

      {status === "" ? null : (
        <p
          ref={statusRef}
          className={styles.liveStatus}
          role="status"
          aria-live="polite"
          aria-atomic="true"
          tabIndex={-1}
        >
          {status}
        </p>
      )}
    </div>
  );
}
