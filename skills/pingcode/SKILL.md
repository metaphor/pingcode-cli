---
name: pingcode
description: 操作 PingCode 数据（工作项、需求、产品、迭代、测试、工单、知识库、工时、代码托管、构建部署等）时使用。凡请求涉及 PingCode 的查询、创建、更新或删除，均触发此 skill。
---

# PingCode

通过 `pingcode` CLI 统一操作 PingCode 全模块数据。

## 前置

凭证由环境变量 `PINGCODE_CLIENT_ID`、`PINGCODE_CLIENT_SECRET` 提供；不要要求用户粘贴凭证，不要在回答中回显。

## 黄金规则

1. 先执行 `pingcode context init` 建立工作区上下文。
2. ID/名称不猜测，用 list 命令解析。
3. 写操作先 `--dry-run` 预览。
4. 列表输出加 `--compact`。
5. 一切细节看 `pingcode <module> --help`。

## 模块一览

| 模块 | 用途 | 模块 | 用途 |
|---|---|---|---|
| attachment | 附件管理 | auth | 认证与登录 |
| board | 看板 | build | 构建记录 |
| comment | 评论 | config | 企业配置（类型/状态/优先级/属性/流程） |
| context | 工作区上下文 | deliverable | 交付目标 |
| directory | 组织目录（用户/团队/部门） | idea | 需求 |
| plans | 类型/状态/属性方案 | platform | 平台资源（关注人/关联/活动/审计日志） |
| product | 产品 | project | 项目 |
| relation | 工作项关联 | release | 部署环境与部署记录 |
| review | 评审 | scm | 代码托管（仓库/分支/提交/PR） |
| sprint | 迭代 | tag | 工作项标签 |
| testhub | 测试管理（库/用例/计划/执行） | ticket | 工单 |
| version | 发布版本 | wiki | 知识库（空间与页面） |
| workitem | 工作项 | workload | 工时 |
