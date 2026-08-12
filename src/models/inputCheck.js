// Input check — stops junk from spending an API call.
//
// Every advisor question costs one of the day's DAILY_CALL_LIMIT calls
// and real money from the user's own key. Typing "測試" and hitting
// send used to burn one. This runs first, locally, for free.
//
// The hard rule here is that it must never reject a real question.
// A filter that blocks legitimate input is worse than no filter: the
// user cannot tell a guard from a bug, and the feature just looks
// broken. So this only matches on *whole-input shape* — length,
// repetition, digits, anchored placeholder words — and never scans for
// substrings inside what the user wrote. (A reference implementation
// elsewhere rejected "a chatbot for small shops" because "chatbot"
// contains "chat", and "shipping cost calculator" because "shipping"
// contains "pi". That is the failure mode being avoided.)

const MIN_LENGTH = 4;

// Anchored: the whole input is the placeholder, not merely contains it.
const PLACEHOLDER = [
  /^test+$/i,
  /^測試+$/,
  /^測$/,
  /^asdf+$/i,
  /^[?？!！。,，.\s]+$/,
  /^哈+$/,
  /^呵+$/,
  /^隨便$/,
  /^不知道$/,
  /^不會$/,
  /^嗨$/,
  /^hi$/i,
  /^hello$/i,
  /^你好$/,
  /^123+$/,
];

export const REASONS = {
  TOO_SHORT: 'too-short',
  PLACEHOLDER: 'placeholder',
  DIGITS_ONLY: 'digits-only',
  REPEATED_CHAR: 'repeated-char',
};

const MESSAGES = {
  [REASONS.TOO_SHORT]: '問題太短了,多寫幾個字顧問才知道你想問什麼。',
  [REASONS.PLACEHOLDER]: '這看起來還不是一個問題。直接寫你卡住的地方,例如「我不知道怎麼開口報價」。',
  [REASONS.DIGITS_ONLY]: '只有數字看不出你想問什麼,用一句話描述你的狀況。',
  [REASONS.REPEATED_CHAR]: '這看起來不是一個問題。用一句話寫你想問的事。',
};

/**
 * Is this worth sending to the advisor? Returns { ok } or
 * { ok: false, reason, message } with plain-language guidance.
 */
export function checkAdvisorQuestion(raw) {
  const text = String(raw ?? '').trim();

  // Placeholders are checked before length: most of them ("測試",
  // "隨便", "不知道") are short enough to trip the length rule, and
  // "this is not a question yet, try describing what you are stuck on"
  // is more useful than "too short".
  if (PLACEHOLDER.some((pattern) => pattern.test(text))) {
    return fail(REASONS.PLACEHOLDER);
  }
  if (text.length < MIN_LENGTH) {
    return fail(REASONS.TOO_SHORT);
  }
  if (/^\d+$/.test(text)) {
    return fail(REASONS.DIGITS_ONLY);
  }
  // The same character over and over ("啊啊啊啊", "aaaaa").
  if (text.length >= 4 && new Set(text).size === 1) {
    return fail(REASONS.REPEATED_CHAR);
  }

  return { ok: true };
}

function fail(reason) {
  return { ok: false, reason, message: MESSAGES[reason] };
}
