import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  estimatedCostUsd,
  assertWithinBudget,
  costSummary,
  CostBudgetExceededError
} from "./cost-guard.js";

describe("cost-guard", () => {
  const key = "P2A_MAX_SPEND_USD_PER_RUN";
  let prior: string | undefined;

  beforeEach(() => {
    prior = process.env[key];
    delete process.env[key];
  });

  afterEach(() => {
    if (prior === undefined) delete process.env[key];
    else process.env[key] = prior;
  });

  it("returns a known price for a known model", () => {
    expect(estimatedCostUsd("gpt-image-1")).toBeCloseTo(0.19, 2);
    expect(estimatedCostUsd("ideogram-3-turbo")).toBeCloseTo(0.05, 2);
  });

  it("multiplies by image count", () => {
    expect(estimatedCostUsd("gpt-image-1", 10)).toBeCloseTo(1.9, 2);
  });

  it("returns null for an unknown model (fail-open)", () => {
    expect(estimatedCostUsd("totally-made-up-model")).toBeNull();
  });

  it("reports $0 for zero-key / free-tier routes", () => {
    expect(estimatedCostUsd("pollinations-flux", 5)).toBe(0);
    expect(estimatedCostUsd("hf-flux-schnell", 3)).toBe(0);
  });

  it("no-ops when budget is unset", () => {
    expect(() => assertWithinBudget({ modelId: "gpt-image-1", images: 100 })).not.toThrow();
  });

  it("throws when over budget", () => {
    process.env[key] = "0.25";
    expect(() => assertWithinBudget({ modelId: "gpt-image-1", images: 5 })).toThrow(
      CostBudgetExceededError
    );
  });

  it("allows under budget", () => {
    process.env[key] = "5";
    expect(() => assertWithinBudget({ modelId: "gpt-image-1", images: 2 })).not.toThrow();
  });

  it("fail-open on unknown model", () => {
    process.env[key] = "0.01";
    expect(() => assertWithinBudget({ modelId: "unknown", images: 100 })).not.toThrow();
  });

  it("invalid budget values are treated as unset", () => {
    process.env[key] = "bogus";
    expect(() => assertWithinBudget({ modelId: "gpt-image-1", images: 100 })).not.toThrow();
  });

  it("costSummary reports 'free-tier' for $0 routes", () => {
    const s = costSummary({ modelId: "pollinations-flux", images: 3 });
    expect(s).toMatch(/free-tier|zero-key/i);
  });

  it("costSummary includes the estimate and budget when both are known", () => {
    process.env[key] = "1";
    const s = costSummary({ modelId: "gpt-image-1", images: 2 });
    expect(s).toContain("$");
    expect(s).toMatch(/cap: \$1\.00/);
  });
});
