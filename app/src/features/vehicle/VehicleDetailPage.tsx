import { Link, useLocation, useParams } from "react-router-dom";
import { findVehicleById } from "../../data/vehicles";
import { AuctionPanel } from "../bidding/AuctionPanel";
import styles from "./VehicleDetail.module.css";
import { VehicleFacts } from "./VehicleFacts";
import { VehicleGallery } from "./VehicleGallery";

interface DetailLocationState {
  readonly from?: string;
}

function getSafeReturnPath(state: DetailLocationState | null): string {
  return state?.from?.startsWith("/") === true ? state.from : "/";
}

function getReturnLabel(returnPath: string): string {
  const suffixIndex = returnPath.search(/[?#]/);
  const pathname =
    suffixIndex === -1 ? returnPath : returnPath.slice(0, suffixIndex);

  return pathname === "/my-bids" || pathname === "/my-bids/"
    ? "Back to My Bids"
    : "Back to inventory";
}

export function VehicleDetailPage() {
  const { vehicleId } = useParams();
  const location = useLocation();
  const state = location.state as DetailLocationState | null;
  const vehicle = vehicleId === undefined ? undefined : findVehicleById(vehicleId);

  if (vehicle === undefined) {
    return (
      <section className={styles.notFound} aria-labelledby="vehicle-not-found">
        <p className={styles.kicker}>Vehicle unavailable</p>
        <h1 id="vehicle-not-found">We couldn’t find that vehicle</h1>
        <p>
          The link may be incomplete, or this vehicle is not part of the supplied
          inventory.
        </p>
        <Link to="/">Return to inventory</Link>
      </section>
    );
  }

  const identity = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const returnPath = getSafeReturnPath(state);

  return (
    <article className={styles.page}>
      <Link className={styles.backLink} to={returnPath}>
        <span aria-hidden="true">←</span> {getReturnLabel(returnPath)}
      </Link>

      <header className={styles.vehicleHeader}>
        <div>
          <p className={styles.kicker}>Lot {vehicle.lot}</p>
          <h1>{identity}</h1>
          <p className={styles.trim}>{vehicle.trim}</p>
        </div>
        <dl className={styles.headerIdentity}>
          <div>
            <dt>VIN</dt>
            <dd>{vehicle.vin}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>
              {vehicle.city}, {vehicle.province}
            </dd>
          </div>
        </dl>
      </header>

      <div className={styles.layout}>
        <VehicleGallery vehicle={vehicle} />

        <aside className={styles.auctionColumn} aria-label="Auction information">
          <AuctionPanel vehicle={vehicle} />
        </aside>

        <VehicleFacts vehicle={vehicle} />
      </div>
    </article>
  );
}
