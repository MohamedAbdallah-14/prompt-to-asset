import { describe, it, expect } from "vitest";
import { assertSafeSvg, checkSvgSafety, SvgRejectedError } from "./svg-sanitize.js";

const OK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="#0F172A"/></svg>`;

describe("assertSafeSvg", () => {
  it("accepts a plain shape-only SVG", () => {
    expect(() => assertSafeSvg(OK)).not.toThrow();
  });

  it("rejects <script>", () => {
    expect(() => assertSafeSvg(`<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>`)).toThrow(
      SvgRejectedError
    );
  });

  it("rejects <foreignObject>", () => {
    expect(() =>
      assertSafeSvg(`<svg viewBox="0 0 1 1"><foreignObject><div/></foreignObject></svg>`)
    ).toThrow(SvgRejectedError);
  });

  it("rejects onclick event handlers", () => {
    expect(() =>
      assertSafeSvg(`<svg viewBox="0 0 1 1"><rect onclick="alert(1)" width="1" height="1"/></svg>`)
    ).toThrow(SvgRejectedError);
  });

  it("rejects onload event handlers", () => {
    expect(() => assertSafeSvg(`<svg viewBox="0 0 1 1" onload="evil()"><rect/></svg>`)).toThrow(
      SvgRejectedError
    );
  });

  it("rejects javascript: URIs in href", () => {
    expect(() =>
      assertSafeSvg(`<svg viewBox="0 0 1 1"><a href="javascript:alert(1)"><rect/></a></svg>`)
    ).toThrow(SvgRejectedError);
  });

  it("rejects external <image href='http://…'>", () => {
    expect(() =>
      assertSafeSvg(
        `<svg viewBox="0 0 1 1"><image href="http://evil.example/x.png" width="1" height="1"/></svg>`
      )
    ).toThrow(SvgRejectedError);
  });

  it("rejects external <use href='https://…'>", () => {
    expect(() =>
      assertSafeSvg(`<svg viewBox="0 0 1 1"><use href="https://evil.example/symbol.svg#x"/></svg>`)
    ).toThrow(SvgRejectedError);
  });

  it("rejects protocol-relative references", () => {
    expect(() =>
      assertSafeSvg(
        `<svg viewBox="0 0 1 1"><image href="//evil.example/x.png" width="1" height="1"/></svg>`
      )
    ).toThrow(SvgRejectedError);
  });

  it("rejects CSS @import pulling a remote stylesheet", () => {
    expect(() =>
      assertSafeSvg(
        `<svg viewBox="0 0 1 1"><style>@import url("https://evil.example/evil.css");</style></svg>`
      )
    ).toThrow(SvgRejectedError);
  });

  it("rejects script-shaped data URIs", () => {
    expect(() =>
      assertSafeSvg(
        `<svg viewBox="0 0 1 1"><a href="data:text/javascript,alert(1)"><rect/></a></svg>`
      )
    ).toThrow(SvgRejectedError);
  });

  it("accepts inline <use href='#id'> (same-doc fragment)", () => {
    expect(() =>
      assertSafeSvg(`<svg viewBox="0 0 1 1"><symbol id="x"><rect/></symbol><use href="#x"/></svg>`)
    ).not.toThrow();
  });

  it("accepts currentColor strokes and transforms", () => {
    expect(() =>
      assertSafeSvg(
        `<svg viewBox="0 0 24 24"><path d="M1 1h22" stroke="currentColor" transform="translate(0,1)"/></svg>`
      )
    ).not.toThrow();
  });

  it("checkSvgSafety returns structured report without throwing", () => {
    const r = checkSvgSafety(`<svg><script>x</script></svg>`);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/script/i);
  });
});
