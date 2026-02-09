import pdfParse from 'pdf-parse';
import { prisma } from '../../config/database.js';
import { readFile } from './storage.service.js';
import { processContentEmbeddings } from './embedding.service.js';

export async function processContent(contentId: string): Promise<void> {
  console.log(`🔄 Processing content: ${contentId}`);
  
  try {
    // Update status to processing
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'PROCESSING', processingProgress: 10 },
    });

    // Get content record
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new Error('Content not found');
    }

    // Read file
    const fileBuffer = await readFile(content.fileUrl);
    
    await prisma.content.update({
      where: { id: contentId },
      data: { processingProgress: 20 },
    });

    // Extract text from PDF
    const pdfData = await pdfParse(fileBuffer);
    const rawText = pdfData.text;

    await prisma.content.update({
      where: { id: contentId },
      data: { processingProgress: 40 },
    });

    // Segment content into sections
    const sections = segmentContent(rawText);
    
    // Create content sections
    for (let i = 0; i < sections.length; i++) {
      await prisma.contentSection.create({
        data: {
          contentId,
          title: sections[i].title,
          contentText: sections[i].content,
          sectionOrder: i + 1,
          pageStart: sections[i].pageStart,
          pageEnd: sections[i].pageEnd,
        },
      });
    }

    await prisma.content.update({
      where: { id: contentId },
      data: { processingProgress: 60 },
    });

    // Generate and store embeddings in Qdrant
    try {
      await processContentEmbeddings(contentId);
    } catch (embeddingError) {
      console.warn(`⚠️ Embedding generation failed (non-fatal):`, embeddingError);
      // Continue processing even if embeddings fail
    }

    await prisma.content.update({
      where: { id: contentId },
      data: { processingProgress: 80 },
    });

    // Create learning map
    await prisma.learningMap.create({
      data: {
        contentId,
        totalConcepts: Math.max(sections.length, 3),
        estimatedDuration: Math.ceil(rawText.length / 1000),
        difficultyLevel: 'intermediate',
      },
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { processingProgress: 95 },
    });

    // Update content status to ready
    await prisma.content.update({
      where: { id: contentId },
      data: { 
        status: 'READY',
        processingProgress: 100,
      },
    });

    console.log(`✅ Content processed: ${contentId}`);
  } catch (error) {
    console.error(`❌ Content processing failed: ${contentId}`, error);
    
    await prisma.content.update({
      where: { id: contentId },
      data: { status: 'ERROR' },
    });
  }
}

interface Section {
  title: string;
  content: string;
  pageStart: number;
  pageEnd: number;
}

function segmentContent(text: string): Section[] {
  const lines = text.split('\n').filter(line => line.trim());
  const sections: Section[] = [];
  
  let currentSection: Section = {
    title: 'Introduction',
    content: '',
    pageStart: 1,
    pageEnd: 1,
  };
  
  const headerPatterns = [
    /^(Chapter|Section)\s+\d+/i,
    /^\d+\.\s+[A-Z]/,
    /^[IVX]+\.\s+[A-Z]/,
  ];

  for (const line of lines) {
    const isHeader = headerPatterns.some(pattern => pattern.test(line.trim()));
    
    if (isHeader && currentSection.content.length > 100) {
      sections.push({ ...currentSection });
      currentSection = {
        title: line.trim().substring(0, 100),
        content: '',
        pageStart: currentSection.pageEnd,
        pageEnd: currentSection.pageEnd + 1,
      };
    } else {
      currentSection.content += line + '\n';
    }
  }
  
  if (currentSection.content.trim()) {
    sections.push(currentSection);
  }
  
  if (sections.length === 0) {
    sections.push({
      title: 'Content',
      content: text,
      pageStart: 1,
      pageEnd: 1,
    });
  }
  
  return sections;
}
