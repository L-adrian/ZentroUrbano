import assert from "node:assert/strict";
import { test } from "node:test";
import { getPropertyParkingLabel } from "../src/lib/property-parking";
import type { Property } from "../src/lib/properties";

test("missing parking is unknown, not an assertion of no garage", () => {
  assert.equal(getPropertyParkingLabel({ garage: 0, requirements: [] }), "Consultar");
  assert.equal(getPropertyParkingLabel({ garage: 0, requirements: ["Parqueo: consultar."] }), "Consultar");
});

test("explicit parking facts and owner notes retain their meaning", () => {
  assert.equal(getPropertyParkingLabel({ garage: 0, requirements: ["Sin garaje."] }), "Sin garaje");
  assert.equal(getPropertyParkingLabel({ garage: 0, requirements: ["SIN PARQUEO"] }), "Sin garaje");
  assert.equal(getPropertyParkingLabel({ garage: 0, requirements: ["Parqueo disponible; consultar capacidad."] }), "Consultar capacidad");
  assert.equal(getPropertyParkingLabel({ garage: 8, requirements: [] }), 8);
  const rentalDetails = { parkingNote: "Solo para motos" } as Property["rentalDetails"];
  assert.equal(getPropertyParkingLabel({ garage: 0, requirements: [], rentalDetails }), "Solo para motos");
});
