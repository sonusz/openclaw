export interface SummaryBuilder {
  summarize(items: string[]): Promise<string>;
}

export class SimpleSummaryBuilder implements SummaryBuilder {
  async summarize(items: string[]): Promise<string> {
    if (items.length === 0) {
      return "No notable decisions were made.";
    }
    return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
  }
}
