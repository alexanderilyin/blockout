<title>Switch sign-in to Keycloak</title>

# Switch sign-in to Keycloak

Replaces the practice "dev sign-in" with real accounts. Guests can still play.

1. **In Keycloak,** create a realm (for example `blockout`) and a **public** OpenID Connect client `blockout` with:
   - Standard flow on, PKCE method `S256`
   - Valid redirect URI and web origin: your Blockout address (for example `https://blockout.example.org/`)
2. **Add the roles** `student`, `teacher` and `parent` as realm roles, and give teachers and parents theirs.
3. **For school Google accounts,** add Google as an identity provider with the hosted domain set to the school's (`iusd.org`). Students without a role are treated as students when their email is on a school's domain.
4. **Start Blockout with Keycloak:**
   ```sh
   BLOCKOUT_AUTH=keycloak \
   KEYCLOAK_ISSUER=https://id.example.org/realms/blockout \
   KEYCLOAK_CLIENT_ID=blockout \
   npm start
   ```
5. **Check it:** `/api/auth/config` shows `"provider":"keycloak"`, and **Sign in** sends you to Keycloak and back.

Not built yet: refreshing an expired token (the player signs in again). See [ADR-0002](../decisions/0002-swappable-sign-in.md).
