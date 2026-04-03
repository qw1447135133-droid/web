import type { Locale } from "@/lib/i18n-config";

export type CricketOverviewCard = {
  label: string;
  value: string;
  detail: string;
};

export type CricketMiniIndicator = {
  label: string;
  value: string;
};

export type CricketTeamIntel = {
  summary: string;
  indicators: CricketMiniIndicator[];
  nextMatchId?: string;
};

export type CricketNarrative = {
  title: string;
  description: string;
};

export type CricketLeagueDepth = {
  overviewCards: CricketOverviewCard[];
  scheduleNotesByMatchId: Record<string, string>;
  teamIntelById: Record<string, CricketTeamIntel>;
  storylines: CricketNarrative[];
};

export type CricketMatchPhaseCard = {
  label: string;
  homeValue: string;
  awayValue: string;
  note: string;
};

export type CricketPlayerWatch = {
  name: string;
  team: string;
  role: string;
  trend: string;
  note: string;
};

export type CricketMatchDepth = {
  phaseCards: CricketMatchPhaseCard[];
  venueCards: CricketOverviewCard[];
  playerWatch: CricketPlayerWatch[];
};

function getLeagueDepthZhCn(leagueSlug: string): CricketLeagueDepth | null {
  switch (leagueSlug) {
    case "ipl":
      return {
        overviewCards: [
          { label: "平均一局", value: "184.6", detail: "近 8 场首局均分" },
          { label: "追分胜率", value: "57%", detail: "后追一方近阶段略占优" },
          { label: "死亡回合", value: "11.8", detail: "最后 4 回合均分" },
        ],
        scheduleNotesByMatchId: {
          m7: "重点盯住死亡回合与总分线回摆，主队后段火力更完整。",
          m8: "主线是 powerplay 失分与客队追分质量，独赢和总分都能承接。",
        },
        teamIntelById: {
          "mumbai-indians": {
            summary: "孟买的后段长打储备和边界球转化率都在联赛前段，适合打高压追分或终盘拉分局面。",
            indicators: [
              { label: "强项", value: "死亡回合边界球转化高" },
              { label: "隐患", value: "中段偶发连续掉门" },
              { label: "观察", value: "追分节奏是否提前提速" },
            ],
            nextMatchId: "m7",
          },
          "chennai-super-kings": {
            summary: "钦奈仍然擅长把比赛拖进中后段处理，但终盘投球质量波动较大，容易被连续长打放大。",
            indicators: [
              { label: "强项", value: "中段控分稳定" },
              { label: "隐患", value: "终盘投球压力偏大" },
              { label: "观察", value: "所需跑分是否压在 8 以下" },
            ],
            nextMatchId: "m7",
          },
          "royal-challengers-bengaluru": {
            summary: "班加罗尔前六回合掉分偏高，导致他们经常被迫进入恢复节奏，盘口容易提前走弱。",
            indicators: [
              { label: "强项", value: "中后段长打释放快" },
              { label: "隐患", value: "powerplay 失分偏多" },
              { label: "观察", value: "前 6 回合掉门数量" },
            ],
            nextMatchId: "m8",
          },
          "kolkata-knight-riders": {
            summary: "加尔各答的追分样本稳定，后七回合爆发力和边界球效率都更适合高压追分盘面。",
            indicators: [
              { label: "强项", value: "追分效率联赛前列" },
              { label: "隐患", value: "领先后偶有中段放缓" },
              { label: "观察", value: "后七回合边界球密度" },
            ],
            nextMatchId: "m8",
          },
        },
        storylines: [
          {
            title: "后段火力决定盘口弹性",
            description: "IPL 当前样本里，最后四回合的得分爆发决定了总分盘能否快速上修。",
          },
          {
            title: "追分质量比开局声量更重要",
            description: "表面上的 powerplay 优势并不稳定，真正决定胜负的是中后段的掉门控制和追分节奏。",
          },
        ],
      };
    case "psl":
      return {
        overviewCards: [
          { label: "平均一局", value: "176.8", detail: "近 6 场首局均分" },
          { label: "主场兑现", value: "61%", detail: "主场方终盘效率更稳" },
          { label: "掉门拐点", value: "12-15 ov", detail: "多数比赛在中后段转向" },
        ],
        scheduleNotesByMatchId: {
          m9: "重点看中后段连续掉门后的追分坍塌，这类样本很适合回放研究。",
        },
        teamIntelById: {
          "lahore-qalandars": {
            summary: "拉合尔的终盘提速能力明显强于联赛均值，尤其适合顺风盘延续和主场兑现。",
            indicators: [
              { label: "强项", value: "最后 4 回合得分爆发" },
              { label: "隐患", value: "过早提速会放大掉门" },
              { label: "观察", value: "主场顺风盘是否继续兑现" },
            ],
            nextMatchId: "m9",
          },
          "karachi-kings": {
            summary: "卡拉奇的追分阶段更依赖中段连续推进，一旦 12 到 15 回合丢门，盘面容易迅速失衡。",
            indicators: [
              { label: "强项", value: "开局守分尚可" },
              { label: "隐患", value: "中后段连续掉门" },
              { label: "观察", value: "追分中段的保门策略" },
            ],
            nextMatchId: "m9",
          },
        },
        storylines: [
          {
            title: "PSL 更依赖中后段拐点",
            description: "不少比赛在 12 到 15 回合出现明显掉门拐点，之后盘口和总分会快速联动。",
          },
          {
            title: "主场兑现率高于表面赔率",
            description: "主场球队在终盘提速和防守部署上的稳定性，使得 PSL 的主场兑现率偏高。",
          },
        ],
      };
    case "the-hundred":
      return {
        overviewCards: [
          { label: "覆盖状态", value: "Phase 1", detail: "联赛入口与资料结构已预留" },
          { label: "重点方向", value: "100-ball", detail: "后续会补独立节奏与回合拆分" },
          { label: "当前目标", value: "可访问", detail: "先保证入口、联赛切换与资料骨架" },
        ],
        scheduleNotesByMatchId: {},
        teamIntelById: {},
        storylines: [
          {
            title: "先把联赛入口做稳定",
            description: "The Hundred 当前以入口和结构占位为主，后续再补更深的比赛样本。",
          },
        ],
      };
    default:
      return null;
  }
}

