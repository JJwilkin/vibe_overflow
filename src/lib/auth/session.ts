import { createClient } from "@/lib/supabase/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const [appUser] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.authId, authUser.id));

  return appUser || null;
}
