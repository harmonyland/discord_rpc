import { connect } from "../deps.ts";

export function encode(op: number, payloadString: string) {
  const payload = new TextEncoder().encode(payloadString);
  const data = new Uint8Array(4 + 4 + payload.byteLength);
  const view = new DataView(data.buffer);
  view.setInt32(0, op, true);
  view.setInt32(4, payload.byteLength, true);
  data.set(payload, 8);
  return data;
}

export function getIPCPath(id: number) {
  if (id < 0 || id > 9) {
    throw new RangeError(
      `Tried all possible IPC paths 0-9, make sure Discord is open. It must be installed locally, not just open on a web browser.`,
    );
  }

  const suffix = `discord-ipc-${id}`;
  let prefix;

  if (Deno.build.os === "windows") {
    prefix = `\\\\.\\pipe\\`;
  } else {
    prefix = (Deno.env.get("XDG_RUNTIME_DIR") ?? Deno.env.get("TMPDIR") ??
      Deno.env.get("TMP") ?? Deno.env.get("TEMP") ?? "/tmp") + "/";
  }

  return `${prefix}${suffix}`;
}

export async function findIPC(id = 0): Promise<Deno.Conn> {
  const path = getIPCPath(id);

  try {
    await Deno.stat(path);
  } catch {
    return await findIPC(id + 1);
  }

  if (Deno.build.os === "windows") {
    return await connect(path) as unknown as Deno.Conn;
  } else {
    return await Deno.connect({
      path,
      transport: "unix",
    });
  }
}
