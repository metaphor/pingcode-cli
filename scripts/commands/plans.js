'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

function printHelp() {
  console.log([
    'PingCode plans — Manage configuration plans (type, state, property schemes)',
    '',
    'Usage: pingcode plans <subcommand> [options]',
    '',
    'Type plan subcommands:',
    '  type-plan-list [options]    List work item type plans',
    '    --project-id ID           Only the plan applied by the given project',
    '  type-plan-get <plan_id>     Show one work item type plan',
    '  type-plan-type-add <plan_id> <type_id>',
    '                              Add a work item type to a type plan',
    '  type-plan-type-get <plan_id> <type_id>',
    '                              Show one work item type in a type plan',
    '  type-plan-type-update <plan_id> <type_id> --sub-type-ids IDS',
    '                              Partially update a type in a type plan (set sub types)',
    '  type-plan-type-list <plan_id>',
    '                              List the work item types of a type plan',
    '  type-plan-type-remove <plan_id> <type_id>',
    '                              Remove a work item type from a type plan',
    '',
    'State plan subcommands:',
    '  state-plan-list [options]   List work item state plans',
    '    --project-id ID           Only the plan applied by the given project',
    '  state-plan-get <plan_id>    Show one work item state plan',
    '  state-plan-state-add <plan_id> <state_id>',
    '                              Add a work item state to a state plan',
    '  state-plan-state-get <plan_id> <state_id>',
    '                              Show one state in a state plan',
    '  state-plan-state-list <plan_id>',
    '                              List the states of a state plan',
    '  state-plan-state-remove <plan_id> <state_id>',
    '                              Remove a state from a state plan',
    '  flow-add <plan_id> <from_state_id> <to_state_id>',
    '                              Add a state flow to a state plan',
    '  flow-get <plan_id> <flow_id>',
    '                              Show one state flow in a state plan',
    '  flow-list <plan_id> [options]',
    '                              List the state flows of a state plan',
    '    --from-state ID           Filter flows by source state id',
    '  flow-remove <plan_id> <flow_id>',
    '                              Remove a state flow from a state plan',
    '',
    'Property plan subcommands:',
    '  property-plan-list [options]',
    '                              List work item property plans',
    '    --project-id ID           Only the plan applied by the given project',
    '  property-plan-get <plan_id>',
    '                              Show one work item property plan',
    '  property-plan-property-add <plan_id> <property_id>',
    '                              Add a work item property to a property plan',
    '  property-plan-property-get <plan_id> <property_id>',
    '                              Show one property in a property plan',
    '  property-plan-property-list <plan_id>',
    '                              List the properties of a property plan',
    '  property-plan-property-remove <plan_id> <property_id>',
    '                              Remove a property from a property plan',
    '',
    'Global options:',
    '  --base-url URL              PingCode base URL',
    '  --client-id ID              OAuth client ID',
    '  --client-secret SECRET      OAuth client secret',
    '  --token TOKEN               Bearer token (skip OAuth)',
    '  --user-id ID                Current user ID',
    '  --user-name NAME            Current user name',
    '  --workspace-cache PATH      Workspace cache file path',
    '  --no-workspace-cache        Disable workspace cache',
    '  --no-token-cache            Disable token cache',
    '  --dry-run                   Show API request without executing',
    '  --compact                   Compact output',
    '  --grant-type TYPE           OAuth grant type: client_credentials, authorization_code, or auto (default; uses cached token type)',
    '  --help                      Show this help',
  ].join('\n'));
}

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'type-plan-list':
      console.log([
        'Usage: pingcode plans type-plan-list [options]',
        '',
        'List work item type plans.',
        '',
        'Options:',
        '  --project-id ID           Only the plan applied by the given project',
      ].join('\n'));
      break;
    case 'type-plan-get':
      console.log([
        'Usage: pingcode plans type-plan-get <plan_id>',
        '',
        'Show one work item type plan.',
      ].join('\n'));
      break;
    case 'type-plan-type-add':
      console.log([
        'Usage: pingcode plans type-plan-type-add <plan_id> <type_id>',
        '',
        'Add a work item type to a type plan.',
      ].join('\n'));
      break;
    case 'type-plan-type-get':
      console.log([
        'Usage: pingcode plans type-plan-type-get <plan_id> <type_id>',
        '',
        'Show one work item type in a type plan.',
      ].join('\n'));
      break;
    case 'type-plan-type-update':
      console.log([
        'Usage: pingcode plans type-plan-type-update <plan_id> <type_id> --sub-type-ids IDS',
        '',
        'Partially update a work item type inside a type plan (sets its sub types).',
        'The API only documents a partial update for this resource, so this sends PATCH.',
        '',
        'Options:',
        '  --sub-type-ids IDS        Comma-separated sub work item type ids (max 20)',
      ].join('\n'));
      break;
    case 'type-plan-type-list':
      console.log([
        'Usage: pingcode plans type-plan-type-list <plan_id>',
        '',
        'List the work item types of a type plan.',
      ].join('\n'));
      break;
    case 'type-plan-type-remove':
      console.log([
        'Usage: pingcode plans type-plan-type-remove <plan_id> <type_id>',
        '',
        'Remove a work item type from a type plan.',
      ].join('\n'));
      break;
    case 'state-plan-list':
      console.log([
        'Usage: pingcode plans state-plan-list [options]',
        '',
        'List work item state plans.',
        '',
        'Options:',
        '  --project-id ID           Only the plan applied by the given project',
      ].join('\n'));
      break;
    case 'state-plan-get':
      console.log([
        'Usage: pingcode plans state-plan-get <plan_id>',
        '',
        'Show one work item state plan.',
      ].join('\n'));
      break;
    case 'state-plan-state-add':
      console.log([
        'Usage: pingcode plans state-plan-state-add <plan_id> <state_id>',
        '',
        'Add a work item state to a state plan.',
      ].join('\n'));
      break;
    case 'state-plan-state-get':
      console.log([
        'Usage: pingcode plans state-plan-state-get <plan_id> <state_id>',
        '',
        'Show one work item state in a state plan.',
      ].join('\n'));
      break;
    case 'state-plan-state-list':
      console.log([
        'Usage: pingcode plans state-plan-state-list <plan_id>',
        '',
        'List the work item states of a state plan.',
      ].join('\n'));
      break;
    case 'state-plan-state-remove':
      console.log([
        'Usage: pingcode plans state-plan-state-remove <plan_id> <state_id>',
        '',
        'Remove a work item state from a state plan.',
      ].join('\n'));
      break;
    case 'flow-add':
      console.log([
        'Usage: pingcode plans flow-add <plan_id> <from_state_id> <to_state_id>',
        '',
        'Add a work item state flow (a allowed transition) to a state plan.',
      ].join('\n'));
      break;
    case 'flow-get':
      console.log([
        'Usage: pingcode plans flow-get <plan_id> <flow_id>',
        '',
        'Show one work item state flow in a state plan.',
      ].join('\n'));
      break;
    case 'flow-list':
      console.log([
        'Usage: pingcode plans flow-list <plan_id> [options]',
        '',
        'List the work item state flows of a state plan.',
        '',
        'Options:',
        '  --from-state ID           Filter flows by source state id',
      ].join('\n'));
      break;
    case 'flow-remove':
      console.log([
        'Usage: pingcode plans flow-remove <plan_id> <flow_id>',
        '',
        'Remove a work item state flow from a state plan.',
      ].join('\n'));
      break;
    case 'property-plan-list':
      console.log([
        'Usage: pingcode plans property-plan-list [options]',
        '',
        'List work item property plans.',
        '',
        'Options:',
        '  --project-id ID           Only the plan applied by the given project',
      ].join('\n'));
      break;
    case 'property-plan-get':
      console.log([
        'Usage: pingcode plans property-plan-get <plan_id>',
        '',
        'Show one work item property plan.',
      ].join('\n'));
      break;
    case 'property-plan-property-add':
      console.log([
        'Usage: pingcode plans property-plan-property-add <plan_id> <property_id>',
        '',
        'Add a work item property to a property plan.',
      ].join('\n'));
      break;
    case 'property-plan-property-get':
      console.log([
        'Usage: pingcode plans property-plan-property-get <plan_id> <property_id>',
        '',
        'Show one work item property in a property plan.',
      ].join('\n'));
      break;
    case 'property-plan-property-list':
      console.log([
        'Usage: pingcode plans property-plan-property-list <plan_id>',
        '',
        'List the work item properties of a property plan.',
      ].join('\n'));
      break;
    case 'property-plan-property-remove':
      console.log([
        'Usage: pingcode plans property-plan-property-remove <plan_id> <property_id>',
        '',
        'Remove a work item property from a property plan.',
      ].join('\n'));
      break;
    default:
      printHelp();
  }
}

