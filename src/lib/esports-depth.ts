import type { CricketLeagueDepth } from "@/lib/cricket-depth";
import type { Locale } from "@/lib/i18n-config";

function getLeagueDepthZhCn(leagueSlug: string): CricketLeagueDepth | null {
  switch (leagueSlug) {
    case "lpl":
      return {
        overviewCards: [
          { label: "场均时长", value: "33.8 分钟", detail: "近 10 场系列赛平均单图时长" },
          { label: "首先锋兑现", value: "68%", detail: "拿到首先锋的一方更容易滚起第二波资源" },
          { label: "小龙压制", value: "3.2", detail: "系列赛均值更偏向中期资源链" },
        ],
        scheduleNotesByMatchId: {
          m10: "重点观察先锋后转线和第二条小龙前的视野落点，这会直接决定系列赛让图的弹性。",
        },
        teamIntelById: {
          t1: {
            summary: "T1 的优势来自更稳定的中野联动和先锋后拆塔推进，系列赛越往后越容易把资源差滚大。",
            indicators: [
              { label: "强项", value: "先锋后推进兑现率高" },
              { label: "隐患", value: "前 10 分钟偶有边线被抓" },
              { label: "观察", value: "第二条小龙前能否先抢中线" },
            ],
            nextMatchId: "m10",
          },
          "bilibili-gaming": {
            summary: "BLG 仍有更强的正面团战爆发，但他们需要在 15 分钟前先把线优兑现成资源交换，否则边路会被持续压缩。",
            indicators: [
              { label: "强项", value: "正面开团爆发高" },
              { label: "隐患", value: "边线资源回收偏慢" },
              { label: "观察", value: "能否先手控到一先锋" },
            ],
            nextMatchId: "m10",
          },
        },
        storylines: [
          {
            title: "LPL 系列赛更看中第二波资源",
            description: "首先锋与第二条小龙之间的资源切换，通常决定这类系列赛是滚雪球还是转成拉锯局。",
          },
          {
            title: "线权不是目的，转线效率才是差异",
            description: "单看对线并不够，关键是拿到线权后是否能持续换到塔皮、视野和河道控制。",
          },
        ],
      };
    case "dreamleague":
      return {
        overviewCards: [
          { label: "平均 KPM", value: "1.08", detail: "近阶段系列赛整体更偏向长团节奏" },
          { label: "Roshan 转化", value: "63%", detail: "拿到一代盾的一方大多会顺势拔塔" },
          { label: "买活强度", value: "2.4 次", detail: "后期高地局对买活管理要求很高" },
        ],
        scheduleNotesByMatchId: {
          m11: "DreamLeague 这组重点看 Roshan 视窗和买活窗口，不要被前 15 分钟的表面优劣误导。",
        },
        teamIntelById: {
          "gaimin-gladiators": {
            summary: "GG 的地图控制更成熟，尤其擅长把一代盾后的视野和外塔收益持续滚成地图锁死。",
            indicators: [
              { label: "强项", value: "一代盾后控图能力" },
              { label: "隐患", value: "逆风时高地推进偏急" },
              { label: "观察", value: "Roshan 前河道占位" },
            ],
            nextMatchId: "m11",
          },
          "team-liquid": {
            summary: "Liquid 的强项是拖入后期和高地防守，只要前两波大型目标不崩，他们的翻盘样本仍然很硬。",
            indicators: [
              { label: "强项", value: "后期高地防守" },
              { label: "隐患", value: "前中期塔控偏慢" },
              { label: "观察", value: "买活是否留到第三图" },
            ],
            nextMatchId: "m11",
          },
        },
        storylines: [
          {
            title: "DreamLeague 更像耐心博弈",
            description: "大多数走势不会在前 10 分钟定型，真正的走势转折通常出现在二代盾和高地买活之后。",
          },
          {
            title: "地图数常比单图胜负更有价值",
            description: "当双方都具备后期处理能力时，系列赛拉长的概率往往会高于盘口初始定价。",
          },
        ],
      };
    case "blast-premier":
      return {
        overviewCards: [
          { label: "手枪局兑现", value: "61%", detail: "手枪局和前两枪经常直接决定半场经济" },
          { label: "CT 稳态", value: "70%", detail: "优势队往往通过 CT 端把半场差距拉开" },
          { label: "残局胜率", value: "58%", detail: "1vX 回合处理是目前最稳的差异点" },
        ],
        scheduleNotesByMatchId: {
          m12: "CS2 重点看手枪局和第 4 到第 8 回合的经济树，很多让分局都在这里提前决定。",
        },
        teamIntelById: {
          "natus-vincere": {
            summary: "NAVI 依赖进攻端默认收集和后段配合，一旦前段资源掉得太快，残局胜率会明显下滑。",
            indicators: [
              { label: "强项", value: "中后段道具配合" },
              { label: "隐患", value: "T 侧默认偏慢" },
              { label: "观察", value: "前八回合经济是否稳住" },
            ],
            nextMatchId: "m12",
          },
          "team-vitality": {
            summary: "Vitality 更擅长把手枪局和 CT 端优势连成连续经济回合，这也是他们让分盘更稳的核心原因。",
            indicators: [
              { label: "强项", value: "手枪局转换率高" },
              { label: "隐患", value: "T 侧偶有中段断枪" },
              { label: "观察", value: "CT 端首个长枪局" },
            ],
            nextMatchId: "m12",
          },
        },
        storylines: [
          {
            title: "BLAST 的让分盘更依赖手枪局",
            description: "如果优势队在手枪局和首个长枪局都拿下，回合让分会比独赢更早进入兑现区。",
          },
          {
            title: "残局稳定性决定最终侧重",
            description: "当双方枪法接近时，真正拉开差距的是残局站位、补枪顺序和经济修复速度。",
          },
        ],
      };
    default:
      return null;
  }
}

