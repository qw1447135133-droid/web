# 阿里云 ECS 部署说明

这套方案面向阿里云 `ECS Linux`，使用 `Docker + Docker Compose` 部署当前站点。

## 当前部署形态

- Next.js 16 生产构建使用 `output: "standalone"`
- 容器启动时自动执行 `node scripts/init-db.mjs`
- SQLite 持久化目录挂载到宿主机 `./data`
- 基础部署默认对外暴露 `80 -> 3000`
- 仓库内已提供 `Nginx + Certbot` 代理编排，可升级到域名与 HTTPS

## 服务器建议

- 系统：`Alibaba Cloud Linux 3`、`Ubuntu 22.04` 或同类 Linux
- 配置：至少 `2C4G`
- 磁盘：至少 `40GB`
- 安全组开放：
  - `80/tcp`
  - `443/tcp`（如果后续接 Nginx + HTTPS）
  - `22/tcp`（仅运维来源 IP）

## 首次部署

### 1. 安装 Docker 与 Compose

Ubuntu / Debian 示例：

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
```

### 2. 上传项目代码

可以直接在服务器拉取仓库：

```bash
git clone <your-repo-url> /srv/signal-nine-web
cd /srv/signal-nine-web
```

### 3. 准备生产环境变量

```bash
cp .env.production.example .env.production
```

然后编辑 `.env.production`：

```bash
NODE_ENV=production
HOSTNAME=0.0.0.0
PORT=3000
DATABASE_URL=file:/app/data/prod.db
APISPORTS_KEY=你的真实密钥
APISPORTS_TIMEZONE=Asia/Shanghai
PAYMENT_PROVIDER=manual
PAYMENT_CALLBACK_TOKEN=长随机串
PAYMENT_PENDING_MINUTES=30
SYNC_TRIGGER_TOKEN=长随机串
```

## 启动

### 方案 A：基础 HTTP 直出

```bash
docker compose -f docker-compose.aliyun.yml up -d --build
```

查看状态：

```bash
docker compose -f docker-compose.aliyun.yml ps
docker compose -f docker-compose.aliyun.yml logs -f
```

### 方案 B：域名 + HTTPS

直接参考 [`docs/aliyun-ecs-https.md`](./aliyun-ecs-https.md)。

该方案使用仓库内现成的：

- [`docker-compose.aliyun.proxy.yml`](../docker-compose.aliyun.proxy.yml)
- [`docker/nginx/default.conf.template`](../docker/nginx/default.conf.template)
- [`.env.proxy.example`](../.env.proxy.example)

## 更新

```bash
git pull
docker compose -f docker-compose.aliyun.yml up -d --build
```

## 数据位置

- 容器内：`/app/data/prod.db`
- 宿主机：项目目录下 `./data/prod.db`

建议把 `./data` 做定时备份。

## 常用排查

### 站点无法访问

1. 确认安全组已放行 `80`
2. 确认容器已启动：

```bash
docker compose -f docker-compose.aliyun.yml ps
```

3. 查看日志：

```bash
docker compose -f docker-compose.aliyun.yml logs -f web
```

### 数据库初始化失败

当前项目只支持 SQLite 文件路径：

```bash
DATABASE_URL=file:/app/data/prod.db
```

不要填成 MySQL/Postgres URL。

### 定时同步触发

当前项目已经提供内部同步入口：

```bash
curl -X POST http://127.0.0.1/api/internal/sync \
  -H "Authorization: Bearer ${SYNC_TRIGGER_TOKEN}"
```

建议在服务器上每 `5-10` 分钟调用一次。

### 支付回调接入

当前项目已经提供统一支付回调入口：

```bash
POST /api/payments/callback
Authorization: Bearer ${PAYMENT_CALLBACK_TOKEN}
```

请求体支持这些字段：

- `type`: `membership` 或 `content`
- `orderId`
- `state`: `paid`、`failed`、`closed`
- `paymentReference`
- `reason`

### 端口冲突

如果服务器 `80` 端口已被占用，可以改 `docker-compose.aliyun.yml`：

```yaml
ports:
  - "3000:3000"
```

然后通过 `http://服务器IP:3000` 访问。

## 下一步建议

- 当前公网已经通了，下一步优先切到 `Nginx + 域名 + HTTPS`
- 把 SQLite 备份到 OSS 或云盘快照
- 后续如果并发提升，再评估迁移到 MySQL/Postgres

如果准备接正式域名，可直接参考 [`docs/aliyun-ecs-https.md`](./aliyun-ecs-https.md)。
