import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Link } from "react-router";
import { LoaderCircle } from "lucide-react";

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

export function Button({
	variant = "primary",
	className = "",
	...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
	return <button type="button" {...props} className={buttonClass(variant, className)} />;
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

/** The Greysoft mark: three grey circles and one wine circle. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
	return (
		<svg viewBox="0 0 64 64" className={className} aria-hidden>
			<circle cx="15.75" cy="15.75" r="13.75" fill="#727376" />
			<circle cx="48.25" cy="15.75" r="13.75" fill="#833b4b" />
			<circle cx="15.75" cy="48.25" r="13.75" fill="#727376" />
			<circle cx="48.25" cy="48.25" r="13.75" fill="#727376" />
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
