import { Elysia } from "elysia";
import Google from "./Google";




export default new Elysia()
.get("/", ({  }) => Base(
    <section class="h-full bg-gray-50 grid place-items-center">
        <div class="p-8 w-[560px] h-[800px] shadow-lg rounded-md bg-white space-y-8">
            <h1 class="text-4xl font-bold">Register</h1>
            {Google}
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
