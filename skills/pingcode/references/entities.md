# 项目实体

通过 `pingcode project`、`sprint`、`board`、`version`、`tag`、`relation`、`deliverable` 子命令操作项目管理域实体。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 项目（project）

```bash
pingcode project create --name "新项目" [--identifier CODE] --dry-run
pingcode project get PROJECT_ID
pingcode project update PROJECT_ID --description "..." --dry-run
pingcode project clone PROJECT_ID --dry-run
pingcode project progress PROJECT_ID          # 工作项统计进度
pingcode project project-states               # 项目状态字典

# 项目成员与项目属性
pingcode project member-add PROJECT_ID USER_ID [--type user|user_group] [--role-id ID]
pingcode project member-list PROJECT_ID
pingcode project member-remove PROJECT_ID MEMBER_ID --dry-run
pingcode project prop-add PROJECT_ID --name 里程碑 --type text
pingcode project prop-list PROJECT_ID
pingcode project local-config-enable PROJECT_ID
```

## 迭代（sprint）

```bash
pingcode sprint list PROJECT_ID --compact
pingcode sprint create PROJECT_ID --name "Sprint 1" --start-at 1736985600 --end-at 1739577600 --assignee-id USER_ID
pingcode sprint get PROJECT_ID SPRINT_ID
pingcode sprint update PROJECT_ID SPRINT_ID --status finished --dry-run
pingcode sprint bulk-create --items '[{"project_id":"...","name":"S2","start_at":...,"end_at":...}]'
# API 未提供迭代删除接口；分组与类别（section-*/category-*）支持完整 CRUD
pingcode sprint section-list PROJECT_ID
pingcode sprint category-create PROJECT_ID --name 常规
```

## 看板（board）

```bash
pingcode board list PROJECT_ID --compact
pingcode board create PROJECT_ID --name 开发看板 --dry-run
pingcode board entry-list PROJECT_ID BOARD_ID      # 看板栏
pingcode board entry-create PROJECT_ID BOARD_ID --name 待处理 [--wip-limit 3]
pingcode board swimlane-list PROJECT_ID BOARD_ID   # 泳道
pingcode board swimlane-create PROJECT_ID BOARD_ID --name 紧急
```

## 发布（version）

```bash
pingcode version list PROJECT_ID --compact
pingcode version create PROJECT_ID --name "v1.0" --start-at ... --end-at ... --assignee-id USER_ID
pingcode version bulk-create --items '[{"name":"v2"}]'
pingcode version stage-list                        # 发布阶段（全局）
pingcode version section-list PROJECT_ID           # 发布分组
pingcode version category-list PROJECT_ID          # 发布类别
```

## 标签（tag）

```bash
pingcode tag list --compact
pingcode tag create --name 缺陷
pingcode tag add SCR-123 TAG_ID          # 给工作项打标（支持 identifier）
pingcode tag get TAG_ID SCR-123
pingcode tag remove TAG_ID SCR-123 --dry-run
```

## 工作项关联（relation）

```bash
pingcode relation add SCR-123 TARGET_WORK_ITEM_ID --relation-type relates_to
pingcode relation list SCR-123 --compact
pingcode relation remove RELATION_ID SCR-123 --dry-run
pingcode relation type-list               # 关联类型字典（9 种）
```

## 交付目标（deliverable）

```bash
pingcode deliverable list --project-id PROJECT_ID --compact
pingcode deliverable create --work-item-id WORK_ITEM_ID --name 交付物 [--content-type ... --content JSON]
pingcode deliverable get DELIVERABLE_ID
pingcode deliverable update DELIVERABLE_ID --name 新名称 --dry-run
pingcode deliverable delete DELIVERABLE_ID --dry-run
```

## 安全规则

- 所有 ID 使用 raw ID（tag/relation 的工作项主体支持 `SCR-123` identifier，自动解析）。
- 迭代无删除接口；未文档化的操作不要尝试。
- 写操作先 `--dry-run` 预览。
