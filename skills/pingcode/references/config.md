# 企业配置

通过 `pingcode config` 与 `pingcode plans` 子命令管理 PingCode 企业级配置：自定义工作项类型/状态/属性、项目属性、流程，以及类型/状态/属性方案。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 基础资源（config）

```bash
# 自定义工作项类型
pingcode config type-list-all
pingcode config type-create --name "定制类型" --group workflow --dry-run
pingcode config type-get TYPE_ID
pingcode config type-update TYPE_ID --name 新名 --dry-run
pingcode config type-delete TYPE_ID --dry-run

# 自定义工作项状态（更新仅限非系统状态；无删除）
pingcode config state-list
pingcode config state-create --name 待评审 --type story

# 工作项属性（无删除）
pingcode config property-list
pingcode config property-create --name 复核人 --type single_select --options '[{"text":"张三"},{"text":"李四"}]'
pingcode config property-update PROPERTY_ID --name 新名 --dry-run

# 优先级（仅单查）、流程、项目状态（均只读）
pingcode config priority-get PRIORITY_ID
pingcode config process-list
pingcode config process-get PROCESS_ID
pingcode config project-state-get STATE_ID

# 全局项目属性
pingcode config project-property-list
pingcode config project-property-create --name 业务线 --type single_select --options JSON
```

## 配置方案（plans）

```bash
# 类型方案：把类型装配到方案
pingcode plans type-plan-list [--project-id ID]
pingcode plans type-plan-get PLAN_ID
pingcode plans type-plan-type-add PLAN_ID TYPE_ID --dry-run
pingcode plans type-plan-type-update PLAN_ID TYPE_ID --sub-type-ids a,b,c --dry-run
pingcode plans type-plan-type-list PLAN_ID
pingcode plans type-plan-type-remove PLAN_ID TYPE_ID --dry-run

# 状态方案：装配状态 + 状态流转（flow）
pingcode plans state-plan-list
pingcode plans state-plan-state-add PLAN_ID STATE_ID --dry-run
pingcode plans flow-add PLAN_ID FROM_STATE_ID TO_STATE_ID --dry-run
pingcode plans flow-list PLAN_ID --compact
pingcode plans flow-remove PLAN_ID FLOW_ID --dry-run

# 属性方案：装配属性
pingcode plans property-plan-list
pingcode plans property-plan-property-add PLAN_ID PROPERTY_ID --dry-run
pingcode plans property-plan-property-list PLAN_ID
```

## 安全规则

- 方案与嵌套资源 ID 全部使用 raw ID，禁止猜测。
- 方案本体只读（仅 list/get）；嵌套资源支持 add/get/list/(update)/remove，文档未定义的删除/更新操作不要尝试。
- 写操作先 `--dry-run` 预览。
