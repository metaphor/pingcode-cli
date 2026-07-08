# PingCode API Reference

Official docs: `https://open.pingcode.com/`.

The public cloud REST root is:

```text
https://open.pingcode.com
```

Private deployments use:

```text
https://<host>/open
```

## Auth

Client credentials:

```http
GET /v1/auth/token?grant_type=client_credentials&client_id={client_id}&client_secret={client_secret}
```

Use the returned access token as:

```http
Authorization: Bearer {access_token}
```

The docs call this an enterprise token and state that it has system administrator permissions.

## Request Conventions

* `GET` and `DELETE` pass parameters as query string.
* `POST`, `PUT`, and `PATCH` use `content-type: application/json`.
* Pagination uses `page_size` and `page_index`; `page_index=0` is the first page.
* Maximum documented page size is 100.
* Rate limit is 200 requests per minute per identity.
* HTTP 429 includes `x-pc-retry-after`.

## Project Management

| Operation | Method | Path |
|---|---|---:|
| List projects | GET | `/v1/project/projects` |
| Create project | POST | `/v1/project/projects` |
| Update project | PATCH | `/v1/project/projects/{project_id}` |
| Project progress | GET | `/v1/project/projects/{project_id}/progress` |
| Project states | GET | `/v1/project/project/states?project_id={project_id}` |
| Project members | GET | `/v1/project/projects/{project_id}/members` |
| List sprints | GET | `/v1/project/projects/{project_id}/sprints` |
| List boards | GET | `/v1/project/projects/{project_id}/boards` |
| List board entries | GET | `/v1/project/projects/{project_id}/boards/{board_id}/entries` |
| List swimlanes | GET | `/v1/project/projects/{project_id}/boards/{board_id}/swimlanes` |

## Work Items

| Operation | Method | Path |
|---|---|---:|
| List work items | GET | `/v1/project/work_items` |
| Create work item | POST | `/v1/project/work_items` |
| Update work item | PATCH | `/v1/project/work_items/{work_item_id}` |
| Bulk property update | PATCH | `/v1/project/work_items` |
| Delete work item | DELETE | `/v1/project/work_items/{work_item_id}` |
| Work item types | GET | `/v1/project/work_item/types?project_id={project_id}` |
| Work item states | GET | `/v1/project/work_item/states?project_id={project_id}&work_item_type_id={work_item_type_id}` |
| Work item priorities | GET | `/v1/project/work_item/priorities?project_id={project_id}` |
| Work item properties | GET | `/v1/project/work_item/properties?project_id={project_id}&work_item_type_id={work_item_type_id}` |
| Transition history | GET | `/v1/project/work_items/{work_item_id}/transition_histories` |

Create work item required fields:

* `project_id`
* `type_id`
* `title`

Common optional fields:

* `description`
* `start_at`
* `end_at`
* `priority_id`
* `state_id`
* `assignee_id`
* `parent_id`
* `sprint_id`
* `board_id`
* `entry_id`
* `swimlane_id`
* `story_points`
* `estimated_workload`
* `remaining_workload`
* `properties`
* `participant_ids`

Status update:

```http
PATCH /v1/project/work_items/{work_item_id}
Content-Type: application/json

{"state_id": "..."}
```

The target `state_id` must satisfy the work item type state scheme and allowed state transition.

## User Lookup

Use `GET /v1/project/projects/{project_id}/members` to cache users available in a project. Some tenants may also expose `GET /v1/directory/users`; the CLI uses project members when `--project-id` or a cached current project is available, then falls back to the global user-list endpoint only when no project is selected.

## Product Management

| Operation | Method | Path |
|---|---|---:|
| List products | GET | `/v1/ship/products` |
| Create product | POST | `/v1/ship/products` |
| Update product | PATCH | `/v1/ship/products/{product_id}` |
| Product members | GET | `/v1/ship/products/{product_id}/members` |
| Product idea suites | GET | `/v1/ship/products/{product_id}/suites` |
| Product idea plans | GET | `/v1/ship/products/{product_id}/plans` |
| Product tags | GET | `/v1/ship/products/{product_id}/tags` |

## Ideas

| Operation | Method | Path |
|---|---|---:|
| List ideas | GET | `/v1/ship/ideas` |
| Create idea | POST | `/v1/ship/ideas` |
| Update idea | PATCH | `/v1/ship/ideas/{idea_id}` |
| Idea states | GET | `/v1/ship/idea/states?product_id={product_id}` |
| Idea priorities | GET | `/v1/ship/idea/priorities?product_id={product_id}` |
| Idea properties | GET | `/v1/ship/idea/properties?product_id={product_id}` |
| Idea plans | GET | `/v1/ship/idea/plans?product_id={product_id}` |
| Idea suites | GET | `/v1/ship/idea/suites?product_id={product_id}` |
| Transition history | GET | `/v1/ship/ideas/{idea_id}/transition_histories` |

Create idea required fields:

* `product_id`
* `title`

Common optional fields:

* `assignee_id`
* `description`
* `suite_id`
* `properties`
