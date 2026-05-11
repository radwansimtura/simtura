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
  type FlashcardDeck,
  type Flashcard,
  type FlashcardReview,
  users,
  scenarios,
  scenarioSteps,
  attempts,
  organizations,
  organizationCodes,
  flashcardDecks,
  flashcards,
  flashcardReviews,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, gte, isNull, isNotNull, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserFull(data: { email: string; passwordHash: string; name: string; securityQuestion?: string | null; securityAnswerHash?: string | null }): Promise<User>;
  setUserSecurityQuestion(id: string, securityQuestion: string, securityAnswerHash: string): Promise<User | undefined>;
  setUserPasswordHash(id: string, passwordHash: string): Promise<User | undefined>;
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
  getOrgStudents(organizationId: string): Promise<{ id: string; name: string; email: string; redeemedAt: Date }[]>;
  getAttemptsForUsers(userIds: string[]): Promise<(Attempt & { scenarioTitle: string })[]>;

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

  // Flashcard decks
  getDeckByScenarioAndUser(scenarioId: string, userId: string): Promise<FlashcardDeck | undefined>;
  createDeck(data: { userId: string; scenarioId: string; attemptId?: string | null; title: string }): Promise<FlashcardDeck>;

  // Flashcards
  getCard(id: string): Promise<Flashcard | undefined>;
  getCardsByDeck(deckId: string): Promise<Flashcard[]>;
  getCardsByUserAndScenario(userId: string, scenarioId: string): Promise<Flashcard[]>;
  getQueueForUser(userId: string, limit?: number): Promise<Flashcard[]>;
  createCard(data: {
    deckId: string;
    userId: string;
    front: string;
    back: string;
    sourceStepId?: string | null;
    tags?: string[];
    difficulty: number;
    stability: number;
    state: string;
    lapses: number;
    reps: number;
    dueDate: Date;
    priorityBoost?: boolean;
  }): Promise<Flashcard>;
  updateCardState(id: string, data: {
    difficulty: number;
    stability: number;
    state: string;
    lapses: number;
    reps: number;
    dueDate: Date;
    lastReviewedAt: Date;
    priorityBoost?: boolean;
  }): Promise<Flashcard | undefined>;
  setCardPriorityBoost(cardIds: string[], boost: boolean): Promise<void>;

  // Flashcard reviews
  createReview(data: {
    cardId: string;
    userId: string;
    rating: number;
    previousDifficulty: number;
    previousStability: number;
    previousState: string;
    newDifficulty: number;
    newStability: number;
    newState: string;
    scheduledFor: Date;
  }): Promise<FlashcardReview>;
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

  async createUserFull(data: { email: string; passwordHash: string; name: string; securityQuestion?: string | null; securityAnswerHash?: string | null }): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    return user;
  }

  async setUserSecurityQuestion(id: string, securityQuestion: string, securityAnswerHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ securityQuestion, securityAnswerHash })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async setUserPasswordHash(id: string, passwordHash: string): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning();
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

  async getOrgStudents(organizationId: string): Promise<{ id: string; name: string; email: string; redeemedAt: Date }[]> {
    const rows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        redeemedAt: organizationCodes.redeemedAt,
      })
      .from(organizationCodes)
      .innerJoin(users, eq(organizationCodes.redeemedByUserId, users.id))
      .where(and(
        eq(organizationCodes.organizationId, organizationId),
        isNotNull(organizationCodes.redeemedByUserId),
      ));
    return rows.map(r => ({ ...r, redeemedAt: r.redeemedAt! }));
  }

  async getAttemptsForUsers(userIds: string[]): Promise<(Attempt & { scenarioTitle: string })[]> {
    if (userIds.length === 0) return [];
    const rows = await db
      .select({
        id: attempts.id,
        userId: attempts.userId,
        scenarioId: attempts.scenarioId,
        scenarioTitle: scenarios.title,
        startedAt: attempts.startedAt,
        completedAt: attempts.completedAt,
        score: attempts.score,
        totalSteps: attempts.totalSteps,
        correctSteps: attempts.correctSteps,
        responses: attempts.responses,
        criticalFailure: attempts.criticalFailure,
        criticalCriterionViolated: attempts.criticalCriterionViolated,
        endedEarly: attempts.endedEarly,
      })
      .from(attempts)
      .innerJoin(scenarios, eq(attempts.scenarioId, scenarios.id))
      .where(
        sql`${attempts.userId} = ANY(ARRAY[${sql.join(userIds.map(id => sql`${id}`), sql`, `)}]::text[])`
      )
      .orderBy(desc(attempts.startedAt));
    return rows;
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

  // ---------------------------------------------------------------
  // Flashcard decks
  // ---------------------------------------------------------------

  async getDeckByScenarioAndUser(scenarioId: string, userId: string): Promise<FlashcardDeck | undefined> {
    const [deck] = await db
      .select()
      .from(flashcardDecks)
      .where(and(eq(flashcardDecks.scenarioId, scenarioId), eq(flashcardDecks.userId, userId)))
      .limit(1);
    return deck;
  }

  async createDeck(data: { userId: string; scenarioId: string; attemptId?: string | null; title: string }): Promise<FlashcardDeck> {
    const [created] = await db.insert(flashcardDecks).values({
      userId: data.userId,
      scenarioId: data.scenarioId,
      attemptId: data.attemptId ?? null,
      title: data.title,
    }).returning();
    return created;
  }

  // ---------------------------------------------------------------
  // Flashcards
  // ---------------------------------------------------------------

  async getCard(id: string): Promise<Flashcard | undefined> {
    const [card] = await db.select().from(flashcards).where(eq(flashcards.id, id));
    return card;
  }

  async getCardsByDeck(deckId: string): Promise<Flashcard[]> {
    return db.select().from(flashcards).where(eq(flashcards.deckId, deckId));
  }

  async getCardsByUserAndScenario(userId: string, scenarioId: string): Promise<Flashcard[]> {
    // Join through deck
    const deck = await this.getDeckByScenarioAndUser(scenarioId, userId);
    if (!deck) return [];
    return this.getCardsByDeck(deck.id);
  }

  /**
   * Returns cards for the user's review queue:
   *   - All cards with priorityBoost=true (missed steps), then
   *   - All cards in 'new' state (never reviewed), then
   *   - All cards due now (dueDate <= now)
   * Limit caps total returned.
   */
  async getQueueForUser(userId: string, limit = 50): Promise<Flashcard[]> {
    const now = new Date();
    const rows = await db
      .select()
      .from(flashcards)
      .where(
        and(
          eq(flashcards.userId, userId),
          sql`(${flashcards.priorityBoost} = true OR ${flashcards.state} = 'new' OR ${flashcards.dueDate} <= ${now})`
        )
      )
      .orderBy(
        desc(flashcards.priorityBoost),
        sql`CASE WHEN ${flashcards.state} = 'new' THEN 0 ELSE 1 END`,
        asc(flashcards.dueDate)
      )
      .limit(limit);
    return rows;
  }

  async createCard(data: {
    deckId: string;
    userId: string;
    front: string;
    back: string;
    sourceStepId?: string | null;
    tags?: string[];
    difficulty: number;
    stability: number;
    state: string;
    lapses: number;
    reps: number;
    dueDate: Date;
    priorityBoost?: boolean;
  }): Promise<Flashcard> {
    const [created] = await db.insert(flashcards).values({
      deckId: data.deckId,
      userId: data.userId,
      front: data.front,
      back: data.back,
      sourceStepId: data.sourceStepId ?? null,
      tags: data.tags ?? [],
      difficulty: data.difficulty,
      stability: data.stability,
      state: data.state,
      lapses: data.lapses,
      reps: data.reps,
      dueDate: data.dueDate,
      priorityBoost: data.priorityBoost ?? false,
    }).returning();
    return created;
  }

  async updateCardState(id: string, data: {
    difficulty: number;
    stability: number;
    state: string;
    lapses: number;
    reps: number;
    dueDate: Date;
    lastReviewedAt: Date;
    priorityBoost?: boolean;
  }): Promise<Flashcard | undefined> {
    const updateData: Record<string, unknown> = {
      difficulty: data.difficulty,
      stability: data.stability,
      state: data.state,
      lapses: data.lapses,
      reps: data.reps,
      dueDate: data.dueDate,
      lastReviewedAt: data.lastReviewedAt,
    };
    if (data.priorityBoost !== undefined) {
      updateData.priorityBoost = data.priorityBoost;
    }
    const [updated] = await db
      .update(flashcards)
      .set(updateData)
      .where(eq(flashcards.id, id))
      .returning();
    return updated;
  }

  async setCardPriorityBoost(cardIds: string[], boost: boolean): Promise<void> {
    if (cardIds.length === 0) return;
    await db
      .update(flashcards)
      .set({ priorityBoost: boost })
      .where(sql`${flashcards.id} = ANY(${cardIds})`);
  }

  // ---------------------------------------------------------------
  // Flashcard reviews
  // ---------------------------------------------------------------

  async createReview(data: {
    cardId: string;
    userId: string;
    rating: number;
    previousDifficulty: number;
    previousStability: number;
    previousState: string;
    newDifficulty: number;
    newStability: number;
    newState: string;
    scheduledFor: Date;
  }): Promise<FlashcardReview> {
    const [created] = await db.insert(flashcardReviews).values({
      cardId: data.cardId,
      userId: data.userId,
      rating: data.rating,
      previousDifficulty: data.previousDifficulty,
      previousStability: data.previousStability,
      previousState: data.previousState,
      newDifficulty: data.newDifficulty,
      newStability: data.newStability,
      newState: data.newState,
      scheduledFor: data.scheduledFor,
    }).returning();
    return created;
  }
}

export const storage = new DatabaseStorage();
