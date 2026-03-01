import { describe, expect, it } from "vitest";
import { ConfirmationHandler } from "./confirmation.js";

describe("ConfirmationHandler", () => {
  const handler = new ConfirmationHandler(["confirm", "确认"], ["cancel", "取消"]);

  it("matches confirmation keywords", () => {
    expect(handler.isConfirm("确认")).toBe(true);
    expect(handler.isConfirm("  confirm  ")).toBe(true);
  });

  it("matches cancel keywords", () => {
    expect(handler.isCancel("取消")).toBe(true);
    expect(handler.isCancel("cancel")).toBe(true);
  });
});
