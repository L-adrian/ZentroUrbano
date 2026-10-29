"use client";

import { Printer } from "lucide-react";

// "Guardar como PDF": the browser's print window, where the PDF option is.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-[8px] bg-[#176b4d] px-4 text-sm font-semibold text-white hover:bg-[#10533b]"
    >
      <Printer className="h-4 w-4" aria-hidden="true" />
      Guardar como PDF
    </button>
  );
}
