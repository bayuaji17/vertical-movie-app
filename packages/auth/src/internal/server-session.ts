import { createAuthClient } from "better-auth/client";
import { adminClient } from "better-auth/client/plugins";
import { AuthDependencyError } from "./projection";
import { readSdkSession } from "./sdk-session";
import type { SessionReadOptions } from "./sdk-session";

export function readServerSession(
  options: SessionReadOptions & {
    apiOrigin: string | undefined;
    cookie?: string;
    fetcher?: (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1],
    ) => Promise<Response>;
    onSetCookie?: (cookies: string[]) => void;
  },
) {
  let origin: URL;
  try {
    origin = new URL(options.apiOrigin ?? "");
    if (
      !["http:", "https:"].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== "/" ||
      origin.search ||
      origin.hash
    )
      throw new Error();
  } catch {
    throw new AuthDependencyError("configuration");
  }
  const client = createAuthClient({
    baseURL: origin.origin,
    plugins: [adminClient()],
    disableDefaultFetchPlugins: true,
    fetchOptions: {
      cache: "no-store",
      redirect: "manual",
      retry: 0,
      headers: options.cookie ? { cookie: options.cookie } : {},
      customFetchImpl: async (input, init) => {
        const response = await (options.fetcher ?? fetch)(input, init);
        const cookies = response.headers.getSetCookie();
        if (cookies.length) options.onSetCookie?.(cookies);
        return response;
      },
    },
  });
  return readSdkSession(
    (signal) =>
      client.getSession({
        query: { disableCookieCache: true },
        fetchOptions: { signal },
      }),
    options,
  );
}
