export namespace OAuth {
    export abstract class Client<T extends { scope: string } = { scope: string }> {
        constructor(
            public provider: Provider
        ) {}

        static generateState() {
            const random = crypto.getRandomValues(new Uint8Array(32))
            const hasher = new Bun.CryptoHasher("sha256");
            hasher.update(random);
            return hasher.digest('hex')
        }

        static extractUrl(val: Request | URL | string) {
            return val instanceof Request
                ? new URL(val.url) : typeof val == 'string'
                ? new URL(val) : val
        }

        abstract requestToken(code: string, access_token?: string): Promise<any>

        createAuthorizationURL(scope: T['scope'][]) {
            const state = Client.generateState()
            const url = new URL(this.provider.AUTHORIZE_URL)

            url.searchParams.set("response_type","code")
            url.searchParams.set("client_id",this.provider.CLIENT_ID)
            url.searchParams.set("redirect_uri",this.provider.AUTH_CALLBACK_URL)
            url.searchParams.set("scope",scope.join(" "))
            url.searchParams.set("state",state)

            return { url, state }
        }

        confirmToken(url: Request | URL | string, session_state: string) {
            const u = Client.extractUrl(url)

            if (u.searchParams.has('error')) {
                throw OAuthAuthorizationError.fromUrl(u)
            }

            const state = u.searchParams.get("state")
            const code = u.searchParams.get("code")

            if (state && state == session_state) {} else
                throw new OAuthError(`[OAuth error] Invalid session state`);

            if (!code)
                throw new OAuthError(`[OAuth error] No auth code present`);

            return code
        }
    }

    export interface Provider {
        AUTHORIZE_URL: string
        CLIENT_ID: string
        AUTH_CALLBACK_URL: string
    }

    export class Context {
        constructor(
            public access_token: string,
            public token_type: string,
            public scope: string,
        ) {}

        toString() {
            return JSON.stringify({access_token:this.access_token,token_type:this.token_type,scope:this.scope})
        }
    }

    export class OAuthError extends Error {
        // TODO: add type
        constructor(public error: any) { super(error.error) }
    }

    export class OAuthAuthorizationError extends Error {
        constructor(
            public error: string,
            public error_uri: string,
            public error_description: string
        ) {
            super(error)
        }

        static fromUrl(url: InstanceType<typeof URL>) {
            return new OAuthAuthorizationError(
                url.searchParams.get("error") as string,
                url.searchParams.get("error_description") as string,
                url.searchParams.get("error_uri") as string,
            )
        }
    }

}


export namespace GithubOAuth {
    export type Scope = 'user' | 'public_repo'
    export type ExampleResponseToken = {
        access_token: string
        token_type: string
        scope: string
    }

    export const exampleScope: Scope[] = ["user","public_repo"]

    export class Client extends OAuth.Client<{ scope: Scope }> {
        static TOKEN_URL = 'https://github.com/login/oauth/access_token';
        static AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
        static API_URL_BASE = 'https://api.github.com';
        API_ACCEPT_HEADERS = {
            "Accept": "application/vnd.github.v3+json, application/json",
            "User-Agent": "",
        };

        constructor(private user: {
            AUTH_CALLBACK_URL: string
            CLIENT_ID: string
            CLIENT_SECRET: string,
            USER_AGENT: string
        }) {
            super({
                AUTHORIZE_URL: Client.AUTHORIZE_URL,
                AUTH_CALLBACK_URL: user.AUTH_CALLBACK_URL,
                CLIENT_ID: user.CLIENT_ID
            })

            this.API_ACCEPT_HEADERS["User-Agent"] = user.USER_AGENT
        }

        async requestToken(code: string, access_token?: string) {
            const url = new URL(Client.TOKEN_URL)
            const headers = new Headers(this.API_ACCEPT_HEADERS)

            access_token && headers.set("Authorization",`Bearer ${access_token}`);

            url.searchParams.set("grant_type","authorization_code")
            url.searchParams.set("client_id",this.user.CLIENT_ID)
            url.searchParams.set("client_secret",this.user.CLIENT_SECRET)
            url.searchParams.set("redirect_uri",this.user.AUTH_CALLBACK_URL)
            url.searchParams.set("code",code)

            const response = await fetch(url.toString(),{ headers })
            const data = await response.json() as Record<string,any>

            if (data.error)
                throw new OAuth.OAuthError(data);

            return data as ExampleResponseToken
        }

        async apiRequest<T=Record<string,any>>(pathname: string, access_token?: string) {
            const url = new URL(Client.API_URL_BASE + pathname)
            const headers = new Headers(this.API_ACCEPT_HEADERS)

            access_token && headers.set("Authorization",`Bearer ${access_token}`);

            const response = await fetch(url.toString(),{ headers })
            const data = await response.json() as T

            return data
        }

        createSession(access_token: string) {
            return new Session(this, access_token)
        }
    }

    export class Context extends OAuth.Context {
        provider = 'github' as const
    }

    export class Session {
        static USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

        constructor(
            public client: Client,
            public access_token: string
        ) {}

        repositories() {
            return this.client.apiRequest<{name:string, html_url:string}[]>(
                '/user/repos?sort=created',this.access_token
            )
        }
    }

}


export namespace GoogleOAuth {
    export type ExampleResponseToken = {
        "access_token": string,
        "token_type": "Bearer",
        "expires_in": number,
        "scope": string,
        "refresh_token"?: string,
        /** JWT */
        "id_token": string
    }

    export const exampleScope = ["openid","email"]

    export class Client extends OAuth.Client {
        static AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
        static TOKEN_URL = 'https://oauth2.googleapis.com/token'

        constructor(private user: {
            AUTH_CALLBACK_URL: string
            CLIENT_ID: string
            CLIENT_SECRET: string,
        }) {
            super({
                AUTHORIZE_URL: Client.AUTHORIZE_URL,
                AUTH_CALLBACK_URL: user.AUTH_CALLBACK_URL,
                CLIENT_ID: user.CLIENT_ID
            })
        }

        async requestToken(code: string, _access_token?: string | undefined) {
            const form = new FormData()

            form.set("grant_type","authorization_code")
            form.set("client_id",this.user.CLIENT_ID)
            form.set("client_secret",this.user.CLIENT_SECRET)
            form.set("redirect_uri",this.user.AUTH_CALLBACK_URL)
            form.set("code",code)

            const response = await fetch(Client.TOKEN_URL,{
                method: "POST",
                body: form
            })

            const data = await response.json() as Record<string,any>

            if (data.error) {
                throw new OAuth.OAuthError(data)
            }

            return { data: data as ExampleResponseToken }
        }

        createSession(access_token: string) {
            return new Session(this, access_token)
        }
    }

    export class Context extends OAuth.Context {
        provider = 'google' as const
        constructor(
            public id_token: string,
            ...acc: ConstructorParameters<typeof OAuth.Context>
        ) {
            super(...acc)
        }
    }

    // NOTE: depend on the scope
    export type ExampleUserInfo = {
        "sub": string
        "name": string
        "email": string
        "given_name"?: string,
        "family_name"?: string,
        "picture"?: string,
        "email_verified": boolean,
        "locale": string,
        "hd": string
    }

    export class Session {
        static USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

        constructor(
            public client: Client,
            public access_token: string
        ) {}

        async exampleUserInfo() {
            const res = await fetch(Session.USERINFO_URL,{
                headers: {
                    Authorization: `Bearer ${this.access_token}`
                }
            })

            const data = await res.json() as any

            if (data.error) {
                throw new OAuth.OAuthError(data)
            }

            return data as ExampleUserInfo
        }
    }
}
