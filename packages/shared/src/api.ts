/** Error body of every non-2xx /api response. `details` lists per-field problems for `invalid_request`. */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: { path: string; message: string }[];
  };
}
