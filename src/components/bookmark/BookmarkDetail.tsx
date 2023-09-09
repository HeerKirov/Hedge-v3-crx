import { memo, useCallback } from "react"
import { styled } from "styled-components"
import { Input, KeywordList, Label, Starlight, DynamicInputList, GroupPicker, Icon, CollectTimePicker } from "@/components/universal"
import { BookmarkModel, GroupModel, Page } from "@/functions/database/model"
import { BookmarkForm, PageForm } from "@/services/bookmarks"
import { ELEMENT_HEIGHTS, FONT_SIZES, SPACINGS } from "@/styles"
import { objects } from "@/utils/primitives"

interface BookmarkDetailProps {
    bookmarkList: BookmarkModel[]
    index: [number, number | null]
    updateBookmark(index: number, bookmark: BookmarkForm): void
    updatePage(index: number, pageIndex: number, page: PageForm): void
    allGroups: GroupModel[]
}

interface BookmarkProps {
    bookmark: BookmarkModel
    updateBookmark(bookmark: BookmarkForm): void
    allGroups: GroupModel[]
}

interface PageProps {
    page: Page
    updatePage(page: PageForm): void
    allGroups: GroupModel[]
}

export const BookmarkDetail = memo(function(props: BookmarkDetailProps) {
    const [index, pageIndex] = props.index
    const bookmark = props.bookmarkList[index]
    if(pageIndex !== null) {
        const page = bookmark.pages[pageIndex]

        const updatePage = useCallback((page: PageForm) => props.updatePage(index, pageIndex, page), [props.updatePage, index, pageIndex])

        return <BookmarkDetailOfPage page={page} updatePage={updatePage} allGroups={props.allGroups}/>
    }else{
        const updateBookmark = useCallback((bookmark: BookmarkForm) => props.updateBookmark(index, bookmark), [props.updateBookmark, index, null])

        return <BookmarkDetailOfBookmark bookmark={bookmark} updateBookmark={updateBookmark} allGroups={props.allGroups}/>
    }
})

const BookmarkDetailOfBookmark = memo(function(props: BookmarkProps) {
    const generateForm = (additional: Partial<BookmarkForm>): BookmarkForm => {
        const form: BookmarkForm = {
            name: props.bookmark.name, 
            otherNames: props.bookmark.otherNames,
            keywords: props.bookmark.keywords,
            description: props.bookmark.description,
            groups: props.bookmark.groups,
            score: props.bookmark.score
        }
        return {...form, ...additional}
    }

    const setName = (name: string) => props.updateBookmark(generateForm({name: name.trim()}))

    const setOtherNames = (otherNames: string[]) => props.updateBookmark(generateForm({otherNames}))
    
    const setScore = (score: number | undefined) => props.updateBookmark(generateForm({score}))

    const setKeywords = (keywords: string[]) => props.updateBookmark(generateForm({keywords}))

    const setDescription = (description: string) => props.updateBookmark(generateForm({description}))

    const setGroups = (groups: [string, string][]) => props.updateBookmark(generateForm({groups}))

    return <BookmarkRootDiv>
        <div>
            <Label>书签</Label>
            <Input width="100%" placeholder="书签名称" value={props.bookmark.name} onUpdateValue={setName}/>
        </div>
        <div>
            <Label>别名</Label>
            <DynamicInputList placeholder="添加一个别名" values={props.bookmark.otherNames} onUpdateValues={setOtherNames}/>
        </div>
        <ScoreOrLastCollectDiv>
            <Label>评价等级</Label>
            <Starlight score={props.bookmark.score} onUpdateScore={setScore} editable/>
        </ScoreOrLastCollectDiv>
        <GroupPickerDiv>
            <GroupPicker mode="bookmark" groups={props.bookmark.groups} onUpdateGroups={setGroups} allGroups={props.allGroups}/>
        </GroupPickerDiv>
        <KeywordsAndDescriptionDiv>
            <KeywordList keywords={props.bookmark.keywords} onUpdateKeywords={setKeywords} editable/>
            <Input type="textarea" placeholder="描述" value={props.bookmark.description} onUpdateValue={setDescription}/>
        </KeywordsAndDescriptionDiv>
        <TimeDiv>
            {props.bookmark.lastCollectTime !== undefined && <><Icon icon="record-vinyl" mr={1} ml={3}/>{props.bookmark.lastCollectTime.toLocaleString()}</>}
            <Icon icon="calendar-day" mr={1} ml={3}/>{props.bookmark.updateTime.toLocaleString()}
            <Icon icon="calendar-plus" mr={1} ml={3}/>{props.bookmark.createTime.toLocaleString()}
        </TimeDiv>
    </BookmarkRootDiv>
})

