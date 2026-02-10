import { prisma } from '../../../config/database.js';
import { orchestrate, parseAIResponse } from '../orchestrator.service.js';

// ── Types ──────────────────────────────────────────────────────────

export interface SessionSummary {
  sessionId: string;
  contentTitle: string;
  conceptsCovered: string[];
  strengths: string[];
  weakPoints: string[];
  keyTakeaways: string[];
  confidenceOverview: { concept: string; confidence: number }[];
  suggestedNextSteps: string[];
  overallScore: number;           // 0-100
  timeSpentMinutes: number;
}

export interface WeeklyReport {
  weekStarting: string;
  totalSessions: number;
  totalTimeMinutes: number;
  conceptsLearned: number;
  averageConfidence: number;
  topStrengths: string[];
  areasForImprovement: string[];
  recommendations: string[];
  progressTrend: 'improving' | 'stable' | 'declining';
}

export interface ReviewScheduleItem {
  conceptId: string;
  conceptTitle: string;
  lastReviewed: string;
  confidence: number;
  reviewDueDate: string;
  priority: 'high' | 'medium' | 'low';
}

// ── Session Summary ────────────────────────────────────────────────

export async function generateSessionSummary(
  sessionId: string,
  userId: string
): Promise<SessionSummary> {
  // Fetch session with interactions
  const session = await prisma.learningSession.findUnique({
    where: { id: sessionId },
    include: {
      content: { select: { title: true } },
      interactions: {
        orderBy: { createdAt: 'asc' },
        include: {
          concept: { select: { id: true, title: true } },
        },
      },
    },
  });

  if (!session) throw new Error('Session not found');

  // Build context for the reviewer
  const conceptsCovered = [
    ...new Set(
      session.interactions
        .filter((i) => i.concept)
        .map((i) => i.concept!.title)
    ),
  ];

  const confidenceOverview = buildConfidenceOverview(session.interactions);

  const interactionSummary = session.interactions
    .slice(-20) // last 20 interactions for context window
    .map((i) => `[${i.role}] ${i.interactionType}: ${i.userMessage?.slice(0, 200) || ''} → score: ${i.confidenceScore ?? 'N/A'}`)
    .join('\n');

  // Call Reviewer AI
  const response = await orchestrate(userId, {
    role: 'reviewer',
    contentId: session.contentId,
    sessionId,
    userMessage: `Generate a session summary. Here is the interaction data:\n\nContent: ${session.content.title}\nConcepts covered: ${conceptsCovered.join(', ')}\nTotal interactions: ${session.interactions.length}\nTime spent: ${session.totalTimeMinutes} minutes\n\nInteraction log:\n${interactionSummary}`,
    additionalContext: {
      sessionState: session.status,
      timeSpent: session.totalTimeMinutes,
    },
  });

  // Parse AI response
  try {
    const parsed = parseAIResponse<{
      strengths: string[];
      weakPoints: string[];
      keyTakeaways: string[];
      suggestedNextSteps: string[];
      overallScore: number;
    }>(response);

    return {
      sessionId,
      contentTitle: session.content.title,
      conceptsCovered,
      strengths: parsed.strengths || [],
      weakPoints: parsed.weakPoints || [],
      keyTakeaways: parsed.keyTakeaways || [],
      confidenceOverview,
      suggestedNextSteps: parsed.suggestedNextSteps || [],
      overallScore: parsed.overallScore || 0,
      timeSpentMinutes: session.totalTimeMinutes,
    };
  } catch {
    // Fallback if AI doesn't return valid JSON
    return {
      sessionId,
      contentTitle: session.content.title,
      conceptsCovered,
      strengths: [],
      weakPoints: [],
      keyTakeaways: [response.content.slice(0, 500)],
      confidenceOverview,
      suggestedNextSteps: [],
      overallScore: 0,
      timeSpentMinutes: session.totalTimeMinutes,
    };
  }
}

// ── Weekly Report ──────────────────────────────────────────────────

