"use client";

import { ArrowLeft, ArrowRight, ArrowUpRight, Ban, Check, Clock3, Copy, Heart, Link2, MapPin, Star, Users, Utensils, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type FormEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { errorMessage, requestJson, RequestError } from "@/lib/request";
import { distanceLabel, mapsLink, ROUND_SECONDS, type Place, type RoomState, type Vote } from "@/lib/types";
import type { RoomAction } from "@/lib/rooms";

const voteButtons = [
  { vote: "pass", label: "Pass", icon: X },
  { vote: "veto", label: "Veto", icon: Ban },
  { vote: "crave", label: "Crave", icon: Star },
  { vote: "like", label: "Like", icon: Heart },
] as const;

function PlaceCard({ place, onVote }: { place: Place; onVote?: (vote: Vote) => void }) {
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
      {offset > 35 && <span className="swipe-stamp like">Like</span>}
      {offset < -35 && <span className="swipe-stamp pass">Pass</span>}
    </div>
    <div className="place-info">
      <p className="eyebrow">{place.cuisine}</p>
      <h2>{place.name}</h2>
      <p className="place-meta"><MapPin size={17} strokeWidth={1.75} /> {place.address ? <span>{place.address}</span> : null}
        <span className="distance">{distanceLabel(place.distance)} away</span>
      </p>
    </div>
  </article>;
}

export function Room({ code }: { code: string }) {
  const [room, setRoom] = useState<RoomState | null>(null);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLink, setShowLink] = useState(false);
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
    setConnectionError("");
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
        setConnectionError(errorMessage(error));
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
    setError("");
    setBusy(true);
    try {
      receive(await requestJson<RoomState>(url, action));
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      acting.current = false;
      setBusy(false);
    }
  }

  async function copyLink() {
    const link = new URL(window.location.pathname, window.location.origin).href;
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
    <Link href="/" className="back-link"><ArrowLeft size={17} strokeWidth={1.75} /> Home</Link>
    <section className="panel">
      <h1>{unavailable ? "Room unavailable" : "Opening room"}</h1>
      <p className={connectionError ? "error-text" : "muted"} role={connectionError ? "alert" : "status"}>{connectionError || "Loading the latest room details…"}</p>
      {unavailable && <Link href="/create" className="button primary wide">Create room <ArrowRight size={18} strokeWidth={1.75} /></Link>}
    </section>
  </div>;

  const ballots = room.me?.votes ?? {};
  const cast = Object.keys(ballots).length;
  const current = room.places.find((place) => !Object.hasOwn(ballots, place.id));
  const seconds = Math.max(0, Math.min(ROUND_SECONDS, Math.ceil(((room.deadline ?? now) - now) / 1000)));
  const time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
  const done = room.players.filter((player) => player.done).length;

  function vote(next: Vote) {
    if (current && seconds > 0) void act({ action: "vote", placeId: current.id, vote: next });
  }

  return <div className="flow-width room-flow">
    <Link href="/" className="back-link"><ArrowLeft size={17} strokeWidth={1.75} /> Home</Link>
    <div className="room-context">
      <span><MapPin size={16} strokeWidth={1.75} /> {room.area}</span>
      {room.demo && <span className="sample-label">Sample room</span>}
    </div>
    {connectionError && <p className="error-text" role="alert">{connectionError}</p>}
    {room.status === "lobby" && <section className="panel">
      <span className="step-icon"><Users size={22} strokeWidth={1.75} /></span>
      <h1>{room.me ? "Dinner lobby" : "You’re invited"}</h1>
      <p className="panel-description">{room.me?.host ? "Invite your group, then start the 90-second round when everyone is here." : room.me ? "The round starts when the host is ready." : "Join the room to vote on where to eat."}</p>
      {room.me ? <>
        <h2 className="players-heading">In the room <span>{room.players.length}</span></h2>
        <ul className="players-list">
          {room.players.map((player, index) => <li key={index}><span className="player-avatar" aria-hidden="true">{Array.from(player.name)[0]}</span>
            <span className="player-name">{player.name}</span>{player.host && <span className="host-tag">Host</span>}
          </li>)}
        </ul>
        <div className="stack compact">
          <button className="button secondary wide" type="button" onClick={() => void copyLink()}>
            {copied ? <Check size={18} strokeWidth={1.75} /> : <Copy size={18} strokeWidth={1.75} />} {copied ? "Link copied" : "Copy link"}
          </button>
          {showLink && <label className="field">Room link<input readOnly value={window.location.href} onFocus={(event) => event.currentTarget.select()} /></label>}
          {room.me.host && <button className="button primary wide" type="button" disabled={busy} onClick={() => void act({ action: "start" })}>
            {busy ? "Starting…" : "Start round"} <ArrowRight size={19} strokeWidth={1.75} />
          </button>}
        </div>
      </> : <form className="stack" onSubmit={join}>
        <label className="field">Your name<input required autoComplete="nickname" maxLength={32} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Alex" /></label>
        <button className="button primary wide" disabled={busy}>{busy ? "Joining…" : "Join room"} <ArrowRight size={19} strokeWidth={1.75} /></button>
      </form>}
    </section>}
    {active && <>
      <div className="round-header">
        <h1>{current && room.me ? "Make your picks" : "Round in progress"}</h1>
        <span className={`timer ${seconds <= 15 ? "urgent" : ""}`} aria-label={`${seconds} seconds remaining`}><Clock3 size={18} strokeWidth={1.75} /> {time}</span>
      </div>
      {room.me && current && seconds > 0 ? <>
        <div className="round-progress">
          <span className="small">Restaurant {cast + 1} of {room.places.length}</span>
          <progress aria-label="Restaurants voted on" value={cast} max={room.places.length} />
        </div>
        <PlaceCard place={current} key={current.id} onVote={busy ? undefined : vote} />
        <div className="vote-row">
          {voteButtons.map(({ vote: choice, label, icon: Icon }) => {
            const used = (choice === "crave" || choice === "veto") && Object.values(ballots).includes(choice);
            return <button type="button" className={`vote-button ${choice}`} key={choice} disabled={busy || used} onClick={() => vote(choice)}>
              <span><Icon size={23} strokeWidth={1.75} /></span>
              {used ? `${label} used` : label}
            </button>;
          })}
        </div>
        <p className="vote-hint">Swipe left to pass or right to like. One crave and one veto per round.</p>
      </> : <section className="panel">
        <span className="step-icon"><Clock3 size={23} strokeWidth={1.75} /></span>
        <h2 className="flow-heading">{seconds === 0 ? "Tallying votes" : room.me ? "Your votes are in" : "Voting has started"}</h2>
        <p className="panel-description">{seconds === 0 ? "The result will appear here." : room.me ? "The result appears when everyone finishes or time runs out." : "You can follow along and see the result here."}</p>
        <p className="done-count"><Users size={18} strokeWidth={1.75} /> {done} of {room.players.length} finished</p>
      </section>}
    </>}
    {finished && <section className="result">
      <span className="step-icon">{room.result ? <Heart size={23} strokeWidth={1.75} /> : <Utensils size={23} strokeWidth={1.75} />}</span>
      <h1>{room.result ? "Match found" : "No match this round"}</h1>
      {room.result ? <>
        <PlaceCard place={room.result.place} />
        <p className="result-votes"><span><Heart size={16} strokeWidth={1.75} /> {room.result.likes} {room.result.likes === 1 ? "like" : "likes"}</span>
          <span><Star size={16} strokeWidth={1.75} /> {room.result.craves} {room.result.craves === 1 ? "crave" : "craves"}</span></p>
        <a className="button primary wide" target="_blank" rel="noopener noreferrer" href={mapsLink(room.result.place)}>Open in Google Maps <ArrowUpRight size={18} strokeWidth={1.75} /></a>
      </> : <p className="panel-description">No restaurant received a like or crave without a veto. Try another round with a different area.</p>}
      <Link href={room.demo ? "/create?demo=1" : "/create"} className="button secondary wide"><Link2 size={18} strokeWidth={1.75} /> Create another room</Link>
    </section>}
    {error && <p className="error-text room-error" role="alert">{error}</p>}
    {!room.demo && <p className="attribution">Places by <a href="https://www.geoapify.com/" target="_blank" rel="noopener noreferrer">Geoapify</a> and <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a></p>}
  </div>;
}
