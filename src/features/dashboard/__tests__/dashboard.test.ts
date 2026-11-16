import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { DONATION_ROUTES } from '../../../config/donationRoutes.js';
import { SHELTER_ROUTES } from '../../../config/shelterRoutes.js';

test('Dashboard Destinations: Each role sees exactly the expected destinations', () => {
  // Test destinations for users without a registered shelter
  const getDestinations = (hasShelter: boolean) => [
    { title: 'Choose a gift', route: DONATION_ROUTES.CATALOG },
    { title: 'My gifts', route: DONATION_ROUTES.MY_DONATIONS },
    { title: 'Browse shelters', route: SHELTER_ROUTES.BROWSE },
    {
      title: hasShelter ? 'My shelter status' : 'Register your shelter',
      route: hasShelter ? SHELTER_ROUTES.STATUS : SHELTER_ROUTES.REGISTER,
    },
  ];

  const standardLinks = getDestinations(false);
  assert.equal(standardLinks.length, 4, 'Must have exactly 4 navigation destinations');
  assert.equal(standardLinks[0].route, '/gifts');
  assert.equal(standardLinks[1].route, '/my-donations');
  assert.equal(standardLinks[2].route, '/shelters');
  assert.equal(standardLinks[3].route, '/shelter/register');

  const shelterOwnerLinks = getDestinations(true);
  assert.equal(shelterOwnerLinks.length, 4, 'Must have exactly 4 navigation destinations');
  assert.equal(shelterOwnerLinks[0].route, '/gifts');
  assert.equal(shelterOwnerLinks[1].route, '/my-donations');
  assert.equal(shelterOwnerLinks[2].route, '/shelters');
  assert.equal(shelterOwnerLinks[3].route, '/shelter/status');
});

test('Dashboard Security & Purity: No storage APIs, no dangerouslySetInnerHTML, no logging', () => {
  const dashboardCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/features/dashboard/DashboardPage.tsx'),
    'utf-8'
  );

  // Assert no browser storage used
  assert.equal(
    dashboardCode.includes('localStorage'),
    false,
    'Dashboard must not use localStorage'
  );
  assert.equal(
    dashboardCode.includes('sessionStorage'),
    false,
    'Dashboard must not use sessionStorage'
  );

  // Assert no dangerouslySetInnerHTML
  assert.equal(
    dashboardCode.includes('dangerouslySetInnerHTML'),
    false,
    'Dashboard must not use dangerouslySetInnerHTML'
  );

  // Assert no console.log telemetry
  assert.equal(
    dashboardCode.includes('console.log'),
    false,
    'Dashboard must not emit console.log statements'
  );

  // Assert cards are rendered as semantic Links
  assert.match(
    dashboardCode,
    /<Link\s+to=\{DONATION_ROUTES\.CATALOG\}\s+className="pf-dash-card"/,
    'Choose a gift must be a Link card'
  );
  assert.match(
    dashboardCode,
    /<Link\s+to=\{DONATION_ROUTES\.MY_DONATIONS\}\s+className="pf-dash-card"/,
    'My gifts must be a Link card'
  );
  assert.match(
    dashboardCode,
    /<Link\s+to=\{SHELTER_ROUTES\.BROWSE\}\s+className="pf-dash-card"/,
    'Browse shelters must be a Link card'
  );
});

test('Landing Page Headline: Contains exact new string and no longer contains umbrella headline', () => {
  const landingCode = fs.readFileSync(
    path.resolve(process.cwd(), 'src/features/landing/LandingPage.tsx'),
    'utf-8'
  );

  // Check new headline
  const expectedText = 'Connecting every paw to its perfect hands.';
  assert.equal(
    landingCode.includes(expectedText),
    true,
    `LandingPage must contain exact string: "${expectedText}"`
  );

  // Check old headline is completely removed from heading
  assert.equal(
    landingCode.includes('Be the umbrella a shelter animal needs.'),
    false,
    'LandingPage must not contain "Be the umbrella a shelter animal needs."'
  );
});
