import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteAdSlot } from "@/components/site-ad-slot";
import { SectionHeading } from "@/components/section-heading";
import { formatDateTime, formatOdd } from "@/lib/format";
import { getArticlePlans, getAuthorTeams, getSiteAds } from "@/lib/content-data";
import { getCricketMatchDepth } from "@/lib/cricket-depth";
import type { DisplayLocale } from "@/lib/i18n-config";
import { getCurrentDisplayLocale, getCurrentLocale } from "@/lib/i18n";
import { getDatabaseSnapshot, getMatchById, getPredictionByMatchId } from "@/lib/sports-data";
import type { Match } from "@/lib/types";
import { getSiteCopy } from "@/lib/ui-copy";

type Params = Promise<{ id: string }>;

function getCricketMatchCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      pulseEyebrow: "Cricket Pulse",
      pulseTitle: "Live over pulse",
      pulseDescription: "Expose the current over progress, favorite side, total line, and movement so the cricket detail page has an actual trading layer.",
      progressLabel: "Current progress",
      favoriteLabel: "Favorite side",
      totalLabel: "Total line",
      movementLabel: "Line move",
      phaseTitle: "Phase map",
      phaseDescription: "Break the match into powerplay, middle, and death-over pressure so the detail view carries a real innings structure.",
      phaseLinks: {
        schedule: "Open schedule",
        h2h: "Open head to head",
      },
      venueTitle: "Venue and player watch",
      venueDescription: "Add ground bias and the key player triggers most likely to move the live line.",
      watchTitle: "Key player watch",
      watchLinks: {
        teams: "Open team profiles",
        ai: "Open AI predictions",
        plan: "Open linked plan",
      },
      contentEyebrow: "Cricket Content",
      contentTitle: "Related coverage",
      contentDescription: "Bring the closest cricket plans onto the match page so the detail flow leads into paid content instead of ending at raw data.",
      noRelatedPlans: "No related cricket plans are available right now.",
      openPlan: "Open plan",
      archiveTitle: "Archive context",
      archiveDescription: "Bring team form, matchup samples, and the cricket database entry into the match detail flow.",
      archiveLinks: {
        schedule: "Open schedule",
        teams: "Open team profiles",
        h2h: "Open head to head",
        plan: "Open linked plan",
      },
      teamPulseTitle: "Team form",
      h2hTitle: "Matchup samples",
      homeLabel: "Home",
      awayLabel: "Away",
      formLabel: "Form",
      openDatabase: "Open cricket database",
      noArchive: "No cricket archive data is available right now.",
      movement: {
        up: "Up",
        flat: "Flat",
        down: "Down",
      },
    };
  }

  if (locale === "zh-TW") {
    return {
      pulseEyebrow: "Cricket Pulse",
      pulseTitle: "回合脈搏",
      pulseDescription: "把目前回合進度、熱門方、總分線與盤口方向直接放進詳情頁，讓板球詳情頁不只停留在原始數據。",
      progressLabel: "目前進度",
      favoriteLabel: "熱門方",
      totalLabel: "總分線",
      movementLabel: "盤口方向",
      phaseTitle: "回合地圖",
      phaseDescription: "把比賽拆成 powerplay、中段與死亡回合壓力，讓詳情頁具備真正的局內結構。",
      phaseLinks: {
        schedule: "打開賽程",
        h2h: "打開歷史交鋒",
      },
      venueTitle: "場地與球員觀察",
      venueDescription: "把球場偏向和最可能改變即時盤口的關鍵球員一起帶進來。",
      watchTitle: "關鍵球員觀察",
      watchLinks: {
        teams: "打開球隊資料",
        ai: "打開 AI 預測",
        plan: "打開關聯計畫單",
      },
      contentEyebrow: "Cricket Content",
      contentTitle: "相關內容",
      contentDescription: "把最接近這場比賽的板球計畫單帶進詳情頁，讓詳情鏈路可以直接承接內容解讀。",
      noRelatedPlans: "目前沒有可顯示的相關板球計畫單。",
      openPlan: "查看計畫單",
      archiveTitle: "檔案脈絡",
      archiveDescription: "把球隊近況、對戰樣本與板球資料庫入口一起帶進賽事詳情頁。",
      archiveLinks: {
        schedule: "打開賽程",
        teams: "打開球隊資料",
        h2h: "打開歷史交鋒",
        plan: "打開關聯計畫單",
      },
      teamPulseTitle: "球隊狀態",
      h2hTitle: "對戰樣本",
      homeLabel: "主場",
      awayLabel: "客場",
      formLabel: "近期",
      openDatabase: "打開板球資料庫",
      noArchive: "目前沒有可顯示的板球檔案資料。",
      movement: {
        up: "上行",
        flat: "持平",
        down: "下行",
      },
    };
  }

  if (locale === "th" || locale === "vi" || locale === "hi") {
    return {
      pulseEyebrow: "Cricket Pulse",
      pulseTitle: locale === "th" ? "ชีพจรโอเวอร์สด" : locale === "vi" ? "Nhip over truc tiep" : "Live over pulse",
      pulseDescription:
        locale === "th"
          ? "แสดงความคืบหน้าโอเวอร์ ฝั่งต่อ เส้นรวม และทิศทางราคา เพื่อให้หน้ารายละเอียด cricket มีชั้นข้อมูลจริง"
          : locale === "vi"
            ? "Hien tien do over, cua tren, tong line va huong di chuyen de trang detail cricket co lop giao dich thuc su."
            : "Expose the current over progress, favorite side, total line, and movement so the cricket detail page has an actual trading layer.",
      progressLabel: locale === "th" ? "ความคืบหน้า" : locale === "vi" ? "Tien do hien tai" : "Current progress",
      favoriteLabel: locale === "th" ? "ฝั่งต่อ" : locale === "vi" ? "Cua tren" : "Favorite side",
      totalLabel: locale === "th" ? "เส้นรวม" : locale === "vi" ? "Tong line" : "Total line",
      movementLabel: locale === "th" ? "การขยับราคา" : locale === "vi" ? "Di chuyen line" : "Line move",
      phaseTitle: locale === "th" ? "แผนที่ช่วงเกม" : locale === "vi" ? "Ban do giai doan" : "Phase map",
      phaseDescription:
        locale === "th"
          ? "แยกแมตช์เป็น powerplay ช่วงกลาง และ death overs เพื่อให้หน้ารายละเอียดมีโครงสร้างอินนิ่งที่ชัดเจน"
          : locale === "vi"
            ? "Tach tran thanh powerplay, giai doan giua va death overs de detail co cau truc innings ro rang."
            : "Break the match into powerplay, middle, and death-over pressure so the detail view carries a real innings structure.",
      phaseLinks: {
        schedule: locale === "th" ? "เปิดตารางแข่ง" : locale === "vi" ? "Mo lich dau" : "Open schedule",
        h2h: locale === "th" ? "เปิด H2H" : locale === "vi" ? "Mo H2H" : "Open head to head",
      },
      venueTitle: locale === "th" ? "สนามและผู้เล่นน่าจับตา" : locale === "vi" ? "San dau va nguoi choi can theo doi" : "Venue and player watch",
      venueDescription:
        locale === "th"
          ? "เพิ่มแนวโน้มสนามและผู้เล่นสำคัญที่มีผลต่อราคา live มากที่สุด"
          : locale === "vi"
            ? "Them xu huong san dau va cac trigger cau thu co kha nang tac dong len line live."
            : "Add ground bias and the key player triggers most likely to move the live line.",
      watchTitle: locale === "th" ? "ผู้เล่นสำคัญ" : locale === "vi" ? "Theo doi cau thu" : "Key player watch",
      watchLinks: {
        teams: locale === "th" ? "เปิดโปรไฟล์ทีม" : locale === "vi" ? "Mo ho so doi" : "Open team profiles",
        ai: locale === "th" ? "เปิด AI" : locale === "vi" ? "Mo AI predictions" : "Open AI predictions",
        plan: locale === "th" ? "เปิดแผนที่เชื่อม" : locale === "vi" ? "Mo plan lien ket" : "Open linked plan",
      },
      contentEyebrow: "Cricket Content",
      contentTitle: locale === "th" ? "คอนเทนต์ที่เกี่ยวข้อง" : locale === "vi" ? "Noi dung lien quan" : "Related coverage",
      contentDescription:
        locale === "th"
          ? "ดึงแผน cricket ที่ใกล้ที่สุดเข้ามาในหน้าแมตช์"
          : locale === "vi"
            ? "Dua cac cricket plan gan nhat vao trang tran dau."
            : "Bring the closest cricket plans onto the match page so the detail flow leads into paid content instead of ending at raw data.",
      noRelatedPlans: locale === "th" ? "ยังไม่มีแผน cricket ที่เกี่ยวข้อง" : locale === "vi" ? "Chua co cricket plan lien quan." : "No related cricket plans are available right now.",
      openPlan: locale === "th" ? "ดูแผน" : locale === "vi" ? "Mo plan" : "Open plan",
      archiveTitle: locale === "th" ? "บริบทคลังข้อมูล" : locale === "vi" ? "Boi canh luu tru" : "Archive context",
      archiveDescription:
        locale === "th"
          ? "นำฟอร์มทีม ตัวอย่างการเจอกัน และทางเข้าฐานข้อมูล cricket มาไว้ใน flow รายละเอียดแมตช์"
          : locale === "vi"
            ? "Dua phong do doi, mau doi dau va loi vao cricket database vao flow detail."
            : "Bring team form, matchup samples, and the cricket database entry into the match detail flow.",
      archiveLinks: {
        schedule: locale === "th" ? "เปิดตารางแข่ง" : locale === "vi" ? "Mo lich dau" : "Open schedule",
        teams: locale === "th" ? "เปิดโปรไฟล์ทีม" : locale === "vi" ? "Mo ho so doi" : "Open team profiles",
        h2h: locale === "th" ? "เปิด H2H" : locale === "vi" ? "Mo H2H" : "Open head to head",
        plan: locale === "th" ? "เปิดแผนที่เชื่อม" : locale === "vi" ? "Mo plan lien ket" : "Open linked plan",
      },
      teamPulseTitle: locale === "th" ? "ฟอร์มทีม" : locale === "vi" ? "Phong do doi" : "Team form",
      h2hTitle: locale === "th" ? "ตัวอย่างการเจอกัน" : locale === "vi" ? "Mau doi dau" : "Matchup samples",
      homeLabel: locale === "th" ? "เหย้า" : locale === "vi" ? "San nha" : "Home",
      awayLabel: locale === "th" ? "เยือน" : locale === "vi" ? "San khach" : "Away",
      formLabel: locale === "th" ? "ฟอร์ม" : locale === "vi" ? "Phong do" : "Form",
      openDatabase: locale === "th" ? "เปิดฐานข้อมูล cricket" : locale === "vi" ? "Mo cricket database" : "Open cricket database",
      noArchive: locale === "th" ? "ยังไม่มีข้อมูลคลัง cricket" : locale === "vi" ? "Chua co du lieu luu tru cricket." : "No cricket archive data is available right now.",
      movement: {
        up: locale === "th" ? "ขึ้น" : locale === "vi" ? "Tang" : "Up",
        flat: locale === "th" ? "ทรงตัว" : locale === "vi" ? "Di ngang" : "Flat",
        down: locale === "th" ? "ลง" : locale === "vi" ? "Giam" : "Down",
      },
    };
  }

  return {
    pulseEyebrow: "Cricket Pulse",
    pulseTitle: "回合脉搏",
    pulseDescription: "把当前回合进度、热门方、总分线和盘口方向直接放进详情页，让板球详情页不只是原始数据。",
    progressLabel: "当前进度",
    favoriteLabel: "热门方",
    totalLabel: "总分线",
    movementLabel: "盘口方向",
    phaseTitle: "回合地图",
    phaseDescription: "把比赛拆成 powerplay、中段和死亡回合压力，让详情页具备真正的局内结构。",
    phaseLinks: {
      schedule: "打开赛程",
      h2h: "打开历史交锋",
    },
    venueTitle: "场地与球员观察",
    venueDescription: "把球场倾向和最可能改变即时盘口的关键球员一起带进来。",
    watchTitle: "关键球员观察",
    watchLinks: {
      teams: "打开球队资料",
      ai: "打开 AI 预测",
      plan: "打开关联计划单",
    },
    contentEyebrow: "Cricket Content",
    contentTitle: "相关内容",
    contentDescription: "把最接近这场比赛的板球计划单带进详情页，让详情链路可以直接承接内容解读。",
    noRelatedPlans: "当前没有可显示的相关板球计划单。",
    openPlan: "查看计划单",
    archiveTitle: "档案脉络",
    archiveDescription: "把球队近况、对战样本和板球资料库入口一起带进赛事详情页。",
    archiveLinks: {
      schedule: "打开赛程",
      teams: "打开球队资料",
      h2h: "打开历史交锋",
      plan: "打开关联计划单",
    },
    teamPulseTitle: "球队状态",
    h2hTitle: "对战样本",
    homeLabel: "主场",
    awayLabel: "客场",
    formLabel: "近期",
    openDatabase: "打开板球资料库",
    noArchive: "当前没有可显示的板球档案资料。",
    movement: {
      up: "上行",
      flat: "持平",
      down: "下行",
    },
  };
}

