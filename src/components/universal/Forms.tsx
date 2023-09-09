import React, { memo, useCallback, useMemo, useState } from "react"
import { css, styled } from "styled-components"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"
import { DraggableEditList, FormattedText, Icon, Input, LayouttedDiv } from "."
import { GroupModel } from "@/functions/database/model"

interface DynamicInputListProps {
    values?: string[]
    onUpdateValues?(values: string[]): void
    mode?: "start" | "stretch"
    placeholder?: string
    size?: "small" | "std" | "large"
    disabled?: boolean
}

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

interface GroupPickerProps {
    groups?: [string, string][]
    onUpdateGroups?(groups: [string, string][]): void
    allGroups: GroupModel[]
    mode: "page" | "bookmark"
}

export const DynamicInputList = memo(function (props: DynamicInputListProps) {
    const [newText, setNewText] = useState<string>("")

    const update = (index: number, value: string) => {
        const newValue = value.trim()
        if(props.onUpdateValues && (!props.values?.length || props.values.indexOf(newValue) === -1)) {
            if(newValue) {
                props.onUpdateValues(props.values?.length ? [...props.values.slice(0, index), newValue, ...props.values.slice(index + 1)] : [newValue])
            }else if(props.values?.length) {
                props.onUpdateValues([...props.values.slice(0, index), ...props.values.slice(index + 1)])
            }
        }
    }

    const add = () => {
        const newValue = newText.trim()
        if(props.onUpdateValues && newValue && (!props.values?.length || props.values.indexOf(newValue) === -1)) {
            props.onUpdateValues(props.values?.length ? [...props.values, newValue] : [newValue])
            setNewText("")
        }
    }

    const onKeydown = (e: React.KeyboardEvent<HTMLElement>) => {
        if(e.code === "Enter" && !e.altKey && !e.ctrlKey) {
            add()
        }
    }

    const inputs = useMemo(() => props.values?.map((v, i) => <Input key={i} size={props.size} disabled={props.disabled} value={v} onUpdateValue={v => update(i, v)}/>), [props.values, props.disabled])

    return <DynamicInputListDiv $mode={props.mode ?? "stretch"} $count={props.values?.length ?? 0}>
        {inputs}
        <Input size={props.size} disabled={props.disabled} placeholder={props.placeholder} value={newText} onUpdateValue={setNewText} updateOnInput onKeydown={onKeydown} onBlur={add}/>
    </DynamicInputListDiv>
})

export const Starlight = memo(function (props: StarlightProps) {
    const click = (value: number) => {
        if(props.editable && props.onUpdateScore) props.onUpdateScore(props.score !== value ? value : undefined)
    }

    const colorMode = props.colorMode === "std" || props.colorMode === undefined ? props.score : props.colorMode === "inherit" ? undefined : 0

    return <StarlightSpan $editable={props.editable ?? false} $value={colorMode}>
        {Array(props.score ?? 0).fill(0).map((_, i) => <Icon key={i} icon="star" onClick={() => click(i + 1)}/>)}
        {Array(5 - (props.score ?? 0)).fill(0).map((_, i) => <Icon key={i + (props.score ?? 0)} icon={["far", "star"]} onClick={() => click(i + 1 + (props.score ?? 0))}/>)}
        <b>{props.score}</b>
    </StarlightSpan>
})

export const KeywordList = memo(function (props: KeywordListProps) {
    const [addText, setAddText] = useState("")

    const onTextKeydown = (e: React.KeyboardEvent) => {
        const text = addText.trim()
        if(text && !e.altKey && !e.ctrlKey && e.code === "Enter") {
            props.onUpdateKeywords?.(props.keywords ? [...props.keywords, text] : [text])
            setAddText("")
        }
    }

    return <KeywordInputDiv>
        <DraggableEditList editable={props.editable} items={props.keywords} onUpdateItems={props.onUpdateKeywords} child={keyword => (<KeywordSpan><span>[</span>{keyword}<span>]</span></KeywordSpan>)}>
            {props.editable && <Input width="10em" size="small" placeholder="添加新的关键词" value={addText} onUpdateValue={setAddText} onKeydown={onTextKeydown} updateOnInput/>}
        </DraggableEditList>
    </KeywordInputDiv>
})

