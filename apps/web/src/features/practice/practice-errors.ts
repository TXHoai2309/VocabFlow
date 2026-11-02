export class PracticeClientError extends Error {
  constructor(readonly code: string) { super(code); }
}
