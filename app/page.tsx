"use client";

import { useState, useRef, useEffect } from "react";
import {
  Hotel,
  Flight,
  TripOptions,
  TripInput,
  Selections,
  ValidationResult,
  ItineraryDay,
} from "./types";
import { generateTripOptions, validateTrip, fallbackTripOptions } from "./lib/atlas-api";

const SESSION_KEY = "atlas_anthropic_key";

// ─── API Key Gate ─────────────────────────────────────────────────────────────
function ApiKeyGate({ onKey }: { onKey: (key: string) => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed.startsWith("sk-ant-")) {
      setError("Anthropic keys start with sk-ant-");
      return;
    }
    sessionStorage.setItem(SESSION_KEY, trimmed);
    onKey(trimmed);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center px-4 z-50"
         style={{ background: "rgba(13,27,42,0.7)", backdropFilter: "blur(4px)" }}>
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#0d1b2a] flex items-center justify-center text-[#e8a020] text-xl font-bold">✦</div>
          <div>
            <h2 className="font-bold text-[#0d1b2a]">Atlas</h2>
            <p className="text-xs text-gray-500">Enter your Anthropic API key to start</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            placeholder="sk-ant-..."
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(""); }}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm font-mono focus:outline-none focus:border-[#1a6b72]"
            autoFocus
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full bg-[#0d1b2a] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3a5c] transition-colors"
          >
            Start Planning →
          </button>
        </form>
        <p className="text-[11px] text-gray-400 mt-4 text-center">
          Your key stays in this browser session only — never stored or sent anywhere except Anthropic.{" "}
          <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" className="underline">Get a key ↗</a>
        </p>
      </div>
    </div>
  );
}

// ─── Step IDs ────────────────────────────────────────────────────────────────
type Step = "input" | "loading" | "hotel" | "flight" | "pace" | "validating" | "confirmed";

