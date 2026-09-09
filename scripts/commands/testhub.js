'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

const SUBCOMMANDS = [
  'library-list', 'library-create', 'library-get', 'library-update',
  'case-list', 'case-create', 'case-get', 'case-update', 'case-delete',
  'case-bulk-create', 'case-bulk-update', 'case-search', 'case-histories',
  'plan-list', 'plan-create', 'plan-get', 'plan-update',
  'run-list', 'run-create', 'run-get', 'run-update',
  'run-bulk-create', 'run-bulk-update', 'run-search', 'run-histories', 'run-history',
  'case-states', 'case-state-get',
  'case-types', 'case-type-get',
  'case-important-levels', 'case-important-level-get',
  'plan-states', 'plan-state-get',
  'run-statuses', 'run-status-get',
  'case-property-list', 'case-property-create', 'case-property-get', 'case-property-update',
  'case-property-plan-list', 'case-property-plan-get',
  'case-property-plan-property-add', 'case-property-plan-property-get',
  'case-property-plan-property-list', 'case-property-plan-property-remove',
  'library-member-add', 'library-member-get', 'library-member-list',
  'library-member-update', 'library-member-remove',
  'suite-add', 'suite-get', 'suite-list', 'suite-update', 'suite-delete',
  'plan-type-list', 'plan-type-get',
];

