import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ThemeToggle } from "./ThemeToggle";

export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background font-body text-foreground transition-colors duration-300">
      {/* Ambient gradient light - Electric Cyan & Sapphire Blue */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ambient-glow -top-32 -left-28 h-[540px] w-[540px] bg-[#0284c7]/25 blur-[140px]" />
        <div className="ambient-glow top-1/3 -right-24 h-[500px] w-[500px] bg-[#0ea5e9]/20 blur-[140px]" />
        <div className="ambient-glow -bottom-36 left-1/3 h-[540px] w-[540px] bg-[#38bdf8]/15 blur-[150px]" />
      </div>

      {/* Kinetic diagonal frosted strips */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute top-24 left-[8%] h-72 w-40 -skew-x-12 rounded-3xl bg-[#0ea5e9]/[0.04] backdrop-blur-xl border border-border shadow-lg shadow-accent/5" />
        <div className="absolute top-1/2 right-[12%] h-96 w-48 -skew-x-12 rounded-3xl bg-[#38bdf8]/[0.04] backdrop-blur-xl border border-border shadow-lg shadow-accent/5" />
        <div className="absolute bottom-10 left-[36%] h-56 w-32 -skew-x-12 rounded-3xl bg-[#0284c7]/[0.03] backdrop-blur-xl border border-border shadow-md shadow-accent/5" />
      </div>

      <div className="relative">
        <header className="flex items-center justify-between px-6 sm:px-8 lg:px-14 py-5 border-b border-border/50 bg-background/40 backdrop-blur-md sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl charge-button font-display font-black shadow-md shadow-accent/20">
              ⚡
            </div>
            <span className="font-display text-xl font-extrabold tracking-tight">
              EvFinder
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-frost/80">
            <Link
              to="/map"
              className="flex items-center gap-2 text-accent hover:text-accent/80 font-bold transition"
            >
              <span className="size-2 rounded-full bg-accent animate-pulse" />
              Live Map
            </Link>
            <Link to="/stations" className="hover:text-foreground transition">
              Stations Directory
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <ThemeToggle />

            <Link
              to="/map"
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full charge-button px-4 py-2 text-xs sm:text-sm font-bold hover:opacity-95 transition shadow-md shadow-accent/20"
            >
              <span>🗺️ Open Map</span>
            </Link>
            <Link
              to="/stations"
              className="rounded-full charge-button px-4 py-2 text-xs sm:text-sm font-bold hover:opacity-95 transition shadow-md shadow-accent/20"
            >
              Find a charger
            </Link>
          </div>
        </header>

        {children}

        <footer className="px-6 sm:px-8 lg:px-14 pb-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border pt-8 text-sm text-frost/60">
          <div className="flex items-center gap-3">
            <span className="font-display font-bold text-foreground">EvFinder India</span>
            <span className="text-xs text-frost/50">· OpenStreetMap Powered</span>
            <ThemeToggle className="size-7 rounded-lg text-xs" />
          </div>
          <div className="flex flex-wrap gap-6 text-xs sm:text-sm font-medium">
            <Link to="/map" className="text-accent hover:underline">
              Live Map
            </Link>
            <Link to="/stations" className="hover:text-foreground transition">
              Stations Directory
            </Link>
            <Link to="/stations" className="hover:text-foreground transition">
              Support
            </Link>
          </div>
          <span>© 2026 EvFinder Energy</span>
        </footer>
      </div>
    </div>
  );
}
