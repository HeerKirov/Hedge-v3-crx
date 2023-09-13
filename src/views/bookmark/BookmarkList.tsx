import React, { memo, useState } from "react"
import { styled, css } from "styled-components"
import { mix } from "polished"
import { FormattedText, GroupTag, Icon, PopupMenu, PopupMenuItem, Starlight } from "@/components"
import { BookmarkModel, GroupModel, Page } from "@/functions/database"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"
import { useWatch } from "@/utils/reactivity"

interface BookmarkListProps { 
    bookmarkList: BookmarkModel[]
    allGroups: GroupModel[]
    selectedIndex: [number, number | null] | null
    creatingIndex: [number, number | null] | null
    onUpdateSelectedIndex?(idx: [number, number | null] | null): void
    onUpdateCreatingIndex?(idx: [number, number | null]): void
    onDeleteBookmark?(index: number): void
    onDeletePage?(index: number, pageIndex: number): void
    onMovePage?(index: number, pageIndex: number, moveToIndex: number, moveToPageIndex: number | null): void
}

interface BookmarkListUnitProps {
    item: BookmarkModel
    selected: boolean
    allGroups: GroupModel[]
    selectedPageIndex: number | null
    creatingPageIndex: number | null
    clipboardPageIndex: number | null
    clipboardEnabled: boolean
    onUpdateSelectedIndex(pageIndex: number | null): void
    onUpdateCreatingIndex(pageIndex: number): void
    onUpdateClipboardIndex(pageIndex: number): void
    onPasteClipboard(pageIndex: number | null): void
    onMovePage(pageIndex: number, moveToPageIndex: number): void
    onDeleteBookmark(): void
    onDeletePage(pageIndex: number): void
}

interface BookmarkItemProps {
    item: BookmarkModel
    selected: boolean
    expanded: boolean
    allGroups: GroupModel[]
    clipboardEnabled: boolean
    onSelected(): void
    onCreating(index: number): void
    onUpdateExpanded(v: boolean): void
    onPaste(): void
    onDelete(): void
}

interface PageItemProps { 
    item: Page
    index: number
    count: number
    allGroups: GroupModel[]
    selected: boolean
    clipboarded: boolean
    clipboardEnabled: boolean
    onSelected(index: number): void
    onCreating(index: number): void
    onClip(index: number): void
    onPaste(index: number): void
    onMovePage(pageIndex: number, moveToIndex: number): void
    onDelete(index: number): void
}

export function BookmarkList(props: BookmarkListProps) {
    const [pageClipboardIndex, setPageClipboardIndex] = useState<[number, number] | null>(null)

    const updateSelectedIndex = (index: number, pageIndex: number | null) => {
        if(props.selectedIndex === null || props.selectedIndex[0] !== index || props.selectedIndex[1] !== pageIndex) {
            props.onUpdateSelectedIndex?.([index, pageIndex])
        }
    }

    const updateCreatingIndex = (index: number, pageIndex: number | null) => {
        if(props.creatingIndex === null || props.creatingIndex[0] !== index || props.creatingIndex[1] !== pageIndex) {
            props.onUpdateCreatingIndex?.([index, pageIndex])
        }
    }

    const movePage = (index: number, pageIndex: number, moveToPageIndex: number) => {
        props.onMovePage?.(index, pageIndex, index, moveToPageIndex)
    }

    const setClipboard = (index: number, pageIndex: number) => {
        setPageClipboardIndex([index, pageIndex])
        if(props.selectedIndex !== null && props.selectedIndex[0] === index && props.selectedIndex[1] === pageIndex) {
            props.onUpdateSelectedIndex?.(null)
        }
    }

    const pasteClipboard = (index: number, pageIndex: number | null) => {
        if(pageClipboardIndex !== null) {
            props.onMovePage?.(pageClipboardIndex[0], pageClipboardIndex[1], index, pageIndex)
            setPageClipboardIndex(null)
        }
    }

    return <RootDiv>
        {props.bookmarkList.map((bookmark, index) => <BookmarkListUnit 
            key={bookmark.bookmarkId} item={bookmark} allGroups={props.allGroups}
            selected={props.selectedIndex !== null && props.selectedIndex[0] === index} 
            selectedPageIndex={props.selectedIndex !== null && props.selectedIndex[0] === index ? props.selectedIndex[1] : null}
            creatingPageIndex={props.creatingIndex !== null && props.creatingIndex[0] === index ? props.creatingIndex[1] : null}
            clipboardPageIndex={pageClipboardIndex !== null && pageClipboardIndex[0] === index ? pageClipboardIndex[1] : null}
            clipboardEnabled={pageClipboardIndex !== null}
            onUpdateSelectedIndex={p => updateSelectedIndex(index, p)}
            onUpdateCreatingIndex={p => updateCreatingIndex(index, p)}
            onUpdateClipboardIndex={p => setClipboard(index, p)}
            onPasteClipboard={p => pasteClipboard(index, p)}
            onMovePage={(p, t) => movePage(index, p, t)}
            onDeleteBookmark={() => props.onDeleteBookmark?.(index)}
            onDeletePage={p => props.onDeletePage?.(index, p)}
        />)}
        {props.creatingIndex !== null && props.creatingIndex[0] >= props.bookmarkList.length && <BookmarkCreateItem/>}
    </RootDiv>
}