export async function generateWeeklyReport(
  userId: string
): Promise<WeeklyReport> {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  // Get sessions from this week
  const sessions = await prisma.learningSession.findMany({
    where: {
      userId,
      createdAt: { gte: oneWeekAgo },
    },
    include: {
      content: { select: { title: true } },
      interactions: {
        include: {
          concept: { select: { title: true } },
        },
      },
    },
  });

  const totalSessions = sessions.length;
  const totalTimeMinutes = sessions.reduce(
    (s, sess) => s + sess.totalTimeMinutes,
    0
  );

  // Concepts learned this week
  const allConcepts = new Set<string>();
  const allScores: number[] = [];

  for (const session of sessions) {
    for (const interaction of session.interactions) {
      if (interaction.concept) {
        allConcepts.add(interaction.concept.title);
      }
      if (interaction.confidenceScore !== null) {
        allScores.push(interaction.confidenceScore);
      }
    }
  }

  const averageConfidence =
    allScores.length > 0
      ? Math.round(
          (allScores.reduce((s, v) => s + v, 0) / allScores.length) * 100
        )
      : 0;

  // Determine trend
  let progressTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (allScores.length >= 4) {
    const half = Math.floor(allScores.length / 2);
    const firstAvg =
      allScores.slice(0, half).reduce((s, v) => s + v, 0) / half;
    const secondAvg =
      allScores.slice(half).reduce((s, v) => s + v, 0) /
      (allScores.length - half);
    if (secondAvg - firstAvg > 0.1) progressTrend = 'improving';
    else if (secondAvg - firstAvg < -0.1) progressTrend = 'declining';
  }

  // Build summary for AI
  const sessionSummaries = sessions
    .slice(0, 10)
    .map(
      (s) =>
        `- ${s.content.title}: ${s.interactions.length} interactions, ${s.totalTimeMinutes} min, status: ${s.status}`
    )
    .join('\n');

  // Call Reviewer AI for recommendations
  const response = await orchestrate(userId, {
    role: 'reviewer',
    userMessage: `Generate a weekly learning report.

Stats:
- Sessions: ${totalSessions}
- Total time: ${totalTimeMinutes} minutes
- Concepts covered: ${allConcepts.size}
- Average confidence: ${averageConfidence}%
- Trend: ${progressTrend}

Sessions this week:
${sessionSummaries}`,
  });

  try {
    const parsed = parseAIResponse<{
      topStrengths: string[];
      areasForImprovement: string[];
      recommendations: string[];
    }>(response);

    return {
      weekStarting: oneWeekAgo.toISOString().split('T')[0],
      totalSessions,
      totalTimeMinutes,
      conceptsLearned: allConcepts.size,
      averageConfidence,
      topStrengths: parsed.topStrengths || [],
      areasForImprovement: parsed.areasForImprovement || [],
      recommendations: parsed.recommendations || [],
      progressTrend,
    };
  } catch {
    return {
      weekStarting: oneWeekAgo.toISOString().split('T')[0],
      totalSessions,
      totalTimeMinutes,
      conceptsLearned: allConcepts.size,
      averageConfidence,
      topStrengths: [],
      areasForImprovement: [],
      recommendations: [response.content.slice(0, 500)],
      progressTrend,
    };
  }
}

// ── Review Schedule ────────────────────────────────────────────────

export async function suggestReviewSchedule(
  userId: string
): Promise<ReviewScheduleItem[]> {
  // Get all concepts the user has interacted with
  const interactions = await prisma.interaction.findMany({
    where: {
      session: { userId },
      conceptId: { not: null },
      confidenceScore: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      concept: { select: { id: true, title: true } },
    },
  });

  // Get latest score per concept
  const latestByConceptMap = new Map<
    string,
    {
      conceptId: string;
      title: string;
      confidence: number;
      lastReviewed: Date;
    }
  >();

  for (const i of interactions) {
    if (!i.concept || latestByConceptMap.has(i.concept.id)) continue;
    latestByConceptMap.set(i.concept.id, {
      conceptId: i.concept.id,
      title: i.concept.title,
      confidence: Math.round((i.confidenceScore as number) * 100),
      lastReviewed: i.createdAt,
    });
  }

  const schedule: ReviewScheduleItem[] = [];
  const now = new Date();

  for (const [, item] of latestByConceptMap) {
    const intervalDays = getReviewInterval(item.confidence / 100);
    const dueDate = new Date(item.lastReviewed);
    dueDate.setDate(dueDate.getDate() + intervalDays);

    let priority: 'high' | 'medium' | 'low' = 'low';
    if (item.confidence < 50 || now >= dueDate) priority = 'high';
    else if (item.confidence < 70) priority = 'medium';

    schedule.push({
      conceptId: item.conceptId,
      conceptTitle: item.title,
      lastReviewed: item.lastReviewed.toISOString().split('T')[0],
      confidence: item.confidence,
      reviewDueDate: dueDate.toISOString().split('T')[0],
      priority,
    });
  }

  // Sort: high priority first, then by due date
  return schedule.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    return a.reviewDueDate.localeCompare(b.reviewDueDate);
  });
}

// ── Helpers ────────────────────────────────────────────────────────

function getReviewInterval(confidence: number): number {
  if (confidence >= 0.9) return 30;
  if (confidence >= 0.8) return 14;
  if (confidence >= 0.7) return 7;
  if (confidence >= 0.5) return 3;
  return 1;
}

function buildConfidenceOverview(
  interactions: {
    concept: { id: string; title: string } | null;
    confidenceScore: number | null;
  }[]
): { concept: string; confidence: number }[] {
  const latest = new Map<string, number>();

  for (const i of interactions) {
    if (i.concept && i.confidenceScore !== null) {
      latest.set(i.concept.title, Math.round(i.confidenceScore * 100));
    }
  }

  return [...latest.entries()].map(([concept, confidence]) => ({
    concept,
    confidence,
  }));
}
