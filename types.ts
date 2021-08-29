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
