import type { Place, Vote } from "./types";

export function decide(places: Place[], ballots: { placeId: string; vote: Vote }[]) {
  return places.flatMap((place) => {
    const votes = ballots.filter(({ placeId }) => placeId === place.id).map(({ vote }) => vote);
    if (votes.includes("veto")) return [];
    const likes = votes.filter((vote) => vote === "like").length;
    const craves = votes.filter((vote) => vote === "crave").length;
    return likes + craves ? [{ place, likes, craves }] : [];
  }).sort((a, b) =>
    (b.likes + b.craves * 2) - (a.likes + a.craves * 2) ||
    (b.likes + b.craves) - (a.likes + a.craves) ||
    a.place.distance - b.place.distance ||
    (a.place.id < b.place.id ? -1 : 1),
  )[0] ?? null;
}
