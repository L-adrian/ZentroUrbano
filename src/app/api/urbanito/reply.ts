import { NextResponse } from "next/server";
import { urbanitoAuthorized, urbanitoEnabled, UrbanitoUnavailable } from "@/lib/urbanito";

export const reply = (status: number, body: Record<string, unknown>) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });

// Every /api/urbanito route: only the bot, with the shared key, and a 503 until the table exists.
export async function forUrbanito(request: Request, work: () => Promise<Response>) {
  if (!urbanitoEnabled()) return reply(503, { message: "La conexión con Urbanito no está activa." });
  if (!urbanitoAuthorized(request)) return reply(401, { message: "Clave de Urbanito incorrecta." });
  try {
    return await work();
  } catch (error) {
    if (error instanceof UrbanitoUnavailable) return reply(503, { message: "Falta preparar la base de datos para Urbanito." });
    console.error("urbanito api failed", error);
    return reply(500, { message: "Zentro no pudo responder. Probá de nuevo en un rato." });
  }
}
