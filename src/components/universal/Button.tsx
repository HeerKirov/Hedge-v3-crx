import { css, styled } from "styled-components"
import { Colors } from "@/styles"

interface ButtonProps {
    mode?: "transparent" | "filled"
    type?: Colors
    size?: "std" | "small" | "large"
    square?: boolean
    round?: boolean
}

export const Button = styled.button<ButtonProps>`
    box-sizing: border-box;
    vertical-align: middle;
    padding: 0 ${p => p.square ? "0" : "1em"};
    border-radius: var(--radius-size-${p => p.round ? "round" : "std"});
    font-size: var(--font-size-${p => p.size ?? "std"});
    height: var(--element-height-${p => p.size ?? "std"});
    line-height: var(--element-height-${p => p.size ?? "std"});
    ${p => p.mode === "filled" ? css`
        color: var(--text-inverted-color);
        background-color: var(--${p.type});
        &:hover:not([disabled]) {
            opacity: 0.88;
        }
        &:active:not([disabled]) {
            opacity: 0.8;
        }
        &[disabled] {
            opacity: 0.75;
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
            color: var(--secondary-text-color);
        ` : p.type ? css`
            color: var(--${p.type});
        ` : null}
    `
}
`