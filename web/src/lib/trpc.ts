import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    const env = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL;
    if (env) return env.replace(/\/$/, "");
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      return "";
    return "https://grey-printing-api.onrender.com";
  }
  return "http://localhost:3000";
};

const isProduction = () =>
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1";

/** 프로덕션에서 API 콜드스타트 대비: 실패 시 6초 후 한 번 재시도 */
async function fetchWithRetry(
  url: string,
  options: RequestInit
): Promise<Response> {
  const doFetch = () => fetch(url, { ...options, credentials: "include" as RequestCredentials });
  let res: Response;
  try {
    res = await doFetch();
  } catch (e) {
    if (!isProduction()) throw e;
    await new Promise((r) => setTimeout(r, 6000));
    return doFetch();
  }
  if (res.ok || !isProduction()) return res;
  await new Promise((r) => setTimeout(r, 6000));
  return doFetch();
}

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        fetch: fetchWithRetry,
      }),
    ],
  });
}
