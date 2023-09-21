import React, { memo } from "react"
import { Button, FormattedText, Icon, Label, LayouttedDiv, Group } from "@/components"
import { useGroupList } from "@/hooks/bookmarks"
import { JSON_TYPE, readFile, saveFile } from "@/utils/file-system"
import { backups } from "@/services/bookmarks"
import { dates } from "@/utils/primitives"
import { HTMLImport } from "./OptionsBookmarkImport"
import { GroupList } from "@/views/options/OptionsBookmarkGroups"

export function OptionsBookmarkPanel() {
    const { groupList, errorMessage, addGroup, updateGroup, deleteGroup, clearErrorMessage } = useGroupList()

    return <>
        <p>
            书签管理器提供了一个额外的书签功能，允许以标签组的形式组织页面。
        </p>
        <Label>导入/导出</Label>
        <Backup/>
        <HTMLImport allGroups={groupList}/>
        <Label>组配置</Label>
        <GroupList groupList={groupList} errorMessage={errorMessage} addGroup={addGroup} updateGroup={updateGroup} deleteGroup={deleteGroup} clearErrorMessage={clearErrorMessage}/>
    </>
}

const Backup = memo(function () {
    const importFromBackup = async () => {
        const text = await readFile({types: [JSON_TYPE]})
        if(text !== undefined) {
            const res = await backups.import(text)
            if(res.ok) {
                alert("备份数据已导入。")
            }
        }
    }

    const exportToBackup = async () => {
        const content = await backups.export()
        const date = dates.toFormatDate(new Date())
        await saveFile({suggestedName: `HedgeBookmark-${date}.json`, types: [JSON_TYPE], content})
        alert("备份数据已生成。")
    }

    return <LayouttedDiv mt={1}>
        <Group>
            <Button onClick={importFromBackup}><Icon icon="upload" mr={2}/>读取备份数据</Button>
            <Button onClick={exportToBackup}><Icon icon="download" mr={2}/>生成备份数据</Button>
            <FormattedText color="secondary" size="small">将数据库生成为备份文件，或从已有的备份文件还原数据库。</FormattedText>
        </Group>
    </LayouttedDiv>
})