const BookmarkDetailOfPage = memo(function(props: PageProps) {
    const generateForm = (additional: Partial<PageForm>): PageForm => {
        const form: PageForm = {
            title: props.page.title,
            url: props.page.url,
            keywords: props.page.keywords,
            description: props.page.description,
            groups: props.page.groups,
            lastCollect: props.page.lastCollect,
            lastCollectTime: props.page.lastCollectTime
        }
        return {...form, ...additional}
    }

    const setTitle = (title: string) => props.page.title !== title.trim() && props.updatePage(generateForm({title: title.trim()}))

    const setURL = (url: string) => props.page.url !== url.trim() && props.updatePage(generateForm({url: url.trim()}))

    const setKeywords = (keywords: string[]) => !objects.deepEquals(props.page.keywords, keywords.length > 0 ? keywords : undefined) && props.updatePage(generateForm({keywords: keywords.length > 0 ? keywords : undefined}))

    const setDescription = (description: string) => props.page.description !== (description.length > 0 ? description : undefined) && props.updatePage(generateForm({description: description.length > 0 ? description : undefined}))

    const setGroups = (groups: [string, string][]) => !objects.deepEquals(props.page.groups, groups) && props.updatePage(generateForm({groups}))

    const setLastCollect = (lastCollect: string) => props.page.lastCollect !== lastCollect.trim() && props.updatePage(generateForm({lastCollect: lastCollect.trim()}))

    const setLastCollectTime = (lastCollectTime: Date | undefined) => props.page.lastCollectTime?.getTime() !== lastCollectTime?.getTime() && props.updatePage(generateForm({lastCollectTime}))

    return <BookmarkRootDiv>
        <div>
            <Label>页面</Label>
            <Input width="100%" placeholder="页面标题" value={props.page.title} onUpdateValue={setTitle}/>
        </div>
        <div>
            <Label>URL</Label>
            <Input width="100%" placeholder="URL" value={props.page.url} onUpdateValue={setURL}/>
        </div>
        <ScoreOrLastCollectDiv>
            <Label>上次收集</Label>
            <Input width="55%" size="small" value={props.page.lastCollect} onUpdateValue={setLastCollect}/>
        </ScoreOrLastCollectDiv>
        <GroupPickerDiv>
            <GroupPicker mode="page" groups={props.page.groups} onUpdateGroups={setGroups} allGroups={props.allGroups}/>
        </GroupPickerDiv>
        <KeywordsAndDescriptionDiv>
            <KeywordList keywords={props.page.keywords} onUpdateKeywords={setKeywords} editable/>
            <Input type="textarea" placeholder="描述" value={props.page.description} onUpdateValue={setDescription}/>
        </KeywordsAndDescriptionDiv>
        <TimeDiv>
            <Icon icon="record-vinyl" mr={1} ml={3}/>
            <CollectTimePicker value={props.page.lastCollectTime} onUpdateValue={setLastCollectTime}/>
            <Icon icon="calendar-day" mr={1} ml={3}/>{props.page.updateTime.toLocaleString()}
            <Icon icon="calendar-plus" mr={1} ml={3}/>{props.page.createTime.toLocaleString()}
        </TimeDiv>
    </BookmarkRootDiv>
})

const BookmarkRootDiv = styled.div`
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: ${SPACINGS[2]} ${SPACINGS[2]} ${SPACINGS[1]} ${SPACINGS[2]};
    display: grid;
    grid-gap: ${SPACINGS[1]};
    grid-template-rows: calc(${ELEMENT_HEIGHTS["std"]} + 20px) ${ELEMENT_HEIGHTS["small"]} 1fr ${ELEMENT_HEIGHTS["tiny"]};
    grid-template-columns: 1fr 3fr;
`

const ScoreOrLastCollectDiv = styled.div`
    display: flex;
    flex-wrap: nowrap;
    line-height: ${ELEMENT_HEIGHTS["small"]};
    > label {
        margin-right: ${SPACINGS[2]};
        flex-shrink: 0;
    }
    > :last-child {
        width: 100%;
    }
`

const GroupPickerDiv = styled.div`
    grid-row-start: 3;
    grid-row-end: 5;
`

const KeywordsAndDescriptionDiv = styled.div`
    grid-row-start: 2;
    grid-row-end: 4;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    gap: ${SPACINGS[1]};
`

const TimeDiv = styled.div`
    user-select: none;
    font-size: ${FONT_SIZES["small"]};
    display: flex;
    justify-content: end;
    align-items: center;
`