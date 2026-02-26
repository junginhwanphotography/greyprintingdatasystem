import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";

const getBaseUrl = () => {
  if (typeof window !== "undefined") {
    // 브라우저: 환경 변수로 API 주소 지정 가능 (예: API가 3001에서 뜰 때)
    const env = (import.meta as unknown as { env: { VITE_API_URL?: string } }).env?.VITE_API_URL;
    if (env) return env.replace(/\/$/, "");
    return ""; // 없으면 상대 경로 (Vite 프록시 → localhost:3000)
  }
  return "http://localhost:3000";
};

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        fetch(url, options) {
          return fetch(url, { ...options, credentials: "include" });
        },
      }),
    ],
  });
}
