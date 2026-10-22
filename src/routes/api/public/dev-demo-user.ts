// TEMPORARY dev helper: creates the confirmed demo account via the Admin API.
// Delete this file after local verification — never ship it.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/dev-demo-user")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: "demo.leader@raidnight.app",
          password: "DemoPass123!",
          email_confirm: true,
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ id: data.user.id });
      },
    },
  },
});
