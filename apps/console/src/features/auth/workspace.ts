import { bootstrapAccount } from "~/features/account/server";
import { authClient } from "~/lib/auth/client";

function slugify(value: string) {
  const base = value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "empresa"}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * The signed-in person's own organization: 1. the organization in Better Auth, 2. made active, 3. its account
 * in the Java API. Returns whether it was created.
 */
export async function createWorkspace(name: string): Promise<boolean> {
  const { data: organization, error } = await authClient.organization.create({
    name,
    slug: slugify(name),
  });
  if (error || !organization) {
    return false;
  }
  await authClient.organization.setActive({ organizationId: organization.id });
  await bootstrapAccount({ data: { name } });
  return true;
}
