import {
  pgTable,
  text,
  integer,
  serial,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  authId: text("auth_id").unique(),
  email: text("email").unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  isBot: boolean("is_bot").notNull().default(false),
  personaId: text("persona_id"),
  reputation: integer("reputation").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  viewCount: integer("view_count").notNull().default(0),
  score: integer("score").notNull().default(0),
  acceptedAnswerId: integer("accepted_answer_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  body: text("body").notNull(),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  score: integer("score").notNull().default(0),
  isAccepted: boolean("is_accepted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const votes = pgTable(
  "votes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    questionId: integer("question_id").references(() => questions.id),
    answerId: integer("answer_id").references(() => answers.id),
    value: integer("value").notNull(),
  },
  (table) => [
    uniqueIndex("vote_user_question").on(table.userId, table.questionId),
    uniqueIndex("vote_user_answer").on(table.userId, table.answerId),
  ]
);

export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const questionTags = pgTable(
  "question_tags",
  {
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id),
  },
  (table) => [
    uniqueIndex("question_tag_pk").on(table.questionId, table.tagId),
  ]
);

export const repHistory = pgTable("rep_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  questionId: integer("question_id").references(() => questions.id),
  answerId: integer("answer_id").references(() => answers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const closeVotes = pgTable("close_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  questionId: integer("question_id")
    .notNull()
    .references(() => questions.id),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const revisions = pgTable("revisions", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questions.id),
  answerId: integer("answer_id").references(() => answers.id),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  body: text("body").notNull(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  questionId: integer("question_id").references(() => questions.id),
  answerId: integer("answer_id").references(() => answers.id),
  score: integer("score").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const commentVotes = pgTable(
  "comment_votes",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id),
    commentId: integer("comment_id")
      .notNull()
      .references(() => comments.id),
    value: integer("value").notNull(),
  },
  (table) => [
    uniqueIndex("comment_vote_user_comment").on(table.userId, table.commentId),
  ]
);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  type: text("type").notNull(), // "answer", "comment", "mention"
  message: text("message").notNull(),
  link: text("link").notNull(),
  read: boolean("read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botProjects = pgTable("bot_projects", {
  id: serial("id").primaryKey(),
  personaId: text("persona_id").notNull().unique(),
  projectName: text("project_name").notNull(),
  projectDescription: text("project_description").notNull(),
  techStack: text("tech_stack").notNull(),
  projectState: text("project_state").notNull().default("{}"),
  questionsAsked: integer("questions_asked").notNull().default(0),
  maxQuestions: integer("max_questions").notNull().default(12),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const customPersonas = pgTable("custom_personas", {
  id: serial("id").primaryKey(),
  personaId: text("persona_id").notNull().unique(),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id),
  displayName: text("display_name").notNull(),
  avatar: text("avatar").notNull(),
  bio: text("bio").notNull(),
  aboutMe: text("about_me").notNull().default(""),
  systemPrompt: text("system_prompt").notNull(),
  responseDelay: text("response_delay").notNull().default("[120,480]"),
  replyProbability: integer("reply_probability").notNull().default(50),
  votePattern: text("vote_pattern").notNull().default("mixed"),
  projectPreferences: text("project_preferences").notNull().default("{}"),
  questionInterval: text("question_interval").notNull().default("[2,4]"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const aiJobs = pgTable("ai_jobs", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id")
    .references(() => questions.id),
  answerId: integer("answer_id").references(() => answers.id),
  jobType: text("job_type").notNull().default("answer"),
  personaId: text("persona_id").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  error: text("error"),
});

export const botInteractions = pgTable("bot_interactions", {
  id: serial("id").primaryKey(),
  actorPersonaId: text("actor_persona_id").notNull(),
  targetPersonaId: text("target_persona_id").notNull(),
  interactionType: text("interaction_type").notNull(), // "comment" | "answer"
  sentiment: text("sentiment").notNull(), // "positive" | "negative" | "neutral"
  snippet: text("snippet").notNull(),
  questionId: integer("question_id").references(() => questions.id),
  answerId: integer("answer_id").references(() => answers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botRelationships = pgTable(
  "bot_relationships",
  {
    id: serial("id").primaryKey(),
    personaId: text("persona_id").notNull(),
    targetPersonaId: text("target_persona_id").notNull(),
    score: integer("score").notNull().default(0),
    interactionCount: integer("interaction_count").notNull().default(0),
    lastSnippet: text("last_snippet"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("relationship_pair").on(table.personaId, table.targetPersonaId),
  ]
);
