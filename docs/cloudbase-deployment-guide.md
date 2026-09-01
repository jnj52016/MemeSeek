# MemeSeek 部署到腾讯云 CloudBase 指南

> 本指南对应 MemeSeek 的“本地文件夹优先”模式：图片、视频、缩略图和 `.memeseek/index.json` 保存在用户自行选择的电脑文件夹中。CloudBase 只托管网页，以及可选的临时 AI 分析接口。

## 1. 部署后的架构

```text
用户的 Chrome / Edge
  ├─ CloudBase 静态网站：React 前端
  ├─ 用户授权的本地梗图文件夹：媒体文件 + .memeseek/index.json
  └─ CloudBase 云托管：仅 POST /v1/ai/analyze（可选）
       └─ 用户自己的 OpenAI / DeepSeek API
```

不要把用户素材上传到 CloudBase 云存储，也不要把 `server/uploads/memes` 当作生产素材库。

项目根目录的 `docker-compose.yml` 只启动旧 PostgreSQL，供旧数据迁移期间使用；本地文件夹模式的日常使用和 CloudBase 正式部署均不需要部署这个容器。

## 2. 部署前准备

1. 注册并完成腾讯云实名认证。
2. 在 CloudBase 控制台创建一个环境，记下“环境 ID”。建议测试和正式环境分开。
3. 在 Windows 终端安装并登录 CloudBase CLI：

```powershell
npm install -g @cloudbase/cli
tcb login
tcb --version
```

4. 准备两个域名：

   - 前端静态网站域名，例如 `https://memeseek.example.com`。
   - 后端云托管域名，例如 `https://memeseek-api.example.com`，也可先使用 CloudBase 默认域名。

前端必须使用 HTTPS。File System Access API 依赖安全上下文；正式域名变更后，浏览器通常要求用户对新域名重新授权本地文件夹。

## 3. 第一阶段：部署前端静态网站

先不接 AI 后端也可以部署。此时目录选择、导入、搜索、编辑、删除、重新扫描、索引备份/重建都可使用；只有 AI 分析按钮无法使用。

### 3.1 设置后端地址

Vite 会在构建时把 `VITE_API_BASE_URL` 写进产物。若暂时没有后端，可先留空；若已有云托管后端，请在 PowerShell 中设置：

```powershell
$env:VITE_API_BASE_URL = "https://<你的后端域名>"
```

不要把 AI Key 写进该变量、仓库、构建日志或 CloudBase 前端环境变量。AI Key 由用户在网页的“AI 设置”中自行填写，保存在其浏览器本地。

### 3.2 本地构建和检查

在项目根目录执行：

```powershell
pnpm.cmd --filter client test
pnpm.cmd --filter client lint
pnpm.cmd --filter client build
```

构建产物为 `client/dist`。

### 3.3 使用 CloudBase 应用部署（推荐）

CloudBase 当前推荐对 Vite、React 等有构建步骤的项目使用“应用部署”。CLI 会执行安装依赖、构建、上传产物和路由绑定。

在项目根目录执行：

```powershell
tcb app deploy --cwd .\client --framework vite -e <环境ID>
```

首次执行后，CLI 会保存部署配置。以后可继续使用相同命令；CI/CD 场景可加 `--force` 跳过交互确认。

也可以在 CloudBase 控制台进入“静态网站托管 → 新建部署”，上传 `client` 源码文件夹或 ZIP，并填写构建参数。不要上传 `node_modules`、`.git` 或用户素材文件夹。

`tcb hosting deploy .\client\dist -e <环境ID>` 仍适合“已经在本机构建完毕，只上传静态产物”的手工发布场景；但它不负责安装依赖与构建，因此不是本项目的首选流程。

### 3.4 SPA 路由

CloudBase 应用专属测试域名不适合使用环境级 404 回退规则，容易与应用路由形成重定向循环。本项目线上使用 React Hash Router，因此 AI 设置页地址形如 `/#/ai-settings`，刷新子页面不需要配置静态托管错误页。请勿再添加“404 → index.html”规则。

若同一个 CloudBase 环境还托管其他网站，不同应用必须使用不同部署路径。本项目使用 `/memeseek`，避免覆盖该环境中部署在 `/` 的个人博客；Vite 使用相对资源路径以同时兼容应用专属域名和环境静态托管子路径。

部署后，使用 CloudBase 默认 HTTPS 域名打开首页，确认浏览器能弹出“选择梗图文件夹”。再绑定正式自定义域名。

## 4. 第二阶段：部署 AI 临时分析后端

后端只对外提供：

- `GET /health`
- `POST /v1/ai/analyze`

旧 `/memes`、PostgreSQL 和 `server/uploads` 只用于迁移期，不是 CloudBase 正式运行所需的素材服务。

### 4.1 云托管服务建议

在 CloudBase 控制台中进入“云托管”并新建服务：

