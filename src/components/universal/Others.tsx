import styled, { css } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, ElementHeights, FONT_SIZES, FontSizes, LIGHT_MODE_COLORS, ThemeColors, FunctionalColors, SPACINGS, RadiusSizes, RADIUS_SIZES } from "@/styles"

interface Children {
    children?: (JSX.Element | string | null | undefined)[] | JSX.Element | string | null
}

interface Formatted {
    backgroundColor?: ThemeColors | FunctionalColors
    color?: ThemeColors | FunctionalColors
    size?: FontSizes
    lineHeight?: ElementHeights
    bold?: boolean
    mr?: number, ml?: number
}

interface Layoutted {
    display?: "block" | "inline-block" | "inline"
    margin?: number | [number, number] | [number, number, number, number]
    padding?: number | [number, number] | [number, number, number, number]
    border?: boolean, radius?: RadiusSizes, borderColor?: ThemeColors | FunctionalColors
    mr?: number, ml?: number, mt?: number, mb?: number
    pr?: number, pl?: number, pt?: number, pb?: number
}

interface SeparatorProps {
    direction?: "horizontal" | "vertical"
    spacing?: number
}

type FormattedTextProps = Formatted & Children

type LayouttedDivProps = Formatted & Layoutted & Children

type StyledFormattedProps = { [K in keyof Formatted as `$${K}`]: Formatted[K] }

type StyledLayouttedProps = { [K in keyof Layoutted as `$${K}`]: Layoutted[K] }

type StyledSeparatorProps = { [K in keyof SeparatorProps as `$${K}`]: SeparatorProps[K] }

export function FormattedText(props: FormattedTextProps) {
    return <StyledFormattedText $backgroundColor={props.backgroundColor} $bold={props.bold} $color={props.color} $size={props.size} $lineHeight={props.lineHeight} $mr={props.mr} $ml={props.ml}>
        {props.children}
    </StyledFormattedText>
}

export function LayouttedDiv(props: LayouttedDivProps) {
    return <StyledLayouttedDiv 
        $backgroundColor={props.backgroundColor} $display={props.display}
        $radius={props.radius} $border={props.border} $borderColor={props.borderColor}
        $bold={props.bold} $color={props.color} $size={props.size} $lineHeight={props.lineHeight} 
        $margin={props.margin} $padding={props.padding} 
        $mr={props.mr} $ml={props.ml} $mt={props.mt} $mb={props.mb} 
        $pt={props.pt} $pb={props.pb} $pl={props.pl} $pr={props.pr}
    >{props.children}</StyledLayouttedDiv>
}

export function Separator(props: SeparatorProps) {
    return <StyledSeparator $direction={props.direction} $spacing={props.spacing}/>
}

const StyledFormattedText = styled.span<StyledFormattedProps>`
    ${p => p.$backgroundColor && css`
        background-color: ${LIGHT_MODE_COLORS[p.$backgroundColor]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS[p.$backgroundColor]};
        }
    `}
    ${p => p.$color && css`
        color: ${LIGHT_MODE_COLORS[p.$color]};
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS[p.$color]};
        }
    `}
    ${p => p.$bold && css`font-weight: 700;`}
    ${p => p.$size && css`font-size: ${FONT_SIZES[p.$size]};`}
    ${p => p.$lineHeight && css`line-height: ${ELEMENT_HEIGHTS[p.$lineHeight]};`}
    ${p => p.$mr && css`margin-right: ${SPACINGS[p.$mr]};`}
    ${p => p.$ml && css`margin-left: ${SPACINGS[p.$ml]};`}
`

