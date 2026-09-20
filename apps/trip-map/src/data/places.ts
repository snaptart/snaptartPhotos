// Itinerary and chart annotations — authoritative data from the design handoff.

export type Anchor = 'e' | 'w' | 's';

export type Place = {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  day: string;
  stay: string;
  anchor: Anchor;
  sub: string;
  /** Opening phrase of the caption, set upright and semibold. */
  capLead: string;
  cap: string;
  /**
   * Slug of the published gallery on snaptart.com holding this station's photographs. The
   * slug is derived from the gallery's title in the admin, so "Cucuron 2026" gives
   * "cucuron-2026". The gallery must be published or it reads as empty.
   */
  gallery: string;
};

export const PLACES: Place[] = [
  {
    id: 'cucuron', name: 'Cucuron', country: 'France', lat: 43.7725, lon: 5.6383,
    day: 'Étape I', stay: '14 sleeps', anchor: 'e',
    sub: 'A hill village of the Luberon',
    capLead: 'The bassin and the plane trees.',
    cap: 'We began inland, among olive groves and dry stone — mornings at the market, afternoons at the pool in the shade of the cypress sentries.',
    gallery: 'cucuron-2026',
  },
  {
    id: 'eze', name: 'Èze-sur-Mer', country: 'France', lat: 43.7226, lon: 7.362,
    day: 'Étape II', stay: '2 sleeps', anchor: 'e',
    sub: "Beneath the eagle's nest, on the Riviera shore",
    capLead: 'Sea level, pressed against an azure playground of the rich.',
    cap: 'In the shadows the eyrie of the old village; we emerged for a swim before supper.',
    gallery: 'eze-2026',
  },
  {
    id: 'noli', name: 'Noli', country: 'Italia', lat: 44.2065, lon: 8.4165,
    day: 'Étape III', stay: '4 sleeps', anchor: 'e',
    sub: 'A small medieval republic by the water',
    capLead: 'Towers and pebbles.',
    cap: 'Crossing into Liguria: watchtowers over the roofs, a pebbled beach, and the sea going through every colour of teal after sunrise.',
    gallery: 'noli-2026',
  },
  {
    id: 'marseille', name: 'Marseille', country: 'France', lat: 43.2965, lon: 5.3698,
    day: 'Étape IV', stay: '3 sleeps', anchor: 'w',
    sub: 'The oldest port of the kingdom',
    capLead: 'Back west, to the Vieux-Port.',
    cap: "Bouillabaisse, the Chateau d'If, and Notre-Dame de la Garde keeping watch over the whole white sprawl.",
    gallery: 'marseille-2026',
  },
  {
    id: 'lyon', name: 'Lyon', country: 'France', lat: 45.764, lon: 4.8357,
    day: 'Étape V', stay: '4 sleeps', anchor: 'w',
    sub: 'Where the Rhône weds the Saône',
    capLead: "Journey's end, at the confluence.",
    cap: 'Bouchons and old stone; we climbed Fourvière at dusk while the city lit itself below like a spilled brazier.',
    gallery: 'lyon-2026',
  },
];

/**
 * How far each leg's curve bows away from the straight line, as a fraction of the leg's
 * length; positive to the traveller's left. Leg i runs from PLACES[i] to PLACES[i + 1].
 * Chosen so the legs that retrace the coast don't lie on top of one another.
 */
export const LEG_BOWS = [0.12, 0.1, 0.15, 0.05];

/**
 * The compass rose sits in the sea, centred between these two SEAS labels and just below the
 * lower one, so it follows them if they are moved and never covers them at any zoom.
 */
export const COMPASS_BETWEEN = ['Golfe du Lion', 'Mediterranean Sea'];

export type MapLabel = { t: string; lon: number; lat: number; size: number; ls?: number; it?: boolean };

export const SEAS: MapLabel[] = [
  { t: 'LIGURIAN  SEA', lon: 8.95, lat: 43.4, size: 12 },
  { t: 'Mediterranean Sea', lon: 6.35, lat: 42.8, size: 12 },
  { t: 'Golfe du Lion', lon: 4.2, lat: 42.95, size: 10 },
];

