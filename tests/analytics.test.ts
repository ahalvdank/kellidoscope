// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { countEvent, countPageview } from "../src/lib/analytics";

afterEach(() => {
  delete window.goatcounter;
});

describe("countEvent", () => {
  it.each(["citation", "sec-link", "repo", "resume"] as const)(
    "calls goatcounter.count with { path: %s, event: true }",
    (name) => {
      const count = vi.fn();
      window.goatcounter = { count };
      countEvent(name);
      expect(count).toHaveBeenCalledTimes(1);
      expect(count).toHaveBeenCalledWith({ path: name, event: true });
    },
  );

  it("no-ops without window.goatcounter", () => {
    expect(window.goatcounter).toBeUndefined();
    expect(() => countEvent("citation")).not.toThrow();
  });

  it("no-ops when goatcounter has loaded without a count function", () => {
    window.goatcounter = {} as Window["goatcounter"];
    expect(() => countEvent("repo")).not.toThrow();
  });
});

describe("countPageview", () => {
  it("calls goatcounter.count with { path } and no event flag", () => {
    const count = vi.fn();
    window.goatcounter = { count };
    countPageview("/demos/10k-kb/q/ba-liquidity-and-debt-fy24-fy25/");
    expect(count).toHaveBeenCalledTimes(1);
    expect(count).toHaveBeenCalledWith({ path: "/demos/10k-kb/q/ba-liquidity-and-debt-fy24-fy25/" });
  });

  it("no-ops without window.goatcounter", () => {
    expect(() => countPageview("/x/")).not.toThrow();
  });
});
