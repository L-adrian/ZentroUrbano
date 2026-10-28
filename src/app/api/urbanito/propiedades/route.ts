import { getPublishedPropertiesData } from "@/lib/property-data";
import { visibleOrigin } from "@/lib/request-origin";
import { getDirectRentals } from "@/lib/rentals";
import { matchesUrbanitoFilters, readUrbanitoFilters, toUrbanitoListing, urbanitoResultLimit } from "@/lib/urbanito-input";
import { forUrbanito, reply } from "../reply";

// Published owner-direct rentals that match what the person asked the bot for.
export async function GET(request: Request) {
  return forUrbanito(request, async () => {
    const filters = readUrbanitoFilters(new URL(request.url).searchParams);
    const matches = getDirectRentals(await getPublishedPropertiesData()).filter((property) => matchesUrbanitoFilters(property, filters));
    const origin = visibleOrigin(request);
    return reply(200, { total: matches.length, items: matches.slice(0, urbanitoResultLimit).map((property) => toUrbanitoListing(property, origin)) });
  });
}