function printHelp() {
  console.log([
    'PingCode testhub — Manage PingCode testhub (test libraries, cases, plans, runs)',
    '',
    'Usage: pingcode testhub <subcommand> [options]',
    '',
    'Subcommands:',
    '  library-list [options]             List test libraries',
    '  library-create                     Create a test library',
    '  library-get <library_id>           Show a test library',
    '  library-update <library_id>        Update a test library',
    '',
    '  case-list [options]                List test cases',
    '  case-create                        Create a test case',
    '  case-get <case_id>                 Show a test case',
    '  case-update <case_id>              Update a test case',
    '  case-delete <case_id>              Delete a test case',
    '  case-bulk-create                   Bulk create test cases',
    '  case-bulk-update                   Bulk update test cases',
    '  case-search                        Search test cases by conditions',
    '  case-histories <case_id>           List latest execution results of a test case',
    '',
    '  plan-list <library_id> [options]   List test plans of a library',
    '  plan-create <library_id>           Create a test plan',
    '  plan-get <library_id> <plan_id>    Show a test plan',
    '  plan-update <library_id> <plan_id> Update a test plan',
    '',
    '  run-list [options]                 List test runs',
    '  run-create                         Create a test run',
    '  run-get <run_id>                   Show a test run',
    '  run-update <run_id>                Update a test run result',
    '  run-bulk-create                    Bulk create test runs',
    '  run-bulk-update                    Bulk update test runs',
    '  run-search                         Search test runs by conditions',
    '  run-histories <run_id>             List result records of a test run',
    '  run-history <run_id> <history_id>  Show one result record',
    '',
    '  case-states                        List all case states',
    '  case-state-get <state_id>          Show a case state',
    '  case-types                         List all case types',
    '  case-type-get <type_id>            Show a case type',
    '  case-important-levels              List all importance levels',
    '  case-important-level-get <id>      Show an importance level',
    '  plan-states                        List all plan states',
    '  plan-state-get <state_id>          Show a plan state',
    '  run-statuses                       List all execution results',
    '  run-status-get <status_id>         Show an execution result',
    '',
    '  case-property-list                 List all case properties',
    '  case-property-create               Create a case property',
    '  case-property-get <property_id>    Show a case property',
    '  case-property-update <property_id> Update a case property',
    '  case-property-plan-list [options]  List case property plans',
    '  case-property-plan-get <id>        Show a case property plan',
    '  case-property-plan-property-add    Add a property to a plan',
    '  case-property-plan-property-get    Show a property of a plan',
    '  case-property-plan-property-list   List properties of a plan',
    '  case-property-plan-property-remove Remove a property from a plan',
    '',
    '  library-member-add <library_id>    Add a member to a test library',
    '  library-member-get <lib> <member>  Show a library member',
    '  library-member-list <library_id>   List library members',
    '  library-member-update <lib> <mem>  Update a library member role',
    '  library-member-remove <lib> <mem>  Remove a library member',
    '',
    '  suite-add <library_id>             Add a case suite (module)',
    '  suite-get <library_id> <suite_id>  Show a case suite',
    '  suite-list <library_id> [options]  List case suites',
    '  suite-update <lib> <suite_id>      Update a case suite',
    '  suite-delete <lib> <suite_id>      Delete a case suite',
    '',
    '  plan-type-list <library_id>        List plan types of a library',
    '  plan-type-get <lib> <plan_type_id> Show a plan type',
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

const SUBCOMMAND_HELP = {
  'library-list': [
    'Usage: pingcode testhub library-list [options]',
    '',
    'List test libraries.',
    '',
    'Options:',
    '  --scope-type TYPE         organization or user_group',
    '  --scope-id ID             Owning team id (required when scope-type is user_group)',
    '  --keywords TEXT           Filter by name',
    '  --member-type TYPE        user or user_group (requires --member-id)',
    '  --member-id ID            Member id (requires --member-type)',
    '  --created-between A,B     Created between two timestamps (comma separated)',
    '  --updated-between A,B     Updated between two timestamps (comma separated)',
    '  --include-deleted         Include deleted libraries',
    '  --include-archived        Include archived libraries',
  ].join('\n'),
  'library-create': [
    'Usage: pingcode testhub library-create --name NAME --identifier ID [options]',
    '',
    'Create a test library.',
    '',
    'Options:',
    '  --name NAME               Library name (required)',
    '  --identifier ID           Unique library identifier (required)',
    '  --scope-type TYPE         organization (default) or user_group',
    '  --scope-id ID             Owning team id (required when scope-type is user_group)',
    '  --visibility VIS          public or private (default private)',
    '  --description TEXT        Library description',
    '  --members JSON            JSON array of members, e.g. [{"id":"...","type":"user"}]',
  ].join('\n'),
  'library-get': [
    'Usage: pingcode testhub library-get <library_id> [options]',
    '',
    'Show a test library.',
    '',
    'Options:',
    '  --include-deleted         Include deleted libraries',
    '  --include-archived        Include archived libraries',
  ].join('\n'),
  'library-update': [
    'Usage: pingcode testhub library-update <library_id> [options]',
    '',
    'Partially update a test library.',
    '',
    'Options:',
    '  --name NAME               New library name',
    '  --identifier ID           New library identifier',
    '  --description TEXT        New library description',
  ].join('\n'),
  'case-list': [
    'Usage: pingcode testhub case-list [options]',
    '',
    'List test cases. For complex filters use case-search.',
    '',
    'Options:',
    '  --library-id ID           Filter by test library',
    '  --maintenance-id ID       Filter by maintainer',
    '  --state-id ID             Filter by state',
    '  --important-level-id ID   Filter by importance level',
    '  --tag-id ID               Filter by tag',
    '  --keywords TEXT           Keywords (case number and title)',
    '  --include-public-image-token FIELDS  Comma separated fields, e.g. description',
    '  --include-deleted         Include deleted cases',
    '  --include-archived        Include archived cases',
  ].join('\n'),
  'case-create': [
    'Usage: pingcode testhub case-create --library-id ID --title TEXT [options]',
    '',
    'Create a test case.',
    '',
    'Options:',
    '  --library-id ID           Test library id (required)',
    '  --title TEXT              Case title (required)',
    '  --suite-id ID             Suite (module) id',
    '  --type-id ID              Case type id',
    '  --important-level-id ID   Importance level id',
    '  --maintenance-id ID       Maintainer user id',
    '  --participant-ids IDS     Comma separated participant user ids',
    '  --properties JSON         Custom properties as JSON object',
    '  --description TEXT        Case description',
    '  --precondition TEXT       Case precondition',
    '  --steps JSON              Steps as JSON array',
  ].join('\n'),
  'case-get': [
    'Usage: pingcode testhub case-get <case_id> [options]',
    '',
    'Show a test case by id or short_id.',
    '',
    'Options:',
    '  --include-public-image-token FIELDS  Comma separated fields, e.g. description',
  ].join('\n'),
  'case-update': [
    'Usage: pingcode testhub case-update <case_id> [options]',
    '',
    'Partially update a test case.',
    '',
    'Options:',
    '  --suite-id ID             Suite (module) id',
    '  --state-id ID             Case state id',
    '  --type-id ID              Case type id',
    '  --title TEXT              Case title',
    '  --important-level-id ID   Importance level id',
    '  --maintenance-id ID       Maintainer user id',
    '  --properties JSON         Custom properties as JSON object',
    '  --description TEXT        Case description',
    '  --precondition TEXT       Case precondition',
    '  --steps JSON              Steps as JSON array (replaces all steps)',
  ].join('\n'),
  'case-delete': [
    'Usage: pingcode testhub case-delete <case_id>',
    '',
    'Delete a test case.',
  ].join('\n'),
  'case-bulk-create': [
    'Usage: pingcode testhub case-bulk-create --items JSON',
    '',
    'Bulk create test cases (max 100).',
    '',
    'Options:',
    '  --items JSON              JSON array of case objects (required)',
  ].join('\n'),
  'case-bulk-update': [
    'Usage: pingcode testhub case-bulk-update --items JSON',
    '',
    'Bulk update test cases.',
    '',
    'Options:',
    '  --items JSON              JSON array of case objects with case_id (required)',
  ].join('\n'),
  'case-search': [
    'Usage: pingcode testhub case-search [options]',
    '',
    'Search test cases by conditions (POST /cases/search, mode=query).',
    '',
    'Options:',
    '  --filter JSON             Structured filter as JSON object (Mongo-like syntax)',
    '  --keywords TEXT           Keywords (case number and title)',
    '  --limit N                 Page size (1-100)',
    '  --page-index N            Page index, starts from 0',
    '  --include-public-image-token FIELDS  Comma separated fields, e.g. description',
    '  --include-deleted         Include deleted cases',
    '  --include-archived        Include archived cases',
  ].join('\n'),
  'case-histories': [
    'Usage: pingcode testhub case-histories <case_id>',
    '',
    'List latest execution results for every run of a test case.',
  ].join('\n'),
  'plan-list': [
    'Usage: pingcode testhub plan-list <library_id> [options]',
    '',
    'List test plans of a test library.',
    '',
    'Options:',
    '  --name TEXT               Filter by plan name',
    '  --created-between A,B     Created between two timestamps (comma separated)',
    '  --updated-between A,B     Updated between two timestamps (comma separated)',
  ].join('\n'),
  'plan-create': [
    'Usage: pingcode testhub plan-create <library_id> --name NAME --type-id ID --start-at TS --end-at TS --assignee-id ID [options]',
    '',
    'Create a test plan.',
    '',
    'Options:',
    '  --name NAME               Plan name, unique in the library (required)',
    '  --type-id ID              Plan type id (required)',
    '  --start-at TS             Start time, Unix timestamp (required)',
    '  --end-at TS               End time, Unix timestamp (required)',
    '  --assignee-id ID          Assignee user id (required)',
    '  --project-id ID           Project id (required when sprint-id or version-id is set)',
    '  --sprint-id ID            Sprint id (iteration plans only)',
    '  --version-id ID           Version id (release plans only)',
  ].join('\n'),
  'plan-get': [
    'Usage: pingcode testhub plan-get <library_id> <plan_id>',
    '',
    'Show a test plan by id or short_id.',
  ].join('\n'),
  'plan-update': [
    'Usage: pingcode testhub plan-update <library_id> <plan_id> [options]',
    '',
    'Partially update a test plan.',
    '',
    'Options:',
    '  --name NAME               Plan name',
    '  --type-id ID              Plan type id',
    '  --project-id ID           Project id',
    '  --sprint-id ID            Sprint id (iteration plans only)',
    '  --version-id ID           Version id (release plans only)',
    '  --start-at TS             Start time, Unix timestamp',
    '  --end-at TS               End time, Unix timestamp',
    '  --assignee-id ID          Assignee user id',
    '  --state-id ID             Plan state id',
    '  --summary TEXT            Test report summary',
  ].join('\n'),
  'run-list': [
    'Usage: pingcode testhub run-list [options]',
    '',
    'List test runs. For complex filters use run-search.',
    '',
    'Options:',
    '  --plan-id ID              Filter by test plan',
    '  --case-id ID              Filter by test case',
    '  --suite-id ID             Filter by suite (module)',
    '  --status-id ID            Filter by execution result',
    '  --keywords TEXT           Keywords (case number and title)',
  ].join('\n'),
  'run-create': [
    'Usage: pingcode testhub run-create --library-id ID --plan-id ID --case-id ID [options]',
    '',
    'Create a test run.',
    '',
    'Options:',
    '  --library-id ID           Test library id (required)',
    '  --plan-id ID              Test plan id (required)',
    '  --case-id ID              Test case id (required)',
    '  --executor-id ID          Executor user id',
  ].join('\n'),
  'run-get': [
    'Usage: pingcode testhub run-get <run_id>',
    '',
    'Show a test run by id or short_id.',
  ].join('\n'),
  'run-update': [
    'Usage: pingcode testhub run-update <run_id> --status-id ID [options]',
    '',
    'Partially update a test run result.',
    '',
    'Options:',
    '  --status-id ID            Execution result id (required)',
    '  --remark TEXT             Result remark',
    '  --steps JSON              Steps as JSON array (replaces all steps)',
    '  --executor-id ID          Executor user id',
  ].join('\n'),
  'run-bulk-create': [
    'Usage: pingcode testhub run-bulk-create --items JSON',
    '',
    'Bulk create test runs (max 100).',
    '',
    'Options:',
    '  --items JSON              JSON array of run objects (required)',
  ].join('\n'),
  'run-bulk-update': [
    'Usage: pingcode testhub run-bulk-update --items JSON',
    '',
    'Bulk update test runs.',
    '',
    'Options:',
    '  --items JSON              JSON array of run objects with run_id (required)',
  ].join('\n'),
  'run-search': [
    'Usage: pingcode testhub run-search [options]',
    '',
    'Search test runs by conditions (POST /runs/search, mode=query).',
    '',
    'Options:',
    '  --filter JSON             Structured filter as JSON object (Mongo-like syntax)',
    '  --keywords TEXT           Keywords (case number and title)',
    '  --limit N                 Page size (1-100)',
    '  --page-index N            Page index, starts from 0',
  ].join('\n'),
  'run-histories': [
    'Usage: pingcode testhub run-histories <run_id>',
    '',
    'List result records of a test run.',
  ].join('\n'),
  'run-history': [
    'Usage: pingcode testhub run-history <run_id> <history_id>',
    '',
    'Show one result record of a test run.',
  ].join('\n'),
  'case-states': [
    'Usage: pingcode testhub case-states',
    '',
    'List all case states.',
  ].join('\n'),
  'case-state-get': [
    'Usage: pingcode testhub case-state-get <state_id>',
    '',
    'Show a case state.',
  ].join('\n'),
  'case-types': [
    'Usage: pingcode testhub case-types',
    '',
    'List all case types.',
  ].join('\n'),
  'case-type-get': [
    'Usage: pingcode testhub case-type-get <type_id>',
    '',
    'Show a case type.',
  ].join('\n'),
  'case-important-levels': [
    'Usage: pingcode testhub case-important-levels',
    '',
    'List all case importance levels.',
  ].join('\n'),
  'case-important-level-get': [
    'Usage: pingcode testhub case-important-level-get <important_level_id>',
    '',
    'Show a case importance level.',
  ].join('\n'),
  'plan-states': [
    'Usage: pingcode testhub plan-states',
    '',
    'List all test plan states.',
  ].join('\n'),
  'plan-state-get': [
    'Usage: pingcode testhub plan-state-get <state_id>',
    '',
    'Show a test plan state.',
  ].join('\n'),
  'run-statuses': [
    'Usage: pingcode testhub run-statuses',
    '',
    'List all execution result statuses.',
  ].join('\n'),
  'run-status-get': [
    'Usage: pingcode testhub run-status-get <status_id>',
    '',
    'Show an execution result status.',
  ].join('\n'),
  'case-property-list': [
    'Usage: pingcode testhub case-property-list',
    '',
    'List all case properties.',
  ].join('\n'),
  'case-property-create': [
    'Usage: pingcode testhub case-property-create --name NAME --type TYPE [options]',
    '',
    'Create a case property.',
    '',
    'Options:',
    '  --name NAME               Property name, unique in the enterprise (required)',
    '  --type TYPE               Property type (required): text, textarea, select,',
    '                            multi_select, cascade_select, cascade_multi_select,',
    '                            member, members, date, number, progress, rate, link',
    '  --options JSON            JSON array of select options, e.g. [{"text":"严重"}]',
  ].join('\n'),
  'case-property-get': [
    'Usage: pingcode testhub case-property-get <property_id>',
    '',
    'Show a case property.',
  ].join('\n'),
  'case-property-update': [
    'Usage: pingcode testhub case-property-update <property_id> [options]',
    '',
    'Partially update a case property.',
    '',
    'Options:',
    '  --name NAME               New property name',
    '  --options JSON            JSON array of select options (replaces all options)',
  ].join('\n'),
  'case-property-plan-list': [
    'Usage: pingcode testhub case-property-plan-list [options]',
    '',
    'List case property plans.',
    '',
    'Options:',
    '  --library-id ID           Library id (for plans with local config enabled)',
  ].join('\n'),
  'case-property-plan-get': [
    'Usage: pingcode testhub case-property-plan-get <property_plan_id>',
    '',
    'Show a case property plan.',
  ].join('\n'),
  'case-property-plan-property-add': [
    'Usage: pingcode testhub case-property-plan-property-add <property_plan_id> --property-id ID',
    '',
    'Add a case property to a property plan.',
    '',
    'Options:',
    '  --property-id ID          Case property id (required)',
  ].join('\n'),
  'case-property-plan-property-get': [
    'Usage: pingcode testhub case-property-plan-property-get <property_plan_id> <property_id>',
    '',
    'Show a case property of a property plan.',
  ].join('\n'),
  'case-property-plan-property-list': [
    'Usage: pingcode testhub case-property-plan-property-list <property_plan_id>',
    '',
    'List case properties of a property plan.',
  ].join('\n'),
  'case-property-plan-property-remove': [
    'Usage: pingcode testhub case-property-plan-property-remove <property_plan_id> <property_id>',
    '',
    'Remove a case property from a property plan.',
  ].join('\n'),
  'library-member-add': [
    'Usage: pingcode testhub library-member-add <library_id> --member-id ID --member-type TYPE [options]',
    '',
    'Add a member to a test library.',
    '',
    'Options:',
    '  --member-id ID            Enterprise member or team id (required)',
    '  --member-type TYPE        Member type: user or user_group (required)',
    '  --role-id ID              Role id',
  ].join('\n'),
  'library-member-get': [
    'Usage: pingcode testhub library-member-get <library_id> <member_id>',
    '',
    'Show a member of a test library.',
  ].join('\n'),
  'library-member-list': [
    'Usage: pingcode testhub library-member-list <library_id>',
    '',
    'List members of a test library.',
  ].join('\n'),
  'library-member-update': [
    'Usage: pingcode testhub library-member-update <library_id> <member_id> [options]',
    '',
    'Partially update a member of a test library.',
    '',
    'Options:',
    '  --role-id ID              New role id',
  ].join('\n'),
  'library-member-remove': [
    'Usage: pingcode testhub library-member-remove <library_id> <member_id>',
    '',
    'Remove a member from a test library.',
  ].join('\n'),
  'suite-add': [
    'Usage: pingcode testhub suite-add <library_id> --name NAME [options]',
    '',
    'Add a case suite (module) to a test library.',
    '',
    'Options:',
    '  --name NAME               Suite name, unique among sibling suites (required)',
    '  --parent-id ID            Parent suite id',
  ].join('\n'),
  'suite-get': [
    'Usage: pingcode testhub suite-get <library_id> <suite_id>',
    '',
    'Show a case suite.',
  ].join('\n'),
  'suite-list': [
    'Usage: pingcode testhub suite-list <library_id> [options]',
    '',
    'List case suites of a test library.',
    '',
    'Options:',
    '  --parent-id ID            Parent suite id, or root for top-level suites',
  ].join('\n'),
  'suite-update': [
    'Usage: pingcode testhub suite-update <library_id> <suite_id> [options]',
    '',
    'Partially update a case suite.',
    '',
    'Options:',
    '  --name NAME               New suite name',
    '  --parent-id ID            New parent suite id',
  ].join('\n'),
  'suite-delete': [
    'Usage: pingcode testhub suite-delete <library_id> <suite_id>',
    '',
    'Delete a case suite (child suites are deleted too).',
  ].join('\n'),
  'plan-type-list': [
    'Usage: pingcode testhub plan-type-list <library_id>',
    '',
    'List plan types of a test library.',
  ].join('\n'),
  'plan-type-get': [
    'Usage: pingcode testhub plan-type-get <library_id> <plan_type_id>',
    '',
    'Show a plan type of a test library.',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  switch (subcommand) {
    case 'library-list':
    case 'library-create':
    case 'library-get':
    case 'library-update':
    case 'case-list':
    case 'case-create':
    case 'case-get':
    case 'case-update':
    case 'case-delete':
    case 'case-bulk-create':
    case 'case-bulk-update':
    case 'case-search':
    case 'case-histories':
    case 'plan-list':
    case 'plan-create':
    case 'plan-get':
    case 'plan-update':
    case 'run-list':
    case 'run-create':
    case 'run-get':
    case 'run-update':
    case 'run-bulk-create':
    case 'run-bulk-update':
    case 'run-search':
    case 'run-histories':
    case 'run-history':
    case 'case-states':
    case 'case-state-get':
    case 'case-types':
    case 'case-type-get':
    case 'case-important-levels':
    case 'case-important-level-get':
    case 'plan-states':
    case 'plan-state-get':
    case 'run-statuses':
    case 'run-status-get':
    case 'case-property-list':
    case 'case-property-create':
    case 'case-property-get':
    case 'case-property-update':
    case 'case-property-plan-list':
    case 'case-property-plan-get':
    case 'case-property-plan-property-add':
    case 'case-property-plan-property-get':
    case 'case-property-plan-property-list':
    case 'case-property-plan-property-remove':
    case 'library-member-add':
    case 'library-member-get':
    case 'library-member-list':
    case 'library-member-update':
    case 'library-member-remove':
    case 'suite-add':
    case 'suite-get':
    case 'suite-list':
    case 'suite-update':
    case 'suite-delete':
    case 'plan-type-list':
    case 'plan-type-get':
      console.log(SUBCOMMAND_HELP[subcommand]);
      break;
    default:
      printHelp();
  }
}

// ── Argument parsing helpers ───────────────────────────────────────────

// spec: { positionals: ['library_id'], flags: {'--x': 'x'}, booleans: {'--y': 'y'},
//        label: 'library-get', required: 'A library id is required.' }
function parseArgs(tokens, spec) {
  const args = {};
  for (const key of Object.values(spec.flags || {})) {
    args[key] = null;
  }
  for (const key of Object.values(spec.booleans || {})) {
    args[key] = false;
  }
  const positionals = [];
  const positionalCount = (spec.positionals || []).length;

  for (let i = 0; i < tokens.length; i++) {
    const arg = tokens[i];
    if (arg in (spec.flags || {})) {
      if (i + 1 >= tokens.length) {
        throw new core.PingCodeError(`Flag ${arg} requires a value`);
      }
      args[spec.flags[arg]] = tokens[i + 1];
      i += 1;
    } else if (arg in (spec.booleans || {})) {
      args[spec.booleans[arg]] = true;
    } else if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const flag = arg.slice(0, eqIndex);
        const value = arg.slice(eqIndex + 1);
        if (flag in (spec.flags || {})) {
          args[spec.flags[flag]] = value;
        } else {
          throw new core.PingCodeError(`Unknown option: ${flag}`);
        }
      } else if (!(arg in shared.BASE_GLOBAL_BOOLEAN_FLAGS)) {
        throw new core.PingCodeError(`Unknown option: ${arg}. Use testhub ${spec.label} --help for usage.`);
      }
    } else if (positionals.length < positionalCount) {
      positionals.push(arg);
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use testhub ${spec.label} --help for usage.`);
    }
  }

  (spec.positionals || []).forEach((name, index) => {
    args[name] = positionals[index] || null;
  });
  if (spec.required && positionals.length < positionalCount) {
    throw new core.PingCodeError(`${spec.required} Use testhub ${spec.label} --help for usage.`);
  }
  return args;
}

function requireFlags(args, requirements, label) {
  for (const [key, [flag, desc]] of Object.entries(requirements)) {
    if (args[key] === null || args[key] === undefined || args[key] === '') {
      throw new core.PingCodeError(`${flag} is required and must be ${desc}. Use testhub ${label} --help for usage.`);
    }
  }
}

function parseJsonArray(raw, label) {
  if (!raw) {
    return null;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (exc) {
    throw new core.PingCodeError(`${label} must be valid JSON: ${exc.message}`);
  }
  if (!Array.isArray(data)) {
    throw new core.PingCodeError(`${label} must be a JSON array`);
  }
  return data;
}

function parseNumberFlag(value, flag) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new core.PingCodeError(`${flag} must be a number`);
  }
  return num;
}

function parsePageSize(value) {
  const num = Number(value);
  if (Number.isNaN(num) || num < 1 || num > 100) {
    throw new core.PingCodeError('--limit must be a number between 1 and 100');
  }
  return num;
}

function parsePageIndex(value) {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) {
    throw new core.PingCodeError('--page-index must be a non-negative number');
  }
  return num;
}

function buildParams(args) {
  const params = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== null && value !== undefined && value !== false) {
      params[key] = value;
    }
  }
  return params;
}

// ── Dictionary subcommands (reusable; later testhub dictionary/extras
//    subcommands extend the switch with parseDictionaryArgs + runDictionary)

function parseDictionaryArgs(tokens, stringFlags, label) {
  return parseArgs(tokens, { flags: stringFlags || {}, label: label || 'dictionary' });
}

async function runDictionary(client, opts, args, resource) {
  return await client.request(
    'GET',
    resource,
    buildParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Library subcommands ────────────────────────────────────────────────

const LIBRARY_INCLUDE_FLAGS = {
  '--include-deleted': 'include_deleted',
  '--include-archived': 'include_archived',
};

function parseLibraryListArgs(tokens) {
  return parseArgs(tokens, {
    flags: {
      '--scope-type': 'scope_type',
      '--scope-id': 'scope_id',
      '--keywords': 'keywords',
      '--member-type': 'member_type',
      '--member-id': 'member_id',
      '--created-between': 'created_between',
      '--updated-between': 'updated_between',
    },
    booleans: LIBRARY_INCLUDE_FLAGS,
    label: 'library-list',
  });
}

async function runLibraryList(client, opts, args) {
  return await client.request(
    'GET',
    '/v1/testhub/libraries',
    buildParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--name': 'name',
      '--identifier': 'identifier',
      '--scope-type': 'scope_type',
      '--scope-id': 'scope_id',
      '--visibility': 'visibility',
      '--description': 'description',
      '--members': 'members',
    },
    label: 'library-create',
  });
  requireFlags(args, { name: ['--name', 'a string'], identifier: ['--identifier', 'a string'] }, 'library-create');
  args.members = parseJsonArray(args.members, '--members');
  return args;
}

async function runLibraryCreate(client, opts, args) {
  const body = {
    name: args.name,
    identifier: args.identifier,
  };
  if (args.scope_type) body.scope_type = args.scope_type;
  if (args.scope_id) body.scope_id = args.scope_id;
  if (args.visibility) body.visibility = args.visibility;
  if (args.description) body.description = args.description;
  if (args.members) body.members = args.members;

  return await client.request(
    'POST',
    '/v1/testhub/libraries',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id'],
    booleans: LIBRARY_INCLUDE_FLAGS,
    label: 'library-get',
    required: 'A library id is required.',
  });
}

async function runLibraryGet(client, opts, args) {
  const params = {};
  if (args.include_deleted) params.include_deleted = true;
  if (args.include_archived) params.include_archived = true;

  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}`,
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id'],
    flags: {
      '--name': 'name',
      '--identifier': 'identifier',
      '--description': 'description',
    },
    label: 'library-update',
    required: 'A library id is required.',
  });
}

async function runLibraryUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.identifier) body.identifier = args.identifier;
  if (args.description) body.description = args.description;

  return await client.request(
    'PATCH',
    `/v1/testhub/libraries/${args.library_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}


// ── Case subcommands ───────────────────────────────────────────────────

const CASE_INCLUDE_FLAGS = {
  '--include-deleted': 'include_deleted',
  '--include-archived': 'include_archived',
};

function parseCaseListArgs(tokens) {
  return parseArgs(tokens, {
    flags: {
      '--library-id': 'library_id',
      '--maintenance-id': 'maintenance_id',
      '--state-id': 'state_id',
      '--important-level-id': 'important_level_id',
      '--tag-id': 'tag_id',
      '--keywords': 'keywords',
      '--include-public-image-token': 'include_public_image_token',
    },
    booleans: CASE_INCLUDE_FLAGS,
    label: 'case-list',
  });
}

async function runCaseList(client, opts, args) {
  return await client.request(
    'GET',
    '/v1/testhub/cases',
    buildParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--library-id': 'test_library_id',
      '--title': 'title',
      '--suite-id': 'suite_id',
      '--type-id': 'type_id',
      '--important-level-id': 'important_level_id',
      '--maintenance-id': 'maintenance_id',
      '--participant-ids': 'participant_ids',
      '--properties': 'properties',
      '--description': 'description',
      '--precondition': 'precondition',
      '--steps': 'steps',
    },
    label: 'case-create',
  });
  requireFlags(args, { test_library_id: ['--library-id', 'a string'], title: ['--title', 'a string'] }, 'case-create');
  args.properties = core.parseJsonObject(args.properties, '--properties');
  args.steps = parseJsonArray(args.steps, '--steps');
  return args;
}

async function runCaseCreate(client, opts, args) {
  const body = {
    test_library_id: args.test_library_id,
    title: args.title,
  };
  if (args.suite_id) body.suite_id = args.suite_id;
  if (args.type_id) body.type_id = args.type_id;
  if (args.important_level_id) body.important_level_id = args.important_level_id;
  if (args.maintenance_id) body.maintenance_id = args.maintenance_id;
  if (args.participant_ids) {
    body.participant_ids = args.participant_ids.split(',').map((id) => id.trim()).filter(Boolean);
  }
  if (args.properties) body.properties = args.properties;
  if (args.description) body.description = args.description;
  if (args.precondition) body.precondition = args.precondition;
  if (args.steps) body.steps = args.steps;

  return await client.request(
    'POST',
    '/v1/testhub/cases',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['case_id'],
    flags: {
      '--include-public-image-token': 'include_public_image_token',
    },
    label: 'case-get',
    required: 'A case id is required.',
  });
}

async function runCaseGet(client, opts, args) {
  const params = args.include_public_image_token
    ? { include_public_image_token: args.include_public_image_token }
    : null;

  return await client.request(
    'GET',
    `/v1/testhub/cases/${args.case_id}`,
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['case_id'],
    flags: {
      '--suite-id': 'suite_id',
      '--state-id': 'state_id',
      '--type-id': 'type_id',
      '--title': 'title',
      '--important-level-id': 'important_level_id',
      '--maintenance-id': 'maintenance_id',
      '--properties': 'properties',
      '--description': 'description',
      '--precondition': 'precondition',
      '--steps': 'steps',
    },
    label: 'case-update',
    required: 'A case id is required.',
  });
  args.properties = core.parseJsonObject(args.properties, '--properties');
  args.steps = parseJsonArray(args.steps, '--steps');
  return args;
}

async function runCaseUpdate(client, opts, args) {
  const body = {};
  if (args.suite_id) body.suite_id = args.suite_id;
  if (args.state_id) body.state_id = args.state_id;
  if (args.type_id) body.type_id = args.type_id;
  if (args.title) body.title = args.title;
  if (args.important_level_id) body.important_level_id = args.important_level_id;
  if (args.maintenance_id) body.maintenance_id = args.maintenance_id;
  if (args.properties) body.properties = args.properties;
  if (args.description) body.description = args.description;
  if (args.precondition) body.precondition = args.precondition;
  if (args.steps) body.steps = args.steps;

  return await client.request(
    'PATCH',
    `/v1/testhub/cases/${args.case_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['case_id'],
    label: 'case-delete',
    required: 'A case id is required.',
  });
}

