import { memo, useMemo } from "react"
import { GroupModel } from "@/functions/database"
import { FormattedText } from "."

interface GroupTagProps {
    item: [string, string]
    allGroups: GroupModel[]
    prefix?: boolean
    colored?: boolean
    bold?: boolean
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

    return <span>
        [
        {prefix && <FormattedText color="secondary" size="small">{group.group}:</FormattedText>}
        <FormattedText bold={bold} color={colored ? group.color : undefined}>{group.item}</FormattedText>
        ]
    </span>
})