// ── Argument parsing ──────────────────────────────────────────────────────

function parseSubArgs(tokens, subcommand, spec) {
  const flags = (spec && spec.flags) || {};
  const args = {};
  for (const key of Object.values(flags)) args[key] = null;

  const positionals = [];
  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      const flag = eqIndex === -1 ? arg : arg.slice(0, eqIndex);
      const inlineValue = eqIndex === -1 ? undefined : arg.slice(eqIndex + 1);

      if (flag in flags) {
        let value = inlineValue;
        if (value === undefined) {
          if (i + 1 >= tokens.length) {
            throw new core.PingCodeError(`Flag ${flag} requires a value`);
          }
          value = tokens[i + 1];
          i += 1;
        }
        args[flags[flag]] = value;
      } else if (shared.BASE_GLOBAL_BOOLEAN_FLAGS.has(arg)) {
        // Global boolean flag (e.g. --dry-run); handled by parseGlobalOptions.
      } else {
        throw new core.PingCodeError(`Unknown option: ${flag}. Use plans ${subcommand} --help for usage.`);
      }
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, args };
}

function requirePlanId(positionals, subcommand) {
  if (positionals.length === 0) {
    throw new core.PingCodeError(`A plan id is required. Use plans ${subcommand} --help for usage.`);
  }
}

