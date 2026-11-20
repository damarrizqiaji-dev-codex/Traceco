import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BLUEPRINT_PATH = path.resolve('firebase-blueprint.json');
const RULES_PATH = path.resolve('firestore.rules');

test('firebase-blueprint.json covers all 20 role-isolated Firestore paths', () => {
  const blueprint = JSON.parse(fs.readFileSync(BLUEPRINT_PATH, 'utf8'));
  const expectedPaths = [
    '/admins/{uid}',
    '/users_public/{uid}',
    '/users_private/{uid}',
    '/dropoff_points/{pointId}',
    '/rewards/{rewardId}',
    '/ecobrick_submissions/{submissionId}',
    '/verification_records/{recordId}',
    '/ecobrick_batches/{batchId}',
    '/green_points/{entryId}',
    '/redemptions/{redemptionId}',
    '/financial_incentives/{incentiveId}',
    '/distribution_requests/{requestId}',
    '/utilization_records/{recordId}',
    '/community_activities/{activityId}',
    '/community_activities/{activityId}/rsvps/{rsvpUid}',
    '/community_posts/{postId}',
    '/community_posts/{postId}/replies/{replyId}',
    '/collaborations/{collabId}',
    '/notifications/{notifId}',
    '/activities_feed/{actId}',
  ];

  for (const p of expectedPaths) {
    assert.ok(blueprint.firestore[p], `Missing blueprint path: ${p}`);
  }
});

test('firestore.rules enforces Dirty Dozen invariants & Eight Pillars', () => {
  const rules = fs.readFileSync(RULES_PATH, 'utf8');

  // Pillar 1 & 3: Global deny catch-all and path ID validation
  assert.match(rules, /match \/\{document=\*\*\} \{\s*allow read, write: if false;/);
  assert.match(rules, /function isValidId\(id\)/);

  // Pillar 2 & 6: Bootstrapped verified admin + PII split + immutable role
  assert.match(rules, /request\.auth\.token\.email_verified == true/);
  assert.match(rules, /damarrizqiaji@gmail\.com/);
  assert.match(rules, /match \/users_private\/\{uid\}/);
  assert.match(rules, /incoming\(\)\.role == existing\(\)\.role/);

  // Pillar 7 & 8: Atomicity checks & zero blanket list reads
  assert.match(rules, /getAfter\(/);
  assert.match(rules, /existsAfter\(/);
  assert.doesNotMatch(rules, /allow list:\s*if isSignedIn\(\);/);

  // Dirty Dozen Guard: Every non-denied allow update block wraps validation helper first
  const updateBlocks = (rules.match(/allow update:[\s\S]*?;/g) ?? []).filter(
    (block) => !/allow update:\s*if false;/.test(block)
  );
  assert.ok(updateBlocks.length >= 8, 'Expected guarded update blocks');
  for (const block of updateBlocks) {
    assert.match(
      block,
      /isValid[A-Za-z]+\(incoming\(\)\)/,
      `Update block missing validation helper: ${block}`
    );
    assert.match(
      block,
      /affectedKeys\(\)\.hasOnly\(/,
      `Update block missing affectedKeys().hasOnly(): ${block}`
    );
  }
});
