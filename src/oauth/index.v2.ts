import { Elysia, t } from "elysia"
import { GithubOAuth, GoogleOAuth } from "./oauth"

const USER_AGENT = "http://localhost:3000"

const githubClient = new GithubOAuth.Client({
    AUTH_CALLBACK_URL: "http://localhost:3000/auth/o/github/confirm",
    CLIENT_ID: process.env.GITHUB_CLIENT_ID!,
    CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET!,
    USER_AGENT,
})

const googleClient = new GoogleOAuth.Client({
    AUTH_CALLBACK_URL: "http://localhost:3000/auth/o/google/confirm",
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID!,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET!,
})

export type Context = GoogleOAuth.Context | GithubOAuth.Context

export const app = new Elysia()
.decorate({ googleClient, githubClient })
.get('/auth/logout',({ cookie, set }) => {
    cookie.id_token.remove({ path: "/" })
    cookie.context.remove({ path: "/" })
    set.status = 'Found'
    set.headers.location = '/'
})
.get('/auth/o/github/login', ({ set, cookie }) => {
    const { url, state } = githubClient.createAuthorizationURL(GithubOAuth.exampleScope)

    cookie.state.set({
        value: state,
        path: "/",
        httpOnly: true,
    })
    set.status = 'Found'
    set.headers.location = url.toString()
})


.get('/auth/o/github/confirm', async ({ set, request, cookie }) => {
    const code = githubClient.confirmToken(request,cookie.state.value)

    const context = await githubClient.requestToken(code)
    // const context: Context = new GithubOAuth.Context(access_token,token_type,scope)

    cookie.state.remove({ path: "/" })
    cookie.context.set({
        value: {...context,provider:'github'},
        path: "/",
        httpOnly: true
    })
    set.status = 'Found'
    set.headers.location = '/'

},{ cookie: t.Object({ state: t.String() }) })


.get('/auth/o/google/login', ({ set, cookie }) => {
    const { url, state } = googleClient.createAuthorizationURL(GoogleOAuth.exampleScope)

    cookie.state.set({
        value: state,
        path: "/",
        httpOnly: true,
    })
    set.status = 'Found'
    set.headers.location = url.toString()
})


.get('/auth/o/google/confirm', async ({ set, request, cookie }) => {
    const code = googleClient.confirmToken(request,cookie.state.value)

    const {data: { id_token, expires_in,refresh_token, ...context }} = await googleClient.requestToken(code)
    // const { toString, id_token:_, ...f } = new GoogleOAuth.Context(id_token,access_token,token_type,scope)

    cookie.state.remove({ path: "/" })
    cookie.context.set({
        value: {...context,provider:'google'},
        path: "/",
        httpOnly: true
    })
    cookie.id_token.set({
        value: id_token,
        path: "/",
        httpOnly: true
    })
    set.status = 'Found'
    set.headers.location = '/'
},{
    cookie: t.Object({ state: t.String() })
})
