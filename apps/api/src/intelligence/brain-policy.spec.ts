import { brainActionPreview, brainDepth, brainFlags } from "./brain-policy";

describe("Brain V1 read-only policy", () => {
  it("defaults all capabilities off", () => {
    expect(brainFlags({})).toEqual({
      enabled: false,
      contextEnabled: false,
      graphEnabled: false,
      actionPlannerMode: "PREVIEW_ONLY",
    });
  });

  it("does not enable child capabilities without the Brain flag", () => {
    expect(brainFlags({ MIZANTRA_CONTEXT_ENGINE_ENABLED: "true", MIZANTRA_BUSINESS_GRAPH_ENABLED: "true" })).toMatchObject({ contextEnabled: false, graphEnabled: false });
  });

  it("cannot enable execution through configuration", () => {
    expect(brainFlags({ MIZANTRA_BRAIN_ENABLED: "true", MIZANTRA_ACTION_PLANNER_MODE: "EXECUTE" }).actionPlannerMode).toBe("PREVIEW_ONLY");
    expect(brainActionPreview()).toMatchObject({ executable: false, mode: "PREVIEW_ONLY" });
  });

  it.each([[-1, 0], [0, 0], [2, 2], [4, 4], [99, 4], [NaN, 4], ["99", 4]])("bounds graph depth %s to %s", (input, expected) => {
    expect(brainDepth(input)).toBe(expected);
  });
});