# 协作与组织

通过 `pingcode wiki`、`workload`、`review`、`directory`、`platform` 子命令操作知识库、工时、评审、组织与平台级资源。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 知识库（wiki）

```bash
pingcode wiki space-list --compact
pingcode wiki space-create --scope_type project --name 团队空间 --identifier TEAM [--scope-id ID]
pingcode wiki space-get SPACE_ID
pingcode wiki space-update SPACE_ID --description ... --dry-run
pingcode wiki space-delete SPACE_ID --dry-run
pingcode wiki member-add SPACE_ID MEMBER_ID --type user
pingcode wiki member-list SPACE_ID

# 页面与正文
pingcode wiki page-list --space-id SPACE_ID --compact
pingcode wiki page-create --space-id SPACE_ID --name 会议纪要 [--content "..." --format-type markdown]
pingcode wiki page-get PAGE_ID
pingcode wiki page-update PAGE_ID --name 新名 --dry-run
pingcode wiki page-delete PAGE_ID --dry-run
pingcode wiki content-get PAGE_ID
pingcode wiki content-update PAGE_ID --content "..." --format-type markdown --dry-run   # PUT 全量替换
pingcode wiki version-list PAGE_ID
pingcode wiki version-restore PAGE_ID VERSION_ID --dry-run
```

## 工时（workload）

```bash
pingcode workload list --principal-type work_item --principal-id WORK_ITEM_ID --compact
pingcode workload create --principal-type work_item --principal-id ID --duration 120 --report-at 1736985600
pingcode workload get WORKLOAD_ID
pingcode workload update WORKLOAD_ID --duration 90 --dry-run
pingcode workload delete WORKLOAD_ID --dry-run
pingcode workload type-list        # 工时类型
```

## 评审（review）

```bash
pingcode review list --principal-type idea --pilot-id PRODUCT_ID --compact
pingcode review create --principal-type work_item --pilot-id ID --title "方案评审" [...]
pingcode review get REVIEW_ID --principal-type work_item --principal-id ID
pingcode review delete REVIEW_ID --principal-type work_item --principal-id ID --dry-run
pingcode review principal-add REVIEW_ID --principal-id USER_ID --type user
pingcode review principal-list REVIEW_ID --principal-type ... --principal-id ...
```

## 组织（directory）

```bash
pingcode directory me              # 当前用户信息
pingcode directory team            # 企业信息
pingcode directory user-list --compact
pingcode directory user-create --name 张三 [...]
pingcode directory user-get USER_ID
pingcode directory user-update USER_ID --name 新名 --dry-run
pingcode directory user-bulk-update --items JSON
pingcode directory group-list      # 团队
pingcode directory group-member-add GROUP_ID MEMBER_ID
pingcode directory department-list
pingcode directory department-create --name 研发部
pingcode directory job-list        # 职位（只读）
pingcode directory role-list       # 角色（只读）
```

## 平台资源（platform）

```bash
# 关注人（work_item 主体支持 SCR-123 identifier）
pingcode platform participant-add SCR-123 --participant-id USER_ID --type user
pingcode platform participant-list --principal-type work_item --principal-id WORK_ITEM_ID
pingcode platform participant-remove PARTICIPANT_ID --principal-type work_item --principal-id WORK_ITEM_ID --dry-run

# 通用跨资源关联
pingcode platform link-create --principal-type work_item --principal-id ID --target-type page --target-id PAGE_ID
pingcode platform link-list --principal-type work_item --principal-id ID --target-type page

# 动态与审计
pingcode platform activity-list --principal-type work_item --principal-id ID
pingcode platform audit-logs --operated-between 2026-01-01,2026-09-01
pingcode platform login-logs --logged-between 2026-01-01,2026-09-01
```

## 安全规则

- `--principal-type`/`--pilot-id` 等必填过滤参数严格按 help 提供枚举值。
- 日志接口只读；成员/页面删除、工时删除等写操作先 `--dry-run`。
- 禁止猜测任何 ID，先 list/get 解析。