function rejectExtraPositionals(positionals, index, subcommand) {
  if (positionals.length > index) {
    throw new core.PingCodeError(`Unexpected argument: ${positionals[index]}. Use plans ${subcommand} --help for usage.`);
  }
}

function parsePlanListArgs(tokens, subcommand) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, {
    flags: { '--project-id': 'project_id' },
  });
  rejectExtraPositionals(positionals, 0, subcommand);
  return args;
}

function parsePlanIdArgs(tokens, subcommand) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, {});
  requirePlanId(positionals, subcommand);
  rejectExtraPositionals(positionals, 1, subcommand);
  args.plan_id = positionals[0];
  return args;
}

function parsePlanNestedArgs(tokens, subcommand, secondKey, secondLabel) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, {});
  requirePlanId(positionals, subcommand);
  if (positionals.length === 1) {
    throw new core.PingCodeError(`A ${secondLabel} is required. Use plans ${subcommand} --help for usage.`);
  }
  rejectExtraPositionals(positionals, 2, subcommand);
  args.plan_id = positionals[0];
  args[secondKey] = positionals[1];
  return args;
}

function parseFlowAddArgs(tokens, subcommand) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, {});
  requirePlanId(positionals, subcommand);
  if (positionals.length === 1) {
    throw new core.PingCodeError('A from_state_id is required. Use plans flow-add --help for usage.');
  }
  if (positionals.length === 2) {
    throw new core.PingCodeError('A to_state_id is required. Use plans flow-add --help for usage.');
  }
  rejectExtraPositionals(positionals, 3, subcommand);
  args.plan_id = positionals[0];
  args.from_state_id = positionals[1];
  args.to_state_id = positionals[2];
  return args;
}

function parseFlowListArgs(tokens, subcommand) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, {
    flags: { '--from-state': 'from_state_id' },
  });
  requirePlanId(positionals, subcommand);
  rejectExtraPositionals(positionals, 1, subcommand);
  args.plan_id = positionals[0];
  return args;
}

function parseTypeUpdateArgs(tokens, subcommand) {
  const { positionals, args } = parseSubArgs(tokens, subcommand, {
    flags: { '--sub-type-ids': 'sub_type_ids' },
  });
  requirePlanId(positionals, subcommand);
  if (positionals.length === 1) {
    throw new core.PingCodeError('A work item type id is required. Use plans type-plan-type-update --help for usage.');
  }
  rejectExtraPositionals(positionals, 2, subcommand);
  if (!args.sub_type_ids) {
    throw new core.PingCodeError('--sub-type-ids is required and must be non-empty. Use plans type-plan-type-update --help for usage.');
  }
  args.plan_id = positionals[0];
  args.type_id = positionals[1];
  args.sub_type_ids = args.sub_type_ids.split(',').map((id) => id.trim()).filter((id) => id.length > 0);
  if (args.sub_type_ids.length === 0) {
    throw new core.PingCodeError('--sub-type-ids is required and must be non-empty. Use plans type-plan-type-update --help for usage.');
  }
  return args;
}

// ── Run handlers ───────────────────────────────────────────────────────
// The API docs define, per plan kind, only: plan list/get, nested resource
// add/get/list/remove, plus a partial update for nested types. There is no
// plan-level create/update/delete and no state-flow update in the docs.

const TYPE_PLANS_PATH = '/v1/pjm/work_item_type_plans';
const STATE_PLANS_PATH = '/v1/pjm/work_item_state_plans';
const PROPERTY_PLANS_PATH = '/v1/pjm/work_item_property_plans';

