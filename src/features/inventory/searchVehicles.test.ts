import { expect, test } from "@playwright/test";

const describe = test.describe;
const it = test;
import { findVehicleByLot, vehicles } from "../../data/vehicles";
import {
  getInventoryFilterCriterion,
  type InventoryFilterKey,
} from "./inventoryCriteria";
import {
  filterVehicles,
  getInventoryFilterOptions,
  readInventoryFilters,
  resolveInventoryFilters,
} from "./inventoryFilters";
import { searchVehicles } from "./searchVehicles";

const emptyFilters = readInventoryFilters(new URLSearchParams());

describe("searchVehicles", () => {
  it("returns the complete inventory for an empty query", () => {
    expect(searchVehicles(vehicles, "   ")).toBe(vehicles);
    expect(vehicles).toHaveLength(200);
  });

  const requiredFieldQueries = [
    "2016",
    "jeep",
    "wrangler",
    "sahara",
    "a-0036",
    "3b60ya8f0fg85jba9",
    "northland chrysler",
    "vaughan",
    "ontario",
  ];

  for (const query of requiredFieldQueries) {
    it(`finds A-0036 by required field query ${query}`, () => {
      expect(searchVehicles(vehicles, query)).toContain(findVehicleByLot("A-0036"));
    });
  }

  it("matches case-insensitively and supports terms across fields", () => {
    const results = searchVehicles(vehicles, "JEEP vaUgHaN A-0036");
    expect(results.map((vehicle) => vehicle.lot)).toEqual(["A-0036"]);
  });

  it("preserves source order", () => {
    const results = searchVehicles(vehicles, "0040");
    expect(results.map((vehicle) => vehicle.lot)).toEqual([
      "A-0040",
      "B-0040",
      "C-0040",
      "D-0040",
    ]);
  });

  it("returns no results for an unmatched query", () => {
    expect(searchVehicles(vehicles, "zzzz-no-match")).toEqual([]);
  });
});

