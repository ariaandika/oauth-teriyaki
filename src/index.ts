import { Elysia } from "elysia"
import { tailwind } from "./vendor"
import { html } from "@elysiajs/html"
import Page from "./pages/Page"



new Elysia()
    .use(tailwind)
    .use(html())
    .use(Page)
.listen(3000)
