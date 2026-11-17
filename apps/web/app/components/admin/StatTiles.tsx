/** A row of headline numbers. */
export function StatTiles({ items }: { items: { label: string; value: string; note?: string }[] }) {
	return (
		<dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			{items.map((item) => (
				<div key={item.label} className="panel p-5">
					<dt className="text-sm font-medium text-ink-500">{item.label}</dt>
					<dd className="mt-1 font-display text-3xl font-bold tracking-tight text-ink-900">{item.value}</dd>
					{item.note && <dd className="mt-1 text-sm text-ink-500">{item.note}</dd>}
				</div>
			))}
		</dl>
	);
}
