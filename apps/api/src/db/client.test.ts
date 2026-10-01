import { describe, expect, it } from "bun:test";

import { createDatabase } from "./client";

describe("createDatabase", () => {
  it("creates an unopened Bun SQL client and Drizzle session", async () => {
    const { client, db } = createDatabase(
      "postgresql://postgres:postgres@127.0.0.1:5432/unopened_auth_probe",
    );

    expect(db).toBeDefined();
    await client.close();
  });
});
