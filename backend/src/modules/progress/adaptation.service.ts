import { prisma } from '../../config/database.js';

// ── Types ──────────────────────────────────────────────────────────

export interface AdaptationResult {
  pace: 'slow' | 'normal' | 'fast';
  extraExamples: boolean;
  skipSuggested: boolean;
  reviewDue: boolean;
  nextReviewDate: string | null;
  reasoning: string;
}

export interface PatternAnalysis {
  repeatedMistakes: { conceptId: string; title: string; count: number }[];
  avgTimePerConcept: number;   // minutes
  qualityTrend: 'improving' | 'stable' | 'declining';
  totalInteractions: number;
  lowConfidenceConcepts: { conceptId: string; title: string; confidence: number }[];
}

// ── Pattern Analysis ───────────────────────────────────────────────

export async function analyzePatterns(
  userId: string,
  contentId: string
): Promise<PatternAnalysis> {
  // Get all interactions for this user/content
  const interactions = await prisma.interaction.findMany({
    where: {
      session: { userId, contentId },
      conceptId: { not: null },
    },
    include: {
      concept: { select: { id: true, title: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  // ── Repeated Mistakes ────────────────────────────────────────
  // Concepts where user scored below 50% more than once
  const mistakeMap = new Map<string, { title: string; count: number }>();

  for (const interaction of interactions) {
    if (
      interaction.confidenceScore !== null &&
      interaction.confidenceScore < 0.5 &&
      interaction.concept
    ) {
      const existing = mistakeMap.get(interaction.concept.id);
      if (existing) {
        existing.count++;
      } else {
        mistakeMap.set(interaction.concept.id, {
          title: interaction.concept.title,
          count: 1,
        });
      }
    }
  }

  const repeatedMistakes = [...mistakeMap.entries()]
    .filter(([, v]) => v.count > 1)
    .map(([conceptId, v]) => ({ conceptId, title: v.title, count: v.count }))
    .sort((a, b) => b.count - a.count);

  // ── Avg Time Per Concept ─────────────────────────────────────
  const conceptInteractionCounts = new Map<string, number>();
  for (const i of interactions) {
    if (i.conceptId) {
      conceptInteractionCounts.set(
        i.conceptId,
        (conceptInteractionCounts.get(i.conceptId) || 0) + 1
      );
    }
  }
  const uniqueConcepts = conceptInteractionCounts.size;
  // ~2 min per interaction, then average across concepts
  const avgTimePerConcept =
    uniqueConcepts > 0
      ? Math.round((interactions.length * 2) / uniqueConcepts)
      : 0;

  // ── Quality Trend ────────────────────────────────────────────
  const scores = interactions
    .filter((i) => i.confidenceScore !== null)
    .map((i) => i.confidenceScore as number);

  let qualityTrend: 'improving' | 'stable' | 'declining' = 'stable';
  if (scores.length >= 4) {
    const half = Math.floor(scores.length / 2);
    const firstHalfAvg =
      scores.slice(0, half).reduce((s, v) => s + v, 0) / half;
    const secondHalfAvg =
      scores.slice(half).reduce((s, v) => s + v, 0) / (scores.length - half);

    const diff = secondHalfAvg - firstHalfAvg;
    if (diff > 0.1) qualityTrend = 'improving';
    else if (diff < -0.1) qualityTrend = 'declining';
  }

  // ── Low Confidence Concepts ──────────────────────────────────
  // Get latest confidence per concept
  const latestConfidence = new Map<
    string,
    { title: string; confidence: number }
  >();

  for (const i of interactions) {
    if (i.confidenceScore !== null && i.concept) {
      latestConfidence.set(i.concept.id, {
        title: i.concept.title,
        confidence: Math.round(i.confidenceScore * 100),
      });
    }
  }

  const lowConfidenceConcepts = [...latestConfidence.entries()]
    .filter(([, v]) => v.confidence < 60)
    .map(([conceptId, v]) => ({
      conceptId,
      title: v.title,
      confidence: v.confidence,
    }))
    .sort((a, b) => a.confidence - b.confidence);

  return {
    repeatedMistakes,
    avgTimePerConcept,
    qualityTrend,
    totalInteractions: interactions.length,
    lowConfidenceConcepts,
  };
}

// ── Adaptation Logic ───────────────────────────────────────────────

export async function getAdaptation(
  userId: string,
  conceptId: string
): Promise<AdaptationResult> {
  const interactions = await prisma.interaction.findMany({
    where: {
      session: { userId },
      conceptId,
    },
    orderBy: { createdAt: 'desc' },
    select: {
      confidenceScore: true,
      createdAt: true,
    },
  });

  const scores = interactions
    .filter((i) => i.confidenceScore !== null)
    .map((i) => ({
      score: i.confidenceScore as number,
      date: i.createdAt,
    }));

  const latestScore = scores.length > 0 ? scores[0].score : 0;
  const avgScore =
    scores.length > 0
      ? scores.reduce((s, v) => s + v.score, 0) / scores.length
      : 0;

  // ── Pace Decision ────────────────────────────────────────────
  let pace: 'slow' | 'normal' | 'fast' = 'normal';
  if (latestScore < 0.4 || (scores.length > 2 && avgScore < 0.5)) {
    pace = 'slow';
  } else if (latestScore > 0.85 && avgScore > 0.75) {
    pace = 'fast';
  }

  // ── Extra Examples ───────────────────────────────────────────
  const extraExamples = latestScore < 0.5 || (scores.length > 1 && avgScore < 0.6);

  // ── Skip Suggestion ──────────────────────────────────────────
  const skipSuggested = latestScore > 0.9 && scores.length >= 2;

  // ── Review Due (Spaced Repetition) ───────────────────────────
  const { reviewDue, nextReviewDate } = calculateReviewSchedule(scores);

  // ── Reasoning ────────────────────────────────────────────────
  const reasons: string[] = [];
  if (pace === 'slow') reasons.push('Low confidence detected — slowing down with more detail');
  if (pace === 'fast') reasons.push('High mastery — can move faster');
  if (extraExamples) reasons.push('Additional examples needed for clarity');
  if (skipSuggested) reasons.push('Content already mastered — skip available');
  if (reviewDue) reasons.push('Spaced repetition review due');
  if (reasons.length === 0) reasons.push('Progressing normally');

  return {
    pace,
    extraExamples,
    skipSuggested,
    reviewDue,
    nextReviewDate,
    reasoning: reasons.join('. ') + '.',
  };
}

// ── Weak Areas Summary ─────────────────────────────────────────────

export async function getWeakAreas(
  userId: string,
  contentId: string
): Promise<{ conceptId: string; title: string; confidence: number; reviewDue: boolean }[]> {
  const learningMap = await prisma.learningMap.findFirst({
    where: { contentId },
    include: {
      concepts: {
        include: {
          interactions: {
            where: { session: { userId } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { confidenceScore: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!learningMap) return [];

  return learningMap.concepts
    .filter((c) => {
      const latest = c.interactions[0];
      return latest && latest.confidenceScore !== null && latest.confidenceScore < 0.6;
    })
    .map((c) => {
      const latest = c.interactions[0];
      const score = latest.confidenceScore as number;
      const daysSince = Math.floor(
        (Date.now() - latest.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      return {
        conceptId: c.id,
        title: c.title,
        confidence: Math.round(score * 100),
        reviewDue: daysSince >= getReviewInterval(score),
      };
    })
    .sort((a, b) => a.confidence - b.confidence);
}

// ── Spaced Repetition Helpers ──────────────────────────────────────

function getReviewInterval(confidence: number): number {
  // Higher confidence → longer interval before review needed
  if (confidence >= 0.9) return 30;  // 30 days
  if (confidence >= 0.8) return 14;  // 2 weeks
  if (confidence >= 0.7) return 7;   // 1 week
  if (confidence >= 0.5) return 3;   // 3 days
  return 1;                          // next day
}

function calculateReviewSchedule(
  scores: { score: number; date: Date }[]
): { reviewDue: boolean; nextReviewDate: string | null } {
  if (scores.length === 0) {
    return { reviewDue: false, nextReviewDate: null };
  }

  const latest = scores[0];
  const interval = getReviewInterval(latest.score);
  const nextReview = new Date(latest.date);
  nextReview.setDate(nextReview.getDate() + interval);

  const now = new Date();
  return {
    reviewDue: now >= nextReview,
    nextReviewDate: nextReview.toISOString().split('T')[0],
  };
}
