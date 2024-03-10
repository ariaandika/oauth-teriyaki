import { Elysia } from "elysia"
import postcss from "postcss"
import tw from "tailwindcss"

const src = `\
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base {
    html, body { @apply h-full overflow-hidden }
}
`

let res = new Promise(async (resolve) => {
    const { css } = await postcss(tw({ content: ["./src/**/*.{ts,tsx}"] })).process(src, { from: "bleb.css", });
    res = css
    resolve(css)
}) as any

export const tailwind = new Elysia()
.get('/app.css', async ({ set }) => {
    set.headers["content-type"] = "text/css"
    return res
})
