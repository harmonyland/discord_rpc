### Discord RPC for Deno

#### Example

```typescript
import { Client } from "https://deno.land/x/discord_rpc/mod.ts";

const client = new Client({
  id: "869104832227733514",
});

await client.connect();

await client.setActivity({
  details: "Deno 🦕",
  state: "Testing...",
});
```

[Support me](https://patreon.com/littledivy) on Patreon.

<small> MIT Licensed </small>
