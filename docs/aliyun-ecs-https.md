# 阿里云 ECS 域名与 HTTPS 接入

这份说明用于把当前已经上线的 `HTTP + Docker` 部署，升级为 `Nginx 反向代理 + HTTPS`。

## 当前形态

- 当前线上 HTTP 站点已经通过 [`docker-compose.aliyun.yml`](../docker-compose.aliyun.yml) 跑通
- 新增的 [`docker-compose.aliyun.proxy.yml`](../docker-compose.aliyun.proxy.yml) 会把：
  - `web` 服务改成仅内网暴露 `3000`
  - `nginx` 服务对外暴露 `80/443`
  - `/.well-known/acme-challenge/` 挂给证书校验

## 上线前准备

1. 域名解析到 ECS 公网 IP

将你的域名 A 记录指向：

```txt
47.238.249.104
```

2. 安全组放行

- `80/tcp`
- `443/tcp`
- `22/tcp` 建议只保留运维来源 IP

3. 服务器准备代理环境变量

```bash
cd /srv/signal-nine-web
cp .env.proxy.example .env.proxy
```

编辑 `.env.proxy`：

```bash
SERVER_NAME=your-domain.com
```

如果要同时覆盖裸域和 `www`，建议先确定主域名，只把一个域名写入 `SERVER_NAME`，成功签发后再扩展多域名证书。

## 切换到 Nginx 代理编排

先停止当前只暴露 80 的旧编排：

```bash
cd /srv/signal-nine-web
docker compose -f docker-compose.aliyun.yml down
```

再启动新的代理编排：

```bash
docker compose --env-file .env.proxy -f docker-compose.aliyun.proxy.yml up -d --build
```

此时：

- `http://your-domain.com` 应该已经可以访问
- `https://your-domain.com` 还不会成功，因为证书还没申请

## 申请 Let's Encrypt 证书

站点已经在 80 端口由 `nginx` 接管后，执行：

```bash
docker run --rm \
  -v /srv/signal-nine-web/nginx/certbot/www:/var/www/certbot \
  -v /srv/signal-nine-web/nginx/certbot/conf:/etc/letsencrypt \
  certbot/certbot certonly \
  --webroot \
  --webroot-path=/var/www/certbot \
  -d your-domain.com \
  --email your-email@example.com \
  --agree-tos \
  --no-eff-email
```

证书成功后，重启 Nginx：

```bash
cd /srv/signal-nine-web
docker compose --env-file .env.proxy -f docker-compose.aliyun.proxy.yml restart nginx
```

## 验证

```bash
curl -I http://your-domain.com
curl -I https://your-domain.com
curl -I https://your-domain.com/api/health
```

其中健康检查接口由 [`src/app/api/health/route.ts`](../src/app/api/health/route.ts) 提供。

## 后续更新

```bash
cd /srv/signal-nine-web
git pull
docker compose --env-file .env.proxy -f docker-compose.aliyun.proxy.yml up -d --build
```

## 证书续期

建议先人工续期一次验证流程：

```bash
docker run --rm \
  -v /srv/signal-nine-web/nginx/certbot/www:/var/www/certbot \
  -v /srv/signal-nine-web/nginx/certbot/conf:/etc/letsencrypt \
  certbot/certbot renew --webroot --webroot-path=/var/www/certbot
```

成功后可以再加系统定时任务或容器化定时续期。