function getEsportsMatchCopy(locale: DisplayLocale) {
  if (locale === "en") {
    return {
      pulseEyebrow: "Esports Pulse",
      pulseTitle: "Series pulse",
      pulseDescription: "Expose current series state, market lean, total line, and movement so the esports detail page behaves like a real channel layer instead of a plain score view.",
      progressLabel: "Current state",
      favoriteLabel: "Market lean",
      totalLabel: "Map / round total",
      movementLabel: "Line move",
      featureTitle: "Game keys",
      featureDescription: "Switch the metric cards by title while keeping one unified esports detail route.",
      contentTitle: "Related coverage",
      contentDescription: "Bring the linked esports plans and AI angle directly onto the match page.",
      openPlan: "Open plan",
      noRelatedPlans: "No related esports plans are available right now.",
      archiveTitle: "Archive context",
      archiveDescription: "Bring league samples, team form, and database links into the match detail flow.",
      archivePulseTitle: "Team form",
      archiveSamplesTitle: "Series samples",
      openDatabase: "Open esports database",
      openAi: "Open esports AI",
      movement: {
        up: "Up",
        flat: "Flat",
        down: "Down",
      },
    };
  }

  if (locale === "zh-TW") {
    return {
      pulseEyebrow: "Esports Pulse",
      pulseTitle: "系列賽脈搏",
      pulseDescription: "把目前系列賽狀態、熱門方、總盤和盤口方向直接放進詳情頁，讓電競詳情頁更像真正的頻道層。",
      progressLabel: "目前狀態",
      favoriteLabel: "市場傾向",
      totalLabel: "地圖 / 回合總盤",
      movementLabel: "盤口方向",
      featureTitle: "項目指標",
      featureDescription: "保持同一路由骨架，只按不同項目切換關鍵指標卡內容。",
      contentTitle: "相關內容",
      contentDescription: "把對應電競計畫單與 AI 角度直接承接到比賽詳情頁。",
      openPlan: "查看計畫",
      noRelatedPlans: "目前沒有可顯示的相關電競計畫單。",
      archiveTitle: "檔案脈絡",
      archiveDescription: "把聯賽樣本、戰隊狀態和資料庫入口一起帶進電競詳情鏈路。",
      archivePulseTitle: "戰隊狀態",
      archiveSamplesTitle: "系列賽樣本",
      openDatabase: "打開電競資料庫",
      openAi: "打開電競 AI",
      movement: {
        up: "上行",
        flat: "持平",
        down: "下行",
      },
    };
  }

  if (locale === "th" || locale === "vi" || locale === "hi") {
    return {
      pulseEyebrow: "Esports Pulse",
      pulseTitle: locale === "th" ? "ชีพจรซีรีส์" : locale === "vi" ? "Nhip series" : "Series pulse",
      pulseDescription:
        locale === "th"
          ? "แสดงสถานะซีรีส์ มุมมองตลาด เส้นรวม และการขยับราคา เพื่อให้หน้ารายละเอียดอีสปอร์ตทำงานเหมือน channel layer จริง"
          : locale === "vi"
            ? "Hien trang thai series, xu huong thi truong, tong line va bien dong de trang detail esports giong mot lop kenh thuc su."
            : "Expose current series state, market lean, total line, and movement so the esports detail page behaves like a real channel layer instead of a plain score view.",
      progressLabel: locale === "th" ? "สถานะปัจจุบัน" : locale === "vi" ? "Trang thai hien tai" : "Current state",
      favoriteLabel: locale === "th" ? "มุมมองตลาด" : locale === "vi" ? "Xu huong thi truong" : "Market lean",
      totalLabel: locale === "th" ? "รวมแผนที่ / รอบ" : locale === "vi" ? "Tong map / round" : "Map / round total",
      movementLabel: locale === "th" ? "การขยับราคา" : locale === "vi" ? "Di chuyen line" : "Line move",
      featureTitle: locale === "th" ? "คีย์ของเกม" : locale === "vi" ? "Chi so theo game" : "Game keys",
      featureDescription:
        locale === "th"
          ? "ใช้โครงรายละเอียดเดียว แล้วสลับการ์ดตัวชี้วัดตามแต่ละเกม"
          : locale === "vi"
            ? "Giu mot khung detail thong nhat va doi the chi so theo tua game."
            : "Switch the metric cards by title while keeping one unified esports detail route.",
      contentTitle: locale === "th" ? "คอนเทนต์ที่เกี่ยวข้อง" : locale === "vi" ? "Noi dung lien quan" : "Related coverage",
      contentDescription:
        locale === "th"
          ? "นำแผนและ AI angle ที่เชื่อมโยงมาแสดงบนหน้าแมตช์โดยตรง"
          : locale === "vi"
            ? "Dua plan esports va AI angle lien ket len ngay trang match."
            : "Bring the linked esports plans and AI angle directly onto the match page.",
      openPlan: locale === "th" ? "ดูแผน" : locale === "vi" ? "Mo plan" : "Open plan",
      noRelatedPlans: locale === "th" ? "ยังไม่มีแผนอีสปอร์ตที่เกี่ยวข้อง" : locale === "vi" ? "Chua co esports plan lien quan." : "No related esports plans are available right now.",
      archiveTitle: locale === "th" ? "บริบทคลังข้อมูล" : locale === "vi" ? "Boi canh luu tru" : "Archive context",
      archiveDescription:
        locale === "th"
          ? "นำตัวอย่างลีก ฟอร์มทีม และลิงก์ฐานข้อมูลเข้ามาใน flow รายละเอียดแมตช์"
          : locale === "vi"
            ? "Dua mau giai dau, phong do doi va lien ket database vao flow detail."
            : "Bring league samples, team form, and database links into the match detail flow.",
      archivePulseTitle: locale === "th" ? "ฟอร์มทีม" : locale === "vi" ? "Phong do doi" : "Team form",
      archiveSamplesTitle: locale === "th" ? "ตัวอย่างซีรีส์" : locale === "vi" ? "Mau series" : "Series samples",
      openDatabase: locale === "th" ? "เปิดฐานข้อมูลอีสปอร์ต" : locale === "vi" ? "Mo esports database" : "Open esports database",
      openAi: locale === "th" ? "เปิด AI อีสปอร์ต" : locale === "vi" ? "Mo esports AI" : "Open esports AI",
      movement: {
        up: locale === "th" ? "ขึ้น" : locale === "vi" ? "Tang" : "Up",
        flat: locale === "th" ? "ทรงตัว" : locale === "vi" ? "Di ngang" : "Flat",
        down: locale === "th" ? "ลง" : locale === "vi" ? "Giam" : "Down",
      },
    };
  }

  return {
    pulseEyebrow: "Esports Pulse",
    pulseTitle: "系列赛脉搏",
    pulseDescription: "把当前系列赛状态、热门方、总盘和盘口方向直接放进详情页，让电竞详情页更像真正的频道层。",
    progressLabel: "当前状态",
    favoriteLabel: "市场倾向",
    totalLabel: "地图 / 回合总盘",
    movementLabel: "盘口方向",
    featureTitle: "项目指标",
    featureDescription: "保持同一路由骨架，只按不同项目切换关键指标卡内容。",
    contentTitle: "相关内容",
    contentDescription: "把对应电竞计划单与 AI 角度直接承接到比赛详情页。",
    openPlan: "查看计划",
    noRelatedPlans: "当前没有可显示的相关电竞计划单。",
    archiveTitle: "档案脉络",
    archiveDescription: "把联赛样本、战队状态和资料库入口一起带进电竞详情链路。",
    archivePulseTitle: "战队状态",
    archiveSamplesTitle: "系列赛样本",
    openDatabase: "打开电竞资料库",
    openAi: "打开电竞 AI",
    movement: {
      up: "上行",
      flat: "持平",
      down: "下行",
    },
  };
}

