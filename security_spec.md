# TRACECO Security Specification & Threat Model (Phase 0 TDD)

## 1. Data Invariants (1-Account = 1-Role & Traceability Integrity)
1. **Strict Role Isolation & Immutability**: Each Firebase Auth `uid` owns exactly one `/users_public/{uid}` and `/users_private/{uid}` record with an immutable `role` (`'Kontributor' | 'Admin' | 'Mitra'`). Once chosen at onboarding, `role` cannot be updated by the user.
2. **No Self-Privilege Escalation to Admin**: Only a verified bootstrapped Admin (`request.auth.token.email == 'damarrizqiaji@gmail.com' && request.auth.token.email_verified == true`) or an existing document in `/admins/{uid}` may register as `Admin`. Any ordinary account submitting `role: 'Admin'` or creating `/admins/{uid}` is rejected (`PERMISSION_DENIED`).
3. **PII Isolation**: User email addresses exist exclusively in `/users_private/{uid}` and are readable only by `isOwner(uid) || isAdmin()`. Public listings (`/users_public`) never expose email or password hashes.
4. **No Cross-Role / Cross-User Data Overlap**:
   - `Kontributor` may read/list only their own `ecobrick_submissions`, `verification_records`, `green_points`, `redemptions`, `financial_incentives`, and `distribution_requests` / `utilization_records` matching `batchContributorId == uid`.
   - `Mitra` may read/list verified inventory batches (`ecobrick_batches`) and only their own `distribution_requests` / `utilization_records` (`requesterId == uid`). `Mitra` has zero read access to contributor submissions, verifications, green points, or redemptions.
   - `Admin` manages physical verification, master data (`dropoff_points`, `rewards`), financial incentives, distribution approvals, and ecosystem monitoring.
5. **Governance & Audit Integrity**:
   - An Admin cannot verify their own submission (`existing().contributorId != request.auth.uid`).
   - Only `'Pending'` submissions may be verified, and verification cannot revert terminal states.
   - `green_points` entries of type `'Earned'` require `isAdmin()`, and `'Redeemed'` entries require an atomic `/redemptions/{redemptionId}` matching a real `/rewards/{rewardId}` cost (`existsAfter` + `getAfter`).
   - Community Hub RSVP writes (`/community_activities/{activityId}/rsvps/{uid}`) must atomically update `participantCount` by `+1` or `-1` on the parent activity (`getAfter` / `existsAfter`).
6. **Verified Email Gate & Bounded Payloads**: Every write requires `request.auth != null && request.auth.token.email_verified == true`. All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), and every string/number field enforces explicit bounds and server timestamps (`request.time`).

## 2. The "Dirty Dozen" Adversarial Payloads (Expected: `PERMISSION_DENIED`)
1. **Unverified Admin Email Spoof**: User with `email: 'damarrizqiaji@gmail.com'` and `email_verified: false` attempts to write `/admins/{uid}` or read all submissions.
2. **Self-Assigned Admin Escalation**: Ordinary user (`user@example.com`) creates `/users_public/{uid}` with `role: 'Admin', segment: 'Admin'`.
3. **Post-Onboarding Role Switch Attempt**: Existing `Kontributor` attempts to update `/users_public/{uid}` changing `role` from `'Kontributor'` to `'Admin'` or `'Mitra'`.
4. **Shadow Ghost Field Injection**: User creates `/ecobrick_submissions/TRC-999` with an extra ghost key `{ "isVerified": true }`.
5. **Cross-Owner Submission Spoof**: Kontributor A creates a submission with `contributorId: "CTR_B"` instead of their own `uid`.
6. **Direct Green Points Minting**: Kontributor attempts to write `/green_points/GP-HACK` with `type: "Earned", points: 9999` directly without Admin role.
7. **Discounted Redemption Fraud**: Kontributor writes `/redemptions/RDM-HACK` with `pointsCost: 1` for a reward whose `/rewards/{rewardId}.pointsCost == 200`.
8. **Cross-Mitra Blanket List / Read**: Mitra A attempts to read or list Mitra B's `distribution_requests` (`requesterId != auth.uid`).
9. **PII Blanket Leak**: Authenticated user attempts `get` on `/users_private/{otherUid}` to read another user's email.
10. **Path Variable ID Poisoning**: Attacker targets `/ecobrick_submissions/bad$id/../../../etc` or a 1,500-char document ID.
11. **Value & Size Poisoning**: User submits `notes` with 5,000 characters (`> 500` maxLength) or `quantitySubmitted: -5`.
12. **Terminal State / Client Timestamp Tampering**: Non-admin user updates a `'Handed Over'` distribution request back to `'Pending Review'`, or supplies a forged past `createdAt` timestamp instead of `request.time`.

