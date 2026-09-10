# DevOps 集成

通过 `pingcode scm`、`release`、`build` 子命令操作代码托管、部署环境与构建记录。

## 前置条件

调用 API 前必须配置 PingCode 凭证：

```bash
export PINGCODE_CLIENT_ID="..."
export PINGCODE_CLIENT_SECRET="..."
```

## 代码托管（scm）

```bash
# 托管平台（Github/Gitlab 等）
pingcode scm platform-list --compact
pingcode scm platform-create --name "公司 Gitlab" --provider gitlab [...]
pingcode scm platform-get PLATFORM_ID
pingcode scm platform-update PLATFORM_ID --name 新名 --dry-run   # PATCH 部分更新

# 平台用户
pingcode scm user-list PLATFORM_ID --compact
pingcode scm user-create PLATFORM_ID --username octocat

# 仓库
pingcode scm repo-list PLATFORM_ID --compact
pingcode scm repo-create PLATFORM_ID --name api-server [...]
pingcode scm repo-update PLATFORM_ID REPO_ID --description "..." --dry-run

# 分支（唯一有删除接口的 SCM 资源）
pingcode scm branch-list PLATFORM_ID REPO_ID --compact
pingcode scm branch-create PLATFORM_ID REPO_ID --name feature/login [...]
pingcode scm branch-delete PLATFORM_ID REPO_ID BRANCH_ID --dry-run

# 提交与引用
pingcode scm commit-create --sha abc123 [...]   # 上报提交
pingcode scm commit-get COMMIT_ID_OR_SHA
pingcode scm commit-list --compact
pingcode scm ref-create PLATFORM_ID REPO_ID --meta-type ... --meta-id ...
pingcode scm ref-list PLATFORM_ID REPO_ID --meta-type ... --meta-id ...

# 拉取请求与代码评审
pingcode scm pr-list PLATFORM_ID REPO_ID --compact
pingcode scm pr-create PLATFORM_ID REPO_ID --number 42 [...]
pingcode scm pr-update PLATFORM_ID REPO_ID PR_ID --title 新标题 --dry-run
pingcode scm review-list PLATFORM_ID REPO_ID PR_ID
pingcode scm review-update PLATFORM_ID REPO_ID PR_ID REVIEW_ID --status approved --dry-run
```

## 部署（release）

```bash
pingcode release env-list --name 生产 --compact     # --name 必填
pingcode release env-create --name 生产 [...]
pingcode release env-update ENV_ID ...              # PUT 全量更新（字段齐全）
pingcode release env-patch ENV_ID --description ... # PATCH 部分更新
pingcode release env-delete ENV_ID --dry-run

pingcode release deploy-list --status deployed --compact
pingcode release deploy-create --env-id ENV_ID --status deployed --release-name v1.0 --start-at ... --end-at ... --duration 120
pingcode release deploy-update DEPLOY_ID ...        # PUT 全量更新
pingcode release deploy-patch DEPLOY_ID --status not_deployed  # PATCH 部分更新
pingcode release deploy-delete DEPLOY_ID --dry-run
```

## 构建（build）

```bash
pingcode build list --compact
pingcode build create --name "ci-build" --identifier b-001 --provider jenkins [...]
pingcode build get BUILD_ID
pingcode build update BUILD_ID ...     # PUT 全量更新
pingcode build patch BUILD_ID --status success    # PATCH 部分更新
pingcode build delete BUILD_ID --dry-run
```

## 安全规则

- provider/status 等枚举值有校验（jenkins/bamboo/bitbucket/other；success/failure；deployed/not_deployed）。
- 全量更新（PUT）要求文档规定的必填字段齐全；局部修改用 `*-patch`（PATCH）。
- 除代码分支外，SCM 资源无删除接口；写操作先 `--dry-run`。