const StyledLayouttedDiv = styled.div<StyledFormattedProps & StyledLayouttedProps>`
    display: ${p => p.$display ?? "block"};
    ${p => p.$radius && css`border-radius: ${RADIUS_SIZES[p.$radius]};`}
    ${p => p.$border && css`
        border: solid 1px ${LIGHT_MODE_COLORS[p.$borderColor ?? "border"]};
        @media (prefers-color-scheme: dark) {
            border-color: ${DARK_MODE_COLORS[p.$borderColor ?? "border"]};
        }
    `}
    ${p => p.$backgroundColor && css`
        background-color: ${LIGHT_MODE_COLORS[p.$backgroundColor]};
        @media (prefers-color-scheme: dark) {
            background-color: ${DARK_MODE_COLORS[p.$backgroundColor]};
        }
    `}
    ${p => p.$color && css`
        color: ${LIGHT_MODE_COLORS[p.$color]};
        @media (prefers-color-scheme: dark) {
            color: ${DARK_MODE_COLORS[p.$color]};
        }
    `}
    ${p => p.$bold && css`font-weight: 700;`}
    ${p => p.$size && css`font-size: ${FONT_SIZES[p.$size]};`}
    ${p => p.$lineHeight && css`line-height: ${ELEMENT_HEIGHTS[p.$lineHeight]};`}
    ${p => p.$margin && (
        typeof p.$margin === "number" ? css`margin: ${SPACINGS[p.$margin]};` 
        : p.$margin.length === 2 ? css`margin: ${SPACINGS[p.$margin[0]]} ${SPACINGS[p.$margin[1]]};`
        : css`margin: ${SPACINGS[p.$margin[0]]} ${SPACINGS[p.$margin[1]]} ${SPACINGS[p.$margin[2]]} ${SPACINGS[p.$margin[3]]};`
    )}
    ${p => p.$padding && (
        typeof p.$padding === "number" ? css`padding: ${SPACINGS[p.$padding]};` 
        : p.$padding.length === 2 ? css`padding: ${SPACINGS[p.$padding[0]]} ${SPACINGS[p.$padding[1]]};`
        : css`padding: ${SPACINGS[p.$padding[0]]} ${SPACINGS[p.$padding[1]]} ${SPACINGS[p.$padding[2]]} ${SPACINGS[p.$padding[3]]};`
    )}
    ${p => p.$mr && css`margin-right: ${SPACINGS[p.$mr]};`}
    ${p => p.$ml && css`margin-left: ${SPACINGS[p.$ml]};`}
    ${p => p.$mt && css`margin-top: ${SPACINGS[p.$mt]};`}
    ${p => p.$mb && css`margin-bottom: ${SPACINGS[p.$mb]};`}
    ${p => p.$pr && css`padding-right: ${SPACINGS[p.$pr]};`}
    ${p => p.$pl && css`padding-left: ${SPACINGS[p.$pl]};`}
    ${p => p.$pt && css`padding-top: ${SPACINGS[p.$pt]};`}
    ${p => p.$pb && css`padding-bottom: ${SPACINGS[p.$pb]};`}
`

export const Group = styled.div`
    display: inline-block;
    > :not(:last-child) {
        margin-right: ${SPACINGS[1]};
    }
`

export const Label = styled.label`
    font-weight: 700;
    display: block;
    color: ${LIGHT_MODE_COLORS["text"]};
    &:not(:first-child) {
        margin-top: ${SPACINGS[2]};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
    }
`

export const SecondaryText = styled.p`
    font-size: ${FONT_SIZES["small"]};
    color: ${LIGHT_MODE_COLORS["secondary-text"]};
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["secondary-text"]};
    }
`

const StyledSeparator = styled.div<StyledSeparatorProps>`
    box-sizing: border-box;
    flex: 0 0 auto;
    background-color: ${LIGHT_MODE_COLORS["border"]};
    @media (prefers-color-scheme: dark) {
        background-color: ${DARK_MODE_COLORS["border"]};
    }
    ${p => p.$direction === "vertical" ? css`
        display: inline-block;
        vertical-align: middle;
        width: 1px;
        height: ${ELEMENT_HEIGHTS["std"]};
        ${p.$spacing && css`margin: 0 ${SPACINGS[p.$spacing]};`}
    ` : css`
        display: block;
        width: 100%;
        height: 1px;
        ${p.$spacing && css`margin: ${SPACINGS[p.$spacing]} 0;`}
    `}
`