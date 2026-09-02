import { useState } from "react";
import { VehicleImage } from "../../components/VehicleImage";
import type { Vehicle } from "../../domain/vehicle/types";
import styles from "./VehicleDetail.module.css";

interface VehicleGalleryProps {
  readonly vehicle: Vehicle;
}

export function VehicleGallery({ vehicle }: VehicleGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const identity = `${vehicle.year} ${vehicle.make} ${vehicle.model}`;
  const selectedImage = vehicle.images[selectedIndex];

  return (
    <section className={styles.gallery} aria-labelledby="gallery-heading">
      <div className={styles.sectionHeadingRow}>
        <h2 id="gallery-heading">Vehicle photos</h2>
        <span aria-live="polite">
          {selectedIndex + 1} of {vehicle.images.length}
        </span>
      </div>

      <VehicleImage
        key={selectedImage}
        src={selectedImage}
        alt={`${identity}, supplied photo ${selectedIndex + 1} of ${vehicle.images.length}`}
        loading="eager"
        className={styles.mainImage}
      />

      <div className={styles.thumbnails} aria-label="Choose a vehicle photo">
        {vehicle.images.map((image, index) => (
          <button
            key={`${image}-${index}`}
            type="button"
            className={styles.thumbnailButton}
            aria-label={`View photo ${index + 1} of ${vehicle.images.length} for ${identity}`}
            aria-pressed={selectedIndex === index}
            onClick={() => setSelectedIndex(index)}
          >
            <VehicleImage src={image} alt="" className={styles.thumbnailImage} />
            <span>{index + 1}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
