"use client";

import { useEffect, useState } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";

import {
  formatGBP,
  roiColor,
  type Property,
} from "@/lib/mockData";
import { platformLabels } from "@/lib/listingLinks";
import {
  type DemoListing,
  platformBrand,
} from "@/lib/demoListings";
import { daysUntil, type NotionProperty, type NotionDeal } from "@/lib/notionApi";

type MapType = "roadmap" | "satellite" | "hybrid";

type Props = {
  properties: Property[];
  selectedId?: string;
  onSelect?: (p: Property) => void;
  flyTarget?: { lat: number; lng: number; label: string; ts: number } | null;
  demoListings?: DemoListing[];
  avsOwned?: NotionProperty[];
  pipelineDeals?: NotionDeal[];
  height?: string | number;
};

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const MAP_ID = "AVS_INVEST_MAP";

export default function PropertyMap(props: Props) {
  if (!API_KEY) {
    return (
      <div
        className="h-full rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-sm text-slate-500 p-6 text-center"
        style={{ height: props.height ?? "100%" }}
      >
        Google Maps API key missing. Add{" "}
        <code className="mx-1 px-1 bg-slate-200 rounded">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
        to <code className="mx-1 px-1 bg-slate-200 rounded">client/.env.local</code>.
      </div>
    );
  }
  return (
    <APIProvider apiKey={API_KEY}>
      <MapInner {...props} />
    </APIProvider>
  );
}

function MapInner({
  properties,
  selectedId,
  onSelect,
  flyTarget,
  demoListings = [],
  avsOwned = [],
  pipelineDeals = [],
  height = "100%",
}: Props) {
  const [mapType, setMapType] = useState<MapType>("roadmap");
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Auto-open the popup for the selected mock property (deep link from /properties).
  useEffect(() => {
    if (selectedId) setOpenKey(`mock-${selectedId}`);
  }, [selectedId]);

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100"
      style={{ height }}
    >
      <Map
        mapId={MAP_ID}
        defaultCenter={{ lat: 53.0, lng: -2.0 }}
        defaultZoom={6}
        mapTypeId={mapType}
        gestureHandling="greedy"
        disableDefaultUI={false}
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        onClick={() => setOpenKey(null)}
      >
        <FlyToSelectedMock properties={properties} selectedId={selectedId} />
        <FlyToTarget target={flyTarget} />

        {/* Demo listing pins (legacy mock — usually empty) */}
        {demoListings.map((d) => {
          const key = `demo-${d.id}`;
          return (
            <AdvancedMarker
              key={key}
              position={{ lat: d.lat, lng: d.lng }}
              zIndex={100}
              onClick={() => setOpenKey(key)}
            >
              <DemoListingPin listing={d} />
            </AdvancedMarker>
          );
        })}

        {/* Pipeline deal pins (Notion CE Pipeline) */}
        {pipelineDeals
          .filter((d) => d.lat != null && d.lng != null)
          .map((d) => {
            const key = `pipe-${d.id}`;
            return (
              <AdvancedMarker
                key={key}
                position={{ lat: d.lat!, lng: d.lng! }}
                zIndex={400}
                onClick={() => setOpenKey(key)}
              >
                <PipelinePin deal={d} />
              </AdvancedMarker>
            );
          })}

        {/* Legacy mock property price-pill pins (usually empty) */}
        {properties.map((p) => {
          const key = `mock-${p.id}`;
          return (
            <AdvancedMarker
              key={key}
              position={{ lat: p.lat, lng: p.lng }}
              zIndex={500}
              onClick={() => {
                setOpenKey(key);
                onSelect?.(p);
              }}
            >
              <PricePin property={p} isSelected={p.id === selectedId} />
            </AdvancedMarker>
          );
        })}

        {/* AVS Owned pins (Notion Properties) */}
        {avsOwned
          .filter((p) => p.place)
          .map((p) => {
            const key = `avs-${p.id}`;
            return (
              <AdvancedMarker
                key={key}
                position={{ lat: p.place!.lat, lng: p.place!.lng }}
                zIndex={800}
                onClick={() => setOpenKey(key)}
              >
                <AvsOwnedPin property={p} />
              </AdvancedMarker>
            );
          })}

        {/* InfoWindows — only one open at a time */}
        {openKey && (
          <SelectedInfoWindow
            openKey={openKey}
            onClose={() => setOpenKey(null)}
            avsOwned={avsOwned}
            pipelineDeals={pipelineDeals}
            properties={properties}
            demoListings={demoListings}
          />
        )}

        <FitAllOnce
          properties={properties}
          avsOwned={avsOwned}
          pipelineDeals={pipelineDeals}
        />
      </Map>

      <MapControls
        mapType={mapType}
        onMapTypeChange={setMapType}
        properties={properties}
        avsOwned={avsOwned}
        pipelineDeals={pipelineDeals}
      />
    </div>
  );
}

