export class GameClientError extends Error { constructor(readonly code: string) { super(code); } }
