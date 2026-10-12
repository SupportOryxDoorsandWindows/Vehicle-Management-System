// RLS turns an update the caller isn't allowed to make into "0 rows changed"
// rather than an error, so updates read their row back and throw this instead.
export const NOT_SAVED_MESSAGE =
  "The change wasn't saved. Your account may no longer have admin access.";