describe("inventory filters", () => {
  const target = findVehicleByLot("A-0036");
  const filterCases = [
    ["year", "2016"],
    ["make", "Jeep"],
    ["model", "Wrangler"],
    ["lot", "A"],
    ["dealership", "Northland Chrysler"],
    ["city", "Vaughan"],
    ["province", "Ontario"],
  ] as const satisfies readonly (readonly [InventoryFilterKey, string])[];

  for (const [key, value] of filterCases) {
    it(`filters exactly by ${key}`, () => {
      const results = filterVehicles(vehicles, {
        ...emptyFilters,
        [key]: value,
      });

      expect(results).toContain(target);
      expect(
        results.every(
          (vehicle) => getInventoryFilterCriterion(vehicle, key) === value,
        ),
      ).toBe(true);
    });
  }

  for (const lot of ["A", "B", "C", "D"] as const) {
    it(`filters the ${lot} lot series as a 50-vehicle group`, () => {
      const results = filterVehicles(vehicles, {
        ...emptyFilters,
        lot,
      });

      expect(results).toHaveLength(50);
      expect(results.every((vehicle) => vehicle.lot.startsWith(`${lot}-`))).toBe(
        true,
      );
    });
  }

  it("matches filter values case-insensitively", () => {
    const results = filterVehicles(vehicles, {
      ...emptyFilters,
      province: "oNtArIo",
    });

    expect(results).toHaveLength(87);
  });

  it("combines multiple filters and free-text search with AND semantics", () => {
    const filtered = filterVehicles(searchVehicles(vehicles, "Jeep"), {
      ...emptyFilters,
      province: "Ontario",
    });

    expect(filtered).toHaveLength(6);
    expect(
      filtered.every(
        (vehicle) => vehicle.make === "Jeep" && vehicle.province === "Ontario",
      ),
    ).toBe(true);
  });

  it("builds unique options and sorts years newest first", () => {
    const options = getInventoryFilterOptions(vehicles);

    expect(options.province).toEqual([
      "Alberta",
      "British Columbia",
      "Manitoba",
      "Nova Scotia",
      "Ontario",
      "Quebec",
      "Saskatchewan",
    ]);
    expect(options.year[0]).toBe("2026");
    expect(options.year.at(-1)).toBe("2016");
    expect(options.lot).toEqual(["A", "B", "C", "D"]);
    expect(options.model).toEqual([]);
    expect(options.city).toEqual([]);
    expect(options.dealership).toEqual([]);
  });

  it("offers only models belonging to the selected make", () => {
    expect(getInventoryFilterOptions(vehicles, "BMW").model).toEqual([
      "3 Series",
      "5 Series",
      "X3",
      "X5",
    ]);
    expect(getInventoryFilterOptions(vehicles, "Jeep").model).toEqual([
      "Grand Cherokee",
      "Wrangler",
    ]);
  });

  it("offers cities by province and dealerships by province and city", () => {
    const ontarioOptions = getInventoryFilterOptions(vehicles, "", "oNtArIo");

    expect(ontarioOptions.city).toEqual([
      "Barrie",
      "Brampton",
      "Hamilton",
      "Kitchener",
      "London",
      "Markham",
      "Mississauga",
      "Ottawa",
      "Toronto",
      "Vaughan",
      "Windsor",
    ]);
    expect(ontarioOptions.dealership).toEqual([]);

    const vaughanOptions = getInventoryFilterOptions(
      vehicles,
      "",
      "Ontario",
      "vAuGhAn",
    );

    expect(vaughanOptions.dealership).toEqual([
      "AutoPark Toronto",
      "Capital City Auto",
      "Golden Horseshoe Motors",
      "Grand Touring Motors",
      "King City Auto",
      "Maple Motors",
      "Northland Chrysler",
    ]);
  });

  it("resolves make before model and rejects incompatible deep links", () => {
    const valid = resolveInventoryFilters(
      vehicles,
      new URLSearchParams("make=bmw&model=x3"),
    );
    const incompatible = resolveInventoryFilters(
      vehicles,
      new URLSearchParams("make=BMW&model=Wrangler"),
    );
    const modelOnly = resolveInventoryFilters(
      vehicles,
      new URLSearchParams("model=X3"),
    );

    expect(valid.filters).toMatchObject({ make: "BMW", model: "X3" });
    expect(valid.options.model).toEqual(["3 Series", "5 Series", "X3", "X5"]);
    expect(incompatible.filters).toMatchObject({ make: "BMW", model: "" });
    expect(modelOnly.filters).toMatchObject({ make: "", model: "" });
  });

  it("resolves province before city and dealership for deep links", () => {
    const valid = resolveInventoryFilters(
      vehicles,
      new URLSearchParams(
        "province=ontario&city=vaughan&dealership=northland+chrysler",
      ),
    );
    const incompatibleCity = resolveInventoryFilters(
      vehicles,
      new URLSearchParams(
        "province=Ontario&city=Montreal&dealership=Rive-Sud+Motors",
      ),
    );
    const incompatibleDealership = resolveInventoryFilters(
      vehicles,
      new URLSearchParams(
        "province=Ontario&city=Vaughan&dealership=Lakeshore+Auto+Group",
      ),
    );
    const childrenOnly = resolveInventoryFilters(
      vehicles,
      new URLSearchParams(
        "city=Vaughan&dealership=Northland+Chrysler",
      ),
    );

    expect(valid.filters).toMatchObject({
      province: "Ontario",
      city: "Vaughan",
      dealership: "Northland Chrysler",
    });
    expect(valid.options.dealership).toContain("Northland Chrysler");
    expect(incompatibleCity.filters).toMatchObject({
      province: "Ontario",
      city: "",
      dealership: "",
    });
    expect(incompatibleDealership.filters).toMatchObject({
      province: "Ontario",
      city: "Vaughan",
      dealership: "",
    });
    expect(childrenOnly.filters).toMatchObject({
      province: "",
      city: "",
      dealership: "",
    });
  });

  it("canonicalizes recognized URL values for the filter controls", () => {
    const options = getInventoryFilterOptions(vehicles);
    const filters = readInventoryFilters(
      new URLSearchParams("province=ontario&make=JEEP&lot=a-0036"),
      options,
    );

    expect(filters.province).toBe("Ontario");
    expect(filters.make).toBe("Jeep");
    expect(filters.lot).toBe("A");
  });

  it("discards unsupported structured-filter values", () => {
    const filters = readInventoryFilters(
      new URLSearchParams("lot=E&make=Not-A-Make"),
      getInventoryFilterOptions(vehicles),
    );

    expect(filters.lot).toBe("");
    expect(filters.make).toBe("");
  });

  it("discards whitespace-only URL filter values", () => {
    const filters = readInventoryFilters(
      new URLSearchParams("make=%20%20&province=Ontario"),
      getInventoryFilterOptions(vehicles),
    );

    expect(filters.make).toBe("");
    expect(filters.province).toBe("Ontario");
  });
});
