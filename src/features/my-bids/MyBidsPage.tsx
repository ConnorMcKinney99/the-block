import { Link } from "react-router-dom";
import { vehicles } from "../../data/vehicles";
import type { Vehicle } from "../../domain/vehicle/types";
import { useAuction } from "../../state/useAuction";
import { VehicleGrid } from "../inventory/VehicleGrid";
import styles from "./MyBids.module.css";

interface BidGroupProps {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly emptyMessage: string;
  readonly vehicles: readonly Vehicle[];
}

function BidGroup({
  id,
  title,
  description,
  emptyMessage,
  vehicles: groupVehicles,
}: BidGroupProps) {
  const headingId = `${id}-heading`;

  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <header className={styles.groupHeader}>
        <div>
          <h2 id={headingId}>{title}</h2>
          <p>{description}</p>
        </div>
        <span
          className={styles.groupCount}
          aria-label={`${groupVehicles.length} ${title.toLowerCase()}`}
        >
          {groupVehicles.length}
        </span>
      </header>

      {groupVehicles.length > 0 ? (
        <VehicleGrid
          id={`${id}-results`}
          ariaLabel={`${title} vehicles`}
          vehicles={groupVehicles}
        />
      ) : (
        <p className={styles.groupEmpty}>{emptyMessage}</p>
      )}
    </section>
  );
}

export function MyBidsPage() {
  const { getOverlay, getTiming } = useAuction();
  const activeBids: Vehicle[] = [];
  const wonVehicles: Vehicle[] = [];
  const pastBids: Vehicle[] = [];

  vehicles.forEach((vehicle) => {
    const overlay = getOverlay(vehicle);
    const timing = getTiming(vehicle);

    if (
      timing.outcome === "buyer-won" ||
      timing.outcome === "buyer-purchased"
    ) {
      wonVehicles.push(vehicle);
      return;
    }

    if (overlay.buyerMax === null) {
      return;
    }

    if (timing.lifecycle === "closed") {
      pastBids.push(vehicle);
      return;
    }

    activeBids.push(vehicle);
  });

  const totalBidVehicles =
    activeBids.length + wonVehicles.length + pastBids.length;

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Buyer activity</p>
          <h1>My Bids</h1>
          <p className={styles.intro}>
            Track every vehicle you bid on or purchased, from an active maximum
            through the final auction result.
          </p>
        </div>

        <dl className={styles.summary} aria-label="Bid summary">
          <div>
            <dt>Active</dt>
            <dd>{activeBids.length}</dd>
          </div>
          <div>
            <dt>Won</dt>
            <dd>{wonVehicles.length}</dd>
          </div>
          <div>
            <dt>Past</dt>
            <dd>{pastBids.length}</dd>
          </div>
        </dl>
      </header>

      {totalBidVehicles === 0 ? (
        <section
          className={styles.emptyState}
          aria-labelledby="my-bids-empty-title"
        >
          <p className={styles.emptyMark} aria-hidden="true">
            0
          </p>
          <h2 id="my-bids-empty-title">No bids yet</h2>
          <p>
            When you place a maximum bid or complete Buy It Now, the vehicle and
            its result will appear here.
          </p>
          <Link to="/">Browse auction inventory</Link>
        </section>
      ) : (
        <div className={styles.groups}>
          <BidGroup
            id="active-bids"
            title="Active bids"
            description="Upcoming and open auctions with a maximum saved on this device."
            emptyMessage="You have no upcoming or open bids."
            vehicles={activeBids}
          />
          <BidGroup
            id="won-bids"
            title="Won"
            description="Vehicles won at auction or purchased with Buy It Now."
            emptyMessage="You have not won or purchased a vehicle yet."
            vehicles={wonVehicles}
          />
          <BidGroup
            id="past-bids"
            title="Past bids"
            description="Other closed auctions that contain your bidding activity."
            emptyMessage="You have no other closed bid activity."
            vehicles={pastBids}
          />
        </div>
      )}
    </div>
  );
}
