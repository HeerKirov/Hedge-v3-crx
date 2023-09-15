import { useState, memo } from "react"
import { styled } from "styled-components"
import { Button, Description, FormattedText, GroupTag, Icon, Label, LayouttedDiv, Separator, Starlight } from "@/components"
import { useTabBookmarkState } from "@/hooks/active-tab"
import { SPACINGS } from "@/styles"
import { useGroupList } from "@/hooks/bookmarks"

export function BookmarkNotice() {
    const { groupList } = useGroupList()
    const { bookmarkState } = useTabBookmarkState()

    return bookmarkState && <RootDiv>
        <TitleDiv>
            <Label>书签</Label>
            <p>
                {bookmarkState.bookmark.name}
                {bookmarkState.bookmark.otherNames.length > 0 && <FormattedText color="secondary">{bookmarkState.bookmark.otherNames.map(n => ` / ${n}`)}</FormattedText>}
            </p>
        </TitleDiv>
        <Separator spacing={1}/>
        <LayouttedDiv>
            <FormattedText float="right"><Starlight score={bookmarkState.bookmark.score}/></FormattedText>
            {bookmarkState.bookmark.groups.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} bold colored allGroups={groupList ?? []}/>)}
            {bookmarkState.bookmark.keywords.map(k => <FormattedText size="small" color="secondary" whiteSpace="nowrap">[{k}]</FormattedText>)}
        </LayouttedDiv>
        {!!bookmarkState.bookmark.description && <Description mt={1} value={bookmarkState.bookmark.description}/>}
        <Separator spacing={1}/>
        <TitleDiv>
            <Label>当前页面</Label>
            <p>{bookmarkState.page.title}</p>
        </TitleDiv>
        <Separator spacing={1}/>
        <LayouttedDiv>
            {bookmarkState.page.groups?.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} bold colored allGroups={groupList ?? []}/>)}
            {bookmarkState.page.keywords?.map(k => <FormattedText size="small" color="secondary" whiteSpace="nowrap">[{k}]</FormattedText>)}
        </LayouttedDiv>
        {!!bookmarkState.page.description && <Description mt={1} value={bookmarkState.page.description}/>}
        <LastCollectNotice lastCollect={bookmarkState.page.lastCollect} lastCollectTime={bookmarkState.page.lastCollectTime}/>
        <ActionButtonDiv>
            <Button size="small" type="primary"><Icon icon="save" mr={2}/>保存更改</Button>
            <Button size="small" type="danger" square><Icon icon="trash"/></Button>
        </ActionButtonDiv>
    </RootDiv>
}

const LastCollectNotice = memo(function (props: {lastCollectTime: Date | undefined, lastCollect: string | undefined}) {
    const [copied, setCopied] = useState(false)

    const copy = () => {
        if(props.lastCollect !== undefined) {
            navigator.clipboard.writeText(props.lastCollect).then(() => setCopied(true))
        }
    }

    return <LayouttedDiv border radius="std" textAlign="center" lineHeight="small" mt={2}>
        <FormattedText bold mr={1}>UpTo</FormattedText>
        <FormattedText userSelect="text">{props.lastCollect}</FormattedText>
        <FormattedText bold mr={1} ml={1}>/</FormattedText>
        {props.lastCollectTime?.toLocaleDateString()}
        <LastCollectCopyButton size="small" square type={copied ? "secondary" : "primary"} onClick={copy}><Icon icon="copy"/></LastCollectCopyButton>
    </LayouttedDiv>
})

const RootDiv = styled.div`
    padding: ${SPACINGS[1]} ${SPACINGS[2]} ${SPACINGS[2]} ${SPACINGS[2]};
`

const LastCollectCopyButton = styled(Button)`
    float: right;
`

const TitleDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    justify-content: space-between;
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

const ActionButtonDiv = styled.div`
    margin-top: ${SPACINGS[2]};
    display: flex;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
    > button:first-child {
        width: 100%;
    }
    > button:last-child {
        flex-shrink: 0;
    }
`
