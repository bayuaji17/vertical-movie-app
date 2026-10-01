import { t } from "elysia";

export const AdminSessionResponse = t.Object({
  user: t.Object({
    id: t.String(),
    name: t.String(),
    email: t.String(),
  }),
  session: t.Object({
    expiresAt: t.String({ format: "date-time" }),
  }),
});

export const AdminAuthErrorResponse = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    requestId: t.String(),
  }),
});

export type AdminSessionDto = typeof AdminSessionResponse.static;
export type AdminAuthErrorDto = typeof AdminAuthErrorResponse.static;
