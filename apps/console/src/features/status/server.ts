import { createServerFn } from "@tanstack/react-start";

import { api } from "~/lib/api/client";
import type { PlatformStatus } from "~/lib/api/types";

/** What the public status page shows; the console reads it for the incident banner. */
export const getPlatformStatus = createServerFn({ method: "GET" }).handler(
  (): Promise<PlatformStatus> => api.get("/status"),
);
