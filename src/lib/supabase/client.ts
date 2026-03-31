import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a stub when Supabase is not configured
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        signUp: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: "Supabase not configured" } }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
    } as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
