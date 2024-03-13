import { Elysia } from "elysia"
import { tailwind } from "./vendor"
import { html } from "@elysiajs/html"
import Page from "./pages/Page.v2"



new Elysia()
.onError(({ error }) => {
    console.error(error)
})
.use(tailwind)
.use(html())
.use(Page)
.listen(3000)
