export namespace GoogleOAuth {
    // SOURCE: https://accounts.google.com/.well-known/openid-configuration

    export const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
    // export const TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token'
    export const TOKEN_URL = 'https://oauth2.googleapis.com/token'
    // export const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo'
    export const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

    export const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env();

    export let AUTH_CALLBACK_URL = ''
    export let HOME_URL = ''
    export let LOGGING = false

    export const exampleScope: Scope[] = ["openid","email"]

    export type Scope =
        'openid'
        | 'email'

    export type ExampleResponseToken = {
        "access_token": "ya29.Glins-oLtuljNVfthQU2bpJVJPTu",
        "token_type": "Bearer",
        "expires_in": 3600,
        "scope": string,
        "refresh_token"?: string,
        "id_token": `eyJhbGciOiJSUzI1NiIsImtpZCI6ImFmZmM2MjkwN2E0qppnBpMjFL2YMDV
                    .eg3jl1y5DeSKNPh6cZ8H2p4Xb2UIrJguGbQHVIJvtm_AspRjrmaTUQKrzXD
                    .RCfDROSUU-h7XKIWRrEd2-W9UkV5oCg`
    }

    export type ExampleJWTClaim = {
        "azp": "272196069173.apps.googleusercontent.com",
        "aud": "272196069173.apps.googleusercontent.com",
        "sub": "110248495921238986420",
        "hd": "okta.com",
        "email": "aaron.parecki@okta.com",
        "email_verified": true,
        "at_hash": "0bzSP5g7IfV3HXoLwYS3Lg",
        "exp": 1524601669,
        "iss": "https://accounts.google.com",
        "iat": 1524598069
    }

    // NOTE: depend on the scope
    export type ExampleUserInfo = {
        "sub": "110248495921238986420",
        "name": "Aaron Parecki",
        "given_name"?: "Aaron",
        "family_name"?: "Parecki",
        "picture"?: `https://lh4.googleusercontent.com/-kw-iMgD
            _j34/AAAAAAAAAAI/AAAAAAAAAAc/P1YY91tzesU/photo.jpg`,
        "email": "aaron.parecki@okta.com",
        "email_verified": true,
        "locale": "en",
        "hd": "okta.com"
    }

    export function logging(val: boolean) {
        LOGGING = val
    }

    export function setup(opt: { AUTH_CALLBACK_URL?: string, HOME_URL?: string }) {
        AUTH_CALLBACK_URL = opt.AUTH_CALLBACK_URL ?? AUTH_CALLBACK_URL
        HOME_URL = opt.HOME_URL ?? HOME_URL
        // API_ACCEPT_HEADERS["User-Agent"] = opt.HOME_URL ?? HOME_URL
    }

    /** used when we want to login or register */
    export function createAuthorizationURL(scope: Scope[]) {
        const state = generateState()
        const url = new URL(AUTHORIZE_URL)

        url.searchParams.set("response_type","code")
        url.searchParams.set("client_id",GOOGLE_CLIENT_ID)
        url.searchParams.set("redirect_uri",AUTH_CALLBACK_URL)
        url.searchParams.set("scope",scope.join(" "))
        url.searchParams.set("state",state)

        return { googleUrl: url, state }
    }

    /**
    * used when google redirected back to our app
    * we exchange the "code" to access_token
    * */
    export function confirmToken(url: Request | URL | string, session_state: string | null | undefined) {
        const u = (url instanceof Request) ? new URL(url.url) : typeof url == 'string' ? new URL(url) : url

        if (u.searchParams.has('error')) {
            LOGGING && console.log(`[GOOGLE OAUTH ERROR] ${url.toString()} ${JSON.stringify(Object.fromEntries(u.searchParams))}`);
            throw new GoogleOAuthError({
                error: u.searchParams.get("error") as string,
                error_description: u.searchParams.get("error_description") as string,
                error_uri: u.searchParams.get("error_uri") as string,
            })
        }

        const state = u.searchParams.get("state")
        const code = u.searchParams.get("code")

        if (state && session_state && state == session_state) {} else {
            throw new Error(`OAuth error, no state present`)
        }
        if (!code) {
            throw new Error(`OAuth error, no code present`)
        }

        return requestToken(code)
    }

    export async function requestToken(code: string, access_token?: string) {
        LOGGING && console.log(`[GOOGLE OAUTH CONFIRM] ${code}`)
        // const url = new URL(TOKEN_URL)
        const form = new FormData()
        // const headers = new Headers(API_ACCEPT_HEADERS)

        // access_token && headers.set("Authorization",`Bearer ${access_token}`);

        form.set("grant_type","authorization_code")
        form.set("client_id",GOOGLE_CLIENT_ID)
        form.set("client_secret",GOOGLE_CLIENT_SECRET)
        form.set("redirect_uri",AUTH_CALLBACK_URL)
        form.set("code",code)

        const response = await fetch(TOKEN_URL,{
            method: "POST",
            body: form
        })

        const data: ExampleResponseToken = await response.json() as any

        // if (data.error) {
        //     LOGGING && console.log(`[GOOGLE OAUTH ERROR] ${url.toString()} ${JSON.stringify(data)}`);
        //     throw new GoogleOAuthError(data as any,response.status)
        // }

        LOGGING && console.log(`[GOOGLE OAUTH TOKEN]`,response,data);

        return { data, user: {} }
    }

    export function generateState() {
        const random = crypto.getRandomValues(new Uint8Array(32))
        const hasher = new Bun.CryptoHasher("sha256");
        hasher.update(random);
        return hasher.digest('hex')
    }

    export async function exampleUserInfo(access_token: string) {
        const res = await fetch(GOOGLE_USERINFO_URL,{
            headers: {
                Authorization: `Bearer ${access_token}`
            }
        })

        // FIXME: error handling
        const data: ExampleUserInfo = await res.json() as any

        return data
    }
}

export class GoogleOAuthError extends Error {
    name = "Google OAuth Error" as const
    constructor(
        // TODO: maybe different error
        public error: {
            error: string,
            error_description: string,
            error_uri: string
        },
        public status = 400
    ) {
        super(error.error)
    }

    toResponse() {
        return Response.json({ name: this.name, ...this.error },{ status: this.status })
    }
}

function env() {
    env.prototype.__errs = []
    return new Proxy({} as Record<string,string>,{
        get(_,key: string) {
            if (!process.env[key]) {
                env.prototype.__errs.push(key)
            }
            return process.env[key] ?? ""
        }
    })
}

function envassert() {
    if (env.prototype.__errs.length) {
        const err: string[] = env.prototype.__errs
        throw new Error(err.join(', ') + ' is required, provide it in setup function, or set it as env')
    }
}

