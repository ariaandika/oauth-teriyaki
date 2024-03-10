export namespace GithubOAuth {
    export const AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
    export const TOKEN_URL = 'https://github.com/login/oauth/access_token';
    export const API_URL_BASE = 'https://api.github.com';
    export const { CLIENT_ID, CLIENT_SECRET } = env()

    envassert()

    export let AUTH_CALLBACK_URL = ''
    export let HOME_URL = ''

    export const exampleScope: Scope[] = ["user","public_repo"]

    export type Scope =
        'user'
        | 'public_repo'

    export type ExampleResponseToken = {
        "access_token": "e2f8c8e136c73b1e909bb1021b3b4c29",
        "token_type": "Bearer",
        "scope": "public_repo,user"
    }

    const API_ACCEPT_HEADERS = {
        "Accept": "application/vnd.github.v3+json, application/json",
        "User-Agent": "https://example-app.com/",
    }


    export function setup(opt: { AUTH_CALLBACK_URL?: string, HOME_URL?: string }) {
        AUTH_CALLBACK_URL = opt.AUTH_CALLBACK_URL ?? AUTH_CALLBACK_URL
        HOME_URL = opt.HOME_URL ?? HOME_URL 
    }

    /** used when we want to login or register */
    export function createAuthorizationURL(scope: Scope[]) {
        const state = generateState()
        const url = new URL(AUTHORIZE_URL)

        url.searchParams.set("response_type","code")
        url.searchParams.set("client_id",CLIENT_ID)
        url.searchParams.set("redirect_uri",AUTH_CALLBACK_URL)
        url.searchParams.set("scope",scope.join(" "))
        url.searchParams.set("state",state)

        return { githubUrl: url, state }
    }

    /**
    * used when github redirected back to our app
    * we exchange the "code" to access_token
    * */
    export async function confirmToken(url: Request | URL | string, session_state: string | null | undefined) {
        const u = (url instanceof Request) ? new URL(url.url) : typeof url == 'string' ? new URL(url) : url

        if (u.searchParams.has('error')) {
            throw {
                error: u.searchParams.get("error"),
                error_description: u.searchParams.get("error_description"),
                error_uri: u.searchParams.get("error_uri"),
            }
        }

        const state = u.searchParams.get("state")
        const code = u.searchParams.get("code")

        if (state && session_state && state == session_state) {} else {
            throw new GithubOAuthInvalidState()
        }
        if (!code) {
            throw new GithubOAuthInvalidState()
        }

        return await requestToken(code)
    }

    export async function requestToken(code: string, access_token?: string) {
        const url = new URL(TOKEN_URL)
        const headers = new Headers(API_ACCEPT_HEADERS)

        access_token && headers.set("Authorization",`Bearer ${access_token}`);

        url.searchParams.set("grant_type","authorization_code")
        url.searchParams.set("client_id",CLIENT_ID)
        url.searchParams.set("client_secret",CLIENT_SECRET)
        url.searchParams.set("redirect_uri",AUTH_CALLBACK_URL)
        url.searchParams.set("code",code)

        const response = await fetch(new Request(url),{ headers })

        return await response.json() as ExampleResponseToken
    }

    export function generateState() {
        const random = crypto.getRandomValues(new Uint8Array(32))
        const hasher = new Bun.CryptoHasher("sha256");
        hasher.update(random);
        return hasher.digest('hex')
    }

    export async function apiRequest<T=Record<string,any>>(pathname: string, access_token?: string) {
        const url = new URL(API_URL_BASE + pathname)
        const headers = new Headers(API_ACCEPT_HEADERS)

        access_token && headers.set("Authorization",`Bearer ${access_token}`);

        const response = await fetch(new Request(url),{ headers })
        const data = await response.json() as T
        console.log({data,access_token})
        return data
    }

    export async function exampleApiRequest(access_token: string) {
        const url = new URL(API_URL_BASE + '/user/repos?sort=created&direction=desc')
        const headers = new Headers(API_ACCEPT_HEADERS)

        access_token && headers.set("Authorization",`Bearer ${access_token}`);

        const response = await fetch(new Request(url),{ headers })

        return await response.json() as { name: string, html_url: string }
    }
}

export class GithubOAuthInvalidState extends Error {
    name = "Invalid State" as const
    status = 403
    message = "Invalid oauth state"
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