function makePlanList(basePath) {
  return async (client, opts, args) => {
    const params = {};
    if (args.project_id) {
      params.project_id = args.project_id;
    }
    return await client.request(
      'GET',
      basePath,
      params,
      null,
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  };
}

function makePlanGet(basePath) {
  return async (client, opts, args) => {
    return await client.request(
      'GET',
      `${basePath}/${encodeURIComponent(args.plan_id)}`,
      null,
      null,
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  };
}

function makeNestedAdd(basePath, nested, bodyKey, argKey) {
  return async (client, opts, args) => {
    return await client.request(
      'POST',
      `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}`,
      null,
      { [bodyKey]: args[argKey] },
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  };
}

function makeNestedGet(basePath, nested, argKey) {
  return async (client, opts, args) => {
    return await client.request(
      'GET',
      `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}/${encodeURIComponent(args[argKey])}`,
      null,
      null,
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  };
}

function makeNestedList(basePath, nested) {
  return async (client, opts, args) => {
    return await client.request(
      'GET',
      `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}`,
      null,
      null,
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  };
}

function makeNestedRemove(basePath, nested, argKey) {
  return async (client, opts, args) => {
    return await client.request(
      'DELETE',
      `${basePath}/${encodeURIComponent(args.plan_id)}/${nested}/${encodeURIComponent(args[argKey])}`,
      null,
      null,
      { dry_run: opts.dry_run, use_workspace_cache: true },
    );
  };
}

const runTypePlanList = makePlanList(TYPE_PLANS_PATH);
const runTypePlanGet = makePlanGet(TYPE_PLANS_PATH);
const runTypePlanTypeAdd = makeNestedAdd(TYPE_PLANS_PATH, 'work_item_types', 'work_item_type_id', 'type_id');
const runTypePlanTypeGet = makeNestedGet(TYPE_PLANS_PATH, 'work_item_types', 'type_id');
const runTypePlanTypeList = makeNestedList(TYPE_PLANS_PATH, 'work_item_types');
const runTypePlanTypeRemove = makeNestedRemove(TYPE_PLANS_PATH, 'work_item_types', 'type_id');

const runStatePlanList = makePlanList(STATE_PLANS_PATH);
const runStatePlanGet = makePlanGet(STATE_PLANS_PATH);
const runStatePlanStateAdd = makeNestedAdd(STATE_PLANS_PATH, 'work_item_states', 'state_id', 'state_id');
const runStatePlanStateGet = makeNestedGet(STATE_PLANS_PATH, 'work_item_states', 'state_id');
const runStatePlanStateList = makeNestedList(STATE_PLANS_PATH, 'work_item_states');
const runStatePlanStateRemove = makeNestedRemove(STATE_PLANS_PATH, 'work_item_states', 'state_id');

const runPropertyPlanList = makePlanList(PROPERTY_PLANS_PATH);
const runPropertyPlanGet = makePlanGet(PROPERTY_PLANS_PATH);
const runPropertyPlanPropertyAdd = makeNestedAdd(PROPERTY_PLANS_PATH, 'work_item_properties', 'property_id', 'property_id');
const runPropertyPlanPropertyGet = makeNestedGet(PROPERTY_PLANS_PATH, 'work_item_properties', 'property_id');
const runPropertyPlanPropertyList = makeNestedList(PROPERTY_PLANS_PATH, 'work_item_properties');
const runPropertyPlanPropertyRemove = makeNestedRemove(PROPERTY_PLANS_PATH, 'work_item_properties', 'property_id');

async function runTypePlanTypeUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    `${TYPE_PLANS_PATH}/${encodeURIComponent(args.plan_id)}/work_item_types/${encodeURIComponent(args.type_id)}`,
    null,
    { sub_type_ids: args.sub_type_ids },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runFlowAdd(client, opts, args) {
  return await client.request(
    'POST',
    `${STATE_PLANS_PATH}/${encodeURIComponent(args.plan_id)}/work_item_state_flows`,
    null,
    { from_state_id: args.from_state_id, to_state_id: args.to_state_id },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runFlowGet(client, opts, args) {
  return await client.request(
    'GET',
    `${STATE_PLANS_PATH}/${encodeURIComponent(args.plan_id)}/work_item_state_flows/${encodeURIComponent(args.flow_id)}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runFlowList(client, opts, args) {
  const params = {};
  if (args.from_state_id) {
    params.from_state_id = args.from_state_id;
  }
  return await client.request(
    'GET',
    `${STATE_PLANS_PATH}/${encodeURIComponent(args.plan_id)}/work_item_state_flows`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

async function runFlowRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `${STATE_PLANS_PATH}/${encodeURIComponent(args.plan_id)}/work_item_state_flows/${encodeURIComponent(args.flow_id)}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────────

async function run(argv) {
  const tokens = argv || [];

  if (tokens.length === 0 || tokens[0] === '--help' || tokens[0] === '-h') {
    printHelp();
    return;
  }

  const subcommand = tokens[0];
  const remaining = tokens.slice(1);

  if (remaining.includes('--help') || remaining.includes('-h')) {
    printSubcommandHelp(subcommand);
    return;
  }

  const { opts, remaining: subArgs } = shared.parseGlobalOptions(remaining);
  const client = shared.clientFromOpts(opts);

  try {
    let result;
    switch (subcommand) {
      case 'type-plan-list':
        result = await runTypePlanList(client, opts, parsePlanListArgs(subArgs, subcommand));
        break;
      case 'type-plan-get':
        result = await runTypePlanGet(client, opts, parsePlanIdArgs(subArgs, subcommand));
        break;
      case 'type-plan-type-add':
        result = await runTypePlanTypeAdd(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'type_id', 'work item type id'));
        break;
      case 'type-plan-type-get':
        result = await runTypePlanTypeGet(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'type_id', 'work item type id'));
        break;
      case 'type-plan-type-update':
        result = await runTypePlanTypeUpdate(client, opts, parseTypeUpdateArgs(subArgs, subcommand));
        break;
      case 'type-plan-type-list':
        result = await runTypePlanTypeList(client, opts, parsePlanIdArgs(subArgs, subcommand));
        break;
      case 'type-plan-type-remove':
        result = await runTypePlanTypeRemove(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'type_id', 'work item type id'));
        break;
      case 'state-plan-list':
        result = await runStatePlanList(client, opts, parsePlanListArgs(subArgs, subcommand));
        break;
      case 'state-plan-get':
        result = await runStatePlanGet(client, opts, parsePlanIdArgs(subArgs, subcommand));
        break;
      case 'state-plan-state-add':
        result = await runStatePlanStateAdd(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'state_id', 'work item state id'));
        break;
      case 'state-plan-state-get':
        result = await runStatePlanStateGet(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'state_id', 'work item state id'));
        break;
      case 'state-plan-state-list':
        result = await runStatePlanStateList(client, opts, parsePlanIdArgs(subArgs, subcommand));
        break;
      case 'state-plan-state-remove':
        result = await runStatePlanStateRemove(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'state_id', 'work item state id'));
        break;
      case 'flow-add':
        result = await runFlowAdd(client, opts, parseFlowAddArgs(subArgs, subcommand));
        break;
      case 'flow-get':
        result = await runFlowGet(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'flow_id', 'state flow id'));
        break;
      case 'flow-list':
        result = await runFlowList(client, opts, parseFlowListArgs(subArgs, subcommand));
        break;
      case 'flow-remove':
        result = await runFlowRemove(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'flow_id', 'state flow id'));
        break;
      case 'property-plan-list':
        result = await runPropertyPlanList(client, opts, parsePlanListArgs(subArgs, subcommand));
        break;
      case 'property-plan-get':
        result = await runPropertyPlanGet(client, opts, parsePlanIdArgs(subArgs, subcommand));
        break;
      case 'property-plan-property-add':
        result = await runPropertyPlanPropertyAdd(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'property_id', 'work item property id'));
        break;
      case 'property-plan-property-get':
        result = await runPropertyPlanPropertyGet(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'property_id', 'work item property id'));
        break;
      case 'property-plan-property-list':
        result = await runPropertyPlanPropertyList(client, opts, parsePlanIdArgs(subArgs, subcommand));
        break;
      case 'property-plan-property-remove':
        result = await runPropertyPlanPropertyRemove(client, opts, parsePlanNestedArgs(subArgs, subcommand, 'property_id', 'work item property id'));
        break;
      default:
        throw new core.PingCodeError(`Unknown plans subcommand: ${subcommand}. Use plans --help for usage.`);
    }

    if (opts.dry_run) {
      core.printJson(result);
    } else if (result !== null && result !== undefined) {
      if (opts.compact) {
        core.printJson(core.compactResponse(result));
      } else {
        core.printJson(result);
      }
    }
  } catch (exc) {
    throw exc;
  }
}

shared.registerModule('plans', {
  name: 'plans',
  description: 'Manage PingCode configuration plans (type, state, property schemes)',
  run,
});

module.exports = { run, printHelp };
