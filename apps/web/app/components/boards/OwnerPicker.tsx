import { useEffect, useId, useRef, useState } from "react";
import { useFetcher } from "react-router";
import { BadgeCheck, Search, UserPlus, X } from "lucide-react";
import type { OwnerProfile, OwnerSuggestion } from "@greyboards/types";
import { Field, Input, Select } from "~/components/ui";

/**
 * Picks who owns a board a scout tags. Typing a name suggests owners already on Greyboards;
 * picking one sends its profile, and anyone else is a new owner, sent with a phone number
 * so a profile can be made for them.
 */
export function OwnerPicker({ errors = {} }: { errors?: Record<string, string> }) {
	const fetcher = useFetcher<{ owners: OwnerSuggestion[] }>();
	const [name, setName] = useState("");
	const [picked, setPicked] = useState<OwnerSuggestion | null>(null);
	const [open, setOpen] = useState(false);
	const [active, setActive] = useState(0);
	const listId = useId();
	const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
	const owners = name.trim().length >= 2 ? (fetcher.data?.owners ?? []) : [];

	useEffect(() => () => clearTimeout(timer.current), []);

	const type = (value: string) => {
		setName(value);
		setOpen(true);
		setActive(0);
		clearTimeout(timer.current);

		if (value.trim().length >= 2) timer.current = setTimeout(() => fetcher.load(`/boards/owners?search=${encodeURIComponent(value.trim())}`), 200);
	};

	const pick = (owner: OwnerSuggestion) => {
		setPicked(owner);
		setOpen(false);
	};

	if (picked) {
		return (
			<div className="space-y-1.5">
				<span className="block text-sm font-semibold text-ink-900">Owner</span>
				<div className="flex items-center gap-3 rounded-2xl border-[1.5px] border-brand-500 bg-brand-50 px-4 py-3">
					<input type="hidden" name="ownerProfileId" value={picked.id} />
					<OwnerInitials name={picked.name} />
					<div className="min-w-0 flex-1">
						<p className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-900">
							{picked.name}
							{picked.claimed && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="On Greyboards" />}
						</p>
						<p className="text-sm text-ink-500 tabular-nums">
							{picked.phone ?? "No phone"} · {picked.boards === 1 ? "1 board" : `${picked.boards} boards`}
						</p>
					</div>
					<button type="button" onClick={() => setPicked(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-500 transition hover:bg-white hover:text-ink-900" aria-label="Pick another owner">
						<X className="h-4 w-4" aria-hidden />
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			<div className="relative">
				<Field label="Owner's name" error={errors.ownerName ?? errors.ownerProfileId} hint="Owners already on Greyboards show as you type.">
					<Input
						name="ownerName"
						value={name}
						onChange={(event) => type(event.target.value)}
						onFocus={() => setOpen(true)}
						onBlur={() => setTimeout(() => setOpen(false), 150)}
						onKeyDown={(event) => {
							if (!open || !owners.length) return;
							if (event.key === "ArrowDown") (event.preventDefault(), setActive((active + 1) % owners.length));
							if (event.key === "ArrowUp") (event.preventDefault(), setActive((active - 1 + owners.length) % owners.length));
							if (event.key === "Enter") (event.preventDefault(), pick(owners[active]));
						}}
						maxLength={120}
						autoComplete="off"
						placeholder="Start typing, such as Adeyemi"
						role="combobox"
						aria-expanded={open && owners.length > 0}
						aria-controls={listId}
						aria-autocomplete="list"
					/>
				</Field>
				{open && name.trim().length >= 2 && (
					<ul id={listId} role="listbox" className="absolute top-[4.6rem] right-0 left-0 z-10 overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_2px_6px_rgba(30,31,34,0.08),0_16px_36px_rgba(30,31,34,0.16)] ring-1 ring-surface-200">
						{owners.map((owner, index) => (
							<li key={owner.id} role="option" aria-selected={index === active}>
								<button
									type="button"
									onMouseDown={(event) => event.preventDefault()}
									onClick={() => pick(owner)}
									onMouseEnter={() => setActive(index)}
									className={`flex w-full items-center gap-3 px-3.5 py-2.5 text-left ${index === active ? "bg-surface-100" : ""}`}
								>
									<OwnerInitials name={owner.name} />
									<span className="min-w-0 flex-1">
										<span className="flex items-center gap-1.5 truncate text-sm font-semibold text-ink-900">
											{owner.name}
											{owner.claimed && <BadgeCheck className="h-4 w-4 shrink-0 text-brand-600" aria-label="On Greyboards" />}
										</span>
										<span className="block text-xs text-ink-500 tabular-nums">
											{owner.phone ?? "No phone"} · {owner.boards === 1 ? "1 board" : `${owner.boards} boards`}
										</span>
									</span>
								</button>
							</li>
						))}
						<li className={`flex items-center gap-3 px-3.5 py-2.5 text-sm text-ink-500 ${owners.length ? "border-t border-surface-100" : ""}`}>
							{fetcher.state === "loading" ? <Search className="h-4 w-4 animate-pulse" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
							{fetcher.state === "loading" ? "Looking…" : owners.length ? "Someone else? Add their phone and we’ll add them." : `New owner. Add ${name.trim().split(/\s+/)[0]}’s phone and we’ll add them.`}
						</li>
					</ul>
				)}
			</div>
			<Field label="Owner's phone" error={errors.ownerPhone} hint="We'll text them to sign the board up.">
				<Input name="ownerPhone" type="tel" required maxLength={20} placeholder="+234 803 000 0000" />
			</Field>
		</div>
	);
}

/** Lets an owner who manages several owner profiles pick whose board it is. */
export function ManagedOwnerSelect({ profiles, error }: { profiles: OwnerProfile[]; error?: string }) {
	if (profiles.length < 2) return null;

	return (
		<Field label="Owner" error={error} hint="You manage these owners. Add more in settings.">
			<Select name="ownerProfileId" defaultValue={profiles[0].id}>
				{profiles.map((profile) => (
					<option key={profile.id} value={profile.id}>
						{profile.name}
					</option>
				))}
			</Select>
		</Field>
	);
}

function OwnerInitials({ name }: { name: string }) {
	const initials = name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((word) => word[0]?.toUpperCase())
		.join("");

	return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-700 text-xs font-bold text-white">{initials}</span>;
}
