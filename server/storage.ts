import {
  type User,
  type Scenario,
  type InsertScenario,
  type ScenarioStep,
  type InsertScenarioStep,
  type Attempt,
  type InsertAttempt,
  type Organization,
  type OrganizationCode,
  users,
  scenarios,
  scenarioSteps,
  attempts,
  organizations,
  organizationCodes,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, gte, isNull, isNotNull, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserFull(data: { email: string; passwordHash: string; name: string }): Promise<User>;
  setUserTier(id: string, tier: "free" | "pro"): Promise<User | undefined>;
  setUserOrgPremium(id: string, organizationId: string): Promise<User | undefined>;

  createOrganization(data: Omit<Organization, "id" | "createdAt" | "paidAt"> & { paidAt?: Date | null }): Promise<Organization>;
  getOrganization(id: string): Promise<Organization | undefined>;
  getOrganizationsForOwner(userId: string): Promise<Organization[]>;
  markOrganizationPaid(id: string): Promise<Organization | undefined>;
  setOrganizationStripeSession(id: string, stripeSessionId: string): Promise<Organization | undefined>;
  setUserStripeCustomer(id: string, stripeCustomerId: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  activateUserSubscription(userId: string, stripeCustomerId: string, stripeSubscriptionId: string): Promise<User | undefined>;
  deactivateUserSubscription(stripeCustomerId: string): Promise<User | undefined>;

  createOrganizationCodes(organizationId: string, codes: string[]): Promise<OrganizationCode[]>;
  getOrganizationCodes(organizationId: string): Promise<OrganizationCode[]>;
  getOrganizationCodeByCode(code: string): Promise<OrganizationCode | undefined>;
  redeemOrganizationCode(code: string, userId: string, email: string): Promise<OrganizationCode | undefined>;
  countRedeemedCodes(organizationId: string): Promise<number>;

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

  async setUserOrgPremium(id: string, organizationId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        tier: "pro",
        proSince: new Date(),
        organizationId,
        premiumSource: "organization",
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createOrganization(data: Omit<Organization, "id" | "createdAt" | "paidAt"> & { paidAt?: Date | null }): Promise<Organization> {
    const [org] = await db
      .insert(organizations)
      .values({ ...data, paidAt: data.paidAt ?? null })
      .returning();
    return org;
  }

  async getOrganization(id: string): Promise<Organization | undefined> {
    const [org] = await db.select().from(organizations).where(eq(organizations.id, id));
    return org;
  }

  async getOrganizationsForOwner(userId: string): Promise<Organization[]> {
    return db
      .select()
      .from(organizations)
      .where(eq(organizations.ownerUserId, userId))
      .orderBy(desc(organizations.createdAt));
  }

  // Atomic: only the caller that successfully transitions status from
  // non-active → active gets a returned row. Concurrent webhook redeliveries
  // hitting this method will get `undefined` and must skip fulfillment.
  async markOrganizationPaid(id: string): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ status: "active", paidAt: new Date() })
      .where(and(eq(organizations.id, id), sql`${organizations.status} <> 'active'`))
      .returning();
    return org;
  }

  async setOrganizationStripeSession(id: string, stripeSessionId: string): Promise<Organization | undefined> {
    const [org] = await db
      .update(organizations)
      .set({ stripeSessionId })
      .where(eq(organizations.id, id))
      .returning();
    return org;
  }

  async setUserStripeCustomer(id: string, stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ stripeCustomerId })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stripeCustomerId, stripeCustomerId));
    return user;
  }

  async activateUserSubscription(
    userId: string,
    stripeCustomerId: string,
    stripeSubscriptionId: string,
  ): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        tier: "pro",
        proSince: new Date(),
        premiumSource: "stripe",
        stripeCustomerId,
        stripeSubscriptionId,
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async deactivateUserSubscription(stripeCustomerId: string): Promise<User | undefined> {
    // Only revert users whose Pro came from a personal Stripe subscription.
    // Org-redeemed users keep their Pro tier even if they happen to also have a
    // stripeCustomerId from a previous personal subscription.
    const [user] = await db
      .update(users)
      .set({
        tier: "free",
        proSince: null,
        premiumSource: null,
        stripeSubscriptionId: null,
      })
      .where(and(eq(users.stripeCustomerId, stripeCustomerId), eq(users.premiumSource, "stripe")))
      .returning();
    return user;
  }

  async createOrganizationCodes(organizationId: string, codes: string[]): Promise<OrganizationCode[]> {
    if (codes.length === 0) return [];
    const rows = codes.map((code) => ({ organizationId, code }));
    return db.insert(organizationCodes).values(rows).returning();
  }

  async getOrganizationCodes(organizationId: string): Promise<OrganizationCode[]> {
    return db
      .select()
      .from(organizationCodes)
      .where(eq(organizationCodes.organizationId, organizationId))
      .orderBy(asc(organizationCodes.createdAt));
  }

  async getOrganizationCodeByCode(code: string): Promise<OrganizationCode | undefined> {
    const [c] = await db
      .select()
      .from(organizationCodes)
      .where(eq(organizationCodes.code, code));
    return c;
  }

  async redeemOrganizationCode(code: string, userId: string, email: string): Promise<OrganizationCode | undefined> {
    const [updated] = await db
      .update(organizationCodes)
      .set({ redeemedByUserId: userId, redeemedByEmail: email, redeemedAt: new Date() })
      .where(and(eq(organizationCodes.code, code), isNull(organizationCodes.redeemedByUserId)))
      .returning();
    return updated;
  }

  async countRedeemedCodes(organizationId: string): Promise<number> {
    const rows = await db
      .select({ id: organizationCodes.id })
      .from(organizationCodes)
      .where(and(eq(organizationCodes.organizationId, organizationId), isNotNull(organizationCodes.redeemedByUserId)));
    return rows.length;
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
