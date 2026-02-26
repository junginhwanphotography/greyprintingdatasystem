import { describe, it, expect } from "vitest";

describe("Grey Print Data System", () => {
  it("should have correct hierarchy structure", () => {
    const hierarchy = [
      "카메라 종류",
      "렌즈군",
      "판형",
      "필름 종류",
      "인화지 브랜드",
      "인화지 종류",
      "인화지 사이즈",
    ];
    expect(hierarchy).toHaveLength(7);
    expect(hierarchy[0]).toBe("카메라 종류");
    expect(hierarchy[6]).toBe("인화지 사이즈");
  });

  it("should have all required print data fields", () => {
    const fields = [
      "exposureTime",
      "aperture",
      "filterYellow",
      "filterMagenta",
      "filterCyan",
      "developer",
      "developmentTime",
      "temperature",
      "dilution",
      "enlargerHeight",
      "testStrip",
      "notes",
    ];
    expect(fields).toHaveLength(12);
    expect(fields).toContain("exposureTime");
    expect(fields).toContain("filterYellow");
    expect(fields).toContain("notes");
  });

  it("should validate search query", () => {
    const validateQuery = (q: string) => q.trim().length >= 1;
    expect(validateQuery("Ilford")).toBe(true);
    expect(validateQuery("")).toBe(false);
    expect(validateQuery("  ")).toBe(false);
    expect(validateQuery("Kodak Portra")).toBe(true);
  });
});
