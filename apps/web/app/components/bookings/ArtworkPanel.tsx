import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Check, Download, Image, ImageUp, Printer, Undo2 } from "lucide-react";
import type { Booking, PrintJobStatus } from "@greyboards/types";
import { Button, Spinner, Textarea } from "~/components/ui";
import { formatDay } from "./BookingBits";

const ARTWORK_NOTES = {
	none: "Upload the design to print. Match the board's shape so nothing gets cropped.",
	submitted: "Waiting for whoever looks after the board to check it fits.",
	approved: "Approved. It goes to a billposter to print and put up.",
	rejected: "Sent back. Change it as the note asks and upload it again.",
} as const;

const JOB_LABELS: Record<PrintJobStatus, string> = {
	open: "Waiting for a billposter",
	reserved: "A billposter is checking the date",
	confirmed: "A billposter has the job",
	printed: "Printed, going up next",
	posted: "Up on the board",
	cancelled: "Done by whoever looks after the board",
};

/**
 * The artwork for a paid booking: the advertiser uploads it, whoever looks after the board
 * approves it or sends it back with a note, and the print job follows once it's approved.
 */
export function ArtworkPanel({ booking, isAdvertiser }: { booking: Booking; isAdvertiser: boolean }) {
	const artwork = booking.artwork!;
	const job = booking.printJob;
	const canUpload = isAdvertiser && booking.status === "paid" && artwork.status !== "approved";
	const ownersPrint = booking.printedBy === "owner" && booking.printFeeMinor > 0;
	const note = artwork.status === "approved" && ownersPrint ? (isAdvertiser ? "Approved. The board's owner prints it and puts it up." : "Approved. Download it full size, print it and put it up by the start date, then add the proof photos.") : ARTWORK_NOTES[artwork.status];

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div className="flex items-start gap-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
					<Image className="h-5 w-5" aria-hidden />
				</span>
				<div>
					<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">Artwork</h2>
					<p className="mt-0.5 text-sm text-ink-500">{artwork.canReview ? "Check the design fits the board before it's printed." : note}</p>
				</div>
			</div>

			{artwork.url && (
				<figure className="overflow-hidden rounded-2xl bg-surface-100">
					<img src={artwork.url} alt="The advertiser's artwork" className="max-h-80 w-full object-contain" />
					<figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-ink-500">
						<span className="tabular-nums">{artwork.width && artwork.height ? `${artwork.width} × ${artwork.height} px` : "Artwork"}</span>
						<a href={artwork.url} download className="inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800">
							<Download className="h-3.5 w-3.5" aria-hidden />
							Full size
						</a>
					</figcaption>
				</figure>
			)}

			{artwork.status === "rejected" && artwork.note && (
				<p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
					<span className="font-semibold">Note: </span>
					{artwork.note}
				</p>
			)}

			{canUpload && <UploadArtwork again={artwork.status !== "none"} />}
			{artwork.canReview && <ReviewArtwork />}

			{job && (
				<div className="flex items-center gap-3 border-t border-surface-200 pt-4 text-sm">
					<Printer className="h-5 w-5 shrink-0 text-ink-500" aria-hidden />
					<span className="flex-1 text-ink-700">
						<span className="block font-semibold text-ink-900">{JOB_LABELS[job.status]}</span>
						Due up by {formatDay(job.dueOn)}
					</span>
					{job.printPhotoUrl && (
						<a href={job.printPhotoUrl} target="_blank" rel="noreferrer" className="shrink-0">
							<img src={job.printPhotoUrl} alt="The finished print" className="h-14 w-20 rounded-lg object-cover" />
						</a>
					)}
				</div>
			)}
		</div>
	);
}

function UploadArtwork({ again }: { again: boolean }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "artwork";

	return (
		<Form method="post" encType="multipart/form-data" preventScrollReset onChange={(event) => event.currentTarget.requestSubmit()}>
			<input type="hidden" name="intent" value="artwork" />
			<label className={`flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-surface-300 px-4 py-5 text-sm font-semibold text-ink-700 transition hover:border-brand-300 hover:text-brand-700 ${busy ? "pointer-events-none opacity-60" : ""}`}>
				{busy ? <Spinner className="h-5 w-5" /> : <ImageUp className="h-5 w-5" aria-hidden />}
				{busy ? "Uploading" : again ? "Upload a new version" : "Upload artwork"}
				<input type="file" name="artwork" accept="image/jpeg,image/png,image/webp" className="sr-only" />
			</label>
		</Form>
	);
}

/** Approve, or send it back with a note saying what to change. */
function ReviewArtwork() {
	const navigation = useNavigation();
	const intent = navigation.formData?.get("intent");
	const [rejecting, setRejecting] = useState(false);

	if (rejecting) {
		return (
			<Form method="post" className="space-y-3" preventScrollReset>
				<input type="hidden" name="intent" value="reject" />
				<label className="block text-sm font-semibold text-ink-700">
					What should change?
					<Textarea name="note" required maxLength={500} rows={3} className="mt-1" placeholder="The phone number is too small to read from the road." />
				</label>
				<div className="flex flex-wrap gap-2">
					<Button type="submit" variant="danger" disabled={!!intent}>
						{intent === "reject" ? <Spinner /> : <Undo2 className="h-4 w-4" aria-hidden />}
						Send it back
					</Button>
					<Button variant="ghost" onClick={() => setRejecting(false)}>
						Keep checking
					</Button>
				</div>
			</Form>
		);
	}

	return (
		<div className="flex flex-wrap gap-2">
			<Form method="post" preventScrollReset>
				<input type="hidden" name="intent" value="approve" />
				<Button type="submit" disabled={!!intent}>
					{intent === "approve" ? <Spinner /> : <Check className="h-4 w-4" aria-hidden />}
					Approve for print
				</Button>
			</Form>
			<Button variant="ghost" onClick={() => setRejecting(true)}>
				<Undo2 className="h-4 w-4" aria-hidden />
				Ask for changes
			</Button>
		</div>
	);
}
