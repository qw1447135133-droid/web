# 第 1 周数据基础说明

这份说明是对“业务数据模型正式化”阶段的补充，帮助后续开发统一理解数据边界和代码分层。

## 1. 设计目标

本轮调整不是为了立刻完成全量同步，而是为了先把数据地基搭稳：

- 让体育数据和内容数据具备正式入库能力
- 让页面不再直接绑定抓取层或静态 mock
- 让后续“同步入库”“后台 CRUD”“支付与权限治理”都可以在当前结构上继续推进

## 2. 新的实体分层

当前 Prisma schema 已为以下实体预留正式模型：

- 体育域
  - `League`
  - `Team`
  - `Match`
  - `OddsSnapshot`
  - `StandingSnapshot`
  - `ScheduleSnapshot`
  - `HeadToHeadSnapshot`
- 内容域
  - `AuthorTeam`
  - `PredictionRecord`
  - `ArticlePlan`
  - `HomepageModule`
- 账号与交易域
  - `User`
  - `Session`
  - `MembershipOrder`
  - `ContentOrder`

## 3. Source 字段与展示字段原则

为避免后续抓取数据和前台展示强耦合，本轮模型遵循下面原则：

- `source` / `sourceKey`
  - 用于标记数据来源和外部主键
  - 后续同步任务做去重、更新时优先使用
- `sourcePayload`
  - 保存原始抓取的关键片段或标准化前的内容
  - 本阶段先以字符串形式预留
- `name` / `displayName`
  - `name` 偏原始标准字段
  - `displayName` 偏面向前台的稳定展示字段
- snapshot 类表
  - `StandingSnapshot`
  - `ScheduleSnapshot`
  - `HeadToHeadSnapshot`
  - 这些表用于表达“某次同步时刻”的快照，不和页面结构直接耦合

## 4. 当前代码分层

目前数据读取链路已经开始分层：

- 抓取层
  - `src/lib/nowscore-provider.ts`
- Repository 层
  - `src/lib/repositories/sports-repository.ts`
  - `src/lib/repositories/content-repository.ts`
- 页面数据聚合层
  - `src/lib/sports-data.ts`
  - `src/lib/content-data.ts`
- 页面层
  - `src/app/**/page.tsx`

后续要求：

- 页面层不要直接读取 Prisma
- 页面层不要重新直接引用静态 mock 作为主数据源
- 页面层统一走 `sports-data.ts` 或 `content-data.ts`
- Repository 层负责“数据库记录 -> 前台视图模型”的映射
- Provider 层只负责“上游数据 -> 标准化原始结果”

## 5. 当前阶段仍保留的兜底

为了不打断现有可运行状态，本轮仍保留 fallback：

- 数据库无正式数据时，继续回退到抓取层或 mock 数据
- 内容类页面在数据库为空时，继续使用现有 mock 数据

这意味着：

- 当前改造是向正式架构迁移
- 不是要求这一轮就把所有页面全部切成“数据库强依赖”

## 6. 下一阶段直接承接点

第 2 周开始时，应优先在当前基础上推进：

1. 真正实现 League / Team / Match / OddsSnapshot 等数据的同步入库
2. 为 snapshot 类表写入 standings / schedule / h2h 数据
3. 让 `/api/admin/sync` 调用正式同步服务
4. 让首页、直播页、资料库页优先读本地同步结果

## 7. 不建议的做法

后续开发请避免以下回退式写法：

- 在页面里重新直接写抓取逻辑
- 在页面里重新直接 import 大量 mock 数据
- 把上游原始字段直接透传到 UI，不做 repository 映射
- 在没有 sourceKey 设计的前提下直接做 upsert

以上约束是为了确保后续开发不会反复返工。

## 8. Prisma 本地运行注意事项

本仓库当前使用本地 SQLite 作为开发期数据库，因此 Prisma Client 必须以“带本地 engine”的方式生成。

执行要求：

- 默认直接使用 `pnpm db:generate`
- 不要在本地 SQLite 开发环境里把 `PRISMA_GENERATE_NO_ENGINE=1` 当作常规生成方式

原因：

- `--no-engine` 或等效环境变量会让生成产物里的 `copyEngine` 变成 `false`
- 在当前 Prisma 6 运行时下，这会让客户端走 Accelerate / Data Proxy 判定分支
- 随后本地 `file:./dev.db` 会被错误校验成必须使用 `prisma://` 或 `prisma+postgres://`，并抛出 `P6001`

如果重新出现这类报错，请优先检查：

1. 重新执行后的生成产物里是否仍然是 `copyEngine: true`
2. `DATABASE_URL` 是否仍为本地 SQLite 连接串
3. 当前运行的进程是否还在持有旧的 Prisma Client 产物
