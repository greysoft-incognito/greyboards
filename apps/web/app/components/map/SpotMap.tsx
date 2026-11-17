import { useEffect, useRef } from "react";
import { MapBackdrop } from "~/components/MapBackdrop";

/** One board on a small map, for its page. Two-finger or Ctrl scrolling zooms, so the page still scrolls. */
export function SpotMap({ styleUrl, latitude, longitude, className = "" }: { styleUrl: string; latitude: number; longitude: number; className?: string }) {
	const container = useRef<HTMLDivElement>(null);

	useEffect(() => {
		let cancelled = false;
		let remove = () => {};

		import("maplibre-gl").then(({ default: maplibregl }) => {
			if (cancelled || !container.current) return;

			const map = new maplibregl.Map({
				container: container.current,
				style: styleUrl,
				center: [longitude, latitude],
				zoom: 15.5,
				attributionControl: { compact: true },
				cooperativeGestures: true,
				dragRotate: false,
			});
			const pin = document.createElement("div");

			pin.className = "h-5 w-5 rounded-full border-[3px] border-white bg-brand-500 shadow-[0_0_0_8px_rgb(131_59_75/0.18)]";
			new maplibregl.Marker({ element: pin }).setLngLat([longitude, latitude]).addTo(map);
			map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "bottom-right");
			remove = () => map.remove();
		});

		return () => {
			cancelled = true;
			remove();
		};
	}, [styleUrl, latitude, longitude]);

	return (
		<div className={`relative overflow-hidden rounded-2xl ${className}`}>
			<MapBackdrop className="absolute inset-0" />
			<div className="absolute inset-0">
				<div ref={container} className="h-full w-full" />
			</div>
		</div>
	);
}
