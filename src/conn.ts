import { Command, OpCode, ReadyEventPayload, RPCEvent } from "./types.ts";
import { encode, findIPC } from "./util.ts";

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
  #ipcHandle: Deno.Conn;
  #writers = new Set<ReadableStreamDefaultController<IPCEvent>>();
  #_eventLoop!: Promise<void>;
  #breakEventLoop?: boolean;
  #header = new Uint8Array(8);
  #headerView: DataView = new DataView(this.#header);
  #commandQueue = new Map<
    string,
    PromiseController
  >();
  #readyHandle?: PromiseController;

  constructor(conn: Deno.Conn) {
    this.#ipcHandle = conn;
    this.#startEventLoop();
  }

  static async connect() {
    const conn = await findIPC();
    return new DiscordIPC(conn);
  }

  #startEventLoop() {
    this.#_eventLoop = (async () => {
      try {
        while (true) {
          if (this.#breakEventLoop === true) break;
          await this.#read();
        }
      } catch (_) {
        this.#closeWriters();
      }
    })();
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
    await this.#ipcHandle.write(data);
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
    evt?: keyof typeof RPCEvent,
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const nonce = crypto.randomUUID();
      this.#commandQueue.set(nonce, { resolve, reject });
      this.send(OpCode.FRAME, {
        cmd: typeof cmd === "number" ? Command[cmd] : cmd,
        args,
        nonce,
        evt,
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
      this.#readyHandle = { resolve, reject };
      this.send(OpCode.HANDSHAKE, { v: "1", client_id: clientID });
    });
  }

  #closeWriters() {
    for (const ctx of this.#writers) {
      ctx.close();
      this.#writers.delete(ctx);
    }
    this.#breakEventLoop = true;
  }

  /**
   * Closes the connection to Discord IPC Socket
   * and any open ReadableStreams for events.
   */
  close() {
    this.#closeWriters();
    this.#ipcHandle.close();
    this.#emit({ type: "close" });
  }

  #emit(event: IPCEvent) {
    for (const ctx of this.#writers) {
      ctx.enqueue(event);
    }
  }

  async #read() {
    let headerRead = 0;
    while (headerRead < 8) {
      const read = await this.#ipcHandle.read(
        this.#header.subarray(headerRead),
      );
      if (read === null) throw new Error("Connection closed");
      headerRead += read;
    }
    const op = this.#headerView.getInt32(0, true) as OpCode;
    const payloadLength = this.#headerView.getInt32(4, true);
    const data = new Uint8Array(payloadLength);
    let bodyRead = 0;
    while (bodyRead < payloadLength) {
      const read = await this.#ipcHandle.read(data.subarray(bodyRead));
      if (read === null) throw new Error("Connection closed");
      bodyRead += read;
    }
    const payload = JSON.parse(new TextDecoder().decode(data));
    const handle = this.#commandQueue.get(payload.nonce);
    if (handle) {
      if (payload.evt === "ERROR") {
        handle.reject(
          new Error(`Error(${payload.data.code}): ${payload.data.message}`),
        );
      } else {
        handle.resolve(payload.data);
      }
      this.#commandQueue.delete(payload.nonce);
    } else if (payload.cmd === "DISPATCH" && payload.evt === "READY") {
      this.#readyHandle?.resolve(payload.data);
      this.#readyHandle = undefined;
    } else if (op === OpCode.CLOSE && payload.code === 4000) {
      this.#readyHandle?.reject(
        new Error(`Connection closed (${payload.code}): ${payload.message}`),
      );
      this.#readyHandle = undefined;
    }
    this.#emit({ type: "packet", op, data: payload });
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<IPCEvent> {
    let ctx: ReadableStreamDefaultController<IPCEvent>;
    return new ReadableStream<IPCEvent>({
      start: (controller) => {
        ctx = controller;
        this.#writers.add(ctx);
      },
      cancel: () => {
        this.#writers.delete(ctx);
      },
    })[Symbol.asyncIterator]();
  }
}
