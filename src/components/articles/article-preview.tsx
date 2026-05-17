import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { GeneratedArticle } from "@/lib/ai/types"
import { countWords } from "@/lib/utils/slug"

type ArticlePreviewProps = {
  article: GeneratedArticle
}

export function ArticlePreview({ article }: ArticlePreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Önizleme</CardTitle>
        <CardDescription>
          {countWords(article.content)} kelime · slug:{" "}
          <code className="rounded bg-muted px-1 text-xs">{article.slug}</code>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold leading-tight">{article.title}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{article.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
            </Badge>
          ))}
        </div>

        <Separator />

        <div className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <p className="font-medium text-muted-foreground">SEO başlık</p>
            <p className="mt-1">{article.seoTitle}</p>
          </div>
          <div>
            <p className="font-medium text-muted-foreground">Meta açıklama</p>
            <p className="mt-1">{article.metaDescription}</p>
          </div>
        </div>

        <Separator />

        <article className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
            {article.content}
          </div>
        </article>
      </CardContent>
    </Card>
  )
}
