import React, { useState, useMemo, useCallback, memo, ReactNode, useRef } from "react"
import { styled, css } from "styled-components"
import {
    Button, DateInput, Description, DynamicInputList, FormattedText, GroupPicker, GroupTag, Icon,
    Input, KeywordList, Label, LayouttedDiv, PopupMenu, PopupMenuItem, SearchList, Separator, Starlight
} from "@/components"
import { BookmarkModel, GroupModel, Page } from "@/functions/database"
import { BookmarkForm, bookmarks, PageForm } from "@/services/bookmarks"
import { getSuggestedBookmarkNameByTab, useTabBookmarkState } from "@/hooks/active-tab"
import { useGroupList } from "@/hooks/bookmarks"
import { useBookmarkFormUpdater, usePageFormUpdater } from "@/utils/business"
import { useChromeExtensionShortcut, useShortcut } from "@/utils/sensors"
import { useAsyncLoading } from "@/utils/reactivity"
import { objects } from "@/utils/primitives"
import { SPACINGS } from "@/styles"

export function BookmarkNotice() {
    const { groupList } = useGroupList()
    const { bookmarkState, updateBookmark, updatePage, addPage, changeBookmarkOfPage, deleteBookmark, deletePage } = useTabBookmarkState()

    const allGroups = useMemo(() => groupList ?? [], [groupList])

    if(bookmarkState?.state === "BOOKMARKED") {
        return <RootDiv>
            <BookmarkFragment bookmark={bookmarkState.bookmark} allGroups={allGroups} newAdded={bookmarkState.newAddedBookmark} updateBookmark={updateBookmark} changeBookmark={changeBookmarkOfPage} deleteBookmark={deleteBookmark}/>
            <PageFragment page={bookmarkState.page} allGroups={allGroups} newAdded={bookmarkState.newAddedPage} updatePage={updatePage} deletePage={deletePage}/>
        </RootDiv>
    }else if(bookmarkState?.state === "NOT_BOOKMARKED") {
        return <RootDiv>
            <CreateFragment tabId={bookmarkState.tabId} addPage={addPage}/>
        </RootDiv>
    }else{
        return undefined
    }
}

const CreateFragment = memo(function ({ tabId, addPage } : { tabId: number, addPage(bookmark: string | number): void }) {
    const once = useRef(true)
    const inputRef = useRef<HTMLElement | null>(null)

    const [suggestedName] = useAsyncLoading(async () => (await getSuggestedBookmarkNameByTab(tabId)) ?? "")

    const onUpdateValue = (value: BookmarkSearchListItem, searchText: string) => {
        if(once.current) {
            once.current = false
            if(value.type === "action") {
                addPage(searchText)
            }else{
                addPage(value.bookmarkId)
            }
        }
    }

    const shortcut = useCallback((e: KeyboardEvent) => {
        if(inputRef.current && document.activeElement !== inputRef.current) inputRef.current.focus()
        e.preventDefault()
    }, [])

    useChromeExtensionShortcut("_execute_action", shortcut)

    useShortcut("Enter", shortcut)

    return <>
        <Separator spacing={[0, 1]}/>
        <TitleDiv>
            <Label>书签</Label>
            <p>未保存书签</p>
        </TitleDiv>
        <Separator spacing={1}/>
        <LayouttedDiv size="small" mb={1}>
            选择书签以开始保存
        </LayouttedDiv>
        {suggestedName !== null && <SearchList ref={inputRef}
            width="100%" size="small" mode="inline" placeholder="搜索书签"
            initialText={suggestedName}
            onUpdateValue={onUpdateValue}
            query={bookmarkSearchQuery}
            keyOf={bookmarkSearchKeyOf}
            labelOf={bookmarkSearchLabelOf}
            children={bookmarkSearchChildren}
        />}
    </>
})