function getLeagueDepthZhTw(leagueSlug: string): CricketLeagueDepth | null {
  switch (leagueSlug) {
    case "ipl":
      return {
        overviewCards: [
          { label: "平均一局", value: "184.6", detail: "近 8 場首局均分" },
          { label: "追分勝率", value: "57%", detail: "後追一方近階段略佔優" },
          { label: "死亡回合", value: "11.8", detail: "最後 4 回合均分" },
        ],
        scheduleNotesByMatchId: {
          m7: "重點盯住死亡回合與總分線回擺，主隊後段火力更完整。",
          m8: "主線是 powerplay 失分與客隊追分品質，獨贏和總分都能承接。",
        },
        teamIntelById: {
          "mumbai-indians": {
            summary: "孟買的後段長打儲備和界外球轉化率都在聯賽前段，適合打高壓追分或終盤拉分局面。",
            indicators: [
              { label: "強項", value: "死亡回合界外球轉化高" },
              { label: "隱患", value: "中段偶發連續掉門" },
              { label: "觀察", value: "追分節奏是否提前提速" },
            ],
            nextMatchId: "m7",
          },
          "chennai-super-kings": {
            summary: "欽奈仍然擅長把比賽拖進中後段處理，但終盤投球品質波動較大，容易被連續長打放大。",
            indicators: [
              { label: "強項", value: "中段控分穩定" },
              { label: "隱患", value: "終盤投球壓力偏大" },
              { label: "觀察", value: "所需跑分是否壓在 8 以下" },
            ],
            nextMatchId: "m7",
          },
          "royal-challengers-bengaluru": {
            summary: "班加羅爾前六回合掉分偏高，導致他們經常被迫進入恢復節奏，盤口容易提前走弱。",
            indicators: [
              { label: "強項", value: "中後段長打釋放快" },
              { label: "隱患", value: "powerplay 失分偏多" },
              { label: "觀察", value: "前 6 回合掉門數量" },
            ],
            nextMatchId: "m8",
          },
          "kolkata-knight-riders": {
            summary: "加爾各答的追分樣本穩定，後七回合爆發力和界外球效率都更適合高壓追分盤面。",
            indicators: [
              { label: "強項", value: "追分效率聯賽前列" },
              { label: "隱患", value: "領先後偶有中段放緩" },
              { label: "觀察", value: "後七回合界外球密度" },
            ],
            nextMatchId: "m8",
          },
        },
        storylines: [
          {
            title: "後段火力決定盤口彈性",
            description: "IPL 目前樣本裡，最後四回合的得分爆發決定了總分盤能否快速上修。",
          },
          {
            title: "追分品質比開局聲量更重要",
            description: "表面上的 powerplay 優勢並不穩定，真正決定勝負的是中後段的掉門控制和追分節奏。",
          },
        ],
      };
    case "psl":
      return {
        overviewCards: [
          { label: "平均一局", value: "176.8", detail: "近 6 場首局均分" },
          { label: "主場兌現", value: "61%", detail: "主場方終盤效率更穩" },
          { label: "掉門拐點", value: "12-15 ov", detail: "多數比賽在中後段轉向" },
        ],
        scheduleNotesByMatchId: {
          m9: "重點看中後段連續掉門後的追分坍塌，這類樣本很適合回放研究。",
        },
        teamIntelById: {
          "lahore-qalandars": {
            summary: "拉合爾的終盤提速能力明顯強於聯賽均值，尤其適合順風盤延續和主場兌現。",
            indicators: [
              { label: "強項", value: "最後 4 回合得分爆發" },
              { label: "隱患", value: "過早提速會放大掉門" },
              { label: "觀察", value: "主場順風盤是否繼續兌現" },
            ],
            nextMatchId: "m9",
          },
          "karachi-kings": {
            summary: "卡拉奇的追分階段更依賴中段連續推進，一旦 12 到 15 回合掉門，盤面容易迅速失衡。",
            indicators: [
              { label: "強項", value: "開局守分尚可" },
              { label: "隱患", value: "中後段連續掉門" },
              { label: "觀察", value: "追分中段的保門策略" },
            ],
            nextMatchId: "m9",
          },
        },
        storylines: [
          {
            title: "PSL 更依賴中後段拐點",
            description: "不少比賽在 12 到 15 回合出現明顯掉門拐點，之後盤口和總分會快速聯動。",
          },
          {
            title: "主場兌現率高於表面賠率",
            description: "主場球隊在終盤提速和防守部署上的穩定性，使得 PSL 的主場兌現率偏高。",
          },
        ],
      };
    case "the-hundred":
      return {
        overviewCards: [
          { label: "覆蓋狀態", value: "Phase 1", detail: "聯賽入口與資料結構已預留" },
          { label: "重點方向", value: "100-ball", detail: "後續會補獨立節奏與回合拆分" },
          { label: "目前目標", value: "可訪問", detail: "先保證入口、聯賽切換與資料骨架" },
        ],
        scheduleNotesByMatchId: {},
        teamIntelById: {},
        storylines: [
          {
            title: "先把聯賽入口做穩定",
            description: "The Hundred 目前以入口和結構占位為主，後續再補更深的比賽樣本。",
          },
        ],
      };
    default:
      return null;
  }
}