// ============================================================
// Map controls (top-right) — map type switcher + fit-all
// ============================================================

function MapControls({
  mapType,
  onMapTypeChange,
  properties,
  avsOwned,
  pipelineDeals,
}: {
  mapType: MapType;
  onMapTypeChange: (m: MapType) => void;
  properties: Property[];
  avsOwned: NotionProperty[];
  pipelineDeals: NotionDeal[];
}) {
  const map = useMap();

  const fitAll = () => {
    if (!map || typeof google === "undefined") return;
    const points: google.maps.LatLngLiteral[] = [
      ...properties.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...avsOwned
        .filter((p) => p.place)
        .map((p) => ({ lat: p.place!.lat, lng: p.place!.lng })),
      ...pipelineDeals
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({ lat: d.lat!, lng: d.lng! })),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(14);
      return;
    }
    const bounds = new google.maps.LatLngBounds();
    points.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 60);
  };

  return (
    <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2 items-end">
      <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex">
        <LayerBtn active={mapType === "roadmap"} onClick={() => onMapTypeChange("roadmap")}>
          Map
        </LayerBtn>
        <LayerBtn active={mapType === "satellite"} onClick={() => onMapTypeChange("satellite")}>
          Satellite
        </LayerBtn>
        <LayerBtn active={mapType === "hybrid"} onClick={() => onMapTypeChange("hybrid")}>
          Hybrid
        </LayerBtn>
      </div>
      <button
        type="button"
        onClick={fitAll}
        className="bg-white rounded-lg shadow-md border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 flex items-center gap-1.5"
        title="Fit all properties"
      >
        <span aria-hidden>⛶</span>
        Fit all
      </button>
    </div>
  );
}

function LayerBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-2 text-xs font-medium transition-colors",
        active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

// ============================================================
// One-time fit on initial load when there are points to show
// ============================================================

function FitAllOnce({
  properties,
  avsOwned,
  pipelineDeals,
}: {
  properties: Property[];
  avsOwned: NotionProperty[];
  pipelineDeals: NotionDeal[];
}) {
  const map = useMap();
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (!map || typeof google === "undefined") return;
    const points: google.maps.LatLngLiteral[] = [
      ...properties.map((p) => ({ lat: p.lat, lng: p.lng })),
      ...avsOwned
        .filter((p) => p.place)
        .map((p) => ({ lat: p.place!.lat, lng: p.place!.lng })),
      ...pipelineDeals
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => ({ lat: d.lat!, lng: d.lng! })),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.panTo(points[0]);
      map.setZoom(14);
    } else {
      const bounds = new google.maps.LatLngBounds();
      points.forEach((p) => bounds.extend(p));
      map.fitBounds(bounds, 60);
    }
    setDone(true);
  }, [map, properties, avsOwned, pipelineDeals, done]);
  return null;
}

// ============================================================
// Fly-to behaviors
// ============================================================

function FlyToSelectedMock({
  properties,
  selectedId,
}: {
  properties: Property[];
  selectedId?: string;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !selectedId) return;
    const p = properties.find((x) => x.id === selectedId);
    if (!p) return;
    map.panTo({ lat: p.lat, lng: p.lng });
    map.setZoom(14);
  }, [map, properties, selectedId]);
  return null;
}

