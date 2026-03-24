/**
 * Routes where the fixed mobile bottom nav is not shown (matches desktop-style pages).
 */
export function isMobileBottomNavHidden(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  if (pathname.startsWith("/map")) return true;
  if (pathname.startsWith("/events")) return true;
  if (pathname.startsWith("/profile")) return true;
  return false;
}
