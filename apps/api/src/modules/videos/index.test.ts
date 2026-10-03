import { test, expect } from "bun:test";
import { createVideosModule } from "./index";
import { VideosService } from "./service";
test("video create never calls service without admin", async () => {
  let calls = 0;
  const service = new VideosService();
  service.create = async () => {
    calls++;
    throw new Error("Forbidden");
  };
  const app = createVideosModule({ service, getSession: async () => null });
  const response = await app.handle(
    new Request("http://localhost/admin/videos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ kind: "movie", title: "Movie" }),
    }),
  );
  expect(response.status).toBe(401);
  expect(calls).toBe(0);
});
