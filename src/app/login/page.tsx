import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginPanel } from "@/components/login-panel";
import { buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Iniciar sesion",
  description: "Acceso para propietarios con viviendas publicadas en Zentro Urbano.",
  path: "/login",
  noIndex: true,
});

export default async function LoginPage() {
  return (
    <main id="contenido" className="bg-white">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <Suspense fallback={<LoginFallback />}>
          <LoginPanel authEnabled />
        </Suspense>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <div className="rounded-[28px] border border-black/10 bg-white p-6">
      <p className="text-sm font-semibold text-neutral-500">Cargando acceso...</p>
    </div>
  );
}
