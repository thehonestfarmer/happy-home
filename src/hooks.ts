import { PROPERTIES, SLIDES } from "@/app/fixtures";
import listings from "../public/listings.json";

export function useLoadListings() {
  // here we want to load/read the same json as the other root page
  const { newListings = [] } = listings;
  const listingKeys = Object.keys(newListings);
  const stubbedListings = listingKeys.map((idx) => {
    const item = newListings[String(idx)];
    if (item.links === "link") {
      item.links = {};
      item.links.listingImages = SLIDES.map((i) => i.src);
    }

    return {
      ...item,
      ...PROPERTIES[listingKeys.length % PROPERTIES.length],
      id: idx,
      priceUsd: parseInt(
        (parseFloat(item.prices.split(": million yen")[0]) * 100 * 100 * 100) /
          151,
      ),
    };
  });

  return stubbedListings;
}
