const TR_MAP: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  Ç: "c",
  Ğ: "g",
  İ: "i",
  Ö: "o",
  Ş: "s",
  Ü: "u",
}

export function slugify(text: string) {
  let result = text.trim().toLowerCase()

  for (const [from, to] of Object.entries(TR_MAP)) {
    result = result.replaceAll(from, to)
  }

  return result
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
}

export function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length
}
