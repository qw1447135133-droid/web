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
PAYMENT_CALLBACK_BASE_URL=https://你的域名
PAYMENT_CALLBACK_TOKEN=长随机串
PAYMENT_PENDING_MINUTES=30
PAYMENT_MANUAL_CHANNEL_LABEL=支付宝转账
PAYMENT_MANUAL_ACCOUNT_NAME=收款户名
PAYMENT_MANUAL_ACCOUNT_NO=收款账号或钱包ID
PAYMENT_MANUAL_QR_CODE_URL=https://你的CDN/收款码.png
PAYMENT_MANUAL_NOTE=转账备注请填写支付流水号
PAYMENT_HOSTED_GATEWAY_NAME=你的托管支付名称
PAYMENT_HOSTED_CHECKOUT_URL=https://gateway.example.com/checkout
PAYMENT_HOSTED_MERCHANT_ID=你的商户号
PAYMENT_HOSTED_SIGNING_SECRET=长随机签名密钥
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

### 回归测试与同步压测

部署完成后，建议至少执行一次：

```bash
pnpm typecheck
pnpm qa:smoke -- --base-url http://127.0.0.1
node scripts/sync-stability-check.mjs --base-url http://127.0.0.1 --token ${SYNC_TRIGGER_TOKEN} --mode burst --requests 4
curl -s http://127.0.0.1/api/health
```

如果已经切到公网域名，也可以直接改成你的正式访问地址。

更完整的回归、健康检查和同步稳定性说明，参考：

- [`docs/qa-regression-and-sync-ops.md`](./qa-regression-and-sync-ops.md)

### 支付回调接入

当前项目已经提供统一支付回调入口：

```bash
POST /api/payments/callback
Authorization: Bearer ${PAYMENT_CALLBACK_TOKEN}
```

正式接第三方支付前，建议至少配置：

- `PAYMENT_CALLBACK_BASE_URL`
  用于生成支付通道可访问的完整回调地址，例如 `https://example.com/api/payments/callback`
- `PAYMENT_MANUAL_CHANNEL_LABEL`
- `PAYMENT_MANUAL_ACCOUNT_NAME`
- `PAYMENT_MANUAL_ACCOUNT_NO`
- `PAYMENT_MANUAL_QR_CODE_URL`
- `PAYMENT_MANUAL_NOTE`

这样在当前 `manual` 模式下，前台收银页就能展示真实的收款说明、账号或二维码，而不是只显示订单号。

如果准备切到通用托管支付骨架，还要额外配置：

- `PAYMENT_PROVIDER=hosted`
- `PAYMENT_HOSTED_GATEWAY_NAME`
- `PAYMENT_HOSTED_CHECKOUT_URL`
- `PAYMENT_HOSTED_MERCHANT_ID`
- `PAYMENT_HOSTED_SIGNING_SECRET`

当前仓库已经支持一个“通用 hosted gateway 骨架”：

- 购买后会先跳内部 `launch` 路由，再跳转到第三方托管支付页
- 回调入口会先做共享令牌校验，再对 hosted payload 做 HMAC 签名校验
- 这是一个接真实支付前的适配层，不是任何一家 SDK 的最终接入版本

请求体支持这些字段：

- `type`: `membership` 或 `content`
- `orderId`
- `provider`
- `state`: `paid`、`failed`、`closed`
- `providerOrderId`
- `eventId` / `providerEventId`
- `paymentReference`
- `reason`
- `expiresAt`

示例：

```bash
curl -X POST https://你的域名/api/payments/callback \
  -H "Authorization: Bearer ${PAYMENT_CALLBACK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "membership",
    "provider": "manual",
    "orderId": "cm123example",
    "providerOrderId": "MANUAL-ORDER-MEM-ABC1234567",
    "eventId": "evt_20260403_0001",
    "state": "paid",
    "paymentReference": "MANUAL-MEM-8A1B2C3D",
    "expiresAt": "2026-04-03T16:30:00+08:00"
}'
```

### 代理提现回调接入

后台代理提现已提供内部回调入口，可用于“脚本批量打款回写”或后续接入真实打款供应商：

```bash
POST /api/internal/agents/payout-callback
Authorization: Bearer ${AGENT_PAYOUT_CALLBACK_TOKEN}
```

建议至少配置：

- `AGENT_PAYOUT_CALLBACK_TOKEN`
  如未单独配置，代码会回退到 `PAYMENT_CALLBACK_TOKEN`，再回退到 `SYNC_TRIGGER_TOKEN`
- `AGENT_PAYOUT_CALLBACK_BASE_URL`
  可选；未配置时会回退到 `PAYMENT_CALLBACK_BASE_URL / SITE_URL`

请求体可写回这些字段：

- `withdrawalId`
- `status`: `pending`、`reviewing`、`paying`、`settled`、`rejected`、`frozen`
- `payoutBatchNo`
- `payoutReference`
- `payoutOperator`
- `payoutAccount`
- `payoutChannel`
- `callbackStatus`
- `callbackReceivedAt`
- `callbackPayload`
- `proofUrl`
- `note`
- `rejectionReason`

示例：

```bash
curl -X POST https://你的域名/api/internal/agents/payout-callback \
  -H "Authorization: Bearer ${AGENT_PAYOUT_CALLBACK_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "withdrawalId": "cm_agent_withdrawal_001",
    "status": "settled",
    "payoutBatchNo": "BATCH-20260405-001",
    "payoutReference": "BANK-REF-8899123",
    "payoutOperator": "finance-bot",
    "callbackStatus": "success",
    "callbackReceivedAt": "2026-04-05T12:00:00+08:00",
    "callbackPayload": {
      "provider": "mock-payout",
      "result": "success"
    }
  }'
```

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
