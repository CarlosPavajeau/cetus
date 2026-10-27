import { readFile } from "node:fs/promises";

import { type } from "arktype";

import type { TestOrganization } from "./organization";
import { apiUrl, testCertificate } from "./stack";

/**
 * A NIT no other test uses. The CUFE depends on the NIT, the number and the issue time, and is unique
 * across Cetus: two tests issuing SETP1 for the same NIT in the same second would collide.
 */
export function uniqueNit() {
  return `9${String(Math.floor(Math.random() * 1e8)).padStart(8, "0")}`;
}

/** Creates an issuer through the API, as step 1 of the assistant would. */
export async function createIssuer(organization: TestOrganization, nit: string, legalName: string) {
  const response = await organization.api("/console/issuers", {
    method: "POST",
    body: JSON.stringify({
      environment: "TEST",
      nit,
      legalName,
      personType: "LEGAL_ENTITY",
      taxLevelCodes: ["O-13"],
      responsibleForIva: true,
      address: {
        municipalityCode: "11001",
        cityName: "Bogotá, D.C.",
        departmentCode: "11",
        departmentName: "Bogotá, D.C.",
        postalCode: "110111",
        line: "Calle 1 # 2-3",
        countryCode: "CO",
        countryName: "Colombia",
      },
      email: "facturas@emisores.test",
    }),
  });
  return type({ id: "string" }).assert(await response.json()).id;
}

/**
 * Sets up a test issuer through the API until it is in habilitación. Without a test set, the worker
 * validates its documents one by one with SendBillSync, which the DIAN mock answers at once.
 */
export async function onboardIssuer(
  organization: TestOrganization,
  nit: string,
  legalName: string,
  { testSet = true, rangeTo = 5000 }: { testSet?: boolean; rangeTo?: number } = {},
) {
  const id = await createIssuer(organization, nit, legalName);
  await organization.api(`/console/issuers/${id}/software`, {
    method: "PUT",
    body: JSON.stringify({
      softwareId: "381db121-bc49-4286-9067-ef982e3874e4",
      pin: "12345",
      testSetId: testSet ? "a09e2744-f1d7-4697-bbcf-613bc312450d" : undefined,
    }),
  });
  await organization.api(`/console/issuers/${id}/certificate`, {
    method: "PUT",
    body: JSON.stringify({
      pkcs12Base64: (await readFile(testCertificate.path)).toString("base64"),
      password: testCertificate.password,
    }),
  });
  await addRange(organization, id, "SETP", rangeTo);
  return id;
}

export async function addRange(
  organization: TestOrganization,
  id: string,
  prefix: string,
  to = 5000,
) {
  const response = await organization.api(`/console/issuers/${id}/numbering-ranges`, {
    method: "POST",
    body: JSON.stringify({
      documentType: "INVOICE",
      resolutionNumber: "18760000001",
      resolutionDate: "2026-01-01",
      prefix,
      from: 1,
      to,
      validFrom: "2026-01-01",
      validTo: "2030-12-31",
      technicalKey: "fc8eac422eba16e22ffd8c6f94b3f40a6e38162c",
    }),
  });
  if (!response.ok) {
    throw new Error(`Adding the range answered ${response.status}`);
  }
}

/** Creates a TEST API key for the organization and returns its secret. */
export async function createTestApiKey(organization: TestOrganization) {
  const response = await organization.api("/console/api-keys", {
    method: "POST",
    body: JSON.stringify({ name: "ERP", environment: "TEST" }),
  });
  return type({ secret: "string" }).assert(await response.json()).secret;
}

/** Issues an invoice through the integrator API, as an ERP would; returns its id and number. */
export async function issueInvoice(apiKey: string, issuerId: string, customerName: string) {
  const response = await fetch(`${apiUrl}/v1/invoices`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      issuerId,
      customer: {
        personType: "NATURAL_PERSON",
        identificationType: "CITIZEN_ID",
        identificationNumber: "1020304050",
        legalName: customerName,
      },
      payment: { method: "CASH", meansCode: "10" },
      lines: [
        {
          itemCode: "SERV-1",
          description: "Servicio de consultoría",
          quantity: 1,
          unitPrice: 100000,
          taxes: [{ type: "IVA", percent: 19 }],
        },
      ],
    }),
  });
  if (response.status !== 202) {
    throw new Error(`Issuing the invoice answered ${response.status}: ${await response.text()}`);
  }
  return type({ id: "string", number: "string" }).assert(await response.json());
}

/** Adds the range credit notes are numbered from, with no resolution, as the issuer page does. */
export async function addCreditNoteRange(organization: TestOrganization, id: string) {
  const response = await organization.api(`/console/issuers/${id}/numbering-ranges`, {
    method: "POST",
    body: JSON.stringify({ documentType: "CREDIT_NOTE", prefix: "NC", from: 1, to: 99999999 }),
  });
  if (!response.ok) {
    throw new Error(`Adding the credit note range answered ${response.status}`);
  }
}

/** Waits until the worker leaves the document in a final status, and returns it. Polls every 500 ms. */
export async function waitForStatus(
  organization: TestOrganization,
  documentId: string,
  attemptsLeft = 60,
): Promise<string> {
  const response = await organization.api(`/console/documents/${documentId}`);
  const { status } = type({ status: "string" }).assert(await response.json());
  if (status !== "RECEIVED" && status !== "PROCESSING") {
    return status;
  }
  if (attemptsLeft <= 1) {
    throw new Error(`Document ${documentId} is still being processed`);
  }
  await new Promise((resolve) => setTimeout(resolve, 500));
  return waitForStatus(organization, documentId, attemptsLeft - 1);
}
