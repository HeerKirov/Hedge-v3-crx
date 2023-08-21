import { createGlobalStyle } from "styled-components"
import { ColorStyle, USEFUL_COLORS, THEME_COLORS, UsefulColors, ThemeColors, Colors } from "./color"
import { SizeStyle } from "./size"

export { USEFUL_COLORS, THEME_COLORS }
export type { UsefulColors, ThemeColors, Colors }

export const GlobalStyle = createGlobalStyle`

html {
    ${ColorStyle}
    ${SizeStyle}
}

body {
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
    background-color: var(--background-color);
    color: var(--text-color);
    font-size: var(--font-size-std);
}

html::-webkit-scrollbar {
    display: none;
}

//按钮默认样式
button {
    appearance: auto;
    border-style: outset;
    border-image: initial;
    border-color: transparent;
    border-width: 0;
    word-spacing: normal;
    letter-spacing: normal;
    text-rendering: auto;
    text-transform: none;
    text-indent: 0;
    text-shadow: none;
    text-align: center;
    justify-content: center;
    white-space: nowrap;
    align-items: flex-start;
    display: inline-block;
    box-sizing: border-box;
    outline: none;
    color: inherit;
}

//input默认样式
input[type="text"],
input[type="number"],
input[type="password"],
textarea {
    text-rendering: auto;
    letter-spacing: normal;
    word-spacing: normal;
    text-transform: none;
    text-indent: 0;
    text-shadow: none;
    text-align: start;
    justify-content: flex-start;
    -webkit-rtl-ordering: logical;
    box-sizing: border-box;
    outline: none;
}

//文本默认样式
html,
body,
p,
ol,
ul,
li,
dl,
dt,
dd,
blockquote,
figure,
fieldset,
legend,
textarea,
pre,
iframe,
hr,
h1,
h2,
h3,
h4,
h5,
h6 {
    margin: 0;
    padding: 0;
}

article,
aside,
figure,
footer,
header,
hgroup,
section {
    display: block;
}

span {
    font-style: inherit;
    font-weight: inherit;
}

h1 {
    font-size: var(--font-size-h1);
}

h2 {
    font-size: var(--font-size-h2);
}

h3 {
    font-size: var(--font-size-h3);
}

h4 {
    font-size: var(--font-size-h4);
}

code {
    color: var(--red);
    font-weight: normal;
    padding-right: 0.25em;
    padding-left: 0.25em;
}

img,
video {
    display: block;
}
`