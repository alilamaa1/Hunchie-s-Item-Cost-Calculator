import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { getAppFilePaths } from '../storage/appFiles.mjs';
import { backupJsonFile, readJsonFile, writeJsonFile } from '../storage/jsonStorage.mjs';

const ADMIN_PIN = '494';

const defaultStorage = Object.freeze({
  backupJsonFile,
  readJsonFile,
  writeJsonFile
});

const sectionPermissions = Object.freeze({
  home: { visible: true, edit: false },
  materials: { visible: true, edit: true },
  products: { visible: true, edit: true },
  settings: { visible: true, edit: true }
});

export function verifyAdminKey(pin) {
  return String(pin ?? '') === ADMIN_PIN
    ? success({ authorized: true })
    : failureFromCode(ErrorCodes.ADMIN_KEY_INVALID);
}

export async function listUsers(options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;
  const users = await loadUsers(context.data);
  if (!users.ok) return users;
  return success(users.data);
}

export async function createUser(input, options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const usersResult = await loadUsers(context.data);
  if (!usersResult.ok) return usersResult;

  const normalized = normalizeUserInput(input);
  if (!normalized.ok) return normalized;

  if (findUserByUsername(usersResult.data, normalized.data.username)) {
    return failureFromCode(ErrorCodes.USER_ALREADY_EXISTS);
  }

  const now = getNow(context.data);
  const user = {
    id: nextUserId(usersResult.data),
    username: normalized.data.username,
    password: normalized.data.password,
    name: normalized.data.name,
    department: normalized.data.department,
    permissions: normalized.data.permissions,
    isActive: true,
    createdAt: now,
    updatedAt: now
  };

  const save = await saveUsers([...usersResult.data, user], context.data, { backup: true });
  if (!save.ok) return save;
  return success(withoutPrivateFields(user));
}

export async function updateUser(id, input, options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const usersResult = await loadUsers(context.data);
  if (!usersResult.ok) return usersResult;

  const existing = usersResult.data.find((user) => user.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.USER_NOT_FOUND);
  }

  const normalized = normalizeUserInput({
    username: input?.username ?? existing.username,
    password: input?.password ?? existing.password,
    name: input?.name ?? existing.name,
    department: input?.department ?? existing.department,
    permissions: input?.permissions ?? existing.permissions
  });
  if (!normalized.ok) return normalized;

  const duplicate = findUserByUsername(usersResult.data, normalized.data.username, id);
  if (duplicate) {
    return failureFromCode(ErrorCodes.USER_ALREADY_EXISTS);
  }

  const updated = {
    ...existing,
    username: normalized.data.username,
    password: normalized.data.password,
    name: normalized.data.name,
    department: normalized.data.department,
    permissions: normalized.data.permissions,
    isActive: typeof input?.isActive === 'boolean' ? input.isActive : existing.isActive,
    updatedAt: getNow(context.data)
  };

  const save = await saveUsers(usersResult.data.map((user) => user.id === id ? updated : user), context.data, { backup: true });
  if (!save.ok) return save;
  return success(withoutPrivateFields(updated));
}

export async function deleteUser(id, options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const usersResult = await loadUsers(context.data);
  if (!usersResult.ok) return usersResult;

  const existing = usersResult.data.find((user) => user.id === id);
  if (!existing) {
    return failureFromCode(ErrorCodes.USER_NOT_FOUND);
  }

  const save = await saveUsers(usersResult.data.filter((user) => user.id !== id), context.data, { backup: true });
  if (!save.ok) return save;
  return success({ deletedId: id });
}

export async function authenticateUser(input, options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const usersResult = await loadUsers(context.data);
  if (!usersResult.ok) return usersResult;

  const username = normalizeUsername(input?.username);
  const password = String(input?.password ?? '');
  const user = usersResult.data.find((item) => item.username === username && item.password === password);

  if (!user) {
    return failureFromCode(ErrorCodes.LOGIN_INVALID);
  }

  if (!user.isActive) {
    return failureFromCode(ErrorCodes.USER_INACTIVE);
  }

  return success(withoutPrivateFields(user));
}

export async function loadUsers(context) {
  const result = await context.storage.readJsonFile(getAppFilePaths(context.dataFolder).users);
  if (!result.ok) return result;
  return Array.isArray(result.data) ? success(result.data.map(normalizeStoredUser)) : failureFromCode(ErrorCodes.FILE_INVALID_JSON);
}

async function saveUsers(users, context, options = {}) {
  const filePath = getAppFilePaths(context.dataFolder).users;

  if (options.backup) {
    const backup = await context.storage.backupJsonFile(filePath, getAppFilePaths(context.dataFolder).backups);
    if (!backup.ok && backup.error.code !== ErrorCodes.FILE_MISSING) {
      return backup;
    }
  }

  return context.storage.writeJsonFile(filePath, users);
}

function normalizeUserInput(input) {
  const username = normalizeUsername(input?.username);
  const password = String(input?.password ?? '');
  const name = String(input?.name ?? '').trim();
  const department = String(input?.department ?? '').trim();
  const permissions = normalizePermissions(input?.permissions);

  if (!username) {
    return failureFromCode(ErrorCodes.USERNAME_REQUIRED);
  }

  if (!password) {
    return failureFromCode(ErrorCodes.PASSWORD_REQUIRED);
  }

  return success({ username, password, name, department, permissions });
}

function normalizeStoredUser(user) {
  return {
    ...user,
    name: String(user?.name ?? '').trim(),
    department: String(user?.department ?? '').trim(),
    permissions: normalizePermissions(user?.permissions)
  };
}

function normalizePermissions(input) {
  return Object.fromEntries(Object.entries(sectionPermissions).map(([section, defaults]) => {
    const current = input?.[section] ?? {};
    const visible = typeof current.visible === 'boolean' ? current.visible : defaults.visible;
    const edit = visible && defaults.edit && (typeof current.edit === 'boolean' ? current.edit : defaults.edit);
    return [section, { visible, edit }];
  }));
}

function findUserByUsername(users, username, ignoredId = undefined) {
  return users.find((user) => user.id !== ignoredId && user.username === username);
}

function normalizeUsername(value) {
  return String(value ?? '').trim().replace(/\s+/g, '_');
}

function nextUserId(users) {
  const max = users.reduce((highest, user) => {
    const number = Number.parseInt(String(user.id ?? '').replace(/^US-/, ''), 10);
    return Number.isFinite(number) ? Math.max(highest, number) : highest;
  }, 0);
  return `US-${String(max + 1).padStart(4, '0')}`;
}

function withoutPrivateFields(user) {
  const { password, ...safeUser } = user;
  return safeUser;
}

function requireDataFolder(options = {}) {
  if (!options?.dataFolder) {
    return failureFromCode(ErrorCodes.FILE_MISSING, { path: 'dataFolder' });
  }

  return success({
    dataFolder: options.dataFolder,
    storage: options.storage ?? defaultStorage,
    now: options.now
  });
}

function getNow(context) {
  return typeof context.now === 'function' ? context.now() : new Date().toISOString();
}
