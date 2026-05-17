"use client"

import { AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function SourcesError({
  message = "Kaynaklar yüklenirken bir hata oluştu.",
}: {
  message?: string
}) {
  return (
    <div className="p-4 md:p-6">
      <Card className="border-destructive/30">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="font-medium">Veri yüklenemedi</p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">{message}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Tekrar dene
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
