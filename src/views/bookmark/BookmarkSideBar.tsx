import React, { memo, useCallback, useState } from "react"
import { css, styled } from "styled-components"
import { IconProp } from "@fortawesome/fontawesome-svg-core"
import { Button, FormattedText, Icon, Input, PopupMenu, PopupMenuItem, Select, Separator, SeparatorButton } from "@/components"
import { GroupModel, StoredQueryModel } from "@/functions/database"
import { QueryBookmarkFilter, StoredQueryForm } from "@/services/bookmarks"
import { useQueryAndFilter } from "@/hooks/bookmarks"
import { ELEMENT_HEIGHTS, SPACINGS } from "@/styles"

type QueryItem = ReturnType<typeof useQueryAndFilter>["queryItem"] 

interface BookmarkSideBarProps {
    queryItem?: QueryItem
    filter?: QueryBookmarkFilter | null
    filterDifferent?: boolean
    storedQueries?: StoredQueryModel[] | null
    allGroups?: GroupModel[] | null
    onUpdateQueryItem?(queryItem: QueryItem): void
    onUpdateFilter?(filter: QueryBookmarkFilter | null): void
    onSaveNewStoredQueryFromFilter?(name: string): void
    onSaveStoredQueryFromFilter?(): void
    onMoveStoredQuery?(index: number, moveToOrdinal: number): void
    onUpdateStoredQuery?(index: number, form: StoredQueryForm): void
    onDeleteStoredQuery?(index: number): void
}

interface FilterAreaProps {
    expanded: boolean
    filter: QueryBookmarkFilter | null | undefined
    allGroups: GroupModel[] | null | undefined
    queryItem: QueryItem | undefined
    onUpdateFilter(filter: QueryBookmarkFilter): void
}

interface FilterFunctionAreaProps {
    queryItem?: QueryItem
    filter?: QueryBookmarkFilter | null
    filterDifferent?: boolean
    onUpdateFilter?(filter: QueryBookmarkFilter): void
    onAddStoredQuery?(name: string): void
    onUpdateStoredQuery?(): void
}

