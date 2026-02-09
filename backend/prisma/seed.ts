import { PrismaClient, UserRole, ContentStatus, ContentVisibility } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing data
  await prisma.interaction.deleteMany();
  await prisma.userNote.deleteMany();
  await prisma.learningSession.deleteMany();
  await prisma.concept.deleteMany();
  await prisma.learningMap.deleteMany();
  await prisma.contentSection.deleteMany();
  await prisma.contentRating.deleteMany();
  await prisma.purchase.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.payout.deleteMany();
  await prisma.contentAccess.deleteMany();
  await prisma.engagementTracking.deleteMany();
  await prisma.bundleContent.deleteMany();
  await prisma.bundle.deleteMany();
  await prisma.content.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.creatorPaymentSettings.deleteMany();
  await prisma.user.deleteMany();

  // Create test users
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@angkorlearn.com',
      passwordHash,
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  });

  const creator = await prisma.user.create({
    data: {
      email: 'creator@angkorlearn.com',
      passwordHash,
      name: 'Content Creator',
      role: UserRole.CREATOR,
    },
  });

  const user = await prisma.user.create({
    data: {
      email: 'user@angkorlearn.com',
      passwordHash,
      name: 'Test User',
      role: UserRole.USER,
    },
  });

  console.log('✅ Created users:', { admin: admin.email, creator: creator.email, user: user.email });

  // Create sample content
  const sampleContent = await prisma.content.create({
    data: {
      userId: creator.id,
      title: 'Introduction to Machine Learning',
      description: 'A comprehensive guide to ML fundamentals',
      originalFilename: 'ml-intro.pdf',
      fileUrl: '/uploads/sample/ml-intro.pdf',
      fileSizeBytes: 1024000,
      status: ContentStatus.READY,
      visibility: ContentVisibility.PUBLIC,
      category: 'Technology',
    },
  });

  // Create content sections
  const sections = await Promise.all([
    prisma.contentSection.create({
      data: {
        contentId: sampleContent.id,
        title: 'What is Machine Learning?',
        contentText: 'Machine learning is a subset of artificial intelligence...',
        sectionOrder: 1,
        pageStart: 1,
        pageEnd: 5,
      },
    }),
    prisma.contentSection.create({
      data: {
        contentId: sampleContent.id,
        title: 'Types of Machine Learning',
        contentText: 'There are three main types: supervised, unsupervised, and reinforcement learning...',
        sectionOrder: 2,
        pageStart: 6,
        pageEnd: 15,
      },
    }),
    prisma.contentSection.create({
      data: {
        contentId: sampleContent.id,
        title: 'Neural Networks Basics',
        contentText: 'Neural networks are computing systems inspired by biological neural networks...',
        sectionOrder: 3,
        pageStart: 16,
        pageEnd: 25,
      },
    }),
  ]);

  console.log('✅ Created content with', sections.length, 'sections');

  // Create learning map
  const learningMap = await prisma.learningMap.create({
    data: {
      contentId: sampleContent.id,
      totalConcepts: 5,
      estimatedDuration: 120,
      difficultyLevel: 'intermediate',
    },
  });

  // Create concepts
  const concepts = await Promise.all([
    prisma.concept.create({
      data: {
        learningMapId: learningMap.id,
        sectionId: sections[0].id,
        title: 'Understanding ML Basics',
        description: 'Core concepts of machine learning',
        conceptOrder: 1,
        difficulty: 1,
        estimatedMinutes: 20,
      },
    }),
    prisma.concept.create({
      data: {
        learningMapId: learningMap.id,
        sectionId: sections[1].id,
        title: 'Supervised Learning',
        description: 'Learning with labeled data',
        conceptOrder: 2,
        difficulty: 2,
        estimatedMinutes: 30,
        prerequisites: ['Understanding ML Basics'],
      },
    }),
    prisma.concept.create({
      data: {
        learningMapId: learningMap.id,
        sectionId: sections[2].id,
        title: 'Neural Network Architecture',
        description: 'Building blocks of deep learning',
        conceptOrder: 3,
        difficulty: 3,
        estimatedMinutes: 40,
        prerequisites: ['Understanding ML Basics', 'Supervised Learning'],
      },
    }),
  ]);

  console.log('✅ Created learning map with', concepts.length, 'concepts');

  // Create a learning session for test user
  const session = await prisma.learningSession.create({
    data: {
      userId: user.id,
      contentId: sampleContent.id,
      currentConceptId: concepts[0].id,
      status: 'ACTIVE',
      progress: 0.2,
      totalTimeMinutes: 15,
    },
  });

  console.log('✅ Created sample learning session');

  // Create sample interaction
  await prisma.interaction.create({
    data: {
      sessionId: session.id,
      conceptId: concepts[0].id,
      role: 'TUTOR',
      userMessage: 'What is machine learning?',
      aiResponse: 'Machine learning is a type of artificial intelligence that enables computers to learn from data...',
      interactionType: 'EXPLANATION',
      tokensUsed: 150,
    },
  });

  console.log('✅ Created sample interaction');
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
