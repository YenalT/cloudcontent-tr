import Link from "next/link"
import { Plus } from "lucide-react"

import { PageHeader } from "@/components/shared/page-header"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getArticles } from "@/lib/data/articles"
import { formatDate } from "@/lib/utils"

export const dynamic = "force-dynamic"

export default async function ArticlesPage() {
  const articles = await getArticles()

  return (
    <>
      <PageHeader
        title="Makaleler"
        description="Oluşturulan ve yayınlanan içerikler"
        actions={
          <Button asChild>
            <Link href="/articles/new">
              <Plus className="h-4 w-4" />
              Yeni Makale
            </Link>
          </Button>
        }
      />
      <div className="p-4 md:p-6">
        <Card>
          <CardHeader>
            <CardTitle>Tüm makaleler</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {articles.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Henüz makale yok.{" "}
                <Link href="/articles/new" className="text-primary underline">
                  İlk makaleyi oluşturun
                </Link>
                .
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Başlık</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Kelime</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Oluşturulma</TableHead>
                    <TableHead className="text-right">Instagram</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map((article) => (
                    <TableRow key={article.id}>
                      <TableCell className="font-medium">{article.title}</TableCell>
                      <TableCell className="text-muted-foreground">{article.sourceLabel}</TableCell>
                      <TableCell>{article.wordCount}</TableCell>
                      <TableCell>
                        <StatusBadge status={article.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(article.createdAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/instagram?articleId=${article.id}`}>Taslak</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
