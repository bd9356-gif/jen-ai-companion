// The Claude model behind every MyRecipe text feature: Chef Jen conversations,
// recipe creation (topchef), recipe enhance/resize/adjust, recipe import,
// Cooking School (Study Hall) quizzes and shopping-list cleanup.
//
// ROLL BACK without touching code: in Vercel → Settings → Environment Variables,
// set CHEF_AI_MODEL = claude-haiku-4-5-20251001 (Production), then Redeploy.
// Delete the variable (and redeploy) to return to the default below.
export const CHEF_MODEL = process.env.CHEF_AI_MODEL || 'claude-sonnet-5-5'

// Claude 5 models think before answering unless told not to. That thinking is slow
// and uses up the max_tokens room, so it is turned off ('between_tools' is the
// lowest setting) — replies come back like today, just from a stronger model.
// Older models (e.g. Haiku 4.5 on rollback) don't accept the setting, so it is
// only sent to Claude 5 models.
export function modelOptions() {
  return /^claude-[a-z]+-5-/.test(CHEF_MODEL)
    ? { model: CHEF_MODEL, thinking: { type: 'between_tools' } }
    : { model: CHEF_MODEL }
}

// The reply's text. Claude 5 can put a (hidden) thinking block first, so the text
// isn't always content[0]; take the first text block instead.
export function replyText(message) {
  return message.content.find((b) => b.type === 'text')?.text ?? ''
}