function getEsportsMetricCards(match: Match, locale: DisplayLocale) {
  const normalizedLocale = locale === "th" || locale === "vi" || locale === "hi" ? "en" : locale;

  if (match.leagueSlug === "lpl") {
    if (normalizedLocale === "en") {
      return [
        { label: "Gold delta", value: "2.1k @ 20m", detail: "T1's Herald setups keep creating a cleaner mid-game economy lead." },
        { label: "Resource control", value: "Herald 2 | Drake 3", detail: "The first two neutral cycles are usually deciding the lane swap tempo." },
        { label: "Series score", value: match.score, detail: "Track whether BLG can slow the side-lane bleed before map point arrives." },
      ];
    }

    if (normalizedLocale === "zh-TW") {
      return [
        { label: "經濟差", value: "20 分鐘 2.1k", detail: "T1 的先鋒落點讓中期經濟優勢更容易滾大。" },
        { label: "資源控制", value: "先鋒 2 | 小龍 3", detail: "前兩波中立資源幾乎決定這組對局的轉線節奏。" },
        { label: "系列賽比分", value: match.score, detail: "觀察 BLG 能否在賽點前先把邊線失血壓住。" },
      ];
    }

    return [
      { label: "经济差", value: "20 分钟 2.1k", detail: "T1 的先锋落点让中期经济优势更容易滚大。" },
      { label: "资源控制", value: "先锋 2 | 小龙 3", detail: "前两波中立资源几乎决定这组对局的转线节奏。" },
      { label: "系列赛比分", value: match.score, detail: "观察 BLG 能否在赛点前先把边线失血压住。" },
    ];
  }

  if (match.leagueSlug === "dreamleague") {
    if (normalizedLocale === "en") {
      return [
        { label: "Kill pace", value: "1.08 KPM", detail: "The series is drifting toward long teamfight chains rather than early snowball drafts." },
        { label: "Objective control", value: "Roshan 2 | Towers 16", detail: "Roshan windows are the cleanest read on which side owns the map." },
        { label: "Series score", value: match.score, detail: "Map count matters more here because both teams remain strong in buyback-heavy finishes." },
      ];
    }

    if (normalizedLocale === "zh-TW") {
      return [
        { label: "擊殺節奏", value: "1.08 KPM", detail: "這組系列賽更偏向長團與拉扯，而不是前期雪球陣容。" },
        { label: "目標控制", value: "Roshan 2 | 塔 16", detail: "Roshan 視窗通常是判斷哪一方掌控地圖的最佳指標。" },
        { label: "系列賽比分", value: match.score, detail: "這組對局更要關注地圖數，因為雙方都很擅長買活後的終盤處理。" },
      ];
    }

    return [
      { label: "击杀节奏", value: "1.08 KPM", detail: "这组系列赛更偏向长团与拉扯，而不是前期雪球阵容。" },
      { label: "目标控制", value: "Roshan 2 | 塔 16", detail: "Roshan 窗口通常是判断哪一方掌控地图的最佳指标。" },
      { label: "系列赛比分", value: match.score, detail: "这组对局更要关注地图数，因为双方都很擅长买活后的终盘处理。" },
    ];
  }

  if (normalizedLocale === "en") {
    return [
      { label: "Pistol rounds", value: "2-0", detail: "Early round control is shaping the whole economy tree in this series." },
      { label: "Side split", value: "CT 71%", detail: "Vitality's stronger defensive halves are still the most repeatable edge." },
      { label: "Series score", value: match.score, detail: "Watch whether NAVI can recover the late-round trade discipline before the next map." },
    ];
  }

  if (normalizedLocale === "zh-TW") {
    return [
      { label: "手槍局", value: "2-0", detail: "開局回合控制正在決定整組系列賽的經濟樹。" },
      { label: "攻防側分佈", value: "CT 71%", detail: "Vitality 更穩的防守半場仍是最容易重複兌現的優勢。" },
      { label: "系列賽比分", value: match.score, detail: "觀察 NAVI 能否在下一張地圖前修回殘局交易紀律。" },
    ];
  }

  return [
    { label: "手枪局", value: "2-0", detail: "开局回合控制正在决定整组系列赛的经济树。" },
    { label: "攻防侧分布", value: "CT 71%", detail: "Vitality 更稳的防守半场仍是最容易重复兑现的优势。" },
    { label: "系列赛比分", value: match.score, detail: "观察 NAVI 能否在下一张地图前修回残局交易纪律。" },
  ];
}

