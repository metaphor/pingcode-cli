'use strict';

const core = require('../core');
const shared = require('./shared');

// ── Help ───────────────────────────────────────────────────────────────

const SUBCOMMANDS = [
  'platform-list', 'platform-create', 'platform-get', 'platform-update',
  'user-list', 'user-create', 'user-get', 'user-update',
  'repo-list', 'repo-create', 'repo-get', 'repo-update',
  'branch-list', 'branch-create', 'branch-get', 'branch-update', 'branch-delete',
  'commit-create', 'commit-get', 'commit-list',
  'ref-list', 'ref-create', 'ref-get',
  'pr-list', 'pr-create', 'pr-get', 'pr-update',
  'review-list', 'review-create', 'review-get', 'review-update',
];

function printHelp() {
  console.log([
    'PingCode scm — Manage PingCode SCM (repositories, branches, commits, pull requests)',
    '',
    'Usage: pingcode scm <subcommand> [options]',
    '',
    'Subcommands:',
    '  platform-list [options]                      List SCM platforms (/v1/scm/products)',
    '  platform-create                              Create an SCM platform',
    '  platform-get <product_id>                    Show an SCM platform',
    '  platform-update <product_id>                 Update an SCM platform',
    '',
    '  user-list <product_id> [options]             List users of an SCM platform',
    '  user-create <product_id>                     Create an SCM platform user',
    '  user-get <product_id> <user_id>              Show an SCM platform user',
    '  user-update <product_id> <user_id>           Update an SCM platform user',
    '',
    '  repo-list <product_id> [options]             List repositories',
    '  repo-create <product_id>                     Create a repository',
    '  repo-get <product_id> <repository_id>        Show a repository',
    '  repo-update <product_id> <repository_id>     Update a repository',
    '',
    '  branch-list <product_id> <repository_id> [options]   List branches',
    '  branch-create <product_id> <repository_id>   Create a branch',
    '  branch-get <product_id> <repository_id> <branch_id>  Show a branch',
    '  branch-update <product_id> <repository_id> <branch_id>  Update a branch',
    '  branch-delete <product_id> <repository_id> <branch_id>  Delete a branch',
    '',
    '  commit-create                                Create a commit record',
    '  commit-get <commit_id_or_sha>                Show a commit by id or SHA',
    '  commit-list [options]                        List commits',
    '',
    '  ref-list <product_id> <repository_id> [options]      List commit refs',
    '  ref-create <product_id> <repository_id>      Create a commit ref',
    '  ref-get <product_id> <repository_id> <ref_id>  Show a commit ref',
    '',
    '  pr-list <product_id> <repository_id> [options]       List pull requests',
    '  pr-create <product_id> <repository_id>       Create a pull request',
    '  pr-get <product_id> <repository_id> <pull_request_id>  Show a pull request',
    '  pr-update <product_id> <repository_id> <pull_request_id>  Update a pull request',
    '',
    '  review-list <product_id> <repository_id> <pull_request_id>  List code reviews',
    '  review-create <product_id> <repository_id> <pull_request_id>  Create a code review',
    '  review-get <product_id> <repository_id> <pull_request_id> <review_id>  Show a code review',
    '  review-update <product_id> <repository_id> <pull_request_id> <review_id>  Update a code review',
    '',
    'Examples:',
    '  # 列出 SCM 平台下的仓库',
    '  pingcode scm repo-list PRODUCT_ID --compact',
    '  # 新建分支并关联工作项',
    '  pingcode scm branch-create PRODUCT_ID REPO_ID --name feature/export --sender-name john --work-item-identifiers PLM-001',
    '  # 按 SHA 查看提交',
    '  pingcode scm commit-get COMMIT_SHA --compact',
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
  'platform-list': [
    'Usage: pingcode scm platform-list [options]',
    '',
    'List SCM hosting platforms.',
    '',
    'Options:',
    '  --name TEXT               Filter by platform name',
  ].join('\n'),
  'platform-create': [
    'Usage: pingcode scm platform-create --name NAME --type TYPE [options]',
    '',
    'Create an SCM hosting platform.',
    '',
    'Options:',
    '  --name NAME               Platform name, unique within the enterprise (required)',
    '  --type TYPE               Platform type: github, gitlab, bitbucket, coding.net, gogs, git, svn, gerrit, other (required)',
    '  --description TEXT        Platform description',
  ].join('\n'),
  'platform-get': [
    'Usage: pingcode scm platform-get <product_id>',
    '',
    'Show an SCM hosting platform.',
  ].join('\n'),
  'platform-update': [
    'Usage: pingcode scm platform-update <product_id> [options]',
    '',
    'Partially update an SCM hosting platform.',
    '',
    'Options:',
    '  --name NAME               New platform name',
    '  --type TYPE               New platform type: github, gitlab, bitbucket, coding.net, gogs, git, svn, gerrit, other',
    '  --description TEXT        New platform description',
  ].join('\n'),
  'user-list': [
    'Usage: pingcode scm user-list <product_id> [options]',
    '',
    'List users of an SCM hosting platform.',
    '',
    'Options:',
    '  --name TEXT               Filter by platform user name',
  ].join('\n'),
  'user-create': [
    'Usage: pingcode scm user-create <product_id> --name NAME [options]',
    '',
    'Create an SCM hosting platform user.',
    '',
    'Options:',
    '  --name NAME               User name on the platform, unique per platform (required)',
    '  --display-name TEXT       Display name',
    '  --html-url URL            User profile URL on the platform',
    '  --avatar-url URL          User avatar URL on the platform',
  ].join('\n'),
  'user-get': [
    'Usage: pingcode scm user-get <product_id> <user_id>',
    '',
    'Show an SCM hosting platform user.',
  ].join('\n'),
  'user-update': [
    'Usage: pingcode scm user-update <product_id> <user_id> [options]',
    '',
    'Partially update an SCM hosting platform user.',
    '',
    'Options:',
    '  --name NAME               New user name',
    '  --display-name TEXT       New display name',
    '  --html-url URL            New user profile URL',
    '  --avatar-url URL          New user avatar URL',
  ].join('\n'),
  'repo-list': [
    'Usage: pingcode scm repo-list <product_id> [options]',
    '',
    'List repositories of an SCM hosting platform.',
    '',
    'Options:',
    '  --full-name TEXT          Filter by repository full name',
  ].join('\n'),
  'repo-create': [
    'Usage: pingcode scm repo-create <product_id> --name NAME --full-name FULL_NAME [options]',
    '',
    'Create a repository.',
    '',
    'Options:',
    '  --name NAME               Repository name (required)',
    '  --full-name TEXT          Repository full name, unique per platform (required)',
    '  --description TEXT        Repository description',
    '  --is-fork                 Repository is a fork',
    '  --is-private              Repository is private',
    '  --owner-name TEXT         Owner user name on the platform',
    '  --html-url URL            Repository URL',
    '  --branches-url URL        Branch URL template, {branch} is replaced with the branch name',
    '  --commits-url URL         Commit URL template, {sha} is replaced with the commit SHA',
    '  --compare-url URL         Compare URL template, {base} and {head} are replaced with branch names',
    '  --pulls-url URL           Pull request URL template, {number} is replaced with the PR number',
  ].join('\n'),
  'repo-get': [
    'Usage: pingcode scm repo-get <product_id> <repository_id>',
    '',
    'Show a repository.',
  ].join('\n'),
  'repo-update': [
    'Usage: pingcode scm repo-update <product_id> <repository_id> [options]',
    '',
    'Partially update a repository.',
    '',
    'Options:',
    '  --name NAME               New repository name',
    '  --full-name TEXT          New repository full name',
    '  --description TEXT        New repository description',
    '  --is-fork                 Mark repository as a fork',
    '  --is-private              Mark repository as private',
    '  --owner-name TEXT         New owner user name',
    '  --html-url URL            New repository URL',
    '  --branches-url URL        New branch URL template',
    '  --commits-url URL         New commit URL template',
    '  --compare-url URL         New compare URL template',
    '  --pulls-url URL           New pull request URL template',
  ].join('\n'),
  'branch-list': [
    'Usage: pingcode scm branch-list <product_id> <repository_id> [options]',
    '',
    'List branches of a repository.',
    '',
    'Options:',
    '  --name TEXT               Filter by branch name',
    '  --work-item-id ID         Filter by linked work item id',
  ].join('\n'),
  'branch-create': [
    'Usage: pingcode scm branch-create <product_id> <repository_id> --name NAME --sender-name NAME [options]',
    '',
    'Create a branch.',
    '',
    'Options:',
    '  --name NAME               Branch name, unique per repository (required)',
    '  --sender-name NAME        Creator user name on the platform (required)',
    '  --is-default              Set as the default branch',
    '  --work-item-identifiers IDS  Comma separated PingCode work item identifiers, e.g. PLM-001,PLM-002',
  ].join('\n'),
  'branch-get': [
    'Usage: pingcode scm branch-get <product_id> <repository_id> <branch_id>',
    '',
    'Show a branch.',
  ].join('\n'),
  'branch-update': [
    'Usage: pingcode scm branch-update <product_id> <repository_id> <branch_id> [options]',
    '',
    'Partially update a branch.',
    '',
    'Options:',
    '  --is-default              Set as the default branch (only true is supported by the API)',
    '  --work-item-identifiers IDS  Comma separated PingCode work item identifiers, e.g. PLM-001,PLM-002',
  ].join('\n'),
  'branch-delete': [
    'Usage: pingcode scm branch-delete <product_id> <repository_id> <branch_id>',
    '',
    'Delete a branch. The default branch cannot be deleted.',
  ].join('\n'),
  'commit-create': [
    'Usage: pingcode scm commit-create --sha SHA --message TEXT --committer-name NAME --committed-at TS --files-added LIST --files-removed LIST --files-modified LIST [options]',
    '',
    'Create a commit record.',
    '',
    'Options:',
    '  --sha SHA                 Commit SHA (required)',
    '  --message TEXT            Commit message (required)',
    '  --committer-name NAME     Committer user name (required)',
    '  --committed-at TS         Commit timestamp (required)',
    '  --tree-id SHA             Tree SHA',
    '  --files-added LIST        Comma separated added file names (required)',
    '  --files-removed LIST      Comma separated removed file names (required)',
    '  --files-modified LIST     Comma separated modified file names (required)',
    '  --work-item-identifiers IDS  Comma separated PingCode work item identifiers',
  ].join('\n'),
  'commit-get': [
    'Usage: pingcode scm commit-get <commit_id_or_sha>',
    '',
    'Show a commit by id or SHA.',
  ].join('\n'),
  'commit-list': [
    'Usage: pingcode scm commit-list [options]',
    '',
    'List commits.',
    '',
    'Options:',
    '  --sha TEXT                Filter by commit SHA',
    '  --work-item-id ID         Filter by linked work item id',
  ].join('\n'),
  'ref-list': [
    'Usage: pingcode scm ref-list <product_id> <repository_id> --meta-type TYPE --meta-id ID',
    '',
    'List commit refs of a repository.',
    '',
    'Options:',
    '  --meta-type TYPE          Referenced entity type: branch (required)',
    '  --meta-id ID              Referenced entity id, e.g. a branch id (required)',
  ].join('\n'),
  'ref-create': [
    'Usage: pingcode scm ref-create <product_id> <repository_id> --sha SHA --meta-type TYPE --meta-id ID',
    '',
    'Create a commit ref linking a commit to a branch.',
    '',
    'Options:',
    '  --sha SHA                 Commit SHA (required)',
    '  --meta-type TYPE          Referenced entity type: branch (required)',
    '  --meta-id ID              Referenced entity id, e.g. a branch id (required)',
  ].join('\n'),
  'ref-get': [
    'Usage: pingcode scm ref-get <product_id> <repository_id> <ref_id>',
    '',
    'Show a commit ref.',
  ].join('\n'),
  'pr-list': [
    'Usage: pingcode scm pr-list <product_id> <repository_id> [options]',
    '',
    'List pull requests of a repository.',
    '',
    'Options:',
    '  --number N                Filter by pull request number',
    '  --work-item-id ID         Filter by linked work item id',
  ].join('\n'),
  'pr-create': [
    'Usage: pingcode scm pr-create <product_id> <repository_id> --title TEXT --number N --creator-name NAME --target-branch-id ID --status STATUS [options]',
    '',
    'Create a pull request.',
    '',
    'Options:',
    '  --title TEXT              Pull request title (required)',
    '  --number N                Pull request number, unique per repository (required)',
    '  --creator-name NAME       Creator user name (required)',
    '  --target-branch-id ID     Target branch id (required)',
    '  --status STATUS           open, closed, merged, or abandoned (required)',
    '  --source-branch-id ID     Source branch id',
    '  --description TEXT        Pull request description',
    '  --merged-at TS            Merge timestamp (required by the API when status is merged)',
    '  --merged-commit-sha SHA   Last commit SHA of the source branch',
    '  --merged-by-name NAME     Merger user name',
    '  --comments-count N        Comment count',
    '  --review-comments-count N Review comment count',
    '  --commits-count N         Commit count',
    '  --additions-count N       Added file count',
    '  --deletions-count N       Deleted file count',
    '  --changed-files-count N   Changed file count',
    '  --work-item-identifiers IDS  Comma separated PingCode work item identifiers',
  ].join('\n'),
  'pr-get': [
    'Usage: pingcode scm pr-get <product_id> <repository_id> <pull_request_id>',
    '',
    'Show a pull request.',
  ].join('\n'),
  'pr-update': [
    'Usage: pingcode scm pr-update <product_id> <repository_id> <pull_request_id> --status STATUS [options]',
    '',
    'Partially update a pull request.',
    '',
    'Options:',
    '  --status STATUS           open, closed, merged, or abandoned (required)',
    '  --title TEXT              New title',
    '  --creator-name NAME       New creator user name',
    '  --description TEXT        New description',
    '  --target-branch-id ID     New target branch id',
    '  --source-branch-id ID     New source branch id',
    '  --merged-at TS            Merge timestamp (required by the API when status is merged)',
    '  --merged-commit-sha SHA   Last commit SHA of the source branch',
    '  --merged-by-name NAME     Merger user name',
    '  --comments-count N        Comment count',
    '  --review-comments-count N Review comment count',
    '  --commits-count N         Commit count',
    '  --additions-count N       Added file count',
    '  --deletions-count N       Deleted file count',
    '  --changed-files-count N   Changed file count',
    '  --work-item-identifiers IDS  Comma separated PingCode work item identifiers',
  ].join('\n'),
  'review-list': [
    'Usage: pingcode scm review-list <product_id> <repository_id> <pull_request_id>',
    '',
    'List code reviews of a pull request.',
  ].join('\n'),
  'review-create': [
    'Usage: pingcode scm review-create <product_id> <repository_id> <pull_request_id> --status STATUS --reviewer-name NAME --submitted-at TS [options]',
    '',
    'Create a code review.',
    '',
    'Options:',
    '  --status STATUS           comment, approved, or request_changes (required)',
    '  --reviewer-name NAME      Reviewer user name (required)',
    '  --submitted-at TS         Submission timestamp (required)',
    '  --description TEXT        Review description',
    '  --html-url URL            Review URL on the platform',
  ].join('\n'),
  'review-get': [
    'Usage: pingcode scm review-get <product_id> <repository_id> <pull_request_id> <review_id>',
    '',
    'Show a code review.',
  ].join('\n'),
  'review-update': [
    'Usage: pingcode scm review-update <product_id> <repository_id> <pull_request_id> <review_id> [options]',
    '',
    'Partially update a code review.',
    '',
    'Options:',
    '  --reviewer-name NAME      New reviewer user name',
    '  --status STATUS           comment, approved, or request_changes',
    '  --description TEXT        New review description',
    '  --submitted-at TS         New submission timestamp',
    '  --html-url URL            New review URL',
  ].join('\n'),
};

function printSubcommandHelp(subcommand) {
  if (SUBCOMMAND_HELP[subcommand]) {
    console.log(SUBCOMMAND_HELP[subcommand]);
  } else {
    printHelp();
  }
}

// ── Argument parsing helpers ───────────────────────────────────────────

// spec: { positionals: ['product_id'], flags: {'--x': 'x'}, booleans: {'--y': 'y'},
//        label: 'platform-get', required: 'A platform id is required.' }
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
        throw new core.PingCodeError(`Unknown option: ${arg}. Use scm ${spec.label} --help for usage.`);
      }
    } else if (positionals.length < positionalCount) {
      positionals.push(arg);
    } else {
      throw new core.PingCodeError(`Unexpected argument: ${arg}. Use scm ${spec.label} --help for usage.`);
    }
  }

  (spec.positionals || []).forEach((name, index) => {
    args[name] = positionals[index] || null;
  });
  if (spec.required && positionals.length < positionalCount) {
    throw new core.PingCodeError(`${spec.required} Use scm ${spec.label} --help for usage.`);
  }
  return args;
}

