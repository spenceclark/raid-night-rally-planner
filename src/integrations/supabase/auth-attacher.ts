// Attaches the current Supabase session bearer token to every server-function
// call. The server re-validates the token in requireSupabaseAuth.
import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "./client";

export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
