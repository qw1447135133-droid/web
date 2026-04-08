import type { DisplayLocale } from "@/lib/i18n-config";

export function accountT(
  locale: DisplayLocale,
  zhCn: string,
  zhTw: string,
  en: string,
  th?: string,
  vi?: string,
  hi?: string,
) {
  if (locale === "zh-TW") {
    return zhTw;
  }

  if (locale === "en") {
    return en;
  }

  if (locale === "th") {
    return th ?? en;
  }

  if (locale === "vi") {
    return vi ?? en;
  }

  if (locale === "hi") {
    return hi ?? en;
  }

  return zhCn;
}

export function getAuthCopy(locale: DisplayLocale) {
  return {
    loginEyebrow: accountT(locale, "正式登录", "正式登入", "Secure sign in", "เข้าสู่ระบบ", "Dang nhap", "Secure sign in"),
    loginTitle: accountT(locale, "登录你的会员账号", "登入你的會員帳號", "Sign in to your member account", "เข้าสู่บัญชีสมาชิก", "Dang nhap tai khoan hoi vien", "अपने सदस्य खाते में साइन इन करें"),
    loginDescription: accountT(
      locale,
      "使用邮箱和密码进入个人中心、球币中心、订单记录与消息中心。",
      "使用信箱和密碼進入個人中心、球幣中心、訂單記錄與消息中心。",
      "Use your email and password to open the member workspace, coin center, orders, and notifications.",
      "ใช้ อีเมล และรหัสผ่านเพื่อเข้าสู่ศูนย์สมาชิก เหรียญ รายการสั่งซื้อ และข้อความ",
      "Dung email va mat khau de vao trung tam hoi vien, coin, don hang va thong bao.",
      "ईमेल और पासवर्ड से सदस्य केंद्र, कॉइन सेंटर, ऑर्डर और नोटिफिकेशन खोलें।",
    ),
    registerEyebrow: accountT(locale, "正式注册", "正式註冊", "Create account", "สมัครสมาชิก", "Tao tai khoan", "Create account"),
    registerTitle: accountT(locale, "创建你的会员账号", "建立你的會員帳號", "Create your member account", "สร้างบัญชีสมาชิก", "Tao tai khoan hoi vien", "अपना सदस्य खाता बनाएं"),
    registerDescription: accountT(
      locale,
      "完成注册后会自动进入站内个人中心，并可继续发送邮箱验证。",
      locale === "zh-TW" ? "完成註冊後會自動進入站內個人中心，並可繼續發送信箱驗證。" : "After registration you will enter the member workspace and can continue with email verification.",
      "After registration you will enter the member workspace and can continue with email verification.",
      "หลังสมัครเสร็จจะเข้าสู่ศูนย์สมาชิกและสามารถส่งอีเมลยืนยันต่อได้",
      "Sau khi dang ky, ban se vao workspace hoi vien va co the tiep tuc xac minh email.",
      "रजिस्टर करने के बाद आप सदस्य वर्कस्पेस में जाएंगे और ईमेल सत्यापन जारी रख सकेंगे।",
    ),
    displayName: accountT(locale, "显示名称", "顯示名稱", "Display name", "ชื่อที่แสดง", "Ten hien thi", "Display name"),
    email: accountT(locale, "邮箱", "信箱", "Email", "อีเมล", "Email", "Email"),
    password: accountT(locale, "密码", "密碼", "Password", "รหัสผ่าน", "Mat khau", "Password"),
    passwordHint: accountT(locale, "至少 8 位，建议包含字母和数字。", "至少 8 位，建議包含字母和數字。", "Use at least 8 characters with letters and numbers.", "อย่างน้อย 8 ตัวอักษร", "Toi thieu 8 ky tu", "कम से कम 8 अक्षर"),
    inviteCode: accountT(locale, "邀请码", "邀請碼", "Invite code", "รหัสเชิญ", "Ma moi", "Invite code"),
    preferredLocale: accountT(locale, "偏好语言", "偏好語言", "Preferred language", "ภาษาที่ต้องการ", "Ngon ngu uu tien", "Preferred language"),
    countryCode: accountT(locale, "国家/地区", "國家/地區", "Country / region", "ประเทศ / ภูมิภาค", "Quoc gia / khu vuc", "Country / region"),
    signIn: accountT(locale, "登录", "登入", "Sign in", "เข้าสู่ระบบ", "Dang nhap", "Sign in"),
    createAccount: accountT(locale, "创建账号", "建立帳號", "Create account", "สร้างบัญชี", "Tao tai khoan", "Create account"),
    goRegister: accountT(locale, "没有账号？去注册", "還沒有帳號？去註冊", "No account yet? Register", "ยังไม่มีบัญชี? สมัคร", "Chua co tai khoan? Dang ky", "अभी खाता नहीं है? रजिस्टर करें"),
    goLogin: accountT(locale, "已有账号？去登录", "已有帳號？去登入", "Already registered? Sign in", "มีบัญชีแล้ว? เข้าสู่ระบบ", "Da co tai khoan? Dang nhap", "पहले से खाता है? साइन इन करें"),
    devQuickEntry: accountT(locale, "开发快捷入口", "開發快捷入口", "Development quick entry", "โหมดพัฒนา", "Lo vao dev", "Development quick entry"),
    devQuickDescription: accountT(locale, "仅开发环境可见，用于保留现有后台/会员测试效率。", "僅開發環境可見，用於保留現有後台/會員測試效率。", "Visible in development only to preserve the existing admin/member test flow.", "เห็นได้เฉพาะ dev", "Chi hien trong moi truong dev", "केवल development में"),
  };
}