function requireFlags(args, requirements, label) {
  for (const [key, [flag, desc]] of Object.entries(requirements)) {
    if (args[key] === null || args[key] === undefined || args[key] === '') {
      throw new core.PingCodeError(`${flag} is required and must be ${desc}. Use scm ${label} --help for usage.`);
    }
  }
}

function parseNumberFlag(value, flag) {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new core.PingCodeError(`${flag} must be a number`);
  }
  return num;
}

function parseListFlag(value, flag) {
  const items = String(value).split(',').map((item) => item.trim()).filter(Boolean);
  if (items.length === 0) {
    throw new core.PingCodeError(`${flag} must be a comma separated list`);
  }
  return items;
}

function scmPath(product_id, ...rest) {
  let path = `/v1/scm/products/${product_id}`;
  for (const segment of rest) {
    path += `/${segment}`;
  }
  return path;
}

// ── Platform subcommands (/v1/scm/products) ───────────────────────────

function parsePlatformListArgs(tokens) {
  return parseArgs(tokens, {
    flags: { '--name': 'name' },
    label: 'platform-list',
  });
}

async function runPlatformList(client, opts, args) {
  const params = {};
  if (args.name) params.name = args.name;
  return await client.request(
    'GET',
    '/v1/scm/products',
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlatformCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--name': 'name',
      '--type': 'type',
      '--description': 'description',
    },
    label: 'platform-create',
  });
  requireFlags(args, { name: ['--name', 'a string'], type: ['--type', 'a string'] }, 'platform-create');
  return args;
}

