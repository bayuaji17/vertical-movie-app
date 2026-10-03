export type SessionSnapshot = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    banned: boolean;
  };
  session: { expiresAt: string };
};
export type SessionInput = {
  user: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    banned?: boolean | null;
  };
  session: { expiresAt: string | Date };
};
export function projectSession(
  value: SessionInput | null,
): SessionSnapshot | null {
  if (!value) return null;
  const expiresAt = new Date(value.session.expiresAt);
  if (!Number.isFinite(expiresAt.getTime()))
    throw new AuthDependencyError("upstream");
  return {
    user: {
      id: value.user.id,
      name: value.user.name,
      email: value.user.email,
      role: value.user.role ?? "user",
      banned: value.user.banned ?? false,
    },
    session: { expiresAt: expiresAt.toISOString() },
  };
}
export class AuthDependencyError extends Error {
  constructor(
    public readonly reason:
      "configuration" | "network" | "upstream" | "timeout",
    public readonly httpStatus?: number,
  ) {
    super("The authentication service is temporarily unavailable.");
    this.name = "AuthDependencyError";
  }
}
export function isAdminSession(
  session: SessionSnapshot | null,
  now = Date.now(),
): session is SessionSnapshot {
  return (
    session !== null &&
    session.user.role === "admin" &&
    !session.user.banned &&
    Date.parse(session.session.expiresAt) > now
  );
}
