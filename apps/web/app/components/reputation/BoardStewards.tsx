import type { RoleStanding } from "@greyboards/types";
import { ROLE_ICONS } from "~/components/AccountRoles";
import { Standing } from "./Badges";

const LABELS: Partial<Record<RoleStanding["kind"], string>> = { owner: "Owner", scout: "Scout who runs it" };

/** The reputation of the people behind a board, so advertisers can judge who they deal with. */
export function BoardStewards({ stewards }: { stewards: RoleStanding[] | undefined }) {
	if (!stewards?.length) return null;

	return (
		<ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink-700">
			{stewards.map((standing) => {
				const Icon = ROLE_ICONS[standing.kind];

				return (
					<li key={standing.kind} className="flex flex-wrap items-center gap-2">
						<Icon className="h-4 w-4 text-ink-500" aria-hidden />
						<span className="font-medium">{LABELS[standing.kind] ?? standing.kind}</span>
						<Standing standing={standing} compact />
					</li>
				);
			})}
		</ul>
	);
}
