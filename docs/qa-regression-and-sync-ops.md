# 回归测试与同步稳定性操作基线

这份文档用于当前一期 MVP 的上线前回归、异常观察，以及生产环境的数据同步稳定性压测。

## 目标

- 给前台主链路提供一套可重复执行的 smoke regression 基线
- 给阿里云生产环境提供一套同步稳定性压测与结果解读方法
- 给监控系统提供一个更可用的健康检查接口

## 一、健康检查

当前站点健康检查接口：

```bash
GET /api/health
```

返回内容现在包含：

- `status`: `ok` / `degraded` / `error`
- `checks.database.ok`
- `checks.sync.latestRun`
- `checks.sync.running`
- `checks.sync.lock`
- `checks.callbacks.failedLast24h`
- `checks.callbacks.conflictLast24h`
- `warnings`

默认策略：

- 数据库可访问即可返回 `200`
- 如果存在同步陈旧、锁超时、最近回调失败等风险，会返回 `status: "degraded"`
- 只有数据库不可访问，或开启强约束后同步健康不达标，才返回 `503`

生产建议环境变量：

```bash
HEALTH_REQUIRE_SYNC=true
HEALTH_SYNC_MAX_AGE_MINUTES=180
HEALTH_RUNNING_SYNC_MAX_AGE_MINUTES=30
```

说明：

- `HEALTH_REQUIRE_SYNC=true` 时，同步陈旧或最新同步失败会把健康检查提升为 `503`
- 适合接入阿里云告警、Uptime Kuma、Prometheus Blackbox、云监控 URL 探测

## 二、全站回归 smoke

新增脚本：

```bash
pnpm qa:smoke
```

等价命令：

```bash
node scripts/smoke-regression.mjs
```

默认行为：

- 访问 `/api/health`
- 验证未登录访问 `/admin` 会跳转到 `/login`
- 按 `zh-CN / zh-TW / en` 三种语言检查这些页面是否返回正常 HTML：
  - `/`
  - `/live/football`
  - `/live/basketball`
  - `/live/cricket`
  - `/live/esports`
  - `/database`
  - `/ai-predictions`
  - `/plans`
  - `/member`
  - `/login`

可选参数：

```bash
node scripts/smoke-regression.mjs --base-url http://127.0.0.1:3000
node scripts/smoke-regression.mjs --base-url https://your-domain.com --locales zh-CN,en
```

适用场景：

- 本地开发完成后的快速回归
- ECS 部署完成后的首轮验收
- 上线前的手工发布 checklist

## 三、同步稳定性压测

新增脚本：

```bash
pnpm ops:sync:stress -- --token your-sync-token
```

等价命令：

```bash
node scripts/sync-stability-check.mjs --token your-sync-token
```

### 模式 1：并发突发压测

```bash
node scripts/sync-stability-check.mjs \
  --base-url https://your-domain.com \
  --token your-sync-token \
  --mode burst \
  --requests 6
```

预期结果：

- 一部分请求返回 `200`
- 其余请求允许返回：
  - `409 SYNC_ALREADY_RUNNING`
  - `409 SYNC_COOLDOWN_ACTIVE`
- 不能出现：
  - `401`
  - `500`

这个模式主要验证：

- 同步锁是否生效
- 冷却窗口是否生效
- 并发触发时不会把同步任务打穿

### 模式 2：顺序稳定性压测

```bash
node scripts/sync-stability-check.mjs \
  --base-url https://your-domain.com \
  --token your-sync-token \
  --mode loop \
  --requests 3 \
  --interval-ms 80000
```

预期结果：

- 每轮至少应得到一条有效同步结果，或者被明确的冷却策略拦截
- `/api/health` 中的 `checks.sync.latestRun.status` 不应持续停留在 `failed`
- `warnings` 不应出现持续累积的锁超时告警

这个模式主要验证：

- 生产环境长时间运行时的同步稳定性
- 免费 API 节流、冷却、重试逻辑是否按预期工作
- 同步结果是否能稳定写回数据库

## 四、上线前最小验证

建议每次生产发布后至少执行：

```bash
pnpm typecheck
pnpm qa:smoke -- --base-url https://your-domain.com
node scripts/sync-stability-check.mjs --base-url https://your-domain.com --token your-sync-token --mode burst --requests 4
curl -s https://your-domain.com/api/health
```

## 五、告警建议

建议重点盯这几类信号：

- `/api/health` 返回 `503`
- `/api/health` 返回 `status: "degraded"` 持续超过 10 分钟
- `checks.sync.latestRun.status === "failed"`
- `checks.sync.running.stale === true`
- `checks.sync.lock.stale === true`
- `checks.callbacks.failedLast24h > 0`

## 六、当前边界

这套基线现在解决的是：

- 上线前 smoke regression
- 同步链路并发保护验证
- 生产环境同步陈旧/锁异常/回调异常的基础观察

还没有展开的是：

- 真正的浏览器级全自动 E2E 套件
- 接入 Sentry / Prometheus / Grafana 的完整观测体系
- 多节点部署下的更高压同步压测