const STEPS: Step[] = ["input", "hotel", "flight", "pace", "confirmed"];
const STEP_LABELS = ["Trip Details", "Hotel", "Flight", "Schedule", "Confirmed"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function starRating(r: number) {
  return "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step }: { step: Step }) {
  const idx = STEPS.indexOf(step);
  return (
    <div className="flex items-center gap-2 justify-center mb-8">
      {STEPS.map((s, i) => (
        <div key={s} className="flex items-center gap-2">
          <div className="flex flex-col items-center gap-1">
            <div
              className={`dot w-3 h-3 rounded-full border-2 ${
                i < idx
                  ? "done bg-[#1a6b72] border-[#1a6b72]"
                  : i === idx
                  ? "active bg-[#0d1b2a] border-[#0d1b2a]"
                  : "bg-white border-gray-300"
              }`}
            />
            <span className="text-[10px] text-gray-400 hidden sm:block">
              {STEP_LABELS[i]}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div
              className={`w-8 h-0.5 mb-4 ${i < idx ? "bg-[#1a6b72]" : "bg-gray-200"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header() {
  return (
    <div className="flex items-center gap-3 mb-8">
      <div className="w-10 h-10 rounded-xl bg-[#0d1b2a] flex items-center justify-center text-[#e8a020] text-xl font-bold">
        ✦
      </div>
      <div>
        <h1 className="text-xl font-bold text-[#0d1b2a] leading-tight">Atlas</h1>
        <p className="text-xs text-gray-500">Trip planning, reimagined as a game</p>
      </div>
    </div>
  );
}

// ─── Step: Input Form ─────────────────────────────────────────────────────────
function InputStep({
  onSubmit,
}: {
  onSubmit: (input: TripInput) => void;
}) {
  const [form, setForm] = useState<TripInput>({
    destination: "",
    start_date: "",
    end_date: "",
    must_see: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.destination || !form.start_date || !form.end_date) return;
    onSubmit(form);
  };

  return (
    <div className="step-enter">
      <h2 className="text-2xl font-bold mb-1 text-[#0d1b2a]">Where are you going?</h2>
      <p className="text-sm text-gray-500 mb-6">
        Tell us the basics — we&apos;ll handle the rest.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-1">
            Destination
          </label>
          <input
            type="text"
            placeholder="e.g. Paris, France"
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a6b72] bg-white"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a6b72] bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a6b72] bg-white"
              required
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-1">
            Must-See Events or Places
          </label>
          <input
            type="text"
            placeholder="e.g. Eiffel Tower, Louvre, a cooking class"
            value={form.must_see}
            onChange={(e) => setForm({ ...form, must_see: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#1a6b72] bg-white"
          />
          <p className="text-xs text-gray-400 mt-1">Optional — separate with commas</p>
        </div>
        <button
          type="submit"
          className="w-full bg-[#0d1b2a] text-white font-semibold py-3 rounded-lg mt-2 hover:bg-[#1a3a5c] transition-colors"
        >
          Plan My Trip →
        </button>
      </form>
    </div>
  );
}

// ─── Step: Loading ─────────────────────────────────────────────────────────────
function LoadingStep({ destination }: { destination: string }) {
  return (
    <div className="step-enter flex flex-col items-center justify-center py-16 gap-4">
      <div className="spinner w-10 h-10 border-4 border-[#0d1b2a] border-t-transparent rounded-full" />
      <p className="text-sm font-medium text-[#0d1b2a]">
        Planning your trip to {destination}…
      </p>
      <p className="text-xs text-gray-400">Claude is generating your options</p>
    </div>
  );
}

// ─── Hotel Image with skeleton + fallback ────────────────────────────────────
function HotelImage({ query, name, tier }: { query: string; name: string; tier: string }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  const tierGradients: Record<string, string> = {
    budget: "from-emerald-800 to-teal-600",
    mid:    "from-blue-800 to-indigo-600",
    luxury: "from-amber-800 to-yellow-600",
  };

  const src = `https://source.unsplash.com/featured/800x352/?${encodeURIComponent(query)}`;

  return (
    <div className="relative w-full h-44">
      {/* Skeleton shown while loading */}
      {!loaded && !errored && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}

      {/* Gradient fallback shown on error */}
      {errored && (
        <div className={`absolute inset-0 bg-gradient-to-br ${tierGradients[tier] ?? "from-gray-700 to-gray-500"} flex items-end p-3`}>
          <span className="text-white/70 text-xs">{name}</span>
        </div>
      )}

      {/* Actual image */}
      {!errored && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={src}
          alt={name}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          loading="lazy"
        />
      )}
    </div>
  );
}

// ─── Step: Hotel Card Pick ─────────────────────────────────────────────────────
function HotelStep({
  hotels,
  selected,
  onSelect,
  onNext,
}: {
  hotels: Hotel[];
  selected: Hotel | null;
  onSelect: (h: Hotel) => void;
  onNext: () => void;
}) {
  const tierColors: Record<string, string> = {
    budget: "bg-green-50 text-green-700",
    mid: "bg-blue-50 text-blue-700",
    luxury: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="step-enter">
      <h2 className="text-2xl font-bold mb-1 text-[#0d1b2a]">Pick your hotel</h2>
      <p className="text-sm text-gray-500 mb-6">Choose the vibe that fits your trip.</p>
      <div className="flex flex-col gap-4 mb-6">
        {hotels.map((hotel) => (
          <div
            key={hotel.name}
            className={`card-option border-2 rounded-xl overflow-hidden bg-white ${
              selected?.name === hotel.name ? "selected" : "border-gray-100"
            }`}
            onClick={() => onSelect(hotel)}
          >
            {/* Hotel image */}
            <div className="relative h-44 bg-gray-100 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://source.unsplash.com/featured/800x352/?${encodeURIComponent(hotel.image_query)}`}
                alt={hotel.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              {/* Tier badge overlaid on image */}
              <span className={`absolute top-3 left-3 text-[10px] font-bold px-2 py-1 rounded-full shadow ${tierColors[hotel.tier]}`}>
                {hotel.tier.toUpperCase()}
              </span>
              {/* Price overlaid bottom-right */}
              <div className="absolute bottom-0 right-0 bg-[#0d1b2a]/80 text-white px-3 py-1.5 rounded-tl-lg">
                <span className="font-bold text-sm">${hotel.price_per_night}</span>
                <span className="text-xs text-gray-300">/night</span>
              </div>
            </div>

            {/* Hotel details */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-1">
                <h3 className="font-semibold text-[#0d1b2a] text-base">{hotel.name}</h3>
                <p className="text-xs text-amber-500 shrink-0 ml-2">{starRating(hotel.rating)} {hotel.rating}</p>
              </div>
              {/* Location */}
              <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                <span>📍</span>
                {hotel.location}
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  {hotel.pros.map((p) => (
                    <p key={p} className="text-[#1a6b72] leading-5">✓ {p}</p>
                  ))}
                </div>
                <div>
                  {hotel.cons.map((c) => (
                    <p key={c} className="text-gray-400 leading-5">✗ {c}</p>
                  ))}
                </div>
              </div>
              {selected?.name === hotel.name && (
                <div className="mt-3 text-xs font-semibold text-[#1a6b72] border-t border-gray-100 pt-2">✓ Selected</div>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-[#0d1b2a] text-white font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a3a5c] transition-colors"
      >
        Next: Choose Flight →
      </button>
    </div>
  );
}

// ─── Step: Flight Card Pick ────────────────────────────────────────────────────
function FlightStep({
  flights,
  selected,
  onSelect,
  onNext,
}: {
  flights: Flight[];
  selected: Flight | null;
  onSelect: (f: Flight) => void;
  onNext: () => void;
}) {
  const timeLabels = ["Morning", "Afternoon", "Evening / Overnight"];

  return (
    <div className="step-enter">
      <h2 className="text-2xl font-bold mb-1 text-[#0d1b2a]">Choose your flight</h2>
      <p className="text-sm text-gray-500 mb-6">When do you want to arrive?</p>
      <div className="flex flex-col gap-3 mb-6">
        {flights.map((flight, i) => (
          <div
            key={flight.airline + flight.departure_time}
            className={`card-option border-2 rounded-xl p-4 bg-white ${
              selected?.departure_time === flight.departure_time ? "selected" : "border-gray-100"
            }`}
            onClick={() => onSelect(flight)}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 mb-1">{timeLabels[i] ?? ""}</p>
                <p className="font-semibold text-[#0d1b2a]">{flight.airline}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {flight.departure_time} → {flight.arrival_time}
                  <span className="text-xs text-gray-400 ml-2">({formatDuration(flight.duration_minutes)})</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-[#0d1b2a]">${flight.price}</p>
                <p className="text-xs text-gray-400">per person</p>
              </div>
            </div>
            {selected?.departure_time === flight.departure_time && (
              <div className="mt-2 text-xs font-semibold text-[#1a6b72]">✓ Selected</div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-[#0d1b2a] text-white font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a3a5c] transition-colors"
      >
        Next: Set Your Pace →
      </button>
    </div>
  );
}

// ─── Step: Pace Card Pick ──────────────────────────────────────────────────────
function PaceStep({
  selected,
  onSelect,
  onNext,
}: {
  selected: "packed" | "balanced" | "relaxed" | null;
  onSelect: (p: "packed" | "balanced" | "relaxed") => void;
  onNext: () => void;
}) {
  const paces: { key: "packed" | "balanced" | "relaxed"; emoji: string; title: string; desc: string }[] = [
    { key: "packed", emoji: "⚡", title: "Packed", desc: "Hit everything — museums, markets, monuments. You can sleep when you're home." },
    { key: "balanced", emoji: "☀️", title: "Balanced", desc: "A solid mix of sights and downtime. Room for a long lunch or a spontaneous detour." },
    { key: "relaxed", emoji: "🌿", title: "Relaxed", desc: "1-2 things a day. Plenty of café time. You're on vacation, not a mission." },
  ];

  return (
    <div className="step-enter">
      <h2 className="text-2xl font-bold mb-1 text-[#0d1b2a]">What&apos;s your pace?</h2>
      <p className="text-sm text-gray-500 mb-6">How do you like to travel on Day 1?</p>
      <div className="flex flex-col gap-3 mb-6">
        {paces.map((p) => (
          <div
            key={p.key}
            className={`card-option border-2 rounded-xl p-4 bg-white ${
              selected === p.key ? "selected" : "border-gray-100"
            }`}
            onClick={() => onSelect(p.key)}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{p.emoji}</span>
              <div>
                <p className="font-semibold text-[#0d1b2a]">{p.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{p.desc}</p>
              </div>
            </div>
            {selected === p.key && (
              <div className="mt-2 text-xs font-semibold text-[#1a6b72]">✓ Selected</div>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-[#0d1b2a] text-white font-semibold py-3 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1a3a5c] transition-colors"
      >
        Validate My Trip →
      </button>
    </div>
  );
}

// ─── Step: Validating ─────────────────────────────────────────────────────────
function ValidatingStep() {
  return (
    <div className="step-enter flex flex-col items-center justify-center py-16 gap-4">
      <div className="spinner w-10 h-10 border-4 border-[#1a6b72] border-t-transparent rounded-full" />
      <p className="text-sm font-medium text-[#0d1b2a]">Checking your plan…</p>
      <p className="text-xs text-gray-400">Making sure everything lines up</p>
    </div>
  );
}

// ─── Step: Conflict Banner ─────────────────────────────────────────────────────
function ConflictBanner({
  message,
  conflictType,
  onFix,
}: {
  message: string;
  conflictType: string;
  onFix: () => void;
}) {
  const label = conflictType === "hotel" ? "Change Hotel" : conflictType === "flight" ? "Change Flight" : "Review Plan";
  return (
    <div className="step-enter">
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <p className="font-semibold text-red-700 text-sm">Conflict Detected</p>
            <p className="text-sm text-red-600 mt-1">{message}</p>
          </div>
        </div>
      </div>
      <button
        onClick={onFix}
        className="w-full border-2 border-[#0d1b2a] text-[#0d1b2a] font-semibold py-3 rounded-lg hover:bg-[#0d1b2a] hover:text-white transition-colors"
      >
        {label} ←
      </button>
    </div>
  );
}

// ─── Step: Confirmed ──────────────────────────────────────────────────────────
function ConfirmedStep({
  input,
  selections,
  itinerary,
  onReset,
}: {
  input: TripInput;
  selections: Selections;
  itinerary: ItineraryDay[];
  onReset: () => void;
}) {
  const { hotel, flight, pace } = selections;

  const buildText = () => {
    const lines: string[] = [
      `🗺 ATLAS TRIP: ${input.destination}`,
      `📅 ${input.start_date} → ${input.end_date}`,
      ``,
      `✈ FLIGHT: ${flight?.airline} | ${flight?.departure_time} → ${flight?.arrival_time} | $${flight?.price}`,
      `🏨 HOTEL: ${hotel?.name} | $${hotel?.price_per_night}/night | ${hotel?.tier}`,
      `⚡ PACE: ${pace}`,
      ``,
      `📋 ITINERARY`,
      ...(itinerary?.map((day) =>
        [
          `Day ${day.day}:`,
          ...day.activities.map((a) => `  ${a.time} — ${a.place} (${formatDuration(a.duration_minutes)})`),
        ].join("\n")
      ) ?? []),
    ];
    return lines.join("\n");
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(buildText()).catch(console.error);
  };

  const day1 = itinerary?.find((d) => d.day === 1);

  return (
    <div className="step-enter">
      <div className="text-center mb-6">
        <div className="text-5xl mb-2">🎉</div>
        <h2 className="text-2xl font-bold text-[#0d1b2a]">Trip Confirmed!</h2>
        <p className="text-sm text-gray-500 mt-1">{input.destination} · {input.start_date} → {input.end_date}</p>
      </div>

      <div className="flex flex-col gap-3 mb-6">
        {/* Flight summary */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-2">✈ Flight</p>
          <p className="font-semibold text-[#0d1b2a]">{flight?.airline}</p>
          <p className="text-sm text-gray-600">{flight?.departure_time} → {flight?.arrival_time} · ${flight?.price}</p>
        </div>

        {/* Hotel summary */}
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-2">🏨 Hotel</p>
          <p className="font-semibold text-[#0d1b2a]">{hotel?.name}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1"><span>📍</span>{hotel?.location}</p>
          <p className="text-sm text-gray-600">${hotel?.price_per_night}/night · {hotel?.tier}</p>
        </div>

        {/* Day 1 itinerary */}
        {day1 && (
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-[#1a6b72] uppercase tracking-wider mb-2">
              📋 Day 1 — {pace} pace
            </p>
            {day1.activities.map((a) => (
              <div key={a.time} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-400 w-10 shrink-0">{a.time}</span>
                <span className="text-sm text-[#0d1b2a]">{a.place}</span>
                <span className="text-xs text-gray-400 ml-auto">{formatDuration(a.duration_minutes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={copyToClipboard}
          className="flex-1 border-2 border-[#0d1b2a] text-[#0d1b2a] font-semibold py-3 rounded-lg hover:bg-[#0d1b2a] hover:text-white transition-colors"
        >
          Copy Itinerary
        </button>
        <button
          onClick={onReset}
          className="flex-1 bg-[#0d1b2a] text-white font-semibold py-3 rounded-lg hover:bg-[#1a3a5c] transition-colors"
        >
          Plan Another Trip
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("input");
  const [input, setInput] = useState<TripInput>({ destination: "", start_date: "", end_date: "", must_see: "" });
  const [options, setOptions] = useState<TripOptions | null>(null);
  const [selections, setSelections] = useState<Selections>({ hotel: null, flight: null, pace: null });
  const [conflict, setConflict] = useState<ValidationResult | null>(null);

  // Restore key from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) setApiKey(stored);
  }, []);

  const handleInputSubmit = async (tripInput: TripInput) => {
    setInput(tripInput);
    setStep("loading");
    try {
      const data = apiKey
        ? await generateTripOptions(apiKey, tripInput)
        : fallbackTripOptions;
      setOptions(data);
      setStep("hotel");
    } catch {
      setStep("input");
      alert("Something went wrong. Please try again.");
    }
  };

  const handleValidate = async () => {
    if (!selections.hotel || !selections.flight || !selections.pace || !options) return;
    setStep("validating");
    try {
      const result = apiKey
        ? await validateTrip(apiKey, {
            hotel: selections.hotel,
            flight: selections.flight,
            pace: selections.pace,
            itinerary_day: options.itinerary.find((d) => d.day === 1),
          })
        : { has_conflict: false, conflict_message: "", conflict_type: "none" as const };
      if (result.has_conflict) {
        setConflict(result);
        setStep("pace");
      } else {
        setConflict(null);
        setStep("confirmed");
      }
    } catch {
      setStep("confirmed");
    }
  };

  const handleConflictFix = () => {
    if (!conflict) return;
    if (conflict.conflict_type === "hotel") setStep("hotel");
    else if (conflict.conflict_type === "flight") setStep("flight");
    else setStep("pace");
    setConflict(null);
  };

  const reset = () => {
    setStep("input");
    setInput({ destination: "", start_date: "", end_date: "", must_see: "" });
    setOptions(null);
    setSelections({ hotel: null, flight: null, pace: null });
    setConflict(null);
  };

  const visibleStep: Step =
    step === "loading" || step === "validating" ? "input" : step;

  return (
    <div className="min-h-screen flex items-start justify-center pt-10 px-4 pb-20"
         style={{ background: "var(--cream)" }}>
      {!apiKey && <ApiKeyGate onKey={setApiKey} />}
      <div className="w-full max-w-lg">
        <Header />
        {step !== "input" && step !== "loading" && <ProgressBar step={visibleStep} />}

        {step === "input" && <InputStep onSubmit={handleInputSubmit} />}
        {step === "loading" && <LoadingStep destination={input.destination} />}

        {step === "hotel" && options && (
          <HotelStep
            hotels={options.hotels}
            selected={selections.hotel}
            onSelect={(h) => setSelections({ ...selections, hotel: h })}
            onNext={() => setStep("flight")}
          />
        )}

        {step === "flight" && options && (
          <FlightStep
            flights={options.flights}
            selected={selections.flight}
            onSelect={(f) => setSelections({ ...selections, flight: f })}
            onNext={() => setStep("pace")}
          />
        )}

        {step === "pace" && (
          <>
            {conflict ? (
              <ConflictBanner
                message={conflict.conflict_message}
                conflictType={conflict.conflict_type}
                onFix={handleConflictFix}
              />
            ) : (
              <PaceStep
                selected={selections.pace}
                onSelect={(p) => setSelections({ ...selections, pace: p })}
                onNext={handleValidate}
              />
            )}
          </>
        )}

        {step === "validating" && <ValidatingStep />}

        {step === "confirmed" && options && (
          <ConfirmedStep
            input={input}
            selections={selections}
            itinerary={options.itinerary}
            onReset={reset}
          />
        )}
      </div>
    </div>
  );
}
