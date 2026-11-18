import type { BoardKind, BoardPin, MapBounds } from "@greyboards/types";

/** Where the map opens when the link says nowhere: central Kaduna, where Greyboards goes live first. */
export const DEFAULT_VIEW: MapView = { latitude: 10.5222, longitude: 7.4383, zoom: 12 };

/** The map's centre and zoom, as kept in the page's address. */
export interface MapView {
	latitude: number;
	longitude: number;
	zoom: number;
}

/** What an advertiser narrows the map down to. */
export interface MapFilters {
	kind: BoardKind | null;
	lit: boolean | null;
	maxRateMinor: number | null;
	/** The currency `maxRateMinor` is in. Boards priced in another currency don't pass a price limit. */
	currency: string | null;
}

/** Reads `?at=lat,lng,zoom`, falling back to the default view. */
export function readView(params: URLSearchParams): MapView {
	const [latitude, longitude, zoom] = (params.get("at") ?? "").split(",").map(Number);
	const valid = Number.isFinite(latitude) && Math.abs(latitude) <= 85 && Number.isFinite(longitude) && Math.abs(longitude) <= 180 && Number.isFinite(zoom);

	return valid ? { latitude, longitude, zoom: Math.min(Math.max(zoom, 1), 20) } : DEFAULT_VIEW;
}

export function readFilters(params: URLSearchParams): MapFilters {
	const lit = params.get("lit");
	const max = Number(params.get("max"));

	return {
		kind: (params.get("kind") as BoardKind) || null,
		lit: lit === "true" ? true : lit === "false" ? false : null,
		maxRateMinor: Number.isFinite(max) && max > 0 ? max : null,
		currency: /^[A-Za-z]{3}$/.test(params.get("currency") ?? "") ? String(params.get("currency")).toUpperCase() : null,
	};
}

/** The address for a view and filters, so a map can be shared or reloaded as it was. */
export function mapSearch(view: MapView, filters: MapFilters): URLSearchParams {
	const params = new URLSearchParams({ at: `${view.latitude.toFixed(5)},${view.longitude.toFixed(5)},${view.zoom.toFixed(2)}` });

	if (filters.kind) params.set("kind", filters.kind);
	if (filters.lit !== null) params.set("lit", String(filters.lit));
	if (filters.maxRateMinor) params.set("max", String(filters.maxRateMinor));
	if (filters.maxRateMinor && filters.currency) params.set("currency", filters.currency);

	return params;
}

/** A longitude brought back into -180..180, for a map that has scrolled around the world. */
export function wrapLongitude(longitude: number): number {
	return ((((longitude + 180) % 360) + 360) % 360) - 180;
}

/** Bounds the API accepts: longitudes wrapped, and the whole world once the view spans it. */
export function apiBounds(west: number, south: number, east: number, north: number): MapBounds {
	const clamp = (value: number) => Math.min(Math.max(value, -90), 90);

	if (east - west >= 360) return { west: -180, south: clamp(south), east: 180, north: clamp(north) };

	return { west: wrapLongitude(west), south: clamp(south), east: wrapLongitude(east), north: clamp(north) };
}

/** Pins as GeoJSON points for the map's clustered source. */
export function pinFeatures(pins: BoardPin[]) {
	return {
		type: "FeatureCollection" as const,
		features: pins.map((pin) => ({
			type: "Feature" as const,
			geometry: { type: "Point" as const, coordinates: [pin.longitude, pin.latitude] },
			properties: { id: pin.id },
		})),
	};
}
