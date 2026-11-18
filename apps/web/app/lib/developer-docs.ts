/**
 * What the developer pages say about each public API endpoint. Kept in one place so the
 * reference, the sidebar and the overview list the same calls.
 */

export type ApiMethod = "GET" | "POST";
export type KeyAbility = "read" | "book";

export interface ApiParam {
	name: string;
	type: string;
	required?: boolean;
	description: string;
}

export interface ApiEndpoint {
	id: string;
	group: "Account" | "Boards" | "Bookings";
	method: ApiMethod;
	path: string;
	title: string;
	summary: string;
	ability: KeyAbility;
	/** Values in the path, such as `{board}`. */
	pathParams?: ApiParam[];
	query?: ApiParam[];
	body?: ApiParam[];
	/** A body to send in the example. */
	exampleBody?: Record<string, unknown>;
	/** A shortened response. Real responses can carry more fields. */
	exampleResponse: unknown;
	notes?: string[];
}

const BOARD_ID = "995ee6a7-85e0-44f8-b0e0-b5c0e7c31b65";
const FACE_ID = "83226dd7-9724-4d00-8d94-ac2fbee5363e";
const BOOKING_ID = "2d3004ab-8815-41e8-a8bc-214a1151ce1c";

const rate = { amountMinor: 50_000_000, currency: "NGN", period: "month" };

const board = {
	id: BOARD_ID,
	name: "Ahmadu Bello Way, by the stadium",
	kind: "billboard",
	kindLabel: "Billboard",
	widthM: 12,
	heightM: 4,
	faces: 1,
	lit: true,
	address: "Ahmadu Bello Way",
	city: "Kaduna",
	latitude: 10.5222,
	longitude: 7.4383,
	rate,
	roadClass: "major",
	traffic: { daily: 30000, source: "road" },
	costPerThousandMinor: 55_600,
	loop: null,
	status: "listed",
	rating: { average: 4.6, count: 12 },
};

const booking = {
	id: BOOKING_ID,
	status: "held",
	startsOn: "2026-12-08",
	endsOn: "2027-01-07",
	periods: 1,
	face: { id: FACE_ID, label: "Face A" },
	slots: null,
	rate,
	amountMinor: 50_000_000,
	printFeeMinor: 0,
	currency: "NGN",
	holdSecondsLeft: 900,
	board: { id: BOARD_ID, name: board.name, kind: "billboard" },
	paidAt: null,
	cancelledAt: null,
	createdAt: "2026-11-18T15:09:12.817Z",
};

const page = (path: string) => ({
	current_page: 1,
	per_page: 20,
	total: 1,
	last_page: 1,
	path,
});

const ok = (data: unknown, extra: Record<string, unknown> = {}, message = "OK", code = 200) => ({ data, ...extra, status: "success", message, code });

const BOARD_PARAM: ApiParam = { name: "board", type: "uuid", required: true, description: "The board's id." };
const BOOKING_PARAM: ApiParam = { name: "booking", type: "uuid", required: true, description: "The booking's id." };

