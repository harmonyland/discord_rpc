import { Client, Message } from "../mod.ts";

const client = new Client({
  id: Deno.env.get("CLIENT_ID")!,
  secret: Deno.env.get("CLIENT_SECRET")!,
  scopes: ["rpc", "messages.read"],
});

(async () => {
  for await (const event of client) {
    if (event.type === "dispatch") {
      if (event.event === "MESSAGE_CREATE") {
        const { message: msg, channel_id: channel } = event.data as {
          message: Message;
          channel_id: string;
        };
        console.log(
          "MESSAGE_CREATE in",
          channel,
          "by",
          msg.author.username + "#" + msg.author.discriminator + ":",
          msg.content,
        );
      }
    }
  }
})();

await client.connect();
console.log(`Connected! User: ${client.userTag}`);

await client.authorize();

await client.subscribe("MESSAGE_CREATE", {
  channel_id: Deno.env.get("CHANNEL"),
});
