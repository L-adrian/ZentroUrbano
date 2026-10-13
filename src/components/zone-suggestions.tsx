import { zoneSuggestions } from "@/lib/santa-cruz-zones";

// Suggestions for a zone input (list={id}); typing another name is still allowed.
export function ZoneSuggestions({ id }: { id: string }) {
  return (
    <datalist id={id}>
      {zoneSuggestions.map((item) => <option key={item.name} value={item.name} label={item.sector} />)}
    </datalist>
  );
}
