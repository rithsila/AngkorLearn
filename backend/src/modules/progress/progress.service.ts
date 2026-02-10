import { prisma } from '../../config/database.js';

// ── Types ──────────────────────────────────────────────────────────

export interface ConceptProgress {
  conceptId: string;
  title: string;
  description: string | null;
  difficulty: number;
  started: boolean;
  completed: boolean;
  confidenceScore: number;          // latest confidence (0-100)
  confidenceHistory: { score: number; date: string }[];
  timeSpentMinutes: number;
  interactionCount: number;
  gaps: string[];                   // identified knowledge gaps
  lastInteractionAt: string | null;
}

export interface ContentProgress {
  contentId: string;
  contentTitle: string;
  totalConcepts: number;
  completedConcepts: number;
  progressPercent: number;
  averageConfidence: number;
  totalTimeMinutes: number;
  weakAreas: { conceptId: string; title: string; confidence: number }[];
  masteredAreas: { conceptId: string; title: string; confidence: number }[];
  lastSessionAt: string | null;
}

export interface UserProgressSummary {
  totalContents: number;
  completedContents: number;
  totalConcepts: number;
  completedConcepts: number;
  averageConfidence: number;
  totalTimeMinutes: number;
  currentStreak: number;           // consecutive active days
  longestStreak: number;
  contentProgress: ContentProgress[];
}

export interface ConfidenceDataPoint {
  date: string;
  confidence: number;
  conceptTitle: string;
}

// ── Concept-level Progress ─────────────────────────────────────────

export async function getConceptProgress(
  userId: string,
  conceptId: string
): Promise<ConceptProgress | null> {
  const concept = await prisma.concept.findUnique({
    where: { id: conceptId },
    include: {
      interactions: {
        where: {
          session: { userId },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          confidenceScore: true,
          aiResponse: true,
          createdAt: true,
          interactionType: true,
        },
      },
    },
  });

  if (!concept) return null;

  const interactions = concept.interactions;
  const confidenceHistory = interactions
    .filter((i) => i.confidenceScore !== null)
    .map((i) => ({
      score: Math.round((i.confidenceScore as number) * 100),
      date: i.createdAt.toISOString(),
    }));

  const latestConfidence =
    confidenceHistory.length > 0
      ? confidenceHistory[confidenceHistory.length - 1].score
      : 0;

  // Extract gaps from examiner feedback (look for patterns in AI responses)
  const gaps = extractGaps(interactions);

  // Estimate time: ~2 min per interaction
  const timeSpent = interactions.length * 2;

  return {
    conceptId: concept.id,
    title: concept.title,
    description: concept.description,
    difficulty: concept.difficulty,
    started: interactions.length > 0,
    completed: latestConfidence >= 70,
    confidenceScore: latestConfidence,
    confidenceHistory,
    timeSpentMinutes: timeSpent,
    interactionCount: interactions.length,
    gaps,
    lastInteractionAt:
      interactions.length > 0
        ? interactions[interactions.length - 1].createdAt.toISOString()
        : null,
  };
}

// ── Content-level Progress ─────────────────────────────────────────

export async function getContentProgress(
  userId: string,
  contentId: string
): Promise<ContentProgress | null> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    select: { id: true, title: true },
  });
  if (!content) return null;

  // Get learning map for this content
  const learningMap = await prisma.learningMap.findFirst({
    where: { contentId },
    include: {
      concepts: {
        orderBy: { conceptOrder: 'asc' },
        include: {
          interactions: {
            where: { session: { userId } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { confidenceScore: true },
          },
        },
      },
    },
  });

  if (!learningMap) {
    return {
      contentId,
      contentTitle: content.title,
      totalConcepts: 0,
      completedConcepts: 0,
      progressPercent: 0,
      averageConfidence: 0,
      totalTimeMinutes: 0,
      weakAreas: [],
      masteredAreas: [],
      lastSessionAt: null,
    };
  }

  const concepts = learningMap.concepts;
  const totalConcepts = concepts.length;

  // Compute per-concept stats
  const conceptStats = concepts.map((c) => {
    const latestInteraction = c.interactions[0];
    const confidence = latestInteraction?.confidenceScore
      ? Math.round(latestInteraction.confidenceScore * 100)
      : 0;
    return {
      conceptId: c.id,
      title: c.title,
      confidence,
      hasInteractions: c.interactions.length > 0,
    };
  });

  const completedConcepts = conceptStats.filter((c) => c.confidence >= 70).length;
  const interactedConcepts = conceptStats.filter((c) => c.hasInteractions);
  const averageConfidence =
    interactedConcepts.length > 0
      ? Math.round(
          interactedConcepts.reduce((sum, c) => sum + c.confidence, 0) /
            interactedConcepts.length
        )
      : 0;

  // Get total time from sessions
  const sessions = await prisma.learningSession.findMany({
    where: { userId, contentId },
    select: { totalTimeMinutes: true, lastActiveAt: true },
    orderBy: { lastActiveAt: 'desc' },
  });
  const totalTimeMinutes = sessions.reduce((s, sess) => s + sess.totalTimeMinutes, 0);
  const lastSessionAt = sessions[0]?.lastActiveAt?.toISOString() ?? null;

  // Weak areas: concepts with confidence < 60%
  const weakAreas = conceptStats
    .filter((c) => c.hasInteractions && c.confidence < 60)
    .sort((a, b) => a.confidence - b.confidence)
    .map(({ conceptId, title, confidence }) => ({ conceptId, title, confidence }));

  // Mastered areas: concepts with confidence >= 80%
  const masteredAreas = conceptStats
    .filter((c) => c.confidence >= 80)
    .sort((a, b) => b.confidence - a.confidence)
    .map(({ conceptId, title, confidence }) => ({ conceptId, title, confidence }));

  const progressPercent =
    totalConcepts > 0 ? Math.round((completedConcepts / totalConcepts) * 100) : 0;

  return {
    contentId,
    contentTitle: content.title,
    totalConcepts,
    completedConcepts,
    progressPercent,
    averageConfidence,
    totalTimeMinutes,
    weakAreas,
    masteredAreas,
    lastSessionAt,
  };
}

