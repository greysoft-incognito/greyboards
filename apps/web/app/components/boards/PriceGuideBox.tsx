import { useEffect, useRef } from "react";
import { useFetcher } from "react-router";
import { Sparkles } from "lucide-react";
import type { PriceGuide } from "@greyboards/types";
import { formatMoney } from "~/components/bookings/BookingBits";

/** What the form knows about the board, for its price guide. */
export interface GuideFields {
	latitude: string;
	longitude: string;
	kind: string;
	widthM: string;
	heightM: string;
	ratePeriod: string;
	roadClass: string;
	dailyTraffic: string;
}

/**
 * A suggested rate beside the rate field: the range listed boards of the same kind nearby ask,
 * scaled to this board's size, or what its traffic is worth when too few are near.
 */
export function PriceGuideBox({ fields, exceptId, onUse }: { fields: GuideFields; exceptId?: string; onUse: (listedMinor: number) => void }) {
	const fetcher = useFetcher<{ guide: PriceGuide | null }>();
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const guide = fetcher.data?.guide ?? null;
	const key = JSON.stringify(fields);

	useEffect(() => {
		clearTimeout(timer.current);

		const ready = [fields.latitude, fields.longitude, fields.widthM, fields.heightM].every((value) => value !== "" && Number.isFinite(Number(value)));

		if (!ready) return;

		const params = new URLSearchParams({
			lat: fields.latitude,
			lng: fields.longitude,
			kind: fields.kind,
			widthM: fields.widthM,
			heightM: fields.heightM,
			period: fields.ratePeriod,
			roadClass: fields.roadClass,
			dailyTraffic: fields.dailyTraffic,
			...(exceptId ? { except: exceptId } : {}),
		});

		timer.current = setTimeout(() => fetcher.load(`/boards/price-guide?${params}`), 500);

		return () => clearTimeout(timer.current);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, exceptId]);

	if (!guide || guide.suggestedMinor === null) return null;

	const period = guide.period;
	const comparables = guide.comparables;

	return (
		<div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink-700" role="status">
			<div className="flex min-w-0 flex-1 items-start gap-3">
				<Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden />
				<div>
					<p className="font-semibold text-ink-900">
						Suggested: {formatMoney(guide.suggestedMinor, "NGN")} a {period}
					</p>
					<p className="mt-0.5">
						{guide.basis === "comparables" && comparables
							? `${comparables.count} boards like this within ${comparables.radiusKm} km ask ${formatMoney(comparables.lowMinor ?? 0, "NGN")} to ${formatMoney(comparables.highMinor ?? 0, "NGN")} for this size.`
							: `From about ${guide.traffic?.daily.toLocaleString("en-NG")} people passing a day${guide.traffic?.source === "measured" ? ", as counted" : ""}.`}
						{guide.basis === "comparables" && guide.fromTrafficMinor !== null && ` Its traffic alone suggests ${formatMoney(guide.fromTrafficMinor, "NGN")}.`}
					</p>
				</div>
			</div>
			<button type="button" onClick={() => onUse(guide.suggestedMinor!)} className="text-sm font-semibold text-brand-700 hover:underline">
				Use this price
			</button>
		</div>
	);
}
