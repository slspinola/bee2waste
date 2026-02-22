"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/enums";

interface UserAccess {
  parkId: string;
  role: UserRole;
}

export function useUserRole(parkId?: string | null) {
  const [roles, setRoles] = useState<UserAccess[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("user_park_access")
        .select("park_id, role")
        .eq("user_id", user.id)
        .eq("is_active", true) as { data: { park_id: string; role: string }[] | null };

      if (data) {
        setRoles(
          data.map((d) => ({ parkId: d.park_id, role: d.role as UserRole }))
        );
      }
      setIsLoading(false);
    }

    fetchRoles();
  }, []);

  const currentRole = parkId
    ? roles.find((r) => r.parkId === parkId)?.role
    : roles[0]?.role;

  const isAdmin = roles.some((r) => r.role === "admin");

  const hasRole = (role: UserRole, forPark?: string) => {
    if (isAdmin) return true;
    const target = forPark || parkId;
    return roles.some((r) => r.parkId === target && r.role === role);
  };

  const hasAnyRole = (requiredRoles: UserRole[], forPark?: string) => {
    if (isAdmin) return true;
    return requiredRoles.some((role) => hasRole(role, forPark));
  };

  return { roles, currentRole, isAdmin, hasRole, hasAnyRole, isLoading };
}
