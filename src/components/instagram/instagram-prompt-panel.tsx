"use client"

import { useEffect, useState, useTransition } from "react"
import { Loader2, RefreshCw, Save, Sparkles } from "lucide-react"

import {
  regenerateInstagramImagePrompts,
  saveInstagramImagePrompts,
} from "@/lib/actions/instagram"
import type { InstagramDraftDetail } from "@/lib/data/instagram"
import { IMAGE_STYLE_PRESETS } from "@/lib/image-generation/prompts/style-presets"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

const selectClass =
  "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

type InstagramPromptPanelProps = {
  draft: InstagramDraftDetail
  articleId: string
  onActionResult: (result: { ok: boolean; message?: string }) => void
  disabled?: boolean
}

export function InstagramPromptPanel({
  draft,
  articleId,
  onActionResult,
  disabled = false,
}: InstagramPromptPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [stylePreset, setStylePreset] = useState(draft.imageStylePreset ?? "cinematic_tech")
  const [visualDirection, setVisualDirection] = useState(draft.visualDirection)
  const [postImagePrompt, setPostImagePrompt] = useState(draft.postImagePrompt)

  useEffect(() => {
    setStylePreset(draft.imageStylePreset ?? "cinematic_tech")
    setVisualDirection(draft.visualDirection)
    setPostImagePrompt(draft.postImagePrompt)
  }, [draft])

  function runRegenerate() {
    startTransition(async () => {
      const result = await regenerateInstagramImagePrompts(articleId, stylePreset)
      onActionResult(result)
    })
  }

  function runSave() {
    startTransition(async () => {
      const result = await saveInstagramImagePrompts(draft.id, {
        imageStylePreset: stylePreset,
        visualDirection,
        postImagePrompt,
      })
      onActionResult(result)
    })
  }

  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4" />
          Gönderi görsel promptu
        </CardTitle>
        <CardDescription>
          Makaleyi görsel olarak özetleyen eğitim tarzı kare (üretim 1024², yayın 1080²). Story ve carousel kullanılmıyor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-sm">
          <Label htmlFor="style-preset">Stil ön ayarı</Label>
          <select
            id="style-preset"
            className={selectClass}
            value={stylePreset}
            onChange={(e) => setStylePreset(e.target.value)}
            disabled={disabled || isPending}
          >
            {IMAGE_STYLE_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="visual-direction">Visual direction</Label>
          <textarea
            id="visual-direction"
            className="min-h-[72px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            value={visualDirection}
            onChange={(e) => setVisualDirection(e.target.value)}
            disabled={disabled || isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="post-prompt">Post image prompt (1024×1024)</Label>
          <textarea
            id="post-prompt"
            className="min-h-[160px] w-full rounded-md border border-input bg-muted/30 px-3 py-2 font-mono text-xs"
            value={postImagePrompt}
            onChange={(e) => setPostImagePrompt(e.target.value)}
            disabled={disabled || isPending}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || isPending}
            onClick={runRegenerate}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Prompt&apos;u Yeniden Üret
          </Button>
          <Button type="button" disabled={disabled || isPending} onClick={runSave}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Kaydet
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
