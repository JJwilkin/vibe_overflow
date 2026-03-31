import { db, schema } from "./db";

export async function createNotification(
  userId: number,
  type: "answer" | "comment" | "mention",
  message: string,
  link: string
) {
  await db.insert(schema.notifications).values({
    userId,
    type,
    message,
    link,
  });
}
