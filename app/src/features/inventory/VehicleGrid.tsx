import type { Vehicle } from "../../domain/vehicle/types";
import { VehicleCard } from "./VehicleCard";
import styles from "./Inventory.module.css";

interface VehicleGridProps {
  readonly vehicles: readonly Vehicle[];
  readonly id?: string;
  readonly ariaLabel?: string;
}

export function VehicleGrid({
  vehicles,
  id = "inventory-results",
  ariaLabel = "Vehicle inventory",
}: VehicleGridProps) {
  return (
    <div
      id={id}
      className={styles.grid}
      aria-label={ariaLabel}
    >
      {vehicles.map((vehicle) => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
    </div>
  );
}
