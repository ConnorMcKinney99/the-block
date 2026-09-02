import {
  type FormEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import {
  getMinimumAcceptedMaximum,
  validateMaximumBid,
} from "../../domain/auction/proxyBid";
import { getAuctionDisplay } from "../../domain/auction/selectors";
import type {
  AuctionOverlay,
  MaximumBidValidationRejected,
} from "../../domain/auction/types";
import type { Vehicle } from "../../domain/vehicle/types";
import { formatCad } from "../../lib/format";
import { useAuction } from "../../state/useAuction";
import styles from "./AuctionPanel.module.css";

interface MaximumBidFormProps {
  readonly vehicle: Vehicle;
  readonly overlay: AuctionOverlay;
  readonly onConfirmingChange: (isConfirming: boolean) => void;
}

function parseMaximumInput(value: string): number {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function getValidationMessage(
  failure: MaximumBidValidationRejected,
): string {
  switch (failure.code) {
    case "invalid-amount":
      return "Enter a positive, finite, whole-dollar CAD amount.";
    case "below-minimum":
      return failure.minimumAccepted === null
        ? "A higher safe maximum cannot be entered."
        : `Enter at least ${formatCad(failure.minimumAccepted)}.`;
    case "maximum-not-raised":
      return failure.minimumAccepted === null
        ? "A higher safe maximum cannot be entered."
        : `Raise your maximum to at least ${formatCad(failure.minimumAccepted)}.`;
    case "maximum-limit-reached":
      return "A higher safe maximum cannot be entered.";
    case "auction-closed":
      return "This auction has ended and is no longer accepting maximum bids.";
  }
}

export function MaximumBidForm({
  vehicle,
  overlay,
  onConfirmingChange,
}: MaximumBidFormProps) {
  const { submitBuyerMaximum } = useAuction();
  const [inputValue, setInputValue] = useState("");
  const [confirmationMaximum, setConfirmationMaximum] = useState<number | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmationRef = useRef<HTMLDialogElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const shouldFocusInput = useRef(false);
  const inputId = useId();
  const helpId = useId();
  const minimumId = useId();
  const errorId = useId();
  const confirmationHeadingId = useId();
  const minimumAccepted = getMinimumAcceptedMaximum(
    vehicle,
    overlay,
    "buyer",
  );
  const identity = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;

  useEffect(() => {
    if (confirmationMaximum !== null) {
      const dialog = confirmationRef.current;

      if (dialog !== null && !dialog.open) {
        dialog.showModal();
        dialog.focus();
      }
    } else if (shouldFocusInput.current) {
      shouldFocusInput.current = false;
      inputRef.current?.focus();
    }
  }, [confirmationMaximum]);

  useEffect(() => {
    if (status !== "") {
      statusRef.current?.focus();
    }
  }, [status]);

  function showEditState(message: string) {
    setError(message);
    shouldFocusInput.current = true;
    setConfirmationMaximum(null);
  }

  function handleBid(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = parseMaximumInput(inputValue);
    const validation = validateMaximumBid(
      vehicle,
      overlay,
      "buyer",
      amount,
    );

    if (!validation.ok) {
      setError(getValidationMessage(validation));
      inputRef.current?.focus();
      return;
    }

    setError(null);
    setConfirmationMaximum(amount);
    onConfirmingChange(true);
  }

  function handleCancelConfirmation() {
    shouldFocusInput.current = true;
    setConfirmationMaximum(null);
    onConfirmingChange(false);
  }

  function handleConfirmation() {
    if (confirmationMaximum === null) {
      return;
    }

    const result = submitBuyerMaximum(vehicle, confirmationMaximum);

    if (!result.ok) {
      onConfirmingChange(false);
      showEditState(getValidationMessage(result));
      return;
    }

    const display = getAuctionDisplay(vehicle, result.state);
    const persistenceOutcome = result.persisted
      ? `Maximum ${formatCad(confirmationMaximum)} saved on this device.`
      : `Maximum ${formatCad(confirmationMaximum)} applied for this session. Device storage is unavailable, so it may be lost when you refresh.`;
    const auctionOutcome = display.isBuyerLeading
      ? `You’re currently leading at ${formatCad(display.publicPrice)}.`
      : `The current bid is ${formatCad(display.publicPrice)}, and you’re not leading.`;
    const outcome = `${persistenceOutcome} ${auctionOutcome}`;

    setInputValue("");
    setError(null);
    setConfirmationMaximum(null);
    onConfirmingChange(false);
    setStatus(outcome);
  }

  const describedBy = [helpId, minimumId, error === null ? null : errorId]
    .filter((value): value is string => value !== null)
    .join(" ");

  return (
    <div className={styles.bidSection}>
      {confirmationMaximum === null ? (
        <form className={styles.bidForm} onSubmit={handleBid} noValidate>
          <div className={styles.bidField}>
            <label htmlFor={inputId}>Maximum bid</label>
            <input
              ref={inputRef}
              id={inputId}
              type="number"
              inputMode="numeric"
              min={minimumAccepted ?? undefined}
              step="1"
              value={inputValue}
              aria-describedby={describedBy}
              aria-invalid={error === null ? undefined : true}
              onChange={(event) => {
                setInputValue(event.target.value);
                setError(null);
              }}
            />
          </div>

          <p id={helpId} className={styles.bidHelp}>
            Enter the most you’re willing to bid. The displayed bid may be lower
            than your maximum based on the current auction price.
          </p>
          <p id={minimumId} className={styles.minimumBid}>
            {minimumAccepted === null ? (
              "A higher safe maximum cannot be entered."
            ) : (
              <>
                Minimum accepted maximum: <strong>{formatCad(minimumAccepted)}</strong>
              </>
            )}
          </p>
          {error === null ? null : (
            <p id={errorId} className={styles.bidError} role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={minimumAccepted === null}
          >
            Bid
          </button>
        </form>
      ) : (
        <dialog
          ref={confirmationRef}
          className={styles.confirmationDialog}
          aria-labelledby={confirmationHeadingId}
          onCancel={(event) => {
            event.preventDefault();
            handleCancelConfirmation();
          }}
          tabIndex={-1}
        >
          <div className={styles.confirmationContent}>
            <p className={styles.confirmationKicker}>Confirm your bid</p>
            <h3 id={confirmationHeadingId}>Confirm maximum bid</h3>
            <dl className={styles.confirmationDetails}>
              <div>
                <dt>Vehicle</dt>
                <dd>
                  {identity} · Lot {vehicle.lot}
                </dd>
              </div>
              <div>
                <dt>Your maximum</dt>
                <dd>{formatCad(confirmationMaximum)}</dd>
              </div>
            </dl>
            <p className={styles.acknowledgement}>
              By confirming, you acknowledge this is the most you’re willing to
              bid. The public bid may remain lower. Your maximum is stored only
              in this browser when device storage is available.
            </p>
            <div className={styles.confirmationActions}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleConfirmation}
              >
                Confirm
              </button>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={handleCancelConfirmation}
              >
                Cancel
              </button>
            </div>
          </div>
        </dialog>
      )}

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
    </div>
  );
}
