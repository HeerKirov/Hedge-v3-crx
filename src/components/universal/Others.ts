import styled, { css } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, ElementHeights, FONT_SIZES, FontSizes, LIGHT_MODE_COLORS, ThemeColors, SPACINGS } from "@/styles"

export const Label = styled.label`
    font-weight: 700;
    display: block;
    color: ${LIGHT_MODE_COLORS["text"]};
    margin-top: ${SPACINGS[2]};
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
    }
`

export const FormattedText = styled.span<{ backgroundColor?: ThemeColors, color?: ThemeColors, size?: FontSizes, lineHeight?: ElementHeights }>`
    ${p => p.backgroundColor && css`
        background-color: ${LIGHT_MODE_COLORS[p.backgroundColor]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS[p.backgroundColor]};
        }
    `}
    ${p => p.color && css`
        color: ${LIGHT_MODE_COLORS[p.color]};
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS[p.color]};
        }
    `}
    ${p => p.size && css`font-size: ${FONT_SIZES[p.size]}`}
    ${p => p.lineHeight && css`line-height: ${ELEMENT_HEIGHTS[p.lineHeight]}`}
`

export const SecondaryText = styled.p`
    font-size: ${FONT_SIZES["small"]};
    color: ${LIGHT_MODE_COLORS["secondary-text"]};
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["secondary-text"]};
    }
`

export const Group = styled.div`
    > :not(:last-child) {
        margin-right: ${SPACINGS[1]};
    }
`