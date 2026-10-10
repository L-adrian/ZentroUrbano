/* eslint-disable @next/next/no-img-element */
import type { Metadata } from "next";
import Link from "next/link";
import { FileText, ShieldCheck, UserRound } from "lucide-react";
import { buildSeoMetadata } from "@/lib/seo";
import { formatBob, getService, servicePackages, services } from "@/lib/services";
import { ArrowRight, AudienceSwitch, PackageGrid, ServiceCard, serviceHref } from "../components";

export const metadata: Metadata = buildSeoMetadata({
  title: "Servicios para inquilinos",
  description: "Buscar y contactar dueños siempre es gratis. Servicios opcionales para alquilar tranquilo: inquilino verificado, visitas por videollamada, inventario de entrada y revisión de contrato.",
  path: "/servicios/inquilinos",
});

export default function TenantServicesPage() {
  const verified = getService("inquilino-verificado");
  return <>
    <AudienceSwitch active="tenant" />
    <p className="eyebrow" style={{ marginTop: 26 }}><UserRound size={18} />Servicios para inquilinos</p>
    <h1>Alquila tranquilo, sin sorpresas</h1>
    <p className="lead">Buscar y hablar con los dueños siempre es gratis. Estos servicios son opcionales y te ahorran tiempo, viajes y problemas con tu garantía.</p>
    {verified && <section className="t-hero">
      <div className="th-tx">
        <p className="eyebrow"><ShieldCheck size={18} />El más pedido</p>
        <h2>{verified.title}</h2>
        <p>Te verificamos una vez y recibes una constancia en PDF para mandar a cada dueño por WhatsApp. Te responden antes y no repites papeles.</p>
        <div className="phh-pr" style={{ marginTop: 18 }}><strong>{formatBob(verified.price)}</strong><span>pago único · válida 12 meses</span></div>
        <Link className="btn wa" style={{ marginTop: 16, alignSelf: "flex-start" }} href={serviceHref(verified.slug)}>Ver detalle <ArrowRight size={18} /></Link>
      </div>
      <div className="th-demo">
        <img src="/images/servicios/t-hero.jpg" alt="" />
        <div className="chat">
          <div className="chat-h"><b>WhatsApp del dueño</b><span>Departamento en Equipetrol</span></div>
          <div className="chat-m">
            <div className="av">MR</div>
            <div>
              <div className="nm">María Rojas</div>
              <p>Hola, me interesa el departamento. Somos 2 personas, sin mascotas, y podemos entrar el 1 de noviembre. Te paso mi constancia.</p>
              <div className="cert"><span><FileText size={18} /></span><div><b>Constancia Zentro Urbano.pdf</b><small>Identidad, ingresos y referencias confirmados</small></div></div>
              <div className="chat-tick">10:42 ✓✓</div>
            </div>
          </div>
          <div className="chat-m dim"><div className="av g">JP</div><div><div className="nm">Juan Pérez</div><p>Hola, ¿sigue disponible?</p></div></div>
          <div className="chat-f">Ejemplo de lo que recibe el dueño</div>
        </div>
      </div>
    </section>}
    <h2 className="ph2">Servicios para inquilinos</h2>
    <div className="grid">{services.filter(service => service.audience === "tenant").map(service => <ServiceCard key={service.slug} service={service} />)}</div>
    <h2 className="ph2">Paquetes para inquilinos</h2>
    <PackageGrid className="pcgrid two" packages={servicePackages.filter(pkg => pkg.audience === "tenant")} />
    <p className="note">Precios en bolivianos. Te confirmamos el precio final por WhatsApp antes de empezar. Zentro Urbano nunca cobra por buscar, ver anuncios ni contactar a un dueño, y no garantiza que un dueño te alquile.</p>
  </>;
}