// ── User Summary ───────────────────────────────────────────────────

export async function getUserProgressSummary(
  userId: string
): Promise<UserProgressSummary> {
  // Get all content the user has sessions for
  const sessions = await prisma.learningSession.findMany({
    where: { userId },
    select: {
      contentId: true,
      totalTimeMinutes: true,
      status: true,
      createdAt: true,
      lastActiveAt: true,
    },
  });

  const uniqueContentIds = [...new Set(sessions.map((s) => s.contentId))];

  // Build per-content progress
  const contentProgress: ContentProgress[] = [];
  for (const cid of uniqueContentIds) {
    const cp = await getContentProgress(userId, cid);
    if (cp) contentProgress.push(cp);
  }

  const totalConcepts = contentProgress.reduce((s, c) => s + c.totalConcepts, 0);
  const completedConcepts = contentProgress.reduce((s, c) => s + c.completedConcepts, 0);
  const totalTimeMinutes = contentProgress.reduce((s, c) => s + c.totalTimeMinutes, 0);

  const withConfidence = contentProgress.filter((c) => c.averageConfidence > 0);
  const averageConfidence =
    withConfidence.length > 0
      ? Math.round(
          withConfidence.reduce((s, c) => s + c.averageConfidence, 0) /
            withConfidence.length
        )
      : 0;

  const completedContents = contentProgress.filter(
    (c) => c.progressPercent === 100
  ).length;

  // Calculate streaks
  const { currentStreak, longestStreak } = calculateStreaks(sessions);

  return {
    totalContents: uniqueContentIds.length,
    completedContents,
    totalConcepts,
    completedConcepts,
    averageConfidence,
    totalTimeMinutes,
    currentStreak,
    longestStreak,
    contentProgress,
  };
}

// ── Confidence History (Chart Data) ────────────────────────────────

export async function getConfidenceHistory(
  userId: string,
  contentId: string
): Promise<ConfidenceDataPoint[]> {
  const learningMap = await prisma.learningMap.findFirst({
    where: { contentId },
    include: { concepts: { select: { id: true, title: true } } },
  });

  if (!learningMap) return [];

  const conceptMap = new Map(
    learningMap.concepts.map((c) => [c.id, c.title])
  );
  const conceptIds = learningMap.concepts.map((c) => c.id);

  const interactions = await prisma.interaction.findMany({
    where: {
      session: { userId, contentId },
      conceptId: { in: conceptIds },
      confidenceScore: { not: null },
    },
    orderBy: { createdAt: 'asc' },
    select: {
      conceptId: true,
      confidenceScore: true,
      createdAt: true,
    },
  });

  return interactions.map((i) => ({
    date: i.createdAt.toISOString(),
    confidence: Math.round((i.confidenceScore as number) * 100),
    conceptTitle: conceptMap.get(i.conceptId!) || 'Unknown',
  }));
}

// ── Helpers ────────────────────────────────────────────────────────

function extractGaps(
  interactions: { aiResponse: string | null; interactionType: string }[]
): string[] {
  const gaps: string[] = [];

  for (const interaction of interactions) {
    if (!interaction.aiResponse) continue;

    // Try to parse JSON responses from examiner/coach that might contain gap info
    try {
      const parsed = JSON.parse(interaction.aiResponse);
      if (parsed.gaps && Array.isArray(parsed.gaps)) {
        gaps.push(...parsed.gaps);
      }
      if (parsed.weakPoints && Array.isArray(parsed.weakPoints)) {
        gaps.push(...parsed.weakPoints);
      }
      if (parsed.missingConcepts && Array.isArray(parsed.missingConcepts)) {
        gaps.push(...parsed.missingConcepts);
      }
    } catch {
      // Not JSON — skip
    }
  }

  // Deduplicate
  return [...new Set(gaps)].slice(0, 10);
}

function calculateStreaks(
  sessions: { createdAt: Date; lastActiveAt: Date | null }[]
): { currentStreak: number; longestStreak: number } {
  if (sessions.length === 0) return { currentStreak: 0, longestStreak: 0 };

  // Get unique active dates (using lastActiveAt or createdAt)
  const activeDates = new Set<string>();
  for (const s of sessions) {
    const d = s.lastActiveAt || s.createdAt;
    activeDates.add(d.toISOString().split('T')[0]);
  }

  const sortedDates = [...activeDates].sort().reverse(); // most recent first
  const today = new Date().toISOString().split('T')[0];

  // Current streak: consecutive days ending today or yesterday
  let currentStreak = 0;
  let checkDate = new Date(today);

  // Allow yesterday as well (not today yet)
  if (!sortedDates.includes(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  while (sortedDates.includes(checkDate.toISOString().split('T')[0])) {
    currentStreak++;
    checkDate.setDate(checkDate.getDate() - 1);
  }

  // Longest streak
  const chronoDates = [...activeDates].sort();
  let longestStreak = 0;
  let streak = 1;

  for (let i = 1; i < chronoDates.length; i++) {
    const prev = new Date(chronoDates[i - 1]);
    const curr = new Date(chronoDates[i]);
    const diffDays =
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      streak++;
    } else {
      longestStreak = Math.max(longestStreak, streak);
      streak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak);

  return { currentStreak, longestStreak };
}
