import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

let _serviceRoleClient: ReturnType<typeof createSupabaseClient> | null = null;

/** Server-only. Use for cron or background jobs; bypasses RLS. */
export function createServiceRoleClient() {
  if (_serviceRoleClient) return _serviceRoleClient;

  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_API_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY or SUPABASE_API_KEY required");
  }
  _serviceRoleClient = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    key,
    { auth: { persistSession: false } }
  );
  return _serviceRoleClient;
}
