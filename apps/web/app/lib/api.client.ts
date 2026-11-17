import { createGreyboardsClient } from "@greyboards/api-client";
import ReactHook from "alova/react";

/**
 * Browser-side API client, for alova hooks (useRequest, usePagination, ...)
 * in components. The base URL is passed down from the root loader.
 */
let client: ReturnType<typeof createGreyboardsClient> | undefined;

export function getBrowserApi(baseURL: string) {
	client ??= createGreyboardsClient({ baseURL, statesHook: ReactHook });
	return client.api;
}
