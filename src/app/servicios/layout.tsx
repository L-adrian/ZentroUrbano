import "./servicios.css";

export default function ServicesLayout({ children }: { children: React.ReactNode }) {
  return <main id="contenido" className="zu-container svc">{children}</main>;
}
