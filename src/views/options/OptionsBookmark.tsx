import React, { memo, useMemo, useRef, useState } from "react"
import { styled } from "styled-components"
import { Button, CheckBox, RadioGroup, FormattedText, Icon, Input, Label, LayouttedDiv, Group, Select, GroupTag, DraggableEditList } from "@/components"
import { GroupModel } from "@/functions/database"
import { useGroupList } from "@/hooks/bookmarks"
import { useCreator, useEditor } from "@/utils/reactivity"
import { HTML_TYPE, JSON_TYPE, readFile, saveFile } from "@/utils/file-system"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, RADIUS_SIZES, SPACINGS } from "@/styles"
import { backups } from "@/services/bookmarks"
import { dates } from "@/utils/primitives"
import { analyseHTMLBookmarkFile } from "@/utils/html-bookmark"
import { analyseHTMLBookmarks } from "@/utils/html-bookmark-parser"

export function OptionsBookmarkPanel() {
    const { groupList, errorMessage, addGroup, updateGroup, deleteGroup, clearErrorMessage } = useGroupList()

    const [selectedIndex, setSelectedIndex] = useState<number | "new" | null>(null)

    const setSelectedIndexWithAOP = (selectedIndex: number | "new" | null) => {
        setSelectedIndex(selectedIndex)
        clearErrorMessage()
    }

    const addGroupWithAOP = async (form: GroupModel) => {
        if(groupList && await addGroup(form)) {
            //此处取得的是上一次闭包的过期值，但是它恰好是新项的插入位置
            setSelectedIndexWithAOP(groupList.length)
        }
    }

    return <>
        <p>
            书签管理器提供了一个额外的书签功能，允许以标签组的形式组织页面。
        </p>
        <Label>导入/导出</Label>
        <Backup/>
        <HTMLBackup/>
        <Label>组配置</Label>
        {groupList?.map((group, index) => selectedIndex !== index 
            ? <GroupListItem key={group.groupKeyPath} group={group} onSelect={() => setSelectedIndexWithAOP(index)}/> 
            : <GroupDetail key={group.groupKeyPath} 
                group={group} allGroups={groupList} 
                onUpdateGroup={f => updateGroup(index, f)} onDeleteGroup={() => deleteGroup(index)} 
                error={errorMessage?.keyPath === group.groupKeyPath ? errorMessage.error : null}
                />
        )}
        {selectedIndex !== "new" 
            ? <GroupListNew onSelect={() => setSelectedIndexWithAOP("new")}/>
            : <GroupNew onAdd={addGroupWithAOP} allGroups={groupList ?? []} error={errorMessage !== null && errorMessage.keyPath === null ? errorMessage.error : null}/>
        }
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

const HTMLBackup = memo(function () {
    const importHTML = async () => {
        const text = await readFile({types: [HTML_TYPE]})
        if(text !== undefined) {
            const bm = analyseHTMLBookmarkFile(text)
            console.log(bm)
            analyseHTMLBookmarks(bm, {
                keywordProperties: [],
                directoryProperties: {}
            })
        }
    }

    return <LayouttedDiv mt={1}>
        <Group>
            <Button onClick={importHTML}><Icon icon="file-import" mr={2}/>从书签备份文件导入</Button>
            <FormattedText color="secondary" size="small">从通用格式的浏览器书签导入，并生成为专有格式。</FormattedText>
        </Group>
    </LayouttedDiv>
})

const GroupListNew = memo(function ({ onSelect }: {onSelect?(): void}) {
    return <GroupListItemDiv onClick={onSelect}>
        新建组
    </GroupListItemDiv>
})

const GroupNew = memo(function ({ onAdd, allGroups, error }: {onAdd(group: GroupModel): void, allGroups: GroupModel[], error: Extract<ReturnType<typeof useGroupList>["errorMessage"], object>["error"] | null}) {
    const { editor, changed, setProperty, save } = useCreator({
        updateValue: onAdd,
        to: f => f,
        default: () => ({
            groupKeyPath: "",
            groupName: "",
            availableFor: "both",
            availableCondition: [],
            multi: false,
            items: []
        } as GroupModel)
    })

    const disabled = useMemo(() => !changed || !editor.groupKeyPath || !editor.groupName || editor.items.some(item => !item.itemName || !item.itemKeyPath), [changed, editor.groupName, editor.groupKeyPath, editor.items])

    return <GroupListItemDiv>
        新建组
        <LayouttedDiv mt={2}>
            <Group>
                <Input width="50%" placeholder="组名" value={editor.groupName} onUpdateValue={v => setProperty("groupName", v)}/>
                <Input width="45%" placeholder="键值" value={editor.groupKeyPath} onUpdateValue={v => setProperty("groupKeyPath", v)}/>
            </Group>
        </LayouttedDiv>
        <RightTop>
            <Button size="small" mode={disabled ? "transparent" : "filled"} type="success" disabled={disabled} onClick={save}><Icon icon="save" mr={2}/>创建新组</Button>
            {error && <p><FormattedText size="small" color="danger">{ERROR_MESSAGES[error]}</FormattedText></p>}
        </RightTop>
        <LayouttedDiv padding={1}>
            <CheckBox checked={editor.multi} onUpdateChecked={v => setProperty("multi", v)}>允许多选</CheckBox>
            <FormattedText bold mr={1} ml={4}>可用于</FormattedText>
            <Group><RadioGroup items={AVAILABLE_FOR_ITEMS} value={editor.availableFor} onUpdateValue={v => setProperty("availableFor", v)}/></Group>
        </LayouttedDiv>
        <LayouttedDiv>
            <Label>前置条件</Label>
            <ConditionList conditions={editor.availableCondition} onUpdateConditions={v => setProperty("availableCondition", v)} allGroups={allGroups}/>
        </LayouttedDiv>
        <LayouttedDiv mt={2}>
            <Label>组项</Label>
            <GroupItemList items={editor.items} onUpdateItems={v => setProperty("items", v)}/>
        </LayouttedDiv>
    </GroupListItemDiv>
})

const GroupListItem = memo(function ({ group, onSelect }: {group: GroupModel, onSelect?(): void}) {
    return <GroupListItemDiv onClick={onSelect}>
        {group.groupName}
        <FormattedText size="small" color="secondary" ml={1}>{group.groupKeyPath}</FormattedText>
    </GroupListItemDiv>
})

const GroupDetail = memo(function ({ group, error, onUpdateGroup, onDeleteGroup, allGroups }: {group: GroupModel, error: Extract<ReturnType<typeof useGroupList>["errorMessage"], object>["error"] | null, onUpdateGroup(form: GroupModel): void, onDeleteGroup(): void, allGroups: GroupModel[]}) {
    const { editor, changed, setProperty, save } = useEditor({
        value: group,
        updateValue: onUpdateGroup,
        from: v => v,
        to: f => f,
        default: () => group
    })

    const disabled = useMemo(() => !changed || !editor.groupName || editor.items.some(item => !item.itemName || !item.itemKeyPath), [changed, editor.groupName, editor.items])

    const deleteGroup = () => {
        if(confirm("确认要删除此组吗？")) {
            onDeleteGroup()
        }
    }

    return <GroupListItemDiv>
        <div>
            {group.groupName}
            <FormattedText size="small" color="secondary" ml={1}>{group.groupKeyPath}</FormattedText>
        </div>
        <LayouttedDiv mt={2}>
            <Input width="50%" placeholder="组名" value={editor.groupName} onUpdateValue={v => setProperty("groupName", v)}/>
        </LayouttedDiv>
        <LayouttedDiv padding={1}>
            <CheckBox checked={editor.multi} onUpdateChecked={v => setProperty("multi", v)}>允许多选</CheckBox>
            <FormattedText bold mr={1} ml={4}>可用于</FormattedText>
            <Group><RadioGroup items={AVAILABLE_FOR_ITEMS} value={editor.availableFor} onUpdateValue={v => setProperty("availableFor", v)}/></Group>
        </LayouttedDiv>
        <LayouttedDiv>
            <Label>前置条件</Label>
            <ConditionList conditions={editor.availableCondition} onUpdateConditions={v => setProperty("availableCondition", v)} selfKeyPath={group.groupKeyPath} allGroups={allGroups}/>
        </LayouttedDiv>
        <LayouttedDiv mt={2}>
            <Label>组项</Label>
            <GroupItemList items={editor.items} onUpdateItems={v => setProperty("items", v)}/>
        </LayouttedDiv>
        <RightTop>
            <Group>
                <Button size="small" type="danger" onClick={deleteGroup}><Icon icon="trash" mr={2}/>删除</Button>
                <Button size="small" mode={disabled ? "transparent" : "filled"} type="primary" disabled={disabled} onClick={save}><Icon icon="save" mr={2}/>保存更改</Button>
            </Group>
            {error && <p><FormattedText size="small" color="danger">{ERROR_MESSAGES[error]}</FormattedText></p>}
        </RightTop>
    </GroupListItemDiv>
})

const ConditionList = memo(function ({ selfKeyPath, conditions, onUpdateConditions, allGroups }: { selfKeyPath?: string, conditions: GroupModel["availableCondition"], onUpdateConditions(c: GroupModel["availableCondition"]): void, allGroups: GroupModel[] }) {
    const onAdd = (newCondition: [string, string]) => {
        if(conditions?.length) {
            if(!conditions.some(c => c[0] === newCondition[0] && c[1] === newCondition[1])) {
                onUpdateConditions([...conditions, newCondition])
            }
        }else{
            onUpdateConditions([newCondition])
        }
    }

    return <>
        {conditions && conditions.length > 0 && <LayouttedDiv border radius="std" padding={[1, 2]}>
            <DraggableEditList items={conditions} onUpdateItems={onUpdateConditions} editable keyOf={c => `${c[0]}-${c[1]}`} child={c => <GroupTag item={c} allGroups={allGroups}/>}/>
        </LayouttedDiv>}
        <NewConditionItem onAdd={onAdd} selfKeyPath={selfKeyPath} allGroups={allGroups}/>
    </>
})

const NewConditionItem = memo(function ({ onAdd, selfKeyPath, allGroups }: { onAdd(condition: [string, string]): void, selfKeyPath?: string, allGroups: GroupModel[] }) {
    const groupSelectItems = useMemo(() => allGroups.filter(g => g.groupKeyPath !== selfKeyPath).map(g => ({label: g.groupName, value: g.groupKeyPath})), [selfKeyPath, allGroups])
    const [selectedGroup, setSelectedGroup] = useState<string | undefined>(() => groupSelectItems.length > 0 ? groupSelectItems[0].value : undefined)
    
    const itemSelectItems = useMemo(() => selectedGroup === undefined ? undefined : allGroups.find(g => g.groupKeyPath === selectedGroup)?.items.map(i => ({label: i.itemName, value: i.itemKeyPath})), [allGroups, selectedGroup])
    const [selectedItem, setSelectedItem] = useState<string | undefined>(() => itemSelectItems && itemSelectItems.length > 0 ? itemSelectItems[0].value : undefined)

    const add = () => {
        if(selectedGroup !== undefined && selectedItem !== undefined) {
            onAdd([selectedGroup, selectedItem])
        }
    }
    
    return <LayouttedDiv mt={1}>
        <Group>
            <Select size="small" items={groupSelectItems} value={selectedGroup} onUpdateValue={setSelectedGroup}/>
            <Select size="small" items={itemSelectItems} value={selectedItem} onUpdateValue={setSelectedItem}/>
            <Button size="small" onClick={add}><Icon icon="plus" mr={2}/>添加前置条件</Button>
        </Group>
    </LayouttedDiv>
})

const GroupItemList = memo(function ({ items, onUpdateItems }: { items: GroupModel["items"], onUpdateItems(items: GroupModel["items"]): void }) {
    const add = (key: string, name: string) => {
        const idx = items.findIndex(item => item.itemKeyPath === key)
        if(idx < 0) {
            onUpdateItems([...items, {itemKeyPath: key, itemName: name}])
        }else{
            onUpdateItems([...items.slice(0, idx), {itemKeyPath: key, itemName: name}, ...items.slice(idx + 1)])
        }
    }

    return <>
        {items.length > 0 && <LayouttedDiv radius="std" backgroundColor="block" border padding={[1, 2]}>
            <DraggableEditList items={items} onUpdateItems={onUpdateItems} editable keyOf={item => item.itemKeyPath} child={item => <ExistGroupItem {...item}/>}/>
        </LayouttedDiv>}
        <NewGroupItem onAdd={add}/>
    </>
})

const ExistGroupItem = memo(function ({ itemKeyPath, itemName }: GroupModel["items"][number]) {
    return <span>
        [
            {itemName}
            <FormattedText ml={1} size="small" color="secondary">{itemKeyPath}</FormattedText>
        ]
    </span>
})

const NewGroupItem = memo(function ({ onAdd }: {onAdd(key: string, name: string): void}) {
    const keyInputRef = useRef<HTMLElement | null>(null)
    const nameInputRef = useRef<HTMLElement | null>(null)

    const [key, setKey] = useState("")
    const [name, setName] = useState("")

    const add = () => {
        if(key.trim() && name.trim()) {
            onAdd(key.trim(), name.trim())
            setKey("")
            setName("")
            nameInputRef.current?.focus()
        }
    }


    const onNameInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.code === "Enter" && !e.altKey && !e.ctrlKey && keyInputRef.current !== null) {
            keyInputRef.current.focus()
        }
    }

    const onKeyInputKeydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if(e.code === "Enter" && !e.altKey && !e.ctrlKey) {
            add()
        }
    }


    return <LayouttedDiv mt={1}>
        <Group>
            <Input ref={nameInputRef} width="10em" size="small" placeholder="新组项名称" value={name} onUpdateValue={setName} onKeydown={onNameInputKeydown} updateOnInput/>
            <Input ref={keyInputRef} width="10em" size="small" placeholder="新组项键值" value={key} onUpdateValue={setKey} onKeydown={onKeyInputKeydown} updateOnInput/>
            <Button size="small" onClick={add}><Icon icon="plus" mr={2}/>添加新组项</Button>
        </Group>
    </LayouttedDiv>
})

const AVAILABLE_FOR_ITEMS: {label: string, value: GroupModel["availableFor"]}[] = [
    {label: "仅书签", value: "bookmark"},
    {label: "仅页面", value: "page"},
    {label: "两者皆可", value: "both"}
]

const ERROR_MESSAGES: {[key in Extract<ReturnType<typeof useGroupList>["errorMessage"], object>["error"]]: string} = {
    "ALREADY_EXISTS": "组的键值已存在。",
    "GROUP_OCCUPIED": "组已被使用，无法移除。",
    "ITEM_OCCUPIED": "项已被使用，无法移除。"
}

const GroupListItemDiv = styled.div`
    position: relative;
    user-select: none;
    border-radius: ${RADIUS_SIZES["std"]};
    border: solid 1px ${LIGHT_MODE_COLORS["border"]};
    padding: ${SPACINGS[1]} ${SPACINGS[2]};
    margin-top: ${SPACINGS[1]};
    width: 600px;
    @media (prefers-color-scheme: dark) {
        border-color: ${DARK_MODE_COLORS["border"]};
    }
`

const RightTop = styled.div`
    position: absolute;
    right: ${SPACINGS[1]};
    top: ${SPACINGS[1]};
    text-align: right;
`
