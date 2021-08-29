import { Command, OpCode, ReadyEventPayload } from "./types.ts";
import { encode, findIPC } from "./util.ts";

const _ipcHandle = Symbol("[[ipc]]");
const _header = Symbol("[[header]]");
const _headerView = Symbol("[[headerView]]");
const _writers = Symbol("[[writers]]");
const _emit = Symbol("[[emit]]");
const _eventLoop = Symbol("[[eventLoop]]");
const _read = Symbol("[[read]]");
const _breakEventLoop = Symbol("[[breakEventLoop]]");
const _commandQueue = Symbol("[[commandQueue]]");
const _readyHandle = Symbol("[[readyHandle]]");

export async function createClient(): Promise<DiscordIPC> {
  const conn = await findIPC();
  const client = Object.create(DiscordIPC.prototype);

  client[_ipcHandle] = conn;
  client[_header] = new Uint8Array(8);
  client[_headerView] = new DataView(client[_header].buffer);
  client[_writers] = new Set();
  client[_commandQueue] = new Map();

  client[_eventLoop] = (async () => {
    try {
      while (true) {
        if (client[_breakEventLoop] === true) break;
        await client[_read]();
      }
      // deno-lint-ignore no-empty
    } catch (_) {}
  })();

  return client;
}

export interface PacketIPCEvent<T = Record<string, unknown>> {
  type: "packet";
  op: OpCode;
  data: T;
}

export interface CloseIPCEvent {
  type: "close";
}

export type IPCEvent = PacketIPCEvent | CloseIPCEvent;

interface PromiseController {
  resolve: CallableFunction;
  reject: CallableFunction;
}

export class DiscordIPC {
  [_ipcHandle]!: Deno.Conn;
  [_writers]!: Set<ReadableStreamDefaultController<IPCEvent>>;
  [_eventLoop]!: Promise<void>;
  [_breakEventLoop]?: boolean;
  [_header]!: Uint8Array;
  [_headerView]!: DataView;
  [_commandQueue]!: Map<
    string,
    PromiseController
  >;
  [_readyHandle]?: PromiseController;

  constructor() {
    throw new TypeError("Use `createClient` instead of `new DiscordIPC`");
  }

  /**
   * Send a packet to Discord IPC. Returns nonce.
   *
   * Nonce is generated if the payload does not have a `nonce` property
   * and is added to payload object too.
   *
   * If payload object does contain a nonce, then it is returned instead.
   */
  async send<T extends Record<string, unknown>>(op: OpCode, payload: T) {
    if (typeof payload !== "object" || payload === null) {
      throw new TypeError("Payload must be an object");
    }

    let nonce: string;
    if (typeof payload.nonce === "undefined") {
      nonce = crypto.randomUUID();
      Object.defineProperty(payload, "nonce", {
        value: nonce,
      });
    } else {
      nonce = payload.nonce as string;
    }

    const data = encode(op, JSON.stringify(payload));
    await this[_ipcHandle].write(data);
    return nonce;
  }

  /**
   * Sends a Managed Command to Discord IPC.
   *
   * Managed means it resolves when Discord sends back some response,
   * or rejects when an ERROR event is DISPATCHed instead.
   *
   * @param cmd Command name
   * @param args Arguments object
   * @returns Command response
   */
  sendCommand<
    T = unknown,
    T2 extends Record<string, unknown> = Record<string, unknown>,
  >(
    cmd: Command | keyof typeof Command,
    args: T2,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const nonce = crypto.randomUUID();
      this[_commandQueue].set(nonce, { resolve, reject });
      this.send(OpCode.FRAME, {
        cmd: typeof cmd === "number" ? Command[cmd] : cmd,
        args,
        nonce,
      });
    });
  }

  /**
   * Performs initial handshake.
   *
   * @param clientID Application ID from Developer Portal
   */
  login(clientID: string) {
    return new Promise<ReadyEventPayload>((resolve, reject) => {
      this[_readyHandle] = { resolve, reject };
      this.send(OpCode.HANDSHAKE, { v: "1", client_id: clientID });
    });
  }

  /**
   * Closes the connection to Discord IPC Socket
   * and any open ReadableStreams for events.
   */
  close() {
    for (const ctx of this[_writers]) {
      ctx.close();
      this[_writers].delete(ctx);
    }
    this[_breakEventLoop] = true;
    this[_ipcHandle].close();
    this[_emit]({ type: "close" });
  }

  [_emit](event: IPCEvent) {
    for (const ctx of this[_writers]) {
      ctx.enqueue(event);
    }
  }

  async [_read]() {
    let headerRead = 0;
    while (headerRead < 8) {
      const read = await this[_ipcHandle].read(
        this[_header].subarray(headerRead),
      );
      if (read === null) throw new Error("Connection closed");
      headerRead += read;
    }
    const op = this[_headerView].getInt32(0, true) as OpCode;
    const payloadLength = this[_headerView].getInt32(4, true);
    const data = new Uint8Array(payloadLength);
    let bodyRead = 0;
    while (bodyRead < payloadLength) {
      const read = await this[_ipcHandle].read(data.subarray(bodyRead));
      if (read === null) throw new Error("Connection closed");
      bodyRead += read;
    }
    const payload = JSON.parse(new TextDecoder().decode(data));
    const handle = this[_commandQueue].get(payload.nonce);
    if (handle) {
      if (payload.cmd === "DISPATCH" && payload.evt === "ERROR") {
        handle.reject(payload.data);
      } else {
        handle.resolve(payload.data);
      }
    } else if (payload.cmd === "DISPATCH" && payload.evt === "READY") {
      this[_readyHandle]?.resolve(payload.data);
    } else if (op === OpCode.CLOSE && payload.code === 4000) {
      this[_readyHandle]?.reject(
        new Error(`Connection closed (${payload.code}): ${payload.message}`),
      );
    }
    this[_emit]({ type: "packet", op, data: payload });
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<IPCEvent> {
    let ctx: ReadableStreamDefaultController<IPCEvent>;
    return new ReadableStream<IPCEvent>({
      start: (controller) => {
        ctx = controller;
        this[_writers].add(ctx);
      },
      cancel: () => {
        this[_writers].delete(ctx);
      },
    })[Symbol.asyncIterator]();
  }
}
