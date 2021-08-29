import { createClient, OpCode } from "./mod.ts";

const CLIENT_ID = Deno.env.get("CLIENT_ID")!;
const CLIENT_SECRET = Deno.env.get("CLIENT_SECRET")!;
const SCOPES = ["rpc", "messages.read"].join(" ");
const GRANT_TYPE = "authorization_code";

const client = await createClient();

await client.login(CLIENT_ID);

(async () => {
  for await (const event of client) {
    if (event.type === "packet") {
      console.log("Packet:", OpCode[event.op], event.data);
      const { cmd, data } = event.data;
      if (cmd === "DISPATCH") {
        const evt = event.data.evt;
        if (evt === "READY") {
          console.log("Got READY, sending AUTHORIZE");
          await client.send(OpCode.FRAME, {
            cmd: "AUTHORIZE",
            args: {
              client_id: CLIENT_ID,
              scopes: SCOPES,
              grant_type: GRANT_TYPE,
            },
          });
        }
      } else if (cmd === "AUTHORIZE") {
        const code = data.code;
        if (!code) throw new Error("Authorization failed!");

        console.log("Got AUTHORIZING", code, "doing token exchange...");

        const form = new URLSearchParams();
        form.set("client_id", CLIENT_ID);
        form.set("client_secret", CLIENT_SECRET);
        form.set("scopes", SCOPES);
        form.set("grant_type", GRANT_TYPE);
        form.set("code", code);

        const res = await fetch("https://discord.com/api/v8/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        }).then((r) => r.json());

        if (!res.access_token) throw new Error("Failed to get access token!");

        console.log("Exchanged token", res.access_token, "sending AUTHENTICATE");

        await client.send(OpCode.FRAME, {
          cmd: "AUTHENTICATE",
          args: {
            access_token: res.access_token,
          },
        });
      } else if (cmd === "AUTHENTICATE") {
        console.log("Got AUTHENTICATE, sending GET_CHANNELS");
        await client.send(OpCode.FRAME, {
          cmd: "GET_CHANNELS",
          args: { guild_id: null },
        });
      } else if (cmd === "GET_CHANNELS") {
        console.log("Got", data.channels.length, "channels!");
      }
    }
  }
})();
