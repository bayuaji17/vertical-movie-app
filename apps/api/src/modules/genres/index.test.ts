import { test, expect } from "bun:test";
import { createGenresModule } from "./index";
import { GenresService } from "./service";
test("genre create is denied before querying without admin", async () => {
  const service = new GenresService();
  let calls = 0;
  service.create = async () => {
    calls++;
    throw new Error("Forbidden call");
  };
  const app = createGenresModule({ service, getSession: async () => null });
  const r = await app.handle(
    new Request("http://localhost/admin/genres", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Drama" }),
    }),
  );
  expect(r.status).toBe(401);
  expect(calls).toBe(0);
});
