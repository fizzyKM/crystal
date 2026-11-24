import {
    MemoryStore,
    OAuthClient,
    scope,
    type ClientAssertionPrivateJwk
} from "@atcute/oauth-node-client";

import {
    CompositeDidDocumentResolver,
    CompositeHandleResolver,
    LocalActorResolver,
    PlcDidDocumentResolver,
    WebDidDocumentResolver,
    WellKnownHandleResolver
} from "@atcute/identity-resolver";

import { NodeDnsHandleResolver } from "@atcute/identity-resolver-node";

import { PUBLIC_URL, PRIVATE_KEY_JWK } from "./env";
import { PostgresStore } from "./oauthstore";

if (!PRIVATE_KEY_JWK) throw new Error("PRIVATE_KEY_JWK is not set in .env");

export const oauth = new OAuthClient({
    metadata: {
        client_id: `${PUBLIC_URL}/oauth-client-metadata.json`,
        redirect_uris: [`${PUBLIC_URL}/callback`],

        scope: [
            scope.repo({
                collection: [
                    "app.bsky.feed.post",
                    "app.bsky.feed.like",
                    "app.bsky.feed.repost"
                ],
                action: ["create", "delete", "update"]
            }),
            scope.rpc({
                lxm: [
                    "app.bsky.actor.getProfile",
                    "app.bsky.feed.getTimeline",
                    "app.bsky.feed.getAuthorFeed"
                ],
                aud: "*"
            }),
            scope.identity({ attr: "handle" })
        ],

        jwks_uri: `${PUBLIC_URL}/jwks.json`
    },

    keyset: [
        JSON.parse(PRIVATE_KEY_JWK) as ClientAssertionPrivateJwk
    ],

    stores: PostgresStore,
    
    actorResolver: new LocalActorResolver({
        handleResolver: new CompositeHandleResolver({
            methods: {
                dns: new NodeDnsHandleResolver(),
                http: new WellKnownHandleResolver()
            }
        }),

        didDocumentResolver: new CompositeDidDocumentResolver({
            methods: {
                plc: new PlcDidDocumentResolver(),
                web: new WebDidDocumentResolver()
            }
        })
    })
});
