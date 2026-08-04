/**
 * translations.js
 *
 * All static UI strings for the app in English and Chinese.
 * Import { translations } and use via the t() helper in LanguageContext.
 */

export const translations = {
  en: {
    // ── App-wide ──────────────────────────────────────────────────────────
    back: '← Back',
    loading: 'Loading…',
    tryAgain: 'Try again',

    // ── HomePage ──────────────────────────────────────────────────────────
    home: {
      tagline: 'Practice conversations that matter.',
      startTalking: 'Start Talking',
      viewGrowthReport: 'View Growth Report',
    },

    // ── ScenarioIntroPage ─────────────────────────────────────────────────
    intro: {
      tapToBegin: 'Tap to begin',
    },

    // ── DialogueScreen ────────────────────────────────────────────────────
    dialogue: {
      turnCounter: (current, max) => `${current}/${max}`,
      needSuggestion: 'Need a suggestion?',
      endEarly: 'End conversation early',
      seeHowItWent: 'See how it went →',
      connectionTimedOut: 'The connection timed out. Try again?',
      connectionInterrupted: 'Something interrupted the connection. Try again?',
    },

    // ── EndingScreen ──────────────────────────────────────────────────────
    ending: {
      reflecting: 'Reflecting…',
      seeResults: 'See your results →',
      skip: 'Skip',
      outcomes: {
        positive: 'Connection made',
        neutral:  'Left unresolved',
        negative: 'Still distant',
      },
    },

    // ── ResultsScreen ─────────────────────────────────────────────────────
    results: {
      headlines: {
        great:    'Great connection!',
        good:     'Good effort!',
        practice: 'Keep practising!',
        tough:    'That was tough — try again?',
      },
      xpEarned: 'earned this session',
      connection: 'Connection',
      dailyTasksDone: 'Daily tasks completed!',
      bonusXp: (n) => `+${n} bonus XP added to your total`,
      growthReport: 'Growth Report',
      playAgain: 'Play Again',
    },

    // ── GrowthReportPage ──────────────────────────────────────────────────
    growth: {
      heading: 'Your Growth',
      sampleData: 'sample data',
      totalXp: 'Total XP',
      scenarios: 'Scenarios',
      levelProgress: 'Level Progress',
      compositeTrend: 'Composite Trend',
      sessionCount: (n) => `${n} session${n !== 1 ? 's' : ''}`,
      eachPoint: 'Each point = one completed scenario',
      dimensionAverages: 'Dimension Averages',
      strengthsGrowth: 'Strengths & Areas to Grow',
      realMoments: 'Real Moments',
      tryNext: (dim) => `Try next — builds ${dim}`,
      notTriedYet: (dim, dim2) => `You haven't tried this one yet — it focuses on ${dim} and ${dim2}.`,
      triedBefore: (dim) => `You've played this before. Try again with a focus on improving your ${dim} score.`,
      bestTurn: 'best turn',
      strength: 'Strength',
      needsWork: 'Needs work',
      avgStrong: (n) => `avg ${n} — consistently strong across sessions`,
      avgGrow: (n) => `avg ${n} — most room to grow`,
      composite: 'composite',
    },

    // ── Dimensions ────────────────────────────────────────────────────────
    dims: {
      clarity:    'Clarity',
      empathy:    'Empathy',
      politeness: 'Politeness',
      expression: 'Expression',
    },

    // ── DailyMissionCard ──────────────────────────────────────────────────
    missions: {
      heading: 'Daily Tasks',
      allDone: 'All done for today — great work! 🎉',
      // Mission labels (keyed by mission ID)
      complete_easy:       'Complete Alex or Jamie scenario',
      complete_medium:     'Complete Sam, Morgan or Riley scenario',
      complete_hard:       'Complete Mom or Jordan scenario',
      complete_any:        'Complete 2 scenarios today',
      score_empathy_70:    'Score 70+ empathy in one conversation',
      score_clarity_70:    'Score 70+ clarity in one conversation',
      score_composite_75:  'Achieve a composite score of 75 or higher',
      try_new_scenario:    "Try a scenario you haven't played before",
      free_text_twice:     'Use free-text input at least twice in one conversation',
      high_connection:     'Finish a scenario with connection mood above 65',
    },

    // ── Scenario titles for GrowthReport (fallback) ───────────────────────
    scenarioTitles: {
      'coffee-shop-stranger':    'Coffee Shop Chat',
      'office-coworker':         'Office Small Talk',
      'park-old-friend':         'Park Bench Reunion',
      'office-conflict':         'Coworker Conflict',
      'uni-teammate-silent':     'Study Room Check-In',
      'home-kitchen-mum':        'Kitchen Table Talk',
      'supermarket-best-friend': 'Supermarket Run-In',
    },
  },

  zh: {
    // ── App-wide ──────────────────────────────────────────────────────────
    back: '← 返回',
    loading: '加载中…',
    tryAgain: '重试',

    // ── HomePage ──────────────────────────────────────────────────────────
    home: {
      tagline: '练习那些真正重要的对话。',
      startTalking: '开始对话',
      viewGrowthReport: '查看成长报告',
    },

    // ── ScenarioIntroPage ─────────────────────────────────────────────────
    intro: {
      tapToBegin: '点击开始',
    },

    // ── DialogueScreen ────────────────────────────────────────────────────
    dialogue: {
      turnCounter: (current, max) => `${current}/${max}`,
      needSuggestion: '需要提示？',
      endEarly: '提前结束对话',
      seeHowItWent: '查看结果 →',
      connectionTimedOut: '连接超时，请重试。',
      connectionInterrupted: '连接中断，请重试。',
    },

    // ── EndingScreen ──────────────────────────────────────────────────────
    ending: {
      reflecting: '结局揭晓中…',
      seeResults: '查看你的结果 →',
      skip: '跳过',
      outcomes: {
        positive: '建立了连接',
        neutral:  '留有余地',
        negative: '仍有隔阂',
      },
    },

    // ── ResultsScreen ─────────────────────────────────────────────────────
    results: {
      headlines: {
        great:    '连接成功！',
        good:     '不错的尝试！',
        practice: '继续练习！',
        tough:    '这次有点难——再试一次？',
      },
      xpEarned: '本次获得',
      connection: '连接度',
      dailyTasksDone: '完成每日任务！',
      bonusXp: (n) => `+${n} 奖励经验值已计入总量`,
      growthReport: '成长报告',
      playAgain: '再玩一次',
    },

    // ── GrowthReportPage ──────────────────────────────────────────────────
    growth: {
      heading: '你的成长',
      sampleData: '示例数据',
      totalXp: '总经验值',
      scenarios: '场景数',
      levelProgress: '等级进度',
      compositeTrend: '综合趋势',
      sessionCount: (n) => `${n} 次对话`,
      eachPoint: '每个点 = 一次完成的场景',
      dimensionAverages: '维度平均值',
      strengthsGrowth: '优势与待提升项',
      realMoments: '真实时刻',
      tryNext: (dim) => `下次尝试 — 提升${dim}`,
      notTriedYet: (dim, dim2) => `你还没尝试过这个场景——它侧重于${dim}和${dim2}。`,
      triedBefore: (dim) => `你之前玩过这个场景。再试一次，专注提升${dim}。`,
      bestTurn: '最佳回合',
      strength: '优势',
      needsWork: '待提升',
      avgStrong: (n) => `平均 ${n} — 各场景表现稳定`,
      avgGrow: (n) => `平均 ${n} — 最大提升空间`,
      composite: '综合分',
    },

    // ── Dimensions ────────────────────────────────────────────────────────
    dims: {
      clarity:    '清晰度',
      empathy:    '共情力',
      politeness: '礼貌度',
      expression: '表达力',
    },

    // ── DailyMissionCard ──────────────────────────────────────────────────
    missions: {
      heading: '每日任务',
      allDone: '今天全部完成——干得漂亮！🎉',
      complete_easy:       '完成 Alex 或 Jamie 场景',
      complete_medium:     '完成 Sam, Morgan 或 Riley 场景',
      complete_hard:       '完成 Mom 或 Jordan 场景',
      complete_any:        '今天完成 2 个场景',
      score_empathy_70:    '在一次对话中共情力得分超过 70',
      score_clarity_70:    '在一次对话中清晰度得分超过 70',
      score_composite_75:  '综合得分达到 75 或以上',
      try_new_scenario:    '尝试一个你从未玩过的场景',
      free_text_twice:     '在一次对话中至少两次使用自由输入',
      high_connection:     '以连接度超过 65 完成场景',
    },

    // ── Scenario titles for GrowthReport (fallback) ───────────────────────
    scenarioTitles: {
      'coffee-shop-stranger':    '咖啡馆闲聊',
      'office-coworker':         '办公室寒暄',
      'park-old-friend':         '公园重逢',
      'office-conflict':         '同事冲突',
      'uni-teammate-silent':     '自习室关怀',
      'home-kitchen-mum':        '厨房谈心',
      'supermarket-best-friend': '超市偶遇',
    },
  },
}