function getLeagueDepthZhTw(leagueSlug: string): CricketLeagueDepth | null {
  switch (leagueSlug) {
    case "lpl":
      return {
        overviewCards: [
          { label: "場均時長", value: "33.8 分鐘", detail: "近 10 場系列賽平均單圖時長" },
          { label: "首先鋒兌現", value: "68%", detail: "拿到首隻先鋒的一方更容易滾起第二波資源" },
          { label: "小龍壓制", value: "3.2", detail: "系列賽均值更偏向中期資源鏈" },
        ],
        scheduleNotesByMatchId: {
          m10: "重點觀察先鋒後轉線與第二條小龍前的視野落點，這會直接決定系列賽讓圖的彈性。",
        },
        teamIntelById: {
          t1: {
            summary: "T1 的優勢來自更穩定的中野聯動和先鋒後拆塔推進，系列賽越往後越容易把資源差滾大。",
            indicators: [
              { label: "強項", value: "先鋒後推進兌現率高" },
              { label: "隱患", value: "前 10 分鐘偶有邊線被抓" },
              { label: "觀察", value: "第二條小龍前能否先搶中線" },
            ],
            nextMatchId: "m10",
          },
          "bilibili-gaming": {
            summary: "BLG 仍有更強的正面團戰爆發，但他們需要在 15 分鐘前先把線優兌現成資源交換，否則邊路會被持續壓縮。",
            indicators: [
              { label: "強項", value: "正面開團爆發高" },
              { label: "隱患", value: "邊線資源回收偏慢" },
              { label: "觀察", value: "能否先手控到一先鋒" },
            ],
            nextMatchId: "m10",
          },
        },
        storylines: [
          { title: "LPL 系列賽更看中第二波資源", description: "首先鋒與第二條小龍之間的資源切換，通常決定這類系列賽是滾雪球還是轉成拉鋸局。" },
          { title: "線權不是目的，轉線效率才是差異", description: "單看對線並不夠，關鍵是拿到線權後是否能持續換到塔皮、視野與河道控制。" },
        ],
      };
    case "dreamleague":
      return {
        overviewCards: [
          { label: "平均 KPM", value: "1.08", detail: "近階段系列賽整體更偏向長團節奏" },
          { label: "Roshan 轉化", value: "63%", detail: "拿到一代盾的一方大多會順勢拔塔" },
          { label: "買活強度", value: "2.4 次", detail: "後期高地局對買活管理要求很高" },
        ],
        scheduleNotesByMatchId: {
          m11: "DreamLeague 這組重點看 Roshan 視窗與買活窗口，不要被前 15 分鐘的表面優劣誤導。",
        },
        teamIntelById: {
          "gaimin-gladiators": {
            summary: "GG 的地圖控制更成熟，尤其擅長把一代盾後的視野和外塔收益持續滾成地圖鎖死。",
            indicators: [
              { label: "強項", value: "一代盾後控圖能力" },
              { label: "隱患", value: "逆風時高地推進偏急" },
              { label: "觀察", value: "Roshan 前河道站位" },
            ],
            nextMatchId: "m11",
          },
          "team-liquid": {
            summary: "Liquid 的強項是拖入後期與高地防守，只要前兩波大型目標不崩，他們的翻盤樣本仍然很硬。",
            indicators: [
              { label: "強項", value: "後期高地防守" },
              { label: "隱患", value: "前中期塔控偏慢" },
              { label: "觀察", value: "買活是否留到第三圖" },
            ],
            nextMatchId: "m11",
          },
        },
        storylines: [
          { title: "DreamLeague 更像耐心博弈", description: "多數走勢不會在前 10 分鐘定型，真正的轉折通常出現在二代盾和高地買活之後。" },
          { title: "地圖數常比單圖勝負更有價值", description: "當雙方都具備後期處理能力時，系列賽拉長的機率往往會高於盤口初始定價。" },
        ],
      };
    case "blast-premier":
      return {
        overviewCards: [
          { label: "手槍局兌現", value: "61%", detail: "手槍局和前兩槍經常直接決定半場經濟" },
          { label: "CT 穩態", value: "70%", detail: "優勢隊往往通過 CT 端把半場差距拉開" },
          { label: "殘局勝率", value: "58%", detail: "1vX 回合處理是目前最穩的差異點" },
        ],
        scheduleNotesByMatchId: {
          m12: "CS2 重點看手槍局和第 4 到第 8 回合的經濟樹，很多讓分局都在這裡提前決定。",
        },
        teamIntelById: {
          "natus-vincere": {
            summary: "NAVI 依賴進攻端預設收集和後段配合，一旦前段資源掉得太快，殘局勝率會明顯下滑。",
            indicators: [
              { label: "強項", value: "中後段道具配合" },
              { label: "隱患", value: "T 側預設偏慢" },
              { label: "觀察", value: "前八回合經濟是否穩住" },
            ],
            nextMatchId: "m12",
          },
          "team-vitality": {
            summary: "Vitality 更擅長把手槍局和 CT 端優勢連成連續經濟回合，這也是他們讓分盤更穩的核心原因。",
            indicators: [
              { label: "強項", value: "手槍局轉化率高" },
              { label: "隱患", value: "T 側偶有中段斷槍" },
              { label: "觀察", value: "CT 端首個長槍局" },
            ],
            nextMatchId: "m12",
          },
        },
        storylines: [
          { title: "BLAST 的讓分盤更依賴手槍局", description: "如果優勢隊在手槍局和首個長槍局都拿下，回合讓分會比獨贏更早進入兌現區。" },
          { title: "殘局穩定性決定最終側重", description: "當雙方槍法接近時，真正拉開差距的是殘局站位、補槍順序與經濟修復速度。" },
        ],
      };
    default:
      return null;
  }
}

