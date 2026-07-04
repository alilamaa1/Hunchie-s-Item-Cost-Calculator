import test from 'node:test';
import assert from 'node:assert/strict';
import { createUniqueBackupFileName } from '../../src/backend/storage/blobJsonStorage.mjs';

test('Vercel Blob backup filenames stay unique inside the same minute', () => {
  const now = new Date('2026-07-04T12:45:00.000Z');
  const first = createUniqueBackupFileName('vercel-data/users.json', now);
  const second = createUniqueBackupFileName('vercel-data/users.json', now);

  assert.match(first, /^users_2026-07-04_12-45_\d+-[a-z0-9]+\.json$/);
  assert.notEqual(first, second);
});