export const API_ENDPOINTS: ApiEndpoint[] = [
	{
		id: "me",
		group: "Account",
		method: "GET",
		path: "/me",
		title: "The key's account",
		summary: "The account the key belongs to, with its roles. A quick way to check a key works.",
		ability: "read",
		exampleResponse: ok({
			id: "289e6838-237b-4847-9ff4-bc12410174b8",
			name: "Northlight Media",
			username: "northlight",
			accountRoles: [{ kind: "advertiser", label: "Advertiser", status: "active" }],
			createdAt: "2026-11-18T15:09:10.205Z",
		}),
	},
	{
		id: "list-boards",
		group: "Boards",
		method: "GET",
		path: "/boards",
		title: "Search boards",
		summary: "Listed boards, a page at a time. Search near a point, nearest first, or inside a box such as the part of a map on screen.",
		ability: "read",
		query: [
			{ name: "lat, lng", type: "number", description: "Search around this point, nearest first." },
			{ name: "radiusKm", type: "number", description: "How far from the point to look. Defaults to 10." },
			{ name: "west, south, east, north", type: "number", description: "Search inside this box instead, newest first." },
			{ name: "kind", type: "string", description: "billboard, unipole, gantry, wall, digital, street_pole or bus_shelter." },
			{ name: "lit", type: "boolean", description: "Only boards lit at night, or only unlit ones." },
			{ name: "maxRateMinor", type: "integer", description: "The most the rate may be, in kobo." },
			{ name: "page", type: "integer", description: "Which page. Starts at 1." },
			{ name: "perPage", type: "integer", description: "Boards a page, up to 100. Defaults to 50." },
		],
		exampleResponse: ok([{ ...board, distanceM: 840 }], { meta: page("/api/v1/boards") }),
		notes: ["With no point and no box, the newest listed boards come first."],
	},
	{
		id: "get-board",
		group: "Boards",
		method: "GET",
		path: "/boards/{board}",
		title: "One board",
		summary: "A board with its rate card (one price per face), its booking terms and its photos.",
		ability: "read",
		pathParams: [BOARD_PARAM],
		exampleResponse: ok({
			...board,
			rateCard: [{ id: FACE_ID, position: 1, label: "Face A", headingDeg: 210, rateMinor: 50_000_000, minPeriods: 1 }],
			booking: {
				open: true,
				reason: null,
				earliestStart: "2026-11-21",
				maxPeriods: 12,
				printFeeMinor: 0,
				shares: { enabled: true, max: 6, earliestStart: "2026-11-23", payHours: 48 },
			},
			photos: [{ id: "4a1f2c0e-6b1d-4f0e-9a51-0c2f1d8e7b33", url: "https://…/boards/995ee6a7/photo.jpg", width: 1600, height: 1200 }],
		}),
		notes: ["`booking.earliestStart` is the first day you can book, and `booking.maxPeriods` the longest run in weeks or months."],
	},
	{
		id: "availability",
		group: "Boards",
		method: "GET",
		path: "/boards/{board}/availability",
		title: "Taken days",
		summary: "The runs of days already booked, kept by the owner, or open for bids on one face. Any day not listed is free.",
		ability: "read",
		pathParams: [BOARD_PARAM],
		query: [
			{ name: "faceId", type: "uuid", description: "The face to check. Defaults to the first." },
			{ name: "from", type: "date", description: "First day to check, as YYYY-MM-DD. Defaults to today." },
			{ name: "to", type: "date", description: "Last day to check. Defaults to a year after `from`; up to about a year at a time." },
		],
		exampleResponse: ok([
			{ startsOn: "2026-12-01", endsOn: "2026-12-31" },
			{ startsOn: "2027-02-01", endsOn: "2027-02-14", blocked: true },
		]),
	},
	{
		id: "slots",
		group: "Boards",
		method: "GET",
		path: "/boards/{board}/slots",
		title: "Digital screen slots",
		summary: "On a digital screen: its loop, what a slot costs in each part of the day, and how many slots next to each other are free for your dates.",
		ability: "read",
		pathParams: [BOARD_PARAM],
		query: [
			{ name: "faceId", type: "uuid", description: "The screen to check, on boards with more than one." },
			{ name: "startsOn", type: "date", description: "First day, to see how many slots are free." },
			{ name: "periods", type: "integer", description: "How many weeks or months, with `startsOn`." },
			{ name: "daypart", type: "string", description: "all_day, morning (6 AM to noon), afternoon (noon to 6 PM) or evening (6 PM to midnight)." },
		],
		exampleResponse: ok({
			loop: { slots: 6, seconds: 10 },
			dayparts: [
				{ daypart: "all_day", hours: [0, 24], percent: 100, rateMinor: 15_000_000 },
				{ daypart: "morning", hours: [6, 12], percent: 40, rateMinor: 6_000_000 },
				{ daypart: "afternoon", hours: [12, 18], percent: 35, rateMinor: 5_250_000 },
				{ daypart: "evening", hours: [18, 24], percent: 45, rateMinor: 6_750_000 },
			],
			daypart: "evening",
			freeSlots: 4,
		}),
		notes: ["Boards that aren't digital answer 422."],
	},
	{
		id: "hold",
		group: "Bookings",
		method: "POST",
		path: "/boards/{board}/bookings",
		title: "Hold dates",
		summary: "Holds the dates for a few minutes while you pay. The account needs the advertiser role.",
		ability: "book",
		pathParams: [BOARD_PARAM],
		body: [
			{ name: "startsOn", type: "date", required: true, description: "First day, as YYYY-MM-DD. On or after the board's `booking.earliestStart`." },
			{ name: "periods", type: "integer", required: true, description: "How many weeks or months, by the board's rate period." },
			{ name: "faceId", type: "uuid", description: "Needed on boards with more than one face." },
			{ name: "shares", type: "integer", description: "Split the run between this many advertisers, you included. Each gets an invite to pay their share." },
			{ name: "slots", type: "integer", description: "Digital screens: how many slots in the loop. Defaults to 1." },
			{ name: "daypart", type: "string", description: "Digital screens: all_day, morning, afternoon or evening." },
		],
		exampleBody: { startsOn: "2026-12-08", periods: 1, faceId: FACE_ID },
		exampleResponse: ok(booking, {}, "Dates held. Pay to book them.", 201),
		notes: ["`holdSecondsLeft` counts down to when the dates are let go if nobody pays.", "Dates someone else holds or booked answer 422."],
	},
	{
		id: "list-bookings",
		group: "Bookings",
		method: "GET",
		path: "/bookings",
		title: "Your bookings",
		summary: "Bookings the account made or holds a share of, newest first.",
		ability: "read",
		query: [
			{ name: "status", type: "string", description: "Only bookings in this state, held, paid, live, completed, cancelled or expired." },
			{ name: "page", type: "integer", description: "Which page. Starts at 1." },
			{ name: "perPage", type: "integer", description: "Bookings a page, up to 50. Defaults to 20." },
		],
		exampleResponse: ok([booking], { meta: page("/api/v1/bookings") }),
	},
	{
		id: "get-booking",
		group: "Bookings",
		method: "GET",
		path: "/bookings/{booking}",
		title: "One booking",
		summary: "A booking with its artwork, printing, proof of posting and, on digital screens, its plays.",
		ability: "read",
		pathParams: [BOOKING_PARAM],
		exampleResponse: ok({
			...booking,
			artwork: { status: "none", url: null },
			printJob: null,
			proof: { status: "none", photos: [] },
			plays: null,
		}),
	},
	{
		id: "checkout",
		group: "Bookings",
		method: "POST",
		path: "/bookings/{booking}/checkout",
		title: "Start payment",
		summary: "Starts paying for a held booking. Send the payer to `checkoutUrl` to finish.",
		ability: "book",
		pathParams: [BOOKING_PARAM],
		exampleResponse: ok(
			{
				id: "b865a98c-cc45-4531-91bc-8276b1a10720",
				reference: "gbd_ADDF23DA55D3C68A40B7",
				status: "pending",
				amountMinor: 50_000_000,
				currency: "NGN",
				bookingId: BOOKING_ID,
				checkoutUrl: "https://checkout.example/pay/gbd_ADDF23DA55D3C68A40B7",
				paidAt: null,
			},
			{},
			"Payment started",
			201,
		),
		notes: ["The money is held until there's a photo of the ad on the board. Check the booking later to see it change to paid."],
	},
	{
		id: "cancel",
		group: "Bookings",
		method: "POST",
		path: "/bookings/{booking}/cancel",
		title: "Cancel",
		summary: "Lets go of held dates, or cancels a paid booking under the usual cancellation rules.",
		ability: "book",
		pathParams: [BOOKING_PARAM],
		exampleResponse: ok({ ...booking, status: "cancelled", holdSecondsLeft: null, cancelledAt: "2026-11-18T15:09:12.956Z" }, {}, "Booking cancelled. The dates are free again."),
	},
];

