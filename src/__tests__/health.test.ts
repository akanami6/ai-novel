describe('Phase 0 — Smoke Test', () => {
  it('should pass a basic sanity check', () => {
    expect(1 + 1).toBe(2);
  });

  it('should count CJK characters correctly', () => {
    const text = '这是一段测试文本';
    const cjkCount = [...text].filter((c) => {
      const code = c.codePointAt(0);
      return code != null && code >= 0x4e00 && code <= 0x9fff;
    }).length;
    expect(cjkCount).toBe(8); // 这是一段测试文本 = 8 CJK chars
  });

  it('should verify the project name', () => {
    expect('ai-novel').toMatch(/^[a-z][a-z0-9-]*$/);
  });
});