function FlyToTarget({
  target,
}: {
  target?: { lat: number; lng: number; label: string; ts: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !target) return;
    map.panTo({ lat: target.lat, lng: target.lng });
    map.setZoom(15);
  }, [map, target?.ts, target]);
  return null;
}

// ============================================================
// Single InfoWindow renderer, finds the right entity by key
// ============================================================

function SelectedInfoWindow({
  openKey,
  onClose,
  avsOwned,
  pipelineDeals,
  properties,
  demoListings,
}: {
  openKey: string;
  onClose: () => void;
  avsOwned: NotionProperty[];
  pipelineDeals: NotionDeal[];
  properties: Property[];
  demoListings: DemoListing[];
}) {
  // AVS Owned
  if (openKey.startsWith("avs-")) {
    const id = openKey.slice(4);
    const p = avsOwned.find((x) => x.id === id);
    if (!p || !p.place) return null;
    return (
      <InfoWindow
        position={{ lat: p.place.lat, lng: p.place.lng }}
        onCloseClick={onClose}
        pixelOffset={[0, -36]}
      >
        <AvsOwnedPopupContent property={p} />
      </InfoWindow>
    );
  }
  // Pipeline
  if (openKey.startsWith("pipe-")) {
    const id = openKey.slice(5);
    const d = pipelineDeals.find((x) => x.id === id);
    if (!d || d.lat == null || d.lng == null) return null;
    return (
      <InfoWindow
        position={{ lat: d.lat, lng: d.lng }}
        onCloseClick={onClose}
        pixelOffset={[0, -36]}
      >
        <PipelinePopupContent deal={d} />
      </InfoWindow>
    );
  }
  // Mock property
  if (openKey.startsWith("mock-")) {
    const id = openKey.slice(5);
    const p = properties.find((x) => x.id === id);
    if (!p) return null;
    return (
      <InfoWindow
        position={{ lat: p.lat, lng: p.lng }}
        onCloseClick={onClose}
        pixelOffset={[0, -36]}
      >
        <PopupContent property={p} />
      </InfoWindow>
    );
  }
  // Demo listing
  if (openKey.startsWith("demo-")) {
    const id = openKey.slice(5);
    const d = demoListings.find((x) => x.id === id);
    if (!d) return null;
    return (
      <InfoWindow
        position={{ lat: d.lat, lng: d.lng }}
        onCloseClick={onClose}
        pixelOffset={[0, -22]}
      >
        <DemoPopupContent listing={d} />
      </InfoWindow>
    );
  }
  return null;
}

// ============================================================
// MARKER PINS — custom JSX inside AdvancedMarker
// ============================================================

function AvsOwnedPin({ property: p }: { property: NotionProperty }) {
  const dot =
    p.compliance === "Green"
      ? "#10b981"
      : p.compliance === "Amber"
      ? "#f59e0b"
      : p.compliance === "Red"
      ? "#ef4444"
      : "#94a3b8";
  return (
    <div className="cursor-pointer" style={{ transform: "translateY(-50%)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.35))" }}>
      <div
        className="flex items-center gap-1.5 text-white font-extrabold text-[11px] px-2.5 py-1 rounded-full border-[2.5px] border-white whitespace-nowrap"
        style={{
          background: "linear-gradient(135deg, #0A6F76 0%, #0DB39E 100%)",
          textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          letterSpacing: "0.04em",
        }}
      >
        <span
          className="w-[18px] h-[18px] rounded-full bg-white flex items-center justify-center font-black text-[11px]"
          style={{ color: "#0A6F76" }}
        >
          A
        </span>
        <span>AVS OWNED</span>
        <span
          className="w-[9px] h-[9px] rounded-full"
          style={{ background: dot, boxShadow: "0 0 0 2px rgba(255,255,255,0.9)" }}
        />
      </div>
      <div className="flex justify-center mt-[-1px]">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "8px solid #0DB39E",
          }}
        />
      </div>
    </div>
  );
}