## 3. Red Team Audit Conflict Matrix
| Collection | Shadow Update | Email Spoof | PII Leak | Query Trust | Value Poisoning |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `/admins/{uid}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Owner/Admin) | PASS (`isOwner` / `isBootstrappedAdmin`) | PASS (`isValidId` + maxLen) |
| `/users_public/{uid}` | PASS (`hasOnly` + `affectedKeys`) | PASS (`email_verified == true`) | PASS (No PII stored) | PASS (`resource.data.role` check) | PASS (enum + `.size()`) |
| `/users_private/{uid}` | PASS (`hasOnly` + `affectedKeys`) | PASS (`email_verified == true`) | PASS (`isOwner \|\| isAdmin`) | PASS (`id == uid \|\| isBootstrappedAdmin`) | PASS (maxLen 160) |
| `/dropoff_points/{pointId}` | PASS (`hasOnly`) | PASS (`isAdmin`) | N/A | PASS (`resource.data.id` check) | PASS (maxLen + Admin) |
| `/rewards/{rewardId}` | PASS (`hasOnly`) | PASS (`isAdmin`) | N/A | PASS (`pointsCost > 0`) | PASS (`pointsCost > 0`) |
| `/ecobrick_submissions/{submissionId}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Owner/Admin only) | PASS (`contributorId == uid \|\| isBootstrappedAdmin`) | PASS (bounds + photo limit) |
| `/verification_records/{recordId}` | PASS (`hasOnly`) | PASS (`isAdmin`) | PASS (Owner/Admin only) | PASS (`contributorId == uid \|\| isBootstrappedAdmin`) | PASS (8-bool checklist) |
| `/ecobrick_batches/{batchId}` | PASS (`hasOnly`) | PASS (`isAdmin`) | PASS (Zero PII) | PASS (`contributorId == uid \|\| quantity > 0`) | PASS (`quantity > 0`) |
| `/green_points/{entryId}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Owner/Admin only) | PASS (`contributorId == uid \|\| isBootstrappedAdmin`) | PASS (`getAfter` cost check) |
| `/redemptions/{redemptionId}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Owner/Admin only) | PASS (`contributorId == uid \|\| isBootstrappedAdmin`) | PASS (`get()` reward cost match) |
| `/financial_incentives/{incentiveId}` | PASS (`hasOnly`) | PASS (`isAdmin`) | PASS (Owner/Admin only) | PASS (`contributorId == uid \|\| isBootstrappedAdmin`) | PASS (`amountIdr > 0`) |
| `/distribution_requests/{requestId}` | PASS (`hasOnly` + `affectedKeys`) | PASS (`email_verified == true`) | PASS (Requester/BatchOwner/Admin) | PASS (`requesterId \|\| batchContributorId`) | PASS (`requestedCount <= batch.quantity`) |
| `/utilization_records/{recordId}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Requester/BatchOwner/Admin) | PASS (`requesterId \|\| batchContributorId`) | PASS (`getAfter` request Utilized) |
| `/community_activities/{activityId}` + `/rsvps/{uid}` | PASS (`affectedKeys` + `hasOnly`) | PASS (`email_verified == true`) | PASS (RSVPs Owner/Admin) | PASS (`status` / `uid` check) | PASS (`existsAfter` delta +/-1) |
| `/community_posts/{postId}` + `/replies/{replyId}` | PASS (`hasOnly` + `affectedKeys`) | PASS (`email_verified == true`) | PASS (Zero PII) | PASS (`status` / `postId` check) | PASS (maxLen 1200/1000) |
| `/collaborations/{collabId}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Zero PII) | PASS (`status` check) | PASS (maxLen + Mitra/Admin) |
| `/notifications/{notifId}` | PASS (`hasOnly` + `affectedKeys`) | PASS (`email_verified == true`) | PASS (Recipient/Admin only) | PASS (`recipientUid` / `Admin`) | PASS (bool `read` only update) |
| `/activities_feed/{actId}` | PASS (`hasOnly`) | PASS (`email_verified == true`) | PASS (Actor/Target/Komunitas) | PASS (`actorUid \|\| target \|\| Komunitas`) | PASS (maxLen + server time) |
