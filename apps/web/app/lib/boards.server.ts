import type { BoardInput, BoardOwnerChoice, BoardPhotoLocation } from "@greyboards/types";

const text = (form: FormData, key: string) => {
	const value = form.get(key);

	return typeof value === "string" && value.trim() ? value.trim() : null;
};

const number = (form: FormData, key: string) => {
	const value = text(form, key);

	return value === null ? null : Number(value);
};

/** The board details a BoardForm posted. The rate is typed in naira and sent in kobo. */
export function boardInput(form: FormData): BoardInput {
	const rate = number(form, "rate");
	const printFee = number(form, "printFee");

	return {
		name: text(form, "name") ?? "",
		description: text(form, "description"),
		kind: (text(form, "kind") ?? "billboard") as BoardInput["kind"],
		widthM: number(form, "widthM") ?? 0,
		heightM: number(form, "heightM") ?? 0,
		faces: number(form, "faces"),
		facing: text(form, "facing"),
		lit: form.get("lit") === "1",
		address: text(form, "address"),
		city: text(form, "city"),
		country: text(form, "country"),
		latitude: number(form, "latitude") ?? Number.NaN,
		longitude: number(form, "longitude") ?? Number.NaN,
		accuracyM: number(form, "accuracyM"),
		rateMinor: rate === null ? null : Math.round(rate * 100),
		ratePeriod: (text(form, "ratePeriod") ?? "month") as BoardInput["ratePeriod"],
		printsOwn: form.get("printsOwn") === "1",
		printFeeMinor: printFee === null ? null : Math.round(printFee * 100),
		ownerNet: form.get("ownerNet") === "1",
		...(form.get("kind") === "digital" ? { loopSlots: number(form, "loopSlots"), slotSeconds: number(form, "slotSeconds") } : {}),
	};
}

/** Where the photo posted with a form was taken: the board's spot when the browser located it. */
export function photoLocation(form: FormData): BoardPhotoLocation {
	const accuracyM = number(form, "accuracyM");

	if (accuracyM === null) return {};

	return { latitude: number(form, "latitude"), longitude: number(form, "longitude"), accuracyM, takenAt: new Date().toISOString() };
}

/** The photo posted with a form, if one was chosen. */
export function postedPhoto(form: FormData, key = "photo") {
	const file = form.get(key);

	return file instanceof File && file.size > 0 ? file : null;
}

/** Who owns the board a BoardForm tagged: a picked profile, or a new owner's name and phone. */
export function boardOwner(form: FormData): BoardOwnerChoice {
	return { ownerProfileId: text(form, "ownerProfileId"), ownerName: text(form, "ownerName"), ownerPhone: text(form, "ownerPhone") };
}