async function runCaseDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/testhub/cases/${args.case_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseBulkItemsArgs(tokens, label) {
  const args = parseArgs(tokens, {
    flags: {
      '--items': 'items',
    },
    label,
  });
  if (args.items === null) {
    throw new core.PingCodeError(`--items is required and must be a JSON array. Use testhub ${label} --help for usage.`);
  }
  args.items = parseJsonArray(args.items, '--items');
  return args;
}

function parseCaseBulkCreateArgs(tokens) {
  return parseBulkItemsArgs(tokens, 'case-bulk-create');
}

async function runCaseBulkCreate(client, opts, args) {
  return await client.request(
    'POST',
    '/v1/testhub/cases/bulk',
    null,
    { cases: args.items },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseBulkUpdateArgs(tokens) {
  return parseBulkItemsArgs(tokens, 'case-bulk-update');
}

async function runCaseBulkUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    '/v1/testhub/cases/bulk',
    null,
    { cases: args.items },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseSearchArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--filter': 'filter',
      '--keywords': 'keywords',
      '--limit': 'page_size',
      '--page-index': 'page_index',
      '--include-public-image-token': 'include_public_image_token',
    },
    booleans: CASE_INCLUDE_FLAGS,
    label: 'case-search',
  });
  if (args.filter !== null) {
    args.filter = core.parseJsonObject(args.filter, '--filter');
  }
  if (args.page_size !== null) {
    args.page_size = parsePageSize(args.page_size);
  }
  if (args.page_index !== null) {
    args.page_index = parsePageIndex(args.page_index);
  }
  return args;
}

