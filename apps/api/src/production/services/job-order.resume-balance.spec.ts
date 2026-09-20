import { openingCompletedBalance } from "./job-order.service";

describe("remaining production opening balance", () => {
  it("carries 40 confirmed pieces into an empty 50-piece stage", () => {
    expect(openingCompletedBalance(40, 0)).toBe(40);
  });

  it("does not duplicate a balance already recorded at the stage", () => {
    expect(openingCompletedBalance(40, 40)).toBe(0);
  });

  it("tops up only the missing part of a partially recorded stage", () => {
    expect(openingCompletedBalance(40, 25)).toBe(15);
  });
});
