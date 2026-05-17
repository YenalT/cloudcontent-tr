export class InstagramGraphError extends Error {
  readonly code = "INSTAGRAM_GRAPH_ERROR"
  readonly statusCode?: number
  readonly graphError?: unknown

  constructor(message: string, statusCode?: number, graphError?: unknown) {
    super(message)
    this.name = "InstagramGraphError"
    this.statusCode = statusCode
    this.graphError = graphError
  }
}

export class InstagramGraphConfigError extends Error {
  readonly code = "INSTAGRAM_GRAPH_CONFIG_ERROR"

  constructor(message: string) {
    super(message)
    this.name = "InstagramGraphConfigError"
  }
}

export function isInstagramGraphError(error: unknown): error is InstagramGraphError {
  return error instanceof InstagramGraphError
}
