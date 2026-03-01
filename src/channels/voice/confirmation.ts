const normalize = (value: string): string => value.trim().toLowerCase();

export class ConfirmationHandler {
  constructor(
    private readonly confirmationKeywords: string[],
    private readonly cancelKeywords: string[],
  ) {}

  isConfirm(text: string): boolean {
    const normalized = normalize(text);
    return this.confirmationKeywords.some((keyword) => normalize(keyword) === normalized);
  }

  isCancel(text: string): boolean {
    const normalized = normalize(text);
    return this.cancelKeywords.some((keyword) => normalize(keyword) === normalized);
  }
}
