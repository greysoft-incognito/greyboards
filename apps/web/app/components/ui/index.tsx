import { type ButtonHTMLAttributes, type InputHTMLAttributes, type MouseEvent, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router";
import { LoaderCircle } from "lucide-react";
import { type Confirmation, ConfirmDialog } from "./ConfirmDialog";

export type { Confirmation };

type Variant = "primary" | "brand" | "dark" | "secondary" | "ghost" | "danger";

const variants: Record<Variant, string> = {
	primary: "border-transparent bg-brand-500 text-white shadow-[0_10px_24px_rgba(131,59,75,0.3)] hover:bg-brand-600 hover:shadow-[0_12px_28px_rgba(131,59,75,0.38)]",
	brand: "border-transparent bg-brand-600 text-white shadow-[0_10px_24px_rgba(110,48,64,0.3)] hover:bg-brand-700",
	dark: "border-transparent bg-ink-900 text-white hover:bg-ink-700",
	secondary: "border-surface-100 bg-white text-ink-900 shadow-[0_1px_2px_rgba(30,31,34,0.08)] hover:border-surface-200 hover:shadow-[0_4px_12px_rgba(30,31,34,0.08)]",
	ghost: "border-transparent text-ink-700 hover:bg-surface-100",
	danger: "border-red-300 bg-white text-red-700 hover:bg-red-50",
};

export function buttonClass(variant: Variant = "primary", extra = "") {
	return `inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-[0.875rem] border-[1.5px] px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${extra}`;
}

/** A button. With `confirm`, it asks first and only submits or runs `onClick` once the person agrees. */
export function Button({ variant = "primary", className = "", confirm, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; confirm?: Confirmation }) {
	const { ref, click, dialog } = useConfirmClick(confirm, onClick);

	return (
		<>
			<button ref={ref} type="button" {...props} onClick={click} className={buttonClass(variant, className)} />
			{dialog}
		</>
	);
}

/** An unstyled button, such as an icon on a photo, that can ask first like `Button`. */
export function PlainButton({ confirm, onClick, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { confirm?: Confirmation }) {
	const { ref, click, dialog } = useConfirmClick(confirm, onClick);

	return (
		<>
			<button ref={ref} type="button" {...props} onClick={click} />
			{dialog}
		</>
	);
}

/** Holds a click until the person agrees, then clicks again so forms submit with the same button. */
function useConfirmClick(confirm: Confirmation | undefined, onClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"]) {
	const ref = useRef<HTMLButtonElement>(null);
	const agreed = useRef(false);
	const [asking, setAsking] = useState(false);

	const click = (event: MouseEvent<HTMLButtonElement>) => {
		if (confirm && !agreed.current) {
			event.preventDefault();
			setAsking(true);

			return;
		}

		agreed.current = false;
		onClick?.(event);
	};

	const proceed = () => {
		setAsking(false);
		agreed.current = true;
		ref.current?.click();
	};

	const dialog = asking && confirm ? createPortal(<ConfirmDialog {...confirm} onConfirm={proceed} onCancel={() => setAsking(false)} />, document.body) : null;

	return { ref, click, dialog };
}

export function Field({
	label,
	error,
	hint,
	children,
}: {
	label: string;
	error?: string;
	hint?: string;
	children: ReactNode;
}) {
	return (
		<label className="block">
			<span className="mb-1.5 block text-sm font-semibold text-ink-900">{label}</span>
			{children}
			{error ? (
				<span className="mt-1 block text-sm text-red-700">{error}</span>
			) : hint ? (
				<span className="mt-1 block text-xs text-ink-500">{hint}</span>
			) : null}
		</label>
	);
}

/** A text input. With `addon`, fixed text such as a URL path sits inside the same field. */
export function Input({ addon, className = "", ...props }: InputHTMLAttributes<HTMLInputElement> & { addon?: ReactNode }) {
	if (!addon) return <input {...props} className={`field px-3.5 py-3 ${className}`} />;

	return (
		<div className={`field ${className}`}>
			<span className="field-addon pl-3.5">{addon}</span>
			<input {...props} className="field-input py-3 pr-3.5 pl-0.5" />
		</div>
	);
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
	return <textarea {...props} className={`field px-3.5 py-3 ${className}`} />;
}

export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
	return <select {...props} className={`field cursor-pointer px-3.5 py-3 ${className}`} />;
}

export function Logo({ to = "/", light = false, compact = false }: { to?: string; light?: boolean; compact?: boolean }) {
	return (
		<Link prefetch="intent" to={to} aria-label="Greyboards" className={`flex shrink-0 items-center gap-2.5 ${light ? "text-white" : "text-ink-900"}`}>
			<LogoMark className="h-8 w-8" />
			<span className={`whitespace-nowrap font-display text-lg font-extrabold tracking-tight sm:text-xl ${compact ? "hidden sm:inline" : ""}`}>Greyboards</span>
		</Link>
	);
}

/** The Greyboards G mark: a grey G with a wine dot over its crossbar. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
	return (
		<svg viewBox="5 5 54 54" className={className} aria-hidden>
			<path d="M32 10A22 22 0 1 0 54 32H36" fill="none" stroke="#727376" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
			<circle cx="45" cy="18.4" r="6.2" fill="#833b4b" />
		</svg>
	);
}

export function Alert({ children }: { children: ReactNode }) {
	return (
		<div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
			{children}
		</div>
	);
}

export function Notice({ children }: { children: ReactNode }) {
	return (
		<div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
			{children}
		</div>
	);
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
	return <LoaderCircle className={`animate-spin ${className}`} aria-hidden />;
}
export { OtpInput } from "./OtpInput";
