import { createSettingsFixture } from "./site-settings-fixture";
import { createApp } from "../../src/app";
import type { RequireAdminDependencies } from "../../src/modules/auth/admin/guard";

export async function createSettingsBrowserFixture(
  getSession: RequireAdminDependencies["getSession"],
) {
  const fixture = await createSettingsFixture();
  const app = createApp({
    getSession,
    settingsService: fixture.service,
    requestLogger: { write: () => {} },
  }).compile();
  let publicReads = 0,
    privateReads = 0,
    saves = 0,
    mode = "normal",
    held = false;
  const releases = new Set<() => void>();
  return {
    proof: () => ({
      publicReads,
      privateReads,
      saves,
      sqlReads: fixture.reads(),
      sqlWrites: fixture.writes(),
    }),
    async control(input: {
      mode?: string;
      held?: boolean;
      externalName?: string;
    }) {
      if (input.mode) mode = input.mode;
      if (input.held !== undefined) {
        held = input.held;
        if (!held) {
          for (const release of releases) release();
          releases.clear();
        }
      }
      if (input.externalName) {
        const {
          rowVersion,
          updatedAt: _updatedAt,
          ...fields
        } = await fixture.service.read();
        await fixture.service.save({
          ...fields,
          siteName: input.externalName,
          expectedVersion: rowVersion,
        });
      }
    },
    async handle(request: Request) {
      const url = new URL(request.url);
      if (url.pathname === "/site-settings") publicReads++;
      if (url.pathname === "/admin/settings")
        request.method === "PATCH" ? saves++ : privateReads++;
      if (request.method === "PATCH" && mode === "reject")
        return Response.json(
          {
            error: {
              code: "SETTINGS_UNAVAILABLE",
              message: "Fixture unavailable",
              requestId: "settings-proof",
            },
          },
          { status: 503 },
        );
      const response = await app.handle(request);
      if (
        url.pathname === "/admin/settings" &&
        request.method === "GET" &&
        held
      )
        await new Promise<void>((resolve) => releases.add(resolve));
      if (
        request.method === "PATCH" &&
        response.status === 200 &&
        mode === "commit-unknown"
      )
        return Response.json(
          {
            error: {
              code: "SETTINGS_UNAVAILABLE",
              message: "Fixture response lost",
              requestId: "settings-proof",
            },
          },
          { status: 503 },
        );
      return response;
    },
    close: () => fixture.close(),
  };
}
