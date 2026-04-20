function randomBase36(length: number): string {
  const buffer = new Uint8Array(length)
  crypto.getRandomValues(buffer)
  return Array.from(buffer, (value) => (value % 36).toString(36)).join('')
}

export function createTidLikeId(now = Date.now()): string {
  return `${now.toString(36)}${randomBase36(8)}`
}

export function createOpaqueId(): string {
  return randomBase36(14)
}

export function slugify(input: string): string {
  const normalized = input
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized.length > 0 ? normalized : 'item'
}