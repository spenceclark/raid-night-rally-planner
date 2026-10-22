import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Raid Night Planner — guild raid coordination" },
      {
        name: "description",
        content:
          "Coordinate guild raids: signups, role gaps, standby replacements and leader alerts — with a bot-friendly MCP interface.",
      },
      { property: "og:title", content: "Raid Night Planner — guild raid coordination" },
      {
        property: "og:description",
        content:
          "Coordinate guild raids: signups, role gaps, standby replacements and leader alerts — with a bot-friendly MCP interface.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/raids" });
    });
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <p className="font-display text-sm tracking-[0.3em] text-primary uppercase">Raid Night</p>
      <h1 className="mt-4 max-w-2xl font-display text-5xl font-bold text-foreground">
        Autopilot
      </h1>
      <p className="mt-6 max-w-xl text-lg text-muted-foreground">
        Coordinate your guild's raids: signups, role gaps, standby replacements and
        leader alerts — with Grok Bot managing raids through the MCP interface.
      </p>
      <div className="mt-10 flex gap-4">
        <Button asChild size="lg">
          <Link to="/auth">Enter the guild hall</Link>
        </Button>
      </div>
    </div>
  );
}
