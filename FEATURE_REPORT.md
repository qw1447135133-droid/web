# Signal Nine Sports MVP — 功能汇总报告

> 生成日期：2026-04-03  
> 项目路径：`C:\Users\14471\Documents\GitHub\web`

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Next.js 16 + React 19 |
| 样式 | Tailwind CSS 4 |
| 数据库 | SQLite（通过 Prisma 6.16 ORM） |
| 语言 | TypeScript |
| 外部 API | API-Sports（可选，支持降级到 Mock 数据） |

---

## 一、页面与路由（12 个页面）

### 1. 首页 `/`
- Hero 区域 + 精选赛事 Feed
- 板球专区（实时场次数、覆盖联赛、赛事卡片）
- 热门推荐轮播（付费分析文章）
- 会员套餐展示（3 档）
- AI 模型预测脉冲（Top 3）
- 作者团队网格（4 张卡片，含连胜/胜率/ROI/粉丝数）
- 动态首页模块卡片（3 张，含指标）

### 2. 实时赛事（3 个运动）
- `/live/football` — 足球比分板，支持联赛/状态/排序筛选
- `/live/basketball` — 篮球比分板，同上
- `/live/cricket` — 板球比分板（从首页入口访问）

### 3. 体育数据库 `/database`
支持足球 / 篮球 / 板球三运动切换，四种视图：
- **积分榜**：排名、球队、场次、胜负平、积分（各运动列不同）
- **赛程**：赛事安排与结果，关联付费文章
- **球队**：球队卡片（近期状态、主客场战绩、板球情报）
- **历史交锋**：H2H 历史对阵，含标签与板球叙事

板球专属：球队情报卡、联赛概览卡、赛程补充说明。

### 4. 付费内容
- `/plans` — 分析文章网格（3 列），含作者团队展示、购买入口
- `/plans/[slug]` — 文章详情（需购买或会员解锁）

### 5. AI 预测 `/ai-predictions`
- 模型指标：命中率 62.8%、平均边际 +4.8%、可解释因子
- 预测卡片（2 列）：市场类型、选项、置信度、解释文本、因子标签、预期边际

### 6. 会员中心 `/member`
- 用户资料（角色、会员状态、已解锁文章数）
- 会员套餐购买（3 档）
- 订单历史（会员订单 + 内容订单，含状态、时间、金额、支付参考号）
- 已解锁内容列表（直链文章）
- 支付结果通知

### 7. 管理后台 `/admin`（仅 Admin 角色）
五个 Tab：
- **概览**：4 个指标卡（赛事数、文章数、作者数、预测数）
- **赛事**：数据同步触发、实时赛事列表（含洞察）
- **内容**：作者表单（创建/编辑）、文章表单（创建/编辑）、列表管理（发布/归档/热门切换）、内容初始化
- **用户**：4 个指标卡、高级筛选（关键词/订单状态/订单类型/日期范围）、用户列表、订单列表（含退款）、CSV 导出、分页
- **AI 导入**：批量导入 AI 预测（标题 + 备注）

### 8. 登录 `/login`
- 预设快速登录（Admin / Member）
- 自定义登录（显示名、邮箱、角色选择）
- `next` 参数支持登录后跳转

### 9. 结账 `/checkout`（占位页）

### 10. 赛事详情 `/matches/[id]`（从文章/预测链接跳转）

---

## 二、API 端点（24 个）

| 类别 | 方法 | 路径 | 说明 |
|------|------|------|------|
| 认证 | POST | `/api/auth/login` | 登录/注册 |
| 认证 | POST | `/api/auth/logout` | 退出登录 |
| 会话 | GET | `/api/session` | 获取当前会话 |
| 购买 | POST | `/api/member/purchase` | 购买会员 |
| 购买 | POST | `/api/content/purchase` | 购买内容 |
| Mock 支付 | POST | `/api/payments/mock/confirm` | 模拟支付成功 |
| Mock 支付 | POST | `/api/payments/mock/fail` | 模拟支付失败 |
| Mock 支付 | POST | `/api/payments/mock/cancel` | 模拟支付取消 |
| 内容管理 | POST | `/api/admin/content/authors` | 创建/编辑/切换作者状态 |
| 内容管理 | POST | `/api/admin/content/plans` | 创建/编辑/发布/归档/热门切换 |
| 内容管理 | POST | `/api/admin/content/bootstrap` | 生成示例内容 |
| 用户管理 | POST | `/api/admin/orders/refund` | 退款处理 |
| 用户管理 | GET | `/api/admin/orders/export` | 导出订单 CSV |
| 数据同步 | GET | `/api/admin/sync` | 触发体育数据同步 |
| AI 导入 | POST | `/api/admin/ai-import` | 批量导入 AI 预测 |
| 工具 | GET | `/api/health` | 健康检查 |
| 工具 | GET | `/api/locale` | 获取/设置语言偏好 |

---

## 三、认证与权限

### 会话系统
- Cookie 会话（30 天有效期），Token 存储于 SQLite
- 无密码登录（MVP 阶段）

