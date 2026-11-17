import { useState } from "react";
import { Form, useNavigation } from "react-router";
import { Star } from "lucide-react";
import type { BookingReviews, PublishedReview, RatingSummary } from "@greyboards/types";
import { formatDay } from "~/components/bookings/BookingBits";
import { Button, Spinner, Textarea } from "~/components/ui";

/** Five stars, filled up to `rating`. */
export function Stars({ rating, className = "h-4 w-4" }: { rating: number; className?: string }) {
	return (
		<span className="inline-flex items-center gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
			{[1, 2, 3, 4, 5].map((star) => (
				<Star key={star} className={`${className} ${star <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-surface-300"}`} aria-hidden />
			))}
		</span>
	);
}

/** "4.6 (12 reviews)", or "3 reviews" while too few to average. Nothing before the first review. */
export function RatingLine({ rating, className = "" }: { rating: RatingSummary; className?: string }) {
	if (!rating.count) return null;

	return (
		<span className={`inline-flex items-center gap-1.5 text-sm text-ink-700 ${className}`}>
			{rating.average !== null && (
				<>
					<Star className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden />
					<strong className="tabular-nums">{rating.average.toFixed(1)}</strong>
				</>
			)}
			<span className="text-ink-500">
				{rating.average !== null ? "(" : ""}
				{rating.count} {rating.count === 1 ? "review" : "reviews"}
				{rating.average !== null ? ")" : ""}
			</span>
		</span>
	);
}

/** A board's latest reviews, with its average. */
export function BoardReviews({ reviews, summary }: { reviews: PublishedReview[]; summary: RatingSummary }) {
	if (!reviews.length) return null;

	return (
		<div className="panel space-y-4 p-5 sm:p-6">
			<div className="flex flex-wrap items-center justify-between gap-2">
				<h2 className="font-display text-lg font-extrabold tracking-tight text-ink-900">What advertisers say</h2>
				<RatingLine rating={summary} />
			</div>
			<ul className="space-y-4">
				{reviews.map((review) => (
					<li key={review.id} className="space-y-1 border-t border-surface-200 pt-4 first:border-0 first:pt-0">
						<div className="flex flex-wrap items-center gap-2 text-sm">
							<Stars rating={review.rating} />
							<span className="text-ink-500">
								{review.author ?? "An advertiser"} · {formatDay(review.createdAt.slice(0, 10))}
							</span>
						</div>
						{review.body && <p className="text-sm whitespace-pre-line text-ink-700">{review.body}</p>}
					</li>
				))}
			</ul>
		</div>
	);
}

/** Rate the board, or the advertiser, once the ad is up. A review can be changed until the window closes. */
export function ReviewPanel({ reviews }: { reviews: BookingReviews }) {
	const navigation = useNavigation();
	const busy = navigation.formData?.get("intent") === "review";
	const [rating, setRating] = useState(reviews.mine?.rating ?? 0);
	const [editing, setEditing] = useState(!reviews.mine);
	const about = reviews.subject === "board" ? "the board" : "the advertiser";

	if (!reviews.subject || (!reviews.canWrite && !reviews.mine)) return null;

	return (
		<div className="panel space-y-3 p-5 sm:p-6">
			<h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900">{reviews.mine ? `Your review of ${about}` : `How was ${about}?`}</h2>
			{reviews.advertiserRating && reviews.advertiserRating.count > 0 && (
				<p className="text-sm text-ink-500">
					Others rated this advertiser <RatingLine rating={reviews.advertiserRating} />
				</p>
			)}
			{reviews.mine && !editing ? (
				<div className="space-y-2">
					<Stars rating={reviews.mine.rating} className="h-5 w-5" />
					{reviews.mine.body && <p className="text-sm whitespace-pre-line text-ink-700">{reviews.mine.body}</p>}
					{reviews.canWrite && (
						<Button variant="ghost" onClick={() => setEditing(true)}>
							Change it
						</Button>
					)}
				</div>
			) : (
				<Form method="post" preventScrollReset className="space-y-3" onSubmit={() => setEditing(false)}>
					<input type="hidden" name="intent" value="review" />
					<input type="hidden" name="rating" value={rating || ""} />
					<div className="flex gap-1" role="radiogroup" aria-label="Stars">
						{[1, 2, 3, 4, 5].map((star) => (
							<button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={`${star} ${star === 1 ? "star" : "stars"}`} onClick={() => setRating(star)} className="rounded-lg p-1 hover:bg-surface-100">
								<Star className={`h-7 w-7 ${star <= rating ? "fill-amber-400 text-amber-400" : "text-surface-300"}`} aria-hidden />
							</button>
						))}
					</div>
					<Textarea name="body" rows={3} maxLength={1000} defaultValue={reviews.mine?.body ?? ""} placeholder={reviews.subject === "board" ? "Was it seen? Was it put up well and on time?" : "Did they send artwork on time? Were they easy to work with?"} aria-label="Your review" />
					<Button type="submit" disabled={busy || !rating}>
						{busy ? <Spinner /> : <Star className="h-4 w-4" aria-hidden />}
						{reviews.mine ? "Save review" : "Post review"}
					</Button>
				</Form>
			)}
		</div>
	);
}
