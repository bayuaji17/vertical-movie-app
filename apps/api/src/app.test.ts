import { describe, expect, it } from "bun:test";

import { createApp } from "./app";

describe("createApp", () => {
  it("serves the public starter route without opening a port", async () => {
    const response = await createApp().handle(new Request("http://localhost/"));

    expect(response.status).toBe(200);
    expect(await response.text()).toBe("Hello Elysia");
  });
});