### 角色体系
| 角色 | 权限范围 |
|------|----------|
| visitor | 浏览公开内容 |
| member | 会员中心、解锁付费内容 |
| operator | 内容管理 |
| admin | 全部权限 + 用户/订单管理 |

### 权限控制点
- `isAuthenticated` — 已登录
- `activeMembership` — 会员未过期
- `canAccessMemberCenter` — 已登录用户
- `canAccessAdminConsole` — 仅 Admin
- `canManageContent` — 仅 Admin

---

## 四、支付与变现

### 会员套餐（3 档）
月度 / 季度 / 年度，各含价格、时长、权益列表

### 订单类型
- 会员订阅订单
- 单篇内容购买订单

### 订单状态流转
`pending → paid / failed / closed / refunded`

### 支付能力
- Mock 支付流程（成功/失败/取消）
- 管理员退款处理
- 订单 CSV 导出（含高级筛选）
- 支付参考号追踪
- 失败原因元数据记录

---

## 五、体育数据管理

### 支持运动
| 运动 | 状态 |
|------|------|
| 足球 | 完整实现 |
| 篮球 | 完整实现 |
| 板球 | 完整实现（含深度情报） |

### 数据模型
League / Team / Match / OddsSnapshot / StandingSnapshot / ScheduleSnapshot / HeadToHeadSnapshot

### 数据来源
- Mock 数据（始终可用，作为降级方案）
- API-Sports 集成（可选，需配置 `APISPORTS_KEY`）

### 板球专属功能
- 球队情报（摘要、指标）
- 联赛叙事（故事线）
- 赛程补充说明
- 联赛概览卡（联赛级指标）

---

## 六、内容管理

### 文章计划（付费分析）
- 标题、Slug、运动、联赛、开球时间
- 市场摘要、预览文本、完整分析
- 价格、绩效指标、标签、热门标记
- 状态：草稿 / 已发布 / 已归档
- 关联作者、关联赛事

### 作者团队
- 名称、Slug、专注领域、徽章
- 绩效指标：连胜、胜率、月 ROI、粉丝数
- 状态：活跃 / 非活跃

### AI 预测记录
- 运动类型、市场类型、选项、置信度
- 预期边际、解释文本、可解释因子
- 结果追踪：pending / won / lost

---

## 七、国际化（i18n）

| 语言 | 代码 |
|------|------|
| 英语 | `en` |
| 简体中文 | `zh-CN` |
| 繁体中文 | `zh-TW` |

覆盖范围：UI 文案、页面文案、角色标签、赛事状态、运动名称、日期/价格格式化、支付结果消息、管理后台全部文案。

语言检测顺序：Query 参数 → Cookie → 默认值。

---

## 八、UI 组件与设计系统

| 组件 | 说明 |
|------|------|
| `SiteShell` | 主布局容器 |
| `SiteHeader` | 导航头部 |
| `SiteFooter` | 页脚 |
| `LocaleSwitcher` | 语言切换器 |
| `SectionHeading` | 区块标题（eyebrow + title + desc） |
| `ScoreboardTable` | 比分板表格（含筛选） |
| `SummaryCard` | 指标展示卡片 |
| `PaginationControls` | 分页控件 |

设计风格：深色主题（slate/orange/lime 配色）、毛玻璃效果（glass-panel）、响应式网格、圆角卡片（1.2rem–2rem）。

---

## 九、数据库 Schema 概览

```
用户体系
├── User（邮箱、显示名、角色、会员信息）
└── Session（Token、过期时间）

订单体系
├── MembershipOrder（套餐、金额、状态、支付追踪）
└── ContentOrder（内容ID、金额、状态、支付追踪）

体育数据
├── League / Team / Match / OddsSnapshot
└── StandingSnapshot / ScheduleSnapshot / HeadToHeadSnapshot

内容体系
├── AuthorTeam / PredictionRecord
├── ArticlePlan / HomepageModule
└── SyncRun（数据同步记录）
```

---

## 十、功能完成度总览

| 功能模块 | 状态 |
|----------|------|
| 足球实时比分板 | ✅ 完成 |
| 篮球实时比分板 | ✅ 完成 |
| 板球实时比分板 | ✅ 完成 |
| 板球深度情报（情报/叙事/概览）| ✅ 完成 |
| 付费内容（文章计划）| ✅ 完成 |
| 会员订阅体系（3 档）| ✅ 完成 |
| AI 预测展示 | ✅ 完成 |
| 管理后台（内容+用户+订单）| ✅ 完成 |
| Mock 支付流程 | ✅ 完成 |
| 多语言支持（EN/ZH-CN/ZH-TW）| ✅ 完成 |
| 基于角色的访问控制 | ✅ 完成 |
| 体育数据库（积分榜/赛程/球队/H2H）| ✅ 完成 |
| 订单 CSV 导出 | ✅ 完成 |
| 退款管理 | ✅ 完成 |
| 健康检查 API | ✅ 完成 |
| 响应式深色 UI | ✅ 完成 |
| 真实支付网关 | 🔲 待接入 |
| 自动数据同步调度 | 🔲 待实现 |
| 邮件通知 | 🔲 待实现 |
| 用户分析仪表盘 | 🔲 待实现 |
