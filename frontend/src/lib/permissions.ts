export type UserRole = "jenderal" | "pic" | "mc" | "anggota";

export const ROLE_HOME: Record<UserRole, string> = {
  jenderal: "/dashboard/jenderal",
  pic: "/dashboard/pic",
  mc: "/dashboard/mc",
  anggota: "/dashboard/anggota",
};

export function getRoleHome(role: string | undefined): string {
  if (!role || !(role in ROLE_HOME)) {
    return "/";
  }

  return ROLE_HOME[role as UserRole];
}

export const ROLE_PERMISSIONS: Record<string, UserRole[]> = {
  "/dashboard/jenderal": ["jenderal"],
  "/dashboard/pic": ["jenderal", "pic"],
  "/dashboard/mc": ["jenderal", "pic", "mc"],
  "/dashboard/anggota": ["anggota"],

  "/users": ["jenderal"],
  "/results": ["jenderal", "pic", "mc"],
};