export function getAccountNavigationCopy(locale: DisplayLocale) {
  return {
    sections: {
      orders: accountT(locale, "我的订单", "我的訂單", "My orders", "คำสั่งซื้อของฉัน", "Don hang cua toi", "My orders"),
      content: accountT(locale, "我的内容", "我的內容", "My content", "คอนเทนต์ของฉัน", "Noi dung cua toi", "My content"),
      coins: accountT(locale, "球币中心", "球幣中心", "Coin center", "ศูนย์เหรียญ", "Trung tam coin", "Coin center"),
      notifications: accountT(locale, "消息中心", "消息中心", "Notifications", "ศูนย์ข้อความ", "Thong bao", "Notifications"),
      profile: accountT(locale, "个人资料", "個人資料", "Profile", "โปรไฟล์", "Ho so", "Profile"),
      email: accountT(locale, "邮箱安全", "信箱安全", "Email security", "ความปลอดภัยอีเมล", "Bao mat email", "Email security"),
      support: accountT(locale, "联系客服", "聯絡客服", "Contact support", "ติดต่อฝ่ายช่วยเหลือ", "Lien he ho tro", "Contact support"),
    },
    unreadSuffix: accountT(locale, "未读", "未讀", "unread", "ยังไม่อ่าน", "chua doc", "unread"),
  };
}

export function getProfilePageCopy(locale: DisplayLocale) {
  return {
    eyebrow: accountT(locale, "资料工作台", "資料工作台", "Profile workspace"),
    title: accountT(locale, "个人资料与偏好", "個人資料與偏好", "Profile and preferences"),
    displayName: accountT(locale, "显示名称", "顯示名稱", "Display name"),
    description: accountT(locale, "维护显示名称、联系方式、语言偏好和地区信息，后续原生壳也会复用这些字段。", "維護顯示名稱、聯絡方式、語言偏好和地區資訊，後續原生殼也會複用這些欄位。", "Maintain your display name, contact details, language preference, and region for both web and future app shells."),
    save: accountT(locale, "保存资料", "儲存資料", "Save profile"),
    locale: accountT(locale, "偏好语言", "偏好語言", "Preferred language"),
    country: accountT(locale, "国家/地区", "國家/地區", "Country / region"),
    contactMethod: accountT(locale, "联系渠道", "聯絡渠道", "Contact channel"),
    contactValue: accountT(locale, "联系信息", "聯絡資訊", "Contact value"),
    emailCardTitle: accountT(locale, "邮箱状态", "信箱狀態", "Email status"),
    emailVerified: accountT(locale, "已验证", "已驗證", "Verified"),
    emailPending: accountT(locale, "待验证", "待驗證", "Pending verification"),
    emailAction: accountT(locale, "前往邮箱安全", "前往信箱安全", "Open email security"),
    appCardEyebrow: accountT(locale, "Web App", "Web App", "Web App"),
    appCardTitle: accountT(locale, "安装与版本", "安裝與版本", "Install and version"),
    appCardDescription: accountT(
      locale,
      "当前版本、热更新版本和安装入口会统一从版本配置读取，后续原生壳可直接复用。",
      "目前版本、熱更新版本和安裝入口會統一從版本配置讀取，後續原生殼可直接複用。",
      "Current version, hot update version, and install entry all read from the same app-version configuration for future shell reuse.",
    ),
    appInstall: accountT(locale, "安装 Web App", "安裝 Web App", "Install Web App"),
    appInstallUnavailable: accountT(locale, "当前浏览器暂不支持安装提示", "目前瀏覽器暫不支援安裝提示", "Install prompt is not available in this browser"),
    appDownload: accountT(locale, "下载壳应用", "下載殼應用", "Download shell"),
    appManifest: accountT(locale, "查看 Manifest", "查看 Manifest", "View manifest"),
    appVersion: accountT(locale, "当前版本", "目前版本", "Current version"),
    appHotUpdate: accountT(locale, "热更新版本", "熱更新版本", "Hot update"),
    appMinimum: accountT(locale, "最低支持版本", "最低支援版本", "Minimum supported"),
    appChannel: accountT(locale, "发布通道", "發布通道", "Release channel"),
    appFullscreen: accountT(locale, "全屏模式", "全螢幕模式", "Fullscreen mode"),
    appInstallEnabled: accountT(locale, "允许安装提示", "允許安裝提示", "Install prompt enabled"),
  };
}