function getLeagueDepthEn(leagueSlug: string): CricketLeagueDepth | null {
  switch (leagueSlug) {
    case "ipl":
      return {
        overviewCards: [
          { label: "Avg first innings", value: "184.6", detail: "Across the last eight matches" },
          { label: "Chase win rate", value: "57%", detail: "The chasing side holds a slight edge" },
          { label: "Death overs", value: "11.8", detail: "Average runs per over in the last four" },
        ],
        scheduleNotesByMatchId: {
          m7: "Track the death-over swing and total-line pullback. Mumbai still hold the deeper finishing layer.",
          m8: "The key angle is powerplay leakage versus chase quality, with both moneyline and total routes live.",
        },
        teamIntelById: {
          "mumbai-indians": {
            summary: "Mumbai still carry one of the better late-innings boundary profiles in the league, which keeps them live in pressure chases and endgame squeezes.",
            indicators: [
              { label: "Strength", value: "High death-over boundary conversion" },
              { label: "Risk", value: "Middle-overs wicket clusters" },
              { label: "Watch", value: "Whether they accelerate the chase early" },
            ],
            nextMatchId: "m7",
          },
          "chennai-super-kings": {
            summary: "Chennai are still comfortable dragging matches deep, but their death-over bowling quality has become more volatile under pressure.",
            indicators: [
              { label: "Strength", value: "Stable middle-overs control" },
              { label: "Risk", value: "Late bowling pressure" },
              { label: "Watch", value: "Can they keep the required rate below eight?" },
            ],
            nextMatchId: "m7",
          },
          "royal-challengers-bengaluru": {
            summary: "RCB keep leaking too much in the powerplay, which forces them into recovery mode early and weakens the first market move.",
            indicators: [
              { label: "Strength", value: "Fast late-innings hitting release" },
              { label: "Risk", value: "Powerplay concession" },
              { label: "Watch", value: "Wickets lost inside the first six overs" },
            ],
            nextMatchId: "m8",
          },
          "kolkata-knight-riders": {
            summary: "Kolkata remain one of the better chase teams late, with a stronger boundary profile when the required rate climbs.",
            indicators: [
              { label: "Strength", value: "Top-tier chasing efficiency" },
              { label: "Risk", value: "Occasional middle-overs slowdown while ahead" },
              { label: "Watch", value: "Boundary density in the final seven overs" },
            ],
            nextMatchId: "m8",
          },
        },
        storylines: [
          {
            title: "Late hitting now drives the total market",
            description: "In the current IPL sample, the last four overs are doing most of the work in forcing total lines upward.",
          },
          {
            title: "Chase quality matters more than opening noise",
            description: "Surface-level powerplay edges are less stable than the middle and late-innings wicket control that actually decides the trade.",
          },
        ],
      };
    case "psl":
      return {
        overviewCards: [
          { label: "Avg first innings", value: "176.8", detail: "Across the last six matches" },
          { label: "Home conversion", value: "61%", detail: "Home sides are finishing cleaner late" },
          { label: "Wicket swing", value: "12-15 ov", detail: "Most matches flip in the middle-late segment" },
        ],
        scheduleNotesByMatchId: {
          m9: "Rewatch the chase collapse after the mid-innings wicket cluster. This is the right kind of PSL sample to archive.",
        },
        teamIntelById: {
          "lahore-qalandars": {
            summary: "Lahore are still outperforming league baseline late, especially when they can press the pace on home turf.",
            indicators: [
              { label: "Strength", value: "Explosive last four overs" },
              { label: "Risk", value: "Early acceleration can expose wickets" },
              { label: "Watch", value: "Whether the home edge keeps converting" },
            ],
            nextMatchId: "m9",
          },
          "karachi-kings": {
            summary: "Karachi depend more on sustaining the chase through the middle segment, and their markets crack quickly once wickets fall from overs 12 to 15.",
            indicators: [
              { label: "Strength", value: "Decent early control" },
              { label: "Risk", value: "Middle-late wicket clusters" },
              { label: "Watch", value: "How they protect wickets mid-chase" },
            ],
            nextMatchId: "m9",
          },
        },
        storylines: [
          {
            title: "PSL matches flip harder in the middle-late phase",
            description: "A big share of the PSL sample turns when wickets start falling between overs 12 and 15.",
          },
          {
            title: "Home execution is stronger than the price implies",
            description: "Late-innings execution and defensive control are making home teams convert more often than the surface market suggests.",
          },
        ],
      };
    case "the-hundred":
      return {
        overviewCards: [
          { label: "Coverage state", value: "Phase 1", detail: "The league entry and database shell are in place" },
          { label: "Focus", value: "100-ball", detail: "Dedicated phase logic will be added later" },
          { label: "Goal", value: "Accessible", detail: "Entry, switching, and archive layout first" },
        ],
        scheduleNotesByMatchId: {},
        teamIntelById: {},
        storylines: [
          {
            title: "Stabilize the entry before adding depth",
            description: "The Hundred is currently in placeholder mode, with deeper match samples planned after the main cricket routes settle.",
          },
        ],
      };
    default:
      return null;
  }
}

