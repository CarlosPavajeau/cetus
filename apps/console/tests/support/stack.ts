// The tests run against the local stack (`mise run dev-mock`): console, API, worker and DIAN mock, with
// the real Postgres and LocalStack. Nothing is mocked; every test creates its own organization.

export const consoleUrl = process.env.CONSOLE_URL ?? "http://localhost:3000";
export const apiUrl = process.env.CETUS_API_URL ?? "http://localhost:8080";

/** The self-signed certificate of the API tests. */
export const testCertificate = {
  path: new URL("../../../api/src/test/resources/test-signer.p12", import.meta.url).pathname,
  password: "cetus-test",
};

/** Fails fast, with the command to run, when the stack is not up. */
export async function assertStackIsUp() {
  const checks = [
    { name: "console", url: `${consoleUrl}/sign-in` },
    { name: "API", url: `${apiUrl}/q/health/ready` },
  ];
  const results = await Promise.all(
    checks.map((check) =>
      fetch(check.url).then(
        (response) => response.ok,
        () => false,
      ),
    ),
  );
  const down = checks.find((_, index) => !results[index]);
  if (down) {
    throw new Error(
      `The ${down.name} is not answering at ${down.url}. Start the stack with \`mise run dev-mock\` first.`,
    );
  }
}

/** Session cookies for the console, so a browser context signs in without the form. */
export function consoleCookies(cookies: readonly { name: string; value: string }[]) {
  return cookies.map((cookie) => ({ name: cookie.name, value: cookie.value, url: consoleUrl }));
}
