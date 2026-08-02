import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniqueBackupFileName,
  isVersionedJsonFileName,
  selectBlobPathnamesToDelete
} from '../../src/backend/storage/blobJsonStorage.mjs';

test('Vercel Blob backup filenames stay unique inside the same minute', () => {
  const now = new Date('2026-07-04T12:45:00.000Z');
  const first = createUniqueBackupFileName('vercel-data/users.json', now);
  const second = createUniqueBackupFileName('vercel-data/users.json', now);

  assert.match(first, /^users_2026-07-04_12-45_\d+-[a-z0-9]+\.json$/);
  assert.notEqual(first, second);
});

test('Vercel Blob storage recognizes every app JSON data file', () => {
  assert.equal(isVersionedJsonFileName('raw_materials.json'), true);
  assert.equal(isVersionedJsonFileName('products.json'), true);
  assert.equal(isVersionedJsonFileName('batches.json'), true);
  assert.equal(isVersionedJsonFileName('users.json'), true);
  assert.equal(isVersionedJsonFileName('settings.json'), true);
});

test('Vercel Blob retention deletes older blob versions first', () => {
  const deletions = selectBlobPathnamesToDelete([
    { pathname: 'old.json', uploadedAt: new Date('2026-07-04T10:00:00.000Z') },
    { pathname: 'new.json', uploadedAt: new Date('2026-07-04T12:00:00.000Z') },
    { pathname: 'middle.json', uploadedAt: new Date('2026-07-04T11:00:00.000Z') }
  ], 1);

  assert.deepEqual(deletions, ['middle.json', 'old.json']);
});
