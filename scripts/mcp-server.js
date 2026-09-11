'use strict';

// Thin MCP layer over the hand-written CLI command modules.
// The CLI is the only engine: every curated tool either bridges MCP
// arguments to the existing command modules (args -> argv) or calls the
// same core helpers the commands use. No business logic lives here.

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const core = require('./core');
const authCmd = require('./commands/auth');
const workitemCmd = require('./commands/workitem');
const commentCmd = require('./commands/comment');
const workloadCmd = require('./commands/workload');
const productCmd = require('./commands/product');
const ideaCmd = require('./commands/idea');
const pkg = require('../package.json');

// ── Client & output helpers ───────────────────────────────────────────

function buildClient(args) {
  const clientId = args.client_id || process.env.PINGCODE_CLIENT_ID || null;
  const clientSecret = args.client_secret || process.env.PINGCODE_CLIENT_SECRET || null;
  if (!clientId || !clientSecret) {
    throw new core.PingCodeError(
      'Missing PINGCODE_CLIENT_ID / PINGCODE_CLIENT_SECRET. Configure them in the MCP server environment, or run `pingcode mcp init`.'
    );
  }
  return new core.PingCodeClient({
    base_url: args.base_url || process.env.PINGCODE_BASE_URL,
    client_id: clientId,
    client_secret: clientSecret,
    token: args.token || process.env.PINGCODE_ACCESS_TOKEN || null,
    token_cache: process.env.PINGCODE_TOKEN_CACHE || core.DEFAULT_TOKEN_CACHE,
    workspace_cache: args.workspace_cache || process.env.PINGCODE_WORKSPACE_CACHE || core.DEFAULT_WORKSPACE_CACHE,
    grant_type: args.grant_type || process.env.PINGCODE_GRANT_TYPE || 'auto',
  });
}

async function captureConsoleAsync(fn) {
  const original = console.log;
  const output = [];
  console.log = (...args) => output.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.log = original;
  }
  return output.join('\n');
}

// Args -> argv bridge: run a command module with CLI tokens and capture
// the JSON it prints on stdout.
async function runCommand(cmd, argv) {
  return await captureConsoleAsync(() => cmd.run(argv));
}

function textResponse(text) {
  return { content: [{ type: 'text', text: String(text) }] };
}

function jsonResponse(data) {
  return textResponse(JSON.stringify(data, null, 2));
}

// ── Tool schemas ──────────────────────────────────────────────────────

const CONNECTION_PROPS = {
  base_url: { type: 'string', description: 'PingCode base URL' },
  client_id: { type: 'string', description: 'OAuth client ID' },
  client_secret: { type: 'string', description: 'OAuth client secret' },
  token: { type: 'string', description: 'Explicit bearer token (not saved)' },
  grant_type: { type: 'string', description: 'client_credentials, authorization_code, or auto (default)' },
};

