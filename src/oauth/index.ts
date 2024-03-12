import { Cookie, Elysia } from "elysia";
import { GithubOAuth } from "./github";
import { GoogleOAuth } from "./google"
GoogleOAuth.logging(true)

class GithubClient {
    constructor(public cookie: Record<string,Cookie>) {}

    get isSession() {
        // TODO: check jwt issuer
        return Boolean(this.cookie.access_token.value)
    }

    async repositories() {
        return await GithubOAuth.apiRequest<{ name: string, html_url: string }[]>(
            '/user/repos?sort=created&direction=desc',
            this.cookie.access_token.value as string
        )
    }
}

class GoogleClient {
    constructor(public cookie: Record<string,Cookie>) {}

    get isSession() {
        // TODO: check jwt issuer
        return Boolean(this.cookie.id_token.value)
    }

    async userInfo() {
        return await GoogleOAuth.exampleUserInfo(this.cookie.access_token.value as string)
    }
}

export default new Elysia()
.derive(({ cookie }) => ({
    auth: new GithubClient(cookie),
    googleClient: new GoogleClient(cookie)
}))

.get('/auth/o/github/login', ({ set, cookie }) => {
    const { githubUrl, state } = GithubOAuth.createAuthorizationURL(GithubOAuth.exampleScope)

    set.status = 302
    set.headers['Location'] = githubUrl.toString()

    cookie.state.value = state
})

.get('/auth/logout', ({ cookie, set }) => {
    // NOTE: the path should explicitly defined
    // otherwise if logout url is /auth/logout, remove cookie not work
    cookie.access_token.remove({ path: '/' })
    cookie.id_token.remove({ path: '/' })
    set.status = 302
    set.headers.location = "/"
})

.get('/auth/o/github/confirm', async ({ request, cookie, set }) => {
    const token = await GithubOAuth.confirmToken(request, cookie.state.value)

    // NOTE: the path should explicitly defined
    cookie.access_token.set({
        value: token.access_token,
        path: '/',
        httpOnly: true,
    })

    set.status = 302
    set.headers.location = "/"
})


.get('/auth/o/google/login', ({ set, cookie }) => {
    const { googleUrl, state } = GoogleOAuth.createAuthorizationURL(GoogleOAuth.exampleScope)

    set.status = 302
    set.headers['Location'] = googleUrl.toString()

    cookie.state.value = state
})

.get('/auth/o/google/confirm', async ({ request, set, cookie }) => {
    const {
        data: { access_token, id_token },
        user: _
    } = await GoogleOAuth.confirmToken(request, cookie.state.value)

    // NOTE: the path should explicitly defined
    cookie.access_token.set({
        value: access_token,
        path: '/',
        httpOnly: true,
    })

    // NOTE: jwt token
    cookie.id_token.set({
        value: id_token,
        path: '/',
        httpOnly: true,
    })

    set.status = 302
    set.headers.location = "/"
})

.onStart(({ server }) => {
    const { url } = server!
    GithubOAuth.setup({
        AUTH_CALLBACK_URL: url.origin + '/auth/o/github/confirm',
        HOME_URL: url.origin
    })

    GoogleOAuth.setup({
        AUTH_CALLBACK_URL: url.origin + '/auth/o/google/confirm',
        HOME_URL: url.origin
    })

    console.log("GITHUB",GithubOAuth.AUTH_CALLBACK_URL, GithubOAuth.HOME_URL)
    console.log("GOOGLE",GoogleOAuth.AUTH_CALLBACK_URL, GoogleOAuth.HOME_URL)
})
