import { test, expect } from "bun:test";
import { createSeriesModule } from "./index";
import { SeriesService } from "./service";
test("series routes never call domain service without admin", async () => {
  const service = new SeriesService();
  let called = 0;
  service.create = async () => {
    called++;
    throw new Error("Must not call");
  };
  const app = createSeriesModule({ service, getSession: async () => null });
  const response = await app.handle(
    new Request("http://localhost/admin/series", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: "Private" }),
    }),
  );
  expect(response.status).toBe(401);
  expect(called).toBe(0);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
});
