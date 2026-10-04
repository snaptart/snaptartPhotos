/** One coordinate in degrees, minutes and seconds, as Google Maps writes it: 44°54'05.2"N. */
function toDms(value: number, positive: string, negative: string): string {
  // Rounded once, in tenths of a second, so 59.96" carries into the next minute.
  const tenths = Math.round(Math.abs(value) * 36000);
  const deg = Math.floor(tenths / 36000);
  const min = Math.floor((tenths % 36000) / 600);
  const sec = (tenths % 600) / 10;
  const mm = String(min).padStart(2, "0");
  const ss = sec.toFixed(1).padStart(4, "0");
  return `${deg}°${mm}'${ss}"${value < 0 && tenths > 0 ? negative : positive}`;
}

export function hasCoordinates(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return (
    typeof lat === "number" && Number.isFinite(lat) && Math.abs(lat) <= 90 &&
    typeof lng === "number" && Number.isFinite(lng) && Math.abs(lng) <= 180
  );
}

/** e.g. 44°54'05.2"N, 85°59'20.1"W */
export function formatCoordinates(lat: number, lng: number): string {
  return `${toDms(lat, "N", "S")}, ${toDms(lng, "E", "W")}`;
}

export function googleMapsUrl(lat: number, lng: number): string {
  const place = `${encodeURIComponent(toDms(lat, "N", "S"))}+${encodeURIComponent(toDms(lng, "E", "W"))}`;
  return `https://www.google.com/maps/place/${place}`;
}

/** A photo's Location built from its coordinates: a link (`[text](url)`) to the spot on Google Maps. */
export function locationFromCoordinates(lat: number, lng: number): string {
  return `[${formatCoordinates(lat, lng)}](${googleMapsUrl(lat, lng)})`;
}
