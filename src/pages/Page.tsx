import { Elysia } from "elysia";
import Google from "./Google";
import Github from "./Github"
import oauth from "../oauth";

export default new Elysia()
.use(oauth)
.get("/", async ({ auth }) => Base(
    <section class="h-full bg-gray-50 grid place-items-center">
        <div class="p-8 w-[560px] h-[800px] shadow-lg rounded-md bg-white space-y-8">
        {auth.isSession ? <>
            <h1 class="text-4xl font-bold">Welcome</h1>
            <a href="/auth/logout">Logout</a>
            <h2 class="text-xl font-semibold">Repositories</h2>
            <ul>
            {(await auth.repositories()).map(e => (
                <li>{e.name}: {e.html_url} <pre>{JSON.stringify(e)}</pre></li>
            ))}
            </ul>
        </> : <>
            <h1 class="text-4xl font-bold">Lets log you in</h1>
            <div class="">
                <a href="/">{Google}</a>
                <a href="/auth/o/github/login">{Github}</a>
            </div>
        </>}
        </div>
    </section>
))




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

