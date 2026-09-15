const fs = require('fs');
const path = require('path');
const v8toIstanbul = require('v8-to-istanbul');
const { createCoverageMap } = require('istanbul-lib-coverage');
const { test, expect } = require('@playwright/test');

const THRESHOLD = Number(process.env.COVERAGE_THRESHOLD || 80);
const AUTH_FILE = path.resolve('js/auth.js');

const supabaseStub = `
(() => {
  const params = () => new URLSearchParams(location.search);
  const err = message => ({ message });
  const user = email => ({ id: 'coverage-user-1', email: email || 'coverage@liwworgs.test' });
  window.__liwCoverageCalls = [];
  window.supabase = {
    createClient() {
      return {
        auth: {
          async signInWithPassword({ email }) {
            window.__liwCoverageCalls.push(['signInWithPassword', email]);
            if (params().get('mock_auth_error') === '1') return { data: {}, error: err('Invalid login for coverage test') };
            return { data: { user: user(email), session: { access_token: 'coverage' } }, error: null };
          },
          async signUp({ email }) {
            window.__liwCoverageCalls.push(['signUp', email]);
            if (params().get('mock_signup_error') === '1') return { data: {}, error: err('Signup failed for coverage test') };
            const session = params().get('mock_session') === '1' ? { access_token: 'coverage' } : null;
            return { data: { user: user(email), session }, error: null };
          },
          async signInWithOAuth() {
            window.__liwCoverageCalls.push(['signInWithOAuth']);
            if (params().get('mock_oauth_error') === '1') return { error: err('OAuth failed for coverage test') };
            return { error: null };
          },
          async resetPasswordForEmail(email) {
            window.__liwCoverageCalls.push(['resetPasswordForEmail', email]);
            if (params().get('mock_reset_error') === '1') return { error: err('Reset failed for coverage test') };
            return { error: null };
          },
          async signOut() {
            window.__liwCoverageCalls.push(['signOut']);
            return { error: null };
          }
        },
        async rpc(name) {
          window.__liwCoverageCalls.push(['rpc', name]);
          if (params().get('mock_rpc_error') === '1') return { error: err('Invite RPC failed for coverage test') };
          return { error: null };
        }
      };
    }
  };
})();
`;

async function installThirdPartyStubs(page) {
  await page.route(/https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@.*/, route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: supabaseStub })
  );
  await page.route(/https:\/\/unpkg\.com\/@supabase\/supabase-js@.*/, route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: supabaseStub })
  );
  await page.route(/https:\/\/unpkg\.com\/lucide@latest.*/, route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.lucide={createIcons(){}};' })
  );
  await page.route('**/js/referral.js*', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.LIWReferral={getCode:()=>'',preserveLinks:()=>{},syncUser:async()=>null};"
    })
  );
  await page.route('**/js/pwa-install.js*', route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
  );
}

async function captureScenario(browser, coverageMap, scenario) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await installThirdPartyStubs(page);

  if (scenario.init) {
    await page.addInitScript(scenario.init);
  }

  await page.coverage.startJSCoverage({ resetOnNavigation: false, reportAnonymousScripts: false });
  try {
    await page.goto(scenario.url, { waitUntil: 'domcontentloaded' });
    await scenario.run(page);
  } finally {
    const entries = await page.coverage.stopJSCoverage();
    for (const entry of entries.filter(item => /\/js\/auth\.js(?:\?|$)/.test(item.url))) {
      const converter = v8toIstanbul(AUTH_FILE, 0, { source: entry.source });
      await converter.load();
      converter.applyCoverage(entry.functions);
      coverageMap.merge(converter.toIstanbul());
    }
    await context.close();
  }
}

async function fillLogin(page, email = 'coverage@liwworgs.test') {
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill('CoveragePass123!');
}

async function fillRegister(page, email = 'coverage@liwworgs.test') {
  await page.locator('[name="full_name"]').fill('Coverage User');
  await page.locator('[name="email"]').fill(email);
  await page.locator('[name="password"]').fill('CoveragePass123!');
}

function guestDraftInit() {
  try {
    localStorage.setItem('liw_guest_card_draft_v1', JSON.stringify({
      card: { full_name: 'Guest Coverage Card' },
      products: [{ id: 'old-product' }],
      profileUrl: 'old-profile',
      coverUrl: 'old-cover'
    }));
  } catch (_) {}
}

function pricingInit() {
  try {
    sessionStorage.setItem('liw_cards_pending_plan', JSON.stringify({ plan: 'pro', interval: 'yearly' }));
  } catch (_) {}
}

