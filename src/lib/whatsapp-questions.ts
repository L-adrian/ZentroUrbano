import type { Property } from "@/lib/properties";
import { getGuaranteeLabel } from "@/lib/listing-summary";

// Optional questions a tenant can add to the first WhatsApp message. Only codes travel in the
// link; the text is written here, so nobody can put words in the tenant's mouth through a URL.
export const whatsappQuestionLabels = {
  garantia: "¿Cuánto es la garantía?",
  expensas: "¿Cuánto se paga de expensas al mes?",
  servicios: "¿Agua, luz e internet están incluidos o se pagan aparte?",
  banos: "¿Cuántos baños tiene?",
  desde: "¿Desde qué fecha se puede entrar?",
  contrato: "¿Por cuánto tiempo mínimo se alquila?",
} as const;

export type WhatsappQuestion = keyof typeof whatsappQuestionLabels;

export const moveInOptions = {
  pronto: "lo antes posible",
  "este-mes": "este mes",
  "proximo-mes": "el próximo mes",
  despues: "en unos meses",
} as const;

export type MoveIn = keyof typeof moveInOptions;

export type WhatsappQuestionChoices = {
  questions: WhatsappQuestion[];
  people: number | null;
  pet: boolean;
  moveIn: MoveIn | null;
};

export const emptyQuestionChoices: WhatsappQuestionChoices = { questions: [], people: null, pet: false, moveIn: null };

// Questions offered for a listing: first what the listing leaves "pendiente de consulta".
export function suggestedQuestions(property: Pick<Property, "requirements" | "rentalDetails" | "bathrooms">): WhatsappQuestion[] {
  const pending: WhatsappQuestion[] = [];
  if (getGuaranteeLabel(property) === "Consultar") pending.push("garantia");
  if (!property.rentalDetails) pending.push("expensas");
  if (!(property.bathrooms > 0)) pending.push("banos");
  return [...pending, "servicios", "desde", "contrato"];
}

export function questionsQuery(choices: WhatsappQuestionChoices) {
  const params = new URLSearchParams();
  if (choices.questions.length) params.set("preguntas", choices.questions.join(","));
  if (choices.people) params.set("personas", String(choices.people));
  if (choices.pet) params.set("mascota", "1");
  if (choices.moveIn) params.set("mudanza", choices.moveIn);
  return params.toString();
}

export function readQuestionChoices(params: { get(name: string): string | null }): WhatsappQuestionChoices {
  const questions = (params.get("preguntas") ?? "")
    .split(",")
    .filter((code, index, all): code is WhatsappQuestion => Object.hasOwn(whatsappQuestionLabels, code) && all.indexOf(code) === index);
  const people = Number(params.get("personas"));
  const moveIn = params.get("mudanza");
  return {
    questions,
    people: Number.isInteger(people) && people >= 1 && people <= 9 ? people : null,
    pet: params.get("mascota") === "1",
    moveIn: moveIn && Object.hasOwn(moveInOptions, moveIn) ? (moveIn as MoveIn) : null,
  };
}

// Extra lines for the first message, in the order an owner reads them.
export function questionLines(choices: WhatsappQuestionChoices) {
  return [
    choices.people ? (choices.people === 1 ? "Sería solo para mí." : `Seríamos ${choices.people} personas.`) : null,
    choices.pet ? "Tengo una mascota, ¿la aceptan?" : null,
    choices.moveIn ? `Me mudaría ${moveInOptions[choices.moveIn]}.` : null,
    ...choices.questions.map((code) => whatsappQuestionLabels[code]),
  ].filter((line): line is string => Boolean(line));
}