async function runPlatformCreate(client, opts, args) {
  const body = {
    name: args.name,
    type: args.type,
  };
  if (args.description) body.description = args.description;
  return await client.request(
    'POST',
    '/v1/scm/products',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlatformGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id'],
    label: 'platform-get',
    required: 'A platform id is required.',
  });
}

async function runPlatformGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePlatformUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id'],
    flags: {
      '--name': 'name',
      '--type': 'type',
      '--description': 'description',
    },
    label: 'platform-update',
    required: 'A platform id is required.',
  });
}

async function runPlatformUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.type) body.type = args.type;
  if (args.description) body.description = args.description;
  return await client.request(
    'PATCH',
    scmPath(args.product_id),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Platform user subcommands (/v1/scm/products/{pid}/users) ──────────

function parseUserListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id'],
    flags: { '--name': 'name' },
    label: 'user-list',
    required: 'A platform id is required.',
  });
}

async function runUserList(client, opts, args) {
  const params = {};
  if (args.name) params.name = args.name;
  return await client.request(
    'GET',
    scmPath(args.product_id, 'users'),
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUserCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id'],
    flags: {
      '--name': 'name',
      '--display-name': 'display_name',
      '--html-url': 'html_url',
      '--avatar-url': 'avatar_url',
    },
    label: 'user-create',
    required: 'A platform id is required.',
  });
  requireFlags(args, { name: ['--name', 'a string'] }, 'user-create');
  return args;
}

