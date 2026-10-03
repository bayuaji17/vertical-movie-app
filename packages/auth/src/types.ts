export type {
  Auth,
  BetterAuthClientOptions,
  BetterAuthOptions,
  Session,
  User,
} from "better-auth";
export type { AuthServer } from "./server";
export type { AuthClient } from "./client";
export type { AuthConfiguration } from "./internal/options";
export type { SessionSnapshot, SessionInput } from "./internal/projection";

/** Readers project native SDK data before it reaches a serialized query cache. */
export type SessionReader = (options?: {
  signal?: AbortSignal;
  authoritative?: boolean;
}) => Promise<import("./internal/projection").SessionSnapshot | null>;
