import { css, styled } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, LIGHT_MODE_COLORS, RADIUS_SIZES, ThemeColors } from "@/styles"

interface ButtonProps {
    mode?: "transparent" | "filled"
    type?: ThemeColors
    size?: "std" | "small" | "large"
    square?: boolean
    round?: boolean
}

export const Button = styled.button<ButtonProps>`
    box-sizing: border-box;
    vertical-align: middle;
    padding: 0 ${p => p.square ? "0" : "1em"};
    border-radius: ${p => RADIUS_SIZES[p.round ? "round" : "std"]};
    font-size: ${p => FONT_SIZES[p.size ?? "std"]};
    height: ${p => ELEMENT_HEIGHTS[p.size ?? "std"]};
    line-height: ${p => ELEMENT_HEIGHTS[p.size ?? "std"]};
    ${p => p.mode === "filled" ? css`
        color: ${LIGHT_MODE_COLORS["text-inverted"]};
        background-color: ${p.type ? LIGHT_MODE_COLORS[p.type] : "default"};
        &:hover:not([disabled]) {
            opacity: 0.88;
        }
        &:active:not([disabled]) {
            opacity: 0.8;
        }
        &[disabled] {
            opacity: 0.75;
        }
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS["text-inverted"]};
            background-color: ${p.type ? DARK_MODE_COLORS[p.type] : "default"};
        }
    `
    : css<ButtonProps>`
        background-color: rgba(255, 255, 255, 0);
        &:hover:not([disabled]) {
            background-color: rgba(45, 50, 55, 0.09);
        }
        &:active:not([disabled]) {
            background-color: rgba(45, 50, 55, 0.13);
        }
        ${p.disabled ? css`
            color: ${LIGHT_MODE_COLORS["secondary-text"]};
        ` : p.type ? css`
            color: ${LIGHT_MODE_COLORS[p.type]};
        ` : null}
        @media (prefers-color-scheme: dark) {
            ${p.disabled ? css`
                color: ${DARK_MODE_COLORS["secondary-text"]};
            ` : p.type ? css`
                color: ${DARK_MODE_COLORS[p.type]};
            ` : null}
        }
    `
}
`