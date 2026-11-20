"use client";

import { ArrowLeft, ArrowRight, Crosshair, MapPin, Search, Utensils } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { copy } from "@/lib/copy";
import { errors, type ErrorCode } from "@/lib/errors";
import type { Locale } from "@/lib/locale";
import { requestErrorCode, requestJson } from "@/lib/request";
import { DEFAULT_SEARCH_DISTANCE_KM, SEARCH_DISTANCES_KM } from "@/lib/search-distance";
import type { Area } from "@/lib/types";

export function CreateRoom({ demo, locale }: { demo: boolean; locale: Locale }) {
  const t = copy[locale];
  const router = useRouter();
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<Area[] | null>(null);
  const [area, setArea] = useState<Area | null>(null);
  const [radiusKm, setRadiusKm] = useState<number>(DEFAULT_SEARCH_DISTANCE_KM);
  const [busy, setBusy] = useState<"location" | "create" | null>(null);
  const [searching, setSearching] = useState(false);
  const areaSearch = useRef<AbortController | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);

  useEffect(() => () => areaSearch.current?.abort(), []);

  function search(value: string, delay = 0) {
    areaSearch.current?.abort();
    setError(null);
    setOptions(null);
    const trimmed = value.trim();
    const canSearch = trimmed.length >= 2;
    setSearching(canSearch);
    if (!canSearch) return;

    const controller = new AbortController();
    areaSearch.current = controller;
    const timer = window.setTimeout(async () => {
      try {
        const { areas } = await requestJson<{ areas: Area[] }>(`/api/areas?q=${encodeURIComponent(trimmed)}`, undefined, controller.signal);
        if (!controller.signal.aborted) setOptions(areas);
      } catch (error) {
        if (!controller.signal.aborted) setError(requestErrorCode(error));
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, delay);
    controller.signal.addEventListener("abort", () => window.clearTimeout(timer), { once: true });
  }

  function locate() {
    if (!navigator.geolocation) {
      setError("locationUnavailable");
      return;
    }
    areaSearch.current?.abort();
    setSearching(false);
    setOptions(null);
    setError(null);
    setBusy("location");
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      setArea({ label: "Near me", lat: coords.latitude, lon: coords.longitude });
      setBusy(null);
    }, ({ code }) => {
      setError(code === 1 ? "locationDenied" : "locationNotFound");
      setBusy(null);
    }, { timeout: 8000, maximumAge: 120000 });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!demo && !area) {
      setError("chooseArea");
      return;
    }
    areaSearch.current?.abort();
    setSearching(false);
    setOptions(null);
    setError(null);
    setBusy("create");
    try {
      const { code } = await requestJson<{ code: string }>("/api/rooms", { name, area, demo, radiusKm });
      router.push(`/room/${code}`);
    } catch (error) {
      setError(requestErrorCode(error));
      setBusy(null);
    }
  }

  return <div className="flow-width">
    <Link href="/" className="back-link"><ArrowLeft size={17} strokeWidth={1.75} /> {t.home}</Link>
    <section className="panel">
      <span className="step-icon"><Utensils size={22} strokeWidth={1.75} /></span>
      <h1>{demo ? t.trySample : t.createHeading}</h1>
      <p className="panel-description">{demo ? t.demoIntro : t.createIntro}</p>
      <form onSubmit={submit} className="stack">
        <label className="field">{t.name}
          <input value={name} onChange={(event) => setName(event.target.value)} autoComplete="nickname" maxLength={32} required placeholder={t.hostNameExample} />
        </label>
        {!demo && <div className="stack compact">
          <label className="field" htmlFor="where">{t.where}</label>
          <div className="search-row">
            <input id="where" placeholder={t.areaPlaceholder} value={query} disabled={!!busy} maxLength={100} autoComplete="off"
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                setArea(null);
                search(value, 300);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  search(query);
                }
              }} />
            <button className="button secondary search-button" type="button" onClick={() => search(query)} disabled={!!busy || query.trim().length < 2} aria-label={t.searchAreas}>
              <Search size={20} strokeWidth={1.75} />
            </button>
          </div>
          {options && (options.length ? <ul className="area-options">
            {options.map((option, index) => <li key={`${option.label}-${index}`}><button type="button" onClick={() => { setArea(option); setQuery(option.label); setOptions(null); }}>
              <MapPin size={17} strokeWidth={1.75} /> {option.label}
            </button></li>)}
          </ul> : <p className="muted small" role="status">{t.noAreas}</p>)}
          {area && <p className="area-selected small"><MapPin size={16} strokeWidth={1.75} /> {area.label === "Near me" ? t.nearMe : area.label}</p>}
          <button className="text-action" type="button" onClick={locate} disabled={!!busy}>
            <Crosshair size={17} strokeWidth={1.75} /> {busy === "location" ? t.findingLocation : t.useLocation}
          </button>
          {searching && <p className="muted small" role="status">{t.searching}</p>}
          <label className="field">{t.searchDistance}
            <select className="distance-select" value={radiusKm} disabled={busy === "create"}
              onChange={(event) => setRadiusKm(Number(event.target.value))}>
              {SEARCH_DISTANCES_KM.map((distance) => <option key={distance} value={distance}>{distance} km</option>)}
            </select>
          </label>
        </div>}
        {error && <p className="error-text" role="alert">{errors[error][locale]}</p>}
        <button className="button primary wide" disabled={!!busy}>{busy === "create" ? t.creating : t.create} <ArrowRight size={19} strokeWidth={1.75} /></button>
      </form>
      {!demo && <p className="below-form"><Link href="/create?demo=1">{t.trySampleInstead}</Link></p>}
    </section>
  </div>;
}
