"use client";

import { ArrowLeft, ArrowRight, Crosshair, MapPin, Search, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { errorMessage, requestJson } from "@/lib/request";
import type { Area } from "@/lib/types";

export function CreateRoom({ demo }: { demo: boolean }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Area[] | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState<"search" | "location" | "create" | null>(null);
  const [error, setError] = useState("");

  async function search() {
    if (query.trim().length < 2 || busy) return;
    setError("");
    setOptions(null);
    setBusy("search");
    try {
      setOptions((await requestJson<{ areas: Area[] }>(`/api/areas?q=${encodeURIComponent(query.trim())}`)).areas);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("Location is unavailable. Search for your area instead.");
      return;
    }
    setError("");
    setBusy("location");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setArea({ label: "Near me", lat: coords.latitude, lon: coords.longitude });
      setOptions(null);
      setBusy(null);
    }, ({ code }) => {
      setError(code === 1 ? "Location access was denied. Search for your area instead." : "Couldn't find your location. Search for your area instead.");
      setBusy(null);
    }, { timeout: 8000, maximumAge: 120000 });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!demo && !area) {
      setError("Choose an area or use your location.");
      return;
    }
    setError("");
    setBusy("create");
    try {
      const { code } = await requestJson<{ code: string }>("/api/rooms", { name, area, demo });
      router.push(`/room/${code}`);
    } catch (error) {
      setError(errorMessage(error));
      setBusy(null);
    }
  }

  return <div className="flow-width">
    <Link href="/" className="back-link"><ArrowLeft size={17} strokeWidth={1.75} /> Home</Link>
    <section className="panel">
      <span className="step-icon"><Utensils size={22} strokeWidth={1.75} /></span>
      <h1>{demo ? "Try a sample room" : "Create a room"}</h1>
      <p className="panel-description">{demo ? "Try the full round with four sample restaurants in Williamsburg, Brooklyn." : "Choose where to look. You’ll get a link to share with your group."}</p>
      <form onSubmit={submit} className="stack">
        <label className="field">Your name
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" maxLength={32} required placeholder="e.g. Alex" />
        </label>
        {!demo && <div className="stack compact">
          <label className="field" htmlFor="where">Where are you eating?</label>
          <div className="search-row">
            <input id="where" placeholder="City or neighborhood" value={query} disabled={!!busy} maxLength={100}
              onChange={(event) => { setQuery(event.target.value); setArea(null); setOptions(null); }}
              onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void search(); } }} />
            <button className="button secondary search-button" type="button" onClick={() => void search()} disabled={!!busy || query.trim().length < 2} aria-label="Search areas">
              <Search size={20} strokeWidth={1.75} />
            </button>
          </div>
          {options && (options.length ? <ul className="area-options">
            {options.map((option, index) => <li key={`${option.label}-${index}`}><button type="button" onClick={() => { setArea(option); setQuery(option.label); setOptions(null); }}>
              <MapPin size={17} strokeWidth={1.75} /> {option.label}
            </button></li>)}
          </ul> : <p className="muted small" role="status">No areas found. Try a nearby town or neighborhood.</p>)}
          {area && <p className="area-selected small"><MapPin size={16} strokeWidth={1.75} /> {area.label}</p>}
          <button className="text-action" type="button" onClick={locate} disabled={!!busy}>
            <Crosshair size={17} strokeWidth={1.75} /> {busy === "location" ? "Finding your location…" : "Use my location"}
          </button>
          {busy === "search" && <p className="muted small" role="status">Searching areas…</p>}
        </div>}
        {error && <p className="error-text" role="alert">{error}</p>}
        <button className="button primary wide" disabled={!!busy}>{busy === "create" ? "Creating room…" : "Create room"} <ArrowRight size={19} strokeWidth={1.75} /></button>
      </form>
      {!demo && <p className="below-form"><Link href="/create?demo=1">Try a sample room instead</Link></p>}
    </section>
  </div>;
}
