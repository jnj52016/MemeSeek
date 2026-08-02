# Docker 运行

项目现在可以由 Docker Compose 一次启动 PostgreSQL、NestJS API 和 Nginx 前端，不需要再手动打开项目执行 `pnpm dev`。

## 第一次启动

确保 Docker Desktop 已安装并运行，在项目目录执行：

```bash
docker compose up -d --build
```

访问：

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- Swagger：http://localhost:3000/docs

后端容器启动时会自动执行 `prisma migrate deploy`。数据库数据保存在 `postgres_data`，上传的图片、视频和封面保存在 `uploads_data`，重建容器不会丢失。

## 后续启动

日常启动可以直接双击项目根目录的 `start-memeseek.cmd`，或执行：

```bash
docker compose up -d
```

三个服务都设置了 `restart: unless-stopped`。在 Docker Desktop 的 Settings → General 中打开 “Start Docker Desktop when you sign in”，登录 Windows 后 Docker Desktop 会自动启动，容器也会自动恢复，不需要打开 IDE 或终端。

停止服务：

```bash
docker compose down
```

这不会删除数据库和上传文件。不要使用 `docker compose down -v`，除非你确认要删除两个数据卷。

## 环境变量

Compose 会读取项目根目录的 `.env`。可以按需设置：

```env
POSTGRES_USER=memeseek
POSTGRES_PASSWORD=memeseek_dev_password
POSTGRES_DB=memeseek
AI_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o
```

当前 AI Key 仍然由浏览器设置页保存，不写入容器环境变量。

## 一个限制

“打开文件所在位置”依赖宿主机文件管理器。应用放在 Docker 容器后，这个按钮无法直接打开 Windows 资源管理器；上传、预览、编辑、删除和 AI 分析不受影响。

