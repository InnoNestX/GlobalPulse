import { DurableObject } from "cloudflare:workers";

interface StoredValueRecord {
  value: string;
  expiresAt?: number;
}

interface GetPayload {
  key?: string;
}

interface PutPayload {
  key?: string;
  value?: string;
  ttlSeconds?: number;
}

interface DeletePayload {
  key?: string;
}

export class AppStateDurableObject extends DurableObject {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/get") {
      const body = await readJson<GetPayload>(request);
      const key = typeof body.key === "string" ? body.key : "";

      if (!key) {
        return json({ error: "key is required" }, 400);
      }

      const stored = await this.ctx.storage.get<StoredValueRecord>(key);

      if (!stored || typeof stored.value !== "string") {
        return json({ value: null }, 200);
      }

      if (typeof stored.expiresAt === "number" && stored.expiresAt <= Date.now()) {
        await this.ctx.storage.delete(key);
        return json({ value: null }, 200);
      }

      return json({ value: stored.value }, 200);
    }

    if (request.method === "POST" && url.pathname === "/put") {
      const body = await readJson<PutPayload>(request);
      const key = typeof body.key === "string" ? body.key : "";
      const value = typeof body.value === "string" ? body.value : undefined;

      if (!key || value === undefined) {
        return json({ error: "key and value are required" }, 400);
      }

      const ttlSeconds = typeof body.ttlSeconds === "number" && body.ttlSeconds > 0
        ? Math.floor(body.ttlSeconds)
        : undefined;
      const record: StoredValueRecord = {
        value,
      };

      if (ttlSeconds) {
        record.expiresAt = Date.now() + ttlSeconds * 1000;
      }

      await this.ctx.storage.put(key, record);
      return json({ ok: true }, 200);
    }

    if (request.method === "POST" && url.pathname === "/delete") {
      const body = await readJson<DeletePayload>(request);
      const key = typeof body.key === "string" ? body.key : "";

      if (!key) {
        return json({ error: "key is required" }, 400);
      }

      await this.ctx.storage.delete(key);
      return json({ ok: true }, 200);
    }

    return json({ error: "Not found" }, 404);
  }
}

async function readJson<T>(request: Request): Promise<T> {
  try {
    return await request.json<T>();
  } catch {
    return {} as T;
  }
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}
