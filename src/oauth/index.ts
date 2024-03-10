import { Cookie, Elysia } from "elysia";
import { GithubOAuth } from "./github";


class GithubClient {
    constructor(
        public cookie: Record<string,Cookie>,
    ) {}

    get isSession() {
        return Boolean(this.cookie.access_token.value)
    }

    async repositories() {
        return await GithubOAuth.apiRequest<{ name: string, html_url: string }[]>(
            '/user/repos?sort=created&direction=desc',
            this.cookie.access_token.value as string
        )
    }
}

export default new Elysia()
.derive(({ cookie }) => ({ auth: new GithubClient(cookie) }))
.get('/auth/o/github/login', ({ set, cookie: { state } }) => {
    // logout first if loggedin
    // this.cookie.access_token.remove()

    const { githubUrl, state: newState } = GithubOAuth.createAuthorizationURL(GithubOAuth.exampleScope)

    set.status = 302
    set.headers['Location'] = githubUrl.toString() // + `&redirect_uri=${GithubOAuth.AUTH_CALLBACK_URL}`
    state.value = newState
})
.get('/auth/logout', ({ cookie, set }) => {
    // NOTE: the path should explicitly defined
    // otherwise if logout url is /auth/logout, remove cookie not work
    cookie.access_token.remove({ path: '/' })
    set.status = 302
    set.headers.location = "/"
})
.get('/auth/o/github/confirm', async ({ request, cookie: { state, access_token }, set }) => {
    const token = await GithubOAuth.confirmToken(request,state.value)

    // error
    // { error: string, error_description: string, error_uri: string }

    console.log({ token })

    access_token.set({
        value: token.access_token,
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

    console.log(GithubOAuth.AUTH_CALLBACK_URL, GithubOAuth.HOME_URL)
})