const BookmarkFragment = memo(function ({ bookmark, allGroups, newAdded, updateBookmark, changeBookmark, deleteBookmark }: { bookmark: BookmarkModel, allGroups: GroupModel[], newAdded?: boolean, updateBookmark(bookmark: BookmarkForm): void, changeBookmark(b: number | string): void, deleteBookmark(): void }) {
    const [bookmarkMode, setBookmarkMode] = useState<"display" | "edit" | "change" | "delete">(newAdded ? "edit" : "display")

    const setEditMode = useCallback(() => setBookmarkMode("edit"), [])
    const setChangeMode = useCallback(() => setBookmarkMode("change"), [])
    const setDisplayMode = useCallback(() => setBookmarkMode("display"), [])
    const setDeleteMode = useCallback(() => setBookmarkMode("delete"), [])

    const displayMenuItems: PopupMenuItem[] = [
        bookmarkMode === "edit" ? {type: "normal", label: "结束编辑", click: setDisplayMode} : {type: "normal", label: "编辑书签信息", click: setEditMode},
        bookmarkMode === "change" ? {type: "normal", label: "取消更改", click: setDisplayMode} : {type: "normal", label: "更改所属", click: setChangeMode},
        {type: "separator"},
        {type: "normal", label: "删除书签与所有页面", backgroundColor: "danger", click: setDeleteMode}
    ]

    return <PopupMenu items={displayMenuItems} children={popup => bookmarkMode === "display" ? (
        <BookmarkDisplay bookmark={bookmark} allGroups={allGroups} onContextMenu={popup} onDoubleClick={setEditMode} onDoubleClickHeader={setChangeMode}/>
    ) : bookmarkMode === "edit" ? (
        <BookmarkEditor bookmark={bookmark} allGroups={allGroups} onContextMenu={popup} updateBookmark={updateBookmark} onClose={setDisplayMode}/>
    ) : bookmarkMode === "change" ? (
        <BookmarkChange bookmark={bookmark} allGroups={allGroups} onContextMenu={popup} changeBookmark={changeBookmark} onClose={setDisplayMode}/>
    ) : (
        <DeleteConfirm type="bookmark" onDelete={deleteBookmark} onCancel={setDisplayMode}><BookmarkDisplayHeader bookmark={bookmark}/></DeleteConfirm>
    )}/>
})

const PageFragment = memo(function ({ page, allGroups, newAdded, updatePage, deletePage }: { page: Page, allGroups: GroupModel[], newAdded?: boolean, updatePage(page: PageForm): void, deletePage(): void }) {
    const [pageMode, setPageMode] = useState<"display" | "edit" | "delete">(newAdded ? "edit" : "display")

    const setEditMode = useCallback(() => setPageMode("edit"), [])
    const setDisplayMode = useCallback(() => setPageMode("display"), [])
    const setDeleteMode = useCallback(() => setPageMode("delete"), [])

    const displayMenuItems: PopupMenuItem[] = [
        pageMode === "display" ? {type: "normal", label: "编辑页面信息", click: setEditMode} : {type: "normal", label: "结束编辑", click: setDisplayMode},
        {type: "separator"},
        {type: "normal", label: "将页面从书签移除", backgroundColor: "danger", click: setDeleteMode}
    ]

    return <PopupMenu items={displayMenuItems} children={popup => pageMode === "display" ? (
        <PageDisplay page={page} allGroups={allGroups} onContextMenu={popup} onDoubleClick={setEditMode}/>
    ) : pageMode === "edit" ? (
        <PageEditor page={page} allGroups={allGroups} onContextMenu={popup} updatePage={updatePage} onClose={setDisplayMode}/>
    ) : (
        <DeleteConfirm type="page" onDelete={deletePage} onCancel={setDisplayMode}><PageDisplayHeader page={page}/></DeleteConfirm>
    )}/>
})

const DeleteConfirm = function ({ type, onDelete, onCancel, children }: { type: "bookmark" | "page", onDelete(): void, onCancel(): void, children?: ReactNode }) {
    return <>
        {children}
        <Separator spacing={1}/>
        <LayouttedDiv size="small" textAlign="center" color="danger">
            {type === "bookmark" ? "确认要删除书签吗？书签、当前页面以及书签下的其他页面都会被删除。" : "确认要删除当前页面吗？它将被从书签移除。"}
        </LayouttedDiv>
        <ButtonsDiv>
            <Button size="small" mode="filled" type="danger" width="50%" onClick={onDelete}><Icon icon="trash" mr={2}/>删除</Button>
            <Button size="small" width="50%" onClick={onCancel}><Icon icon="close" mr={2}/>取消</Button>
        </ButtonsDiv>
    </>
}

const BookmarkDisplay = memo(function ({ bookmark, allGroups, onContextMenu, onDoubleClick, onDoubleClickHeader }: { bookmark: BookmarkModel, allGroups: GroupModel[], onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void, onDoubleClickHeader?(): void }) {
    return <>
        <BookmarkDisplayHeader bookmark={bookmark} onContextMenu={onContextMenu} onDoubleClick={onDoubleClickHeader}/>
        <BookmarkDisplayBody bookmark={bookmark} allGroups={allGroups} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
    </>
})

