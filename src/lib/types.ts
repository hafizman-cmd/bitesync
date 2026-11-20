export const ROUND_SECONDS = 90;
export const MAX_PLAYERS = 16;
export const VOTES = ["pass", "like", "crave", "veto"] as const;
export type Vote = (typeof VOTES)[number];

export type Area = {
  label: string;
  lat: number;
  lon: number;
};

export type Place = {
  id: string;
  name: string;
  cuisine: string;
  address: string;
  lat: number;
  lon: number;
  distance: number;
  image?: string;
};

export type RoomState = {
  code: string;
  area: string;
  demo: boolean;
  status: "lobby" | "active" | "finished";
  deadline: number | null;
  serverTime: number;
  places: Place[];
  players: { name: string; done: boolean; host: boolean }[];
  me: { host: boolean; votes: Record<string, Vote> } | null;
  result: { place: Place; likes: number; craves: number } | null;
};

export const SAMPLE_PLACES: Place[] = [
  { id: "lilia", name: "Lilia", cuisine: "Italian", address: "567 Union Ave, Brooklyn", lat: 40.7179, lon: -73.9511, distance: 450, image: "/images/pasta.jpg" },
  { id: "lindustrie", name: "L’Industrie Pizzeria", cuisine: "Pizza", address: "254 S 2nd St, Brooklyn", lat: 40.7128, lon: -73.9573, distance: 950, image: "/images/pizza.jpg" },
  { id: "tonchin", name: "Tonchin", cuisine: "Ramen", address: "109 N 3rd St, Brooklyn", lat: 40.7161, lon: -73.9600, distance: 720, image: "/images/ramen.jpg" },
  { id: "birrialandia", name: "Birria-Landia", cuisine: "Mexican", address: "491 Metropolitan Ave, Brooklyn", lat: 40.7140, lon: -73.9514, distance: 730, image: "/images/tacos.jpg" },
];

export const SAMPLE_AREA: Area = { label: "Williamsburg, Brooklyn", lat: 40.718, lon: -73.956 };

export function distanceLabel(meters: number) {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function mapsLink(place: Place) {
  const query = place.address ? `${place.name}, ${place.address}` : `${place.lat},${place.lon}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