export const API_GROUPS = ["Account", "Boards", "Bookings"] as const;

/** The pages of the developer docs, in reading order. */
export const DEVELOPER_PAGES = [
	{ to: "/developers", label: "Overview", end: true },
	{ to: "/developers/authentication", label: "Keys and sign-in" },
	{ to: "/developers/reference", label: "Endpoints" },
	{ to: "/developers/errors", label: "Errors and limits" },
] as const;

export const ERROR_CODES = [
	{ code: 401, title: "Unauthorized", meaning: "No key was sent, or the key is unknown or removed." },
	{ code: 403, title: "Forbidden", meaning: "The key can't do this, such as a read key booking, or the account is suspended or lacks the advertiser role." },
	{ code: 404, title: "Not found", meaning: "No such board or booking, or it isn't yours to see." },
	{ code: 422, title: "Unprocessable", meaning: "The request didn't pass checks, or the dates aren't free. `errors` lists problems by field." },
	{ code: 429, title: "Too many requests", meaning: "The key went over its calls for this minute. Wait for the minute to pass." },
	{ code: 503, title: "Unavailable", meaning: "The public API is switched off for now." },
] as const;

/** Pretty JSON for an example. */
export const json = (value: unknown) => JSON.stringify(value, null, 2);

/** A curl call for an endpoint, against `base`. */
export function curlFor(endpoint: ApiEndpoint, base: string) {
	const path = endpoint.path.replace("{board}", BOARD_ID).replace("{booking}", BOOKING_ID);
	const lines = [`curl${endpoint.method === "POST" ? " -X POST" : ""} "${base}${path}"`, `  -H "Authorization: Bearer $GREYBOARDS_KEY"`, `  -H "Accept: application/json"`];

	if (endpoint.exampleBody) {
		lines.push(`  -H "Content-Type: application/json"`, `  -d '${JSON.stringify(endpoint.exampleBody)}'`);
	}

	return lines.join(" \\\n");
}
