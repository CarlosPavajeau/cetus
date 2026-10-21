import { createServerFn } from "@tanstack/react-start";
import { type } from "arktype";

import { CetusApiError, api } from "~/lib/api/client";
import type { IssuerDetail } from "~/lib/api/types";
import { env } from "~/lib/env";

import { numberingSchema, softwareSchema } from "../setup/schema";
import { call, rangeBody, softwareBody } from "../setup/server-helpers";
import { requireStaff } from "./server";

const ids = type({ accountId: "string.uuid", issuerId: "string.uuid" });

/** One issuer of the account, with its software, certificate metadata and ranges; null when not found. */
export const getAdminIssuer = createServerFn({ method: "GET" })
  .validator(ids)
  .handler(async ({ data }): Promise<IssuerDetail | null> => {
    await requireStaff();
    try {
      return await api.get("/admin/accounts/{accountId}/issuers/{issuerId}", {
        params: { path: data },
      });
    } catch (error) {
      if (error instanceof CetusApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  });

export const setAdminSoftware = createServerFn({ method: "POST" })
  .validator(ids.and({ software: softwareSchema }))
  .handler(async ({ data: { software, ...path } }) => {
    await requireStaff();
    return call(() =>
      api.put("/admin/accounts/{accountId}/issuers/{issuerId}/software", {
        params: { path },
        body: softwareBody(software),
      }),
    );
  });

export const addAdminRange = createServerFn({ method: "POST" })
  .validator(ids.and({ range: numberingSchema }))
  .handler(async ({ data: { range, ...path } }) => {
    await requireStaff();
    return call(() =>
      api.post("/admin/accounts/{accountId}/issuers/{issuerId}/numbering-ranges", {
        params: { path },
        body: rangeBody(range),
      }),
    );
  });

/** A one-time link for the customer to upload the certificate. The token is shown once, inside the URL. */
export const createCertificateUploadLink = createServerFn({ method: "POST" })
  .validator(ids)
  .handler(async ({ data }) => {
    await requireStaff();
    const link = await api.post(
      "/admin/accounts/{accountId}/issuers/{issuerId}/certificate-upload-links",
      { params: { path: data } },
    );
    return {
      url: `${env.BETTER_AUTH_URL}/certificate-upload/${link.token}`,
      expiresAt: link.expiresAt,
    };
  });
