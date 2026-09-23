import { parsePropertyExchangeRate } from "@/lib/currency";

export type PublicationDetails = {
  title:string; type:"Casa"|"Departamento"|"Monoambiente"; zone:string; address:string;
  bedrooms:number|null; bathrooms:number|null; garage:number; area:number|null;
  pets:boolean; furnished:boolean; security:boolean; pool:boolean; patio:boolean; grill:boolean; elevator:boolean;
  price:number; currency:"BOB"|"USD"; exchangeRate:number|null; commonExpenses:number;
  guarantee:string; guaranteeAmount:number|null; description:string;
};

export function parsePublicationDetails(value: unknown): PublicationDetails | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const input = value as Record<string,unknown>;
  const text = (key:string,max:number) => typeof input[key] === "string" && input[key].trim().length <= max ? input[key].trim() : "";
  const number = (key:string,max:number,integer=false): number|null => {
    const raw = input[key];
    if (raw === null || raw === undefined || raw === "" || (typeof raw !== "string" && typeof raw !== "number")) return null;
    const number = Number(raw);
    return Number.isFinite(number) && number >= 0 && number <= max && (!integer || Number.isInteger(number)) ? number : null;
  };
  const title=text("title",220), zone=text("zone",160), address=text("address",255), description=text("description",10000);
  const price=number("price",100_000_000), commonExpenses=number("commonExpenses",1_000_000), garage=number("garage",100,true);
  const guarantee=text("guarantee",80);
  const guaranteeAmount=number("guaranteeAmount",100_000_000);
  const exchangeRate=input.currency === "USD" ? parsePropertyExchangeRate(input.exchangeRate) : null;
  if (!title || !zone || !address || description.length < 20 || !price || commonExpenses === null || garage === null ||
    !["Casa","Departamento","Monoambiente"].includes(String(input.type)) || !["BOB","USD"].includes(String(input.currency)) ||
    (input.currency === "USD" && exchangeRate === null) || !["Sin garantía","1 mes de alquiler","2 meses de alquiler","Otro monto","Consultar con el propietario"].includes(guarantee) ||
    (guarantee === "Otro monto" && guaranteeAmount === null)) return null;
  for (const key of ["bedrooms","bathrooms","area"] as const) {
    if (input[key] !== "" && input[key] != null && number(key,key === "area" ? 1_000_000 : 100,true) === null) return null;
  }
  const flags=["pets","furnished","security","pool","patio","grill","elevator"] as const;
  if (flags.some(key=>typeof input[key] !== "boolean")) return null;
  return {title,type:input.type as PublicationDetails["type"],zone,address,description,price,currency:input.currency as "BOB"|"USD",exchangeRate,
    bedrooms:number("bedrooms",100,true),bathrooms:number("bathrooms",100,true),area:number("area",1_000_000,true),garage,commonExpenses,guarantee,guaranteeAmount,
    pets:input.pets as boolean,furnished:input.furnished as boolean,security:input.security as boolean,pool:input.pool as boolean,patio:input.patio as boolean,grill:input.grill as boolean,elevator:input.elevator as boolean};
}
