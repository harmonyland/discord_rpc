# discord_rpc

Discord RPC module for Deno.

## Usage

You can import the module from https://deno.land/x/discord_rpc/mod.ts (don't forget
to add a version!). You can also check the documentaton 
[here](https://doc.deno.land/https://deno.land/x/discord_rpc/mod.ts).

Note that this module requires `--unstable` flag on Windows since Named Pipes support
is added using FFI API, which is unstable.

## Example

```typescript
import { Client } from "https://deno.land/x/discord_rpc/mod.ts";

const client = new Client({
  id: "869104832227733514",
});

await client.connect();
console.log(`Connected! User: ${client.userTag}`);

await client.setActivity({
  details: "Deno 🦕",
  state: "Testing...",
});
```

## Contributing

Contributions are welcome!

- Please format code with `deno fmt`
- Run `deno lint` before submitting PR

## License

MIT licensed. Check [LICENSE](./LICENSE) for more info.

Copyright 2021 © littledivy
Copyright 2022 © Harmony Land
