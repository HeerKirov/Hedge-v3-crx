import React, { useEffect, useRef, useState } from "react"
import { mix } from "polished"
import { styled, css } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, FunctionalColors, LIGHT_MODE_COLORS, RADIUS_SIZES, ThemeColors } from "@/styles"

interface InputProps {
    value?: string | null | undefined
    type?: "text" | "password" | "number" | "textarea"
    size?: "small" | "std" | "large"
    textAlign?: "left" | "center" | "right"
    borderColor?: ThemeColors | FunctionalColors
    width?: string
    placeholder?: string
    disabled?: boolean
    updateOnInput?: boolean
    autoFocus?: boolean
    onUpdateValue?(value: string): void
    onKeydown?(e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void
    onBlur?(e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void
}

export const Input = React.forwardRef(function (props: InputProps, ref: React.ForwardedRef<HTMLElement>) {
    const { type, size, width, textAlign, borderColor, placeholder, disabled, value, onUpdateValue } = props

    const onKeydown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if(!compositionRef.current) {
            props.onKeydown?.(e)
        }
    }

    //输入法合成器防抖
    const compositionRef = useRef(false)
    const onCompositionstart = () => compositionRef.current = true
    const onCompositionend = () => compositionRef.current = false

    //自动聚焦
    const localRef = useRef<HTMLElement | null>()
    const setRef = (el: HTMLInputElement | HTMLTextAreaElement | null) => {
        if(ref !== null) {
            if(typeof ref === "function") ref(el)
            else ref.current = el
        }
        if(props.autoFocus) {
            localRef.current = el
        }
    }
    if(props.autoFocus) {
        useEffect(() => { localRef.current?.focus() }, [])
    }

    if(props.updateOnInput) {
        const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onUpdateValue?.(e.target.value)
    
        if(type === "textarea") {
            return <StyledTextarea ref={setRef} 
                $size={size ?? "std"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                disabled={disabled} placeholder={placeholder} value={value ?? undefined} 
                onChange={onChange} onKeyDown={onKeydown} onBlur={props.onBlur}
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }else{
            return <StyledInput ref={setRef} 
                $size={size ?? "std"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                type={type ?? "text"} disabled={disabled} placeholder={placeholder} value={value ?? undefined} 
                onChange={onChange} onKeyDown={onKeydown} onBlur={props.onBlur}
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }
    }else{
        const [text, setText] = useState<string>(props.value ?? "")

        const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setText(e.target.value)
    
        const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
            onUpdateValue?.(text)
            props.onBlur?.(e)
        }

        useEffect(() => { if((props.value ?? "") !== text) setText(props.value ?? "") }, [props.value ?? ""])
    
        if(type === "textarea") {
            return <StyledTextarea ref={setRef} 
                $size={size ?? "std"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                disabled={disabled} placeholder={placeholder} value={text} 
                onChange={onChange} onBlur={onBlur} onKeyDown={onKeydown} 
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }else{
            return <StyledInput ref={setRef} 
                $size={size ?? "std"} type={type ?? "text"} $width={width} $textAlign={textAlign} $borderColor={borderColor}
                disabled={disabled} placeholder={placeholder} value={text} 
                onChange={onChange} onBlur={onBlur} onKeyDown={onKeydown} 
                onCompositionStart={onCompositionstart} onCompositionEnd={onCompositionend}/>
        }
    }
})

interface StyledCSSProps {
    $size: "small" | "std" | "large"
    $width?: string
    $textAlign?: "left" | "center" | "right"
    $borderColor?: ThemeColors | FunctionalColors
}

const StyledCSS = css<StyledCSSProps>`
    text-rendering: auto;
    letter-spacing: normal;
    word-spacing: normal;
    text-transform: none;
    text-indent: 0;
    text-shadow: none;
    justify-content: flex-start;
    -webkit-rtl-ordering: logical;
    box-sizing: border-box;
    outline: none;
    vertical-align: middle;
    align-items: center;
    display: inline-flex;
    line-height: 1.2;
    border-radius: ${RADIUS_SIZES["std"]};
    border: 1px solid ${p => LIGHT_MODE_COLORS[p.$borderColor ?? "border"]};
    color: ${LIGHT_MODE_COLORS["text"]};
    background-color: ${LIGHT_MODE_COLORS["block"]};
    font-size: ${p => FONT_SIZES[p.$size]};
    height: ${p => ELEMENT_HEIGHTS[p.$size]};
    ${p => p.$textAlign && css`text-align: ${p.$textAlign};`}
    ${p => p.$width && css` width: ${() => p.$width}; `}
    &[disabled] {
        color: ${mix(0.2, LIGHT_MODE_COLORS["text"], "#ffffff")};
        background-color: m${mix(0.96, LIGHT_MODE_COLORS["block"], "#000000")};
    }
    @media (prefers-color-scheme: dark) {
        color: ${DARK_MODE_COLORS["text"]};
        background-color: ${DARK_MODE_COLORS["block"]};
        border-color: ${p => DARK_MODE_COLORS[p.$borderColor ?? "border"]};
        &[disabled] {
            color: ${mix(0.2, DARK_MODE_COLORS["text"], "#ffffff")};
        background-color: m${mix(0.96, DARK_MODE_COLORS["block"], "#000000")};
        }
    }
`

const StyledInput = styled.input<StyledCSSProps>`
    ${StyledCSS}
    padding: 0 calc(0.85em - 1px);
    &::-webkit-outer-spin-button, 
    &::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
`

const StyledTextarea = styled.textarea<StyledCSSProps>`
    ${StyledCSS}
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