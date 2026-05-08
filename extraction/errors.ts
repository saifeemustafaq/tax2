export class ExtractionError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "missing_key"
      | "unsupported_type"
      | "parse"
      | "validation"
      | "api",
  ) {
    super(message);
    this.name = "ExtractionError";
  }
}
