import type { ApiUser } from "@/lib/types/user";

export function getDisplayName(user: ApiUser): string {
  const parts = [user.firstName, user.middleName, user.lastName].filter(
    (p): p is string => Boolean(p)
  );
  return parts.map((p) => p.trim()).join(" ");
}

export function getInitials(user: ApiUser): string {
  const first = user.firstName?.trim().charAt(0) ?? "";
  const last = user.lastName?.trim().charAt(0) ?? "";
  return (first + last).toUpperCase() || "?";
}
