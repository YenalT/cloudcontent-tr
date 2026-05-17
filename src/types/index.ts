export type SourceStatus = "pending" | "processing" | "completed" | "failed"
export type ArticleStatus = "draft" | "review" | "published"
export type UploadStatus = "pending" | "processing" | "completed" | "failed"
export type InstagramStatus = "draft" | "scheduled" | "published"
export type JobStatus = "success" | "failed" | "running"

export interface Source {
  id: string
  url: string
  title: string
  status: SourceStatus
  articlesGenerated: number
  createdAt: string
}

export interface Upload {
  id: string
  fileName: string
  fileType: string
  fileSize: string
  status: UploadStatus
  articlesGenerated: number
  createdAt: string
}

export interface Article {
  id: string
  title: string
  slug: string
  status: ArticleStatus
  wordCount: number
  sourceLabel: string
  createdAt: string
  publishedAt?: string
}

export interface InstagramPost {
  id: string
  articleTitle: string
  caption: string
  status: InstagramStatus
  scheduledAt?: string
}

export interface JobLog {
  id: string
  type: string
  status: JobStatus
  message: string
  createdAt: string
  duration?: string
}

export interface DashboardStats {
  sources: number
  uploads: number
  articles: number
  published: number
  instagramPending: number
  failedJobs: number
}