const BookmarkEditor = memo(function ({ bookmark, allGroups, updateBookmark, onClose, onContextMenu }: { bookmark: BookmarkModel, allGroups: GroupModel[], updateBookmark(bookmark: BookmarkForm): void, onClose(): void, onContextMenu?(e: React.MouseEvent): void }) {
    const { setName, setOtherNames, setGroups, setKeywords, setDescription, setScore } = useBookmarkFormUpdater(bookmark, updateBookmark)

    const setNames = ([name, ...otherNames]: string[]) => {
        if(name && name !== bookmark.name) setName(name)
        else if(!objects.deepEquals(otherNames, bookmark.otherNames)) setOtherNames(otherNames)
    }

    return <>
        <Separator spacing={[0, 1]} onContextMenu={onContextMenu}/>
        <TitleDiv onContextMenu={onContextMenu}>
            <Label>编辑书签</Label>
            <DynamicInputList mode="start" size="small" placeholder="新别名" values={[bookmark.name, ...bookmark.otherNames]} onUpdateValues={setNames}/>
        </TitleDiv>
        <Separator spacing={1} onContextMenu={onContextMenu}/>
        <LayouttedDiv margin={1} onContextMenu={onContextMenu}>
            <GroupPicker mode="bookmark" groups={bookmark.groups} allGroups={allGroups} onUpdateGroups={setGroups}/>
            <LayouttedDiv position="relative" mt={1} mb={1}>
                <KeywordList editable keywords={bookmark.keywords} onUpdateKeywords={setKeywords}/>
                <ScoreEditDiv><Starlight score={bookmark.score} onUpdateScore={setScore}/></ScoreEditDiv>
            </LayouttedDiv>
            <Input width="100%" size="small" type="textarea" rows={2} minHeight="2em" maxHeight="8em" value={bookmark.description} onUpdateValue={setDescription}/>
        </LayouttedDiv>
        <LayouttedDiv margin={[1, 1, 0, 1]} onContextMenu={onContextMenu}>
            <Button size="small" mode="filled" type="primary" width="100%" onClick={onClose}><Icon icon="close" mr={2}/>结束编辑</Button>
        </LayouttedDiv>
    </>
})

const BookmarkChange = memo(function ({ bookmark, allGroups, changeBookmark, onClose, onContextMenu }: { bookmark: BookmarkModel, allGroups: GroupModel[], changeBookmark(b: number | string): void, onClose(): void, onContextMenu?(e: React.MouseEvent): void }) {
    const onChange = useCallback((b: string | number) => {
        changeBookmark(b)
        onClose()
    }, [changeBookmark, onClose])

    return <>
        <BookmarkChangeHeader bookmark={bookmark} changeBookmark={onChange} onContextMenu={onContextMenu}/>
        <BookmarkDisplayBody bookmark={bookmark} allGroups={allGroups} onContextMenu={onContextMenu}/>
    </>
})

const BookmarkDisplayHeader = memo(function ({ bookmark, onContextMenu, onDoubleClick }: { bookmark: BookmarkModel, onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void }) {
    return <>
        <Separator spacing={[0, 1]} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <TitleDiv onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <Label>书签</Label>
            <p>
                {bookmark.name}
                {bookmark.otherNames.length > 0 && <FormattedText color="secondary">{bookmark.otherNames.map(n => ` / ${n}`)}</FormattedText>}
            </p>
        </TitleDiv>
    </>
})

const BookmarkDisplayBody = memo(function ({ bookmark, allGroups, onContextMenu, onDoubleClick }: { bookmark: BookmarkModel, allGroups: GroupModel[], onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void }) {
    return (bookmark.score !== undefined || bookmark.groups.length > 0 || bookmark.keywords.length > 0 || bookmark.description) && <>
        <Separator spacing={1} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <LayouttedDiv margin={[2, 1]} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <MetaDiv $lastIsScore={bookmark.score !== undefined}>
                {bookmark.groups.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} bold allGroups={allGroups}/>)}
                {bookmark.keywords.map((k, i) => <FormattedText key={i} size="small" color="secondary" whiteSpace="nowrap">[{k}]</FormattedText>)}
                {bookmark.score !== undefined && <div><Starlight score={bookmark.score}/></div>}
            </MetaDiv>
            {!!bookmark.description && <Description mt={1} value={bookmark.description}/>}
        </LayouttedDiv>
    </>
})

