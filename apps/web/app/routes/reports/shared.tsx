import { data } from "react-router";
import { Printer } from "lucide-react";
import { ReportView } from "~/components/reports/ReportView";
import { Button } from "~/components/ui";
import { formError, getServerApi } from "~/lib/api.server";
import { cloudflareContext } from "~/lib/cloudflare";
import type { Route } from "./+types/shared";

export const meta = ({ loaderData }: Route.MetaArgs) => [{ title: `${loaderData?.report.title ?? "Campaign report"} · Greyboards` }, { name: "robots", content: "noindex" }];

export async function loader({ request, context, params }: Route.LoaderArgs) {
	const { env } = context.get(cloudflareContext);
	const api = await getServerApi(request, env, null);

	try {
		return { report: (await api.reports.shared(params.token)).data };
	} catch (error) {
		throw data(formError(error).error, { status: 404 });
	}
}

/** A shared campaign report. Anyone with the link sees it; printing saves it as a PDF. */
export default function SharedReport({ loaderData }: Route.ComponentProps) {
	return (
		<main className="mx-auto max-w-5xl space-y-4 px-4 py-6 sm:px-6 sm:py-8 print:max-w-none print:p-0">
			<div className="flex justify-end print:hidden">
				<Button variant="secondary" onClick={() => window.print()}>
					<Printer className="h-4 w-4" aria-hidden />
					Save as PDF
				</Button>
			</div>
			<ReportView report={loaderData.report} />
		</main>
	);
}
