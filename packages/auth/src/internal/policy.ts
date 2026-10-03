export const passwordPolicy = { minLength: 12, maxLength: 128 } as const;
export const supportedAuthOperations: Readonly<
  Record<string, readonly ("get" | "post")[]>
> = {
  "/ok": ["get"],
  "/get-session": ["get", "post"],
  "/sign-in/email": ["post"],
  "/sign-out": ["post"],
};
export const disabledAuthPaths = [
  "/sign-up/email",
  "/request-password-reset",
  "/reset-password",
  "/send-verification-email",
  "/verify-email",
  "/change-password",
  "/set-password",
  "/update-user",
  "/delete-user",
  "/delete-user/callback",
] as const;
export function isDisabledAuthPath(path: string, method?: string): boolean {
  const methods = supportedAuthOperations[path];
  return (
    !methods ||
    (method !== undefined &&
      !methods.some((allowed) => allowed === method.toLowerCase()))
  );
}
