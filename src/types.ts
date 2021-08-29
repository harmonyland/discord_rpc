// deno-lint-ignore-file
// deno-lint-ignore-file camelcase

export interface Activity {
  details?: string;
  state?: string;
  assets?: {
    large_image?: string;
    large_text?: string;
    small_image?: string;
    small_text?: string;
  };
  party?: {
    id?: string;
    size?: number;
  };
  timestamps?: {
    start: number;
    end: number;
  };
  secrets?: {
    match?: string;
    join?: string;
    spectate?: string;
  };
  buttons?: {
    label?: string;
    url?: string;
  }[];
}

export enum OpCode {
  HANDSHAKE,
  FRAME,
  CLOSE,
  PING,
  PONG,
}

/** Commands used to communicate with IPC. */
export enum Command {
  DISPATCH,
  AUTHORIZE,
  AUTHENTICATE,
  GET_GUILD,
  GET_GUILDS,
  GET_CHANNEL,
  GET_CHANNELS,
  SUBSCRIBE,
  UNSUBSCRIBE,
  SET_USER_VOICE_SETTINGS,
  SELECT_VOICE_CHANNEL,
  GET_SELECTED_VOICE_CHANNEL,
  SELECT_TEXT_CHANNEL,
  GET_VOICE_SETTINGS,
  SET_VOICE_SETTINGS,
  CAPTURE_SHORTCUT,
  SET_CERTIFIED_DEVICES,
  SET_ACTIVITY,
  SEND_ACTIVITY_JOIN_INVITE,
  CLOSE_ACTIVITY_REQUEST,
  SET_USER_ACHIEVEMENT,
  GET_USER_ACHIEVEMENTS,
  GET_ACTIVITY_JOIN_TICKET,
  SEND_GENERIC_EVENT,
  NETWORKING_SYSTEM_METRICS,
  NETWORKING_PEER_METRICS,
  NETWORKING_CREATE_TOKEN,
  GET_SKUS,
  GET_ENTITLEMENTS,
  GET_NETWORKING_CONFIG,
  START_PURCHASE,
  GET_ENTITLEMENT_TICKET,
  GET_APPLICATION_TICKET,
  VALIDATE_APPLICATION,
  OPEN_OVERLAY_VOICE_SETTINGS,
  OPEN_OVERLAY_GUILD_INVITE,
  OVEN_OVERLAY_ACTIVITY_INVITE,
  SET_OVERLAY_LOCKED,
  DISCONNECT_FROM_LOBBY_VOICE,
  CONNECT_TO_LOBBY_VOICE,
  SEARCH_LOBBIES,
  SEND_TO_LOBBY,
  DISCONNECT_FROM_LOBBY,
  CONNECT_TO_LOBBY,
  UPDATE_LOBBY_MEMBER,
  DELETE_LOBBY,
  UPDATE_LOBBY,
  CREATE_LOBBY,
  GET_IMAGE,
  BROWSER_HANDOFF,
  OVERLAY,
  GUILD_TEMPLATE_BROWSER,
  GIFT_CODE_BROWSER,
  BRAINTREE_POPUP_BRIDGE_CALLBACK,
  CONNECTIONS_CALLBACK,
  DEEP_LINK,
  INVITE_BROWSER,
  OPEN_INVITE_DIALOG,
  ACCEPT_ACTIVITY_INVITE,
  ACTIVITY_INVITE_USER,
  CLOSE_ACTIVITY_JOIN_REQUEST,
  SET_VOICE_SETTINGS_2,
  SET_USER_VOICE_SETTINGS_2,
  CREATE_CHANNEL_INVITE,
  GET_RELATIONSHIPS,
}