export const LANDMARKS: MapLabel[] = [
  { t: 'FRANCE', lon: 3.95, lat: 45.2, size: 15, ls: 0.3 },
  { t: 'ITALIA', lon: 9.35, lat: 45.55, size: 15, ls: 0.3 },
  { t: 'Corse', lon: 9.15, lat: 42.35, size: 10, it: true },
];

/** River names, set just west of their water in the sea's lettering; the lines are rivers.json. */
export const RIVER_LABELS: MapLabel[] = [
  { t: 'Rhône', lon: 4.45, lat: 44.75, size: 9 },
  { t: 'Saône', lon: 4.55, lat: 46.35, size: 9 },
];

/**
 * Names of the divisions the journey passed through; the borders themselves come from
 * divisions.json. Régions use their historic names; départements / province their real ones.
 */
export type DivisionLabel = MapLabel & { level: 'region' | 'local' };

export const DIVISION_LABELS: DivisionLabel[] = [
  { t: "PROVENCE-CÔTE D'AZUR", lon: 6.15, lat: 44.45, size: 9, ls: 0.22, it: true, level: 'region' },
  { t: 'RHÔNE-ALPES', lon: 5.8, lat: 45.3, size: 9, ls: 0.22, it: true, level: 'region' },
  { t: 'LIGURIA', lon: 9.62, lat: 44.38, size: 8.5, ls: 0.2, it: true, level: 'region' },
  { t: 'Vaucluse', lon: 5.5, lat: 44.05, size: 9, it: true, level: 'local' },
  { t: 'Bouches-du-Rhône', lon: 4.85, lat: 43.62, size: 9, it: true, level: 'local' },
  { t: 'Alpes-Maritimes', lon: 7.0, lat: 44.05, size: 9, it: true, level: 'local' },
  { t: 'Métropole de Lyon', lon: 4.5, lat: 45.66, size: 9, it: true, level: 'local' },
  { t: 'Savona', lon: 8.1, lat: 44.4, size: 9, it: true, level: 'local' },
];

/** Labels for the zoomed-out view of Europe, which replace the regional ones above. */
export const EUROPE_SEAS: MapLabel[] = [
  { t: 'Oceanus Atlanticus', lon: -17, lat: 47, size: 12 },
  { t: 'North Sea', lon: 3.5, lat: 56, size: 10 },
  { t: 'Baltic', lon: 19.2, lat: 56.3, size: 10 },
  { t: 'Mediterranean Sea', lon: 16, lat: 35, size: 12 },
  { t: 'Black Sea', lon: 34.5, lat: 43.3, size: 10 },
];

export const EUROPE_LANDS: MapLabel[] = [
  { t: 'FRANCE', lon: 2.2, lat: 47.3, size: 10, ls: 0.2 },
  { t: 'ITALIA', lon: 12.8, lat: 42.6, size: 10, ls: 0.2 },
  { t: 'ESPAÑA', lon: -3.7, lat: 40, size: 10, ls: 0.2 },
  { t: 'PORTUGAL', lon: -8.2, lat: 37.9, size: 8, ls: 0.1 },
  { t: 'BRITANNIA', lon: -1.8, lat: 52.7, size: 9, ls: 0.15 },
  { t: 'DEUTSCHLAND', lon: 10.4, lat: 51.2, size: 9, ls: 0.15 },
  { t: 'POLSKA', lon: 19.4, lat: 52.1, size: 9, ls: 0.15 },
  { t: 'SCANDIA', lon: 15.5, lat: 63.5, size: 10, ls: 0.2 },
  { t: 'HELLAS', lon: 22, lat: 39.4, size: 9, ls: 0.15 },
];

/** Projection fit box: [[lon, lat], ...]. */
export const FIT_BOX: [number, number][] = [[3.4, 42.15], [9.8, 42.15], [9.8, 46.3], [3.4, 46.3]];

/** How far the map may zoom out: enough to frame this box. */
export const EUROPE_BOX: [number, number][] = [[-11, 35], [32, 35], [32, 64], [-11, 64]];

export const HERO_COUNTRIES = ['France', 'Italy'];