const BookmarkChangeHeader = memo(function ({ bookmark, changeBookmark, onContextMenu }: { bookmark: BookmarkModel, changeBookmark(b: number | string): void, onContextMenu?(e: React.MouseEvent): void }) {
    const once = useRef(true)

    const value = {type: "bookmark", bookmarkId: bookmark.bookmarkId, name: bookmark.name, otherNames: bookmark.otherNames}

    const onUpdateValue = (value: BookmarkSearchListItem, searchText: string) => {
        if(once.current) {
            once.current = false
            if(value.type === "action") {
                changeBookmark(searchText)
            }else{
                changeBookmark(value.bookmarkId)
            }
        }
    }

    return <>
        <Separator spacing={[0, 1]} onContextMenu={onContextMenu}/>
        <TitleDiv onContextMenu={onContextMenu}>
            <Label>选择书签</Label>
            <SearchList size="small" autoFocus placeholder="搜索书签"
                        value={value} onUpdateValue={onUpdateValue}
                        query={bookmarkSearchQuery}
                        keyOf={bookmarkSearchKeyOf}
                        labelOf={bookmarkSearchLabelOf}
                        children={bookmarkSearchChildren}/>
        </TitleDiv>
    </>
})

const PageDisplay = memo(function ({ page, allGroups, onContextMenu, onDoubleClick }: { page: Page, allGroups: GroupModel[], onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void }) {
    return <>
        <PageDisplayHeader page={page} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <Separator spacing={1} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <LayouttedDiv margin={[2, 1, 1, 1]} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <MetaDiv>
                {page.groups?.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} bold allGroups={allGroups}/>)}
                {page.keywords?.map((k, i) => <FormattedText key={i} size="small" color="secondary" whiteSpace="nowrap">[{k}]</FormattedText>)}
            </MetaDiv>
            {!!page.description && <Description mt={1} value={page.description}/>}
            <LastCollectDisplay lastCollect={page.lastCollect} lastCollectTime={page.lastCollectTime}/>
        </LayouttedDiv>
    </>
})

const PageEditor = memo(function ({ page, allGroups, updatePage, onClose, onContextMenu }: { page: Page, allGroups: GroupModel[], updatePage(page: PageForm): void, onClose(): void, onContextMenu?(e: React.MouseEvent): void }) {
    const { setTitle, setKeywords, setDescription, setGroups, setLastCollectTime, setLastCollect } = usePageFormUpdater(page, updatePage)

    return <>
        <Separator spacing={[1, 1]} onContextMenu={onContextMenu}/>
        <TitleDiv onContextMenu={onContextMenu}>
            <Label>编辑页面</Label>
            <Input width="100%" size="small" value={page.title} onUpdateValue={setTitle}/>
        </TitleDiv>
        <Separator spacing={1} onContextMenu={onContextMenu}/>
        <LayouttedDiv margin={1} onContextMenu={onContextMenu}>
            <GroupPicker mode="page" groups={page.groups} allGroups={allGroups} onUpdateGroups={setGroups}/>
            <LayouttedDiv mt={1} mb={1}>
                <KeywordList editable keywords={page.keywords} onUpdateKeywords={setKeywords}/>
            </LayouttedDiv>
            <Input width="100%" size="small" type="textarea" rows={2} minHeight="2em" maxHeight="8em" value={page.description} onUpdateValue={setDescription}/>
            <LastCollectEditor lastCollect={page.lastCollect} lastCollectTime={page.lastCollectTime} onUpdateLastCollect={setLastCollect} onUpdateLastCollectTime={setLastCollectTime}/>
        </LayouttedDiv>
        <LayouttedDiv margin={[1, 1, 0, 1]} onContextMenu={onContextMenu}>
            <Button size="small" mode="filled" type="primary" width="100%" onClick={onClose}><Icon icon="close" mr={2}/>结束编辑</Button>
        </LayouttedDiv>
    </>
})

const PageDisplayHeader = memo(function ({ page, onContextMenu, onDoubleClick }: { page: Page, onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void }) {
    return <>
        <Separator spacing={[1, 1]} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <TitleDiv onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <Label>当前页面</Label>
            <p>{page.title}</p>
        </TitleDiv>
    </>
})

