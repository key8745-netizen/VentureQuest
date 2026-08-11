// Local wizard help — what "問 AI" answers during onboarding with no
// API key. The eight questions are fixed, so the guidance is written;
// where an answer can honestly be derived from what the user already
// typed, it is offered as a one-tap fill, exactly like the LLM's.

/** Default margin assumed when suggesting a first price from a cost. */
const STARTING_MARKUP = 2;

const HELP = {
  idea: () => ({
    reply:
      '一句話就好，而且越具體越好用。「做吃的」沒辦法幫你算任何東西，' +
      '「賣給附近上班族的便當」就可以。真的還沒想法就選「我還不知道」，' +
      '前面幾關會帶你從你已經會的事情裡找。',
  }),
  employment: () => ({
    reply:
      '這題會改變整個計畫的算法。還在上班的話，你的房租是薪水付的，' +
      '所以生死線不會把生活費算進去，改成算「離職線」。已經離職的話，' +
      '生活費就要靠事業賺回來，算法會跟著變嚴格。照實選就好。',
  }),
  businessFixedCost: () => ({
    reply:
      '只算事業的錢：工具訂閱、網域、店面租金、固定月費那些。' +
      '不要把你自己的房租伙食算進來，下一題才問那個。' +
      '如果目前還沒為這件事花過任何固定費用，填 0 是正確答案，不是偷懶。',
    answer: 0,
  }),
  livingCost: () => ({
    reply:
      '你自己每個月要花多少錢才活得下去：房租、伙食、貸款、保險。' +
      '抓大概就好，寧可估高一點。還在上班的話這筆由薪水付，' +
      '我們拿它算「事業要做到多大你才敢離職」。',
  }),
  unitPrice: (answers) => {
    const cost = Number(answers?.unitCost);
    if (Number.isFinite(cost) && cost > 0) {
      return {
        reply:
          `你剛填的單位成本是 ${cost} 元。新手最常見的錯是定價貼著成本，` +
          '結果每一單都在做白工。先用成本的兩倍當起點，' +
          '再看客人的反應調整——降價永遠比漲價容易。',
        answer: cost * STARTING_MARKUP,
      };
    }
    return {
      reply:
        '還沒定價就先猜一個，這個數字之後隨時能改。' +
        '參考做法：找 3 個同性質的競爭者，看他們收多少，先站在中間。' +
        '不要為了搶客人開最低價，低價客最難伺候也最不會回頭。',
    };
  },
  unitCost: () => ({
    reply:
      '每多賣一個，你要「多」花掉的錢：材料、包材、運費、平台抽成。' +
      '不含房租訂閱那種不管賣不賣都要付的。' +
      '算的時候寧可高估——漏掉的成本是生死線失準最常見的原因。',
  }),
  weeklyHours: (answers) => ({
    reply:
      '寫「你累的時候也做得到」的數字，不是「拚一下可以」的數字。' +
      '高估時間的計畫會在第二週崩掉，然後你會覺得是自己不行，' +
      '其實只是一開始就排錯。' +
      (answers?.employment === 'employed'
        ? '還在上班的話，一週 5 小時是很誠實的起點。'
        : ''),
    ...(answers?.employment === 'employed' ? { answer: 5 } : {}),
  }),
  targetMonthlyIncome: (answers) => {
    const living = Number(answers?.livingCost);
    if (Number.isFinite(living) && living > 0) {
      return {
        reply:
          `你的生活費是 ${living} 元。一個好用的起點是先以「事業能養活自己」為目標，` +
          '也就是跟生活費同一個量級，而不是一開始就設一個聽起來很爽的數字。' +
          '這個目標之後可以改。',
        answer: living,
      };
    }
    return {
      reply:
        '設一個你真的想要、而且說得出理由的數字。' +
        '目標訂太高的副作用不是達不到，是每次看進度都覺得自己失敗，然後放棄。',
    };
  },
};

/**
 * Guidance for one wizard question with no API key. Returns the same
 * shape the LLM path produces, including an optional `answer` that the
 * user can tap to fill in.
 */
export function localQuestionHelp(questionId, answers = {}) {
  const help = HELP[questionId];
  const base = help
    ? help(answers)
    : { reply: '照你目前知道的填就好，之後都能從「修改目標」改回來。' };

  return {
    tasks: [],
    goals: [],
    steps: [],
    answer: null,
    ...base,
    mock: true,
    local: true,
  };
}
