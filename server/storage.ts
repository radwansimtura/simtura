import {
  type User,
  type Scenario,
  type InsertScenario,
  type ScenarioStep,
  type InsertScenarioStep,
  type Attempt,
  type InsertAttempt,
  users,
  scenarios,
  scenarioSteps,
  attempts,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, gte } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserFull(data: { email: string; passwordHash: string; name: string }): Promise<User>;
  setUserTier(id: string, tier: "free" | "pro"): Promise<User | undefined>;

  getAllScenarios(): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;

  getScenarioSteps(scenarioId: string): Promise<ScenarioStep[]>;
  getScenarioStep(id: string): Promise<ScenarioStep | undefined>;
  createScenarioStep(step: InsertScenarioStep): Promise<ScenarioStep>;

  createAttempt(attempt: InsertAttempt): Promise<Attempt>;
  updateAttempt(id: string, data: Partial<Attempt>): Promise<Attempt | undefined>;
  getAttempt(id: string): Promise<Attempt | undefined>;
  countUserAttemptsSince(userId: string, since: Date): Promise<number>;
  getUserAttempts(userId: string, limit?: number): Promise<Attempt[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUserFull(data: { email: string; passwordHash: string; name: string }): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async setUserTier(id: string, tier: "free" | "pro"): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ tier, proSince: tier === "pro" ? new Date() : null })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getAllScenarios(): Promise<Scenario[]> {
    return db.select().from(scenarios);
  }

  async getScenario(id: string): Promise<Scenario | undefined> {
    const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));
    return scenario;
  }

  async createScenario(scenario: InsertScenario): Promise<Scenario> {
    const [created] = await db.insert(scenarios).values(scenario).returning();
    return created;
  }

  async getScenarioSteps(scenarioId: string): Promise<ScenarioStep[]> {
    return db
      .select()
      .from(scenarioSteps)
      .where(eq(scenarioSteps.scenarioId, scenarioId))
      .orderBy(asc(scenarioSteps.stepOrder));
  }

  async getScenarioStep(id: string): Promise<ScenarioStep | undefined> {
    const [step] = await db.select().from(scenarioSteps).where(eq(scenarioSteps.id, id));
    return step;
  }

  async createScenarioStep(step: InsertScenarioStep): Promise<ScenarioStep> {
    const [created] = await db.insert(scenarioSteps).values(step).returning();
    return created;
  }

  async createAttempt(attempt: InsertAttempt): Promise<Attempt> {
    const [created] = await db.insert(attempts).values(attempt).returning();
    return created;
  }

  async updateAttempt(id: string, data: Partial<Attempt>): Promise<Attempt | undefined> {
    const [updated] = await db
      .update(attempts)
      .set(data)
      .where(eq(attempts.id, id))
      .returning();
    return updated;
  }

  async getAttempt(id: string): Promise<Attempt | undefined> {
    const [attempt] = await db.select().from(attempts).where(eq(attempts.id, id));
    return attempt;
  }

  async countUserAttemptsSince(userId: string, since: Date): Promise<number> {
    const rows = await db
      .select({ id: attempts.id })
      .from(attempts)
      .where(and(eq(attempts.userId, userId), gte(attempts.startedAt, since)));
    return rows.length;
  }

  async getUserAttempts(userId: string, limit = 50): Promise<Attempt[]> {
    return db
      .select()
      .from(attempts)
      .where(eq(attempts.userId, userId))
      .orderBy(desc(attempts.startedAt))
      .limit(limit);
  }
}

export const storage = new DatabaseStorage();