const LastCollectDisplay = memo(function (props: {lastCollectTime: Date | undefined, lastCollect: string | undefined}) {
    const [copied, setCopied] = useState(false)

    const copy = () => {
        if(props.lastCollect !== undefined) {
            navigator.clipboard.writeText(props.lastCollect).then(() => setCopied(true))
        }
    }

    return <LayouttedDiv border radius="std" textAlign="center" lineHeight="small" mt={1}>
        <FormattedText bold mr={1}>UpTo</FormattedText>
        <FormattedText userSelect="text">{props.lastCollect}</FormattedText>
        <FormattedText bold mr={1} ml={1}>/</FormattedText>
        {props.lastCollectTime?.toLocaleDateString()}
        {props.lastCollect !== undefined && <LastCollectCopyButton size="small" square type={copied ? "secondary" : "primary"} onClick={copy}><Icon icon="copy"/></LastCollectCopyButton>}
    </LayouttedDiv>
})

const LastCollectEditor = memo(function (props: {lastCollectTime: Date | undefined, lastCollect: string | undefined, onUpdateLastCollectTime?(v: Date | undefined): void, onUpdateLastCollect?(v: string): void}) {
    return <LayouttedDiv border display="flex" radius="std" lineHeight="small" mt={1} padding={[0, 0, 0, 1]}>
        <FormattedText bold mr={1}>UpTo</FormattedText>
        <Input width="75%" size="small" value={props.lastCollect} onUpdateValue={props.onUpdateLastCollect}/>
        <FormattedText bold mr={1} ml={1}>/</FormattedText>
        <DateInput width="75%" size="small" value={props.lastCollectTime} onUpdateValue={props.onUpdateLastCollectTime}/>
    </LayouttedDiv>
})

async function bookmarkSearchQuery(value: string): Promise<BookmarkSearchListItem[]> {
    const res = await bookmarks.queryBookmarks({search: value, limit: 10})
    const items = res.map(b => ({type: "bookmark" as const, bookmarkId: b.bookmarkId, name: b.name, otherNames: b.otherNames}))
    return [...items, {type: "action", action: "create"} as const]
}

function bookmarkSearchKeyOf(item: BookmarkSearchListItem): string {
    return item.type === "bookmark" ? `bookmark-${item.bookmarkId}` : item.action
}

function bookmarkSearchLabelOf(item: BookmarkSearchListItem): string {
    return item.type === "bookmark" ? item.name : item.action === "create" ? "创建新书签" : ""
}

function bookmarkSearchChildren({ item, selected, text, onClick }: {item: BookmarkSearchListItem, selected: boolean, text: string, onClick(e: React.MouseEvent): void}): ReactNode {
    return <BookmarkSelectItem item={item} selected={selected} text={text} onClick={onClick}/>
}

const BookmarkSelectItem = memo(function ({ item, selected, text, onClick }: {item: BookmarkSearchListItem, selected: boolean, text: string, onClick(e: React.MouseEvent): void}) {
    return <LayouttedDiv lineHeight="tiny" whiteSpace="nowrap" size="small" radius="std" padding={[0, 1]}
                         backgroundColor={selected ? "primary" : "block"} color={selected ? "text-inverted" : "text"}
                         onClick={onClick}>
        {item.type === "bookmark" ? <>
            {item.name}
            {item.otherNames.length > 0 && <FormattedText color="secondary">{item.otherNames.map(n => ` / ${n}`)}</FormattedText>}
        </> : item.action === "create" ? <i>
            创建新书签"{text}"
        </i> : undefined}
    </LayouttedDiv>
})

type BookmarkSearchListItem = {type: "bookmark", bookmarkId: number, name: string, otherNames: string[]} | {type: "action", action: "create"}

const RootDiv = styled.div`
    padding: ${SPACINGS[1]} ${SPACINGS[2]} ${SPACINGS[2]} ${SPACINGS[2]};
`

const ScoreEditDiv = styled.div`
    position: absolute;
    right: 0;
    bottom: 6px;
`

const LastCollectCopyButton = styled(Button)`
    float: right;
`

const TitleDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
    align-items: center;
    > label {
        flex-shrink: 0;
        margin-right: ${SPACINGS[2]};
    }
    > p:last-child {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }
`

const MetaDiv = styled.div<{ $lastIsScore?: boolean }>`
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    line-height: 20px;
  
    ${p => p.$lastIsScore && css`
        > div:last-child {
            margin-left: auto;
        }
    `}
`

const ButtonsDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    margin: ${SPACINGS[1]} ${SPACINGS[1]} 0 ${SPACINGS[1]};
`
