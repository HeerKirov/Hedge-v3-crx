import React, { useEffect, useRef } from "react"
import { styled } from "styled-components"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, FONT_SIZES, LIGHT_MODE_COLORS, RADIUS_SIZES } from "@/styles"

interface SelectProps<T> {
    value?: T
    items?: {label: string, value: T}[]
    onUpdateValue?(value: T, index: number): void
    size?: "small" | "std" | "large"
}

export function Select<T>(props: SelectProps<T>) {
    const selectDom = useRef<HTMLSelectElement | null>(null)

    const changed = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if(props.items != undefined && props.onUpdateValue) {
            const idx = e.target.selectedIndex
            const value = props.items[idx]?.value
            if(value != undefined) {
                props.onUpdateValue(value, idx)
            }
        }
    }

    function watchProps() {
        if(selectDom.current != undefined && props.items != undefined && props.items.length > 0) {
            if(props.value != undefined) {
                const idx = props.items.findIndex(item => item.value === props.value)
                if(idx >= 0) selectDom.current.selectedIndex = idx
            }else{
                props.onUpdateValue?.(props.items[0].value, 0)
            }
        }
    }

    useEffect(watchProps, [props.items, props.value])

    return <StyledSelectDiv $size={props.size ?? "std"}>
        <select ref={selectDom} onChange={changed}>
            {props.items?.map(item => <option key={`${item.value}`} value={`${item.value}`}>{item.label}</option>)}
        </select>
    </StyledSelectDiv>
}

const StyledSelectDiv = styled.div<{ $size: "small" | "std" | "large" }>`
    display: inline-block;
    position: relative;
    vertical-align: middle;
    select {
        display: block;
        outline: none;
        line-height: 1.2;
        font-size: ${p => FONT_SIZES[p.$size]};
        height: ${p => ELEMENT_HEIGHTS[p.$size]};
        padding: 0 0.75em 0 0.75em;
        border: 1px solid ${LIGHT_MODE_COLORS["border"]};
        border-radius: ${RADIUS_SIZES["std"]};
        @media (prefers-color-scheme: dark) {
            border-color: ${DARK_MODE_COLORS["border"]};
        }
    }
`