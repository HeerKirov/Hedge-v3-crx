import { BookmarkForm, PageForm } from "@/services/bookmarks"
import { objects } from "@/utils/primitives"

export interface BookmarkDto {
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

export interface PageDto {
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

export function useBookmarkFormUpdater(bookmark: BookmarkDto, updateBookmark: (bookmark: BookmarkForm) => void) {
    const generateForm = (additional: Partial<BookmarkForm>): BookmarkForm => {
        const form: BookmarkForm = {
            name: bookmark.name,
            otherNames: bookmark.otherNames,
            keywords: bookmark.keywords,
            description: bookmark.description,
            groups: bookmark.groups,
            score: bookmark.score
        }
        return {...form, ...additional}
    }

    const setName = (name: string) => bookmark.name !== name.trim() && updateBookmark(generateForm({name: name.trim()}))

    const setOtherNames = (otherNames: string[]) => !objects.deepEquals(bookmark.otherNames, otherNames) && updateBookmark(generateForm({otherNames}))

    const setScore = (score: number | undefined) => bookmark.score !== score && updateBookmark(generateForm({score}))

    const setKeywords = (keywords: string[]) => !objects.deepEquals(bookmark.keywords, keywords) && updateBookmark(generateForm({keywords}))

    const setDescription = (description: string) => bookmark.description !== description && updateBookmark(generateForm({description}))

    const setGroups = (groups: [string, string][]) => !objects.deepEquals(bookmark.groups, groups) && updateBookmark(generateForm({groups}))

    return {setName, setOtherNames, setScore, setKeywords, setDescription, setGroups}
}

export function usePageFormUpdater(page: PageDto, updatePage: (page: PageForm) => void) {
    const generateForm = (additional: Partial<PageForm>): PageForm => {
        const form: PageForm = {
            title: page.title,
            url: page.url,
            keywords: page.keywords,
            description: page.description,
            groups: page.groups,
            lastCollect: page.lastCollect,
            lastCollectTime: page.lastCollectTime
        }
        return {...form, ...additional}
    }

    const setTitle = (title: string) => page.title !== title.trim() && updatePage(generateForm({title: title.trim()}))

    const setURL = (url: string) => page.url !== url.trim() && updatePage(generateForm({url: url.trim()}))

    const setKeywords = (keywords: string[]) => !objects.deepEquals(page.keywords, keywords.length > 0 ? keywords : undefined) && updatePage(generateForm({keywords: keywords.length > 0 ? keywords : undefined}))

    const setDescription = (description: string) => page.description !== (description.length > 0 ? description : undefined) && updatePage(generateForm({description: description.length > 0 ? description : undefined}))

    const setGroups = (groups: [string, string][]) => !objects.deepEquals(page.groups, groups) && updatePage(generateForm({groups: groups.length ? groups : undefined}))

    const setLastCollect = (lastCollect: string) => page.lastCollect !== lastCollect.trim() && updatePage(generateForm({lastCollect: lastCollect.trim() || undefined}))

    const setLastCollectTime = (lastCollectTime: Date | undefined) => page.lastCollectTime?.getTime() !== lastCollectTime?.getTime() && updatePage(generateForm({lastCollectTime}))

    return {setTitle, setURL, setKeywords, setDescription, setGroups, setLastCollectTime, setLastCollect}
}