function PipelinePin({ deal: d }: { deal: NotionDeal }) {
  const dot =
    d.confidence === "High"
      ? "#10b981"
      : d.confidence === "Medium"
      ? "#f59e0b"
      : "#94a3b8";
  const stageShort = (d.coreStage || "Deal").length > 18 ? (d.coreStage || "Deal").slice(0, 16) + "…" : d.coreStage || "Deal";
  return (
    <div className="cursor-pointer" style={{ transform: "translateY(-50%)", filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.3))" }}>
      <div
        className="flex items-center gap-1.5 text-white font-bold text-[10px] px-2 py-1 rounded-full border-2 border-white whitespace-nowrap"
        style={{
          background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
          textShadow: "0 1px 1px rgba(0,0,0,0.25)",
        }}
      >
        <span
          className="w-[15px] h-[15px] rounded-full bg-white flex items-center justify-center font-black text-[9px]"
          style={{ color: "#b45309" }}
        >
          P
        </span>
        <span>{stageShort.toUpperCase()}</span>
        <span
          className="w-2 h-2 rounded-full"
          style={{ background: dot, boxShadow: "0 0 0 1.5px rgba(255,255,255,0.9)" }}
        />
      </div>
      <div className="flex justify-center mt-[-1px]">
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "7px solid #f59e0b",
          }}
        />
      </div>
    </div>
  );
}

function PricePin({ property: p, isSelected }: { property: Property; isSelected: boolean }) {
  const bg = roiColor(p.roi);
  return (
    <div
      className="cursor-pointer transition-transform"
      style={{
        transform: `translateY(-50%) scale(${isSelected ? 1.15 : 1})`,
        zIndex: isSelected ? 1000 : 500,
      }}
    >
      <div
        className="text-white font-extrabold text-[14px] px-3.5 py-1.5 rounded-full border-[2.5px] border-white whitespace-nowrap inline-flex items-center gap-1.5"
        style={{
          background: bg,
          textShadow: "0 1px 2px rgba(0,0,0,0.25)",
          letterSpacing: "-0.02em",
          boxShadow: isSelected
            ? "0 5px 16px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.35)"
            : "0 3px 10px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3)",
        }}
      >
        <span>{compactGBP(p.monthlyIncome)}</span>
        <span
          className="text-[11px] font-bold px-1.5 py-px rounded-full"
          style={{ background: "rgba(255,255,255,0.25)" }}
        >
          {p.roi.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

function DemoListingPin({ listing: d }: { listing: DemoListing }) {
  const brand = platformBrand[d.platform];
  return (
    <div
      className="cursor-pointer bg-white text-slate-900 font-bold text-[11px] px-2 py-0.5 rounded-full whitespace-nowrap"
      style={{
        border: `1.5px solid ${brand.color}`,
        boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
        opacity: 0.96,
        transform: "translateY(-50%)",
      }}
    >
      £{d.pricePerNight}
    </div>
  );
}

function compactGBP(n: number): string {
  if (n >= 1000) return `£${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `£${n}`;
}

// ============================================================
// POPUP CONTENT components — same JSX as legacy, in a div wrapper
// ============================================================

function streetViewUrl(lat: number, lng: number, size = "560x220"): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/streetview?size=${size}&location=${lat},${lng}&fov=80&pitch=0&key=${key}`;
}
function staticMapUrl(lat: number, lng: number, size = "560x220"): string | null {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  return `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=17&size=${size}&maptype=satellite&markers=color:red%7C${lat},${lng}&key=${key}`;
}

function PropertyHero({ lat, lng }: { lat: number; lng: number }) {
  const sv = streetViewUrl(lat, lng);
  const sat = staticMapUrl(lat, lng);
  const [view, setView] = useState<"street" | "satellite">("street");
  const [streetFailed, setStreetFailed] = useState(false);
  if (!sv && !sat) return null;
  const showSat = view === "satellite" || streetFailed;
  const url = showSat ? sat : sv;
  return (
    <div className="relative h-40 bg-slate-200 overflow-hidden border-b border-slate-200 -mx-3 -mt-3">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={showSat ? "Satellite" : "Street View"}
          className="w-full h-full object-cover"
          onError={() => !showSat && setStreetFailed(true)}
        />
      )}
      <div className="absolute top-2 right-2 flex gap-1 bg-white/95 rounded-md p-0.5 shadow text-[10px] font-medium">
        <button onClick={() => setView("street")} className={`px-2 py-0.5 rounded ${!showSat ? "bg-slate-900 text-white" : "text-slate-700"}`}>
          Street
        </button>
        <button onClick={() => setView("satellite")} className={`px-2 py-0.5 rounded ${showSat ? "bg-slate-900 text-white" : "text-slate-700"}`}>
          Satellite
        </button>
      </div>
    </div>
  );
}

function Tag({ color, children }: { color: "emerald" | "amber" | "rose" | "slate" | "indigo"; children: React.ReactNode }) {
  const cls = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-800",
  }[color];
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>{children}</span>;
}

