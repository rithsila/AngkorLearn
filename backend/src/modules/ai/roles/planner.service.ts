import { prisma } from '../../../config/database.js';
import { orchestrate, parseAIResponse } from '../orchestrator.service.js';

export interface LearningMapConcept {
  title: string;
  description: string;
  difficulty: number;
  estimatedMinutes: number;
  prerequisites: string[];
  keyPoints: string[];
}

export interface LearningMapResponse {
  overview: string;
  totalEstimatedMinutes: number;
  concepts: LearningMapConcept[];
}

/**
 * Generate a learning map for content using the Planner AI role
 */
export async function generateLearningMap(
  userId: string,
  contentId: string
): Promise<{ learningMapId: string; conceptCount: number }> {
  // 1. Get content with sections
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      sections: {
        orderBy: { sectionOrder: 'asc' },
        select: { title: true, contentText: true },
      },
    },
  });
  
  if (!content) {
    throw new Error('Content not found');
  }
  
  if (content.sections.length === 0) {
    throw new Error('Content has no sections to analyze');
  }
  
  // 2. Format sections for prompt
  const contentSections = content.sections
    .map((s, i) => `## Section ${i + 1}: ${s.title}\n${s.contentText}`)
    .join('\n\n---\n\n');
  
  // 3. Call Planner AI
  const response = await orchestrate(userId, {
    role: 'planner',
    contentId,
    userMessage: 'Generate a learning map for this content.',
    additionalContext: {
      contentTitle: content.title,
      contentDescription: content.description || '',
      contentSections,
    },
  });
  
  // 4. Parse response
  const learningMap = parseAIResponse<LearningMapResponse>(response);
  
  // 5. Check for existing learning map
  const existingMap = await prisma.learningMap.findFirst({
    where: { contentId },
  });
  
  if (existingMap) {
    // Delete existing map and concepts
    await prisma.concept.deleteMany({ where: { learningMapId: existingMap.id } });
    await prisma.learningMap.delete({ where: { id: existingMap.id } });
  }
  
  // 6. Calculate average difficulty
  const avgDifficulty = learningMap.concepts.reduce((sum, c) => sum + c.difficulty, 0) / learningMap.concepts.length;
  let difficultyLevel: string;
  if (avgDifficulty < 2) difficultyLevel = 'beginner';
  else if (avgDifficulty < 3.5) difficultyLevel = 'intermediate';
  else difficultyLevel = 'advanced';
  
  // 7. Create learning map in database
  const createdMap = await prisma.learningMap.create({
    data: {
      contentId,
      totalConcepts: learningMap.concepts.length,
      estimatedDuration: learningMap.totalEstimatedMinutes,
      difficultyLevel,
    },
  });
  
  // 8. Create concepts in database
  for (let i = 0; i < learningMap.concepts.length; i++) {
    const concept = learningMap.concepts[i];
    await prisma.concept.create({
      data: {
        learningMapId: createdMap.id,
        title: concept.title,
        description: concept.description,
        conceptOrder: i + 1,
        difficulty: concept.difficulty,
        estimatedMinutes: concept.estimatedMinutes,
        prerequisites: concept.prerequisites,
      },
    });
  }
  
  console.log(`✅ Learning map created with ${learningMap.concepts.length} concepts`);
  
  return {
    learningMapId: createdMap.id,
    conceptCount: learningMap.concepts.length,
  };
}

/**
 * Get learning map with concepts
 */
export async function getLearningMap(contentId: string) {
  return prisma.learningMap.findFirst({
    where: { contentId },
    include: {
      concepts: {
        orderBy: { conceptOrder: 'asc' },
      },
    },
  });
}
