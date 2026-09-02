import type { ReactNode } from "react";
import { ConditionRating } from "../../components/ConditionRating";
import type { Vehicle } from "../../domain/vehicle/types";
import {
  formatDisplayValue,
  formatOdometer,
} from "../../lib/format";
import styles from "./VehicleDetail.module.css";

interface Fact {
  readonly label: string;
  readonly value: ReactNode;
}

interface FactListProps {
  readonly facts: readonly Fact[];
}

function FactList({ facts }: FactListProps) {
  return (
    <dl className={styles.factList}>
      {facts.map((fact) => (
        <div key={fact.label}>
          <dt>{fact.label}</dt>
          <dd>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

interface VehicleFactsProps {
  readonly vehicle: Vehicle;
}

export function VehicleFacts({ vehicle }: VehicleFactsProps) {
  const specificationFacts: readonly Fact[] = [
    { label: "Body style", value: formatDisplayValue(vehicle.bodyStyle) },
    { label: "Engine", value: vehicle.engine },
    {
      label: "Transmission",
      value: formatDisplayValue(vehicle.transmission),
    },
    { label: "Drivetrain", value: formatDisplayValue(vehicle.drivetrain) },
    { label: "Fuel type", value: formatDisplayValue(vehicle.fuelType) },
    { label: "Odometer", value: formatOdometer(vehicle.odometerKm) },
    { label: "Exterior", value: vehicle.exteriorColor },
    { label: "Interior", value: vehicle.interiorColor },
  ];

  const sellerFacts: readonly Fact[] = [
    { label: "Selling dealership", value: vehicle.sellingDealership },
    { label: "City", value: vehicle.city },
    { label: "Province", value: vehicle.province },
    { label: "VIN", value: <span className={styles.monospace}>{vehicle.vin}</span> },
    { label: "Lot", value: vehicle.lot },
  ];

  return (
    <div className={styles.detailSections}>
      <section className={styles.detailSection} aria-labelledby="specs-heading">
        <h2 id="specs-heading">Vehicle specifications</h2>
        <FactList facts={specificationFacts} />
      </section>

      <section
        className={styles.detailSection}
        aria-labelledby="condition-heading"
      >
        <div className={styles.conditionHeading}>
          <div>
            <h2 id="condition-heading">Condition</h2>
            <ConditionRating value={vehicle.conditionGrade} />
          </div>
          <span className={styles.titleStatus} data-status={vehicle.titleStatus}>
            {formatDisplayValue(vehicle.titleStatus)} title
          </span>
        </div>

        <p className={styles.conditionReport}>{vehicle.conditionReport}</p>

        <h3>Damage notes</h3>
        {vehicle.damageNotes.length > 0 ? (
          <ul className={styles.damageList}>
            {vehicle.damageNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.noDamage}>
            No damage noted in the supplied condition data.
          </p>
        )}
      </section>

      <section className={styles.detailSection} aria-labelledby="seller-heading">
        <h2 id="seller-heading">Location &amp; seller</h2>
        <FactList facts={sellerFacts} />
      </section>
    </div>
  );
}