async function runUserCreate(client, opts, args) {
  const body = { name: args.name };
  if (args.display_name) body.display_name = args.display_name;
  if (args.html_url) body.html_url = args.html_url;
  if (args.avatar_url) body.avatar_url = args.avatar_url;
  return await client.request(
    'POST',
    scmPath(args.product_id, 'users'),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUserGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'user_id'],
    label: 'user-get',
    required: 'A platform id and user id are required.',
  });
}

async function runUserGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id, 'users', args.user_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseUserUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'user_id'],
    flags: {
      '--name': 'name',
      '--display-name': 'display_name',
      '--html-url': 'html_url',
      '--avatar-url': 'avatar_url',
    },
    label: 'user-update',
    required: 'A platform id and user id are required.',
  });
}

async function runUserUpdate(client, opts, args) {
  const body = {};
  if (args.name) body.name = args.name;
  if (args.display_name) body.display_name = args.display_name;
  if (args.html_url) body.html_url = args.html_url;
  if (args.avatar_url) body.avatar_url = args.avatar_url;
  return await client.request(
    'PATCH',
    scmPath(args.product_id, 'users', args.user_id),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Repository subcommands (/v1/scm/products/{pid}/repositories) ──────

const REPO_BODY_FLAGS = {
  '--name': 'name',
  '--full-name': 'full_name',
  '--description': 'description',
  '--owner-name': 'owner_name',
  '--html-url': 'html_url',
  '--branches-url': 'branches_url',
  '--commits-url': 'commits_url',
  '--compare-url': 'compare_url',
  '--pulls-url': 'pulls_url',
};

function buildRepoBody(args) {
  const body = {};
  for (const key of Object.values(REPO_BODY_FLAGS)) {
    if (args[key]) body[key] = args[key];
  }
  if (args.is_fork) body.is_fork = true;
  if (args.is_private) body.is_private = true;
  return body;
}

function parseRepoListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id'],
    flags: { '--full-name': 'full_name' },
    label: 'repo-list',
    required: 'A platform id is required.',
  });
}

