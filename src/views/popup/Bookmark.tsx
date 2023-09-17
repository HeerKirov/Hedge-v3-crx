import { useState, useMemo, useCallback, memo } from "react"
import { styled, css } from "styled-components"
import {
    Button, DateInput, Description, DynamicInputList, FormattedText, GroupPicker, GroupTag, Icon,
    Input, KeywordList, Label, LayouttedDiv, PopupMenu, PopupMenuItem, Separator, Starlight
} from "@/components"
import { BookmarkModel, GroupModel, Page } from "@/functions/database"
import { BookmarkForm, PageForm } from "@/services/bookmarks"
import { useTabBookmarkState } from "@/hooks/active-tab"
import { useGroupList } from "@/hooks/bookmarks"
import { useBookmarkFormUpdater, usePageFormUpdater } from "@/utils/business"
import { objects } from "@/utils/primitives"
import { SPACINGS } from "@/styles"

export function BookmarkNotice() {
    const { groupList } = useGroupList()
    const { bookmarkState, updateBookmark, updatePage } = useTabBookmarkState()

    const allGroups = useMemo(() => groupList ?? [], [groupList])

    if(bookmarkState?.state === "BOOKMARKED") {
        return <RootDiv>
            <BookmarkFragment bookmark={bookmarkState.bookmark} allGroups={allGroups} updateBookmark={updateBookmark}/>
            <PageFragment page={bookmarkState.page} allGroups={allGroups} updatePage={updatePage}/>
        </RootDiv>
    }else if(bookmarkState?.state === "NOT_BOOKMARKED") {
        return "not bookmarked"
    }else{
        return undefined
    }
}

const BookmarkFragment = memo(function ({ bookmark, allGroups, updateBookmark }: { bookmark: BookmarkModel, allGroups: GroupModel[], updateBookmark(bookmark: BookmarkForm): void }) {
    const [bookmarkMode, setBookmarkMode] = useState<"display" | "edit" | "change">("display")

    const setEditMode = useCallback(() => setBookmarkMode("edit"), [])
    const setChangeMode = useCallback(() => setBookmarkMode("change"), [])
    const setDisplayMode = useCallback(() => setBookmarkMode("display"), [])

    const displayMenuItems: PopupMenuItem[] = [
        {type: "normal", label: "编辑书签信息", click: setEditMode},
        {type: "normal", label: "更改所属", click: () => setChangeMode},
        {type: "separator"},
        {type: "normal", label: "删除书签与所有页面", backgroundColor: "danger"}
    ]

    return bookmarkMode === "display" ? <PopupMenu items={displayMenuItems} children={popup => (
        <BookmarkDisplay bookmark={bookmark} allGroups={allGroups} onContextMenu={popup} onDoubleClick={setEditMode} onDoubleClickHeader={setChangeMode}/>
    )}/> : bookmarkMode === "edit" ? (
        <BookmarkEditor bookmark={bookmark} allGroups={allGroups} updateBookmark={updateBookmark} onClose={setDisplayMode}/>
    ) : (
        <BookmarkChange bookmark={bookmark} allGroups={allGroups}/>
    )
})

const PageFragment = memo(function ({ page, allGroups, updatePage }: { page: Page, allGroups: GroupModel[], updatePage(page: PageForm): void }) {
    const [pageMode, setPageMode] = useState<"display" | "edit">("display")

    const setEditMode = useCallback(() => setPageMode("edit"), [])
    const setDisplayMode = useCallback(() => setPageMode("display"), [])

    const displayMenuItems: PopupMenuItem[] = [
        {type: "normal", label: "编辑页面信息", click: setEditMode},
        {type: "separator"},
        {type: "normal", label: "将页面从书签移除", backgroundColor: "danger"}
    ]

    return pageMode === "display" ? <PopupMenu items={displayMenuItems} children={popup => (
        <PageDisplay page={page} allGroups={allGroups} onContextMenu={popup} onDoubleClick={setEditMode}/>
    )}/> : (
        <PageEditor page={page} allGroups={allGroups} updatePage={updatePage} onClose={setDisplayMode}/>
    )
})

const BookmarkDisplay = memo(function ({ bookmark, allGroups, onContextMenu, onDoubleClick, onDoubleClickHeader }: { bookmark: BookmarkModel, allGroups: GroupModel[], onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void, onDoubleClickHeader?(): void }) {
    return <>
        <BookmarkDisplayHeader bookmark={bookmark} onContextMenu={onContextMenu} onDoubleClick={onDoubleClickHeader}/>
        <BookmarkDisplayBody bookmark={bookmark} allGroups={allGroups} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
    </>
})

const BookmarkEditor = memo(function ({ bookmark, allGroups, updateBookmark, onClose }: { bookmark: BookmarkModel, allGroups: GroupModel[], updateBookmark(bookmark: BookmarkForm): void, onClose(): void }) {
    const { setName, setOtherNames, setGroups, setKeywords, setDescription, setScore } = useBookmarkFormUpdater(bookmark, updateBookmark)

    const setNames = ([name, ...otherNames]: string[]) => {
        if(name && name !== bookmark.name) setName(name)
        else if(!objects.deepEquals(otherNames, bookmark.otherNames)) setOtherNames(otherNames)
    }

    return <>
        <Separator spacing={[0, 1]}/>
        <TitleDiv>
            <Label>编辑书签</Label>
            <DynamicInputList mode="start" size="small" placeholder="新别名" values={[bookmark.name, ...bookmark.otherNames]} onUpdateValues={setNames}/>
        </TitleDiv>
        <Separator spacing={1}/>
        <LayouttedDiv margin={1}>
            <GroupPicker mode="bookmark" groups={bookmark.groups} allGroups={allGroups} onUpdateGroups={setGroups}/>
            <LayouttedDiv position="relative" mt={1} mb={1}>
                <KeywordList editable keywords={bookmark.keywords} onUpdateKeywords={setKeywords}/>
                <ScoreEditDiv><Starlight score={bookmark.score} onUpdateScore={setScore}/></ScoreEditDiv>
            </LayouttedDiv>
            <Input width="100%" size="small" type="textarea" rows={2} minHeight="2em" maxHeight="8em" value={bookmark.description} onUpdateValue={setDescription}/>
        </LayouttedDiv>
        <LayouttedDiv margin={[1, 1, 0, 1]}>
            <Button size="small" mode="filled" type="primary" width="100%" onClick={onClose}><Icon icon="close" mr={2}/>完成</Button>
        </LayouttedDiv>
    </>
})

