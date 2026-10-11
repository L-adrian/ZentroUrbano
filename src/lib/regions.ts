// Countries and departments a visitor can pick. Bolivia is the only country for now; another one
// is a new entry here. Listings carry a free-text city, matched to a department by these names.
export type Department = { slug: string; name: string; capital: string; cityNames: string[] };
export type Country = { code: string; name: string; departments: Department[] };

export const bolivia: Country = {
  code: "BO",
  name: "Bolivia",
  departments: [
    { slug: "santa-cruz", name: "Santa Cruz", capital: "Santa Cruz de la Sierra", cityNames: ["santa cruz"] },
    { slug: "la-paz", name: "La Paz", capital: "La Paz · El Alto", cityNames: ["la paz", "el alto"] },
    { slug: "cochabamba", name: "Cochabamba", capital: "Cochabamba", cityNames: ["cochabamba", "quillacollo", "sacaba"] },
    { slug: "chuquisaca", name: "Chuquisaca", capital: "Sucre", cityNames: ["sucre", "chuquisaca"] },
    { slug: "tarija", name: "Tarija", capital: "Tarija", cityNames: ["tarija"] },
    { slug: "oruro", name: "Oruro", capital: "Oruro", cityNames: ["oruro"] },
    { slug: "potosi", name: "Potosí", capital: "Potosí", cityNames: ["potosi"] },
    { slug: "beni", name: "Beni", capital: "Trinidad", cityNames: ["trinidad", "beni", "riberalta"] },
    { slug: "pando", name: "Pando", capital: "Cobija", cityNames: ["cobija", "pando"] },
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

// Listings without a city were all published in Santa Cruz, the only city open so far.
export function isInDepartment(city: string | undefined | null, department: Department) {
  const name = normalize(city ?? "");
  if (!name) return department.slug === defaultDepartment.slug;
  return department.cityNames.some((cityName) => name.includes(cityName));
}