function getMatchDepthZhCn(matchId: string): CricketMatchDepth | null {
  switch (matchId) {
    case "m7":
      return {
        phaseCards: [
          { label: "前 6 回合", homeValue: "56/1", awayValue: "49/2", note: "孟买开局边界球更密，但钦奈仍把所需跑分控在安全区。" },
          { label: "中段推进", homeValue: "77/3", awayValue: "81/4", note: "钦奈中段控分还在，但连续单打让追分弹性下降。" },
          { label: "死亡回合", homeValue: "21/0", awayValue: "19/2", note: "主队保留更多终盘长打点，最后两回合对盘口更关键。" },
        ],
        venueCards: [
          { label: "平均一局", value: "182", detail: "Wankhede 近阶段首局均分" },
          { label: "追分倾向", value: "54%", detail: "夜场轻微利好后追" },
          { label: "边界尺寸", value: "侧边偏短", detail: "适合终盘强攻" },
          { label: "露水影响", value: "中高", detail: "后段控球难度上升" },
        ],
        playerWatch: [
          { name: "Suryakumar Yadav", team: "Mumbai Indians", role: "终盘打者", trend: "近 3 场后段长打稳定", note: "如果进入最后 3 回合仍在场，主队总分弹性会被放大。" },
          { name: "Jasprit Bumrah", team: "Mumbai Indians", role: "终盘投手", trend: "死亡回合失分控制仍是样板级", note: "他的最后一轮投球会直接决定客队追分窗口。" },
          { name: "Shivam Dube", team: "Chennai Super Kings", role: "中后段打者", trend: "高压追分时边界球转换还在", note: "若能撑过 17 回合，钦奈仍有反扑空间。" },
        ],
      };
    case "m8":
      return {
        phaseCards: [
          { label: "前 6 回合", homeValue: "失分 56.3", awayValue: "得分 52.1", note: "班加罗尔最近的 powerplay 失分仍偏高，客队开局承压能力更稳。" },
          { label: "中段推进", homeValue: "掉门 2.4", awayValue: "掉门 1.8", note: "加尔各答中段保门更好，适合处理被迫追分局面。" },
          { label: "终盘爆发", homeValue: "边界球 8.1", awayValue: "边界球 9.4", note: "两队都能提速，但客队后七回合更容易把强攻兑现成比分。" },
        ],
        venueCards: [
          { label: "平均一局", value: "189", detail: "Chinnaswamy 高得分倾向明显" },
          { label: "追分倾向", value: "58%", detail: "后追方夜场优势更强" },
          { label: "边界尺寸", value: "整体偏短", detail: "适合高总分模型" },
          { label: "风向影响", value: "侧顺风", detail: "强打者更易连续清边界" },
        ],
        playerWatch: [
          { name: "Virat Kohli", team: "Royal Challengers Bengaluru", role: "开局稳定器", trend: "面对强压追分时仍能拉长局数", note: "他能否把开局掉门压住，会决定主队是否能拖住盘口。" },
          { name: "Andre Russell", team: "Kolkata Knight Riders", role: "终盘终结者", trend: "后段边界球密度持续偏高", note: "只要比赛拖进最后 5 回合，他就是客队最强的爆发点。" },
          { name: "Sunil Narine", team: "Kolkata Knight Riders", role: "开局节奏器", trend: "能同时影响 powerplay 得失分", note: "他的前段处理会直接改变独赢和总分的节奏预期。" },
        ],
      };
    case "m9":
      return {
        phaseCards: [
          { label: "前 6 回合", homeValue: "48/1", awayValue: "44/2", note: "拉合尔开局没有拉太快，但保门质量更稳。" },
          { label: "中段推进", homeValue: "88/4", awayValue: "95/4", note: "卡拉奇中段一度占优，但转速没有延续到后段。" },
          { label: "终盘提速", homeValue: "46/2", awayValue: "37/5", note: "比赛真正分出高低的是最后四回合的掉门拐点。" },
        ],
        venueCards: [
          { label: "平均一局", value: "175", detail: "Gaddafi 近阶段首局均分" },
          { label: "追分倾向", value: "49%", detail: "主客差距不大，终盘执行更关键" },
          { label: "场地节奏", value: "中速偏稳", detail: "中段更容易靠保门控局" },
          { label: "夜场因素", value: "低", detail: "露水影响相对有限" },
        ],
        playerWatch: [
          { name: "Fakhar Zaman", team: "Lahore Qalandars", role: "开局推进点", trend: "主场样本里的进攻转换更直接", note: "他把开局压力顶住后，拉合尔更容易把比赛带进终盘提速。"},
          { name: "Shaheen Afridi", team: "Lahore Qalandars", role: "新球投手", trend: "前段造门率仍是联赛头部", note: "新球阶段的掉门能力决定客队追分基础。"},
          { name: "James Vince", team: "Karachi Kings", role: "追分主轴", trend: "中段连续得分稳定但需要保门支持", note: "一旦缺少身边的保门点，客队追分会在 12 到 15 回合迅速失速。"},
        ],
      };
    default:
      return null;
  }
}