function getFavorite(match: Match) {
  const candidates = [
    { team: match.homeTeam, odd: match.odds.home },
    { team: match.awayTeam, odd: match.odds.away },
  ].filter((item): item is { team: string; odd: number } => typeof item.odd === "number" && Number.isFinite(item.odd));

  if (candidates.length === 0) {
    return null;
  }

  return [...candidates].sort((left, right) => left.odd - right.odd)[0];
}

export default async function MatchDetailPage({ params }: { params: Params }) {
  const [locale, displayLocale] = await Promise.all([getCurrentLocale(), getCurrentDisplayLocale()]);
  const { matchDetailCopy, matchStatusLabels } = getSiteCopy(displayLocale);
  const cricketMatchCopy = getCricketMatchCopy(displayLocale);
  const esportsMatchCopy = getEsportsMatchCopy(displayLocale);
  const { id } = await params;
  const match = await getMatchById(id, locale);

  if (!match) {
    notFound();
  }

  const [prediction, plans, authors, matchDetailAds] = await Promise.all([
    getPredictionByMatchId(match.id, locale),
    match.sport === "cricket" || match.sport === "esports" ? getArticlePlans(match.sport, locale) : Promise.resolve([]),
    match.sport === "cricket" || match.sport === "esports" ? getAuthorTeams(locale) : Promise.resolve([]),
    getSiteAds(locale, "match-detail-inline"),
  ]);
  const cricketSnapshot = match.sport === "cricket" ? await getDatabaseSnapshot("cricket", match.leagueSlug, locale) : null;
  const esportsSnapshot = match.sport === "esports" ? await getDatabaseSnapshot("esports", match.leagueSlug, locale) : null;
  const cricketDepth = match.sport === "cricket" ? getCricketMatchDepth(match.id, locale) : null;
  const esportsMetricCards = match.sport === "esports" ? getEsportsMetricCards(match, displayLocale) : [];
  const spreadLabel =
    displayLocale === "en"
      ? "Spread"
      : displayLocale === "zh-TW"
        ? "讓分"
        : displayLocale === "th"
          ? "แต้มต่อ"
          : displayLocale === "vi"
            ? "Keo chap"
            : displayLocale === "hi"
              ? "Spread"
              : "让分";
  const totalLabel =
    displayLocale === "en"
      ? "Total"
      : displayLocale === "zh-TW"
        ? "總分"
        : displayLocale === "th"
          ? "รวม"
          : displayLocale === "vi"
            ? "Tong"
            : displayLocale === "hi"
              ? "Total"
              : "总分";
  const favorite = match.sport === "cricket" || match.sport === "esports" ? getFavorite(match) : null;
  const relatedPlans =
    match.sport === "cricket" || match.sport === "esports"
      ? plans.filter((plan) => plan.matchId === match.id).slice(0, 2)
      : [];
  const archiveTeams =
    match.sport === "cricket"
      ? (cricketSnapshot?.teams ?? []).filter((team) => team.name === match.homeTeam || team.name === match.awayTeam)
      : [];
  const archiveH2H = match.sport === "cricket" ? (cricketSnapshot?.h2h ?? []).slice(0, 2) : [];
  const archiveActionLinks =
    match.sport === "cricket"
      ? [
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=schedule`, label: cricketMatchCopy.archiveLinks.schedule },
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=teams`, label: cricketMatchCopy.archiveLinks.teams },
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=h2h`, label: cricketMatchCopy.archiveLinks.h2h },
          ...(relatedPlans[0]
            ? [{ href: `/plans/${relatedPlans[0].slug}`, label: cricketMatchCopy.archiveLinks.plan }]
            : []),
        ]
      : [];
  const phaseActionLinks =
    match.sport === "cricket"
      ? [
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=schedule`, label: cricketMatchCopy.phaseLinks.schedule },
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=h2h`, label: cricketMatchCopy.phaseLinks.h2h },
        ]
      : [];
  const watchActionLinks =
    match.sport === "cricket"
      ? [
          { href: `/database?sport=cricket&league=${match.leagueSlug}&view=teams`, label: cricketMatchCopy.watchLinks.teams },
          { href: "/ai-predictions", label: cricketMatchCopy.watchLinks.ai },
          ...(relatedPlans[0]
            ? [{ href: `/plans/${relatedPlans[0].slug}`, label: cricketMatchCopy.watchLinks.plan }]
            : []),
        ]
      : [];
  const esportsArchiveTeams =
    match.sport === "esports"
      ? (esportsSnapshot?.teams ?? []).filter((team) => team.name === match.homeTeam || team.name === match.awayTeam)
      : [];
  const esportsArchiveH2H = match.sport === "esports" ? (esportsSnapshot?.h2h ?? []).slice(0, 2) : [];
  const esportsArchiveActionLinks =
    match.sport === "esports"
      ? [
          { href: `/database?sport=esports&league=${match.leagueSlug}&view=standings`, label: esportsMatchCopy.openDatabase },
          {
            href: `/database?sport=esports&league=${match.leagueSlug}&view=teams`,
            label:
              displayLocale === "en"
                ? "Team profiles"
                : displayLocale === "zh-TW"
                  ? "戰隊資料"
                  : displayLocale === "th"
                    ? "โปรไฟล์ทีม"
                    : displayLocale === "vi"
                      ? "Ho so doi"
                      : displayLocale === "hi"
                        ? "Team profiles"
                        : "战队资料",
          },
          {
            href: `/database?sport=esports&league=${match.leagueSlug}&view=h2h`,
            label:
              displayLocale === "en"
                ? "Series samples"
                : displayLocale === "zh-TW"
                  ? "系列賽樣本"
                  : displayLocale === "th"
                    ? "ตัวอย่างซีรีส์"
                    : displayLocale === "vi"
                      ? "Mau series"
                      : displayLocale === "hi"
                        ? "Series samples"
                        : "系列赛样本",
          },
        ]
      : [];
  const matchHubEyebrow =
    displayLocale === "zh-TW"
      ? "賽事中樞"
      : displayLocale === "th"
        ? "ศูนย์กลางแมตช์"
        : displayLocale === "vi"
          ? "Trung tam tran dau"
          : displayLocale === "hi"
            ? "मैच हब"
            : displayLocale === "en"
              ? "Match Hub"
              : "赛事中枢";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-6 lg:px-8">
      <section className="glass-panel rounded-[2rem] p-6 sm:p-8">
        <SectionHeading eyebrow={matchHubEyebrow} title={`${match.homeTeam} vs ${match.awayTeam}`} description={match.insight} />

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.kickoff}</p>
            <p className="mt-2 text-lg font-semibold text-white">{formatDateTime(match.kickoff, displayLocale)}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.matchStatus}</p>
            <p className="mt-2 text-lg font-semibold text-orange-200">{matchStatusLabels[match.status]}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.currentScore}</p>
            <p className="mt-2 text-lg font-semibold text-white">{match.score}</p>
          </div>
          <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
            <p className="text-sm text-slate-500">{matchDetailCopy.venue}</p>
            <p className="mt-2 text-lg font-semibold text-white">{match.venue}</p>
          </div>
        </div>
      </section>

      <SiteAdSlot ads={matchDetailAds} locale={displayLocale} />

      {match.sport === "cricket" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.pulseTitle}
              description={cricketMatchCopy.pulseDescription}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.progressLabel}</p>
                <p className="mt-2 text-lg font-semibold text-white">{match.clock ?? matchStatusLabels[match.status]}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.favoriteLabel}</p>
                <p className="mt-2 text-lg font-semibold text-orange-200">
                  {favorite ? `${favorite.team} ${formatOdd(favorite.odd)}` : "--"}
                </p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.totalLabel}</p>
                <p className="mt-2 text-lg font-semibold text-white">{match.odds.total}</p>
              </div>
              <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                <p className="text-sm text-slate-500">{cricketMatchCopy.movementLabel}</p>
                <p className="mt-2 text-lg font-semibold text-white">{cricketMatchCopy.movement[match.odds.movement]}</p>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.contentEyebrow}
              title={cricketMatchCopy.contentTitle}
              description={cricketMatchCopy.contentDescription}
            />
            {relatedPlans.length > 0 ? (
              <div className="mt-6 space-y-4">
                {relatedPlans.map((plan) => {
                  const author = authors.find((item) => item.id === plan.authorId);

                  return (
                    <article key={plan.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.performance}</span>
                        <span className="text-sm font-semibold text-orange-200">{plan.marketSummary}</span>
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-white">{plan.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{plan.teaser}</p>
                      <p className="mt-4 text-sm text-slate-500">{author?.name ?? "--"}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="flex flex-wrap gap-2">
                          {plan.tags.slice(0, 2).map((tag) => (
                            <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/plans/${plan.slug}`}
                          className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                        >
                          {cricketMatchCopy.openPlan}
                        </Link>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                {cricketMatchCopy.noRelatedPlans}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {match.sport === "cricket" && cricketDepth ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.phaseTitle}
              description={cricketMatchCopy.phaseDescription}
            />
            <div className="mt-6 grid gap-4">
              {cricketDepth.phaseCards.map((phase) => (
                <article key={phase.label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="text-base font-semibold text-white">{phase.label}</h3>
                    <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{phase.note}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{match.homeTeam}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{phase.homeValue}</p>
                    </div>
                    <div className="rounded-2xl bg-slate-950/35 p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{match.awayTeam}</p>
                      <p className="mt-2 text-lg font-semibold text-white">{phase.awayValue}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {phaseActionLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {phaseActionLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.venueTitle}
              description={cricketMatchCopy.venueDescription}
            />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {cricketDepth.venueCards.map((card) => (
                <article key={card.label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                  <p className="mt-3 text-xl font-semibold text-white">{card.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{card.detail}</p>
                </article>
              ))}
            </div>
            {watchActionLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {watchActionLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
            <p className="section-label mt-6">{cricketMatchCopy.watchTitle}</p>
            <div className="mt-4 space-y-4">
              {cricketDepth.playerWatch.map((player) => (
                <article key={player.name} className="rounded-[1.25rem] border border-lime-300/10 bg-lime-300/5 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-white">{player.name}</h3>
                      <p className="mt-1 text-sm text-slate-400">
                        {player.team} | {player.role}
                      </p>
                    </div>
                    <span className="rounded-full bg-lime-300/10 px-3 py-1 text-xs text-lime-100">{player.trend}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{player.note}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {match.sport === "cricket" ? (
        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.archiveTitle}
              description={cricketMatchCopy.archiveDescription}
            />
            {archiveActionLinks.length > 0 ? (
              <div className="mt-6 flex flex-wrap gap-3">
                {archiveActionLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ) : null}
            {archiveTeams.length > 0 ? (
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                {archiveTeams.map((team) => (
                  <article key={team.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{team.name}</h3>
                        <p className="mt-1 text-sm text-slate-400">{team.shortName}</p>
                      </div>
                      <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs text-sky-100">#{team.ranking}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-2xl bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketMatchCopy.formLabel}</p>
                        <p className="mt-2 text-white">{team.form}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketMatchCopy.homeLabel}</p>
                        <p className="mt-2 text-white">{team.homeRecord}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-950/35 p-3">
                        <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{cricketMatchCopy.awayLabel}</p>
                        <p className="mt-2 text-white">{team.awayRecord}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                {cricketMatchCopy.noArchive}
              </div>
            )}
          </div>

          <div className="glass-panel rounded-[2rem] p-6">
            <SectionHeading
              eyebrow={cricketMatchCopy.pulseEyebrow}
              title={cricketMatchCopy.h2hTitle}
              description={cricketMatchCopy.archiveDescription}
            />
            {archiveH2H.length > 0 ? (
              <div className="mt-6 space-y-4">
                {archiveH2H.map((row) => (
                  <article key={`${row.season}-${row.fixture}`} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="font-medium text-white">{row.fixture}</p>
                      <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{row.tag}</span>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{row.season}</p>
                  </article>
                ))}
                <Link
                  href={`/database?sport=cricket&league=${match.leagueSlug}&view=h2h`}
                  className="inline-flex rounded-full border border-lime-300/18 bg-lime-300/6 px-4 py-2 text-sm text-lime-100 transition hover:border-lime-300/35 hover:bg-lime-300/12"
                >
                  {cricketMatchCopy.openDatabase}
                </Link>
              </div>
            ) : (
              <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                {cricketMatchCopy.noArchive}
              </div>
            )}
          </div>
        </section>
      ) : null}

      {match.sport === "esports" ? (
        <>
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={esportsMatchCopy.pulseEyebrow}
                title={esportsMatchCopy.pulseTitle}
                description={esportsMatchCopy.pulseDescription}
              />
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-500">{esportsMatchCopy.progressLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{match.clock ?? matchStatusLabels[match.status]}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-500">{esportsMatchCopy.favoriteLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-orange-200">
                    {favorite ? `${favorite.team} ${formatOdd(favorite.odd)}` : "--"}
                  </p>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-500">{esportsMatchCopy.totalLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{match.odds.total}</p>
                </div>
                <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="text-sm text-slate-500">{esportsMatchCopy.movementLabel}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{esportsMatchCopy.movement[match.odds.movement]}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={esportsMatchCopy.pulseEyebrow}
                title={esportsMatchCopy.contentTitle}
                description={esportsMatchCopy.contentDescription}
              />
              {relatedPlans.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {relatedPlans.map((plan) => {
                    const author = authors.find((item) => item.id === plan.authorId);

                    return (
                      <article key={plan.id} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-slate-300">{plan.performance}</span>
                          <span className="text-sm font-semibold text-orange-200">{plan.marketSummary}</span>
                        </div>
                        <h3 className="mt-4 text-lg font-semibold text-white">{plan.title}</h3>
                        <p className="mt-3 text-sm leading-7 text-slate-400">{plan.teaser}</p>
                        <p className="mt-4 text-sm text-slate-500">{author?.name ?? "--"}</p>
                        <div className="mt-4 flex items-center justify-between gap-3">
                          <div className="flex flex-wrap gap-2">
                            {plan.tags.slice(0, 2).map((tag) => (
                              <span key={tag} className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                                {tag}
                              </span>
                            ))}
                          </div>
                          <Link
                            href={`/plans/${plan.slug}`}
                            className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-orange-300/30 hover:text-white"
                          >
                            {esportsMatchCopy.openPlan}
                          </Link>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
                  {esportsMatchCopy.noRelatedPlans}
                </div>
              )}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={esportsMatchCopy.pulseEyebrow}
                title={esportsMatchCopy.featureTitle}
                description={esportsMatchCopy.featureDescription}
              />
              <div className="mt-6 grid gap-4">
                {esportsMetricCards.map((card) => (
                  <article key={card.label} className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{card.label}</p>
                    <p className="mt-3 text-xl font-semibold text-white">{card.value}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">{card.detail}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-[2rem] p-6">
              <SectionHeading
                eyebrow={esportsMatchCopy.pulseEyebrow}
                title={esportsMatchCopy.archiveTitle}
                description={esportsMatchCopy.archiveDescription}
              />
              {esportsArchiveActionLinks.length > 0 ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {esportsArchiveActionLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <Link
                    href="/ai-predictions?sport=esports"
                    className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:bg-white/[0.07] hover:text-white"
                  >
                    {esportsMatchCopy.openAi}
                  </Link>
                </div>
              ) : null}
              <div className="mt-6 space-y-4">
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="section-label">{esportsMatchCopy.archivePulseTitle}</p>
                  <div className="mt-4 grid gap-3">
                    {esportsArchiveTeams.map((team) => (
                      <div key={team.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-950/35 px-4 py-3">
                        <div>
                          <p className="font-medium text-white">{team.name}</p>
                          <p className="mt-1 text-sm text-slate-400">{team.form}</p>
                        </div>
                        <span className="rounded-full bg-sky-300/10 px-3 py-1 text-xs text-sky-100">#{team.ranking}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
                  <p className="section-label">{esportsMatchCopy.archiveSamplesTitle}</p>
                  <div className="mt-4 space-y-3">
                    {esportsArchiveH2H.map((row) => (
                      <article key={`${row.season}-${row.fixture}`} className="rounded-2xl bg-slate-950/35 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <p className="font-medium text-white">{row.fixture}</p>
                          <span className="rounded-full bg-orange-400/12 px-3 py-1 text-xs text-orange-200">{row.tag}</span>
                        </div>
                        <p className="mt-2 text-sm text-slate-400">{row.season}</p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={matchDetailCopy.dataSliceEyebrow} title={matchDetailCopy.dataSliceTitle} />
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{matchDetailCopy.marketOdds}</p>
              <p className="mt-2 text-lg font-semibold text-white">
                {formatOdd(match.odds.home)}
                {match.odds.draw != null ? ` / ${formatOdd(match.odds.draw)}` : ""} / {formatOdd(match.odds.away)}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {spreadLabel} {match.odds.spread} | {totalLabel} {match.odds.total}
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{matchDetailCopy.matchSlice}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{match.statLine}</p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-[2rem] p-6">
          <SectionHeading eyebrow={matchDetailCopy.aiEyebrow} title={matchDetailCopy.aiTitle} />
          {prediction ? (
            <div className="mt-6 rounded-[1.25rem] border border-white/8 bg-white/[0.03] p-4">
              <p className="text-sm text-slate-500">{prediction.market}</p>
              <p className="mt-2 text-xl font-semibold text-orange-200">{prediction.pick}</p>
              <p className="mt-3 text-sm leading-7 text-slate-300">{prediction.explanation}</p>
              {prediction.factors.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {prediction.factors.map((factor) => (
                    <span key={factor} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {factor}
                    </span>
                  ))}
                </div>
              ) : null}
              <Link
                href="/ai-predictions"
                className="mt-5 inline-flex rounded-full border border-white/10 px-4 py-2 text-sm text-slate-100 transition hover:border-lime-300/30 hover:text-white"
              >
                {matchDetailCopy.aiLink}
              </Link>
            </div>
          ) : (
            <div className="mt-6 rounded-[1.25rem] border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-slate-400">
              {matchDetailCopy.emptyPrediction}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