async function runCaseSearch(client, opts, args) {
  const payload = {};
  if (args.filter) payload.filter = args.filter;
  if (args.keywords) payload.keywords = args.keywords;
  if (args.include_public_image_token) payload.include_public_image_token = args.include_public_image_token;
  if (args.include_deleted) payload.include_deleted = true;
  if (args.include_archived) payload.include_archived = true;
  if (args.page_size !== null) payload.page_size = args.page_size;
  if (args.page_index !== null) payload.page_index = args.page_index;

  const body = {
    mode: 'query',
    payload,
  };

  return await client.request(
    'POST',
    '/v1/testhub/cases/search',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseHistoriesArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['case_id'],
    label: 'case-histories',
    required: 'A case id is required.',
  });
}

async function runCaseHistories(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/cases/${args.case_id}/histories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Plan subcommands ───────────────────────────────────────────────────

function parsePlanListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id'],
    flags: {
      '--name': 'name',
      '--created-between': 'created_between',
      '--updated-between': 'updated_between',
    },
    label: 'plan-list',
    required: 'A library id is required.',
  });
}

async function runPlanList(client, opts, args) {
  const params = buildParams({ name: args.name, created_between: args.created_between, updated_between: args.updated_between });

  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/plans`,
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlanCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['library_id'],
    flags: {
      '--name': 'name',
      '--type-id': 'type_id',
      '--start-at': 'start_at',
      '--end-at': 'end_at',
      '--assignee-id': 'assignee_id',
      '--project-id': 'project_id',
      '--sprint-id': 'sprint_id',
      '--version-id': 'version_id',
    },
    label: 'plan-create',
    required: 'A library id is required.',
  });
  requireFlags(args, {
    name: ['--name', 'a string'],
    type_id: ['--type-id', 'a string'],
    start_at: ['--start-at', 'a number'],
    end_at: ['--end-at', 'a number'],
    assignee_id: ['--assignee-id', 'a string'],
  }, 'plan-create');
  args.start_at = parseNumberFlag(args.start_at, '--start-at');
  args.end_at = parseNumberFlag(args.end_at, '--end-at');
  return args;
}

async function runPlanCreate(client, opts, args) {
  const body = {
    name: args.name,
    type_id: args.type_id,
    start_at: args.start_at,
    end_at: args.end_at,
    assignee_id: args.assignee_id,
  };
  if (args.project_id) body.project_id = args.project_id;
  if (args.sprint_id) body.sprint_id = args.sprint_id;
  if (args.version_id) body.version_id = args.version_id;

  return await client.request(
    'POST',
    `/v1/testhub/libraries/${args.library_id}/plans`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlanGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'plan_id'],
    label: 'plan-get',
    required: 'A library id and plan id are required.',
  });
}

async function runPlanGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/plans/${args.plan_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlanUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['library_id', 'plan_id'],
    flags: {
      '--name': 'name',
      '--type-id': 'type_id',
      '--project-id': 'project_id',
      '--sprint-id': 'sprint_id',
      '--version-id': 'version_id',
      '--start-at': 'start_at',
      '--end-at': 'end_at',
      '--assignee-id': 'assignee_id',
      '--state-id': 'state_id',
      '--summary': 'summary',
    },
    label: 'plan-update',
    required: 'A library id and plan id are required.',
  });
  if (args.start_at !== null) {
    args.start_at = parseNumberFlag(args.start_at, '--start-at');
  }
  if (args.end_at !== null) {
    args.end_at = parseNumberFlag(args.end_at, '--end-at');
  }
  return args;
}

async function runPlanUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.type_id) body.type_id = args.type_id;
  if (args.project_id) body.project_id = args.project_id;
  if (args.sprint_id) body.sprint_id = args.sprint_id;
  if (args.version_id) body.version_id = args.version_id;
  if (args.start_at !== null) body.start_at = args.start_at;
  if (args.end_at !== null) body.end_at = args.end_at;
  if (args.assignee_id) body.assignee_id = args.assignee_id;
  if (args.state_id) body.state_id = args.state_id;
  if (args.summary) body.summary = args.summary;

  return await client.request(
    'PATCH',
    `/v1/testhub/libraries/${args.library_id}/plans/${args.plan_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}


// ── Run subcommands ────────────────────────────────────────────────────

function parseRunListArgs(tokens) {
  return parseArgs(tokens, {
    flags: {
      '--plan-id': 'plan_id',
      '--case-id': 'case_id',
      '--suite-id': 'suite_id',
      '--status-id': 'status_id',
      '--keywords': 'keywords',
    },
    label: 'run-list',
  });
}

async function runRunList(client, opts, args) {
  return await client.request(
    'GET',
    '/v1/testhub/runs',
    buildParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--library-id': 'library_id',
      '--plan-id': 'plan_id',
      '--case-id': 'case_id',
      '--executor-id': 'executor_id',
    },
    label: 'run-create',
  });
  requireFlags(args, {
    library_id: ['--library-id', 'a string'],
    plan_id: ['--plan-id', 'a string'],
    case_id: ['--case-id', 'a string'],
  }, 'run-create');
  return args;
}

