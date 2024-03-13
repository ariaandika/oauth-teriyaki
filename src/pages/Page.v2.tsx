import { Elysia } from "elysia";
import Google from "./Google";
import Github from "./Github"
import { app, type Context } from "../oauth/index.v2";

export default new Elysia()
.use(app)
.get("/", async ({ githubClient, googleClient, cookie }) => {

    const context = cookie.context.value
    let auth: Context | undefined

    if (context) {
        auth = context
    }

    console.log({auth})

    return Base(
        <section class="h-full bg-gray-50 grid place-items-center">
            <div class="p-8 w-[560px] h-[800px] shadow-lg rounded-md bg-white space-y-8">
            {auth && auth.provider === 'google' ? await (async () => {
                const session = googleClient.createSession(auth.access_token)
                const res = await session.exampleUserInfo()
                return <>
                    <h1 class="text-4xl font-bold">Google Info</h1>
                    <a href="/auth/logout">Logout</a>
                    <h2 class="text-xl font-semibold">Info</h2>
                    <div>Name: {res.name}</div>
                    <div>Email: {res.email}</div>
                    <div>Given name: {res.given_name}</div>
                    <div>Hd: {res.hd}</div>
                </>
            })() : auth && auth.provider == 'github' ? await (async ()=>{
                const session = githubClient.createSession(auth.access_token)
                const repos = await session.repositories()

                return <>
                    <h1 class="text-4xl font-bold">Welcome</h1>
                    <a href="/auth/logout">Logout</a>
                    <h2 class="text-xl font-semibold">Repositories</h2>
                    <ul>
                    {repos.map(e => <li>{e.name}: {e.html_url} <pre>{JSON.stringify(e)}</pre></li>)}
                    </ul>
                </>
            })() : <>
                <h1 class="text-4xl font-bold">Lets log you in</h1>
                <div class="">
                    <a href="/auth/o/google/login">{Google}</a>
                    <a href="/auth/o/github/login">{Github}</a>
                </div>
            </>}
            </div>
        </section>
    )
})



function Base(page: JSX.Element) {
    return `\
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="ie=edge">
<title>OAuth Implementation</title>
<link rel="stylesheet" href="/app.css">
</head>
<body>
${page}
</body>
</html>`
}

