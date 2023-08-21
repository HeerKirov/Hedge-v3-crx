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
    border-radius: var(--radius-size-std);
    border: 1px solid var(--border-color);
    color: var(--text-color);
    background-color: var(--block-color);
    font-size: var(--font-size-${p => p.$size});
    height: var(--element-height-${p => p.$size});
    ${p => p.$width ? css`
        width: ${() => p.$width};
    ` : null}
    &[disabled] {
        color: mix(var(--text-color), #ffffff, 20%);
        background-color: mix(var(--block-color), #000000, 96%);
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