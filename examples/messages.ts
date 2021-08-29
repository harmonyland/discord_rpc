import { Client } from "../mod.ts";

const client = new Client({
  id: Deno.env.get("CLIENT_ID")!,
  secret: Deno.env.get("CLIENT_SECRET")!,
  scopes: ["rpc", "messages.read"],
});

(async () => {
  for await (const event of client) {
    if (event.type === "dispatch") {
      if (event.event === "MESSAGE_CREATE") {
        console.log(event.event, event.data);
      }
    }
  }
})();

await client.connect();
console.log("Connected!");

await client.authorize();

const channels = await client.getChannels();
console.log("Got", channels.length, "channels!");

for (const channel of channels) {
  const chan = await client.getChannel(channel.id);
  console.log(chan);
  // await client.subscribe("MESSAGE_CREATE", {
  //   channel_id: channel.id,
  // });
}
