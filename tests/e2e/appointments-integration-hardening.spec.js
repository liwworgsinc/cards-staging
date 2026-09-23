const { test, expect } = require('@playwright/test');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const root = resolve(__dirname, '../..');
const read = path => readFileSync(resolve(root, path), 'utf8');

test.describe('Appointments integration hardening', () => {
  test('public booking loader mounts one shared booking engine plus experience bridge', async () => {
    const loader = read('js/public-booking-mode-v2-loader-staging.js');
    expect(loader).toContain('public-booking-v1-staging.js?v=20260922-integration-hardening-1');
    expect(loader).toContain('public-experience-booking-bridge-staging.js?v=20260922-integration-hardening-1');
    expect(loader).toContain("if(new URLSearchParams(location.search).get('embed')==='1')return");
  });

  test('public booking traffic is isolated to staging RPCs', async () => {
    const v1 = read('js/public-booking-v1-staging.js');
    const v2 = read('js/public-booking-v2-staging.js');
    expect(v1).toContain("rpc('booking_available_slots_staging_v3'");
    expect(v1).toContain("rpc('booking_submit_request_staging_v3'");
    expect(v2).toContain("originalRpc('booking_create_appointment_staging_v3'");
    expect(v2).not.toContain("originalRpc('booking_create_appointment_v2'");
  });

  test('appointment manage actions are staging scoped', async () => {
    const manage = read('js/booking-manage-v2-staging.js');
    for (const rpc of [
      'booking_manage_lookup_staging_v3',
      'booking_manage_available_slots_staging_v3',
      'booking_reschedule_staging_v3',
      'booking_cancel_staging_v3'
    ]) expect(manage).toContain(rpc);
  });

  test('custom Realtor and Restaurant experiences share native booking engine', async () => {
    const bridge = read('js/public-experience-booking-bridge-staging.js');
    const restaurant = read('js/restaurant-public-v1-staging.js');
    expect(bridge).toContain('#realtor-public-shell');
    expect(bridge).toContain('#restaurant-public-shell');
    expect(bridge).toContain('sectionRef');
    expect(bridge).toContain('data-realtor-booking-host');
    expect(bridge).toContain('data-restaurant-booking-host');
    expect(restaurant).toContain('data-rest-reserve');
  });

  test('public preview loads same hardened booking runtime', async () => {
    const preview = read('card-preview.html');
    expect(preview).toContain('public-booking-mode-v2-loader-staging.js?v=20260922-integration-hardening-1');
    expect(preview).toContain('restaurant-public-v1-staging.js?v=20260922-booking-hardening-1');
  });

  test('database hardening isolates environment and rejects stale Google busy cache', async () => {
    const sql = read('sql/booking-integration-hardening-v3-staging.sql');
    expect(sql).toContain("source_environment='staging'");
    expect(sql).toContain("c.status='connected'");
    expect(sql).toContain("s.last_busy_sync_at >= now()-interval '10 minutes'");
    expect(sql).toContain("b.fetched_at >= now()-interval '10 minutes'");
    expect(sql).toContain("'staging:'||v_card.id::text");
    expect(sql).toContain("'confirmed','staging'");
  });

  test('Google reconnect state is explicit and cache busted', async () => {
    const google = read('js/booking-google-calendar-v1-staging.js');
    const appointments = read('appointments.html');
    expect(google).toContain("Google authorization expired.");
    expect(google).toContain("Reconnect Google Calendar");
    expect(appointments).toContain('booking-google-calendar-v1-staging.js?v=20260922-integration-hardening-1');
  });
});
