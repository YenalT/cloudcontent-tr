import {
  ApiUsageStatus,
  ArticleSourceType,
  ArticleStatus,
  JobStatus,
  PrismaClient,
  SocialPostStatus,
  UploadedDocumentStatus,
  UserRole,
} from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Seeding CloudContent TR database...")

  // Clear in dependency order
  await prisma.apiUsageLog.deleteMany()
  await prisma.jobLog.deleteMany()
  await prisma.socialPost.deleteMany()
  await prisma.articleRevision.deleteMany()
  await prisma.article.deleteMany()
  await prisma.extractedContent.deleteMany()
  await prisma.uploadedDocument.deleteMany()
  await prisma.sourceUrl.deleteMany()
  await prisma.instagramAccount.deleteMany()
  await prisma.user.deleteMany()

  const admin = await prisma.user.create({
    data: {
      email: "admin@cloudcontent.tr",
      name: "Admin User",
      role: UserRole.ADMIN,
    },
  })

  const editor = await prisma.user.create({
    data: {
      email: "editor@cloudcontent.tr",
      name: "Content Editor",
      role: UserRole.EDITOR,
    },
  })

  const sourceOpenAi = await prisma.sourceUrl.create({
    data: {
      title: "Azure OpenAI Service",
      url: "https://azure.microsoft.com/blog/azure-openai-service",
      category: "AI",
      isActive: true,
      lastFetchedAt: new Date("2025-05-10T10:00:00Z"),
    },
  })

  const sourceFabric = await prisma.sourceUrl.create({
    data: {
      title: "Microsoft Fabric",
      url: "https://azure.microsoft.com/blog/introducing-microsoft-fabric",
      category: "Analytics",
      isActive: true,
      lastFetchedAt: new Date("2025-05-12T14:30:00Z"),
    },
  })

  const sourceAks = await prisma.sourceUrl.create({
    data: {
      title: "Azure Kubernetes Service Updates",
      url: "https://azure.microsoft.com/blog/aks-updates",
      category: "Containers",
      isActive: false,
    },
  })

  await prisma.extractedContent.createMany({
    data: [
      {
        sourceUrlId: sourceOpenAi.id,
        title: "Azure OpenAI — raw extract",
        rawContent:
          "Azure OpenAI Service brings GPT-4 and enterprise security to Azure customers...",
        metadata: { wordCount: 420, language: "en" },
      },
      {
        sourceUrlId: sourceFabric.id,
        title: "Microsoft Fabric — raw extract",
        rawContent: "Microsoft Fabric unifies data engineering, analytics, and BI...",
        metadata: { wordCount: 380, language: "en" },
      },
    ],
  })

  const docWhitepaper = await prisma.uploadedDocument.create({
    data: {
      fileName: "cloud-whitepaper-2025.pdf",
      fileType: "pdf",
      fileUrl: "/api/files/seed-whitepaper",
      storageKey: "seed/cloud-whitepaper-2025.pdf",
      fileSizeBytes: 2_516_582,
      topic: "Cloud Security",
      status: UploadedDocumentStatus.COMPLETED,
    },
  })

  const docDeck = await prisma.uploadedDocument.create({
    data: {
      fileName: "product-deck.pptx",
      fileType: "pptx",
      fileUrl: "/api/files/seed-deck",
      storageKey: "seed/product-deck.pptx",
      fileSizeBytes: 8_493_056,
      topic: "Product Overview",
      status: UploadedDocumentStatus.PROCESSING,
    },
  })

  await prisma.extractedContent.create({
    data: {
      uploadedDocumentId: docWhitepaper.id,
      title: "Cloud Security Whitepaper — extract",
      rawContent: "Zero Trust, identity management, and compliance on Azure...",
      metadata: { pages: 24 },
    },
  })

  const articlePublished = await prisma.article.create({
    data: {
      title: "Azure OpenAI ile Kurumsal Yapay Zeka",
      slug: "azure-openai-kurumsal",
      summary: "Kurumsal ortamlarda güvenli yapay zeka kullanımına giriş.",
      content:
        "## Giriş\n\nAzure OpenAI Servisi, GPT-4 ve kurumsal güvenlik standartlarını bir araya getirir...",
      seoTitle: "Azure OpenAI Kurumsal Rehber | CloudContent TR",
      metaDescription: "Azure OpenAI ile kurumsal yapay zeka stratejileri.",
      tags: ["azure", "openai", "yapay-zeka"],
      sourceType: ArticleSourceType.URL,
      sourceUrlId: sourceOpenAi.id,
      status: ArticleStatus.PUBLISHED,
      publishedAt: new Date("2025-05-11T08:00:00Z"),
    },
  })

  const articleReview = await prisma.article.create({
    data: {
      title: "Microsoft Fabric Veri Platformu Rehberi",
      slug: "microsoft-fabric-rehberi",
      summary: "Birleşik veri platformu ile analitik süreçleri sadeleştirin.",
      content: "## Microsoft Fabric\n\nVeri mühendisliği ve BI tek çatı altında...",
      tags: ["fabric", "veri", "analytics"],
      sourceType: ArticleSourceType.URL,
      sourceUrlId: sourceFabric.id,
      status: ArticleStatus.PENDING_REVIEW,
    },
  })

  const articleDraft = await prisma.article.create({
    data: {
      title: "Bulut Güvenliği En İyi Uygulamalar",
      slug: "bulut-guvenligi",
      summary: "Taslak makale — whitepaper kaynağından üretilecek.",
      sourceType: ArticleSourceType.DOCUMENT,
      uploadedDocumentId: docWhitepaper.id,
      status: ArticleStatus.DRAFT,
    },
  })

  const articleFailed = await prisma.article.create({
    data: {
      title: "AKS Konteyner Orkestrasyonu",
      slug: "aks-konteyner",
      sourceType: ArticleSourceType.URL,
      sourceUrlId: sourceAks.id,
      status: ArticleStatus.FAILED,
    },
  })

  await prisma.articleRevision.createMany({
    data: [
      {
        articleId: articlePublished.id,
        revisionNumber: 1,
        title: articlePublished.title,
        summary: articlePublished.summary,
        content: articlePublished.content,
        seoTitle: articlePublished.seoTitle,
        metaDescription: articlePublished.metaDescription,
        tags: articlePublished.tags,
        createdById: editor.id,
      },
      {
        articleId: articleReview.id,
        revisionNumber: 1,
        title: articleReview.title,
        summary: articleReview.summary,
        content: articleReview.content,
        tags: articleReview.tags,
        createdById: editor.id,
      },
    ],
  })

  await prisma.socialPost.createMany({
    data: [
      {
        articleId: articlePublished.id,
        caption:
          "Yapay zeka ile içerik üretiminde yeni dönem. #CloudContent #AI #Azure",
        status: SocialPostStatus.SCHEDULED,
        scheduledAt: new Date("2025-05-18T18:00:00Z"),
      },
      {
        articleId: articleReview.id,
        caption: "Microsoft Fabric ile veri analitiğinde devrim. #Fabric #Data",
        status: SocialPostStatus.PENDING_REVIEW,
      },
      {
        articleId: articleDraft.id,
        caption: "Bulut güvenliği rehberi yakında. #CloudSecurity",
        status: SocialPostStatus.DRAFT,
      },
    ],
  })

  await prisma.jobLog.createMany({
    data: [
      {
        userId: admin.id,
        type: "source_fetch",
        status: JobStatus.SUCCESS,
        message: "Kaynak URL başarıyla işlendi: Azure OpenAI Service",
        duration: "2.1s",
      },
      {
        type: "article_generate",
        status: JobStatus.RUNNING,
        message: "Makale oluşturma devam ediyor: Microsoft Fabric Rehberi",
      },
      {
        type: "upload_parse",
        status: JobStatus.FAILED,
        message: "PDF ayrıştırma hatası: product-deck.pptx",
        duration: "0.4s",
        metadata: { documentId: docDeck.id },
      },
    ],
  })

  await prisma.apiUsageLog.createMany({
    data: [
      {
        userId: editor.id,
        provider: "azure-openai",
        endpoint: "/chat/completions",
        model: "gpt-4-turbo",
        inputTokens: 1200,
        outputTokens: 800,
        totalTokens: 2000,
        costUsd: 0.042,
        status: ApiUsageStatus.SUCCESS,
      },
      {
        provider: "azure-openai",
        endpoint: "/chat/completions",
        model: "gpt-4-turbo",
        status: ApiUsageStatus.FAILED,
        metadata: { error: "Rate limit exceeded" },
      },
    ],
  })

  console.log("Seed completed:")
  console.log(`  Users: ${await prisma.user.count()}`)
  console.log(`  Source URLs: ${await prisma.sourceUrl.count()}`)
  console.log(`  Documents: ${await prisma.uploadedDocument.count()}`)
  console.log(`  Articles: ${await prisma.article.count()}`)
  console.log(`  Social posts: ${await prisma.socialPost.count()}`)
  console.log(`  Job logs: ${await prisma.jobLog.count()}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