function extractUkPhone(text: string): string | null {
  if (!text) return null;
  const m = text.match(/(?:\+?44\s?7|0\s?7)\s?\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}/);
  return m ? m[0].replace(/[\s-]/g, "") : null;
}
function normalisePhone(raw: string): string {
  let p = raw.replace(/[\s-]/g, "");
  if (p.startsWith("+44")) p = "44" + p.slice(3);
  else if (p.startsWith("0")) p = "44" + p.slice(1);
  return p;
}
function extractUkPostcode(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})\b/i);
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase()}` : null;
}

function PostcodeLinks({ postcode }: { postcode: string }) {
  const pc = postcode.trim();
  const pcEnc = encodeURIComponent(pc);
  const pcDash = pc.replace(/\s+/g, "-").toLowerCase();
  const links = [
    { label: "Rightmove (to rent)", url: `https://www.rightmove.co.uk/property-to-rent/find.html?searchLocation=${pcEnc}&radius=0.5` },
    { label: "Zoopla (to rent)", url: `https://www.zoopla.co.uk/to-rent/property/${pcDash}/` },
    { label: "OpenRent", url: `https://www.openrent.co.uk/properties-to-rent/${pcDash}?term=${pcEnc}` },
    { label: "SpareRoom", url: `https://www.spareroom.co.uk/flatshare/?search_type=offered&search_id=&search=postcodes&pcs=${pcEnc}` },
    { label: "Sold prices", url: `https://www.rightmove.co.uk/house-prices/${pcDash}.html` },
  ];
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        Live listings near {pc}
      </div>
      <div className="flex flex-wrap gap-1">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] bg-white border border-slate-200 hover:border-slate-400 text-slate-700 px-2 py-0.5 rounded-full font-medium transition-colors"
          >
            {l.label} ↗
          </a>
        ))}
      </div>
    </div>
  );
}

function AvsOwnedPopupContent({ property: p }: { property: NotionProperty }) {
  const complianceColor =
    p.compliance === "Green" ? "#10b981" :
    p.compliance === "Amber" ? "#f59e0b" :
    p.compliance === "Red" ? "#ef4444" : "#94a3b8";
  const certs = [
    { label: "Gas", days: daysUntil(p.gasExpiry), hasDate: !!p.gasExpiry },
    { label: "EICR", days: daysUntil(p.eicrExpiry), hasDate: !!p.eicrExpiry },
    { label: "HMO", days: daysUntil(p.hmoExpiry), hasDate: !!p.hmoExpiry },
    { label: "Inspection", days: daysUntil(p.nextInspection), hasDate: !!p.nextInspection },
  ];
  const postcode = p.place?.address ? extractUkPostcode(p.place.address) : null;

  return (
    <div className="text-[13px] leading-tight max-h-[60vh] overflow-y-auto" style={{ width: 320 }}>
      {p.place && <PropertyHero lat={p.place.lat} lng={p.place.lng} />}
      <div className="px-4 pt-3 pb-3 text-white relative -mx-3 -mt-3" style={{ background: "linear-gradient(135deg, #0A6F76 0%, #0DB39E 100%)" }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-white text-[#0A6F76] w-6 h-6 rounded-full flex items-center justify-center font-black text-[13px]">A</span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">AVS Owned</span>
          {p.compliance && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: complianceColor + "33" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: complianceColor }} />
              {p.compliance}
            </span>
          )}
        </div>
        <div className="font-semibold text-[15px] leading-snug">{p.address || "(no address)"}</div>
        {p.place?.address && <div className="text-[11px] opacity-90 mt-0.5 leading-snug">{p.place.address}</div>}
        {p.monthlyIncome !== null && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Expected income</div>
            <div className="text-[18px] font-bold leading-none mt-0.5">
              {formatGBP(p.monthlyIncome)}
              <span className="text-[11px] font-medium opacity-80 ml-1">/mo</span>
            </div>
          </div>
        )}
      </div>
      <div className="px-1 py-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {p.status && <Tag color="emerald">{p.status}</Tag>}
          {p.statusBackOffice && <Tag color="slate">{p.statusBackOffice}</Tag>}
          {p.managementModel && <Tag color="indigo">{p.managementModel}</Tag>}
          {p.propertyType.map((t) => <Tag key={t} color="slate">{t}</Tag>)}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">Compliance dates</div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {certs.map((c) => <PopupCertChip key={c.label} {...c} />)}
          </div>
        </div>
        {postcode && (<div className="border-t border-slate-100 pt-2"><PostcodeLinks postcode={postcode} /></div>)}
        <a href={p.notionUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-[12px] font-semibold py-2 rounded-md text-white hover:opacity-90" style={{ background: "linear-gradient(135deg, #0A6F76 0%, #0DB39E 100%)" }}>
          Open in Notion ↗
        </a>
      </div>
    </div>
  );
}

