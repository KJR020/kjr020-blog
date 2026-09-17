import { expect, test } from "playwright/test";

test.describe("記事脚注スタイル", () => {
  test("GFM脚注が記事デザインに馴染むスタイルで表示される", async ({ page }) => {
    await page.goto("/posts/__test/article");

    const footnotes = page.locator(".prose [data-footnotes]");
    await expect(footnotes).toBeVisible();

    const label = footnotes.locator("#footnote-label");
    await expect(label).toHaveText("脚注");
    await expect(label).toBeVisible();

    const labelStyles = await label.evaluate((element) => {
      const styles = getComputedStyle(element);
      const iconStyles = getComputedStyle(element, "::before");

      return {
        display: styles.display,
        iconBackgroundColor: iconStyles.backgroundColor,
        iconBorderRadius: iconStyles.borderRadius,
        iconContent: iconStyles.content,
        iconFontSize: iconStyles.fontSize,
        position: styles.position,
      };
    });
    expect(labelStyles.display).toBe("flex");
    expect(labelStyles.iconBackgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(labelStyles.iconBorderRadius).toBe("0px");
    expect(labelStyles.iconContent).toBe('"※"');
    expect(Number.parseFloat(labelStyles.iconFontSize)).toBeGreaterThanOrEqual(20);
    expect(labelStyles.position).not.toBe("absolute");

    const sectionStyles = await footnotes.evaluate((element) => {
      const styles = getComputedStyle(element);

      return {
        borderTopStyle: styles.borderTopStyle,
        borderTopWidth: styles.borderTopWidth,
      };
    });
    expect(sectionStyles.borderTopStyle).toBe("solid");
    expect(Number.parseFloat(sectionStyles.borderTopWidth)).toBeGreaterThan(0);

    const reference = page.locator(".prose [data-footnote-ref]").first();
    await expect(reference).toBeVisible();

    const referenceStyles = await reference.evaluate((element) => {
      const styles = getComputedStyle(element);

      return {
        backgroundColor: styles.backgroundColor,
        borderRadius: styles.borderRadius,
        display: styles.display,
        fontSize: styles.fontSize,
        fontWeight: styles.fontWeight,
        prefix: getComputedStyle(element, "::before").content,
        suffix: getComputedStyle(element, "::after").content,
        textDecorationLine: styles.textDecorationLine,
      };
    });
    expect(referenceStyles.display).toBe("inline-flex");
    expect(referenceStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(Number.parseFloat(referenceStyles.borderRadius)).toBeGreaterThan(0);
    expect(Number.parseFloat(referenceStyles.borderRadius)).toBeLessThan(8);
    expect(Number.parseFloat(referenceStyles.fontSize)).toBeGreaterThan(12);
    expect(referenceStyles.fontWeight).toBe("500");
    expect(referenceStyles.prefix).toBe('"["');
    expect(referenceStyles.suffix).toBe('"]"');
    expect(referenceStyles.textDecorationLine).toBe("none");

    const backReference = footnotes.locator("[data-footnote-backref]").first();
    await expect(backReference).toBeVisible();

    const backReferenceStyles = await backReference.evaluate((element) => {
      const styles = getComputedStyle(element);

      return {
        borderTopStyle: styles.borderTopStyle,
        backgroundColor: styles.backgroundColor,
        display: styles.display,
        fontWeight: getComputedStyle(element, "::before").fontWeight,
        symbol: getComputedStyle(element, "::before").content,
      };
    });
    expect(backReferenceStyles.display).toBe("inline-flex");
    expect(backReferenceStyles.borderTopStyle).toBe("none");
    expect(backReferenceStyles.backgroundColor).not.toBe("rgba(0, 0, 0, 0)");
    expect(backReferenceStyles.fontWeight).toBe("500");
    expect(backReferenceStyles.symbol).toContain("↩");
  });

  test("脚注内容を参照位置で確認し、戻る操作ではプレビューを開かない", async ({
    page,
  }) => {
    await page.goto("/posts/__test/article");

    const reference = page.locator(".prose [data-footnote-ref]").first();
    const referenceWrapper = reference.locator("xpath=..");
    const preview = referenceWrapper.locator('[role="tooltip"]');

    await expect(referenceWrapper).toHaveAttribute("id", "user-content-fnref-fixture");
    await expect(reference).not.toHaveAttribute("id", /.+/);
    await reference.hover();
    await expect(preview).toBeVisible();
    await expect(preview).toContainText("固定fixtureに含めた脚注の説明です");

    await reference.click();
    const backReference = page.locator(".prose [data-footnote-backref]").first();
    await backReference.click();

    await expect(page).toHaveURL(/#user-content-fnref-fixture$/);
    await expect(preview).toBeHidden();
  });
});
