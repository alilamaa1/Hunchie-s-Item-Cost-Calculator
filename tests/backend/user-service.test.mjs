import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ErrorCodes } from '../../src/shared/errors.mjs';
import { initializeAppDataFolder } from '../../src/backend/storage/dataFolderInitializer.mjs';
import {
  authenticateUser,
  createUser,
  deleteUser,
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

test('creates users without exposing passwords and persists profile permissions to users.json', async () => {
  await withDataFolder(async (dataFolder) => {
    const result = await createUser({
      username: ' Ahmad Lamaa ',
      password: 'secret',
      name: 'Ahmad Lamaa',
      department: 'Operations',
      permissions: {
        materials: { visible: true, edit: false },
        products: { visible: false, edit: true }
      }
    }, {
      dataFolder,
      now: () => '2026-07-03T10:00:00.000Z'
    });

    assert.equal(result.ok, true);
    assert.equal(result.data.id, 'US-0001');
    assert.equal(result.data.username, 'Ahmad_Lamaa');
    assert.equal(result.data.name, 'Ahmad Lamaa');
    assert.equal(result.data.department, 'Operations');
    assert.equal(result.data.permissions.materials.visible, true);
    assert.equal(result.data.permissions.materials.edit, false);
    assert.equal(result.data.permissions.products.visible, false);
    assert.equal(result.data.permissions.products.edit, false);
    assert.equal(result.data.isActive, true);
    assert.equal('password' in result.data, false);

    const saved = JSON.parse(await readFile(join(dataFolder, 'users.json'), 'utf8'));
    assert.equal(saved[0].password, 'secret');
    assert.equal(saved[0].name, 'Ahmad Lamaa');
    assert.equal(saved[0].department, 'Operations');
    assert.equal(saved[0].permissions.products.edit, false);
  });
});

test('rejects exact duplicate usernames after replacing spaces, while keeping case-sensitive names separate', async () => {
  await withDataFolder(async (dataFolder) => {
    await createUser({ username: 'FlourBoss', password: 'secret' }, { dataFolder });
    const differentCase = await createUser({ username: 'flourboss', password: 'other' }, { dataFolder });
    await createUser({ username: 'Flour Boss', password: 'secret' }, { dataFolder });
    const duplicate = await createUser({ username: 'Flour_Boss', password: 'other' }, { dataFolder });

    assert.equal(differentCase.ok, true);
    assert.equal(duplicate.ok, false);
    assert.equal(duplicate.error.code, ErrorCodes.USER_ALREADY_EXISTS);
    assert.equal(duplicate.error.message, 'user already exists.');
  });
});

test('updates username, password, profile, permissions, and access toggle while preventing duplicate names', async () => {
  await withDataFolder(async (dataFolder) => {
    const first = await createUser({ username: 'Ahmad', password: 'secret' }, { dataFolder });
    await createUser({ username: 'Kitchen', password: 'secret' }, { dataFolder });

    const duplicate = await updateUser(first.data.id, { username: ' Kitchen ' }, { dataFolder });
    assert.equal(duplicate.error.code, ErrorCodes.USER_ALREADY_EXISTS);

    const updated = await updateUser(first.data.id, {
      username: 'Owner',
      password: 'new-secret',
      name: 'Owner One',
      department: 'Finance',
      permissions: {
        home: { visible: true, edit: true },
        materials: { visible: true, edit: false },
        products: { visible: true, edit: true },
        settings: { visible: false, edit: true }
      },
      isActive: false
    }, { dataFolder });

    assert.equal(updated.ok, true);
    assert.equal(updated.data.username, 'Owner');
    assert.equal(updated.data.name, 'Owner One');
    assert.equal(updated.data.department, 'Finance');
    assert.equal(updated.data.permissions.home.edit, false);
    assert.equal(updated.data.permissions.materials.edit, false);
    assert.equal(updated.data.permissions.settings.visible, false);
    assert.equal(updated.data.permissions.settings.edit, false);
    assert.equal(updated.data.isActive, false);
    assert.equal('password' in updated.data, false);
  });
});

test('home visibility off preserves other saved section permissions', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createUser({
      username: 'ReadOnly',
      password: 'secret',
      permissions: {
        home: { visible: false, edit: false },
        materials: { visible: true, edit: false },
        products: { visible: true, edit: true },
        settings: { visible: false, edit: false }
      }
    }, { dataFolder });

    const listed = await listUsers({ dataFolder });
    const user = listed.data.find((item) => item.id === created.data.id);

    assert.equal(user.permissions.home.visible, false);
    assert.equal(user.permissions.materials.visible, true);
    assert.equal(user.permissions.materials.edit, false);
    assert.equal(user.permissions.products.visible, true);
    assert.equal(user.permissions.products.edit, true);
  });
});

test('authenticates only active users with matching credentials', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createUser({ username: 'Ahmad Lamaa', password: 'secret' }, { dataFolder });

    assert.equal((await authenticateUser({ username: 'Ahmad Lamaa', password: 'secret' }, { dataFolder })).ok, true);
    assert.equal((await authenticateUser({ username: 'Ahmad_Lamaa', password: 'secret' }, { dataFolder })).data.permissions.products.edit, true);
    assert.equal((await authenticateUser({ username: 'Ahmad_Lamaa', password: 'secret' }, { dataFolder })).ok, true);
    assert.equal((await authenticateUser({ username: 'ahmad_lamaa', password: 'secret' }, { dataFolder })).error.code, ErrorCodes.LOGIN_INVALID);
    assert.equal((await authenticateUser({ username: 'Ahmad_Lamaa', password: 'bad' }, { dataFolder })).error.code, ErrorCodes.LOGIN_INVALID);

    await updateUser(created.data.id, { isActive: false }, { dataFolder });
    assert.equal((await authenticateUser({ username: 'Ahmad_Lamaa', password: 'secret' }, { dataFolder })).error.code, ErrorCodes.USER_INACTIVE);
  });
});

test('deletes users and prevents deleted users from authenticating', async () => {
  await withDataFolder(async (dataFolder) => {
    const created = await createUser({ username: 'DeleteMe', password: 'secret' }, { dataFolder });

    const deleted = await deleteUser(created.data.id, { dataFolder });
    const missing = await deleteUser(created.data.id, { dataFolder });
    const listed = await listUsers({ dataFolder });
    const login = await authenticateUser({ username: 'DeleteMe', password: 'secret' }, { dataFolder });

    assert.equal(deleted.ok, true);
    assert.equal(deleted.data.deletedId, created.data.id);
    assert.equal(missing.ok, false);
    assert.equal(missing.error.code, ErrorCodes.USER_NOT_FOUND);
    assert.deepEqual(listed.data.map((user) => user.username), []);
    assert.equal(login.error.code, ErrorCodes.LOGIN_INVALID);
  });
});

test('lists users sorted by creation order with passwords for admin editing', async () => {
  await withDataFolder(async (dataFolder) => {
    await createUser({ username: 'One', password: 'secret' }, { dataFolder });
    await createUser({ username: 'Two', password: 'secret' }, { dataFolder });

    const result = await listUsers({ dataFolder });

    assert.equal(result.ok, true);
    assert.deepEqual(result.data.map((user) => user.username), ['One', 'Two']);
    assert.deepEqual(result.data.map((user) => user.password), ['secret', 'secret']);
  });
});
