function encode(op: number, payloadString: string) {
  const payload = new TextEncoder().encode(payloadString);
  const data = new Uint8Array(4 + 4 + payload.byteLength);
  const view = new DataView(data.buffer);
  view.setInt32(0, op, true);
  view.setInt32(4, payload.byteLength, true);
  data.set(payload, 8);
  return data;
}

interface Activity {
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

function getIPCPath(id: number) {
  if (id < 0 || id > 9) throw new RangeError(`IPC ID must be between 0-9`);

  let prefix, suffix = `discord-ipc-${id}`;
  if (Deno.build.os === "windows") {
    prefix = `\\\\?\\pipe\\`;
  } else {
    prefix = (Deno.env.get("XDG_RUNTIME_DIR") ?? Deno.env.get("TMPDIR") ??
      Deno.env.get("TMP") ?? Deno.env.get("TEMP") ?? "/tmp") + "/";
  }

  return `${prefix}${suffix}`;
}

async function findIPC(id = 0): Promise<Deno.Conn> {
  if (Deno.build.os === "windows") {
    // Unix sockets aren't supported on Windows.
    const PULL = "https://github.com/denoland/deno/pull/10377";
    throw new DOMException(
      "NotSupported",
      `Windows is not supported. See ${PULL}`,
    );
  }

  const path = getIPCPath(id);
  try {
    return await Deno.connect({
      path,
      transport: "unix",
    });
  } catch (e) {
    return findIPC(id + 1);
  }
}

export async function createClient(): Promise<DiscordIPC> {
  const conn = await findIPC();
  const client = Object.create(DiscordIPC.prototype);

  client[_ipcHandle] = conn;
  client[_header] = new Uint8Array(8);
  client[_headerView] = new DataView(client[_header].buffer);

  return client;
}

const _ipcHandle = Symbol("[[ipc]]");
const _header = Symbol("[[header]]");
const _headerView = Symbol("[[headerView]]");

export interface Packet<T> {
  op: OpCode;
  data: T;
}

async function read<T = any>(ipc: DiscordIPC): Promise<Packet<T> | undefined> {
  if (await ipc[_ipcHandle]?.read(ipc[_header]) !== 8) return;
  const op = ipc[_headerView].getInt32(0, true);
  const payloadLength = ipc[_headerView].getInt32(4, true);
  const data = new Uint8Array(payloadLength);
  if (await ipc[_ipcHandle]?.read(data) !== payloadLength) return;
  const payload = new TextDecoder().decode(data);
  return { op, data: JSON.parse(payload) };
}

export class DiscordIPC {
  [_ipcHandle]?: Deno.Conn;

  constructor() {
    throw new TypeError("Use `createClient` instead of `new DiscordIPC`");
  }

  async login(client_id: string) {
    await this.send(OpCode.HANDSHAKE, { v: "1", client_id });
    await read(this);
  }

  [_header]!: Uint8Array;
  [_headerView]!: DataView;

  async send(op: OpCode, payload: any) {
    const nonce = crypto.randomUUID();
    if (typeof payload === "object" && payload !== null) payload.nonce = nonce;
    const data = encode(op, JSON.stringify(payload));
    await this[_ipcHandle]?.write(data);
    return nonce;
  }

  async setActivity(activity: Activity) {
    await this.send(OpCode.FRAME, {
      cmd: "SET_ACTIVITY",
      args: {
        pid: Deno.pid,
        activity,
      },
    });
    await read(this);
  }

  async close() {
    await this[_ipcHandle]?.close();
  }
}
