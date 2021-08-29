import { createClient, DiscordIPC, PacketIPCEvent } from "./conn.ts";
import {
  Activity,
  ApplicationPayload,
  AuthenticateResponsePayload,
  ChannelPayload,
  ClientConfig,
  Command,
  PartialChannel,
  RPCEvent,
  UserPayload,
} from "./types.ts";

export interface ClientOptions {
  id: string;
  secret?: string;
  scopes?: string[];
}

export interface ReadyEvent {
  type: "ready";
  config: ClientConfig;
  user: UserPayload;
}

export interface AuthorizeEvent {
  type: "authorize";
  code: string;
}

export interface AuthenticateEvent {
  type: "authenticate";
  accessToken: string;
  expires: Date;
  scopes: string[];
  user: UserPayload;
  application: ApplicationPayload;
}

export interface DispatchEvent {
  type: "dispatch";
  event: keyof typeof RPCEvent;
  // deno-lint-ignore no-explicit-any
  data: any;
}

export type ClientEvent =
  | ReadyEvent
  | AuthorizeEvent
  | AuthenticateEvent
  | DispatchEvent
  | PacketIPCEvent;

export class Client {
  ipc?: DiscordIPC;
  user?: UserPayload;
  config?: ClientConfig;
  token?: string;
  tokenExpires?: Date;
  application?: ApplicationPayload;

  #authenticated = false;
  #writers = new Set<ReadableStreamDefaultController<ClientEvent>>();
  #breakEventLoop?: boolean;
  #_eventLoop?: Promise<void>;

  get authenticated() {
    return this.#authenticated;
  }

  constructor(public options: ClientOptions) {}

  async connect() {
    this.ipc = await createClient();
    this.#startEventLoop();
    await this.ipc.login(this.options.id);
    return this;
  }

  /**
   * Set Presence Activity
   */
  setActivity(activity: Activity) {
    return this.ipc!.sendCommand<
      Activity & { application_id: string; type: number }
    >(
      "SET_ACTIVITY",
      {
        pid: Deno.pid,
        activity,
      },
    );
  }

  /**
   * Starts complete OAuth2 flow, using given client secret
   * and scopes in ClientOptions.
   *
   * Throws if they are not provided.
   */
  async authorize() {
    if (!this.options.secret) {
      throw new Error("Client secret is required");
    }
    if (!this.options.scopes) {
      throw new Error("Scopes are required");
    }
    if (!this.options.scopes.includes("rpc")) {
      throw new Error("Scopes must include `rpc`");
    }

    const code = await this.ipc!.sendCommand<{
      code: string;
    }>("AUTHORIZE", {
      client_id: this.options.id,
      client_secret: this.options.secret,
      scopes: this.options.scopes.join(" "),
      grant_type: "authorization_code",
    }).then((e) => e.code);

    const form = new URLSearchParams();
    form.set("client_id", this.options.id);
    form.set("client_secret", this.options.secret);
    form.set("scopes", this.options.scopes.join(" "));
    form.set("grant_type", "authorization_code");
    form.set("code", code);

    const res = await fetch("https://discord.com/api/v9/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    }).then((r) => r.json());

    const token = res.access_token;
    if (typeof token !== "string") {
      throw new Error("Failed to get access token!");
    }

    this.token = token;
    return this.authenticate(this.token);
  }

  /**
   * Authenticates with given access token.
   * This is automatically called when using `authorize()`.
   *
   * @param token OAuth2 Access Token
   * @returns Authentication Response
   */
  authenticate(token: string) {
    return this.ipc!.sendCommand<
      AuthenticateResponsePayload
    >("AUTHENTICATE", {
      access_token: token,
    });
  }

  async subscribe<T extends Record<string, unknown>>(
    event: keyof typeof RPCEvent,
    args?: T,
  ) {
    await this.ipc!.sendCommand("SUBSCRIBE", {
      args: {
        event: event,
        ...args,
      },
    });
  }

  async unsubscribe<T extends Record<string, unknown>>(
    event: keyof typeof RPCEvent,
    args?: T,
  ) {
    await this.ipc!.sendCommand("UNSUBSCRIBE", {
      args: {
        event: event,
        ...args,
      },
    });
  }

  getChannels(guildID?: string) {
    return this.ipc!.sendCommand<{ channels: PartialChannel[] }>(
      "GET_CHANNELS",
      {
        guild_id: guildID,
      },
    ).then((e) => e.channels);
  }

  getChannel(channelID?: string) {
    return this.ipc!.sendCommand<ChannelPayload>(
      "GET_CHANNEL",
      {
        channel_id: channelID,
      },
    );
  }

  #emit(event: ClientEvent) {
    for (const writer of this.#writers) {
      writer.enqueue(event);
    }
  }

  #closeWriters() {
    this.#breakEventLoop = true;
    for (const writer of this.#writers) {
      writer.close();
    }
  }

  close() {
    this.#closeWriters();
    this.ipc!.close();
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<ClientEvent> {
    let ctx: ReadableStreamDefaultController<ClientEvent>;
    return new ReadableStream<ClientEvent>({
      start: (controller) => {
        ctx = controller;
        this.#writers.add(ctx);
      },
      cancel: () => {
        this.#writers.delete(ctx);
      },
    })[Symbol.asyncIterator]();
  }

  #startEventLoop() {
    this.#_eventLoop = (async () => {
      for await (const event of this.ipc!) {
        if (this.#breakEventLoop) {
          break;
        }

        if (event.type === "close") {
          this.#closeWriters();
          break;
        } else if (event.type === "packet") {
          this.#emit({
            type: "packet",
            op: event.op,
            data: event.data,
          });

          const { cmd, data, evt } = event.data as {
            cmd: keyof typeof Command;
            // deno-lint-ignore no-explicit-any
            data: any;
            evt: keyof typeof RPCEvent | null;
          };

          if (cmd === "DISPATCH" && evt !== null) {
            this.#emit({
              type: "dispatch",
              event: evt,
              data,
            });

            if (evt === "READY") {
              this.user = data.user;
              this.config = data.config;

              this.#emit({
                type: "ready",
                config: this.config!,
                user: this.user!,
              });
            }
          } else if (cmd === "AUTHORIZE") {
            this.#emit({
              type: "authorize",
              code: data.code,
            });
          } else if (cmd === "AUTHENTICATE") {
            this.#authenticated = true;
            this.user = data.user;
            this.application = data.application;
            this.token = data.access_token;
            this.tokenExpires = new Date(data.expires);

            this.#emit({
              type: "authenticate",
              user: this.user!,
              application: this.application!,
              accessToken: this.token!,
              expires: this.tokenExpires!,
              scopes: data.scopes,
            });
          }
        }
      }
    })();
  }
}
