import type { RouterContextProvider } from "react-router";
import { cloudflareContext } from "./cloudflare";

/** Free vector tiles with no key. Set `MAP_STYLE_URL` to use another provider. */
const DEFAULT_STYLE = "https://tiles.openfreemap.org/styles/positron";

/** The MapLibre style every map in the app draws with. */
export function mapStyleUrl(context: Readonly<RouterContextProvider>): string {
	return context.get(cloudflareContext).env.MAP_STYLE_URL || DEFAULT_STYLE;
}
