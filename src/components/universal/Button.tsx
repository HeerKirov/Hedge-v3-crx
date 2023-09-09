import { ReactNode } from "react"
import { css, styled } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, LIGHT_MODE_COLORS, RADIUS_SIZES, ThemeColors } from "@/styles"

interface ButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
    mode?: "transparent" | "filled"
    type?: ThemeColors
    size?: "std" | "small" | "large"
    square?: boolean
    round?: boolean
    width?: string
    disabled?: boolean
    onClick?: () => void
    children?: ReactNode
}

export function Button(props: ButtonProps) {
    const { mode, type, size, square, round, width, disabled, onClick, children, ...attrs } = props
    return <StyledButton {...attrs} $mode={mode} $type={type} $size={size} $square={square} $round={round} $width={width} disabled={disabled} onClick={onClick}>
        {props.children}
    </StyledButton>
}

export const StyledButton = styled.button<{
    $mode?: "transparent" | "filled"
    $type?: ThemeColors
    $size?: "std" | "small" | "large"
    $square?: boolean
    $round?: boolean
    $width?: string
}>`
    box-sizing: border-box;
    vertical-align: middle;
    padding: 0 ${p => p.$square ? "0" : "0.8em"};
    border-radius: ${p => RADIUS_SIZES[p.$round ? "round" : "std"]};
    font-size: ${p => FONT_SIZES[p.$size ?? "std"]};
    height: ${p => ELEMENT_HEIGHTS[p.$size ?? "std"]};
    line-height: ${p => ELEMENT_HEIGHTS[p.$size ?? "std"]};
    ${p => p.$width && css`width: ${p.$width};`}
    ${p => p.$mode === "filled" ? css`
        color: ${LIGHT_MODE_COLORS["text-inverted"]};
        background-color: ${p.$type ? LIGHT_MODE_COLORS[p.$type] : "default"};
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
            background-color: ${p.$type ? DARK_MODE_COLORS[p.$type] : "default"};
        }
    `
    : css`
        background-color: rgba(255, 255, 255, 0);
        &:hover:not([disabled]) {
            background-color: rgba(45, 50, 55, 0.09);
        }
        &:active:not([disabled]) {
            background-color: rgba(45, 50, 55, 0.13);
        }
        ${p.disabled ? css`
            color: ${LIGHT_MODE_COLORS["secondary-text"]};
        ` : p.$type ? css`
            color: ${LIGHT_MODE_COLORS[p.$type]};
        ` : null}
        @media (prefers-color-scheme: dark) {
            ${p.disabled ? css`
                color: ${DARK_MODE_COLORS["secondary-text"]};
            ` : p.$type ? css`
                color: ${DARK_MODE_COLORS[p.$type]};
            ` : null}
        }
    `
}
`