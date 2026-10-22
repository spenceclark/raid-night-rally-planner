import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { getMyGuilds } from "./raid.functions";

export interface GuildMembership {
  role: "leader" | "member";
  display_name: string;
  guild_id: string;
  guilds: { id: string; name: string; invite_code: string; is_demo: boolean } | null;
}

/** Loads the signed-in user's guild memberships and tracks the active guild. */
export function useGuild() {
  const query = useQuery({
    queryKey: ["my-guilds"],
    queryFn: () => getMyGuilds(),
  });

  const memberships = (query.data ?? []) as unknown as GuildMembership[];
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("raid-night:active-guild");
    if (saved) setActiveId(saved);
  }, []);

  const active =
    memberships.find((m) => m.guild_id === activeId) ?? memberships[0] ?? null;

  function select(guildId: string) {
    setActiveId(guildId);
    window.localStorage.setItem("raid-night:active-guild", guildId);
  }

  return {
    memberships,
    active,
    select,
    isLoading: query.isLoading,
    isLeader: active?.role === "leader",
  };
}
