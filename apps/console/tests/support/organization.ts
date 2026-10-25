import { legalAcceptance, legalAcceptanceHeader } from "~/features/legal/documents";

import { markEmailVerified } from "./invitations";
import { apiUrl, consoleUrl } from "./stack";

/** A signed-up user with its own organization and Cetus account, created through the real HTTP endpoints. */
export type TestOrganization = {
  email: string;
  password: string;
  /** The Better Auth session cookies, to sign a browser in without the form. */
  cookies: { name: string; value: string }[];
  /** A fresh JWT for the API, minted by the console as its BFF does. */
  token: () => Promise<string>;
  /** Calls the Java API as this organization. */
  api: (path: string, init?: RequestInit) => Promise<Response>;
  /** Calls Better Auth (`/api/auth/*`) with this user's session; throws unless it answers 2xx. */
  auth: <T = unknown>(path: string, body?: unknown) => Promise<T>;
  /** Like `auth`, but returns the raw response whatever its status. */
  authResponse: (path: string, body?: unknown) => Promise<Response>;
};

/**
 * Does what the sign-up page does: creates the user and the organization in Better Auth, makes the
 * organization active and bootstraps its account in the API. Unique per call, so tests never share data.
 */
export async function createOrganization(name = "Pruebas SAS"): Promise<TestOrganization> {
  const id = crypto.randomUUID().slice(0, 8);
  const email = `e2e-${id}@cetus.test`;
  const password = `clave-${id}-segura`;
  const jar = new Map<string, string>();

  async function authResponse(path: string, body?: unknown, headers: Record<string, string> = {}) {
    const response = await fetch(`${consoleUrl}/api/auth${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        "Content-Type": "application/json",
        // Better Auth only accepts cookie-authenticated calls from its own origin.
        Origin: consoleUrl,
        Cookie: [...jar].map(([key, value]) => `${key}=${value}`).join("; "),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ""] = cookie.split(";");
      const separator = pair.indexOf("=");
      jar.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  }

  async function auth<T = unknown>(path: string, body?: unknown): Promise<T> {
    const response = await authResponse(path, body);
    if (!response.ok) {
      throw new Error(`${path} answered ${response.status}: ${await response.text()}`);
    }
    return response.json();
  }

  const signUp = await authResponse(
    "/sign-up/email",
    { name: "Persona de pruebas", email, password },
    { [legalAcceptanceHeader]: legalAcceptance },
  );
  if (!signUp.ok) {
    throw new Error(`/sign-up/email answered ${signUp.status}: ${await signUp.text()}`);
  }
  const organization = await auth<{ id: string }>("/organization/create", {
    name,
    slug: `${name}-${id}`.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-"),
  });
  await auth("/organization/set-active", { organizationId: organization.id });

  const token = async () => (await auth<{ token: string }>("/token")).token;
  const api = async (path: string, init: RequestInit = {}) => {
    const headers = new Headers({
      "Content-Type": "application/json",
      Authorization: `Bearer ${await token()}`,
    });
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    return fetch(`${apiUrl}${path}`, { ...init, headers });
  };

  const account = await api("/console/account", { method: "POST", body: JSON.stringify({ name }) });
  if (!account.ok) {
    throw new Error(`Bootstrapping the account answered ${account.status}`);
  }

  return {
    email,
    password,
    // A getter: Better Auth rotates the session cookie on some calls (e.g. verifying 2FA).
    get cookies() {
      return [...jar].map(([cookieName, value]) => ({ name: cookieName, value }));
    },
    token,
    api,
    auth,
    authResponse,
  };
}

type FullOrganization = { members: { id: string; role: string; user: { email: string } }[] };

/**
 * Signs up someone with an account of their own and brings them into the owner's organization with the
 * given role, active there. Returns them with their membership ID, to change their role later.
 */
export async function inviteMember(
  owner: TestOrganization,
  role: string,
): Promise<{ person: TestOrganization; memberId: string }> {
  const person = await createOrganization("Colega SAS");
  // Joining takes a confirmed address; the confirmation itself is tested in members.spec.ts.
  await markEmailVerified(person.email);
  const invitation = await owner.auth<{ id: string; organizationId: string }>(
    "/organization/invite-member",
    { email: person.email, role },
  );
  await person.auth("/organization/accept-invitation", { invitationId: invitation.id });
  await person.auth("/organization/set-active", { organizationId: invitation.organizationId });
  const organization = await owner.auth<FullOrganization>("/organization/get-full-organization");
  const membership = organization.members.find((member) => member.user.email === person.email);
  if (!membership) {
    throw new Error(`${person.email} is not a member after accepting the invitation`);
  }
  return { person, memberId: membership.id };
}

export async function setMemberRole(owner: TestOrganization, memberId: string, role: string) {
  await owner.auth("/organization/update-member-role", { memberId, role });
}
