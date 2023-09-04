import React from "react"
import styled from "styled-components"
import { mix } from "polished"
import { FormattedText } from "@/components/universal"
import { BookmarkModel, Page } from "@/functions/database/model"
import { DARK_MODE_COLORS, LIGHT_MODE_COLORS, SPACINGS } from "@/styles"

export function BookmarkList(props: { bookmarkList: BookmarkModel[], selectedIndex: [number, number | null] | null, onUpdateSelectedIndex?(idx: [number, number | null]): void }) {
    const updateSelectedIndex = (index: number, pageIndex: number | null) => {
        if(props.selectedIndex === null || props.selectedIndex[0] !== index || props.selectedIndex[1] !== pageIndex) {
            props.onUpdateSelectedIndex?.([index, pageIndex])
        }
    }

    return <RootTable>
        <thead>
            <tr>
                <th>标题</th>   
                <th>描述</th> 
                <th>评级</th>
                <th>最后收集</th>
                <th>上次修改</th>
            </tr>
        </thead>
        <tbody>
            {props.bookmarkList.map((bookmark, index) => <MemoBookmarkItem 
                key={bookmark.bookmarkId} item={bookmark} 
                selected={props.selectedIndex !== null && props.selectedIndex[0] === index} 
                selectedPageIndex={props.selectedIndex !== null && props.selectedIndex[0] === index ? props.selectedIndex[1] : null}
                onSelected={p => updateSelectedIndex(index, p)}
            />)}
        </tbody>
    </RootTable>
}

const MemoBookmarkItem = React.memo(BookmarkItem)

function BookmarkItem(props: { item: BookmarkModel, selected: boolean, selectedPageIndex: number | null, onSelected(pageIndex: number | null): void }) {
    return <>
        <StyledItemTr $selected={props.selected && props.selectedPageIndex === null} onClick={() => props.onSelected(null)}>
            <td>
                {props.item.name}
                {props.item.otherNames.length > 0 && <FormattedText color="secondary">{props.item.otherNames.map(n => ` / ${n}`)}</FormattedText>}
            </td>
            <td>
                {props.item.groups.map(([gk, gik]) => `[${gk} ${gik}]`)}
                {props.item.keywords.map(keyword => `[${keyword}]`)}
                {props.item.description}
            </td>
            <td>
                {props.item.score}
            </td>
            <td>
                {props.item.lastCollectTime?.toLocaleDateString()}
            </td>
            <td>
                {props.item.updateTime.toLocaleDateString()}
            </td>
        </StyledItemTr>
        {props.item.pages.map((page, index) => <MemoPageItem key={page.pageId} item={page} selected={props.selected && props.selectedPageIndex === index} onSelected={() => props.onSelected(index)}/>)}
    </>
}

const MemoPageItem = React.memo(PageItem)

function PageItem(props: { item: Page, selected: boolean, onSelected(): void }) {
    return <StyledItemTr $selected={props.selected} onClick={props.onSelected}>
        <td>
            <PageTitleSpan>{props.item.title}</PageTitleSpan>
            <FormattedText color="secondary"> ({props.item.url})</FormattedText>
        </td>
        <td>
            {props.item.groups?.map(([gk, gik]) => `[${gk} ${gik}]`)}
            {props.item.keywords?.map(keyword => `[${keyword}]`)}
            {props.item.description}
        </td>
        <td>

        </td>
        <td>
            {props.item.collectRange?.upToId} ({props.item.collectRange?.upToTime?.toLocaleDateString()})
        </td>
        <td>
            {props.item.updateTime.toLocaleDateString()}
        </td>
    </StyledItemTr>
}

const RootTable = styled.table`
    width: 100%;
    -webkit-user-select: none;
    user-select: none;
    thead > tr > th {
        text-align: left;
    }
`

const StyledItemTr = styled.tr<{ $selected: boolean }>`
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

const PageTitleSpan = styled.span`
    margin-left: ${SPACINGS[8]};
`