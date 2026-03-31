import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a stub client that always returns no user
    // This allows the app to build/run without Supabase configured
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        signOut: async () => ({ error: null }),
      },
    } as ReturnType<typeof createServerClient>;
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
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
          // setAll can be called from Server Components where cookies
          // can't be set — this is fine, the middleware handles refresh.
        }
      },
    },
  });
}
