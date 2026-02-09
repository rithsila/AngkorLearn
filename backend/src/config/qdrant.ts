import { QdrantClient } from '@qdrant/js-client-rest';
import { env } from './env.js';

export const qdrant = new QdrantClient({
  url: env.QDRANT_URL,
  apiKey: env.QDRANT_API_KEY || undefined,
});

// Collection name for content embeddings
export const CONTENT_COLLECTION = 'content_sections';

// Initialize collection on startup
export async function initQdrantCollection() {
  try {
    const collections = await qdrant.getCollections();
    const exists = collections.collections.some(c => c.name === CONTENT_COLLECTION);

    if (!exists) {
      await qdrant.createCollection(CONTENT_COLLECTION, {
        vectors: {
          size: 1536, // OpenAI embedding dimensions
          distance: 'Cosine',
        },
      });
      console.log(`✅ Qdrant collection '${CONTENT_COLLECTION}' created`);
    } else {
      console.log(`✅ Qdrant collection '${CONTENT_COLLECTION}' exists`);
    }
  } catch (error) {
    console.error('Failed to initialize Qdrant:', error);
  }
}