export const GroupPicker = memo(function (props: GroupPickerProps) {
    const filteredGroups = useMemo(() => props.allGroups.filter(group => {
        if((group.availableFor === "page" && props.mode === "bookmark") || (group.availableFor === "bookmark" && props.mode === "page")) return false
        if(group.availableCondition?.length && group.availableCondition.every(c => !props.groups?.some(g => g[0] === c[0] && g[1] === c[1]))) return false
        return true
    }).sort((a, b) => {
        if(a.availableFor !== b.availableFor) return a.availableFor === "both" ? -1 : 1
        if(a.availableCondition?.length ?? 0 !== b.availableCondition?.length ?? 0) return (a.availableCondition?.length ?? 0) < (b.availableCondition?.length ?? 0) ? -1 : 1
        return 0
    }).map(group => {
        const selectedItem = props.groups?.find(g => g[0] === group.groupKeyPath)?.[1]

        const select = (itemKeyPath: string | undefined) => {
            if(props.onUpdateGroups) {
                if(props.groups?.length) {
                    const idx = props.groups.findIndex(g => g[0] === group.groupKeyPath)
                    if(idx >= 0) {
                        const oldItemKeyPath = props.groups[idx][1]
                        const newGroups: [string, string][] = itemKeyPath !== undefined ? [...props.groups.slice(0, idx), [group.groupKeyPath, itemKeyPath], ...props.groups.slice(idx + 1)] : [...props.groups.slice(0, idx), ...props.groups.slice(idx + 1)]
                        const processedGroups = processGroupChange(props.allGroups, newGroups, {groupKeyPath: group.groupKeyPath, oldItemKeyPath, newItemKeyPath: itemKeyPath})
                        props.onUpdateGroups(processedGroups)
                    }else if(itemKeyPath !== undefined) {
                        const newGroups: [string, string][] = [...props.groups, [group.groupKeyPath, itemKeyPath]]
                        props.onUpdateGroups(newGroups)
                    }
                }else if(itemKeyPath !== undefined) {
                    props.onUpdateGroups([[group.groupKeyPath, itemKeyPath]])
                }
            }
        }

        return {group, selectedItem, select}
    }), [props.allGroups, props.mode, props.groups, props.onUpdateGroups])

    const processGroupChange = useCallback((allGroups: GroupModel[], groups: [string, string][], changedGroup: {groupKeyPath: string, oldItemKeyPath: string, newItemKeyPath: string | undefined}): [string, string][] => {
        //此函数在某个group item变化时，筛掉因此变化导致的前置条件不再满足的其他group item
        //筛掉其他item还会进一步引起新的变化。这些变化也会一同处理
        let currentGroups = groups
        const queue: {groupKeyPath: string, oldItemKeyPath: string, newItemKeyPath: string | undefined}[] = [changedGroup]

        while(queue.length > 0) {
            const change = queue.shift()!
            const nextGroups = []
            for(const gi of currentGroups) {
                const group = allGroups.find(g => g.groupKeyPath === gi[0])
                if(group && group.availableCondition && group.availableCondition.length 
                    && group.availableCondition.some(c => c[0] === change.groupKeyPath && c[1] === change.oldItemKeyPath)
                    && (change.newItemKeyPath === undefined || !group.availableCondition.some(c => c[0] === change.groupKeyPath && c[1] === change.newItemKeyPath))) {
                    //发现一个group，它的前置条件包括了old group item，并且它的前置条件不包括new group item(或new group item已清除)
                    queue.push({groupKeyPath: gi[0], oldItemKeyPath: gi[1], newItemKeyPath: undefined})
                }else{
                    //保留到了下一轮
                    nextGroups.push(gi)
                }
            }
            currentGroups = nextGroups
        }

        return currentGroups
    }, [])

    return filteredGroups.length > 0 ? <GroupPickerDiv>
        {filteredGroups.map(({ group, selectedItem, select }) => <GroupPickerItem key={group.groupKeyPath} group={group} selectedItem={selectedItem} onUpdateSelected={select}/>)}
    </GroupPickerDiv> : <LayouttedDiv textAlign="center" color="secondary">
        <i>没有可用的组</i>
    </LayouttedDiv>
})

const GroupPickerItem = memo(function ({ group, selectedItem, onUpdateSelected }: {group: GroupModel, selectedItem: string | undefined, onUpdateSelected(item: string | undefined): void}) {
    const click = (itemKeyPath: string) => onUpdateSelected(itemKeyPath !== selectedItem ? itemKeyPath : undefined)

    const color = group.availableFor === "both" ? "primary" : group.availableFor === "bookmark" ? "info" : "success"

    return <GroupPickerItemDiv>
        [
        <FormattedText size="small" color="secondary">{group.groupName}:</FormattedText>
        <div>
            {group.items.map(item => (
                <FormattedText key={item.itemKeyPath} ml={1} 
                    color={item.itemKeyPath === selectedItem ? color : undefined} 
                    bold={item.itemKeyPath === selectedItem} 
                    onClick={() => click(item.itemKeyPath)}>
                        {item.itemName}
                </FormattedText>
            ))}
        </div>
        ]
    </GroupPickerItemDiv>
})

const STARLIGHT_COLOR_PICKS = ["text", "secondary", "info", "success", "warning", "danger"] as const


const DynamicInputListDiv = styled.div<{ $mode: "stretch" | "start", $count: number }>`
    display: flex;
    width: 100%;
    justify-content: ${p => p.$mode};
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    > input:not(:last-child) {
        width: ${p => 100 / (p.$count * 1 + 0.5)}%;
        flex-grow: 2;
        flex-shrink: 1;
    }
    > input:last-child {
        width: ${p => 100 / (p.$count * 2 + 1)}%;
        flex-grow: 1;
        flex-shrink: 2;
    }
`

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

const KeywordInputDiv = styled.div`
    display: flex;
    align-items: center;
    gap: ${SPACINGS[1]};
    padding: ${SPACINGS[1]};
    overflow-y: auto;
    height: 100%;
    &::-webkit-scrollbar {
        display: none;
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

const GroupPickerDiv = styled.div`
    max-height: 100%;
    overflow-y: auto;
`

const GroupPickerItemDiv = styled.div`
    user-select: none;
    display: flex;
    justify-content: space-between;
    > span {
        flex-shrink: 0;
    }
    > div {
        width: 100%;
        > span {
            white-space: nowrap;
            cursor: pointer;
        }
    }
`