async function runRepoList(client, opts, args) {
  const params = {};
  if (args.full_name) params.full_name = args.full_name;
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories'),
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRepoCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id'],
    flags: REPO_BODY_FLAGS,
    booleans: {
      '--is-fork': 'is_fork',
      '--is-private': 'is_private',
    },
    label: 'repo-create',
    required: 'A platform id is required.',
  });
  requireFlags(args, { name: ['--name', 'a string'], full_name: ['--full-name', 'a string'] }, 'repo-create');
  return args;
}

async function runRepoCreate(client, opts, args) {
  return await client.request(
    'POST',
    scmPath(args.product_id, 'repositories'),
    null,
    buildRepoBody(args),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRepoGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    label: 'repo-get',
    required: 'A platform id and repository id are required.',
  });
}

async function runRepoGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRepoUpdateArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: REPO_BODY_FLAGS,
    booleans: {
      '--is-fork': 'is_fork',
      '--is-private': 'is_private',
    },
    label: 'repo-update',
    required: 'A platform id and repository id are required.',
  });
}

async function runRepoUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    scmPath(args.product_id, 'repositories', args.repository_id),
    null,
    buildRepoBody(args),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Branch subcommands (/v1/scm/products/{pid}/repositories/{rid}/branches) ──

function parseWorkItemIdentifiers(value, flag) {
  return parseListFlag(value, flag);
}

function parseBranchListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: {
      '--name': 'name',
      '--work-item-id': 'work_item_id',
    },
    label: 'branch-list',
    required: 'A platform id and repository id are required.',
  });
}

async function runBranchList(client, opts, args) {
  const params = {};
  if (args.name) params.name = args.name;
  if (args.work_item_id) params.work_item_id = args.work_item_id;
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'branches'),
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseBranchCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: {
      '--name': 'name',
      '--sender-name': 'sender_name',
      '--work-item-identifiers': 'work_item_identifiers',
    },
    booleans: {
      '--is-default': 'is_default',
    },
    label: 'branch-create',
    required: 'A platform id and repository id are required.',
  });
  requireFlags(
    args,
    { name: ['--name', 'a string'], sender_name: ['--sender-name', 'a string'] },
    'branch-create',
  );
  if (args.work_item_identifiers) {
    args.work_item_identifiers = parseWorkItemIdentifiers(args.work_item_identifiers, '--work-item-identifiers');
  }
  return args;
}

async function runBranchCreate(client, opts, args) {
  const body = {
    name: args.name,
    sender_name: args.sender_name,
  };
  if (args.is_default) body.is_default = true;
  if (args.work_item_identifiers) body.work_item_identifiers = args.work_item_identifiers;
  return await client.request(
    'POST',
    scmPath(args.product_id, 'repositories', args.repository_id, 'branches'),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseBranchGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'branch_id'],
    label: 'branch-get',
    required: 'A platform id, repository id, and branch id are required.',
  });
}

async function runBranchGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'branches', args.branch_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseBranchUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'branch_id'],
    flags: {
      '--work-item-identifiers': 'work_item_identifiers',
    },
    booleans: {
      '--is-default': 'is_default',
    },
    label: 'branch-update',
    required: 'A platform id, repository id, and branch id are required.',
  });
  if (args.work_item_identifiers) {
    args.work_item_identifiers = parseWorkItemIdentifiers(args.work_item_identifiers, '--work-item-identifiers');
  }
  return args;
}

async function runBranchUpdate(client, opts, args) {
  const body = {};
  if (args.is_default) body.is_default = true;
  if (args.work_item_identifiers) body.work_item_identifiers = args.work_item_identifiers;
  return await client.request(
    'PATCH',
    scmPath(args.product_id, 'repositories', args.repository_id, 'branches', args.branch_id),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseBranchDeleteArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'branch_id'],
    label: 'branch-delete',
    required: 'A platform id, repository id, and branch id are required.',
  });
}

async function runBranchDelete(client, opts, args) {
  return await client.request(
    'DELETE',
    scmPath(args.product_id, 'repositories', args.repository_id, 'branches', args.branch_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Commit subcommands (/v1/scm/commits) ──────────────────────────────

function parseCommitCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    flags: {
      '--sha': 'sha',
      '--message': 'message',
      '--committer-name': 'committer_name',
      '--committed-at': 'committed_at',
      '--tree-id': 'tree_id',
      '--files-added': 'files_added',
      '--files-removed': 'files_removed',
      '--files-modified': 'files_modified',
      '--work-item-identifiers': 'work_item_identifiers',
    },
    label: 'commit-create',
  });
  requireFlags(
    args,
    {
      sha: ['--sha', 'a string'],
      message: ['--message', 'a string'],
      committer_name: ['--committer-name', 'a string'],
      committed_at: ['--committed-at', 'a timestamp'],
      files_added: ['--files-added', 'a comma separated list'],
      files_removed: ['--files-removed', 'a comma separated list'],
      files_modified: ['--files-modified', 'a comma separated list'],
    },
    'commit-create',
  );
  args.committed_at = parseNumberFlag(args.committed_at, '--committed-at');
  args.files_added = parseListFlag(args.files_added, '--files-added');
  args.files_removed = parseListFlag(args.files_removed, '--files-removed');
  args.files_modified = parseListFlag(args.files_modified, '--files-modified');
  if (args.work_item_identifiers) {
    args.work_item_identifiers = parseWorkItemIdentifiers(args.work_item_identifiers, '--work-item-identifiers');
  }
  return args;
}

