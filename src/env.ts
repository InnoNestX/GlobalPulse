export interface Env {
  APP_KV?: KVNamespace;
  APP_STATE_DO?: DurableObjectNamespace;
  AI?: Ai;
  ADMIN_PASSWORD?: string;
  API_TOKEN?: string;
  DEFAULT_TARGETS?: string;
  CORS_ORIGIN?: string;
  FEISHU_WEBHOOK_URL?: string;
  FEISHU_SIGNING_SECRET?: string;
  WECHAT_OFFICIAL_APP_ID?: string;
  WECHAT_OFFICIAL_APP_SECRET?: string;
  WECHAT_OFFICIAL_OPENID?: string;
  WECHAT_CLAWBOT_WEBHOOK_URL?: string;
  WECHAT_CLAWBOT_WEBHOOK_KEY?: string;
  WECHAT_AI_AGENT_WEBHOOK_URL?: string;
  WECHAT_AI_AGENT_WEBHOOK_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_TO?: string;
}
