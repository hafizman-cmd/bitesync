export const LOCALE_COOKIE = "bitesync-locale";
export type Locale = "en" | "ms";

export function parseLocale(value: string | undefined): Locale {
  return value === "ms" ? "ms" : "en";
}
