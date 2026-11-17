import { useEffect, useRef, useState } from "react";
import type { GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import type { BoardPin, MapBounds } from "@greyboards/types";
import { MapBackdrop } from "~/components/MapBackdrop";
import { apiBounds, type MapView, pinFeatures } from "~/lib/map";

const WINE = "#833b4b";

/** Past this zoom every board shows on its own. */
const CLUSTER_MAX_ZOOM = 13;

/** Where the map moved to: its bounds for the API and its view for the address. */
export interface MapMove {
	bounds: MapBounds;
	view: MapView;
}

interface BoardMapProps {
	styleUrl: string;
	view: MapView;
	pins: BoardPin[];
	selectedId: string | null;
	highlightedId?: string | null;
	onSelect: (id: string | null) => void;
	onMove: (move: MapMove) => void;
	/** Room the floating panels take, so a picked board isn't hidden under them. */
	padding?: { left: number; bottom: number };
}

/**
 * Listed boards on a MapLibre map, clustered when they crowd together. Runs only in the
 * browser; the drawn map shows until the tiles arrive, or if they never do.
 */
export function BoardMap({ styleUrl, view, pins, selectedId, highlightedId = null, onSelect, onMove, padding }: BoardMapProps) {
	const container = useRef<HTMLDivElement>(null);
	const map = useRef<MapLibreMap | null>(null);
	const [ready, setReady] = useState(false);
	const handlers = useRef({ onSelect, onMove });

	handlers.current = { onSelect, onMove };

	useEffect(() => {
		let cancelled = false;
		let created: MapLibreMap | null = null;

		import("maplibre-gl").then(({ default: maplibregl }) => {
			if (cancelled || !container.current) return;

			created = new maplibregl.Map({
				container: container.current,
				style: styleUrl,
				center: [view.longitude, view.latitude],
				zoom: view.zoom,
				attributionControl: { compact: true },
				dragRotate: false,
			});
			created.touchZoomRotate.disableRotation();
			created.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
			created.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: false } }), "bottom-right");

			const instance = created;
			const reportMove = () => {
				const bounds = instance.getBounds();
				const center = instance.getCenter();

				handlers.current.onMove({
					bounds: apiBounds(bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()),
					view: { latitude: center.lat, longitude: center.lng, zoom: instance.getZoom() },
				});
			};

			// The list loads from the first view even if the tiles never arrive.
			reportMove();
			instance.on("load", () => {
				addBoardLayers(instance);
				map.current = instance;
				setReady(true);
			});
			instance.on("moveend", reportMove);
			instance.on("click", "board-clusters", async (event) => {
				const feature = event.features?.[0];
				const source = instance.getSource<GeoJSONSource>("boards");

				if (!feature || !source || feature.geometry.type !== "Point") return;

				const zoom = await source.getClusterExpansionZoom(feature.properties.cluster_id);

				instance.easeTo({ center: feature.geometry.coordinates as [number, number], zoom });
			});
			instance.on("click", "board-pins", (event) => handlers.current.onSelect(event.features?.[0]?.properties.id ?? null));
			instance.on("click", (event) => {
				if (!instance.queryRenderedFeatures(event.point, { layers: ["board-pins", "board-clusters"] }).length) handlers.current.onSelect(null);
			});

			for (const layer of ["board-pins", "board-clusters"]) {
				instance.on("mouseenter", layer, () => (instance.getCanvas().style.cursor = "pointer"));
				instance.on("mouseleave", layer, () => (instance.getCanvas().style.cursor = ""));
			}
		});

		return () => {
			cancelled = true;
			created?.remove();
			map.current = null;
		};
		// The map is made once; later view changes come from the map itself.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [styleUrl]);

	useEffect(() => {
		map.current?.getSource<GeoJSONSource>("boards")?.setData(pinFeatures(pins));
	}, [pins, ready]);

	useEffect(() => {
		const instance = map.current;

		if (!instance) return;

		instance.setFilter("board-selected", ["==", ["get", "id"], selectedId ?? ""]);
		instance.setFilter("board-highlighted", ["==", ["get", "id"], highlightedId ?? ""]);
	}, [selectedId, highlightedId, ready]);

	useEffect(() => {
		const pin = pins.find((entry) => entry.id === selectedId);
		const instance = map.current;

		if (!pin || !instance) return;

		const point = instance.project([pin.longitude, pin.latitude]);
		const canvas = instance.getCanvas();
		const hidden = point.x < (padding?.left ?? 0) + 40 || point.x > canvas.clientWidth - 40 || point.y < 80 || point.y > canvas.clientHeight - (padding?.bottom ?? 0) - 40;
		const clustered = instance.getZoom() <= CLUSTER_MAX_ZOOM;

		if (hidden || clustered) {
			instance.easeTo({
				center: [pin.longitude, pin.latitude],
				zoom: Math.max(instance.getZoom(), CLUSTER_MAX_ZOOM + 1),
				padding: { left: padding?.left ?? 0, bottom: padding?.bottom ?? 0, top: 0, right: 0 },
			});
		}
		// Only a new pick moves the map.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selectedId]);

	return (
		<div className="board-map absolute inset-0">
			<MapBackdrop className="absolute inset-0" />
			<div className="absolute inset-0">
				<div ref={container} className="h-full w-full" />
			</div>
		</div>
	);
}

/** Clusters, pins, and rings for the picked and hovered board. Counts need the style's glyphs. */
function addBoardLayers(map: MapLibreMap) {
	map.addSource("boards", { type: "geojson", data: pinFeatures([]), cluster: true, clusterRadius: 48, clusterMaxZoom: CLUSTER_MAX_ZOOM });

	map.addLayer({
		id: "board-cluster-halos",
		type: "circle",
		source: "boards",
		filter: ["has", "point_count"],
		paint: { "circle-color": WINE, "circle-opacity": 0.16, "circle-radius": ["step", ["get", "point_count"], 26, 10, 32, 50, 40] },
	});
	map.addLayer({
		id: "board-clusters",
		type: "circle",
		source: "boards",
		filter: ["has", "point_count"],
		paint: {
			"circle-color": WINE,
			"circle-radius": ["step", ["get", "point_count"], 17, 10, 21, 50, 27],
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": 3,
		},
	});

	const fonts = (map.getStyle().layers ?? []).flatMap((layer) => (layer.type === "symbol" && Array.isArray(layer.layout?.["text-font"]) ? [layer.layout["text-font"] as string[]] : []));

	if (map.getStyle().glyphs && fonts.length) {
		map.addLayer({
			id: "board-cluster-counts",
			type: "symbol",
			source: "boards",
			filter: ["has", "point_count"],
			layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": fonts.find((font) => font.some((name) => /bold/i.test(name))) ?? fonts[0], "text-size": 13 },
			paint: { "text-color": "#ffffff" },
		});
	}

	map.addLayer({
		id: "board-highlighted",
		type: "circle",
		source: "boards",
		filter: ["==", ["get", "id"], ""],
		paint: { "circle-color": WINE, "circle-opacity": 0.2, "circle-radius": 18 },
	});
	map.addLayer({
		id: "board-pins",
		type: "circle",
		source: "boards",
		filter: ["!", ["has", "point_count"]],
		paint: {
			"circle-color": WINE,
			"circle-radius": 8,
			"circle-stroke-color": "#ffffff",
			"circle-stroke-width": 3,
		},
	});
	map.addLayer({
		id: "board-selected",
		type: "circle",
		source: "boards",
		filter: ["==", ["get", "id"], ""],
		paint: { "circle-color": WINE, "circle-radius": 11, "circle-stroke-color": "#ffffff", "circle-stroke-width": 4 },
	});
}
