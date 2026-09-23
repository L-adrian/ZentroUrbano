import { ChevronDown } from "lucide-react";

export function RentalFaqItem({ question, answer }: { question: string; answer: string }) {
  return <details className="rental-faq-item">
    <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
    <div className="rental-faq-answer"><p>{answer}</p></div>
  </details>;
}
