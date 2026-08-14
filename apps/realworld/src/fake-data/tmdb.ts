export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbImageUrl(
  path: string | null | undefined,
  size: "w92" | "w185" | "w342" | "w500" | "w780" | "original" = "w342",
) {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}
