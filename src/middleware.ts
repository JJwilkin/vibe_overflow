import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

function getRateLimit(pathname: string, method: string): { limit: number; windowMs: number } | null {
  // Only rate limit API routes
  if (!pathname.startsWith("/api/")) return null;

  // Auth routes: stricter limits
  if (pathname.startsWith("/api/auth/")) {
    return { limit: 10, windowMs: 60_000 };
  }

  // Write operations: moderate limits
  if (method === "POST" || method === "PUT" || method === "DELETE") {
    return { limit: 20, windowMs: 60_000 };
  }

  // Read operations: generous limits
  return { limit: 60, windowMs: 60_000 };
}

export async function middleware(request: NextRequest) {
  // Rate limiting
  const rateLimitConfig = getRateLimit(request.nextUrl.pathname, request.method);
  if (rateLimitConfig) {
    const ip = getClientIp(request);
    const key = `${ip}:${request.method}:${request.nextUrl.pathname.split("/").slice(0, 4).join("/")}`;
    const result = rateLimit(key, rateLimitConfig.limit, rateLimitConfig.windowMs);

    if (!result.success) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }
  }

  // Supabase auth token refresh
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the auth token
  await supabase.auth.getUser();

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
