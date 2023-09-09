import { memo, useCallback } from "react"
import { styled } from "styled-components"
import { Input, KeywordList, Label, LayouttedDiv, Starlight, DynamicInputList, GroupPicker, FormattedText } from "@/components/universal"
import { BookmarkModel, GroupModel, Page } from "@/functions/database/model"
import { BookmarkForm, PageForm } from "@/services/bookmarks"
import { ELEMENT_HEIGHTS, SPACINGS } from "@/styles"

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
        <BookmarkNameGrid>
            <Label>书签</Label>
            <Input width="100%" placeholder="书签名称" value={props.bookmark.name} onUpdateValue={setName}/>
        </BookmarkNameGrid>
        <BookmarkOtherNamesGrid>
            <Label>别名</Label>
            <DynamicInputList placeholder="添加一个名称" values={props.bookmark.otherNames} onUpdateValues={setOtherNames}/>
        </BookmarkOtherNamesGrid>
        <LayouttedDiv lineHeight="small">
            <FormattedText bold mr={2}>评价等级</FormattedText>
            <Starlight score={props.bookmark.score} onUpdateScore={setScore} editable/>
        </LayouttedDiv>
        <div>
            <KeywordList keywords={props.bookmark.keywords} onUpdateKeywords={setKeywords} editable/>
        </div>
        <div>
            <GroupPicker mode="bookmark" groups={props.bookmark.groups} onUpdateGroups={setGroups} allGroups={props.allGroups}/>
        </div>
        <div>
            <Input type="textarea" placeholder="描述" value={props.bookmark.description} onUpdateValue={setDescription}/>
        </div>
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

    const setTitle = (title: string) => props.updatePage(generateForm({title: title.trim()}))

    const setURL = (url: string) => props.updatePage(generateForm({url: url.trim()}))

    const setKeywords = (keywords: string[]) => props.updatePage(generateForm({keywords: keywords.length > 0 ? keywords : undefined}))

    const setDescription = (description: string) => props.updatePage(generateForm({description: description.length > 0 ? description : undefined}))

    const setGroups = (groups: [string, string][]) => props.updatePage(generateForm({groups}))

    const setLastCollect = (lastCollect: string) => props.updatePage(generateForm({lastCollect: lastCollect.trim()}))

    return <BookmarkRootDiv>
        <BookmarkNameGrid>
            <Label>页面</Label>
            <Input width="100%" placeholder="页面标题" value={props.page.title} onUpdateValue={setTitle}/>
        </BookmarkNameGrid>
        <BookmarkOtherNamesGrid>
            <Label>URL</Label>
            <Input width="100%" placeholder="URL" value={props.page.url} onUpdateValue={setURL}/>
        </BookmarkOtherNamesGrid>
        <LayouttedDiv display="flex" lineHeight="small">
            <FormattedText bold mr={2}>上次收集</FormattedText>
            <Input width="55%" size="small" value={props.page.lastCollect} onUpdateValue={setLastCollect}/>
        </LayouttedDiv>
        <div>
            <KeywordList keywords={props.page.keywords} onUpdateKeywords={setKeywords} editable/>
        </div>
        <div>
            <GroupPicker mode="page" groups={props.page.groups} onUpdateGroups={setGroups} allGroups={props.allGroups}/>
        </div>
        <div>
            <Input type="textarea" placeholder="描述" value={props.page.description} onUpdateValue={setDescription}/>
        </div>
    </BookmarkRootDiv>
})

const BookmarkRootDiv = styled.div`
    box-sizing: border-box;
    width: 100%;
    height: 100%;
    padding: ${SPACINGS[2]};
    display: grid;
    grid-gap: ${SPACINGS[1]};
    grid-template-rows: calc(${ELEMENT_HEIGHTS["std"]} + 20px) ${ELEMENT_HEIGHTS["small"]} 1fr;
    grid-template-columns: 1fr 3fr;
`

const BookmarkNameGrid = styled.div``

const BookmarkOtherNamesGrid = styled.div``