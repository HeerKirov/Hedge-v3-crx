import React, { useState } from "react"
import { css, styled } from "styled-components"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"
import { DraggableEditList, Icon, Input, LayouttedDiv } from "."

interface StarlightProps {
    score?: number
    onUpdateScore?(value: number | undefined): void
    editable?: boolean
    colorMode?: "std" | "inherit" | "text"
}

interface KeywordListProps {
    keywords?: string[]
    onUpdateKeywords?(keywords: string[]): void
    editable?: boolean
}

export function Starlight(props: StarlightProps) {
    const click = (value: number) => {
        if(props.editable && props.onUpdateScore) props.onUpdateScore(props.score !== value ? value : undefined)
    }

    const colorMode = props.colorMode === "std" || props.colorMode === undefined ? props.score : props.colorMode === "inherit" ? undefined : 0

    return <StarlightSpan $editable={props.editable ?? false} $value={colorMode}>
        {Array(props.score ?? 0).fill(0).map((_, i) => <Icon key={i} icon="star" onClick={() => click(i + 1)}/>)}
        {Array(5 - (props.score ?? 0)).fill(0).map((_, i) => <Icon key={i + (props.score ?? 0)} icon={["far", "star"]} onClick={() => click(i + 1 + (props.score ?? 0))}/>)}
        <b>{props.score}</b>
    </StarlightSpan>
}

export function KeywordList(props: KeywordListProps) {
    const [addText, setAddText] = useState("")

    const onTextKeydown = (e: React.KeyboardEvent) => {
        const text = addText.trim()
        if(text && !e.altKey && !e.ctrlKey && e.code === "Enter") {
            props.onUpdateKeywords?.(props.keywords ? [...props.keywords, text] : [text])
            setAddText("")
        }
    }

    return <span>
        <DraggableEditList editable={props.editable} items={props.keywords} onUpdateItems={props.onUpdateKeywords} child={keyword => (<KeywordSpan><span>[</span>{keyword}<span>]</span></KeywordSpan>)}/>
        {props.editable && <LayouttedDiv display="inline-block" ml={1}><Input size="small" placeholder="添加新的关键词" value={addText} onUpdateValue={setAddText} onKeydown={onTextKeydown} updateOnInput/></LayouttedDiv>}
    </span>
}

const STARLIGHT_COLOR_PICKS = ["text", "secondary", "info", "success", "warning", "danger"] as const

const StarlightSpan = styled.span<{ $editable: boolean, $value: number | undefined }>`
    padding: 0 ${SPACINGS[1]};
    ${p => p.$value && p.$value <= 5 && css` color: ${LIGHT_MODE_COLORS[STARLIGHT_COLOR_PICKS[p.$value]]}; ` }
    @media (prefers-color-scheme: dark) {
        ${p => p.$value && p.$value <= 5 && css` color: ${DARK_MODE_COLORS[STARLIGHT_COLOR_PICKS[p.$value]]}; ` }
    }
    > svg {
        ${p => p.$editable && css` cursor: pointer; ` }
    }
    > b {
        display: inline-block;
        width: 1em;
        text-align: center;
        user-select: none;
        padding-left: ${SPACINGS[1]};
    }
`

const KeywordSpan = styled.span`
    > span {
        user-select: none;
        color: ${LIGHT_MODE_COLORS["secondary"]};
        @media (prefers-color-scheme: dark) { 
            color: ${DARK_MODE_COLORS["secondary"]};
        }
    }
`