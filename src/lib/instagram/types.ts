// Instagram (Meta) webhook payload turlari — faqat foydalanadigan maydonlar bilan.

export interface IgWebhookPayload {
  object: string; // "instagram"
  entry: IgWebhookEntry[];
}

export interface IgWebhookEntry {
  id: string; // IG business account id
  time: number;
  messaging?: IgMessagingItem[];
  changes?: IgChangeItem[];
}

export interface IgMessagingItem {
  sender: { id: string };
  recipient: { id: string };
  timestamp: number;
  message?: {
    mid: string;
    text?: string;
    is_echo?: boolean;
  };
}

export interface IgChangeItem {
  field: string; // "comments"
  value: {
    id: string; // comment id
    text?: string;
    from?: { id: string; username?: string };
    media?: { id: string; media_product_type?: string };
    parent_id?: string;
  };
}

export interface IgUserProfile {
  id: string;
  username?: string;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
}

export interface AutomationRule {
  id: string;
  account_id: string;
  name: string;
  trigger_type: "comment" | "dm" | "both";
  keyword: string | null;
  match_type: "contains" | "exact";
  post_id: string | null;
  require_follow: boolean;
  follow_reply_text: string;
  not_follow_reply_text: string;
  comment_ack_text: string | null;
  media_url: string | null;
  enabled: boolean;
}

export interface IgAccountRow {
  id: string;
  user_id: string;
  ig_user_id: string;
  username: string | null;
  access_token: string; // shifrlangan holda DB'dan keladi, ochilgandan keyin ishlatiladi
  is_active: boolean;
}
