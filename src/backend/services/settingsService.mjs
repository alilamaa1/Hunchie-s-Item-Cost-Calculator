import { ErrorCodes } from '../../shared/errors.mjs';
import { failureFromCode, success } from '../../shared/result.mjs';
import { createDefaultSettings, validateSettings } from '../domain/settingsModel.mjs';
import { getAppFilePaths } from '../storage/appFiles.mjs';
import { backupJsonFile, readJsonFile, writeJsonFile } from '../storage/jsonStorage.mjs';

const defaultStorage = Object.freeze({
  backupJsonFile,
  readJsonFile,
  writeJsonFile
});

export async function loadSettings(options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const filePath = getAppFilePaths(context.data.dataFolder).settings;
  const settingsResult = await context.data.storage.readJsonFile(filePath);
  if (!settingsResult.ok) return settingsResult;

  const merged = mergeSettingsWithDefaults(settingsResult.data, context.data.dataFolder);
  const validation = validateSettings(merged);
  if (!validation.ok) return validation;

  return validation;
}

export async function updateSettings(input, options = {}) {
  const context = requireDataFolder(options);
  if (!context.ok) return context;

  const current = await loadSettings(context.data);
  if (!current.ok) return current;

  const next = mergeSettingsWithDefaults(
    {
      ...current.data,
      ...input,
      currency: {
        ...current.data.currency,
        ...input?.currency
      },
      formulas: {
        ...current.data.formulas,
        ...input?.formulas
      },
      dataFolder: current.data.dataFolder
    },
    context.data.dataFolder
  );

  const validation = validateSettings(next);
  if (!validation.ok) return validation;

  const filePath = getAppFilePaths(context.data.dataFolder).settings;
  const backup = await context.data.storage.backupJsonFile(filePath, getAppFilePaths(context.data.dataFolder).backups);
  if (!backup.ok && backup.error.code !== ErrorCodes.FILE_MISSING) {
    return backup;
  }

  const save = await context.data.storage.writeJsonFile(filePath, validation.data);
  if (!save.ok) return save;

  const warnings = [];
  if (validation.data.currency.usdToLbp !== current.data.currency.usdToLbp) {
    warnings.push({
      code: 'EXCHANGE_RATE_CHANGED',
      message: 'Changing the exchange rate affects displayed LBP/USD values. Raw material base costs remain stored safely.'
    });
  }

  return success({
    settings: validation.data,
    warnings
  });
}

export function mergeSettingsWithDefaults(settings, dataFolder) {
  const defaults = createDefaultSettings({ dataFolder });

  return {
    ...defaults,
    ...settings,
    currency: {
      ...defaults.currency,
      ...settings?.currency
    },
    formulas: {
      ...defaults.formulas,
      ...settings?.formulas
    },
    dataFolder: settings?.dataFolder || dataFolder
  };
}

function requireDataFolder(options = {}) {
  if (!options?.dataFolder) {
    return failureFromCode(ErrorCodes.FILE_MISSING, { path: 'dataFolder' });
  }

  return success({
    dataFolder: options.dataFolder,
    storage: options.storage ?? defaultStorage
  });
}
