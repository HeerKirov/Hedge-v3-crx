import { BackupBookmark } from "@/services/bookmarks"
import { HTMLBookmark, HTMLBookmarkItem } from "@/utils/html-bookmark"
import { dates, Result } from "@/utils/primitives"

export interface AnalyseHTMLBookmarksOptions {
    directoryProperties: DirectoryProperty
    keywordProperties: KeywordProperty[]
}

interface DirectoryProperty {
    asBookmark?: boolean
    groups?: [string, string][]
    score?: number
    exclude?: boolean
    children?: NamedDirectoryProperty[]
}

interface NamedDirectoryProperty extends DirectoryProperty {
    name: string
}

interface KeywordProperty {
    keyword: string
    groups?: [string, string][]
    score?: number
    remove?: boolean
}

/**
 * 解析HTML书签，结合配置选项，将其转换至适合HedgeBookmark的书签。
 */
export function analyseHTMLBookmarks(htmlBookmark: HTMLBookmark[], options: AnalyseHTMLBookmarksOptions): Result<BackupBookmark[], any> {
    function processDirectory(items: HTMLBookmark[], property: DirectoryProperty, urls: Record<string, BookmarkMetadata> = {}): Record<string, BookmarkMetadata> {
        if(!property?.exclude) {
            for(const item of items) {
                if(item.type === "bookmark") {
                    const { plains, words } = splitTitleToKeywords(item.title)
                    const baseMetadata = generateBookmarkMetadata(plains, words)
                    const metadata = generateMetadataByProperty(baseMetadata, item.url, item.addDate, property, options.keywordProperties)
                    //TODO 处理URL重复的问题
                    urls[item.url] = metadata
                }else{
                    //TODO asBookmark
                    const childProperty = property?.children?.find(p => p.name === item.name)
                    processDirectory(item.children, {
                        asBookmark: property.asBookmark || (childProperty?.asBookmark ?? false),
                        groups: [...(property.groups ?? []), ...(childProperty?.groups ?? [])],
                        score: childProperty?.score ?? property.score,
                        exclude: childProperty?.exclude ?? false,
                        children: childProperty?.children ?? []
                    }, urls)
                }
            }
        }
        return urls
    }

    function groupUrlByName(bookmarks: BookmarkMetadata[]): Record<string, string[]> {
        const ret: Record<string, string[]> = {}
        for(const bookmark of bookmarks) {
            for(const name of bookmark.names) {
                if(name !== "Pixiv" && name !== "Book" && name !== "Books" && name !== "Sankaku") {
                    const li = ret[name] ?? (ret[name] = [])
                    li.push(bookmark.url)
                }
            }
        }
        return ret
    }

    function deDuplicate(nameToUrls: Record<string, string[]>): Record<string, string[]> {
        //该函数将保证每个url只会聚集到一个name。

        const urlToNames: Record<string, string[]> = {}
        Object.entries(nameToUrls).filter(([_, urls]) => urls.length > 1).forEach(([name, urls]) => {
            //将name-url[]的映射反过来，构成url-names[]映射，不过在这过程中，只取url[]映射数量>1的name。
            urls.forEach(url => {
                const li = urlToNames[url] ?? (urlToNames[url] = [])
                li.push(name)
            })
        })

        const nameRedirects: Record<string, string> = {}
        Object.entries(urlToNames).filter(([_, names]) => names.length > 1).forEach(([url, names]) => {
            //从一组names中选出一个name作为主要name，然后将其他所有的name都重定向到它
            names.slice(1).forEach(n => {
                if(n !== names[0]) nameRedirects[n] = names[0]
            })
        })

        const ret: Record<string, string[]> = {}
        Object.entries(nameToUrls).filter(([name, urls]) => {
            const finalName = nameRedirects[name] ?? name
            if(finalName in ret) {
                const li = ret[finalName]
                urls.forEach(url => { if(!li.includes(url)) li.push(url) })
            }else{
                ret[finalName] = [...urls]
            }
        })

        return ret
    }

    function generateBackupBookmarks(urlToMetadata: Record<string, BookmarkMetadata>, urlGroups: string[][]): BackupBookmark[] {
        return urlGroups.map(urls => {
            const metaList = urls.map(u => urlToMetadata[u])

            //TODO

            return {
                name: "",
                otherNames: [],
                keywords: [],
                description: "",
                score: undefined,
                groups: [],
                pages: [],
                lastCollectTime: undefined,
                createTime: "",
                updateTime: "",
            }
        })
    }

    const urls = processDirectory(htmlBookmark, options.directoryProperties)

    const nameToUrls = groupUrlByName(Object.values(urls))

    const deDuplicatedNameToUrls = deDuplicate(nameToUrls)

    const value = generateBackupBookmarks(urls, Object.values(deDuplicatedNameToUrls))

    return {ok: true, value}
}

