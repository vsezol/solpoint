import { createBrowserClient } from "@supabase/ssr";

/**
 * Создает клиент Supabase для браузера.
 * Токены авторизации хранятся в куках браузера автоматически через @supabase/ssr.
 * Имена кук: sb-<project-ref>-auth-token и sb-<project-ref>-auth-token-code-verifier
 * 
 * createBrowserClient автоматически работает с document.cookie, поэтому
 * не нужно передавать опции cookies вручную.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