const TOOLS = [
  {
    name: 'pingcode_auth_status',
    description: 'Check PingCode authentication status, token cache, and workspace cache.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'pingcode_list_projects',
    description: 'List PingCode projects available to the current credentials.',
    inputSchema: { type: 'object', properties: { ...CONNECTION_PROPS } },
  },
  {
    name: 'pingcode_list_sprints',
    description: 'List sprints/iterations for a PingCode project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project raw id' },
        ...CONNECTION_PROPS,
      },
      required: ['project_id'],
    },
  },
  {
    name: 'pingcode_list_users',
    description: 'List PingCode users (project members).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project raw id; defaults to the cached current project' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_context_get',
    description: 'Get the current workspace context preferences and cached dictionary counts.',
    inputSchema: { type: 'object', properties: { ...CONNECTION_PROPS } },
  },
  {
    name: 'pingcode_context_set',
    description: 'Set the current workspace context (project, sprint, user). Pass at least one of project_id, sprint_id, user_id.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project raw id to cache as current project' },
        sprint_id: { type: 'string', description: 'Sprint raw id to cache as current sprint' },
        user_id: { type: 'string', description: 'User raw id to cache as current user' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_workitem_list',
    description: 'List PingCode work items. Defaults to current user/project/sprint from workspace context.',
    inputSchema: {
      type: 'object',
      properties: {
        state: { type: 'string', description: 'State name' },
        type: { type: 'string', description: 'Work item type name' },
        assignee: { type: 'string', description: 'Assignee name or @me' },
        project: { type: 'string', description: 'Project name' },
        sprint: { type: 'string', description: 'Sprint name' },
        keywords: { type: 'string', description: 'Search keywords' },
        limit: { type: 'integer', description: 'Page size' },
        all_users: { type: 'boolean', description: 'Do not filter by current user' },
        all_projects: { type: 'boolean', description: 'Do not filter by current project' },
        all_sprints: { type: 'boolean', description: 'Do not filter by current sprint' },
        user_id: { type: 'string', description: 'Current user raw id' },
        user_name: { type: 'string', description: 'Current user name' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_workitem_get',
    description: 'Get a single PingCode work item by raw id or identifier (e.g., SCR-123).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Work item raw id' },
        identifier: { type: 'string', description: 'Work item identifier such as SCR-123' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_workitem_create',
    description: 'Create a PingCode work item. Defaults to the cached project/sprint/current user.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Work item title' },
        type: { type: 'string', description: 'Work item type name' },
        project: { type: 'string', description: 'Project name' },
        sprint: { type: 'string', description: 'Sprint name' },
        assignee: { type: 'string', description: 'Assignee name or @me' },
        state: { type: 'string', description: 'State name' },
        priority: { type: 'string', description: 'Priority name' },
        description: { type: 'string', description: 'Work item description' },
        parent: { type: 'string', description: 'Parent work item raw id' },
        all_users: { type: 'boolean', description: 'Do not default the assignee' },
        all_projects: { type: 'boolean', description: 'Do not default the project' },
        all_sprints: { type: 'boolean', description: 'Do not default the sprint' },
        user_id: { type: 'string', description: 'Current user raw id' },
        ...CONNECTION_PROPS,
      },
      required: ['title'],
    },
  },
  {
    name: 'pingcode_workitem_update',
    description: 'Update a PingCode work item by raw id or identifier (e.g., SCR-123).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Work item raw id or identifier' },
        title: { type: 'string' },
        description: { type: 'string' },
        type: { type: 'string', description: 'Work item type name' },
        project: { type: 'string', description: 'Project name' },
        sprint: { type: 'string', description: 'Sprint name' },
        state: { type: 'string', description: 'State name' },
        priority: { type: 'string', description: 'Priority name' },
        assignee: { type: 'string', description: 'Assignee name or @me' },
        parent: { type: 'string', description: 'Parent work item raw id' },
        version: { type: 'string' },
        board: { type: 'string' },
        entry: { type: 'string' },
        swimlane: { type: 'string' },
        start_at: { type: 'integer', description: 'Unix timestamp or ISO date' },
        end_at: { type: 'integer', description: 'Unix timestamp or ISO date' },
        participants: { type: 'string', description: 'Comma-separated user names' },
        story_points: { type: 'number' },
        estimated_workload: { type: 'number' },
        remaining_workload: { type: 'number' },
        properties: { type: 'string', description: 'JSON object string' },
        user_id: { type: 'string' },
        ...CONNECTION_PROPS,
      },
      required: ['id'],
    },
  },
  {
    name: 'pingcode_workitem_delete',
    description: 'Delete a PingCode work item by raw id or identifier (e.g., SCR-123).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Work item raw id or identifier' },
        ...CONNECTION_PROPS,
      },
      required: ['id'],
    },
  },
  {
    name: 'pingcode_workitem_search',
    description: 'Search PingCode work items with a structured query.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: { type: 'string', description: 'JSON filter object string' },
        keywords: { type: 'string', description: 'Search keywords' },
        page_size: { type: 'integer', description: 'Page size (1-100)' },
        page_index: { type: 'integer', description: 'Page index' },
        include_deleted: { type: 'boolean' },
        include_archived: { type: 'boolean' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_workitem_my',
    description: 'List open work items assigned to the current user, scoped to the cached project/sprint.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Work item type name' },
        project: { type: 'string', description: 'Project name' },
        sprint: { type: 'string', description: 'Sprint name' },
        limit: { type: 'integer', description: 'Page size' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_workitem_start',
    description: 'Move a work item to the cached "in progress" state (defaults to 进行中).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Work item raw id or identifier' },
        state: { type: 'string', description: 'Override target state name' },
        ...CONNECTION_PROPS,
      },
      required: ['id'],
    },
  },
  {
    name: 'pingcode_workitem_done',
    description: 'Move a work item to the cached "completed" state (defaults to 已完成).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Work item raw id or identifier' },
        state: { type: 'string', description: 'Override target state name' },
        ...CONNECTION_PROPS,
      },
      required: ['id'],
    },
  },
  {
    name: 'pingcode_comment_create',
    description: 'Create a comment on a PingCode work item (or another principal type).',
    inputSchema: {
      type: 'object',
      properties: {
        work_item_id: { type: 'string', description: 'Work item raw id or identifier' },
        content: { type: 'string', description: 'Comment content (text)' },
        reply_to: { type: 'string', description: 'Comment id to reply to' },
        principal_type: { type: 'string', description: 'Principal type: work_item (default), work_item_deliverable, test_case, test_run, idea, ticket, page' },
        ...CONNECTION_PROPS,
      },
      required: ['work_item_id', 'content'],
    },
  },
  {
    name: 'pingcode_comment_list',
    description: 'List comments on a PingCode work item (or another principal type).',
    inputSchema: {
      type: 'object',
      properties: {
        work_item_id: { type: 'string', description: 'Work item raw id or identifier' },
        principal_type: { type: 'string', description: 'Principal type: work_item (default), work_item_deliverable, test_case, test_run, idea, ticket, page' },
        ...CONNECTION_PROPS,
      },
      required: ['work_item_id'],
    },
  },
  {
    name: 'pingcode_workload_create',
    description: 'Log workload (spent hours) on a work item, idea, or test case.',
    inputSchema: {
      type: 'object',
      properties: {
        principal_type: { type: 'string', description: 'Principal type: work_item, idea, or test_case', enum: ['work_item', 'idea', 'test_case'] },
        principal_id: { type: 'string', description: 'Principal raw id' },
        duration: { type: 'number', description: 'Workload duration in hours' },
        report_at: { type: 'integer', description: 'Report date as unix timestamp (seconds)' },
        type_id: { type: 'string', description: 'Workload type raw id' },
        report_by_id: { type: 'string', description: 'Reporter user raw id' },
        recorded_at: { type: 'integer', description: 'Recorded date as unix timestamp (seconds)' },
        description: { type: 'string', description: 'Workload description' },
        ...CONNECTION_PROPS,
      },
      required: ['principal_type', 'principal_id', 'duration', 'report_at'],
    },
  },
  {
    name: 'pingcode_product_list',
    description: 'List PingCode Ship products.',
    inputSchema: {
      type: 'object',
      properties: {
        keywords: { type: 'string', description: 'Filter by keywords (matches name and identifier)' },
        limit: { type: 'integer', description: 'Max results per page' },
        ...CONNECTION_PROPS,
      },
    },
  },
  {
    name: 'pingcode_idea_list',
    description: 'List PingCode Ship ideas for a product.',
    inputSchema: {
      type: 'object',
      properties: {
        product: { type: 'string', description: 'Product raw id' },
        state: { type: 'string', description: 'Idea state raw id' },
        priority: { type: 'string', description: 'Idea priority raw id' },
        keywords: { type: 'string', description: 'Search keywords' },
        include_public_image_token: { type: 'boolean', description: 'Include public image token in descriptions' },
        ...CONNECTION_PROPS,
      },
      required: ['product'],
    },
  },
];

