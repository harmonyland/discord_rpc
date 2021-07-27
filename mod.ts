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

const _ipcHandle = Symbol("[[ipc]]");

function getIPCPath(id: number) {
  if (id < 0 || id > 9) throw new RangeError(`IPC ID must be between 0-9`);

  let prefix, suffix = `discord-ipc-${id}`;
  if (Deno.build.os === "windows") {
    prefix = `\\\\?\\pipe\\`;
  } else {
    prefix = Deno.env.get("XDG_RUNTIME_DIR") ?? Deno.env.get("TMPDIR") ??
      Deno.env.get("TMP") ?? Deno.env.get("TEMP") ?? "/tmp";
  }

  return `${prefix}${suffix}`;
}

async function findIPC(id = 0): Promise<string> {
  const path = getIPCPath(id);
  try {
    await Deno.open(path).then((e) => e.close());
    return path;
  } catch (e) {
    return findIPC(id + 1);
  }
}

export async function createClient(): Promise<RichPresence> {
  const path = await findIPC();
  const client = Object.create(RichPresence.prototype);

  // NOTE(DjDeveloperr): Should we remove this condition since OS-specific logic is handled
  // in the findIPCPath function? This would maybe just start working once unix sockets are
  // enabled on Windows.

  // Open a IPC connection
  if (Deno.build.os !== "windows") {
    // Unix
    client[_ipcHandle] = await Deno.connect({
      path,
      transport: "unix",
    });
  } else {
    // Unix sockets aren't supported on Windows.
    const PULL = "https://github.com/denoland/deno/pull/10377";
    throw new DOMException(
      "NotSupported",
      `Windows is not supported. See ${PULL}`,
    );
  }
  return client;
}

// NOTE(DjDeveloperr): We should probably use a better name for this,
// Discord IPC is much more than just a way to set Rich Presence.
// And we can also probably use x/event for emitting events.
export class RichPresence {
  [_ipcHandle]?: Deno.Conn;

  constructor() {
    throw new TypeError("Use `createClient` instead of `new RichPresence`");
  }

  async login(client_id: string) {
    const payload = JSON.stringify({ v: "1", client_id });
    await this[_ipcHandle]?.write(encode(0, payload));
    await this.#read();
  }

  #header = new Uint8Array(8);
  #headerView = new DataView(this.#header.buffer);

  // NOTE(DjDeveloperr): We should keep reading in a loop until it's closed since Discord IPC
  // is capable of emitting events too.
  async #read() {
    if (await this[_ipcHandle]?.read(this.#header) !== 8) return;
    const op = this.#headerView.getInt32(0, true);
    const payloadLength = this.#headerView.getInt32(4, true);
    const data = new Uint8Array(payloadLength);
    if (await this[_ipcHandle]?.read(data) !== payloadLength) return;
    const payload = new TextDecoder().decode(data);
    return JSON.parse(payload);
  }

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
    await this.#read();
  }

  async close() {
    await this[_ipcHandle]?.close();
  }
}
