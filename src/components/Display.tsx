import { memo, useMemo } from "react"
import { styled } from "styled-components"
import { GroupModel } from "@/functions/database"
import { FormattedText, LayouttedDiv, WrappedText } from "./Styled"

interface GroupTagProps {
    item: [string, string]
    allGroups: GroupModel[]
    prefix?: boolean
    colored?: boolean
    bold?: boolean
}

interface DescriptionProps {
    value?: string
    mt?: number
    mb?: number
    padding?: number | [number, number] | [number, number, number, number]
}

export const GroupTag = memo(function ({ item: [groupKeyPath, itemKeyPath], allGroups, colored, bold, prefix }: GroupTagProps) {
    const group = useMemo(() => {
        const group = allGroups.find(g => g.groupKeyPath === groupKeyPath)
        if(group) {
            const item = group.items.find(i => i.itemKeyPath === itemKeyPath)
            const color = group.availableFor === "both" ? "primary" : group.availableFor === "bookmark" ? "info" : "success" as const
            if(item) {
                return {group: group.groupName, item: item.itemName, color} as const
            }else{
                return {group: group.groupName, item: "UNKNOWN", color} as const
            }
        }else{
            return {group: "UNKNOWN", item: "UNKNOWN", color: undefined}
        }
    }, [groupKeyPath, itemKeyPath, allGroups])

    return <FormattedText whiteSpace="nowrap">
        [
        {prefix && <FormattedText color="secondary" size="small">{group.group}:</FormattedText>}
        <FormattedText bold={bold} color={colored ? group.color : undefined}>{group.item}</FormattedText>
        ]
    </FormattedText>
})

export const Description = memo(function (props: DescriptionProps) {
    return <DescriptionDiv size="small" radius="std" backgroundColor="block" padding={props.padding ?? [1, 2]} mt={props.mt} mb={props.mb}>
        <WrappedText text={props.value}/>
    </DescriptionDiv>
})

const DescriptionDiv = styled(LayouttedDiv)`
    white-space: nowrap;
    overflow: auto;
    max-height: 4em;
    &::-webkit-scrollbar {
        display: none;
    }
`