/** Events `DISPATCH`'d from IPC. */
export enum RPCEvent {
  READY,
  ERROR,
  GUILD_STATUS,
  GUILD_CREATE,
  CHANNEL_CREATE,
  VOICE_CHANNEL_SELECT,
  VOICE_STATE_CREATE,
  VOICE_STATE_UPDATE,
  VOICE_STATE_DELETE,
  VOICE_SETTINGS_UPDATE,
  VOICE_CONNECTION_STATUS,
  SPEAKING_START,
  SPEAKING_STOP,
  MESSAGE_CREATE,
  MESSAGE_UPDATE,
  MESSAGE_DELETE,
  NOTIFICATION_CREATE,
  CAPTURE_SHORTCUT_CHANGE,
  ACTIVITY_JOIN,
  ACTIVITY_JOIN_REQUEST,
  ACTIVITY_SPECTATE,
  CURRENT_USER_UPDATE,
  RELATIONSHIP_UPDATE,
  VOICE_SETTINGS_UPDATE_2,
  GAME_JOIN,
  GAME_SPECTATE,
  LOBBY_DELETE,
  LOBBY_UPDATE,
  LOBBY_MEMBER_CONNECT,
  LOBBY_MEMBER_DISCONNECT,
  LOBBY_MEMBER_UPDATE,
  LOBBY_MESSAGE,
  OVERLAY,
  OVERLAY_UPDATE,
  ENTITLEMENT_CREATE,
  ENTITLEMENT_DELETE,
  USER_ACHIEVEMENT_UPDATE,
}

/** Nitro type of UserPayload. */
export enum PremiumType {
  NONE,
  NITRO_CLASSIC,
  NITRO,
}

/** Partial UserPayload object */
export interface UserPayload {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  bot?: boolean;
  publicFlags?: number;
  premium_type?: PremiumType;
}

/** Client Config sent on Ready event. */
export interface ClientConfig {
  cdn_host: string;
  api_endpoint: string;
  environment: string;
}

export interface UserPayloadVoiceSettingsPan {
  left: number;
  right: number;
}

export interface UserPayloadVoiceSettings {
  user_id: string;
  pan?: UserPayloadVoiceSettingsPan;
  volume?: number;
  mute?: boolean;
}

export interface VoiceSettingsInput {
  device_id: string;
  volume: number;
  available_devices: any[];
}

export type VoiceSettingsOutput = VoiceSettingsInput;

export interface ShortcutKeyCombo {
  type: KeyType;
  code: number;
  name: string;
}

export interface VoiceSettingsMode {
  type: string;
  auto_threshold: boolean;
  threshold: number;
  shortcut: ShortcutKeyCombo;
  delay: number;
}

export enum KeyType {
  KEYBOARD_KEY,
  MOUSE_BUTTON,
  KEYBOARD_MODIFIER_KEY,
  GAMEPAD_BUTTON,
}

export interface VoiceSettings {
  input: VoiceSettingsInput;
  output: VoiceSettingsOutput;
  mode: VoiceSettingsMode;
  automatic_gain_control: boolean;
  echo_cancellation: boolean;
  noise_cancellation: boolean;
  qos: boolean;
  silence_warning: boolean;
  deaf: boolean;
  mute: boolean;
}

export interface DeviceVendor {
  name: string;
  url: string;
}

export interface DeviceModel {
  name: string;
  url: string;
}

export enum DeviceType {
  AudioInput = "audioinput",
  AudioOutput = "audiooutput",
  VideoInput = "videoinput",
}

export interface Device {
  type: DeviceType;
  id: string;
  vendor: DeviceVendor;
  model: DeviceModel;
  related: string[];
  echo_cancellation?: boolean;
  noise_cancellation?: boolean;
  automatic_gain_control?: boolean;
  hardware_mute?: boolean;
}

export interface VoiceStateData {
  mute: boolean;
  deaf: boolean;
  self_mute: boolean;
  self_deaf: boolean;
  suppress: boolean;
}

export interface VoiceState {
  voice_state: VoiceStateData;
  user: UserPayload;
  nick?: string | null;
  mute: boolean;
  volume: number;
  pan: UserPayloadVoiceSettingsPan;
}

export interface Attachment {
  content_type?: string;
  ephemeral: boolean;
  filename: string;
  width?: number;
  height?: number;
  id: string;
  proxy_url: string;
  size: number;
  url: string;
}

export interface EmbedPayload {
  title?: string;
  type?: EmbedTypes;
  description?: string;
  url?: string;
  timestamp?: string;
  color?: number;
  footer?: EmbedFooter;
  image?: EmbedImage;
  thumbnail?: EmbedThumbnail;
  video?: EmbedVideo;
  provider?: EmbedProvider;
  author?: EmbedAuthor;
  fields?: EmbedField[];
}

