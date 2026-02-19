import {
  type User,
  type InsertUser,
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
import { eq, asc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  getAllScenarios(): Promise<Scenario[]>;
  getScenario(id: string): Promise<Scenario | undefined>;
  createScenario(scenario: InsertScenario): Promise<Scenario>;

  getScenarioSteps(scenarioId: string): Promise<ScenarioStep[]>;
  createScenarioStep(step: InsertScenarioStep): Promise<ScenarioStep>;

  createAttempt(attempt: InsertAttempt): Promise<Attempt>;
  updateAttempt(id: string, data: Partial<Attempt>): Promise<Attempt | undefined>;
  getAttempt(id: string): Promise<Attempt | undefined>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
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
}

export const storage = new DatabaseStorage();