function PopupCertChip({ label, days, hasDate }: { label: string; days: number | null; hasDate: boolean }) {
  if (!hasDate || days === null) {
    return <div className="text-slate-400"><span className="font-medium text-slate-600">{label}:</span> <span className="text-[10px]">not set</span></div>;
  }
  const tone = days < 0 ? "text-rose-700" : days < 30 ? "text-amber-700" : "text-emerald-700";
  const word = days < 0 ? `${-days}d overdue` : `${days}d left`;
  return <div className={tone}><span className="font-medium text-slate-700">{label}:</span> <span className="text-[10px] font-semibold">{word}</span></div>;
}

function PipelinePopupContent({ deal: d }: { deal: NotionDeal }) {
  const overdue = d.nextActionDate && new Date(d.nextActionDate).getTime() < Date.now() && !d.isLive;
  const days = d.nextActionDate ? daysUntil(d.nextActionDate) : null;
  const confColor = d.confidence === "High" ? "#10b981" : d.confidence === "Medium" ? "#f59e0b" : "#94a3b8";
  const phoneRaw = extractUkPhone(d.notes) || extractUkPhone(d.landlord);
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  const postcode = extractUkPostcode(d.propertyAddress);

  return (
    <div className="text-[13px] leading-tight max-h-[60vh] overflow-y-auto" style={{ width: 320 }}>
      {d.lat != null && d.lng != null && <PropertyHero lat={d.lat} lng={d.lng} />}
      <div className="px-4 pt-3 pb-3 text-white relative -mx-3 -mt-3" style={{ background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" }}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-white text-[#b45309] w-6 h-6 rounded-full flex items-center justify-center font-black text-[13px]">P</span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">Pipeline Deal</span>
          {d.confidence && (
            <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ml-auto flex items-center gap-1" style={{ background: confColor + "33" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: confColor }} />
              {d.confidence}
            </span>
          )}
        </div>
        <div className="font-semibold text-[14px] leading-snug">{d.dealId || "(no ID)"}</div>
        {d.propertyAddress && <div className="text-[11px] opacity-90 mt-0.5 leading-snug">📍 {d.propertyAddress}</div>}
        {d.monthlyCashflow !== null && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Expected cashflow</div>
            <div className="text-[18px] font-bold leading-none">£{d.monthlyCashflow}<span className="text-[11px] font-medium opacity-80 ml-1">/mo</span></div>
          </div>
        )}
      </div>
      <div className="px-1 py-3 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {d.coreStage && <Tag color="indigo">{d.coreStage}</Tag>}
          {d.source && <Tag color="slate">{d.source}</Tag>}
          {d.direction && <Tag color="slate">{d.direction}</Tag>}
          {d.dealType && <Tag color="slate">{d.dealType}</Tag>}
          {d.propertyType.map((t) => <Tag key={t} color="slate">{t}</Tag>)}
        </div>
        {(d.landlord || phone) && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1.5">
            {d.landlord && <div className="text-[12px]"><span className="text-slate-500">Contact:</span> <span className="font-semibold">{d.landlord}</span></div>}
            {phone && (
              <div className="flex gap-1.5">
                <a href={`tel:+${phone}`} className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800">📞 Call</a>
                <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700">💬 WhatsApp</a>
                <a href={`sms:+${phone}`} className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300">✉ SMS</a>
              </div>
            )}
          </div>
        )}
        {d.nextAction && (
          <div className={`text-[12px] border-t border-slate-100 pt-2 ${overdue ? "text-rose-700" : "text-slate-700"}`}>
            <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">{overdue ? "⚠ Overdue action" : "Next action"}</div>
            <div className="leading-snug">{d.nextAction}</div>
            {d.nextActionDate && (
              <div className={`text-[10px] mt-1 ${overdue ? "text-rose-600 font-semibold" : "text-slate-400"}`}>
                {overdue && days !== null ? `${-days}d overdue · ` : ""}
                {new Date(d.nextActionDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </div>
            )}
          </div>
        )}
        {d.blocker && <div className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded font-medium">🚧 Blocker: {d.blocker}</div>}
        {postcode && <div className="border-t border-slate-100 pt-2"><PostcodeLinks postcode={postcode} /></div>}
        <a href={d.notionUrl} target="_blank" rel="noopener noreferrer" className="block w-full text-center text-[12px] font-semibold py-2 rounded-md text-white hover:opacity-90" style={{ background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)" }}>Open in Notion ↗</a>
      </div>
    </div>
  );
}

function PopupContent({ property: p }: { property: Property }) {
  return (
    <div className="text-[13px] leading-tight" style={{ width: 280 }}>
      <div className="px-3 pt-3 pb-2 text-white -mx-3 -mt-3" style={{ background: `linear-gradient(135deg, ${p.accent} 0%, ${roiColor(p.roi)} 100%)` }}>
        <div className="text-[10px] uppercase tracking-wider opacity-90">{p.id} · {p.status}</div>
        <div className="font-semibold text-[15px] leading-snug">{p.address}</div>
        <div className="text-[12px] opacity-90">{p.city} · {p.postcode}</div>
      </div>
      <div className="py-2 space-y-1.5 text-[12px]">
        <div><span className="text-slate-500">ROI:</span> <span className="font-semibold">{p.roi.toFixed(1)}%</span></div>
        <div><span className="text-slate-500">Income:</span> <span className="font-semibold">{formatGBP(p.monthlyIncome)}/mo</span></div>
        <div><span className="text-slate-500">Type:</span> {p.type} · {p.bedrooms || "Studio"} bed</div>
      </div>
    </div>
  );
}

function DemoPopupContent({ listing: d }: { listing: DemoListing }) {
  const brand = platformBrand[d.platform];
  return (
    <div className="text-[13px] leading-tight" style={{ width: 280 }}>
      <div className="h-24 flex items-end px-3 py-2 relative -mx-3 -mt-3" style={{ background: `linear-gradient(135deg, ${brand.color} 0%, ${brand.color}cc 100%)` }}>
        <div className="text-white">
          <div className="text-[18px] font-bold leading-none">£{d.pricePerNight}</div>
          <div className="text-[10px] opacity-90 mt-0.5">per night</div>
        </div>
      </div>
      <div className="py-2 space-y-1.5">
        <div className="font-semibold text-[13px] leading-snug">{d.title}</div>
        <div className="text-[11px] text-slate-500">{d.bedrooms === 0 ? "Studio" : `${d.bedrooms} bed`} · {d.postcode}</div>
        <a href={`https://www.${d.platform}.co.uk`} target="_blank" rel="noopener noreferrer" className="block text-center text-[12px] font-semibold py-1.5 rounded text-white" style={{ background: brand.color }}>
          {platformLabels[d.platform as keyof typeof platformLabels] || brand.label} ↗
        </a>
      </div>
    </div>
  );
}