async function runRunCreate(client, opts, args) {
  const body = {
    library_id: args.library_id,
    plan_id: args.plan_id,
    case_id: args.case_id,
  };
  if (args.executor_id) body.executor_id = args.executor_id;

  return await client.request(
    'POST',
    '/v1/testhub/runs',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['run_id'],
    label: 'run-get',
    required: 'A run id is required.',
  });
}

async function runRunGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/runs/${args.run_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['run_id'],
    flags: {
      '--status-id': 'status_id',
      '--remark': 'remark',
      '--steps': 'steps',
      '--executor-id': 'executor_id',
    },
    label: 'run-update',
    required: 'A run id is required.',
  });
  requireFlags(args, { status_id: ['--status-id', 'a string'] }, 'run-update');
  args.steps = parseJsonArray(args.steps, '--steps');
  return args;
}

async function runRunUpdate(client, opts, args) {
  const body = {
    status_id: args.status_id,
  };
  if (args.remark) body.remark = args.remark;
  if (args.steps) body.steps = args.steps;
  if (args.executor_id) body.executor_id = args.executor_id;

  return await client.request(
    'PATCH',
    `/v1/testhub/runs/${args.run_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}


function parseRunBulkCreateArgs(tokens) {
  return parseBulkItemsArgs(tokens, 'run-bulk-create');
}

async function runRunBulkCreate(client, opts, args) {
  return await client.request(
    'POST',
    '/v1/testhub/runs/bulk',
    null,
    { runs: args.items },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunBulkUpdateArgs(tokens) {
  return parseBulkItemsArgs(tokens, 'run-bulk-update');
}

async function runRunBulkUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    '/v1/testhub/runs/bulk',
    null,
    { runs: args.items },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunSearchArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--filter': 'filter',
      '--keywords': 'keywords',
      '--limit': 'page_size',
      '--page-index': 'page_index',
    },
    label: 'run-search',
  });
  if (args.filter !== null) {
    args.filter = core.parseJsonObject(args.filter, '--filter');
  }
  if (args.page_size !== null) {
    args.page_size = parsePageSize(args.page_size);
  }
  if (args.page_index !== null) {
    args.page_index = parsePageIndex(args.page_index);
  }
  return args;
}

async function runRunSearch(client, opts, args) {
  const payload = {};
  if (args.filter) payload.filter = args.filter;
  if (args.keywords) payload.keywords = args.keywords;
  if (args.page_size !== null) payload.page_size = args.page_size;
  if (args.page_index !== null) payload.page_index = args.page_index;

  const body = {
    mode: 'query',
    payload,
  };

  return await client.request(
    'POST',
    '/v1/testhub/runs/search',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunHistoriesArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['run_id'],
    label: 'run-histories',
    required: 'A run id is required.',
  });
}

async function runRunHistories(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/runs/${args.run_id}/histories`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunHistoryArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['run_id', 'history_id'],
    label: 'run-history',
    required: 'A run id and history id are required.',
  });
}

