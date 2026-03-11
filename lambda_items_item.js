/**
 * Lambda B: Items "single item" routes.
 * Handles:
 * - GET    /items/{id}
 * - PUT    /items/{id}
 * - DELETE /items/{id}
 *
 * NOTE: This Lambda uses its own in-memory store; it will not share state with Lambda A.
 * That is intentional for learning: it demonstrates why real persistence is needed.
 *
 * HTTP API routes are method + path patterns. :contentReference[oaicite:7]{index=7}
 */

const itemsStore = new Map(); // id -> item (independent store)

/**
 * Build a JSON proxy response. :contentReference[oaicite:8]{index=8}
 */
function json(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

function readJsonBody(event) {
  if (!event?.body) return null;
  try {
    return JSON.parse(event.body);
  } catch (_err) {
    return null;
  }
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method ?? "";
  const path = event?.rawPath ?? "";
  const id = event?.pathParameters?.id;

  console.log("REQUEST:", { method, path, id });

  if (!id) {
    return json(400, { ok: false, error: { code: "VALIDATION_ERROR", message: "Missing path param: id" } });
  }

  if (method === "GET") {
    const item = itemsStore.get(id);
    if (!item) {
      return json(404, { ok: false, error: { code: "NOT_FOUND", message: "Item not found." } });
    }
    return json(200, { ok: true, data: item, meta: {} });
  }

  if (method === "PUT") {
    const body = readJsonBody(event);
    if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
      return json(400, {
        ok: false,
        error: { code: "VALIDATION_ERROR", message: "Field 'name' is required." },
      });
    }

    const existing = itemsStore.get(id);
    if (!existing) {
      return json(404, { ok: false, error: { code: "NOT_FOUND", message: "Item not found." } });
    }

    const updated = { ...existing, name: body.name.trim(), updatedAt: new Date().toISOString() };
    itemsStore.set(id, updated);
    return json(200, { ok: true, data: updated, meta: {} });
  }

  if (method === "DELETE") {
    const existed = itemsStore.delete(id);
    if (!existed) {
      return json(404, { ok: false, error: { code: "NOT_FOUND", message: "Item not found." } });
    }
    return json(200, { ok: true, data: { deleted: true }, meta: {} });
  }

  return json(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: `Method ${method} not allowed.` } });
};
