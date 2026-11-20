export const SEARCH_DISTANCES_KM = [3, 5, 10, 20] as const;
export const DEFAULT_SEARCH_DISTANCE_KM = SEARCH_DISTANCES_KM[0];

export type SearchDistanceKm = (typeof SEARCH_DISTANCES_KM)[number];
