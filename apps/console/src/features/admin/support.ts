import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { ticketStatuses } from "~/features/support/schema";
import { CetusApiError, api } from "~/lib/api/client";
import type {
  AdminFeedbackPage,
  AdminSupportTicketDetail,
  AdminSupportTicketPage,
} from "~/lib/api/types";

import { requireStaff } from "./server";

/** One page of every account's tickets, newest first, optionally in one status. */
export const listAdminSupportTickets = createServerFn({ method: "GET" })
  .validator(
    type({
      "status?": type.enumerated(...ticketStatuses).or("undefined"),
      "before?": "string.uuid | undefined",
    }),
  )
  .handler(async ({ data }): Promise<AdminSupportTicketPage> => {
    await requireStaff();
    return api.get("/admin/support-tickets", {
      params: { query: { status: data.status, before: data.before, limit: 50 } },
    });
  });

/** One ticket with the account's state when it was opened; null when it does not exist. */
export const getAdminSupportTicket = createServerFn({ method: "GET" })
  .validator(type({ id: "string.uuid" }))
  .handler(async ({ data }): Promise<AdminSupportTicketDetail | null> => {
    await requireStaff();
    try {
      return await api.get("/admin/support-tickets/{id}", { params: { path: { id: data.id } } });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

export const changeSupportTicketStatus = createServerFn({ method: "POST" })
  .validator(type({ id: "string.uuid", status: type.enumerated(...ticketStatuses) }))
  .handler(async ({ data }): Promise<AdminSupportTicketDetail> => {
    await requireStaff();
    return api.put("/admin/support-tickets/{id}/status", {
      params: { path: { id: data.id } },
      body: { status: data.status },
    });
  });

/** One page of the opinions shared from every console, newest first. */
export const listAdminFeedback = createServerFn({ method: "GET" })
  .validator(type({ "before?": "string.uuid | undefined" }))
  .handler(async ({ data }): Promise<AdminFeedbackPage> => {
    await requireStaff();
    return api.get("/admin/feedback", { params: { query: { before: data.before, limit: 50 } } });
  });
