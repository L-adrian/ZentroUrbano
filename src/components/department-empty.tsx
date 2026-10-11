import { Home } from "lucide-react";
import type { Department } from "@/lib/regions";

export function DepartmentEmpty({ department }: { department: Department }) {
  return <div className="zu-container"><div className="zu-empty">
    <Home size={32} />
    <h2>{`Aún no hay alquileres en ${department.name}`}</h2>
    <p>Estamos empezando en Santa Cruz y abriremos más ciudades pronto. Puedes cambiar de ciudad desde el menú de arriba.</p>
  </div></div>;
}
