import "server-only";
import { cookies } from "next/headers";
import { defaultDepartment, departmentCookieName, findDepartment, isInDepartment } from "@/lib/regions";

export async function getSelectedDepartment() {
  const store = await cookies();
  return findDepartment(store.get(departmentCookieName)?.value) ?? defaultDepartment;
}

export async function inSelectedDepartment<T extends { city?: string | null }>(properties: T[]) {
  const department = await getSelectedDepartment();
  return { department, properties: properties.filter((property) => isInDepartment(property.city, department)) };
}
