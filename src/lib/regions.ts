// Countries and departments a visitor can pick. Bolivia is the only country for now; another one
// is a new entry here. Listings carry a free-text city, matched to a department by these names.
// city: what a listing published in the department stores as its city (matched by cityNames).
// zoneExample: the placeholder of the publish form's zone field.
// center: the capital, for coordinate hints and a sanity check when the admin places a listing.
export type Department = { slug: string; name: string; capital: string; city: string; zoneExample: string; cityNames: string[]; center: { lat: number; lng: number } };
export type Country = { code: string; name: string; departments: Department[] };

export const bolivia: Country = {
  code: "BO",
  name: "Bolivia",
  departments: [
    { slug: "santa-cruz", name: "Santa Cruz", capital: "Santa Cruz de la Sierra", city: "Santa Cruz de la Sierra", zoneExample: "Urbari", cityNames: ["santa cruz"], center: { lat: -17.7833, lng: -63.1821 } },
    { slug: "la-paz", name: "La Paz", capital: "La Paz · El Alto", city: "La Paz", zoneExample: "Sopocachi", cityNames: ["la paz", "el alto"], center: { lat: -16.4897, lng: -68.1193 } },
    { slug: "cochabamba", name: "Cochabamba", capital: "Cochabamba", city: "Cochabamba", zoneExample: "Queru Queru", cityNames: ["cochabamba", "quillacollo", "sacaba"], center: { lat: -17.3895, lng: -66.1568 } },
    { slug: "chuquisaca", name: "Chuquisaca", capital: "Sucre", city: "Sucre", zoneExample: "Zona Central", cityNames: ["sucre", "chuquisaca"], center: { lat: -19.0196, lng: -65.2619 } },
    { slug: "tarija", name: "Tarija", capital: "Tarija", city: "Tarija", zoneExample: "San Roque", cityNames: ["tarija"], center: { lat: -21.5355, lng: -64.7296 } },
    { slug: "oruro", name: "Oruro", capital: "Oruro", city: "Oruro", zoneExample: "Zona Central", cityNames: ["oruro"], center: { lat: -17.9667, lng: -67.1167 } },
    { slug: "potosi", name: "Potosí", capital: "Potosí", city: "Potosí", zoneExample: "Zona Central", cityNames: ["potosi"], center: { lat: -19.5836, lng: -65.7531 } },
    { slug: "beni", name: "Beni", capital: "Trinidad", city: "Trinidad", zoneExample: "Zona Central", cityNames: ["trinidad", "beni", "riberalta"], center: { lat: -14.8333, lng: -64.9 } },
    { slug: "pando", name: "Pando", capital: "Cobija", city: "Cobija", zoneExample: "Zona Central", cityNames: ["cobija", "pando"], center: { lat: -11.0267, lng: -68.7692 } },
  ],
};

export const countries = [bolivia];
export const defaultDepartment = bolivia.departments[0];

// A session cookie (no expiry): the browser drops it when it closes, so the next visit asks again.
export const departmentCookieName = "zu_departamento";
// ?departamento=la-paz on a shared link opens the catalog in that department (src/proxy.ts).
export const departmentParam = "departamento";

export function findDepartment(slug: string | undefined | null) {
  return bolivia.departments.find((department) => department.slug === slug);
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

// The department a listing's city belongs to; listings without a city are in Santa Cruz.
export function departmentOfCity(city: string | undefined | null) {
  return bolivia.departments.find((department) => isInDepartment(city, department)) ?? defaultDepartment;
}

// Listings without a city were all published in Santa Cruz, the only city open so far.
export function isInDepartment(city: string | undefined | null, department: Department) {
  const name = normalize(city ?? "");
  if (!name) return department.slug === defaultDepartment.slug;
  return department.cityNames.some((cityName) => name.includes(cityName));
}

// The department whose capital is closest to a point. A rough check, good enough to notice a La Paz
// listing pinned in Santa Cruz.
export function nearestDepartment(point: { lat: number; lng: number }) {
  return bolivia.departments.reduce((best, department) => {
    const distance = (department.center.lat - point.lat) ** 2 + (department.center.lng - point.lng) ** 2;
    return distance < best.distance ? { department, distance } : best;
  }, { department: defaultDepartment, distance: Infinity }).department;
}