const BookmarkChange = memo(function ({ bookmark, allGroups }: { bookmark: BookmarkModel, allGroups: GroupModel[] }) {
    return <>
        <BookmarkChangeHeader bookmark={bookmark}/>
        <BookmarkDisplayBody bookmark={bookmark} allGroups={allGroups}/>
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
    return <>
        <Separator spacing={1} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <LayouttedDiv margin={1} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <MetaDiv $lastIsScore={bookmark.score !== undefined}>
                {bookmark.groups.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} bold colored allGroups={allGroups}/>)}
                {bookmark.keywords.map(k => <FormattedText size="small" color="secondary" whiteSpace="nowrap">[{k}]</FormattedText>)}
                {bookmark.score !== undefined && <div><Starlight score={bookmark.score}/></div>}
            </MetaDiv>
            {!!bookmark.description && <Description mt={1} value={bookmark.description}/>}
        </LayouttedDiv>
    </>
})

const BookmarkChangeHeader = memo(function (props: { bookmark: BookmarkModel }) {
    return <>
        <Separator spacing={[0, 1]}/>
        <TitleDiv>
            <Label>选择书签</Label>
            <Input size="small"/>
        </TitleDiv>
    </>
})

const PageDisplay = memo(function ({ page, allGroups, onContextMenu, onDoubleClick }: { page: Page, allGroups: GroupModel[], onContextMenu?(e: React.MouseEvent): void, onDoubleClick?(): void }) {
    return <>
        <Separator spacing={[3, 1]} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <TitleDiv onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <Label>当前页面</Label>
            <p>{page.title}</p>
        </TitleDiv>
        <Separator spacing={1} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}/>
        <LayouttedDiv margin={1} onContextMenu={onContextMenu} onDoubleClick={onDoubleClick}>
            <MetaDiv>
                {page.groups?.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} bold colored allGroups={allGroups}/>)}
                {page.keywords?.map(k => <FormattedText size="small" color="secondary" whiteSpace="nowrap">[{k}]</FormattedText>)}
            </MetaDiv>
            {!!page.description && <Description mt={1} value={page.description}/>}
            <LastCollectNotice lastCollect={page.lastCollect} lastCollectTime={page.lastCollectTime}/>
        </LayouttedDiv>
    </>
})

const PageEditor = memo(function ({ page, allGroups, updatePage, onClose }: { page: Page, allGroups: GroupModel[], updatePage(page: PageForm): void, onClose(): void }) {
    const { setTitle, setKeywords, setDescription, setGroups, setLastCollectTime, setLastCollect } = usePageFormUpdater(page, updatePage)

    return <>
        <Separator spacing={[3, 1]}/>
        <TitleDiv>
            <Label>编辑页面</Label>
            <Input width="100%" size="small" value={page.title} onUpdateValue={setTitle}/>
        </TitleDiv>
        <Separator spacing={1}/>
        <LayouttedDiv margin={1}>
            <GroupPicker mode="page" groups={page.groups} allGroups={allGroups} onUpdateGroups={setGroups}/>
            <LayouttedDiv mt={1} mb={1}>
                <KeywordList editable keywords={page.keywords} onUpdateKeywords={setKeywords}/>
            </LayouttedDiv>
            <Input width="100%" size="small" type="textarea" rows={2} minHeight="2em" maxHeight="8em" value={page.description} onUpdateValue={setDescription}/>
            <LastCollectEditNotice lastCollect={page.lastCollect} lastCollectTime={page.lastCollectTime} onUpdateLastCollect={setLastCollect} onUpdateLastCollectTime={setLastCollectTime}/>
        </LayouttedDiv>
        <LayouttedDiv margin={[1, 1, 0, 1]}>
            <Button size="small" mode="filled" type="primary" width="100%" onClick={onClose}><Icon icon="close" mr={2}/>完成</Button>
        </LayouttedDiv>
    </>
})

const LastCollectNotice = memo(function (props: {lastCollectTime: Date | undefined, lastCollect: string | undefined}) {
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
        <LastCollectCopyButton size="small" square type={copied ? "secondary" : "primary"} onClick={copy}><Icon icon="copy"/></LastCollectCopyButton>
    </LayouttedDiv>
})

const LastCollectEditNotice = memo(function (props: {lastCollectTime: Date | undefined, lastCollect: string | undefined, onUpdateLastCollectTime?(v: Date | undefined): void, onUpdateLastCollect?(v: string): void}) {
    return <LayouttedDiv border display="flex" radius="std" lineHeight="small" mt={1} padding={[0, 0, 0, 1]}>
        <FormattedText bold mr={1}>UpTo</FormattedText>
        <Input width="75%" size="small" value={props.lastCollect} onUpdateValue={props.onUpdateLastCollect}/>
        <FormattedText bold mr={1} ml={1}>/</FormattedText>
        <DateInput width="75%" size="small" value={props.lastCollectTime} onUpdateValue={props.onUpdateLastCollectTime}/>
    </LayouttedDiv>
})

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