const BookmarkListUnit = memo(function (props: BookmarkListUnitProps) {
    const [expanded, setExpanded] = useState(true)

    useWatch(() => {
        if(props.creatingPageIndex !== null && !expanded) {
            setExpanded(true)
        }
    }, [props.creatingPageIndex])

    return <>
        <BookmarkItem 
            item={props.item} allGroups={props.allGroups}
            selected={props.selected && props.selectedPageIndex === null} 
            expanded={expanded}
            clipboardEnabled={props.clipboardEnabled}
            onUpdateExpanded={setExpanded}
            onSelected={() => props.onUpdateSelectedIndex(null)} 
            onCreating={props.onUpdateCreatingIndex} 
            onPaste={() => props.onPasteClipboard(null)}
            onDelete={props.onDeleteBookmark}
        />
        {expanded && props.item.pages.flatMap((page, index) => [
            props.creatingPageIndex === index && <PageCreateItem/>,
            <PageItem key={page.pageId} 
                item={page} index={index} count={props.item.pages.length} allGroups={props.allGroups}
                selected={props.selected && props.selectedPageIndex === index} 
                clipboarded={props.clipboardPageIndex === index}
                clipboardEnabled={props.clipboardEnabled}
                onSelected={props.onUpdateSelectedIndex}
                onCreating={props.onUpdateCreatingIndex} 
                onClip={props.onUpdateClipboardIndex}
                onPaste={props.onPasteClipboard}
                onMovePage={props.onMovePage}
                onDelete={props.onDeletePage}
            />
        ])}
        {props.creatingPageIndex !== null && props.creatingPageIndex >= props.item.pages.length && <PageCreateItem/>}
    </>
})

const BookmarkItem = memo(function (props: BookmarkItemProps) {
    const description = props.item.description.split("\n", 1)[0]

    const deleteBookmark = () => {
        if(confirm("确认要删除此书签吗？")) {
            props.onDelete()
        }
    }

    const popupMenu = (): PopupMenuItem[] => [
        {type: "normal", label: "添加页面", click: () => props.onCreating(props.item.pages.length)},
        {type: "separator"},
        {type: "normal", label: `${props.expanded ? "折叠" : "展开"}页面列表`, click: () => props.onUpdateExpanded(!props.expanded)},
        {type: "normal", label: "粘贴", disabled: !props.clipboardEnabled, click: props.onPaste},
        {type: "separator"},
        {type: "normal", label: "删除书签", backgroundColor: "danger", click: deleteBookmark}
    ]

    return <PopupMenu items={popupMenu} children={popup => <BookmarkRow $selected={props.selected} onClick={props.onSelected} onContextMenu={popup}>
        <Col $shrink={0} $width="1em">
            <CaretButton expanded={props.expanded} onUpdateExpanded={props.onUpdateExpanded}/>
        </Col>
        <Col $width="33%" $overflow="ellipsis">
            {props.item.name}
            {props.item.otherNames.length > 0 && <FormattedText color="secondary">{props.item.otherNames.map(n => ` / ${n}`)}</FormattedText>}
        </Col>
        <Col $width="66%" $overflow="ellipsis">
            {props.item.groups.map(group => <GroupTag key={`${group[0]}-${group[1]}`} item={group} allGroups={props.allGroups} colored={!props.selected} bold/>)}
            {props.item.keywords.map(keyword => `[${keyword}]`)}
            {description}
        </Col>
        <Col $shrink={0}>
            <Starlight colorMode={props.selected ? "inherit" : "std"} score={props.item.score}/>
        </Col>
        <Col $width="5.25em" $shrink={0}>
            {props.item.lastCollectTime?.toLocaleDateString()}
        </Col>
        <Col $width="7em" $shrink={0}>
            <Icon icon="calendar-day" mr={1} ml={3}/>
            {props.item.updateTime.toLocaleDateString()}
        </Col>
    </BookmarkRow>}/>
})

