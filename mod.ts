import { varnumBytes } from "https://deno.land/std@0.95.0/encoding/binary.ts";

function encode(type: number, payload: string) {
  const encoded = new TextEncoder().encode(payload);
  const _type = varnumBytes(type, { endian: "little" });
  const _len = varnumBytes(encoded.length, { endian: "little" });

  return new Uint8Array([..._type, ..._len, ...encoded]);
}

async function read(ipc: Deno.Conn | undefined) {
  if (!ipc) return;
  const buf = new Uint8Array(512);
  await ipc.read(buf);
  return new TextDecoder().decode(buf);
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

const _ipcHandle = Symbol("[[ipc]]");

export async function createClient(): Promise<RichPresence> {
  const client = Object.create(RichPresence.prototype);
  // Open a IPC connection
  if (Deno.build.os !== "windows") {
    // Unix
    client[_ipcHandle] = await Deno.connect({
      path: "/run/user/1000/discord-ipc-0",
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

export class RichPresence {
  [_ipcHandle]?: Deno.Conn;

  constructor() {
    throw new TypeError("Use `createClient` instead of `new RichPresence`");
  }

  async login(client_id: string) {
    const payload = JSON.stringify({ v: "1", client_id });
    await this[_ipcHandle]?.write(encode(0, payload));
    await read(this[_ipcHandle]);
  }

  async setActivity(activity: Activity) {
    const payload = JSON.stringify({
      cmd: "SET_ACTIVITY",
      args: {
        pid: Deno.pid,
        activity,
      },
      nonce: await crypto.randomUUID(),
    });
    await this[_ipcHandle]?.write(encode(1, payload));
    await read(this[_ipcHandle]);
  }

  async close() {
    await this[_ipcHandle]?.close();
  }
}
