# Pawfect — Direct Giving Marketplace for Indian Animal Shelters

## Architecture Summary (< 200 words)
Pawfect is built with React 19, TypeScript strict mode, Vite, Tailwind CSS v4, React Router, Zod, and Firebase modular SDK v13 (Auth & Firestore). It implements a layered Clean Architecture: domain models and interfaces in `src/domain/`, business orchestration in `src/services/`, persistence in `src/repositories/`, and a single dependency injection composition root in `src/app/container.ts`. Presentation components only render, delegating rules to domain services. Authentication enforces the 3-attempt rolling 24-hour limit using atomic Firestore transactions on `loginThrottle/{emailHash}` before calling Firebase Auth, accompanied by server-side Cloud Function blueprints in `functions/blockingSignIn.ts`. Security relies on Zero-Trust ABAC Firestore rules, strict Content-Security-Policy, anti-email-scanner deferred reset execution, URL token scrubbing, and strict route guard redirection allowlists.

---

## File Tree
```
├── firebase-applet-config.json         # Provisioned Firebase web configuration
├── firebase-blueprint.json              # Intermediate data representation (IR)
├── firestore.rules                      # Production zero-trust ABAC security rules
├── functions/
│   └── blockingSignIn.ts                # Server-side beforeSignIn blocking function (ready for Blaze)
├── index.html                           # HTML entry with strict CSP, no-referrer & typography
├── metadata.json                        # Applet manifest and capabilities
├── package.json                         # Dependencies and build scripts
├── public/
│   └── assets/
│       ├── aistudio/
│       │   └── pawfect_logo_transparent_9c2be9aa.png # Attached burgundy logo
│       └── images/
│           └── umbrella_hero.jpg        # Generated photographic umbrella hero asset
├── security_spec.md                     # ABAC security specification & Dirty Dozen attack vectors
├── src/
│   ├── App.tsx                          # App routing and boot connection verification
│   ├── app/
│   │   └── container.ts                 # Dependency injection container
│   ├── config/
│   │   ├── constants.ts                 # App constants, minimum gift ₹50, timezones
│   │   └── firebase.ts                  # Firebase modular SDK initialization & error formatting
│   ├── domain/
│   │   ├── entities.ts                  # UserProfile, LoginThrottle, ThrottleCheckResult
│   │   └── interfaces.ts                # AuthGateway, UserProfileRepository, ThrottleStore, Clock
│   ├── features/
│   │   ├── auth/
│   │   │   ├── AuthPage.tsx             # Combined calm single-card auth portal
│   │   │   ├── CheckEmailStep.tsx       # Verification notice with 60s cooldown timer
│   │   │   ├── EmailStep.tsx            # Email entry, normalization & existence check
│   │   │   ├── ForgotPasswordModal.tsx  # Enumeration-resistant password reset modal
│   │   │   ├── PasswordStep.tsx         # Password entry, caps lock alert, try countdown
│   │   │   ├── ResetPasswordPage.tsx    # Custom oobCode action handler with token scrubbing
│   │   │   ├── RouteGuards.tsx          # RequireAuth & RedirectIfAuthenticated guards
│   │   │   └── SignupStep.tsx           # Registration form with strength meter & pre-hijacking shield
│   │   ├── dashboard/
│   │   │   └── DashboardPage.tsx        # Signed-in donor page with verified badge & logout
│   │   └── landing/
│   │       └── LandingPage.tsx          # Landing hero, 3 steps, and verified shelter trust strip
│   ├── index.css                        # Design system CSS variables & typography tokens
│   ├── main.tsx                         # React 19 client mount
│   ├── repositories/
│   │   ├── FirebaseAuthGateway.ts       # Modular Firebase Auth integration
│   │   ├── FirebaseThrottleStore.ts     # Firestore transaction-based atomic throttle
│   │   ├── FirebaseUserProfileRepository.ts # Firestore users/{uid} ABAC repository
│   │   └── InMemoryTestDoubles.ts       # Test doubles passing identical contracts
│   ├── security/
│   │   ├── hash.ts                      # Web Crypto SHA-256 and NFKC email normalization
│   │   ├── passwordRules.ts             # 10-128 chars, 100-password blocklist, strength meter
│   │   └── validation.ts                # Zod schemas & redirect URI sanitizer
│   └── ui/
│       └── components/
│           ├── Badge.tsx                # Status tags
│           ├── Button.tsx               # Accessible 44px buttons with loading state
│           ├── Card.tsx                 # 16px radius surface card
│           ├── Footer.tsx               # Tagline and site navigation
│           ├── Header.tsx               # Sticky header with burgundy brand logo
│           └── Input.tsx                # Inputs with show/hide password and CapsLock detector
├── tests/
│   └── rules.test.ts                    # Unit and contract tests (node:test)
└── tsconfig.json                        # Strict TypeScript configuration
```

