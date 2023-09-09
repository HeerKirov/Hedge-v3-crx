import { memo } from "react"
import { styled, css } from "styled-components"
import { mix } from "polished"
import { FormattedText, GroupTag, Starlight } from "@/components/universal"
import { BookmarkModel, GroupModel, Page } from "@/functions/database/model"
import { DARK_MODE_COLORS, ELEMENT_HEIGHTS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"

export function BookmarkList(props: { bookmarkList: BookmarkModel[], allGroups: GroupModel[], selectedIndex: [number, number | null] | null, onUpdateSelectedIndex?(idx: [number, number | null]): void }) {
    const updateSelectedIndex = (index: number, pageIndex: number | null) => {
        if(props.selectedIndex === null || props.selectedIndex[0] !== index || props.selectedIndex[1] !== pageIndex) {
            props.onUpdateSelectedIndex?.([index, pageIndex])
        }
    }

    return <RootDiv>
        {props.bookmarkList.map((bookmark, index) => <BookmarkItem 
            key={bookmark.bookmarkId} item={bookmark} allGroups={props.allGroups}
            selected={props.selectedIndex !== null && props.selectedIndex[0] === index} 
            selectedPageIndex={props.selectedIndex !== null && props.selectedIndex[0] === index ? props.selectedIndex[1] : null}
            onSelected={p => updateSelectedIndex(index, p)}
        />)}
    </RootDiv>
}

const BookmarkItem = memo(function (props: { item: BookmarkModel, selected: boolean, selectedPageIndex: number | null, onSelected(pageIndex: number | null): void, allGroups: GroupModel[] }) {
    const selected = props.selected && props.selectedPageIndex === null

    const description = props.item.description.split("\n", 1)[0]

    return <>
        <BookmarkRow $selected={selected} onClick={() => props.onSelected(null)}>
            <Col $width="25%" $overflow="ellipsis">
                {props.item.name}
                {props.item.otherNames.length > 0 && <FormattedText color="secondary">{props.item.otherNames.map(n => ` / ${n}`)}</FormattedText>}
            </Col>
            <Col $width="50%" $overflow="ellipsis">
                {props.item.groups.map(group => <GroupTag key={`${group[0]}-${group[1]}`} item={group} allGroups={props.allGroups} colored={!selected} bold/>)}
                {props.item.keywords.map(keyword => `[${keyword}]`)}
                {description}
            </Col>
            <Col $shrink={0}>
                <Starlight colorMode={selected ? "inherit" : "std"} score={props.item.score}/>
            </Col>
            <Col $width="5em" $shrink={0}>
                {props.item.lastCollectTime?.toLocaleDateString()}
            </Col>
            <Col $width="5em" $shrink={0}>
                {props.item.updateTime.toLocaleDateString()}
            </Col>
        </BookmarkRow>
        {props.item.pages.map((page, index) => <PageItem key={page.pageId} item={page} selected={props.selected && props.selectedPageIndex === index} onSelected={() => props.onSelected(index)} allGroups={props.allGroups}/>)}
    </>
})

const PageItem = memo(function (props: { item: Page, selected: boolean, onSelected(): void, allGroups: GroupModel[] }) {
    const description = props.item.description?.split("\n", 1)[0]

    return <PageRow $selected={props.selected} onClick={props.onSelected}>
        <Col $width="50%" $overflow="ellipsis">
            {props.item.title}
            <FormattedText color="secondary"> ({props.item.url})</FormattedText>
        </Col>
        <Col $width="50%" $overflow="ellipsis">
            {props.item.groups?.map(group => <GroupTag key={`${group[0]}-${group[1]}`} item={group} allGroups={props.allGroups} colored={!props.selected} bold/>)}
            {props.item.keywords?.map(keyword => `[${keyword}]`)}
            {description}
        </Col>
        <Col $width="5em" $shrink={0}>
            {props.item.lastCollect !== undefined && <pre><code>{props.item.lastCollect}</code></pre>}
        </Col>
        <Col $width="5em" $shrink={0}>
            {props.item.lastCollectTime?.toLocaleDateString()}
        </Col>
        <Col $width="5em" $shrink={0}>
            {props.item.updateTime.toLocaleDateString()}
        </Col>
    </PageRow>
})

const RootDiv = styled.div`
    width: 100%;
    user-select: none;
    display: flex;
    flex-wrap: wrap;
`

const BookmarkRow = styled.div<{ $selected: boolean }>`
    width: 100%;
    line-height: ${ELEMENT_HEIGHTS["tiny"]};
    display: flex;
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
`

const PageRow = styled.div<{ $selected: boolean }>`
    width: 100%;
    line-height: ${ELEMENT_HEIGHTS["tiny"]};
    display: flex;
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
`

const Col = styled.div<{ $width?: string, $grow?: number, $shrink?: number, $overflow?: "hidden" | "ellipsis" }>`
    white-space: nowrap;
    ${p => (p.$overflow === "hidden" || p.$overflow === "ellipsis") && css` overflow: hidden; `}
    ${p => (p.$overflow === "ellipsis") && css` text-overflow: ellipsis; `}
    ${p => p.$width !== undefined && css` width: ${p.$width}; `}
    ${p => p.$grow !== undefined && css` flex-grow: ${p.$grow}; `}
    ${p => p.$shrink !== undefined && css` flex-shrink: ${p.$shrink}; `}
`