"use client";

import { ArrowLeft, ArrowRight, Crosshair, Plus, Utensils, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { copy } from "@/lib/copy";
import { errors, type ErrorCode } from "@/lib/errors";
import type { Locale } from "@/lib/locale";
import { requestErrorCode, requestJson } from "@/lib/request";
import { CUISINE_OPTIONS, type CuisineOption } from "@/lib/restaurant-filters";
import { MAX_HOST_PLACES, MAX_HOST_PLACE_NAME, formatHostPlaceName, placeNameKey } from "@/lib/types";

export function CreateRoom({ demo, locale }: { demo: boolean; locale: Locale }) {
  const t = copy[locale];
  const router = useRouter();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [cuisine, setCuisine] = useState<CuisineOption>("any");
  const [includeAutomatic, setIncludeAutomatic] = useState(true);
  const [hostPlaces, setHostPlaces] = useState<string[]>([]);
  const [hostPlaceName, setHostPlaceName] = useState("");
  const [busy, setBusy] = useState<"location" | "create" | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);

  function locate() {
    if (!navigator.geolocation) {
      setError("locationUnavailable");
      return;
    }
    setError(null);
    setBusy("location");
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const params = new URLSearchParams({
          latitude: String(coords.latitude), longitude: String(coords.longitude), localityLanguage: locale,
        });
        const response = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error("Location lookup failed");
        const { locality, city, principalSubdivision, countryName } = await response.json();
        if (!locality && !city) throw new Error("No locality returned");
        const parts = [locality, city, principalSubdivision, countryName]
          .filter((value): value is string => typeof value === "string" && !!value.trim())
          .map((value) => value.trim());
        setArea([...new Map(parts.map((value) => [placeNameKey(value), value])).values()].join(", ").slice(0, 100));
      } catch {
        setError("locationNotFound");
      } finally {
        setBusy(null);
      }
    }, ({ code }) => {
      setError(code === 1 ? "locationDenied" : "locationNotFound");
      setBusy(null);
    }, { timeout: 8000, maximumAge: 120000 });
  }

  function addHostPlace() {
    const next = hostPlaceName.trim().replace(/\s+/g, " ");
    if (!next || hostPlaces.length >= MAX_HOST_PLACES) return;
    if (hostPlaces.some((name) => placeNameKey(name) === placeNameKey(next))) {
      setError("duplicateHostPlace");
      return;
    }
    setHostPlaces([...hostPlaces, next]);
    setHostPlaceName("");
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!demo && includeAutomatic && area.trim().length < 2) {
      setError("chooseArea");
      return;
    }
    setError(null);
    setBusy("create");
    try {
      const picks = hostPlaceName.trim() ? [...hostPlaces, hostPlaceName.trim()] : hostPlaces;
      const { code } = await requestJson<{ code: string }>("/api/rooms", {
        name, area, demo, cuisine, includeAutomatic, hostPlaces: picks,
      });
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
        {!demo && <label className="suggestion-toggle field">
          <input type="checkbox" checked={includeAutomatic} disabled={!!busy} onChange={(event) => {
            setIncludeAutomatic(event.target.checked);
            setError(null);
          }} />
          {t.automaticSuggestions}
        </label>}
        {!demo && includeAutomatic && <div className="stack compact">
          <label className="field">{t.where}
            <input placeholder={t.areaPlaceholder} value={area} disabled={!!busy} maxLength={100} autoComplete="off"
              onChange={(event) => { setArea(event.target.value); setError(null); }} />
          </label>
          <button className="text-action" type="button" onClick={locate} disabled={!!busy} aria-describedby="location-hint">
            <Crosshair size={17} strokeWidth={1.75} /> {busy === "location" ? t.findingLocation : t.useLocation}
          </button>
          <p className="muted small" id="location-hint">{t.locationHint}</p>
          <label className="field">{t.cuisinePreference}
            <select className="cuisine-select" value={cuisine} disabled={!!busy}
              onChange={(event) => { setCuisine(event.target.value as CuisineOption); setError(null); }}>
              {CUISINE_OPTIONS.map((option) => <option key={option} value={option}>{t.cuisineOptions[option]}</option>)}
            </select>
          </label>
        </div>}
        {!demo && <section className="stack compact" aria-labelledby="host-suggestions">
          <h2 className="field" id="host-suggestions">{t.hostSuggestions}</h2>
          <p className="small muted" id="host-suggestions-hint">{includeAutomatic ? t.combinedPlacesHint : t.manualPlacesHint}</p>
          {hostPlaces.length > 0 && <ul className="host-places">
            {hostPlaces.map((place) => <li key={place}>
              <span>{formatHostPlaceName(place)}</span>
              <button type="button" className="button secondary search-button" aria-label={t.removeHostPlace(formatHostPlaceName(place))}
                disabled={!!busy} onClick={() => {
                  setHostPlaces(hostPlaces.filter((entry) => entry !== place));
                  setError(null);
                }}><X size={18} strokeWidth={1.75} /></button>
            </li>)}
          </ul>}
          {hostPlaces.length < MAX_HOST_PLACES && <div className="search-row">
            <input className="host-place-input" aria-label={t.hostPlaceName} aria-describedby="host-suggestions-hint"
              placeholder={t.hostPlaceName} autoCapitalize="words"
              value={hostPlaceName} maxLength={MAX_HOST_PLACE_NAME} disabled={!!busy}
              onChange={(event) => { setHostPlaceName(event.target.value); setError(null); }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  addHostPlace();
                }
              }} />
            <button className="button secondary search-button" type="button" onClick={addHostPlace}
              disabled={!!busy || !hostPlaceName.trim()} aria-label={t.addHostPlace}>
              <Plus size={20} strokeWidth={1.75} />
            </button>
          </div>}
        </section>}
        {error && <p className="error-text" role="alert">{errors[error][locale]}</p>}
        <button className="button primary wide" disabled={!!busy}>{busy === "create" ? t.creating : t.create} <ArrowRight size={19} strokeWidth={1.75} /></button>
      </form>
      {!demo && <p className="below-form"><Link href="/create?demo=1">{t.trySampleInstead}</Link></p>}
    </section>
  </div>;
}
