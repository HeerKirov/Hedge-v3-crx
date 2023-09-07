import { GroupModel } from "@/functions/database/model"
import { memo, useMemo } from "react"
import { FormattedText } from "."

export const GroupTag = memo(function ({ item: [groupKeyPath, itemKeyPath], allGroups }: { item: [string, string], allGroups: GroupModel[] }) {
    const group = useMemo(() => {
        const group = allGroups.find(g => g.groupKeyPath === groupKeyPath)
        if(group) {
            const item = group.items.find(i => i.itemKeyPath === itemKeyPath)
            if(item) {
                return {group: group.groupName, item: item.itemName}
            }else{
                return {group: group.groupName, item: "UNKNOWN"}
            }
        }else{
            return {group: "UNKNOWN", item: "UNKNOWN"}
        }
    }, [groupKeyPath, itemKeyPath, allGroups])

    return <span>
        [
        <FormattedText color="secondary" size="small">{group.group}:</FormattedText>
        {group.item}
        ]
    </span>
})