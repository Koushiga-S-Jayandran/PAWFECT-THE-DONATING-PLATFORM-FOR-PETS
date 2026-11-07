# Pawfect Security Specification (ABAC & Zero-Trust Firestore Security)

## 1. Data Invariants
1. **User Identity Invariant**: A user document at `/users/{uid}` can only be created, read, and updated by the authenticated user whose `request.auth.uid == uid`. No user can read, list, or write another user's document.
2. **Fixed Donor Role Invariant**: The `role` field on `/users/{uid}` must strictly equal `"DONOR"` upon creation and can never be modified. Privilege escalation is strictly forbidden.
3. **Immutability Invariant**: `createdAt`, `consentAt`, and `role` are permanently immutable once written.
4. **No Blanket Queries**: Listing `/users` is unconditionally denied for all clients.
5. **Login Throttle Incremental Invariant**: Documents in `/loginThrottle/{emailHash}` can only be incremented by +1 (or reset to 1 if >= 24 hours have elapsed). Clients cannot jump count arbitrarily (e.g., from 1 to 3 or set count to 999).
6. **Login Throttle Ceiling Invariant**: `count` must never exceed 4 in `/loginThrottle/{emailHash}`.
7. **Login Throttle Window Invariant**: `windowStart` cannot be moved backwards or forwards unless 24 hours have passed and the window is legitimately restarting at `request.time`.
8. **Login Throttle Deletion Invariant**: Only a verified user (`request.auth.token.email_verified == true`) may delete a throttle document upon successful authenticated sign-in.
9. **Verification Cooldown Invariant**: Resending verification emails is limited to once every 60 seconds and max 3 requests per hour per email hash.
10. **ID Poisoning Invariant**: Document IDs must satisfy alphanumeric regex constraints (`^[a-zA-Z0-9_-]+$`) and length constraints (<= 128 chars).

## 2. The "Dirty Dozen" Malicious Payloads

1. **Payload 1: Privilege Escalation on Profile Creation**
   - Target: `/users/{uid}`
   - Data: `{ "role": "ADMIN", "fullName": "Attacker", "phone": "+919876543210", ... }`
   - Expected: `PERMISSION_DENIED` (role must be "DONOR").

2. **Payload 2: Role Tampering on Profile Update**
   - Target: `/users/{uid}`
   - Update: `{ "role": "SUPERADMIN" }`
   - Expected: `PERMISSION_DENIED` (role is immutable).

3. **Payload 3: Cross-User Profile Read**
   - Target: `get /users/victimUid` by `attackerUid`
   - Expected: `PERMISSION_DENIED` (only owner can read).

4. **Payload 4: Directory Scraping (List Users)**
   - Target: `list /users`
   - Expected: `PERMISSION_DENIED` (blanket list queries forbidden).

5. **Payload 5: Lockout DOS / Throttle Jump (+2 or Arbitrary Jump)**
   - Target: `/loginThrottle/{emailHash}`
   - Existing: `{ count: 1, windowStart: now }`
   - Attempted Update: `{ count: 3, windowStart: now }`
   - Expected: `PERMISSION_DENIED` (must be count == existing.count + 1).

6. **Payload 6: Throttle Ceiling Bypass (> 4)**
   - Target: `/loginThrottle/{emailHash}`
   - Existing: `{ count: 4, windowStart: now }`
   - Attempted Update: `{ count: 5, windowStart: now }`
   - Expected: `PERMISSION_DENIED` (count cannot exceed 4).

7. **Payload 7: Unauthenticated Throttle Erasure**
   - Target: `delete /loginThrottle/{emailHash}` without valid verified auth token
   - Expected: `PERMISSION_DENIED` (delete requires signed-in verified user).

8. **Payload 8: Unverified User Throttle Erasure**
   - Target: `delete /loginThrottle/{emailHash}` with `request.auth.token.email_verified == false`
   - Expected: `PERMISSION_DENIED` (must have email_verified == true).

9. **Payload 9: WindowStart Time Manipulation**
   - Target: `/loginThrottle/{emailHash}`
   - Attempted Update: `{ count: 2, windowStart: now - 86400000 }`
   - Expected: `PERMISSION_DENIED` (windowStart must remain unchanged during intra-window increments).

10. **Payload 10: Ghost Field Injection in User Document**
    - Target: `/users/{uid}`
    - Attempted Update: `{ "fullName": "Alice", "hackedBalance": 999999 }`
    - Expected: `PERMISSION_DENIED` (affectedKeys must strictly only allow updated profile fields).

11. **Payload 11: Document ID Poisoning**
    - Target: `/users/../../etc/passwd` or 2048-byte string
    - Expected: `PERMISSION_DENIED` (isValidId regex guard).

12. **Payload 12: Invalid Phone Format / Type Confusion**
    - Target: `/users/{uid}`
    - Data: `{ "phone": "invalid-phone-string", ... }`
    - Expected: `PERMISSION_DENIED` (regex guard `^\+91[6-9][0-9]{9}$`).
