// Local goal guide — what "問 AI" answers when there is no API key.
//
// The nineteen built-in stage goals are a fixed, known set, so their
// breakdowns do not need a language model: they need someone to have
// written them down once. Steps are phrased to survive any industry
// (the user's own idea lives in profile.idea and never in here) and to
// work for both employment framings, since LEFT_JOB_OVERRIDES rewords
// some goal labels but keeps the ids.
//
// Anything not in this table — advisor-suggested goals the user
// adopted, or sub-items from an earlier breakdown — gets the generic
// splitter, which is still better than a placeholder because it asks
// the three questions that unstick most goals.

const GUIDE = {
  'explore-g1': {
    reply:
      '這一題是整個事業的地基：講不清楚誰付錢、買什麼，後面的行銷和定價都會歪。標準是一句話講完，而且對方聽完不用追問。',
    steps: [
      { label: '寫下你的客人是「哪一種人」，具體到能想像出一個真人' },
      { label: '寫下他原本怎麼解決這件事，以及那個方法哪裡不好' },
      { label: '把兩句話合成一句：我幫（誰）解決（什麼），收費（多少）' },
    ],
  },
  'explore-g2': {
    reply:
      '訪談的目的不是聽人稱讚你，是找出他願不願意付錢。問「你覺得如何」永遠會得到客氣的答案，要問已經發生的事實。',
    steps: [
      { label: '列出 5 個符合你設定的人，挑 3 個最好約的' },
      { label: '準備 3 個問題，全部問過去的事（上次為了這件事花多少錢？怎麼找到的？）' },
      { label: '完成 3 場對話，每場記下一句對方的原話' },
      { label: '對照 3 份紀錄，圈出重複出現的抱怨' },
    ],
    tasks: [{ label: '約 1 位潛在客戶聊 15 分鐘', minutes: 10 }],
  },
  'explore-g3': {
    reply:
      '生死線就是「每月要賣幾個才不會賠」。算法很簡單，難的是誠實：成本要把容易忘的都算進去，不然這個數字會騙你。',
    steps: [
      { label: '列出事業每月固定支出（訂閱、工具、店租），填進財務面板' },
      { label: '算一次單位變動成本：材料、包材、運費、平台抽成' },
      { label: '確認售價減掉變動成本是正的；不是的話先調價或砍成本' },
    ],
  },
  'explore-g4': {
    reply:
      '第一筆錢的意義不在金額，在於它是唯一無法自欺的驗證：有人真的把錢給你了。金額多小都算，重點是真的收到。',
    steps: [
      { label: '挑 1 個最可能買的人，準備好報價的說法' },
      { label: '直接開口報價，不要先問「你有沒有興趣」' },
      { label: '收到錢之後，把這一週的數字填進每週回顧' },
    ],
    tasks: [{ label: '向 1 個人開口報價', minutes: 15 }],
  },

  'prepare-g1': {
    reply:
      '這一關在確認收入不是運氣。單月做到很容易是偶然，連續三個月才代表背後有可重複的東西。',
    steps: [
      { label: '訂出你的收入門檻數字，寫下來' },
      { label: '每月結束記一次實際收入，連記 3 個月' },
      { label: '三個月都達標後，寫下這三個月客人主要從哪來' },
    ],
  },
  'prepare-g2': {
    reply:
      '緩衝金決定你敢不敢做長期正確的決定。錢不夠的時候，人會被迫接爛案子、亂降價，然後把事業做壞。',
    steps: [
      { label: '算出你的月生活費，乘以 6 和 12，得到兩個數字' },
      { label: '查目前存款離 6 個月那個數字還差多少' },
      { label: '訂出每月要存進緩衝金的固定金額' },
    ],
  },
  'prepare-g3': {
    reply:
      '「每週都會帶來新客戶的管道」是離職前最關鍵的一件事。沒有它，你的收入靠的是每次重新想辦法，那不能拿來規劃人生。',
    steps: [
      { label: '盤點目前為止的客人分別從哪裡來' },
      { label: '挑出帶來最多客人的那一條，其他先放著' },
      { label: '把那條路變成每週固定要做的一件事，寫進行事曆' },
      { label: '連續執行 4 週，記錄每週帶來幾個新客人' },
    ],
    tasks: [{ label: '照你選的管道，做今天該做的那一件事', minutes: 15 }],
  },
  'prepare-g4': {
    reply:
      '登記和執照這種事，晚做的代價通常比早做高很多——尤其是被檢舉或要開發票的時候。先查清楚，不一定要馬上辦。',
    steps: [
      { label: '查你這個行業需要哪些登記、執照或衛生條件' },
      { label: '把每一項的申請單位、需要文件、大概要多久列成表' },
      { label: '排出順序，先辦沒有它就不能營業的那些' },
    ],
  },

  'operate-g1': {
    reply:
      '十個付費客戶是一個分水嶺：低於這個數，你分不出來是產品好還是人情。超過了，回頭看才會出現真正的模式。',
    steps: [
      { label: '開一張表，記下每一位付過錢的客人和成交來源' },
      { label: '每成交一位就補一筆，直到累積 10 位' },
      { label: '滿 10 位後看來源欄，找出最有效的那一種' },
    ],
  },
  'operate-g2': {
    reply:
      '把交付流程寫下來，是你未來能休假、能找人幫忙的前提。判斷標準很直接：別人照著做，做得出來八成像。',
    steps: [
      { label: '把交付一次服務的過程拆成 5 步以內' },
      { label: '每一步寫清楚：要做什麼、做到什麼程度算完成' },
      { label: '找一個人照著做一次，把他卡住的地方補進去' },
    ],
  },
  'operate-g3': {
    reply:
      '單月損益平衡是事業第一次「自己站著」。這一關會由你填的每週回顧自動判定，所以重點是老實記數字。',
    steps: [
      { label: '確認財務面板的固定支出和單位成本是最新的' },
      { label: '連續 4 週填每週回顧，數字照實填' },
      { label: '合計單量達到生死線時，這一關會自動完成' },
    ],
  },
  'operate-g4': {
    reply:
      '書面好評是你之後所有招客動作的燃料。時機比話術重要：在客人剛表達滿意的當下開口，成功率最高。',
    steps: [
      { label: '列出 5 位你知道滿意的客人' },
      { label: '寫一段簡短的請求，附上兩個問題讓對方好回答' },
      { label: '收集到 3 段書面回覆，存起來' },
    ],
    tasks: [{ label: '跟 1 位滿意的客戶要一段書面評價', minutes: 10 }],
  },

  'grow-g1': {
    reply:
      '這一關是你從「做事的人」變成「經營的人」的門檻。寫下來還不夠，要真的交出去一次，才知道寫得夠不夠清楚。',
    steps: [
      { label: '列出你每週重複做的事，挑出最花時間的 3 件' },
      { label: '把每一件寫成別人能照做的步驟' },
      { label: '每一件都真的交給別人做一次，回來補上漏掉的細節' },
    ],
  },
  'grow-g2': {
    reply:
      '第一個幫手不必是全職。重點是把某一整塊事情完整交出去，而不是零碎地叫人幫忙——後者只會讓你更累。',
    steps: [
      { label: '從已寫成流程的事裡，挑一整塊可以完整外包的' },
      { label: '算出這塊每月值多少錢，訂出你付得起的預算' },
      { label: '找 2-3 個人選試做一次，留下最合適的' },
    ],
  },
  'grow-g3': {
    reply:
      '轉介是成本最低的客源，但它幾乎不會自己發生——大部分客人只是沒想到可以介紹，不是不願意。',
    steps: [
      { label: '寫一句好轉述的話，讓客人可以直接複製貼給朋友' },
      { label: '挑 5 位滿意的老客戶，個別傳給他們' },
      { label: '記錄有沒有帶來新客人，有的話回頭謝謝介紹的人' },
    ],
    tasks: [{ label: '把轉介話術傳給 1 位老客戶', minutes: 10 }],
  },
  'grow-g4': {
    reply:
      '連續一季成長，代表成長來自你做對的事，不是來自一次運氣。看季而不看月，就是為了濾掉運氣。',
    steps: [
      { label: '記錄每個月的營收，連續記 3 個月' },
      { label: '每月月底寫一句：這個月成長或衰退的主因' },
      { label: '三個月後回頭看，把有效的那件事變成固定動作' },
    ],
  },

  'scale-g1': {
    reply:
      '第二個營運單位是在驗證「這套東西能複製」。如果第二個要靠你本人親自坐鎮，那就不是複製，是分身乏術。',
    steps: [
      { label: '寫下第一個單位靠哪些條件運作（人、流程、地點、設備）' },
      { label: '找出其中哪些是「只有你能做」，先把它們寫成流程' },
      { label: '在第二個單位跑一次完整流程，直到它自己收到錢' },
    ],
  },
  'scale-g2': {
    reply:
      '休一整週而事業照常，是最誠實的體檢。撐不過去的地方，就是你還沒真正交出去的地方。',
    steps: [
      { label: '列出你不在的時候，每件事分別由誰負責' },
      { label: '先試離開 2 天，記下哪些事情卡住' },
      { label: '把卡住的部分補成流程或換人負責，再試一整週' },
    ],
  },
  'scale-g3': {
    reply:
      '三倍營收在這個階段不該靠你多做三倍的事，而是靠單位數量或流程效率。做法錯了，數字到了人也垮了。',
    steps: [
      { label: '寫下落地營運期的月營收數字，乘以 3 當目標' },
      { label: '拆解這個目標要幾個營運單位、每個要多少產出' },
      { label: '每月對照一次實際數字和這個拆解' },
    ],
  },
};

const GENERIC = {
  reply:
    '沒有設定 API key，所以這裡給的是通用拆法（設定 key 之後顧問會針對你的產業給具體內容）。' +
    '不過大部分卡住的目標，用下面三個問題就能拆開：你缺的是資訊、能力，還是只是還沒排時間？',
  steps: [
    { label: '寫下要達成它，你還缺哪一項：資訊、能力，還是時間' },
    { label: '針對缺的那一項，寫下今天就能做的第一個 15 分鐘動作' },
    { label: '訂出你認為「做到什麼程度算完成」的標準' },
  ],
  tasks: [],
};

/**
 * Breakdown guidance for one goal, with no API key. Built-in goals get
 * their written breakdown; adopted or nested items get the generic
 * splitter.
 */
export function localGoalGuide(goalId) {
  const entry = GUIDE[goalId];
  const base = entry ?? GENERIC;
  return {
    reply: base.reply,
    steps: base.steps ?? [],
    tasks: base.tasks ?? [],
    goals: [],
    mock: true,
    local: true,
    builtIn: Boolean(entry),
  };
}

export { GUIDE as LOCAL_GOAL_GUIDE };