async function runCommitCreate(client, opts, args) {
  const body = {
    sha: args.sha,
    message: args.message,
    committer_name: args.committer_name,
    committed_at: args.committed_at,
    files_added: args.files_added,
    files_removed: args.files_removed,
    files_modified: args.files_modified,
  };
  if (args.tree_id) body.tree_id = args.tree_id;
  if (args.work_item_identifiers) body.work_item_identifiers = args.work_item_identifiers;
  return await client.request(
    'POST',
    '/v1/scm/commits',
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCommitGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['commit_id_or_sha'],
    label: 'commit-get',
    required: 'A commit id or SHA is required.',
  });
}

async function runCommitGet(client, opts, args) {
  return await client.request(
    'GET',
    `/v1/scm/commits/${args.commit_id_or_sha}`,
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseCommitListArgs(tokens) {
  return parseArgs(tokens, {
    flags: {
      '--sha': 'sha',
      '--work-item-id': 'work_item_id',
    },
    label: 'commit-list',
  });
}

async function runCommitList(client, opts, args) {
  const params = {};
  if (args.sha) params.sha = args.sha;
  if (args.work_item_id) params.work_item_id = args.work_item_id;
  return await client.request(
    'GET',
    '/v1/scm/commits',
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Commit ref subcommands (/v1/scm/products/{pid}/repositories/{rid}/refs) ──

function parseRefListArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: {
      '--meta-type': 'meta_type',
      '--meta-id': 'meta_id',
    },
    label: 'ref-list',
    required: 'A platform id and repository id are required.',
  });
  requireFlags(args, { meta_type: ['--meta-type', 'a string'], meta_id: ['--meta-id', 'a string'] }, 'ref-list');
  return args;
}

async function runRefList(client, opts, args) {
  const params = {
    meta_type: args.meta_type,
    meta_id: args.meta_id,
  };
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'refs'),
    params,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRefCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: {
      '--sha': 'sha',
      '--meta-type': 'meta_type',
      '--meta-id': 'meta_id',
    },
    label: 'ref-create',
    required: 'A platform id and repository id are required.',
  });
  requireFlags(
    args,
    {
      sha: ['--sha', 'a string'],
      meta_type: ['--meta-type', 'a string'],
      meta_id: ['--meta-id', 'a string'],
    },
    'ref-create',
  );
  return args;
}

async function runRefCreate(client, opts, args) {
  const body = {
    sha: args.sha,
    meta_type: args.meta_type,
    meta_id: args.meta_id,
  };
  return await client.request(
    'POST',
    scmPath(args.product_id, 'repositories', args.repository_id, 'refs'),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseRefGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'ref_id'],
    label: 'ref-get',
    required: 'A platform id, repository id, and ref id are required.',
  });
}

async function runRefGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'refs', args.ref_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Pull request subcommands (/v1/scm/products/{pid}/repositories/{rid}/pull_requests) ──

const PR_NUMBER_FLAGS = {
  '--merged-at': 'merged_at',
  '--comments-count': 'comments_count',
  '--review-comments-count': 'review_comments_count',
  '--commits-count': 'commits_count',
  '--additions-count': 'additions_count',
  '--deletions-count': 'deletions_count',
  '--changed-files-count': 'changed_files_count',
};

function buildPrBody(args) {
  const body = {};
  const stringFlags = [
    'title', 'creator_name', 'source_branch_id', 'target_branch_id', 'status',
    'description', 'merged_commit_sha', 'merged_by_name',
  ];
  if (args.number !== null && args.number !== undefined) body.number = args.number;
  for (const key of stringFlags) {
    if (args[key] !== null && args[key] !== undefined) body[key] = args[key];
  }
  for (const key of Object.values(PR_NUMBER_FLAGS)) {
    if (args[key] !== null && args[key] !== undefined) body[key] = args[key];
  }
  if (args.work_item_identifiers) body.work_item_identifiers = args.work_item_identifiers;
  return body;
}

function parsePrNumbers(args) {
  for (const [flag, key] of Object.entries(PR_NUMBER_FLAGS)) {
    if (args[key] !== null && args[key] !== undefined) {
      args[key] = parseNumberFlag(args[key], flag);
    }
  }
}

function parsePrListArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: {
      '--number': 'number',
      '--work-item-id': 'work_item_id',
    },
    label: 'pr-list',
    required: 'A platform id and repository id are required.',
  });
  if (args.number !== null) {
    args.number = parseNumberFlag(args.number, '--number');
  }
  return args;
}

