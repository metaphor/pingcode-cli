# 工作区上下文

配置 `.pingcode/cache.json`，让工作项命令可以使用默认的项目、迭代和用户值。`pingcode context list` 以 JSON 输出当前偏好和字典条目数量。

## Agent 前台问答流程

默认不使用终端交互式 `pingcode context init` 命令，而是通过以下 Agent 前台问答流程，让用户在对话中选择，Agent 使用非交互式 CLI 命令写入配置。

1. 对一个选择组执行 list 命令
2. 在对话中以编号列表展示结果（包含显示名、用户名/邮箱/identifier 及 ID）
3. 要求用户回复一个编号、ID 或精确名称
4. 将回复解析为对应选项
5. 执行对应的 `context set-current-*` 命令
6. 继续下一个选择组

一次只问一个选择问题。不要要求用户粘贴凭证或令牌。

## 命令

```bash
# 以 JSON 输出当前工作区偏好和缓存字典数量
pingcode context list

# 设置当前项目
pingcode context set-current-project PROJECT_ID_OR_NAME

# 为已缓存的当前项目设置当前迭代
pingcode context set-current-sprint SPRINT_ID_OR_NAME

# 设置当前用户
pingcode context set-current-user USER_ID_OR_NAME

# 交互式初始化所有三项偏好
pingcode context init
```

如果工作区缓存为空，先运行 `pingcode context init` 填充缓存，再设置单项偏好。

## 完成确认

当三项偏好均已缓存后，通过 `pingcode context list` 以 JSON 格式报告已选择的当前项目、迭代和用户。工作项命令即可使用缓存默认值执行日常工作项查询和创建。

## 终端回退

如果用户明确要求终端交互，运行：

```bash
pingcode context init
```

该命令使用 Node.js readline，可能在工具终端而非 Agent 对话前台显示。
