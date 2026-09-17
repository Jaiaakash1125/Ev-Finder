import { Link } from "@tanstack/react-router";
import type { Station } from "../data/stations";

interface StationCardProps {
  station: Station;
  onSelect?: (station: Station) => void;
}

export function StationCard({ station, onSelect }: StationCardProps) {
  const googleMapsUrl = (station as any).google_maps_link || `https://www.google.com/maps/dir/?api=1&destination=${station.lat},${station.lng}`;

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect) {
      onSelect(station);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="group block glass-panel-subtle backdrop-blur-md rounded-2xl p-5 hover:border-accent/50 transition cursor-pointer relative shadow-lg hover:shadow-accent/5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-accent bg-accent/10 px-2.5 py-1 rounded-md border border-accent/30">
          {station.network}
        </span>
        <span className="text-xs text-frost/70 font-semibold bg-ink2/80 px-2 py-0.5 rounded-md border border-border/50">
          📍 {station.city}
        </span>
      </div>

      <h3 className="mt-3 font-display text-xl font-black text-foreground group-hover:text-accent transition leading-snug">
        {station.name}
      </h3>
      <p className="mt-1.5 text-xs sm:text-sm text-frost/80 line-clamp-2 leading-relaxed">
        {station.address}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="rounded-xl bg-ink2/90 border border-border px-3 py-1.5 text-foreground font-bold text-xs flex items-center gap-1.5 shadow-sm">
          <span className="text-accent">⚡</span> {station.maxPowerKw} kW Output
        </span>
        <span className="rounded-xl bg-ink2/90 border border-border px-3 py-1.5 text-frost font-bold text-xs flex items-center gap-1.5 shadow-sm">
          <span>🔌</span> {station.totalPorts} Charging Ports
        </span>
      </div>

      <div className="mt-5 pt-3.5 border-t border-border/60 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <Link
          to="/station/$stationId"
          params={{ stationId: station.id }}
          onClick={(e) => e.stopPropagation()}
          className="rounded-xl charge-button font-display font-extrabold px-4 py-2.5 text-xs sm:text-sm text-center transition flex items-center justify-center gap-1.5 shadow-md shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
        >
          <span>Station Details</span>
          <span>→</span>
        </Link>

        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="rounded-xl charge-button font-display font-extrabold px-4 py-2.5 text-xs sm:text-sm text-center transition flex items-center justify-center gap-2 shadow-md shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          title="Open in Google Maps"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0">
            <polygon points="3 11 22 2 13 21 11 13 3 11" />
          </svg>
          <span className="whitespace-nowrap">Get Directions ↗</span>
        </a>
      </div>
    </div>
  );
}