export const BookmarkSideBar = memo(function(props: BookmarkSideBarProps) {
    const [expanded, setExpanded] = useState(false)

    const select = useCallback((newQueryItem: QueryItem) => {
        if(newQueryItem !== props.queryItem) {
            props.onUpdateQueryItem?.(newQueryItem)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.queryItem, props.onUpdateQueryItem])

    const updateFilter = useCallback((newFilter: QueryBookmarkFilter) => {
        const filter = newFilter.limit !== undefined || newFilter.offset !== undefined ? {search: newFilter.search, groups: newFilter.groups, order: newFilter.order, orderDirection: newFilter.orderDirection} : newFilter
        if(props.queryItem === "RECENT_COLLECTED" || props.queryItem === "RECENT_ADDED") {
            if(filter.search || filter.groups) {
                props.onUpdateQueryItem?.("SEARCH")
                props.onUpdateFilter?.(filter)
            }
        }else{
            const finalFilter = filter.search || filter.groups ? filter : null
            props.onUpdateFilter?.(finalFilter)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.queryItem, props.onUpdateFilter, props.onUpdateQueryItem])

    return <RootDiv>
        <FilterEditArea expanded={expanded} filter={props.filter} allGroups={props.allGroups} queryItem={props.queryItem} onUpdateFilter={updateFilter}/>
        {expanded && <FilterFunctionArea key={props.queryItem}
             filter={props.filter} filterDifferent={props.filterDifferent} queryItem={props.queryItem}
             onUpdateFilter={updateFilter}
             onAddStoredQuery={props.onSaveNewStoredQueryFromFilter}
             onUpdateStoredQuery={props.onSaveStoredQueryFromFilter}
        />}
        <SeparatorButton margin={[1, 0]} icon={expanded ? "caret-up" : "caret-down"} onClick={() => setExpanded(e => !e)}/>
        <div>
            <QueryItemButton queryItem={props.queryItem} value="SEARCH" icon="search" text="搜索" onClick={select}/>
            <QueryItemButton queryItem={props.queryItem} value="RECENT_ADDED" icon="calendar-plus" text="最近添加" onClick={select}/>
            <QueryItemButton queryItem={props.queryItem} value="RECENT_COLLECTED" icon="calendar-check" text="最近收集" onClick={select}/>
        </div>
        <Separator spacing={2}/>
        <StoredQueryListDiv>
            {props.storedQueries?.map((sq, index) => (
                <StoredQueryItem
                    key={sq.queryId} index={index} count={props.storedQueries!.length}
                    queryItem={props.queryItem} sq={sq} onSelect={select}
                    onMove={props.onMoveStoredQuery}
                    onUpdate={props.onUpdateStoredQuery}
                    onDelete={props.onDeleteStoredQuery}/>
            ))}
        </StoredQueryListDiv>
    </RootDiv>
})

const QueryItemButton = memo(function(props: {queryItem?: QueryItem, value?: QueryItem, icon: IconProp, text: string, onClick?(queryItem: QueryItem): void, onContextMenu?(e: React.MouseEvent<HTMLButtonElement>): void}) {
    return <StyledQueryItemButton
        mode={props.queryItem === props.value ? "filled" : undefined}
        type={props.queryItem === props.value ? "primary" : undefined}
        onClick={props.onClick && props.value !== undefined ? () => props.onClick!(props.value!) : undefined}
        onContextMenu={props.onContextMenu}>
        <Icon icon={props.icon} mr={2}/>{props.text}
    </StyledQueryItemButton>
})

const FilterEditArea = memo(function(props: FilterAreaProps) {
    const sortDisabled = props.queryItem === "RECENT_ADDED" || props.queryItem === "RECENT_COLLECTED"

    const updateSearch = (search: string) => (search.trim() ?? undefined) !== props.filter?.search && props.onUpdateFilter({...props.filter, search: search.trim() ?? undefined})

    const updateGroups = (groups: [string, string][]) => props.onUpdateFilter({...props.filter, groups: groups.length > 0 ? groups : undefined})

    const updateOrder = (order: QueryBookmarkFilter["order"]) => order !== props.filter?.order && props.onUpdateFilter({...props.filter, order})

    const updateOrderDirection = (orderDirection: QueryBookmarkFilter["orderDirection"]) => orderDirection !== props.filter?.orderDirection && props.onUpdateFilter({...props.filter, orderDirection})

    return <>
        <Input width="100%" placeholder="搜索书签" value={props.filter?.search} onUpdateValue={updateSearch}/>
        {props.expanded && <GroupGridDiv>
            <GroupSelectList groups={props.filter?.groups} onUpdateGroup={updateGroups} allGroups={props.allGroups}/>
            <div>
                <p><FormattedText userSelect="none" size="small" color="secondary">排序</FormattedText></p>
                <OrderSelect disabled={sortDisabled} order={props.filter?.order} onUpdateOrder={updateOrder}/>
                <OrderDirectionButton disabled={sortDisabled} orderDirection={props.filter?.orderDirection} onUpdateOrderDirection={updateOrderDirection}/>
            </div>
        </GroupGridDiv>}
    </>
})

const FilterFunctionArea = memo(function(props: FilterFunctionAreaProps) {
    const [panel, setPanel] = useState<"general" | "save-new">("general")

    const save = (text: string) => {
        props.onAddStoredQuery?.(text)
        setPanel("general")
    }

    if(props.queryItem === "SEARCH" && props.filter) {
        const clearFilter = () => props.onUpdateFilter?.({})

        return panel === "general" ? (
            <FilterFunctionAreaDiv $mode="buttons">
                <Button size="small" onClick={clearFilter}><Icon icon="close" mr={2}/>清除查询条件</Button>
                <Button size="small" onClick={() => setPanel("save-new")}><Icon icon="save" mr={2}/>保存这个查询</Button>
            </FilterFunctionAreaDiv>
        ) : panel === "save-new" ? (
            <RenamePanelArea initialText="" onSave={save} onCancel={() => setPanel("general")}/>
        ) : undefined
    }else if(typeof props.queryItem === "number" && props.filterDifferent) {
        const saveSelf = () => {
            props.onUpdateStoredQuery?.()
            setPanel("general")
        }

        return panel === "general" ? (
            <FilterFunctionAreaDiv $mode="buttons">
                <Button size="small" onClick={saveSelf}><Icon icon="save" mr={2}/>保存变更</Button>
                <Button size="small" onClick={() => setPanel("save-new")}><Icon icon={["far", "save"]} mr={2}/>另存为</Button>
            </FilterFunctionAreaDiv>
        ) : panel === "save-new" ? (
            <RenamePanelArea initialText="" onSave={save} onCancel={() => setPanel("general")}/>
        ) : undefined
    }else{
        return undefined
    }
})

const GroupSelectList = memo(function(props: {groups?: [string, string][], onUpdateGroup(group: [string, string][]): void, allGroups: GroupModel[] | null | undefined}) {
    const groups = props.allGroups?.map(group => {
        const items = [{label: "未选择", value: null}, ...group.items.map(i => ({label: i.itemName, value: i.itemKeyPath}))]
        const idx = props.groups?.findIndex(([gn]) => gn === group.groupKeyPath) ?? -1
        const selectedItem = idx >= 0 ? props.groups![idx][1] : null
        const select = idx >= 0 ? (value: string | null) => {
            if(value !== null) {
                props.onUpdateGroup([...props.groups!.slice(0, idx), [group.groupKeyPath, value], ...props.groups!.slice(idx + 1)])
            }else{
                props.onUpdateGroup([...props.groups!.slice(0, idx), ...props.groups!.slice(idx + 1)])
            }
        } : (value: string | null) => {
            if(value !== null) {
                props.onUpdateGroup([...(props.groups ?? []), [group.groupKeyPath, value]])
            }
        }

        return {groupKeyPath: group.groupKeyPath, groupName: group.groupName, items, selectedItem, select}
    })

    return groups?.map(group => <div key={group.groupKeyPath}>
        <p><FormattedText userSelect="none" size="small" color="secondary">{group.groupName}</FormattedText></p>
        <Select size="small" items={group.items} value={group.selectedItem} onUpdateValue={group.select}/>
    </div>)
})

const OrderSelect = memo(function(props: {order: QueryBookmarkFilter["order"], onUpdateOrder(order: QueryBookmarkFilter["order"]): void, disabled: boolean}) {
    return <Select size="small" items={ORDER_SELECT_ITEMS} value={props.order ?? null} disabled={props.disabled} onUpdateValue={v => props.onUpdateOrder(v !== null ? v : undefined)}/>
})

const OrderDirectionButton = memo(function(props: {orderDirection?: "asc" | "desc", onUpdateOrderDirection(od: "asc" | "desc" | undefined): void, disabled: boolean}) {
    return <Button square size="small" disabled={props.disabled} onClick={() => props.onUpdateOrderDirection(props.orderDirection === "desc" ? undefined : "desc")}><Icon icon={props.orderDirection === "desc" ? "arrow-down-wide-short" : "arrow-up-short-wide"}/></Button>
})

const StoredQueryItem = memo(function(props: {sq: StoredQueryModel, queryItem?: QueryItem, index: number, count: number, onSelect(q: QueryItem): void, onUpdate?(index: number, form: StoredQueryForm): void, onMove?(index: number, to: number): void, onDelete?(index: number): void }) {
    const { sq, queryItem, index, count, onSelect, onUpdate, onMove, onDelete } = props

    const [editMode, setEditMode] = useState(false)

    const rename = (text: string) => {
        onUpdate?.(index, {...sq, name: text})
        setEditMode(false)
    }

    const remove = () => {
        if(confirm("确认要删除此查询吗？")) {
            onDelete?.(index)
        }
    }

    const popupMenu: PopupMenuItem[] = [
        {type: "normal", label: "重命名", click: () => setEditMode(true)},
        {type: "separator"},
        {type: "normal", label: "上移一行", disabled: index <= 0, click: () => onMove?.(index, index - 1)},
        {type: "normal", label: "下移一行", disabled: index >= count - 1, click: () => onMove?.(index, index + 1)},
        {type: "separator"},
        {type: "normal", label: "删除", backgroundColor: "danger", click: remove},
    ]

    return editMode ? (
        <RenamePanelArea initialText={sq.name} onSave={rename} onCancel={() => setEditMode(false)}/>
    ) : (
        <PopupMenu items={popupMenu} children={popup => (
            <QueryItemButton key={sq.queryId} queryItem={queryItem} value={sq.queryId} icon="folder" text={sq.name} onClick={onSelect} onContextMenu={popup}/>
        )}/>
    )
})

const RenamePanelArea = memo(function(props: {initialText: string, onSave(text: string): void, onCancel(): void}) {
    const [text, setText] = useState(props.initialText)

    const save = () => {
        const trimed = text.trim()
        if(trimed) {
            props.onSave(trimed)
        }
    }

    return <FilterFunctionAreaDiv $mode="input-and-buttons">
        <Input size="small" placeholder="保存的查询名称" autoFocus updateOnInput value={text} onUpdateValue={setText} onEnter={save}/>
        <Button size="small" mode="filled" type="primary" square disabled={!text.trim()} onClick={save}><Icon icon="save"/></Button>
        <Button size="small" square onClick={props.onCancel}><Icon icon="close"/></Button>
    </FilterFunctionAreaDiv>
})

const ORDER_SELECT_ITEMS: {value: Exclude<QueryBookmarkFilter["order"], undefined> | null, label: string}[] = [
    {value: null, label: "默认排序"},
    {value: "createTime", label: "添加时间"},
    {value: "updateTime", label: "上次修改"},
    {value: "lastCollectTime", label: "上次收集"},
    {value: "score", label: "评价等级"}
]

const RootDiv = styled.div`
    height: 100%;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    > :not(:last-child) {
        flex-shrink: 0;
    }
`

const GroupGridDiv = styled.div`
    display: grid;
    grid-gap: ${SPACINGS[1]};
    grid-template-columns: repeat(2, 1fr);
    margin-top: ${SPACINGS[1]};
  
    > div > select:not(:last-child) {
        width: calc(100% - ${ELEMENT_HEIGHTS["small"]});
    }
    > div > select:last-child {
        width: 100%;
    }
`

const FilterFunctionAreaDiv = styled.div<{ $mode: "buttons" | "input-and-buttons" }>`
    margin-top: ${SPACINGS[1]};
    display: flex;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    ${p => p.$mode === "input-and-buttons" ? css`
        > input {
            width: 100%;
        }
        > button {
            flex: 0 0 auto;
        }
    ` : css`
        > button {
            width: 100%;
        }
    `}
`

const StoredQueryListDiv = styled.div`
    height: 100%;
    overflow-y: auto;
`

const StyledQueryItemButton = styled(Button)`
    width: 100%;
    text-align: left;
    &:not(:first-child) {
        margin-top: ${SPACINGS[1]};
    }
`
