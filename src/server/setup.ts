import * as fs from "node:fs";
import { generateClientAssertionKey } from "@atcute/oauth-node-client";

const jwk = await generateClientAssertionKey("main", "ES256");
const jwkJson = JSON.stringify(jwk);

fs.writeFileSync(".env", `PRIVATE_KEY_JWK=${jwkJson}`);
console.log("generated jwk in .env");
