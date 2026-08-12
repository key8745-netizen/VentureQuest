// Anti-patterns — the beliefs that reliably kill a first side business,
// paired with what to say back.
//
// The local advisor diagnoses from numbers, which means it ignored what
// the user actually typed. Someone writing "我這個大家都需要" got a
// reply about their weekly units. These let it answer the belief.
//
// The table is also folded into the LLM prompts, so a user with an API
// key and a user without one get challenged on the same things.
//
// Matching rule, same as inputCheck.js: only distinctive multi-character
// phrases, never single common words. A challenge fired at a reasonable
// question is worse than no challenge — it makes the advisor look like
// it did not read the question.

export const ANTI_PATTERNS = [
  {
    id: 'everyone-needs-it',
    belief: '這個大家都需要',
    phrases: ['大家都需要', '每個人都需要', '所有人都需要', '大家都會想要', '人人都需要'],
    respond:
      '如果對象是所有人，實際上就是沒有人——你不知道要去哪裡找他，也不知道文案該寫給誰看。' +
      '講一個具體的人：最近一次真的為這件事困擾的，是誰？他當時在做什麼？',
  },
  {
    id: 'no-competition',
    belief: '這個沒有競爭者',
    phrases: ['沒有競爭', '沒有對手', '沒人在做', '還沒有人做', '沒有人做這個', '獨一無二'],
    respond:
      '永遠有競爭者。就算沒有同業，你的對手也是「繼續忍耐」和「自己想辦法」——' +
      '而且這兩個是免費的。你的客人現在是怎麼解決這件事的？你要贏的是那個做法，不是某間公司。',
  },
  {
    id: 'not-ready-yet',
    belief: '等我做好一點再賣',
    phrases: ['做好一點再', '再完美一點', '準備好再', '做完再賣', '弄好再賣', '還沒準備好'],
    respond:
      '再做得更好不會讓人更想付錢，開口才會。而且你現在不知道要把哪裡做好——' +
      '那是客人才知道的事。用現在這一版報一次價，對方的反應會告訴你下一步該補什麼。',
  },
  {
    id: 'friends-said-good',
    belief: '朋友都說很棒',
    phrases: ['朋友都說', '朋友說很', '朋友覺得不錯', '大家都說讚', '都說不錯', '身邊的人都說'],
    respond:
      '朋友的稱讚不是需求，是禮貌。唯一算數的問題是：他付錢了嗎？' +
      '沒有的話，去找一個不認識你、沒有義務對你好的人問同樣的問題。',
  },
  {
    id: 'free-first',
    belief: '先免費做大再收費',
    phrases: ['先免費', '免費先做', '先做大再', '先衝人數', '先養用戶'],
    respond:
      '免費用戶要變成付費用戶，得有一個具體的理由，而且那個理由不會自己出現。' +
      '你打算靠什麼讓他掏錢？如果現在答不出來，先收一點點錢反而比較快知道答案。',
  },
  {
    id: 'compete-on-price',
    belief: '賣便宜一點比較好賣',
    phrases: ['賣便宜', '價格低一點', '降價比較好', '削價競爭', '比別人便宜'],
    respond:
      '低價會招來最難伺候、也最不會回頭的客人，而且你隨時會被更便宜的人取代。' +
      '先看你的單位毛利撐不撐得住——如果每個只賺一點點，多賣只是把自己累死。',
  },
  {
    id: 'no-time-yet',
    belief: '等我有時間再開始',
    phrases: ['等我有時間', '有空再', '忙完再', '等比較不忙', '最近太忙'],
    respond:
      '時間不會自己變多，只會被更晚的事填滿。這個 app 的整個設計前提就是你沒有時間——' +
      '所以問題不是「什麼時候有空」，是「今天這 15 分鐘要拿來做哪一件」。',
  },
];

/**
 * The anti-pattern the user's own words match, or null. Returns the
 * first match only: one challenge per reply, otherwise the advice turns
 * into a lecture.
 */
export function matchAntiPattern(text) {
  const input = String(text ?? '');
  if (input.length === 0) return null;

  return (
    ANTI_PATTERNS.find((pattern) =>
      pattern.phrases.some((phrase) => input.includes(phrase)),
    ) ?? null
  );
}

/** The table as prompt text, so the LLM challenges the same beliefs. */
export const ANTI_PATTERN_INSTRUCTIONS = [
  '【要當場擋下來的說法】使用者講出下列任一種話時,先處理它,再回答原本的問題:',
  ...ANTI_PATTERNS.map((pattern) => `- 「${pattern.belief}」→ ${pattern.respond}`),
  '擋的時候陳述事實,不要說教,不要評價使用者這個人。',
].join('\n');
