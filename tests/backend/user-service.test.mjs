import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import {
  authenticateUser,
  createUser,
  listUsers,
  updateUser,
  verifyAdminKey
} from '../../src/backend/services/userService.mjs';
import { createTempAppDataFolder, removeTempAppDataFolder } from './helpers/tempAppData.mjs';

async function withDataFolder(fn) {
  const parent = await createTempAppDataFolder();
  const dataFolder = join(parent, 'Item Cost Calculator');

  try {
    await initializeAppDataFolder({ dataFolder });
    await fn(dataFolder);
  } finally {
    await removeTempAppDataFolder(parent);
  }
}

test('admin key accepts the configured PIN and rejects other values', () => {
  assert.equal(verifyAdminKey('494').ok, true);
  assert.equal(verifyAdminKey('493').error.code, ErrorCodes.ADMIN_KEY_INVALID);
});

test('creates users without exposing passwords and persists them to users.json', async () => {
  await withDataFolder(async (dataFolder) => {
    const result = await createUser({ username: ' Ahmad ', password: 'secret' }, {
      dataFolder,
      now: () => '2026-07-03T10:00:00.000Z'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.id, 'US-0001');
    assert.equal(result.data.username, 'Ahmad');
    assert.equal(result.data.isActive, true);
    assert.equal('password' in result.data, false);

    const saved = JSON.parse(await readFile(join(dataFolder, 'users.json'), 'utf8'));
    assert.equal(saved[0].password, 'secret');
  });
});

test('rejects duplicate usernames after trimming and ignoring case', async () => {
  await withDataFolder(async (dataFolder) => {
    await createUser({ username: 'FlourBoss', password: 'secret' }, { dataFolder });
    const duplicate = await createUser({ username: ' flourboss ', password: 'other' }, { dataFolder });

    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error.code, ErrorCodes.USER_ALREADY_EXISTS);
    assert.equal(duplicate.error.message, 'user already exists.');
  });
});

test('updates username, password, and access toggle while preventing duplicate names', async () => {
  await withDataFolder(async (dataFolder) => {
    const first = await createUser({ username: 'Ahmad', password: 'secret' }, { dataFolder });
    await createUser({ username: 'Kitchen', password: 'secret' }, { dataFolder });

    const duplicate = await updateUser(first.data.id, { username: ' kitchen ' }, { dataFolder });
    assert.equal(duplicate.error.code, ErrorCodes.USER_ALREADY_EXISTS);

    const updated = await updateUser(first.data.id, {
      username: 'Owner',
      password: 'new-secret',
      isActive: false
    }, { dataFolder });

    assert.equal(updated.ok, true);
    assert.equal(updated.data.username, 'Owner');
    assert.equal(updated.data.isActive, false);
    assert.equal('password' in updated.data, false);
  });
});

test('authenticates only active users with matching credentials', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createUser({ username: 'Ahmad', password: 'secret' }, { dataFolder });

    assert.equal((await authenticateUser({ username: ' ahmad ', password: 'secret' }, { dataFolder })).ok, true);
    assert.equal((await authenticateUser({ username: 'Ahmad', password: 'bad' }, { dataFolder })).error.code, ErrorCodes.LOGIN_INVALID);

    await updateUser(created.data.id, { isActive: false }, { dataFolder });
    assert.equal((await authenticateUser({ username: 'Ahmad', password: 'secret' }, { dataFolder })).error.code, ErrorCodes.USER_INACTIVE);
  });
});

test('lists users sorted by creation order without passwords', async () => {
  await withDataFolder(async (dataFolder) => {
    await createUser({ username: 'One', password: 'secret' }, { dataFolder });
    await createUser({ username: 'Two', password: 'secret' }, { dataFolder });

    const result = await listUsers({ dataFolder });

    assert.equal(result.ok, true);
    assert.deepEqual(result.data.map((user) => user.username), ['One', 'Two']);
    assert.equal(result.data.some((user) => 'password' in user), false);
  });
});
