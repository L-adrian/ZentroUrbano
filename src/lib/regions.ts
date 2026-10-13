// Countries and departments a visitor can pick. Bolivia is the only country for now; another one
// is a new entry here. Listings carry a free-text city, matched to a department by these names.
// city: what a listing published in the department stores as its city (matched by cityNames).
// zoneExample: the placeholder of the publish form's zone field.
export type Department = { slug: string; name: string; capital: string; city: string; zoneExample: string; cityNames: string[] };
export type Country = { code: string; name: string; departments: Department[] };

export const bolivia: Country = {
  code: "BO",
  name: "Bolivia",
  departments: [
    { slug: "santa-cruz", name: "Santa Cruz", capital: "Santa Cruz de la Sierra", city: "Santa Cruz de la Sierra", zoneExample: "Urbari", cityNames: ["santa cruz"] },
    { slug: "la-paz", name: "La Paz", capital: "La Paz · El Alto", city: "La Paz", zoneExample: "Sopocachi", cityNames: ["la paz", "el alto"] },
    { slug: "cochabamba", name: "Cochabamba", capital: "Cochabamba", city: "Cochabamba", zoneExample: "Queru Queru", cityNames: ["cochabamba", "quillacollo", "sacaba"] },
    { slug: "chuquisaca", name: "Chuquisaca", capital: "Sucre", city: "Sucre", zoneExample: "Zona Central", cityNames: ["sucre", "chuquisaca"] },
    { slug: "tarija", name: "Tarija", capital: "Tarija", city: "Tarija", zoneExample: "San Roque", cityNames: ["tarija"] },
    { slug: "oruro", name: "Oruro", capital: "Oruro", city: "Oruro", zoneExample: "Zona Central", cityNames: ["oruro"] },
    { slug: "potosi", name: "Potosí", capital: "Potosí", city: "Potosí", zoneExample: "Zona Central", cityNames: ["potosi"] },
    { slug: "beni", name: "Beni", capital: "Trinidad", city: "Trinidad", zoneExample: "Zona Central", cityNames: ["trinidad", "beni", "riberalta"] },
    { slug: "pando", name: "Pando", capital: "Cobija", city: "Cobija", zoneExample: "Zona Central", cityNames: ["cobija", "pando"] },
  ],
};

export const countries = [bolivia];
export const defaultDepartment = bolivia.departments[0];

// A session cookie (no expiry): the browser drops it when it closes, so the next visit asks again.
export const departmentCookieName = "zu_departamento";

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