const PageItem = memo(function (props: PageItemProps) {
    const description = props.item.description?.split("\n", 1)[0]

    const click = () => props.onSelected(props.index)

    const openURL = () => {
        if(props.item.url) chrome.tabs.create({url: props.item.url}).finally()
    }

    const deletePage = () => {
        if(confirm("确认要删除此页面吗？")) {
            props.onDelete(props.index)
        }
    }

    const popupMenu = (): PopupMenuItem[] => [
        {type: "normal", label: "打开链接", click: openURL},
        {type: "separator"},
        {type: "normal", label: "在下一行添加页面", click: () => props.onCreating(props.index + 1)},
        {type: "separator"},
        {type: "normal", label: "上移一行", disabled: props.index <= 0, click: () => props.onMovePage(props.index, props.index - 1)},
        {type: "normal", label: "下移一行", disabled: props.index >= props.count - 1, click: () => props.onMovePage(props.index, props.index + 1)},
        {type: "normal", label: "剪切", click: () => props.onClip(props.index)},
        {type: "normal", label: "粘贴", disabled: !props.clipboardEnabled, click: () => props.onPaste(props.index)},
        {type: "separator"},
        {type: "normal", label: "删除页面", backgroundColor: "danger", click: deletePage}
    ]

    return <PopupMenu items={popupMenu} children={popup => <PageRow $selected={props.selected} $clipped={props.clipboarded} onClick={click} onDoubleClick={openURL} onContextMenu={popup}>
        <Col $shrink={0}>
            <Icon icon="file"/>
        </Col>
        <Col $width="50%" $overflow="ellipsis">
            {props.item.title}
            <FormattedText color="secondary"> ({props.item.url})</FormattedText>
        </Col>
        <Col $width="50%" $overflow="ellipsis">
            {props.item.groups?.map(group => <GroupTag key={`${group[0]}-${group[1]}`} item={group} allGroups={props.allGroups} colored={!props.selected} bold/>)}
            {props.item.keywords?.map(keyword => `[${keyword}]`)}
            {description}
        </Col>
        <Col $width="8.5em" $shrink={0} $textAlign="right">
            {props.item.lastCollect !== undefined && <>
                <b>UpTo</b>
                <FormattedText monospace ml={1}>{props.item.lastCollect}</FormattedText>
                {props.item.lastCollectTime !== undefined && <FormattedText bold ml={1}>/</FormattedText>}
            </>}
        </Col>
        <Col $width="5.25em" $shrink={0}>
            {props.item.lastCollectTime?.toLocaleDateString()}
        </Col>
        <Col $width="7em" $shrink={0}>
            <Icon icon="calendar-day" mr={1} ml={3}/>
            {props.item.updateTime.toLocaleDateString()}
        </Col>
    </PageRow>}/>
})

const BookmarkCreateItem = memo(function () {
    return <BookmarkRow $selected>
        <i>新书签</i>
    </BookmarkRow>
})

const PageCreateItem = memo(function () {
    return <PageRow $selected $clipped={false}>
        <i>新页面</i>
    </PageRow>
})

