import type {
  Article,
  DashboardStats,
  InstagramPost,
  JobLog,
  Source,
  Upload,
} from "@/types"

export const mockSources: Source[] = [
  {
    id: "src_1",
    url: "https://azure.microsoft.com/blog/azure-openai-service",
    title: "Azure OpenAI Service",
    status: "completed",
    articlesGenerated: 3,
    createdAt: "2025-05-10T10:00:00Z",
  },
  {
    id: "src_2",
    url: "https://azure.microsoft.com/blog/microsoft-fabric",
    title: "Microsoft Fabric",
    status: "processing",
    articlesGenerated: 0,
    createdAt: "2025-05-12T14:30:00Z",
  },
  {
    id: "src_3",
    url: "https://azure.microsoft.com/blog/aks-updates",
    title: "AKS Updates",
    status: "pending",
    articlesGenerated: 0,
    createdAt: "2025-05-15T09:15:00Z",
  },
]

export const mockUploads: Upload[] = [
  {
    id: "upl_1",
    fileName: "cloud-whitepaper-2025.pdf",
    fileType: "pdf",
    fileSize: "2.4 MB",
    status: "completed",
    articlesGenerated: 2,
    createdAt: "2025-05-11T11:00:00Z",
  },
  {
    id: "upl_2",
    fileName: "product-deck.pptx",
    fileType: "pptx",
    fileSize: "8.1 MB",
    status: "processing",
    articlesGenerated: 0,
    createdAt: "2025-05-14T16:45:00Z",
  },
]

export const mockArticles: Article[] = [
  {
    id: "art_1",
    title: "Azure OpenAI ile Kurumsal Yapay Zeka",
    slug: "azure-openai-kurumsal",
    status: "published",
    wordCount: 1240,
    sourceLabel: "Azure OpenAI Service",
    createdAt: "2025-05-10T12:00:00Z",
    publishedAt: "2025-05-11T08:00:00Z",
  },
  {
    id: "art_2",
    title: "Microsoft Fabric Veri Platformu Rehberi",
    slug: "microsoft-fabric-rehberi",
    status: "review",
    wordCount: 980,
    sourceLabel: "Microsoft Fabric",
    createdAt: "2025-05-13T10:30:00Z",
  },
  {
    id: "art_3",
    title: "Bulut Güvenliği En İyi Uygulamalar",
    slug: "bulut-guvenligi",
    status: "draft",
    wordCount: 760,
    sourceLabel: "cloud-whitepaper-2025.pdf",
    createdAt: "2025-05-14T15:00:00Z",
  },
]

export const mockInstagramPosts: InstagramPost[] = [
  {
    id: "ig_1",
    articleTitle: "Azure OpenAI ile Kurumsal Yapay Zeka",
    caption: "Yapay zeka ile içerik üretiminde yeni dönem. #CloudContent #AI",
    status: "scheduled",
    scheduledAt: "2025-05-18T18:00:00Z",
  },
  {
    id: "ig_2",
    articleTitle: "Bulut Güvenliği En İyi Uygulamalar",
    caption: "Zero Trust ile güvenli bulut altyapısı. #Bulut #Güvenlik",
    status: "draft",
  },
]

export const mockJobLogs: JobLog[] = [
  {
    id: "log_1",
    type: "source_fetch",
    status: "success",
    message: "Kaynak URL başarıyla işlendi",
    createdAt: "2025-05-17T09:00:00Z",
    duration: "2.1s",
  },
  {
    id: "log_2",
    type: "article_generate",
    status: "running",
    message: "Makale oluşturma devam ediyor",
    createdAt: "2025-05-17T09:05:00Z",
  },
  {
    id: "log_3",
    type: "upload_parse",
    status: "failed",
    message: "PDF ayrıştırma hatası: bozuk dosya",
    createdAt: "2025-05-17T08:50:00Z",
    duration: "0.4s",
  },
]

export const mockDashboardStats: DashboardStats = {
  sources: mockSources.length,
  uploads: mockUploads.length,
  articles: mockArticles.length,
  published: mockArticles.filter((a) => a.status === "published").length,
  instagramPending: mockInstagramPosts.filter((p) => p.status !== "published").length,
  failedJobs: mockJobLogs.filter((j) => j.status === "failed").length,
}

export const mockChartData = [
  { date: "10 May", articles: 2 },
  { date: "11 May", articles: 3 },
  { date: "12 May", articles: 1 },
  { date: "13 May", articles: 4 },
  { date: "14 May", articles: 2 },
  { date: "15 May", articles: 5 },
  { date: "16 May", articles: 3 },
]
