import { describe, expect, test } from "vitest";

import { createOrganization } from "../support/organization";
import { apiUrl } from "../support/stack";

const issuer = {
  environment: "TEST",
  nit: "900123456",
  legalName: "Acme SAS",
  personType: "LEGAL_ENTITY",
  taxLevelCodes: ["O-13"],
  responsibleForIva: true,
  address: {
    municipalityCode: "20001",
    cityName: "Valledupar",
    departmentCode: "20",
    departmentName: "Cesar",
    postalCode: "200001",
    line: "Carrera 11 #13B-62",
    countryCode: "CO",
    countryName: "Colombia",
  },
  email: "facturas@acme.test",
};

// The console signs its users in with Better Auth and calls the API with the JWTs it mints: these
// tests check that contract end to end, with the real console, API and database.
describe("console tokens in the API", () => {
  test("a new organization reaches its own account with the console's token", async () => {
    const organization = await createOrganization("Cuenta SAS");

    const response = await organization.api("/console/account");

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ name: "Cuenta SAS" });
  });

  test("the console API rejects calls without a token", async () => {
    const response = await fetch(`${apiUrl}/console/issuers`);

    expect(response.status).toBe(401);
  });

  test("an organization never sees the issuers of another one", async () => {
    const owner = await createOrganization("Dueña SAS");
    const other = await createOrganization("Otra SAS");
    const created = await owner.api("/console/issuers", {
      method: "POST",
      body: JSON.stringify(issuer),
    });
    expect(created.status).toBe(200);
    const { id } = (await created.json()) as { id: string };

    expect(await (await other.api("/console/issuers")).json()).toEqual([]);
    expect((await other.api(`/console/issuers/${id}`)).status).toBe(404);
    const { environment: _, nit: __, ...update } = issuer;
    const edited = await other.api(`/console/issuers/${id}`, {
      method: "PUT",
      body: JSON.stringify({ ...update, legalName: "Intrusa SAS" }),
    });
    expect(edited.status).toBe(404);

    const detail = await (await owner.api(`/console/issuers/${id}`)).json();
    expect(detail).toMatchObject({ legalName: "Acme SAS", status: "ONBOARDING", software: null });
  });
});
