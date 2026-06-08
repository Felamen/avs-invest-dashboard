export type ListingPlatform =
  | "rightmove"
  | "zoopla"
  | "landRegistry"
  | "gumtree"
  | "airbnb"
  | "booking";

export const platformLabels: Record<ListingPlatform, string> = {
  rightmove: "Rightmove",
  zoopla: "Zoopla",
  landRegistry: "Land Registry",
  gumtree: "Gumtree",
  airbnb: "Airbnb",
  booking: "Booking.com",
};

export const platformGroups = {
  soldPrices: ["rightmove", "zoopla", "landRegistry"] as ListingPlatform[],
  forSale: ["gumtree"] as ListingPlatform[],
  shortLet: ["airbnb", "booking"] as ListingPlatform[],
};

export function listingUrl(
  platform: ListingPlatform,
  postcode: string,
  city: string
): string {
  const pc = postcode.trim();
  const pcEnc = encodeURIComponent(pc);
  const pcDash = pc.replace(/\s+/g, "-").toLowerCase();
  const cityEnc = encodeURIComponent(city);

  switch (platform) {
    case "rightmove":
      return `https://www.rightmove.co.uk/house-prices/${pcDash}.html`;
    case "zoopla":
      return `https://www.zoopla.co.uk/house-prices/${pcDash}/`;
    case "landRegistry":
      return `https://landregistry.data.gov.uk/app/ppd?et%5B%5D=lrcommon%3Afreehold&et%5B%5D=lrcommon%3Aleasehold&postcode=${pcEnc}`;
    case "gumtree":
      return `https://www.gumtree.com/search?search_category=property-for-sale&search_location=${pcEnc}`;
    case "airbnb":
      return `https://www.airbnb.co.uk/s/${pcEnc}/homes`;
    case "booking":
      return `https://www.booking.com/searchresults.html?ss=${pcEnc}+${cityEnc}`;
  }
}
