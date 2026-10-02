import { t } from "elysia";

export const AdminAuthErrorResponse = t.Object({
  error: t.Object({
    code: t.String(),
    message: t.String(),
    requestId: t.String(),
  }),
});

export type AdminAuthErrorDto = typeof AdminAuthErrorResponse.static;
