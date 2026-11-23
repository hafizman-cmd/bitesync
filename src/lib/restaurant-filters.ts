export const CUISINE_OPTIONS = ["any", "chinese", "indian", "malaysian", "thai", "indonesian", "japanese", "korean"] as const;
export type CuisineOption = (typeof CUISINE_OPTIONS)[number];
