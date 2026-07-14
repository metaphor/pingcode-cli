'use strict';

const fs = require('node:fs');
const path = require('node:path');

const core = require('../scripts/core');

const SAFE_SHELL_RE = /^[A-Za-z0-9_/:=.,+-]+$/;

function shellQuote(value) {
  if (SAFE_SHELL_RE.test(value)) {
    return value;
  }
  return "'" + value.replace(/'/g, "'\\''") + "'";
}

function tmpFile(tmpdir, name) {
  return path.join(tmpdir, name);
}

function clearEnv() {
  const original = {};
  for (const key of Object.keys(process.env)) {
    original[key] = process.env[key];
  }
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  process.env.PATH = original.PATH || '';
  return original;
}

function restoreEnv(original) {
  for (const key of Object.keys(process.env)) {
    delete process.env[key];
  }
  for (const [key, value] of Object.entries(original)) {
    process.env[key] = value;
  }
}

function fakeResponse(payload, status = 200) {
  const content = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { get: () => null },
    text: async () => content,
  };
}

function mockFetch(response) {
  global.fetch = async (url, options) => {
    if (typeof response === 'function') {
      return response(url, options);
    }
    if (Array.isArray(response)) {
      const next = response.shift();
      return next;
    }
    return response;
  };
}

function writeWorkspaceCache(cachePath, {
  preferences = {},
  users = null,
  projects = null,
  sprints = null,
  work_item_types = null,
  work_item_states = null,
  work_item_priorities = null,
  work_item_properties = null,
  idea_states = null,
  idea_priorities = null,
} = {}) {
  const payload = core.emptyWorkspaceCache();
  payload.preferences = preferences;
  if (users !== null) payload.users = { values: users };
  if (projects !== null) payload.projects = { values: projects };
  if (sprints !== null) payload.sprints = sprints;
  if (work_item_types !== null) payload.work_item_types = work_item_types;
  if (work_item_states !== null) payload.work_item_states = work_item_states;
  if (work_item_priorities !== null) payload.work_item_priorities = work_item_priorities;
  if (work_item_properties !== null) payload.work_item_properties = work_item_properties;
  if (idea_states !== null) payload.idea_states = idea_states;
  if (idea_priorities !== null) payload.idea_priorities = idea_priorities;
  fs.writeFileSync(cachePath, JSON.stringify(payload, null, 2));
  return payload;
}

module.exports = {
  shellQuote,
  tmpFile,
  clearEnv,
  restoreEnv,
  fakeResponse,
  mockFetch,
  writeWorkspaceCache,
};
