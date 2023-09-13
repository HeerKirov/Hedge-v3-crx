import { memo, useCallback, useRef, useState } from "react"
import { styled } from "styled-components"
import { Input, KeywordList, Label, Starlight, DynamicInputList, GroupPicker, Icon, CollectTimePicker, FormattedText, LayouttedDiv } from "@/components"
import { BookmarkModel, GroupModel } from "@/functions/database"
import { BookmarkForm, PageForm } from "@/services/bookmarks"
import { useBookmarkList } from "@/hooks/bookmarks"
import { ELEMENT_HEIGHTS, FONT_SIZES, SPACINGS } from "@/styles"
import { objects } from "@/utils/primitives"

interface BookmarkDetailProps {
    bookmarkList: BookmarkModel[]
    index: [number, number | null]
    updateBookmark(index: number, bookmark: BookmarkForm): void
    updatePage(index: number, pageIndex: number, page: PageForm): void
    allGroups: GroupModel[]
    errorMessage: Extract<ReturnType<typeof useBookmarkList>["errorMessage"], object> | null
}

interface BookmarkCreationProps {
    bookmarkList: BookmarkModel[]
    index: [number, number | null]
    addBookmark(bookmark: BookmarkForm): void
    addPage(index: number, pageIndex: number, page: PageForm): void
    allGroups: GroupModel[]
    errorMessage: Extract<ReturnType<typeof useBookmarkList>["errorMessage"], object> | null
}

interface BookmarkProps {
    bookmark: BookmarkDto
    updateBookmark(bookmark: BookmarkForm): void
    allGroups: GroupModel[]
}

interface PageProps {
    page: PageDto
    updatePage(page: PageForm): void
    allGroups: GroupModel[]
    errorMessage: Extract<ReturnType<typeof useBookmarkList>["errorMessage"], object> | null
}

interface BookmarkDto {
    name: string
    otherNames: string[]
    description: string
    keywords: string[]
    groups: [string, string][]
    score: number | undefined
    lastCollectTime?: Date | undefined
    createTime?: Date
    updateTime?: Date
}

interface PageDto {
    url: string
    title: string
    description: string | undefined
    keywords: string[] | undefined
    groups: [string, string][] | undefined
    lastCollect: string | undefined
    lastCollectTime: Date | undefined
    createTime?: Date
    updateTime?: Date
}

export const BookmarkDetail = memo(function(props: BookmarkDetailProps) {
    const { index: [index, pageIndex], updatePage, updateBookmark } = props
    const bookmark = props.bookmarkList[index]
    if(bookmark !== undefined) {
        if(pageIndex !== null) {
            const page = bookmark.pages[pageIndex]
            // eslint-disable-next-line react-hooks/rules-of-hooks,react-hooks/exhaustive-deps
            const onUpdatePage = useCallback((page: PageForm) => props.updatePage(index, pageIndex, page), [updatePage, index, pageIndex])

            return page && <BookmarkDetailOfPage page={page} updatePage={onUpdatePage} allGroups={props.allGroups} errorMessage={props.errorMessage}/>
        }else{
            // eslint-disable-next-line react-hooks/rules-of-hooks,react-hooks/exhaustive-deps
            const onUpdateBookmark = useCallback((bookmark: BookmarkForm) => props.updateBookmark(index, bookmark), [updateBookmark, index, null])

            return <BookmarkDetailOfBookmark bookmark={bookmark} updateBookmark={onUpdateBookmark} allGroups={props.allGroups}/>
        }
    }else{
        return undefined
    }
})