// ── Dispatch ──────────────────────────────────────────────────────────

async function handleTool(name, args) {
  switch (name) {
    case 'pingcode_auth_status': {
      const output = await captureConsoleAsync(() => authCmd.runStatus(['--compact']));
      return textResponse(output || '{}');
    }

    case 'pingcode_list_projects': {
      const client = buildClient(args);
      const projects = await core.cacheProjects(client);
      return jsonResponse(core.compactResponse(projects));
    }

    case 'pingcode_list_sprints': {
      if (!args.project_id) {
        throw new core.PingCodeError('project_id is required');
      }
      const client = buildClient(args);
      const sprints = await core.cacheSprints(client, args.project_id);
      return jsonResponse(core.compactResponse(sprints));
    }

    case 'pingcode_list_users': {
      const client = buildClient(args);
      const users = await core.cacheUsers(client, args.project_id || null);
      return jsonResponse(core.compactResponse(users));
    }

    case 'pingcode_context_set': {
      const client = buildClient(args);
      const results = {};
      if (args.project_id) {
        await core.setCurrentProject(client, args.project_id);
        results.project_set = args.project_id;
        // Dictionary prefetch is best effort, mirroring `pingcode context`:
        // writing the preference must not fail because an optional fetch did.
        try {
          await core.cacheProjectDictionaries(client, args.project_id);
          results.dictionaries_cached = true;
        } catch (exc) {
          results.dictionaries_cached = false;
          results.dictionaries_error = exc.message;
        }
      }
      if (args.sprint_id) {
        await core.setCurrentSprint(client, args.sprint_id);
        results.sprint_set = args.sprint_id;
      }
      if (args.user_id) {
        await core.setCurrentUser(client, args.user_id);
        results.user_set = args.user_id;
      }
      return jsonResponse({ ...results, preferences: client.workspaceCache.preferences });
    }

    case 'pingcode_context_get': {
      const client = buildClient(args);
      const cache = client.workspaceCache;
      const counts = {
        users: core.pageValues(cache.users).length,
        projects: core.pageValues(cache.projects).length,
        sprints: Object.values(cache.sprints || {}).reduce((s, p) => s + core.pageValues(p).length, 0),
      };
      return jsonResponse({ preferences: cache.preferences, dictionary_counts: counts });
    }

    case 'pingcode_workitem_list': {
      const tokens = ['list'];
      if (args.state) tokens.push('--state', args.state);
      if (args.type) tokens.push('--type', args.type);
      if (args.assignee) tokens.push('--assignee', args.assignee);
      if (args.project) tokens.push('--project', args.project);
      if (args.sprint) tokens.push('--sprint', args.sprint);
      if (args.keywords) tokens.push('--keywords', args.keywords);
      if (args.limit) tokens.push('--limit', String(args.limit));
      if (args.all_users) tokens.push('--all-users');
      if (args.all_projects) tokens.push('--all-projects');
      if (args.all_sprints) tokens.push('--all-sprints');
      if (args.user_id) tokens.push('--user-id', args.user_id);
      if (args.user_name) tokens.push('--user-name', args.user_name);
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workitem_get': {
      const target = args.id || args.identifier;
      if (!target) {
        throw new core.PingCodeError('A work item id or identifier is required');
      }
      const output = await runCommand(workitemCmd, ['get', target, '--compact']);
      return textResponse(output);
    }

    case 'pingcode_workitem_create': {
      if (typeof args.title !== 'string' || !args.title.trim()) {
        throw new core.PingCodeError('title is required and must be non-empty');
      }
      const tokens = ['create', '--title', args.title];
      if (args.type) tokens.push('--type', args.type);
      if (args.project) tokens.push('--project', args.project);
      if (args.sprint) tokens.push('--sprint', args.sprint);
      if (args.assignee) tokens.push('--assignee', args.assignee);
      if (args.state) tokens.push('--state', args.state);
      if (args.priority) tokens.push('--priority', args.priority);
      if (args.description) tokens.push('--description', args.description);
      if (args.parent) tokens.push('--parent', args.parent);
      if (args.all_users) tokens.push('--all-users');
      if (args.all_projects) tokens.push('--all-projects');
      if (args.all_sprints) tokens.push('--all-sprints');
      if (args.user_id) tokens.push('--user-id', args.user_id);
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workitem_update': {
      const target = args.id || args.identifier;
      if (!target) {
        throw new core.PingCodeError('A work item id or identifier is required');
      }
      const tokens = ['update', target];
      if (args.title) tokens.push('--title', args.title);
      if (args.description) tokens.push('--description', args.description);
      if (args.type) tokens.push('--type', args.type);
      if (args.project) tokens.push('--project', args.project);
      if (args.sprint) tokens.push('--sprint', args.sprint);
      if (args.state) tokens.push('--state', args.state);
      if (args.priority) tokens.push('--priority', args.priority);
      if (args.assignee) tokens.push('--assignee', args.assignee);
      if (args.parent) tokens.push('--parent', args.parent);
      if (args.version) tokens.push('--version', args.version);
      if (args.board) tokens.push('--board', args.board);
      if (args.entry) tokens.push('--entry', args.entry);
      if (args.swimlane) tokens.push('--swimlane', args.swimlane);
      if (args.start_at !== undefined) tokens.push('--start-at', String(args.start_at));
      if (args.end_at !== undefined) tokens.push('--end-at', String(args.end_at));
      if (args.participants) tokens.push('--participants', args.participants);
      if (args.story_points !== undefined) tokens.push('--story-points', String(args.story_points));
      if (args.estimated_workload !== undefined) tokens.push('--estimated-workload', String(args.estimated_workload));
      if (args.remaining_workload !== undefined) tokens.push('--remaining-workload', String(args.remaining_workload));
      if (args.properties) tokens.push('--properties', args.properties);
      if (args.user_id) tokens.push('--user-id', args.user_id);
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workitem_delete': {
      const target = args.id || args.identifier;
      if (!target) {
        throw new core.PingCodeError('A work item id or identifier is required');
      }
      const output = await runCommand(workitemCmd, ['delete', target, '--compact']);
      return textResponse(output);
    }

    case 'pingcode_workitem_search': {
      const tokens = ['search'];
      if (args.filter) tokens.push('--filter', args.filter);
      if (args.keywords) tokens.push('--keywords', args.keywords);
      if (args.page_size !== undefined) tokens.push('--page-size', String(args.page_size));
      if (args.page_index !== undefined) tokens.push('--page-index', String(args.page_index));
      if (args.include_deleted) tokens.push('--include-deleted');
      if (args.include_archived) tokens.push('--include-archived');
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workitem_my': {
      const tokens = ['my'];
      if (args.type) tokens.push('--type', args.type);
      if (args.project) tokens.push('--project', args.project);
      if (args.sprint) tokens.push('--sprint', args.sprint);
      if (args.limit) tokens.push('--limit', String(args.limit));
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workitem_start': {
      const target = args.id || args.identifier;
      if (!target) {
        throw new core.PingCodeError('A work item id or identifier is required');
      }
      const tokens = ['start', target];
      if (args.state) tokens.push('--state', args.state);
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workitem_done': {
      const target = args.id || args.identifier;
      if (!target) {
        throw new core.PingCodeError('A work item id or identifier is required');
      }
      const tokens = ['done', target];
      if (args.state) tokens.push('--state', args.state);
      tokens.push('--compact');
      const output = await runCommand(workitemCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_comment_create': {
      if (!args.work_item_id) {
        throw new core.PingCodeError('work_item_id is required');
      }
      if (typeof args.content !== 'string' || !args.content.trim()) {
        throw new core.PingCodeError('content is required and must be non-empty');
      }
      const tokens = ['create', args.work_item_id, '--content', args.content];
      if (args.reply_to) tokens.push('--reply-to', args.reply_to);
      if (args.principal_type) tokens.push('--principal-type', args.principal_type);
      tokens.push('--compact');
      const output = await runCommand(commentCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_comment_list': {
      if (!args.work_item_id) {
        throw new core.PingCodeError('work_item_id is required');
      }
      const tokens = ['list', args.work_item_id];
      if (args.principal_type) tokens.push('--principal-type', args.principal_type);
      tokens.push('--compact');
      const output = await runCommand(commentCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_workload_create': {
      if (!args.principal_type) {
        throw new core.PingCodeError('principal_type is required (work_item, idea, or test_case)');
      }
      if (!args.principal_id) {
        throw new core.PingCodeError('principal_id is required');
      }
      if (args.duration === undefined) {
        throw new core.PingCodeError('duration is required');
      }
      if (args.report_at === undefined) {
        throw new core.PingCodeError('report_at is required');
      }
      const tokens = [
        'create',
        '--principal-type', args.principal_type,
        '--principal-id', args.principal_id,
        '--duration', String(args.duration),
        '--report-at', String(args.report_at),
      ];
      if (args.type_id) tokens.push('--type-id', args.type_id);
      if (args.report_by_id) tokens.push('--report-by-id', args.report_by_id);
      if (args.recorded_at !== undefined) tokens.push('--recorded-at', String(args.recorded_at));
      if (args.description) tokens.push('--description', args.description);
      tokens.push('--compact');
      const output = await runCommand(workloadCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_product_list': {
      const tokens = ['list'];
      if (args.keywords) tokens.push('--keywords', args.keywords);
      if (args.limit) tokens.push('--limit', String(args.limit));
      tokens.push('--compact');
      const output = await runCommand(productCmd, tokens);
      return textResponse(output);
    }

    case 'pingcode_idea_list': {
      if (!args.product) {
        throw new core.PingCodeError('product (raw id) is required');
      }
      const tokens = ['list', '--product', args.product];
      if (args.state) tokens.push('--state', args.state);
      if (args.priority) tokens.push('--priority', args.priority);
      if (args.keywords) tokens.push('--keywords', args.keywords);
      if (args.include_public_image_token) tokens.push('--include-public-image-token');
      tokens.push('--compact');
      const output = await runCommand(ideaCmd, tokens);
      return textResponse(output);
    }

    default:
      throw new core.PingCodeError(`Unknown tool: ${name}`);
  }
}

// ── Server ────────────────────────────────────────────────────────────

async function runMcpServer(transport) {
  const server = new Server(
    { name: 'pingcode-cli', version: pkg.version },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await handleTool(request.params.name, request.params.arguments || {});
      return result;
    } catch (exc) {
      const message = exc && exc.message ? exc.message : String(exc);
      return { content: [{ type: 'text', text: `Error: ${message}` }], isError: true };
    }
  });

  await server.connect(transport || new StdioServerTransport());
}

module.exports = { runMcpServer, handleTool, TOOLS };
