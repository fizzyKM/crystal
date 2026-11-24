import { oauth } from "~/server/oauth";

export function GET() {
    return Response.json(oauth.jwks);
}