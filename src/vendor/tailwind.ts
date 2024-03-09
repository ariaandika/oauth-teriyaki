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

export const tailwind = await (async() => {
    const { css } = await postcss(tw({ content: ["./src/**/*.{ts,tsx}"] })).process(src, { from: "bleb.css", });
    return new Elysia()
    .get('/app.css', ({ set }) => {
        set.headers["content-type"] = "text/css"
        return css
    })
})()
