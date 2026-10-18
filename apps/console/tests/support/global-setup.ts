import { assertStackIsUp } from "./stack";

/** Shared by Vitest and Playwright: both run against the local stack. */
export default async function globalSetup() {
  await assertStackIsUp();
}
