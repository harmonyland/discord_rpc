### Discord RPC for Deno

#### Example

```typescript
import { createClient } from "https://deno.land/x/discord_rpc/mod.ts";

const client = await createClient();
await client.login("869104832227733514");
await client.setActivity({ details: "Deno 🦕", state: "Testing..." });
await client.close();
```

[Support me](https://patreon.com/littledivy) on Patreon.

<small> MIT Licensed </small>
