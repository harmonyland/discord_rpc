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

export async function findIPC(id = 0): Promise<Deno.Conn> {
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
