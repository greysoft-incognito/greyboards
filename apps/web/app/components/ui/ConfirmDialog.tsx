import { useEffect, useRef } from "react";
import { CircleHelp, TriangleAlert } from "lucide-react";

/** What to ask before an action goes ahead. `danger` is for things that can't be taken back. */
export interface Confirmation {
	title: string;
	message?: string;
	action: string;
	danger?: boolean;
}

/** A modal that asks before an action. Escape, the backdrop and Cancel all back out. */
export function ConfirmDialog({ title, message, action, danger = false, onConfirm, onCancel }: Confirmation & { onConfirm: () => void; onCancel: () => void }) {
	const dialog = useRef<HTMLDialogElement>(null);
	const Icon = danger ? TriangleAlert : CircleHelp;

	useEffect(() => {
		dialog.current?.showModal();
	}, []);

	return (
		<dialog
			ref={dialog}
			aria-labelledby="confirm-title"
			onCancel={(event) => {
				event.preventDefault();
				onCancel();
			}}
			onClick={(event) => {
				if (event.target === dialog.current) onCancel();
			}}
			className="m-auto w-[calc(100%-2rem)] max-w-md rounded-[1.5rem] bg-white p-0 text-left shadow-[0_24px_64px_rgba(30,31,34,0.28)] backdrop:bg-ink-900/40 backdrop:backdrop-blur-sm"
		>
			<div className="p-6">
				<span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${danger ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-600"}`}>
					<Icon className="h-5 w-5" aria-hidden />
				</span>
				<h2 id="confirm-title" className="mt-4 font-display text-xl font-bold text-ink-900">
					{title}
				</h2>
				{message && <p className="mt-1.5 text-sm leading-6 text-ink-500">{message}</p>}
				<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
					<button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center justify-center rounded-[0.875rem] px-4 py-2.5 text-sm font-semibold text-ink-700 transition hover:bg-surface-100">
						Cancel
					</button>
					<button
						type="button"
						autoFocus
						onClick={onConfirm}
						className={`inline-flex min-h-11 items-center justify-center rounded-[0.875rem] px-4 py-2.5 text-sm font-semibold text-white transition ${danger ? "bg-red-700 shadow-[0_10px_24px_rgba(185,28,28,0.25)] hover:bg-red-800" : "bg-brand-500 shadow-[0_10px_24px_rgba(131,59,75,0.3)] hover:bg-brand-600"}`}
					>
						{action}
					</button>
				</div>
			</div>
		</dialog>
	);
}
