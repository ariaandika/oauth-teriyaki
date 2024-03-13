import { Elysia, t } from "elysia"
import { OAuth, GithubOAuth, GoogleOAuth } from "./oauth"

const AUTH_CALLBACK_URL = ""
const CLIENT_ID = ""
const CLIENT_SECRET = ""
const USER_AGENT = ""

const githubClient = new GithubOAuth.Client({ AUTH_CALLBACK_URL, CLIENT_SECRET, CLIENT_ID, USER_AGENT })
const googleClient = new GoogleOAuth.Client({ CLIENT_ID, CLIENT_SECRET, AUTH_CALLBACK_URL })


export const app = new Elysia()

.get('/auth/o/github/login', ({ set, cookie }) => {
    const { url, state } = githubClient.createAuthorizationURL(GithubOAuth.exampleScope)

    cookie.state.set({
        value: state,
        path: "/",
        httpOnly: true,
    })

    set.status = 302
    set.headers.location = url.toString()
})


.get('/auth/o/github/confirm', async ({ set, request, cookie }) => {
    const state = cookie.state.value
    const code = githubClient.confirmToken(request,state)

    const { access_token } = await githubClient.requestToken(code)

    cookie.access_token.set({
        value: access_token,
        path: "/",
        httpOnly: true
    })

    set.status = 302
    set.headers.location = '/'
},{
    cookie: t.Object({ state: t.String() })
})


.get('/auth/o/google/login', ({ set, cookie }) => {
    const { url, state } = googleClient.createAuthorizationURL(GoogleOAuth.exampleScope)

    cookie.state.set({
        value: state,
        path: "/",
        httpOnly: true,
    })

    set.status = 302
    set.headers.location = url.toString()
})


.get('/auth/o/google/confirm', async ({ set, request, cookie }) => {
    const state = cookie.state.value
    const code = googleClient.confirmToken(request,state)

    const { data: { access_token, id_token } } = await googleClient.requestToken(code)

    cookie.access_token.set({
        value: access_token,
        path: "/",
        httpOnly: true
    })

    cookie.id_token.set({
        value: id_token,
        path: "/",
        httpOnly: true
    })

    set.status = 302
    set.headers.location = '/'
},{
    cookie: t.Object({ state: t.String() })
})
