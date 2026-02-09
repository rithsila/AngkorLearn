import OpenAI from 'openai';
import { env } from '../../config/env.js';
import { qdrant, CONTENT_COLLECTION } from '../../config/qdrant.js';
import { prisma } from '../../config/database.js';

// Initialize OpenAI client
const openai = env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

interface EmbeddingResult {
  sectionId: string;
  embedding: number[];
}

/**
 * Generate embeddings for text using OpenAI's text-embedding-3-small model
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    console.warn('⚠️ OpenAI API key not configured, skipping embedding');
    return [];
  }

  // Truncate text to fit within token limits (~8000 tokens ≈ 32000 chars)
  const truncatedText = text.slice(0, 30000);

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncatedText,
    dimensions: 1536,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple content sections in batches
 */
export async function generateBatchEmbeddings(
  sections: Array<{ id: string; text: string }>
): Promise<EmbeddingResult[]> {
  if (!openai) {
    console.warn('⚠️ OpenAI API key not configured, skipping embeddings');
    return [];
  }

  const results: EmbeddingResult[] = [];
  const batchSize = 20; // OpenAI allows up to 2048 inputs, but we use smaller batches

  for (let i = 0; i < sections.length; i += batchSize) {
    const batch = sections.slice(i, i + batchSize);
    const texts = batch.map(s => s.text.slice(0, 30000)); // Truncate each

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: texts,
      dimensions: 1536,
    });

    for (let j = 0; j < batch.length; j++) {
      results.push({
        sectionId: batch[j].id,
        embedding: response.data[j].embedding,
      });
    }
  }

  return results;
}

/**
 * Store embeddings in Qdrant vector database
 */
export async function storeEmbeddingsInQdrant(
  contentId: string,
  embeddings: EmbeddingResult[]
): Promise<void> {
  if (embeddings.length === 0) return;

  const points = embeddings.map((e, index) => ({
    id: e.sectionId, // Use section ID as point ID
    vector: e.embedding,
    payload: {
      content_id: contentId,
      section_id: e.sectionId,
      index,
    },
  }));

  // Upsert in batches of 100
  const batchSize = 100;
  for (let i = 0; i < points.length; i += batchSize) {
    const batch = points.slice(i, i + batchSize);
    await qdrant.upsert(CONTENT_COLLECTION, {
      wait: true,
      points: batch,
    });
  }

  console.log(`✅ Stored ${embeddings.length} embeddings in Qdrant for content ${contentId}`);
}

/**
 * Search for similar content sections using Qdrant
 */
export async function searchSimilar(
  query: string,
  contentId?: string,
  limit: number = 5
): Promise<Array<{ sectionId: string; score: number }>> {
  if (!openai) {
    return [];
  }

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query);
  if (queryEmbedding.length === 0) return [];

  // Build filter if contentId provided
  const filter = contentId
    ? { must: [{ key: 'content_id', match: { value: contentId } }] }
    : undefined;

  // Search in Qdrant
  const results = await qdrant.search(CONTENT_COLLECTION, {
    vector: queryEmbedding,
    limit,
    filter,
    with_payload: true,
  });

  return results.map(r => ({
    sectionId: r.payload?.section_id as string,
    score: r.score,
  }));
}

/**
 * Delete embeddings for a content from Qdrant
 */
export async function deleteContentEmbeddings(contentId: string): Promise<void> {
  await qdrant.delete(CONTENT_COLLECTION, {
    wait: true,
    filter: {
      must: [{ key: 'content_id', match: { value: contentId } }],
    },
  });
  console.log(`🗑️ Deleted embeddings for content ${contentId}`);
}

/**
 * Process content embeddings - main function to generate and store embeddings
 */
export async function processContentEmbeddings(contentId: string): Promise<void> {
  console.log(`🔄 Generating embeddings for content: ${contentId}`);

  // Get content sections
  const sections = await prisma.contentSection.findMany({
    where: { contentId },
    select: { id: true, contentText: true, title: true },
  });

  if (sections.length === 0) {
    console.log(`⚠️ No sections found for content ${contentId}`);
    return;
  }

  // Prepare text for embedding (title + content)
  const sectionsWithText = sections.map(s => ({
    id: s.id,
    text: `${s.title}\n\n${s.contentText}`,
  }));

  // Generate embeddings
  const embeddings = await generateBatchEmbeddings(sectionsWithText);

  // Store in Qdrant
  await storeEmbeddingsInQdrant(contentId, embeddings);

  console.log(`✅ Embeddings processed for content ${contentId}`);
}