export function getNotificationPageCopy(locale: DisplayLocale) {
  return {
    eyebrow: accountT(locale, "消息中心", "消息中心", "Message center"),
    title: accountT(locale, "订单、充值、会员与客服通知", "訂單、充值、會員與客服通知", "Order, recharge, membership, and support messages"),
    description: accountT(locale, "所有充值结果、会员变更、人工转接和邮箱验证提醒都会进入这里。", "所有充值結果、會員變更、人工轉接和信箱驗證提醒都會進入這裡。", "Recharge results, membership changes, support handoff updates, and email verification reminders all land here."),
    markAllRead: accountT(locale, "全部标记已读", "全部標記已讀", "Mark all as read"),
    markRead: accountT(locale, "标记已读", "標記已讀", "Mark as read"),
    unread: accountT(locale, "未读", "未讀", "Unread"),
    read: accountT(locale, "已读", "已讀", "Read"),
    empty: accountT(locale, "还没有个人消息。充值、会员、客服和邮箱提醒都会汇总到这里。", "還沒有個人消息。充值、會員、客服和信箱提醒都會匯總到這裡。", "No personal notifications yet. Recharge, membership, support, and email reminders all appear here."),
    categories: {
      all: accountT(locale, "全部", "全部", "All"),
      system: accountT(locale, "系统", "系統", "System"),
      recharge: accountT(locale, "充值", "充值", "Recharge"),
      order: accountT(locale, "订单", "訂單", "Orders"),
      membership: accountT(locale, "会员", "會員", "Membership"),
      support: accountT(locale, "客服", "客服", "Support"),
    },
  };
}

export function getEmailSecurityCopy(locale: DisplayLocale) {
  return {
    eyebrow: accountT(locale, "邮箱安全", "信箱安全", "Email security"),
    title: accountT(locale, "邮箱验证与更换邮箱", "信箱驗證與更換信箱", "Email verification and address change"),
    description: accountT(locale, "当前阶段默认使用站内提醒兜底发送验证链接；正式邮件通道接入后可无缝切换。", "目前預設使用站內提醒兜底發送驗證連結；正式郵件通道接入後可無縫切換。", "Verification links are currently delivered through an in-site fallback notification and can later switch to a real mail provider without changing the flow."),
    currentEmail: accountT(locale, "当前邮箱", "目前信箱", "Current email"),
    pendingEmail: accountT(locale, "待切换邮箱", "待切換信箱", "Pending email"),
    verified: accountT(locale, "邮箱已验证", "信箱已驗證", "Email verified"),
    unverified: accountT(locale, "邮箱待验证", "信箱待驗證", "Verification required"),
    nextEmail: accountT(locale, "新邮箱", "新信箱", "New email"),
    sendCurrent: accountT(locale, "发送当前邮箱验证", "傳送目前信箱驗證", "Send verification to current email"),
    sendPending: accountT(locale, "发送新邮箱验证", "傳送新信箱驗證", "Send verification to new email"),
    helper: accountT(locale, "验证链接会同时写入消息中心，便于在未接入 SMTP 时继续完成验证。", "驗證連結會同步寫入消息中心，方便在尚未接入 SMTP 時完成驗證。", "The verification link is also written into your notification center so the flow still works before SMTP is connected."),
  };
}