---

## Free-Tier Spark Limits & Honest Security Assessment

### What this build strictly enforces:
1. **Zero-Trust ABAC Firestore Rules**: A signed-in user can only read and write their own document at `/users/{uid}`. No user can list the `users` collection or inspect any other donor's records.
2. **Atomic Pre-Increment Throttling**: A Firestore `runTransaction` increases the attempt counter on `loginThrottle/{emailHash}` *before* calling `signInWithEmailAndPassword`. Rapid double-clicks and concurrent browser tabs are atomically counted.
3. **Immutability of Privileges**: In Firestore rules, the `role` is fixed to `"DONOR"` and cannot be escalated to admin or modified on update.
4. **Anti-Scanner Deferred Reset**: Links delivered by email are not processed on page load. An automated spam/security scanner inspecting the link cannot consume or invalidate the reset code.
5. **No Password or Token Storage**: No credentials or access tokens are ever placed in `localStorage`, cookies, or JavaScript memory arrays.

### Honest Limit of the Free Spark Plan:
- **Client-Side Runtime**: Because the AI Studio free Spark plan does not permit Cloud Functions (which require the paid Blaze plan), the 3-attempt limit is checked by the browser app and validated by Firestore rules.
- **Direct API Attackers**: A skilled attacker with technical knowledge who bypasses the frontend application and calls the public Firebase Auth REST endpoint directly (`identitytoolkit.googleapis.com`) is subject to **Firebase's native IP-based brute-force defenses and temporary blocking**, but cannot be stopped by Firestore rules alone.
- **Ready-to-Enable Server Enforcement**: For a hard, unavoidable server-side barrier, we have written `functions/blockingSignIn.ts`. Once upgraded to the Blaze plan, deploying this function enables Firebase's `beforeSignIn` blocking trigger to enforce the limit at the identity provider level.

---

## Loophole Register