function getMatchDepthZhTw(matchId: string): CricketMatchDepth | null {
  switch (matchId) {
    case "m7":
      return {
        phaseCards: [
          { label: "前 6 回合", homeValue: "56/1", awayValue: "49/2", note: "孟買開局界外球更密，但欽奈仍把所需跑分控在安全區。" },
          { label: "中段推進", homeValue: "77/3", awayValue: "81/4", note: "欽奈中段控分還在，但連續單打讓追分彈性下降。" },
          { label: "死亡回合", homeValue: "21/0", awayValue: "19/2", note: "主隊保留更多終盤長打點，最後兩回合對盤口更關鍵。" },
        ],
        venueCards: [
          { label: "平均一局", value: "182", detail: "Wankhede 近階段首局均分" },
          { label: "追分傾向", value: "54%", detail: "夜場輕微利好後追" },
          { label: "界外尺寸", value: "側邊偏短", detail: "適合終盤強攻" },
          { label: "露水影響", value: "中高", detail: "後段控球難度上升" },
        ],
        playerWatch: [
          { name: "Suryakumar Yadav", team: "Mumbai Indians", role: "終盤打者", trend: "近 3 場後段長打穩定", note: "如果進入最後 3 回合仍在場，主隊總分彈性會被放大。" },
          { name: "Jasprit Bumrah", team: "Mumbai Indians", role: "終盤投手", trend: "死亡回合失分控制仍是樣板級", note: "他的最後一輪投球會直接決定客隊追分窗口。" },
          { name: "Shivam Dube", team: "Chennai Super Kings", role: "中後段打者", trend: "高壓追分時界外球轉化還在", note: "若能撐過 17 回合，欽奈仍有反撲空間。" },
        ],
      };
    case "m8":
      return {
        phaseCards: [
          { label: "前 6 回合", homeValue: "失分 56.3", awayValue: "得分 52.1", note: "班加羅爾最近的 powerplay 失分仍偏高，客隊開局承壓能力更穩。" },
          { label: "中段推進", homeValue: "掉門 2.4", awayValue: "掉門 1.8", note: "加爾各答中段保門更好，適合處理被迫追分局面。" },
          { label: "終盤爆發", homeValue: "界外球 8.1", awayValue: "界外球 9.4", note: "兩隊都能提速，但客隊後七回合更容易把強攻兌現成比分。" },
        ],
        venueCards: [
          { label: "平均一局", value: "189", detail: "Chinnaswamy 高得分傾向明顯" },
          { label: "追分傾向", value: "58%", detail: "後追方夜場優勢更強" },
          { label: "界外尺寸", value: "整體偏短", detail: "適合高總分模型" },
          { label: "風向影響", value: "側順風", detail: "強打者更易連續清界外" },
        ],
        playerWatch: [
          { name: "Virat Kohli", team: "Royal Challengers Bengaluru", role: "開局穩定器", trend: "面對強壓追分時仍能拉長局數", note: "他能否把開局掉門壓住，會決定主隊是否能拖住盤口。" },
          { name: "Andre Russell", team: "Kolkata Knight Riders", role: "終盤終結者", trend: "後段界外球密度持續偏高", note: "只要比賽拖進最後 5 回合，他就是客隊最強的爆發點。" },
          { name: "Sunil Narine", team: "Kolkata Knight Riders", role: "開局節奏器", trend: "能同時影響 powerplay 得失分", note: "他的前段處理會直接改變獨贏和總分的節奏預期。" },
        ],
      };
    case "m9":
      return {
        phaseCards: [
          { label: "前 6 回合", homeValue: "48/1", awayValue: "44/2", note: "拉合爾開局沒有拉太快，但保門品質更穩。" },
          { label: "中段推進", homeValue: "88/4", awayValue: "95/4", note: "卡拉奇中段一度佔優，但轉速沒有延續到後段。" },
          { label: "終盤提速", homeValue: "46/2", awayValue: "37/5", note: "比賽真正分出高低的是最後四回合的掉門拐點。" },
        ],
        venueCards: [
          { label: "平均一局", value: "175", detail: "Gaddafi 近階段首局均分" },
          { label: "追分傾向", value: "49%", detail: "主客差距不大，終盤執行更關鍵" },
          { label: "場地節奏", value: "中速偏穩", detail: "中段更容易靠保門控局" },
          { label: "夜場因素", value: "低", detail: "露水影響相對有限" },
        ],
        playerWatch: [
          { name: "Fakhar Zaman", team: "Lahore Qalandars", role: "開局推進點", trend: "主場樣本裡的進攻轉換更直接", note: "他把開局壓力頂住後，拉合爾更容易把比賽帶進終盤提速。" },
          { name: "Shaheen Afridi", team: "Lahore Qalandars", role: "新球投手", trend: "前段造門率仍是聯賽頭部", note: "新球階段的掉門能力決定客隊追分基礎。" },
          { name: "James Vince", team: "Karachi Kings", role: "追分主軸", trend: "中段連續得分穩定但需要保門支持", note: "一旦缺少身邊的保門點，客隊追分會在 12 到 15 回合迅速失速。" },
        ],
      };
    default:
      return null;
  }
}

