"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Ban, Check, Clock3, Copy, Heart, Link2, MapPin, Share2, Star, Users, Utensils, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { copy, cuisineLabel } from "@/lib/copy";
import { errors, type ErrorCode } from "@/lib/errors";
import type { Locale } from "@/lib/locale";
import { requestErrorCode, requestJson, RequestError } from "@/lib/request";
import { distanceLabel, mapsLink, ROUND_SECONDS, type Place, type RoomState, type Vote } from "@/lib/types";
import type { RoomAction } from "@/lib/rooms";

const voteButtons = [
  { vote: "pass", icon: X },
  { vote: "veto", icon: Ban },
  { vote: "crave", icon: Star },
  { vote: "like", icon: Heart },
] as const;

function PlaceCard({ place, onVote, locale }: { place: Place; locale: Locale; onVote?: (vote: Vote) => void }) {
  const t = copy[locale];
  const start = useRef<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState(0);

  function end(event: PointerEvent<HTMLElement>) {
    if (start.current && Math.abs(event.clientX - start.current.x) > 65 &&
        Math.abs(event.clientX - start.current.x) > Math.abs(event.clientY - start.current.y)) {
      onVote?.(event.clientX > start.current.x ? "like" : "pass");
    }
    start.current = null;
    setOffset(0);
  }

  return <article className={`place-card ${onVote ? "swipe-card" : ""}`}
    style={offset ? { transform: `translateX(${offset * 0.45}px) rotate(${offset * 0.035}deg)` } : undefined}
    onPointerDown={onVote ? (event) => {
      if (!event.isPrimary || event.button !== 0) return;
      start.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    } : undefined}
    onPointerMove={onVote ? (event) => { if (start.current) setOffset(Math.max(-130, Math.min(130, event.clientX - start.current.x))); } : undefined}
    onPointerUp={onVote ? end : undefined}
    onPointerCancel={() => { start.current = null; setOffset(0); }}>
    <div className={`place-visual ${place.image ? "has-image" : ""}`}>
      {place.image ? <Image src={place.image} alt="" fill draggable={false} sizes="(max-width: 540px) 95vw, 488px" /> : <Utensils size={68} strokeWidth={1.75} />}
      {offset > 35 && <span className="swipe-stamp like">{t.votes.like}</span>}
      {offset < -35 && <span className="swipe-stamp pass">{t.votes.pass}</span>}
    </div>
    <div className="place-info">
      <p className="eyebrow">{cuisineLabel(place.cuisine, locale)}</p>
      <h2>{place.name}</h2>
      <p className="place-meta"><MapPin size={17} strokeWidth={1.75} /> {place.address ? <span>{place.address}</span> : null}
        <span className="distance">{t.away(distanceLabel(place.distance))}</span>
      </p>
    </div>
  </article>;
}

