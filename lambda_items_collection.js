/**
 * Lambda A: Items "collection" routes.
 * Handles:
 * - GET  /items -> List all the items
 * - POST /items -> Creates an item
 *
 * Notes:
 * - This uses in-memory storage for learning only.
 * - State may persist across warm invocations but can reset on cold start.
 *
 * HTTP API event format is payload version 2.0 by default in the console. :contentReference[oaicite:5]{index=5}
 */

// Set up the memory config
const itemsStore = new Map();

/**
 * Build a standard JSON response for API Gateway proxy integrations.
 *
 * API Gateway expects statusCode, headers, and body (string). :contentReference[oaicite:6]{index=6}
 */
function json(statusCode, data, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      // For class simplicity. In production, restrict origins via API Gateway CORS config.
      "Access-Control-Allow-Origin": "*",
      ...extraHeaders,
    },
    body: JSON.stringify(data),
  };
}

// This will read a json body for the create event
function readJsonBody(event) {
  if (!event?.body) return null;
  try {
    return JSON.parse(event.body);
  } catch (_err) {
    return null;
  }
}

// Generate the identifier for the post action
function generateId() {
  return `item_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

// CASES
const ALLOWED_METHODS = {
  get: "GET",
  post: "POST"
};

export const handler = async (event) => {
  // Get the method from the event
  const method = event?.requestContext?.http?.method ?? "";
  const path = event?.rawPath ?? "";

  // Only accept /items on this Lambda
  if (path !== "/items") {
    return json(404, { ok: false, error: { code: "NOT_FOUND", message: "Route not found." } });
  }

  /* Switch case for going true the methods */
  switch (method) {
    case ALLOWED_METHODS.get:
      const items = Array.from(itemsStore.values());
      return json(200, { ok: true, data: items, meta: { total: items.length } });
      break;
    case ALLOWED_METHODS.post:
      const body = readJsonBody(event);

      if (!body || typeof body.name !== "string" || body.name.trim().length === 0) {
        return json(400, {
          ok: false,
          error: { code: "VALIDATION_ERROR", message: "Field 'name' is required." },
        });
      }

      const id = generateId();
      const item = {
        id,
        name: body.name.trim(),
        created_at: new Date().toISOString(),
      }

      itemsStore.set(id, item);

      return json(201, { ok: true, data: item, meta: {} });
      break;
    default:
      return json(405, { ok: false, error: { code: "METHOD_NOT_ALLOWED", message: `Method ${method} not allowed.` } });
  }
};
