---
title: "REST API"
source: "https://open.pingcode.com/#api-URI%E7%BB%93%E6%9E%84"
author:
published:
created: 2026-07-15
description: "欢迎使用PingCode Representational State Transfer APIs （简称PingCode REST API）。 PingCode REST API用于通过HTTP与PingCode服务端进行远程交互，例如创建、修改、查询、删除PingCode的资源。"
tags:
  - "clippings"
---
概述

欢迎使用

欢迎使用 PingCode Representational State Transfer APIs （简称PingCode REST API）。 PingCode REST API 基于 HTTP 协议实现与 PingCode 服务端的远程数据交互，支持对平台各类资源进行创建、修改、查询、删除等常规业务操作。

URI结构

PingCode REST API 遵循 REST 规范，采用层级化、标准化的 URI 路径定位业务资源。路径中通过 {参数名} 标记动态路径参数，接口调用时需替换为实际业务数值。 所有接口统一遵循以下通用路径格式：

```
https://{rest_api_root}/v1[/{area}]/{resource}[/{action}]
```

路径参数说明：

```
- rest_api_root：API 根路径
  - 公有云环境：open.pingcode.com
  - 私有部署环境：{自定义域名}/open
  - 其他环境：{在上下文中提供的地址}
- area：资源所属子区域（可空）
- resource：资源路径
- action：特殊操作（可空）
```

接口路径示例：

```
https://open.pingcode.com/v1/myself
https://open.pingcode.com/v1/ship/products
https://open.pingcode.com/v1/ship/products/6422711c3f12e6c1e46d40e9/plans
https://open.pingcode.com/v1/release/environments
https://open.pingcode.com/v1/testhub/cases/bulk
```

另外，在下文中提到的其他路径参数：

```
- oauth2_root：OAuth2 授权页面根路径
  - 公有云环境：open.pingcode.com/oauth2
  - 私有部署环境：{自定义域名}/oauth2
  - 其他环境：{在上下文中提供的地址}
```

PingCode REST API使用 `json` 作为通讯格式，所有时间均使用10位数字组成的时间戳。 PingCode REST API为每一种资源定义两种数据结构，全量结构和引用结构。 全量结构包含资源的所有属性，引用结构只包含必要属性。当获取单个资源或分页获取资源列表时，PingCode REST API将返回全量结构； 当获取其他资源引用当前资源时，PingCode REST API将返回引用结构。

### 全量结构

```
{
     "id": "5e05d8448f8461dada9ba29c",
     "url": "https://{rest_api_root}/v1/{resource}",
     "name": "资源名称",
     "desc": "资源简介",
     "created_at": 1578897962
}
```

### 引用结构

```
{
     "id": "5e05d8448f8461dada9ba29c",
     "url": "https://{rest_api_root}/v1/{resource}",
     "name": "资源名称"
}
```

使用方式

PingCode REST API支持 `OPTIONS` / `GET` / `PUT` / `PATCH` / `POST` / `DELETE` 等标准的HTTP请求。 对于 `GET` / `DELETE` 请求，通过 `querystring` 传递参数；对于 `POST` / `PUT` / `PATCH` 请求，需要在 `headers` 中添加 `"content-type": "application/json"` ，然后通过 `body` 传递参数。 PingCode REST API使用 [HTTP状态码](https://www.iana.org/assignments/http-status-codes/http-status-codes.xhtml) 指示已执行操作的状态； 使用 `response body` 传递数据。

### 单个资源

当创建、更新、获取、删除单个资源成功时，会返回当前操作的资源。

```
HTTP状态码：201
Body：
{
     "id": "5e05d8448f8461dada9ba29c",
     "url": "https://{rest_api_root}/v1/{resource}",
     "name": "资源名称",
     "desc": "资源简介",
     "created_at": 1578897962
}
```

### 分页数据

当请求多条数据时，默认每一页返回30条，最大返回100条。 通过在 `querystring` 中设置 `page_size` 和 `page_index` ，指定每一页的数据量和第几页的数据（ `page_index` 为0时，表示第一页）。 在返回的数据结构中， `page_size` 表示当前每页的数据量， `page_index` 表示当前在第几页， `total` 表示资源总数量， `values` 表示资源的数组。

```
HTTP状态码：200
Body：
{
     "page_size": 30,
     "page_index": 0,
     "total": 100,
     "values": [
         {
             "id": "5e05d8448f8461dada9ba29c",
             "url": "https://{rest_api_root}/v1/{resource}",
             "name": "资源名称",
             "desc": "资源简介",
             "created_at": 1578897962
         },
         ...
     ]
}
```

### 错误

当请求失败时，会返回错误码和错误信息。

```
HTTP状态码：500
Body：
{
     "code": "100000",
     "message": "Internal Server Error"
}
```

频率限制

PingCode REST API限制使用者的请求频率，目的是保障核心服务的可靠且响应迅速。频率限制不用于区分客户和服务级别。

### 具体策略

根据使用者的身份标识，PingCode REST API最多允许每位使用者每分钟请求200次，单位分钟内超出限制数量的HTTP请求将统一返回错误信息。

```
HTTP状态码：429
Headers：
{
     "x-pc-retry-after": 50
}
Body：
{
     "code": "100038",
     "message": "请求频率过高"
}
```

`x-pc-retry-after` 指示使用者在重新请求之前必须等待的秒数。如果使用者在到期之前重新发出请求，则请求会再次失败并返回相同的HTTP状态码和 `response body` 。

### 合理请求

由于频率限制的存在，最小化请求将十分必要，一个显而易见的策略是缓存不会轻易变更的数据。 另外使用PingCode Flow中的 `发送Webhook` 和 `发送HTTP请求` 来将PingCode中发生变更的数据发送给订阅者，也可以有效降低 PingCode REST API的请求数量，从而降低遇到频率限制的风险。

鉴权

客户端凭据

获取企业令牌

客户端凭据模式（ `OAuth2 Client Credentials` ）是最简单、直接的授权方式。通过该方式获取的访问令牌（ `access_token` ）不区分用户身份，在 PingCode 中被称为企业令牌。企业令牌拥有系统管理员权限，主要用于访问、操作全局数据，请谨慎保管。  
获取企业令牌需提供 `client_id` 和 `client_secret` 。您可前往 PingCode 企业后台的凭据管理页面创建应用、配置数据范围，即可获取这两个参数。调用接口时，只需在 HTTP 请求的请求头中添加 `Authorization: Bearer {access_token}` ，就能访问受保护数据。  
注： `access_token` 有效期为 30 天；删除应用或重置应用密钥（ `Secret` ），都会导致当前令牌立即失效。

```html
https://{rest_api_root}/v1/auth/token?grant_type=client_credentials
```

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| grant\_type | String | 授权类型，这里固定为： `client_credentials` 。 |
| client\_id | String | PingCode应用的Client ID |
| client\_secret | String | PingCode应用的Secret |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| access\_token | String | 令牌 |
| token\_type | String | 类型类型 |
| expires\_in | String | 过期时间 |

```json
{
    "access_token": "e7321ca8-f724-4abd-9169-d76d095c6acf",
    "token_type": "Bearer",
    "expires_in": 1577808000
}
```

授权码

请求授权

授权码模式（ `OAuth2 Authorization Code` ）是最常用的授权方式，适用于企业员工管理个人数据。通过该方式获取的访问令牌（ `access_token` ）在 PingCode 中被称为用户令牌，该令牌归属指定用户，仅可访问对应用户权限范围内的数据。  
开发者可通过引导用户手动授权的方式获取用户令牌，使用该模式需提前准备 `client_id` 和 `redirect_uri` 两个核心参数。开发者可登录 PingCode 企业后台，在凭据管理模块创建应用、配置对应数据权限范围，同时获取应用唯一标识 `client_id` 以及授权回调地址 `redirect_uri` 。完成配置后，需在第三方应用的页面引导用户通过浏览器访问 PingCode 授权页面，由用户自主完成授权确认操作；授权成功后，页面将自动跳转至预设的 `redirect_uri` 回调地址，同时在 URL 参数中返回临时授权码 `code` 。开发者可凭借已获取的 `client_id` 和临时 `code` 兑换正式的用户令牌，后续调用接口、访问受保护资源时，只需在 HTTP 请求头部配置 `Authorization: Bearer {access_token}` 格式参数，即可完成权限校验与数据访问。  
用户访问授权页面前需已登录 PingCode。  
授权页面地址： `https://{oauth2_root}/authorize` 。

```html
https://{oauth2_root}/authorize?response_type=code
```

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| response\_type | String | 响应类型，这里固定为code类型。 |
| client\_id | String | PingCode应用的Client ID |

获取用户令牌

用于获取用户令牌。  
注： `access_token` 有效期为 30 天；删除应用或重置应用密钥（ `Secret` ），都会导致当前令牌立即失效。

```html
https://{rest_api_root}/v1/auth/token?grant_type=authorization_code
```

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| grant\_type | String | 授权类型，这里固定为： `authorization_code` 。 |
| client\_id | String | PingCode应用的Client ID |
| client\_secret | String | PingCode应用的Secret |
| code | String | 用户授权后，在回调地址中拿到的 `code` 值。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| access\_token | String | 令牌 |
| refresh\_token | String | 刷新令牌 |
| token\_type | String | 类型类型 |
| expires\_in | String | 过期时间 |

```json
{
    "access_token": "e7321ca8-f724-4abd-9169-d76d095c6acf",
    "refresh_token": "f724-4abd-9169-e7321ca8-d76d095c6acf",
    "token_type": "Bearer",
    "expires_in": 1577808000
}
```

刷新用户令牌

开发者可通过 `refresh_token` 刷新获取全新的 `access_token` ，从而避免用户频繁重复授权的问题。PingCode 中 `refresh_token` 的默认有效期为90天；删除应用或重置应用密钥（ `Secret` ），都会导致当前令牌立即失效。

```html
https://{rest_api_root}/v1/auth/token?grant_type=refresh_token
```

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| grant\_type | String | 授权类型，这里固定为： `refresh_token` 。 |
| refresh\_token | String | 通过 `authorization_code` 获取 `access_token` 时，一起返回的 `refresh_token` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| access\_token | String | 令牌 |
| refresh\_token | String | 刷新令牌 |
| token\_type | String | 类型类型 |
| expires\_in | String | 过期时间 |

```json
{
    "access_token": "e7321ca8-f724-4abd-9169-d76d095c6acf",
    "refresh_token": "f724-4abd-9169-e7321ca8-d76d095c6acf",
    "token_type": "Bearer",
    "expires_in": 1577808000
}
```

全局

个人

获取个人信息

用于查看个人信息。

```html
https://{rest_api_root}/v1/myself
```

令牌: 用户令牌

Scopes: pcp:read:account:personal

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 个人的id。 |
| url | String | 个人的地址。 |
| name | String | 个人的名称。 |
| display\_name | String | 个人的显示名。 |
| avatar | String | 个人的头像。 |
| email | String | 个人的邮箱。 |
| mobile | String | 个人的手机号。 |
| status | String | 个人的状态。 |
| preferences | Object | 个人的偏好设置。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
    "name": "john",
    "display_name": "John",
    "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png",
    "email": "terry@pingcode.com",
    "mobile": "15000000000",
    "status": "enabled",
    "preferences": {
        "locale": "zh-cn",
        "timezone": "Asia/Shanghai"
    }
}
```

组织

企业

获取企业信息

用于查看企业信息。

```html
https://{rest_api_root}/v1/directory/team
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 企业的id。 |
| url | String | 企业的地址。 |
| name | String | 企业的名称。 |
| secondary\_domain | String | 企业的二级域名。 |

```json
{
    "id": "56ba35de87ad7153c2062f65",
    "url": "https://{rest_api_root}/v1/directory/team",
    "name": "YCtech",
    "secondary_domain": "yctech"
}
```

企业成员

创建一个企业成员

用于创建一个企业成员。

```html
https://{rest_api_root}/v1/directory/users
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 企业成员的名称，在一个企业中这个名称是唯一的。 |
| display\_name | String | 企业成员的显示名。 |
| email 可选 | String | 企业成员的邮箱地址，在一个企业中这个邮箱地址是唯一的，邮箱地址和手机号其中一个必填。 |
| mobile 可选 | String | 企业成员的手机号，在一个企业中这个手机号是唯一，邮箱地址和手机号其中一个必填。 |
| password 可选 | String | 企业成员的密码，长度为6～200的字符串(包含6和200)。 |
| department\_id 可选 | String | 企业成员的部门id。 |
| job\_id 可选 | String | 企业成员的职位id。 |
| employee\_number 可选 | String | 企业成员的工号。 |

```json
{
    "name": "john",
    "display_name": "John",
    "email": "john@email.com",
    "mobile": "15000000000",
    "password": "123456",
    "department_id": "6422711c3f12e6c1e46d40e6",
    "job_id": "6440c881c56f557eb1aff6e5",
    "employee_number": "zxv"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 企业成员的id。 |
| url | String | 企业成员的资源地址。 |
| name | String | 企业成员的名称。 |
| display\_name | String | 企业成员的显示名。 |
| avatar | String | 企业成员的头像地址。 |
| department | Object | 企业成员的部门。 |
| job | Object | 企业成员的职位。 |
| email | String | 企业成员的邮箱地址。 |
| mobile | String | 企业成员的手机号。 |
| status | String | 企业成员的状态。  允许值: `enabled`, `disabled`, `init` |
| employee\_number | String | 企业成员的工号。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
    "name": "john",
    "display_name": "John",
    "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png",
    "department": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
        "name": "技术支持"
    },
    "job": {
        "id": "6440c881c56f557eb1aff6e5",
        "url": "https://{rest_api_root}/v1/directory/jobs/6440c881c56f557eb1aff6e5",
        "name": "后端工程师"
    },
    "email": "john@email.com",
    "mobile": "15000000000",
    "status": "init",
    "employee_number": "zxv"
}
```

获取一个企业成员

用于查看一个企业成员。

```html
https://{rest_api_root}/v1/directory/users/{user_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| user\_id | String | 企业成员的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 企业成员的id。 |
| url | String | 企业成员的资源地址。 |
| name | String | 企业成员的名称。 |
| display\_name | String | 企业成员的显示名。 |
| avatar | String | 企业成员的头像地址。 |
| department | Object | 企业成员的部门。 |
| job | Object | 企业成员的职位。 |
| email | String | 企业成员的邮箱地址。 |
| mobile | String | 企业成员的手机号。 |
| status | String | 企业成员的状态。  允许值: `enabled`, `disabled`, `init` |
| employee\_number | String | 企业成员的工号。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
    "name": "john",
    "display_name": "John",
    "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png",
    "department": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
        "name": "技术支持"
    },
    "job": {
        "id": "6440c881c56f557eb1aff6e5",
        "url": "https://{rest_api_root}/v1/directory/jobs/6440c881c56f557eb1aff6e5",
        "name": "后端工程师"
    },
    "email": "john@email.com",
    "mobile": "15000000000",
    "status": "enabled",
    "employee_number": "zxv"
}
```

部分更新一个企业成员

用于部分更新一个企业成员。

```html
https://{rest_api_root}/v1/directory/users/{user_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| user\_id | String | 企业成员的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 企业成员的名称，在一个企业中这个名称是唯一的。 |
| display\_name 可选 | String | 企业成员的显示名。 |
| email 可选 | String | 企业成员的邮箱地址，在一个企业中这个邮箱地址是唯一的。 |
| mobile 可选 | String | 企业成员的手机号，在一个企业中这个手机号是唯一的。 |
| status 可选 | String | 企业成员的状态。  允许值: `enabled`, `disabled` |
| employee\_number 可选 | String | 企业成员的工号。 |
| department\_id 可选 | String | 企业成员的部门id。 |
| job\_id 可选 | String | 企业成员的职位id。 |

```json
{
    "name": "john",
    "display_name": "John",
    "email": "john@email.com",
    "mobile": "15000000000",
    "status": "enabled",
    "employee_number": "zxv",
    "department_id": "6422711c3f12e6c1e46d40e6",
    "job_id": "6440c881c56f557eb1aff6e5"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 企业成员的id。 |
| url | String | 企业成员的资源地址。 |
| name | String | 企业成员的名称。 |
| display\_name | String | 企业成员的显示名。 |
| avatar | String | 企业成员的头像地址。 |
| department | Object | 企业成员的部门。 |
| job | Object | 企业成员的职位。 |
| email | String | 企业成员的邮箱地址。 |
| mobile | String | 企业成员的手机号。 |
| status | String | 企业成员的状态。  允许值: `enabled`, `disabled`, `init` |
| employee\_number | String | 企业成员的工号。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
    "name": "john",
    "display_name": "John",
    "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png",
    "department": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
        "name": "技术支持"
    },
    "job": {
        "id": "6440c881c56f557eb1aff6e5",
        "url": "https://{rest_api_root}/v1/directory/jobs/6440c881c56f557eb1aff6e5",
        "name": "后端工程师"
    },
    "email": "john@email.com",
    "mobile": "15000000000",
    "status": "enabled",
    "employee_number": "zxv"
}
```

批量更新企业成员属性

用于批量更新企业成员属性。

```html
https://{rest_api_root}/v1/directory/users/bulk
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| user\_ids | String\[\] | 企业成员的id数组，不能包含自己和团队拥有者。 |
| property\_name | String | 需要更新的企业成员属性名，目前仅支持：status（可选值为：enabled、disabled） |
| property\_value | String | 需要更新的企业成员属性值。 |

```json
{
    "user_ids": [
        "a0417f68e846aae315c85d24643678a9",
        "a0417f68e846aae315c85d24643678a8"
    ],
    "property_name": "status",
    "property_value": "enabled"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 操作状态。  允许值: `success`, `failure` |
| user\_id | String | 企业成员的id。 |
| message 可选 | String | 操作失败时的错误信息。 |

```json
[
    {
        "state": "success",
        "user_id": "a0417f68e846aae315c85d24643678a9"
    },
    {
        "state": "failure",
        "user_id": "a0417f68e846aae315c85d24643678a8",
        "message": "failure reason.."
    }
]
```

获取企业成员列表

用于查询企业成员列表。

```html
https://{rest_api_root}/v1/directory/users
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 企业成员的名称，在一个企业中这个名称是唯一的。 |
| keywords 可选 | String | 关键词模糊搜索，支持姓名、用户名。 |
| emails 可选 | String | 企业成员的邮箱地址，使用','分割，最多只能20个。 |
| mobiles 可选 | String | 企业成员的手机号，使用','分割，最多只能20个。 |
| department\_ids 可选 | String | 企业成员的部门id，使用','分割，最多只能20个。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 企业成员全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
            "name": "john",
            "display_name": "John",
            "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png",
            "department": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
                "name": "技术支持"
            },
            "job": {
                "id": "6440c881c56f557eb1aff6e5",
                "url": "https://{rest_api_root}/v1/directory/jobs/6440c881c56f557eb1aff6e5",
                "name": "后端工程师"
            },
            "email": "john@email.com",
            "mobile": "15000000000",
            "status": "enabled",
            "employee_number": "zxv"
        }
    ]
}
```

部门

创建一个部门

用于创建一个部门。

```html
https://{rest_api_root}/v1/directory/departments
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 部门的名称，在一个企业中这个名称是唯一的。 |
| parent\_id 可选 | String | 父部门的id。 |
| head\_id 可选 | String | 部门负责人的id。 |

```json
{
    "name": "技术支持",
    "parent_id": "6422711c3f12e6c1e46d40e2",
    "head_id": "70e9933e5e7948779b9b8978b6489038"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部门的id。 |
| url | String | 部门的资源地址。 |
| name | String | 部门的名称。 |
| head | Object | 部门的负责人。 |
| parent | Object | 父部门。 |

```json
{
    "id": "6422711c3f12e6c1e46d40e6",
    "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
    "name": "技术支持",
    "head": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "parent": {
        "id": "6422711c3f12e6c1e46d40e2",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e2",
        "name": "技术中心"
    }
}
```

获取一个部门

用于查看一个部门。

```html
https://{rest_api_root}/v1/directory/departments/{department_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| department\_id | String | 部门的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部门的id。 |
| url | String | 部门的资源地址。 |
| name | String | 部门的名称。 |
| head | Object | 部门的负责人。 |
| parent | Object | 父部门。 |

```json
{
    "id": "6422711c3f12e6c1e46d40e6",
    "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
    "name": "技术支持",
    "head": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "parent": {
        "id": "6422711c3f12e6c1e46d40e2",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e2",
        "name": "技术中心"
    }
}
```

部分更新一个部门

用于部分更新一个部门。

```html
https://{rest_api_root}/v1/directory/departments/{department_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| department\_id | String | 部门的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 部门的名称，在一个企业中这个名称是唯一的。 |
| parent\_id 可选 | String | 父部门的id。 |
| head\_id 可选 | String | 部门负责人的id。 |

```json
{
    "name": "技术支持",
    "parent_id": "6422711c3f12e6c1e46d40e2",
    "head_id": "70e9933e5e7948779b9b8978b6489038"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部门的id。 |
| url | String | 部门的资源地址。 |
| name | String | 部门的名称。 |
| head | Object | 部门的负责人。 |
| parent | Object | 父部门。 |

```json
{
    "id": "6422711c3f12e6c1e46d40e6",
    "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
    "name": "技术支持",
    "head": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "parent": {
        "id": "6422711c3f12e6c1e46d40e2",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e2",
        "name": "技术中心"
    }
}
```

获取部门列表

用于查询部门列表。

```html
https://{rest_api_root}/v1/directory/departments
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 部门全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40e6",
            "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
            "name": "技术支持",
            "head": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "parent": {
                "id": "6422711c3f12e6c1e46d40e2",
                "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e2",
                "name": "技术中心"
            }
        }
    ]
}
```

删除一个部门

用于删除一个部门。

```html
https://{rest_api_root}/v1/directory/departments/{department_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| department\_id | String | 部门的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部门的id。 |
| url | String | 部门的资源地址。 |
| name | String | 部门的名称。 |
| head | Object | 部门的负责人。 |
| parent | Object | 父部门。 |

```json
{
    "id": "6422711c3f12e6c1e46d40e6",
    "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e6",
    "name": "技术支持",
    "head": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "parent": {
        "id": "6422711c3f12e6c1e46d40e2",
        "url": "https://{rest_api_root}/v1/directory/departments/6422711c3f12e6c1e46d40e2",
        "name": "技术中心"
    }
}
```

团队

创建一个团队

用于创建一个团队。

```html
https://{rest_api_root}/v1/directory/groups
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 团队的名称，在一个企业中这个名称是唯一的。 |
| visibility 可选 | String | 团队的可见范围。  默认值: `private`  允许值: `private`, `public` |
| description 可选 | String | 团队的描述。 |

```json
{
    "name": "Open Team",
    "visibility": "private",
    "description": "This is Open Team."
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 团队的id。 |
| url | String | 团队的资源地址。 |
| name | String | 团队的名称。 |
| visibility | String | 团队的可见性。  允许值: `private`, `public` |
| description | String | 团队的描述。 |

```json
{
    "id": "63c8fb32729dee3334d96af7",
    "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
    "name": "Open Team",
    "visibility": "private",
    "description": "This is Open Team."
}
```

获取一个团队

用于查看一个团队。

```html
https://{rest_api_root}/v1/directory/groups/{group_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| group\_id | String | 团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 团队的id。 |
| url | String | 团队的资源地址。 |
| name | String | 团队的名称。 |
| visibility | String | 团队的可见性。  允许值: `private`, `public` |
| description | String | 团队的描述。 |

```json
{
    "id": "63c8fb32729dee3334d96af7",
    "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
    "name": "Open Team",
    "visibility": "private",
    "description": "This is Open Team."
}
```

部分更新一个团队

用于部分更新一个团队。

```html
https://{rest_api_root}/v1/directory/groups/{group_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| group\_id | String | 团队id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 团队的名称，在一个企业中这个名称是唯一的。 |
| visibility 可选 | String | 团队的可见范围。  允许值: `private`, `public` |
| description 可选 | String | 团队的描述。 |

```json
{
    "name": "Open Team Update",
    "visibility": "public",
    "description": "This is Update Open Team."
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 团队的id。 |
| url | String | 团队的资源地址。 |
| name | String | 团队的名称。 |
| visibility | String | 团队的可见性。  允许值: `private`, `public` |
| description | String | 团队的描述。 |

```json
{
    "id": "63c8fb32729dee3334d96af7",
    "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
    "name": "Open Team Update",
    "visibility": "public",
    "description": "This is Update Open Team."
}
```

获取团队列表

用于查询团队列表。

```html
https://{rest_api_root}/v1/directory/groups
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 团队全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
            "name": "Open Team",
            "visibility": "private",
            "description": "This is Open Team."
        },
        {
            "id": "64ca0f67cb78a0a80e1a999e",
            "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e",
            "name": "PingCode",
            "visibility": "public",
            "description": "This is PingCode."
        }
    ]
}
```

向团队中添加一个成员

用于向团队中添加一个成员。

```html
https://{rest_api_root}/v1/directory/groups/{group_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| group\_id | String | 团队id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| user\_id | String | 用户id。 |
| role | String | 团队角色。  允许值: `manager`, `member` |

```json
{
    "user_id": "a0417f68e846aae315c85d24643678a9",
    "role": "manager"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 团队成员的id。 |
| url | String | 团队成员的资源地址。 |
| group | Object | 所属团队的引用结构数据。 |
| user | Object | 成员的引用结构数据。 |
| role | String | 成员在团队中的角色。  允许值: `manager`, `member` |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members/a0417f68e846aae315c85d24643678a9",
    "group": {
        "id": "64ca0f67cb78a0a80e1a999e",
        "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e",
        "name": "PingCode"
    },
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": "manager"
}
```

获取团队中的成员列表

用于查询团队中的成员列表。

```html
https://{rest_api_root}/v1/directory/groups/{group_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| group\_id | String | 团队id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 团队中的成员全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members/a0417f68e846aae315c85d24643678a9",
            "group": {
                "id": "64ca0f67cb78a0a80e1a999e",
                "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e",
                "name": "PingCode"
            },
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "role": "manager"
        }
    ]
}
```

获取团队中的一个成员

用于查询团队中的一个成员。

```html
https://{rest_api_root}/v1/directory/groups/{group_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| group\_id | String | 团队的id。 |
| member\_id | String | 团队成员的id，即用户的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 团队成员的id。 |
| url | String | 团队成员的资源地址。 |
| group | Object | 所属团队的引用结构数据。 |
| user | Object | 成员的引用结构数据。 |
| role | String | 成员在团队中的角色。  允许值: `manager`, `member` |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members/a0417f68e846aae315c85d24643678a9",
    "group": {
        "id": "64ca0f67cb78a0a80e1a999e",
        "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e",
        "name": "PingCode"
    },
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": "manager"
}
```

在团队中移除一个成员

用于在团队中移除一个成员。

```html
https://{rest_api_root}/v1/directory/groups/{group_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| group\_id | String | 团队id。 |
| member\_id | String | 团队成员的id，即用户的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 团队成员的id。 |
| url | String | 团队成员的资源地址。 |
| group | Object | 所属团队的引用结构数据。 |
| user | Object | 成员的引用结构数据。 |
| role | String | 成员在团队中的角色。  允许值: `manager`, `member` |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e/members/a0417f68e846aae315c85d24643678a9",
    "group": {
        "id": "64ca0f67cb78a0a80e1a999e",
        "url": "https://{rest_api_root}/v1/directory/groups/64ca0f67cb78a0a80e1a999e",
        "name": "PingCode"
    },
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": "manager"
}
```

角色

获取一个角色

用于查看一个角色。

```html
https://{rest_api_root}/v1/directory/roles/{role_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| role\_id | String | 角色的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 角色的id。 |
| url | String | 角色的资源地址。 |
| name | String | 角色的名称。 |
| is\_system | Number | 角色是否为系统内置。  允许值: `0`, `1` |

```json
{
    "id": "6422711c3f12e6c1e46d40e6",
    "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
    "name": "管理员",
    "is_system": 1
}
```

获取角色列表

用于查询角色列表。

```html
https://{rest_api_root}/v1/directory/roles
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 角色全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40e6",
            "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
            "name": "管理员",
            "is_system": 1
        }
    ]
}
```

职位

获取一个职位

用于查看一个职位。

```html
https://{rest_api_root}/v1/directory/jobs/{job_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| job\_id | String | 职位的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 职位的id。 |
| url | String | 职位的资源地址。 |
| name | String | 职位的名称。 |
| is\_system | Number | 职位是否为系统内置。  允许值: `0`, `1` |

```json
{
    "id": "6422711c3f12e6c1e46d40e6",
    "url": "https://{rest_api_root}/v1/directory/jobs/6422711c3f12e6c1e46d40e6",
    "name": "技术总监",
    "is_system": 1
}
```

获取职位列表

用于查询职位列表。

```html
https://{rest_api_root}/v1/directory/jobs
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:team

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 职位全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40e6",
            "url": "https://{rest_api_root}/v1/directory/jobs/6422711c3f12e6c1e46d40e6",
            "name": "技术总监",
            "is_system": 1
        }
    ]
}
```

安全

日志

获取登录日志列表

用于查询登录日志列表。

```html
https://{rest_api_root}/v1/security/login_logs
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:security

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| logged\_between | String | 登录时间介于的时间范围，通过','分割起始时间。 |
| user\_ids 可选 | String | 成员id的列表，使用','分割，最多只能20个。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 登录日志的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5fca7b74efab845a2fa53181",
            "url": "https://{rest_api_root}/v1/security/login_logs/5fca7b74efab845a2fa53181",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "login_method": "账号密码",
            "region": "北京海淀区",
            "ip": "45.251.20.42",
            "user_agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "created_at": 1676454024
        }
    ]
}
```

获取审计日志列表

用于查询审计日志列表。

```html
https://{rest_api_root}/v1/security/audit_logs
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:security

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| operated\_between | String | 操作时间介于的时间范围，通过','分割起始时间。 |
| operated\_bys 可选 | String | 操作人的列表，使用','分割，最多只能20个。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 审计日志的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5fca7b74efab845a2fa53181",
            "url": "https://{rest_api_root}/v1/security/audit_logs/5fca7b74efab845a2fa53181",
            "operated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "operated_at": 1676454024,
            "operate_object": "规则",
            "application": "自动化",
            "ip": "45.251.20.42",
            "summary": "修改规则",
            "detail": "规则：规则1\n类型：自动化规则\n描述：-"
        }
    ]
}
```

工时

创建一个工时

用于创建一个工时。

```html
https://{rest_api_root}/v1/workloads
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:workload

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 工时主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;  允许值: `work_item`, `idea`, `test_case` |
| principal\_id | String | 工时主体的id。 |
| type\_id 可选 | String | 工时类型的id。 |
| duration | Number | 工时的时长。单位是小时，数值可以是为0-24之间，最多包含一位小数的正数。 |
| report\_at | Number | 工时的登记日期。该值为十位数字组成的时间戳，会被转换为该时间当天的零点零分零秒。 |
| report\_by\_id 可选 | String | 工时的登记人，企业鉴权时必填。个人鉴权时不需要传递，即使传递了也会被忽略。 |
| recorded\_at 可选 | String | 工时的登记时间，默认是当前时间。 |
| description 可选 | String | 工时的说明。 |

```json
{
    "principal_id": "5edca524cad2fa1125cb0630",
    "principal_type": "work_item",
    "type_id": "5a86eaf6a72585327ea46fge0",
    "duration": 8,
    "report_at": 1593290347,
    "report_by_id": "a0417f68e846aae315c85d24643678a9",
    "recorded_at": 1593290347,
    "description": "这是一个工时"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工时的id。 |
| url | String | 工时的资源地址。 |
| principal\_type | String | 工时主体的类型。  允许值: `work_item`, `idea`, `test_case` |
| principal | Object | 工时的主体。 |
| type | Object | 工时的类型。 |
| duration | Number | 工时的时长。单位是小时，数值可以是为0-24之间，最多包含一位小数的正数。 |
| review\_state | String | 工时的评审状态。  允许值: `no_review`, `pending`, `in_progress`, `approved`, `rejected`, `terminated` |
| description | String | 工时的说明。 |
| report\_at | Number | 工时的登记日期。该值为十位数字组成的时间戳，会被转换为该时间当天的零点零分零秒。 |
| report\_by | Object | 工时的登记人。 |
| created\_at | Number | 工时的创建日期。该值为十位数字组成的时间戳。 |
| created\_by | Object | 工时的创建人。 |

```json
{
    "id": "5f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/workloads/5f168f764eba01a5278b87cd",
    "principal_type": "work_item",
    "principal": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "type": {
        "id": "5a86eaf6a72585327ea46fge0",
        "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
        "name": "研发"
    },
    "duration": 8,
    "review_state": "approved",
    "description": "这是一个工时",
    "report_at": 1593290347,
    "report_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取一个工时

用于查看一个工时。

```html
https://{rest_api_root}/v1/workloads/{workload_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:workload

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| workload\_id | String | 工时的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工时的id。 |
| url | String | 工时的资源地址。 |
| principal\_type | String | 工时主体的类型。  允许值: `work_item`, `idea`, `test_case` |
| principal | Object | 工时的主体。 |
| type | Object | 工时的类型。 |
| duration | Number | 工时的时长。单位是小时，数值可以是为0-24之间，最多包含一位小数的正数。 |
| review\_state | String | 工时的评审状态。  允许值: `no_review`, `pending`, `in_progress`, `approved`, `rejected`, `terminated` |
| description | String | 工时的说明。 |
| report\_at | Number | 工时的登记日期。该值为十位数字组成的时间戳，会被转换为该时间当天的零点零分零秒。 |
| report\_by | Object | 工时的登记人。 |
| created\_at | Number | 工时的创建日期。该值为十位数字组成的时间戳。 |
| created\_by | Object | 工时的创建人。 |

```json
{
    "id": "5f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/workloads/5f168f764eba01a5278b87cd",
    "principal_type": "work_item",
    "principal": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "type": {
        "id": "5a86eaf6a72585327ea46fge0",
        "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
        "name": "研发"
    },
    "duration": 8,
    "review_state": "approved",
    "description": "这是一个工时",
    "report_at": 1593290347,
    "report_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

部分更新一个工时

用于部分更新一个工时。  
用户令牌只能更新属于用户自己登记的工时记录。

```html
https://{rest_api_root}/v1/workloads/{workload_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:workload

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| workload\_id | String | 工时的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| type\_id 可选 | String | 工时类型的id。 |
| duration 可选 | Number | 工时的时长。单位是小时，数值可以是为0-24之间，最多包含一位小数的正数。 |
| report\_at 可选 | Number | 工时的登记日期。该值为十位数字组成的时间戳，会被转换为该时间当天的零点零分零秒。 |
| description 可选 | String | 工时的说明。 |

```json
{
    "type_id": "5a86eaf6a72585327ea46fge0",
    "duration": 8,
    "report_at": 1593290347,
    "description": "这是一个工时"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工时的id。 |
| url | String | 工时的资源地址。 |
| principal\_type | String | 工时主体的类型。  允许值: `work_item`, `idea`, `test_case` |
| principal | Object | 工时的主体。 |
| type | Object | 工时的类型。 |
| duration | Number | 工时的时长。单位是小时，数值可以是为0-24之间，最多包含一位小数的正数。 |
| review\_state | String | 工时的评审状态。  允许值: `no_review`, `pending`, `in_progress`, `approved`, `rejected`, `terminated` |
| description | String | 工时的说明。 |
| report\_at | Number | 工时的登记日期。该值为十位数字组成的时间戳，会被转换为该时间当天的零点零分零秒。 |
| report\_by | Object | 工时的登记人。 |
| created\_at | Number | 工时的创建日期。该值为十位数字组成的时间戳。 |
| created\_by | Object | 工时的创建人。 |

```json
{
    "id": "5f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/workloads/5f168f764eba01a5278b87cd",
    "principal_type": "work_item",
    "principal": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "type": {
        "id": "5a86eaf6a72585327ea46fge0",
        "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
        "name": "研发"
    },
    "duration": 8,
    "review_state": "approved",
    "description": "这是一个工时",
    "report_at": 1593290347,
    "report_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取工时列表

用于查询工时列表。

```html
https://{rest_api_root}/v1/workloads
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:workload

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type 可选 | String | 工时主体的类型。当查询参数含有pilot\_id或principal\_id时，principal\_type参数必填。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   当不传 `principal_type` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`, `pcp:write:ship:idea`, `pcp:write:testhub:testcase` 。  允许值: `idea`, `work_item`, `test_case` |
| pilot\_id 可选 | String | 工时主体所在产品、项目或测试库的id。使用该参数过滤数据时，登记日期查询的起始时间和登记日期查询的结束时间的跨度最大为3个月。 |
| principal\_id 可选 | String | 工时主体的id。 |
| start\_at 可选 | Number | 登记日期查询的起始时间。开始时间会转换为对应日期的开始时间点。开始时间和结束时间须同时存在。 |
| end\_at 可选 | Number | 登记日期查询的结束时间。结束时间会转换为对应日期的结束时间点。 |
| report\_by\_id 可选 | String | 登记人的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工时全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5f168f764eba01a5278b87cd",
            "url": "https://{rest_api_root}/v1/workloads/5f168f764eba01a5278b87cd",
            "principal_type": "work_item",
            "principal": {
                "id": "5edca524cad2fa1125cb0630",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
                "identifier": "SCR-5",
                "title": "这是一个缺陷",
                "type": "bug",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": "5edca524cad2fa1125cb0629",
                "short_id": "c9WqLmTO",
                "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "type": {
                "id": "5a86eaf6a72585327ea46fge0",
                "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
                "name": "研发"
            },
            "duration": 8,
            "review_state": "approved",
            "description": "这是一个工时",
            "report_at": 1593290347,
            "report_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "created_at": 1593290347,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

删除一个工时

用于删除一个工时。  
用户令牌只能删除用户自己登记的工时记录。

```html
https://{rest_api_root}/v1/workloads/{workload_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:global:workload

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| workload\_id | String | 工时的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工时的id。 |
| url | String | 工时的资源地址。 |
| principal\_type | String | 工时主体的类型。  允许值: `work_item`, `idea`, `test_case` |
| principal | Object | 工时的主体。 |
| type | Object | 工时的类型。 |
| duration | Number | 工时的时长。单位是小时，数值可以是为0-24之间，最多包含一位小数的正数。 |
| review\_state | String | 工时的评审状态。  允许值: `no_review`, `pending`, `in_progress`, `approved`, `rejected`, `terminated` |
| description | String | 工时的说明。 |
| report\_at | Number | 工时的登记日期。该值为十位数字组成的时间戳，会被转换为该时间当天的零点零分零秒。 |
| report\_by | Object | 工时的登记人。 |
| created\_at | Number | 工时的创建日期。该值为十位数字组成的时间戳。 |
| created\_by | Object | 工时的创建人。 |

```json
{
    "id": "5f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/workloads/5f168f764eba01a5278b87cd",
    "principal_type": "work_item",
    "principal": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "type": {
        "id": "5a86eaf6a72585327ea46fge0",
        "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
        "name": "研发"
    },
    "duration": 8,
    "review_state": "approved",
    "description": "这是一个工时",
    "report_at": 1593290347,
    "report_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取一个工时类型

用于查看一个工时类型。

```html
https://{rest_api_root}/v1/workload_types/{type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:workload

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| type\_id | String | 工时类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工时类型的id。 |
| url | String | 工时类型的资源地址。 |
| name | String | 工时类型的名称。 |

```json
{
    "id": "5a86eaf6a72585327ea46fge0",
    "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
    "name": "研发"
}
```

获取工时类型列表

用于查询工时类型列表。

```html
https://{rest_api_root}/v1/workload_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:global:workload

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工时类型的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5a86eaf6a72585327ea46fge0",
            "url": "https://{rest_api_root}/v1/workload_types/5a86eaf6a72585327ea46fge0",
            "name": "研发"
        }
    ]
}
```

通用

评论

创建一个评论

用于创建一个评论。

```html
https://{rest_api_root}/v1/comments
```

令牌: 企业令牌/用户令牌

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评论主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:write:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `test_run`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 评论主体的id。 |
| review\_id 可选 | String | 评论评审的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |
| content | String | 评论的内容。 |
| reply\_comment\_id 可选 | String | 被回复评论的id。 |
| created\_at 可选 | Number | 评论的创建时间。 |
| created\_by 可选 | String | 评论的创建人。 |

```json
{
    "principal_type": "work_item",
    "principal_id": "5edca524cad2fa1125cb0630",
    "content": "这是一个工作项评论",
    "created_at": 1565255712,
    "created_by": "a0417f68e846aae315c85d24643678a9"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评论的id。 |
| url | String | 评论的资源地址。 |
| content | String | 评论的内容。 |
| attachment\_count | Number | 评论的附件数量。 |
| attachments | Object\[\] | 评论的附件列表。 |
| is\_reply\_comment | Number | 是否是回复评论。  允许值: `0`, `1` |
| replied\_comment | Object | 被回复的评论。 |
| created\_at | Number | 评论的创建时间。 |
| created\_by | Object | 评论的创建人。 |
| is\_deleted | Number | 评论是否被删除。  允许值: `0`, `1` |

```json
{
    "id": "59f72dfaeadb5b5197b7da6d",
    "url": "https://{rest_api_root}/v1/comments/59f72dfaeadb5b5197b7da6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
    "content": "这是一个工作项评论",
    "attachment_count": 0,
    "attachments": [],
    "is_reply_comment": 0,
    "replied_comment": null,
    "created_at": 1565255712,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_deleted": 0
}
```

获取一个评论

用于查看一个评论。

```html
https://{rest_api_root}/v1/comments/{comment_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| comment\_id | String | 评论的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评论主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:read:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:read:wiki:page`;  允许值: `work_item`, `test_run`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 评论主体的id。 |
| review\_id 可选 | String | 评论评审的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评论的id。 |
| url | String | 评论的资源地址。 |
| content | String | 评论的内容。被删除的评论content字段会被置空，is\_deleted字段为1。 |
| attachment\_count | Number | 评论的附件数量。 |
| attachments | Object\[\] | 评论的附件列表。 |
| is\_reply\_comment | Number | 是否是回复评论。  允许值: `0`, `1` |
| replied\_comment | Object | 被回复的评论。 |
| created\_at | Number | 评论的创建时间。 |
| created\_by | Object | 评论的创建人。 |
| is\_deleted | Number | 评论是否被删除。  允许值: `0`, `1` |

```json
{
    "id": "59f72dfaeadb5b5197b7da6d",
    "url": "https://{rest_api_root}/v1/comments/59f72dfaeadb5b5197b7da6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
    "content": "这是一个工作项评论",
    "attachment_count": 1,
    "attachments": [
        {
            "id": "5da588ca84c7377a5d327e6d",
            "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630&comment_id=59f72dfaeadb5b5197b7da6d",
            "title": "这是一个代码片段",
            "size": 16,
            "type": "snippet"
        }
    ],
    "is_reply_comment": 0,
    "replied_comment": null,
    "created_at": 1565255712,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_deleted": 0
}
```

获取评论列表

用于查询评论列表。

```html
https://{rest_api_root}/v1/comments?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评论主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:read:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:read:wiki:page`;  允许值: `work_item`, `test_run`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 评论主体的id。 |
| review\_id 可选 | String | 评论评审的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 评论全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "59f72dfaeadb5b5197b7da6d",
            "url": "https://{rest_api_root}/v1/comments/59f72dfaeadb5b5197b7da6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
            "content": "这是一个工作项评论",
            "attachment_count": 0,
            "attachments": [],
            "is_reply_comment": 0,
            "replied_comment": null,
            "created_at": 1565255712,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_deleted": 0
        },
        {
            "id": "50f72dfaeadb5b5197b7da6e",
            "url": "https://{rest_api_root}/v1/comments/59f72dfaeadb5b5197b7da6d?principal_type=work_item&principal_id=50f72dfaeadb5b5197b7da6e",
            "content": "这是一个工作项评论回复",
            "attachment_count": 0,
            "attachments": [],
            "is_reply_comment": 1,
            "replied_comment": {
                "id": "59f72dfaeadb5b5197b7da6d",
                "url": "https://{rest_api_root}/v1/comments/59f72dfaeadb5b5197b7da6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
                "content": "这是一个工作项评论",
                "is_deleted": 0
            },
            "created_at": 1565255712,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_deleted": 0
        }
    ]
}
```

删除一个评论

用于删除一个评论。

```html
https://{rest_api_root}/v1/comments/{comment_id}?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| comment\_id | String | 评论的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评论主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:write:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `test_run`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 评论主体的id。 |
| review\_id 可选 | String | 评论评审的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评论的id。 |
| url | String | 评论的资源地址。 |
| content | String | 评论的内容。被删除后为空字符串。 |
| attachment\_count | Number | 评论的附件数量。 |
| attachments | Object\[\] | 评论的附件列表。 |
| is\_reply\_comment | Number | 是否是回复评论。  允许值: `0`, `1` |
| replied\_comment | Object | 被回复的评论。 |
| created\_at | Number | 评论的创建时间。 |
| created\_by | Object | 评论的创建人。 |
| is\_deleted | Number | 评论是否被删除。  允许值: `0`, `1` |

```json
{
    "id": "59f72dfaeadb5b5197b7da6d",
    "url": "https://{rest_api_root}/v1/comments/59f72dfaeadb5b5197b7da6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
    "content": "",
    "attachment_count": 0,
    "attachments": [],
    "is_reply_comment": 0,
    "replied_comment": null,
    "created_at": 1565255712,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_deleted": 1
}
```

附件

上传一个文件

用于上传一个文件。

```html
https://{rest_api_root}/v1/attachments?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

Header

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| content-type | String | `multipart/form-data` 。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 附件主体的类型。   在 `principal_type` 为 `work_item`, `work_item_deliverable` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:write:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `work_item_deliverable`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| principal\_id | String | 附件主体的id。 |
| comment\_id 可选 | String | 附件主体的评论id。当需要向附件主体的评论上传文件或者代码段时，需要传入该参数。 |

请求参数 form-data

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title | String | 这是一个图片类型的附件.png |
| file | File | /Users/ping-code/这是一个图片类型的附件.png |

```json
{
    "id": "5da588ca84c7377a5d327e6c",
    "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6c?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
    "title": "这是一个图片类型的附件",
    "size": 1024,
    "type": "file",
    "file_type": "image",
    "ext": "png",
    "download_url": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a.png",
    "created_at": 1583290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

上传一个代码段

用于上传一个代码段。

```html
https://{rest_api_root}/v1/attachments
```

令牌: 企业令牌/用户令牌

Header

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| content-type | String | `application/json` 。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 附件主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:write:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| principal\_id | String | 附件主体的id。 |
| comment\_id 可选 | String | 附件主体的评论id。当需要向附件主体的评论上传文件或者代码段时，需要传入该参数。 |
| title | String | 代码段的标题。 |
| format | String | 代码段的语言。  允许值: `clike`, `css`, `dart`, `django`, `dockerfile`, `go`, `markdown`, `nginx`, `python`, `php`, `shell`, `sql`, `swift`, `html`, `javascript`, `jsx`, `pascal`, `sass`, `stylus`, `vue`, `yaml`, `haskell` |
| content | String | 代码段的内容。 |

```json
{
    "principal_type": "work_item",
    "principal_id": "5edca524cad2fa1125cb0630",
    "comment_id": "59f72dfaeadb5b5197b7da6d",
    "title": "这是一个代码片段",
    "format": "javascript",
    "content": "const a = 'abc';"
}
```

```json
{
    "id": "5da588ca84c7377a5d327e6d",
    "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630&comment_id=59f72dfaeadb5b5197b7da6d",
    "title": "这是一个代码片段",
    "size": 16,
    "type": "snippet",
    "format": "javascript",
    "content": "const a = 'abc';",
    "line": 1,
    "created_at": 1583290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取一个附件

用于查看一个附件。

```html
https://{rest_api_root}/v1/attachments/{attachment_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| attachment\_id | String | 附件的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 附件主体的类型。   在 `principal_type` 为 `work_item`, `work_item_deliverable` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:read:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:read:wiki:page`;  允许值: `work_item`, `work_item_deliverable`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| principal\_id | String | 附件主体的id。 |
| comment\_id 可选 | String | 附件主体的评论id。当需要获取评论附件时，需要传入该参数。 |
| review\_id 可选 | String | 附件主体的评审id。当需要获取评审附件时，需要传入该参数。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 附件的id。 |
| url | String | 附件的资源地址。 |
| title | String | 附件的标题。 |
| size | Number | 附件的大小。 |
| type | String | 附件的类型。  允许值: `file`, `snippet` |
| file\_type 可选 | String | 文件的类型。当附件的类型为 `file` 时返回。  允许值: `image`, `other` |
| ext 可选 | String | 文件的扩展名。当附件的类型为 `file` 时返回。 |
| download\_url 可选 | String | 文件的下载地址。当附件的类型为 `file` 时返回。 |
| format 可选 | String | 代码的格式。当附件的类型为 `snippet` 时返回。  允许值: `clike`, `css`, `dart`, `django`, `dockerfile`, `go`, `markdown`, `nginx`, `python`, `php`, `shell`, `sql`, `swift`, `html`, `javascript`, `jsx`, `pascal`, `sass`, `stylus`, `vue`, `yaml`, `haskell` |
| content 可选 | String | 代码的内容。当附件的类型为 `snippet` 时返回。 |
| line 可选 | Number | 代码的行数。当附件的类型为 `snippet` 时返回。 |
| created\_at | Number | 附件的创建时间。 |
| created\_by | Object | 附件的创建人。 |

响应示例（文件）：

```json
{
    "id": "5da588ca84c7377a5d327e6c",
    "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6c?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
    "title": "这是一个图片类型的附件",
    "size": 1024,
    "type": "file",
    "file_type": "image",
    "ext": "png",
    "download_url": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a.png",
    "created_at": 1583290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

响应示例（代码段）：

```json
{
    "id": "5da588ca84c7377a5d327e6d",
    "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630&comment_id=59f72dfaeadb5b5197b7da6d",
    "title": "这是一个代码片段",
    "size": 16,
    "type": "snippet",
    "format": "javascript",
    "content": "const a = 'abc';",
    "line": 1,
    "created_at": 1583290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取附件列表

用于查询附件列表。

```html
https://{rest_api_root}/v1/attachments?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 附件主体的类型。   在 `principal_type` 为 `work_item`, `work_item_deliverable` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:read:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:read:wiki:page`;  允许值: `work_item`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| principal\_id | String | 附件主体的id。 |
| comment\_id 可选 | String | 附件主体的评论id。当需要获取评论附件时，需要传入该参数。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 附件全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "5da588ca84c7377a5d327e6d",
            "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6d?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630&comment_id=59f72dfaeadb5b5197b7da6d",
            "title": "这是一个代码片段",
            "size": 16,
            "type": "snippet",
            "format": "javascript",
            "content": "const a = 'abc';",
            "line": 1,
            "created_at": 1583290347,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "5da588ca84c7377a5d327e6f",
            "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6f?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630&comment_id=59f72dfaeadb5b5197b7da6d",
            "title": "这是一个图片类型的附件",
            "size": 1024,
            "type": "file",
            "file_type": "image",
            "ext": "png",
            "download_url": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839b.png",
            "created_at": 1583290347,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

删除一个附件

用于删除一个附件。

```html
https://{rest_api_root}/v1/attachments/{attachment_id}?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| attachment\_id | String | 附件的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 附件主体的类型。   在 `principal_type` 为 `work_item`, `work_item_deliverable` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:write:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `test_case`, `test_run`, `idea`, `ticket`, `page` |
| principal\_id | String | 附件主体的id。 |
| comment\_id 可选 | String | 附件主体的评论id。当需要删除评论附件时，需要传入该参数。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 附件的id。 |
| url | String | 附件的资源地址。 |
| title | String | 附件的标题。 |
| size | Number | 附件的大小。 |
| type | String | 附件的类型。  允许值: `file`, `snippet` |
| file\_type | String | 文件的类型。  允许值: `image`, `other` |
| ext | String | 文件的扩展名。 |
| download\_url | String | 文件的下载地址。 |
| created\_at | Number | 附件的创建时间。 |
| created\_by | Object | 附件的创建人。 |

```json
{
    "id": "5da588ca84c7377a5d327e6c",
    "url": "https://{rest_api_root}/v1/attachments/5da588ca84c7377a5d327e6c?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
    "title": "这是一个图片类型的附件",
    "size": 1024,
    "type": "file",
    "file_type": "image",
    "ext": "png",
    "download_url": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a.png",
    "created_at": 1583290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

关注人

添加一个关注人

用于添加一个关注人。

```html
https://{rest_api_root}/v1/participants
```

令牌: 企业令牌/用户令牌

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 关注人主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 关注人主体的id。 |
| review\_id 可选 | String | 关注人评审主体的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |
| type | String | 关注人的类型。  允许值: `user`, `user_group` |
| participant\_id | String | 关注人的id。用户的id或者团队的id。 |

请求示例（工作项）：

```json
{
    "principal_type": "work_item",
    "principal_id": "63e1bf51760505c8795ebccc",
    "type": "user",
    "participant_id": "a0417f68e846aae315c85d24643678a9"
}
```

请求示例（产品需求评审）：

```json
{
    "principal_type": "idea",
    "review_id": "6f168f764eba01a5278b87cd",
    "type": "user",
    "participant_id": "a0417f68e846aae315c85d24643678a9"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 关注人的id。 |
| url | String | 关注人的资源地址。 |
| type | String | 关注人的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 关注的用户。当 `type` 为 `user` 时返回。 |
| user\_group 可选 | Object | 关注的团队。当 `type` 为 `user_group` 时返回。 |

响应示例（工作项）：

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=63e1bf51760505c8795ebccc",
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

响应示例（产品需求评审）：

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&review_id=6f168f764eba01a5278b87cd",
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取一个关注人

用于查看一个关注人。

```html
https://{rest_api_root}/v1/participants/{participant_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| participant\_id | String | 关注人的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 关注人主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:read:wiki:page`;  允许值: `work_item`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 关注人主体的id。 |
| review\_id 可选 | String | 关注人评审主体的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 关注人的id。 |
| url | String | 关注人的资源地址。 |
| type | String | 关注人的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 关注的用户。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 关注的团队。当 `type` 为 `user_group` 时，该字段返回。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=63e1bf51760505c8795ebccc",
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取关注人列表

用于查询关注人列表。

```html
https://{rest_api_root}/v1/participants?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 关注人主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:read:wiki:page`;  允许值: `work_item`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 关注人主体的id。 |
| review\_id 可选 | String | 关注人评审主体的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 关注人全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=63e1bf51760505c8795ebccc",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=work_item&principal_id=63e1bf51760505c8795ebccc",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ]
}
```

移除一个关注人

用于移除一个关注人。

```html
https://{rest_api_root}/v1/participants/{participant_id}?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| participant\_id | String | 关注人的id。用户的id或者团队的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 关注人主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:testcase`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:write:ship:ticket`;   在 `principal_type` 为 `page` 时，要求 `scopes` 包括 `pcp:write:wiki:page`;  允许值: `work_item`, `test_case`, `idea`, `ticket`, `page` |
| principal\_id 可选 | String | 关注人主体的id。 |
| review\_id 可选 | String | 注人评审主体的id。 `principal_id` 和 `review_id` 至少存在一个，若同时存在，则忽略 `review_id` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 关注人的id。 |
| url | String | 关注人的资源地址。 |
| type | String | 关注人的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 关注的用户。当 `type` 为 `user` 时返回。 |
| user\_group 可选 | Object | 关注的团队。当 `type` 为 `user_group` 时返回。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=63e1bf51760505c8795ebccc",
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

关联

创建一个关联

用于创建一个关联。

```html
https://{rest_api_root}/v1/relations
```

令牌: 企业令牌/用户令牌

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 关联主体的类型。关联主体的类型和关联的目标类型需要搭配使用，比如：   `需求关联工单` ，principal\_type为 `idea` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:write:ship:idea` 、 `pcp:write:ship:ticket` ；   `需求关联工作项` ，principal\_type为 `idea` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:write:ship:idea` 、 `pcp:write:pjm:workitem` ；   `需求关联测试用例` ，principal\_type为 `idea` ，target\_type为 `test_case` ，要求 `scopes` 包括 `pcp:write:ship:idea` 、 `pcp:write:testhub:testcase` ；   `需求关联需求` ，principal\_type为 `idea` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:write:ship:idea` ；   `需求关联页面` ，principal\_type为 `idea` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:write:ship:idea` 、 `pcp:write:wiki:page` ；   `工单关联需求` ，principal\_type为 `ticket` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:write:ship:ticket` 、 `pcp:write:ship:idea` ；   `工单关联工作项` ，principal\_type为 `ticket` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:write:ship:ticket` 、 `pcp:write:pjm:workitem` ；   `工单关联工单` ，principal\_type为 `ticket` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:write:ship:ticket` ；   `工单关联页面` ，principal\_type为 `ticket` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:write:ship:ticket` 、 `pcp:write:wiki:page` ；   `工作项关联测试用例` ，principal\_type为 `work_item` ，target\_type为 `test_case` ，要求 `scopes` 包括 `pcp:write:pjm:workitem` 、 `pcp:write:testhub:testcase` ；   `工作项关联需求` ，principal\_type为 `work_item` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:write:pjm:workitem` 、 `pcp:write:ship:idea` ；   `工作项关联工单` ，principal\_type为 `work_item` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:write:pjm:workitem` 、 `pcp:write:ship:ticket` ；   `工作项关联页面` ，principal\_type为 `work_item` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:write:pjm:workitem` 、 `pcp:write:wiki:page` ；   `测试计划关联缺陷` ，principal\_type为 `test_plan` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:write:testhub:testplan` 、 `pcp:write:pjm:workitem` ；   `执行用例关联缺陷` ，principal\_type为 `test_run` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:write:testhub:testplan` 、 `pcp:write:pjm:workitem` ；   `测试用例关联需求` ，principal\_type为 `test_case` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:write:testhub:testcase` 、 `pcp:write:ship:idea` ；   `测试用例关联工作项` ，principal\_type为 `test_case` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:write:testhub:testcase` 、 `pcp:write:pjm:workitem` ；   `测试用例关联页面` ，principal\_type为 `test_case` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:write:testhub:testcase` 、 `pcp:write:wiki:page` ；   `页面关联需求` ，暂不开放；   `页面关联工单` ，暂不开放；   `页面关联工作项` ，暂不开放；   `页面关联测试用例` ，暂不开放； |
| principal\_id | String | 关联主体的id。 |
| target\_type | String | 关联的目标类型。 |
| target\_id | String | 关联的目标id。 |

```json
{
    "principal_id": "547000eb6a70571487623fea",
    "principal_type": "test_run",
    "target_type": "work_item",
    "target_id": "5edca524cad2fa1125cb0630"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 关联的id。 |
| url | String | 关联的资源地址。 |
| principal\_type | String | 关联主体的类型。  允许值: `idea`, `ticket`, `work_item`, `test_plan`, `test_run`, `test_case`, `page` |
| principal | Object | 关联的主体。 |
| target\_type | String | 关联的目标类型。  允许值: `ticket`, `work_item`, `test_case`, `idea`, `page` |
| target | Object | 关联的目标。 |

```json
{
    "id": "fa1125cb06305edca524cad2",
    "url": "https://{rest_api_root}/v1/relations/fa1125cb06305edca524cad2",
    "principal_type": "test_run",
    "principal": {
        "id": "547000eb6a70571487623fea",
        "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
        "status": "failure",
        "short_id": "Aq1u38yX",
        "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX"
    },
    "target_type": "work_item",
    "target": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b06105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    }
}
```

获取一个关联

用于查看一个关联。

```html
https://{rest_api_root}/v1/relations/{relation_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| relation\_id | String | 关联的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 关联的id。 |
| url | String | 关联的资源地址。 |
| principal\_type | String | 关联主体的类型。  允许值: `idea`, `ticket`, `work_item`, `test_plan`, `test_run`, `test_case`, `page` |
| principal | Object | 关联的主体。 |
| target\_type | String | 关联的目标类型。  允许值: `ticket`, `work_item`, `test_case`, `idea`, `page` |
| target | Object | 关联的目标。 |

```json
{
    "id": "653b1b4a3113be5bb040e4c5",
    "url": "https://{rest_api_root}/v1/relations/653b1b4a3113be5bb040e4c5",
    "principal_type": "work_item",
    "principal": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b06105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "target_type": "idea",
    "target": {
        "id": "64b4d70ba368e6594360ea24",
        "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
        "identifier": "SLC-1",
        "title": "示例需求",
        "short_id": "Ogf1EYey",
        "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey"
    }
}
```

获取关联列表

用于查询关联列表。

```html
https://{rest_api_root}/v1/relations?principal_type={principal_type}&principal_id={principal_id}&target_type={target_type}
```

令牌: 企业令牌/用户令牌

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 关联主体的类型。关联主体的类型和关联的目标类型需要搭配使用，比如：   `需求关联工单` ，principal\_type为 `idea` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:read:ship:idea` 、 `pcp:read:ship:ticket` ；   `需求关联工作项` ，principal\_type为 `idea` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:read:ship:idea` 、 `pcp:read:pjm:workitem` ；   `需求关联测试用例` ，principal\_type为 `idea` ，target\_type为 `test_case` ，要求 `scopes` 包括 `pcp:read:ship:idea` 、 `pcp:read:testhub:testcase` ；   `需求关联需求` ，principal\_type为 `idea` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:read:ship:idea` ；   `需求关联页面` ，principal\_type为 `idea` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:read:ship:idea` 、 `pcp:read:wiki:page` ；   `工单关联需求` ，principal\_type为 `ticket` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:read:ship:ticket` 、 `pcp:read:ship:idea` ；   `工单关联工作项` ，principal\_type为 `ticket` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:read:ship:ticket` 、 `pcp:read:pjm:workitem` ；   `工单关联工单` ，principal\_type为 `ticket` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:read:ship:ticket` ；   `工单关联页面` ，principal\_type为 `ticket` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:read:ship:ticket` 、 `pcp:read:wiki:page` ；   `工作项关联测试用例` ，principal\_type为 `work_item` ，target\_type为 `test_case` ，要求 `scopes` 包括 `pcp:read:pjm:workitem` 、 `pcp:read:testhub:testcase` ；   `工作项关联需求` ，principal\_type为 `work_item` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:read:pjm:workitem` 、 `pcp:read:ship:idea` ；   `工作项关联工单` ，principal\_type为 `work_item` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:read:pjm:workitem` 、 `pcp:read:ship:ticket` ；   `工作项关联页面` ，principal\_type为 `work_item` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:read:pjm:workitem` 、 `pcp:read:wiki:page` ；   `测试计划关联缺陷` ，principal\_type为 `test_plan` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:read:testhub:testplan` 、 `pcp:read:pjm:workitem` ；   `执行用例关联缺陷` ，principal\_type为 `test_run` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:read:testhub:testplan` 、 `pcp:read:pjm:workitem` ；   `测试用例关联需求` ，principal\_type为 `test_case` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:read:testhub:testcase` 、 `pcp:read:ship:idea` ；   `测试用例关联工作项` ，principal\_type为 `test_case` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:read:testhub:testcase` 、 `pcp:read:pjm:workitem` ；   `测试用例关联页面` ，principal\_type为 `test_case` ，target\_type为 `page` ，要求 `scopes` 包括 `pcp:read:testhub:testcase` 、 `pcp:read:wiki:page` ；   `页面关联需求` ，principal\_type为 `page` ，target\_type为 `idea` ，要求 `scopes` 包括 `pcp:read:wiki:page` 、 `pcp:read:ship:idea` ；   `页面关联工单` ，principal\_type为 `page` ，target\_type为 `ticket` ，要求 `scopes` 包括 `pcp:read:wiki:page` 、 `pcp:read:ship:ticket` ；   `页面关联工作项` ，principal\_type为 `page` ，target\_type为 `work_item` ，要求 `scopes` 包括 `pcp:read:wiki:page` 、 `pcp:read:pjm:workitem` ；   `页面关联测试用例` ，principal\_type为 `page` ，target\_type为 `test_case` ，要求 `scopes` 包括 `pcp:read:wiki:page` 、 `pcp:read:testhub:testcase` ； |
| principal\_id | String | 关联主体的id。 |
| target\_type | String | 关联的目标类型。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 关联全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "64b4d70ba368e6594360ea79",
            "url": "https://{rest_api_root}/v1/relations/64b4d70ba368e6594360ea79",
            "principal_type": "idea",
            "principal": {
                "id": "64b4d70ba368e6594360ea24",
                "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
                "identifier": "SLC-1",
                "title": "示例需求",
                "short_id": "Ogf1EYey",
                "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey"
            },
            "target_type": "ticket",
            "target": {
                "id": "63eca888a0a13a3efc8d4a43",
                "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
                "identifier": "SLC-T1",
                "title": "希望新增支持第三方账号注册",
                "short_id": "pdMUgQzZ",
                "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ"
            }
        }
    ]
}
```

删除一个关联

用于删除一个关联。

```html
https://{rest_api_root}/v1/relations/{relation_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| relation\_id | String | 关联的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 关联的id。 |
| url | String | 关联的资源地址。 |
| principal\_type | String | 关联主体的类型。  允许值: `idea`, `ticket`, `work_item`, `test_plan`, `test_run`, `test_case`, `page` |
| principal | Object | 关联的主体。 |
| target\_type | String | 关联的目标类型。  允许值: `ticket`, `work_item`, `test_case`, `idea`, `page` |
| target | Object | 关联的目标。 |

```json
{
    "id": "fa1125cb06305edca524cad2",
    "url": "https://{rest_api_root}/v1/relations/fa1125cb06305edca524cad2",
    "principal_type": "test_plan",
    "principal": {
        "id": "5eb6a70571487623fea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
        "name": "测试计划",
        "status": "in_progress",
        "start_at": 1589791860,
        "end_at": 1589791870
    },
    "target_type": "work_item",
    "target": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b06105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    }
}
```

活动记录

获取一个活动记录

用于查看一个活动记录。

```html
https://{rest_api_root}/v1/activities/{activity_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| activity\_id | String | 活动记录的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:read:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;  允许值: `work_item`, `test_run`, `test_case`, `idea`, `ticket` |
| principal\_id | String | 主体的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 活动记录的id。 |
| url | String | 活动记录的资源地址。 |
| template | String | 活动记录的模板。 |
| type | String | 活动记录的操作类型。 |
| summary | String | 活动记录的摘要。 |
| content | Object | 活动记录的内容。 |
| client | String | 活动记录的客户端。  允许值: `"unknown"`, `"web"`, `"mail"`, `"iphone"`, `"ipad"`, `"android"`, `"android_hd"`, `"winphone"`, `"win8"`, `"wap"`, `"weixin"`, `"api"`, `"hook"`, `"fetch"`, `"windows"`, `"mac"`, `"h5"`, `"flow"` |
| created\_at | Number | 活动记录的创建时间。 |
| created\_by | Object | 活动记录的创建者。 |

```json
{
    "id": "694ae20fdb8e0baef70f7ddb",
    "url": "https://{rest_api_root}/v1/activities/694ae20fdb8e0baef70f7ddb?principal_type=idea&principal_id=683562430d684517b06b814b",
    "template": "update-property",
    "type": "update",
    "summary": "修改了引用多选",
    "content": {
        "property_key": "yinyongduoxuan",
        "origin": null,
        "target": [
            {
                "id": "65fa797d8f0358d376233220",
                "name": "REST API 产品"
            }
        ]
    },
    "client": "web",
    "created_at": 1766515215,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取活动记录列表

用于查询活动记录列表。

```html
https://{rest_api_root}/v1/activities?principal_type={principal_type}&principal_id={principal_id}
```

令牌: 企业令牌/用户令牌

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:workitem`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:testcase`;   在 `principal_type` 为 `test_run` 时，要求 `scopes` 包括 `pcp:read:testhub:testplan`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:idea`;   在 `principal_type` 为 `ticket` 时，要求 `scopes` 包括 `pcp:read:ship:ticket`;  允许值: `work_item`, `test_run`, `test_case`, `idea`, `ticket` |
| principal\_id | String | 主体的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 活动记录全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 1,
    "values": [
        {
            "id": "694ae20fdb8e0baef70f7ddb",
            "url": "https://{rest_api_root}/v1/activities/694ae20fdb8e0baef70f7ddb?principal_type=idea&principal_id=683562430d684517b06b814b",
            "template": "update-property",
            "type": "update",
            "summary": "修改了引用多选",
            "content": {
                "property_key": "yinyongduoxuan",
                "origin": null,
                "target": [
                    {
                        "id": "65fa797d8f0358d376233220",
                        "name": "REST API 产品"
                    }
                ]
            },
            "client": "web",
            "created_at": 1766515215,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

评审

创建一个评审

用于创建一个评审。

```html
https://{rest_api_root}/v1/reviews
```

令牌: 企业令牌/用户令牌

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title | String | 评审的标题。 |
| pilot\_id | String | 评审主体所在产品、项目或测试库的id。 |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:product`;  允许值: `idea`, `work_item`, `test_case` |
| description 可选 | String | 评审的描述。 |

```json
{
    "title": "这是一个评审",
    "pilot_id": "63bb744314bd13c9def24cb4",
    "principal_type": "idea",
    "description": "这是一个评审的描述"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评审的id。 |
| url | String | 评审的资源地址。 |
| identifier | String | 评审的标识符。 |
| title | String | 评审的标题。 |
| status | String | 评审的状态。  允许值: `pending`, `in_progress`, `completed`, `repealed` |
| principal\_type | String | 评审主体的类型。  允许值: `idea`, `work_item`, `test_case` |
| short\_id | String | 评审的短id。 |
| html\_url | String | 评审的html地址。 |
| pilot | Object | 评审所在的产品、项目或测试库。 |
| description | String | 评审的描述。 |
| participants | Object\[\] | 评审的关注人列表。 |
| submitted\_at | Number | 评审的提交时间。 |
| submitted\_by | Object | 评审的提交人。 |
| completed\_at | Number | 评审的完成时间。 |
| completed\_by | Object | 评审的完成人。 |
| created\_at | Number | 评审的创建时间。 |
| created\_by | Object | 评审的创建人。 |
| updated\_at | Number | 评审的更新时间。 |
| updated\_by | Object | 评审的更新人。 |

```json
{
    "id": "5f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/reviews/5f168f764eba01a5278b87cd?principal_type=idea",
    "identifier": "SCR-R5",
    "title": "这是一个评审",
    "status": "pending",
    "principal_type": "idea",
    "short_id": "LsEy8mZF",
    "html_url": "https://yctech.pingcode.com/reviews/LsEy8mZF",
    "pilot": {
        "id": "63bb744314bd13c9def24cb4",
        "url": "https://{rest_api_root}/v1/ship/products/63bb744314bd13c9def24cb4",
        "name": "示例产品",
        "identifier": "SLC",
        "is_archived": 0,
        "is_deleted": 0
    },
    "description": "这是一个评审的描述",
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&review_id=6f168f764eba01a5278b87cd",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "submitted_at": null,
    "submitted_by": null,
    "completed_at": null,
    "completed_by": null,
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
    },
    "updated_at": 1593291347,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
    }
}
```

获取一个评审

用于查看一个评审。

```html
https://{rest_api_root}/v1/reviews/{review_id}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| review\_id | String | 评审的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:product`;  允许值: `work_item`, `test_case`, `idea` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评审的id。 |
| url | String | 评审的资源地址。 |
| identifier | String | 评审的标识符。 |
| title | String | 评审的标题。 |
| status | String | 评审状态。  允许值: `pending`, `in_progress`, `completed`, `repealed` |
| principal\_type | String | 评审主体的类型。  允许值: `idea`, `work_item`, `test_case` |
| short\_id | String | 评审的短id。 |
| html\_url | String | 评审的html地址。 |
| pilot | Object | 评审所在的产品、项目或测试库。 |
| description | String | 评审的描述。 |
| participants | Object\[\] | 评审的关注人列表。 |
| submitted\_at | Number | 评审的提交时间。 |
| submitted\_by | Object | 评审的提交人。 |
| completed\_at | Number | 评审的完成时间。 |
| completed\_by | Object | 评审的完成人。 |
| created\_at | Number | 评审的创建时间。 |
| created\_by | Object | 评审的创建人。 |
| updated\_at | Number | 评审的更新时间。 |
| updated\_by | Object | 评审的更新人。 |

```json
{
    "id": "6f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/reviews/6f168f764eba01a5278b87cd?principal_type=idea",
    "identifier": "SCR-R5",
    "title": "这是一个评审",
    "status": "completed",
    "principal_type": "idea",
    "short_id": "LsEy8mZF",
    "html_url": "https://yctech.pingcode.com/reviews/LsEy8mZF",
    "pilot": {
        "id": "63bb744314bd13c9def24cb4",
        "url": "https://{rest_api_root}/v1/ship/products/63bb744314bd13c9def24cb4",
        "name": "示例产品",
        "identifier": "SLC",
        "is_archived": 0,
        "is_deleted": 0
    },
    "description": "这是一个评审的描述",
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&review_id=6f168f764eba01a5278b87cd",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "submitted_at": 1593290347,
    "submitted_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
    },
    "completed_at": 1593291347,
    "completed_by": {
        "id": "b2417f68e846aae315c85d24643678b0",
        "url": "https://{rest_api_root}/v1/directory/users/b2417f68e846aae315c85d24643678b0",
        "name": "mary",
        "display_name": "Mary",
        "avatar": "https://s3.amazonaws.com/bucket/avatar2.png"
    },
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
    },
    "updated_at": 1593291347,
    "updated_by": {
        "id": "b2417f68e846aae315c85d24643678b0",
        "url": "https://{rest_api_root}/v1/directory/users/b2417f68e846aae315c85d24643678b0",
        "name": "mary",
        "display_name": "Mary",
        "avatar": "https://s3.amazonaws.com/bucket/avatar2.png"
    }
}
```

获取评审列表

用于查询评审列表。

```html
https://{rest_api_root}/v1/reviews?principal_type={principal_type}&pilot_id={pilot_id}
```

令牌: 企业令牌/用户令牌

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:product`;  允许值: `work_item`, `test_case`, `idea` |
| pilot\_id | String | 评审主体所在产品、项目或测试库的id。 |
| status 可选 | String | 评审的状态。  允许值: `pending`, `in_progress`, `completed`, `repealed` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 评审全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5f168f764eba01a5278b87cd",
            "url": "https://{rest_api_root}/v1/reviews/5f168f764eba01a5278b87cd?principal_type=idea",
            "identifier": "SCR-R5",
            "title": "这是一个评审",
            "status": "completed",
            "principal_type": "idea",
            "short_id": "LsEy8mZF",
            "html_url": "https://yctech.pingcode.com/reviews/LsEy8mZF",
            "pilot": {
                "id": "63bb744314bd13c9def24cb4",
                "url": "https://{rest_api_root}/v1/ship/products/63bb744314bd13c9def24cb4",
                "name": "示例产品",
                "identifier": "SLC",
                "is_archived": 0,
                "is_deleted": 0
            },
            "description": "这是一个评审的描述",
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&review_id=6f168f764eba01a5278b87cd",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "submitted_at": 1593290347,
            "submitted_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
            },
            "completed_at": 1593291347,
            "completed_by": {
                "id": "b2417f68e846aae315c85d24643678b0",
                "url": "https://{rest_api_root}/v1/directory/users/b2417f68e846aae315c85d24643678b0",
                "name": "mary",
                "display_name": "Mary",
                "avatar": "https://s3.amazonaws.com/bucket/avatar2.png"
            },
            "created_at": 1593290347,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
            },
            "updated_at": 1593291347,
            "updated_by": {
                "id": "b2417f68e846aae315c85d24643678b0",
                "url": "https://{rest_api_root}/v1/directory/users/b2417f68e846aae315c85d24643678b0",
                "name": "mary",
                "display_name": "Mary",
                "avatar": "https://s3.amazonaws.com/bucket/avatar2.png"
            }
        }
    ]
}
```

删除一个评审

用于删除一个评审。

```html
https://{rest_api_root}/v1/reviews/{review_id}?principal_type={principal_type}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| review\_id | String | 评审的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:product`;  允许值: `work_item`, `test_case`, `idea` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评审的id。 |
| url | String | 评审的资源地址。 |
| identifier | String | 评审的标识符。 |
| title | String | 评审的标题。 |
| status | String | 评审的状态。  允许值: `pending`, `in_progress`, `completed`, `repealed` |
| principal\_type | String | 评审主体的类型。  允许值: `idea`, `work_item`, `test_case` |
| short\_id | String | 评审的短id。 |
| html\_url | String | 评审的html地址。 |
| pilot | Object | 评审所在的产品、项目或测试库。 |
| description | String | 评审的描述。 |
| participants | Object\[\] | 评审的关注人列表。 |
| submitted\_at | Number | 评审的提交时间。 |
| submitted\_by | Object | 评审的提交人。 |
| completed\_at | Number | 评审的完成时间。 |
| completed\_by | Object | 评审的完成人。 |
| created\_at | Number | 评审的创建时间。 |
| created\_by | Object | 评审的创建人。 |
| updated\_at | Number | 评审的更新时间。 |
| updated\_by | Object | 评审的更新人。 |

```json
{
    "id": "5f168f764eba01a5278b87cd",
    "url": "https://{rest_api_root}/v1/reviews/5f168f764eba01a5278b87cd?principal_type=idea",
    "identifier": "SCR-R5",
    "title": "这是一个评审",
    "status": "pending",
    "principal_type": "idea",
    "short_id": "LsEy8mZF",
    "html_url": "https://yctech.pingcode.com/reviews/LsEy8mZF",
    "pilot": {
        "id": "63bb744314bd13c9def24cb4",
        "url": "https://{rest_api_root}/v1/ship/products/63bb744314bd13c9def24cb4",
        "name": "示例产品",
        "identifier": "SLC",
        "is_archived": 0,
        "is_deleted": 0
    },
    "description": "这是一个评审的描述",
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&review_id=6f168f764eba01a5278b87cd",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "submitted_at": null,
    "submitted_by": null,
    "completed_at": null,
    "completed_by": null,
    "created_at": 1593290347,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
    },
    "updated_at": 1593291347,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/avatar.png"
    }
}
```

向评审中添加一个评审内容

用于向评审中添加一个评审内容。

```html
https://{rest_api_root}/v1/reviews/{review_id}/principals
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| review\_id | String | 评审的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_id | String | 评审内容的id。 |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:product`;  允许值: `idea`, `work_item`, `test_case` |

```json
{
    "principal_id": "63bb744514bd13c9def24ceb",
    "principal_type": "idea"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评审内容的id。 |
| url | String | 评审内容的资源地址。 |
| review | Object | 所属评审的引用结构数据。 |
| principal\_type | String | 评审内容的类型。  允许值: `idea`, `work_item`, `test_case` |
| principal | Object | 评审内容的引用结构数据。 |

```json
{
    "id": "63bb744514bd13c9def24ceb",
    "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a/principals/63bb744514bd13c9def24ceb?principal_type=idea",
    "review": {
        "id": "68ccfe6b3eef8131da564e4a",
        "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a?principal_type=idea",
        "identifier": "SLC-R11",
        "title": "这是一个需求评审",
        "status": "pending",
        "principal_type": "idea",
        "short_id": "LK7Qy-NA",
        "html_url": "https://yctech.pingcode.com/ship/reviews/LK7Qy-NA"
    },
    "principal_type": "idea",
    "principal": {
        "id": "63bb744514bd13c9def24ceb",
        "url": "https://{rest_api_root}/v1/ship/ideas/63bb744514bd13c9def24ceb",
        "identifier": "SLC-1",
        "title": "这是一个产品需求",
        "short_id": "Omi8PFL0",
        "html_url": "https://yctech.pingcode.com/ship/ideas/Omi8PFL0"
    }
}
```

获取一个评审内容

用于查看一个评审内容。

```html
https://{rest_api_root}/v1/reviews/{review_id}/principals/{principal_id}?principal_type={principal_type}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| review\_id | String | 评审的id。 |
| principal\_id | String | 评审内容的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:product`;  允许值: `work_item`, `test_case`, `idea` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评审内容的id。 |
| url | String | 评审内容的资源地址。 |
| review | Object | 所属评审的引用结构数据。 |
| principal\_type | String | 评审内容的类型。  允许值: `idea`, `work_item`, `test_case` |
| principal | Object | 评审内容的引用结构数据。 |

```json
{
    "id": "63bb744514bd13c9def24ceb",
    "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a/principals/63bb744514bd13c9def24ceb?principal_type=idea",
    "review": {
        "id": "68ccfe6b3eef8131da564e4a",
        "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a?principal_type=idea",
        "identifier": "SLC-R11",
        "title": "这是一个需求评审",
        "status": "pending",
        "principal_type": "idea",
        "short_id": "LK7Qy-NA",
        "html_url": "https://yctech.pingcode.com/ship/reviews/LK7Qy-NA"
    },
    "principal_type": "idea",
    "principal": {
        "id": "63bb744514bd13c9def24ceb",
        "url": "https://{rest_api_root}/v1/ship/ideas/63bb744514bd13c9def24ceb",
        "identifier": "SLC-1",
        "title": "这是一个产品需求",
        "short_id": "Omi8PFL0",
        "html_url": "https://yctech.pingcode.com/ship/ideas/Omi8PFL0"
    }
}
```

获取评审内容列表

用于查询评审内容列表。

```html
https://{rest_api_root}/v1/reviews/{review_id}/principals?principal_type={principal_type}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| review\_id | String | 评审的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:read:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:read:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:read:ship:product`;  允许值: `work_item`, `test_case`, `idea` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 评审内容全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744514bd13c9def24ceb",
            "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a/principals/63bb744514bd13c9def24ceb?principal_type=idea",
            "review": {
                "id": "68ccfe6b3eef8131da564e4a",
                "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a?principal_type=idea",
                "identifier": "SLC-R11",
                "title": "这是一个需求评审",
                "status": "pending",
                "principal_type": "idea",
                "short_id": "LK7Qy-NA",
                "html_url": "https://yctech.pingcode.com/ship/reviews/LK7Qy-NA"
            },
            "principal_type": "idea",
            "principal": {
                "id": "63bb744514bd13c9def24ceb",
                "url": "https://{rest_api_root}/v1/ship/ideas/63bb744514bd13c9def24ceb",
                "identifier": "SLC-1",
                "title": "这是一个产品需求",
                "short_id": "Omi8PFL0",
                "html_url": "https://yctech.pingcode.com/ship/ideas/Omi8PFL0"
            }
        }
    ]
}
```

在评审中移除一个评审内容

用于在评审中移除一个评审内容。

```html
https://{rest_api_root}/v1/reviews/{review_id}/principals/{principal_id}?principal_type={principal_type}
```

令牌: 企业令牌/用户令牌

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| review\_id | String | 评审的id。 |
| principal\_id | String | 评审内容的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| principal\_type | String | 评审主体的类型。   在 `principal_type` 为 `work_item` 时，要求 `scopes` 包括 `pcp:write:pjm:project`;   在 `principal_type` 为 `test_case` 时，要求 `scopes` 包括 `pcp:write:testhub:library`;   在 `principal_type` 为 `idea` 时，要求 `scopes` 包括 `pcp:write:ship:product`;  允许值: `work_item`, `test_case`, `idea` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 评审内容的id。 |
| url | String | 评审内容的资源地址。 |
| review | Object | 所属评审的引用结构数据。 |
| principal\_type | String | 评审内容的类型。  允许值: `idea`, `work_item`, `test_case` |
| principal | Object | 评审内容的引用结构数据。 |

```json
{
    "id": "63bb744514bd13c9def24ceb",
    "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a/principals/63bb744514bd13c9def24ceb?principal_type=idea",
    "review": {
        "id": "68ccfe6b3eef8131da564e4a",
        "url": "https://{rest_api_root}/v1/reviews/68ccfe6b3eef8131da564e4a?principal_type=idea",
        "identifier": "SLC-R11",
        "title": "这是一个需求评审",
        "status": "pending",
        "principal_type": "idea",
        "short_id": "LK7Qy-NA",
        "html_url": "https://yctech.pingcode.com/ship/reviews/LK7Qy-NA"
    },
    "principal_type": "idea",
    "principal": {
        "id": "63bb744514bd13c9def24ceb",
        "url": "https://{rest_api_root}/v1/ship/ideas/63bb744514bd13c9def24ceb",
        "identifier": "SLC-1",
        "title": "这是一个产品需求",
        "short_id": "Omi8PFL0",
        "html_url": "https://yctech.pingcode.com/ship/ideas/Omi8PFL0"
    }
}
```

产品管理

产品

创建一个产品

用于创建一个产品。

```html
https://{rest_api_root}/v1/ship/products
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 产品的所属类型。默认值 `organization` 。允许值分别表示企业可见和团队可见。  默认值: `organization`  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 产品的所属id。当 `scope_type` 为 `user_group` 时，该字段必填，且表示团队id；当 `scope_type` 为其他值时，该字段无效。 |
| name | String | 产品的名称（不超过32个字符）。 |
| visibility 可选 | String | 产品的可见范围。允许值分别表示组织全部成员可见和仅产品成员可见。  默认值: `private`  允许值: `public`, `private` |
| identifier | String | 产品的标识。在一个企业中这个标识是唯一的。产品的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 产品的描述。 |
| members 可选 | Object\[\] | 产品成员的列表。 |
| members.id | String | 企业成员或团队的id。 |
| members.type | String | 产品成员的类型。  允许值: `user`, `user_group` |

```json
{
    "name": "示例产品",
    "identifier": "SLC",
    "description": "示例产品描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "type": "user"
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "type": "user_group"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品的id。 |
| url | String | 产品的资源地址。 |
| identifier | String | 产品的标识。 |
| name | String | 产品的名称。 |
| scope\_type | String | 产品的所属类型。  允许值: `organization`, `user_group` |
| scope\_id | String | 产品的所属id。 |
| visibility | String | 产品的可见性。  允许值: `private`, `public` |
| color | String | 产品的主题色。 |
| description | String | 产品的描述。 |
| members | Object\[\] | 产品的成员列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "6422711c3f12e6c1e46d40e9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
    "identifier": "SLC",
    "name": "示例产品",
    "visibility": "private",
    "scope_type": "user_group",
    "scope_id": "6422711c3f12e6c1e46d40e9",
    "color": "#FA8888",
    "description": "示例产品描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个产品

用于查看一个产品。

```html
https://{rest_api_root}/v1/ship/products/{product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_deleted 可选 | Boolean | 是否包含已删除的产品。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否包含已归档的产品。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品的id。 |
| url | String | 产品的资源地址。 |
| identifier | String | 产品的标识。 |
| name | String | 产品的名称。 |
| scope\_type | String | 产品的所属类型。  允许值: `organization`, `user_group` |
| scope\_id | String | 产品的所属id。 |
| visibility | String | 产品的可见性。  允许值: `private`, `public` |
| color | String | 产品的主题色。 |
| description | String | 产品的描述。 |
| members | Object\[\] | 产品的成员列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "6422711c3f12e6c1e46d40e9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
    "identifier": "SLC",
    "name": "示例产品",
    "scope_type": "user_group",
    "scope_id": "6422711c3f12e6c1e46d40e9",
    "visibility": "private",
    "color": "#FA8888",
    "description": "示例产品描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个产品

用于部分更新一个产品。

```html
https://{rest_api_root}/v1/ship/products/{product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 产品的名称（不超过32个字符）。 |
| identifier 可选 | String | 产品的标识。在一个企业中这个标识是唯一的。产品的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 产品的描述。 |

```json
{
    "name": "示例产品",
    "identifier": "SLC",
    "description": "示例产品描述"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品的id。 |
| url | String | 产品的资源地址。 |
| identifier | String | 产品的标识。 |
| name | String | 产品的名称。 |
| scope\_type | String | 产品的所属类型。  允许值: `organization`, `user_group` |
| scope\_id | String | 产品的所属id。 |
| visibility | String | 产品的可见性。  允许值: `private`, `public` |
| color | String | 产品的主题色。 |
| description | String | 产品的描述。 |
| members | Object\[\] | 产品的成员列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "6422711c3f12e6c1e46d40e9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
    "identifier": "SLC",
    "name": "示例产品",
    "scope_type": "user_group",
    "scope_id": "6422711c3f12e6c1e46d40e9",
    "visibility": "private",
    "color": "#FA8888",
    "description": "示例产品描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583293300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取产品列表

用于查询产品列表。

```html
https://{rest_api_root}/v1/ship/products
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 产品的所属类型。允许值分别表示企业可见和团队可见。  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 产品的所属id。仅支持团队的id。 |
| keywords 可选 | String | 关键字。只支持 `name` 关键字搜索。 |
| member\_type 可选 | String | 产品成员的类型。 `member_type` 和 `member_id` 必须同时存在。  允许值: `user`, `user_group` |
| member\_id 可选 | String | 产品成员的id。值为企业成员或团队的id。值为企业成员或团队的id。 `member_id` 和 `member_type` 必须同时存在。 |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |
| include\_deleted 可选 | Boolean | 是否查询已删除的产品。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否查询已归档的产品。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40e9",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
            "identifier": "SLC",
            "name": "示例产品",
            "visibility": "private",
            "scope_type": "user_group",
            "scope_id": "6422711c3f12e6c1e46d40e9",
            "color": "#FA8888",
            "description": "示例产品描述",
            "members": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                },
                {
                    "id": "63c8fb32729dee3334d96af7",
                    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/63c8fb32729dee3334d96af7",
                    "type": "user_group",
                    "user_group": {
                        "id": "63c8fb32729dee3334d96af7",
                        "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                        "name": "Open Team"
                    }
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

向产品中添加一个成员

用于向产品中添加一个成员。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| member | Object | 产品的成员。 |
| member.id | String | 企业成员或团队的id。 |
| member.type | String | 产品成员的类型。  允许值: `user`, `user_group` |
| role\_id 可选 | String | 角色的id。 |

```json
{
    "member": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "type": "user"
    },
    "role_id": "6422711c3f12e6c1e46d40e6"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品成员的id。 |
| url | String | 产品成员的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| type | String | 产品成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "name": "示例产品",
        "identifier": "SLC",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取产品中的一个成员

用于查看一个产品成员。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| member\_id | String | 产品成员的id，即企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品成员的id。 |
| url | String | 产品成员的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| type | String | 产品成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "name": "示例产品",
        "identifier": "SLC",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取产品中的成员列表

用于查询产品中的成员列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品成员全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "name": "示例产品",
                "identifier": "SLC",
                "is_archived": 0,
                "is_deleted": 0
            },
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/63c8fb32729dee3334d96af7",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "name": "示例产品",
                "identifier": "SLC",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        }
    ]
}
```

在产品中移除一个成员

用于在产品中移除一个成员。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| member\_id | String | 企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品成员的id。 |
| url | String | 产品成员的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| type | String | 产品成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/members/a0417f68e846aae315c85d24643678a9",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "name": "示例产品",
        "identifier": "SLC",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

向产品中添加一个需求模块

用于向产品中添加一个需求模块。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/suites
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 模块名称。需求模块为树形结构，同一层次下的名称不能重复。 |
| type | String | 模块类型。允许值分别表示子产品和模块。  允许值: `product`, `module` |
| parent\_id 可选 | String | 父模块的id。 |

```json
{
    "name": "技术支持确认",
    "type": "module",
    "parent_id": "63bb744414bd13c9def24ce3"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求模块的id。 |
| url | String | 需求模块的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| name | String | 需求模块的名称。 |
| type | String | 需求模块的类型。  允许值: `product`, `module` |
| parent | Object | 父级需求模块的引用结构数据。 |

```json
{
    "id": "63eca881a0a13a3efc8d49f0",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63eca881a0a13a3efc8d49f0",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "技术支持确认",
    "type": "module",
    "parent": {
        "id": "63bb744414bd13c9def24ce3",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63bb744414bd13c9def24ce3",
        "name": "父级产品模块",
        "type": "module"
    }
}
```

获取产品中的一个需求模块

用于查看一个需求模块。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/suites/{suite_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| suite\_id | String | 需求模块的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求模块的id。 |
| url | String | 需求模块的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| name | String | 需求模块的名称。 |
| type | String | 需求模块的类型。  允许值: `product`, `module` |
| parent | Object | 父级需求模块的引用结构数据。 |

```json
{
    "id": "63eca881a0a13a3efc8d49f0",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63eca881a0a13a3efc8d49f0",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "技术支持确认",
    "type": "module",
    "parent": {
        "id": "63bb744414bd13c9def24ce3",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63bb744414bd13c9def24ce3",
        "name": "父级产品模块",
        "type": "module"
    }
}
```

获取产品中的需求模块列表

用于查询产品中的需求模块列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/suites
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品中的需求模块全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca881a0a13a3efc8d49f0",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63eca881a0a13a3efc8d49f0",
            "product": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "技术支持确认",
            "type": "module",
            "parent": {
                "id": "63bb744414bd13c9def24ce3",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63bb744414bd13c9def24ce3",
                "name": "父级产品模块",
                "type": "module"
            }
        }
    ]
}
```

在产品中移除一个需求模块

用于在产品中移除一个需求模块。  
请注意，删除一个模块会自动删除其所有的子模块。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/suites/{suite_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| suite\_id | String | 模块id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求模块的id。 |
| url | String | 需求模块的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| name | String | 需求模块的名称。 |
| type | String | 需求模块的类型。  允许值: `product`, `module` |
| parent | Object | 父级需求模块的引用结构数据。 |

```json
{
    "id": "63eca881a0a13a3efc8d49f0",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63eca881a0a13a3efc8d49f0",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "技术支持确认",
    "type": "module",
    "parent": {
        "id": "63bb744414bd13c9def24ce3",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/suites/63bb744414bd13c9def24ce3",
        "name": "父级产品模块",
        "type": "module"
    }
}
```

获取产品中的一个需求排期

用于查看一个需求排期。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/plans/{plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| plan\_id | String | 需求排期的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求排期的id。 |
| url | String | 需求排期的资源地址。 |
| product | Object | 需求排期所属产品的引用结构数据。 |
| name | String | 需求排期的名称。 |
| assignee | Object | 需求排期负责人的引用结构数据。 |
| start\_at | Number | 需求排期的开始时间，单位为秒。 |
| end\_at | Number | 需求排期的结束时间，单位为秒。 |

```json
{
    "id": "63bb744414bd13c9def24ce4",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/plans/63bb744414bd13c9def24ce4",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "账号管理",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1672704000,
    "end_at": 1672963199
}
```

获取产品中的需求排期列表

用于查询产品中的需求排期列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品中的需求排期全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744414bd13c9def24ce4",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/plans/63bb744414bd13c9def24ce4",
            "product": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "账号管理",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "start_at": 1672704000,
            "end_at": 1672963199
        }
    ]
}
```

获取产品中的一个工单渠道

用于查看一个工单渠道。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/channels/{channel_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| channel\_id | String | 工单渠道的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单渠道的id。 |
| url | String | 工单渠道的资源地址。 |
| name | String | 工单渠道的名称。 |
| product | Object | 工单渠道关联产品的引用结构数据。 |
| description | String | 工单渠道的描述。 |

```json
{
    "id": "63eca881a0a13a3efc8d49ed",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/channels/63eca881a0a13a3efc8d49ed",
    "name": "客户反馈Web渠道",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "description": "收集客户反馈意见的Web渠道"
}
```

获取产品中的工单渠道列表

用于查询产品中的工单渠道列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/channels
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品中的工单渠道全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca881a0a13a3efc8d49ed",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/channels/63eca881a0a13a3efc8d49ed",
            "name": "客户反馈Web渠道",
            "product": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "description": "收集客户反馈意见的Web渠道"
        }
    ]
}
```

获取产品中的一个工单类型

用于查询产品中的一个工单类型。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/ticket_types/{ticket_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| ticket\_type\_id | String | 工单类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 产品中工单类型关联的id。 |
| url | String | 产品中工单类型关联的资源地址。 |
| product | Object | 产品的引用结构数据。 |
| ticket\_type | Object | 工单类型的引用结构数据。 |

```json
{
    "id": "63bb744214bd13c9def24ca9",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/ticket_types/63bb744214bd13c9def24ca9",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "name": "自动化",
        "identifier": "FLOW",
        "is_archived": 0,
        "is_deleted": 0
    },
    "ticket_type": {
        "id": "63bb744214bd13c9def24ca9",
        "url": "https://{rest_api_root}/v1/ship/ticket_types/63bb744214bd13c9def24ca9",
        "name": "需求"
    }
}
```

获取产品中的工单类型列表

用于查询产品中的工单类型列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/ticket_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品中的工单类型全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744214bd13c9def24ca9",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/ticket_types/63bb744214bd13c9def24ca9",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "name": "自动化",
                "identifier": "FLOW",
                "is_archived": 0,
                "is_deleted": 0
            },
            "ticket_type": {
                "id": "63bb744214bd13c9def24ca9",
                "url": "https://{rest_api_root}/v1/ship/ticket_types/63bb744214bd13c9def24ca9",
                "name": "需求"
            }
        }
    ]
}
```

向产品中添加一个标签

用于向产品中添加一个标签。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/tags
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 标签的名称。在一个产品中这个名称是唯一的。 |

```json
{
    "name": "标签-1"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 标签的id。 |
| url | String | 标签的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| name | String | 标签的名称。 |
| color | String | 标签的颜色。 |

```json
{
    "id": "63eca881a0a13a3efc8d49f0",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/tags/63eca881a0a13a3efc8d49f0",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "标签-1",
    "color": "#56ABFB"
}
```

获取产品中的一个标签

用于查看一个标签。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| tag\_id | String | 标签的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 标签的id。 |
| url | String | 标签的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| name | String | 标签的名称。 |
| color | String | 标签的颜色。 |

```json
{
    "id": "63eca881a0a13a3efc8d49f0",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/tags/63eca881a0a13a3efc8d49f0",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "标签-1",
    "color": "#56ABFB"
}
```

获取产品中的标签列表

用于查询产品中的标签列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/tags
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 产品中的标签全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca881a0a13a3efc8d49f0",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/tags/63eca881a0a13a3efc8d49f0",
            "product": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "标签-1",
            "color": "#56ABFB"
        }
    ]
}
```

在产品中移除一个标签

用于在产品中移除一个标签。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| tag\_id | String | 标签的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 标签的id。 |
| url | String | 标签的资源地址。 |
| product | Object | 所属产品的引用结构数据。 |
| name | String | 标签的名称。 |
| color | String | 标签的颜色。 |

```json
{
    "id": "63eca881a0a13a3efc8d49f0",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/tags/63eca881a0a13a3efc8d49f0",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "标签-1",
    "color": "#56ABFB"
}
```

创建一个客户

用于创建一个客户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/customers
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 客户的名称。 |
| assignee\_id 可选 | String | 客户的负责人id。 |
| scale 可选 | Number | 客户的规模。 |
| description 可选 | String | 客户的描述。 |

```json
{
    "name": "上海XX新零售有限公司",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "scale": 200,
    "description": "上海XX新零售有限公司的描述"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 客户的id。 |
| url | String | 客户的资源地址。 |
| product | Object | 客户关联产品的引用结构数据。 |
| name | String | 客户的名称。 |
| assignee | Object | 客户负责人的引用结构数据。 |
| scale | Number | 客户的规模。 |
| description | String | 客户的描述。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "64dd899e3f6383ba72ec2a0d",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/customers/64dd899e3f6383ba72ec2a0d",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "上海XX新零售有限公司",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "scale": 200,
    "description": "上海XX新零售有限公司的描述",
    "created_at": 1692240286,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1692240286,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个客户

用于查看一个客户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/customers/{customer_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| customer\_id | String | 客户的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 客户的id。 |
| url | String | 客户的资源地址。 |
| product | Object | 客户关联产品的引用结构数据。 |
| name | String | 客户的名称。 |
| assignee | Object | 客户负责人的引用结构数据。 |
| scale | Number | 客户的规模。 |
| description | String | 客户的描述。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "64dd899e3f6383ba72ec2a0d",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/customers/64dd899e3f6383ba72ec2a0d",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "上海XX新零售有限公司",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "scale": 200,
    "description": "上海XX新零售有限公司的描述",
    "created_at": 1692240286,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1692240286,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个客户

用于部分更新一个客户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/customers/{customer_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| customer\_id | String | 客户的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 客户的名称。 |
| assignee\_id 可选 | String | 客户的负责人id。 |
| scale 可选 | Number | 客户的规模。 |
| description 可选 | String | 客户的描述。 |

```json
{
    "name": "上海XX新零售有限公司",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "scale": 200,
    "description": "上海XX新零售有限公司的描述"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 客户的id。 |
| url | String | 客户的资源地址。 |
| product | Object | 客户关联产品的引用结构数据。 |
| name | String | 客户的名称。 |
| assignee | Object | 客户负责人的引用结构数据。 |
| scale | Number | 客户的规模。 |
| description | String | 客户的描述。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "64dd899e3f6383ba72ec2a0d",
    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/customers/64dd899e3f6383ba72ec2a0d",
    "product": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "上海XX新零售有限公司",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "scale": 200,
    "description": "上海XX新零售有限公司的描述",
    "created_at": 1692240286,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1692241286,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取客户列表

用于查询客户列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/customers
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 客户全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "64dd899e3f6383ba72ec2a0d",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/customers/64dd899e3f6383ba72ec2a0d",
            "product": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "上海XX新零售有限公司",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "scale": 200,
            "description": "上海XX新零售有限公司的描述",
            "created_at": 1692240286,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1692240286,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

创建一个外部用户

用于创建一个外部用户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/users
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 外部用户的名称。 |
| email 可选 | String | 外部用户的邮箱地址，邮箱地址和手机号其中一个必填。 |
| mobile 可选 | String | 外部用户的手机号，邮箱地址和手机号其中一个必填，如果同时存在，以手机号为准。 |
| customer\_id 可选 | String | 外部用户所属客户的id。 |

```json
{
    "name": "jack",
    "email": "jack@email.com",
    "customer_id": "64dd899e3f6383ba72ec2a01"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 外部用户的id。 |
| url | String | 外部用户的资源地址。 |
| name | String | 外部用户的名称。 |
| display\_name | String | 外部用户的显示名称。 |
| avatar | String | 外部用户的头像。 |
| email | String | 外部用户的邮箱地址。 |
| mobile | String | 外部用户的手机号。 |
| product | Object | 外部用户关联产品的引用结构数据。 |
| customer | Object | 外部用户所属客户的引用结构数据。 |

```json
{
    "id": "64a2b61c3a12e6c2e46d41e9",
    "url": "https://{rest_api_root}/v1/ship/products/64a2b61c3a12e6c2e46d41e9/users/64a2b61c3a12e6c2e46d41e9",
    "name": "jack",
    "display_name": "Jack",
    "avatar": "https://s3.amazonaws.com/bucket/a46ef40c-e21e-48cf-a579-cace9fba839a_160x160.png",
    "email": "jack@email.com",
    "mobile": null,
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "customer": {
        "id": "64dd899e3f6383ba72ec2a01",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/64dd899e3f6383ba72ec2a01",
        "name": "深圳XX新零售有限公司"
    }
}
```

获取一个外部用户

用于查看一个外部用户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/users/{user_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| user\_id | String | 外部用户的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 外部用户的id。 |
| url | String | 外部用户的资源地址。 |
| name | String | 外部用户的名称。 |
| display\_name | String | 外部用户的显示名称。 |
| avatar | String | 外部用户的头像。 |
| email | String | 外部用户的邮箱地址。 |
| mobile | String | 外部用户的手机号。 |
| product | Object | 外部用户关联产品的引用结构数据。 |
| customer | Object | 外部用户所属客户的引用结构数据。 |

```json
{
    "id": "64a2b61c3a12e6c2e46d41e9",
    "url": "https://{rest_api_root}/v1/ship/products/64a2b61c3a12e6c2e46d41e9/users/64a2b61c3a12e6c2e46d41e9",
    "name": "jack",
    "display_name": "Jack",
    "avatar": "https://s3.amazonaws.com/bucket/a46ef40c-e21e-48cf-a579-cace9fba839a_160x160.png",
    "email": "jack@email.com",
    "mobile": null,
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "customer": {
        "id": "64dd899e3f6383ba72ec2a01",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/64dd899e3f6383ba72ec2a01",
        "name": "深圳XX新零售有限公司"
    }
}
```

部分更新一个外部用户

用于部分更新一个外部用户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/users/{user_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| user\_id | String | 外部用户的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| customer\_id 可选 | String | 外部用户所属客户的id。 |

```json
{
    "customer_id": "64dd899e3f6383ba72ec2a01"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 外部用户的id。 |
| url | String | 外部用户的资源地址。 |
| name | String | 外部用户的名称。 |
| display\_name | String | 外部用户的显示名称。 |
| avatar | String | 外部用户的头像。 |
| email | String | 外部用户的邮箱地址。 |
| mobile | String | 外部用户的手机号。 |
| product | Object | 外部用户关联产品的引用结构数据。 |
| customer | Object | 外部用户所属客户的引用结构数据。 |

```json
{
    "id": "64a2b61c3a12e6c2e46d41e9",
    "url": "https://{rest_api_root}/v1/ship/products/64a2b61c3a12e6c2e46d41e9/users/64a2b61c3a12e6c2e46d41e9",
    "name": "jack",
    "display_name": "Jack",
    "avatar": "https://s3.amazonaws.com/bucket/a46ef40c-e21e-48cf-a579-cace9fba839a_160x160.png",
    "email": "jack@email.com",
    "mobile": null,
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "customer": {
        "id": "64dd899e3f6383ba72ec2a01",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/64dd899e3f6383ba72ec2a01",
        "name": "深圳XX新零售有限公司"
    }
}
```

获取外部用户列表

用于查询外部用户列表。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/users
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 外部用户全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "64a2b61c3a12e6c2e46d41e9",
            "url": "https://{rest_api_root}/v1/ship/products/64a2b61c3a12e6c2e46d41e9/users/64a2b61c3a12e6c2e46d41e9",
            "name": "jack",
            "display_name": "Jack",
            "avatar": "https://s3.amazonaws.com/bucket/a46ef40c-e21e-48cf-a579-cace9fba839a_160x160.png",
            "email": "jack@email.com",
            "mobile": null,
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "customer": {
                "id": "64dd899e3f6383ba72ec2a01",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/64dd899e3f6383ba72ec2a01",
                "name": "深圳XX新零售有限公司"
            }
        }
    ]
}
```

删除一个外部用户

用于删除一个外部用户。

```html
https://{rest_api_root}/v1/ship/products/{product_id}/users/{user_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:product

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |
| user\_id | String | 外部用户的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 外部用户的id。 |
| url | String | 外部用户的资源地址。 |
| name | String | 外部用户的名称。 |
| display\_name | String | 外部用户的显示名称。 |
| avatar | String | 外部用户的头像。 |
| email | String | 外部用户的邮箱地址。 |
| mobile | String | 外部用户的手机号。 |
| product | Object | 外部用户关联产品的引用结构数据。 |
| customer | Object | 外部用户所属客户的引用结构数据。 |

```json
{
    "id": "64a2b61c3a12e6c2e46d41e9",
    "url": "https://{rest_api_root}/v1/ship/products/64a2b61c3a12e6c2e46d41e9/users/64a2b61c3a12e6c2e46d41e9",
    "name": "jack",
    "display_name": "Jack",
    "avatar": "https://s3.amazonaws.com/bucket/a46ef40c-e21e-48cf-a579-cace9fba839a_160x160.png",
    "email": "jack@email.com",
    "mobile": null,
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "customer": {
        "id": "64dd899e3f6383ba72ec2a01",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/64dd899e3f6383ba72ec2a01",
        "name": "深圳XX新零售有限公司"
    }
}
```

工单

创建一个工单

用于创建一个工单。

```html
https://{rest_api_root}/v1/ship/tickets
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:ticket

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 工单的产品id。 |
| title | String | 工单的标题，最大长度为255。 |
| type\_id | String | 工单的类型id，您可以在 “获取工单类型列表” API获取。 |
| description 可选 | String | 工单的描述。 |
| submitter\_id 可选 | String | 工单的提交人id，企业授权时，该值有效；个人鉴权时，指定无效。 |
| customer\_id 可选 | String | 工单的客户id，您可以在 “获取产品客户列表” API获取。 |
| channel\_id 可选 | String | 工单的渠道id，您可以在 “获取渠道列表” API获取。 |
| assignee\_id 可选 | String | 工单的负责人id。 |
| priority\_id 可选 | String | 工单的优先级id，您可以在 “获取工单优先级列表” API获取。 |
| properties 可选 | Object | 工单的自定义属性。 |
| properties.prop\_a 可选 | Object | 工单的自定义属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 工单的自定义属性 `prop_b` 。 |

```json
{
    "product_id": "6422711c3f12e6c1e46d40e9",
    "title": "希望新增支持第三方账号注册",
    "type_id": "63eca880a0a13a3efc8d49e0",
    "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
    "submitter_id": "a0417f68e846aae315c85d24643678a9",
    "customer_id": "63eca881a0a13a3efc8d49fc",
    "channel_id": "64550d9ec696b249b5fc607d",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "priority_id": "5cb9466afda1ce4ca0090004",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单的id。 |
| url | String | 工单的资源地址。 |
| product | Object | 工单的所属产品。 |
| identifier | String | 工单的标识。 |
| title | String | 工单的标题。 |
| short\_id | String | 工单的短id。 |
| html\_url | String | 工单的html地址。 |
| assignee | Object | 工单的负责人。 |
| state | Object | 工单的状态。 |
| type | Object | 工单的类型。 |
| customer | Object | 工单的客户。 |
| solution | Object | 工单的解决方案。 |
| priority | Object | 工单的优先级。 |
| channel | Object/String | 工单的渠道。外部渠道提交的工单的渠道是Object类型，内部工单的渠道是 `internal` 字符串。 |
| description | String | 工单的描述。 |
| properties | Object | 工单的自定义属性。 |
| estimated\_at | Object | 工单的预计时间。 |
| tags | Object\[\] | 工单的标签列表。 |
| participants | Object\[\] | 工单的关注人列表。 |
| submitted\_at | Number | 工单的提交时间。 |
| submitted\_by | Object | 工单的提交人。 |
| completed\_at | Number | 工单的完成时间。 |
| completed\_by | Object | 工单的完成人。 |
| created\_at | Number | 工单的创建时间。 |
| created\_by | Object | 工单的创建人。 |
| updated\_at | Number | 工单的更新时间。 |
| updated\_by | Object | 工单的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63eca888a0a13a3efc8d4a43",
    "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SLC-T1",
    "title": "希望新增支持第三方账号注册",
    "short_id": "pdMUgQzZ",
    "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "state": {
        "id": "63eca880a0a13a3efc8d49d9",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63eca880a0a13a3efc8d49d9",
        "name": "待处理",
        "type": "pending"
    },
    "type": {
        "id": "63eca880a0a13a3efc8d49e0",
        "url": "https://{rest_api_root}/v1/ship/ticket_types/63eca880a0a13a3efc8d49e0",
        "name": "需求"
    },
    "customer": {
        "id": "63eca881a0a13a3efc8d49fc",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/63eca881a0a13a3efc8d49fc",
        "name": "北京XX科技有限公司"
    },
    "solution": {
        "id": "62f217ae16e3661a20124330",
        "url": "https://{rest_api_root}/v1/ship/ticket_solutions/62f217ae16e3661a20124330",
        "name": "进入需求池"
    },
    "priority": {
        "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090004",
        "id": "5cb9466afda1ce4ca0090004",
        "name": "P1"
    },
    "channel": {
        "id": "64550d9ec696b249b5fc607d",
        "url": "https://{rest_api_root}/v1/ship/channels/64550d9ec696b249b5fc607d",
        "name": "channel-1"
    },
    "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "estimated_at": null,
    "tags": [],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "submitted_at": 1676454024,
    "submitted_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "completed_at": 1689579131,
    "completed_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1676454024,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1676454024,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个工单

用于查看一个工单。

```html
https://{rest_api_root}/v1/ship/tickets/{ticket_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_id | String | 工单的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单的id。 |
| url | String | 工单的资源地址。 |
| product | Object | 工单的所属产品。 |
| identifier | String | 工单的标识。 |
| title | String | 工单的标题。 |
| short\_id | String | 工单的短id。 |
| html\_url | String | 工单的html地址。 |
| assignee | Object | 工单的负责人。 |
| state | Object | 工单的状态。 |
| type | Object | 工单的类型。 |
| customer | Object | 工单的客户。 |
| solution | Object | 工单的解决方案。 |
| priority | Object | 工单的优先级。 |
| channel | Object/String | 工单的渠道。外部渠道提交的工单的渠道是Object类型，内部工单的渠道是 `internal` 字符串。 |
| description | String | 工单的描述。 |
| properties | Object | 工单的自定义属性。 |
| properties.prop\_a | Object | 工单的自定义属性prop\_a。 |
| properties.prop\_b | Object | 工单的自定义属性prop\_b。 |
| estimated\_at | Object | 工单的预计时间。 |
| estimated\_at.from | Number | 预计时间的开始时间。 |
| estimated\_at.to | Number | 预计时间的结束时间。 |
| estimated\_at.granularity | String | 预计时间的周期单位。  允许值: `year`, `quarter`, `month`, `day` |
| tags | Object\[\] | 工单的标签列表。 |
| participants | Object\[\] | 工单的关注人列表。 |
| public\_image\_token | String | 工单描述和自定义多行文本类型属性里获取图片资源token。获取一个工单和获取工单列表参数 `include_public_image_token` 值有效时返回。 |
| submitted\_at | Number | 工单的提交时间。 |
| submitted\_by | Object | 工单的提交人。 |
| completed\_at | Number | 工单的完成时间。 |
| completed\_by | Object | 工单的完成人。 |
| created\_at | Number | 工单的创建时间。 |
| created\_by | Object | 工单的创建人。 |
| updated\_at | Number | 工单的更新时间。 |
| updated\_by | Object | 工单的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63eca888a0a13a3efc8d4a43",
    "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SLC-T1",
    "title": "希望新增支持第三方账号注册",
    "short_id": "pdMUgQzZ",
    "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "state": {
        "id": "63eca880a0a13a3efc8d49d9",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63eca880a0a13a3efc8d49d9",
        "name": "待处理",
        "type": "pending"
    },
    "estimated_at": {
        "from": 1701619200,
        "to": 1702742399,
        "granularity": "day"
    },
    "type": {
        "id": "63eca880a0a13a3efc8d49e0",
        "url": "https://{rest_api_root}/v1/ship/ticket_types/63eca880a0a13a3efc8d49e0",
        "name": "需求"
    },
    "customer": {
        "id": "63eca881a0a13a3efc8d49fc",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/63eca881a0a13a3efc8d49fc",
        "name": "北京XX科技有限公司"
    },
    "solution": {
        "id": "62f217ae16e3661a20124330",
        "url": "https://{rest_api_root}/v1/ship/ticket_solutions/62f217ae16e3661a20124330",
        "name": "进入需求池"
    },
    "priority": {
        "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090004",
        "id": "5cb9466afda1ce4ca0090004",
        "name": "P1"
    },
    "channel": {
        "id": "64550d9ec696b249b5fc607d",
        "url": "https://{rest_api_root}/v1/ship/channels/64550d9ec696b249b5fc607d",
        "name": "channel-1"
    },
    "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "tags": [
        {
            "id": "63eca881a0a13a3efc8d49f1",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/tags/63eca881a0a13a3efc8d49f1",
            "name": "已确认"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "public_image_token": "N96GlJ4AMQoBCw9pZQ2EMl-AprLN_V_DYlghupBNkJA",
    "submitted_at": 1676454024,
    "submitted_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "completed_at": 1689579131,
    "completed_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1676454024,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1676454024,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个工单

用于部分更新一个工单。

```html
https://{rest_api_root}/v1/ship/tickets/{ticket_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:ticket

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_id | String | 工单id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title 可选 | String | 工单的标题，最大长度为255。 |
| description 可选 | String | 工单的描述。 |
| type\_id 可选 | String | 工单的类型id，您可以在 “获取工单类型列表” API获取。 |
| state\_id 可选 | String | 工单的状态id，您可以在 “获取工单状态列表” API获取。 |
| assignee\_id 可选 | String | 工单的负责人id。 |
| submitter\_id 可选 | String | 工单的提交人id，企业授权时，该值有效；个人鉴权时，指定无效。 |
| solution\_id 可选 | String | 工单的解决方案id，您可以在 “获取工单解决方案列表” API获取。 |
| priority\_id 可选 | String | 工单的优先级id，您可以在 “获取工单优先级列表” API获取。 |
| customer\_id 可选 | String | 工单的客户id，您可以在 “获取产品客户列表” API获取。 |
| properties 可选 | Object | 工单的自定义属性。 |
| properties.prop\_a 可选 | Object | 工单的自定义属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 工单的自定义属性 `prop_b` 。 |

```json
{
    "title": "希望新增支持第三方账号注册",
    "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
    "type_id": "63eca880a0a13a3efc8d49e0",
    "state_id": "63eca880a0a13a3efc8d49e0",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "submitter_id": "a0417f68e846aae315c85d24643678a9",
    "solution_id": "62f217ae16e3661a20124330",
    "priority_id": "5cb9466afda1ce4ca0090004",
    "customer_id": "63eca881a0a13a3efc8d49fc",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单的id。 |
| url | String | 工单的资源地址。 |
| product | Object | 工单的所属产品。 |
| identifier | String | 工单的标识。 |
| title | String | 工单的标题。 |
| short\_id | String | 工单的短id。 |
| html\_url | String | 工单的html地址。 |
| assignee | Object | 工单的负责人。 |
| state | Object | 工单的状态。 |
| type | Object | 工单的类型。 |
| customer | Object | 工单的客户。 |
| solution | Object | 工单的解决方案。 |
| priority | Object | 工单的优先级。 |
| channel | Object/String | 工单的渠道。外部渠道提交的工单的渠道是Object类型，内部工单的渠道是 `internal` 字符串。 |
| description | String | 工单的描述。 |
| properties | Object | 工单的自定义属性。 |
| estimated\_at | Object | 工单的预计时间。 |
| tags | Object\[\] | 工单的标签列表。 |
| participants | Object\[\] | 工单的关注人列表。 |
| submitted\_at | Number | 工单的提交时间。 |
| submitted\_by | Object | 工单的提交人。 |
| completed\_at | Number | 工单的完成时间。 |
| completed\_by | Object | 工单的完成人。 |
| created\_at | Number | 工单的创建时间。 |
| created\_by | Object | 工单的创建人。 |
| updated\_at | Number | 工单的更新时间。 |
| updated\_by | Object | 工单的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63eca888a0a13a3efc8d4a43",
    "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SLC-T1",
    "title": "希望新增支持第三方账号注册",
    "short_id": "pdMUgQzZ",
    "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "state": {
        "id": "63eca880a0a13a3efc8d49d9",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63eca880a0a13a3efc8d49d9",
        "name": "待处理",
        "type": "pending"
    },
    "estimated_at": {
        "from": 1701619200,
        "to": 1702742399,
        "granularity": "day"
    },
    "type": {
        "id": "63eca880a0a13a3efc8d49e0",
        "url": "https://{rest_api_root}/v1/ship/ticket_types/63eca880a0a13a3efc8d49e0",
        "name": "需求"
    },
    "customer": {
        "id": "63eca881a0a13a3efc8d49fc",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/63eca881a0a13a3efc8d49fc",
        "name": "北京XX科技有限公司"
    },
    "solution": {
        "id": "62f217ae16e3661a20124330",
        "url": "https://{rest_api_root}/v1/ship/ticket_solutions/62f217ae16e3661a20124330",
        "name": "进入需求池"
    },
    "priority": {
        "id": "5cb9466afda1ce4ca0090004",
        "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090004",
        "name": "P1"
    },
    "channel": {
        "id": "64550d9ec696b249b5fc607d",
        "url": "https://{rest_api_root}/v1/ship/channels/64550d9ec696b249b5fc607d",
        "name": "channel-1"
    },
    "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "tags": [],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "submitted_at": 1676454024,
    "submitted_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "completed_at": 1689579131,
    "completed_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1676454024,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1676455024,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取工单列表

用于简单查询工单列表。  
更复杂的组合过滤、日期过滤、自定义属性过滤等场景，请使用「搜索工单列表」接口。

```html
https://{rest_api_root}/v1/ship/tickets
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id 可选 | String | 产品的 id。 |
| type\_id 可选 | String | 工单类型的 id。 |
| state\_id 可选 | String | 工单状态的 id。 |
| priority\_id 可选 | String | 工单优先级的 id。 |
| keywords 可选 | String | 关键字。支持工单编号和工单标题。 |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca888a0a13a3efc8d4a43",
            "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SLC-T1",
            "title": "希望新增支持第三方账号注册",
            "short_id": "pdMUgQzZ",
            "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "state": {
                "id": "63eca880a0a13a3efc8d49d9",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63eca880a0a13a3efc8d49d9",
                "name": "待处理",
                "type": "pending"
            },
            "estimated_at": {
                "from": 1701619200,
                "to": 1702742399,
                "granularity": "day"
            },
            "type": {
                "id": "63eca880a0a13a3efc8d49e0",
                "url": "https://{rest_api_root}/v1/ship/ticket_types/63eca880a0a13a3efc8d49e0",
                "name": "需求"
            },
            "customer": {
                "id": "63eca881a0a13a3efc8d49fc",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/63eca881a0a13a3efc8d49fc",
                "name": "北京XX科技有限公司"
            },
            "solution": {
                "id": "62f217ae16e3661a20124330",
                "url": "https://{rest_api_root}/v1/ship/ticket_solutions/62f217ae16e3661a20124330",
                "name": "进入需求池"
            },
            "priority": {
                "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090004",
                "id": "5cb9466afda1ce4ca0090004",
                "name": "P1"
            },
            "channel": {
                "id": "64550d9ec696b249b5fc607d",
                "url": "https://{rest_api_root}/v1/ship/channels/64550d9ec696b249b5fc607d",
                "name": "channel-1"
            },
            "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "tags": [
                {
                    "id": "63eca881a0a13a3efc8d49f1",
                    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/tags/63eca881a0a13a3efc8d49f1",
                    "name": "已确认"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                },
                {
                    "id": "63c8fb32729dee3334d96af7",
                    "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
                    "type": "user_group",
                    "user_group": {
                        "id": "63c8fb32729dee3334d96af7",
                        "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                        "name": "Open Team"
                    }
                }
            ],
            "public_image_token": "N96GlJ4AMQoBCw9pZQ2EMl-AprLN_V_DYlghupBNkJA",
            "submitted_at": 1676454024,
            "submitted_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "completed_at": 1689579131,
            "completed_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "created_at": 1676454024,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1676454024,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

搜索工单列表

用于按条件搜索工单列表。

```html
https://{rest_api_root}/v1/ship/tickets/search
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

Body

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| mode | String | 搜索模式。 `query` 表示基于 `payload.filter` 的结构化条件查询。  允许值: `query` |
| payload | Object | 搜索参数。 |
| payload.filter 可选 | Object | 过滤条件。   过滤时使用类 MongoDB 的查询语法，可通过属性名、操作符和对应值进行过滤。   引用类型（含数组引用类型）使用 `{属性名}.id` 作为属性名，例如 `product.id` 、 `tags.id` 、 `participants.id` 。   自定义属性使用 `properties.{属性key}` 作为属性名，例如 `properties.prop_a` 。   文本类型（如 `title` 、 `description` ，以及自定义单行文本、多行文本、链接类型）的操作符： `exists` 、 `contains` 。   数字类型（自定义数字、进度、评分类型）的操作符： `exists` 、 `eq` 、 `ne` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 。   时间类型（如 `submitted_at` 、 `created_at` 、 `updated_at` 、 `completed_at` ，以及自定义日期）的操作符： `exists` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 、 `between` （值为 `[起始时间戳, 结束时间戳]` ；过滤时以「天」为单位。   选项类型（自定义下拉单选、下拉多选、级联单选、级联多选）的操作符： `exists` 、 `in` 、 `nin` 。   引用类型（如 `product.id` 、 `type.id` 、 `state.id` 、 `priority.id` 、 `assignee.id` 、 `submitted_by.id` 、 `customer.id` 、 `solution.id` 、 `channel.id` 、 `tags.id` 、 `participants.id` ）的操作符： `exists` 、 `in` 、 `nin` 。   每个属性仅支持一个操作符。   暂不支持使用逻辑运算符。   内置属性暂不支持过滤： `id` 、 `url` 、 `identifier` 、 `short_id` 、 `html_url` 、 `public_image_token` 、 `estimated_at` 、 `is_archived` 、 `is_deleted` 。 |
| payload.keywords 可选 | String | 关键字。支持工单编号和工单标题。 |
| payload.include\_public\_image\_token 可选 | String | 包含获取图片资源 token 的属性。使用 `,` 分割，最多 32 个，支持 `description` 和自定义多行文本类型的属性。 |
| payload.page\_size 可选 | Number | 每页条数，取值范围 1-100。  默认值: `30` |
| payload.page\_index 可选 | Number | 页码，从 0 开始。  默认值: `0` |

```json
{
    "mode": "query",
    "payload": {
        "filter": {
            "title": {
                "contains": "注册"
            },
            "assignee.id": {
                "nin": [
                    "315c85d24643678a9a0417f68e846aae"
                ]
            },
            "product.id": {
                "in": [
                    "6422711c3f12e6c1e46d40e9"
                ]
            },
            "tags.id": {
                "in": [
                    "63eca881a0a13a3efc8d49f1"
                ]
            },
            "participants.id": {
                "in": [
                    "a0417f68e846aae315c85d24643678a9"
                ]
            },
            "created_at": {
                "gte": 1730000000
            }
        },
        "keywords": "SLC-T1",
        "include_public_image_token": "description",
        "page_size": 10,
        "page_index": 0
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单全量结构数据的数组。 |

```json
{
    "page_size": 10,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca888a0a13a3efc8d4a43",
            "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SLC-T1",
            "title": "希望新增支持第三方账号注册",
            "short_id": "pdMUgQzZ",
            "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "state": {
                "id": "63eca880a0a13a3efc8d49d9",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63eca880a0a13a3efc8d49d9",
                "name": "待处理",
                "type": "pending"
            },
            "estimated_at": {
                "from": 1701619200,
                "to": 1702742399,
                "granularity": "day"
            },
            "type": {
                "id": "63eca880a0a13a3efc8d49e0",
                "url": "https://{rest_api_root}/v1/ship/ticket_types/63eca880a0a13a3efc8d49e0",
                "name": "需求"
            },
            "customer": {
                "id": "63eca881a0a13a3efc8d49fc",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/customers/63eca881a0a13a3efc8d49fc",
                "name": "北京XX科技有限公司"
            },
            "solution": {
                "id": "62f217ae16e3661a20124330",
                "url": "https://{rest_api_root}/v1/ship/ticket_solutions/62f217ae16e3661a20124330",
                "name": "进入需求池"
            },
            "priority": {
                "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090004",
                "id": "5cb9466afda1ce4ca0090004",
                "name": "P1"
            },
            "channel": {
                "id": "64550d9ec696b249b5fc607d",
                "url": "https://{rest_api_root}/v1/ship/channels/64550d9ec696b249b5fc607d",
                "name": "channel-1"
            },
            "description": "<p>希望支持其他更多第三方平台的账号注册，以便用第三方账号登录找回更换了手机号的账号，保障账号安全</p>",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "tags": [
                {
                    "id": "63eca881a0a13a3efc8d49f1",
                    "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/tags/63eca881a0a13a3efc8d49f1",
                    "name": "已确认"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                },
                {
                    "id": "63c8fb32729dee3334d96af7",
                    "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=ticket&principal_id=63eca888a0a13a3efc8d4a43",
                    "type": "user_group",
                    "user_group": {
                        "id": "63c8fb32729dee3334d96af7",
                        "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                        "name": "Open Team"
                    }
                }
            ],
            "public_image_token": "N96GlJ4AMQoBCw9pZQ2EMl-AprLN_V_DYlghupBNkJA",
            "submitted_at": 1676454024,
            "submitted_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "completed_at": 1689579131,
            "completed_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "created_at": 1676454024,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1676454024,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

获取工单类型列表

用于查询工单类型列表。

```html
https://{rest_api_root}/v1/ship/ticket/types?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单类型的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744214bd13c9def24ca9",
            "url": "https://{rest_api_root}/v1/ship/ticket_types/63bb744214bd13c9def24ca9",
            "name": "需求"
        }
    ]
}
```

获取工单状态列表

用于查询工单状态列表。

```html
https://{rest_api_root}/v1/ship/ticket/states?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单状态全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40f2",
            "url": "https://{rest_api_root}/v1/ship/ticket_states/6422711c3f12e6c1e46d40f2",
            "name": "处理中",
            "type": "pending",
            "color": "#56ABFB"
        }
    ]
}
```

获取工单属性列表

用于查询工单属性列表。

```html
https://{rest_api_root}/v1/ship/ticket/properties?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "solution",
            "url": "https://{rest_api_root}/v1/ship/ticket_properties/solution",
            "name": "解决方案",
            "type": "select",
            "options": [
                {
                    "_id": "6422711c3f12e6c1e46d40e9",
                    "text": "进入需求池"
                }
            ]
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/ship/ticket_properties/identifier",
            "name": "编号",
            "type": "text",
            "options": null
        }
    ]
}
```

获取工单渠道列表

用于查询工单渠道列表。

```html
https://{rest_api_root}/v1/ship/ticket/channels?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单渠道全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca881a0a13a3efc8d49ed",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/channels/63eca881a0a13a3efc8d49ed",
            "name": "客户反馈Web渠道"
        }
    ]
}
```

获取工单优先级列表

用于查询工单优先级列表。

```html
https://{rest_api_root}/v1/ship/ticket/priorities?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单优先级全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cb9466afda1ce4ca0090005",
            "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090005",
            "name": "P0"
        }
    ]
}
```

获取工单解决方案列表

用于查询工单解决方案列表。

```html
https://{rest_api_root}/v1/ship/ticket/solutions?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单解决方案全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40e9",
            "url": "https://{rest_api_root}/v1/ship/ticket_solutions/6422711c3f12e6c1e46d40e9",
            "name": "进入需求池"
        }
    ]
}
```

获取工单标签列表

用于查询工单标签列表。

```html
https://{rest_api_root}/v1/ship/ticket/tags?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单标签全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63eca881a0a13a3efc8d49f0",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/tags/63eca881a0a13a3efc8d49f0",
            "name": "标签-1",
            "color": "#56ABFB"
        }
    ]
}
```

获取一条工单流转记录

用于查看一条工单流转记录。

```html
https://{rest_api_root}/v1/ship/tickets/{ticket_id}/transition_histories/{transition_history_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_id | String | 工单的id。 |
| transition\_history\_id | String | 工单流转记录的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单流转记录的id。 |
| url | String | 工单流转记录的资源地址。 |
| ticket | Object | 工单的引用结构数据。 |
| from\_state | Object | 流转前工单状态的引用结构数据。 |
| to\_state | Object | 流转后工单状态的引用结构数据。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |

```json
{
    "id": "64c3676c983bb9481ee1eea5",
    "url": "https://{rest_api_root}/v1/ship/tickets/5edca524cad2fa1125cb0630/transition_histories/64c3676c983bb9481ee1eea5",
    "ticket": {
        "id": "63eca888a0a13a3efc8d4a43",
        "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
        "identifier": "SLC-T1",
        "title": "希望新增支持第三方账号注册",
        "short_id": "pdMUgQzZ",
        "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ"
    },
    "from_state": null,
    "to_state": {
        "id": "63e1bf51898a0be5a2d21b29",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63e1bf51898a0be5a2d21b29",
        "name": "待处理",
        "type": "pending"
    },
    "created_at": 1674528614,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取工单流转记录列表

用于查询工单流转记录列表。

```html
https://{rest_api_root}/v1/ship/tickets/{ticket_id}/transition_histories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:ticket

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_id | String | 工单的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单流转记录全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "64c3676c983bb9481ee1eea5",
            "url": "https://{rest_api_root}/v1/ship/tickets/5edca524cad2fa1125cb0630/transition_histories/64c3676c983bb9481ee1eea5",
            "ticket": {
                "id": "63eca888a0a13a3efc8d4a43",
                "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
                "identifier": "SLC-T1",
                "title": "希望新增支持第三方账号注册",
                "short_id": "pdMUgQzZ",
                "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ"
            },
            "from_state": null,
            "to_state": {
                "id": "63e1bf51898a0be5a2d21b29",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63e1bf51898a0be5a2d21b29",
                "name": "待处理",
                "type": "pending"
            },
            "created_at": 1674528614,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "658bdb79e5839f556562accf",
            "url": "https://{rest_api_root}/v1/ship/tickets/5edca524cad2fa1125cb0630/transition_histories/658bdb79e5839f556562accf",
            "ticket": {
                "id": "63eca888a0a13a3efc8d4a43",
                "url": "https://{rest_api_root}/v1/ship/tickets/63eca888a0a13a3efc8d4a43",
                "identifier": "SLC-T1",
                "title": "希望新增支持第三方账号注册",
                "short_id": "pdMUgQzZ",
                "html_url": "https://yctech.pingcode.com/ship/tickets/pdMUgQzZ"
            },
            "from_state": {
                "id": "63e1bf51898a0be5a2d21b29",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63e1bf51898a0be5a2d21b29",
                "name": "待处理",
                "type": "pending"
            },
            "to_state": {
                "id": "63e1bf51898a0be5a2d21b2b",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63e1bf51898a0be5a2d21b2b",
                "name": "处理中",
                "type": "in_progress"
            },
            "created_at": 1674528614,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

需求

创建一个需求

用于创建一个需求。

```html
https://{rest_api_root}/v1/ship/ideas
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:idea

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 需求的产品id。 |
| title | String | 需求的标题，最大长度为255。 |
| assignee\_id 可选 | String | 需求负责人的id。 |
| description 可选 | String | 需求的描述。 |
| suite\_id 可选 | String | 需求的产品模块id。 |
| priority\_id 可选 | String | 需求优先级的id，您可以在 `获取需求优先级列表` API获取。 |
| properties 可选 | Object | 需求属性的键值对集合。要注意的是，当前产品的需求属性视图需要包含这些需求属性，例如需求属性视图中包含 `prop_a` 和 `prop_b` 。 |
| properties.prop\_a 可选 | Object | 需求项属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 需求项属性 `prop_b` 。 |

```json
{
    "product_id": "6422711c3f12e6c1e46d40e9",
    "title": "示例需求",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "description": "这是一段描述",
    "suite_id": "63bb744414bd13c9def24ce4",
    "priority_id": "5cb9466afda1ce4ca0090005",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

```json
{
    "id": "64b4d70ba368e6594360ea24",
    "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "http://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SLC-1",
    "title": "示例需求",
    "short_id": "Ogf1EYey",
    "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey"
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "state": {
        "id": "63e1bf51898a0be5a2d21b2a",
        "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
        "name": "待评审",
        "type": "pending"
    },
    "priority": {
        "id": "5cb9466afda1ce4ca0090001",
        "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090001",
        "name": "P4"
    },
    "plan": null,
    "suite": {
        "id": "63bb744414bd13c9def24ce4",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/suites/63bb744414bd13c9def24ce4",
        "name": "需求模块",
        "type": "module"
     },
    "plan_at": null,
    "real_at": null,
    "score": 0,
    "progress": 0,
    "description": "这是一段描述",
    "properties": {
        "backlog_from": "5cb7e6e2fda1ce4ca0000001",
        "backlog_type": "5cb7e763fda1ce4ca0010002",
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "completed_at": null,
    "completed_by": null,
    "created_at": 1689573131,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1689573131,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个需求

用于查看一个需求。

```html
https://{rest_api_root}/v1/ship/ideas/{idea_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| idea\_id | String | 需求的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.xxx` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求的id。 |
| url | String | 需求的资源地址。 |
| product | Object | 需求的所属产品。 |
| identifier | String | 需求的标识。 |
| title | String | 需求的标题。 |
| short\_id | String | 需求的短id。 |
| html\_url | String | 需求的html地址。 |
| assignee | Object | 需求的负责人。 |
| state | Object | 需求的状态。 |
| priority | Object | 需求的优先级。 |
| plan | Object | 需求的计划。 |
| suite | Object | 需求的模块。 |
| plan\_at | Object | 需求的计划时间范围。 |
| plan\_at.from | Number | 需求的计划开始时间。 |
| plan\_at.to | Number | 需求的计划结束时间。 |
| plan\_at.granularity | String | 需求的计划时间周期单位。  允许值: `year`, `quarter`, `month`, `day` |
| real\_at | Object | 需求的实际时间范围。 |
| real\_at.from | Number | 需求的实际开始时间。 |
| real\_at.to | Number | 需求的实际结束时间。 |
| real\_at.granularity | String | 需求的计划时间周期单位。  允许值: `year`, `quarter`, `month`, `day` |
| score | Number | 需求的分数。 |
| progress | Number | 需求的进度。 |
| description | String | 需求的描述。 |
| properties | Object | 需求的自定义属性。 |
| properties.prop\_a | Object | 需求的自定义属性prop\_a。 |
| properties.prop\_b | Object | 需求的自定义属性prop\_b。 |
| participants | Object\[\] | 需求的关注人列表。 |
| public\_image\_token | String | 需求描述和自定义多行文本类型属性里获取图片资源token。获取一个需求和获取需求列表参数 `include_public_image_token` 值有效时返回。 |
| completed\_at | Number | 需求的完成时间。 |
| completed\_by | Object | 需求的完成人。 |
| created\_at | Number | 需求的创建时间。 |
| created\_by | Object | 需求的创建人。 |
| updated\_at | Number | 需求的更新时间。 |
| updated\_by | Object | 需求的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "64b4d70ba368e6594360ea24",
    "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "http://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SLC-1",
    "title": "示例需求",
    "short_id": "Ogf1EYey",
    "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "state": {
        "id": "63e1bf51898a0be5a2d21b2a",
        "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
        "name": "待评审",
        "type": "pending"
    },
    "priority": {
        "id": "5cb9466afda1ce4ca0090005",
        "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
        "name": "P0"
    },
    "plan": {
        "id": "63bb744414bd13c9def24ce4",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/plans/63bb744414bd13c9def24ce4",
        "name": "账号管理"
    },
    "suite": {
        "id": "63bb744414bd13c9def24ce4",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/suites/63bb744414bd13c9def24ce4",
        "name": "需求模块",
        "type": "module"
    },
    "plan_at": {
        "from": 1690732800,
        "to": 1691337599,
        "granularity": "day"
    },
    "real_at": {
        "from": 1690732800,
        "to": 1691337599,
        "granularity": "day"
    },
    "score": 0,
    "progress": 0.6,
    "description": "这是一段描述",
    "properties": {
        "backlog_from": "5cb7e6e2fda1ce4ca0000001",
        "backlog_type": "5cb7e763fda1ce4ca0010002"
    },
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "public_image_token": "-fkvANQ2dcVECK6Xg45L3kG8VCbOTK8NrNckGkxljQD",
    "completed_at": 1689579131,
    "completed_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1689573131,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1689579131,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个需求

用于部分更新一个需求。

```html
https://{rest_api_root}/v1/ship/ideas/{idea_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:idea

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| idea\_id | String | 需求id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title 可选 | String | 需求的标题，最大长度为255。 |
| description 可选 | String | 需求的描述。 |
| state\_id 可选 | String | 需求状态的id，您可以在 `获取需求状态列表` API获取。 |
| priority\_id 可选 | String | 需求优先级的id，您可以在 `获取需求优先级列表` API获取。 |
| assignee\_id 可选 | String | 需求负责人的id。 |
| progress 可选 | Number | 需求的进度，取值范围为：0到1的两位小数。 |
| plan\_at 可选 | Object | 需求的计划时间。plan\_at是整体更新的，其中包含 `from` 、 `to` 、 `granularity` 三个属性，均为必填。 |
| plan\_at.from | Number | 需求的计划开始时间。为秒级时间戳。 |
| plan\_at.to | Number | 需求的计划结束时间。为秒级时间戳。 |
| plan\_at.granularity | String | 需求的计划时间周期单位。  允许值: `year`, `quarter`, `month`, `day` |
| real\_at 可选 | Object | 需求的实际时间，参数格式同 `plan_at` 。 |
| plan\_id 可选 | String | 产品排期的id，您可以在 `获取产品排期列表` API获取。 |
| suite\_id 可选 | String | 产品模块的id，您可以在 `获取产品模块列表` API获取。 |
| properties 可选 | Object | 需求的自定义属性。 |
| properties.prop\_a 可选 | Object | 需求的自定义属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 需求的自定义属性 `prop_b` 。 |

```json
{
    "title": "示例需求",
    "description": "这是一段描述",
    "state_id": "63e1bf51898a0be5a2d21b2a",
    "priority_id": "5cb9466afda1ce4ca0090005",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "progress": 0.88,
    "plan_at": {
        "from": 1690732800,
        "to": 1691337599,
        "granularity": "day"
    },
    "real_at": {
        "from": 1690732800,
        "to": 1691337599,
        "granularity": "day"
    },
    "plan_id": "63bb744414bd13c9def24ce4",
    "suite_id": "63bb744414bd13c9def24ce4",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

```json
{
    "id": "64b4d70ba368e6594360ea24",
    "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "http://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SLC-1",
    "title": "示例需求",
    "short_id": "Ogf1EYey",
    "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "state": {
        "id": "63e1bf51898a0be5a2d21b2a",
        "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
        "name": "待评审",
        "type": "pending"
    },
    "priority": {
        "id": "5cb9466afda1ce4ca0090005",
        "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
        "name": "P0"
    },
    "plan": {
        "id": "63bb744414bd13c9def24ce4",
        "url": "http://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/plans/63bb744414bd13c9def24ce4",
        "name": "账号管理"
    },
    "suite": {
        "id": "63bb744414bd13c9def24ce4",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/suites/63bb744414bd13c9def24ce4",
        "name": "需求模块",
        "type": "module"
    },
    "plan_at": {
        "from": 1690732800,
        "to": 1691337599,
        "granularity": "day"
    },
    "real_at": {
        "from": 1690732800,
        "to": 1691337599,
        "granularity": "day"
    },
    "score": 0,
    "progress": 0.88,
    "description": "这是一段描述",
    "properties": {
        "backlog_from": "5cb7e6e2fda1ce4ca0000001",
        "backlog_type": "5cb7e763fda1ce4ca0010002",
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "completed_at": 1689578888,
    "completed_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "created_at": 1689573131,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1689578888,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取需求列表

用于简单查询需求列表。  
更复杂的组合过滤、日期过滤、自定义属性过滤等场景，请使用「搜索需求列表」接口。

```html
https://{rest_api_root}/v1/ship/ideas
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id 可选 | String | 产品的 id。 |
| state\_id 可选 | String | 需求状态的 id。 |
| priority\_id 可选 | String | 需求优先级的 id。 |
| keywords 可选 | String | 关键字。支持需求编号和需求标题。 |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "64b4d70ba368e6594360ea24",
            "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "http://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SLC-1",
            "title": "示例需求",
            "short_id": "Ogf1EYey",
            "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "state": {
                "id": "63e1bf51898a0be5a2d21b2a",
                "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
                "name": "待评审",
                "type": "pending"
            },
            "priority": {
                "id": "5cb9466afda1ce4ca0090005",
                "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
                "name": "P0"
            },
            "plan": {
                "id": "63bb744414bd13c9def24ce4",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/plans/63bb744414bd13c9def24ce4",
                "name": "账号管理"
            },
            "suite": {
                "id": "63bb744414bd13c9def24ce4",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/suites/63bb744414bd13c9def24ce4",
                "name": "需求模块",
                "type": "module"
            },
            "plan_at": {
                "from": 1690732800,
                "to": 1691337599,
                "granularity": "day"
            },
            "real_at": {
                "from": 1690732800,
                "to": 1691337599,
                "granularity": "day"
            },
            "score": 0,
            "progress": 0.6,
            "description": "这是一段描述",
            "properties": {
                "backlog_from": "5cb7e6e2fda1ce4ca0000001",
                "backlog_type": "5cb7e763fda1ce4ca0010002"
            },
            "public_image_token": "-fkvANQ2dcVECK6Xg45L3kG8VCbOTK8NrNckGkxljQd",
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                },
                {
                    "id": "63c8fb32729dee3334d96af7",
                    "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
                    "type": "user_group",
                    "user_group": {
                        "id": "63c8fb32729dee3334d96af7",
                        "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                        "name": "Open Team"
                    }
                }
            ],
            "completed_at": 1689573131,
            "completed_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "created_at": 1689573131,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1689579131,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

搜索需求列表

用于按条件搜索需求列表。

```html
https://{rest_api_root}/v1/ship/ideas/search
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

Body

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| mode | String | 搜索模式。 `query` 表示基于 `payload.filter` 的结构化条件查询。  允许值: `query` |
| payload | Object | 搜索参数。 |
| payload.filter 可选 | Object | 过滤条件。   过滤时使用类 MongoDB 的查询语法，可通过属性名、操作符和对应值进行过滤。   引用类型（含数组引用类型）使用 `{属性名}.id` 作为属性名，例如 `product.id` 、 `tags.id` 、 `participants.id` 。   自定义属性使用 `properties.{属性key}` 作为属性名，例如 `properties.prop_a` 。   文本类型（如 `title` 、 `description` ，以及自定义单行文本、多行文本、链接类型）的操作符： `exists` 、 `contains` 。   数字类型（如 `score` 、 `effort` 、 `progress` ）的操作符： `exists` 、 `eq` 、 `ne` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 。   时间类型（如 `created_at` 、 `updated_at` 、 `completed_at` 、以及自定义日期）的操作符： `exists` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 、 `between` （值为 `[起始时间戳, 结束时间戳]` ；过滤时以「天」为单位。   选项类型（自定义下拉单选、下拉多选、级联单选、级联多选）的操作符： `exists` 、 `in` 、 `nin` 。   引用类型（如 `product.id` 、 `state.id` 、 `priority.id` 、 `assignee.id` 、 `tags.id` ）的操作符： `exists` 、 `in` 、 `nin` 。   每个属性仅支持一个操作符。   暂不支持使用逻辑运算符。   内置属性暂不支持过滤： `id` 、 `url` 、 `identifier` 、 `short_id` 、 `html_url` 、 `public_image_token` 、 `is_archived` 、 `is_deleted` 。 |
| payload.keywords 可选 | String | 关键字。支持需求编号和需求标题。 |
| payload.include\_public\_image\_token 可选 | String | 包含获取图片资源 token 的属性。使用 `,` 分割，最多 32 个，支持 `description` 和自定义多行文本类型的属性。 |
| payload.page\_size 可选 | Number | 每页条数，取值范围 1-100。  默认值: `30` |
| payload.page\_index 可选 | Number | 页码，从 0 开始。  默认值: `0` |

```json
{
    "mode": "query",
    "payload": {
        "filter": {
            "title": {
                "contains": "账号"
            },
            "assignee.id": {
                "nin": [
                    "315c85d24643678a9a0417f68e846aae"
                ]
            },
            "product.id": {
                "in": [
                    "6422711c3f12e6c1e46d40e9"
                ]
            },
            "tags.id": {
                "in": [
                    "63eca881a0a13a3efc8d49f1"
                ]
            },
            "participants.id": {
                "in": [
                    "a0417f68e846aae315c85d24643678a9"
                ]
            },
            "created_at": {
                "gte": 1730000000
            }
        },
        "keywords": "SLC-1",
        "include_public_image_token": "description",
        "page_size": 10,
        "page_index": 0
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求全量结构数据的数组。 |

```json
{
    "page_size": 10,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "64b4d70ba368e6594360ea24",
            "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "http://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SLC-1",
            "title": "示例需求",
            "short_id": "Ogf1EYey",
            "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "state": {
                "id": "63e1bf51898a0be5a2d21b2a",
                "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
                "name": "待评审",
                "type": "pending"
            },
            "priority": {
                "id": "5cb9466afda1ce4ca0090005",
                "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
                "name": "P0"
            },
            "plan": {
                "id": "63bb744414bd13c9def24ce4",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/plans/63bb744414bd13c9def24ce4",
                "name": "账号管理"
            },
            "suite": {
                "id": "63bb744414bd13c9def24ce4",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/suites/63bb744414bd13c9def24ce4",
                "name": "需求模块",
                "type": "module"
            },
            "plan_at": {
                "from": 1690732800,
                "to": 1691337599,
                "granularity": "day"
            },
            "real_at": {
                "from": 1690732800,
                "to": 1691337599,
                "granularity": "day"
            },
            "score": 0,
            "progress": 0.6,
            "description": "这是一段描述",
            "properties": {
                "backlog_from": "5cb7e6e2fda1ce4ca0000001",
                "backlog_type": "5cb7e763fda1ce4ca0010002"
            },
            "public_image_token": "-fkvANQ2dcVECK6Xg45L3kG8VCbOTK8NrNckGkxljQd",
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                },
                {
                    "id": "63c8fb32729dee3334d96af7",
                    "url": "https://{rest_api_root}/v1/participants/63c8fb32729dee3334d96af7?principal_type=idea&principal_id=64b4d70ba368e6594360ea24",
                    "type": "user_group",
                    "user_group": {
                        "id": "63c8fb32729dee3334d96af7",
                        "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                        "name": "Open Team"
                    }
                }
            ],
            "completed_at": 1689573131,
            "completed_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "created_at": 1689573131,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1689579131,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

获取需求状态列表

用于查询需求状态列表。

```html
https://{rest_api_root}/v1/ship/idea/states?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求状态全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63e1bf51898a0be5a2d21b2a",
            "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
            "name": "待评审",
            "type": "pending",
            "color": "#56ABFB"
        }
    ]
}
```

获取需求属性列表

用于查询需求属性列表。

```html
https://{rest_api_root}/v1/ship/idea/properties?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "backlog_type",
            "url": "https://{rest_api_root}/v1/ship/idea_properties/backlog_type",
            "name": "需求类型",
            "type": "select",
            "options": [
                {
                    "_id": "5cb7e763fda1ce4ca0010002",
                    "text": "功能需求"
                },
                {
                    "_id": "5cb7e763fda1ce4ca0010004",
                    "text": "体验优化"
                }
            ]
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/ship/idea_properties/identifier",
            "name": "编号",
            "type": "text",
            "options": null
        }
    ]
}
```

获取需求模块列表

用于查询需求模块列表。

```html
https://{rest_api_root}/v1/ship/idea/suites?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求模块全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744414bd13c9def24ce4",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9/suites/63bb744414bd13c9def24ce4",
            "name": "需求模块",
            "type": "module"
        }
    ]
}
```

获取需求排期列表

用于查询需求排期列表。

```html
https://{rest_api_root}/v1/ship/idea/plans?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求排期全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744414bd13c9def24ce4",
            "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e6/plans/63bb744414bd13c9def24ce4",
            "name": "账号管理"
        }
    ]
}
```

获取需求优先级列表

用于查询需求优先级列表。

```html
https://{rest_api_root}/v1/ship/idea/priorities?product_id={product_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 产品的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求优先级全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cb9466afda1ce4ca0090005",
            "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
            "name": "P0"
        }
    ]
}
```

获取一条需求流转记录

用于查看一条需求流转记录。

```html
https://{rest_api_root}/v1/ship/ideas/{idea_id}/transition_histories/{transition_history_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| idea\_id | String | 需求的id。 |
| transition\_history\_id | String | 需求流转记录的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求流转记录的id。 |
| url | String | 需求流转记录的资源地址。 |
| idea | Object | 需求的引用结构数据。 |
| from\_state | Object | 流转前需求状态的引用结构数据。 |
| to\_state | Object | 流转后需求状态的引用结构数据。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |

```json
{
    "id": "64c3676c983bb9481ee1eea5",
    "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24/transition_histories/64c3676c983bb9481ee1eea5",
    "idea": {
        "id": "64b4d70ba368e6594360ea24",
        "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
        "identifier": "SLC-1",
        "title": "示例需求",
        "short_id": "Ogf1EYey",
        "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey"
    },
    "from_state": null,
    "to_state": {
        "id": "63e1bf51898a0be5a2d21b29",
        "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b29",
        "name": "待处理",
        "type": "pending"
    },
    "created_at": 1674528614,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取需求流转记录列表

用于查询需求流转记录列表。

```html
https://{rest_api_root}/v1/ship/ideas/{idea_id}/transition_histories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:idea

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| idea\_id | String | 需求的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求流转记录全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "64c3676c983bb9481ee1eea5",
            "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24/transition_histories/64c3676c983bb9481ee1eea5",
            "idea": {
                "id": "64b4d70ba368e6594360ea24",
                "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
                "identifier": "SLC-1",
                "title": "示例需求",
                "short_id": "Ogf1EYey",
                "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey"
            },
            "from_state": null,
            "to_state": {
                "id": "63e1bf51898a0be5a2d21b29",
                "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b29",
                "name": "待处理",
                "type": "pending"
            },
            "created_at": 1674528614,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "658bdb79e5839f556562accf",
            "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24/transition_histories/658bdb79e5839f556562accf",
            "idea": {
                "id": "64b4d70ba368e6594360ea24",
                "url": "https://{rest_api_root}/v1/ship/ideas/64b4d70ba368e6594360ea24",
                "identifier": "SLC-1",
                "title": "示例需求",
                "short_id": "Ogf1EYey",
                "html_url": "https://yctech.pingcode.com/ship/ideas/Ogf1EYey"
            },
            "from_state": {
                "id": "63e1bf51898a0be5a2d21b29",
                "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b29",
                "name": "待处理",
                "type": "pending"
            },
            "to_state": {
                "id": "63e1bf51898a0be5a2d21b2b",
                "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2b",
                "name": "处理中",
                "type": "in_progress"
            },
            "created_at": 1674528614,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

产品配置中心

工单配置

获取一个工单类型

用于查看一个工单类型。

```html
https://{rest_api_root}/v1/ship/ticket_types/{ticket_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_type\_id | String | 工单类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单类型的id。 |
| url | String | 工单类型的资源地址。 |
| name | String | 工单类型的名称。 |
| is\_system | Number | 是否为系统内置类型。 |

```json
{
    "id": "63bb744214bd13c9def24ca9",
    "url": "https://{rest_api_root}/v1/ship/ticket_types/63bb744214bd13c9def24ca9",
    "name": "需求",
    "is_system": 1
}
```

获取全部工单类型列表

用于查询全部工单类型列表。

```html
https://{rest_api_root}/v1/ship/ticket_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部工单类型全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744214bd13c9def24ca9",
            "url": "https://{rest_api_root}/v1/ship/ticket_types/63bb744214bd13c9def24ca9",
            "name": "需求",
            "is_system": 1
        }
    ]
}
```

创建一个工单状态

用于创建一个工单状态。

```html
https://{rest_api_root}/v1/ship/ticket_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 工单状态的名称，在一个企业中这个名称是唯一的。 |
| type | String | 工单状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |

```json
{
    "name": "处理中",
    "type": "pending"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态的id。 |
| url | String | 工单状态的资源地址。 |
| name | String | 工单状态的名称。 |
| type | String | 工单状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 工单状态的颜色。 |

```json
{
    "id": "6422711c3f12e6c1e46d40f2",
    "url": "https://{rest_api_root}/v1/ship/ticket_states/6422711c3f12e6c1e46d40f2",
    "name": "处理中",
    "type": "pending",
    "color": "#56ABFB"
}
```

获取一个工单状态

用于查看一个工单状态。

```html
https://{rest_api_root}/v1/ship/ticket_states/{ticket_state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_state\_id | String | 工单状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态的id。 |
| url | String | 工单状态的资源地址。 |
| name | String | 工单状态的名称。 |
| type | String | 工单状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 工单状态的颜色。 |

```json
{
    "id": "6422711c3f12e6c1e46d40f2",
    "url": "https://{rest_api_root}/v1/ship/ticket_states/6422711c3f12e6c1e46d40f2",
    "name": "处理中",
    "type": "pending",
    "color": "#56ABFB"
}
```

部分更新一个工单状态

```html
https://{rest_api_root}/v1/ship/ticket_states/{ticket_state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_state\_id | String | 工单状态id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 工单状态的名称，在一个企业中这个名称是唯一的。 |
| type 可选 | String | 工单状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |

```json
{
    "name": "已完成",
    "type": "completed"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态的id。 |
| url | String | 工单状态的资源地址。 |
| name | String | 工单状态的名称。 |
| type | String | 工单状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 工单状态的颜色。 |

```json
{
    "id": "6422711c3f12e6c1e46d40f2",
    "url": "https://{rest_api_root}/v1/ship/ticket_states/6422711c3f12e6c1e46d40f2",
    "name": "已完成",
    "type": "completed",
    "color": "#56AB25"
}
```

获取全部工单状态列表

用于查询全部工单状态列表。

```html
https://{rest_api_root}/v1/ship/ticket_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部工单状态全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40f2",
            "url": "https://{rest_api_root}/v1/ship/ticket_states/6422711c3f12e6c1e46d40f2",
            "name": "处理中",
            "type": "pending",
            "color": "#F6C659"
        }
    ]
}
```

获取一个工单状态方案

用于查看一个工单状态方案。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态方案的id。 |
| url | String | 工单状态方案的资源地址。 |
| product | Object | 工单状态方案关联产品的引用结构数据。 |

```json
{
    "id": "63feb3da9cc1ead1d2be93f5",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f5",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取工单状态方案列表

用于查询工单状态方案列表。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单状态方案全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63feb3da9cc1ead1d2be93f4",
            "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4",
            "product": null
        },
        {
            "id": "63feb3da9cc1ead1d2be93f5",
            "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f5",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向状态方案中添加一个工单状态

用于向状态方案中添加一个工单状态。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_id | String | 工单状态的id。 |

```json
{
    "state_id": "63bb744214bd13c9def24ca2"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 状态方案中工单状态关联的id。 |
| url | String | 状态方案中工单状态关联的资源地址。 |
| state\_plan | Object | 工单状态方案的引用结构数据。 |
| state | Object | 工单状态的引用结构数据。 |

```json
{
    "id": "63bb744214bd13c9def24ca2",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_states/63bb744214bd13c9def24ca2",
    "state_plan": {
        "id": "63feb3da9cc1ead1d2be93f4",
        "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
    },
    "state": {
        "id": "63bb744214bd13c9def24ca2",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
        "name": "待处理",
        "type": "pending"
    }
}
```

获取状态方案中的一个工单状态

用于查询状态方案中的一个工单状态。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |
| state\_id | String | 工单状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 状态方案中工单状态关联的id。 |
| url | String | 状态方案中工单状态关联的资源地址。 |
| state\_plan | Object | 工单状态方案的引用结构数据。 |
| state | Object | 工单状态的引用结构数据。 |

```json
{
    "id": "63bb744214bd13c9def24ca2",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_states/63bb744214bd13c9def24ca2",
    "state_plan": {
        "id": "63feb3da9cc1ead1d2be93f4",
        "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
    },
    "state": {
        "id": "63bb744214bd13c9def24ca2",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
        "name": "待处理",
        "type": "pending"
    }
}
```

获取状态方案中的工单状态列表

用于查询状态方案中的工单状态列表。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 状态方案中的工单状态全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63bb744214bd13c9def24ca2",
            "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_states/63bb744214bd13c9def24ca2",
            "state_plan": {
                "id": "63feb3da9cc1ead1d2be93f4",
                "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
            },
            "state": {
                "id": "63bb744214bd13c9def24ca2",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
                "name": "待处理",
                "type": "pending"
            }
        }
    ]
}
```

在状态方案中移除一个工单状态

用于在状态方案中移除一个工单状态。  
移除状态后，每种类型的状态至少存在一种，否则将无法移除。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |
| state\_id | String | 工单状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 状态方案中工单状态关联的id。 |
| url | String | 状态方案中工单状态关联的资源地址。 |
| state\_plan | Object | 工单状态方案的引用结构数据。 |
| state | Object | 工单状态的引用结构数据。 |

```json
{
    "id": "63bb744214bd13c9def24ca2",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_states/63bb744214bd13c9def24ca2",
    "state_plan": {
        "id": "63feb3da9cc1ead1d2be93f4",
        "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
    },
    "state": {
        "id": "63bb744214bd13c9def24ca2",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
        "name": "待处理",
        "type": "pending"
    }
}
```

向状态方案中添加一个工单状态流转

用于向状态方案中添加一个工单状态流转。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_state_flows
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| from\_state\_id | String | 起始工单状态的id。 |
| to\_state\_id | String | 可更改为的工单状态的id。 |

```json
{
    "from_state_id": "63bb744214bd13c9def24ca5",
    "to_state_id": "63bb744214bd13c9def24ca2"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态流转的id。 |
| url | String | 工单状态流转的资源地址。 |
| state\_plan | Object | 工单状态方案的引用结构数据。 |
| form\_state | Object | 起始工单状态的引用结构数据。 |
| to\_state | Object | 目标工单状态的引用结构数据。 |

```json
{
    "id": "63feb3da9cc1ead1d2be93fd",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_state_flows/63feb3da9cc1ead1d2be93fd",
    "state_plan": {
        "id": "63feb3da9cc1ead1d2be93f4",
        "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
    },
    "form_state": {
        "id": "63bb744214bd13c9def24ca5",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca5",
        "name": "已计划",
        "type": "in_progress"
    },
    "to_state": {
        "id": "63bb744214bd13c9def24ca2",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
        "name": "待处理",
        "type": "pending"
    }
}
```

获取状态方案中的一个工单状态流转

用于查询状态方案中的一个工单状态流转。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_state_flows/{state_flow_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |
| state\_flow\_id | String | 工单状态流转的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态流转的id。 |
| url | String | 工单状态流转的资源地址。 |
| state\_plan | Object | 工单状态方案的引用结构数据。 |
| form\_state | Object | 起始工单状态的引用结构数据。 |
| to\_state | Object | 目标工单状态的引用结构数据。 |

```json
{
    "id": "63feb3da9cc1ead1d2be93fd",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_state_flows/63feb3da9cc1ead1d2be93fd",
    "state_plan": {
        "id": "63feb3da9cc1ead1d2be93f4",
        "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
    },
    "form_state": {
        "id": "63bb744214bd13c9def24ca5",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca5",
        "name": "已计划",
        "type": "in_progress"
    },
    "to_state": {
        "id": "63bb744214bd13c9def24ca2",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
        "name": "待处理",
        "type": "pending"
    }
}
```

获取状态方案中的工单状态流转列表

用于查询状态方案中的工单状态流转列表。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_state_flows
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 状态方案中的工单状态流转全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63feb3da9cc1ead1d2be93f5",
            "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_states/63feb3da9cc1ead1d2be93f5",
            "state_plan": {
                "id": "63feb3da9cc1ead1d2be93f4",
                "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
            },
            "form_state": {
                "id": "63bb744214bd13c9def24ca2",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
                "name": "待处理",
                "type": "pending"
            },
            "to_state": {
                "id": "63bb744214bd13c9def24ca4",
                "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca4",
                "name": "处理中",
                "type": "in_progress"
            }
        }
    ]
}
```

在状态方案中移除一个工单状态流转

用于在状态方案中移除一个工单状态流转。

```html
https://{rest_api_root}/v1/ship/ticket_state_plans/{state_plan_id}/ticket_state_flows/{state_flow_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工单状态方案的id。 |
| state\_flow\_id | String | 工单状态流转的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单状态流转的id。 |
| url | String | 工单状态流转的资源地址。 |
| state\_plan | Object | 工单状态方案的引用结构数据。 |
| form\_state | Object | 起始工单状态的引用结构数据。 |
| to\_state | Object | 目标工单状态的引用结构数据。 |

```json
{
    "id": "63feb3da9cc1ead1d2be93fd",
    "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4/ticket_state_flows/63feb3da9cc1ead1d2be93fd",
    "state_plan": {
        "id": "63feb3da9cc1ead1d2be93f4",
        "url": "https://{rest_api_root}/v1/ship/ticket_state_plans/63feb3da9cc1ead1d2be93f4"
    },
    "form_state": {
        "id": "63bb744214bd13c9def24ca5",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca5",
        "name": "已计划",
        "type": "in_progress"
    },
    "to_state": {
        "id": "63bb744214bd13c9def24ca2",
        "url": "https://{rest_api_root}/v1/ship/ticket_states/63bb744214bd13c9def24ca2",
        "name": "待处理",
        "type": "pending"
    }
}
```

创建一个工单属性

用于创建一个工单属性。

```html
https://{rest_api_root}/v1/ship/ticket_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 工单属性的名称。在一个企业中这个名称是唯一的。 |
| type | String | 工单属性的类型。  允许值: `text`, `textarea`, `select`, `multi_select`, `cascade_select`, `cascade_multi_select`, `member`, `members`, `date`, `number`, `progress`, `rate`, `link` |
| options 可选 | Object\[\] | 选择项列表。当工单属性类型为 `select,multi_select,cascade_select,cascade_multi_select` 时可选填此项。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "text": "严重"
        },
        {
            "text": "一般"
        }
    ]
}
```

```json
{
    "name": "级联单选",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单属性的id。 |
| url | String | 工单属性的资源地址。 |
| name | String | 工单属性的名称。 |
| type | String | 工单属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/ship/ticket_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null,
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

```json
{
    "id": "jiliandanxuan",
    "url": "https://{rest_api_root}/v1/ship/ticket_properties/jiliandanxuan",
    "name": "级联单选",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ],
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": "/",
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

获取一个工单属性

用于查看一个工单属性。

```html
https://{rest_api_root}/v1/ship/ticket_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 工单属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单属性的id。 |
| url | String | 工单属性的资源地址。 |
| name | String | 工单属性的名称。 |
| type | String | 工单属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/ship/ticket_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null,
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

部分更新一个工单属性

用于部分更新一个工单属性。

```html
https://{rest_api_root}/v1/ship/ticket_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 工单属性的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 工单属性的名称。在一个企业中这个名称是唯一的。 |
| options 可选 | Object\[\] | 选择项列表。 `options` 是整体更新的。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度-update",
    "options": [
        {
            "id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "text": "一般"
        }
    ]
}
```

```json
{
    "name": "级联单选-update",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父-update"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单属性的id。 |
| url | String | 工单属性的资源地址。 |
| name | String | 工单属性的名称。 |
| type | String | 工单属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity-update",
    "url": "https://{rest_api_root}/v1/ship/ticket_properties/severity",
    "name": "严重程度-update",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "_id": "5efb1859110533727a82c624",
            "text": "一般"
        }
    ],
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null,
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

```json
{
    "id": "jiliandanxuan",
    "url": "https://{rest_api_root}/v1/ship/ticket_properties/jiliandanxuan",
    "name": "级联单选-update",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父-update"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ],
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": "/",
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

获取全部工单属性列表

用于查询全部工单属性列表。

```html
https://{rest_api_root}/v1/ship/ticket_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部工单属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "solution",
            "url": "https://{rest_api_root}/v1/ship/ticket_properties/solution",
            "name": "解决方案",
            "type": "select",
            "options": [
                {
                    "_id": "6422711c3f12e6c1e46d40e9",
                    "text": "进入需求池"
                }
            ],
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/ship/ticket_properties/identifier",
            "name": "编号",
            "type": "text",
            "options": null,
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        }
    ]
}
```

获取一个工单属性方案

用于查看一个工单属性方案。

```html
https://{rest_api_root}/v1/ship/ticket_property_plans/{property_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工单属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单属性方案的id。 |
| url | String | 工单属性方案的资源地址。 |
| product | Object | 工单属性方案关联产品的引用结构数据。 |

```json
{
    "id": "5f8a21f18ef715265de90c22",
    "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c22",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取工单属性方案列表

用于查询工单属性方案列表。

```html
https://{rest_api_root}/v1/ship/ticket_property_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单属性方案全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "5f8a21f18ef715265de90c21",
            "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21",
            "product": null
        },
        {
            "id": "5f8a21f18ef715265de90c22",
            "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c22",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向工单属性方案中添加一个工单属性

用于向工单属性方案中添加一个工单属性。

```html
https://{rest_api_root}/v1/ship/ticket_property_plans/{property_plan_id}/ticket_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工单属性方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 工单属性的id。 |

```json
{
    "property_id": "solution"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中工单属性关联的id。 |
| url | String | 属性方案中工单属性关联的资源地址。 |
| property\_plan | Object | 工单属性方案的引用结构数据。 |
| property | Object | 工单属性的引用结构数据。 |

```json
{
    "id": "solution",
    "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21/ticket_properties/solution",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21"
    },
    "property": {
        "id": "solution",
        "url": "https://{rest_api_root}/v1/ship/ticket_properties/solution",
        "name": "解决方案",
        "type": "select"
    }
}
```

获取工单属性方案中的一个工单属性

用于查询属性方案中的一个工单属性。

```html
https://{rest_api_root}/v1/ship/ticket_property_plans/{property_plan_id}/ticket_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工单属性方案的id。 |
| property\_id | String | 工单属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中工单属性关联的id。 |
| url | String | 属性方案中工单属性关联的资源地址。 |
| property\_plan | Object | 工单属性方案的引用结构数据。 |
| property | Object | 工单属性的引用结构数据。 |

```json
{
    "id": "solution",
    "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21/ticket_properties/solution",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21"
    },
    "property": {
        "id": "solution",
        "url": "https://{rest_api_root}/v1/ship/ticket_properties/solution",
        "name": "解决方案",
        "type": "select"
    }
}
```

获取工单属性方案中的工单属性列表

用于查询工单属性方案中的工单属性列表。

```html
https://{rest_api_root}/v1/ship/ticket_property_plans/{property_plan_id}/ticket_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工单属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 属性方案中的工单属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "solution",
            "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21/ticket_properties/solution",
            "property_plan": {
                "id": "5f8a21f18ef715265de90c21",
                "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21"
            },
            "property": {
                "id": "solution",
                "url": "https://{rest_api_root}/v1/ship/ticket_properties/solution",
                "name": "解决方案",
                "type": "select"
            }
        }
    ]
}
```

在工单属性方案中移除一个工单属性

用于在工单属性方案中移除一个工单属性。

```html
https://{rest_api_root}/v1/ship/ticket_property_plans/{property_plan_id}/ticket_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工单属性方案的id。 |
| property\_id | String | 工单属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中工单属性关联的id。 |
| url | String | 属性方案中工单属性关联的资源地址。 |
| property\_plan | Object | 工单属性方案的引用结构数据。 |
| property | Object | 工单属性的引用结构数据。 |

```json
{
    "id": "solution",
    "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21/ticket_properties/solution",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/ship/ticket_property_plans/5f8a21f18ef715265de90c21"
    },
    "property": {
        "id": "solution",
        "url": "https://{rest_api_root}/v1/ship/ticket_properties/solution",
        "name": "解决方案",
        "type": "select"
    }
}
```

获取一个工单优先级

用于查看一个工单优先级。

```html
https://{rest_api_root}/v1/ship/ticket_priorities/{priority_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| priority\_id | String | 工单优先级的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单优先级的id。 |
| url | String | 工单优先级的资源地址。 |
| name | String | 工单优先级的名称。 |

```json
{
    "id": "5cb9466afda1ce4ca0090005",
    "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090005",
    "name": "P0"
}
```

获取全部工单优先级列表

用于查询工单优先级列表。

```html
https://{rest_api_root}/v1/ship/ticket_priorities
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单优先级全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cb9466afda1ce4ca0090005",
            "url": "https://{rest_api_root}/v1/ship/ticket_priorities/5cb9466afda1ce4ca0090005",
            "name": "P0"
        }
    ]
}
```

获取一个工单解决方案

用于查看一个工单解决方案。

```html
https://{rest_api_root}/v1/ship/ticket_solutions/{ticket_solution_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ticket\_solution\_id | String | 工单解决方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工单解决方案的id。 |
| url | String | 工单解决方案的资源地址。 |
| name | String | 工单解决方案的名称。 |

```json
{
    "id": "6422711c3f12e6c1e46d40e9",
    "url": "https://{rest_api_root}/v1/ship/ticket_solutions/6422711c3f12e6c1e46d40e9",
    "name": "进入需求池"
}
```

获取全部工单解决方案列表

用于查询工单解决方案列表。

```html
https://{rest_api_root}/v1/ship/ticket_solutions
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工单解决方案全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "6422711c3f12e6c1e46d40e9",
            "url": "https://{rest_api_root}/v1/ship/ticket_solutions/6422711c3f12e6c1e46d40e9",
            "name": "进入需求池"
        }
    ]
}
```

需求配置

获取一个需求状态

用于查看一个需求状态。

```html
https://{rest_api_root}/v1/ship/idea_states/{idea_state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| idea\_state\_id | String | 需求状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求状态的id。 |
| url | String | 需求状态的资源地址。 |
| name | String | 需求状态的名称。 |
| type | String | 需求状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 需求状态的颜色。 |

```json
{
    "id": "63e1bf51898a0be5a2d21b2a",
    "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
    "name": "待评审",
    "type": "pending",
    "color": "#56ABFB"
}
```

获取全部需求状态列表

用于查询全部需求状态列表。

```html
https://{rest_api_root}/v1/ship/idea_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部需求状态的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63e1bf51898a0be5a2d21b2a",
            "url": "https://{rest_api_root}/v1/ship/idea_states/63e1bf51898a0be5a2d21b2a",
            "name": "待评审",
            "type": "pending",
            "color": "#56ABFB"
        }
    ]
}
```

创建一个需求属性

用于创建一个需求属性。

```html
https://{rest_api_root}/v1/ship/idea_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 需求属性的名称。在一个企业中这个名称是唯一的。 |
| type | String | 需求属性的类型。  允许值: `text`, `textarea`, `select`, `multi_select`, `cascade_select`, `cascade_multi_select`, `member`, `members`, `date`, `number`, `progress`, `rate`, `link` |
| options 可选 | Object\[\] | 选择项列表。当需求属性类型为 `select,multi_select,cascade_select,cascade_multi_select` 时可选填此项。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "text": "一般"
        }
    ]
}
```

```json
{
    "name": "级联单选",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求属性的id。 |
| url | String | 需求属性的资源地址。 |
| name | String | 需求属性的名称。 |
| type | String | 需求属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |
| select\_all\_level | Boolean | 级联选择时是否允许选择全部层级。 |
| display\_all\_level | Boolean | 级联选择时是否展示全部层级。 |
| display\_separator | String | 级联选择时的层级分隔符。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/ship/idea_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null
}
```

```json
{
    "id": "jiliandanxuan",
    "url": "https://{rest_api_root}/v1/ship/idea_properties/jiliandanxuan",
    "name": "级联单选",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": "/"
}
```

获取一个需求属性

用于查看一个需求属性。

```html
https://{rest_api_root}/v1/ship/idea_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 需求属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求属性的id。 |
| url | String | 需求属性的资源地址。 |
| name | String | 需求属性的名称。 |
| type | String | 需求属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/ship/idea_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

部分更新一个需求属性

用于部分更新一个需求属性。

```html
https://{rest_api_root}/v1/ship/idea_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 需求属性的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 需求属性的名称。在一个企业中这个名称是唯一的。 |
| options 可选 | Object\[\] | 选择项列表。 `options` 是整体更新的。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度-update",
    "options": [
        {
            "id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "text": "一般"
        }
    ]
}
```

```json
{
    "name": "级联单选-update",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父-update"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子-update",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求属性的id。 |
| url | String | 需求属性的资源地址。 |
| name | String | 需求属性的名称。 |
| type | String | 需求属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |
| select\_all\_level | Boolean | 级联选择时是否允许选择全部层级。 |
| display\_all\_level | Boolean | 级联选择时是否展示全部层级。 |
| display\_separator | String | 级联选择时的层级分隔符。 |

```json
{
    "id": "severity-update",
    "url": "https://{rest_api_root}/v1/ship/idea_properties/severity",
    "name": "严重程度-update",
    "type": "select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null
}
```

```json
{
    "id": "jiliandanxuan",
    "url": "https://{rest_api_root}/v1/ship/idea_properties/jiliandanxuan",
    "name": "级联单选-update",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父-update"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子-update",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": "/"
}
```

获取全部需求属性列表

用于查询全部需求属性列表。

```html
https://{rest_api_root}/v1/ship/idea_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部需求属性的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "backlog_type",
            "url": "https://{rest_api_root}/v1/ship/idea_properties/backlog_type",
            "name": "需求类型",
            "type": "select",
            "options": [
                {
                    "_id": "5cb7e763fda1ce4ca0010002",
                    "text": "功能需求"
                },
                {
                    "_id": "5cb7e763fda1ce4ca0010004",
                    "text": "体验优化"
                }
            ],
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/ship/idea_properties/identifier",
            "name": "编号",
            "type": "text",
            "options": null,
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        }
    ]
}
```

获取一个需求属性方案

用于查看一个需求属性方案。

```html
https://{rest_api_root}/v1/ship/idea_property_plans/{property_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 需求属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求属性方案的id。 |
| url | String | 需求属性方案的资源地址。 |
| product | Object | 需求属性方案关联产品的引用结构数据。 |

```json
{
    "id": "5f8a21f18ef715265de90c22",
    "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5f8a21f18ef715265de90c22",
    "product": {
        "id": "6422711c3f12e6c1e46d40e9",
        "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
        "identifier": "SLC",
        "name": "示例产品",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取需求属性方案列表

用于查询需求属性方案列表。

```html
https://{rest_api_root}/v1/ship/idea_property_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求属性方案全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "5d7a21f19ef715269ae90c50",
            "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50",
            "product": null
        },
        {
            "id": "5f8a21f18ef715265de90c22",
            "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5f8a21f18ef715265de90c22",
            "product": {
                "id": "6422711c3f12e6c1e46d40e9",
                "url": "https://{rest_api_root}/v1/ship/products/6422711c3f12e6c1e46d40e9",
                "identifier": "SLC",
                "name": "示例产品",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向需求属性方案中添加一个需求属性

用于向需求属性方案中添加一个需求属性。

```html
https://{rest_api_root}/v1/ship/idea_property_plans/{property_plan_id}/idea_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 需求属性方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 需求属性的id。 |

```json
{
    "property_id": "solution"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中需求属性关联的id。 |
| url | String | 属性方案中需求属性关联的资源地址。 |
| property\_plan | Object | 需求属性方案的引用结构数据。 |
| property | Object | 需求属性的引用结构数据。 |

```json
{
    "id": "solution",
    "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50/idea_properties/solution",
    "property_plan": {
        "id": "5d7a21f19ef715269ae90c50",
        "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50"
    },
    "property": {
        "id": "solution",
        "url": "https://{rest_api_root}/v1/ship/idea_properties/solution",
        "name": "解决方案",
        "type": "select"
    }
}
```

获取需求属性方案中的一个需求属性

用于查询属性方案中的一个需求属性。

```html
https://{rest_api_root}/v1/ship/idea_property_plans/{property_plan_id}/idea_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 需求属性方案的id。 |
| property\_id | String | 需求属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中需求属性关联的id。 |
| url | String | 属性方案中需求属性关联的资源地址。 |
| property\_plan | Object | 需求属性方案的引用结构数据。 |
| property | Object | 需求属性的引用结构数据。 |

```json
{
    "id": "solution",
    "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50/idea_properties/solution",
    "property_plan": {
        "id": "5d7a21f19ef715269ae90c50",
        "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50"
    },
    "property": {
        "id": "solution",
        "url": "https://{rest_api_root}/v1/ship/idea_properties/solution",
        "name": "解决方案",
        "type": "select"
    }
}
```

获取需求属性方案中的需求属性列表

用于查询需求属性方案中的需求属性列表。

```html
https://{rest_api_root}/v1/ship/idea_property_plans/{property_plan_id}/idea_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 需求属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 属性方案中的需求属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "solution",
            "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50/idea_properties/solution",
            "property_plan": {
                "id": "5d7a21f19ef715269ae90c50",
                "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50"
            },
            "property": {
                "id": "solution",
                "url": "https://{rest_api_root}/v1/ship/idea_properties/solution",
                "name": "解决方案",
                "type": "select"
            }
        }
    ]
}
```

在需求属性方案中移除一个需求属性

用于在需求属性方案中移除一个需求属性。

```html
https://{rest_api_root}/v1/ship/idea_property_plans/{property_plan_id}/idea_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 需求属性方案的id。 |
| property\_id | String | 需求属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中需求属性关联的id。 |
| url | String | 属性方案中需求属性关联的资源地址。 |
| property\_plan | Object | 需求属性方案的引用结构数据。 |
| property | Object | 需求属性的引用结构数据。 |

```json
{
    "id": "solution",
    "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50/idea_properties/solution",
    "property_plan": {
        "id": "5d7a21f19ef715269ae90c50",
        "url": "https://{rest_api_root}/v1/ship/idea_property_plans/5d7a21f19ef715269ae90c50"
    },
    "property": {
        "id": "solution",
        "url": "https://{rest_api_root}/v1/ship/idea_properties/solution",
        "name": "解决方案",
        "type": "select"
    }
}
```

获取一个需求优先级

用于查看一个需求优先级。

```html
https://{rest_api_root}/v1/ship/idea_priorities/{priority_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| priority\_id | String | 需求优先级的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 需求优先级的id。 |
| url | String | 需求优先级的资源地址。 |
| name | String | 需求优先级的名称。 |

```json
{
    "id": "5cb9466afda1ce4ca0090005",
    "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
    "name": "P0"
}
```

获取全部需求优先级列表

用于查询需求优先级列表。

```html
https://{rest_api_root}/v1/ship/idea_priorities
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:ship:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 需求优先级的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cb9466afda1ce4ca0090005",
            "url": "https://{rest_api_root}/v1/ship/idea_priorities/5cb9466afda1ce4ca0090005",
            "name": "P0"
        }
    ]
}
```

项目管理

项目

创建一个项目

用于创建一个项目。

```html
https://{rest_api_root}/v1/pjm/projects
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| type | String | 项目的类型。  允许值: `kanban`, `scrum`, `waterfall`, `hybrid` |
| process\_id 可选 | String | 项目流程的id。项目流程可以通过 `获取全部项目流程` 获取。 |
| scope\_type 可选 | String | 项目的所属类型。默认值 `organization` 。允许值分别表示企业可见和团队可见。  默认值: `organization`  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 项目的所属id。当 `scope_type` 为 `user_group` 时，该字段必填，且表示团队id；当 `scope_type` 为其他值时，该字段无效。 |
| name | String | 项目的名称。最大长度为255。 |
| visibility 可选 | String | 项目的可见范围。允许值分别表示组织全部成员可见和仅项目成员可见。  默认值: `private`  允许值: `public`, `private` |
| identifier | String | 项目的标识。在一个企业中这个标识是唯一的。项目的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 项目的描述。 |
| members 可选 | Object\[\] | 项目成员的列表。当项目的 `scope_type` 变为 `user_group` 时，项目成员必须是 `scope_id` 指定的团队内的成员；当 `scope_type` 为其他值时，项目成员可以是任意成员或团队。 |
| members.id | String | 企业成员或团队的id。 |
| members.type | String | 项目成员的类型。  允许值: `user`, `user_group` |
| start\_at 可选 | Number | 项目开始的时间。 |
| end\_at 可选 | Number | 项目结束的时间。 |
| assignee\_id 可选 | String | 项目负责人的id。 |

```json
{
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "Scrum项目",
    "visibility": "private",
    "type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "identifier": "SCR",
    "description": "这是一个scrum类型的项目",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "type": "user"
        }
    ],
    "start_at": 1680278400,
    "end_at": 1682870399,
    "assignee_id": "8168dd057b104c81bceb2e48bdf283d0"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目的id。 |
| url | String | 项目的地址。 |
| type | String | 项目的类型。  允许值: `kanban`, `scrum`, `waterfall`, `hybrid` |
| process\_id | String | 项目流程的id。 |
| scope\_id | String | 项目的所属id。 |
| scope\_type | String | 项目的所属类型。  允许值: `organization`, `user_group` |
| name | String | 项目的名称。 |
| color | String | 项目的主题色。 |
| identifier | String | 项目的标识。 |
| visibility | String | 项目的可见性。  允许值: `private`, `public` |
| description | String | 项目的描述。 |
| state | Object | 项目状态的引用结构数据。 |
| assignee | Object | 项目负责人的引用结构数据。 |
| start\_at | Number | 项目的开始时间。 |
| end\_at | Number | 项目的结束时间。 |
| properties | Object | 项目的自定义属性键值对集合。 |
| members | Object\[\] | 项目成员的引用结构数据列表。 |
| is\_local\_config\_enabled | Number | 是否已启用本地配置。  允许值: `0`, `1` |
| created\_at | Number | 项目的创建时间。 |
| created\_by | Object | 项目创建人的引用结构数据。 |
| updated\_at | Number | 项目的更新时间。 |
| updated\_by | Object | 项目更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
    "type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "Scrum项目",
    "color": "#F693E7",
    "identifier": "SCR",
    "visibility": "private",
    "description": "这是一个scrum类型的项目",
    "state": {
        "id": "66cbf3b4b78a55fcd1a76296",
        "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf3b4b78a55fcd1a76296",
        "name": "正常",
        "type": "in_progress"
    },
    "assignee": {
        "id": "8168dd057b104c81bceb2e48bdf283d0",
        "url": "https://{rest_api_root}/v1/directory/users/8168dd057b104c81bceb2e48bdf283d0",
        "name": "john",
        "display_name": "john",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1680278400,
    "end_at": 1682870399,
    "properties": {},
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "is_local_config_enabled": 0,
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

复制一个项目

用于复制一个项目。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/clone
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 项目的所属类型。默认使用原项目的所属。允许值分别表示企业可见和团队可见。  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 项目的所属id。当 `scope_type` 为 `user_group` 时，该字段必填，且表示团队id；当 `scope_type` 为其他值时，该字段无效。 |
| name 可选 | String | 项目的名称。最大长度为255。默认使用原项目的名称。 |
| visibility 可选 | String | 项目的可见范围。默认使用原项目的可见范围。允许值分别表示组织全部成员可见和仅项目成员可见。  允许值: `public`, `private` |
| identifier | String | 项目的标识。在一个企业中这个标识是唯一的。项目的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 项目的描述。默认使用原项目的描述。 |
| members 可选 | Object\[\] | 项目成员的列表。当项目的 `scope_type` 变为 `user_group` 时，项目成员必须是 `scope_id` 指定的团队内的成员；当 `scope_type` 为其他值时，项目成员可以是任意成员或团队，默认使用原项目的成员列表。 |
| members.id | String | 企业成员或团队的id。 |
| members.type | String | 项目成员的类型。  允许值: `user`, `user_group` |

```json
{
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "复制的Scrum项目",
    "visibility": "public",
    "identifier": "SCRC",
    "description": "这是一个复制的Scrum类型的项目",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "type": "user"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目的id。 |
| url | String | 项目的地址。 |
| type | String | 项目的类型。  允许值: `kanban`, `scrum`, `waterfall`, `hybrid` |
| process\_id | String | 项目流程的id。 |
| scope\_id | String | 项目的所属id。 |
| scope\_type | String | 项目的所属类型。  允许值: `organization`, `user_group` |
| name | String | 项目的名称。 |
| color | String | 项目的主题色。 |
| identifier | String | 项目的标识。 |
| visibility | String | 项目的可见性。  允许值: `private`, `public` |
| description | String | 项目的描述。 |
| state | Object | 项目状态的引用结构数据。 |
| assignee | Object | 项目负责人的引用结构数据。 |
| start\_at | Number | 项目的开始时间。 |
| end\_at | Number | 项目的结束时间。 |
| properties | Object | 项目的自定义属性键值对集合。 |
| members | Object\[\] | 项目成员的引用结构数据列表。 |
| is\_local\_config\_enabled | Number | 是否已启用本地配置。  允许值: `0`, `1` |
| created\_at | Number | 项目的创建时间。 |
| created\_by | Object | 项目创建人的引用结构数据。 |
| updated\_at | Number | 项目的更新时间。 |
| updated\_by | Object | 项目更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5ab623f6a70571487ea47001",
    "url": "https://{rest_api_root}/v1/pjm/projects/5ab623f6a70571487ea47001",
    "type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "复制的Scrum项目",
    "color": "#F693E7",
    "identifier": "SCRC",
    "visibility": "public",
    "description": "这是一个复制的Scrum类型的项目",
    "state": {
        "id": "66cbf3b4b78a55fcd1a76296",
        "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf3b4b78a55fcd1a76296",
        "name": "正常",
        "type": "in_progress"
    },
    "assignee": {
        "id": "8168dd057b104c81bceb2e48bdf283d0",
        "url": "https://{rest_api_root}/v1/directory/users/8168dd057b104c81bceb2e48bdf283d0",
        "name": "john",
        "display_name": "john",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1680278400,
    "end_at": 1682870399,
    "properties": {},
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "is_local_config_enabled": 0,
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个项目

用于查看一个项目。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_deleted 可选 | Boolean | 是否包含已删除的项目。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否包含已归档的项目。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目的id。 |
| url | String | 项目的地址。 |
| type | String | 项目的类型。  允许值: `kanban`, `scrum`, `waterfall`, `hybrid` |
| process\_id | String | 项目流程的id。 |
| scope\_id | String | 项目的所属id。 |
| scope\_type | String | 项目的所属类型。  允许值: `organization`, `user_group` |
| name | String | 项目的名称。 |
| color | String | 项目的主题色。 |
| identifier | String | 项目的标识。 |
| visibility | String | 项目的可见性。  允许值: `private`, `public` |
| description | String | 项目的描述。 |
| state | Object | 项目状态的引用结构数据。 |
| assignee | Object | 项目负责人的引用结构数据。 |
| start\_at | Number | 项目的开始时间。 |
| end\_at | Number | 项目的结束时间。 |
| properties | Object | 项目的自定义属性键值对集合。 |
| members | Object\[\] | 项目成员的引用结构数据列表。 |
| is\_local\_config\_enabled | Number | 是否已启用本地配置。  允许值: `0`, `1` |
| created\_at | Number | 项目的创建时间。 |
| created\_by | Object | 项目创建人的引用结构数据。 |
| updated\_at | Number | 项目的更新时间。 |
| updated\_by | Object | 项目更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
    "type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "Scrum项目",
    "color": "#F693E7",
    "identifier": "SCR",
    "visibility": "private",
    "description": "这是一个scrum类型的项目",
    "state": {
        "id": "66cbf3b4b78a55fcd1a76296",
        "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf3b4b78a55fcd1a76296",
        "name": "正常",
        "type": "in_progress"
    },
    "assignee": {
        "id": "8168dd057b104c81bceb2e48bdf283d0",
        "url": "https://{rest_api_root}/v1/directory/users/8168dd057b104c81bceb2e48bdf283d0",
        "name": "john",
        "display_name": "john",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1680278400,
    "end_at": 1682870399,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "is_local_config_enabled": 0,
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个项目进度

用于查看一个项目进度。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/progress
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item | Object | 项目工作项进度统计。 |
| work\_item.total | Number | 工作项总数。 |
| work\_item.pending\_count | Number | 待处理工作项数量。 |
| work\_item.in\_progress\_count | Number | 进行中工作项数量。 |
| work\_item.completed\_count | Number | 已完成工作项数量。 |

```json
{
    "work_item": {
        "total": 4,
        "pending_count": 1,
        "in_progress_count": 2,
        "completed_count": 1
    }
}
```

部分更新一个项目

用于部分更新一个项目。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 项目的名称。最大长度为255。 |
| identifier 可选 | String | 项目的标识。在一个企业中这个标识是唯一的。项目的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 项目的描述。 |
| start\_at 可选 | Number | 项目开始的时间。 |
| end\_at 可选 | Number | 项目结束的时间。 |
| assignee\_id 可选 | String | 项目负责人的id。 |
| state\_id 可选 | String | 项目状态的id。项目状态可以通过 `获取项目状态列表` 获取。 |
| properties 可选 | Object | 项目自定义属性的键值对集合。需要注意自定义属性需要包含在项目属性方案中。例如属性方案中包含 `prop_a` 和 `prop_b` 。 |
| properties.prop\_a 可选 | Object | 项目自定义属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 项目自定义属性 `prop_b` 。 |

```json
{
    "name": "Scrum项目",
    "identifier": "SCR",
    "description": "这是一个scrum类型的项目",
    "start_at": 1680278400,
    "end_at": 1682870399,
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "state_id": "66cbf3b4b78a55fcd1a76296",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目的id。 |
| url | String | 项目的地址。 |
| type | String | 项目的类型。  允许值: `kanban`, `scrum`, `waterfall`, `hybrid` |
| process\_id | String | 项目流程的id。 |
| scope\_id | String | 项目的所属id。 |
| scope\_type | String | 项目的所属类型。  允许值: `organization`, `user_group` |
| name | String | 项目的名称。 |
| color | String | 项目的主题色。 |
| identifier | String | 项目的标识。 |
| visibility | String | 项目的可见性。  允许值: `private`, `public` |
| description | String | 项目的描述。 |
| state | Object | 项目状态的引用结构数据。 |
| assignee | Object | 项目负责人的引用结构数据。 |
| start\_at | Number | 项目的开始时间。 |
| end\_at | Number | 项目的结束时间。 |
| properties | Object | 项目的自定义属性键值对集合。 |
| members | Object\[\] | 项目成员的引用结构数据列表。 |
| is\_local\_config\_enabled | Number | 是否已启用本地配置。  允许值: `0`, `1` |
| created\_at | Number | 项目的创建时间。 |
| created\_by | Object | 项目创建人的引用结构数据。 |
| updated\_at | Number | 项目的更新时间。 |
| updated\_by | Object | 项目更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
    "type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "Scrum项目",
    "color": "#F693E7",
    "identifier": "SCR",
    "visibility": "private",
    "description": "这是一个scrum类型的项目",
    "state": {
        "id": "66cbf3b4b78a55fcd1a76296",
        "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf3b4b78a55fcd1a76296",
        "name": "正常",
        "type": "in_progress"
    },
    "assignee": {
        "id": "8168dd057b104c81bceb2e48bdf283d0",
        "url": "https://{rest_api_root}/v1/directory/users/8168dd057b104c81bceb2e48bdf283d0",
        "name": "john",
        "display_name": "john",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1680278400,
    "end_at": 1682870399,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "is_local_config_enabled": 0,
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583293300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取项目列表

用于查询项目列表。

```html
https://{rest_api_root}/v1/pjm/projects
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 项目的所属类型。允许值分别表示企业可见和团队可见。  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 项目的所属id。仅支持团队的id。 |
| keywords 可选 | String | 关键字。只支持 `name` 关键字搜索。 |
| member\_type 可选 | String | 项目成员的类型。 `member_type` 和 `member_id` 必须同时存在。  允许值: `user`, `user_group` |
| member\_id 可选 | String | 项目成员的id。值为企业成员或团队的id。 `member_id` 和 `member_type` 必须同时存在。 |
| type 可选 | String | 项目的类型。  允许值: `scrum`, `kanban`, `waterfall`, `hybrid` |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |
| include\_deleted 可选 | Boolean | 是否查询已删除的项目。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否查询已归档的项目。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 项目全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb623f6a70571487ea47000",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
            "type": "scrum",
            "process_id": "5fa690f1ae0571487ea49030",
            "scope_type": "user_group",
            "scope_id": "63c8fb32729dee3334d96af7",
            "name": "Scrum项目",
            "color": "#F693E7",
            "visibility": "private",
            "identifier": "SCR",
            "description": "这是一个scrum类型的项目",
            "state": {
                "id": "66cbf3b4b78a55fcd1a76296",
                "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf3b4b78a55fcd1a76296",
                "name": "正常",
                "type": "in_progress"
            },
            "assignee": {
                "id": "8168dd057b104c81bceb2e48bdf283d0",
                "url": "https://{rest_api_root}/v1/directory/users/8168dd057b104c81bceb2e48bdf283d0",
                "name": "john",
                "display_name": "john",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "start_at": 1680278400,
            "end_at": 1682870399,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "members": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "is_local_config_enabled": 0,
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

获取项目状态列表

用于查询项目状态列表。

```html
https://{rest_api_root}/v1/pjm/project/states?project_id={project_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 项目状态全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 5,
    "values": [
        {
            "id": "66cbf5401e7cc374c85acb1b",
            "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf5401e7cc374c85acb1b",
            "name": "未开始",
            "type": "pending"
        },
        {
            "id": "66cbf5401e7cc374c85acb1c",
            "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf5401e7cc374c85acb1c",
            "name": "正常",
            "type": "in_progress"
        },
        {
            "id": "66cbf5401e7cc374c85acb1d",
            "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf5401e7cc374c85acb1d",
            "name": "预警",
            "type": "in_progress"
        },
        {
            "id": "66cbf5401e7cc374c85acb1e",
            "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf5401e7cc374c85acb1e",
            "name": "延期",
            "type": "in_progress"
        },
        {
            "id": "66cbf5401e7cc374c85acb1f",
            "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf5401e7cc374c85acb1f",
            "name": "结束",
            "type": "completed"
        }
    ]
}
```

向项目中添加一个成员

用于向项目中添加一个成员。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| member | Object | 项目的成员。 |
| member.id | String | 企业成员或团队的id。 |
| member.type | String | 项目成员的类型。  允许值: `user`, `user_group` |
| role\_id 可选 | String | 角色的id。 |

```json
{
    "member": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "type": "user"
    },
    "role_id": "6422711c3f12e6c1e46d40e6"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| type | String | 项目成员的类型。 |
| user | Object | 用户的引用结构数据。 |
| user\_group | Object | 团队的引用结构数据。 |
| role | Object | role的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "user_group": null,
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取项目中的一个成员

用于查看项目中的一个成员。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| member\_id | String | 企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| type | String | 项目成员的类型。 |
| user | Object | 用户的引用结构数据。 |
| user\_group | Object | 团队的引用结构数据。 |
| role | Object | role的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "user_group": null,
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

部分更新一个项目内的成员

用于部分更新一个项目内的成员。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| member\_id | String | 企业成员或团队的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| role\_id 可选 | String | 角色的id。管理员可以更改其他用户的角色，但非管理员用户无权更改其他用户的角色。 |

```json
{
    "role_id": "6422711c3f12e6c1e46d40e6"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目内的成员的id。 |
| url | String | 项目内的成员的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| type | String | 项目成员的类型。 |
| user | Object | 用户的引用结构数据。 |
| user\_group | Object | 团队的引用结构数据。 |
| role | Object | role的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取项目中的成员列表

用于查询项目中的成员列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 项目中的成员的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/63c8fb32729dee3334d96af7",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        }
    ]
}
```

在项目中移除一个成员

用于在项目中移除一个成员。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| member\_id | String | 企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| type | String | 项目成员的类型。 |
| user | Object | 用户的引用结构数据。 |
| user\_group | Object | 团队的引用结构数据。 |
| role | Object | role的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

向项目中添加一个项目属性

用于向项目中添加一个项目属性。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/project_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 项目属性的id。 |

```json
{
    "property_id": "risk"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| property | Object | 项目属性的引用结构数据。 |

```json
{
    "id": "risk",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/project_properties/risk",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "property": {
        "id": "risk",
        "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
        "name": "项目风险",
        "type": "select",
        "options": [
            {
                "_id": "5efb1859110533727a82c603",
                "text": "高"
            },
            {
                "_id": "5efb1859110533727a82c604",
                "text": "中"
            },
            {
                "_id": "5efb1859110533727a82c605",
                "text": "低"
            }
        ]
    }
}
```

获取项目中的一个项目属性

用于查看一个项目属性。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/project_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| property\_id | String | 项目属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| property | Object | 属性的引用结构数据。 |

```json
{
    "id": "risk",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/project_properties/risk",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "property": {
        "id": "risk",
        "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
        "name": "项目风险",
        "type": "select",
        "options": [
            {
                "_id": "5efb1859110533727a82c603",
                "text": "高"
            },
            {
                "_id": "5efb1859110533727a82c604",
                "text": "中"
            },
            {
                "_id": "5efb1859110533727a82c605",
                "text": "低"
            }
        ]
    }
}
```

获取项目中的项目属性列表

用于查询项目中的项目属性列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/project_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 项目中的项目属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "risk",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/project_properties/risk",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "property": {
                "id": "risk",
                "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
                "name": "项目风险",
                "type": "select",
                "options": [
                    {
                        "_id": "5efb1859110533727a82c603",
                        "text": "高"
                    },
                    {
                        "_id": "5efb1859110533727a82c604",
                        "text": "中"
                    },
                    {
                        "_id": "5efb1859110533727a82c605",
                        "text": "低"
                    }
                ]
            }
        },
        {
            "id": "name",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/project_properties/name",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "property": {
                "id": "name",
                "url": "https://{rest_api_root}/v1/pjm/project_properties/name",
                "name": "名称",
                "type": "text",
                "options": null
            }
        }
    ]
}
```

在项目中移除一个项目属性

用于在项目中移除一个项目属性。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/project_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| property\_id | String | 项目属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| property | Object | 属性的引用结构数据。 |

```json
{
    "id": "risk",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/project_properties/risk",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "property": {
        "id": "risk",
        "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
        "name": "项目风险",
        "type": "select",
        "options": [
            {
                "_id": "5efb1859110533727a82c603",
                "text": "高"
            },
            {
                "_id": "5efb1859110533727a82c604",
                "text": "中"
            },
            {
                "_id": "5efb1859110533727a82c605",
                "text": "低"
            }
        ]
    }
}
```

开启项目本地配置

用于开启项目本地配置。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/local_config/enable
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

```json
{}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目的id。 |
| url | String | 项目的地址。 |
| type | String | 项目的类型。 |
| process\_id | String | 项目流程的id。 |
| scope\_type | String | 项目的所属类型。 |
| scope\_id | String | 项目的所属id。 |
| name | String | 项目的名称。 |
| color | String | 项目的主题色。 |
| identifier | String | 项目的标识。 |
| visibility | String | 项目的可见性。 |
| description | String | 项目的描述。 |
| is\_local\_config\_enabled | Number | 是否已启用本地配置。 |
| created\_at | Number | 项目的创建时间。 |
| created\_by | Object | 项目的创建人。 |
| updated\_at | Number | 项目的更新时间。 |
| updated\_by | Object | 项目的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
    "type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "Scrum项目",
    "color": "#F693E7",
    "identifier": "SCR",
    "visibility": "private",
    "description": "这是一个scrum类型的项目",
    "is_local_config_enabled": 1,
    "created_at": 1583290300,
    "updated_at": 1583290300,
    "is_archived": 0,
    "is_deleted": 0
}
```

迭代

创建一个迭代

用于创建一个迭代。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprints
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 迭代的名称。 |
| start\_at | Number | 迭代开始的时间。 |
| end\_at | Number | 迭代结束的时间。 |
| assignee\_id | String | 迭代负责人的id。 |
| description 可选 | String | 迭代的描述。 |
| status 可选 | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| category\_ids 可选 | String\[\] | 迭代类别的id数组。 |

```json
{
    "name": "Sprint 2",
    "start_at": 1589791860,
    "end_at": 1589791860,
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "description": "This is sprint 2",
    "status": "pending",
    "category_ids": [
        "676a460a0fd987b7ea320887"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代的id。 |
| url | String | 迭代的地址。 |
| project | Object | 迭代所属项目的引用结构数据。 |
| name | String | 迭代的名称。 |
| status | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| assignee | Object | 迭代负责人的引用结构数据。 |
| start\_at | Number | 迭代的计划开始时间。 |
| end\_at | Number | 迭代的计划结束时间。 |
| description | String | 迭代的描述。 |
| started\_at | Number | 迭代的实际开始时间。 |
| completed\_at | Number | 迭代的实际完成时间。 |
| total\_story\_points | Number | 迭代的总故事点。 |
| started\_story\_points | Number | 迭代已开始的故事点。 |
| completed\_story\_points | Number | 迭代已完成的故事点。 |
| categories | Object\[\] | 迭代关联的类别列表。 |
| created\_at | Number | 迭代的创建时间。 |
| created\_by | Object | 迭代创建人的引用结构数据。 |
| updated\_at | Number | 迭代的更新时间。 |
| updated\_by | Object | 迭代更新人的引用结构数据。 |

```json
{
    "id": "5ecf7b74eaab845a2aa53132",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53132",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Sprint 2",
    "status": "pending",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1589791860,
    "end_at": 1589791860,
    "description": "This is sprint 2",
    "started_at": 1589791860,
    "completed_at": 1589791960,
    "total_story_points": 0,
    "started_story_points": 0,
    "completed_story_points": 0,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320887",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
            "name": "Category 1"
        }
    ],
    "created_at": 1676454024,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1676454024,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

批量创建迭代

用于批量创建迭代。

```html
https://{rest_api_root}/v1/pjm/sprints/bulk
```

令牌: 企业令牌

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| sprints | Object\[\] | 需要批量创建的迭代。该参数是一个对象数组（数组内对象不得超过100个）。 |
| sprints.project\_id | String | 迭代所属项目的id。 |
| sprints.name | String | 迭代的名称。 |
| sprints.start\_at | Number | 迭代开始的时间。 |
| sprints.end\_at | Number | 迭代结束的时间。 |
| sprints.assignee\_id | String | 迭代负责人的id。 |
| sprints.description 可选 | String | 迭代的描述。 |
| sprints.status 可选 | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| sprints.category\_ids 可选 | String\[\] | 迭代类别的id列表。 |

```json
{
    "sprints": [
        {
            "project_id": "5eb623f6a70571487ea47000",
            "name": "Sprint 3",
            "start_at": 1589791860,
            "end_at": 1589791860,
            "assignee_id": "a0417f68e846aae315c85d24643678a9",
            "description": "This is sprint 3",
            "status": "pending",
            "category_ids": [
                "5e6b35de50ef8153c2062f70"
            ]
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 批量创建结果的状态。 |
| sprint | Object | 迭代的全量结构数据。创建成功时返回。 |

```json
[
    {
        "state": "success",
        "sprint": {
            "id": "5ecf7b74eaab845a2aa53134",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53134",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "Sprint 3",
            "status": "pending",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "start_at": 1589791860,
            "end_at": 1589791860,
            "description": "This is sprint 3",
            "started_at": 1589791860,
            "completed_at": 1589791960,
            "total_story_points": 0,
            "started_story_points": 0,
            "completed_story_points": 0,
            "categories": [
                {
                    "id": "676a460a0fd987b7ea320887",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
                    "name": "Category 1"
                }
            ],
            "created_at": 1676454024,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1676454024,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    }
]
```

获取一个迭代

用于查看一个迭代。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprints/{sprint_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| sprint\_id | String | 迭代的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代的id。 |
| url | String | 迭代的地址。 |
| project | Object | 迭代所属项目的引用结构数据。 |
| name | String | 迭代的名称。 |
| status | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| assignee | Object | 迭代负责人的引用结构数据。 |
| start\_at | Number | 迭代的计划开始时间。 |
| end\_at | Number | 迭代的计划结束时间。 |
| description | String | 迭代的描述。 |
| started\_at | Number | 迭代的实际开始时间。 |
| completed\_at | Number | 迭代的实际完成时间。 |
| total\_story\_points | Number | 迭代的总故事点。 |
| started\_story\_points | Number | 迭代已开始的故事点。 |
| completed\_story\_points | Number | 迭代已完成的故事点。 |
| categories | Object\[\] | 迭代关联的类别列表。 |
| created\_at | Number | 迭代的创建时间。 |
| created\_by | Object | 迭代的创建人。 |
| updated\_at | Number | 迭代的更新时间。 |
| updated\_by | Object | 迭代的更新人。 |

```json
{
    "id": "5ecf7b74eaab845a2aa53138",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53138",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Sprint 1",
    "status": "completed",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1589791860,
    "end_at": 1589791860,
    "description": "This is sprint 1",
    "started_at": 1589791860,
    "completed_at": 1589791960,
    "total_story_points": 0,
    "started_story_points": 0,
    "completed_story_points": 0,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320887",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
            "name": "Category 1"
        }
    ],
    "created_at": 1676454024,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1676454024,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

部分更新一个迭代

用于部分更新一个迭代。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprints/{sprint_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| sprint\_id | String | 迭代的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 迭代的名称。 |
| start\_at 可选 | Number | 迭代开始的时间。 |
| end\_at 可选 | Number | 迭代结束的时间。 |
| assignee\_id 可选 | String | 迭代负责人的id。 |
| description 可选 | String | 迭代的描述。 |
| status 可选 | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| category\_ids 可选 | String\[\] | 迭代类别的id列表。 |

```json
{
    "name": "Sprint 2",
    "start_at": 1589791860,
    "end_at": 1589791860,
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "description": "This is sprint 2",
    "status": "in_progress",
    "category_ids": [
        "5e6b35de50ef8153c2062f70"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代的id。 |
| url | String | 迭代的地址。 |
| project | Object | 迭代所属项目的引用结构数据。 |
| name | String | 迭代的名称。 |
| status | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| assignee | Object | 迭代负责人的引用结构数据。 |
| start\_at | Number | 迭代的计划开始时间。 |
| end\_at | Number | 迭代的计划结束时间。 |
| description | String | 迭代的描述。 |
| started\_at | Number | 迭代的实际开始时间。 |
| completed\_at | Number | 迭代的实际完成时间。 |
| total\_story\_points | Number | 迭代的总故事点。 |
| started\_story\_points | Number | 迭代已开始的故事点。 |
| completed\_story\_points | Number | 迭代已完成的故事点。 |
| categories | Object\[\] | 迭代关联的类别列表。 |
| created\_at | Number | 迭代的创建时间。 |
| created\_by | Object | 迭代创建人的引用结构数据。 |
| updated\_at | Number | 迭代的更新时间。 |
| updated\_by | Object | 迭代更新人的引用结构数据。 |

```json
{
    "id": "5ecf7b74eaab845a2aa53132",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53132",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Sprint 2",
    "status": "in_progress",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "start_at": 1589791860,
    "end_at": 1589791860,
    "description": "This is sprint 2",
    "started_at": 1589791860,
    "completed_at": 1589791960,
    "total_story_points": 0,
    "started_story_points": 0,
    "completed_story_points": 0,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320887",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
            "name": "Category 1"
        }
    ],
    "created_at": 1676454024,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1676454024,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取迭代列表

用于查询迭代列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprints
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 迭代的名称。 |
| status 可选 | String | 迭代的状态。  允许值: `pending`, `in_progress`, `completed` |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 迭代全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5ecf7b74eaab845a2aa53138",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53138",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "Sprint 1",
            "status": "completed",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "start_at": 1589791860,
            "end_at": 1589791860,
            "description": "This is sprint 1",
            "started_at": 1589791860,
            "completed_at": 1589791960,
            "total_story_points": 0,
            "started_story_points": 0,
            "completed_story_points": 0,
            "categories": [
                {
                    "id": "676a460a0fd987b7ea320887",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
                    "name": "Category 1"
                }
            ],
            "created_at": 1676454024,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1676454024,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

创建一个迭代分组

用于创建一个迭代分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_sections
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 迭代分组的名称。 |

```json
{
    "name": "Section 1"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代分组的id。 |
| url | String | 迭代分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代分组的名称。 |

```json
{
    "id": "634f869a0fd987b7ea320833",
    "url": "https://{rest_api_root}/v1/pjm/projects/63560f3ad02cbc4f9df91236/sprint_sections/634f869a0fd987b7ea320833",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Section 1"
}
```

获取一个迭代分组

用于查看一个迭代分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_sections/{section_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| section\_id | String | 迭代分组的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代分组的id。 |
| url | String | 迭代分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代分组的名称。 |

```json
{
    "id": "634f869a0fd987b7ea320833",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Section 1"
}
```

部分更新一个迭代分组

用于部分更新一个迭代分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_sections/{section_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| section\_id | String | 迭代分组的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 迭代分组的名称。 |

```json
{
    "name": "Section 1"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代分组的id。 |
| url | String | 迭代分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代分组的名称。 |

```json
{
    "id": "634f869a0fd987b7ea320833",
    "url": "https://{rest_api_root}/v1/pjm/projects/63560f3ad02cbc4f9df91236/sprint_sections/634f869a0fd987b7ea320833",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Section 1"
}
```

获取迭代分组列表

用于查询迭代分组列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_sections
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 迭代分组全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "634f869a0fd987b7ea320833",
            "url": "https://{rest_api_root}/v1/pjm/projects/63560f3ad02cbc4f9df91236/sprint_sections/634f869a0fd987b7ea320833",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "Section 1"
        },
        {
            "id": "634f869a0fd987b7ea320834",
            "url": "https://{rest_api_root}/v1/pjm/projects/63560f3ad02cbc4f9df91236/sprint_sections/634f869a0fd987b7ea320834",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "Section 2"
        }
    ]
}
```

删除一个迭代分组

用于删除一个迭代分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_sections/{section_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| section\_id | String | 迭代分组的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代分组的id。 |
| url | String | 迭代分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代分组的名称。 |

```json
{
    "id": "634f869a0fd987b7ea320834",
    "url": "https://{rest_api_root}/v1/pjm/projects/63560f3ad02cbc4f9df91236/sprint_sections/634f869a0fd987b7ea320834",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Section 2"
}
```

创建一个迭代类别

用于创建一个迭代类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_categories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 迭代类别的名称。 |
| section\_id 可选 | String | 迭代类别所属迭代分组id。 |

```json
{
    "name": "Category 1",
    "section_id": "634f869a0fd987b7ea320833"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代类别的id。 |
| url | String | 迭代类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代类别的名称。 |
| section | Object | 所属迭代分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320887",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Category 1",
    "section": {
        "id": "634f869a0fd987b7ea320833",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
        "name": "Section 1"
    }
}
```

获取一个迭代类别

用于查看一个迭代类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_categories/{sprint_category_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| sprint\_category\_id | String | 迭代类别的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代类别的id。 |
| url | String | 迭代类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代类别的名称。 |
| section | Object | 所属迭代分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320887",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Category 1",
    "section": {
        "id": "634f869a0fd987b7ea320833",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
        "name": "Section 1"
    }
}
```

部分更新一个迭代类别

用于部分更新一个迭代类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_categories/{sprint_category_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| sprint\_category\_id | String | 迭代类别的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 迭代类别的名称。 |
| section\_id 可选 | String | 迭代类别所属迭代分组id。 |

```json
{
    "name": "Category 2",
    "section_id": "634f869a0fd987b7ea320833"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代类别的id。 |
| url | String | 迭代类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代类别的名称。 |
| section | Object | 所属迭代分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320888",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320888",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Category 2",
    "section": {
        "id": "634f869a0fd987b7ea320833",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
        "name": "Section 1"
    }
}
```

获取迭代类别列表

用于查询迭代类别列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_categories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 迭代类别的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "676a460a0fd987b7ea320887",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320887",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "Category 1",
            "section": {
                "id": "634f869a0fd987b7ea320833",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
                "name": "Section 1"
            }
        },
        {
            "id": "676a460a0fd987b7ea320888",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320888",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "Category 2",
            "section": {
                "id": "634f869a0fd987b7ea320833",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
                "name": "Section 1"
            }
        }
    ]
}
```

删除一个迭代类别

用于删除一个迭代类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/sprint_categories/{sprint_category_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:sprint

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| sprint\_category\_id | String | 迭代类别的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 迭代类别的id。 |
| url | String | 迭代类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 迭代类别的名称。 |
| section | Object | 所属迭代分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320888",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_categories/676a460a0fd987b7ea320888",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "Category 2",
    "section": {
        "id": "634f869a0fd987b7ea320833",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprint_sections/634f869a0fd987b7ea320833",
        "name": "Section 1"
    }
}
```

看板

创建一个看板

用于创建一个看板。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 看板的名字。在同一个项目中该名字是唯一的。 |
| work\_item\_types 可选 | String\[\] | 看板支持的工作项类型列表。自定义工作项类型只支持 `hybrid` 类型项目里的看板。  允许值: `epic`, `feature`, `story`, `task`, `bug`, `issue`, `自定义工作项类型id` |

```json
{
    "name": "一个看板",
    "work_item_types": [
        "epic",
        "feature",
        "story",
        "6385c650fef18f2d7222d15d"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板的id。 |
| url | String | 看板的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 看板的名称。 |
| work\_item\_types | String\[\] | 看板支持的工作项类型列表。 |

```json
{
    "id": "5eb623f6a70571487ea47222",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "一个看板",
    "work_item_types": [
        "epic",
        "feature",
        "story",
        "6385c650fef18f2d7222d15d"
    ]
}
```

获取一个看板

用于查看一个看板。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板的id。 |
| url | String | 看板的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 看板的名称。 |
| work\_item\_types | String\[\] | 看板支持的工作项类型列表。 |

```json
{
    "id": "5eb623f6a70571487ea47222",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "kanban",
    "work_item_types": [
        "epic",
        "feature",
        "story"
    ]
}
```

部分更新一个看板

用于部分更新一个看板。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 看板的名字。在同一个项目中该名字是唯一的。 |
| work\_item\_types 可选 | String\[\] | 看板支持的工作项类型列表。  允许值: `epic`, `feature`, `story`, `task`, `bug`, `issue`, `自定义工作项类型id` |

```json
{
    "name": "一个看板",
    "work_item_types": [
        "epic",
        "feature",
        "6385c650fef18f2d7222d15d"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板的id。 |
| url | String | 看板的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 看板的名称。 |
| work\_item\_types | String\[\] | 看板支持的工作项类型列表。 |

```json
{
    "id": "5eb623f6a70571487ea47222",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "一个看板",
    "work_item_types": [
        "epic",
        "feature",
        "6385c650fef18f2d7222d15d"
    ]
}
```

获取看板列表

用于查询看板列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 看板全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb623f6a70571487ea47222",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
            "project": {
                "id": "5eb623f6a70571487ea41919",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
                "identifier": "KANBAN",
                "name": "kanban",
                "type": "kanban",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "kanban",
            "work_item_types": [
                "epic",
                "feature",
                "story"
            ]
        }
    ]
}
```

删除一个看板

用于删除一个看板。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板的id。 |
| url | String | 看板的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 看板的名称。 |
| work\_item\_types | String\[\] | 看板支持的工作项类型列表。 |

```json
{
    "id": "5eb623f6a70571487ea47222",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "一个看板",
    "work_item_types": [
        "epic",
        "feature"
    ]
}
```

创建一个看板栏

用于创建一个看板栏。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/entries
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 看板栏的名称。在同一看板下该名称是唯一的。 |
| wip\_limit 可选 | Number | 在制品数量。 |
| is\_split 可选 | Boolean | 是否将看板栏拆分为进行中和已完成。  默认值: `false` |
| definition\_of\_done 可选 | String | 完成的定义。 |

```json
{
    "name": "一个看板栏",
    "wip_limit": 1,
    "is_split": true,
    "definition_of_done": "Unit test passed"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板栏的id。 |
| url | String | 看板栏的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 看板栏的名称。 |
| is\_system | Number | 是否为系统内置看板栏。  允许值: `0`, `1` |
| is\_split | Boolean | 是否将看板栏拆分为进行中和已完成。 |
| wip\_limit | Number | 在制品数量。 |
| definition\_of\_done | String | 完成的定义。 |

```json
{
    "id": "5ab623f6a70571487ea45634",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222/entries/5ab623f6a70571487ea45634",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47222",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
        "name": "kanban",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "一个看板栏",
    "is_system": 0,
    "is_split": true,
    "wip_limit": 1,
    "definition_of_done": "Unit test passed"
}
```

获取一个看板栏

用于获取一个看板栏。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/entries/{entry_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |
| entry\_id | String | 看板栏的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板栏的id。 |
| url | String | 看板栏的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 看板栏的名称。 |
| is\_system | Number | 是否为系统内置看板栏。  允许值: `0`, `1` |
| is\_split | Boolean | 是否将看板栏拆分为进行中和已完成。 |
| wip\_limit | Number | 在制品数量。 |
| definition\_of\_done | String | 完成的定义。 |

```json
{
    "id": "5ab623f6a70571487ea45634",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222/entries/5ab623f6a70571487ea45634",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47222",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
        "name": "kanban",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "一个看板栏",
    "is_system": 0,
    "is_split": true,
    "wip_limit": 1,
    "definition_of_done": "Unit test passed"
}
```

部分更新一个看板栏

用于部分更新一个看板栏。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/entries/{entry_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |
| entry\_id | String | 看板栏的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 看板栏的名称。在同一看板下该名称是唯一的。 |
| wip\_limit 可选 | Number | 在制品数量。 |
| is\_split 可选 | Boolean | 是否将看板栏拆分为进行中和已完成  默认值: `false` |
| definition\_of\_done 可选 | String | 完成的定义。 |

```json
{
    "name": "需求池",
    "wip_limit": 1,
    "is_split": true,
    "definition_of_done": "Unit test passed"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板栏的id。 |
| url | String | 看板栏的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 看板栏的名称。 |
| is\_system | Number | 是否为系统内置看板栏。  允许值: `0`, `1` |
| is\_split | Boolean | 是否将看板栏拆分为进行中和已完成。 |
| wip\_limit | Number | 在制品数量。 |
| definition\_of\_done | String | 完成的定义。 |

```json
{
    "id": "5ab623f6a70571487ea45634",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/entries/5ab623f6a70571487ea45634",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47223",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
        "name": "默认看板",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "需求池",
    "is_system": 0,
    "is_split": true,
    "wip_limit": 1,
    "definition_of_done": "Unit test passed"
}
```

获取看板栏列表

用于查询看板栏列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/entries
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 看板栏全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5ab623f6a70571487ea45634",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/entries/5ab623f6a70571487ea45634",
            "project": {
                "id": "5eb623f6a70571487ea41919",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
                "identifier": "KANBAN",
                "name": "kanban",
                "type": "kanban",
                "is_archived": 0,
                "is_deleted": 0
            },
            "board": {
                "id": "5eb623f6a70571487ea47223",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
                "name": "默认看板",
                "work_item_types": [
                    "epic",
                    "feature",
                    "story"
                ]
            },
            "name": "需求池",
            "is_system": 0,
            "is_split": true,
            "wip_limit": 1,
            "definition_of_done": "Unit test passed"
        }
    ]
}
```

删除一个看板栏

用于删除一个看板栏。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/entries/{entry_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |
| entry\_id | String | 看板栏的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 看板栏的id。 |
| url | String | 看板栏的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 看板栏的名称。 |
| is\_system | Number | 是否为系统内置看板栏。  允许值: `0`, `1` |
| is\_split | Boolean | 是否将看板栏拆分为进行中和已完成。 |
| wip\_limit | Number | 在制品数量。 |
| definition\_of\_done | String | 完成的定义。 |

```json
{
    "id": "5ab623f6a70571487ea45634",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/entries/5ab623f6a70571487ea45634",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47223",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
        "name": "默认看板",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "需求池",
    "is_system": 0,
    "is_split": true,
    "wip_limit": 1,
    "definition_of_done": "Unit test passed"
}
```

创建一个泳道

用于创建一个泳道。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/swimlanes
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 泳道的名称。在同一看板下该名称是唯一的。 |

```json
{
    "name": "一个泳道"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 泳道的id。 |
| url | String | 泳道的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 泳道的名称。 |
| is\_system | Number | 是否为系统内置泳道。  允许值: `0`, `1` |

```json
{
    "id": "5bb623f6a70571487ea44357",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/swimlanes/5bb623f6a70571487ea44357",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47223",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
        "name": "默认看板",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "一个泳道",
    "is_system": 0
}
```

获取一个泳道

用于获取一个泳道。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/swimlanes/{swimlane_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |
| swimlane\_id | String | 泳道的id. |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 泳道的id。 |
| url | String | 泳道的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 泳道的名称。 |
| is\_system | Number | 是否为系统内置泳道。  允许值: `0`, `1` |

```json
{
    "id": "5bb623f6a70571487ea44357",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/swimlanes/5bb623f6a70571487ea44357",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47223",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
        "name": "默认看板",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "一个泳道",
    "is_system": 0,
    "is_deleted": 0
}
```

部分更新一个泳道

用于部分更新一个泳道。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/swimlanes/{swimlane_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |
| swimlane\_id | String | 泳道的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 泳道的名称。在同一看板下该名称是唯一的。 |

```json
{
    "name": "一个泳道"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 泳道的id。 |
| url | String | 泳道的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 泳道的名称。 |
| is\_system | Number | 是否为系统内置泳道。  允许值: `0`, `1` |

```json
{
    "id": "5bb623f6a70571487ea44357",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/swimlanes/5bb623f6a70571487ea44357",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47223",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
        "name": "默认看板",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "一个泳道",
    "is_system": 0
}
```

获取泳道列表

用于查询泳道列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/swimlanes
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 泳道全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5bb623f6a70571487ea44357",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/swimlanes/5bb623f6a70571487ea44357",
            "project": {
                "id": "5eb623f6a70571487ea41919",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
                "identifier": "KANBAN",
                "name": "kanban",
                "type": "kanban",
                "is_archived": 0,
                "is_deleted": 0
            },
            "board": {
                "id": "5eb623f6a70571487ea47223",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
                "name": "默认看板",
                "work_item_types": [
                    "epic",
                    "feature",
                    "story"
                ]
            },
            "name": "一个泳道",
            "is_system": 0
        }
    ]
}
```

删除一个泳道

用于删除一个泳道。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/boards/{board_id}/swimlanes/{swimlane_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:board

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| board\_id | String | 看板的id。 |
| swimlane\_id | String | 泳道的id. |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 泳道的id。 |
| url | String | 泳道的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| name | String | 泳道的名称。 |
| is\_system | Number | 是否为系统内置泳道。  允许值: `0`, `1` |

```json
{
    "id": "5bb623f6a70571487ea44357",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223/swimlanes/5bb623f6a70571487ea44357",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KANBAN",
        "name": "kanban",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "board": {
        "id": "5eb623f6a70571487ea47223",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47223",
        "name": "默认看板",
        "work_item_types": [
            "epic",
            "feature",
            "story"
        ]
    },
    "name": "一个泳道",
    "is_system": 0
}
```

工作项

创建一个工作项

用于创建一个工作项。

```html
https://{rest_api_root}/v1/pjm/work_items
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| type\_id | String | 工作项类型的id。工作项类型分为9种系统类型和一些自定义类型。系统类型包括：史诗、特性、用户故事、阶段、里程碑、需求、任务、缺陷和事务。可以通过 `获取全部工作项类型列表` 获得。 |
| title | String | 工作项的标题。 |
| description 可选 | String | 工作项的描述。 |
| start\_at 可选 | Number | 工作项的开始时间。当工作项类型为里程碑时，该参数无效。 |
| end\_at 可选 | Number | 工作项的截止时间。 |
| priority\_id 可选 | String | 工作项优先级的id。 |
| state\_id 可选 | String | 工作项状态的id。工作项状态的id在设置时必须同时满足工作项类型的工作项状态方案和工作项状态流转的状态值才能成功完成设置。工作项状态方案可以通过 `获取工作项状态方案列表` 获取。工作项状态流转则可以通过 `获取状态方案中的工作项状态流转列表` 获取。 |
| assignee\_id 可选 | String | 工作项负责人的id。 |
| parent\_id 可选 | String | 工作项的父工作项的id。当前工作项类型支持的父工作类型包含 `parent_id` 对应的工作项类型时，该参数有效。具体配置见属性与视图子工作项配置。 |
| sprint\_id 可选 | String | 所属迭代id。该字段只有项目类型为 `scrum` 和 `hybrid` 时有效。 |
| version\_ids 可选 | String\[\] | 所属发布的id列表。 |
| board\_id 可选 | String | 看板的id。该字段只有项目类型为 `kanban` 和 `hybrid` 时有效。 |
| entry\_id 可选 | String | 看板栏的id。该字段只有项目类型为 `kanban` 和 `hybrid` 时有效。 |
| swimlane\_id 可选 | String | 泳道的id。该字段只有项目类型为 `kanban` 和 `hybrid` 时有效。 |
| story\_points 可选 | Number | 工作项的故事点。当工作项的属性在视图中配置了故事点属性时，该参数生效。故事点数值必须是大于等于0的整数或最多包含一位小数的正数。 |
| estimated\_workload 可选 | Number | 工作项的预估工时。 |
| remaining\_workload 可选 | Number | 工作项的剩余工时。 |
| properties 可选 | Object | 工作项属性的键值对集合，需要注意的是，当前工作项类型对应的工作项属性方案需要包含这些工作项属性，例如工作项属性方案中包含 `prop_a` 和 `prop_b` 。 |
| properties.prop\_a 可选 | Object | 工作项属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 工作项属性 `prop_b` 。 |
| participant\_ids 可选 | String\[\] | 工作项关注人的id列表。 |

```json
{
    "project_id": "5eb623f6a70571487ea47000",
    "type_id": "bug",
    "title": "这是一个缺陷",
    "description": "这是一个缺陷的描述",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "state_id": "5c9b35de90ad7153c2062f18",
    "parent_id": "5edca112b06305c524cad2fa",
    "sprint_id": "5ecf7b74eaab845a2aa53138",
    "version_ids": [
        "5eb623487ea47001f6a70571"
    ],
    "board_id": "5eb623f6a70571487ea47222",
    "entry_id": "5ee1c4fac5b3c51206f0a861",
    "swimlane_id": "5ee1c4fac5b3c51206f0a866",
    "priority_id": "5eb623f6a70571487ea47111",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "participant_ids": [
        "a0417f68e846aae315c85d24643678a9"
    ],
    "story_points": 1,
    "estimated_workload": 1,
    "remaining_workload": 1,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项的id。 |
| url | String | 工作项的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| identifier | String | 工作项的标识。 |
| title | String | 工作项的标题。 |
| type | String | 工作项的类型。 |
| start\_at | Number | 工作项的开始时间。 |
| end\_at | Number | 工作项的结束时间。 |
| parent\_id | String | 工作项的父工作项id。 |
| short\_id | String | 工作项的短id。 |
| html\_url | String | 工作项的html地址。 |
| parent | Object | 父工作项的引用结构数据。 |
| assignee | Object | 负责人的引用结构数据。 |
| state | Object | 工作项状态的引用结构数据。 |
| priority | Object | 工作项优先级的引用结构数据。 |
| versions | Object\[\] | 所属发布的引用结构数据列表。 |
| sprint | Object | 所属迭代的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| entry | Object | 所属看板栏的引用结构数据。 |
| swimlane | Object | 所属泳道的引用结构数据。 |
| phase | Object | 所属计划的引用结构数据。 |
| description | String | 工作项的描述。 |
| completed\_at | Number | 工作项的完成时间。 |
| story\_points | Number | 工作项的故事点。 |
| estimated\_workload | Number | 工作项的预估工时。 |
| remaining\_workload | Number | 工作项的剩余工时。 |
| properties | Object | 工作项自定义属性的键值对集合。 |
| tags | Object\[\] | 工作项标签的引用结构数据列表。 |
| participants | Object\[\] | 工作项关注人的引用结构数据列表。 |
| created\_at | Number | 工作项的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca524cad2fa1125cb0630",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SCR-5",
    "title": "这是一个缺陷",
    "type": "bug",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "parent_id": "5edca112b06305c524cad2fa",
    "short_id": "1bAqLmTG",
    "html_url": "https://yctech.pingcode.com/pjm/workitems/1bAqLmTG",
    "parent": {
        "id": "5edca112b06305c524cad2fa",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca112b06305c524cad2fa",
        "identifier": "SCR-3",
        "title": "这是一个用户故事",
        "type": "story",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b06309c",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value",
            "risk": null,
            "business_value": null,
            "effort": null,
            "backlog_type": null,
            "backlog_from": null
        }
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "versions": [
        {
            "id": "5eb623487ea47001f6a70571",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623487ea47001f6a70571",
            "name": "1.0.1",
            "start_at": 1565255712,
            "end_at": 1565255879,
            "stage": {
                "id": "5f44a8f8bb347b14b49624a1",
                "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                "name": "未开始",
                "type": "pending",
                "color": "#FA8888"
            }
        }
    ],
    "sprint": {
        "id": "5ecf7b74eaab845a2aa53138",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53138",
        "name": "Sprint 1",
        "start_at": 1589791860,
        "end_at": 1589791860,
        "status": "completed"
    },
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    },
    "priority": {
        "id": "5eb623f6a70571487ea47111",
        "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
        "name": "最高"
    },
    "board": null,
    "entry": null,
    "swimlane": null,
    "phase": null,
    "description": "这是一个缺陷的描述",
    "completed_at": 1583290347,
    "story_points": 1,
    "estimated_workload": 1,
    "remaining_workload": 1,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value",
        "severity": null,
        "replay_version": null,
        "reappear_probability": null,
        "bug_type": null,
        "reason": null,
        "solution": null,
        "replay_step": null
    },
    "tags": [],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca524cad2fa1125cb0630",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个工作项

用于查看一个工作项。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id或short\_id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |
| include\_deleted 可选 | Boolean | 是否包含已删除的工作项。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否包含已归档的工作项。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项的id。 |
| url | String | 工作项的地址。 |
| project | Object | 工作项所属的项目。 |
| identifier | String | 工作项的标识。 |
| title | String | 工作项的标题。 |
| type | String | 工作项的类型。工作项类型分为9种系统类型和一些自定义类型。系统类型包括：史诗、特性、用户故事、阶段、里程碑、需求、任务、缺陷和事务。 |
| start\_at | Number | 工作项的开始时间。 |
| end\_at | Number | 工作项的结束时间。 |
| parent\_id | String | 工作项的父工作项id。 |
| short\_id | String | 工作项的短id。 |
| html\_url | String | 工作项的html地址。 |
| parent | Object | 工作项的父工作项。 |
| assignee | Object | 工作项的负责人。 |
| state | Object | 工作项的状态。 |
| priority | Object | 工作项的优先级。 |
| version | Object | 工作项属的发布。 |
| sprint | Object | 工作项所属的迭代。 |
| board | Object | 工作项所属的看板。 |
| entry | Object | 工作项所属的看板栏。 |
| swimlane | Object | 工作项的所属的泳道。 |
| phase | Object | 工作项的所属计划。 |
| description | String | 工作项的描述。 |
| completed\_at | Number | 工作项的完成时间。 |
| story\_points | Number | 工作项的故事点。 |
| estimated\_workload | Number | 工作项的预估工时。 |
| remaining\_workload | Number | 工作项的剩余工时。 |
| properties | Object | 工作项的自定义属性。自定义属性包括用户自定义的属性和一些系统内置的属性。用户自定义的属性例如 `prop_a` 和 `prop_b` 。系统内置的属性例如 `bug_type` 、 `solution` 和 `risk` 等。 |
| tags | Object\[\] | 工作项的标签列表。 |
| participants | Object\[\] | 工作项的关注人列表。 |
| public\_image\_token | String | 工作项描述和自定义多行文本类型属性里获取图片资源token。获取一个工作项和获取工作项列表参数 `include_public_image_token` 值有效时返回。 |
| created\_at | Number | 工作项的创建时间。 |
| created\_by | Object | 工作项的创建人。 |
| updated\_at | Number | 工作项的更新时间。 |
| updated\_by | Object | 工作项的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "6efca131b06329c524cdd2fb",
    "url": "https://{rest_api_root}/v1/pjm/work_items/6efca131b06329c524cdd2fb",
    "project": {
        "id": "5eb623f6a70571487ea47004",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004",
        "identifier": "HBR",
        "name": "Hybrid项目",
        "type": "hybrid",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "HBR-1",
    "title": "这是一个用户故事",
    "type": "story",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "parent_id": "5edfa3b67463c1ee626c0980",
    "short_id": "eqWqLmTO",
    "html_url": "https://yctech.pingcode.com/pjm/workitems/eqWqLmTO",
    "parent": {
        "id": "5edfa3b67463c1ee626c0980",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edfa3b67463c1ee626c0980",
        "identifier": "HBR-2",
        "title": "这是一个特性",
        "type": "feature",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": null,
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value",
            "risk": null,
            "business_value": null,
            "effort": null,
            "backlog_type": null,
            "backlog_from": null
        }
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "version": {
        "id": "5eb623487ea47001f6a70571",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/versions/5eb623487ea47001f6a70582",
        "name": "1.0.1",
        "start_at": 1565255712,
        "end_at": 1565255879,
        "stage": {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "type": "pending",
            "color": "#FA8888"
        }
    },
    "sprint": {
        "id": "5ecf7b74eaab845a2aa53139",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/sprints/5ecf7b74eaab845a2aa53139",
        "name": "Sprint 1",
        "start_at": 1589791860,
        "end_at": 1589791860,
        "status": "completed"
    },
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    },
    "priority": {
        "id": "5eb623f6a70571487ea47111",
        "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
        "name": "最高"
    },
    "board": {
        "id": "5eb623f6a70571487ea47333",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/boards/5eb623f6a70571487ea47333",
        "name": "kanban",
        "work_item_types": [
            "epic",
            "feature",
            "issue",
            "story"
        ]
    },
    "entry": {
        "id": "5ee1c4fac5b3c51206f0a862",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/boards/5eb623f6a70571487ea47333/entries/5ee1c4fac5b3c51206f0a862",
        "name": "需求池"
    },
    "swimlane": {
        "id": "5ee1c4fac5b3c51206f0a867",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/boards/5eb623f6a70571487ea47333/swimlanes/5ee1c4fac5b3c51206f0a867",
        "name": "默认泳道"
    },
    "phase": {
        "id": "63761fee31caaf77189816b5",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/phases/63761fee31caaf77189816b5",
        "title": "这是一个阶段",
        "identifier": "WTF-1"
    },
    "description": "<p>这是一个用户故事的描述<p><img src=\"https://atlas.pingcode.com/files/public/689a9d124df436ef91923a3a\" originUrl=\"https://atlas.pingcode.com/files/public/689a9d124df436ef91923a3a\" alt=\"图片.png\" size=\"35460\" style=\"text-align: center;\" />",
    "completed_at": 1583290347,
    "story_points": 1,
    "estimated_workload": 1,
    "remaining_workload": 1,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value",
        "risk": null,
        "backlog_type": null,
        "backlog_from": null
    },
    "tags": [
        {
            "id": "5e6b35de50ef8153c2062f70",
            "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
            "name": "标签-1"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca112b06305c524cad2fa",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "public_image_token": "-fkvANQ2dcVECK6Xg45L3kG8VCbOTK8NrNckGkxljRY",
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个工作项

用于部分更新一个工作项。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title 可选 | String | 工作项的标题。 |
| description 可选 | String | 工作项的描述。 |
| start\_at 可选 | Number | 工作项的开始时间。当工作项类型为里程碑时，该参数无效。 |
| end\_at 可选 | Number | 工作项的截止时间。 |
| priority\_id 可选 | String | 工作项优先级的id。 |
| state\_id 可选 | String | 工作项状态的id。工作项状态的id在设置时必须同时满足工作项类型的工作项状态方案和工作项状态流转的状态值才能成功完成设置。工作项状态方案可以通过 `获取工作项状态方案列表` 获取。工作项状态流转则可以通过 `获取状态方案中的工作项状态流转列表` 获取。 |
| assignee\_id 可选 | String | 工作项负责人的id。 |
| parent\_id 可选 | String | 工作项的父工作项的id。当前工作项类型支持的父工作类型包含 `parent_id` 对应的工作项类型时，该参数有效。具体配置见属性与视图子工作项配置。 |
| version\_ids 可选 | String\[\] | 所属发布的id列表。 |
| board\_id 可选 | String | 看板的id。该字段只有项目类型为 `kanban` 和 `hybrid` 时有效。 |
| entry\_id 可选 | String | 看板栏的id。该字段只有项目类型为 `kanban` 和 `hybrid` 时有效。 |
| swimlane\_id 可选 | String | 泳道的id。该字段只有项目类型为 `kanban` 和 `hybrid` 时有效。 |
| phase\_id 可选 | String | 所属计划的id。该字段只有项目类型为 `waterfall` 和 `hybrid` 时有效。 |
| story\_points 可选 | Number | 工作项的故事点。当工作项的属性在视图中配置了故事点属性时，该参数生效。故事点数值必须是大于等于0的整数或最多包含一位小数的正数。 |
| estimated\_workload 可选 | Number | 工作项的预估工时。 |
| remaining\_workload 可选 | Number | 工作项的剩余工时。 |
| properties 可选 | Object | 工作项属性的键值对集合，需要注意的是，当前工作项类型对应的工作项属性方案需要包含这些工作项属性，例如工作项属性方案中包含 `prop_a` 和 `prop_b` 。 |
| properties.prop\_a 可选 | Object | 工作项属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 工作项属性 `prop_b` 。 |

```json
{
    "title": "这是一个用户故事",
    "description": "这是一个用户故事的描述",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "sprint_id": "5ecf7b74eaab845a2aa53138",
    "version_ids": [
        "5eb623487ea47001f6a70571"
    ],
    "priority_id": "5eb623f6a70571487ea47111",
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "story_points": 1,
    "state_id": "5c9b35de90ad7153c2062f18",
    "parent_id": "5edfa3b67463c1ee626c0979",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项的id。 |
| url | String | 工作项的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| identifier | String | 工作项的标识。 |
| title | String | 工作项的标题。 |
| type | String | 工作项的类型。 |
| start\_at | Number | 工作项的开始时间。 |
| end\_at | Number | 工作项的结束时间。 |
| parent\_id | String | 工作项的父工作项id。 |
| short\_id | String | 工作项的短id。 |
| html\_url | String | 工作项的html地址。 |
| parent | Object | 父工作项的引用结构数据。 |
| assignee | Object | 负责人的引用结构数据。 |
| state | Object | 工作项状态的引用结构数据。 |
| priority | Object | 工作项优先级的引用结构数据。 |
| versions | Object\[\] | 所属发布的引用结构数据列表。 |
| sprint | Object | 所属迭代的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| entry | Object | 所属看板栏的引用结构数据。 |
| swimlane | Object | 所属泳道的引用结构数据。 |
| phase | Object | 所属计划的引用结构数据。 |
| description | String | 工作项的描述。 |
| completed\_at | Number | 工作项的完成时间。 |
| story\_points | Number | 工作项的故事点。 |
| estimated\_workload | Number | 工作项的预估工时。 |
| remaining\_workload | Number | 工作项的剩余工时。 |
| properties | Object | 工作项自定义属性的键值对集合。 |
| tags | Object\[\] | 工作项标签的引用结构数据列表。 |
| participants | Object\[\] | 工作项关注人的引用结构数据列表。 |
| created\_at | Number | 工作项的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca112b06305c524cad2fa",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca112b06305c524cad2fa",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "SCR-3",
    "title": "这是一个用户故事",
    "type": "story",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "parent_id": "5edfa3b67463c1ee626c0979",
    "short_id": "b9WqLmTO",
    "html_url": "https://yctech.pingcode.com/pjm/workitems/b9WqLmTO",
    "parent": {
        "id": "5edfa3b67463c1ee626c0979",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edfa3b67463c1ee626c0979",
        "identifier": "SCR-2",
        "title": "这是一个特性",
        "type": "feature",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b06306c",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value",
            "risk": null,
            "business_value": null,
            "effort": null,
            "backlog_type": null,
            "backlog_from": null
        }
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "versions": [
        {
            "id": "5eb623487ea47001f6a70571",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623487ea47001f6a70571",
            "name": "1.0.1",
            "start_at": 1565255712,
            "end_at": 1565255879,
            "stage": {
                "id": "5f44a8f8bb347b14b49624a1",
                "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                "name": "未开始",
                "type": "pending",
                "color": "#FA8888"
            }
        }
    ],
    "sprint": {
        "id": "5ecf7b74eaab845a2aa53138",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53138",
        "name": "Sprint 1",
        "start_at": 1589791860,
        "end_at": 1589791860,
        "status": "completed"
    },
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    },
    "priority": {
        "id": "5eb623f6a70571487ea47111",
        "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
        "name": "最高"
    },
    "board": null,
    "entry": null,
    "swimlane": null,
    "phase": null,
    "story_points": 1,
    "estimated_workload": 1,
    "remaining_workload": 1,
    "description": "这是一个用户故事的描述",
    "completed_at": 1583290347,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value",
        "risk": null,
        "backlog_type": null,
        "backlog_from": null
    },
    "tags": [],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca112b06305c524cad2fa",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583293300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

批量部分更新工作项属性

用于批量部分更新工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_items
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| ids | String\[\] | 需要更新的工作项的id列表。最多可以批量更新100个工作项。 |
| property\_name | String | 需要更新的工作项属性名。  允许值: `title`, `start_at`, `end_at`, `description`, `priority_id`, `assignee_id`, `state_id`, `story_points`, `estimated_workload`, `remaining_workload`, `自定义属性` |
| property\_value 可选 | String | 需要更新的工作项属性值。 |

```json
{
    "ids": [
        "547000eb6a70571487623fea"
    ],
    "property_name": "title",
    "property_value": "这是一个工作项"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| inserts | Number | 新增条数。 |
| updates | Number | 更新条数。 |
| deletes | Number | 删除条数。 |

```json
{
    "inserts": 0,
    "updates": 1,
    "deletes": 0
}
```

获取工作项列表

用于简单查询工作项列表。  
更复杂的组合过滤、日期过滤、自定义属性过滤等场景，请使用「搜索工作项列表」接口。

```html
https://{rest_api_root}/v1/pjm/work_items
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| identifier 可选 | String | 工作项编号。 |
| project\_id 可选 | String | 项目的 id。 |
| type\_id 可选 | String | 工作项类型的 id 或系统类型枚举。工作项类型分为 9 种系统类型（如 `story` 、 `bug` ）和一些自定义类型，可通过「获取工作项类型列表」获得自定义类型的 id。 |
| parent\_id 可选 | String | 父工作项的 id。 |
| assignee\_id 可选 | String | 负责人的 id。 |
| state\_id 可选 | String | 工作项状态的 id。 |
| priority\_id 可选 | String | 工作项优先级的 id。 |
| bug\_type\_id 可选 | String | 缺陷类别的 id。 |
| tag\_id 可选 | String | 工作项标签的 id。 |
| sprint\_id 可选 | String | 迭代的 id。 |
| board\_id 可选 | String | 看板的 id。 |
| entry\_id 可选 | String | 看板栏的 id。 |
| swimlane\_id 可选 | String | 泳道的 id。 |
| phase\_id 可选 | String | 所属计划的 id。 |
| version\_id 可选 | String | 发布的 id。 |
| created\_by 可选 | String | 创建人的 id。 |
| participant\_id 可选 | String | 工作项关注人的 id。 |
| keywords 可选 | String | 关键字。支持工作项编号和工作项标题。 |
| include\_public\_image\_token 可选 | String | 包含获取图片资源 token 的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |
| include\_deleted 可选 | Boolean | 是否查询已删除的工作项。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否查询已归档的工作项。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 4,
    "values": [
        {
            "id": "5edca524cad2fa112b06305c",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa112b06305c",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SCR-1",
            "title": "这是一个史诗",
            "type": "epic",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": null,
            "short_id": "d9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/d9WqLmTO",
            "parent": null,
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "versions": null,
            "sprint": null,
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            },
            "priority": {
                "id": "5eb623f6a70571487ea47111",
                "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
                "name": "最高"
            },
            "board": null,
            "entry": null,
            "swimlane": null,
            "phase": null,
            "description": "这是一个史诗的描述",
            "completed_at": 1583290347,
            "story_points": null,
            "estimated_workload": 1,
            "remaining_workload": 1,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value",
                "risk": null,
                "business_value": null,
                "effort": 123,
                "backlog_from": null
            },
            "tags": [
                {
                    "id": "5e6b35de50ef8153c2062f70",
                    "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
                    "name": "标签-1"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca524cad2fa112b06305c",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "73UNZyxnxUVvzKXe6KMs7ZUsEaTx3AGaBP3-Y9GE-Df",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        },
        {
            "id": "5edfa3b67463c1ee626c0979",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edfa3b67463c1ee626c0979?include_deleted=true&include_archived=true",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SCR-2",
            "title": "这是一个特性",
            "type": "feature",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06305c",
            "short_id": "a9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/a9WqLmTO",
            "parent": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa112b06305c",
                "identifier": "SCR-1",
                "title": "这是一个史诗",
                "type": "epic",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": null,
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value",
                    "risk": null,
                    "business_value": null,
                    "effort": null,
                    "backlog_type": null,
                    "backlog_from": null
                }
            },
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "versions": [
                {
                    "id": "5eb623487ea47001f6a70571",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623487ea47001f6a70571",
                    "name": "1.0.1",
                    "start_at": 1565255712,
                    "end_at": 1565255879,
                    "stage": {
                        "id": "5f44a8f8bb347b14b49624a1",
                        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                        "name": "未开始",
                        "type": "pending",
                        "color": "#FA8888"
                    }
                }
            ],
            "sprint": null,
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            },
            "priority": {
                "id": "5eb623f6a70571487ea47111",
                "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
                "name": "最高"
            },
            "board": null,
            "entry": null,
            "swimlane": null,
            "phase": null,
            "description": "这是一个特性的描述",
            "completed_at": 1583290347,
            "story_points": null,
            "estimated_workload": 1,
            "remaining_workload": 1,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value",
                "risk": null,
                "business_value": null,
                "effort": null,
                "backlog_type": null,
                "backlog_from": null
            },
            "tags": [
                {
                    "id": "5e6b35de50ef8153c2062f70",
                    "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
                    "name": "标签-1"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edfa3b67463c1ee626c0979",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "73UNZyxnxUVvzKXe6KMs7ZUsEaTx3AGaBP3-Y9GE-fC",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 1,
            "is_deleted": 1
        },
        {
            "id": "5edca112b06305c524cad2fa",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edca112b06305c524cad2fa",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SCR-3",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edfa3b67463c1ee626c0979",
            "short_id": "b9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/b9WqLmTO",
            "parent": {
                "id": "5edfa3b67463c1ee626c0979",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5edfa3b67463c1ee626c0979",
                "identifier": "SCR-2",
                "title": "这是一个特性",
                "type": "feature",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": "5edca524cad2fa112b06305g",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value",
                    "risk": null,
                    "business_value": null,
                    "effort": null,
                    "backlog_type": null,
                    "backlog_from": null
                }
            },
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "versions": [
                {
                    "id": "5eb623487ea47001f6a70571",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623487ea47001f6a70571",
                    "name": "1.0.1",
                    "start_at": 1565255712,
                    "end_at": 1565255879,
                    "stage": {
                        "id": "5f44a8f8bb347b14b49624a1",
                        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                        "name": "未开始",
                        "type": "pending",
                        "color": "#FA8888"
                    }
                }
            ],
            "sprint": {
                "id": "5ecf7b74eaab845a2aa53138",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/sprints/5ecf7b74eaab845a2aa53138",
                "name": "Sprint 1",
                "start_at": 1589791860,
                "end_at": 1589791860,
                "status": "completed"
            },
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            },
            "priority": {
                "id": "5eb623f6a70571487ea47111",
                "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
                "name": "最高"
            },
            "board": null,
            "entry": null,
            "swimlane": null,
            "phase": null,
            "description": "这是一个用户故事的描述",
            "completed_at": 1583290347,
            "story_points": 1,
            "estimated_workload": 1,
            "remaining_workload": 1,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value",
                "risk": null,
                "backlog_type": null,
                "backlog_from": null
            },
            "tags": [
                {
                    "id": "5e6b35de50ef8153c2062f70",
                    "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
                    "name": "标签-1"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca112b06305c524cad2fa",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "73UNZyxnxUVvzKXe6KMs7ZUsEaTx3AGaBP3-Y9GE-Hm",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        },
        {
            "id": "5edca5d2fa112b06305c24ca",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edca5d2fa112b06305c24ca",
            "project": {
                "id": "6375cc81e3004de4ea14aa52",
                "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
                "identifier": "WTF",
                "name": "瀑布项目",
                "type": "waterfall",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "WTF-2",
            "title": "这是一个瀑布项目下需求类型的工作项",
            "type": "630da48bc9443b1aa94ce3ea",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "versions": null,
            "sprint": null,
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            },
            "priority": {
                "id": "5eb623f6a70571487ea47111",
                "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
                "name": "最高"
            },
            "board": null,
            "entry": null,
            "swimlane": null,
            "phase": {
                "id": "63761fee31caaf77189816b4",
                "url": "https://{rest_api_root}/v1/pjm/projects/63761fee31caaf7718981698/phases/63761fee31caaf77189816b4",
                "title": "这是一个阶段",
                "identifier": "WTF-1"
            },
            "description": "这是一个瀑布项目下需求类型的工作项描述",
            "completed_at": 1583290347,
            "story_points": null,
            "estimated_workload": 1,
            "remaining_workload": 1,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value",
                "backlog_type": null,
                "backlog_from": null
            },
            "tags": [
                {
                    "id": "5e6b35de50ef8153c2062f70",
                    "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
                    "name": "标签-1"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca112b06305c524cad2fa",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "73UNZyxnxUVvzKXe6KMs7ZUsEaTx3AGaBP3-Y9GE-Ki",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        },
        {
            "id": "6efca131b06329c524cdd2fb",
            "url": "https://{rest_api_root}/v1/pjm/work_items/6efca131b06329c524cdd2fb",
            "project": {
                "id": "5eb623f6a70571487ea47004",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004",
                "identifier": "HBR",
                "name": "Hybrid项目",
                "type": "hybrid",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "HBR-1",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edfa3b67463c1ee626c0980",
            "short_id": "e9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/e9WqLmTO",
            "parent": {
                "id": "5edfa3b67463c1ee626c0980",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5edfa3b67463c1ee626c0980",
                "identifier": "HBR-2",
                "title": "这是一个特性",
                "type": "feature",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": null,
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value",
                    "risk": null,
                    "business_value": null,
                    "effort": null,
                    "backlog_type": null,
                    "backlog_from": null
                }
            },
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "versions": [
                {
                    "id": "5eb623487ea47001f6a70571",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623487ea47001f6a70571",
                    "name": "1.0.1",
                    "start_at": 1565255712,
                    "end_at": 1565255879,
                    "stage": {
                        "id": "5f44a8f8bb347b14b49624a1",
                        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                        "name": "未开始",
                        "type": "pending",
                        "color": "#FA8888"
                    }
                }
            ],
            "sprint": {
                "id": "5ecf7b74eaab845a2aa53139",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/sprints/5ecf7b74eaab845a2aa53139",
                "name": "Sprint 1",
                "start_at": 1589791860,
                "end_at": 1589791860,
                "status": "completed"
            },
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            },
            "priority": {
                "id": "5eb623f6a70571487ea47111",
                "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
                "name": "最高"
            },
            "board": {
                "id": "5eb623f6a70571487ea47333",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/boards/5eb623f6a70571487ea47333",
                "name": "kanban",
                "work_item_types": [
                    "epic",
                    "feature",
                    "issue",
                    "story"
                ]
            },
            "entry": {
                "id": "5ee1c4fac5b3c51206f0a862",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/boards/5eb623f6a70571487ea47333/entries/5ee1c4fac5b3c51206f0a862",
                "name": "需求池"
            },
            "swimlane": {
                "id": "5ee1c4fac5b3c51206f0a867",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/boards/5eb623f6a70571487ea47333/swimlanes/5ee1c4fac5b3c51206f0a867",
                "name": "默认泳道"
            },
            "phase": {
                "id": "63761fee31caaf77189816b5",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47004/phases/63761fee31caaf77189816b5",
                "title": "这是一个阶段",
                "identifier": "WTF-1"
            },
            "description": "<p>这是一个用户故事的描述<p><img src=\"https://atlas.pingcode.com/files/public/689a9d124df436ef91923a3a\" originUrl=\"https://atlas.pingcode.com/files/public/689a9d124df436ef91923a3a\" alt=\"图片.png\" size=\"35460\" style=\"text-align: center;\" />",
            "completed_at": 1583290347,
            "story_points": 1,
            "estimated_workload": 1,
            "remaining_workload": 1,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value",
                "risk": null,
                "backlog_type": null,
                "backlog_from": null
            },
            "tags": [
                {
                    "id": "5e6b35de50ef8153c2062f70",
                    "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
                    "name": "标签-1"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca112b06305c524cad2fa",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "73UNZyxnxUVvzKXe6KMs7ZUsEaTx3AGaBP3-Y9GE-Ac",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

搜索工作项列表

用于按条件搜索工作项列表。

```html
https://{rest_api_root}/v1/pjm/work_items/search
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

Body

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| mode | String | 搜索模式。 `query` 表示基于 `payload.filter` 的结构化条件查询。  允许值: `query` |
| payload | Object | 搜索参数。 |
| payload.filter 可选 | Object | 过滤条件。   过滤时使用类 MongoDB 的查询语法，可通过属性名、操作符和对应值进行过滤。   引用类型（含数组引用类型）使用 `{属性名}.id` 作为属性名，例如 `project.id` 、 `versions.id` 、 `tags.id` 、 `participants.id` 。   自定义属性使用 `properties.{属性key}` 作为属性名，例如 `properties.prop_a` 。   文本类型（如 `title` 、 `description` ，以及自定义单行文本、多行文本、链接类型）的操作符： `exists` 、 `contains` 。   枚举类型（如 `type` ）的操作符： `exists` 、 `in` 、 `nin` 。   数字类型（如 `story_points` ，以及自定义数字、进度、评分类型）的操作符： `exists` 、 `eq` 、 `ne` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 。   时间类型（如 `start_at` 、 `created_at` ，以及自定义日期）的操作符： `exists` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 、 `between` （值为 `[起始时间戳, 结束时间戳]` ；过滤时以「天」为单位。   选项类型（自定义下拉单选、下拉多选、级联单选、级联多选）的操作符： `exists` 、 `in` 、 `nin` 。   引用类型（如 `project.id` 、 `assignee.id` 、 `versions.id` 、 `tags.id` 、 `participants.id` ）的操作符： `exists` 、 `in` 、 `nin` 。   每个属性仅支持一个操作符。   暂不支持使用逻辑运算符。   内置属性暂不支持过滤： `id` 、 `url` 、 `identifier` 、 `short_id` 、 `html_url` 、 `public_image_token` 、 `is_archived` 、 `is_deleted` 。 |
| payload.keywords 可选 | String | 关键字。支持工作项编号和工作项标题。 |
| payload.include\_public\_image\_token 可选 | String | 包含获取图片资源 token 的属性。使用 `,` 分割，最多 32 个，支持 `description` 和自定义多行文本类型的属性。 |
| payload.include\_deleted 可选 | Boolean | 是否查询已删除的工作项。  默认值: `false` |
| payload.include\_archived 可选 | Boolean | 是否查询已归档的工作项。  默认值: `false` |
| payload.page\_size 可选 | Number | 每页条数，取值范围 1-100。  默认值: `30` |
| payload.page\_index 可选 | Number | 页码，从 0 开始。  默认值: `0` |

```json
{
    "mode": "query",
    "payload": {
        "filter": {
            "title": {
                "contains": "用户故事"
            },
            "assignee.id": {
                "nin": [
                    "315c85d24643678a9a0417f68e846aae"
                ]
            },
            "project.id": {
                "in": [
                    "5eb623f6a70571487ea47000",
                    "5eb623f6a70571487ea47001"
                ]
            },
            "versions.id": {
                "in": [
                    "5eb623487ea47001f6a70571"
                ]
            },
            "tags.id": {
                "in": [
                    "5e6b35de50ef8153c2062f70"
                ]
            },
            "participants.id": {
                "in": [
                    "a0417f68e846aae315c85d24643678a9"
                ]
            },
            "end_at": {
                "gte": 1730000000
            }
        },
        "keywords": "xxx",
        "include_public_image_token": "description",
        "include_deleted": false,
        "include_archived": false,
        "page_size": 10,
        "page_index": 0
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项全量结构数据的数组。 |

```json
{
    "page_size": 10,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5edca524cad2fa112b06305c",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa112b06305c",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "SCR-1",
            "title": "这是一个史诗",
            "type": "epic",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": null,
            "short_id": "d9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/d9WqLmTO",
            "parent": null,
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "versions": null,
            "sprint": null,
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            },
            "priority": {
                "id": "5eb623f6a70571487ea47111",
                "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
                "name": "最高"
            },
            "board": null,
            "entry": null,
            "swimlane": null,
            "phase": null,
            "description": "这是一个史诗的描述",
            "completed_at": 1583290347,
            "story_points": null,
            "estimated_workload": 1,
            "remaining_workload": 1,
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value",
                "risk": null,
                "business_value": null,
                "effort": 123,
                "backlog_from": null
            },
            "tags": [
                {
                    "id": "5e6b35de50ef8153c2062f70",
                    "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
                    "name": "标签-1"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca524cad2fa112b06305c",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "73UNZyxnxUVvzKXe6KMs7ZUsEaTx3AGaBP3-Y9GE-Df",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

删除一个工作项

用于删除一个工作项。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项的id。 |
| url | String | 工作项的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| identifier | String | 工作项的标识。 |
| title | String | 工作项的标题。 |
| type | String | 工作项的类型。 |
| start\_at | Number | 工作项的开始时间。 |
| end\_at | Number | 工作项的结束时间。 |
| short\_id | String | 工作项的短id。 |
| html\_url | String | 工作项的html地址。 |
| assignee | Object | 负责人的引用结构数据。 |
| state | Object | 工作项状态的引用结构数据。 |
| priority | Object | 工作项优先级的引用结构数据。 |
| versions | Object\[\] | 所属发布的引用结构数据列表。 |
| sprint | Object | 所属迭代的引用结构数据。 |
| board | Object | 所属看板的引用结构数据。 |
| entry | Object | 所属看板栏的引用结构数据。 |
| swimlane | Object | 所属泳道的引用结构数据。 |
| phase | Object | 所属计划的引用结构数据。 |
| description | String | 工作项的描述。 |
| completed\_at | Number | 工作项的完成时间。 |
| story\_points | Number | 工作项的故事点。 |
| estimated\_workload | Number | 工作项的预估工时。 |
| remaining\_workload | Number | 工作项的剩余工时。 |
| properties | Object | 工作项自定义属性的键值对集合。 |
| tags | Object\[\] | 工作项标签的引用结构数据列表。 |
| participants | Object\[\] | 工作项关注人的引用结构数据列表。 |
| created\_at | Number | 工作项的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca5d2fa112b06305c24ca",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca5d2fa112b06305c24ca?include_deleted=true",
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "KB",
        "name": "看板项目",
        "type": "kanban",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "KB-1",
    "title": "这是一个事务",
    "type": "issue",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "short_id": "c9WqLmTO",
    "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "versions": null,
    "sprint": null,
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    },
    "priority": {
        "id": "5eb623f6a70571487ea47111",
        "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
        "name": "最高"
    },
    "board": {
        "id": "5eb623f6a70571487ea47222",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222",
        "name": "kanban",
        "work_item_types": [
            "epic",
            "feature",
            "issue",
            "story"
        ]
    },
    "entry": {
        "id": "5ee1c4fac5b3c51206f0a861",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222/entries/5ee1c4fac5b3c51206f0a861",
        "name": "需求池"
    },
    "swimlane": {
        "id": "5ee1c4fac5b3c51206f0a866",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/boards/5eb623f6a70571487ea47222/swimlanes/5ee1c4fac5b3c51206f0a866",
        "name": "默认泳道"
    },
    "phase": null,
    "description": "这是一个事务的描述",
    "completed_at": 1583290347,
    "story_points": null,
    "estimated_workload": 1,
    "remaining_workload": 1,
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value",
        "entry_status": null,
        "entry_position": null,
        "operation_time": 1691571221
    },
    "tags": [
        {
            "id": "5e6b35de50ef8153c2062f70",
            "url": "https://{rest_api_root}/v1/pjm/tags/5e6b35de50ef8153c2062f70",
            "name": "标签-1"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=work_item&principal_id=5edca5d2fa112b06305c24ca",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 1
}
```

获取工作项类型列表

用于查询工作项类型列表。

```html
https://{rest_api_root}/v1/pjm/work_item/types?project_id={project_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项类型全量结构数据的数组。 |

响应示例（scrum项目）：

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 6,
    "values": [
        {
            "id": "epic",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/epic",
            "name": "史诗",
            "group": "requirement"
        },
        {
            "id": "feature",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/feature",
            "name": "特性",
            "group": "requirement"
        },
        {
            "id": "story",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/story",
            "name": "用户故事",
            "group": "requirement"
        },
        {
            "id": "task",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/task",
            "name": "任务",
            "group": "task"
        },
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        }
    ]
}
```

响应示例（kanban项目）：

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 6,
    "values": [
        {
            "id": "epic",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/epic",
            "name": "史诗",
            "group": "requirement"
        },
        {
            "id": "feature",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/feature",
            "name": "特性",
            "group": "requirement"
        },
        {
            "id": "story",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/story",
            "name": "用户故事",
            "group": "requirement"
        },
        {
            "id": "task",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/task",
            "name": "任务",
            "group": "task"
        },
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "issue",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/issue",
            "name": "事务",
            "group": "issue"
        }
    ]
}
```

响应示例（waterfall项目）：

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 6,
    "values": [
        {
            "id": "630da48bc9443b1aa94ce3ea",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
            "name": "需求",
            "group": "requirement"
        },
        {
            "id": "task",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/task",
            "name": "任务",
            "group": "task"
        },
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue"
        },
        {
            "id": "630da48bc9443b1aa94ce3ee",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ee",
            "name": "阶段",
            "group": "plan"
        },
        {
            "id": "630da48bc9443b1aa94ce3ef",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ef",
            "name": "里程碑",
            "group": "plan"
        }
    ]
}
```

响应示例（hybrid项目）：

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 9,
    "values": [
        {
            "id": "epic",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/epic",
            "name": "史诗",
            "group": "requirement"
        },
        {
            "id": "feature",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/feature",
            "name": "特性",
            "group": "requirement"
        },
        {
            "id": "story",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/story",
            "name": "用户故事",
            "group": "requirement"
        },
        {
            "id": "task",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/task",
            "name": "任务",
            "group": "task"
        },
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "issue",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/issue",
            "name": "事务",
            "group": "issue"
        },
        {
            "id": "630da48bc9443b1aa94ce3ea",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
            "name": "需求",
            "group": "requirement"
        },
        {
            "id": "630da48bc9443b1aa94ce3ee",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ee",
            "name": "阶段",
            "group": "plan"
        },
        {
            "id": "630da48bc9443b1aa94ce3ef",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ef",
            "name": "里程碑",
            "group": "plan"
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue"
        }
    ]
}
```

获取工作项状态列表

用于查询工作项状态列表。

```html
https://{rest_api_root}/v1/pjm/work_item/states?project_id={project_id}&work_item_type_id={work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| work\_item\_type\_id | String | 工作项类型的id。工作项类型分为9种系统类型和一些自定义类型。系统类型包括：史诗、特性、用户故事、阶段、里程碑、需求、任务、缺陷和事务。可以通过 `获取全部工作项类型列表` 获得。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项状态的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5c9b35de90ad7153c2062f18",
            "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
            "name": "新建",
            "type": "pending",
            "color": "#ff7575"
        }
    ]
}
```

获取工作项属性列表

用于查询工作项属性列表。

```html
https://{rest_api_root}/v1/pjm/work_item/properties?project_id={project_id}&work_item_type_id={work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| work\_item\_type\_id | String | 工作项类型的id。工作项类型分为9种系统类型和一些自定义类型。系统类型包括：史诗、特性、用户故事、阶段、里程碑、需求、任务、缺陷和事务。可以通过 `获取全部工作项类型列表` 获得。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "severity",
            "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
            "name": "严重程度",
            "type": "select",
            "options": [
                {
                    "_id": "5efb1859110533727a82c603",
                    "text": "严重"
                },
                {
                    "_id": "5efb1859110533727a82c604",
                    "text": "一般"
                }
            ]
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/pjm/work_item_properties/identifier",
            "name": "编号",
            "type": "text",
            "options": null
        }
    ]
}
```

获取工作项优先级列表

用于查询工作项优先级列表。

```html
https://{rest_api_root}/v1/pjm/work_item/priorities?project_id={project_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项优先级全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb623f6a70571487ea47111",
            "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
            "name": "最高"
        }
    ]
}
```

获取工作项标签列表

用于查询工作项标签列表。

```html
https://{rest_api_root}/v1/pjm/work_item/tags
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| name 可选 | String | 标签的名称。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项标签的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5e6b35de50ef8153c2062f70",
            "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
            "name": "标签-1"
        }
    ]
}
```

向工作项中添加一个标签

用于向工作项中添加一个标签。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/tags
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| tag\_id | String | 标签的id。 |

```json
{
    "tag_id": "5e6b35de50ef8153c2062f70"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| work\_item | Object | 工作项的引用结构数据。 |
| tag | Object | 标签的引用结构数据。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630/tags/5e6b35de50ef8153c2062f70",
    "work_item": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b05105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "tag": {
        "id": "5e6b35de50ef8153c2062f70",
        "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
        "name": "标签-1"
    }
}
```

获取工作项中的一个标签

用于查询工作项中的一个标签。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |
| tag\_id | String | 标签的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| work\_item | Object | 工作项的引用结构数据。 |
| tag | Object | 标签的引用结构数据。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630/tags/5e6b35de50ef8153c2062f70",
    "work_item": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b05105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "tag": {
        "id": "5e6b35de50ef8153c2062f70",
        "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
        "name": "标签-1"
    }
}
```

在工作项中移除一个标签

用于在工作项中移除一个标签。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |
| tag\_id | String | 标签的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| work\_item | Object | 工作项的引用结构数据。 |
| tag | Object | 标签的引用结构数据。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630/tags/5e6b35de50ef8153c2062f70",
    "work_item": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa112b05105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "tag": {
        "id": "5e6b35de50ef8153c2062f70",
        "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
        "name": "标签-1"
    }
}
```

获取一个工作项关联类型

用于查看一个工作项关联类型。

```html
https://{rest_api_root}/v1/pjm/work_item_relation_types/{relation_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| relation\_type\_id | String | 工作项关联类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项关联类型的id。 |
| url | String | 工作项关联类型的地址。 |
| name | String | 工作项关联类型的名称。 |
| category | String | 关联类型分类。  允许值: `mention`, `clone`, `cloned_by`, `duplicate`, `relate`, `cause`, `caused_by`, `block`, `blocked_by`, `dependency` |
| is\_system | Number | 是否为系统预设类型。 |

```json
{
    "id": "676510af06fd48a4a4e12616",
    "url": "https://{rest_api_root}/v1/pjm/work_item_relation_types/676510af06fd48a4a4e12616",
    "name": "重复",
    "category": "duplicate",
    "is_system": 1
}
```

获取工作项关联类型列表

用于查询工作项关联类型列表。

```html
https://{rest_api_root}/v1/pjm/work_item/relation_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项关联类型的全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 1,
    "values": [
        {
            "id": "676510af06fd48a4a4e12616",
            "url": "https://{rest_api_root}/v1/pjm/work_item_relation_types/676510af06fd48a4a4e12616",
            "name": "重复",
            "category": "duplicate",
            "is_system": 1
        }
    ]
}
```

关联一个工作项

用于关联一个工作项。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/relations
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| target\_work\_item\_id | String | 目标工作项的id。 |
| relation\_type | String | 关联的类型。  允许值: `mention`, `clone`, `cloned_by`, `duplicate`, `relate`, `cause`, `caused_by`, `block`, `blocked_by`, `dependency`, `自定义关联类型的id` |

```json
{
    "target_work_item_id": "5f9a65ef20ef8153c1462e64",
    "relation_type": "relate"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项关联的id。 |
| url | String | 工作项关联的地址。 |
| relation\_type | String | 关联的类型。  允许值: `mention`, `clone`, `cloned_by`, `duplicate`, `relate`, `cause`, `caused_by`, `block`, `blocked_by`, `dependency`, `自定义关联类型的id` |
| origin\_work\_item | Object | 源工作项的引用结构数据。 |
| target\_work\_item | Object | 目标工作项的引用结构数据。 |

```json
{
    "id": "58fb35de50ef8153c2062e36",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112/relations/58fb35de50ef8153c2062e36",
    "relation_type": "relate",
    "origin_work_item": {
        "id": "5edca524cad2b06305cfa112",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112",
        "identifier": "SCR-4",
        "title": "这是一个任务",
        "type": "task",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "target_work_item": {
        "id": "5f9a65ef20ef8153c1462e64",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5f9a65ef20ef8153c1462e64",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": null,
        "short_id": "a9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/a9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    }
}
```

获取一个工作项关联

用于查看一个工作项关联。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/relations/{relation_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |
| relation\_id | String | 工作项关联的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项关联的id。 |
| url | String | 工作项关联的地址。 |
| relation\_type | String | 关联的类型。  允许值: `mention`, `clone`, `cloned_by`, `duplicate`, `relate`, `cause`, `caused_by`, `block`, `blocked_by`, `dependency`, `自定义关联类型的id` |
| origin\_work\_item | Object | 源工作项的引用结构数据。 |
| target\_work\_item | Object | 目标工作项的引用结构数据。 |

```json
{
    "id": "58fb35de50ef8153c2062e36",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112/relations/58fb35de50ef8153c2062e36",
    "relation_type": "relate",
    "origin_work_item": {
        "id": "5edca524cad2b06305cfa112",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112",
        "identifier": "SCR-4",
        "title": "这是一个任务",
        "type": "task",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "target_work_item": {
        "id": "5f9a65ef20ef8153c1462e64",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5f9a65ef20ef8153c1462e64",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": null,
        "short_id": "a9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/a9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    }
}
```

获取关联的工作项列表

用于查询关联的工作项列表。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/relations
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| relation\_type 可选 | String | 关联的类型。  允许值: `mention`, `clone`, `cloned_by`, `duplicate`, `relate`, `cause`, `caused_by`, `block`, `blocked_by`, `dependency`, `自定义关联类型的id` |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 关联的工作项全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "58fb35de50ef8153c2062e36",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112/relations/58fb35de50ef8153c2062e36",
            "relation_type": "relate",
            "origin_work_item": {
                "id": "5edca524cad2b06305cfa112",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112",
                "identifier": "SCR-4",
                "title": "这是一个任务",
                "type": "task",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": "5edca524cad2fa1125cb0629",
                "short_id": "c9WqLmTO",
                "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "target_work_item": {
                "id": "5f9a65ef20ef8153c1462e64",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5f9a65ef20ef8153c1462e64",
                "identifier": "SCR-5",
                "title": "这是一个缺陷",
                "type": "bug",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": null,
                "short_id": "a9WqLmTO",
                "html_url": "https://yctech.pingcode.com/pjm/workitems/a9WqLmTO",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            }
        }
    ]
}
```

取消关联一个工作项

用于取消关联一个工作项。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/relations/{relation_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |
| relation\_id | String | 工作项关联的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项关联的id。 |
| url | String | 工作项关联的地址。 |
| relation\_type | String | 关联的类型。  允许值: `mention`, `clone`, `cloned_by`, `duplicate`, `relate`, `cause`, `caused_by`, `block`, `blocked_by`, `dependency`, `自定义关联类型的id` |
| origin\_work\_item | Object | 源工作项的引用结构数据。 |
| target\_work\_item | Object | 目标工作项的引用结构数据。 |

```json
{
    "id": "58fb35de50ef8153c2062e36",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112/relations/58fb35de50ef8153c2062e36",
    "relation_type": "relate",
    "origin_work_item": {
        "id": "5edca524cad2b06305cfa112",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2b06305cfa112",
        "identifier": "SCR-4",
        "title": "这是一个任务",
        "type": "task",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "target_work_item": {
        "id": "5f9a65ef20ef8153c1462e64",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5f9a65ef20ef8153c1462e64",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": null,
        "short_id": "a9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/a9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    }
}
```

获取一个工作项流转记录

用于查看一个工作项流转记录。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/transition_histories/{transition_history_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |
| transition\_history\_id | String | 工作项流转记录的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项流转记录的id。 |
| url | String | 工作项流转记录的地址。 |
| work\_item | Object | 工作项的引用结构数据。 |
| from\_state | Object | 流转前状态的引用结构数据。 |
| to\_state | Object | 流转后状态的引用结构数据。 |
| created\_at | Number | 流转记录的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630/transition_histories/5e6b35de50ef8153c2062f70",
    "work_item": {
        "id": "5edca524cad2fa1125cb0630",
        "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
        "identifier": "SCR-5",
        "title": "这是一个缺陷",
        "type": "bug",
        "start_at": 1674493200,
        "end_at": 1674493200,
        "parent_id": "5edca524cad2fa112b05105c",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "from_state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#56ABFB"
    },
    "to_state": {
        "id": "5ef85b1e9481936604da7f4c",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5ef85b1e9481936604da7f4c",
        "name": "进行中",
        "type": "in_progress",
        "color": "#F6C659"
    },
    "created_at": 1674528614,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取工作项流转记录列表

用于查询工作项流转记录列表。

```html
https://{rest_api_root}/v1/pjm/work_items/{work_item_id}/transition_histories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:workitem

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项流转记录的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5e6b35de50ef8153c2062f70",
            "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630/transition_histories/5e6b35de50ef8153c2062f70",
            "work_item": {
                "id": "5edca524cad2fa1125cb0630",
                "url": "https://{rest_api_root}/v1/pjm/work_items/5edca524cad2fa1125cb0630",
                "identifier": "SCR-5",
                "title": "这是一个缺陷",
                "type": "bug",
                "start_at": 1674493200,
                "end_at": 1674493200,
                "parent_id": "5edca524cad2fa112b05105c",
                "short_id": "c9WqLmTO",
                "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "from_state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#56ABFB"
            },
            "to_state": {
                "id": "5ef85b1e9481936604da7f4c",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5ef85b1e9481936604da7f4c",
                "name": "进行中",
                "type": "in_progress",
                "color": "#F6C659"
            },
            "created_at": 1674528614,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

创建一个工作项交付目标

用于创建一个工作项交付目标。

```html
https://{rest_api_root}/v1/pjm/deliverables
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id | String | 工作项的id。工作项所属项目类型必须为 `waterfall` 或 `hybrid` 。 |
| name | String | 工作项交付目标的名称。 |
| content\_type 可选 | String | 工作项交付物的类型。工作项交付物的类型。只支持 `link` 。 `attachment` 类型的交付物通过 `向交付目标中上传一个文件` 接口上传附件。 |
| content 可选 | String | 工作项交付物。当工作项交付物的类型是 `link` 时，工作项交付物为包含name和href的对象，例如： `{ "name": "链接工作项交付目标",  "href": "https://{rest_api_root}/wiki/spaces/public/pages/6472e6f2f1968d3fdb0aba15" }` 。当工作项交付物不为空时，参数必须包含交付物类型。 |

```json
{
    "work_item_id": "63761fee31caaf77189816b4",
    "name": "工作项交付目标",
    "content_type": "link",
    "content": {
        "name": "PingCode",
        "href": "https://www.pingcode.com"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项交付目标的id。 |
| url | String | 工作项交付目标的地址。 |
| name | String | 工作项交付目标的名称。 |
| content\_type | String | 工作项交付物的类型。  允许值: `link`, `attachment`, `page` |
| content | Object | 工作项交付物的引用结构数据。 |
| project | Object | 所属项目的引用结构数据。 |
| work\_item | Object | 所属工作项的引用结构数据。 |
| created\_at | Number | 工作项交付目标的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项交付目标的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "63761fee31caaf7718981876",
    "url": "https://{rest_api_root}/v1/pjm/deliverables/63761fee31caaf7718981876",
    "name": "阶段交付目标",
    "content_type": "link",
    "content": {
        "name": "PingCode",
        "href": "https://www.pingcode.com"
    },
    "project": {
        "id": "6375cc81e3004de4ea14aa52",
        "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
        "identifier": "WTF",
        "name": "瀑布项目",
        "type": "waterfall",
        "is_archived": 0,
        "is_deleted": 0
    },
    "work_item": {
        "id": "63761fee31caaf77189816b4",
        "url": "https://{rest_api_root}/v1/pjm/work_items/63761fee31caaf77189816b4",
        "identifier": "WTF-5",
        "title": "这是一个阶段",
        "type": "630da48bc9443b1aa94ce3ee",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "created_at": 1668685806,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1668685806,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个工作项交付目标

用于查看一个工作项交付目标。

```html
https://{rest_api_root}/v1/pjm/deliverables/{deliverable_target_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deliverable\_target\_id | String | 工作项交付目标的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项交付目标的id。 |
| url | String | 工作项交付目标的地址。 |
| name | String | 工作项交付目标的名称。 |
| content\_type | String | 工作项交付物的类型。  允许值: `link`, `attachment`, `page` |
| content | Object | 工作项交付物的引用结构数据。 |
| project | Object | 所属项目的引用结构数据。 |
| work\_item | Object | 所属工作项的引用结构数据。 |
| created\_at | Number | 工作项交付目标的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项交付目标的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "63761fee31caaf7718981876",
    "url": "https://{rest_api_root}/v1/pjm/deliverables/63761fee31caaf7718981876",
    "name": "阶段交付目标",
    "content_type": "link",
    "content": {
        "name": "PingCode",
        "href": "https://www.pingcode.com"
    },
    "project": {
        "id": "6375cc81e3004de4ea14aa52",
        "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
        "identifier": "WTF",
        "name": "瀑布项目",
        "type": "waterfall",
        "is_archived": 0,
        "is_deleted": 0
    },
    "work_item": {
        "id": "63761fee31caaf77189816b4",
        "url": "https://{rest_api_root}/v1/pjm/work_items/63761fee31caaf77189816b4",
        "identifier": "WTF-5",
        "title": "这是一个阶段",
        "type": "630da48bc9443b1aa94ce3ee",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "created_at": 1668685806,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1668685806,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个工作项交付目标

用于部分更新一个工作项交付目标。

```html
https://{rest_api_root}/v1/pjm/deliverables/{deliverable_target_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deliverable\_target\_id | String | 工作项交付目标id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_id 可选 | String | 工作项的id。 |
| name 可选 | String | 工作项交付目标的名称。 |
| content\_type 可选 | String | 工作项交付物的类型。只支持 `link` 。 `attachment` 类型的交付物通过 `向交付目标中上传一个文件` 接口上传附件。 |
| content 可选 | String | 工作项交付物。当工作项交付物的类型是 `link` 时，工作项交付物为包含name和href的对象，例如： `{ "name": "链接工作项交付目标",  "href": "https://{rest_api_root}/wiki/spaces/public/pages/6472e6f2f1968d3fdb0aba15" }` 。当工作项交付物不为空时，参数必须包含交付物类型。 |

```json
{
    "work_item_id": "63761fee31caaf77189816b4",
    "name": "工作项交付目标",
    "content_type": "link",
    "content": {
        "name": "PingCode",
        "href": "https://www.pingcode.com"
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项交付目标的id。 |
| url | String | 工作项交付目标的地址。 |
| name | String | 工作项交付目标的名称。 |
| content\_type | String | 工作项交付物的类型。  允许值: `link`, `attachment`, `page` |
| content | Object | 工作项交付物的引用结构数据。 |
| project | Object | 所属项目的引用结构数据。 |
| work\_item | Object | 所属工作项的引用结构数据。 |
| created\_at | Number | 工作项交付目标的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项交付目标的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "63761fee31caaf7718981876",
    "url": "https://{rest_api_root}/v1/pjm/deliverables/63761fee31caaf7718981876",
    "name": "阶段交付目标",
    "content_type": "link",
    "content": {
        "name": "PingCode",
        "href": "https://www.pingcode.com"
    },
    "project": {
        "id": "6375cc81e3004de4ea14aa52",
        "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
        "identifier": "WTF",
        "name": "瀑布项目",
        "type": "waterfall",
        "is_archived": 0,
        "is_deleted": 0
    },
    "work_item": {
        "id": "63761fee31caaf77189816b4",
        "url": "https://{rest_api_root}/v1/pjm/work_items/63761fee31caaf77189816b4",
        "identifier": "WTF-5",
        "title": "这是一个阶段",
        "type": "630da48bc9443b1aa94ce3ee",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "created_at": 1668685806,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1668687806,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取工作项交付目标列表

用于查询工作项交付目标列表。

```html
https://{rest_api_root}/v1/pjm/deliverables
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:project

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id 可选 | String | 项目的id。项目类型必须为 `waterfall` 或 `hybrid` 。 |
| work\_item\_id 可选 | String | 工作项的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项交付目标全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "63761fee31caaf7718981876",
            "url": "https://{rest_api_root}/v1/pjm/deliverables/63761fee31caaf7718981876",
            "name": "阶段交付目标",
            "content_type": "link",
            "content": {
                "name": "PingCode",
                "href": "https://www.pingcode.com"
            },
            "project": {
                "id": "6375cc81e3004de4ea14aa52",
                "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
                "identifier": "WTF",
                "name": "瀑布项目",
                "type": "waterfall",
                "is_archived": 0,
                "is_deleted": 0
            },
            "work_item": {
                "id": "63761fee31caaf77189816b4",
                "url": "https://{rest_api_root}/v1/pjm/work_items/63761fee31caaf77189816b4",
                "identifier": "WTF-5",
                "title": "这是一个阶段",
                "type": "630da48bc9443b1aa94ce3ee",
                "start_at": 1583290309,
                "end_at": 1583290347,
                "parent_id": "5edca524cad2fa1125cb0629",
                "short_id": "c9WqLmTO",
                "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "created_at": 1668685806,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1668685806,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        },
        {
            "id": "63761fee31caaf7718981877",
            "url": "https://{rest_api_root}/v1/pjm/deliverables/63761fee31caaf7718981877",
            "name": "缺陷交付目标",
            "content_type": "attachment",
            "content": {
                "id": "64abd9050461799795b6ea3e",
                "url": "https://{rest_api_root}/v1/attachments/64abd9050461799795b6ea3e?deliverable_target_id=63761fee31caaf7718981877",
                "title": "fixed.png",
                "size": 11396,
                "type": "file"
            },
            "project": {
                "id": "6375cc81e3004de4ea14aa52",
                "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
                "identifier": "WTF",
                "name": "瀑布项目",
                "type": "waterfall",
                "is_archived": 0,
                "is_deleted": 0
            },
            "work_item": {
                "id": "63761fee31caaf77189816b5",
                "url": "https://{rest_api_root}/v1/pjm/work_items/63761fee31caaf77189816b5",
                "identifier": "WTF-6",
                "title": "这是一个缺陷",
                "type": "bug",
                "start_at": 1583290319,
                "end_at": 1583290357,
                "parent_id": "5edca524cad2fa1125cb0623",
                "short_id": "c9WqLmTO",
                "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "created_at": 1668685816,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1668685816,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

删除一个工作项交付目标

用于删除一个工作项交付目标。

```html
https://{rest_api_root}/v1/pjm/deliverables/{deliverable_target_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:project

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deliverable\_target\_id | String | 工作项交付目标的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项交付目标的id。 |
| url | String | 工作项交付目标的地址。 |
| name | String | 工作项交付目标的名称。 |
| content\_type | String | 工作项交付物的类型。  允许值: `link`, `attachment`, `page` |
| content | Object | 工作项交付物的引用结构数据。 |
| project | Object | 所属项目的引用结构数据。 |
| work\_item | Object | 所属工作项的引用结构数据。 |
| created\_at | Number | 工作项交付目标的创建时间。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 工作项交付目标的更新时间。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。 |
| is\_deleted | Number | 是否已删除。 |

```json
{
    "id": "63761fee31caaf7718981876",
    "url": "https://{rest_api_root}/v1/pjm/deliverables/63761fee31caaf7718981876",
    "name": "阶段交付目标",
    "content_type": "link",
    "content": {
        "name": "PingCode",
        "href": "https://www.pingcode.com"
    },
    "project": {
        "id": "6375cc81e3004de4ea14aa52",
        "url": "https://{rest_api_root}/v1/pjm/projects/6375cc81e3004de4ea14aa52",
        "identifier": "WTF",
        "name": "瀑布项目",
        "type": "waterfall",
        "is_archived": 0,
        "is_deleted": 0
    },
    "work_item": {
        "id": "63761fee31caaf77189816b4",
        "url": "https://{rest_api_root}/v1/pjm/work_items/63761fee31caaf77189816b4",
        "identifier": "WTF-5",
        "title": "这是一个阶段",
        "type": "630da48bc9443b1aa94ce3ee",
        "start_at": 1583290309,
        "end_at": 1583290347,
        "parent_id": "5edca524cad2fa1125cb0629",
        "short_id": "c9WqLmTO",
        "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "created_at": 1668685806,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1668685806,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 1
}
```

发布

创建一个发布

用于创建一个发布。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/versions
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 发布的名称。同一项目下该名称是唯一的。 |
| start\_at | Number | 开始的时间。 |
| end\_at | Number | 发布的时间。 |
| assignee\_id | String | 负责人的id。 |
| stage\_id 可选 | String | 发布阶段的id。 |
| category\_ids 可选 | String\[\] | 发布类别id数组。 |

```json
{
    "name": "1.0.0",
    "start_at": 1565193600,
    "end_at": 1566403200,
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "stage_id": "5f44a8f8bb347b14b49624a1",
    "category_ids": [
        "676a460a0fd987b7ea320889"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布的id。 |
| url | String | 发布的地址。 |
| project | Object | 发布所属项目的引用结构数据。 |
| name | String | 发布的名称。 |
| start\_at | Number | 发布的开始时间。 |
| end\_at | Number | 发布的结束时间。 |
| stage | Object | 发布的当前阶段。 |
| assignee | Object | 发布负责人的引用结构数据。 |
| stages | Object\[\] | 发布的阶段列表。 |
| progress | Number | 发布的进度。 |
| changelog | String | 发布的发布日志。 |
| operate\_at | Number | 发布的最后操作时间。 |
| categories | Object\[\] | 发布的类别列表。 |
| created\_at | Number | 发布的创建时间。 |
| created\_by | Object | 发布创建人的引用结构数据。 |
| updated\_at | Number | 发布的更新时间。 |
| updated\_by | Object | 发布更新人的引用结构数据。 |

```json
{
    "id": "5eb623f6a70571487ea47001",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623f6a70571487ea47001",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "type": "scrum",
        "name": "Scrum项目",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "1.0.0",
    "start_at": 1565193600,
    "end_at": 1566403200,
    "stage": {
        "id": "5f44a8f8bb347b14b49624a1",
        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
        "name": "未开始",
        "type": "pending",
        "color": "#FA8888"
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "stages": [
        {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "operate_at": null
        },
        {
            "id": "5f44a8f8bb347b14b49624a2",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a2",
            "name": "进行中",
            "operate_at": null
        },
        {
            "id": "5f44a8f8bb347b14b49624a3",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a3",
            "name": "已发布",
            "operate_at": null
        }
    ],
    "progress": 0,
    "changelog": null,
    "operate_at": 1565255712,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320889",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
            "name": "私有部署发布"
        }
    ],
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

批量创建发布

用于批量创建发布。

```html
https://{rest_api_root}/v1/pjm/versions/bulk
```

令牌: 企业令牌

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| versions | Object\[\] | 需要批量创建的发布。该参数是一个对象数组（数组内对象不得超过100个）。 |
| versions.project\_id | String | 发布所属项目的id。 |
| versions.name | String | 发布的名称。 |
| versions.start\_at | Number | 发布的开始时间。 |
| versions.end\_at | Number | 发布的时间。 |
| versions.assignee\_id | String | 发布负责人的id。 |
| versions.stage\_id | String | 发布的阶段id。 |
| versions.category\_ids 可选 | String\[\] | 发布类别的id列表。 |

```json
{
    "versions": [
        {
            "project_id": "5eb623f6a70571487ea47000",
            "name": "1.0.0",
            "start_at": 1565193600,
            "end_at": 1566403200,
            "assignee_id": "a0417f68e846aae315c85d24643678a9",
            "stage_id": "5f44a8f8bb347b14b49624a1",
            "category_ids": [
                "676a460a0fd987b7ea320889"
            ]
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 批量创建结果的状态。 |
| version | Object | 发布的全量结构数据。创建成功时返回。 |

```json
[
    {
        "state": "success",
        "version": {
            "id": "5eb623f6a70571487ea47001",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623f6a70571487ea47001",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "type": "scrum",
                "name": "Scrum项目",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "1.0.0",
            "start_at": 1565193600,
            "end_at": 1566403200,
            "stage": {
                "id": "5f44a8f8bb347b14b49624a1",
                "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                "name": "未开始",
                "type": "pending",
                "color": "#FA8888"
            },
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "stages": [
                {
                    "id": "5f44a8f8bb347b14b49624a1",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                    "name": "未开始",
                    "operate_at": 1565366400
                },
                {
                    "id": "5f44a8f8bb347b14b49624a2",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a2",
                    "name": "进行中",
                    "operate_at": null
                },
                {
                    "id": "5f44a8f8bb347b14b49624a3",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a3",
                    "name": "已发布",
                    "operate_at": null
                }
            ],
            "progress": 0,
            "changelog": null,
            "operate_at": 1565366400,
            "categories": [
                {
                    "id": "676a460a0fd987b7ea320889",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
                    "name": "私有部署发布"
                }
            ],
            "created_at": 1565366200,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1565366200,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    }
]
```

获取一个发布

用于查看一个发布。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/versions/{version_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| version\_id | String | 发布的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布的id。 |
| url | String | 发布的地址。 |
| project | Object | 发布所属项目的引用结构数据。 |
| name | String | 发布的名称。 |
| start\_at | Number | 发布的开始时间。 |
| end\_at | Number | 发布的结束时间。 |
| stage | Object | 发布的当前阶段。 |
| assignee | Object | 发布负责人的引用结构数据。 |
| stages | Object\[\] | 发布的阶段列表。 |
| progress | Number | 发布的进度。 |
| changelog | String | 发布的发布日志。 |
| operate\_at | Number | 发布的最后操作时间。 |
| categories | Object\[\] | 发布的类别列表。 |
| created\_at | Number | 发布的创建时间。 |
| created\_by | Object | 发布的创建人。 |
| updated\_at | Number | 发布的更新时间。 |
| updated\_by | Object | 发布的更新人。 |

```json
{
    "id": "5eb623f6a70571487ea47001",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623f6a70571487ea47001",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "type": "scrum",
        "name": "Scrum项目",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "1.0.0",
    "start_at": 1565193600,
    "end_at": 1566403200,
    "stage": {
        "id": "5f44a8f8bb347b14b49624a1",
        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
        "name": "未开始",
        "type": "pending",
        "color": "#FA8888"
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "stages": [
        {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "operate_at": 1565366400
        }
    ],
    "progress": 0,
    "changelog": "发布日志",
    "operate_at": 1565366400,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320889",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
            "name": "私有部署发布"
        }
    ],
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

部分更新一个发布

用于部分更新一个发布。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/versions/{version_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| version\_id | String | 发布的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 发布的名称。同一项目下该名称是唯一的。 |
| start\_at 可选 | Number | 开始的时间。 |
| end\_at 可选 | Number | 发布的时间。 |
| assignee\_id 可选 | String | 负责人的id。 |
| stage\_id 可选 | String | 发布阶段的id。 |
| operate\_at 可选 | Number | 发布阶段的日期。需要和stage\_id一起传递。 |
| category\_ids 可选 | String\[\] | 发布类别id数组。 |

```json
{
    "name": "1.0.0",
    "start_at": 1565193600,
    "end_at": 1566403200,
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "stage_id": "5f44a8f8bb347b14b49624a1",
    "operate_at": 1565366400,
    "category_ids": [
        "676a460a0fd987b7ea320889"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布的id。 |
| url | String | 发布的地址。 |
| project | Object | 发布所属项目的引用结构数据。 |
| name | String | 发布的名称。 |
| start\_at | Number | 发布的开始时间。 |
| end\_at | Number | 发布的结束时间。 |
| stage | Object | 发布的当前阶段。 |
| assignee | Object | 发布负责人的引用结构数据。 |
| stages | Object\[\] | 发布的阶段列表。 |
| progress | Number | 发布的进度。 |
| changelog | String | 发布的发布日志。 |
| operate\_at | Number | 发布的最后操作时间。 |
| categories | Object\[\] | 发布的类别列表。 |
| created\_at | Number | 发布的创建时间。 |
| created\_by | Object | 发布创建人的引用结构数据。 |
| updated\_at | Number | 发布的更新时间。 |
| updated\_by | Object | 发布更新人的引用结构数据。 |

```json
{
    "id": "5eb623f6a70571487ea47001",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623f6a70571487ea47001",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "type": "scrum",
        "name": "Scrum项目",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "1.0.0",
    "start_at": 1565193600,
    "end_at": 1566403200,
    "stage": {
        "id": "5f44a8f8bb347b14b49624a1",
        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
        "name": "未开始",
        "type": "pending",
        "color": "#FA8888"
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "stages": [
        {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "operate_at": 1565366400
        },
        {
            "id": "5f44a8f8bb347b14b49624a2",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a2",
            "name": "进行中",
            "operate_at": null
        },
        {
            "id": "5f44a8f8bb347b14b49624a3",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a3",
            "name": "已发布",
            "operate_at": null
        }
    ],
    "progress": 0,
    "changelog": "发布日志",
    "operate_at": 1565366400,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320889",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
            "name": "私有部署发布"
        }
    ],
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取发布列表

用于查询发布列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/versions
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 发布的名字。 |
| status 可选 | String | 发布的状态。  允许值: `pending`, `in_progress`, `published` |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 发布全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb623f6a70571487ea47001",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623f6a70571487ea47001",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "type": "scrum",
                "name": "Scrum项目",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "1.0.0",
            "start_at": 1565193600,
            "end_at": 1566403200,
            "stage": {
                "id": "5f44a8f8bb347b14b49624a1",
                "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                "name": "未开始",
                "type": "pending",
                "color": "#FA8888"
            },
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "stages": [
                {
                    "id": "5f44a8f8bb347b14b49624a1",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                    "name": "未开始",
                    "operate_at": 1565366400
                },
                {
                    "id": "5f44a8f8bb347b14b49624a2",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a2",
                    "name": "进行中",
                    "operate_at": null
                },
                {
                    "id": "5f44a8f8bb347b14b49624a3",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a3",
                    "name": "已发布",
                    "operate_at": null
                }
            ],
            "progress": 0,
            "changelog": "发布日志",
            "operate_at": 1565366400,
            "categories": [
                {
                    "id": "676a460a0fd987b7ea320889",
                    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
                    "name": "私有部署发布"
                }
            ],
            "created_at": 1565366200,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1565366200,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

删除一个发布

用于删除一个发布。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/versions/{version_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| version\_id | String | 发布的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布的id。 |
| url | String | 发布的地址。 |
| project | Object | 发布所属项目的引用结构数据。 |
| name | String | 发布的名称。 |
| start\_at | Number | 发布的开始时间。 |
| end\_at | Number | 发布的结束时间。 |
| stage | Object | 发布的当前阶段。 |
| assignee | Object | 发布负责人的引用结构数据。 |
| stages | Object\[\] | 发布的阶段列表。 |
| progress | Number | 发布的进度。 |
| changelog | String | 发布的发布日志。 |
| operate\_at | Number | 发布的最后操作时间。 |
| categories | Object\[\] | 发布的类别列表。 |
| created\_at | Number | 发布的创建时间。 |
| created\_by | Object | 发布创建人的引用结构数据。 |
| updated\_at | Number | 发布的更新时间。 |
| updated\_by | Object | 发布更新人的引用结构数据。 |

```json
{
    "id": "5eb623f6a70571487ea47001",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/versions/5eb623f6a70571487ea47001",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "type": "scrum",
        "name": "Scrum项目",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "1.0.0",
    "start_at": 1565193600,
    "end_at": 1566403200,
    "stage": {
        "id": "5f44a8f8bb347b14b49624a1",
        "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
        "name": "未开始",
        "type": "pending",
        "color": "#FA8888"
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "stages": [
        {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "operate_at": null
        },
        {
            "id": "5f44a8f8bb347b14b49624a2",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a2",
            "name": "进行中",
            "operate_at": null
        },
        {
            "id": "5f44a8f8bb347b14b49624a3",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a3",
            "name": "已发布",
            "operate_at": null
        }
    ],
    "progress": 0,
    "changelog": null,
    "operate_at": 1565255712,
    "categories": [
        {
            "id": "676a460a0fd987b7ea320889",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
            "name": "私有部署发布"
        }
    ],
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

创建一个发布阶段

用于创建一个发布阶段。

```html
https://{rest_api_root}/v1/pjm/stages
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 发布阶段的名称。在一个企业中这个名称是唯一的。 |
| type | String | 发布阶段的类型。  允许值: `pending`, `in_progress`, `published` |

```json
{
    "name": "新建",
    "type": "pending"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布阶段的id。 |
| url | String | 发布阶段的地址。 |
| name | String | 发布阶段的名称。 |
| type | String | 发布阶段的类型。  允许值: `pending`, `in_progress`, `published` |
| color | String | 发布阶段的颜色。 |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/stages/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "pending",
    "color": "#ff7575"
}
```

获取一个发布阶段

用于查看一个发布阶段。

```html
https://{rest_api_root}/v1/pjm/stages/{stage_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| stage\_id | String | 发布阶段的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布阶段的id。 |
| url | String | 发布阶段的地址。 |
| name | String | 发布阶段的名称。 |
| type | String | 发布阶段的类型。  允许值: `pending`, `in_progress`, `published` |
| color | String | 发布阶段的颜色。 |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/stages/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "pending",
    "color": "#ff7575"
}
```

部分更新一个发布阶段

用于部分更新一个发布阶段。

```html
https://{rest_api_root}/v1/pjm/stages/{stage_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| stage\_id | String | 发布阶段的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 发布阶段的名称。在一个企业中这个名称是唯一的。 |
| type 可选 | String | 发布阶段的类型。  允许值: `pending`, `in_progress`, `published` |

```json
{
    "name": "新建",
    "type": "in_progress"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布阶段的id。 |
| url | String | 发布阶段的地址。 |
| name | String | 发布阶段的名称。 |
| type | String | 发布阶段的类型。  允许值: `pending`, `in_progress`, `published` |
| color | String | 发布阶段的颜色。 |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/stages/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "in_progress",
    "color": "#ff7575"
}
```

获取发布阶段列表

用于查询发布阶段列表。

```html
https://{rest_api_root}/v1/pjm/stages
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 发布阶段的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5c9b35de90ad7153c2062f18",
            "url": "https://{rest_api_root}/v1/pjm/stages/5c9b35de90ad7153c2062f18",
            "name": "新建",
            "type": "in_progress",
            "color": "#ff7575"
        }
    ]
}
```

删除一个发布阶段

用于删除一个发布阶段。

```html
https://{rest_api_root}/v1/pjm/stages/{stage_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| stage\_id | String | 发布阶段的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| replace\_id 可选 | String | 替换的发布阶段id，如果一个发布阶段已经被发布使用，删除该发布阶段时需要提供一个替换的发布阶段。 |

```json
{
    "replace_id": "5c9b35de90ad7153c2062f19"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布阶段的id。 |
| url | String | 发布阶段的地址。 |
| name | String | 发布阶段的名称。 |
| type | String | 发布阶段的类型。  允许值: `pending`, `in_progress`, `published` |
| color | String | 发布阶段的颜色。 |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/stages/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "in_progress",
    "color": "#ff7575"
}
```

创建一个发布分组

用于创建一个发布分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_sections
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 发布分组的名称。 |
| description 可选 | String | 发布分组的描述。 |

```json
{
    "name": "私有部署",
    "description": "私有部署发布分组"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布分组的id。 |
| url | String | 发布分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布分组的名称。 |
| description | String | 发布分组的描述。 |

```json
{
    "id": "63560f3ad02cbc4f9df91251",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "私有部署",
    "description": "私有部署发布分组"
}
```

获取一个发布分组

用于查看一个发布分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_sections/{section_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| section\_id | String | 发布分组的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布分组的id。 |
| url | String | 发布分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布分组的名称。 |
| description | String | 发布分组的描述。 |

```json
{
    "id": "63560f3ad02cbc4f9df91251",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "这是一个发布分组",
    "description": "这是一个发布分组的描述"
}
```

部分更新一个发布分组

用于部分更新一个发布分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_sections/{section_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| section\_id | String | 发布分组的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 发布分组的名称。 |
| description 可选 | String | 发布分组的描述。 |

```json
{
    "name": "私有部署",
    "description": "私有部署发布分组"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布分组的id。 |
| url | String | 发布分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布分组的名称。 |
| description | String | 发布分组的描述。 |

```json
{
    "id": "63560f3ad02cbc4f9df91251",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "私有部署",
    "description": "私有部署发布分组"
}
```

获取发布分组列表

用于查询发布分组列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_sections
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 发布分组全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63560f3ad02cbc4f9df91251",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "这是一个发布分组",
            "description": "这是一个发布分组的描述"
        }
    ]
}
```

删除一个发布分组

用于删除一个发布分组。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_sections/{section_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| section\_id | String | 发布分组的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布分组的id。 |
| url | String | 发布分组的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布分组的名称。 |
| description | String | 发布分组的描述。 |

```json
{
    "id": "63560f3ad02cbc4f9df91252",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91252",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "临时部署",
    "description": "临时发布分组"
}
```

创建一个发布类别

用于创建一个发布类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_categories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 发布类别的名称。 |
| section\_id 可选 | String | 发布类别所属发布分组。 |

```json
{
    "name": "私有部署发布",
    "section_id": "63560f3ad02cbc4f9df91251"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布类别的id。 |
| url | String | 发布类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布类别的名称。 |
| section | Object | 所属发布分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320889",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "私有部署发布",
    "section": {
        "id": "63560f3ad02cbc4f9df91251",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
        "name": "私有部署发布分组"
    }
}
```

获取一个发布类别

用于查看一个发布类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_categories/{version_category_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| version\_category\_id | String | 发布类别的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布类别的id。 |
| url | String | 发布类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布类别的名称。 |
| section | Object | 所属发布分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320889",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "私有部署发布",
    "section": {
        "id": "63560f3ad02cbc4f9df91251",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
        "name": "私有部署发布分组"
    }
}
```

部分更新一个发布类别

用于部分更新一个发布类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_categories/{version_category_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| version\_category\_id | String | 发布类别的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 发布类别的名称。 |
| section\_id 可选 | String | 发布类别所属发布分组。 |

```json
{
    "name": "私有部署发布",
    "section_id": "63560f3ad02cbc4f9df91251"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布类别的id。 |
| url | String | 发布类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布类别的名称。 |
| section | Object | 所属发布分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320889",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "私有部署发布",
    "section": {
        "id": "63560f3ad02cbc4f9df91251",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
        "name": "私有部署发布分组"
    }
}
```

获取发布类别列表

用于查询发布类别列表。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_categories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 发布类别全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "676a460a0fd987b7ea320889",
            "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320889",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "私有部署发布",
            "section": {
                "id": "63560f3ad02cbc4f9df91251",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
                "name": "私有部署发布分组"
            }
        }
    ]
}
```

删除一个发布类别

用于删除一个发布类别。

```html
https://{rest_api_root}/v1/pjm/projects/{project_id}/version_categories/{version_category_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:release

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id | String | 项目的id。 |
| version\_category\_id | String | 发布类别的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 发布类别的id。 |
| url | String | 发布类别的地址。 |
| project | Object | 所属项目的引用结构数据。 |
| name | String | 发布类别的名称。 |
| section | Object | 所属发布分组的引用结构数据。 |

```json
{
    "id": "676a460a0fd987b7ea320890",
    "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_categories/676a460a0fd987b7ea320890",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "这是一个发布类别",
    "section": {
        "id": "63560f3ad02cbc4f9df91251",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000/version_sections/63560f3ad02cbc4f9df91251",
        "name": "私有部署发布分组"
    }
}
```

项目配置中心

项目配置

获取一个项目状态

用于查看一个项目状态。

```html
https://{rest_api_root}/v1/pjm/project_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_id | String | 项目状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目状态的id。 |
| url | String | 项目状态的地址。 |
| name | String | 项目状态的名称。 |
| type | String | 项目状态的类型。 |

```json
{
    "id": "66cbf5401e7cc374c85acb1b",
    "url": "https://{rest_api_root}/v1/pjm/project_states/66cbf5401e7cc374c85acb1b",
    "name": "未开始",
    "type": "pending"
}
```

创建一个项目属性

用于创建一个项目属性。

```html
https://{rest_api_root}/v1/pjm/project_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 项目属性的名称。在一个企业中这个名称是唯一的。 |
| type | String | 项目属性的类型。  允许值: `text`, `textarea`, `select`, `multi_select`, `cascade_select`, `cascade_multi_select`, `member`, `members`, `date`, `number`, `progress`, `rate`, `link` |
| options 可选 | Object\[\] | 选择项列表。当属性类型为 `select,multi_select,cascade_select,cascade_multi_select` 时可选填此项。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "项目风险",
    "type": "select",
    "options": [
        {
            "text": "高"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "中"
        },
        {
            "_id": "5efb1859110533727a82c605",
            "text": "低"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目属性的id。 |
| url | String | 项目属性的地址。 |
| name | String | 项目属性的名称。 |
| type | String | 项目属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "risk",
    "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
    "name": "项目风险",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "高"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "中"
        },
        {
            "_id": "5efb1859110533727a82c605",
            "text": "低"
        }
    ],
    "is_removable": 0,
    "is_name_editable": 0,
    "is_options_editable": 0
}
```

获取一个项目属性

用于查看一个项目属性。

```html
https://{rest_api_root}/v1/pjm/project_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 项目属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目属性的id。 |
| url | String | 项目属性的地址。 |
| name | String | 项目属性的名称。 |
| type | String | 项目属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "risk",
    "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
    "name": "项目风险",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "高"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "中"
        },
        {
            "_id": "5efb1859110533727a82c605",
            "text": "低"
        }
    ],
    "is_removable": 0,
    "is_name_editable": 0,
    "is_options_editable": 0
}
```

部分更新一个项目属性

用于部分更新一个项目属性。

```html
https://{rest_api_root}/v1/pjm/project_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 项目属性的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 项目属性的名称。在一个企业中这个名称是唯一的。 |
| options 可选 | Object\[\] | 选择项列表。 `options` 是整体更新的。 |
| options.\_id 可选 | Sting | 选择项的 `_id` 。如果 `option` 中不包含用于确定唯一性的 `_id` ，那么这个 `option` 将被视为新建，并为之创建新的 `_id` 。 |
| options.text | String | 选择项内容。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "项目规模",
    "options": [
        {
            "_id": "5efb1859110533727a82c605",
            "text": "大"
        },
        {
            "text": "小"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目属性的id。 |
| url | String | 项目属性的地址。 |
| name | String | 项目属性的名称。 |
| type | String | 项目属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "xiangmuguimo",
    "url": "https://{rest_api_root}/v1/pjm/project_properties/xiangmuguimo",
    "name": "项目规模",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c605",
            "text": "大"
        },
        {
            "_id": "5efb1859110533727a82c606",
            "text": "小"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

获取项目属性列表

用于查询项目属性列表。

```html
https://{rest_api_root}/v1/pjm/project_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 项目属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "risk",
            "url": "https://{rest_api_root}/v1/pjm/project_properties/risk",
            "name": "项目风险",
            "type": "select",
            "options": [
                {
                    "_id": "5efb1859110533727a82c603",
                    "text": "高"
                },
                {
                    "_id": "5efb1859110533727a82c604",
                    "text": "中"
                },
                {
                    "_id": "5efb1859110533727a82c605",
                    "text": "低"
                }
            ],
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        },
        {
            "id": "name",
            "url": "https://{rest_api_root}/v1/pjm/project_properties/name",
            "name": "名称",
            "type": "text",
            "options": null,
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        }
    ]
}
```

获取一个项目流程

用于查看一个项目流程。

```html
https://{rest_api_root}/v1/pjm/processes/{process_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| process\_id | String | 项目流程的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 项目流程的id。 |
| url | String | 项目流程的资源地址。 |
| name | String | 项目流程的名称。 |
| type | String | 项目流程的类型。  允许值: `scrum`, `kanban`, `waterfall`, `hybrid` |
| description | String | 项目流程的描述。 |
| is\_system | Number | 是否为系统内置流程。  允许值: `0`, `1` |

```json
{
    "id": "5fa690f1ae0571487ea49030",
    "url": "https://{rest_api_root}/v1/pjm/processes/5fa690f1ae0571487ea49030",
    "name": "Scrum",
    "type": "scrum",
    "description": "Scrum 项目流程",
    "is_system": 1
}
```

获取全部项目流程

用于查询全部项目流程。

```html
https://{rest_api_root}/v1/pjm/processes
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 项目流程全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5fa690f1ae0571487ea49030",
            "url": "https://{rest_api_root}/v1/pjm/processes/5fa690f1ae0571487ea49030",
            "name": "Scrum",
            "type": "scrum",
            "description": "Scrum 项目流程",
            "is_system": 1
        }
    ]
}
```

工作项配置

创建一个工作项类型

用于创建一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 工作项类型的名称。在一个企业中这个名称是唯一的。 |
| group | String | 工作项类型的分组。  允许值: `requirement`, `task`, `bug`, `issue`, `plan` |

```json
{
    "name": "功能缺陷",
    "group": "bug"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型的id。 |
| url | String | 工作项类型的地址。 |
| name | String | 工作项类型的名称。 |
| group | String | 工作项类型的分组。  允许值: `requirement`, `task`, `bug`, `issue`, `plan` |
| is\_system | Number | 是否为系统内置工作项类型。  允许值: `0`, `1` |

```json
{
    "id": "630da48bc9443b1aa94ce3fc",
    "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3fc",
    "name": "功能缺陷",
    "group": "bug",
    "is_system": 0
}
```

获取一个工作项类型

用于查看一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_types/{work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_id | String | 工作项类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型的id。 |
| url | String | 工作项类型的地址。 |
| name | String | 工作项类型的名称。 |
| group | String | 工作项类型的分组。  允许值: `requirement`, `task`, `bug`, `issue`, `plan` |
| is\_system | Number | 是否为系统内置工作项类型。  允许值: `0`, `1` |

```json
{
    "id": "630da48bc9443b1aa94ce3ea",
    "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
    "name": "需求",
    "group": "requirement",
    "is_system": 1
}
```

部分更新一个工作项类型

用于部分更新一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_types/{work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_id | String | 工作项类型的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 工作项类型的名称。在一个企业中这个名称是唯一的。 |

```json
{
    "name": "非功能性需求"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型的id。 |
| url | String | 工作项类型的地址。 |
| name | String | 工作项类型的名称。 |
| group | String | 工作项类型的分组。  允许值: `requirement`, `task`, `bug`, `issue`, `plan` |
| is\_system | Number | 是否为系统内置工作项类型。  允许值: `0`, `1` |

```json
{
    "id": "630da48bc9443b1aa94ce3df",
    "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3df",
    "name": "非功能性需求",
    "group": "requirement",
    "is_system": 0
}
```

获取全部工作项类型列表

用于查询全部工作项类型列表。

```html
https://{rest_api_root}/v1/pjm/work_item_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项类型的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 10,
    "values": [
        {
            "id": "epic",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/epic",
            "name": "史诗",
            "group": "requirement",
            "is_system": 1
        },
        {
            "id": "feature",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/feature",
            "name": "特性",
            "group": "requirement",
            "is_system": 1
        },
        {
            "id": "story",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/story",
            "name": "用户故事",
            "group": "requirement",
            "is_system": 1
        },
        {
            "id": "task",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/task",
            "name": "任务",
            "group": "task",
            "is_system": 1
        },
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug",
            "is_system": 1
        },
        {
            "id": "issue",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/issue",
            "name": "事务",
            "group": "issue",
            "is_system": 1
        },
        {
            "id": "630da48bc9443b1aa94ce3ea",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
            "name": "需求",
            "group": "requirement",
            "is_system": 1
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue",
            "is_system": 0
        },
        {
            "id": "630da48bc9443b1aa94ce3ee",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ee",
            "name": "阶段",
            "group": "plan",
            "is_system": 1
        },
        {
            "id": "630da48bc9443b1aa94ce3ef",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ef",
            "name": "里程碑",
            "group": "plan",
            "is_system": 1
        }
    ]
}
```

删除一个工作项类型

用于删除一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_types/{work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_id | String | 工作项类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型的id。 |
| url | String | 工作项类型的地址。 |
| name | String | 工作项类型的名称。 |
| group | String | 工作项类型的分组。  允许值: `requirement`, `task`, `bug`, `issue`, `plan` |
| is\_system | Number | 是否为系统内置工作项类型。  允许值: `0`, `1` |

```json
{
    "id": "630da48bc9443b1aa94ce3df",
    "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3df",
    "name": "非功能性需求",
    "group": "requirement",
    "is_system": 0
}
```

获取一个工作项类型方案

用于查看一个工作项类型方案。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans/{work_item_type_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_plan\_id | String | 工作项类型方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型方案的id。 |
| url | String | 工作项类型方案的地址。 |
| project\_type | String | 工作项类型方案适用的项目类型。 |
| process\_id | String | 工作项类型方案关联的流程id。 |
| project | Object | 工作项类型方案关联项目的引用结构数据。 |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/5eb623f6a70571487ea47000",
    "project_type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取工作项类型方案列表

用于查询工作项类型方案列表。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id 可选 | String | 项目的id。查询指定项目应用的工作项类型方案时传入。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项类型方案的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb623f6a70571487ea47000",
            "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/5eb623f6a70571487ea47000",
            "project_type": "scrum",
            "process_id": "5fa690f1ae0571487ea49030",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向工作项类型方案中添加一个工作项类型

用于向工作项类型方案中添加一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans/{work_item_type_plan_id}/work_item_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_plan\_id | String | 工作项类型方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_id | String | 工作项类型的id。 |

```json
{
    "work_item_type_id": "5c9b35de90ad7153c2062f18"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型方案中工作项类型的id。 |
| url | String | 工作项类型方案中工作项类型的地址。 |
| type\_plan | Object | 工作项类型方案的引用结构数据。 |
| type | Object | 工作项类型的引用结构数据。 |
| sub\_types | Object\[\] | 子工作项类型的引用结构数据列表。 |

```json
{
    "id": "630da48bc9443b1aa94ce3ea",
    "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39/work_item_types/630da48bc9443b1aa94ce3ea",
    "type_plan": {
        "id": "6abb92f18ad725395df86c45",
        "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39",
        "project_type": "waterfall"
    },
    "type": {
        "id": "630da48bc9443b1aa94ce3ea",
        "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
        "name": "需求",
        "group": "requirement"
    },
    "sub_types": [
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue"
        }
    ]
}
```

获取工作项类型方案中的一个工作项类型

用于查询工作项类型方案中的一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans/{work_item_type_plan_id}/work_item_types/{work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_plan\_id | String | 工作项类型方案的id。 |
| work\_item\_type\_id | String | 工作项类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型方案中工作项类型的id。 |
| url | String | 工作项类型方案中工作项类型的地址。 |
| type\_plan | Object | 工作项类型方案的引用结构数据。 |
| type | Object | 工作项类型的引用结构数据。 |
| sub\_types | Object\[\] | 子工作项类型的引用结构数据列表。 |

```json
{
    "id": "630da48bc9443b1aa94ce3ea",
    "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39/work_item_types/630da48bc9443b1aa94ce3ea",
    "type_plan": {
        "id": "6abb92f18ad725395df86c45",
        "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39",
        "project_type": "waterfall"
    },
    "type": {
        "id": "630da48bc9443b1aa94ce3ea",
        "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
        "name": "需求",
        "group": "requirement"
    },
    "sub_types": [
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue"
        }
    ]
}
```

部分更新工作项类型方案中的工作项类型

用于部分更新工作项类型方案中的工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans/{work_item_type_plan_id}/work_item_types/{work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_plan\_id | String | 工作项类型方案的id。 |
| work\_item\_type\_id | String | 工作项类型的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| sub\_type\_ids | String\[\] | 子工作项类型id的列表，使用','分割，最多只能20个。 |

```json
{
    "sub_type_ids": [
        "bug",
        "6385c650fef18f2d7222d15d"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型方案中工作项类型的id。 |
| url | String | 工作项类型方案中工作项类型的地址。 |
| type\_plan | Object | 工作项类型方案的引用结构数据。 |
| type | Object | 工作项类型的引用结构数据。 |
| sub\_types | Object\[\] | 子工作项类型的引用结构数据列表。 |

```json
{
    "id": "630da48bc9443b1aa94ce3ea",
    "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39/work_item_types/630da48bc9443b1aa94ce3ea",
    "type_plan": {
        "id": "6abb92f18ad725395df86c45",
        "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39",
        "project_type": "waterfall"
    },
    "type": {
        "id": "630da48bc9443b1aa94ce3ea",
        "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
        "name": "需求",
        "group": "requirement"
    },
    "sub_types": [
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue"
        }
    ]
}
```

获取工作项类型方案中的工作项类型列表

用于查询工作项类型方案中的工作项类型列表。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans/{work_item_type_plan_id}/work_item_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_plan\_id | String | 工作项类型方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项类型方案中的工作项类型的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "630da48bc9443b1aa94ce3ea",
            "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39/work_item_types/630da48bc9443b1aa94ce3ea",
            "type_plan": {
                "id": "6abb92f18ad725395df86c45",
                "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39",
                "project_type": "waterfall"
            },
            "type": {
                "id": "630da48bc9443b1aa94ce3ea",
                "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
                "name": "需求",
                "group": "requirement"
            },
            "sub_types": [
                {
                    "id": "bug",
                    "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
                    "name": "缺陷",
                    "group": "bug"
                },
                {
                    "id": "6385c650fef18f2d7222d15d",
                    "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
                    "name": "自定义",
                    "group": "issue"
                }
            ]
        }
    ]
}
```

在工作项类型方案中移除一个工作项类型

用于在工作项类型方案中移除一个工作项类型。

```html
https://{rest_api_root}/v1/pjm/work_item_type_plans/{work_item_type_plan_id}/work_item_types/{work_item_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| work\_item\_type\_plan\_id | String | 工作项类型方案的id。 |
| work\_item\_type\_id | String | 工作项类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项类型方案中工作项类型的id。 |
| url | String | 工作项类型方案中工作项类型的地址。 |
| type\_plan | Object | 工作项类型方案的引用结构数据。 |
| type | Object | 工作项类型的引用结构数据。 |
| sub\_types | Object\[\] | 子工作项类型的引用结构数据列表。 |

```json
{
    "id": "630da48bc9443b1aa94ce3ea",
    "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39/work_item_types/630da48bc9443b1aa94ce3ea",
    "type_plan": {
        "id": "6abb92f18ad725395df86c45",
        "url": "https://{rest_api_root}/v1/pjm/work_item_type_plans/65b0d9fd9ee456e672657e39",
        "project_type": "waterfall"
    },
    "type": {
        "id": "630da48bc9443b1aa94ce3ea",
        "url": "https://{rest_api_root}/v1/pjm/work_item_types/630da48bc9443b1aa94ce3ea",
        "name": "需求",
        "group": "requirement"
    },
    "sub_types": [
        {
            "id": "bug",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/bug",
            "name": "缺陷",
            "group": "bug"
        },
        {
            "id": "6385c650fef18f2d7222d15d",
            "url": "https://{rest_api_root}/v1/pjm/work_item_types/6385c650fef18f2d7222d15d",
            "name": "自定义",
            "group": "issue"
        }
    ]
}
```

创建一个工作项状态

用于创建一个工作项状态。

```html
https://{rest_api_root}/v1/pjm/work_item_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 工作项状态的名称。在一个企业中这个名称是唯一的。 |
| type | String | 工作项状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |

```json
{
    "name": "新建",
    "type": "pending"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态的id。 |
| url | String | 工作项状态的地址。 |
| name | String | 工作项状态的名称。 |
| type | String | 工作项状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 工作项状态的颜色。 |
| is\_system | Number | 是否为系统内置状态。  允许值: `0`, `1` |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "pending",
    "color": "#ff7575",
    "is_system": 0
}
```

获取一个工作项状态

用于查看一个工作项状态。

```html
https://{rest_api_root}/v1/pjm/work_item_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_id | String | 工作项状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态的id。 |
| url | String | 工作项状态的地址。 |
| name | String | 工作项状态的名称。 |
| type | String | 工作项状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 工作项状态的颜色。 |
| is\_system | Number | 是否为系统内置状态。  允许值: `0`, `1` |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "pending",
    "color": "#ff7575",
    "is_system": 0
}
```

部分更新一个工作项状态

用于部分更新一个工作项状态。  
只有非系统类型的工作项状态才能更新。

```html
https://{rest_api_root}/v1/pjm/work_item_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 工作项状态的名称。在一个企业中这个名称是唯一的。 |
| type 可选 | String | 工作项状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |

```json
{
    "name": "新建",
    "type": "pending"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态的id。 |
| url | String | 工作项状态的地址。 |
| name | String | 工作项状态的名称。 |
| type | String | 工作项状态的类型。  允许值: `pending`, `in_progress`, `completed`, `closed` |
| color | String | 工作项状态的颜色。 |
| is\_system | Number | 是否为系统内置状态。  允许值: `0`, `1` |

```json
{
    "id": "5c9b35de90ad7153c2062f18",
    "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
    "name": "新建",
    "type": "pending",
    "color": "#ff7575",
    "is_system": 0
}
```

获取全部工作项状态列表

用于查询全部工作项状态列表。

```html
https://{rest_api_root}/v1/pjm/work_item_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项状态的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5c9b35de90ad7153c2062f18",
            "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
            "name": "新建",
            "type": "pending",
            "color": "#ff7575",
            "is_system": 1
        }
    ]
}
```

获取一个工作项状态方案

用于查看一个工作项状态方案。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态方案的id。 |
| url | String | 工作项状态方案的地址。 |
| project\_type | String | 工作项状态方案适用的项目类型。 |
| process\_id | String | 工作项状态方案关联的流程id。 |
| work\_item\_type | String | 工作项状态方案适用的工作项类型。 |
| project | Object | 工作项状态方案关联项目的引用结构数据。 |

```json
{
    "id": "5c9b62f18ad715335de90c20",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
    "project_type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "work_item_type": "story",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取工作项状态方案列表

用于查询工作项状态方案列表。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id 可选 | String | 项目的id。查询指定项目应用的工作项状态方案时传入。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项状态方案的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5c9b62f18ad715335de90c20",
            "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
            "project_type": "scrum",
            "process_id": "5fa690f1ae0571487ea49030",
            "work_item_type": "story",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向状态方案中添加一个工作项状态

用于向状态方案中添加一个工作项状态。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_id | String | 工作项状态的id。 |

```json
{
    "state_id": "5c9b35de90ad7153c2062f18"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 状态方案中工作项状态关联的id。 |
| url | String | 状态方案中工作项状态关联的地址。 |
| state\_plan | Object | 工作项状态方案的引用结构数据。 |
| state | Object | 工作项状态的引用结构数据。 |

```json
{
    "id": "5cc2062f189b35de90ad7153",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_states/5c9b35de90ad7153c2062f18",
    "state_plan": {
        "id": "5c9b62f18ad715335de90c20",
        "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    }
}
```

获取一个状态方案中的工作项状态

用于查看状态方案中的一个工作项状态。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |
| state\_id | String | 工作项状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 状态方案中工作项状态关联的id。 |
| url | String | 状态方案中工作项状态关联的地址。 |
| state\_plan | Object | 工作项状态方案的引用结构数据。 |
| state | Object | 工作项状态的引用结构数据。 |

```json
{
    "id": "5cc2062f189b35de90ad7153",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_states/5c9b35de90ad7153c2062f18",
    "state_plan": {
        "id": "5c9b62f18ad715335de90c20",
        "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    }
}
```

获取状态方案中的工作项状态列表

用于查询状态方案中的工作项状态列表。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 状态方案中的工作项状态的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cc2062f189b35de90ad7153",
            "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_states/5c9b35de90ad7153c2062f18",
            "state_plan": {
                "id": "5c9b62f18ad715335de90c20",
                "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
                "project_type": "scrum",
                "work_item_type": "story"
            },
            "state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#ff7575"
            }
        }
    ]
}
```

在状态方案中移除一个工作项状态

用于在状态方案中移除一个工作项状态。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |
| state\_id | String | 工作项状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 状态方案中工作项状态关联的id。 |
| url | String | 状态方案中工作项状态关联的地址。 |
| state\_plan | Object | 工作项状态方案的引用结构数据。 |
| state | Object | 工作项状态的引用结构数据。 |

```json
{
    "id": "5cc2062f189b35de90ad7153",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_states/5c9b35de90ad7153c2062f18",
    "state_plan": {
        "id": "5c9b62f18ad715335de90c20",
        "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#ff7575"
    }
}
```

向状态方案中添加一个工作项状态流转

用于向状态方案中添加一个工作项状态流转。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_state_flows
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| from\_state\_id | String | 起始工作项状态的id。 |
| to\_state\_id | String | 可更改为的工作项状态的id。 |

```json
{
    "from_state_id": "5c9b35de90ad7153c2062f18",
    "to_state_id": "5ef85b1e9481936604da7f4c"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态流转的id。 |
| url | String | 工作项状态流转的地址。 |
| state\_plan | Object | 工作项状态方案的引用结构数据。 |
| from\_state | Object | 起始状态的引用结构数据。 |
| to\_state | Object | 目标状态的引用结构数据。 |

```json
{
    "id": "5ef85b1e9481936604da7fcd",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_state_flows/5ef85b1e9481936604da7fcd",
    "state_plan": {
        "id": "5c9b62f18ad715335de90c20",
        "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "from_state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#56ABFB"
    },
    "to_state": {
        "id": "5ef85b1e9481936604da7f4c",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5ef85b1e9481936604da7f4c",
        "name": "进行中",
        "type": "in_progress",
        "color": "#F6C659"
    }
}
```

获取状态方案中的一个工作项状态流转

用于查看一个工作项状态流转。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_state_flows/{flow_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |
| flow\_id | String | 工作项状态流转的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态流转的id。 |
| url | String | 工作项状态流转的地址。 |
| state\_plan | Object | 工作项状态方案的引用结构数据。 |
| from\_state | Object | 起始状态的引用结构数据。 |
| to\_state | Object | 目标状态的引用结构数据。 |

```json
{
    "id": "5ef85b1e9481936604da7fcd",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_state_flows/5ef85b1e9481936604da7fcd",
    "state_plan": {
        "id": "5c9b62f18ad715335de90c20",
        "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "from_state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#56ABFB"
    },
    "to_state": {
        "id": "5ef85b1e9481936604da7f4c",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5ef85b1e9481936604da7f4c,
        "name": "进行中",
        "type": "in_progress",
        "color": "#F6C659"
    }
}
```

获取状态方案中的工作项状态流转列表

用于查询状态方案中的工作项状态流转列表。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_state_flows
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| from\_state\_id 可选 | String | 起始状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项状态流转的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5ef85b1e9481936604da7fcd",
            "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_state_flows/5ef85b1e9481936604da7fcd",
            "state_plan": {
                "id": "5c9b62f18ad715335de90c20",
                "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
                "project_type": "scrum",
                "work_item_type": "story"
            },
            "from_state": {
                "id": "5c9b35de90ad7153c2062f18",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
                "name": "新建",
                "type": "pending",
                "color": "#56ABFB"
            },
            "to_state": {
                "id": "5ef85b1e9481936604da7f4c",
                "url": "https://{rest_api_root}/v1/pjm/work_item_states/5ef85b1e9481936604da7f4c",
                "name": "进行中",
                "type": "in_progress",
                "color": "#F6C659"
            }
        }
    ]
}
```

在状态方案中移除一个工作项状态流转

用于在状态方案中移除一个工作项状态流转。

```html
https://{rest_api_root}/v1/pjm/work_item_state_plans/{state_plan_id}/work_item_state_flows/{flow_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_plan\_id | String | 工作项状态方案的id。 |
| flow\_id | String | 工作项状态流转的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项状态流转的id。 |
| url | String | 工作项状态流转的地址。 |
| state\_plan | Object | 工作项状态方案的引用结构数据。 |
| from\_state | Object | 起始状态的引用结构数据。 |
| to\_state | Object | 目标状态的引用结构数据。 |

```json
{
    "id": "5ef85b1e9481936604da7fcd",
    "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20/work_item_state_flows/5ef85b1e9481936604da7fcd",
    "state_plan": {
        "id": "5c9b62f18ad715335de90c20",
        "url": "https://{rest_api_root}/v1/pjm/work_item_state_plans/5c9b62f18ad715335de90c20",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "from_state": {
        "id": "5c9b35de90ad7153c2062f18",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5c9b35de90ad7153c2062f18",
        "name": "新建",
        "type": "pending",
        "color": "#56ABFB"
    },
    "to_state": {
        "id": "5ef85b1e9481936604da7f4c",
        "url": "https://{rest_api_root}/v1/pjm/work_item_states/5ef85b1e9481936604da7f4c",
        "name": "进行中",
        "type": "in_progress",
        "color": "#F6C659"
    }
}
```

创建一个工作项属性

用于创建一个工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_item_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 工作项属性的名称。在一个企业中这个名称是唯一的。 |
| type | String | 工作项属性的类型。  允许值: `text`, `textarea`, `select`, `multi_select`, `cascade_select`, `cascade_multi_select`, `member`, `members`, `date`, `number`, `progress`, `rate`, `link` |
| options 可选 | Object\[\] | 选择项列表。当工作项属性类型为 `select,multi_select,cascade_select,cascade_multi_select` 时可选填此项。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ]
}
```

```json
{
    "name": "级联单选",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项属性的id。 |
| url | String | 工作项属性的地址。 |
| name | String | 工作项属性的名称。 |
| type | String | 工作项属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |
| select\_all\_level | Boolean | 级联选择时是否允许选择全部层级。 |
| display\_all\_level | Boolean | 级联选择时是否展示全部层级。 |
| display\_separator | String | 级联选择时的层级分隔符。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null
}
```

```json
{
    "id": "jiliandanxuan",
    "url": "https://{rest_api_root}/v1/pjm/work_item_properties/jiliandanxuan",
    "name": "级联单选",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子",
            "parent_id": "64b9f741eec7fd94e63b411e"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": "/"
}
```

获取一个工作项属性

用于查看一个工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_item_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 工作项属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项属性的id。 |
| url | String | 工作项属性的地址。 |
| name | String | 工作项属性的名称。 |
| type | String | 工作项属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |
| select\_all\_level | Boolean | 级联选择时是否允许选择全部层级。 |
| display\_all\_level | Boolean | 级联选择时是否展示全部层级。 |
| display\_separator | String | 级联选择时的层级分隔符。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null
}
```

部分更新一个工作项属性

用于部分更新一个工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_item_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 工作项属性的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 工作项属性的名称。在一个企业中这个名称是唯一的。 |
| options 可选 | Object\[\] | 选择项列表。 `options` 是整体更新的。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度-update",
    "options": [
        {
            "id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "text": "一般"
        }
    ]
}
```

```json
{
    "name": "级联单选-update",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父-update"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子-update",
            "parent_id": "64b9f741eec7fd94e63b411e"
        },
        {
            "text": "子-create",
            "parent_id": "64b9f741eec7fd94e63b411f"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项属性的id。 |
| url | String | 工作项属性的地址。 |
| name | String | 工作项属性的名称。 |
| type | String | 工作项属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |
| select\_all\_level | Boolean | 级联选择时是否允许选择全部层级。 |
| display\_all\_level | Boolean | 级联选择时是否展示全部层级。 |
| display\_separator | String | 级联选择时的层级分隔符。 |

```json
{
    "id": "severity-update",
    "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
    "name": "严重程度-update",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "_id": "5efb1859110533727a82c624",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": null
}
```

```json
{
    "id": "jiliandanxuan",
    "url": "https://{rest_api_root}/v1/pjm/work_item_properties/jiliandanxuan",
    "name": "级联单选-update",
    "type": "cascade_select",
    "options": [
        {
            "_id": "64b9f741eec7fd94e63b411e",
            "text": "父-update"
        },
        {
            "_id": "64b9f741eec7fd94e63b411f",
            "text": "子-update",
            "parent_id": "64b9f741eec7fd94e63b411e"
        },
        {
            "_id": "64b9f741eec7fd94e63b411g",
            "text": "子-create",
            "parent_id": "64b9f741eec7fd94e63b411f"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1,
    "select_all_level": false,
    "display_all_level": false,
    "display_separator": "/"
}
```

获取全部工作项属性列表

用于查询全部工作项属性列表。

```html
https://{rest_api_root}/v1/pjm/work_item_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "severity",
            "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
            "name": "严重程度",
            "type": "select",
            "options": [
                {
                    "_id": "5efb1859110533727a82c603",
                    "text": "严重"
                },
                {
                    "_id": "5efb1859110533727a82c604",
                    "text": "一般"
                }
            ],
            "is_removable": 1,
            "is_name_editable": 1,
            "is_options_editable": 1,
            "select_all_level": false,
            "display_all_level": false,
            "display_separator": null
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/pjm/work_item_properties/identifier",
            "name": "编号",
            "type": "text",
            "options": null,
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0,
            "select_all_level": false,
            "display_all_level": false,
            "display_separator": null
        }
    ]
}
```

获取一个工作项属性方案

用于查看一个工作项属性方案。

```html
https://{rest_api_root}/v1/pjm/work_item_property_plans/{property_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工作项属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项属性方案的id。 |
| url | String | 工作项属性方案的地址。 |
| project\_type | String | 工作项属性方案适用的项目类型。 |
| process\_id | String | 工作项属性方案关联的流程id。 |
| work\_item\_type | String | 工作项属性方案适用的工作项类型。 |
| project | Object | 工作项属性方案关联项目的引用结构数据。 |

```json
{
    "id": "5f8a21f18ef715265de90c21",
    "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
    "project_type": "scrum",
    "process_id": "5fa690f1ae0571487ea49030",
    "work_item_type": "story",
    "project": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取工作项属性方案列表

用于查询工作项属性方案列表。

```html
https://{rest_api_root}/v1/pjm/work_item_property_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| project\_id 可选 | String | 项目的id。查询指定项目应用的工作项属性方案时传入。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项属性方案的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5f8a21f18ef715265de90c21",
            "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
            "project_type": "scrum",
            "process_id": "5fa690f1ae0571487ea49030",
            "work_item_type": "story",
            "project": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea47000",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向属性方案中添加一个工作项属性

用于向属性方案中添加一个工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_item_property_plans/{property_plan_id}/work_item_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工作项属性方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 工作项属性的id。 |

```json
{
    "property_id": "severity"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| property\_plan | Object | 工作项属性方案的引用结构数据。 |
| property | Object | 属性的引用结构数据。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21/properties/severity",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "property": {
        "id": "severity",
        "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
        "name": "严重程度",
        "type": "select"
    }
}
```

获取属性方案中的一个工作项属性

用于查询属性方案中的一个工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_item_property_plans/{property_plan_id}/work_item_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工作项属性方案的id。 |
| property\_id | String | 工作项属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中工作项属性关联的id。 |
| url | String | 属性方案中工作项属性关联的地址。 |
| property\_plan | Object | 工作项属性方案的引用结构数据。 |
| property | Object | 工作项属性的引用结构数据。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21/properties/severity",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "property": {
        "id": "severity",
        "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
        "name": "严重程度",
        "type": "select"
    }
}
```

获取属性方案中的工作项属性列表

用于查询属性方案中的工作项属性列表。

```html
https://{rest_api_root}/v1/pjm/work_item_property_plans/{property_plan_id}/work_item_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工作项属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 属性方案中的工作项属性的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "severity",
            "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21/properties/severity",
            "property_plan": {
                "id": "5f8a21f18ef715265de90c21",
                "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
                "project_type": "scrum",
                "work_item_type": "story"
            },
            "property": {
                "id": "severity",
                "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
                "name": "严重程度",
                "type": "select"
            }
        },
        {
            "id": "identifier",
            "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21/properties/identifier",
            "property_plan": {
                "id": "5f8a21f18ef715265de90c21",
                "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
                "project_type": "scrum",
                "work_item_type": "story"
            },
            "property": {
                "id": "identifier",
                "url": "https://{rest_api_root}/v1/pjm/work_item_properties/identifier",
                "name": "编号",
                "type": "text"
            }
        }
    ]
}
```

在属性方案中移除一个工作项属性

用于在属性方案中移除一个工作项属性。

```html
https://{rest_api_root}/v1/pjm/work_item_property_plans/{property_plan_id}/work_item_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 工作项属性方案的id。 |
| property\_id | String | 工作项属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 资源的id。 |
| url | String | 资源的地址。 |
| property\_plan | Object | 工作项属性方案的引用结构数据。 |
| property | Object | 属性的引用结构数据。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21/properties/severity",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/pjm/work_item_property_plans/5f8a21f18ef715265de90c21",
        "project_type": "scrum",
        "work_item_type": "story"
    },
    "property": {
        "id": "severity",
        "url": "https://{rest_api_root}/v1/pjm/work_item_properties/severity",
        "name": "严重程度",
        "type": "select"
    }
}
```

创建一个工作项标签

用于创建一个工作项标签。

```html
https://{rest_api_root}/v1/pjm/work_item_tags
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 标签的名称。在一个企业中这个名称是唯一的。 |

```json
{
    "name": "标签-1"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| name | String | 工作项标签的名称。 |
| color | String | 工作项标签的颜色。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
    "name": "标签-1",
    "color": "#56ABFB"
}
```

获取一个工作项标签

用于查看一个工作项标签。

```html
https://{rest_api_root}/v1/pjm/work_item_tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| tag\_id | String | 工作项标签的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| name | String | 工作项标签的名称。 |
| color | String | 工作项标签的颜色。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
    "name": "标签-1",
    "color": "#56ABFB"
}
```

部分更新一个工作项标签

用于部分更新一个工作项标签。

```html
https://{rest_api_root}/v1/pjm/work_item_tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| tag\_id | String | 标签的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 标签的名称。在一个企业中这个名称是唯一的。 |

```json
{
    "name": "标签-2"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| name | String | 工作项标签的名称。 |
| color | String | 工作项标签的颜色。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
    "name": "标签-2",
    "color": "#56ABFB"
}
```

获取全部工作项标签列表

用于查询全部工作项标签列表。

```html
https://{rest_api_root}/v1/pjm/work_item_tags
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 标签的名称。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 工作项标签的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5e6b35de50ef8153c2062f70",
            "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
            "name": "标签-2",
            "color": "#56ABFB"
        }
    ]
}
```

删除一个工作项标签

用于删除一个工作项标签。

```html
https://{rest_api_root}/v1/pjm/work_item_tags/{tag_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| tag\_id | String | 标签的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项标签的id。 |
| url | String | 工作项标签的地址。 |
| name | String | 工作项标签的名称。 |
| color | String | 工作项标签的颜色。 |

```json
{
    "id": "5e6b35de50ef8153c2062f70",
    "url": "https://{rest_api_root}/v1/pjm/work_item_tags/5e6b35de50ef8153c2062f70",
    "name": "标签-2",
    "color": "#56ABFB"
}
```

获取一个工作项优先级

用于查看一个工作项优先级。

```html
https://{rest_api_root}/v1/pjm/work_item_priorities/{priority_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:pjm:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| priority\_id | String | 工作项优先级的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 工作项优先级的id。 |
| url | String | 工作项优先级的地址。 |
| name | String | 工作项优先级的名称。 |

```json
{
    "id": "5eb623f6a70571487ea47111",
    "url": "https://{rest_api_root}/v1/pjm/work_item_priorities/5eb623f6a70571487ea47111",
    "name": "最高"
}
```

测试管理

测试库

创建一个测试库

用于创建一个测试库。

```html
https://{rest_api_root}/v1/testhub/libraries
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 测试库的所属类型。默认值 `organization` 。允许值分别表示企业可见和团队可见。  默认值: `organization`  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 测试库的所属id。当 `scope_type` 为 `user_group` 时，该字段必填，且表示团队id；当 `scope_type` 为其他值时，该字段无效。 |
| name | String | 测试库的名称。 |
| visibility 可选 | String | 测试库的可见范围。允许值分别表示组织全部成员可见和仅测试库成员可见。  默认值: `private`  允许值: `public`, `private` |
| identifier | String | 测试库的标识。在一个企业中这个标识是唯一的。项目的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 测试库的描述。 |
| members 可选 | Object\[\] | 测试库成员的列表。当测试库的 `scope_type` 变为 `user_group` 时，测试库成员必须是 `scope_id` 指定的团队内的成员；当 `scope_type` 为其他值时，测试库成员可以是任意成员或团队。 |
| members.id | String | 企业成员或团队的id。 |
| members.type | String | 测试库成员的类型。  允许值: `user`, `user_group` |

```json
{
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "name": "测试库",
    "visibility": "private",
    "identifier": "CSK",
    "description": "这是一个测试库",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "type": "user"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库的id。 |
| url | String | 测试库的资源地址。 |
| identifier | String | 测试库的标识。 |
| name | String | 测试库的名称。 |
| scope\_type | String | 测试库的所属类型。  允许值: `organization`, `user_group` |
| scope\_id | String | 测试库的所属id。 |
| visibility | String | 测试库的可见性。  允许值: `private`, `public` |
| color | String | 测试库的主题色。 |
| description | String | 测试库的描述。 |
| members | Object\[\] | 测试库的成员列表。 |
| created\_at | Number | 测试库的创建时间。 |
| created\_by | Object | 测试库的创建人。 |
| updated\_at | Number | 测试库的更新时间。 |
| updated\_by | Object | 测试库的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
    "identifier": "CSK",
    "name": "测试库",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#F693E7",
    "description": "这是一个测试库",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个测试库

用于查看一个测试库。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_deleted 可选 | Boolean | 是否包含已删除的测试库。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否包含已归档的测试库。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库的id。 |
| url | String | 测试库的资源地址。 |
| identifier | String | 测试库的标识。 |
| name | String | 测试库的名称。 |
| scope\_type | String | 测试库的所属类型。  允许值: `organization`, `user_group` |
| scope\_id | String | 测试库的所属id。 |
| visibility | String | 测试库的可见性。  允许值: `private`, `public` |
| color | String | 测试库的主题色。 |
| description | String | 测试库的描述。 |
| members | Object\[\] | 测试库的成员列表。 |
| created\_at | Number | 测试库的创建时间。 |
| created\_by | Object | 测试库的创建人。 |
| updated\_at | Number | 测试库的更新时间。 |
| updated\_by | Object | 测试库的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
    "identifier": "CSK",
    "name": "测试库",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#F693E7",
    "description": "这是一个测试库",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个测试库

用于部分更新一个测试库。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 测试库的名称。 |
| identifier 可选 | String | 测试库的标识。在一个企业中这个标识是唯一的。项目的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 测试库的描述。 |

```json
{
    "name": "测试库",
    "identifier": "CSK",
    "description": "这是一个测试库"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库的id。 |
| url | String | 测试库的资源地址。 |
| identifier | String | 测试库的标识。 |
| name | String | 测试库的名称。 |
| scope\_type | String | 测试库的所属类型。  允许值: `organization`, `user_group` |
| scope\_id | String | 测试库的所属id。 |
| visibility | String | 测试库的可见性。  允许值: `private`, `public` |
| color | String | 测试库的主题色。 |
| description | String | 测试库的描述。 |
| members | Object\[\] | 测试库的成员列表。 |
| created\_at | Number | 测试库的创建时间。 |
| created\_by | Object | 测试库的创建人。 |
| updated\_at | Number | 测试库的更新时间。 |
| updated\_by | Object | 测试库的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5eb623f6a70571487ea47000",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
    "identifier": "CSK",
    "name": "测试库",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#F693E7",
    "description": "这是一个测试库",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取测试库列表

用于查询测试库列表。

```html
https://{rest_api_root}/v1/testhub/libraries
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:library

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 测试库的所属类型。允许值分别表示企业可见和团队可见。  允许值: `organization`, `user_group` |
| scope\_id 可选 | String | 测试库的所属id。仅支持团队的id。 |
| keywords 可选 | String | 关键字。只支持 `name` 关键字搜索。 |
| member\_type 可选 | String | 测试库成员的类型。 `member_type` 和 `member_id` 必须同时存在。  允许值: `user`, `user_group` |
| member\_id 可选 | String | 测试库成员的id。值为企业成员或团队的id。 `member_id` 和 `member_type` 必须同时存在。 |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |
| include\_deleted 可选 | Boolean | 是否查询已删除的测试库。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否查询已归档的测试库。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 测试库全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb623f6a70571487ea47000",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
            "identifier": "CSK",
            "name": "测试库",
            "scope_type": "user_group",
            "scope_id": "63c8fb32729dee3334d96af7",
            "visibility": "private",
            "color": "#F693E7",
            "description": "这是一个测试库",
            "members": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

向测试库中添加一个成员

用于向测试库中添加一个成员。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| member 可选 | Object | 测试库的成员。 |
| member.id | String | 企业成员或团队的id。 |
| member.type | String | 成员的类型。  允许值: `user`, `user_group` |
| role\_id 可选 | String | 角色的id。 |

```json
{
    "member": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "type": "user"
    }
    "role_id": "6422711c3f12e6c1e46d40e6"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库成员的id。 |
| url | String | 测试库成员的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| type | String | 测试库成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取测试库中的一个成员

用于查看一个测试库成员。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| member\_id | String | 测试库成员的id，即企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库成员的id。 |
| url | String | 测试库成员的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| type | String | 测试库成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

部分更新一个测试库内的成员

用于部分更新一个测试库内的成员。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| member\_id | String | 企业成员或团队的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| role\_id 可选 | String | 角色的id。管理员可以更改其他用户的角色，但非管理员用户无权更改其他用户的角色。 |

```json
{
    "role_id": "6422711c3f12e6c1e46d40e6"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库成员的id。 |
| url | String | 测试库成员的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| type | String | 测试库成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取测试库中的成员列表

用于查询测试库中的成员列表。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 测试库中的成员全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/63c8fb32729dee3334d96af7",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        }
    ]
}
```

在测试库中移除一个成员

用于在测试库中移除一个成员。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| member\_id | String | 企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库成员的id。 |
| url | String | 测试库成员的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| type | String | 测试库成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/members/a0417f68e846aae315c85d24643678a9",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

向测试库中添加一个用例模块

用于向测试库中添加一个用例模块。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/suites
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 测试模块名称。测试模块为树形结构，同一层次下的名称不能重复。 |
| parent\_id 可选 | String | 父测试模块的id。 |

```json
{
    "name": "登录",
    "parent_id": "5eb623f6a70571487ea46999"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例模块的id。 |
| url | String | 用例模块的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| name | String | 用例模块的名称。 |
| parent 可选 | Object | 父测试模块的引用结构数据。 |
| paths | String | 用例模块的路径，以 `/` 分隔。 |

```json
{
    "id": "55714870a70ea4eb623f6700",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "登录",
    "parent": {
        "id": "5eb623f6a70571487ea46999",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/5eb623f6a70571487ea46999",
        "name": "用户"
    },
    "paths": "首页/用户"
}
```

获取测试库中的一个用例模块

用于查看一个用例模块。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/suites/{suite_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| suite\_id | String | 用例模块的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例模块的id。 |
| url | String | 用例模块的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| name | String | 用例模块的名称。 |
| parent 可选 | Object | 父测试模块的引用结构数据。 |
| paths | String | 用例模块的路径，以 `/` 分隔。 |

```json
{
    "id": "55714870a70ea4eb623f6700",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "登录",
    "parent": {
        "id": "5eb623f6a70571487ea46999",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/5eb623f6a70571487ea46999",
        "name": "用户"
    },
    "paths": "首页/用户"
}
```

部分更新一个测试库中用例模块

用于部分更新一个测试库中用例模块。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/suites/{suite_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| suite\_id | String | 测试模块的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 测试模块名称。测试模块为树形结构，同一层次下的名称不能重复。 |
| parent\_id 可选 | String | 父测试模块的id。 |

```json
{
    "name": "登录",
    "parent_id": "5eb623f6a70571487ea46999"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 测试库中用例模块的id。 |
| url | String | 测试库中用例模块的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| name | String | 测试库中用例模块的名称。 |
| parent 可选 | Object | 父测试模块的引用结构数据。 |
| paths | String | 用例模块的路径，以 `/` 分隔。 |

```json
{
    "id": "55714870a70ea4eb623f6700",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "登录",
    "parent": {
        "id": "5eb623f6a70571487ea46999",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/5eb623f6a70571487ea46999",
        "name": "用户"
    },
    "paths": "首页/用户"
}
```

获取测试库中的用例模块列表

用于查询测试库中的用例模块列表。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/suites
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| parent\_id 可选 | String | 父测试模块的id。值可以是 `root` 或者某个模块id，当为空时，获取到所有的模块，当为 `root` 时，获取到所有的一级模块，当为某个模块id时，获取到该模块的直属子模块。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 测试库中的用例模块全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "55714870a70ea4eb623f6700",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "登录",
            "parent": {
                "id": "5eb623f6a70571487ea46999",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/5eb623f6a70571487ea46999",
                "name": "用户"
            },
            "paths": "首页/用户"
        }
    ]
}
```

在测试库中移除一个用例模块

用于在测试库中移除一个用例模块。  
请注意，删除一个模块会自动删除其所有的子模块。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/suites/{suite_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:library

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| suite\_id | String | 测试模块的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例模块的id。 |
| url | String | 用例模块的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| name | String | 用例模块的名称。 |
| parent 可选 | Object | 父测试模块的引用结构数据。 |
| paths | String | 用例模块的路径，以 `/` 分隔。 |

```json
{
    "id": "55714870a70ea4eb623f6701",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6701",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "注册",
    "parent": {
        "id": "5eb623f6a70571487ea46999",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/5eb623f6a70571487ea46999",
        "name": "用户"
    },
    "paths": "首页/用户"
}
```

用例

创建一个用例

用于创建一个用例。

```html
https://{rest_api_root}/v1/testhub/cases
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testcase

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| test\_library\_id | String | 测试库的id。 |
| title | String | 测试用例的标题。 |
| suite\_id 可选 | String | 测试用例所属模块的id。 |
| type\_id 可选 | String | 测试用例类型的id。 |
| important\_level\_id 可选 | String | 测试用例重要程度的id。 |
| maintenance\_id 可选 | String | 测试用例维护人的id。 |
| participant\_ids 可选 | String\[\] | 测试用例关注人的id列表。 |
| properties 可选 | Object | 测试用例属性的键值对集合，需要注意的是，当前测试用例对应的属性方案需要包含这些测试用例属性，例如属性方案中包含 `prop_a` 和 `prop_b` 。 |
| properties.prop\_a 可选 | Object | 测试用例属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 测试用例属性 `prop_b` 。 |
| description 可选 | String | 测试用例的描述。 |
| precondition 可选 | String | 测试用例的前置条件。 |
| steps 可选 | Object\[\] | 测试用例的步骤列表。steps是整体更新的。 |
| steps.step\_id 可选 | String | 测试用例步骤的id。 |
| steps.description 可选 | String | 测试用例步骤的描述。 |
| steps.expected\_value 可选 | String | 测试用例步骤的期望值。 |
| steps.is\_group 可选 | Boolean | 测试用例步骤类型是否为分组。 |
| steps.group\_id 可选 | String | 测试用例步骤所属分组的id。 `group_id` 是分组类型步骤的 `step_id` ，分组类型的步骤不需要该参数。 |

```json
{
    "test_library_id": "5eb623f6a70571487ea47000",
    "title": "这是一个测试用例",
    "suite_id": "55714870a70ea4eb623f6700",
    "type_id": "5cf189b35de9c20620ad7153",
    "important_level_id": "57a109b35ae8c20630fd7256",
    "maintenance_id": "a0417f68e846aae315c85d24643678a9",
    "participant_ids": [
        "a0417f68e846aae315c85d24643678a9"
    ],
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "description": "测试用例的备注",
    "precondition": "前置条件的描述信息",
    "steps": [
        {
            "step_id": "5cdca524cade3a112b063071",
            "description": "UI测试",
            "is_group": true
        },
        {
            "step_id": "5cdca524cade3a112b063072",
            "description": "在浏览器地址栏中输入https://pingcode.com",
            "expected_value": "成功访问PingCode官网",
            "is_group": false,
            "group_id": "5cdca524cade3a112b063071"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例的id。 |
| url | String | 用例的资源地址。 |
| library | Object | 用例所属的测试库。 |
| identifier | String | 用例的标识。 |
| title | String | 用例的标题。 |
| level | String | 用例重要程度的名字。 |
| short\_id | String | 用例的短id。 |
| html\_url | String | 用例的html地址。 |
| important\_level | Object | 用例的重要程度。 |
| suite | Object | 用例所属的测试模块。 |
| state | Object | 用例的状态。 |
| type | Object | 用例的类型。 |
| maintenance | Object | 用例的维护人。 |
| test\_type | String | 用例的测试类型。允许值分别表示自动测试和手动测试。  允许值: `automation`, `manual` |
| description | String | 用例的描述。 |
| precondition | String | 用例的前置条件。 |
| properties | Object | 用例的自定义属性。 |
| estimated\_workload | Number | 用例的预估工时。 |
| remaining\_workload | Number | 用例的剩余工时。 |
| steps | Object\[\] | 用例的步骤列表。 |
| participants | Object\[\] | 用例的关注人列表。 |
| created\_at | Number | 用例的创建时间。 |
| created\_by | Object | 用例的创建人。 |
| updated\_at | Number | 用例的更新时间。 |
| updated\_by | Object | 用例的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca524cad2fa112b06305c",
    "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "CSK-10",
    "title": "这是一个测试用例",
    "level": "P1",
    "short_id": "fdUw3C",
    "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
    "important_level": {
        "id": "57a109b35ae8c20630fd7256",
        "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
        "name": "P1"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "state": {
        "id": "686f62038668bbae4f4dd0c1",
        "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
        "name": "设计",
        "type": "pending"
    },
    "type": {
        "id": "5cf189b35de9c20620ad7153",
        "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
        "name": "功能测试"
    },
    "maintenance": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "test_type": "automation",
    "description": "测试用例的备注",
    "precondition": "前置条件的描述信息",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "estimated_workload": null,
    "remaining_workload": null,
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "description": "UI测试",
            "expected_value": null,
            "is_group": true,
            "group_id": null
        },
        {
            "step_id": "524cad5edb06305cca2fa113",
            "description": "在浏览器地址栏中输入https://pingcode.com",
            "expected_value": "成功访问PingCode官网",
            "is_group": false,
            "group_id": "524cad5edb06305cca2fa112"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305c",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

批量创建用例

用于批量创建用例。

```html
https://{rest_api_root}/v1/testhub/cases/bulk
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testcase

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| cases | Object\[\] | 创建单个测试用例必要参数的数组，数组内对象不能超过100个。 |
| cases.test\_library\_id | String | 测试用例所属测试库id。 |
| cases.title | String | 测试用例的标题，长度1～200有效字符。 |
| cases.important\_level\_id 可选 | String | 测试用例重要程度的id。 |
| cases.maintenance\_id 可选 | String | 测试用例维护人的id。 |
| cases.participant\_ids 可选 | String\[\] | 测试用例关注人的id列表。 |
| cases.properties 可选 | String | 测试用例属性的键值对集合。 |
| cases.description 可选 | String | 测试用例的描述。 |
| cases.precondition 可选 | String | 测试用例的前置条件。 |
| cases.steps 可选 | Object\[\] | 测试用例的步骤列表。 |
| cases.steps.step\_id 可选 | String | 测试用例步骤的id。 |
| cases.steps.description 可选 | String | 测试用例步骤的描述。 |
| cases.steps.expected\_value 可选 | String | 测试用例步骤的期望值。 |
| cases.steps.is\_group 可选 | Boolean | 测试用例步骤类型是否为分组。 |
| cases.steps.group\_id 可选 | String | 测试用例步骤所属分组的id。 `group_id` 是分组类型步骤的 `step_id` ，分组类型的步骤不需要该参数。 |

```json
{
    "cases": [
        {
            "test_library_id": "5eb623f6a70571487ea47000",
            "title": "这是一个测试用例",
            "important_level_id": "57a109b35ae8c20630fd7256",
            "maintenance_id": "a0417f68e846aae315c85d24643678a9",
            "participant_ids": [
                "a0417f68e846aae315c85d24643678a9"
            ],
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "description": "测试用例的描述",
            "precondition": "前置条件的描述信息",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "description": "UI测试",
                    "is_group": true
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "description": "在浏览器地址栏中输入https://pingcode.com",
                    "expected_value": "成功访问PingCode官网",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa112"
                }
            ]
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 操作状态。  允许值: `success`, `failure` |
| case | Object | 测试用例的全量结构数据。操作成功时返回。 |

```json
[
    {
        "state": "success",
        "case": {
            "id": "5edca524cad2fa112b06305d",
            "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305d",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "CSK-1",
            "title": "这是一个测试用例",
            "level": "P1",
            "short_id": "fdUw3C",
            "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
            "important_level": {
                "id": "57a109b35ae8c20630fd7256",
                "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
                "name": "P1"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "state": {
                "id": "686f62038668bbae4f4dd0c1",
                "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
                "name": "设计",
                "type": "pending"
            },
            "type": {
                "id": "5cf189b35de9c20620ad7153",
                "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
                "name": "功能测试"
            },
            "maintenance": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "test_type": "automation",
            "description": "测试用例的备注",
            "precondition": "前置条件的描述信息",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "estimated_workload": null,
            "remaining_workload": null,
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "description": "UI测试",
                    "expected_value": null,
                    "is_group": true,
                    "group_id": null
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "description": "在浏览器地址栏中输入https://pingcode.com",
                    "expected_value": "成功访问PingCode官网",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa112"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305d",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583293300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    }
]
```

获取一个用例

用于查看一个用例。

```html
https://{rest_api_root}/v1/testhub/cases/{case_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testcase

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| case\_id | String | 测试用例的id或short\_id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例的id。 |
| url | String | 用例的资源地址。 |
| library | Object | 用例所属的测试库。 |
| identifier | String | 用例的标识。 |
| title | String | 用例的标题。 |
| level | String | 用例重要程度的名字。 |
| short\_id | String | 用例的短id。 |
| html\_url | String | 用例的html地址。 |
| important\_level | Object | 用例的重要程度。 |
| suite | Object | 用例所属的测试模块。 |
| state | Object | 用例的状态。 |
| type | Object | 用例的类型。 |
| maintenance | Object | 用例的维护人。 |
| test\_type | String | 用例的测试类型。允许值分别表示自动测试和手动测试。  允许值: `automation`, `manual` |
| description | String | 用例的描述。 |
| precondition | String | 用例的前置条件。 |
| properties | Object | 用例的自定义属性。 |
| estimated\_workload | Number | 用例的预估工时。 |
| remaining\_workload | Number | 用例的剩余工时。 |
| steps | Object\[\] | 用例的步骤列表。 |
| participants | Object\[\] | 用例的关注人列表。 |
| public\_image\_token | String | 用例描述和自定义多行文本类型属性里获取图片资源token。获取一个用例和获取用例列表参数 `include_public_image_token` 值有效时返回。 |
| created\_at | Number | 用例的创建时间。 |
| created\_by | Object | 用例的创建人。 |
| updated\_at | Number | 用例的更新时间。 |
| updated\_by | Object | 用例的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca524cad2fa112b06305c",
    "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "CSK-10",
    "title": "这是一个测试用例",
    "level": "P1",
    "short_id": "fdUw3C",
    "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
    "important_level": {
        "id": "57a109b35ae8c20630fd7256",
        "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
        "name": "P1"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "state": {
        "id": "686f62038668bbae4f4dd0c1",
        "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
        "name": "设计",
        "type": "pending"
    },
    "type": {
        "id": "5cf189b35de9c20620ad7153",
        "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
        "name": "功能测试"
    },
    "maintenance": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "test_type": "automation",
    "description": "测试用例的备注",
    "precondition": "前置条件的描述信息",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "estimated_workload": 8,
    "remaining_workload": 5,
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa111",
            "description": "网页访问",
            "expected_value": null,
            "is_group": true,
            "group_id": null
        },
        {
            "step_id": "524cad5edb06305cca2fa112",
            "description": "在浏览器地址栏中输入https://pingcode.com",
            "expected_value": "成功访问PingCode官网",
            "is_group": false,
            "group_id": "524cad5edb06305cca2fa111"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305c",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "public_image_token": "IcF1VmJFF-UIi9lMU18m1NFFAruWXYx0ZAm90pJ2LGk",
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个用例

用于部分更新一个用例。

```html
https://{rest_api_root}/v1/testhub/cases/{case_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testcase

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| case\_id | String | 测试用例的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| suite\_id 可选 | String | 测试用例所属模块的id。 |
| state\_id 可选 | String | 测试用例状态的id。 |
| type\_id 可选 | String | 测试用例类型的id。 |
| title 可选 | String | 测试用例的标题。 |
| important\_level\_id 可选 | String | 测试用例重要程度的id。 |
| maintenance\_id 可选 | String | 测试用例维护人的id。 |
| properties 可选 | Object | 测试用例属性的键值对集合。需要注意的是，当前测试用例对应的属性方案需要包含这些测试用例属性。 |
| properties.prop\_a 可选 | Object | 测试用例属性 `prop_a` 。 |
| properties.prop\_b 可选 | Object | 测试用例属性 `prop_b` 。 |
| description 可选 | String | 测试用例的备注。 |
| precondition 可选 | String | 测试用例的前置条件。 |
| steps 可选 | Object\[\] | 测试用例的步骤列表。steps是整体更新的。 |
| steps.step\_id 可选 | String | 测试用例的步骤的id。如果step中不包含用于确定唯一性的 `step_id` ，那么这个step将被视为新建，并为之创建新的 `step_id` 。 |
| steps.description 可选 | String | 测试用例的步骤的描述。 |
| steps.expected\_value 可选 | String | 测试用例的步骤的期望值。 |
| steps.is\_group 可选 | Boolean | 测试用例步骤类型是否为分组。 |
| steps.group\_id 可选 | String | 测试用例步骤所属分组的id。 `group_id` 是分组类型步骤的 `step_id` ，分组类型的步骤不需要该参数。 |

```json
{
    "suite_id": "55714870a70ea4eb623f6700",
    "state_id": "686f62038668bbae4f4dd0c1",
    "type_id": "5cf189b35de9c20620ad7153",
    "title": "这是一个测试用例",
    "important_level_id": "57a109b35ae8c20630fd7256",
    "maintenance_id": "a0417f68e846aae315c85d24643678a9",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "description": "测试用例的备注",
    "precondition": "前置条件的描述信息",
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "description": "UI测试",
            "is_group": true
        },
        {
            "step_id": "524cad5edb06305cca2fa113",
            "description": "点击下一页按钮",
            "expected_value": "成功跳转至下一页",
            "is_group": false,
            "group_id": "524cad5edb06305cca2fa112"
        },
        {
            "description": "点击最后一页按钮",
            "expected_value": "成功跳转至最后一页",
            "is_group": false,
            "group_id": "524cad5edb06305cca2fa112"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例的id。 |
| url | String | 用例的资源地址。 |
| library | Object | 用例所属的测试库。 |
| identifier | String | 用例的标识。 |
| title | String | 用例的标题。 |
| level | String | 用例重要程度的名字。 |
| short\_id | String | 用例的短id。 |
| html\_url | String | 用例的html地址。 |
| important\_level | Object | 用例的重要程度。 |
| suite | Object | 用例所属的测试模块。 |
| state | Object | 用例的状态。 |
| type | Object | 用例的类型。 |
| maintenance | Object | 用例的维护人。 |
| test\_type | String | 用例的测试类型。允许值分别表示自动测试和手动测试。  允许值: `automation`, `manual` |
| description | String | 用例的描述。 |
| precondition | String | 用例的前置条件。 |
| properties | Object | 用例的自定义属性。 |
| estimated\_workload | Number | 用例的预估工时。 |
| remaining\_workload | Number | 用例的剩余工时。 |
| steps | Object\[\] | 用例的步骤列表。 |
| participants | Object\[\] | 用例的关注人列表。 |
| created\_at | Number | 用例的创建时间。 |
| created\_by | Object | 用例的创建人。 |
| updated\_at | Number | 用例的更新时间。 |
| updated\_by | Object | 用例的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca524cad2fa112b06305c",
    "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "CSK-10",
    "title": "这是一个测试用例",
    "level": "P1",
    "short_id": "fdUw3C",
    "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
    "important_level": {
        "id": "57a109b35ae8c20630fd7256",
        "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
        "name": "P1"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "state": {
        "id": "686f62038668bbae4f4dd0c1",
        "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
        "name": "设计",
        "type": "pending"
    },
    "type": {
        "id": "5cf189b35de9c20620ad7153",
        "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
        "name": "功能测试"
    },
    "maintenance": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "test_type": "automation",
    "description": "测试用例的备注",
    "precondition": "前置条件的描述信息",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "estimated_workload": 8,
    "remaining_workload": 5,
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "description": "UI测试",
            "expected_value": null,
            "is_group": true,
            "group_id": null
        },
        {
            "step_id": "524cad5edb06305cca2fa113",
            "description": "点击下一页按钮",
            "expected_value": "成功跳转至下一页",
            "is_group": false,
            "group_id": "524cad5edb06305cca2fa112"
        },
        {
            "step_id": "524cad5edb06305cca2fa114",
            "description": "点击最后一页按钮",
            "expected_value": "成功跳转至最后一页",
            "is_group": false,
            "group_id": "524cad5edb06305cca2fa112"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305c",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583293300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

批量部分更新用例

用于批量部分更新用例。

```html
https://{rest_api_root}/v1/testhub/cases/bulk
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testcase

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| cases | Object\[\] | 部分更新测试用例的数组。 |
| cases.case\_id | String | 测试用例的id。 |
| cases.state\_id 可选 | String | 测试用例状态的id。 |
| cases.type\_id 可选 | String | 测试用例类型的id。 |
| cases.title 可选 | String | 测试用例的标题。 |
| cases.important\_level\_id 可选 | String | 测试用例重要程度的id。 |
| cases.maintenance\_id 可选 | String | 测试用例维护人的id。 |
| cases.properties 可选 | Object\[\] | 测试用例属性的键值对集合，property中包含propertyKey、propertyValue和propertyType三个字段。需要注意的是，当前测试用例对应的属性方案需要包含这些测试用例属性。 |
| cases.properties.prop\_a 可选 | Object | 测试用例属性的自定义属性prop\_a。 |
| cases.properties.prop\_b 可选 | Object | 测试用例属性的自定义属性prop\_b。 |
| cases.description 可选 | String | 测试用例的备注。 |
| cases.precondition 可选 | String | 测试用例的前置条件。 |
| cases.steps 可选 | Object\[\] | 测试用例的步骤列表。steps是整体更新的。 |
| cases.steps.step\_id 可选 | String | 测试用例的步骤的id。如果step中不包含用于确定唯一性的 `step_id` ，那么这个step将被视为新建，并为之创建新的 `step_id` 。 |
| cases.steps.description 可选 | String | 测试用例的步骤的描述。 |
| cases.steps.expected\_value 可选 | String | 测试用例的步骤的期望值。 |
| cases.steps.is\_group 可选 | Boolean | 测试用例步骤类型是否为分组。 |
| cases.steps.group\_id 可选 | String | 测试用例步骤所属分组的id。 `group_id` 是分组类型步骤的 `step_id` ，分组类型的步骤不需要该参数。 |

```json
{
    "cases": [
        {
            "case_id": "5edca524cad2fa112b06305c",
            "state_id": "686f62038668bbae4f4dd0c1",
            "type_id": "5cf189b35de9c20620ad7153",
            "title": "这是一个测试用例",
            "important_level_id": "57a109b35ae8c20630fd7256",
            "maintenance_id": "a0417f68e846aae315c85d24643678a9",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "description": "测试用例的描述",
            "precondition": "前置条件的描述信息",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "description": "UI测试",
                    "is_group": true
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "description": "点击下一页按钮",
                    "expected_value": "成功跳转至下一页",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa112"
                },
                {
                    "description": "点击最后一页按钮",
                    "expected_value": "成功跳转至最后一页",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa112"
                }
            ]
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 操作状态。  允许值: `success`, `failure` |
| case | Object | 测试用例的全量结构数据。操作成功时返回。 |

```json
[
    {
        "state": "success",
        "case": {
            "id": "5edca524cad2fa112b06305c",
            "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "CSK-10",
            "title": "这是一个测试用例",
            "level": "P1",
            "short_id": "fdUw3C",
            "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
            "important_level": {
                "id": "57a109b35ae8c20630fd7256",
                "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
                "name": "P1"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "state": {
                "id": "686f62038668bbae4f4dd0c1",
                "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
                "name": "设计",
                "type": "pending"
            },
            "type": {
                "id": "5cf189b35de9c20620ad7153",
                "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
                "name": "功能测试"
            },
            "maintenance": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "test_type": "automation",
            "description": "测试用例的备注",
            "precondition": "前置条件的描述信息",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "estimated_workload": 8,
            "remaining_workload": 5,
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "description": "UI测试",
                    "expected_value": null,
                    "is_group": true,
                    "group_id": null
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "description": "点击下一页按钮",
                    "expected_value": "成功跳转至下一页",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa112"
                },
                {
                    "step_id": "524cad5edb06305cca2fa114",
                    "description": "点击最后一页按钮",
                    "expected_value": "成功跳转至最后一页",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa112"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305c",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 15832903300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    }
]
```

获取用例列表

用于简单查询用例列表。  
更复杂的组合过滤、日期过滤、自定义属性过滤等场景，请使用「搜索用例列表」接口。

```html
https://{rest_api_root}/v1/testhub/cases
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testcase

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id 可选 | String | 测试库的 id。 |
| maintenance\_id 可选 | String | 维护人的 id。 |
| state\_id 可选 | String | 状态的 id。 |
| important\_level\_id 可选 | String | 重要程度的 id。 |
| tag\_id 可选 | String | 标签的 id。 |
| keywords 可选 | String | 关键字。支持用例编号和用例标题。 |
| include\_public\_image\_token 可选 | String | 包含获取图片资源 token 的属性。使用','分割，最多32个，支持 `description` 和自定义多行文本类型的属性。参数示例 `description,properties.prop_b` 。 |
| include\_deleted 可选 | Boolean | 是否查询已删除的用例。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否查询已归档的用例。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5edca524cad2fa112b06305c",
            "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "CSK-10",
            "title": "这是一个测试用例",
            "level": "P1",
            "short_id": "fdUw3C",
            "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
            "important_level": {
                "id": "57a109b35ae8c20630fd7256",
                "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
                "name": "P1"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "state": {
                "id": "686f62038668bbae4f4dd0c1",
                "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
                "name": "设计",
                "type": "pending"
            },
            "type": {
                "id": "5cf189b35de9c20620ad7153",
                "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
                "name": "功能测试"
            },
            "maintenance": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "test_type": "automation",
            "description": "测试用例的备注",
            "precondition": "前置条件的描述信息",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "estimated_workload": 8,
            "remaining_workload": 5,
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa100",
                    "description": "UI测试",
                    "expected_value": null,
                    "is_group": true,
                    "group_id": null
                },
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "description": "在浏览器地址栏中输入https://pingcode.com",
                    "expected_value": "成功访问PingCode官网",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa100"
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "description": "点击下一页按钮",
                    "expected_value": "成功跳转至下一页",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa100"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305c",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "IcF1VmJFF-UIi9lMU18m1NFFAruWXYx0ZAm90pJ2LGk",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583293300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

搜索用例列表

用于按条件搜索用例列表。

```html
https://{rest_api_root}/v1/testhub/cases/search
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testcase

Body

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| mode | String | 搜索模式。 `query` 表示基于 `payload.filter` 的结构化条件查询。  允许值: `query` |
| payload | Object | 搜索参数。 |
| payload.filter 可选 | Object | 过滤条件。   过滤时使用类 MongoDB 的查询语法，可通过属性名、操作符和对应值进行过滤。   引用类型（含数组引用类型）使用 `{属性名}.id` 作为属性名，例如 `library.id` 、 `participants.id` 。   自定义属性使用 `properties.{属性key}` 作为属性名，例如 `properties.prop_a` 。   文本类型（如 `title` 、 `description` 、 `precondition` ，以及自定义单行文本、多行文本、链接类型）的操作符： `exists` 、 `contains` 。   枚举类型（如 `test_type` ）的操作符： `exists` 、 `in` 、 `nin` 。   数字类型（自定义数字、进度、评分类型）的操作符： `exists` 、 `eq` 、 `ne` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 。   时间类型（如 `created_at` 、 `updated_at` ，以及自定义日期）的操作符： `exists` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 、 `between` （值为 `[起始时间戳, 结束时间戳]` ；过滤时以「天」为单位。   选项类型（自定义下拉单选、下拉多选、级联单选、级联多选）的操作符： `exists` 、 `in` 、 `nin` 。   引用类型（如 `library.id` 、 `state.id` 、 `type.id` 、 `maintenance.id` 、 `participants.id` ）的操作符： `exists` 、 `in` 、 `nin` 。   每个属性仅支持一个操作符。   暂不支持使用逻辑运算符。   内置属性和一些特殊属性暂不支持过滤： `id` 、 `url` 、 `identifier` 、 `short_id` 、 `html_url` 、 `public_image_token` 、 `steps` 、 `is_archived` 、 `is_deleted` 。 |
| payload.keywords 可选 | String | 关键字。支持用例编号和用例标题。 |
| payload.include\_public\_image\_token 可选 | String | 包含获取图片资源 token 的属性。使用 `,` 分割，最多 32 个，支持 `description` 和自定义多行文本类型的属性。 |
| payload.include\_deleted 可选 | Boolean | 是否查询已删除的用例。  默认值: `false` |
| payload.include\_archived 可选 | Boolean | 是否查询已归档的用例。  默认值: `false` |
| payload.page\_size 可选 | Number | 每页条数，取值范围 1-100。  默认值: `30` |
| payload.page\_index 可选 | Number | 页码，从 0 开始。  默认值: `0` |

```json
{
    "mode": "query",
    "payload": {
        "filter": {
            "title": {
                "contains": "登录"
            },
            "maintenance.id": {
                "nin": [
                    "315c85d24643678a9a0417f68e846aae"
                ]
            },
            "library.id": {
                "in": [
                    "5eb623f6a70571487ea47000",
                    "5eb623f6a70571487ea47001"
                ]
            },
            "participants.id": {
                "in": [
                    "a0417f68e846aae315c85d24643678a9"
                ]
            },
            "created_at": {
                "gte": 1730000000
            }
        },
        "keywords": "CSK",
        "include_public_image_token": "description",
        "include_deleted": false,
        "include_archived": false,
        "page_size": 10,
        "page_index": 0
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例全量结构数据的数组。 |

```json
{
    "page_size": 10,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5edca524cad2fa112b06305c",
            "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "identifier": "CSK-10",
            "title": "这是一个测试用例",
            "level": "P1",
            "short_id": "fdUw3C",
            "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
            "important_level": {
                "id": "57a109b35ae8c20630fd7256",
                "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
                "name": "P1"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "state": {
                "id": "686f62038668bbae4f4dd0c1",
                "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
                "name": "设计",
                "type": "pending"
            },
            "type": {
                "id": "5cf189b35de9c20620ad7153",
                "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
                "name": "功能测试"
            },
            "maintenance": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "test_type": "automation",
            "description": "测试用例的备注",
            "precondition": "前置条件的描述信息",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            },
            "estimated_workload": 8,
            "remaining_workload": 5,
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa100",
                    "description": "UI测试",
                    "expected_value": null,
                    "is_group": true,
                    "group_id": null
                },
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "description": "在浏览器地址栏中输入https://pingcode.com",
                    "expected_value": "成功访问PingCode官网",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa100"
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "description": "点击下一页按钮",
                    "expected_value": "成功跳转至下一页",
                    "is_group": false,
                    "group_id": "524cad5edb06305cca2fa100"
                }
            ],
            "participants": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305c",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                }
            ],
            "public_image_token": "IcF1VmJFF-UIi9lMU18m1NFFAruWXYx0ZAm90pJ2LGk",
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583293300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

删除一个用例

用于删除一个用例。

```html
https://{rest_api_root}/v1/testhub/cases/{case_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testcase

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| case\_id | String | 测试用例的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例的id。 |
| url | String | 用例的资源地址。 |
| library | Object | 用例所属的测试库。 |
| identifier | String | 用例的标识。 |
| title | String | 用例的标题。 |
| level | String | 用例重要程度的名字。 |
| short\_id | String | 用例的短id。 |
| html\_url | String | 用例的html地址。 |
| important\_level | Object | 用例的重要程度。 |
| suite | Object | 用例所属的测试模块。 |
| state | Object | 用例的状态。 |
| type | Object | 用例的类型。 |
| maintenance | Object | 用例的维护人。 |
| test\_type | String | 用例的测试类型。允许值分别表示自动测试和手动测试。  允许值: `automation`, `manual` |
| description | String | 用例的描述。 |
| precondition | String | 用例的前置条件。 |
| properties | Object | 用例的自定义属性。 |
| estimated\_workload | Number | 用例的预估工时。 |
| remaining\_workload | Number | 用例的剩余工时。 |
| steps | Object\[\] | 用例的步骤列表。 |
| participants | Object\[\] | 用例的关注人列表。 |
| created\_at | Number | 用例的创建时间。 |
| created\_by | Object | 用例的创建人。 |
| updated\_at | Number | 用例的更新时间。 |
| updated\_by | Object | 用例的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "5edca524cad2fa112b06305d",
    "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305d",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "identifier": "CSK-1",
    "title": "这是一个测试用例",
    "level": "P1",
    "short_id": "fdUw3C",
    "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
    "important_level": {
        "id": "57a109b35ae8c20630fd7256",
        "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
        "name": "P1"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "state": {
        "id": "686f62038668bbae4f4dd0c1",
        "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
        "name": "设计",
        "type": "pending"
    },
    "type": {
        "id": "5cf189b35de9c20620ad7153",
        "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
        "name": "功能测试"
    },
    "maintenance": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "test_type": "automation",
    "description": "测试用例的备注",
    "precondition": "前置条件的描述信息",
    "properties": {
        "prop_a": "prop_a_value",
        "prop_b": "prop_b_value"
    },
    "estimated_workload": 8,
    "remaining_workload": 5,
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "description": "在浏览器地址栏中输入https://pingcode.com",
            "expected_value": "成功访问PingCode官网",
            "is_group": false,
            "group_id": null
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=test_case&principal_id=5edca524cad2fa112b06305d",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583293300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 1
}
```

获取用例模块列表

用于查询用例模块列表。

```html
https://{rest_api_root}/v1/testhub/case/suites?library_id={library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testcase

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例模块的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "55714870a70ea4eb623f6700",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
            "name": "登录",
            "paths": "首页/用户"
        }
    ]
}
```

获取用例属性列表

用于查询用例属性列表。

```html
https://{rest_api_root}/v1/testhub/case/properties?library_id={library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testcase

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例属性的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "environment",
            "url": "https://{rest_api_root}/v1/testhub/case_properties/environment",
            "name": "重现环境",
            "type": "select",
            "options": [
                {
                    "_id": "5efb1859110533727a82c603",
                    "text": "测试"
                },
                {
                    "_id": "5efb1859110533727a82c604",
                    "text": "生产"
                }
            ]
        },
        {
            "id": "estimated_workload",
            "url": "https://{rest_api_root}/v1/testhub/case_properties/estimated_workload",
            "name": "预估工时",
            "type": "number",
            "options": null
        }
    ]
}
```

获取用例状态列表

用于查询用例状态列表。

```html
https://{rest_api_root}/v1/testhub/case/states?library_id={library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例状态全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 3,
    "values": [
        {
            "id": "686f62038668bbae4f4dd0c1",
            "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
            "name": "设计",
            "type": "pending"
        },
        {
            "id": "686f62038668bbae4f4dd0c2",
            "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c2",
            "name": "就绪",
            "type": "completed"
        },
        {
            "id": "686f62038668bbae4f4dd0c3",
            "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c3",
            "name": "废弃",
            "type": "closed"
        }
    ]
}
```

获取用例类型列表

用于查询用例类型列表。

```html
https://{rest_api_root}/v1/testhub/case/types?library_id={library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testcase

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例类型的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cf189b35de9c20620ad7153",
            "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
            "name": "功能测试"
        }
    ]
}
```

获取用例的执行历史列表

用于查询用例的执行历史列表。  
获取测试用例所有执行用例的最后一次执行结果。

```html
https://{rest_api_root}/v1/testhub/cases/{case_id}/histories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testcase

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| case\_id | String | 测试用例的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例的执行历史的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "65115f0939286e26e05a66db",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea/histories/65115f0939286e26e05a66db",
            "run": {
                "id": "547000eb6a70571487623fea",
                "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
                "status": "pass",
                "short_id": "Aq1u38yX",
                "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX"
            },
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870,
                "short_id": "7nNkViOD",
                "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "short_id": "fdUw3C",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "status": "pass",
            "executed_at": 1583290300,
            "executed_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "pass",
                    "actual_value": null
                }
            ]
        }
    ]
}
```

计划

创建一个计划

用于创建一个计划。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 测试计划的名称。名称在一个测试库里唯一。 |
| type\_id | String | 测试计划类型的id。 |
| start\_at | Number | 测试计划的开始时间。 |
| end\_at | Number | 测试计划的结束时间。 |
| assignee\_id | String | 测试计划负责人的id。 |
| project\_id 可选 | String | 项目的id。该字段在 sprint\_id 或 version\_id 有值时必填。 |
| sprint\_id 可选 | String | 迭代的id。该字段仅在 type\_id 代表迭代测试时有效。 |
| version\_id 可选 | String | 发布的id。该字段仅在 type\_id 代表发布测试时有效。 |

```json
{
    "name": "测试计划",
    "type_id": "641d0ab2b998f883f9c67b2f",
    "project_id": "5eb623f6a70571487ea41919",
    "version_id": "641d0ab2b998f883f9c67b2c",
    "start_at": 1589791860,
    "end_at": 1589791870,
    "assignee_id": "a0417f68e846aae315c85d24643678a9"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 计划的id。 |
| url | String | 计划的资源地址。 |
| library | Object | 计划所属的测试库。 |
| name | String | 计划的名称。 |
| state | Object | 计划的状态。 |
| start\_at | Number | 计划的开始时间。 |
| end\_at | Number | 计划的结束时间。 |
| short\_id | String | 计划的短id。 |
| html\_url | String | 计划的html地址。 |
| type | Object | 计划关联的类型。 |
| project | Object | 计划关联的项目。 |
| sprint | Object | 计划关联的迭代。 |
| version | Object | 计划关联的发布。 |
| assignee | Object | 计划的负责人。 |
| summary | String | 计划测试报告的概要。 |
| created\_at | Number | 计划的创建时间。 |
| created\_by | Object | 计划的创建人。 |
| updated\_at | Number | 计划的更新时间。 |
| updated\_by | Object | 计划的更新人。 |

```json
{
    "id": "5eb6a70571487623fea47000",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "测试计划",
    "state": {
        "id": "652d0cb2b798f983d9c67c2b",
        "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2c",
        "name": "进行中",
        "type": "in_progress"
    },
    "start_at": 1589791860,
    "end_at": 1589791870,
    "short_id": "7nNkViOD",
    "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs",
    "type": {
        "id": "641d0ab2b998f883f9c67b2c",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/641d0ab2b998f883f9c67b2c",
        "name": "发布测试"
    },
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "sprint": null,
    "version": {
        "id": "5eb623f6a70571487ea47001",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/versions/5eb623f6a70571487ea47001",
        "name": "1.0.0",
        "start_at": 1565255712,
        "end_at": 1565255879,
        "stage": {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "type": "pending",
            "color": "#FA8888"
        }
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "summary": "",
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取一个计划

用于查看一个计划。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plans/{plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| plan\_id | String | 测试计划的id或short\_id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 计划的id。 |
| url | String | 计划的资源地址。 |
| library | Object | 计划所属的测试库。 |
| name | String | 计划的名称。 |
| state | Object | 计划的状态。 |
| start\_at | Number | 计划的开始时间。 |
| end\_at | Number | 计划的结束时间。 |
| short\_id | String | 计划的短id。 |
| html\_url | String | 计划的html地址。 |
| type | Object | 计划关联的类型。包括项目、发布和迭代。 |
| project | Object | 计划关联的项目。 |
| sprint | Object | 计划关联的迭代。 |
| version | Object | 计划关联的发布。 |
| assignee | Object | 计划的负责人。 |
| summary | String | 计划测试报告的概要。 |
| created\_at | Number | 计划的创建时间。 |
| created\_by | Object | 计划的创建人。 |
| updated\_at | Number | 计划的更新时间。 |
| updated\_by | Object | 计划的更新人。 |

```json
{
    "id": "5eb6a70571487623fea47000",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "测试计划",
    "state": {
        "id": "652d0cb2b798f983d9c67c2b",
        "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2b",
        "name": "进行中",
        "type": "in_progress"
    },
    "start_at": 1589791860,
    "end_at": 1589791870,
    "short_id": "7nNkViOD",
    "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs",
    "type": {
        "id": "641d0ab2b998f883f9c67b2c",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/641d0ab2b998f883f9c67b2c",
        "name": "发布测试"
    },
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "sprint": null,
    "version": {
        "id": "5eb623487ea47001f6a70571",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/versions/5eb623487ea47001f6a70571",
        "name": "1.0.0",
        "start_at": 1565255712,
        "end_at": 1565255879,
        "stage": {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "type": "pending",
            "color": "#FA8888"
        }
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "summary": "测试报告的概要",
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

部分更新一个计划

用于部分更新一个计划。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plans/{plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| plan\_id | String | 测试计划的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 测试计划的名称。名称在一个测试库里唯一。 |
| type\_id 可选 | String | 测试计划类型的id。指定测试计划类型时，建议同时指定对应的 sprint\_id 或 version\_id。 |
| project\_id 可选 | String | 项目的id。 |
| sprint\_id 可选 | String | 迭代的id。该字段仅在测试计划类型为迭代测试时有效。 |
| version\_id 可选 | String | 发布的id。该字段仅在测试计划类型为发布测试时有效。 |
| start\_at 可选 | Number | 测试计划的开始时间。 |
| end\_at 可选 | Number | 测试计划的结束时间。 |
| assignee\_id 可选 | String | 测试计划负责人的id。 |
| state\_id 可选 | String | 测试计划状态的id。 |
| summary 可选 | String | 测试报告的概要信息。 |

```json
{
    "name": "测试计划",
    "type_id": "641d0ab2b998f883f9c67b2c",
    "project_id": "5eb623f6a70571487ea41919",
    "version_id": "5eb623487ea47001f6a70571",
    "start_at": 1589791860,
    "end_at": 1589791870,
    "assignee_id": "a0417f68e846aae315c85d24643678a9",
    "state_id": "652d0cb2b798f983d9c67c2b",
    "summary": "测试报告的概要"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 计划的id。 |
| url | String | 计划的资源地址。 |
| library | Object | 计划所属的测试库。 |
| name | String | 计划的名称。 |
| state | Object | 计划的状态。 |
| start\_at | Number | 计划的开始时间。 |
| end\_at | Number | 计划的结束时间。 |
| short\_id | String | 计划的短id。 |
| html\_url | String | 计划的html地址。 |
| type | Object | 计划关联的类型。 |
| project | Object | 计划关联的项目。 |
| sprint | Object | 计划关联的迭代。 |
| version | Object | 计划关联的发布。 |
| assignee | Object | 计划的负责人。 |
| summary | String | 计划测试报告的概要。 |
| created\_at | Number | 计划的创建时间。 |
| created\_by | Object | 计划的创建人。 |
| updated\_at | Number | 计划的更新时间。 |
| updated\_by | Object | 计划的更新人。 |

```json
{
    "id": "5eb6a70571487623fea47000",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "测试计划",
    "state": {
        "id": "652d0cb2b798f983d9c67c2b",
        "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2c",
        "name": "进行中",
        "type": "in_progress"
    },
    "start_at": 1589791860,
    "end_at": 1589791870,
    "short_id": "7nNkViOD",
    "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs",
    "type": {
        "id": "641d0ab2b998f883f9c67b2c",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/641d0ab2b998f883f9c67b2c",
        "name": "发布测试"
    },
    "project": {
        "id": "5eb623f6a70571487ea41919",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
        "identifier": "SCR",
        "name": "Scrum项目",
        "type": "scrum",
        "is_archived": 0,
        "is_deleted": 0
    },
    "sprint": null,
    "version": {
        "id": "5eb623487ea47001f6a70571",
        "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/versions/5eb623487ea47001f6a70571",
        "name": "1.0.0",
        "start_at": 1565255712,
        "end_at": 1565255879,
        "stage": {
            "id": "5f44a8f8bb347b14b49624a1",
            "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
            "name": "未开始",
            "type": "pending",
            "color": "#FA8888"
        }
    },
    "assignee": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "summary": "测试报告的概要",
    "created_at": 1565366200,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1565366200,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取计划列表

用于查询计划列表。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 测试计划名称。 |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 计划全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5eb6a70571487623fea47000",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "测试计划",
            "state": {
                "id": "652d0cb2b798f983d9c67c2b",
                "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2b",
                "name": "进行中",
                "type": "in_progress"
            },
            "start_at": 1589791860,
            "end_at": 1589791870,
            "short_id": "7nNkViOD",
            "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs",
            "type": {
                "id": "641d0ab2b998f883f9c67b2c",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/641d0ab2b998f883f9c67b2c",
                "name": "发布测试"
            },
            "project": {
                "id": "5eb623f6a70571487ea41919",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919",
                "identifier": "SCR",
                "name": "Scrum项目",
                "type": "scrum",
                "is_archived": 0,
                "is_deleted": 0
            },
            "sprint": null,
            "version": {
                "id": "5eb623487ea47001f6a70571",
                "url": "https://{rest_api_root}/v1/pjm/projects/5eb623f6a70571487ea41919/versions/5eb623487ea47001f6a70571",
                "name": "1.0.0",
                "start_at": 1565255712,
                "end_at": 1565255879,
                "stage": {
                    "id": "5f44a8f8bb347b14b49624a1",
                    "url": "https://{rest_api_root}/v1/pjm/stages/5f44a8f8bb347b14b49624a1",
                    "name": "未开始",
                    "type": "pending",
                    "color": "#FA8888"
                }
            },
            "assignee": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "summary": "测试报告的概要",
            "created_at": 1565366200,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1565366200,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

获取一个计划类型

用于查看一个计划类型。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plan_types/{plan_type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| plan\_type\_id | String | 计划类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 计划类型的id。 |
| url | String | 计划类型的资源地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| name | String | 计划类型的名称。 |

```json
{
    "id": "642f765b6950bc66cfa82f05",
    "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/642f765b6950bc66cfa82f05",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "普通测试"
}
```

获取计划类型列表

用于查询计划类型列表。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plan_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 计划类型全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "642f765b6950bc66cfa82f05",
            "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plan_types/642f765b6950bc66cfa82f05",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "普通测试"
        }
    ]
}
```

创建一个执行用例

用于创建一个执行用例。

```html
https://{rest_api_root}/v1/testhub/runs
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| plan\_id | String | 测试计划的id。 |
| case\_id | String | 测试用例的id。 |
| executor\_id 可选 | String | 执行人的id。 |

```json
{
    "library_id": "5eb623f6a70571487ea47000",
    "plan_id": "5eb6a70571487623fea47000",
    "case_id": "5edca524cad2fa112b06305c",
    "executor_id": "a0417f68e846aae315c85d24643678a9"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 执行用例的id。 |
| url | String | 执行用例的资源地址。 |
| status | String | 执行用例的执行状态。  允许值: `not_start`, `pass`, `block`, `failure`, `skip` |
| short\_id | String | 执行用例的短id。 |
| html\_url | String | 执行用例的html地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| plan | Object | 所属测试计划的引用结构数据。 |
| case | Object | 关联测试用例的引用结构数据。 |
| latest\_executed\_status | Object | 最近一次执行结果的引用结构数据。 |
| suite | Object | 用例所属模块的引用结构数据。 |
| remark | String | 执行用例执行结果的备注。 |
| executor | Object | 执行人的引用结构数据。 |
| steps | Object\[\] | 执行用例步骤列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "547000eb6a70571487623fea",
    "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
    "status": "not_start",
    "short_id": "Aq1u38yX",
    "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "plan": {
        "id": "5eb6a70571487623fea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
        "name": "测试计划",
        "status": "in_progress",
        "start_at": 1589791860,
        "end_at": 1589791870,
        "short_id": "7nNkViOD",
        "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
    },
    "case": {
        "id": "5edca524cad2fa112b06305c",
        "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
        "identifier": "CSK-10",
        "title": "这是一个测试用例",
        "level": "P1",
        "short_id": "fdUw3C",
        "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
        "test_type": "automation",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "latest_executed_status": {
        "id": "68d117800d5dd2484a198265",
        "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
        "name": "未测"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "remark": null,
    "executor": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status": "not_start",
            "actual_value": null
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

批量创建执行用例

用于批量创建执行用例。

```html
https://{rest_api_root}/v1/testhub/runs/bulk
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| runs | Object\[\] | 创建单个执行用例必要参数的数组。数组长度不超过100。 |
| runs.library\_id | String | 执行用例所属测试库的id。 |
| runs.plan\_id | String | 执行用例所属测试计划的id。 |
| runs.case\_id | String | 测试用例的id。 |
| runs.executor\_id 可选 | String | 执行人的id。 |

```json
{
    "runs": [
        {
            "library_id": "5edca524cad2fa112b06305a",
            "plan_id": "5edca524cad2fa112b06305b",
            "case_id": "5edca524cad2fa112b06305c",
            "executor_id": "a0417f68e846aae315c85d24643678a9"
        },
        {
            "library_id": "5edca524cad2fa112b06306a",
            "plan_id": "5edca524cad2fa112b06306b",
            "case_id": "5edca524cad2fa112b06306c",
            "executor_id": "a0417f68e846aae315c85d24643678b9"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 操作状态。  允许值: `success`, `failure` |
| run | Object | 执行用例的全量结构数据。操作成功时返回。 |
| message 可选 | String | 失败原因。操作失败时返回。 |

```json
[
    {
        "state": "success",
        "run": {
            "id": "547000eb6a70571487623fea",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
            "status": "not_start",
            "short_id": "Aq1u38yX",
            "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "short_id": "fdUw3C",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "latest_executed_status": {
                "id": "68d117800d5dd2484a198265",
                "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
                "name": "未测"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "executor": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "remark": "执行用例执行结果的备注",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "not_start",
                    "actual_value": null
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    },
    {
        "state": "failure",
        "run": {
            "library_id": "5edca524cad2fa112b06305a",
            "plan_id": "5edca524cad2fa112b06305b",
            "case_id": "5edca524cad2fa112b06305d",
            "executor_id": "a0417f68e846aae315c85d24643678a9"
        },
        "message": "创建失败或已创建"
    }
]
```

获取一个执行用例

用于查看一个执行用例。

```html
https://{rest_api_root}/v1/testhub/runs/{run_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| run\_id | String | 执行用例的id或short\_id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 执行用例的id。 |
| url | String | 执行用例的资源地址。 |
| status | String | 执行用例的执行状态。  允许值: `not_start`, `pass`, `block`, `failure`, `skip` |
| short\_id | String | 执行用例的短id。 |
| html\_url | String | 执行用例的html地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| plan | Object | 所属测试计划的引用结构数据。 |
| case | Object | 关联测试用例的引用结构数据。 |
| latest\_executed\_status | Object | 最近一次执行结果的引用结构数据。 |
| suite | Object | 用例所属模块的引用结构数据。 |
| remark | String | 执行用例执行结果的备注。 |
| executor | Object | 执行人的引用结构数据。 |
| steps | Object\[\] | 执行用例步骤列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "547000eb6a70571487623fea",
    "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
    "status": "not_start",
    "short_id": "Aq1u38yX",
    "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "plan": {
        "id": "5eb6a70571487623fea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
        "name": "测试计划",
        "status": "in_progress",
        "start_at": 1589791860,
        "end_at": 1589791870,
        "short_id": "7nNkViOD",
        "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
    },
    "case": {
        "id": "5edca524cad2fa112b06305c",
        "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
        "identifier": "CSK-10",
        "title": "这是一个测试用例",
        "level": "P1",
        "short_id": "fdUw3C",
        "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
        "test_type": "automation",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "latest_executed_status": {
        "id": "68d117800d5dd2484a198265",
        "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
        "name": "未测"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "remark": null,
    "executor": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status": "not_start",
            "actual_value": null
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

全量更新一个执行用例

用于全量更新一个执行用例。

```html
https://{rest_api_root}/v1/testhub/runs/{run_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| run\_id | String | 执行用例的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status\_id | String | 执行用例执行结果的id。 |
| remark 可选 | String | 执行用例执行结果的备注。 |
| steps | Object\[\] | 执行用例步骤的列表。 |
| steps.step\_id | String | 执行用例步骤的id。 |
| steps.status\_id | String | 执行用例步骤执行结果的id。 |
| steps.actual\_value 可选 | String | 执行用例步骤的实际值。 |
| executor\_id 可选 | String | 执行人的id。不传默认执行人为空。 |

```json
{
    "status_id": "68d117800d5dd2484a198261",
    "remark": "执行用例执行结果的备注",
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status_id": "68d117800d5dd2484a198261",
            "actual_value": "正常访问PingCode官网"
        }
    ],
    "executor_id": "a0417f68e846aae315c85d24643678a9"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 执行用例的id。 |
| url | String | 执行用例的资源地址。 |
| status | String | 执行用例的执行状态。  允许值: `not_start`, `pass`, `block`, `failure`, `skip` |
| short\_id | String | 执行用例的短id。 |
| html\_url | String | 执行用例的html地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| plan | Object | 所属测试计划的引用结构数据。 |
| case | Object | 关联测试用例的引用结构数据。 |
| latest\_executed\_status | Object | 最近一次执行结果的引用结构数据。 |
| suite | Object | 用例所属模块的引用结构数据。 |
| remark | String | 执行用例执行结果的备注。 |
| executor | Object | 执行人的引用结构数据。 |
| steps | Object\[\] | 执行用例步骤列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "547000eb6a70571487623fea",
    "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
    "status": "pass",
    "short_id": "Aq1u38yX",
    "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "plan": {
        "id": "5eb6a70571487623fea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
        "name": "测试计划",
        "status": "in_progress",
        "start_at": 1589791860,
        "end_at": 1589791870,
        "short_id": "7nNkViOD",
        "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
    },
    "case": {
        "id": "5edca524cad2fa112b06305c",
        "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
        "identifier": "CSK-10",
        "title": "这是一个测试用例",
        "level": "P1",
        "short_id": "fdUw3C",
        "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
        "test_type": "automation",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "latest_executed_status": {
        "id": "68d117800d5dd2484a198261",
        "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198261",
        "name": "通过"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "remark": "执行用例执行结果的备注",
    "executor": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status": "pass",
            "actual_value": null
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583293300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个执行用例

用于部分更新一个执行用例。

```html
https://{rest_api_root}/v1/testhub/runs/{run_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| run\_id | String | 执行用例的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status\_id | String | 执行用例执行结果的id。 |
| remark 可选 | String | 执行用例执行结果的备注。 |
| steps 可选 | Object\[\] | 执行用例步骤的列表。steps是整体更新的。 |
| steps.step\_id | String | 执行用例步骤的id。 |
| steps.status\_id | String | 执行用例步骤执行结果的id。 |
| steps.actual\_value 可选 | String | 执行用例步骤的实际值。 |
| executor\_id 可选 | String | 执行人的id。不传默认执行人为执行用例的创建人。 |

```json
{
    "status_id": "68d117800d5dd2484a198265",
    "remark": "执行用例执行结果的备注",
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status_id": "68d117800d5dd2484a198265",
            "actual_value": "正常访问PingCode官网"
        }
    ],
    "executor_id": "a0417f68e846aae315c85d24643678a9"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 执行用例的id。 |
| url | String | 执行用例的资源地址。 |
| status | String | 执行用例的执行状态。  允许值: `not_start`, `pass`, `block`, `failure`, `skip` |
| short\_id | String | 执行用例的短id。 |
| html\_url | String | 执行用例的html地址。 |
| library | Object | 所属测试库的引用结构数据。 |
| plan | Object | 所属测试计划的引用结构数据。 |
| case | Object | 关联测试用例的引用结构数据。 |
| latest\_executed\_status | Object | 最近一次执行结果的引用结构数据。 |
| suite | Object | 用例所属模块的引用结构数据。 |
| remark | String | 执行用例执行结果的备注。 |
| executor | Object | 执行人的引用结构数据。 |
| steps | Object\[\] | 执行用例步骤列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "547000eb6a70571487623fea",
    "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
    "status": "not_start",
    "short_id": "Aq1u38yX",
    "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "plan": {
        "id": "5eb6a70571487623fea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
        "name": "测试计划",
        "status": "in_progress",
        "start_at": 1589791860,
        "end_at": 1589791870,
        "short_id": "7nNkViOD",
        "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
    },
    "case": {
        "id": "5edca524cad2fa112b06305c",
        "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
        "identifier": "CSK-10",
        "title": "这是一个测试用例",
        "level": "P1",
        "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
        "test_type": "automation",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "latest_executed_status": {
        "id": "68d117800d5dd2484a198265",
        "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
        "name": "未测"
    },
    "suite": {
        "id": "55714870a70ea4eb623f6700",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
        "name": "登录",
        "paths": "首页/账户"
    },
    "remark": "执行用例执行结果的备注",
    "executor": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status": "not_start",
            "actual_value": null
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

批量部分更新执行用例

用于批量部分更新执行用例。

```html
https://{rest_api_root}/v1/testhub/runs/bulk
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| runs | Object\[\] | 部分更新单个执行用例必要参数的数组。 |
| runs.run\_id | String | 执行用例的id。 |
| runs.status\_id | String | 执行用例执行结果的id。 |
| runs.remark 可选 | String | 执行用例执行结果的备注。 |
| runs.steps 可选 | Object\[\] | 执行用例的步骤列表。 |
| runs.steps.step\_id | String | 执行用例步骤的id。 |
| runs.steps.status\_id | String | 执行用例步骤执行结果的id。 |
| runs.steps.actual\_value 可选 | String | 执行用例步骤的实际值。 |
| runs.executor\_id 可选 | String | 执行人的id。 |

```json
{
    "runs": [
        {
            "run_id": "5edca524cad2fa112b06305c",
            "status_id": "68d117800d5dd2484a198265",
            "remark": "执行用例执行结果的备注",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status_id": "68d117800d5dd2484a198265",
                    "actual_value": "正常访问PingCode官网"
                },
                {
                    "step_id": "524cad5edb06305cca2fa113",
                    "status_id": "68d117800d5dd2484a198265",
                    "actual_value": "不正常访问PingCode官网"
                }
            ],
            "executor_id": "a0417f68e846aae315c85d24643678a9"
        },
        {
            "run_id": "5edca524cad2fa112b06305d",
            "status_id": "68d117800d5dd2484a198265",
            "remark": "执行用例执行结果的备注",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa114",
                    "status_id": "68d117800d5dd2484a198265",
                    "actual_value": "正常访问PingCode官网"
                },
                {
                    "step_id": "524cad5edb06305cca2fa114",
                    "status_id": "68d117800d5dd2484a198265",
                    "actual_value": "不正常访问PingCode官网"
                }
            ],
            "executor_id": "a0417f68e846aae315c85d24643678a8"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state | String | 操作状态。  允许值: `success`, `failure` |
| run | Object | 执行用例的全量结构数据。操作成功时返回。 |
| message 可选 | String | 失败原因。操作失败时返回。 |

```json
[
    {
        "state": "success",
        "run": {
            "id": "5edca524cad2fa112b06305c",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
            "status": "not_start",
            "short_id": "Aq1u38yX",
            "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "short_id": "fdUw3C",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "latest_executed_status": {
                "id": "68d117800d5dd2484a198265",
                "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
                "name": "未测"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "executor": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "remark": null,
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "not_start",
                    "actual_value": "正常访问PingCode官网"
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583299300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    },
    {
        "state": "success",
        "run": {
            "id": "5edca524cad2fa112b06305d",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
            "status": "not_start",
            "short_id": "Aq1u38yX",
            "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "short_id": "fdUw3C",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "latest_executed_status": {
                "id": "68d117800d5dd2484a198265",
                "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
                "name": "未测"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "executor": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "remark": "执行用例执行结果的备注",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "not_start",
                    "actual_value": "正常访问PingCode官网"
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583299300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    }
]
```

批量操作执行用例

用于批量操作执行用例。

```html
https://{rest_api_root}/v1/testhub/libraries/{library_id}/plans/{plan_id}/runs/bulk
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |
| plan\_id | String | 测试计划的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| inserts 可选 | Object\[\] | 需要批量创建的执行用例。该参数是一个对象数组（数组内对象不得超过50个）。 |
| inserts.case\_id | String | 测试用例id。 |
| inserts.executor\_id 可选 | String | 执行人id。 |
| updates 可选 | Object\[\] | 需要批量更新的执行用例。该参数是一个对象数组（数组内对象不得超过50个）。 |
| updates.run\_id | String | 执行用例的id。 |
| updates.status\_id | String | 执行用例执行结果的id。 |
| updates.steps 可选 | Object\[\] | 执行用例步骤的数组。 |
| updates.steps.step\_id | String | 执行用例步骤的id。 |
| updates.steps.status\_id | String | 执行用例步骤执行结果的id。 |
| updates.steps.actual\_value 可选 | String | 执行用例步骤的实际值。 |
| updates.executor\_id 可选 | String | 执行人的id。 |
| deletes 可选 | String\[\] | 需要批量删除的执行用例。该参数是一个执行用例id的数组（数组内id不得超过50个）。 |

```json
{
    "inserts": [
        {
            "case_id": "5edca524cad2fa112b06305c",
            "executor_id": "a0417f68e846aae315c85d24643678a9"
        }
    ],
    "updates": [
        {
            "run_id": "547000eb6a70571487623fea",
            "status_id": "68d117800d5dd2484a198265",
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status_id": "68d117800d5dd2484a198265",
                    "actual_value": "正常访问PingCode官网"
                }
            ],
            "executor_id": "a0417f68e846aae315c85d24643678a9"
        }
    ],
    "deletes": [
        "547000eb6a70571487623fea"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| inserts | Number | 成功创建的执行用例数量。 |
| updates | Number | 成功更新的执行用例数量。 |
| deletes | Number | 成功删除的执行用例数量。 |

```json
{
    "inserts": 1,
    "updates": 1,
    "deletes": 1
}
```

获取执行用例列表

用于简单查询执行用例列表。  
更复杂的组合过滤、自定义属性过滤等场景，请使用「搜索执行用例列表」接口。

```html
https://{rest_api_root}/v1/testhub/runs
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| plan\_id 可选 | String | 测试计划的 id。 |
| case\_id 可选 | String | 测试用例的 id。 |
| suite\_id 可选 | String | 测试模块的 id。 |
| status\_id 可选 | String | 执行结果的 id。 |
| keywords 可选 | String | 关键字。支持用例编号和用例标题。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 执行用例全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "547000eb6a70571487623fea",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
            "status": "not_start",
            "short_id": "Aq1u38yX",
            "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870,
                "short_id": "7nNkViOD",
                "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "latest_executed_status": {
                "id": "68d117800d5dd2484a198265",
                "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
                "name": "未测"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "remark": "执行用例执行结果的备注",
            "executor": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "not_start",
                    "actual_value": null
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

搜索执行用例列表

用于按条件搜索执行用例列表。

```html
https://{rest_api_root}/v1/testhub/runs/search
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

Body

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| mode | String | 搜索模式。 `query` 表示基于 `payload.filter` 的结构化条件查询。  允许值: `query` |
| payload | Object | 搜索参数。 |
| payload.filter 可选 | Object | 过滤条件。   过滤时使用类 MongoDB 的查询语法，可通过属性名、操作符和对应值进行过滤。   引用类型（含数组引用类型）使用 `{属性名}.id` 作为属性名，例如 `plan.id` 、 `case.id` 、 `latest_executed_status.id` 。   自定义属性使用 `properties.{属性key}` 作为属性名，例如 `properties.prop_a` 。   文本类型（如 `title` 、 `description` 、 `precondition` ，以及自定义单行文本、多行文本、链接类型）的操作符： `exists` 、 `contains` 。   枚举类型（如 `test_type` ）的操作符： `exists` 、 `in` 、 `nin` 。   数字类型（自定义数字、进度、评分类型）的操作符： `exists` 、 `eq` 、 `ne` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 。   时间类型（如 `created_at` 、 `updated_at` ，以及自定义日期）的操作符： `exists` 、 `gt` 、 `lt` 、 `gte` 、 `lte` 、 `between` （值为 `[起始时间戳, 结束时间戳]` ；过滤时以「天」为单位。   选项类型（自定义下拉单选、下拉多选、级联单选、级联多选）的操作符： `exists` 、 `in` 、 `nin` 。   引用类型（如 `plan.id` 、 `case.id` 、 `latest_executed_status.id` 、 `executor.id` ）的操作符： `exists` 、 `in` 、 `nin` 。   每个属性仅支持一个操作符。   暂不支持使用逻辑运算符。   内置属性和一些特殊属性暂不支持过滤： `id` 、 `url` 、 `short_id` 、 `html_url` 、 `library.id` 、 `steps` 、 `is_archived` 、 `is_deleted` 。 |
| payload.keywords 可选 | String | 关键字。支持用例编号和用例标题。 |
| payload.page\_size 可选 | Number | 每页条数，取值范围 1-100。  默认值: `30` |
| payload.page\_index 可选 | Number | 页码，从 0 开始。  默认值: `0` |

```json
{
    "mode": "query",
    "payload": {
        "filter": {
            "title": {
                "contains": "登录"
            },
            "plan.id": {
                "in": [
                    "5eb6a70571487623fea47000"
                ]
            },
            "latest_executed_status.id": {
                "in": [
                    "68d117800d5dd2484a198265"
                ]
            }
        },
        "keywords": "CSK",
        "page_size": 10,
        "page_index": 0
    }
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 执行用例全量结构数据的数组。 |

```json
{
    "page_size": 10,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "547000eb6a70571487623fea",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
            "status": "not_start",
            "short_id": "Aq1u38yX",
            "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870,
                "short_id": "7nNkViOD",
                "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "latest_executed_status": {
                "id": "68d117800d5dd2484a198265",
                "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
                "name": "未测"
            },
            "suite": {
                "id": "55714870a70ea4eb623f6700",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/suites/55714870a70ea4eb623f6700",
                "name": "登录",
                "paths": "首页/账户"
            },
            "remark": "执行用例执行结果的备注",
            "executor": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "not_start",
                    "actual_value": null
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290300,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

获取执行用例执行结果列表

用于查询执行用例执行结果列表。

```html
https://{rest_api_root}/v1/testhub/run/statuses?library_id={library_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id | String | 测试库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 执行用例执行结果全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 5,
    "values": [
        {
            "id": "68d117800d5dd2484a198261",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198261",
            "name": "通过"
        },
        {
            "id": "68d117800d5dd2484a198262",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198262",
            "name": "受阻"
        },
        {
            "id": "68d117800d5dd2484a198263",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198263",
            "name": "失败"
        },
        {
            "id": "68d117800d5dd2484a198264",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198264",
            "name": "跳过"
        },
        {
            "id": "68d117800d5dd2484a198265",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
            "name": "未测"
        }
    ]
}
```

获取一条执行用例的结果记录

用于查看一条执行用例结果记录。

```html
https://{rest_api_root}/v1/testhub/runs/{run_id}/histories/{history_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| run\_id | String | 执行用例的id。 |
| history\_id | String | 执行用例结果记录的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 执行用例结果记录的id。 |
| url | String | 执行用例结果记录的资源地址。 |
| run | Object | 执行用例的引用结构数据。 |
| library | Object | 所属测试库的引用结构数据。 |
| plan | Object | 所属测试计划的引用结构数据。 |
| case | Object | 关联测试用例的引用结构数据。 |
| executed\_status | Object | 执行结果的引用结构数据。 |
| remark | String | 执行用例执行结果的备注。 |
| executed\_at | Number | 执行时间，单位为秒。 |
| executed\_by | Object | 执行人的引用结构数据。 |
| steps | Object\[\] | 执行用例步骤列表。 |

```json
{
    "id": "65115f0939286e26e05a66db",
    "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea/histories/65115f0939286e26e05a66db",
    "run": {
        "id": "547000eb6a70571487623fea",
        "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
        "status": "pass",
        "short_id": "Aq1u38yX",
        "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX"
    },
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    },
    "plan": {
        "id": "5eb6a70571487623fea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
        "name": "测试计划",
        "status": "in_progress",
        "start_at": 1589791860,
        "end_at": 1589791870,
        "short_id": "7nNkViOD",
        "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
    },
    "case": {
        "id": "5edca524cad2fa112b06305c",
        "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
        "identifier": "CSK-10",
        "title": "这是一个测试用例",
        "level": "P1",
        "short_id": "fdUw3C",
        "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
        "test_type": "automation",
        "properties": {
            "prop_a": "prop_a_value",
            "prop_b": "prop_b_value"
        }
    },
    "executed_status": {
        "id": "68d117800d5dd2484a198261",
        "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198261",
        "name": "通过"
    },
    "remark": "执行用例执行结果的备注",
    "executed_at": 1583290300,
    "executed_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "steps": [
        {
            "step_id": "524cad5edb06305cca2fa112",
            "status": "pass",
            "actual_value": null
        }
    ]
}
```

获取执行用例的结果记录列表

用于查询执行用例的结果记录。

```html
https://{rest_api_root}/v1/testhub/runs/{run_id}/histories
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:testplan

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| run\_id | String | 执行用例的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 执行用例结果记录全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "65115f0939286e26e05a66db",
            "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea/histories/65115f0939286e26e05a66db",
            "run": {
                "id": "547000eb6a70571487623fea",
                "url": "https://{rest_api_root}/v1/testhub/runs/547000eb6a70571487623fea",
                "status": "pass",
                "short_id": "Aq1u38yX",
                "html_url": "https://yctech.pingcode.com/testhub/runs/Aq1u38yX"
            },
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            },
            "plan": {
                "id": "5eb6a70571487623fea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000/plans/5eb6a70571487623fea47000",
                "name": "测试计划",
                "status": "in_progress",
                "start_at": 1589791860,
                "end_at": 1589791870,
                "short_id": "7nNkViOD",
                "html_url": "https://yctech.pingcode.com/testhub/libraries/CSK/plans/7nNkViOD/runs"
            },
            "case": {
                "id": "5edca524cad2fa112b06305c",
                "url": "https://{rest_api_root}/v1/testhub/cases/5edca524cad2fa112b06305c",
                "identifier": "CSK-10",
                "title": "这是一个测试用例",
                "level": "P1",
                "short_id": "fdUw3C",
                "html_url": "https://yctech.pingcode.com/testhub/cases/fdUw3C",
                "test_type": "automation",
                "properties": {
                    "prop_a": "prop_a_value",
                    "prop_b": "prop_b_value"
                }
            },
            "executed_status": {
                "id": "68d117800d5dd2484a198261",
                "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198261",
                "name": "通过"
            },
            "remark": "执行用例执行结果的备注",
            "executed_at": 1583290300,
            "executed_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "steps": [
                {
                    "step_id": "524cad5edb06305cca2fa112",
                    "status": "pass",
                    "actual_value": null
                }
            ]
        }
    ]
}
```

测试配置中心

用例配置

获取一个用例状态

用于查看一个用例状态。

```html
https://{rest_api_root}/v1/testhub/case_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_id | String | 用例状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例状态的id。 |
| url | String | 用例状态的资源地址。 |
| name | String | 用例状态的名称。 |
| type | String | 用例状态的类型。  允许值: `pending`, `completed`, `closed` |
| color | String | 用例状态的颜色。 |

```json
{
    "id": "686f62038668bbae4f4dd0c1",
    "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
    "name": "设计",
    "type": "pending",
    "color": "#56ABFB"
}
```

获取全部用例状态列表

用于查询全部用例状态列表。

```html
https://{rest_api_root}/v1/testhub/case_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部用例状态全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 3,
    "values": [
        {
            "id": "686f62038668bbae4f4dd0c1",
            "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c1",
            "name": "设计",
            "type": "pending"
        },
        {
            "id": "686f62038668bbae4f4dd0c2",
            "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c2",
            "name": "就绪",
            "type": "completed"
        },
        {
            "id": "686f62038668bbae4f4dd0c3",
            "url": "https://{rest_api_root}/v1/testhub/case_states/686f62038668bbae4f4dd0c3",
            "name": "废弃",
            "type": "closed"
        }
    ]
}
```

获取一个用例类型

用于查看一个用例类型。

```html
https://{rest_api_root}/v1/testhub/case_types/{type_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| type\_id | String | 用例类型的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例类型的id。 |
| url | String | 用例类型的资源地址。 |
| name | String | 用例类型的名称。 |

```json
{
    "id": "5cf189b35de9c20620ad7153",
    "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
    "name": "功能测试"
}
```

获取全部用例类型列表

用于查询全部用例类型列表。

```html
https://{rest_api_root}/v1/testhub/case_types
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部用例类型全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5cf189b35de9c20620ad7153",
            "url": "https://{rest_api_root}/v1/testhub/case_types/5cf189b35de9c20620ad7153",
            "name": "功能测试"
        }
    ]
}
```

获取一个用例重要程度

用于查看一个用例重要程度。

```html
https://{rest_api_root}/v1/testhub/case_important_levels/{important_level_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| important\_level\_id | String | 用例重要程度的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例重要程度的id。 |
| url | String | 用例重要程度的资源地址。 |
| name | String | 用例重要程度的名称。 |
| color | String | 用例重要程度的颜色。 |

```json
{
    "id": "57a109b35ae8c20630fd7256",
    "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
    "name": "P1",
    "color": "#56ABFB"
}
```

获取全部重要程度列表

用于查询全部重要程度列表。

```html
https://{rest_api_root}/v1/testhub/case_important_levels
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 重要程度的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "57a109b35ae8c20630fd7256",
            "url": "https://{rest_api_root}/v1/testhub/case_important_levels/57a109b35ae8c20630fd7256",
            "name": "P11",
            "color": "#56ABFB"
        }
    ]
}
```

创建一个用例属性

用于创建一个用例属性。

```html
https://{rest_api_root}/v1/testhub/case_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:configuration

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 用例属性的名称。在一个企业中这个名称是唯一的。 |
| type | String | 用例属性的类型。  允许值: `text`, `textarea`, `select`, `multi_select`, `cascade_select`, `cascade_multi_select`, `member`, `members`, `date`, `number`, `progress`, `rate`, `link` |
| options 可选 | Object\[\] | 选择项列表。当用例属性类型为 `select,multi_select,cascade_select,cascade_multi_select` 时可选填此项。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "text": "严重"
        },
        {
            "text": "一般"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例属性的id。 |
| url | String | 用例属性的资源地址。 |
| name | String | 用例属性的名称。 |
| type | String | 用例属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/testhub/case_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

获取一个用例属性

用于查看一个用例属性。

```html
https://{rest_api_root}/v1/testhub/case_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 用例属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例属性的id。 |
| url | String | 用例属性的资源地址。 |
| name | String | 用例属性的名称。 |
| type | String | 用例属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity",
    "url": "https://{rest_api_root}/v1/testhub/case_properties/severity",
    "name": "严重程度",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重"
        },
        {
            "_id": "5efb1859110533727a82c604",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

部分更新一个用例属性

用于部分更新一个用例属性。

```html
https://{rest_api_root}/v1/testhub/case_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 用例属性的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 用例属性的名称。在一个企业中这个名称是唯一的。 |
| options 可选 | Object\[\] | 选择项列表。 `options` 是整体更新的。当用例属性类型为 `select,multi_select,cascade_select,cascade_multi_select` 时可选填此项。 |
| options.\_id 可选 | String | 选择项id。该值在选择项中是唯一的。 |
| options.text | String | 选择项内容。该值在选择项中是唯一的。 |
| options.parent\_id 可选 | String | 选择项父级id。当属性类型为 `cascade_select,cascade_multi_select` 时， `parent_id` 参数有效，用于构建级联类型选择项之间的父子关系，最多存在4级。 |

```json
{
    "name": "严重程度-update",
    "options": [
        {
            "id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "text": "一般"
        }
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例属性的id。 |
| url | String | 用例属性的资源地址。 |
| name | String | 用例属性的名称。 |
| type | String | 用例属性的类型。 |
| options | Object\[\] | 下拉选项值。 |
| is\_removable | Number | 是否允许删除。 |
| is\_name\_editable | Number | 是否允许修改名称。 |
| is\_options\_editable | Number | 是否允许修改下拉选项值。 |

```json
{
    "id": "severity-update",
    "url": "https://{rest_api_root}/v1/testhub/case_properties/severity",
    "name": "严重程度-update",
    "type": "select",
    "options": [
        {
            "_id": "5efb1859110533727a82c603",
            "text": "严重-update"
        },
        {
            "_id": "5efb1859110533727a82c624",
            "text": "一般"
        }
    ],
    "is_removable": 1,
    "is_name_editable": 1,
    "is_options_editable": 1
}
```

获取全部用例属性列表

用于查询全部用例属性列表。

```html
https://{rest_api_root}/v1/testhub/case_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例属性的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "environment",
            "url": "https://{rest_api_root}/v1/testhub/case_properties/environment",
            "name": "重现环境",
            "type": "select",
            "options": [
                {
                    "_id": "5efb1859110533727a82c603",
                    "text": "测试"
                },
                {
                    "_id": "5efb1859110533727a82c604",
                    "text": "生产"
                }
            ],
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        },
        {
            "id": "estimated_workload",
            "url": "https://{rest_api_root}/v1/testhub/case_properties/estimated_workload",
            "name": "预估工时",
            "type": "number",
            "options": null,
            "is_removable": 0,
            "is_name_editable": 0,
            "is_options_editable": 0
        }
    ]
}
```

获取一个用例属性方案

用于查看一个用例属性方案。

```html
https://{rest_api_root}/v1/testhub/case_property_plans/{property_plan_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 用例属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 用例属性方案的id。 |
| url | String | 用例属性方案的资源地址。 |
| category | String | 用例属性方案的类别。 |
| host | String | 用例属性方案所属资源类型。 |
| library | Object | 用例属性方案关联测试库的引用结构数据。 |

```json
{
    "id": "5f8a21f18ef715265de90c22",
    "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c22",
    "category": "library",
    "host": "case",
    "library": {
        "id": "5eb623f6a70571487ea47000",
        "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
        "identifier": "CSK",
        "name": "测试库",
        "is_archived": 0,
        "is_deleted": 0
    }
}
```

获取用例属性方案列表

用于查询用例属性方案列表。

```html
https://{rest_api_root}/v1/testhub/case_property_plans
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| library\_id 可选 | String | 测试库的id。查询开启本地配置的方案时传入。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 用例属性方案全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "5f8a21f18ef715265de90c21",
            "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21",
            "category": "library",
            "host": "case",
            "library": null
        },
        {
            "id": "5f8a21f18ef715265de90c22",
            "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c22",
            "category": "library",
            "host": "case",
            "library": {
                "id": "5eb623f6a70571487ea47000",
                "url": "https://{rest_api_root}/v1/testhub/libraries/5eb623f6a70571487ea47000",
                "identifier": "CSK",
                "name": "测试库",
                "is_archived": 0,
                "is_deleted": 0
            }
        }
    ]
}
```

向属性方案中添加一个用例属性

用于向属性方案中添加一个用例属性。

```html
https://{rest_api_root}/v1/testhub/case_property_plans/{property_plan_id}/case_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 测试用例属性方案的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_id | String | 测试用例属性的id。 |

```json
{
    "property_id": "environment"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中用例属性关联的id。 |
| url | String | 属性方案中用例属性关联的资源地址。 |
| property\_plan | Object | 用例属性方案的引用结构数据。 |
| property | Object | 用例属性的引用结构数据。 |

```json
{
    "id": "environment",
    "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties/environment",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21",
        "category": "library",
        "host": "case"
    },
    "property": {
        "id": "environment",
        "url": "https://{rest_api_root}/v1/testhub/case_properties/environment",
        "name": "重现环境",
        "type": "select",
        "options": [
            {
                "_id": "5efb1859110533727a82c603",
                "text": "test"
            },
            {
                "_id": "5efb1859110533727a82c604",
                "text": "beta"
            },
            {
                "_id": "5efb1859110533727a82c605",
                "text": "rc"
            }
        ]
    }
}
```

获取属性方案中的一个用例属性

用于查询属性方案中的一个用例属性。

```html
https://{rest_api_root}/v1/testhub/case_property_plans/{property_plan_id}/case_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 用例属性方案的id。 |
| property\_id | String | 用例属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中用例属性关联的id。 |
| url | String | 属性方案中用例属性关联的资源地址。 |
| property\_plan | Object | 用例属性方案的引用结构数据。 |
| property | Object | 用例属性的引用结构数据。 |

```json
{
    "id": "environment",
    "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties/environment",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21",
        "category": "library",
        "host": "case"
    },
    "property": {
        "id": "environment",
        "url": "https://{rest_api_root}/v1/testhub/case_properties/environment",
        "name": "重现环境",
        "type": "select",
        "options": [
            {
                "_id": "5efb1859110533727a82c603",
                "text": "test"
            },
            {
                "_id": "5efb1859110533727a82c604",
                "text": "beta"
            }
        ]
    }
}
```

获取属性方案中的用例属性列表

用于查询属性方案中的用例属性列表。

```html
https://{rest_api_root}/v1/testhub/case_property_plans/{property_plan_id}/case_properties
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 测试用例属性方案的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 属性方案中的用例属性全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "environment",
            "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties/environment",
            "property_plan": {
                "id": "5f8a21f18ef715265de90c21",
                "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21",
                "category": "library",
                "host": "case"
            },
            "property": {
                "id": "environment",
                "url": "https://{rest_api_root}/v1/testhub/case_properties/environment",
                "name": "重现环境",
                "type": "select",
                "options": [
                    {
                        "_id": "5efb1859110533727a82c603",
                        "text": "test"
                    },
                    {
                        "_id": "5efb1859110533727a82c604",
                        "text": "beta"
                    },
                    {
                        "_id": "5efb1859110533727a82c605",
                        "text": "rc"
                    }
                ]
            }
        },
        {
            "id": "estimated_workload",
            "url": "https://{rest_api_root}/v1/testhub/property_plans/5f8a21f18ef715265de90c21/properties/estimated_workload",
            "property_plan": {
                "id": "5f8a21f18ef715265de90c21",
                "url": "https://{rest_api_root}/v1/testhub/property_plans/5f8a21f18ef715265de90c21",
                "category": "library",
                "host": "case"
            },
            "property": {
                "id": "estimated_workload",
                "url": "https://{rest_api_root}/v1/testhub/case_properties/estimated_workload",
                "name": "预估工时",
                "type": "number",
                "options": null
            }
        }
    ]
}
```

在属性方案中移除一个用例属性

用于在属性方案中移除一个用例属性。

```html
https://{rest_api_root}/v1/testhub/case_property_plans/{property_plan_id}/case_properties/{property_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| property\_plan\_id | String | 测试用例属性方案的id。 |
| property\_id | String | 测试用例属性的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 属性方案中用例属性关联的id。 |
| url | String | 属性方案中用例属性关联的资源地址。 |
| property\_plan | Object | 用例属性方案的引用结构数据。 |
| property | Object | 用例属性的引用结构数据。 |

```json
{
    "id": "environment",
    "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21/case_properties/environment",
    "property_plan": {
        "id": "5f8a21f18ef715265de90c21",
        "url": "https://{rest_api_root}/v1/testhub/case_property_plans/5f8a21f18ef715265de90c21",
        "category": "library",
        "host": "case"
    },
    "property": {
        "id": "environment",
        "url": "https://{rest_api_root}/v1/testhub/case_properties/environment",
        "name": "重现环境",
        "type": "select",
        "options": [
            {
                "_id": "5efb1859110533727a82c603",
                "text": "test"
            },
            {
                "_id": "5efb1859110533727a82c604",
                "text": "beta"
            },
            {
                "_id": "5efb1859110533727a82c605",
                "text": "rc"
            }
        ]
    }
}
```

执行用例配置

获取一个执行用例执行结果

用于查看一个执行用例执行结果。

```html
https://{rest_api_root}/v1/testhub/run_statuses/{status_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status\_id | String | 执行用例执行结果的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 执行用例执行结果的id。 |
| url | String | 执行用例执行结果的资源地址。 |
| name | String | 执行用例执行结果的名称。 |
| is\_system | Number | 是否为系统内置结果。  允许值: `0`, `1` |

```json
{
    "id": "68d117800d5dd2484a198261",
    "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198261",
    "name": "通过",
    "is_system": 1
}
```

获取全部执行用例执行结果列表

用于查询全部执行用例执行结果列表。

```html
https://{rest_api_root}/v1/testhub/run_statuses
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部执行用例执行结果全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 5,
    "values": [
        {
            "id": "68d117800d5dd2484a198261",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198261",
            "name": "通过",
            "is_system": 1
        },
        {
            "id": "68d117800d5dd2484a198262",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198262",
            "name": "受阻",
            "is_system": 1
        },
        {
            "id": "68d117800d5dd2484a198263",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198263",
            "name": "失败",
            "is_system": 1
        },
        {
            "id": "68d117800d5dd2484a198264",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198264",
            "name": "跳过",
            "is_system": 1
        },
        {
            "id": "68d117800d5dd2484a198265",
            "url": "https://{rest_api_root}/v1/testhub/run_statuses/68d117800d5dd2484a198265",
            "name": "未测",
            "is_system": 1
        }
    ]
}
```

计划配置

获取一个计划状态

用于查看一个计划状态。

```html
https://{rest_api_root}/v1/testhub/plan_states/{state_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| state\_id | String | 计划状态的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 计划状态的id。 |
| url | String | 计划状态的资源地址。 |
| name | String | 计划状态的名称。 |
| type | String | 计划状态的类型。  允许值: `pending`, `in_progress`, `completed` |
| is\_system | Number | 是否为系统内置状态。  允许值: `0`, `1` |

```json
{
    "id": "686f62038668bbae4f4dd0ca",
    "url": "https://{rest_api_root}/v1/testhub/plan_states/686f62038668bbae4f4dd0ca",
    "name": "未开始",
    "type": "pending",
    "is_system": 1
}
```

获取全部计划状态列表

用于查询全部计划状态列表。

```html
https://{rest_api_root}/v1/testhub/plan_states
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:testhub:configuration

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_index | Number | 页码，从0开始。 |
| page\_size | Number | 每页条数。 |
| total | Number | 总条数。 |
| values | Object\[\] | 全部计划状态全量结构数据的数组。 |

```json
{
    "page_index": 0,
    "page_size": 30,
    "total": 4,
    "values": [
        {
            "id": "686f62038668bbae4f4dd0ca",
            "url": "https://{rest_api_root}/v1/testhub/plan_states/686f62038668bbae4f4dd0ca",
            "name": "未开始",
            "type": "pending",
            "is_system": 1
        },
        {
            "id": "652d0cb2b798f983d9c67c2b",
            "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2b",
            "name": "进行中",
            "type": "in_progress",
            "is_system": 1
        },
        {
            "id": "652d0cb2b798f983d9c67c2d",
            "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2d",
            "name": "已完成",
            "type": "completed",
            "is_system": 1
        },
        {
            "id": "652d0cb2b798f983d9c67c2e",
            "url": "https://{rest_api_root}/v1/testhub/plan_states/652d0cb2b798f983d9c67c2e",
            "name": "已终止",
            "type": "completed",
            "is_system": 0
        }
    ]
}
```

知识管理

空间

创建一个空间

用于创建一个空间。  
企业令牌不能创建 `scope_type` 为 `user` 类型的空间。

```html
https://{rest_api_root}/v1/wiki/spaces
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:space

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type | String | 空间的所属类型。允许值分别表示企业可见、团队可见和用户可见。  允许值: `organization`, `user_group`, `user` |
| scope\_id 可选 | String | 空间的所属id。当 `scope_type` 为 `user_group` 时，该字段必填，且表示团队id；当 `scope_type` 为其他值时，该字段无效。 |
| name | String | 空间的名称（不超过32个字符）。 |
| visibility 可选 | String | 空间可见性。允许值分别表示组织全部成员可见和仅空间成员可见。  允许值: `public`, `private` |
| identifier | String | 空间的标识。在一个企业中这个标识是唯一的。产品的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 空间的描述。 |
| members 可选 | Object\[\] | 空间成员的列表。 |
| members.id | String | 企业成员或团队的 `id` 。 |
| members.type | String | 空间成员类型。  允许值: `user`, `user_group` |

```json
{
    "name": "团队空间",
    "identifier": "GROUP",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "description": "团队空间所属一个团队，只能添加所属团队内的成员。",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "type": "user"
        }
    ],
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间的id。 |
| url | String | 空间的资源地址。 |
| identifier | String | 空间的标识。 |
| name | String | 空间的名称。 |
| scope\_type | String | 空间的所属类型。  允许值: `organization`, `user_group`, `user` |
| scope\_id | String | 空间的所属id。 |
| visibility | String | 空间的可见性。  允许值: `private`, `public` |
| color | String | 空间的主题色。 |
| description | String | 空间的描述。 |
| members | Object\[\] | 空间的成员列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "642fd641209b56920a6c6e5f",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5f",
    "identifier": "GROUP",
    "name": "团队空间",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#FB7894",
    "description": "团队空间所属一个团队，只能添加所属团队内的成员。",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5f/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5f/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290300,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个空间

用于查看一个空间。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| include\_deleted 可选 | Boolean | 是否包含已删除的空间。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否包含已归档的空间。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间的id。 |
| url | String | 空间的资源地址。 |
| identifier | String | 空间的标识。 |
| name | String | 空间的名称。 |
| scope\_type | String | 空间的所属类型。允许值分别表示企业可见、团队可见和用户可见。  允许值: `organization`, `user_group`, `user` |
| scope\_id | String | 空间的所属id。 |
| visibility | String | 空间的可见性。  允许值: `private`, `public` |
| color | String | 空间的主题色。 |
| description | String | 空间的描述。 |
| members | Object\[\] | 空间的成员列表。 |
| created\_at | Number | 空间的创建时间。 |
| created\_by | Object | 空间的创建人。 |
| updated\_at | Number | 空间的更新时间。 |
| updated\_by | Object | 空间的更新人。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "642fd641209b56920a6c6e5e",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
    "identifier": "DEMO",
    "name": "示例空间",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#FB7894",
    "description": "示例空间描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290400,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个空间

用于部分更新一个空间。  
企业令牌不能更新 `scope_type` 为 `user` 类型的空间。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 空间的名称（不超过32个字符）。 |
| identifier 可选 | String | 空间的标识。在一个企业中这个标识是唯一的。产品的标识由大写英文字母/数字/下划线/连接线组成（不超过15个字符）。 |
| description 可选 | String | 空间的描述。 |

```json
{
    "name": "示例空间",
    "identifier": "DEMO",
    "description": "示例空间描述"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间的id。 |
| url | String | 空间的资源地址。 |
| identifier | String | 空间的标识。 |
| name | String | 空间的名称。 |
| scope\_type | String | 空间的所属类型。  允许值: `organization`, `user_group`, `user` |
| scope\_id | String | 空间的所属id。 |
| visibility | String | 空间的可见性。  允许值: `private`, `public` |
| color | String | 空间的主题色。 |
| description | String | 空间的描述。 |
| members | Object\[\] | 空间的成员列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "642fd641209b56920a6c6e5e",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
    "identifier": "DEMO",
    "name": "示例空间",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#FB7894",
    "description": "示例空间描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290400,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

获取空间列表

用于查询空间列表。

```html
https://{rest_api_root}/v1/wiki/spaces
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:space

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| scope\_type 可选 | String | 空间的所属类型。允许值分别表示企业可见、团队可见和用户可见。  允许值: `organization`, `user_group`, `user` |
| scope\_id 可选 | String | 空间的所属id。仅支持团队的id。 |
| keywords 可选 | String | 关键字。只支持 `name` 关键字搜索。 |
| member\_type 可选 | String | 空间成员的类型。 `member_type` 和 `member_id` 必须同时存在。  允许值: `user`, `user_group` |
| member\_id 可选 | String | 空间成员的id。值为企业成员或团队的id。 `member_id` 和 `member_type` 必须同时存在。 |
| created\_between 可选 | String | 创建时间介于的时间范围，通过','分割起始时间。 |
| updated\_between 可选 | String | 更新时间介于的时间范围，通过','分割起始时间。 |
| include\_deleted 可选 | Boolean | 是否查询已删除的空间。该值默认为 `false` 。 |
| include\_archived 可选 | Boolean | 是否查询已归档的空间。该值默认为 `false` 。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 空间全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "642fd641209b56920a6c6e5e",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
            "identifier": "DEMO",
            "name": "示例空间",
            "scope_type": "user_group",
            "scope_id": "63c8fb32729dee3334d96af7",
            "visibility": "private",
            "color": "#FB7894",
            "description": "示例空间描述",
            "members": [
                {
                    "id": "a0417f68e846aae315c85d24643678a9",
                    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
                    "type": "user",
                    "user": {
                        "id": "a0417f68e846aae315c85d24643678a9",
                        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                        "name": "john",
                        "display_name": "John",
                        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
                    }
                },
                {
                    "id": "63c8fb32729dee3334d96af7",
                    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
                    "type": "user_group",
                    "user_group": {
                        "id": "63c8fb32729dee3334d96af7",
                        "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                        "name": "Open Team"
                    }
                }
            ],
            "created_at": 1583290300,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "updated_at": 1583290400,
            "updated_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

删除一个空间

用于删除一个空间。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间的id。 |
| url | String | 空间的资源地址。 |
| identifier | String | 空间的标识。 |
| name | String | 空间的名称。 |
| scope\_type | String | 空间的所属类型。  允许值: `organization`, `user_group`, `user` |
| scope\_id | String | 空间的所属id。 |
| visibility | String | 空间的可见性。  允许值: `private`, `public` |
| color | String | 空间的主题色。 |
| description | String | 空间的描述。 |
| members | Object\[\] | 空间的成员列表。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "642fd641209b56920a6c6e5e",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
    "identifier": "DEMO",
    "name": "示例空间",
    "scope_type": "user_group",
    "scope_id": "63c8fb32729dee3334d96af7",
    "visibility": "private",
    "color": "#FB7894",
    "description": "示例空间描述",
    "members": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            }
        }
    ],
    "created_at": 1583290300,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1583290400,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_archived": 0,
    "is_deleted": 0
}
```

向空间中添加一个成员

用于向空间中添加一个成员。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| member | Object | 空间的成员。 |
| member.id | String | 企业成员或团队的id。 |
| member.type | String | 空间成员的类型。  允许值: `user`, `user_group` |
| role\_id 可选 | String | 角色的id。 |

```json
{
    "member": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "type": "user"
    },
    "role_id": "6422711c3f12e6c1e46d40e6"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间成员的id。 |
| url | String | 空间成员的资源地址。 |
| space | Object | 所属空间的引用结构数据。 |
| type | String | 空间成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
    "space": {
        "id": "642fd641209b56920a6c6e5e",
        "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
        "identifier": "DEMO",
        "name": "示例空间",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取空间中的一个成员

用于查看一个空间成员。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |
| member\_id | String | 空间成员的id，即企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间成员的id。 |
| url | String | 空间成员的资源地址。 |
| space | Object | 所属空间的引用结构数据。 |
| type | String | 空间成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
    "space": {
        "id": "642fd641209b56920a6c6e5e",
        "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
        "identifier": "DEMO",
        "name": "示例空间",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

获取空间中的成员列表

用于查询空间中的成员列表。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}/members
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 空间中的成员全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 2,
    "values": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
            "space": {
                "id": "642fd641209b56920a6c6e5e",
                "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
                "identifier": "DEMO",
                "name": "示例空间",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        },
        {
            "id": "63c8fb32729dee3334d96af7",
            "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/63c8fb32729dee3334d96af7",
            "space": {
                "id": "642fd641209b56920a6c6e5e",
                "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
                "identifier": "DEMO",
                "name": "示例空间",
                "is_archived": 0,
                "is_deleted": 0
            },
            "type": "user_group",
            "user_group": {
                "id": "63c8fb32729dee3334d96af7",
                "url": "https://{rest_api_root}/v1/directory/groups/63c8fb32729dee3334d96af7",
                "name": "Open Team"
            },
            "role": {
                "id": "6422711c3f12e6c1e46d40e6",
                "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
                "name": "管理员"
            }
        }
    ]
}
```

在空间中移除一个成员

用于在空间中移除一个成员。

```html
https://{rest_api_root}/v1/wiki/spaces/{space_id}/members/{member_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:space

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |
| member\_id | String | 企业成员或团队的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 空间成员的id。 |
| url | String | 空间成员的资源地址。 |
| space | Object | 所属空间的引用结构数据。 |
| type | String | 空间成员的类型。  允许值: `user`, `user_group` |
| user 可选 | Object | 企业成员的引用结构数据。当 `type` 为 `user` 时，该字段返回。 |
| user\_group 可选 | Object | 团队的引用结构数据。当 `type` 为 `user_group` 时，该字段返回。 |
| role | Object | 成员角色的引用结构数据。 |

```json
{
    "id": "a0417f68e846aae315c85d24643678a9",
    "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e/members/a0417f68e846aae315c85d24643678a9",
    "space": {
        "id": "642fd641209b56920a6c6e5e",
        "url": "https://{rest_api_root}/v1/wiki/spaces/642fd641209b56920a6c6e5e",
        "identifier": "DEMO",
        "name": "示例空间",
        "is_archived": 0,
        "is_deleted": 0
    },
    "type": "user",
    "user": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "role": {
        "id": "6422711c3f12e6c1e46d40e6",
        "url": "https://{rest_api_root}/v1/directory/roles/6422711c3f12e6c1e46d40e6",
        "name": "管理员"
    }
}
```

页面

创建一个页面

用于创建一个页面。

```html
https://{rest_api_root}/v1/wiki/pages
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:page

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id | String | 空间的id。 |
| name | String | 页面的名称。 |
| parent\_id 可选 | String | 父页面的id。 |
| content 可选 | String | 页面的内容。 |
| format\_type 可选 | String | 页面内容的格式。content和format\_type字段必须同时传递。  允许值: `text`, `markdown`, `html`, `block` |

```json
{
    "space_id": "63e1bf51760505c8795ebcc8",
    "name": "示例页面",
    "parent_id": "63e1bf51760505c8795ebcce",
    "content": "空间是记录信息和知识的页面集合，通过组织页面层级将知识系统化、结构化，便于团队沉淀经验、共享资源，实现知识增值，加快知识流动，在知识管理层面助力企业更快更好的发布产品。 PingCode 空间支持以下特性： 页面支持插入多种元素以及关联页面，满足编写需要 编辑过程自动保存草稿，无需担心内容丢失 提供丰富的模板，使用模板保持页面的一致性，让空间更加规范 使用锁定功能锁定页面最终版本 删除的页面放进回收站，随时恢复 树状页面结构，直接拖动页面编排目录，让知识管理更方便高效 通过设置成员角色来进行权限控制 通过页面评论实现成员沟通交流，形成反馈闭环  【PingCode 空间】当前处于不断迭代过程中，更多功能即将呈现，敬请期待~",
    "format_type": "text"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 页面的id。 |
| url | String | 页面的资源地址。 |
| space | Object | 所属空间的引用结构数据。 |
| name | String | 页面的名称。 |
| type | String | 页面的类型。  允许值: `document`, `group` |
| short\_id | String | 页面的短id。 |
| html\_url | String | 页面的html地址。 |
| parent 可选 | Object | 父页面的引用结构数据。 |
| icon | String | 页面的图标。 |
| readings | Number | 页面的阅读量。 |
| published\_at | Number | 页面的发布时间，单位为秒。 |
| published\_by | Object | 发布人的引用结构数据。 |
| tags | Object\[\] | 页面标签列表。 |
| participants | Object\[\] | 页面关注人列表。 |
| position | Number | 页面在同级中的排序位置。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_locked | Number | 是否锁定页面。  允许值: `0`, `1` |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63e1bf51760505c8795ebccc",
    "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebccc",
    "space": {
        "id": "63e1bf51760505c8795ebcc8",
        "url": "https://{rest_api_root}/v1/wiki/spaces/63e1bf51760505c8795ebcc8",
        "name": "示例空间",
        "identifier": "DEMO",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "示例页面",
    "type": "document",
    "short_id": "5-x6NN",
    "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN",
    "parent": {
        "id": "63e1bf51760505c8795ebcce",
        "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebcce",
        "name": "模板",
        "type": "document",
        "short_id": "c-x6NN",
        "html_url": "https://yctech.pingcode.com/wiki/pages/c-x6NN"
    },
    "icon": "file-fill",
    "readings": 0,
    "published_at": 1675738962,
    "published_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "tags": [],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=page&principal_id=63e1bf51760505c8795ebccc",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "position": 65536,
    "created_at": 1675738962,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1675738962,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_locked": 0,
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个页面

用于查看一个页面。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 页面的id。 |
| url | String | 页面的资源地址。 |
| space | Object | 所属空间的引用结构数据。 |
| name | String | 页面的名称。 |
| type | String | 页面的类型。  允许值: `document`, `group` |
| short\_id | String | 页面的短id。 |
| html\_url | String | 页面的html地址。 |
| parent 可选 | Object | 父页面的引用结构数据。 |
| icon | String | 页面的图标。 |
| readings | Number | 页面的阅读量。 |
| published\_at | Number | 页面的发布时间，单位为秒。 |
| published\_by | Object | 发布人的引用结构数据。 |
| tags | Object\[\] | 页面标签列表。 |
| participants | Object\[\] | 页面关注人列表。 |
| position | Number | 页面在同级中的排序位置。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_locked | Number | 是否锁定页面。  允许值: `0`, `1` |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63e1bf51760505c8795ebccc",
    "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebccc",
    "space": {
        "id": "63e1bf51760505c8795ebcc8",
        "url": "https://{rest_api_root}/v1/wiki/spaces/63e1bf51760505c8795ebcc8",
        "name": "示例空间",
        "identifier": "DEMO",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "示例页面",
    "type": "document",
    "short_id": "5-x6NN",
    "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN",
    "parent": {
        "id": "63e1bf51760505c8795ebcce",
        "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebcce",
        "name": "模板",
        "type": "document",
        "short_id": "c-x6NN",
        "html_url": "https://yctech.pingcode.com/wiki/pages/c-x6NN"
    },
    "icon": "file-fill",
    "readings": 0,
    "published_at": 1675738962,
    "published_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "tags": [],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=page&principal_id=63e1bf51760505c8795ebccc",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "position": 65536,
    "created_at": 1675738962,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1675738962,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_locked": 0,
    "is_archived": 0,
    "is_deleted": 0
}
```

部分更新一个页面

用于部分更新一个页面。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 页面的名称。 |
| parent\_id 可选 | String | 父页面的id。 |
| lock 可选 | Number | 是否锁定页面。  允许值: `0`, `1` |

```json
{
    "name": "示例页面updated",
    "parent_id": "63e1bf51760505c8795ebcce",
    "lock": 1
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 页面的id。 |
| url | String | 页面的资源地址。 |
| space | Object | 所属空间的引用结构数据。 |
| name | String | 页面的名称。 |
| type | String | 页面的类型。  允许值: `document`, `group` |
| short\_id | String | 页面的短id。 |
| html\_url | String | 页面的html地址。 |
| parent 可选 | Object | 父页面的引用结构数据。 |
| icon | String | 页面的图标。 |
| readings | Number | 页面的阅读量。 |
| published\_at | Number | 页面的发布时间，单位为秒。 |
| published\_by | Object | 发布人的引用结构数据。 |
| tags | Object\[\] | 页面标签列表。 |
| participants | Object\[\] | 页面关注人列表。 |
| position | Number | 页面在同级中的排序位置。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_locked | Number | 是否锁定页面。  允许值: `0`, `1` |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63e1bf51760505c8795ebccc",
    "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebccc",
    "space": {
        "id": "63e1bf51760505c8795ebcc8",
        "url": "https://{rest_api_root}/v1/wiki/spaces/63e1bf51760505c8795ebcc8",
        "name": "示例空间",
        "identifier": "DEMO",
        "is_archived": 0,
        "is_deleted": 0
    },
    "name": "示例页面updated",
    "type": "document",
    "short_id": "5-x6NN",
    "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN",
    "parent": {
        "id": "63e1bf51760505c8795ebcce",
        "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebcce",
        "name": "模板",
        "type": "document",
        "short_id": "c-x6NN",
        "html_url": "https://yctech.pingcode.com/wiki/pages/c-x6NN"
    },
    "icon": "file-fill",
    "readings": 0,
    "published_at": 1675739999,
    "published_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "tags": [
        {
            "id": "69fed72014555f4b0637437a",
            "url": "https://{rest_api_root}/v1/wiki/page_tags/69fed72014555f4b0637437a",
            "name": "标签-1"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=page&principal_id=63e1bf51760505c8795ebccc",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "position": 65536,
    "created_at": 1675738962,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1675739999,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_locked": 1,
    "is_archived": 0,
    "is_deleted": 0
}
```

获取一个文档正文

用于查看一个文档正文。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}/content
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| format\_type 可选 | String | 正文格式。  默认值: `text`  允许值: `text`, `markdown`, `html`, `block` |
| version\_id 可选 | String | 页面版本的id。默认值为页面当前版本的id。 |
| include\_public\_image\_token 可选 | String | 包含获取图片资源token的属性。仅支持 `content` ，参数示例 `content` 。仅当 `format_type` 为 `markdown` 、 `html` 或 `block` 时有效。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 文档正文的id。 |
| url | String | 文档正文的资源地址。 |
| format\_type | String | 正文格式。  允许值: `text`, `markdown`, `html`, `block` |
| content | String | 正文内容。 |
| public\_image\_token 可选 | String | 正文内图片资源的公开预览token。传参 `include_public_image_token=content` 且 `format_type` 为 `markdown` 、 `html` 或 `block` 时返回。 |

```json
{
    "id": "65093a8e4d4c8ca623da8fcd",
    "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/content?include_public_image_token=content",
    "format_type": "html",
    "content": "空间是记录信息和知识的页面集合，通过组织页面层级将知识系统化、结构化，便于团队沉淀经验、共享资源，实现知识增值，加快知识流动，在知识管理层面助力企业更快更好的发布产品。 PingCode 空间支持以下特性： 页面支持插入多种元素以及关联页面，满足编写需要 编辑过程自动保存草稿，无需担心内容丢失 提供丰富的模板，使用模板保持页面的一致性，让空间更加规范 使用锁定功能锁定页面最终版本 删除的页面放进回收站，随时恢复 树状页面结构，直接拖动页面编排目录，让知识管理更方便高效 通过设置成员角色来进行权限控制 通过页面评论实现成员沟通交流，形成反馈闭环  【PingCode 空间】当前处于不断迭代过程中，更多功能即将呈现，敬请期待~",
    "public_image_token": "N96GlJ4AMQoBCw9pZQ2EMl-AprLN_V_DYlghupBNkJA"
}
```

更新一个文档正文

用于更新一个文档正文。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}/content
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| content | String | 页面的内容。 |
| format\_type | String | 页面内容的格式。  允许值: `text`, `markdown`, `html` |

```json
{
    "content": "**空间是记录信息和知识的页面集合，通过组织页面层级将知识系统化、结构化，便于团队沉淀经验、共享资源，实现知识增值，加快知识流动，在知识管理层面助力企业更快更好的发布产品。** *PingCode* 空间支持以下特性： 页面支持插入多种元素以及关联页面，满足编写需要 编辑过程自动保存草稿，无需担心内容丢失 提供丰富的模板，使用模板保持页面的一致性，让空间更加规范 使用锁定功能锁定页面最终版本 删除的页面放进回收站，随时恢复 树状页面结构，直接拖动页面编排目录，让知识管理更方便高效 通过设置成员角色来进行权限控制 通过页面评论实现成员沟通交流，形成反馈闭环 **【PingCode 空间】当前处于不断迭代过程中，更多功能即将呈现，敬请期待~**",
    "format_type": "markdown"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 文档正文的id。 |
| url | String | 文档正文的资源地址。 |
| format\_type | String | 正文格式。  允许值: `text`, `markdown`, `html` |
| content | String | 正文内容。 |

```json
{
    "id": "65093a8e4d4c8ca623da8fcd",
    "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/content",
    "format_type": "markdown",
    "content": "**空间是记录信息和知识的页面集合，通过组织页面层级将知识系统化、结构化，便于团队沉淀经验、共享资源，实现知识增值，加快知识流动，在知识管理层面助力企业更快更好的发布产品。** *PingCode* 空间支持以下特性： 页面支持插入多种元素以及关联页面，满足编写需要 编辑过程自动保存草稿，无需担心内容丢失 提供丰富的模板，使用模板保持页面的一致性，让空间更加规范 使用锁定功能锁定页面最终版本 删除的页面放进回收站，随时恢复 树状页面结构，直接拖动页面编排目录，让知识管理更方便高效 通过设置成员角色来进行权限控制 通过页面评论实现成员沟通交流，形成反馈闭环 **【PingCode 空间】当前处于不断迭代过程中，更多功能即将呈现，敬请期待~**"
}
```

获取一个页面版本

用于查看一个页面版本。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}/versions/{version_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |
| version\_id | String | 页面版本的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 页面版本的id。 |
| url | String | 页面版本的资源地址。 |
| page | Object | 所属页面的引用结构数据。 |
| name | String | 页面版本的名称。 |
| order | Number | 页面版本的序号。 |
| status | String | 页面版本的状态。  允许值: `published`, `draft` |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |

```json
{
    "id": "65093abf4d4c8ca623da8fff",
    "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/versions/65093abf4d4c8ca623da8fff",
    "page": {
        "id": "65093a8e4d4c8ca623da8fcd",
        "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd",
        "name": "主页",
        "type": "document",
        "short_id": "5-x6NN",
        "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN"
    },
    "name": "v2恢复自v1",
    "order": 2,
    "status": "published",
    "created_at": 1695103832,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取一个页面的版本列表

用于查看一个页面的版本列表。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}/versions
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 页面版本全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "65093abf4d4c8ca623da8ffe",
            "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/versions/65093abf4d4c8ca623da8ffe",
            "page": {
                "id": "65093a8e4d4c8ca623da8fcd",
                "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd",
                "name": "主页",
                "type": "document",
                "short_id": "AAx6NN",
                "html_url": "https://yctech.pingcode.com/wiki/pages/AAx6NN"
            },
            "name": "v1",
            "order": 1,
            "status": "published",
            "created_at": 1695103679,
            "created_by": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ]
}
```

恢复一个页面到指定版本

用于恢复一个页面到指定版本。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}/versions/{version_id}/restore
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |
| version\_id | String | 页面版本的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 页面版本的id。 |
| url | String | 页面版本的资源地址。 |
| page | Object | 所属页面的引用结构数据。 |
| name | String | 页面版本的名称。 |
| order | Number | 页面版本的序号。 |
| status | String | 页面版本的状态。  允许值: `published`, `draft` |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |

```json
{
    "id": "65093abf4d4c8ca623da8fff",
    "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd/versions/65093abf4d4c8ca623da8fff",
    "page": {
        "id": "65093a8e4d4c8ca623da8fcd",
        "url": "https://{rest_api_root}/v1/wiki/pages/65093a8e4d4c8ca623da8fcd",
        "name": "主页",
        "type": "document",
        "short_id": "5-x6NN",
        "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN"
    },
    "name": "v2恢复自v1",
    "order": 2,
    "status": "published",
    "created_at": 1695103832,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    }
}
```

获取页面列表

用于查询页面列表。

```html
https://{rest_api_root}/v1/wiki/pages
```

令牌: 企业令牌/用户令牌

Scopes: pcp:read:wiki:page

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| space\_id 可选 | String | 空间的id。 |
| parent\_id 可选 | String | 父页面的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 页面全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "63e1bf51760505c8795ebccc",
            "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebccc",
            "space": {
                "id": "63e1bf51760505c8795ebcc8",
                "url": "https://{rest_api_root}/v1/wiki/spaces/63e1bf51760505c8795ebcc8",
                "name": "示例空间",
                "identifier": "DEMO",
                "is_archived": 0,
                "is_deleted": 0
            },
            "name": "示例页面",
            "type": "document",
            "short_id": "5-x6NN",
            "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN",
            "icon": "file-fill",
            "readings": 0,
            "published_at": 1675738962,
            "position": 65536,
            "created_at": 1675738962,
            "updated_at": 1675738962,
            "is_locked": 0,
            "is_archived": 0,
            "is_deleted": 0
        }
    ]
}
```

删除一个页面

用于删除一个页面。

```html
https://{rest_api_root}/v1/wiki/pages/{page_id}
```

令牌: 企业令牌/用户令牌

Scopes: pcp:write:wiki:page

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_id | String | 页面的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 页面的id。 |
| url | String | 页面的资源地址。 |
| name | String | 页面的名称。 |
| type | String | 页面的类型。  允许值: `document`, `group` |
| short\_id | String | 页面的短id。 |
| html\_url | String | 页面的html地址。 |
| space | Object | 所属空间的引用结构数据。 |
| parent 可选 | Object | 父页面的引用结构数据。 |
| icon | String | 页面的图标。 |
| readings | Number | 页面的阅读量。 |
| published\_at | Number | 页面的发布时间，单位为秒。 |
| published\_by | Object | 发布人的引用结构数据。 |
| tags | Object\[\] | 页面标签列表。 |
| participants | Object\[\] | 页面关注人列表。 |
| position | Number | 页面在同级中的排序位置。 |
| created\_at | Number | 创建时间，单位为秒。 |
| created\_by | Object | 创建人的引用结构数据。 |
| updated\_at | Number | 更新时间，单位为秒。 |
| updated\_by | Object | 更新人的引用结构数据。 |
| is\_locked | Number | 是否锁定页面。  允许值: `0`, `1` |
| is\_archived | Number | 是否已归档。  允许值: `0`, `1` |
| is\_deleted | Number | 是否已删除。  允许值: `0`, `1` |

```json
{
    "id": "63e1bf51760505c8795ebccc",
    "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebccc",
    "name": "示例页面updated",
    "type": "document",
    "short_id": "5-x6NN",
    "html_url": "https://yctech.pingcode.com/wiki/pages/5-x6NN",
    "space": {
        "id": "63e1bf51760505c8795ebcc8",
        "url": "https://{rest_api_root}/v1/wiki/spaces/63e1bf51760505c8795ebcc8",
        "name": "示例空间",
        "identifier": "DEMO",
        "is_archived": 0,
        "is_deleted": 0
    },
    "parent": {
        "id": "63e1bf51760505c8795ebcce",
        "url": "https://{rest_api_root}/v1/wiki/pages/63e1bf51760505c8795ebcce",
        "name": "模板",
        "type": "document",
        "short_id": "c-x6NN",
        "html_url": "https://yctech.pingcode.com/wiki/pages/c-x6NN"
    },
    "icon": "file-fill",
    "readings": 0,
    "published_at": 1675739999,
    "published_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "tags": [
        {
            "id": "69fed72014555f4b0637437a",
            "url": "https://{rest_api_root}/v1/wiki/page_tags/69fed720145555f4b0637437a",
            "name": "标签-1"
        }
    ],
    "participants": [
        {
            "id": "a0417f68e846aae315c85d24643678a9",
            "url": "https://{rest_api_root}/v1/participants/a0417f68e846aae315c85d24643678a9?principal_type=page&principal_id=63e1bf51760505c8795ebccc",
            "type": "user",
            "user": {
                "id": "a0417f68e846aae315c85d24643678a9",
                "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
                "name": "john",
                "display_name": "John",
                "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
            }
        }
    ],
    "position": 65536,
    "created_at": 1675738962,
    "created_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "updated_at": 1675739999,
    "updated_by": {
        "id": "a0417f68e846aae315c85d24643678a9",
        "url": "https://{rest_api_root}/v1/directory/users/a0417f68e846aae315c85d24643678a9",
        "name": "john",
        "display_name": "John",
        "avatar": "https://s3.amazonaws.com/bucket/b46ef40c-e22e-4ecf-a599-cace9fba839a_160x160.png"
    },
    "is_locked": 0,
    "is_archived": 0,
    "is_deleted": 1
}
```

DevOps 数据集成

代码

托管平台

创建一个托管平台

用于创建一个托管平台。  
企业内实际的代码托管平台，例如Github或私有部署的Gitlab。

```html
https://{rest_api_root}/v1/scm/products
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 代码托管平台的名称，在一个企业中这个名称是唯一的。 |
| type | String | 代码托管平台的产品类型，主要用于显示图标。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description 可选 | String | 代码托管平台的简介 |

```json
{
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台的id。 |
| url | String | 托管平台的资源地址。 |
| name | String | 托管平台的名称。 |
| type | String | 托管平台的类型。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description | String | 托管平台的描述。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

获取一个托管平台

用于查看一个托管平台。

```html
https://{rest_api_root}/v1/scm/products/{product_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 托管平台的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台的id。 |
| url | String | 托管平台的资源地址。 |
| name | String | 托管平台的名称。 |
| type | String | 托管平台的类型。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description | String | 托管平台的描述。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

全量更新一个托管平台

用于全量更新一个托管平台。

```html
https://{rest_api_root}/v1/scm/products/{product_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 代码托管平台的名称，在一个企业中这个名称是唯一的。 |
| type | String | 代码托管平台的产品类型，主要用于显示图标。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description 可选 | String | 代码托管平台简介。 |

```json
{
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台的id。 |
| url | String | 托管平台的资源地址。 |
| name | String | 托管平台的名称。 |
| type | String | 托管平台的类型。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description | String | 托管平台的描述。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

部分更新一个托管平台

用于部分更新一个托管平台。

```html
https://{rest_api_root}/v1/scm/products/{product_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 代码托管平台的名称，在一个企业中这个名称是唯一的。 |
| type 可选 | String | 代码托管平台的产品类型，主要用于显示图标。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description 可选 | String | 代码托管平台简介。 |

```json
{
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台的id。 |
| url | String | 托管平台的资源地址。 |
| name | String | 托管平台的名称。 |
| type | String | 托管平台的类型。  允许值: `github`, `gitlab`, `bitbucket`, `coding.net`, `gogs`, `git`, `svn`, `gerrit`, `other` |
| description | String | 托管平台的描述。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
    "name": "Github",
    "type": "github",
    "description": "Github公有云"
}
```

获取托管平台列表

用于查询托管平台列表。

```html
https://{rest_api_root}/v1/scm/products
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 代码托管平台的名称。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 托管平台全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "564587fe700d43b81b080765",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
            "name": "Github",
            "type": "github",
            "description": "Github公有云"
        }
    ]
}
```

托管平台用户

创建一个托管平台用户

用于创建一个托管平台用户。  
代码托管平台内实际的用户，用于在PingCode中显示该用户在代码托管平台上的名称、头像以及主页的信息。如果没有手动创建用户，在操作代码仓库、分支、拉取请求时，将自动创建仅包含该用户名的用户。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/users
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 代码托管平台上的用户名，同一代码托管平台下，该用户名是唯一的。 |
| display\_name 可选 | String | 用户显示名。 |
| html\_url 可选 | String | 代码托管平台上的用户主页地址。 |
| avatar\_url 可选 | String | 代码托管平台上的用户头像地址。 |

```json
{
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台用户的id。 |
| url | String | 托管平台用户的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| name | String | 托管平台用户的名称。 |
| display\_name | String | 托管平台用户的显示名。 |
| html\_url | String | 代码托管平台上的用户主页地址。 |
| avatar\_url | String | 代码托管平台上的用户头像地址。 |

```json
{
    "id": "5666aea91f99e33cb7c44964",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

获取一个托管平台用户

用于查看一个托管平台用户。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/users/{user_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 托管平台的id。 |
| user\_id | String | 托管平台用户的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台用户的id。 |
| url | String | 托管平台用户的资源地址。 |
| product | Object | 托管平台。 |
| name | String | 托管平台用户的名称。 |
| display\_name | String | 托管平台用户的显示名。 |
| html\_url | String | 代码托管平台上的用户主页地址。 |
| avatar\_url | String | 代码托管平台上的用户头像地址。 |

```json
{
    "id": "5666aea91f99e33cb7c44964",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

全量更新一个托管平台用户

用于全量更新一个托管平台用户。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/users/{user_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| user\_id | String | 代码托管平台上的用户id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 代码托管平台上的用户名，同一代码托管平台下，该用户名是唯一的。 |
| display\_name 可选 | String | 用户显示名。 |
| html\_url 可选 | String | 代码托管平台上的用户主页地址。 |
| avatar\_url 可选 | String | 代码托管平台上的用户头像地址。 |

```json
{
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台用户的id。 |
| url | String | 托管平台用户的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| name | String | 托管平台用户的名称。 |
| display\_name | String | 托管平台用户的显示名。 |
| html\_url | String | 代码托管平台上的用户主页地址。 |
| avatar\_url | String | 代码托管平台上的用户头像地址。 |

```json
{
    "id": "5666aea91f99e33cb7c44964",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

部分更新一个托管平台用户

用于部分更新一个托管平台用户。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/users/{user_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| user\_id | String | 代码托管平台上的用户id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 代码托管平台上的用户名，同一代码托管平台下，该用户名是唯一的。 |
| display\_name 可选 | String | 用户显示名。 |
| html\_url 可选 | String | 代码托管平台上的用户主页地址。 |
| avatar\_url 可选 | String | 代码托管平台上的用户头像地址。 |

```json
{
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 托管平台用户的id。 |
| url | String | 托管平台用户的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| name | String | 托管平台用户的名称。 |
| display\_name | String | 托管平台用户的显示名。 |
| html\_url | String | 代码托管平台上的用户主页地址。 |
| avatar\_url | String | 代码托管平台上的用户头像地址。 |

```json
{
    "id": "5666aea91f99e33cb7c44964",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "terry",
    "display_name": "Terry",
    "html_url": "https://github.com/terrylee",
    "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
}
```

获取托管平台用户列表

用于查询托管平台用户列表。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/users
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 代码托管平台上的用户名。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 托管平台用户全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5666aea91f99e33cb7c44964",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
            "product": {
                "id": "564587fe700d43b81b080765",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
                "name": "Github",
                "type": "github"
            },
            "name": "terry",
            "display_name": "Terry",
            "html_url": "https://github.com/terrylee",
            "avatar_url": "https://avatars2.githubusercontent.com/u/694592?v=4"
        }
    ]
}
```

代码仓库

创建一个代码仓库

用于创建一个代码仓库。  
代码托管平台内实际的代码仓库，用于在PingCode中显示代码仓库的详细信息。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 代码仓库的名称。 |
| full\_name | String | 代码仓库的全称。同一代码托管平台下，代码仓库的全称是唯一的。 |
| description 可选 | String | 代码仓库的简介。 |
| is\_fork 可选 | Boolean | 是否是fork仓库。 |
| is\_private 可选 | Boolean | 是否是私有仓库。 |
| owner\_name 可选 | String | 代码仓库拥有者的用户名。 |
| html\_url 可选 | String | 代码仓库的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| branches\_url 可选 | String | 代码仓库的分支地址，使用 `{branch}` 表示分支名。如果为空，在PingCode中不显示相关跳转链接。 |
| commits\_url 可选 | String | 代码仓库的提交地址，使用 `{sha}` 表示提交的SHA值。如果为空，在PingCode中不显示相关跳转链接。 |
| compare\_url 可选 | String | 代码仓库的分支对比地址，使用 `{base}` 和 `{head}` 表示基准分支名和需要进行对比的分支名。如果为空，在PingCode中不显示相关跳转链接。 |
| pulls\_url 可选 | String | 代码仓库的拉取请求地址，使用 `{number}` 表示拉取请求的编号。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "is_fork": false,
    "is_private": false,
    "owner_name": "terry",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码仓库的id。 |
| url | String | 代码仓库的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| name | String | 代码仓库的名称。 |
| full\_name | String | 代码仓库的全称。 |
| created\_at | Number | 代码仓库的创建时间。 |
| owner | Object | 代码仓库拥有者的引用结构数据。 |
| is\_fork | Boolean | 代码仓库是否是fork仓库。 |
| is\_private | Boolean | 代码仓库是否是私有仓库。 |
| description | String | 代码仓库的描述。 |
| html\_url | String | 代码仓库的地址。 |
| branches\_url | String | 代码仓库的分支地址模板。 |
| commits\_url | String | 代码仓库的提交地址模板。 |
| compare\_url | String | 代码仓库的分支对比地址模板。 |
| pulls\_url | String | 代码仓库的拉取请求地址模板。 |

```json
{
    "id": "564587fe700d43b81b080766",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "created_at": 1403018919,
    "owner": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_fork": false,
    "is_private": false,
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

获取一个代码仓库

用于查看一个代码仓库。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码仓库的id。 |
| url | String | 代码仓库的资源地址。 |
| product | Object | 托管平台。 |
| name | String | 代码仓库的名称。 |
| full\_name | String | 代码仓库的全称。 |
| created\_at | Number | 代码仓库的创建时间。 |
| owner | Object | 代码仓库的拥有者。 |
| is\_fork | Boolean | 代码仓库是否是fork仓库。 |
| is\_private | Boolean | 代码仓库是否是私有仓库。 |
| description | String | 代码仓库的描述。 |
| html\_url | String | 代码仓库的地址。 |
| branches\_url | String | 代码仓库的分支地址模板，链接后面括号里的值会被替换成真实地址。 |
| commits\_url | String | 代码仓库的提交地址模板，链接后面括号里的值会被替换成真实地址。 |
| compare\_url | String | 代码仓库的分支对比地址模板，链接后面括号里的值会被替换成真实地址。 |
| pulls\_url | String | 代码仓库的拉取请求地址模板，链接后面括号里的值会被替换成真实地址。 |

```json
{
    "id": "564587fe700d43b81b080766",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "created_at": 1403018919,
    "owner": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_fork": false,
    "is_private": false,
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

全量更新一个代码仓库

用于全量更新一个代码仓库。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 代码仓库的名称。 |
| full\_name | String | 代码仓库的全称。同一代码托管平台下，代码仓库的全称是唯一的。 |
| description 可选 | String | 代码仓库的简介。 |
| is\_fork 可选 | Boolean | 是否是fork仓库。 |
| is\_private 可选 | Boolean | 是否是私有仓库。 |
| owner\_name 可选 | String | 代码仓库拥有者的用户名。 |
| html\_url 可选 | String | 代码仓库在代码托管平台上的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| branches\_url 可选 | String | 代码仓库的分支地址，使用 `{branch}` 表示分支名。如果为空，在PingCode中不显示相关跳转链接。 |
| commits\_url 可选 | String | 代码仓库的提交地址，使用 `{sha}` 表示提交的SHA值。如果为空，在PingCode中不显示相关跳转链接。 |
| compare\_url 可选 | String | 代码仓库的分支对比地址，使用 `{base}` 和 `{head}` 表示基准分支名和需要进行对比的分支名。如果为空，在PingCode中不显示相关跳转链接。 |
| pulls\_url 可选 | String | 代码仓库的拉取请求地址，使用 `{number}` 表示拉取请求的编号。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "is_fork": false,
    "is_private": false,
    "owner_name": "terry",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码仓库的id。 |
| url | String | 代码仓库的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| name | String | 代码仓库的名称。 |
| full\_name | String | 代码仓库的全称。 |
| created\_at | Number | 代码仓库的创建时间。 |
| owner | Object | 代码仓库拥有者的引用结构数据。 |
| is\_fork | Boolean | 代码仓库是否是fork仓库。 |
| is\_private | Boolean | 代码仓库是否是私有仓库。 |
| description | String | 代码仓库的描述。 |
| html\_url | String | 代码仓库的地址。 |
| branches\_url | String | 代码仓库的分支地址模板。 |
| commits\_url | String | 代码仓库的提交地址模板。 |
| compare\_url | String | 代码仓库的分支对比地址模板。 |
| pulls\_url | String | 代码仓库的拉取请求地址模板。 |

```json
{
    "id": "564587fe700d43b81b080766",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "created_at": 1403018919,
    "owner": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_fork": false,
    "is_private": false,
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

部分更新一个代码仓库

用于部分更新一个代码仓库。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 代码仓库的名称。 |
| full\_name 可选 | String | 代码仓库的全称。同一代码托管平台下，代码仓库的全称是唯一的。 |
| description 可选 | String | 代码仓库的简介。 |
| is\_fork 可选 | Boolean | 是否是fork仓库。 |
| is\_private 可选 | Boolean | 是否是私有仓库。 |
| owner\_name 可选 | String | 代码仓库拥有者的用户名。 |
| html\_url 可选 | String | 代码仓库在代码托管平台上的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| branches\_url 可选 | String | 代码仓库的分支地址，使用 `{branch}` 表示分支名。如果为空，在PingCode中不显示相关跳转链接。 |
| commits\_url 可选 | String | 代码仓库的提交地址，使用 `{sha}` 表示提交的SHA值。如果为空，在PingCode中不显示相关跳转链接。 |
| compare\_url 可选 | String | 代码仓库的分支对比地址，使用 `{base}` 和 `{head}` 表示基准分支名和需要进行对比的分支名。如果为空，在PingCode中不显示相关跳转链接。 |
| pulls\_url 可选 | String | 代码仓库的拉取请求地址，使用 `{number}` 表示拉取请求的编号。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "is_fork": false,
    "is_private": false,
    "owner_name": "terry",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码仓库的id。 |
| url | String | 代码仓库的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| name | String | 代码仓库的名称。 |
| full\_name | String | 代码仓库的全称。 |
| created\_at | Number | 代码仓库的创建时间。 |
| owner | Object | 代码仓库拥有者的引用结构数据。 |
| is\_fork | Boolean | 代码仓库是否是fork仓库。 |
| is\_private | Boolean | 代码仓库是否是私有仓库。 |
| description | String | 代码仓库的描述。 |
| html\_url | String | 代码仓库的地址。 |
| branches\_url | String | 代码仓库的分支地址模板。 |
| commits\_url | String | 代码仓库的提交地址模板。 |
| compare\_url | String | 代码仓库的分支对比地址模板。 |
| pulls\_url | String | 代码仓库的拉取请求地址模板。 |

```json
{
    "id": "564587fe700d43b81b080766",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "name": "ngx-planet",
    "full_name": "worktile/ngx-planet",
    "created_at": 1403018919,
    "owner": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_fork": false,
    "is_private": false,
    "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
    "html_url": "https://github.com/worktile/ngx-planet",
    "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
    "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
    "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
    "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
}
```

获取代码仓库列表

用于查询代码仓库列表。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| full\_name 可选 | String | 代码仓库的全称。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 代码仓库全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "564587fe700d43b81b080766",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
            "product": {
                "id": "564587fe700d43b81b080765",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
                "name": "Github",
                "type": "github"
            },
            "name": "ngx-planet",
            "full_name": "worktile/ngx-planet",
            "created_at": 1403018919,
            "owner": {
                "id": "5666aea91f99e33cb7c44964",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
                "name": "terry"
            },
            "is_fork": false,
            "is_private": false,
            "description": "A powerful, reliable, fully-featured and production ready Micro Frontend library for Angular",
            "html_url": "https://github.com/worktile/ngx-planet",
            "branches_url": "https://github.com/worktile/ngx-planet/tree/{branch}",
            "commits_url": "https://github.com/worktile/ngx-planet/commit/{sha}",
            "compare_url": "https://github.com/worktile/ngx-planet/compare/{base}...{head}",
            "pulls_url": "https://github.com/worktile/ngx-planet/pull/{number}"
        }
    ]
}
```

代码分支

创建一个代码分支

用于创建一个代码分支。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/branches
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 分支的名称。同一代码仓库下，分支的名称是唯一的。 |
| sender\_name | String | 分支创建者的用户名。 |
| is\_default 可选 | Boolean | 是否设置为默认分支。当创建分支时，如果当前仓库的分支数为0，则新创建的分支会自动设置为该仓库的默认分支。如果创建分支时设置了该分支为默认分支，并且仓库已经有默认分支存在，那么其他分支将被取消默认属性，而该分支将被设置为新的默认分支。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将分支与一个或多个工作项关联，分支和工作项关联后，分支下所有的提交都会和该工作项关联。 |

```json
{
    "name": "terry/#PLM-001",
    "sender_name": "terry",
    "is_default": true,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码分支的id。 |
| url | String | 代码分支的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| repository | Object | 代码仓库的引用结构数据。 |
| name | String | 代码分支的名称。 |
| created\_at | Number | 代码分支的创建时间。 |
| sender | Object | 代码分支创建者的引用结构数据。 |
| is\_default | Boolean | 代码分支是否为默认分支。 |
| work\_items | Object\[\] | 代码分支关联的工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080767",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "name": "terry/#PLM-001",
    "created_at": 1403018919,
    "sender": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_default": true,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取一个代码分支

用于查看一个代码分支。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/branches/{branch_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| branch\_id | String | 代码分支的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码分支的id。 |
| url | String | 代码分支的资源地址。 |
| product | Object | 代码分支的托管平台。 |
| repository | Object | 代码分支的代码仓库。 |
| name | String | 代码分支的名称。 |
| created\_at | Number | 代码分支的创建时间。 |
| sender | Object | 代码分支的创建者。 |
| is\_default | Boolean | 代码分支是否为默认分支。 |
| work\_items | Object\[\] | 代码分支关联的工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080767",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "name": "terry/#PLM-001",
    "created_at": 1403018919,
    "sender": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_default": false,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

部分更新一个代码分支

用于部分更新一个代码分支。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/branches/{branch_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| branch\_id | String | 分支的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| is\_default 可选 | Boolean | 是否设置为默认分支。该值只能是 `true` ，设置该分支为默认分支后将取消其他分支的默认属性。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将分支与一个或多个工作项关联，分支和工作项关联后，分支下所有的提交都会和该工作项关联。 |

```json
{
    "is_default": true,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码分支的id。 |
| url | String | 代码分支的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| repository | Object | 代码仓库的引用结构数据。 |
| name | String | 代码分支的名称。 |
| created\_at | Number | 代码分支的创建时间。 |
| sender | Object | 代码分支创建者的引用结构数据。 |
| is\_default | Boolean | 代码分支是否为默认分支。 |
| work\_items | Object\[\] | 代码分支关联的工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080767",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "name": "terry/#PLM-001",
    "created_at": 1403018919,
    "sender": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_default": true,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取代码分支列表

用于查询代码分支列表。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/branches
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 分支的名称。 |
| work\_item\_id 可选 | String | 工作项的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 代码分支全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "564587fe700d43b81b080767",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
            "product": {
                "id": "564587fe700d43b81b080765",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
                "name": "Github",
                "type": "github"
            },
            "repository": {
                "id": "564587fe700d43b81b080766",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
                "name": "ngx-planet",
                "full_name": "worktile/ngx-planet",
                "created_at": 1403018919
            },
            "name": "terry/#PLM-001",
            "created_at": 1403018919,
            "sender": {
                "id": "5666aea91f99e33cb7c44964",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
                "name": "terry"
            },
            "is_default": false,
            "work_items": [
                {
                    "id": "564587fe700d43b81b080ab8",
                    "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
                    "identifier": "PLM-001",
                    "title": "这是一个用户故事",
                    "type": "story",
                    "start_at": 1583290309,
                    "end_at": 1583290347,
                    "parent_id": "5edca524cad2fa112b06105c",
                    "short_id": "c9WqLmTO",
                    "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                    "properties": {
                        "prop_a": "prop_a_value",
                        "prop_b": "prop_b_value"
                    }
                }
            ]
        }
    ]
}
```

删除一个代码分支

用于删除一个代码分支。  
删除分支后，不会移除该分支和工作项的关联历史，在关联历史中，依然可以查询到删除的分支。默认分支不能被删除。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/branches/{branch_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| branch\_id | String | 分支的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码分支的id。 |
| url | String | 代码分支的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| repository | Object | 代码仓库的引用结构数据。 |
| name | String | 代码分支的名称。 |
| created\_at | Number | 代码分支的创建时间。 |
| sender | Object | 代码分支创建者的引用结构数据。 |
| is\_default | Boolean | 代码分支是否为默认分支。 |
| work\_items | Object\[\] | 代码分支关联的工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080768",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080768",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "name": "terry/#PLM-001",
    "created_at": 1403018919,
    "sender": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "is_default": false,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

提交

创建一个提交

用于创建一个提交。

```html
https://{rest_api_root}/v1/scm/commits
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| sha | String | 提交的SHA值。 |
| message | String | 提交的描述信息。 |
| committer\_name | String | 提交者的用户名。 |
| committed\_at | Number | 提交的时间。 |
| tree\_id 可选 | String | 提交树的SHA值。 |
| files\_added | String\[\] | 新增文件的文件名列表。 |
| files\_removed | String\[\] | 移除文件的文件名列表。 |
| files\_modified | String\[\] | 更新文件的文件名列表。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将提交与一个或多个工作项关联。 |

```json
{
    "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "message": "feat(scope): #PLM-001 initialization code structure",
    "committer_name": "terry",
    "committed_at": 1403018919,
    "tree_id": "1bf8989985e70389c07daa5052464a9c6f4896bb",
    "files_added": [
        "index.ts"
    ],
    "files_removed": [
        "utilities.ts"
    ],
    "files_modified": [
        "README.md"
    ],
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 提交的id。 |
| url | String | 提交的资源地址。 |
| sha | String | 提交的SHA值。 |
| message | String | 提交的描述信息。 |
| committer\_name | String | 提交者的用户名。 |
| committed\_at | Number | 提交的时间。 |
| tree\_id | String | 提交树的SHA值。 |
| files\_added | String\[\] | 提交新增文件的文件名列表。 |
| files\_removed | String\[\] | 提交移除文件的文件名列表。 |
| files\_modified | String\[\] | 提交更新文件的文件名列表。 |
| file\_changed\_count | Number | 提交更新文件数量。 |
| work\_items | Object\[\] | 提交关联的PingCode工作项列表。 |

```json
{
    "id": "5e3bb2128cfda459bbafa3fb",
    "url": "https://{rest_api_root}/v1/scm/commits/5e3bb2128cfda459bbafa3fb",
    "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "message": "feat(scope): #PLM-001 initialization code structure",
    "committer_name": "terry",
    "committed_at": 1403018919,
    "tree_id": "1bf8989985e70389c07daa5052464a9c6f4896bb",
    "files_added": [
        "index.ts"
    ],
    "files_removed": [
        "utilities.ts"
    ],
    "files_modified": [
        "README.md"
    ],
    "file_changed_count": 3,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取一个提交

用于查看一个提交。

```html
https://{rest_api_root}/v1/scm/commits/{commit_id_or_sha}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| commit\_id\_or\_sha | String | 提交的id或SHA值。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 提交的id。 |
| url | String | 提交的资源地址。 |
| sha | String | 提交的SHA值。 |
| message | String | 提交的描述信息。 |
| committer\_name | String | 提交者的用户名。 |
| committed\_at | Number | 提交的时间。 |
| tree\_id | String | 提交树的SHA值。 |
| files\_added | String\[\] | 提交新增文件的文件名列表。 |
| files\_removed | String\[\] | 提交移除文件的文件名列表。 |
| files\_modified | String\[\] | 提交更新文件的文件名列表。 |
| file\_changed\_count | Number | 提交更新文件数量。 |
| work\_items | Object\[\] | 提交关联的PingCode的工作项列表。 |

```json
{
    "id": "5e3bb2128cfda459bbafa3fb",
    "url": "https://{rest_api_root}/v1/scm/commits/5e3bb2128cfda459bbafa3fb",
    "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "message": "feat(scope): #PLM-001 initialization code structure",
    "committer_name": "terry",
    "committed_at": 1403018919,
    "tree_id": "1bf8989985e70389c07daa5052464a9c6f4896bb",
    "files_added": [
        "index.ts"
    ],
    "files_removed": [
        "utilities.ts"
    ],
    "files_modified": [
        "README.md"
    ],
    "file_changed_count": 3,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取提交列表

用于查询提交列表。

```html
https://{rest_api_root}/v1/scm/commits
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| sha 可选 | String | 提交的SHA值。 |
| work\_item\_id 可选 | String | 工作项的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 提交全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5e3bb2128cfda459bbafa3fb",
            "url": "https://{rest_api_root}/v1/scm/commits/5e3bb2128cfda459bbafa3fb",
            "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
            "message": "feat(scope): #PLM-001 initialization code structure",
            "committer_name": "terry",
            "committed_at": 1403018919,
            "tree_id": "1bf8989985e70389c07daa5052464a9c6f4896bb",
            "files_added": [
                "index.ts"
            ],
            "files_removed": [
                "utilities.ts"
            ],
            "files_modified": [
                "README.md"
            ],
            "file_changed_count": 3,
            "work_items": [
                {
                    "id": "564587fe700d43b81b080ab8",
                    "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
                    "identifier": "PLM-001",
                    "title": "这是一个用户故事",
                    "type": "story",
                    "start_at": 1583290309,
                    "end_at": 1583290347,
                    "parent_id": "5edca524cad2fa112b06105c",
                    "short_id": "c9WqLmTO",
                    "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                    "properties": {
                        "prop_a": "prop_a_value",
                        "prop_b": "prop_b_value"
                    }
                }
            ]
        }
    ]
}
```

提交引用

创建一个提交引用

用于创建一个提交引用。  
提交引用是提交与分支的一种关联关系，一个提交可以与多个分支关联，一个分支也可以与多个提交关联。当提交与分支关联后，提交会自动与由此分支发起的拉取请求关联，当拉取请求合并后，这些关联的提交将自动被标记为“已合并”状态。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/refs
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| sha | String | 提交的SHA值。 |
| meta\_type | String | 引用实体的类型。  允许值: `branch` |
| meta\_id | String | 引用实体的id，例如： `branch_id` 。 |

```json
{
    "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "meta_type": "branch",
    "meta_id": "564587fe700d43b81b080767"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 提交引用的id。 |
| url | String | 提交引用的资源地址。 |
| product | Object | 托管平台的引用结构数据。 |
| repository | Object | 代码仓库的引用结构数据。 |
| commit | Object | 提交的引用结构数据。 |
| meta | Object | 提交引用实体的引用结构数据。 |

```json
{
    "id": "5e451b7dd704c212f7de8b4f",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/refs/5e451b7dd704c212f7de8b4f",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "commit": {
        "id": "5e3bb2128cfda459bbafa3fb",
        "url": "https://{rest_api_root}/v1/scm/commits/5e3bb2128cfda459bbafa3fb",
        "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
        "message": "feat(scope): #PLM-001 initialization code structure",
        "committer_name": "terry",
        "committed_at": 1403018919
    },
    "meta": {
        "id": "564587fe700d43b81b080767",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
        "name": "terry/#PLM-001",
        "type": "branch"
    }
}
```

获取一个提交引用

用于查看一个提交引用。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/refs/{ref_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| ref\_id | String | 提交引用的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 提交引用的id。 |
| url | String | 提交引用的资源地址。 |
| product | Object | 提交引用的托管平台。 |
| repository | Object | 提交引用的代码仓库。 |
| commit | Object | 提交引用的代码提交。 |
| meta | Object | 提交引用的实体，如分支。 |

```json
{
    "id": "5e451b7dd704c212f7de8b4f",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/refs/5e451b7dd704c212f7de8b4f",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "commit": {
        "id": "5e3bb2128cfda459bbafa3fb",
        "url": "https://{rest_api_root}/v1/scm/commits/5e3bb2128cfda459bbafa3fb",
        "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
        "message": "feat(scope): #PLM-001 initialization code structure",
        "committer_name": "terry",
        "committed_at": 1403018919
    },
    "meta": {
        "id": "564587fe700d43b81b080767",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
        "name": "terry/#PLM-001",
        "type": "branch"
    }
}
```

获取提交引用列表

用于查询提交引用列表。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/refs
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| meta\_type | String | 引用实体的类型。  允许值: `branch` |
| meta\_id | String | 引用实体的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 提交引用全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "5e451b7dd704c212f7de8b4f",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/refs/5e451b7dd704c212f7de8b4f",
            "product": {
                "id": "564587fe700d43b81b080765",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
                "name": "Github",
                "type": "github"
            },
            "repository": {
                "id": "564587fe700d43b81b080766",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
                "name": "ngx-planet",
                "full_name": "worktile/ngx-planet",
                "created_at": 1403018919
            },
            "commit": {
                "id": "5e3bb2128cfda459bbafa3fb",
                "url": "https://{rest_api_root}/v1/scm/commits/5e3bb2128cfda459bbafa3fb",
                "sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
                "message": "feat(scope): #PLM-001 initialization code structure",
                "committer_name": "terry",
                "committed_at": 1403018919
            },
            "meta": {
                "id": "564587fe700d43b81b080767",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
                "name": "terry/#PLM-001",
                "type": "branch"
            }
        }
    ]
}
```

拉取请求

创建一个拉取请求

用于创建一个拉取请求。  
代码仓库内实际的拉取请求，用于在PingCode中显示拉取请求的详细信息。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title | String | 拉取请求的标题。 |
| number | Number | 拉取请求的编号。同一代码仓库下，该值是唯一的。 |
| creator\_name | String | 拉取请求创建者的用户名。 |
| source\_branch\_id 可选 | String | 源分支的id。 |
| target\_branch\_id | String | 目标分支的id。 |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| description 可选 | String | 拉取请求的描述。 |
| merged\_at 可选 | Number | 拉取请求合并的时间。当拉取请求状态为 `merged` 时，该值为必填。 |
| merged\_commit\_sha 可选 | String | 源分支最后一次提交的SHA值。当拉取请求状态为 `merged` 时，该值为必填。 |
| merged\_by\_name 可选 | String | 拉取请求合并者的用户名。当拉取请求状态为 `merged` 时，该值为必填。 |
| comments\_count 可选 | Number | 拉取请求的评论数量。 |
| review\_comments\_count 可选 | Number | 代码评审的评论数量。 |
| commits\_count 可选 | Number | 代码的提交数量。 |
| additions\_count 可选 | Number | 新增文件的数量。 |
| deletions\_count 可选 | Number | 删除文件的数量。 |
| changed\_files\_count 可选 | Number | 更改文件的数量。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将拉取请求与一个或多个工作项关联。 |

```json
{
    "title": "fix(doc): #PLM-001 fix document title",
    "number": 1,
    "creator_name": "terry",
    "description": "Please give some great suggestions",
    "source_branch_id": "564587fe700d43b81b080767",
    "target_branch_id": "564587fe700d43b81b080776",
    "status": "merged",
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by_name": "terry",
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 拉取请求的id。 |
| url | String | 拉取请求的资源地址。 |
| product | Object | 拉取请求的托管平台。 |
| repository | Object | 拉取请求的代码仓库。 |
| title | String | 拉取请求的标题。 |
| number | Number | 拉取请求的编号。 |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| description | String | 拉取请求的描述。 |
| author | Object | 拉取请求的创建者。 |
| source\_branch | Object | 拉取请求的源分支。 |
| target\_branch | Object | 拉取请求的目标分支。 |
| created\_at | Number | 拉取请求的创建时间。 |
| merged\_at | Number | 拉取请求的合并的时间。 |
| merged\_commit\_sha | String | 拉取请求的源分支最后一次提交的SHA值。 |
| merged\_by | Object | 拉取请求的合并者。 |
| comments\_count | Number | 拉取请求的评论数量。 |
| review\_comments\_count | Number | 拉取请求的代码评审评论数量。 |
| commits\_count | Number | 拉取请求的提交数量。 |
| additions\_count | Number | 拉取请求的新增文件数量。 |
| deletions\_count | Number | 拉取请求的删除文件数量。 |
| changed\_files\_count | Number | 拉取请求的更改文件数量。 |
| work\_items | Object\[\] | 拉取请求关联的PingCode的工作项列表。 |

```json
{
    "id": "594587fe700d43b81b080789",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "title": "fix(doc): #PLM-001 fix document title",
    "number": 1,
    "status": "merged",
    "description": "Please give some great suggestions",
    "author": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "source_branch": {
        "id": "564587fe700d43b81b080767",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
        "name": "terry/#PLM-001",
        "create_at": 1403018919
    },
    "target_branch": {
        "id": "564587fe700d43b81b080776",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080776",
        "name": "develop",
        "create_at": 1402018919
    },
    "created_at": 1463014000,
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取一个拉取请求

用于查看一个拉取请求。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 拉取请求的id。 |
| url | String | 拉取请求的资源地址。 |
| product | Object | 拉取请求的托管平台。 |
| repository | Object | 拉取请求的代码仓库。 |
| title | String | 拉取请求的标题。 |
| number | Number | 拉取请求的编号。 |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| description | String | 拉取请求的描述。 |
| author | Object | 拉取请求的创建者。 |
| source\_branch | Object | 拉取请求的源分支。 |
| target\_branch | Object | 拉取请求的目标分支。 |
| created\_at | Number | 拉取请求的创建时间。 |
| merged\_at | Number | 拉取请求的合并的时间。 |
| merged\_commit\_sha | String | 拉取请求的源分支最后一次提交的SHA值。 |
| merged\_by | Object | 拉取请求的合并者。 |
| comments\_count | Number | 拉取请求的评论数量。 |
| review\_comments\_count | Number | 拉取请求的代码评审评论数量。 |
| commits\_count | Number | 拉取请求的提交数量。 |
| additions\_count | Number | 拉取请求的新增文件数量。 |
| deletions\_count | Number | 拉取请求的删除文件数量。 |
| changed\_files\_count | Number | 拉取请求的更改文件数量。 |
| work\_items | Object\[\] | 拉取请求关联的PingCode的工作项列表。 |

```json
{
    "id": "594587fe700d43b81b080789",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "title": "fix(doc): #PLM-001 fix document title",
    "number": 1,
    "status": "merged",
    "description": "Please give some great suggestions",
    "author": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "source_branch": {
        "id": "564587fe700d43b81b080767",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
        "name": "terry/#PLM-001",
        "create_at": 1403018919
    },
    "target_branch": {
        "id": "564587fe700d43b81b080776",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080776",
        "name": "develop",
        "create_at": 1402018919
    },
    "created_at": 1403014000,
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

全量更新一个拉取请求

用于全量更新一个拉取请求。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| title | String | 拉取请求的标题。 |
| creator\_name | String | 拉取请求创建者的用户名。 |
| source\_branch\_id | String | 源分支的id。 |
| target\_branch\_id | String | 目标分支的id。 |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| description 可选 | String | 拉取请求的描述。 |
| merged\_at 可选 | Number | 拉取请求合并的时间。当拉取请求状态为 `merged` 时，该值为必填。 |
| merged\_commit\_sha 可选 | String | 源分支最后一次提交的SHA值。当拉取请求状态为 `merged` 时，该值为必填。 |
| merged\_by\_name 可选 | String | 拉取请求合并者的用户名。当拉取请求状态为 `merged` 时，该值为必填。 |
| comments\_count 可选 | Number | 拉取请求的评论数量。 |
| review\_comments\_count 可选 | Number | 代码评审的评论数量。 |
| commits\_count 可选 | Number | 代码的提交数量。 |
| additions\_count 可选 | Number | 新增文件的数量。 |
| deletions\_count 可选 | Number | 删除文件的数量。 |
| changed\_files\_count 可选 | Number | 更改文件的数量。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将拉取请求与一个或多个工作项关联。 |

```json
{
    "title": "fix(doc): #PLM-001 fix document title",
    "number": 1,
    "creator_name": "terry",
    "description": "Please give some great suggestions",
    "source_branch_id": "564587fe700d43b81b080767",
    "target_branch_id": "564587fe700d43b81b080776",
    "status": "merged",
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by_name": "terry",
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 拉取请求的id。 |
| url | String | 拉取请求的资源地址。 |
| product | Object | 拉取请求的托管平台。 |
| repository | Object | 拉取请求的代码仓库。 |
| title | String | 拉取请求的标题。 |
| number | Number | 拉取请求的编号。 |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| description | String | 拉取请求的描述。 |
| author | Object | 拉取请求的创建者。 |
| source\_branch | Object | 拉取请求的源分支。 |
| target\_branch | Object | 拉取请求的目标分支。 |
| created\_at | Number | 拉取请求的创建时间。 |
| merged\_at | Number | 拉取请求的合并的时间。 |
| merged\_commit\_sha | String | 拉取请求的源分支最后一次提交的SHA值。 |
| merged\_by | Object | 拉取请求的合并者。 |
| comments\_count | Number | 拉取请求的评论数量。 |
| review\_comments\_count | Number | 拉取请求的代码评审评论数量。 |
| commits\_count | Number | 拉取请求的提交数量。 |
| additions\_count | Number | 拉取请求的新增文件数量。 |
| deletions\_count | Number | 拉取请求的删除文件数量。 |
| changed\_files\_count | Number | 拉取请求的更改文件数量。 |
| work\_items | Object\[\] | 拉取请求关联的PingCode的工作项列表。 |

```json
{
    "id": "594587fe700d43b81b080789",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "title": "fix(doc): #PLM-001 fix document title",
    "number": 1,
    "status": "merged",
    "description": "Please give some great suggestions",
    "author": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "source_branch": {
        "id": "564587fe700d43b81b080767",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
        "name": "terry/#PLM-001",
        "create_at": 1403018919
    },
    "target_branch": {
        "id": "564587fe700d43b81b080776",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080776",
        "name": "develop",
        "create_at": 1402018919
    },
    "created_at": 1403014000,
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by": {
        "id": "5666aea91f99e33cb7c44968",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

部分更新一个拉取请求

用于部分更新一个拉取请求。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| title 可选 | String | 拉取请求的标题。 |
| creator\_name 可选 | String | 拉取请求创建者的用户名。 |
| description 可选 | String | 拉取请求的描述。 |
| target\_branch\_id 可选 | String | 目标分支的id。 |
| source\_branch\_id 可选 | String | 源分支的id。 |
| merged\_at 可选 | Number | 拉取请求合并的时间。当拉取请求状态为 `merged` 时，该值为必填。 |
| merged\_commit\_sha 可选 | String | 源分支最后一次提交的SHA值。当拉取请求状态为 `merged` 时，该值为必填。 |
| merged\_by\_name 可选 | String | 拉取请求合并者的用户名。当拉取请求状态为 `merged` 时，该值为必填。 |
| comments\_count 可选 | Number | 拉取请求的评论数量。 |
| review\_comments\_count 可选 | Number | 代码评审的评论数量。 |
| commits\_count 可选 | Number | 代码的提交数量。 |
| additions\_count 可选 | Number | 新增文件的数量。 |
| deletions\_count 可选 | Number | 删除文件的数量。 |
| changed\_files\_count 可选 | Number | 更改文件的数量。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将拉取请求与一个或多个工作项关联。 |

```json
{
    "title": "fix(doc): #PLM-001 fix document title",
    "description": "Please give some great suggestions",
    "status": "merged",
    "target_branch_id": "564587fe700d43b81b080776",
    "source_branch_id": "564587fe700d43b81b080767",
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by_name": "terry",
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 拉取请求的id。 |
| url | String | 拉取请求的资源地址。 |
| product | Object | 拉取请求的托管平台。 |
| repository | Object | 拉取请求的代码仓库。 |
| title | String | 拉取请求的标题。 |
| number | Number | 拉取请求的编号。 |
| status | String | 拉取请求的状态。  允许值: `open`, `closed`, `merged`, `abandoned` |
| description | String | 拉取请求的描述。 |
| author | Object | 拉取请求的创建者。 |
| source\_branch | Object | 拉取请求的源分支。 |
| target\_branch | Object | 拉取请求的目标分支。 |
| created\_at | Number | 拉取请求的创建时间。 |
| merged\_at | Number | 拉取请求的合并的时间。 |
| merged\_commit\_sha | String | 拉取请求的源分支最后一次提交的SHA值。 |
| merged\_by | Object | 拉取请求的合并者。 |
| comments\_count | Number | 拉取请求的评论数量。 |
| review\_comments\_count | Number | 拉取请求的代码评审评论数量。 |
| commits\_count | Number | 拉取请求的提交数量。 |
| additions\_count | Number | 拉取请求的新增文件数量。 |
| deletions\_count | Number | 拉取请求的删除文件数量。 |
| changed\_files\_count | Number | 拉取请求的更改文件数量。 |
| work\_items | Object\[\] | 拉取请求关联的PingCode的工作项列表。 |

```json
{
    "id": "594587fe700d43b81b080789",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "title": "fix(doc): #PLM-001 fix document title",
    "number": 1,
    "status": "merged",
    "description": "Please give some great suggestions",
    "author": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "source_branch": {
        "id": "564587fe700d43b81b080767",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
        "name": "terry/#PLM-001",
        "create_at": 1403018919
    },
    "target_branch": {
        "id": "564587fe700d43b81b080776",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080776",
        "name": "develop",
        "create_at": 1402018919
    },
    "created_at": 1403014000,
    "merged_at": 1473018919,
    "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
    "merged_by": {
        "id": "5666aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
        "name": "terry"
    },
    "comments_count": 2,
    "review_comments_count": 2,
    "commits_count": 2,
    "additions_count": 0,
    "deletions_count": 0,
    "changed_files_count": 3,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取拉取请求列表

用于查询拉取请求列表。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| number 可选 | number | 拉取请求的编号。 |
| work\_item\_id 可选 | String | 工作项的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 拉取请求全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "594587fe700d43b81b080789",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
            "product": {
                "id": "564587fe700d43b81b080765",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
                "name": "Github",
                "type": "github"
            },
            "repository": {
                "id": "564587fe700d43b81b080766",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
                "name": "ngx-planet",
                "full_name": "worktile/ngx-planet",
                "created_at": 1403018919
            },
            "title": "fix(doc): #PLM-001 fix document title",
            "number": 1,
            "status": "merged",
            "description": "Please give some great suggestions",
            "author": {
                "id": "5666aea91f99e33cb7c44964",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
                "name": "terry"
            },
            "source_branch": {
                "id": "564587fe700d43b81b080767",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080767",
                "name": "terry/#PLM-001",
                "create_at": 1403018919
            },
            "target_branch": {
                "id": "564587fe700d43b81b080776",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/branches/564587fe700d43b81b080776",
                "name": "develop",
                "create_at": 1402018919
            },
            "created_at": 1403014000,
            "merged_at": 1473018919,
            "merged_commit_sha": "96a024347146ebdc5f481f45e6e6871e0c43af5f",
            "merged_by": {
                "id": "5666aea91f99e33cb7c44964",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5666aea91f99e33cb7c44964",
                "name": "terry"
            },
            "comments_count": 2,
            "review_comments_count": 2,
            "commits_count": 2,
            "additions_count": 0,
            "deletions_count": 0,
            "changed_files_count": 3,
            "work_items": [
                {
                    "id": "564587fe700d43b81b080ab8",
                    "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
                    "identifier": "PLM-001",
                    "title": "这是一个用户故事",
                    "type": "story",
                    "start_at": 1583290309,
                    "end_at": 1583290347,
                    "parent_id": "5edca524cad2fa112b06105c",
                    "short_id": "c9WqLmTO",
                    "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                    "properties": {
                        "prop_a": "prop_a_value",
                        "prop_b": "prop_b_value"
                    }
                }
            ]
        }
    ]
}
```

代码评审

创建一个代码评审

用于创建一个代码评审。  
拉取请求实际的代码评审记录，用于在PingCode中显示代码评审的详细信息。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}/reviews
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| reviewer\_name | String | 评审人的用户名。 |
| description 可选 | String | 代码评审的描述。 |
| submitted\_at | Number | 提交的时间。 |
| html\_url 可选 | String | 代码评审的地址。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "status": "approved",
    "reviewer_name": "anytao",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码评审的id。 |
| url | String | 代码评审的资源地址。 |
| product | Object | 代码评审的托管平台。 |
| repository | Object | 代码评审的代码仓库。 |
| pull\_request | Object | 代码评审的拉取请求。 |
| reviewer | Object | 代码评审的评审人。 |
| status | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| description | String | 代码评审的描述。 |
| submitted\_at | Number | 代码评审的提交时间。 |
| html\_url | String | 代码评审的地址。 |

```json
{
    "id": "524587fe700d43b81b080988",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789/reviews/524587fe700d43b81b080988",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "pull_request": {
        "id": "594587fe700d43b81b080789",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
        "number": 1
    },
    "reviewer": {
        "id": "5999aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5999aea91f99e33cb7c44964",
        "name": "anytao"
    },
    "status": "approved",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

获取一个代码评审

用于查看一个代码评审。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}/reviews/{review_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |
| review\_id | String | 代码评审的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码评审的id。 |
| url | String | 代码评审的资源地址。 |
| product | Object | 代码评审的托管平台。 |
| repository | Object | 代码评审的代码仓库。 |
| pull\_request | Object | 代码评审的拉取请求。 |
| reviewer | Object | 代码评审的评审人。 |
| status | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| description | String | 代码评审的描述。 |
| submitted\_at | Number | 代码评审的提交时间。 |
| html\_url | String | 代码评审的地址。 |

```json
{
    "id": "524587fe700d43b81b080988",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789/reviews/524587fe700d43b81b080988",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "pull_request": {
        "id": "594587fe700d43b81b080789",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
        "number": 1
    },
    "reviewer": {
        "id": "5999aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5999aea91f99e33cb7c44964",
        "name": "anytao"
    },
    "status": "approved",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

全量更新一个代码评审

用于全量更新一个代码评审。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}/reviews/{review_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |
| review\_id | String | 代码评审的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| reviewer\_name | String | 评审人的用户名。 |
| status | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| submitted\_at | Number | 提交的时间。 |
| description 可选 | String | 代码评审的描述。 |
| html\_url 可选 | String | 代码评审的地址。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "reviewer_name": "anytao",
    "status": "approved",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码评审的id。 |
| url | String | 代码评审的资源地址。 |
| product | Object | 代码评审的托管平台。 |
| repository | Object | 代码评审的代码仓库。 |
| pull\_request | Object | 代码评审的拉取请求。 |
| reviewer | Object | 代码评审的评审人。 |
| status | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| description | String | 代码评审的描述。 |
| submitted\_at | Number | 代码评审的提交时间。 |
| html\_url | String | 代码评审的地址。 |

```json
{
    "id": "524587fe700d43b81b080988",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789/reviews/524587fe700d43b81b080988",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "pull_request": {
        "id": "594587fe700d43b81b080789",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
        "number": 1
    },
    "reviewer": {
        "id": "5999aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5999aea91f99e33cb7c44964",
        "name": "anytao"
    },
    "status": "approved",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

部分更新一个代码评审

用于部分更新一个代码评审。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}/reviews/{review_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |
| review\_id | String | 代码评审的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| reviewer\_name 可选 | String | 评审人的用户名。 |
| status 可选 | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| description 可选 | String | 代码评审的描述。 |
| submitted\_at 可选 | Number | 提交的时间。 |
| html\_url 可选 | String | 代码评审的地址。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "reviewer_name": "anytao",
    "status": "approved",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 代码评审的id。 |
| url | String | 代码评审的资源地址。 |
| product | Object | 代码评审的托管平台。 |
| repository | Object | 代码评审的代码仓库。 |
| pull\_request | Object | 代码评审的拉取请求。 |
| reviewer | Object | 代码评审的评审人。 |
| status | String | 代码评审的状态。  允许值: `comment`, `approved`, `request_changes` |
| description | String | 代码评审的描述。 |
| submitted\_at | Number | 代码评审的提交时间。 |
| html\_url | String | 代码评审的地址。 |

```json
{
    "id": "524587fe700d43b81b080988",
    "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789/reviews/524587fe700d43b81b080988",
    "product": {
        "id": "564587fe700d43b81b080765",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
        "name": "Github",
        "type": "github"
    },
    "repository": {
        "id": "564587fe700d43b81b080766",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
        "name": "ngx-planet",
        "full_name": "worktile/ngx-planet",
        "created_at": 1403018919
    },
    "pull_request": {
        "id": "594587fe700d43b81b080789",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
        "number": 1
    },
    "reviewer": {
        "id": "5999aea91f99e33cb7c44964",
        "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5999aea91f99e33cb7c44964",
        "name": "anytao"
    },
    "status": "approved",
    "description": "Review has approved",
    "submitted_at": 1403014111,
    "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
}
```

获取代码评审列表

用于查询代码评审列表。

```html
https://{rest_api_root}/v1/scm/products/{product_id}/repositories/{repository_id}/pull_requests/{pull_request_id}/reviews
```

令牌: 企业令牌

Scopes: pcp:read:devops:code

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| product\_id | String | 代码托管平台的id。 |
| repository\_id | String | 代码仓库的id。 |
| pull\_request\_id | String | 拉取请求的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 代码评审全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "524587fe700d43b81b080988",
            "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789/reviews/524587fe700d43b81b080988",
            "product": {
                "id": "564587fe700d43b81b080765",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765",
                "name": "Github",
                "type": "github"
            },
            "repository": {
                "id": "564587fe700d43b81b080766",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766",
                "name": "ngx-planet",
                "full_name": "worktile/ngx-planet",
                "created_at": 1403018919
            },
            "pull_request": {
                "id": "594587fe700d43b81b080789",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/repositories/564587fe700d43b81b080766/pull_requests/594587fe700d43b81b080789",
                "number": 1
            },
            "reviewer": {
                "id": "5999aea91f99e33cb7c44964",
                "url": "https://{rest_api_root}/v1/scm/products/564587fe700d43b81b080765/users/5999aea91f99e33cb7c44964",
                "name": "anytao"
            },
            "status": "approved",
            "description": "Review has approved",
            "submitted_at": 1403014111,
            "html_url": "https://github.com/worktile/ngx-planet/pull/127#pullrequestreview-384383294"
        }
    ]
}
```

构建

构建记录

创建一条构建记录

用于创建一条构建记录。  
企业内实际的构建记录，用于在PingCode中显示构建的详细信息。

```html
https://{rest_api_root}/v1/build/builds
```

令牌: 企业令牌

Scopes: pcp:write:devops:build

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 构建的名称。 |
| identifier | String | 构建的编号。 |
| job\_url 可选 | String | 构建任务的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview 可选 | String | 构建结果的概述。 |
| result\_url 可选 | String | 构建结果的地址。如果为空，在PingCode中不显示相关的跳转链接。 |
| start\_at | Number | 构建开始的时间。 |
| end\_at | Number | 构建结束的时间。 |
| duration | Number | 构建持续的时间。单位为秒。 |
| status | String | 构建的状态。  允许值: `success`, `failure` |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将构建与一个或多个工作项关联。 |

```json
{
    "name": "unit-test",
    "identifier": "131",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "duration": 38,
    "status": "success",
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 构建记录的id。 |
| url | String | 构建记录的资源地址。 |
| name | String | 构建记录的名称。 |
| identifier | String | 构建记录的编号。 |
| job\_url | String | 构建任务的地址。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview | String | 构建结果的概述。 |
| result\_url | String | 构建结果的地址。 |
| start\_at | Number | 构建开始的时间。 |
| status | String | 构建的状态。  允许值: `success`, `failure`, `unknown` |
| end\_at | Number | 构建结束的时间。 |
| duration | Number | 构建持续的时间，单位为秒。 |
| work\_items | Object\[\] | 构建关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/build/builds/564587fe700d43b81b080765",
    "name": "unit-test",
    "identifier": "131",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "status": "success",
    "end_at": 1583290347,
    "duration": 38,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取一个构建记录

用于查看一个构建记录。

```html
https://{rest_api_root}/v1/build/builds/{build_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:build

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| build\_id | String | 构建记录的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 构建记录的id。 |
| url | String | 构建记录的资源地址。 |
| identifier | String | 构建记录的编号。 |
| name | String | 构建记录的名称。 |
| job\_url | String | 构建任务的地址。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview | String | 构建结果的概述。 |
| result\_url | String | 构建结果的地址。 |
| start\_at | Number | 构建开始的时间。 |
| end\_at | Number | 构建结束的时间。 |
| status | String | 构建的状态。  允许值: `success`, `failure`, `unknown` |
| duration | Number | 构建持续的时间，单位为秒。 |
| work\_items | Object\[\] | 构建关联的PingCode的工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/build/builds/564587fe700d43b81b080765",
    "identifier": "131",
    "name": "unit-test",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "status": "success",
    "end_at": 1583290347,
    "duration": 38,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

全量更新一条构建记录

用于全量更新一条构建记录。

```html
https://{rest_api_root}/v1/build/builds/{build_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:build

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| build\_id | String | 构建的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 构建的名称。 |
| identifier | String | 构建的编号。 |
| job\_url 可选 | String | 构建任务的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview 可选 | String | 构建结果的概述。 |
| result\_url 可选 | String | 构建结果的地址。如果为空，在PingCode中不显示相关的跳转链接。 |
| start\_at | Number | 构建开始的时间。 |
| end\_at | Number | 构建结束的时间。 |
| duration | Number | 构建持续的时间。单位为秒。 |
| status | String | 构建的状态。  允许值: `success`, `failure` |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将构建与一个或多个工作项关联。 |

```json
{
    "name": "unit-test",
    "identifier": "131",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "duration": 38,
    "status": "success",
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 构建记录的id。 |
| url | String | 构建记录的资源地址。 |
| identifier | String | 构建记录的编号。 |
| name | String | 构建记录的名称。 |
| job\_url | String | 构建任务的地址。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview | String | 构建结果的概述。 |
| result\_url | String | 构建结果的地址。 |
| start\_at | Number | 构建开始的时间。 |
| status | String | 构建的状态。  允许值: `success`, `failure`, `unknown` |
| end\_at | Number | 构建结束的时间。 |
| duration | Number | 构建持续的时间，单位为秒。 |
| work\_items | Object\[\] | 构建关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/build/builds/564587fe700d43b81b080765",
    "identifier": "131",
    "name": "unit-test",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "status": "success",
    "end_at": 1583290347,
    "duration": 38,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

部分更新一条构建记录

用于部分更新一条构建记录。

```html
https://{rest_api_root}/v1/build/builds/{build_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:build

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| build\_id | String | 构建的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 构建的名称。 |
| identifier 可选 | String | 构建的编号。 |
| job\_url 可选 | String | 构建任务的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| provider 可选 | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview 可选 | String | 构建结果的概述。 |
| result\_url 可选 | String | 构建结果的地址。如果为空，在PingCode中不显示相关的跳转链接。 |
| start\_at 可选 | Number | 构建开始的时间。 |
| end\_at 可选 | Number | 构建结束的时间。 |
| status 可选 | String | 构建的状态。  允许值: `success`, `failure` |
| duration 可选 | Number | 构建持续的时间。单位为秒。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将构建与一个或多个工作项关联。 |

```json
{
    "name": "unit-test",
    "identifier": "131",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "end_at": 1583290347,
    "status": "success",
    "duration": 38,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 构建记录的id。 |
| url | String | 构建记录的资源地址。 |
| identifier | String | 构建记录的编号。 |
| name | String | 构建记录的名称。 |
| job\_url | String | 构建任务的地址。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview | String | 构建结果的概述。 |
| result\_url | String | 构建结果的地址。 |
| start\_at | Number | 构建开始的时间。 |
| status | String | 构建的状态。  允许值: `success`, `failure`, `unknown` |
| end\_at | Number | 构建结束的时间。 |
| duration | Number | 构建持续的时间，单位为秒。 |
| work\_items | Object\[\] | 构建关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/build/builds/564587fe700d43b81b080765",
    "identifier": "131",
    "name": "unit-test",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "status": "failure",
    "end_at": 1583290347,
    "duration": 38,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取构建记录列表

用于查询构建记录列表。

```html
https://{rest_api_root}/v1/build/builds
```

令牌: 企业令牌

Scopes: pcp:read:devops:build

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 构建记录全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "564587fe700d43b81b080765",
            "url": "https://{rest_api_root}/v1/build/builds/564587fe700d43b81b080765",
            "identifier": "131",
            "name": "unit-test",
            "job_url": "https://your-job-url",
            "provider": "jenkins",
            "result_overview": "1000 test cases pass",
            "result_url": "https://your-result-url",
            "start_at": 1583290309,
            "status": "success",
            "end_at": 1583290347,
            "duration": 38,
            "work_items": [
                {
                    "id": "564587fe700d43b81b080ab8",
                    "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
                    "identifier": "PLM-001",
                    "title": "这是一个用户故事",
                    "type": "story",
                    "start_at": 1583290309,
                    "end_at": 1583290347,
                    "parent_id": "5edca524cad2fa112b06105c",
                    "short_id": "c9WqLmTO",
                    "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                    "properties": {
                        "prop_a": "prop_a_value",
                        "prop_b": "prop_b_value"
                    }
                }
            ]
        }
    ]
}
```

删除一条构建记录

```html
https://{rest_api_root}/v1/build/builds/{build_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:build

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| build\_id | String | 构建的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 构建记录的id。 |
| url | String | 构建记录的资源地址。 |
| identifier | String | 构建记录的编号。 |
| name | String | 构建记录的名称。 |
| job\_url | String | 构建任务的地址。 |
| provider | String | 构建工具的名称。  允许值: `bamboo`, `bitbucket`, `jenkins`, `other` |
| result\_overview | String | 构建结果的概述。 |
| result\_url | String | 构建结果的地址。 |
| start\_at | Number | 构建开始的时间。 |
| status | String | 构建的状态。  允许值: `success`, `failure`, `unknown` |
| end\_at | Number | 构建结束的时间。 |
| duration | Number | 构建持续的时间，单位为秒。 |
| work\_items | Object\[\] | 构建关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080765",
    "url": "https://{rest_api_root}/v1/build/builds/564587fe700d43b81b080765",
    "identifier": "131",
    "name": "unit-test",
    "job_url": "https://your-job-url",
    "provider": "jenkins",
    "result_overview": "1000 test cases pass",
    "result_url": "https://your-result-url",
    "start_at": 1583290309,
    "status": "success",
    "end_at": 1583290347,
    "duration": 38,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

交付

环境

创建一个环境

用于创建一个环境。  
企业内实际的部署环境，用于在PingCode中显示各个环境的部署信息。

```html
https://{rest_api_root}/v1/release/environments
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 环境的名称。同一团队内，环境的名称是唯一的。 |
| html\_url 可选 | String | 环境的地址。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 环境的id。 |
| url | String | 环境的资源地址。 |
| name | String | 环境的名称。 |
| html\_url | String | 环境的真实地址。 |

```json
{
    "id": "564587fe700d43b81b080123",
    "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

获取一个环境

用于查看一个环境。

```html
https://{rest_api_root}/v1/release/environments/{env_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| env\_id | String | 环境的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 环境的id。 |
| url | String | 环境的资源地址。 |
| name | String | 环境的名称。 |
| html\_url | String | 环境的真实地址。 |

```json
{
    "id": "564587fe700d43b81b080123",
    "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

全量更新一个环境

用于全量更新一个环境。

```html
https://{rest_api_root}/v1/release/environments/{env_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| env\_id | String | 环境的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 环境的名称。同一团队内，环境的名称是唯一的。 |
| html\_url 可选 | String | 环境的地址。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 环境的id。 |
| url | String | 环境的资源地址。 |
| name | String | 环境的名称。 |
| html\_url | String | 环境的真实地址。 |

```json
{
    "id": "564587fe700d43b81b080123",
    "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

部分更新一个环境

用于部分更新一个环境。

```html
https://{rest_api_root}/v1/release/environments/{env_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| env\_id | String | 环境的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name 可选 | String | 环境的名称。同一团队内，环境的名称是唯一的。 |
| html\_url 可选 | String | 环境的地址。如果为空，在PingCode中不显示相关跳转链接。 |

```json
{
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 环境的id。 |
| url | String | 环境的资源地址。 |
| name | String | 环境的名称。 |
| html\_url | String | 环境的真实地址。 |

```json
{
    "id": "564587fe700d43b81b080123",
    "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

获取环境列表

用于查询环境列表。

```html
https://{rest_api_root}/v1/release/environments
```

令牌: 企业令牌

Scopes: pcp:read:devops:deploy

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| name | String | 环境的名称。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 环境全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "564587fe700d43b81b080123",
            "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
            "name": "Production",
            "html_url": "https://your-environment-url"
        }
    ]
}
```

删除一个环境

用于删除一个环境。  
删除环境之前，需要先删除与该环境关联的部署。

```html
https://{rest_api_root}/v1/release/environments/{env_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| env\_id | String | 环境的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 环境的id。 |
| url | String | 环境的资源地址。 |
| name | String | 环境的名称。 |
| html\_url | String | 环境的真实地址。 |

```json
{
    "id": "564587fe700d43b81b080123",
    "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
    "name": "Production",
    "html_url": "https://your-environment-url"
}
```

部署

创建一个部署

用于创建一个部署。  
企业内实际的部署记录，用于在PingCode中显示部署的详细信息。

```html
https://{rest_api_root}/v1/release/deploys
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| env\_id | String | 环境的id。 |
| release\_name | String | 发布的名称。 |
| release\_url 可选 | String | 版本发布的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间。单位为秒。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将部署与一个或多个工作项关联。 |

```json
{
    "status": "deployed",
    "env_id": "564587fe700d43b81b080123",
    "release_name": "1.1.0",
    "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部署的id。 |
| url | String | 部署的资源地址。 |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| release\_name | String | 发布的名称。 |
| environment | Object | 环境的引用结构数据。 |
| release\_url | String | 版本发布的地址。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间，单位为秒。 |
| work\_items | Object\[\] | 部署关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080339",
    "url": "https://{rest_api_root}/v1/release/deploys/564587fe700d43b81b080339",
    "status": "deployed",
    "release_name": "1.1.0",
    "environment": {
        "id": "564587fe700d43b81b080123",
        "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
        "name": "Production"
    },
    "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取一个部署

用于查看一个部署。

```html
https://{rest_api_root}/v1/release/deploys/{deploy_id}
```

令牌: 企业令牌

Scopes: pcp:read:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deploy\_id | String | 部署的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部署的id。 |
| url | String | 部署的资源地址。 |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| release\_name | String | 发布的名称。 |
| environment | Object | 发布的环境。 |
| release\_url | String | 版本发布的地址。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间。单位为秒。 |
| work\_items | Object\[\] | 部署关联的PingCode的工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080339",
    "url": "https://{rest_api_root}/v1/release/deploys/564587fe700d43b81b080339",
    "status": "deployed",
    "release_name": "1.1.0",
    "environment": {
        "id": "564587fe700d43b81b080123",
        "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
        "name": "Production"
    },
    "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

全量更新一个部署

用于全量更新一个部署。

```html
https://{rest_api_root}/v1/release/deploys/{deploy_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deploy\_id | String | 部署的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| env\_id | String | 环境的id。 |
| release\_name | String | 版本发布的名称。 |
| release\_url 可选 | String | 版本发布的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间。单位为秒。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将部署与一个或多个工作项关联。 |

```json
{
    "status": "deployed",
    "env_id": "564587fe700d43b81b080123",
    "release_name": "1.1.0",
    "release_url": "https://your-release-host/release",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部署的id。 |
| url | String | 部署的资源地址。 |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| release\_name | String | 发布的名称。 |
| environment | Object | 环境的引用结构数据。 |
| release\_url | String | 版本发布的地址。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间，单位为秒。 |
| work\_items | Object\[\] | 部署关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080339",
    "url": "https://{rest_api_root}/v1/release/deploys/564587fe700d43b81b080339",
    "status": "deployed",
    "release_name": "1.1.0",
    "environment": {
        "id": "564587fe700d43b81b080123",
        "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
        "name": "Production"
    },
    "release_url": "https://your-release-host/release",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

部分更新一个部署

用于部分更新一个部署。

```html
https://{rest_api_root}/v1/release/deploys/{deploy_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deploy\_id | String | 部署的id。 |

请求参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| status 可选 | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| env\_id 可选 | String | 环境的id。 |
| release\_name 可选 | String | 版本发布的名称。 |
| release\_url 可选 | String | 版本发布的地址。如果为空，在PingCode中不显示相关跳转链接。 |
| start\_at 可选 | Number | 部署开始的时间。 |
| end\_at 可选 | Number | 部署结束的时间。 |
| duration 可选 | Number | 部署持续的时间。单位为秒。 |
| work\_item\_identifiers 可选 | String\[\] | PingCode工作项编号的列表。通过该参数将部署与一个或多个工作项关联。 |

```json
{
    "status": "deployed",
    "env_id": "564587fe700d43b81b080123",
    "release_name": "1.1.0",
    "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_item_identifiers": [
        "PLM-001"
    ]
}
```

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部署的id。 |
| url | String | 部署的资源地址。 |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| release\_name | String | 发布的名称。 |
| environment | Object | 环境的引用结构数据。 |
| release\_url | String | 版本发布的地址。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间，单位为秒。 |
| work\_items | Object\[\] | 部署关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080339",
    "url": "https://{rest_api_root}/v1/release/deploys/564587fe700d43b81b080339",
    "status": "deployed",
    "release_name": "1.1.0",
    "environment": {
        "id": "564587fe700d43b81b080123",
        "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
        "name": "Production"
    },
    "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```

获取部署列表

用于查询部署列表。

```html
https://{rest_api_root}/v1/release/deploys
```

令牌: 企业令牌

Scopes: pcp:read:devops:deploy

查询参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| env\_id 可选 | String | 环境的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| page\_size | Number | 每页条数。 |
| page\_index | Number | 页码，从0开始。 |
| total | Number | 总条数。 |
| values | Object\[\] | 部署的全量结构数据的数组。 |

```json
{
    "page_size": 30,
    "page_index": 0,
    "total": 1,
    "values": [
        {
            "id": "564587fe700d43b81b080339",
            "url": "https://{rest_api_root}/v1/release/deploys/564587fe700d43b81b080339",
            "status": "deployed",
            "release_name": "1.1.0",
            "environment": {
                "id": "564587fe700d43b81b080123",
                "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
                "name": "Production"
            },
            "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
            "start_at": 1583143467,
            "end_at": 1583143667,
            "duration": 200,
            "work_items": [
                {
                    "id": "564587fe700d43b81b080ab8",
                    "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
                    "identifier": "PLM-001",
                    "title": "这是一个用户故事",
                    "type": "story",
                    "start_at": 1583290309,
                    "end_at": 1583290347,
                    "parent_id": "5edca524cad2fa112b06105c",
                    "short_id": "c9WqLmTO",
                    "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
                    "properties": {
                        "prop_a": "prop_a_value",
                        "prop_b": "prop_b_value"
                    }
                }
            ]
        }
    ]
}
```

删除一个部署

用于删除一个部署。

```html
https://{rest_api_root}/v1/release/deploys/{deploy_id}
```

令牌: 企业令牌

Scopes: pcp:write:devops:deploy

路径参数

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| deploy\_id | String | 部署的id。 |

资源属性

| 字段 | 类型 | 描述 |
| --- | --- | --- |
| id | String | 部署的id。 |
| url | String | 部署的资源地址。 |
| status | String | 部署的状态。  允许值: `not_deployed`, `deployed` |
| release\_name | String | 发布的名称。 |
| environment | Object | 环境的引用结构数据。 |
| release\_url | String | 版本发布的地址。 |
| start\_at | Number | 部署开始的时间。 |
| end\_at | Number | 部署结束的时间。 |
| duration | Number | 部署持续的时间，单位为秒。 |
| work\_items | Object\[\] | 部署关联的PingCode工作项列表。 |

```json
{
    "id": "564587fe700d43b81b080339",
    "url": "https://{rest_api_root}/v1/release/deploys/564587fe700d43b81b080339",
    "status": "deployed",
    "release_name": "1.1.0",
    "environment": {
        "id": "564587fe700d43b81b080123",
        "url": "https://{rest_api_root}/v1/release/environments/564587fe700d43b81b080123",
        "name": "Production"
    },
    "release_url": "https://github.com/worktile/ngx-planet/releases/tag/1.1.0",
    "start_at": 1583143467,
    "end_at": 1583143667,
    "duration": 200,
    "work_items": [
        {
            "id": "564587fe700d43b81b080ab8",
            "url": "https://{rest_api_root}/v1/pjm/work_items/564587fe700d43b81b080ab8",
            "identifier": "PLM-001",
            "title": "这是一个用户故事",
            "type": "story",
            "start_at": 1583290309,
            "end_at": 1583290347,
            "parent_id": "5edca524cad2fa112b06105c",
            "short_id": "c9WqLmTO",
            "html_url": "https://yctech.pingcode.com/pjm/workitems/c9WqLmTO",
            "properties": {
                "prop_a": "prop_a_value",
                "prop_b": "prop_b_value"
            }
        }
    ]
}
```