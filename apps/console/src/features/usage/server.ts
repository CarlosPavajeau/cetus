import { createServerFn } from "@tanstack/react-start";

import { api } from "~/lib/api/client";

export const getUsage = createServerFn({ method: "GET" }).handler(() => api.get("/console/usage"));