function getLeagueDepthEn(leagueSlug: string): CricketLeagueDepth | null {
  switch (leagueSlug) {
    case "lpl":
      return {
        overviewCards: [
          { label: "Avg map time", value: "33.8 min", detail: "Across the last 10 series maps" },
          { label: "First Herald convert", value: "68%", detail: "Teams securing the first Herald are extending that edge into the second resource cycle" },
          { label: "Drake pressure", value: "3.2", detail: "The current league sample leans heavily on mid-game objective chains" },
        ],
        scheduleNotesByMatchId: {
          m10: "Track the post-Herald lane swap and the vision setup before the second drake. That is where the series handicap really swings.",
        },
        teamIntelById: {
          t1: {
            summary: "T1's edge comes from cleaner jungle-mid coordination and stronger tower conversion after the first Herald. The longer the series runs, the easier it is for them to roll the resource lead forward.",
            indicators: [
              { label: "Strength", value: "Strong post-Herald map conversion" },
              { label: "Risk", value: "Occasional early side-lane picks conceded" },
              { label: "Watch", value: "Can they claim mid priority before drake two?" },
            ],
            nextMatchId: "m10",
          },
          "bilibili-gaming": {
            summary: "BLG still own the bigger straight-up fight burst, but they need to convert lane pressure into real resources before 15 minutes or the side lanes start to collapse.",
            indicators: [
              { label: "Strength", value: "High front-to-back engage burst" },
              { label: "Risk", value: "Slow side-lane resource recovery" },
              { label: "Watch", value: "Can they secure first Herald control?" },
            ],
            nextMatchId: "m10",
          },
        },
        storylines: [
          { title: "The second resource cycle matters most in LPL series", description: "The stretch between first Herald and second drake often decides whether the series becomes a snowball or a longer trade war." },
          { title: "Lane priority is only valuable if it converts", description: "The real difference is not just winning lanes, but converting lane push into plates, vision, and river control." },
        ],
      };
    case "dreamleague":
      return {
        overviewCards: [
          { label: "Avg KPM", value: "1.08", detail: "Recent series are trending toward longer teamfight rhythms" },
          { label: "Roshan convert", value: "63%", detail: "First Aegis winners are usually translating that into tower progress" },
          { label: "Buyback load", value: "2.4", detail: "Late high-ground games are heavily shaped by buyback discipline" },
        ],
        scheduleNotesByMatchId: {
          m11: "This DreamLeague spot is more about Roshan windows and buyback timing than surface-level early laning edges.",
        },
        teamIntelById: {
          "gaimin-gladiators": {
            summary: "GG are still the cleaner map-control team, especially once the first Aegis lets them turn vision and outer towers into a locked map state.",
            indicators: [
              { label: "Strength", value: "Post-Aegis map control" },
              { label: "Risk", value: "Overeager high-ground pushes from behind" },
              { label: "Watch", value: "River positioning before Roshan" },
            ],
            nextMatchId: "m11",
          },
          "team-liquid": {
            summary: "Liquid are most dangerous when the game stretches late. As long as the first two objective windows do not break them, their comeback sample stays very live.",
            indicators: [
              { label: "Strength", value: "Late high-ground defense" },
              { label: "Risk", value: "Slow tower pressure early" },
              { label: "Watch", value: "Do they preserve buybacks for map three?" },
            ],
            nextMatchId: "m11",
          },
        },
        storylines: [
          { title: "DreamLeague rewards patience", description: "Most of these series are not decided in the first 10 minutes. The sharper read usually comes after second Roshan and high-ground buyback trades." },
          { title: "Map count often beats single-map picks", description: "When both teams retain strong late-game handling, the full-series over often holds more value than any one-map side." },
        ],
      };
    case "blast-premier":
      return {
        overviewCards: [
          { label: "Pistol convert", value: "61%", detail: "Pistol rounds and the first rifle cycle are still driving half-economy shape" },
          { label: "CT stability", value: "70%", detail: "Stronger teams are pulling away through defensive halves" },
          { label: "Clutch rate", value: "58%", detail: "1vX conversion remains the cleanest separator in this sample" },
        ],
        scheduleNotesByMatchId: {
          m12: "In CS2, the real hinge is the pistol plus rounds 4 through 8. That economy tree decides many round handicaps before the scoreboard shows it.",
        },
        teamIntelById: {
          "natus-vincere": {
            summary: "NAVI rely more on T-side default gathering and coordinated late-rounds. If the early economy gets stripped too quickly, their clutch profile drops sharply.",
            indicators: [
              { label: "Strength", value: "Mid-late utility coordination" },
              { label: "Risk", value: "Slow T-side defaults" },
              { label: "Watch", value: "Can they stabilize the first eight rounds?" },
            ],
            nextMatchId: "m12",
          },
          "team-vitality": {
            summary: "Vitality are still better at chaining pistol-round wins and CT-side control into clean economy sequences, which is why their handicap profile remains steadier.",
            indicators: [
              { label: "Strength", value: "High pistol conversion" },
              { label: "Risk", value: "Occasional T-side mid-round stalls" },
              { label: "Watch", value: "The first full-buy CT round" },
            ],
            nextMatchId: "m12",
          },
        },
        storylines: [
          { title: "BLAST handicaps are often decided by pistols", description: "If the stronger team wins both the pistol and the first rifle cycle, the round handicap gets much closer to cashing than the raw score suggests." },
          { title: "Clutch stability sets the true ceiling", description: "When both teams can aim, the real difference comes from clutch spacing, trade order, and how fast they repair the economy." },
        ],
      };
    default:
      return null;
  }
}

export function getEsportsLeagueDepth(leagueSlug: string, locale: Locale): CricketLeagueDepth | null {
  if (locale === "en") {
    return getLeagueDepthEn(leagueSlug);
  }

  if (locale === "zh-TW") {
    return getLeagueDepthZhTw(leagueSlug);
  }

  return getLeagueDepthZhCn(leagueSlug);
}