async function runPrList(client, opts, args) {
  const params = {};
  if (args.number !== null) params.number = args.number;
  if (args.work_item_id) params.work_item_id = args.work_item_id;
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'pull_requests'),
    Object.keys(params).length > 0 ? params : null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePrCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id'],
    flags: {
      '--title': 'title',
      '--number': 'number',
      '--creator-name': 'creator_name',
      '--source-branch-id': 'source_branch_id',
      '--target-branch-id': 'target_branch_id',
      '--status': 'status',
      '--description': 'description',
      '--merged-commit-sha': 'merged_commit_sha',
      '--merged-by-name': 'merged_by_name',
      ...PR_NUMBER_FLAGS,
      '--work-item-identifiers': 'work_item_identifiers',
    },
    label: 'pr-create',
    required: 'A platform id and repository id are required.',
  });
  requireFlags(
    args,
    {
      title: ['--title', 'a string'],
      number: ['--number', 'a number'],
      creator_name: ['--creator-name', 'a string'],
      target_branch_id: ['--target-branch-id', 'a string'],
      status: ['--status', 'one of open, closed, merged, abandoned'],
    },
    'pr-create',
  );
  args.number = parseNumberFlag(args.number, '--number');
  parsePrNumbers(args);
  if (args.work_item_identifiers) {
    args.work_item_identifiers = parseWorkItemIdentifiers(args.work_item_identifiers, '--work-item-identifiers');
  }
  return args;
}

async function runPrCreate(client, opts, args) {
  return await client.request(
    'POST',
    scmPath(args.product_id, 'repositories', args.repository_id, 'pull_requests'),
    null,
    buildPrBody(args),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePrGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'pull_request_id'],
    label: 'pr-get',
    required: 'A platform id, repository id, and pull request id are required.',
  });
}

async function runPrGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'pull_requests', args.pull_request_id),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parsePrUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'pull_request_id'],
    flags: {
      '--title': 'title',
      '--creator-name': 'creator_name',
      '--source-branch-id': 'source_branch_id',
      '--target-branch-id': 'target_branch_id',
      '--status': 'status',
      '--description': 'description',
      '--merged-commit-sha': 'merged_commit_sha',
      '--merged-by-name': 'merged_by_name',
      ...PR_NUMBER_FLAGS,
      '--work-item-identifiers': 'work_item_identifiers',
    },
    label: 'pr-update',
    required: 'A platform id, repository id, and pull request id are required.',
  });
  requireFlags(args, { status: ['--status', 'one of open, closed, merged, abandoned'] }, 'pr-update');
  parsePrNumbers(args);
  if (args.work_item_identifiers) {
    args.work_item_identifiers = parseWorkItemIdentifiers(args.work_item_identifiers, '--work-item-identifiers');
  }
  return args;
}

async function runPrUpdate(client, opts, args) {
  return await client.request(
    'PATCH',
    scmPath(args.product_id, 'repositories', args.repository_id, 'pull_requests', args.pull_request_id),
    null,
    buildPrBody(args),
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Code review subcommands (/v1/scm/.../pull_requests/{prid}/reviews) ──

function parseReviewListArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'pull_request_id'],
    label: 'review-list',
    required: 'A platform id, repository id, and pull request id are required.',
  });
}

async function runReviewList(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(args.product_id, 'repositories', args.repository_id, 'pull_requests', args.pull_request_id, 'reviews'),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseReviewCreateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'pull_request_id'],
    flags: {
      '--status': 'status',
      '--reviewer-name': 'reviewer_name',
      '--submitted-at': 'submitted_at',
      '--description': 'description',
      '--html-url': 'html_url',
    },
    label: 'review-create',
    required: 'A platform id, repository id, and pull request id are required.',
  });
  requireFlags(
    args,
    {
      status: ['--status', 'one of comment, approved, request_changes'],
      reviewer_name: ['--reviewer-name', 'a string'],
      submitted_at: ['--submitted-at', 'a timestamp'],
    },
    'review-create',
  );
  args.submitted_at = parseNumberFlag(args.submitted_at, '--submitted-at');
  return args;
}

async function runReviewCreate(client, opts, args) {
  const body = {
    status: args.status,
    reviewer_name: args.reviewer_name,
    submitted_at: args.submitted_at,
  };
  if (args.description) body.description = args.description;
  if (args.html_url) body.html_url = args.html_url;
  return await client.request(
    'POST',
    scmPath(args.product_id, 'repositories', args.repository_id, 'pull_requests', args.pull_request_id, 'reviews'),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseReviewGetArgs(tokens) {
  return parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'pull_request_id', 'review_id'],
    label: 'review-get',
    required: 'A platform id, repository id, pull request id, and review id are required.',
  });
}