export const BookmarkCreation = memo(function(props: BookmarkCreationProps) {
    const [index, pageIndex] = props.index
    if(pageIndex !== null) {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [form, setForm] = useState<PageDto>({url: "", title: "", groups: undefined, keywords: undefined, description: undefined, lastCollect: undefined, lastCollectTime: undefined})
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const once = useRef(true)

        const updatePage = (page: PageForm) => {
            const newForm = {...form, ...page}
            setForm(newForm)
            if(once.current && (page.url || page.title)) {
                once.current = false
                props.addPage(index, pageIndex, newForm)
            }
        }

        return <BookmarkDetailOfPage page={form} updatePage={updatePage} allGroups={props.allGroups} errorMessage={props.errorMessage}/>
    }else{
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const [form, setForm] = useState<BookmarkDto>({name: "", otherNames: [], groups: [], keywords: [], description: "", score: undefined})
        // eslint-disable-next-line react-hooks/rules-of-hooks
        const once = useRef(true)
        
        const updateBookmark = (bookmark: BookmarkForm) => {
            const newForm = {...form, ...bookmark}
            setForm(newForm)
            if(once.current && bookmark.name) {
                once.current = false
                props.addBookmark(newForm)
            }
        }

        return <BookmarkDetailOfBookmark bookmark={form} updateBookmark={updateBookmark} allGroups={props.allGroups}/>
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

    const setName = (name: string) => props.bookmark.name !== name.trim() && props.updateBookmark(generateForm({name: name.trim()}))

    const setOtherNames = (otherNames: string[]) => !objects.deepEquals(props.bookmark.otherNames, otherNames) && props.updateBookmark(generateForm({otherNames}))
    
    const setScore = (score: number | undefined) => props.bookmark.score !== score && props.updateBookmark(generateForm({score}))

    const setKeywords = (keywords: string[]) => !objects.deepEquals(props.bookmark.keywords, keywords) && props.updateBookmark(generateForm({keywords}))

    const setDescription = (description: string) => props.bookmark.description !== description && props.updateBookmark(generateForm({description}))

    const setGroups = (groups: [string, string][]) => !objects.deepEquals(props.bookmark.groups, groups) && props.updateBookmark(generateForm({groups}))

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
            {props.bookmark.lastCollectTime !== undefined && <><Icon icon="record-vinyl" mr={1}/>{props.bookmark.lastCollectTime.toLocaleString()}</>}
            {props.bookmark.updateTime !== undefined && <><Icon icon="calendar-day" mr={1} ml={3}/>{props.bookmark.updateTime.toLocaleString()}</>}
            {props.bookmark.createTime !== undefined && <><Icon icon="calendar-plus" mr={1} ml={3}/>{props.bookmark.createTime.toLocaleString()}</>}
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

    const setGroups = (groups: [string, string][]) => !objects.deepEquals(props.page.groups, groups) && props.updatePage(generateForm({groups: groups.length ? groups : undefined}))

    const setLastCollect = (lastCollect: string) => props.page.lastCollect !== lastCollect.trim() && props.updatePage(generateForm({lastCollect: lastCollect.trim() || undefined}))

    const setLastCollectTime = (lastCollectTime: Date | undefined) => props.page.lastCollectTime?.getTime() !== lastCollectTime?.getTime() && props.updatePage(generateForm({lastCollectTime}))

    return <BookmarkRootDiv>
        <div>
            <Label>页面</Label>
            <Input width="100%" placeholder="页面标题" value={props.page.title} onUpdateValue={setTitle}/>
        </div>
        <div>
            <LayouttedDiv display="flex">
                <Label>URL</Label>
                {props.errorMessage?.error === "URL_ALREADY_EXISTS" && <FormattedText size="small" color="danger" ml={2}>此URL与现有其他页面重复了。</FormattedText>}
            </LayouttedDiv>
            <Input width="100%" placeholder="URL" borderColor={props.errorMessage?.error === "URL_ALREADY_EXISTS" ? "danger" : undefined} value={props.page.url} onUpdateValue={setURL}/>
        </div>
        <ScoreOrLastCollectDiv>
            <Label>UpTo</Label>
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
            <Icon icon="record-vinyl" mr={1}/>
            <CollectTimePicker value={props.page.lastCollectTime} onUpdateValue={setLastCollectTime}/>
            {props.page.updateTime !== undefined && <><Icon icon="calendar-day" mr={1} ml={3}/>{props.page.updateTime.toLocaleString()}</>}
            {props.page.createTime !== undefined && <><Icon icon="calendar-plus" mr={1} ml={3}/>{props.page.createTime.toLocaleString()}</>}
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
