import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

import { SIDEBAR_COOKIE_NAME } from "~/components/ui/sidebar";

/**
 * Whether the person left the sidebar expanded, so the server renders it that way. In the browser it reads
 * the cookie directly: the layout's loader runs on every preload and must not call the server for it.
 */
export const isSidebarOpen = createIsomorphicFn()
  .server(() => getCookie(SIDEBAR_COOKIE_NAME) !== "false")
  .client(() => !document.cookie.split("; ").includes(`${SIDEBAR_COOKIE_NAME}=false`));