export function Room({ code, locale }: { code: string; locale: Locale }) {
  const t = copy[locale];
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [connectionError, setConnectionError] = useState<ErrorCode | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [now, setNow] = useState(0);
  const clockOffset = useRef(0);
  const revision = useRef(0);
  const acting = useRef(false);
  const celebrated = useRef(false);
  const url = `/api/rooms/${encodeURIComponent(code)}`;
  const finished = room?.status === "finished";

  function receive(next: RoomState) {
    clockOffset.current = next.serverTime - Date.now();
    setNow(next.serverTime);
    setRoom(next);
    setConnectionError(null);
  }

  useEffect(() => {
    if (finished || unavailable) return;
    let cancelled = false;
    let inFlight = false;

    async function poll() {
      if (cancelled || inFlight || acting.current || document.hidden) return;
      inFlight = true;
      const requestRevision = revision.current;
      try {
        const next = await requestJson<RoomState>(url);
        if (!cancelled && requestRevision === revision.current) receive(next);
      } catch (error) {
        if (cancelled || requestRevision !== revision.current) return;
        setUnavailable(error instanceof RequestError && error.status === 404);
        setConnectionError(requestErrorCode(error));
      } finally {
        inFlight = false;
      }
    }

    void poll();
    const interval = window.setInterval(poll, 2200);
    document.addEventListener("visibilitychange", poll);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", poll);
    };
  }, [url, finished, unavailable]);

  const active = room?.status === "active";
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now() + clockOffset.current), 250);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!finished || !room?.result || !room.me || celebrated.current) return;
    celebrated.current = true;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
      void import("canvas-confetti").then(({ default: confetti }) => confetti({
        particleCount: 65, spread: 55, origin: { y: 0.36 }, colors: ["#D94E1F", "#D97706", "#F7E4DA"], disableForReducedMotion: true,
      })).catch(() => {});
    }
  }, [finished, room]);

  async function act(action: RoomAction) {
    if (acting.current) return;
    acting.current = true;
    revision.current++;
    setError(null);
    setBusy(true);
    try {
      receive(await requestJson<RoomState>(url, action));
    } catch (error) {
      setError(requestErrorCode(error));
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }

  async function shareLink(link: string) {
    setSharing(true);
    try {
      await navigator.share({ url: link });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) setShareFailed(true);
    } finally {
      setSharing(false);
    }
  }

  async function copyLink(link: string) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setShowLink(true);
    }
  }

  function join(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void act({ action: "join", name });
  }

  if (unavailable || !room) return <div className="flow-width">
    <Link href="/" className="back-link"><ArrowLeft size={17} strokeWidth={1.75} /> {t.home}</Link>
    <section className="panel">
      <h1>{unavailable ? t.unavailable : t.opening}</h1>
      <p className={connectionError ? "error-text" : "muted"} role={connectionError ? "alert" : "status"}>{connectionError ? errors[connectionError][locale] : t.loading}</p>
      {unavailable && <Link href="/create" className="button primary wide">{t.create} <ArrowRight size={18} strokeWidth={1.75} /></Link>}
    </section>
  </div>;

  const ballots = room.me?.votes ?? {};
  const link = new URL(window.location.pathname, window.location.origin).href;
  const canShare = typeof navigator.share === "function";
  const cast = Object.keys(ballots).length;
  const current = room.places.find((place) => !Object.hasOwn(ballots, place.id));
  const seconds = Math.max(0, Math.min(ROUND_SECONDS, Math.ceil(((room.deadline ?? now) - now) / 1000)));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const done = room.players.filter((player) => player.done).length;

  function vote(next: Vote) {
    if (current && seconds > 0) void act({ action: "vote", placeId: current.id, vote: next });
  }

  return <div className="flow-width room-flow">
    <Link href="/" className="back-link"><ArrowLeft size={17} strokeWidth={1.75} /> {t.home}</Link>
    <div className="room-context">
      <span><MapPin size={16} strokeWidth={1.75} /> {room.area === "Near me" ? t.nearMe : room.area}</span>
      {room.demo && <span className="sample-label">{t.sample}</span>}
    </div>
    {connectionError && <p className="error-text" role="alert">{errors[connectionError][locale]}</p>}
    {room.status === "lobby" && <section className="panel">
      <span className="step-icon"><Users size={22} strokeWidth={1.75} /></span>
      <h1>{room.me ? t.lobby : t.invited}</h1>
      <p className="panel-description">{room.me?.host ? t.hostIntro : room.me ? t.guestIntro : t.joinIntro}</p>
      {room.me ? <>
        <h2 className="players-heading">{t.inRoom} <span>{room.players.length}</span></h2>
        <ul className="players-list">
          {room.players.map((player, index) => <li key={index}><span className="player-avatar" aria-hidden="true">{Array.from(player.name)[0]}</span>
            <span className="player-name">{player.name}</span>{player.host && <span className="host-tag">{t.host}</span>}
          </li>)}
        </ul>
        <div className="stack compact">
          {canShare && <button className="button secondary wide" type="button" disabled={sharing} onClick={() => void shareLink(link)}>
            <Share2 size={18} strokeWidth={1.75} /> {t.shareLink}
          </button>}
          {(!canShare || shareFailed) && <button className="button secondary wide" type="button" onClick={() => void copyLink(link)}>
            {copied ? <Check size={18} strokeWidth={1.75} /> : <Copy size={18} strokeWidth={1.75} />} {copied ? t.copied : t.copyLink}
          </button>}
          {showLink && <label className="field">{t.link}<input readOnly value={link} onFocus={(event) => event.currentTarget.select()} /></label>}
          {room.me.host && <button className="button primary wide" type="button" disabled={busy} onClick={() => void act({ action: "start" })}>
            {busy ? t.starting : t.start} <ArrowRight size={19} strokeWidth={1.75} />
          </button>}
        </div>
      </> : <form className="stack" onSubmit={join}>
        <label className="field">{t.name}<input required autoComplete="nickname" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder={t.nameExample} /></label>
        <button className="button primary wide" disabled={busy}>{busy ? t.joining : t.join} <ArrowRight size={19} strokeWidth={1.75} /></button>
      </form>}
    </section>}
    {active && <>
      <div className="round-header">
        <h1>{current && room.me ? t.picks : t.inProgress}</h1>
        <span className={`timer ${seconds <= 15 ? "urgent" : ""}`} aria-label={t.remaining(seconds)}><Clock3 size={18} strokeWidth={1.75} /> {time}</span>
      </div>
      {room.me && current && seconds > 0 ? <>
        <div className="round-progress">
          <span className="small">{t.progress(cast + 1, room.places.length)}</span>
          <progress aria-label={t.votedOn} value={cast} max={room.places.length} />
        </div>
        <PlaceCard locale={locale} place={current} key={current.id} onVote={busy ? undefined : vote} />
        <div className="vote-row">
          {voteButtons.map(({ vote: choice, icon: Icon }) => {
            const label = t.votes[choice];
            const used = (choice === "crave" || choice === "veto") && Object.values(ballots).includes(choice);
            return <button type="button" className={`vote-button ${choice}`} key={choice} disabled={busy || used} onClick={() => vote(choice)}>
              <span><Icon size={23} strokeWidth={1.75} /></span>
              {used ? t.used(label) : label}
            </button>;
          })}
        </div>
        <p className="vote-hint">{t.swipe}</p>
      </> : <section className="panel">
        <span className="step-icon"><Clock3 size={23} strokeWidth={1.75} /></span>
        <h2 className="flow-heading">{seconds === 0 ? t.tallying : room.me ? t.submitted : t.voting}</h2>
        <p className="panel-description">{seconds === 0 ? t.resultSoon : room.me ? t.waitForResult : t.followResult}</p>
        <p className="done-count"><Users size={18} strokeWidth={1.75} /> {t.done(done, room.players.length)}</p>
      </section>}
    </>}
    {finished && <section className="result">
      <span className="step-icon">{room.result ? <Heart size={23} strokeWidth={1.75} /> : <Utensils size={23} strokeWidth={1.75} />}</span>
      <h1>{room.result ? t.match : t.noMatch}</h1>
      {room.result ? <>
        <PlaceCard locale={locale} place={room.result.place} />
        <p className="result-votes"><span><Heart size={16} strokeWidth={1.75} /> {t.likes(room.result.likes)}</span>
          <span><Star size={16} strokeWidth={1.75} /> {t.craves(room.result.craves)}</span></p>
        <a className="button primary wide" target="_blank" rel="noopener noreferrer" href={mapsLink(room.result.place)}>{t.maps} <ArrowUpRight size={18} strokeWidth={1.75} /></a>
      </> : <p className="panel-description">{t.noMatchReason}</p>}
      <Link href={room.demo ? "/create?demo=1" : "/create"} className="button secondary wide"><Link2 size={18} strokeWidth={1.75} /> {t.another}</Link>
    </section>}
    {error && <p className="error-text room-error" role="alert">{errors[error][locale]}</p>}
    {!room.demo && <p className="attribution">{t.placesBy} <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> {t.and} <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">{t.contributors}</a></p>}
  </div>;
}
