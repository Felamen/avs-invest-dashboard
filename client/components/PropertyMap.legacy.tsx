"use client";

import { useEffect, useState } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  ZoomControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

import {
  formatGBP,
  roiColor,
  type Property,
} from "@/lib/mockData";
import { listingUrl, platformLabels } from "@/lib/listingLinks";
import {
  type DemoListing,
  platformBrand,
} from "@/lib/demoListings";
import { daysUntil, type NotionProperty, type NotionDeal } from "@/lib/notionApi";

type TileMode = "voyager" | "street" | "satellite";

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

const TILE_LAYERS: Record<TileMode, { url: string; attribution: string }> = {
  voyager: {
    // Stadia Smooth — clean Google-Maps-style basemap with English-preference labels.
    // Free for localhost dev without an API key; for production add a key.
    url: "https://tiles-eu.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  street: {
    // Esri World Street Map — English labels worldwide.
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
  },
};

function compactGBP(n: number): string {
  if (n >= 1000) return `£${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
  return `£${n}`;
}

function demoIcon(d: DemoListing): L.DivIcon {
  const brand = platformBrand[d.platform];
  const html = `
    <div style="
      transform: translate(-50%, -50%);
      background: #ffffff;
      color: #0f172a;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: -0.01em;
      padding: 3px 8px;
      border-radius: 9999px;
      border: 1.5px solid ${brand.color};
      box-shadow: 0 1px 4px rgba(0,0,0,0.25);
      white-space: nowrap;
      cursor: pointer;
      opacity: 0.96;
    ">£${d.pricePerNight}</div>
  `;
  return L.divIcon({
    html,
    className: "avs-demo-marker",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

const COMPLIANCE_COLOR: Record<string, string> = {
  Green: "#10b981",
  Amber: "#f59e0b",
  Red: "#ef4444",
};

const CONFIDENCE_COLOR: Record<string, string> = {
  High: "#10b981",
  Medium: "#f59e0b",
  Low: "#94a3b8",
};

function pipelineIcon(d: NotionDeal): L.DivIcon {
  const dot = d.confidence ? CONFIDENCE_COLOR[d.confidence] || "#94a3b8" : "#94a3b8";
  const stageShort = (d.coreStage || "Deal").length > 18
    ? (d.coreStage || "Deal").slice(0, 16) + "…"
    : d.coreStage || "Deal";
  const html = `
    <div style="
      transform: translate(-50%, -100%);
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.3));
    ">
      <div style="
        background: linear-gradient(135deg, #b45309 0%, #f59e0b 100%);
        color: #ffffff;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.02em;
        padding: 4px 8px 4px 6px;
        border-radius: 9999px;
        border: 2px solid #ffffff;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        text-shadow: 0 1px 1px rgba(0,0,0,0.25);
      ">
        <span style="
          background: #ffffff;
          color: #b45309;
          width: 15px;
          height: 15px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 900;
        ">P</span>
        <span>${stageShort.toUpperCase()}</span>
        <span style="
          width: 8px;
          height: 8px;
          border-radius: 9999px;
          background: ${dot};
          box-shadow: 0 0 0 1.5px rgba(255,255,255,0.9);
        "></span>
      </div>
      <div style="
        width: 5px;
        height: 5px;
        border-left: 5px solid transparent;
        border-right: 5px solid transparent;
        border-top: 7px solid #f59e0b;
        margin-top: -1px;
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "avs-pipeline-marker",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function avsOwnedIcon(p: NotionProperty): L.DivIcon {
  const dot = p.compliance ? COMPLIANCE_COLOR[p.compliance] || "#94a3b8" : "#94a3b8";
  const html = `
    <div style="
      transform: translate(-50%, -100%);
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.35));
    ">
      <div style="
        background: linear-gradient(135deg, #0A6F76 0%, #0DB39E 100%);
        color: #ffffff;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
        padding: 5px 10px 5px 8px;
        border-radius: 9999px;
        border: 2.5px solid #ffffff;
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        text-shadow: 0 1px 2px rgba(0,0,0,0.25);
      ">
        <span style="
          background: #ffffff;
          color: #0A6F76;
          width: 18px;
          height: 18px;
          border-radius: 9999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: -0.02em;
        ">A</span>
        <span>AVS OWNED</span>
        <span style="
          width: 9px;
          height: 9px;
          border-radius: 9999px;
          background: ${dot};
          box-shadow: 0 0 0 2px rgba(255,255,255,0.9);
        "></span>
      </div>
      <div style="
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 8px solid #0DB39E;
        margin-top: -1px;
      "></div>
    </div>
  `;
  return L.divIcon({
    html,
    className: "avs-owned-marker",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function priceIcon(p: Property, isSelected: boolean): L.DivIcon {
  const bg = roiColor(p.roi);
  const scale = isSelected ? 1.15 : 1;
  const html = `
    <div style="
      transform: translate(-50%, -50%) scale(${scale});
      background: ${bg};
      color: #ffffff;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: -0.02em;
      padding: 7px 14px;
      border-radius: 9999px;
      border: 2.5px solid #ffffff;
      box-shadow: 0 3px 10px rgba(0,0,0,0.45), 0 1px 3px rgba(0,0,0,0.3);
      white-space: nowrap;
      cursor: pointer;
      transition: transform 120ms ease;
      text-shadow: 0 1px 2px rgba(0,0,0,0.25);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      ${isSelected ? "z-index: 1000; box-shadow: 0 5px 16px rgba(0,0,0,0.55), 0 2px 4px rgba(0,0,0,0.35);" : ""}
    ">
      <span>${compactGBP(p.monthlyIncome)}</span>
      <span style="
        background: rgba(255,255,255,0.25);
        font-size: 11px;
        font-weight: 700;
        padding: 1px 6px;
        border-radius: 9999px;
        margin-left: 1px;
      ">${p.roi.toFixed(1)}%</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "avs-price-marker",
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

export default function PropertyMap({
  properties,
  selectedId,
  onSelect,
  flyTarget,
  demoListings = [],
  avsOwned = [],
  pipelineDeals = [],
  height = "100%",
}: Props) {
  const [tileMode, setTileMode] = useState<TileMode>("street");

  return (
    <div
      className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100"
      style={{ height }}
    >
      <MapContainer
        center={[53.0, -2.0]}
        zoom={6}
        scrollWheelZoom
        zoomControl={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={tileMode}
          url={TILE_LAYERS[tileMode].url}
          attribution={TILE_LAYERS[tileMode].attribution}
        />

        <ZoomControl position="bottomright" />

        <FlyToSelected
          property={properties.find((p) => p.id === selectedId)}
        />

        <FlyToTarget target={flyTarget} />

        {demoListings.map((d) => (
          <Marker
            key={d.id}
            position={[d.lat, d.lng]}
            icon={demoIcon(d)}
            zIndexOffset={-100}
          >
            <Popup maxWidth={300} minWidth={260}>
              <DemoPopupContent listing={d} />
            </Popup>
          </Marker>
        ))}

        {properties.map((p) => {
          const isSelected = p.id === selectedId;
          return (
            <Marker
              key={p.id}
              position={[p.lat, p.lng]}
              icon={priceIcon(p, isSelected)}
              zIndexOffset={500}
              eventHandlers={{
                click: () => onSelect?.(p),
              }}
            >
              <Popup maxWidth={340} minWidth={300}>
                <PopupContent property={p} />
              </Popup>
            </Marker>
          );
        })}

        {pipelineDeals
          .filter((d) => d.lat != null && d.lng != null)
          .map((d) => (
            <Marker
              key={`pipe-${d.id}`}
              position={[d.lat!, d.lng!]}
              icon={pipelineIcon(d)}
              zIndexOffset={400}
            >
              <Popup maxWidth={340} minWidth={300}>
                <PipelinePopupContent deal={d} />
              </Popup>
            </Marker>
          ))}

        {avsOwned
          .filter((p) => p.place)
          .map((p) => (
            <Marker
              key={`avs-${p.id}`}
              position={[p.place!.lat, p.place!.lng]}
              icon={avsOwnedIcon(p)}
              zIndexOffset={800}
            >
              <Popup maxWidth={340} minWidth={300}>
                <AvsOwnedPopupContent property={p} />
              </Popup>
            </Marker>
          ))}

        <MapControls
          properties={properties}
          avsOwned={avsOwned}
          pipelineDeals={pipelineDeals}
          tileMode={tileMode}
          onTileModeChange={setTileMode}
        />
      </MapContainer>
    </div>
  );
}

function MapControls({
  properties,
  avsOwned,
  pipelineDeals,
  tileMode,
  onTileModeChange,
}: {
  properties: Property[];
  avsOwned: NotionProperty[];
  pipelineDeals: NotionDeal[];
  tileMode: TileMode;
  onTileModeChange: (m: TileMode) => void;
}) {
  const map = useMap();

  const fitAll = () => {
    const points: Array<[number, number]> = [
      ...properties.map((p) => [p.lat, p.lng] as [number, number]),
      ...avsOwned
        .filter((p) => p.place)
        .map((p) => [p.place!.lat, p.place!.lng] as [number, number]),
      ...pipelineDeals
        .filter((d) => d.lat != null && d.lng != null)
        .map((d) => [d.lat!, d.lng!] as [number, number]),
    ];
    if (points.length === 0) return;
    if (points.length === 1) {
      map.flyTo(points[0], 14, { duration: 0.6 });
      return;
    }
    const lats = points.map((pt) => pt[0]);
    const lngs = points.map((pt) => pt[1]);
    map.flyToBounds(
      [
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)],
      ],
      { padding: [60, 60], duration: 0.7 }
    );
  };

  return (
    <div className="leaflet-top leaflet-right">
      <div className="leaflet-control flex flex-col gap-2 m-3">
        <div className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden flex">
          <LayerBtn
            active={tileMode === "voyager"}
            onClick={() => onTileModeChange("voyager")}
          >
            Map
          </LayerBtn>
          <LayerBtn
            active={tileMode === "street"}
            onClick={() => onTileModeChange("street")}
          >
            Street
          </LayerBtn>
          <LayerBtn
            active={tileMode === "satellite"}
            onClick={() => onTileModeChange("satellite")}
          >
            Satellite
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
        active
          ? "bg-slate-900 text-white"
          : "text-slate-700 hover:bg-slate-50",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function DemoPopupContent({ listing: d }: { listing: DemoListing }) {
  const brand = platformBrand[d.platform];
  const stars = "★★★★★".slice(0, Math.round(d.rating));
  const platformDeepLink =
    d.platform === "airbnb"
      ? `https://www.airbnb.co.uk/s/${encodeURIComponent(d.postcode)}/homes`
      : d.platform === "booking"
      ? `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(d.postcode + " " + d.city)}`
      : `https://www.rightmove.co.uk/property-for-sale/find.html?searchLocation=${encodeURIComponent(d.postcode)}`;

  return (
    <div className="text-[13px] leading-tight -m-3">
      <div
        className="h-28 flex items-end px-3 py-2 relative"
        style={{
          background: `linear-gradient(135deg, ${brand.color} 0%, ${brand.color}cc 100%)`,
        }}
      >
        <div className="absolute top-2 left-2 bg-white/95 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase" style={{ color: brand.color }}>
          {brand.label}
        </div>
        <div className="absolute top-2 right-2 bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase">
          Demo
        </div>
        <div className="text-white">
          <div className="text-[18px] font-bold leading-none">£{d.pricePerNight}</div>
          <div className="text-[10px] opacity-90 mt-0.5">per night</div>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-2">
        <div>
          <div className="font-semibold text-[13px] leading-snug">{d.title}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {d.bedrooms === 0 ? "Studio" : `${d.bedrooms} bed`} · {d.postcode}
          </div>
        </div>

        <div className="flex items-center gap-1 text-[12px]">
          <span className="text-amber-500">{stars}</span>
          <span className="font-semibold">{d.rating.toFixed(2)}</span>
          <span className="text-slate-500">({d.reviews} reviews)</span>
        </div>

        <a
          href={platformDeepLink}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-[12px] font-semibold py-2 rounded-md text-white transition-opacity hover:opacity-90"
          style={{ background: brand.color }}
        >
          View on {brand.label} ↗
        </a>

        <div className="text-[10px] text-slate-400 leading-tight border-t border-slate-100 pt-2">
          Sample data for visualisation only. Click "View on {brand.label}" to see actual live listings near {d.postcode}.
        </div>
      </div>
    </div>
  );
}

function FlyToSelected({ property }: { property?: Property }) {
  const map = useMap();
  useEffect(() => {
    if (property) {
      map.flyTo([property.lat, property.lng], 14, { duration: 0.8 });
    }
  }, [property, map]);
  return null;
}

function FlyToTarget({
  target,
}: {
  target?: { lat: number; lng: number; label: string; ts: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], 15, { duration: 1.0 });
    }
  }, [target?.ts, map, target]);
  return null;
}

function PopupContent({ property: p }: { property: Property }) {
  const valueDelta = p.estimatedValue - p.pricePaid;
  const valueDeltaPct = (valueDelta / p.pricePaid) * 100;
  const statusColor =
    p.status === "Active" ? "bg-emerald-500" : p.status === "Vacant" ? "bg-slate-400" : "bg-amber-500";

  return (
    <div className="text-[13px] leading-tight -m-3">
      <div
        className="px-4 pt-4 pb-3 text-white relative"
        style={{
          background: `linear-gradient(135deg, ${p.accent} 0%, ${roiColor(p.roi)} 100%)`,
        }}
      >
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider opacity-90 mb-1">
          <span className={`w-1.5 h-1.5 rounded-full ${statusColor}`} />
          {p.id} · {p.status}
        </div>
        <div className="font-semibold text-[15px] leading-snug">
          {p.address}
        </div>
        <div className="text-[12px] opacity-90 mt-0.5">
          {p.city} · {p.postcode} · {p.type}
        </div>
        <div className="flex items-baseline gap-3 mt-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider opacity-80">ROI</div>
            <div className="text-[22px] font-bold leading-none tracking-tight">
              {p.roi.toFixed(1)}%
            </div>
          </div>
          <div className="border-l border-white/30 pl-3">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Income/mo</div>
            <div className="text-[15px] font-semibold leading-none mt-0.5">
              {formatGBP(p.monthlyIncome)}
            </div>
          </div>
          <div className="border-l border-white/30 pl-3">
            <div className="text-[10px] uppercase tracking-wider opacity-80">Occ.</div>
            <div className="text-[15px] font-semibold leading-none mt-0.5">
              {p.occupancy}%
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <Mini label="Paid" value={formatGBP(p.pricePaid)} />
          <Mini
            label="Now worth"
            value={formatGBP(p.estimatedValue)}
            tone={valueDelta >= 0 ? "emerald" : "rose"}
            sub={`${valueDelta >= 0 ? "+" : ""}${valueDeltaPct.toFixed(1)}%`}
          />
        </div>

      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 text-[12px]">
        <div>
          <div className="text-slate-500">Beds</div>
          <div className="font-medium">{p.bedrooms || "Studio"}</div>
        </div>
        <div>
          <div className="text-slate-500">Baths</div>
          <div className="font-medium">{p.bathrooms}</div>
        </div>
        <div>
          <div className="text-slate-500">Sqft</div>
          <div className="font-medium">{p.sqft}</div>
        </div>
      </div>

      <div className="pt-1 border-t border-slate-100 space-y-1">
        <div className="text-[12px]">
          <span className="text-slate-500">Nearest:</span>{" "}
          <span className="font-medium">{p.nearestStation}</span>{" "}
          <span className="text-slate-500">· {p.stationDistance}</span>
        </div>
        <ScoreRow label="Transport" value={p.transportScore} />
        <ScoreRow label="Amenities" value={p.amenitiesScore} />
        <ScoreRow label="Safety" value={p.safetyScore} />
        <ScoreRow label="Schools" value={p.schoolScore} />
      </div>

      <div className="pt-1 border-t border-slate-100">
        <div className="text-slate-500 text-[12px] mb-1">Nearby</div>
        <div className="flex flex-wrap gap-1">
          {p.nearby.map((n) => (
            <span
              key={n}
              className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full"
            >
              {n}
            </span>
          ))}
        </div>
      </div>

      <div className="pt-1 border-t border-slate-100">
        <div className="text-slate-500 text-[12px] mb-0.5">
          Investment note
        </div>
        <p className="text-[12px] text-slate-700 leading-snug">
          {p.investmentNote}
        </p>
      </div>

      <div className="pt-1 border-t border-slate-100">
        <div className="text-slate-500 text-[12px] mb-1">
          Live listings near {p.postcode}
        </div>
        <div className="flex flex-wrap gap-1">
          {(["rightmove", "zoopla", "airbnb", "booking", "landRegistry"] as const).map((plat) => (
            <a
              key={plat}
              href={listingUrl(plat, p.postcode, p.city)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 px-2 py-0.5 rounded-full font-medium transition-colors"
            >
              {platformLabels[plat]} ↗
            </a>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
  sub,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "rose";
  sub?: string;
}) {
  const toneClass =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "rose"
      ? "text-rose-700"
      : "text-slate-900";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className={`text-[13px] font-semibold ${toneClass}`}>{value}</div>
      {sub && (
        <div className="text-[10px] text-slate-500">{sub}</div>
      )}
    </div>
  );
}

function ScoreRow({ label, value }: { label: string; value: number }) {
  const pct = value * 10;
  const tone =
    value >= 8 ? "bg-emerald-500" : value >= 6 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className="flex items-center gap-2 text-[12px]">
      <div className="w-16 text-slate-500">{label}</div>
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-6 text-right tabular-nums font-medium">{value}</div>
    </div>
  );
}

function AvsOwnedPopupContent({ property: p }: { property: NotionProperty }) {
  const complianceColor =
    p.compliance === "Green"
      ? "#10b981"
      : p.compliance === "Amber"
      ? "#f59e0b"
      : p.compliance === "Red"
      ? "#ef4444"
      : "#94a3b8";

  const certs = [
    { label: "Gas", days: daysUntil(p.gasExpiry), hasDate: !!p.gasExpiry },
    { label: "EICR", days: daysUntil(p.eicrExpiry), hasDate: !!p.eicrExpiry },
    { label: "HMO", days: daysUntil(p.hmoExpiry), hasDate: !!p.hmoExpiry },
    { label: "Inspection", days: daysUntil(p.nextInspection), hasDate: !!p.nextInspection },
  ];

  const postcode = p.place?.address ? extractUkPostcode(p.place.address) : null;

  return (
    <div className="text-[13px] leading-tight -m-3 max-h-[70vh] overflow-y-auto">
      {p.place && <PropertyHero lat={p.place.lat} lng={p.place.lng} />}

      <div
        className="px-4 pt-3 pb-3 text-white relative"
        style={{
          background: "linear-gradient(135deg, #0A6F76 0%, #0DB39E 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="bg-white text-[#0A6F76] w-6 h-6 rounded-full flex items-center justify-center font-black text-[13px]">
            A
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">
            AVS Owned
          </span>
          {p.compliance && (
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ml-auto flex items-center gap-1"
              style={{ background: complianceColor + "33" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: complianceColor }}
              />
              {p.compliance}
            </span>
          )}
        </div>

        <div className="font-semibold text-[15px] leading-snug">
          {p.address || "(no address)"}
        </div>
        {p.place?.address && (
          <div className="text-[11px] opacity-90 mt-0.5 leading-snug">
            {p.place.address}
          </div>
        )}

        {p.monthlyIncome !== null && (
          <div className="mt-3">
            <div className="text-[10px] uppercase tracking-wider opacity-80">
              Expected income
            </div>
            <div className="text-[18px] font-bold leading-none mt-0.5">
              {formatGBP(p.monthlyIncome)}
              <span className="text-[11px] font-medium opacity-80 ml-1">/mo</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {p.status && <Tag color="emerald">{p.status}</Tag>}
          {p.statusBackOffice && <Tag color="slate">{p.statusBackOffice}</Tag>}
          {p.managementModel && <Tag color="indigo">{p.managementModel}</Tag>}
          {p.propertyType.map((t) => (
            <Tag key={t} color="slate">
              {t}
            </Tag>
          ))}
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
            Compliance dates
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px]">
            {certs.map((c) => (
              <PopupCertChip key={c.label} {...c} />
            ))}
          </div>
        </div>

        {postcode && (
          <div className="border-t border-slate-100 pt-2">
            <PostcodeLinks postcode={postcode} />
          </div>
        )}

        <a
          href={p.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-[12px] font-semibold py-2 rounded-md text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #0A6F76 0%, #0DB39E 100%)",
          }}
        >
          Open in Notion ↗
        </a>
      </div>
    </div>
  );
}

function PopupCertChip({
  label,
  days,
  hasDate,
}: {
  label: string;
  days: number | null;
  hasDate: boolean;
}) {
  if (!hasDate || days === null) {
    return (
      <div className="text-slate-400">
        <span className="font-medium text-slate-600">{label}:</span>{" "}
        <span className="text-[10px]">not set</span>
      </div>
    );
  }
  const tone =
    days < 0 ? "text-rose-700" : days < 30 ? "text-amber-700" : "text-emerald-700";
  const word = days < 0 ? `${-days}d overdue` : `${days}d left`;
  return (
    <div className={tone}>
      <span className="font-medium text-slate-700">{label}:</span>{" "}
      <span className="text-[10px] font-semibold">{word}</span>
    </div>
  );
}

function Tag({
  color,
  children,
}: {
  color: "emerald" | "amber" | "rose" | "slate" | "indigo";
  children: React.ReactNode;
}) {
  const cls = {
    emerald: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    rose: "bg-rose-100 text-rose-800",
    slate: "bg-slate-100 text-slate-700",
    indigo: "bg-indigo-100 text-indigo-800",
  }[color];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {children}
    </span>
  );
}

function extractUkPhone(text: string): string | null {
  if (!text) return null;
  const m = text.match(/(?:\+?44\s?7|0\s?7)\s?\d{2,3}[\s-]?\d{3}[\s-]?\d{3,4}/);
  if (!m) return null;
  return m[0].replace(/[\s-]/g, "");
}

function normalisePhone(raw: string): string {
  let p = raw.replace(/[\s-]/g, "");
  if (p.startsWith("+44")) p = "44" + p.slice(3);
  else if (p.startsWith("44")) {/* already */}
  else if (p.startsWith("0")) p = "44" + p.slice(1);
  return p;
}

function extractUkPostcode(text: string): string | null {
  if (!text) return null;
  const m = text.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s?(\d[A-Z]{2})\b/i);
  if (!m) return null;
  return `${m[1].toUpperCase()} ${m[2].toUpperCase()}`;
}

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

  if (!sv && !sat) {
    return (
      <div className="h-32 bg-slate-100 border-b border-slate-200 flex items-center justify-center text-[11px] text-slate-400">
        Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to see photos
      </div>
    );
  }

  const showSat = view === "satellite" || streetFailed;
  const url = showSat ? sat : sv;
  return (
    <div className="relative h-40 bg-slate-200 overflow-hidden border-b border-slate-200">
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={showSat ? "Satellite view" : "Street View"}
          className="w-full h-full object-cover"
          onError={() => {
            if (!showSat) setStreetFailed(true);
          }}
        />
      )}
      <div className="absolute top-2 right-2 flex gap-1 bg-white/95 rounded-md p-0.5 shadow text-[10px] font-medium">
        <button
          onClick={() => setView("street")}
          className={`px-2 py-0.5 rounded ${
            !showSat ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Street
        </button>
        <button
          onClick={() => setView("satellite")}
          className={`px-2 py-0.5 rounded ${
            showSat ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          }`}
        >
          Satellite
        </button>
      </div>
      {streetFailed && !sat && (
        <div className="absolute inset-0 flex items-center justify-center text-[11px] text-white bg-black/40">
          No Street View at this location
        </div>
      )}
    </div>
  );
}

function PostcodeLinks({ postcode, city }: { postcode: string; city?: string }) {
  const pc = postcode.trim();
  const pcEnc = encodeURIComponent(pc);
  const cityEnc = encodeURIComponent(city || "");
  const links = [
    {
      label: "Rightmove (to rent)",
      url: `https://www.rightmove.co.uk/property-to-rent/find.html?searchLocation=${pcEnc}&radius=0.5`,
      color: "#00de76",
    },
    {
      label: "Zoopla (to rent)",
      url: `https://www.zoopla.co.uk/to-rent/property/${pc.replace(/\s+/g, "-").toLowerCase()}/`,
      color: "#4B0082",
    },
    {
      label: "OpenRent",
      url: `https://www.openrent.co.uk/properties-to-rent/${pc.replace(/\s+/g, "-").toLowerCase()}?term=${pcEnc}`,
      color: "#ff7a00",
    },
    {
      label: "SpareRoom",
      url: `https://www.spareroom.co.uk/flatshare/?search_type=offered&search_id=&search=postcodes&pcs=${pcEnc}`,
      color: "#0075a8",
    },
    {
      label: "Sold prices (Rightmove)",
      url: `https://www.rightmove.co.uk/house-prices/${pc.replace(/\s+/g, "-").toLowerCase()}.html`,
      color: "#15803d",
    },
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

function PipelinePopupContent({ deal: d }: { deal: NotionDeal }) {
  const overdue =
    d.nextActionDate && new Date(d.nextActionDate).getTime() < Date.now() && !d.isLive;
  const days = d.nextActionDate ? daysUntil(d.nextActionDate) : null;
  const confColor =
    d.confidence === "High"
      ? "#10b981"
      : d.confidence === "Medium"
      ? "#f59e0b"
      : "#94a3b8";

  const phoneRaw = extractUkPhone(d.notes) || extractUkPhone(d.landlord);
  const phone = phoneRaw ? normalisePhone(phoneRaw) : null;
  const postcode = extractUkPostcode(d.propertyAddress);

  return (
    <div className="text-[13px] leading-tight -m-3 max-h-[70vh] overflow-y-auto">
      {d.lat != null && d.lng != null && <PropertyHero lat={d.lat} lng={d.lng} />}

      <div
        className="px-4 pt-3 pb-3 text-white relative"
        style={{
          background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
        }}
      >
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="bg-white text-[#b45309] w-6 h-6 rounded-full flex items-center justify-center font-black text-[13px]">
            P
          </span>
          <span className="text-[10px] uppercase tracking-wider font-bold bg-white/20 px-2 py-0.5 rounded-full">
            Pipeline Deal
          </span>
          {d.confidence && (
            <span
              className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ml-auto flex items-center gap-1"
              style={{ background: confColor + "33" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: confColor }}
              />
              {d.confidence}
            </span>
          )}
        </div>

        <div className="font-semibold text-[14px] leading-snug">
          {d.dealId || "(no ID)"}
        </div>
        {d.propertyAddress && (
          <div className="text-[11px] opacity-90 mt-0.5 leading-snug">
            📍 {d.propertyAddress}
          </div>
        )}

        {d.monthlyCashflow !== null && (
          <div className="mt-2">
            <div className="text-[10px] uppercase tracking-wider opacity-80">
              Expected cashflow
            </div>
            <div className="text-[18px] font-bold leading-none">
              £{d.monthlyCashflow}
              <span className="text-[11px] font-medium opacity-80 ml-1">/mo</span>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {d.coreStage && <Tag color="indigo">{d.coreStage}</Tag>}
          {d.source && <Tag color="slate">{d.source}</Tag>}
          {d.direction && <Tag color="slate">{d.direction}</Tag>}
          {d.dealType && <Tag color="slate">{d.dealType}</Tag>}
          {d.propertyType.map((t) => (
            <Tag key={t} color="slate">
              {t}
            </Tag>
          ))}
        </div>

        {(d.landlord || phone) && (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-2 space-y-1.5">
            {d.landlord && (
              <div className="text-[12px]">
                <span className="text-slate-500">Contact:</span>{" "}
                <span className="font-semibold">{d.landlord}</span>
              </div>
            )}
            {phone && (
              <div className="flex gap-1.5">
                <a
                  href={`tel:+${phone}`}
                  className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md bg-slate-900 text-white hover:bg-slate-800"
                >
                  📞 Call
                </a>
                <a
                  href={`https://wa.me/${phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  💬 WhatsApp
                </a>
                <a
                  href={`sms:+${phone}`}
                  className="flex-1 text-center text-[11px] font-semibold py-1.5 rounded-md bg-slate-200 text-slate-800 hover:bg-slate-300"
                >
                  ✉ SMS
                </a>
              </div>
            )}
          </div>
        )}

        {d.nextAction && (
          <div
            className={`text-[12px] border-t border-slate-100 pt-2 ${
              overdue ? "text-rose-700" : "text-slate-700"
            }`}
          >
            <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
              {overdue ? "⚠ Overdue action" : "Next action"}
            </div>
            <div className="leading-snug">{d.nextAction}</div>
            {d.nextActionDate && (
              <div
                className={`text-[10px] mt-1 ${
                  overdue ? "text-rose-600 font-semibold" : "text-slate-400"
                }`}
              >
                {overdue && days !== null ? `${-days}d overdue · ` : ""}
                {new Date(d.nextActionDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </div>
            )}
          </div>
        )}

        {d.blocker && (
          <div className="text-[11px] bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 rounded font-medium">
            🚧 Blocker: {d.blocker}
          </div>
        )}

        {postcode && (
          <div className="border-t border-slate-100 pt-2">
            <PostcodeLinks postcode={postcode} />
          </div>
        )}

        <a
          href={d.notionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center text-[12px] font-semibold py-2 rounded-md text-white transition-opacity hover:opacity-90"
          style={{
            background: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
          }}
        >
          Open in Notion ↗
        </a>
      </div>
    </div>
  );
}