test('critical auth journeys maintain at least 80% coverage', async ({ browser }) => {
  test.setTimeout(120_000);
  const coverageMap = createCoverageMap({});

  const scenarios = [
    {
      url: '/login.html?mock_auth_error=1',
      run: async page => {
        await page.locator('[data-password-toggle]').click();
        await expect(page.locator('[name="password"]')).toHaveAttribute('type', 'text');
        await page.locator('[data-password-toggle]').click();
        await fillLogin(page);
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Invalid login');
      }
    },
    {
      url: '/login.html',
      run: async page => {
        await fillLogin(page);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/dashboard\.html/, { timeout: 5_000 });
      }
    },
    {
      url: '/login.html?next=pricing',
      init: pricingInit,
      run: async page => {
        await fillLogin(page);
        await page.locator('button[type="submit"]').click();
        await page.waitForURL(/pricing\.html.*resume_plan=pro.*interval=yearly|pricing\.html.*interval=yearly.*resume_plan=pro/, { timeout: 5_000 });
      }
    },
    {
      url: '/login.html?mock_oauth_error=1',
      run: async page => {
        await page.locator('[data-oauth-provider="google"]').click();
        await expect(page.locator('#message')).toContainText('OAuth failed');
        await expect(page.locator('[data-oauth-provider="google"]')).toBeEnabled();
      }
    },
    {
      url: '/login.html',
      run: async page => {
        await page.locator('[data-oauth-provider="google"]').click();
        await expect(page.locator('[data-oauth-provider="google"]')).toBeDisabled();
      }
    },
    {
      url: '/register.html',
      run: async page => {
        await fillRegister(page);
        await page.locator('form[data-auth="register"]').evaluate(form => {
          form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
        });
        await expect(page.locator('#message')).toContainText('Please agree');
      }
    },
    {
      url: '/register.html',
      run: async page => {
        await fillRegister(page);
        await page.locator('[name="legal_acceptance"]').check();
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Check your email');
      }
    },
    {
      url: '/register.html?mock_signup_error=1',
      run: async page => {
        await fillRegister(page);
        await page.locator('[name="legal_acceptance"]').check();
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Signup failed');
      }
    },
    {
      url: '/register.html?guest=1&mock_session=1',
      init: guestDraftInit,
      run: async page => {
        await fillRegister(page);
        await page.locator('[name="legal_acceptance"]').check();
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Your card is ready');
        const claimed = await page.evaluate(() => ({
          guest: localStorage.getItem('liw_guest_card_draft_v1'),
          claimed: localStorage.getItem('liw_editor_draft_coverage-user-1_new')
        }));
        expect(claimed.guest).toBeNull();
        expect(claimed.claimed).toContain('Guest Coverage Card');
      }
    },
    {
      url: '/register.html?team_invite=1&email=invited%40liwworgs.test&mock_session=1',
      run: async page => {
        await fillRegister(page, 'invited@liwworgs.test');
        await page.locator('[name="legal_acceptance"]').check();
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('team invitation accepted');
      }
    },
    {
      url: '/register.html?team_invite=1&email=invited%40liwworgs.test',
      run: async page => {
        await fillRegister(page, 'wrong@liwworgs.test');
        await page.locator('[name="legal_acceptance"]').check();
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Create the account using the invited email');
      }
    },
    {
      url: '/login.html?team_invite=1&email=invited%40liwworgs.test',
      run: async page => {
        await fillLogin(page, 'wrong@liwworgs.test');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('invitation belongs to');
      }
    },
    {
      url: '/login.html?team_invite=1&email=invited%40liwworgs.test&mock_rpc_error=1',
      run: async page => {
        await fillLogin(page, 'invited@liwworgs.test');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('team invitation could not be connected');
      }
    },
    {
      url: '/forgot-password.html',
      run: async page => {
        await page.locator('[name="email"]').fill('coverage@liwworgs.test');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Password reset email sent');
      }
    },
    {
      url: '/forgot-password.html?mock_reset_error=1',
      run: async page => {
        await page.locator('[name="email"]').fill('coverage@liwworgs.test');
        await page.locator('button[type="submit"]').click();
        await expect(page.locator('#message')).toContainText('Reset failed');
      }
    }
  ];

  for (const scenario of scenarios) {
    await captureScenario(browser, coverageMap, scenario);
  }

  expect(coverageMap.files(), 'auth.js was not captured by Chromium coverage').toContain(AUTH_FILE);
  const summary = coverageMap.fileCoverageFor(AUTH_FILE).toSummary().data;
  const compact = Object.fromEntries(
    ['lines', 'statements', 'functions', 'branches'].map(metric => [metric, summary[metric].pct])
  );

  fs.mkdirSync('coverage', { recursive: true });
  fs.writeFileSync(
    'coverage/auth-coverage-summary.json',
    JSON.stringify({ threshold: THRESHOLD, file: 'js/auth.js', ...compact }, null, 2)
  );

  console.log(`LIW critical auth coverage (minimum ${THRESHOLD}%):`);
  console.table(compact);

  for (const [metric, pct] of Object.entries(compact)) {
    expect(pct, `${metric} coverage must be >= ${THRESHOLD}%`).toBeGreaterThanOrEqual(THRESHOLD);
  }
});