export type EmbedTypes =
  | "rich"
  | "image"
  | "video"
  | "gifv"
  | "article"
  | "link";

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface EmbedAuthor {
  name?: string;
  url?: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface EmbedFooter {
  text: string;
  icon_url?: string;
  proxy_icon_url?: string;
}

export interface EmbedImage {
  url?: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export interface EmbedProvider {
  name?: string;
  url?: string;
}

export interface EmbedVideo {
  url?: string;
  height?: number;
  width?: number;
}

export interface EmbedThumbnail {
  url?: string;
  proxy_url?: string;
  height?: number;
  width?: number;
}

export enum MessageType {
  DEFAULT,
  RECIPIENT_ADD,
  RECIPIENT_REMOVE,
  CALL,
  CHANNEL_NAME_CHANGE,
  CHANNEL_ICON_CHANGE,
  CHANNEL_PINNED_MESSAGE,
  GUILD_MEMBER_JOIN,
  USER_PREMIUM_GUILD_SUBSCRIPTION,
  USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_1,
  USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_2,
  USER_PREMIUM_GUILD_SUBSCRIPTION_TIER_3,
  CHANNEL_FOLLOW_ADD,
  GUILD_DISCOVERY_DISQUALIFIED = 14,
  GUILD_DISCOVERY_REQUALIFIED = 15,
  GUILD_DISCOVERY_GRACE_PERIOD_INITIAL_WARNING = 16,
  GUILD_DISCOVERY_GRACE_PERIOD_FINAL_WARNING = 17,
  THREAD_CREATED = 18,
  REPLY = 19,
  APPLICATION_COMMAND = 20,
  THREAD_STARTER_MESSAGE = 21,
  GUILD_INVITE_REMINDER = 22,
}

export interface Message {
  id: string;
  content: string;
  nick: string;
  timestamp: string;
  tts: boolean;
  mentions: UserPayload[];
  mention_roles: string[];
  embeds: EmbedPayload[];
  attachments: Attachment[];
  author: UserPayload;
  pinned: boolean;
  type: MessageType;
  author_color: string;
}

export interface ApplicationPayload {
  id: string;
  name: string;
  icon: string | null;
  description?: string;
  summary?: string;
  hook: boolean;
  bot_public?: boolean;
  bot_require_code_grant?: boolean;
  verify_key: string;
}

export interface AuthenticateResponsePayload {
  application: ApplicationPayload;
  scopes: string[];
  expires: string;
  user: UserPayload;
  access_token: string;
}

export enum ChannelType {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_NEWS = 5,
  GUILD_STORE = 6,
  NEWS_THREAD = 10,
  PUBLIC_THREAD = 11,
  PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
}

export interface ChannelPayload {
  id: string;
  name: string;
  type: ChannelType;
  topic?: string;
  bitrate?: number;
  user_limit?: number;
  guild_id: string;
  position: number;
  voice_states?: VoiceState[];
  messages?: Message[];
}

export interface PartialChannel {
  id: string;
  name: string;
  type: ChannelType;
}

export interface Guild {
  id: string;
  name: string;
  icon_url: string | null;
}

export interface PartialGuild {
  id: string;
  name: string;
}

export interface GetImageOptions {
  type: "user";
  id: string;
  format: "png" | "apng" | "webp" | "gif" | "jpg";
  size: number;
}

export enum LobbyType {
  Private = 1,
  Public = 2,
}

export interface LobbyMetadata {
  [name: string]: string | number;
}

export interface LobbyOptions {
  type?: LobbyType;
  owner_id?: string;
  capacity?: number;
  metadata?: LobbyMetadata;
  locked?: boolean;
}

export interface Lobby {
  application_id: string;
  capacity: number;
  id: string;
  locked: boolean;
  members: Array<{ metadata: LobbyMetadata; user: UserPayload }>;
  metadata: LobbyMetadata;
  owner_id: string;
  region: string;
  secret: string;
  type: LobbyType;
  voice_states: VoiceState[];
}

export interface NetworkingConfig {
  address: string;
  /** Not the token you think of, lol. */
  token: string;
}

export interface PresencePayload {
  status: "online" | "offline" | "dnd" | "invisible" | "idle";
  activities?: Activity[];
}

export interface RelationshipPayload {
  type: number;
  user: UserPayload;
  presence: PresencePayload;
}

export interface ReadyEventPayload {
  v: 1;
  user: UserPayload;
  config: ClientConfig;
}
