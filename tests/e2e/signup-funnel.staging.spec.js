const { test, expect } = require('@playwright/test');

async function startToPlans(page) {
  await page.goto('/start/?source=playwright');
  await expect(page.getByRole('heading', { name: /Your business deserves more/i })).toBeVisible();
  await page.getByRole('button', { name: /Build My Card/i }).click();

  await page.locator('[data-industry="barber"]').click();
  await expect(page.locator('[data-industry="barber"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#industry-next').click();

  await page.locator('#business-name').fill('J&B Studio');
  await expect(page.locator('#preview-name-card')).toContainText('J&B Studio');
  await page.locator('#name-next').click();

  await page.locator('[data-goal="bookings"]').click();
  await page.locator('[data-goal="portfolio"]').click();
  await expect(page.locator('[data-goal="bookings"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#goals-next').click();

  await expect(page.getByRole('heading', { name: /isn’t just a card anymore/i })).toBeVisible();
  await page.locator('[data-demo="save"]').click();
  await expect(page.locator('#demo-toast')).toContainText(/Contact save/i);
  await page.locator('[data-action="aha-next"]').click();

  await expect(page.locator('#value-business')).toHaveText('J&B Studio');
  await page.locator('[data-action="plans"]').click();
  await expect(page.getByRole('heading', { name: /Recommended for you/i })).toBeVisible();
}

test.describe('LIW Cards interactive signup funnel staging', () => {
  test.beforeEach(async ({ page, context }) => {
    await context.clearCookies();
    await page.goto('/start/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('old guest builder redirects into the new standalone funnel', async ({ page }) => {
    await page.goto('/guest-builder.html?from=pricing');
    await page.waitForURL(/\/start\/?\?from=pricing/);
    await expect(page.getByRole('heading', { name: /Your business deserves more/i })).toBeVisible();
  });

  test('paid-first journey builds a personalized preview and preserves the paid selection through registration', async ({ page }) => {
    await startToPlans(page);

    const plus = page.locator('[data-plan-tab="plus"]');
    await expect(plus).toHaveClass(/is-active/);
    await expect(plus).toHaveClass(/is-recommended/);
    await expect(page.locator('#plan-detail')).toContainText('$49');
    await expect(page.locator('#plan-detail')).toContainText(/booking/i);

    await expect(page.locator('#stage-free')).not.toHaveClass(/is-active/);
    await page.locator('#paid-continue').click();

    await page.waitForURL(/register\.html\?.*next=pricing.*plan=plus.*from=funnel/, { timeout: 10_000 });
    await expect(page).not.toHaveURL(/guest=1/);
    await expect(page.locator('#register-card-title')).toContainText(/Create your account to continue/i);
    await expect(page.locator('#register-submit-copy')).toContainText(/continue to Plus/i);

    const storage = await page.evaluate(() => ({
      paidDraft: localStorage.getItem('liw_funnel_paid_draft_v1'),
      guestDraft: localStorage.getItem('liw_guest_card_draft_v1'),
      pendingPlan: sessionStorage.getItem('liw_cards_pending_plan'),
      next: sessionStorage.getItem('liw_cards_after_login')
    }));
    expect(storage.paidDraft).toBeTruthy();
    expect(storage.guestDraft).toBeFalsy();
    expect(storage.pendingPlan).toContain('plus');
    expect(storage.next).toBe('pricing');
  });

  test('Free is available only after the paid recommendation and keeps the guest-draft signup path', async ({ page }) => {
    await startToPlans(page);
    await expect(page.locator('#stage-free')).not.toHaveClass(/is-active/);

    await page.locator('[data-action="free-last"]').click();
    await expect(page.locator('#stage-free')).toHaveClass(/is-active/);
    await expect(page.getByRole('heading', { name: /Not ready for a paid plan/i })).toBeVisible();
    await expect(page.locator('#stage-free')).toContainText(/1 professional card/i);
    await expect(page.locator('#stage-free')).toContainText(/Classic \+ Showtime/i);

    await page.locator('#free-continue').click();
    await page.waitForURL(/register\.html\?.*guest=1.*from=funnel.*plan=starter/, { timeout: 10_000 });
    const guestDraft = await page.evaluate(() => localStorage.getItem('liw_guest_card_draft_v1'));
    expect(guestDraft).toBeTruthy();
  });

  test('mobile hero and core choices do not overflow the viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/start/?type=beauty&source=mobile-qa');
    await expect(page.getByRole('heading', { name: /Your business deserves more/i })).toBeVisible();

    const initialOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(initialOverflow).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: /Build My Card/i }).click();
    await expect(page.locator('[data-industry="beauty"]')).toHaveClass(/is-selected/);
    await page.locator('#industry-next').click();
    await page.locator('#business-name').fill('Rose Nail Studio');

    const mobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(mobileOverflow).toBeLessThanOrEqual(1);
    await expect(page.locator('#name-next')).toBeVisible();
  });
});