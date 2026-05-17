"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Loader2, Sparkles, Save } from "lucide-react"

import { generateArticle, previewDocumentSource, saveArticleDraft } from "@/lib/actions/articles"
import type { GeneratedArticle } from "@/lib/ai/types"
import type { ArticleGenerationOptions } from "@/lib/data/article-generation"
import type { ArticleSourceTypeInput } from "@/lib/ai/types"
import { ArticlePreview } from "@/components/articles/article-preview"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

const textareaClass =
  "flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"

type ArticleAiStatus = {
  ready: boolean
  message: string
  provider?: string
}

type ArticleGeneratorProps = ArticleGenerationOptions & {
  aiStatus: ArticleAiStatus
}

export function ArticleGenerator({ urlSources, documents, aiStatus }: ArticleGeneratorProps) {
  const router = useRouter()
  const [isGenerating, startGenerate] = useTransition()
  const [isSaving, startSave] = useTransition()

  const [sourceType, setSourceType] = useState<ArticleSourceTypeInput>("url")
  const [sourceId, setSourceId] = useState(urlSources[0]?.id ?? "")
  const [topic, setTopic] = useState("")
  const [sourceContent, setSourceContent] = useState(urlSources[0]?.defaultContent ?? "")
  const [generated, setGenerated] = useState<GeneratedArticle | null>(null)
  const [banner, setBanner] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const sourceOptions = useMemo(
    () => (sourceType === "url" ? urlSources : documents),
    [sourceType, urlSources, documents]
  )

  function handleSourceTypeChange(type: ArticleSourceTypeInput) {
    setSourceType(type)
    const options = type === "url" ? urlSources : documents
    const first = options[0]
    setSourceId(first?.id ?? "")
    setSourceContent(first?.defaultContent ?? "")
    if (type === "document" && first && "topic" in first && first.topic) {
      setTopic(first.topic)
    }
    setGenerated(null)
  }

  function handleSourceChange(id: string) {
    setSourceId(id)
    const option = sourceOptions.find((o) => o.id === id)
    if (option) {
      setSourceContent(option.defaultContent)
      if (sourceType === "document" && "topic" in option && option.topic) {
        setTopic(option.topic)
      }
    }
    setGenerated(null)
  }

  function handleGenerate() {
    setBanner(null)
    startGenerate(async () => {
      const result = await generateArticle({
        sourceType,
        sourceId,
        sourceContent,
        topic,
        targetLanguage: "Turkish",
      })
      if (result.ok && result.data) {
        setGenerated(result.data)
        setBanner({ type: "success", text: result.message ?? "Makale üretildi." })
      } else {
        setGenerated(null)
        setBanner({ type: "error", text: result.message ?? "Üretim başarısız." })
      }
    })
  }

  function handleSaveDraft() {
    if (!generated) return
    setBanner(null)
    startSave(async () => {
      const result = await saveArticleDraft({
        ...generated,
        sourceType,
        sourceId,
      })
      if (result.ok && result.data) {
        setBanner({ type: "success", text: result.message ?? "Kaydedildi." })
        router.push("/articles")
        router.refresh()
      } else {
        setBanner({ type: "error", text: result.message ?? "Kayıt başarısız." })
      }
    })
  }

  const noSources = urlSources.length === 0 && documents.length === 0

  const aiBlocked = !aiStatus.ready

  useEffect(() => {
    if (sourceType !== "document" || !sourceId || topic.trim().length < 2) return

    let cancelled = false
    const timer = setTimeout(async () => {
      const result = await previewDocumentSource(sourceId, topic)
      if (!cancelled && result.ok && result.data) {
        setSourceContent(result.data.content)
      }
    }, 400)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [sourceType, sourceId, topic])

  return (
    <div className="grid gap-6 p-4 md:p-6 lg:grid-cols-2">
      {!aiStatus.ready ? (
        <div className="lg:col-span-2 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {aiStatus.message}{" "}
          <Link href="/settings" className="font-medium underline">
            Ayarlar
          </Link>
        </div>
      ) : (
        <p className="lg:col-span-2 text-sm text-muted-foreground">{aiStatus.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Makale üret
          </CardTitle>
          <CardDescription>
            Kaynak içeriği ve konuya göre Türkçe makale oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {noSources ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
              Önce{" "}
              <Link href="/sources" className="text-primary underline">
                kaynak URL
              </Link>{" "}
              veya{" "}
              <Link href="/uploads" className="text-primary underline">
                belge
              </Link>{" "}
              ekleyin.
            </p>
          ) : null}

          <div className="space-y-2">
            <Label>Kaynak türü</Label>
            <div className="flex gap-2">
              {(["url", "document"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={sourceType === type ? "default" : "outline"}
                  onClick={() => handleSourceTypeChange(type)}
                >
                  {type === "url" ? "URL" : "Belge"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceId">Kaynak</Label>
            <select
              id="sourceId"
              className={selectClass}
              value={sourceId}
              onChange={(e) => handleSourceChange(e.target.value)}
              disabled={noSources || sourceOptions.length === 0}
            >
              {sourceOptions.length === 0 ? (
                <option value="">Kaynak yok</option>
              ) : (
                sourceOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {"title" in opt ? opt.title : opt.fileName}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="topic">Konu</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value)
                setGenerated(null)
              }}
              placeholder="Makalenin odak konusu"
              disabled={noSources}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetLanguage">Hedef dil</Label>
            <Input id="targetLanguage" value="Türkçe (Turkish)" disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sourceContent">Kaynak içerik</Label>
            <textarea
              id="sourceContent"
              className={textareaClass}
              value={sourceContent}
              onChange={(e) => {
                setSourceContent(e.target.value)
                setGenerated(null)
              }}
              disabled={noSources}
            />
            <p className="text-xs text-muted-foreground">
              Ayrıştırılmış metin veya özet. En az 50 karakter gerekir.
            </p>
          </div>

          {banner ? (
            <p
              className={
                banner.type === "success"
                  ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
                  : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {banner.text}
            </p>
          ) : null}

          <Separator />

          <Button
            type="button"
            className="w-full"
            onClick={handleGenerate}
            disabled={
              aiBlocked ||
              noSources ||
              isGenerating ||
              !topic.trim() ||
              sourceContent.length < 50
            }
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Makale oluştur
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {generated ? (
          <>
            <ArticlePreview article={generated} />
            <Button
              type="button"
              className="w-full"
              onClick={handleSaveDraft}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Taslak olarak kaydet
            </Button>
          </>
        ) : (
          <Card className="border-dashed">
            <CardContent className="flex min-h-[320px] flex-col items-center justify-center gap-2 py-12 text-center text-sm text-muted-foreground">
              <Sparkles className="h-10 w-10 opacity-30" />
              <p>Üretilen makale burada önizlenecek.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
