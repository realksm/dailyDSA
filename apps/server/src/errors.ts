// Error types and the single error handler that turns them into ApiError bodies.
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError, type z } from "zod";
import type { ApiError } from "@dailydsa/shared";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const badRequest = (message: string, code = "bad_request") => new HttpError(400, code, message);
export const unauthorized = (message = "Please log in.") => new HttpError(401, "unauthorized", message);
export const forbidden = (message = "You don't have access to this.") => new HttpError(403, "forbidden", message);
export const notFound = (message = "Not found.") => new HttpError(404, "not_found", message);
export const conflict = (message: string, code = "conflict") => new HttpError(409, code, message);
export const tooManyRequests = (message: string) => new HttpError(429, "rate_limited", message);

/** Validates untrusted input; a failure becomes a 400 `invalid_request` listing each bad field. */
export function parse<S extends z.ZodType>(schema: S, data: unknown): z.output<S> {
  return schema.parse(data);
}

const body = (code: string, message: string, details?: ApiError["error"]["details"]): ApiError => ({
  error: details ? { code, message, details } : { code, message },
});

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json(body("not_found", `No route for ${req.method} ${req.originalUrl.split("?")[0]}.`));
};

export function errorHandler(log: (err: unknown) => void = console.error): ErrorRequestHandler {
  return (err, _req, res, next) => {
    if (res.headersSent) return next(err);
    if (err instanceof HttpError) {
      res.status(err.status).json(body(err.code, err.message));
    } else if (err instanceof ZodError) {
      const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
      res.status(400).json(body("invalid_request", "Some fields are invalid.", details));
    } else if (isBodyParserError(err)) {
      // express.json(): malformed JSON / body over the limit. These are the client's fault.
      res.status(err.status).json(body(err.type === "entity.too.large" ? "too_large" : "bad_json", err.message));
    } else {
      log(err);
      res.status(500).json(body("internal", "Something went wrong on our side."));
    }
  };
}

function isBodyParserError(err: unknown): err is { status: number; type: string; message: string } {
  const e = err as { status?: unknown; type?: unknown; expose?: unknown };
  return typeof e?.status === "number" && e.status >= 400 && e.status < 500 && typeof e.type === "string" && e.expose === true;
}