async function runReviewGet(client, opts, args) {
  return await client.request(
    'GET',
    scmPath(
      args.product_id,
      'repositories',
      args.repository_id,
      'pull_requests',
      args.pull_request_id,
      'reviews',
      args.review_id,
    ),
    null,
    null,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

function parseReviewUpdateArgs(tokens) {
  const args = parseArgs(tokens, {
    positionals: ['product_id', 'repository_id', 'pull_request_id', 'review_id'],
    flags: {
      '--reviewer-name': 'reviewer_name',
      '--status': 'status',
      '--submitted-at': 'submitted_at',
      '--description': 'description',
      '--html-url': 'html_url',
    },
    label: 'review-update',
    required: 'A platform id, repository id, pull request id, and review id are required.',
  });
  if (args.submitted_at !== null) {
    args.submitted_at = parseNumberFlag(args.submitted_at, '--submitted-at');
  }
  return args;
}

async function runReviewUpdate(client, opts, args) {
  const body = {};
  if (args.reviewer_name) body.reviewer_name = args.reviewer_name;
  if (args.status) body.status = args.status;
  if (args.submitted_at !== null) body.submitted_at = args.submitted_at;
  if (args.description) body.description = args.description;
  if (args.html_url) body.html_url = args.html_url;
  return await client.request(
    'PATCH',
    scmPath(
      args.product_id,
      'repositories',
      args.repository_id,
      'pull_requests',
      args.pull_request_id,
      'reviews',
      args.review_id,
    ),
    null,
    body,
    { dry_run: opts.dry_run, use_workspace_cache: true },
  );
}

// ── Main dispatcher ───────────────────────────────────────────────────

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
      case 'platform-list': {
        const args = parsePlatformListArgs(subArgs);
        result = await runPlatformList(client, opts, args);
        break;
      }
      case 'platform-create': {
        const args = parsePlatformCreateArgs(subArgs);
        result = await runPlatformCreate(client, opts, args);
        break;
      }
      case 'platform-get': {
        const args = parsePlatformGetArgs(subArgs);
        result = await runPlatformGet(client, opts, args);
        break;
      }
      case 'platform-update': {
        const args = parsePlatformUpdateArgs(subArgs);
        result = await runPlatformUpdate(client, opts, args);
        break;
      }
      case 'user-list': {
        const args = parseUserListArgs(subArgs);
        result = await runUserList(client, opts, args);
        break;
      }
      case 'user-create': {
        const args = parseUserCreateArgs(subArgs);
        result = await runUserCreate(client, opts, args);
        break;
      }
      case 'user-get': {
        const args = parseUserGetArgs(subArgs);
        result = await runUserGet(client, opts, args);
        break;
      }
      case 'user-update': {
        const args = parseUserUpdateArgs(subArgs);
        result = await runUserUpdate(client, opts, args);
        break;
      }
      case 'repo-list': {
        const args = parseRepoListArgs(subArgs);
        result = await runRepoList(client, opts, args);
        break;
      }
      case 'repo-create': {
        const args = parseRepoCreateArgs(subArgs);
        result = await runRepoCreate(client, opts, args);
        break;
      }
      case 'repo-get': {
        const args = parseRepoGetArgs(subArgs);
        result = await runRepoGet(client, opts, args);
        break;
      }
      case 'repo-update': {
        const args = parseRepoUpdateArgs(subArgs);
        result = await runRepoUpdate(client, opts, args);
        break;
      }
      case 'branch-list': {
        const args = parseBranchListArgs(subArgs);
        result = await runBranchList(client, opts, args);
        break;
      }
      case 'branch-create': {
        const args = parseBranchCreateArgs(subArgs);
        result = await runBranchCreate(client, opts, args);
        break;
      }
      case 'branch-get': {
        const args = parseBranchGetArgs(subArgs);
        result = await runBranchGet(client, opts, args);
        break;
      }
      case 'branch-update': {
        const args = parseBranchUpdateArgs(subArgs);
        result = await runBranchUpdate(client, opts, args);
        break;
      }
      case 'branch-delete': {
        const args = parseBranchDeleteArgs(subArgs);
        result = await runBranchDelete(client, opts, args);
        break;
      }
      case 'commit-create': {
        const args = parseCommitCreateArgs(subArgs);
        result = await runCommitCreate(client, opts, args);
        break;
      }
      case 'commit-get': {
        const args = parseCommitGetArgs(subArgs);
        result = await runCommitGet(client, opts, args);
        break;
      }
      case 'commit-list': {
        const args = parseCommitListArgs(subArgs);
        result = await runCommitList(client, opts, args);
        break;
      }
      case 'ref-list': {
        const args = parseRefListArgs(subArgs);
        result = await runRefList(client, opts, args);
        break;
      }
      case 'ref-create': {
        const args = parseRefCreateArgs(subArgs);
        result = await runRefCreate(client, opts, args);
        break;
      }
      case 'ref-get': {
        const args = parseRefGetArgs(subArgs);
        result = await runRefGet(client, opts, args);
        break;
      }
      case 'pr-list': {
        const args = parsePrListArgs(subArgs);
        result = await runPrList(client, opts, args);
        break;
      }
      case 'pr-create': {
        const args = parsePrCreateArgs(subArgs);
        result = await runPrCreate(client, opts, args);
        break;
      }
      case 'pr-get': {
        const args = parsePrGetArgs(subArgs);
        result = await runPrGet(client, opts, args);
        break;
      }
      case 'pr-update': {
        const args = parsePrUpdateArgs(subArgs);
        result = await runPrUpdate(client, opts, args);
        break;
      }
      case 'review-list': {
        const args = parseReviewListArgs(subArgs);
        result = await runReviewList(client, opts, args);
        break;
      }
      case 'review-create': {
        const args = parseReviewCreateArgs(subArgs);
        result = await runReviewCreate(client, opts, args);
        break;
      }
      case 'review-get': {
        const args = parseReviewGetArgs(subArgs);
        result = await runReviewGet(client, opts, args);
        break;
      }
      case 'review-update': {
        const args = parseReviewUpdateArgs(subArgs);
        result = await runReviewUpdate(client, opts, args);
        break;
      }
      default:
        throw new core.PingCodeError(`Unknown scm subcommand: ${subcommand}. Use scm --help for usage.`);
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

shared.registerModule('scm', {
  name: 'scm',
  description: 'Manage PingCode SCM (repositories, branches, commits, pull requests)',
  run,
});

module.exports = { run, printHelp };