const CaretButton = memo(function (props: {expanded: boolean, onUpdateExpanded(v: boolean): void}) {
    const clickCaretButton = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.stopPropagation()
        props.onUpdateExpanded(!props.expanded)
    }

    return <CaretButtonAnchor onClick={clickCaretButton}><Icon icon={props.expanded ? "caret-down" : "caret-right"}/></CaretButtonAnchor>
})

const RootDiv = styled.div`
    width: 100%;
    user-select: none;
    display: flex;
    flex-wrap: wrap;
`

const BookmarkRow = styled.div<{ $selected: boolean }>`
    width: 100%;
    line-height: ${ELEMENT_HEIGHTS["small"]};
    display: flex;
    box-sizing: border-box;
    gap: ${SPACINGS[1]};
    background-color: ${p => p.$selected ? LIGHT_MODE_COLORS["primary"] : LIGHT_MODE_COLORS["background"]};
    color: ${p => p.$selected ? LIGHT_MODE_COLORS["text-inverted"] : LIGHT_MODE_COLORS["text"]};
    &:hover:not([disabled]) {
        background-color: ${p => p.$selected ? mix(0.8, LIGHT_MODE_COLORS["primary"], "#ffffff") : "rgba(45, 50, 55, 0.09)"};
    }
    &:not(:first-child) {
        border-top: solid 1px ${LIGHT_MODE_COLORS["border"]};
    }
    @media (prefers-color-scheme: dark) {
        background-color: ${p => p.$selected ? DARK_MODE_COLORS["primary"] : DARK_MODE_COLORS["background"]};
        color: ${p => p.$selected ? DARK_MODE_COLORS["text-inverted"] : DARK_MODE_COLORS["text"]};
        &:hover:not([disabled]) {
            background-color: ${p => p.$selected ? mix(0.8, DARK_MODE_COLORS["primary"], "#ffffff") : "rgba(45, 50, 55, 0.09)"};
        }
        &:not(:first-child) {
            border-top-color: ${LIGHT_MODE_COLORS["border"]};
        }
    }
`

const PageRow = styled.div<{ $selected: boolean, $clipped: boolean }>`
    width: 100%;
    padding-left: ${SPACINGS[6]};
    line-height: ${ELEMENT_HEIGHTS["small"]};
    display: flex;
    box-sizing: border-box;
    gap: ${SPACINGS[1]};
    background-color: ${p => p.$selected ? LIGHT_MODE_COLORS["primary"] : LIGHT_MODE_COLORS["background"]};
    color: ${p => p.$selected ? LIGHT_MODE_COLORS["text-inverted"] : LIGHT_MODE_COLORS["text"]};
    &:hover:not([disabled]) {
        background-color: ${p => p.$selected ? mix(0.8, LIGHT_MODE_COLORS["primary"], "#ffffff") : "rgba(45, 50, 55, 0.09)"};
    }
    @media (prefers-color-scheme: dark) {
        background-color: ${p => p.$selected ? DARK_MODE_COLORS["primary"] : DARK_MODE_COLORS["background"]};
        color: ${p => p.$selected ? DARK_MODE_COLORS["text-inverted"] : DARK_MODE_COLORS["text"]};
        &:hover:not([disabled]) {
            background-color: ${p => p.$selected ? mix(0.8, DARK_MODE_COLORS["primary"], "#ffffff") : "rgba(45, 50, 55, 0.09)"};
        }
    }
    ${p => p.$clipped && css`opacity: 0.25;`}
`

const Col = styled.div<{ $width?: string, $grow?: number, $shrink?: number, $overflow?: "hidden" | "ellipsis", $textAlign?: "center" | "right" }>`
    white-space: nowrap;
    ${p => p.$textAlign && css` text-align: ${p.$textAlign}; `}
    ${p => (p.$overflow === "hidden" || p.$overflow === "ellipsis") && css` overflow: hidden; `}
    ${p => (p.$overflow === "ellipsis") && css` text-overflow: ellipsis; `}
    ${p => p.$width !== undefined && css` width: ${p.$width}; `}
    ${p => p.$grow !== undefined && css` flex-grow: ${p.$grow}; `}
    ${p => p.$shrink !== undefined && css` flex-shrink: ${p.$shrink}; `}
`

const CaretButtonAnchor = styled.a`
    padding: 0 ${SPACINGS[1]};
`