/**
 * 引入配置属性，完善元数据。
 */
function generateMetadataByProperty(metadata: BookmarkBaseMetadata, url: string, addDate: number | null, directoryProperty: DirectoryProperty, keywordProperties: KeywordProperty[]): BookmarkMetadata {
    let score: number | undefined = directoryProperty.score
    const keywords: string[] = []
    const groups: [string, string][] = [...(directoryProperty.groups ?? [])]
    const createTime = addDate !== null ? new Date(addDate) : undefined

    for(const keyword of metadata.keywords) {
        const p = keywordProperties.find(kp => kp.keyword === keyword)
        if(p !== undefined) {
            if(p.groups !== undefined) groups.push(...p.groups)
            if(p.score !== undefined) score = p.score
            if(!p.remove) keywords.push(keyword)
        }else{
            keywords.push(keyword)
        }
    }

    return {names: metadata.names, descriptions: metadata.descriptions, lastCollect: metadata.lastCollect, lastCollectTime: metadata.lastCollectTime, score, keywords, groups, createTime, url}
}

/**
 * 根据书签的title的切割结果，生成书签的元数据。
 *  - <>「」类型的words与plains会被作为书签名称;
 *  - []类型的words会被作为关键词;
 *  - ()【】类型的words会被连接起来作为description;
 *  - {}类型的words会用于生成lastCollect，多余的内容放入description.
 */
function generateBookmarkMetadata(plains: string[], words: [Brackets, string][]): BookmarkBaseMetadata {
    const names: string[] = []
    plains.forEach(t => { if(!names.includes(t)) names.push(t) })
    words.filter(([b]) => b === "<>" || b === "「」").map(([, t]) => t).forEach(t => { if(!names.includes(t)) names.push(t) })

    const keywords: string[] = []
    words.filter(([b]) => b === "[]").map(([, t]) => t).forEach(t => { if(!keywords.includes(t)) keywords.push(t) })

    const descriptions: string[] = []
    words.filter(([b]) => b === "()" || b === "【】").map(([, t]) => t).forEach(t => { if(!descriptions.includes(t)) descriptions.push(t) })

    let lastCollect: string | undefined
    let lastCollectTime: Date | undefined
    words.filter(([b]) => b === "{}").map(([, t]) => t).forEach(t => {
        const matchUpTo = t.match(/up\s+to\s+(?<UpTo>\S+)(\/(?<Date>\d+-|\/\d+-|\/\d+))?/)
        if(matchUpTo && matchUpTo.groups) {
            const upTo = matchUpTo.groups["UpTo"]?.trim() || undefined
            const upToDate = matchUpTo.groups["Date"] ? dates.parseInLocalDate(matchUpTo.groups["Date"]) ?? undefined : undefined
            lastCollect = upTo
            lastCollectTime = upToDate

            const leftText = matchUpTo.index !== undefined ? t.slice(0, matchUpTo.index) + t.slice(matchUpTo.index + matchUpTo[0].length) : t
            const strings = leftText.split("|").map(t => t.trim()).filter(t => t.length > 0)
            if(strings.length > 0) {
                descriptions.push(`UPTO:${strings.join(" | ")}`)
            }
        }else{
            const matchBkTo = t.match(/bk\s+to\s+(?<UpTo>.*)(\/(?<Date>.*))?/)
            if(matchBkTo && matchBkTo.groups) {
                const upTo = matchBkTo.groups["UpTo"]?.trim() || undefined
                const upToDate = matchBkTo.groups["Date"] ? dates.parseInLocalDate(matchBkTo.groups["Date"]) ?? undefined : undefined
                lastCollect = upTo
                lastCollectTime = upToDate
            }
        }
    })

    return {names, keywords, descriptions, lastCollect, lastCollectTime}
}

