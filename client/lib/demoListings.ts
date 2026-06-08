import type { Property } from "@/lib/mockData";

export type DemoPlatform = "airbnb" | "booking" | "rightmove";

export type DemoListing = {
  id: string;
  platform: DemoPlatform;
  title: string;
  lat: number;
  lng: number;
  pricePerNight: number;
  rating: number;
  reviews: number;
  bedrooms: number;
  accent: string;
  postcode: string;
  city: string;
};

export const platformBrand: Record<
  DemoPlatform,
  { label: string; color: string; bg: string }
> = {
  airbnb: { label: "Airbnb", color: "#FF385C", bg: "#FFE5EB" },
  booking: { label: "Booking.com", color: "#003580", bg: "#E0EAFF" },
  rightmove: { label: "Rightmove", color: "#00DEB6", bg: "#DFFFF6" },
};

const TITLES = [
  "Stylish 1-bed near {area}",
  "Modern studio • {area}",
  "Bright 2-bed apartment, {area}",
  "Designer loft in {area}",
  "Cosy short-stay • {area}",
  "Riverside flat near {area}",
  "Boutique apt • {area}",
  "Penthouse views, {area}",
  "Quiet retreat near {area}",
  "Heart of {area} 1-bed",
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function priceForCity(city: string): { min: number; max: number } {
  const c = city.toLowerCase();
  if (c.includes("london")) return { min: 95, max: 320 };
  if (c.includes("manchester")) return { min: 70, max: 180 };
  if (c.includes("bristol")) return { min: 75, max: 170 };
  if (c.includes("birmingham")) return { min: 60, max: 150 };
  if (c.includes("liverpool")) return { min: 55, max: 140 };
  return { min: 60, max: 160 };
}

export function generateDemoListings(properties: Property[]): DemoListing[] {
  const out: DemoListing[] = [];
  for (const p of properties) {
    const seed = Math.floor((p.lat + p.lng + p.bedrooms + 1) * 100000);
    const rand = seededRandom(seed);
    const count = 6 + Math.floor(rand() * 4);
    const priceRange = priceForCity(p.city);

    for (let i = 0; i < count; i++) {
      const platforms: DemoPlatform[] = ["airbnb", "airbnb", "airbnb", "booking", "booking", "rightmove"];
      const platform = platforms[Math.floor(rand() * platforms.length)];
      const dLat = (rand() - 0.5) * 0.018;
      const dLng = (rand() - 0.5) * 0.024;
      const price = Math.round(priceRange.min + rand() * (priceRange.max - priceRange.min));
      const rating = parseFloat((4.0 + rand() * 0.99).toFixed(2));
      const reviews = Math.floor(8 + rand() * 480);
      const bedrooms = Math.floor(rand() * 3);
      const titleTemplate = TITLES[Math.floor(rand() * TITLES.length)];
      const title = titleTemplate.replace("{area}", p.city);

      out.push({
        id: `DEMO-${p.id}-${i}`,
        platform,
        title,
        lat: p.lat + dLat,
        lng: p.lng + dLng,
        pricePerNight: price,
        rating,
        reviews,
        bedrooms,
        accent: platformBrand[platform].color,
        postcode: p.postcode,
        city: p.city,
      });
    }
  }
  return out;
}