| 配置项 | 建议值 |
| --- | --- |
| 服务名 | `memeseek-ai-api` |
| 访问类型 | `WEB` / 公网访问 |
| 容器端口 | `3000`（必须与 NestJS 的 `PORT` 一致） |
| 最小实例 | 测试环境可为 0；正式环境若重视首次 AI 响应速度可设为 1。 |
| 上传内容 | `server/` 目录及其 Dockerfile，不上传 `server/uploads`。 |

仓库已提供 `server/Dockerfile` 和 `server/.dockerignore`。镜像默认设置 `LOCAL_AI_ONLY=true`：不会加载 Prisma、旧上传接口或 PostgreSQL，也不会把媒体写入 `uploads`。从源代码部署时，上传 `server/` 目录即可；不要上传 `server/uploads`。

### 4.2 后端环境变量

在云托管服务详情中设置：

| 变量 | 示例 | 说明 |
| --- | --- | --- |
| `PORT` | `3000` | 应用监听端口。 |
| `LOCAL_AI_ONLY` | `true` | 必填。只启用无状态的本地媒体分析接口，不连接 PostgreSQL。Dockerfile 已设置默认值，控制台显式填写可避免误覆盖。 |
| `CLIENT_ORIGIN` | `https://memeseek.example.com` | 前端正式域名，用于 CORS。测试域名与正式域名不同需分别部署或更新此值。 |
| `AI_BASE_URL` | `https://api.deepseek.com` | DeepSeek 官方 API 地址。 |
| `AI_MODEL` | `deepseek-v4-flash-vision-exp` | DeepSeek 官方图片理解模型。 |
| `DEEPSEEK_ONLY` | `true` | 强制忽略客户端传入的其他地址和模型，仅调用 DeepSeek 官方视觉服务。 |

当前正式部署仅支持 DeepSeek。网页会固定 API 地址和视觉模型，用户只需填写自己的 DeepSeek API Key；旧的其他服务配置会被自动清除。

不要在云托管环境变量中保存用户的 AI Key；该 Key 仅随单次 `POST /v1/ai/analyze` 请求转发。

### 4.3 CLI 部署方式

Dockerfile 已完成本地容器健康检查验证后，可使用：

```powershell
tcb cloudrun deploy -e <环境ID> -s memeseek-ai-api --source .\server --port 3000 --wait
```

也可以在控制台选择“云托管 → 新建服务 → 本地代码”，上传包含 Dockerfile 的 `server` 目录。发布后，在服务概览中复制公网访问域名。

### 4.4 联调

1. 打开 `https://<后端域名>/health`，确认返回 `status: "ok"`。
2. 更新前端构建时的 `VITE_API_BASE_URL` 为这个后端域名。
3. 重新构建并发布前端。
4. 在 CloudBase 前端域名中设置 AI Key，上传一张小于 10 MiB 的图片并点击“AI 分析”。

若浏览器提示跨域错误，核对 `CLIENT_ORIGIN` 是否与浏览器地址栏中的前端域名完全一致（包括 `https` 和子域名）。

## 5. 上线验收清单

- [ ] 用 CloudBase HTTPS 域名在桌面 Chrome 或 Edge 首次选择本地文件夹。
- [ ] 刷新页面后可以恢复目录权限，或只需点击“继续访问”。
- [ ] 导入图片、视频和动图后，文件实际位于用户选择的电脑文件夹。
- [ ] 搜索、编辑、删除、重新扫描、备份和重建索引均不依赖后端数据库。
- [ ] AI 图片分析返回结果并写入本地 `.memeseek/index.json`。
- [ ] 后端 `server/uploads` 没有新增分析图片。
- [ ] 旧素材迁移完成且核对无误后，才决定是否关闭旧 PostgreSQL Docker 和旧后端。

## 6. 常见问题

### 访问网页后无法选择文件夹

确认使用桌面 Chrome 或 Edge，并从 HTTPS 域名访问。Firefox、Safari 和手机浏览器不保证支持完整流程。

### 换了域名后为什么要重新授权文件夹

文件夹权限绑定“网站来源”（协议、域名、端口）。测试域名和正式域名是不同来源，浏览器会保护性地要求重新授权一次。

### 能否把用户图片放到 CloudBase 云存储

本项目当前需求是不可以。素材应留在用户自己的电脑；CloudBase 云存储不是本地素材库的备份或同步方案。

## 7. 官方文档

- [CloudBase 静态网站部署方式](https://docs.cloudbase.net/hosting/web-hosting)
- [CloudBase 应用部署](https://docs.cloudbase.net/cli-v1/app/management)
- [CloudBase 云托管代码部署](https://docs.cloudbase.net/cli-v1/cloudrun/deploy)
- [CloudBase 云托管容器端口和入口点](https://docs.cloudbase.net/run/deploy/configuring/environment/containers)
