import type { Role } from "./problem.js";

/** Error body of every non-2xx /api response. `details` lists per-field problems for `invalid_request`. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}

/** GET /api/me, and the body of a successful signup/login. */
export interface Me {
  id: number;
  email: string;
  name: string;
  role: Role;
}
