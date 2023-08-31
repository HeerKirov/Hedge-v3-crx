import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, LIGHT_MODE_COLORS, RADIUS_SIZES } from "@/styles"
import { mix } from "polished"
import React from "react"
import { styled, css } from "styled-components"

interface InputProps {
    value?: string | null | undefined
    type?: "text" | "password" | "number" | "textarea"
    size?: "small" | "std" | "large"
    width?: string
    placeholder?: string
    disabled?: boolean
    onUpdateValue?(value: string): void
}

export function Input(props: InputProps) {
    const { type, size, width, placeholder, disabled, value, onUpdateValue } = props

    const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onUpdateValue?.(e.target.value)

    if(type === "textarea") {
        return <StyledTextarea $size={size ?? "std"} $width={width} disabled={disabled} placeholder={placeholder} value={value ?? undefined} onChange={onChange}/>
    }else{
        return <StyledInput type={type ?? "text"} $size={size ?? "std"} $width={width} disabled={disabled} placeholder={placeholder} value={value ?? undefined} onChange={onChange}/>
    }
}

const StyledCss = css<{ $size: "small" | "std" | "large", $width?: string }>`
    vertical-align: middle;
    align-items: center;
    display: inline-flex;
    line-height: 1.2;
    border-radius: ${RADIUS_SIZES["std"]};
    border: 1px solid ${LIGHT_MODE_COLORS["border"]};
    color: ${LIGHT_MODE_COLORS["text"]};
    background-color: ${LIGHT_MODE_COLORS["block"]};
    font-size: ${p => FONT_SIZES[p.$size]};
    height: ${p => ELEMENT_HEIGHTS[p.$size]};
    ${p => p.$width ? css` width: ${() => p.$width}; ` : null}
    &[disabled] {
        color: ${mix(0.2, LIGHT_MODE_COLORS["text"], "#ffffff")};
        background-color: m${mix(0.96, LIGHT_MODE_COLORS["block"], "#000000")};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
        background-color: ${DARK_MODE_COLORS["block"]};
        border-color: ${DARK_MODE_COLORS["border"]};
        &[disabled] {
            color: ${mix(0.2, DARK_MODE_COLORS["text"], "#ffffff")};
        background-color: m${mix(0.96, DARK_MODE_COLORS["block"], "#000000")};
        }
    }
`

const StyledInput = styled.input<{ $size: "small" | "std" | "large", $width?: string }>`
    ${StyledCss}
    padding: 0 calc(0.85em - 1px);    
`

const StyledTextarea = styled.textarea<{ $size: "small" | "std" | "large", $width?: string }>`
    ${StyledCss}
    padding: calc(0.6em - 1px) calc(0.85em - 1px);
    resize: vertical;
    &:not([rows]) {
        max-height: 40em;
        min-height: 6em;
    }
    &[rows] {
        height: initial;
    }
`