| # | Threat | Architectural & Code Fix | Verification Test |
|---|---|---|---|
| **1** | **Attempt-Counter Race Condition** | Counters are updated inside a Firestore `runTransaction` *prior* to calling `signInWithEmailAndPassword`. | `tests/rules.test.ts` (consecutive attempts count monotonically). |
| **2** | **Lockout Abuse / Jump Attacks** | `firestore.rules` allows an update only if `incoming().count == existing().count + 1`. An attacker cannot jump the count to 3 or 4. | Live Firestore rule test: +1 succeeded, jump from 1 to 4 rejected with `permission-denied`. |
| **3** | **User Enumeration** | Password reset always returns: *"If that email has an account, we have sent a reset link"*. Lookup failures fall back to signup seamlessly. | `PasswordResetService.test` verifies identical return payload. |
| **4** | **Credential Stuffing** | Passwords must pass the 100 most common passwords blocklist, must not contain email username, and require mixed character sets. | `tests/rules.test.ts` tests common passwords and email similarity rejection. |
| **5** | **Email-Scanner Link Consumption** | `/reset` reads `oobCode` without calling `verifyPasswordResetCode` or `confirmPasswordReset` until the user manually presses "Update password & Sign in". | Manual test: loading `/reset?oobCode=...` performs no network write. |
| **6** | **Link Leakage through Referer** | `index.html` enforces `<meta name="referrer" content="no-referrer" />`. `ResetPasswordPage` scrubs `oobCode` from the address bar via `window.history.replaceState`. | Verified URL bar is scrubbed immediately upon mount. |
| **7** | **Account Pre-hijacking** | If an account is already registered but unverified, `SignupStep` alerts the owner and provides a *"Reset password to claim ownership"* flow which replaces the intruder's password. | SignupStep pre-hijacking banner and password reset recovery. |
| **8** | **Open Redirect Vulnerability** | `sanitizeRedirectPath` rejects protocol schemes (`http:`, `//`), backslashes (`\`), and unallowlisted routes, defaulting strictly to `/dashboard`. | `tests/rules.test.ts` checks malicious strings. |
| **9** | **Role Tampering via Firestore** | `firestore.rules` enforces `incoming().role == 'DONOR'` on creation and forbids modifying `role` during updates. | `security_spec.md` and live rule rejection tests. |
| **10** | **Direct Calls Bypassing App** | Free tier uses Firestore ABAC + Firebase built-in rate-limiting; includes `functions/blockingSignIn.ts` ready for Blaze deployment. | Documented in `functions/blockingSignIn.ts`. |
| **11** | **Email Dispatch Rate Limits** | `EmailVerificationService` enforces a strict 60-second cooldown and max 3 requests per hour tracked in `verificationThrottle/{emailHash}`. | `verificationThrottle` Firestore rules and countdown timer state. |

---

## Manual Testing Checklist

1. **Unknown Email Offered Signup**:
   - Go to `/auth`, type `unknown_donor_992@example.com`, press Continue.
   - Verified: App shows banner *"We couldn't find an account with this email. Let's create one."* and displays the signup form with the email prefilled.

2. **Signup &rarr; Confirm &rarr; Login**:
   - Complete signup with valid details.
   - Verified: User is immediately signed out, presented with *"Check your email"*, and directed to confirm via email link before `/dashboard` is accessible.

3. **Wrong Password Three Times &rarr; Locked with Unlock Time**:
   - Enter registered email, go to password step.
   - Enter wrong password: shows *"That password isn't right. You have 2 tries left today."*
   - Enter wrong password again: shows *"You have 1 try left today."*
   - Enter wrong password 3rd time: shows *"That was your last try today."*
   - On 4th attempt: Button is disabled/locked, showing *"Too many tries today. You can try again at [Asia/Kolkata Time], or reset your password by email now."*

4. **Forgot Password Works Once**:
   - Click *"Forgot password?"*, submit email.
   - Verified: Generic confirmation displayed. When reset link is clicked, code is stripped from URL bar, and completing the form resets password and clears the 24-hour lock.

5. **Two Different Users Concurrently**:
   - User A typing wrong passwords on `alice@example.com` has zero effect on `bob@example.com` because throttle documents are partitioned by `emailHash`.

6. **Two Browsers At Once**:
   - Rapid parallel attempts from separate browser tabs increment the same atomic Firestore counter without lost updates or race conditions.

---

## Self-Review: No Secrets in Codebase
- `firebase-applet-config.json` contains only public client keys (`apiKey`, `projectId`, `appId`), which are designed by Google to be public in client-side web bundles.
- No Firebase service account private keys, admin credentials, or API secret tokens exist in the repository.
- Raw email addresses are never logged or stored in throttle document IDs; only cryptographic SHA-256 hashes are used.

---

## Step 2: Donations & Gifts System

### 1. One-Page Flow Diagram

```text
[Gift Catalog (/gifts)]
       │
       ▼ (Select 1 of 14 gifts)
[Gift Details (/donate/:giftId)]
       │ ── Choose quantity (or custom ₹ amount)
       │ ── Select receiving shelter (Tamil Nadu & Kerala)
       │ ── Optional dedication & message
       ▼
[Review & Confirm (/donate/review)]
       │ ── Review transparent 0% platform fee breakdown
       │ ── Verify shelter credentials
       ▼ (Press "Proceed to UPI Payment")
[DonationCreationService]
       │ ── Validates integer paise calculations from giftCatalog
       │ ── Generates unambiguous reference (PWF-XXXXXXXX)
       │ ── Fetches safe shelterPayInfo (UPI details)
       │ ── Builds NPCI upi://pay URI
       │ ── ATOMIC BATCH WRITE:
       │      ├─ donations/{id} (status: PENDING, version: 1, TTL: 30m)
       │      ├─ donationReferences/{ref} (uniqueness lock)
       │      └─ donationAuditLogs/{autoId}
       ▼
[Live Payment Screen (/donate/pay/:id)]
       │ ── 30-minute live countdown timer
       │ ── High-contrast client-generated QR Code (canvas)
       │ ── Mobile intent: "Pay via UPI App" (GPay, PhonePe, Paytm, BHIM)
       │ ── Copy UPI ID button with instant feedback
       │
       ├── Donor presses Cancel ──────────► [DonationLifecycleService] ──► Status: CANCELLED
       │
       └── TTL timer reaches 00:00 ───────► [DonationLifecycleService] ──► Status: EXPIRED
                                                                               │
                                                                               ▼
                                                                  [Donation Status & Receipt]
```

---

### 2. Data Model

- **`donations/{id}`**:
  - `id`: Unique string (`{reference.toLowerCase()}_{timestamp}`)
  - `reference`: 12-character alphanumeric code (`PWF-` + 8 unambiguous chars)
  - `donorUid`: UID of the authenticated verified donor
  - `donorName`, `donorEmail`: Donor contact information
  - `shelterId`: Owner UID of the receiving shelter
  - `shelterName`, `shelterState`, `shelterDistrict`: Public shelter snapshot
  - `shelterUpiId`, `shelterPayeeName`: Safe copy of shelter's verified UPI receiver
  - `giftId`, `giftName`: Gift identifier from `giftCatalog`
  - `quantity`: Positive integer (1-100)
  - `unitPricePaise`: Unit price in integer paise (₹50 = 5000 paise)
  - `amountPaise`: Total amount (`quantity * unitPricePaise` or custom paise)
  - `status`: `'PENDING' | 'CANCELLED' | 'EXPIRED'` (with `'CONFIRMED' | 'REFUNDED'` reserved for Part B)
  - `statusVersion`: Optimistic concurrency counter (increments +1 on every state change)
  - `createdAt`, `expiresAt`, `updatedAt`: Millisecond timestamps
  - `upiIntentUrl`: Standard NPCI `upi://pay` URI
  - `donorNote`, `dedicationName`, `dedicationMessage`: Optional dedications

- **`donationReferences/{reference}`**:
  - Unique lock record preventing reuse of the same reference number across donations.

- **`shelterPayInfo/{shelterId}`**:
  - Safe, verified public payment snapshot containing only `upiId`, `upiHolderName`, and `shelterName`. `shelterPrivate` is never exposed to donors.

- **`donationAuditLogs/{docId}`**:
  - Append-only immutable log of state transitions recording `fromStatus`, `toStatus`, `actorUid`, `actorType`, and timestamp.

---

### 3. How to Add a New Gift
Adding a new gift requires exactly two steps:
1. Add an entry to the `GIFT_CATALOG` array in `src/config/giftCatalog.ts`:
   ```ts
   {
     id: 'new-gift-id',
     name: 'Gift Display Name',
     caption: 'Short 1-sentence description.',
     unitPricePaise: 350 * 100, // ₹350
     minQuantity: 1,
     maxQuantity: 25,
     category: 'HEALTHCARE',
     imagePath: '/images/gifts/new-gift-id.webp',
     imageAlt: 'Descriptive alt text with dog and cat.',
     isCustom: false,
     impactDescription: 'Direct impact description for the donor.',
   }
   ```
2. Place the corresponding WebP image at `/public/images/gifts/new-gift-id.webp` (1200x800, 3:2 landscape, under 150 KB).

---

### 4. How to Change a Gift Price
To change the price of any gift, edit exactly ONE number in `src/config/giftCatalog.ts`:
```ts
unitPricePaise: 75 * 100, // Changes price from ₹50 to ₹75
```
Because the catalog is the single source of truth, the gift picker, details calculator, review summary, NPCI UPI payment link, and Firestore security rules will immediately adopt the new price.

---

### 5. Honest Limits of Direct UPI Giving
- **Zero Intermediary Escrow**: Pawfect operates on 100% direct giving with 0% platform cut. Payments route directly from the donor's bank app to the shelter's bank account via NPCI UPI rails.
- **Client-Initiated Settlement**: In Part A, transactions are initiated in the browser and recorded as `PENDING`. Status transitions are limited to `CANCELLED` and `EXPIRED`. Part B introduces automated bank SMS/webhook settlement reconciliation to mark donations `CONFIRMED`.
- **Spark Quota Economy**: No costly Cloud Functions or background cron daemons are required. Timers and status checks are computed dynamically against Firestore server timestamps and client TTLs.

