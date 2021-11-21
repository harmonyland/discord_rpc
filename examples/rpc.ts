import { Client } from "../mod.ts";

const client = new Client({
  id: Deno.env.get("CLIENT_ID") ?? "869104832227733514",
});

await client.connect();
console.log(`Connected! User: ${client.userTag}`);

await client.setActivity({
  details: "Deno 🦕",
  state: "Testing...",
});