/**
 * 切割书签的title，将其中的括号内容提取出来。
 */
function splitTitleToKeywords(str: string): {plains: string[], words: [Brackets, string][]} {
    //首先执行一轮括号匹配过程，获知每个括号字符配对的字符的位置，同时也能了解哪些括号字符是独立无配对的字符
    const recordBrackets: Record<number, number> = {}
    const stack: [LeftBrackets, number][] = []
    for(let i = 0; i < str.length; ++i) {
        const c = str.charAt(i)
        if(c === "(" || c === "[" || c === "{" || c === "<" || c === "「" || c === "【" || c === "（") {
            stack.push([c === "（" ? "(" : c, i])
        }else if(c === ")" || c === "]" || c === "}" || c === ">" || c === "」" || c === "】" || c === "）") {
            const targetBracket = BRACKETS.find(b => b[1] === (c === "）" ? ")" : c))![0]
            while(stack.length > 0) {
                const [popBracket, popIndex] = stack.pop()!
                if(popBracket === targetBracket) {
                    recordBrackets[popIndex] = i
                    break
                }
            }
        }
    }

    //提取所有括号位置，然后做层级精简，只保留最外层配对的括号位置
    const tmpBrackets = Object.entries(recordBrackets).map(entry => [parseInt(entry[0]), entry[1]] as const).sort((a, b) => a[0] - b[0])
    const brackets: (readonly [number, number])[] = []
    for(let i = 0; i < tmpBrackets.length; ++i) {
        const b = tmpBrackets[i]
        if(i === 0 && (str.charAt(b[0]) === "(" || str.charAt(b[0]) === "（")) {
            //首个括号如果是()，那么：它前一个字符如果不是空格，或者他的内容不是中文且不是&开头，就判定它不是keyword，跳过
            if((b[0] > 0 && str.charAt(b[0] - 1) !== " ") || (!/.*[\u4e00-\u9fa5]+.*$/.test(str.slice(b[0] + 1, b[1])) && str.charAt(b[0] + 1) !== "&")) {
                continue
            }
        }
        //如果下一个括号的start不超过上一个括号的end，就跳过，因为这意味着它是包含在上一个括号内的
        if(brackets.length <= 0 || b[0] > brackets[brackets.length - 1][1]) {
            brackets.push(b)
        }
    }

    //根据括号位置，从括号间隙提取plains
    const plains: string[] = []
    for(let i = 0; i <= brackets.length; ++i) {
        const start = i > 0 ? brackets[i - 1][1] + 1 : 0
        const end = i < brackets.length ? brackets[i][0] : str.length
        const plain = str.slice(start, end).trim()
        if(plain) {
            plains.push(plain)
        }
    }

    //根据括号提取keywords
    const words: [Brackets, string][] = []
    for(const [start, end] of brackets) {
        const keyword = str.slice(start + 1, end).trim()
        const bracket = ({"(": "()", "（": "()", "[": "[]", "{": "{}", "<": "<>", "「": "「」", "【": "【】"} as const)[str.charAt(start)]!
        if(keyword) {
            words.push([bracket, keyword])
        }
    }

    return {plains, words}
}

const BRACKETS = ["()", "[]", "{}", "<>", "「」", "【】"] as const
type Brackets = typeof BRACKETS[number]
type LeftBrackets = "(" | "[" | "{" | "<" | "「" | "【"

interface BookmarkBaseMetadata {
    names: string[]
    descriptions: string[]
    keywords: string[]
    lastCollect: string | undefined
    lastCollectTime: Date | undefined
}

interface BookmarkMetadata extends BookmarkBaseMetadata {
    url: string
    score: number | undefined
    groups: [string, string][]
    createTime: Date | undefined
}