function getMatchDepthEn(matchId: string): CricketMatchDepth | null {
  switch (matchId) {
    case "m7":
      return {
        phaseCards: [
          { label: "Powerplay", homeValue: "56/1", awayValue: "49/2", note: "Mumbai landed more boundaries early, but Chennai still kept the required rate in a manageable zone." },
          { label: "Middle overs", homeValue: "77/3", awayValue: "81/4", note: "Chennai's control held up through the middle, although too many singles lowered the chase elasticity." },
          { label: "Death overs", homeValue: "21/0", awayValue: "19/2", note: "Mumbai still carry the deeper finishing layer, which matters most for the last two overs of the market." },
        ],
        venueCards: [
          { label: "Avg first innings", value: "182", detail: "Recent Wankhede baseline" },
          { label: "Chase bias", value: "54%", detail: "A mild night-game edge for the chase" },
          { label: "Boundary shape", value: "Short square side", detail: "Supports late hitting surges" },
          { label: "Dew risk", value: "Medium-high", detail: "Grip gets harder late" },
        ],
        playerWatch: [
          { name: "Suryakumar Yadav", team: "Mumbai Indians", role: "Late hitter", trend: "Stable boundary output in the last three matches", note: "If he is still set inside the last three overs, Mumbai's ceiling expands quickly." },
          { name: "Jasprit Bumrah", team: "Mumbai Indians", role: "Death-over bowler", trend: "Still operating at elite late-overs control", note: "His final over will largely define Chennai's chase window." },
          { name: "Shivam Dube", team: "Chennai Super Kings", role: "Middle-late hitter", trend: "Still converting boundaries under chase pressure", note: "If he survives through over 17, Chennai keep a live comeback route." },
        ],
      };
    case "m8":
      return {
        phaseCards: [
          { label: "Powerplay", homeValue: "Concede 56.3", awayValue: "Score 52.1", note: "RCB are still leaking too much early, while Kolkata remain steadier under opening pressure." },
          { label: "Middle overs", homeValue: "2.4 wickets", awayValue: "1.8 wickets", note: "Kolkata protect wickets better through the middle, which matters when the chase gets forced." },
          { label: "Late burst", homeValue: "8.1 boundaries", awayValue: "9.4 boundaries", note: "Both sides can accelerate, but Kolkata are more likely to convert pressure into runs late." },
        ],
        venueCards: [
          { label: "Avg first innings", value: "189", detail: "Chinnaswamy remains a high-scoring ground" },
          { label: "Chase bias", value: "58%", detail: "The night chase is materially stronger here" },
          { label: "Boundary shape", value: "Short all round", detail: "Fits the high-total profile" },
          { label: "Wind effect", value: "Cross-tailwind", detail: "Helps power hitters clear the rope late" },
        ],
        playerWatch: [
          { name: "Virat Kohli", team: "Royal Challengers Bengaluru", role: "Opening stabilizer", trend: "Still stretching innings under chase pressure", note: "If he can suppress the early wicket risk, RCB can hold the first market move." },
          { name: "Andre Russell", team: "Kolkata Knight Riders", role: "Late finisher", trend: "Boundary density remains high late", note: "Any match that stays live into the last five overs tilts toward his impact." },
          { name: "Sunil Narine", team: "Kolkata Knight Riders", role: "Tempo setter", trend: "Can reshape powerplay scoring on both sides", note: "His first spell and hitting tempo can move both the moneyline and the total." },
        ],
      };
    case "m9":
      return {
        phaseCards: [
          { label: "Powerplay", homeValue: "48/1", awayValue: "44/2", note: "Lahore did not overextend early, but they protected wickets better from the start." },
          { label: "Middle overs", homeValue: "88/4", awayValue: "95/4", note: "Karachi briefly held the better middle segment, but the tempo did not carry into the close." },
          { label: "Late surge", homeValue: "46/2", awayValue: "37/5", note: "The match really split on the wicket cluster across the final four overs." },
        ],
        venueCards: [
          { label: "Avg first innings", value: "175", detail: "Recent Gaddafi baseline" },
          { label: "Chase bias", value: "49%", detail: "Little structural edge either way" },
          { label: "Surface pace", value: "True-medium", detail: "Middle-overs wicket protection matters" },
          { label: "Night factor", value: "Low", detail: "Dew is less of a driver here" },
        ],
        playerWatch: [
          { name: "Fakhar Zaman", team: "Lahore Qalandars", role: "Early accelerator", trend: "Directer attacking conversion at home", note: "If he absorbs the first pressure wave, Lahore can carry the game into their best late-innings shape." },
          { name: "Shaheen Afridi", team: "Lahore Qalandars", role: "New-ball bowler", trend: "Still among the best wicket creators up front", note: "Early wickets keep defining Karachi's chase baseline." },
          { name: "James Vince", team: "Karachi Kings", role: "Chase anchor", trend: "Stable middle-overs scoring but needs wicket protection around him", note: "Without support, Karachi tend to collapse between overs 12 and 15." },
        ],
      };
    default:
      return null;
  }
}

export function getCricketLeagueDepth(leagueSlug: string, locale: Locale): CricketLeagueDepth | null {
  if (locale === "en") {
    return getLeagueDepthEn(leagueSlug);
  }

  if (locale === "zh-TW") {
    return getLeagueDepthZhTw(leagueSlug);
  }

  return getLeagueDepthZhCn(leagueSlug);
}

export function getCricketMatchDepth(matchId: string, locale: Locale): CricketMatchDepth | null {
  if (locale === "en") {
    return getMatchDepthEn(matchId);
  }

  if (locale === "zh-TW") {
    return getMatchDepthZhTw(matchId);
  }

  return getMatchDepthZhCn(matchId);
}
