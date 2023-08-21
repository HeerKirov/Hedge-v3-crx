import { css } from "styled-components"

export const USEFUL_COLORS = ["green", "blue", "skyblue", "teal", "cyan", "yellow", "red", "orange", "pink", "deeppink", "tea", "brown"] as const

export const THEME_COLORS = ["primary", "info", "success", "warning", "danger", "secondary"] as const

export const COLORS = [...USEFUL_COLORS, ...THEME_COLORS] as const

export type UsefulColors = typeof USEFUL_COLORS[number]

export type ThemeColors = typeof THEME_COLORS[number]

export type Colors = typeof COLORS[number]

export const ColorStyle = css`

//== 基本颜色定义 ==

--green: #18a058;
--blue: #1468cc;
--skyblue: #00bfff;
--teal: #008080;
--cyan: #00d1b2;
--yellow: #fcb040;
--red: #d03050;
--orange: #ff7f50;
--pink: #fa7c91;
--deeppink: #ff1493;
--tea: #757763;
--brown: #8b4513;

//== 反相基本颜色定义 ==

--green-inverted: #63e2b7;
--blue-inverted: #449fce;
--skyblue-inverted: #6ed5f8;
--teal-inverted: #568c8c;
--cyan-inverted: #88d9cd;
--yellow-inverted: #f2c97d;
--red-inverted: #e88080;
--orange-inverted: #fda584;
--pink-inverted: #fca5b3;
--deeppink-inverted: #fc7fc3;
--tea-inverted: #aaad91;
--brown-inverted: #8b603f;

//== 基本黑白色调定义 ==

--white: #ffffff;
--white2: #f5f5f5;
--black: #000000;
--black2: rgb(17, 20, 23);
--black3: rgb(22, 24, 30);
--black4: rgb(76, 76, 82);
--grey: #7a7a7a;

--lightgrey: rgb(230, 230, 240);
--lightgrey2: rgb(55, 55, 65);


//== 实际颜色选取 ==

--light-mode-background-color: var(--white2);
--light-mode-block-color: var(--white);
--light-mode-text-color: var(--black4);
--light-mode-text-inverted-color: var(--white);
--light-mode-secondary-text-color: var(--grey);
--light-mode-border-color: var(--lightgrey);

--dark-mode-background-color: var(--black2);
--dark-mode-block-color: var(--black3);
--dark-mode-text-color: var(--white2);
--dark-mode-text-inverted-color: var(--black);
--dark-mode-secondary-text-color: var(--grey);
--dark-mode-border-color: var(--lightgrey2);

--light-mode-primary: var(--blue);
--light-mode-info: var(--skyblue);
--light-mode-success: var(--green);
--light-mode-warning: var(--yellow);
--light-mode-danger: var(--red);
--light-mode-link: var(--blue);
--light-mode-secondary: var(--grey);
--light-mode-tertiary: var(--lightgrey);

--dark-mode-primary: var(--blue-inverted);
--dark-mode-info: var(--skyblue-inverted);
--dark-mode-success: var(--green-inverted);
--dark-mode-warning: var(--yellow-inverted);
--dark-mode-danger: var(--red-inverted);
--dark-mode-link: var(--blue-inverted);
--dark-mode-secondary: var(--grey);
--dark-mode-tertiary: var(--lightgrey2);

//== 导出的主题色 ==

@media (prefers-color-scheme: light) {
    --background-color: var(--light-mode-background-color);
    --block-color: var(--light-mode-block-color);
    --text-color: var(--light-mode-text-color);
    --text-inverted-color: var(--light-mode-text-inverted-color);
    --secondary-text-color: var(--light-mode-secondary-text-color);
    --border-color: var(--light-mode-border-color);

    --primary: var(--light-mode-primary);
    --info: var(--light-mode-info);
    --success: var(--light-mode-success);
    --warning: var(--light-mode-warning);
    --danger: var(--light-mode-danger);
    --link: var(--light-mode-link);
    --secondary: var(--light-mode-secondary);
    --tertiary: var(--light-mode-tertiary);
}

@media (prefers-color-scheme: dark) {
    --background-color: var(--dark-mode-background-color);
    --block-color: var(--dark-mode-block-color);
    --text-color: var(--dark-mode-text-color);
    --text-inverted-color: var(--dark-mode-text-inverted-color);
    --secondary-text-color: var(--dark-mode-secondary-text-color);
    --border-color: var(--dark-mode-border-color);

    --primary: var(--dark-mode-primary);
    --info: var(--dark-mode-info);
    --success: var(--dark-mode-success);
    --warning: var(--dark-mode-warning);
    --danger: var(--dark-mode-danger);
    --link: var(--dark-mode-link);
    --secondary: var(--dark-mode-secondary);
    --tertiary: var(--dark-mode-tertiary);
}

`