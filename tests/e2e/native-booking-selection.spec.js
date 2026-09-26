const { test, expect } = require('@playwright/test');

// Mock every booking RPC: this test never writes a real appointment.
async function setup(page, realtor = false) {
  await page.route('**/card.html?slug=booking-selection-test', route => route.fulfill({
    status: 200, contentType: 'text/html',
    body: '<!doctype html><html><head><link rel="stylesheet" href="/css/public-booking-v1-staging.css"></head><body><section id="services-section"></section><section id="products-section"></section><div id="branding"></div>' +
      (realtor ? '<div id="realtor-booking-dialog-body"></div>' : '') + '</body></html>'
  }));
  await page.goto('/card.html?slug=booking-selection-test');
  await page.evaluate(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    const day = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    window.bookingTest = { day, slot: day + '\\"T\\"13:30:00+00', calls: [] };
    window.supabaseClient = { rpc: async (name, args) => {
      window.bookingTest.calls.push({ name, args });
      if (name === 'booking_public_bootstrap') return { data: { ok: true, enabled: true, mode: 'booking',
        timezone: 'America/New_York', days_ahead: 30, services: [
          { id: 'notary', name: 'Notary', duration_minutes: 30 },
          { id: 'showing', name: 'Property Showing', duration_minutes: 30 }] }, error: null };
      if (name === 'booking_available_slots' || name === 'realtor_showing_slots_staging') return { data: { ok: true,
        slots: [{ start_at: window.bookingTest.slot, label: '9:30 AM' }] }, error: null };
      if (name === 'booking_create_appointment_v2' || name === 'realtor_book_showing_staging') return { data: {
        ok: true, appointment_id: '00000000-0000-0000-0000-000000000001',
        manage_token: '00000000-0000-0000-0000-000000000002',
        start_at: window.bookingTest.slot, timezone: 'America/New_York',
        service_name: (name === 'realtor_book_showing_staging' || args.p_service_id === 'showing') ? 'Property Showing' : 'Notary'
      }, error: null };
      throw new Error('Unexpected RPC ' + name);
    }};
  });
  await page.addScriptTag({ path: 'js/public-booking-v1-staging.js' });
  await expect(page.locator('#booking-v1-form')).toBeVisible();
}

async function bookTomorrow(page) {
  await page.locator('#booking-v1-date').fill(await page.evaluate(() => window.bookingTest.day));
  await page.locator('#booking-v1-date').dispatchEvent('change');
  const slot = page.locator('[data-booking-slot]').first();
  await expect(slot).toBeVisible();
  await slot.click();
  await expect(slot).toHaveClass(/active/);
  await expect(slot).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#booking-v1-selected-time')).toContainText('9:30 AM');
  await page.locator('#booking-v1-name').fill('Sample Buyer');
  await page.locator('#booking-v1-email').fill('buyer@example.test');
  await page.locator('#booking-v1-submit').click();
  await expect(page.locator('#booking-v1-section')).toContainText('Appointment confirmed');
  await expect(page.locator('#booking-v1-section')).not.toContainText('Invalid Date');
  await expect(page.locator('#booking-v1-section a[href^="appointment.html?token="]')).toBeVisible();
  return page.evaluate(() => window.bookingTest.calls.find(x => x.name === 'booking_create_appointment_v2' || x.name === 'realtor_book_showing_staging'));
}

test('service and time selections stay visible; malformed DB date is normalized', async ({ page }) => {
  await setup(page);
  const notary = page.locator('[data-booking-service="notary"]');
  const showing = page.locator('[data-booking-service="showing"]');
  await expect(notary).toHaveAttribute('aria-pressed', 'false');
  await expect(showing).toHaveAttribute('aria-pressed', 'false');
  await showing.click();
  await expect(showing).toHaveClass(/active/);
  await expect(showing).toHaveAttribute('aria-pressed', 'true');
  const background = await showing.evaluate(el => getComputedStyle(el).backgroundColor);
  expect(background).not.toBe('rgba(0, 0, 0, 0)');
  const call = await bookTomorrow(page);
  expect(call.args.p_service_id).toBe('showing');
  expect(call.args.p_environment).toBe('staging');
  expect(call.args.p_start_at).toMatch(/T13:30:00\.000Z$/);
});

test('Realtor showing uses listing as selection, not a second service picker', async ({ page }) => {
  await setup(page, true);
  const result = await page.evaluate(() => window.LIWNativeBookingV1.openForListing({
    id: 'listing-1', address: '217 Hemlock St, Brooklyn, NY', serviceId: 'showing'
  }));
  expect(result).toEqual({ ok: true, mode: 'booking' });
  await expect(page.locator('#booking-v1-section [data-booking-service]')).toHaveCount(0);
  await expect(page.locator('#booking-v1-section')).toContainText('217 Hemlock St');
  const call = await bookTomorrow(page);
  const slotsCall = await page.evaluate(() => window.bookingTest.calls.find(x => x.name === 'realtor_showing_slots_staging'));
  expect(slotsCall.args.p_listing_id).toBe('listing-1');
  expect(call.name).toBe('realtor_book_showing_staging');
  expect(call.args.p_listing_id).toBe('listing-1');
  expect(call.args.p_start_at).toMatch(/T13:30:00\.000Z$/);
});
