import { useEffect, useId, useRef, useState } from "react";
import { formatDemoElapsed } from "../../lib/format";
import { useAuction } from "../../state/useAuction";
import styles from "./DemoControls.module.css";

function getPersistenceMessage(
  successMessage: string,
  persisted: boolean,
): string {
  return persisted
    ? `${successMessage} Saved on this device.`
    : `${successMessage} Device storage is unavailable, so this change may be lost when you refresh.`;
}

export function DemoControls() {
  const {
    clock,
    pauseDemoTime,
    resetAuctionData,
    resetDemoTime,
    startDemoTime,
  } = useAuction();
  const [isOpen, setIsOpen] = useState(false);
  const [isResetReviewing, setIsResetReviewing] = useState(false);
  const [status, setStatus] = useState({ sequence: 0, message: "" });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const resetAuctionRef = useRef<HTMLButtonElement>(null);
  const resetReviewRef = useRef<HTMLElement>(null);
  const panelId = useId();
  const headingId = useId();
  const resetHeadingId = useId();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    closeRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIsResetReviewing(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isResetReviewing) {
      resetReviewRef.current?.focus();
    }
  }, [isResetReviewing]);

  function announce(message: string) {
    setStatus(({ sequence }) => ({ sequence: sequence + 1, message }));
  }

  function openPanel() {
    setStatus(({ sequence }) => ({ sequence: sequence + 1, message: "" }));
    setIsOpen(true);
  }

  function closePanel() {
    setIsOpen(false);
    setIsResetReviewing(false);
    triggerRef.current?.focus();
  }

  function startTime() {
    const result = startDemoTime();
    announce(
      getPersistenceMessage(
        clock.elapsedMs === 0 ? "Demo time started." : "Demo time resumed.",
        result.persisted,
      ),
    );
  }

  function pauseTime() {
    const result = pauseDemoTime();
    announce(
      getPersistenceMessage("Demo time paused.", result.persisted),
    );
  }

  function resetTime() {
    const result = resetDemoTime();
    announce(
      getPersistenceMessage(
        "Demo time reset to 00:00. Auction data was preserved.",
        result.persisted,
      ),
    );
  }

  function cancelAuctionReset() {
    setIsResetReviewing(false);
    resetAuctionRef.current?.focus();
  }

  function confirmAuctionReset() {
    const result = resetAuctionData();
    setIsResetReviewing(false);
    announce(
      result.persisted
        ? "All local auction data was reset to the supplied baselines. Demo time was preserved."
        : "Auction data was reset for this session, but device storage is unavailable. Older stored bids or purchases may return when you refresh.",
    );
    resetAuctionRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.hotspot}
        aria-label="Open demo controls"
        aria-expanded={isOpen}
        aria-controls={panelId}
        onClick={openPanel}
      >
        <span>Demo controls</span>
      </button>

      {isOpen ? (
        <aside
          id={panelId}
          className={styles.panel}
          aria-labelledby={headingId}
        >
          <header className={styles.panelHeader}>
            <div>
              <p>Local simulation</p>
              <h2 id={headingId}>Demo controls</h2>
            </div>
            <button ref={closeRef} type="button" onClick={closePanel}>
              Close
            </button>
          </header>

          <div className={styles.clockReadout}>
            <span>Demo time</span>
            <strong>{formatDemoElapsed(clock.elapsedMs)}</strong>
            <small>{clock.status === "running" ? "Running" : "Paused"}</small>
          </div>

          <div className={styles.timeControls}>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={clock.status === "running"}
              onClick={startTime}
            >
              {clock.elapsedMs === 0 ? "Start time" : "Resume time"}
            </button>
            <button
              type="button"
              disabled={clock.status === "paused"}
              onClick={pauseTime}
            >
              Pause time
            </button>
            <button type="button" onClick={resetTime}>
              Reset time
            </button>
          </div>

          <p className={styles.helpText}>
            Resetting returns demo time to 00:00 without changing bids or Buy
            It Now purchases.
          </p>

          <div className={styles.bidReset}>
            <button
              ref={resetAuctionRef}
              type="button"
              className={styles.dangerButton}
              onClick={() => setIsResetReviewing(true)}
            >
              Reset all auction data
            </button>

            {isResetReviewing ? (
              <section
                ref={resetReviewRef}
                className={styles.resetReview}
                aria-labelledby={resetHeadingId}
                tabIndex={-1}
              >
                <h3 id={resetHeadingId}>Reset local auction activity?</h3>
                <p>
                  Public prices, bid counts, buyer maximums, leading status,
                  and Buy It Now purchases will return to the supplied
                  baselines. Demo time will not change.
                </p>
                <div>
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={confirmAuctionReset}
                  >
                    Confirm auction reset
                  </button>
                  <button type="button" onClick={cancelAuctionReset}>
                    Cancel
                  </button>
                </div>
              </section>
            ) : null}
          </div>

          <p
            key={status.sequence}
            className={styles.liveStatus}
            role="status"
            aria-live="polite"
          >
            {status.message}
          </p>
        </aside>
      ) : null}
    </>
  );
}
