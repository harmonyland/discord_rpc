import { Client } from "../mod.ts";

const client = new Client({
  id: Deno.env.get("CLIENT_ID")!,
  secret: Deno.env.get("CLIENT_SECRET")!,
  scopes: ["rpc", "rpc.voice.read"],
});

(async () => {
  for await (const event of client) {
    if (event.type === "dispatch") {
      console.log(event.event, event.data);
    }
  }
})();

await client.connect();
console.log(`Connected! User: ${client.userTag}`);

await client.authorize();

await client.subscribe("VOICE_SETTINGS_UPDATE");
await client.subscribe("VOICE_SETTINGS_UPDATE_2");
await client.subscribe("VOICE_CHANNEL_SELECT");
