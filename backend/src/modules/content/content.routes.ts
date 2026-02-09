import { FastifyInstance, FastifyRequest, FastifyReply, RouteGenericInterface } from 'fastify';
import { z } from 'zod';
import { prisma } from '../../config/database.js';
import { authMiddleware } from '../auth/auth.middleware.js';
import { saveFile, deleteFile } from './storage.service.js';
import { processContent } from './content.service.js';

// Route interfaces
interface IdParams extends RouteGenericInterface {
  Params: { id: string };
}

const uploadSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  visibility: z.enum(['PRIVATE', 'SHARED', 'PUBLIC', 'PAID']).default('PRIVATE'),
  priceCents: z.number().int().min(0).optional(),
});

export async function contentRoutes(app: FastifyInstance) {
  // GET /api/content - List user's content
  app.get('/', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;

    const contents = await prisma.content.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        visibility: true,
        coverImageUrl: true,
        processingProgress: true,
        createdAt: true,
        _count: {
          select: { learningSessions: true },
        },
      },
    });

    return reply.send({
      success: true,
      data: { contents },
    });
  });

  // GET /api/content/:id - Get single content
  app.get<IdParams>('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.userId;

    const content = await prisma.content.findFirst({
      where: {
        id,
        OR: [
          { userId },
          { visibility: 'PUBLIC' },
          { visibility: 'PLATFORM' },
        ],
      },
      include: {
        sections: {
          orderBy: { sectionOrder: 'asc' },
        },
        learningMaps: {
          include: {
            concepts: {
              orderBy: { conceptOrder: 'asc' },
            },
          },
        },
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    if (!content) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Content not found' },
      });
    }

    return reply.send({
      success: true,
      data: { content },
    });
  });

  // POST /api/content/upload - Upload new content
  app.post('/upload', { preHandler: authMiddleware }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.userId;

    // Parse multipart form data
    const parts = request.parts();
    let file: { filename: string; mimetype: string; data: Buffer } | null = null;
    const metadata: Record<string, string> = {};

    for await (const part of parts) {
      if (part.type === 'file') {
        const chunks: Buffer[] = [];
        for await (const chunk of part.file) {
          chunks.push(chunk);
        }
        file = {
          filename: part.filename,
          mimetype: part.mimetype,
          data: Buffer.concat(chunks),
        };
      } else {
        metadata[part.fieldname] = part.value as string;
      }
    }

    if (!file) {
      return reply.status(400).send({
        success: false,
        error: { message: 'No file uploaded' },
      });
    }

    // Validate file type
    if (file.mimetype !== 'application/pdf') {
      return reply.status(400).send({
        success: false,
        error: { message: 'Only PDF files are allowed' },
      });
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.data.length > maxSize) {
      return reply.status(400).send({
        success: false,
        error: { message: 'File size exceeds 50MB limit' },
      });
    }

    // Validate metadata
    const parsed = uploadSchema.safeParse({
      title: metadata.title,
      description: metadata.description,
      visibility: metadata.visibility,
      priceCents: metadata.priceCents ? parseInt(metadata.priceCents) : undefined,
    });

    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { message: parsed.error.errors[0].message },
      });
    }

    // Save file to storage
    const fileUrl = await saveFile(file.data, file.filename, userId);

    // Create content record
    const content = await prisma.content.create({
      data: {
        userId,
        title: parsed.data.title,
        description: parsed.data.description,
        originalFilename: file.filename,
        fileUrl,
        fileSizeBytes: file.data.length,
        status: 'PENDING',
        visibility: parsed.data.visibility,
        priceCents: parsed.data.priceCents,
      },
    });

    // Queue content for processing (async)
    processContent(content.id).catch(console.error);

    return reply.status(201).send({
      success: true,
      data: {
        content: {
          id: content.id,
          title: content.title,
          status: content.status,
        },
        message: 'Upload successful. Processing started.',
      },
    });
  });

  // DELETE /api/content/:id - Delete content
  app.delete<IdParams>('/:id', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.userId;

    const content = await prisma.content.findFirst({
      where: { id, userId },
    });

    if (!content) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Content not found' },
      });
    }

    // Delete file from storage
    await deleteFile(content.fileUrl);

    // Delete content (cascades to related records)
    await prisma.content.delete({
      where: { id },
    });

    return reply.send({
      success: true,
      message: 'Content deleted successfully',
    });
  });

  // POST /api/content/:id/process - Trigger AI processing
  app.post<IdParams>('/:id/process', { preHandler: authMiddleware }, async (request, reply) => {
    const { id } = request.params;
    const userId = request.user!.userId;

    const content = await prisma.content.findFirst({
      where: { id, userId },
    });

    if (!content) {
      return reply.status(404).send({
        success: false,
        error: { message: 'Content not found' },
      });
    }

    // Re-queue content for processing
    await prisma.content.update({
      where: { id },
      data: { status: 'PENDING', processingProgress: 0 },
    });

    processContent(id).catch(console.error);

    return reply.send({
      success: true,
      message: 'Processing started',
    });
  });
}