async function runRunHistory(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/runs/${args.run_id}/histories/${args.history_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Dictionary subcommands (test configuration) ────────────────────────

function parseCaseStatesArgs(tokens) {
  return parseDictionaryArgs(tokens, {}, 'case-states');
}

async function runCaseStates(client, opts, args) {
  return await runDictionary(client, opts, args, '/v1/testhub/case_states');
}

function parseCaseStateGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['state_id'],
    label: 'case-state-get',
    required: 'A case state id is required.',
  });
}

async function runCaseStateGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_states/${args.state_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseTypesArgs(tokens) {
  return parseDictionaryArgs(tokens, {}, 'case-types');
}

async function runCaseTypes(client, opts, args) {
  return await runDictionary(client, opts, args, '/v1/testhub/case_types');
}

function parseCaseTypeGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['type_id'],
    label: 'case-type-get',
    required: 'A case type id is required.',
  });
}

async function runCaseTypeGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_types/${args.type_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCaseImportantLevelsArgs(tokens) {
  return parseDictionaryArgs(tokens, {}, 'case-important-levels');
}

async function runCaseImportantLevels(client, opts, args) {
  return await runDictionary(client, opts, args, '/v1/testhub/case_important_levels');
}

function parseCaseImportantLevelGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['important_level_id'],
    label: 'case-important-level-get',
    required: 'An importance level id is required.',
  });
}

async function runCaseImportantLevelGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_important_levels/${args.important_level_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlanStatesArgs(tokens) {
  return parseDictionaryArgs(tokens, {}, 'plan-states');
}

async function runPlanStates(client, opts, args) {
  return await runDictionary(client, opts, args, '/v1/testhub/plan_states');
}

function parsePlanStateGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['state_id'],
    label: 'plan-state-get',
    required: 'A plan state id is required.',
  });
}

async function runPlanStateGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/plan_states/${args.state_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRunStatusesArgs(tokens) {
  return parseDictionaryArgs(tokens, {}, 'run-statuses');
}

async function runRunStatuses(client, opts, args) {
  return await runDictionary(client, opts, args, '/v1/testhub/run_statuses');
}

function parseRunStatusGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['status_id'],
    label: 'run-status-get',
    required: 'A run status id is required.',
  });
}

async function runRunStatusGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/run_statuses/${args.status_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Case property subcommands ──────────────────────────────────────────

function parseCasePropertyListArgs(tokens) {
  return parseDictionaryArgs(tokens, {}, 'case-property-list');
}

async function runCasePropertyList(client, opts, args) {
  return await runDictionary(client, opts, args, '/v1/testhub/case_properties');
}

function parseCasePropertyCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--name': 'name',
      '--type': 'type',
      '--options': 'options',
    },
    label: 'case-property-create',
  });
  requireFlags(args, { name: ['--name', 'a string'], type: ['--type', 'a string'] }, 'case-property-create');
  args.options = parseJsonArray(args.options, '--options');
  return args;
}

async function runCasePropertyCreate(client, opts, args) {
  const body = {
    name: args.name,
    type: args.type,
  };
  if (args.options) body.options = args.options;

  return await client.request(
    'POST',
    '/v1/testhub/case_properties',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['property_id'],
    label: 'case-property-get',
    required: 'A property id is required.',
  });
}

async function runCasePropertyGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_properties/${args.property_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['property_id'],
    flags: {
      '--name': 'name',
      '--options': 'options',
    },
    label: 'case-property-update',
    required: 'A property id is required.',
  });
  args.options = parseJsonArray(args.options, '--options');
  return args;
}

async function runCasePropertyUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.options) body.options = args.options;

  return await client.request(
    'PATCH',
    `/v1/testhub/case_properties/${args.property_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Case property plan subcommands ─────────────────────────────────────

function parseCasePropertyPlanListArgs(tokens) {
  return parseArgs(tokens, {
    flags: {
      '--library-id': 'library_id',
    },
    label: 'case-property-plan-list',
  });
}

async function runCasePropertyPlanList(client, opts, args) {
  return await client.request(
    'GET',
    '/v1/testhub/case_property_plans',
    buildParams(args),
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyPlanGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['property_plan_id'],
    label: 'case-property-plan-get',
    required: 'A property plan id is required.',
  });
}

async function runCasePropertyPlanGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_property_plans/${args.property_plan_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyPlanPropertyAddArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['property_plan_id'],
    flags: {
      '--property-id': 'property_id',
    },
    label: 'case-property-plan-property-add',
    required: 'A property plan id is required.',
  });
  requireFlags(args, { property_id: ['--property-id', 'a string'] }, 'case-property-plan-property-add');
  return args;
}

async function runCasePropertyPlanPropertyAdd(client, opts, args) {
  return await client.request(
    'POST',
    `/v1/testhub/case_property_plans/${args.property_plan_id}/case_properties`,
    null,
    { property_id: args.property_id },
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyPlanPropertyGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['property_plan_id', 'property_id'],
    label: 'case-property-plan-property-get',
    required: 'A property plan id and property id are required.',
  });
}

async function runCasePropertyPlanPropertyGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_property_plans/${args.property_plan_id}/case_properties/${args.property_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyPlanPropertyListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['property_plan_id'],
    label: 'case-property-plan-property-list',
    required: 'A property plan id is required.',
  });
}

async function runCasePropertyPlanPropertyList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/case_property_plans/${args.property_plan_id}/case_properties`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCasePropertyPlanPropertyRemoveArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['property_plan_id', 'property_id'],
    label: 'case-property-plan-property-remove',
    required: 'A property plan id and property id are required.',
  });
}

async function runCasePropertyPlanPropertyRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/testhub/case_property_plans/${args.property_plan_id}/case_properties/${args.property_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Library member subcommands ─────────────────────────────────────────

function parseLibraryMemberAddArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['library_id'],
    flags: {
      '--member-id': 'member_id',
      '--member-type': 'member_type',
      '--role-id': 'role_id',
    },
    label: 'library-member-add',
    required: 'A library id is required.',
  });
  requireFlags(
    args,
    { member_id: ['--member-id', 'a string'], member_type: ['--member-type', 'a string'] },
    'library-member-add',
  );
  return args;
}

async function runLibraryMemberAdd(client, opts, args) {
  const body = {
    member: {
      id: args.member_id,
      type: args.member_type,
    },
  };
  if (args.role_id) body.role_id = args.role_id;

  return await client.request(
    'POST',
    `/v1/testhub/libraries/${args.library_id}/members`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryMemberGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'member_id'],
    label: 'library-member-get',
    required: 'A library id and member id are required.',
  });
}

async function runLibraryMemberGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryMemberListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id'],
    label: 'library-member-list',
    required: 'A library id is required.',
  });
}

async function runLibraryMemberList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/members`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryMemberUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'member_id'],
    flags: {
      '--role-id': 'role_id',
    },
    label: 'library-member-update',
    required: 'A library id and member id are required.',
  });
}

async function runLibraryMemberUpdate(client, opts, args) {
  const body = {};
  if (args.role_id) body.role_id = args.role_id;

  return await client.request(
    'PATCH',
    `/v1/testhub/libraries/${args.library_id}/members/${args.member_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseLibraryMemberRemoveArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'member_id'],
    label: 'library-member-remove',
    required: 'A library id and member id are required.',
  });
}

async function runLibraryMemberRemove(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/testhub/libraries/${args.library_id}/members/${args.member_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Case suite (module) subcommands ────────────────────────────────────

function parseSuiteAddArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['library_id'],
    flags: {
      '--name': 'name',
      '--parent-id': 'parent_id',
    },
    label: 'suite-add',
    required: 'A library id is required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'suite-add');
  return args;
}

async function runSuiteAdd(client, opts, args) {
  const body = {
    name: args.name,
  };
  if (args.parent_id) body.parent_id = args.parent_id;

  return await client.request(
    'POST',
    `/v1/testhub/libraries/${args.library_id}/suites`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'suite_id'],
    label: 'suite-get',
    required: 'A library id and suite id are required.',
  });
}

async function runSuiteGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/suites/${args.suite_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id'],
    flags: {
      '--parent-id': 'parent_id',
    },
    label: 'suite-list',
    required: 'A library id is required.',
  });
}

async function runSuiteList(client, opts, args) {
  const params = {};
  if (args.parent_id) params.parent_id = args.parent_id;

  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/suites`,
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'suite_id'],
    flags: {
      '--name': 'name',
      '--parent-id': 'parent_id',
    },
    label: 'suite-update',
    required: 'A library id and suite id are required.',
  });
}

async function runSuiteUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.parent_id) body.parent_id = args.parent_id;

  return await client.request(
    'PATCH',
    `/v1/testhub/libraries/${args.library_id}/suites/${args.suite_id}`,
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseSuiteDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'suite_id'],
    label: 'suite-delete',
    required: 'A library id and suite id are required.',
  });
}

async function runSuiteDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    `/v1/testhub/libraries/${args.library_id}/suites/${args.suite_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Plan type subcommands ──────────────────────────────────────────────

function parsePlanTypeListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id'],
    label: 'plan-type-list',
    required: 'A library id is required.',
  });
}

async function runPlanTypeList(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/plan_types`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlanTypeGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['library_id', 'plan_type_id'],
    label: 'plan-type-get',
    required: 'A library id and plan type id are required.',
  });
}

async function runPlanTypeGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/testhub/libraries/${args.library_id}/plan_types/${args.plan_type_id}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Main dispatcher ────────────────────────────────────────────────────

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
      case 'library-list': {
        const libraryListArgs = parseLibraryListArgs(subArgs);
        result = await runLibraryList(client, opts, libraryListArgs);
        break;
      }
      case 'library-create': {
        const libraryCreateArgs = parseLibraryCreateArgs(subArgs);
        result = await runLibraryCreate(client, opts, libraryCreateArgs);
        break;
      }
      case 'library-get': {
        const libraryGetArgs = parseLibraryGetArgs(subArgs);
        result = await runLibraryGet(client, opts, libraryGetArgs);
        break;
      }
      case 'library-update': {
        const libraryUpdateArgs = parseLibraryUpdateArgs(subArgs);
        result = await runLibraryUpdate(client, opts, libraryUpdateArgs);
        break;
      }
      case 'case-list': {
        const caseListArgs = parseCaseListArgs(subArgs);
        result = await runCaseList(client, opts, caseListArgs);
        break;
      }
      case 'case-create': {
        const caseCreateArgs = parseCaseCreateArgs(subArgs);
        result = await runCaseCreate(client, opts, caseCreateArgs);
        break;
      }
      case 'case-get': {
        const caseGetArgs = parseCaseGetArgs(subArgs);
        result = await runCaseGet(client, opts, caseGetArgs);
        break;
      }
      case 'case-update': {
        const caseUpdateArgs = parseCaseUpdateArgs(subArgs);
        result = await runCaseUpdate(client, opts, caseUpdateArgs);
        break;
      }
      case 'case-delete': {
        const caseDeleteArgs = parseCaseDeleteArgs(subArgs);
        result = await runCaseDelete(client, opts, caseDeleteArgs);
        break;
      }
      case 'case-bulk-create': {
        const caseBulkCreateArgs = parseCaseBulkCreateArgs(subArgs);
        result = await runCaseBulkCreate(client, opts, caseBulkCreateArgs);
        break;
      }
      case 'case-bulk-update': {
        const caseBulkUpdateArgs = parseCaseBulkUpdateArgs(subArgs);
        result = await runCaseBulkUpdate(client, opts, caseBulkUpdateArgs);
        break;
      }
      case 'case-search': {
        const caseSearchArgs = parseCaseSearchArgs(subArgs);
        result = await runCaseSearch(client, opts, caseSearchArgs);
        break;
      }
      case 'case-histories': {
        const caseHistoriesArgs = parseCaseHistoriesArgs(subArgs);
        result = await runCaseHistories(client, opts, caseHistoriesArgs);
        break;
      }
      case 'plan-list': {
        const planListArgs = parsePlanListArgs(subArgs);
        result = await runPlanList(client, opts, planListArgs);
        break;
      }
      case 'plan-create': {
        const planCreateArgs = parsePlanCreateArgs(subArgs);
        result = await runPlanCreate(client, opts, planCreateArgs);
        break;
      }
      case 'plan-get': {
        const planGetArgs = parsePlanGetArgs(subArgs);
        result = await runPlanGet(client, opts, planGetArgs);
        break;
      }
      case 'plan-update': {
        const planUpdateArgs = parsePlanUpdateArgs(subArgs);
        result = await runPlanUpdate(client, opts, planUpdateArgs);
        break;
      }
      case 'run-list': {
        const runListArgs = parseRunListArgs(subArgs);
        result = await runRunList(client, opts, runListArgs);
        break;
      }
      case 'run-create': {
        const runCreateArgs = parseRunCreateArgs(subArgs);
        result = await runRunCreate(client, opts, runCreateArgs);
        break;
      }
      case 'run-get': {
        const runGetArgs = parseRunGetArgs(subArgs);
        result = await runRunGet(client, opts, runGetArgs);
        break;
      }
      case 'run-update': {
        const runUpdateArgs = parseRunUpdateArgs(subArgs);
        result = await runRunUpdate(client, opts, runUpdateArgs);
        break;
      }
      case 'run-bulk-create': {
        const runBulkCreateArgs = parseRunBulkCreateArgs(subArgs);
        result = await runRunBulkCreate(client, opts, runBulkCreateArgs);
        break;
      }
      case 'run-bulk-update': {
        const runBulkUpdateArgs = parseRunBulkUpdateArgs(subArgs);
        result = await runRunBulkUpdate(client, opts, runBulkUpdateArgs);
        break;
      }
      case 'run-search': {
        const runSearchArgs = parseRunSearchArgs(subArgs);
        result = await runRunSearch(client, opts, runSearchArgs);
        break;
      }
      case 'run-histories': {
        const runHistoriesArgs = parseRunHistoriesArgs(subArgs);
        result = await runRunHistories(client, opts, runHistoriesArgs);
        break;
      }
      case 'run-history': {
        const runHistoryArgs = parseRunHistoryArgs(subArgs);
        result = await runRunHistory(client, opts, runHistoryArgs);
        break;
      }
      case 'case-states': {
        const caseStatesArgs = parseCaseStatesArgs(subArgs);
        result = await runCaseStates(client, opts, caseStatesArgs);
        break;
      }
      case 'case-state-get': {
        const caseStateGetArgs = parseCaseStateGetArgs(subArgs);
        result = await runCaseStateGet(client, opts, caseStateGetArgs);
        break;
      }
      case 'case-types': {
        const caseTypesArgs = parseCaseTypesArgs(subArgs);
        result = await runCaseTypes(client, opts, caseTypesArgs);
        break;
      }
      case 'case-type-get': {
        const caseTypeGetArgs = parseCaseTypeGetArgs(subArgs);
        result = await runCaseTypeGet(client, opts, caseTypeGetArgs);
        break;
      }
      case 'case-important-levels': {
        const caseImportantLevelsArgs = parseCaseImportantLevelsArgs(subArgs);
        result = await runCaseImportantLevels(client, opts, caseImportantLevelsArgs);
        break;
      }
      case 'case-important-level-get': {
        const caseImportantLevelGetArgs = parseCaseImportantLevelGetArgs(subArgs);
        result = await runCaseImportantLevelGet(client, opts, caseImportantLevelGetArgs);
        break;
      }
      case 'plan-states': {
        const planStatesArgs = parsePlanStatesArgs(subArgs);
        result = await runPlanStates(client, opts, planStatesArgs);
        break;
      }
      case 'plan-state-get': {
        const planStateGetArgs = parsePlanStateGetArgs(subArgs);
        result = await runPlanStateGet(client, opts, planStateGetArgs);
        break;
      }
      case 'run-statuses': {
        const runStatusesArgs = parseRunStatusesArgs(subArgs);
        result = await runRunStatuses(client, opts, runStatusesArgs);
        break;
      }
      case 'run-status-get': {
        const runStatusGetArgs = parseRunStatusGetArgs(subArgs);
        result = await runRunStatusGet(client, opts, runStatusGetArgs);
        break;
      }
      case 'case-property-list': {
        const casePropertyListArgs = parseCasePropertyListArgs(subArgs);
        result = await runCasePropertyList(client, opts, casePropertyListArgs);
        break;
      }
      case 'case-property-create': {
        const casePropertyCreateArgs = parseCasePropertyCreateArgs(subArgs);
        result = await runCasePropertyCreate(client, opts, casePropertyCreateArgs);
        break;
      }
      case 'case-property-get': {
        const casePropertyGetArgs = parseCasePropertyGetArgs(subArgs);
        result = await runCasePropertyGet(client, opts, casePropertyGetArgs);
        break;
      }
      case 'case-property-update': {
        const casePropertyUpdateArgs = parseCasePropertyUpdateArgs(subArgs);
        result = await runCasePropertyUpdate(client, opts, casePropertyUpdateArgs);
        break;
      }
      case 'case-property-plan-list': {
        const casePropertyPlanListArgs = parseCasePropertyPlanListArgs(subArgs);
        result = await runCasePropertyPlanList(client, opts, casePropertyPlanListArgs);
        break;
      }
      case 'case-property-plan-get': {
        const casePropertyPlanGetArgs = parseCasePropertyPlanGetArgs(subArgs);
        result = await runCasePropertyPlanGet(client, opts, casePropertyPlanGetArgs);
        break;
      }
      case 'case-property-plan-property-add': {
        const casePropertyPlanPropertyAddArgs = parseCasePropertyPlanPropertyAddArgs(subArgs);
        result = await runCasePropertyPlanPropertyAdd(client, opts, casePropertyPlanPropertyAddArgs);
        break;
      }
      case 'case-property-plan-property-get': {
        const casePropertyPlanPropertyGetArgs = parseCasePropertyPlanPropertyGetArgs(subArgs);
        result = await runCasePropertyPlanPropertyGet(client, opts, casePropertyPlanPropertyGetArgs);
        break;
      }
      case 'case-property-plan-property-list': {
        const casePropertyPlanPropertyListArgs = parseCasePropertyPlanPropertyListArgs(subArgs);
        result = await runCasePropertyPlanPropertyList(client, opts, casePropertyPlanPropertyListArgs);
        break;
      }
      case 'case-property-plan-property-remove': {
        const casePropertyPlanPropertyRemoveArgs = parseCasePropertyPlanPropertyRemoveArgs(subArgs);
        result = await runCasePropertyPlanPropertyRemove(client, opts, casePropertyPlanPropertyRemoveArgs);
        break;
      }
      case 'library-member-add': {
        const libraryMemberAddArgs = parseLibraryMemberAddArgs(subArgs);
        result = await runLibraryMemberAdd(client, opts, libraryMemberAddArgs);
        break;
      }
      case 'library-member-get': {
        const libraryMemberGetArgs = parseLibraryMemberGetArgs(subArgs);
        result = await runLibraryMemberGet(client, opts, libraryMemberGetArgs);
        break;
      }
      case 'library-member-list': {
        const libraryMemberListArgs = parseLibraryMemberListArgs(subArgs);
        result = await runLibraryMemberList(client, opts, libraryMemberListArgs);
        break;
      }
      case 'library-member-update': {
        const libraryMemberUpdateArgs = parseLibraryMemberUpdateArgs(subArgs);
        result = await runLibraryMemberUpdate(client, opts, libraryMemberUpdateArgs);
        break;
      }
      case 'library-member-remove': {
        const libraryMemberRemoveArgs = parseLibraryMemberRemoveArgs(subArgs);
        result = await runLibraryMemberRemove(client, opts, libraryMemberRemoveArgs);
        break;
      }
      case 'suite-add': {
        const suiteAddArgs = parseSuiteAddArgs(subArgs);
        result = await runSuiteAdd(client, opts, suiteAddArgs);
        break;
      }
      case 'suite-get': {
        const suiteGetArgs = parseSuiteGetArgs(subArgs);
        result = await runSuiteGet(client, opts, suiteGetArgs);
        break;
      }
      case 'suite-list': {
        const suiteListArgs = parseSuiteListArgs(subArgs);
        result = await runSuiteList(client, opts, suiteListArgs);
        break;
      }
      case 'suite-update': {
        const suiteUpdateArgs = parseSuiteUpdateArgs(subArgs);
        result = await runSuiteUpdate(client, opts, suiteUpdateArgs);
        break;
      }
      case 'suite-delete': {
        const suiteDeleteArgs = parseSuiteDeleteArgs(subArgs);
        result = await runSuiteDelete(client, opts, suiteDeleteArgs);
        break;
      }
      case 'plan-type-list': {
        const planTypeListArgs = parsePlanTypeListArgs(subArgs);
        result = await runPlanTypeList(client, opts, planTypeListArgs);
        break;
      }
      case 'plan-type-get': {
        const planTypeGetArgs = parsePlanTypeGetArgs(subArgs);
        result = await runPlanTypeGet(client, opts, planTypeGetArgs);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown testhub subcommand: ${subcommand}. Use testhub --help for usage.`);
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

shared.registerModule('testhub', {
  name: 'testhub',
  description: 'Manage PingCode testhub (test libraries, cases, plans, runs)',
  run,
});

module.exports = { run, printHelp };
