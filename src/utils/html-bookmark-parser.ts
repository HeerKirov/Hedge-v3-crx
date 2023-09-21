import { GroupModel } from "@/functions/database"
import { BackupBookmark, BackupPage } from "@/services/bookmarks"
import { HTMLBookmark } from "@/utils/html-bookmark"
import { arrays, dates, numbers } from "@/utils/primitives"

export interface AnalyseHTMLBookmarksOptions {
    directoryProperties: DirectoryProperty
    keywordProperties: KeywordProperty[]
    allGroups: GroupModel[]
}

export interface DirectoryProperty {
    asBookmark?: string
    groups?: [string, string][]
    score?: number
    exclude?: boolean
    children?: NamedDirectoryProperty[]
}

export interface NamedDirectoryProperty extends DirectoryProperty {
    name: string
}

export interface KeywordProperty {
    keyword: string
    groups?: [string, string][]
    score?: number
    remove?: boolean
}

/**
 * 解析HTML书签，结合配置选项，将其转换至适合HedgeBookmark的书签。
 */
export function analyseHTMLBookmarks(htmlBookmark: HTMLBookmark[], options: AnalyseHTMLBookmarksOptions): BackupBookmark[] {
    function processDirectory(items: HTMLBookmark[], property: DirectoryProperty, urls: Record<string, BookmarkMetadata> = {}): Record<string, BookmarkMetadata> {
        if(!property?.exclude) {
            for(const item of items) {
                if(item.type === "bookmark") {
                    const { plains, words } = splitTitleToKeywords(item.title)
                    const baseMetadata = generateBookmarkMetadata(plains, words)
                    const metadata = generateMetadataByProperty(baseMetadata, item.url, item.addDate, property, options.keywordProperties)
                    if(item.url in urls) {
                        const existMetadata = urls[item.url]
                        urls[item.url] = {
                            names: arrays.distinct([...existMetadata.names, ...metadata.names]),
                            url: metadata.url,
                            score: existMetadata.score !== undefined && metadata.score !== undefined ? (existMetadata.score > metadata.score ? existMetadata.score : metadata.score) : (metadata.score ?? existMetadata.score),
                            descriptions: arrays.distinct([...existMetadata.descriptions, ...metadata.descriptions]),
                            keywords: arrays.distinct([...existMetadata.keywords, ...metadata.keywords]),
                            groups: arrays.distinct([...existMetadata.groups, ...metadata.groups]),
                            lastCollect: existMetadata.lastCollect !== undefined && metadata.lastCollect !== undefined ? `${existMetadata.lastCollect}, ${metadata.lastCollect}` : (metadata.lastCollect ?? existMetadata.lastCollect),
                            lastCollectTime: existMetadata.lastCollectTime !== undefined && metadata.lastCollectTime !== undefined ? (dates.compareTo(existMetadata.lastCollectTime, metadata.lastCollectTime) > 0 ? existMetadata.lastCollectTime : metadata.lastCollectTime) : (metadata.lastCollectTime ?? existMetadata.lastCollectTime),
                            createTime: existMetadata.createTime !== undefined && metadata.createTime !== undefined ? (dates.compareTo(existMetadata.createTime, metadata.createTime) > 0 ? existMetadata.createTime : metadata.createTime) : (metadata.createTime ?? existMetadata.createTime),
                        }
                    }else{
                        urls[item.url] = metadata
                    }
                }else{
                    const childProperty = property?.children?.find(p => p.name === item.name)
                    processDirectory(item.children, {
                        asBookmark: childProperty?.asBookmark ?? property.asBookmark,
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
                if(name !== "Pixiv" && name !== "Book" && name !== "Books" && name !== "Sankaku" && name !== "artist" && name !== "uncensored") {
                    const li = ret[name] ?? (ret[name] = [])
                    li.push(bookmark.url)
                }
            }
        }
        return ret
    }

    function deDuplicate(urlToMetadata: Record<string, BookmarkMetadata>, nameToUrls: Record<string, string[]>): Record<string, string[]> {
        //该函数将保证每个url只会聚集到一个name。
        //每个url对应多个name,这相当于每个url都加入了多个群组。现在，需要根据群组的连接性质，连接所有连通的群组。
        //所以正确的算法其实是图的遍历算法。从第一个name节点出发，将url作为边访问所有连通的name，然后将一个连通分量作为一个群组。

        const ret: Record<string, string[]> = {}
        const accessed: Set<string> = new Set()

        for(const [name, urls] of Object.entries(nameToUrls)) {
            if(!accessed.has(name)) {
                accessed.add(name)

                const currentNameGroup = [name]

                const queue = [...urls]
                while(queue.length > 0) {
                    const url = queue.shift()!
                    const namesOfURL = urlToMetadata[url].names
                    for(const oneName of namesOfURL) {
                        if(!accessed.has(oneName)) {
                            accessed.add(oneName)
                            const urls = nameToUrls[oneName]
                            //urls确实有可能是undefined，因为有些name并没有加入nameToUrls，属于要被排除的部分
                            if(urls !== undefined) {
                                currentNameGroup.push(oneName)
                                queue.push(...urls)
                            }
                        }
                    }
                }

                //选取持有最多URL引用的name，作为此组的公共name
                const nameWithMaxUrls = arrays.maxOf(currentNameGroup, n => nameToUrls[n].length)!
                ret[nameWithMaxUrls] = arrays.distinct(currentNameGroup.flatMap(n => nameToUrls[n]))
            }
        }

        return ret
    }

    function generateBackupBookmarks(urlToMetadata: Record<string, BookmarkMetadata>, nameToUrls: Record<string, string[]>): BackupBookmark[] {
        return Object.entries(nameToUrls).map(([primaryName, urls]) => {
            const metaList = urls.map(u => urlToMetadata[u])

            //所有page的names取并集作为bm的names，去掉primaryName后作为otherNames
            const otherNames = arrays.distinct(metaList.flatMap(m => m.names).filter(n => n !== primaryName))

            //所有page的keywords取并集作为bm的keywords
            const keywords = arrays.distinct(metaList.flatMap(m => m.keywords))
            //所有page的descriptions取交集合成bm的description
            const descriptions = arrays.intersect(...metaList.map(m => m.descriptions))
            //所有page的groups中，availableFor=bookmark的直接提取，both的则提取各个page的交集
            const groupsForBookmark = metaList.flatMap(m => m.groups).filter(gi => options.allGroups.find(g => g.groupKeyPath === gi[0])?.availableFor === "bookmark")
            const groupsForIntersect = arrays.intersectBy(metaList.map(m => m.groups.filter(gi => (options.allGroups.find(g => g.groupKeyPath === gi[0])?.availableFor ?? "both") === "both")), (a, b) => a[0] === b[0] && a[1] === b[1])
            const groups = arrays.distinctBy([...groupsForBookmark, ...groupsForIntersect], (a, b) => a[0] === b[0] && a[1] === b[1])

            //所有page的score取最高值作为bm的score
            const score = arrays.maxBy(metaList.map(m => m.score), (a, b) => a !== undefined && b !== undefined ? numbers.compareTo(a, b) : a !== undefined ? 1 : -1)
            //所有page的createTime取最小值作为bm的createTime
            const createTime = arrays.minOf(metaList.map(m => m.createTime).filter(c => c !== undefined) as Date[], a => a.getTime()) ?? new Date()
            //所有page的createTime取最大值作为bm的updateTime
            const updateTime = arrays.maxOf(metaList.map(m => m.createTime).filter(c => c !== undefined) as Date[], a => a.getTime()) ?? new Date()
            //lastCollectTime采取标准算法
            const lastCollectTime = arrays.maxOf(metaList.map(m => m.lastCollectTime).filter(c => c !== undefined) as Date[], a => a.getTime())

            const pages: BackupPage[] = metaList.map(m => {
                //只取names中的第一项
                const title = m.names.length > 0 ? m.names[0] : ""
                //取交集之外的部分作为description
                const description = m.descriptions.filter(i => !descriptions.includes(i)).join("\n")
                //选取availableFor为page的部分，以及交集之外的部分作为groups
                const pageGroups = m.groups.filter(([gn, gk]) => {
                    const availableFor = (options.allGroups.find(g => g.groupKeyPath === gn)?.availableFor ?? "both")
                    if(availableFor === "page") return true
                    else if(availableFor === "bookmark") return false
                    else return !groups.some(g => g[0] === gn && g[1] === gk)
                })
                return {
                    url: m.url, title, description, groups: pageGroups,
                    keywords: [], lastCollect: m.lastCollect,
                    lastCollectTime: m.lastCollectTime?.toISOString(),
                    createTime: (m.createTime ?? new Date()).toISOString(),
                    updateTime: (m.createTime ?? new Date()).toISOString()
                }
            })

            return {
                name: primaryName, otherNames, keywords, score, groups, pages,
                description: descriptions.join("\n"),
                lastCollectTime: lastCollectTime?.toISOString(),
                createTime: createTime.toISOString(),
                updateTime: updateTime.toISOString(),
            }
        })
    }

    const urls = processDirectory(htmlBookmark, options.directoryProperties)

    const nameToUrls = groupUrlByName(Object.values(urls))

    const deDuplicatedNameToUrls = deDuplicate(urls, nameToUrls)

    return generateBackupBookmarks(urls, deDuplicatedNameToUrls)
}

/**
 * 从HTML书签中提取出目录树结构，生成对应的DirectoryProperty结构。
 */
export function generateDirectoryProperty(htmlBookmark: HTMLBookmark[]): DirectoryProperty {
    function search(htmlBookmark: HTMLBookmark[]) {
        const ret: NamedDirectoryProperty[] = []
        for(const bm of htmlBookmark) {
            if(bm.type === "node") {
                ret.push({name: bm.name, children: search(bm.children), exclude: bm.name === "回收站"})
            }
        }
        return ret
    }

    return {children: search(htmlBookmark)}
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

    //当对目录勾选asBookmark时，会将该目录作为bookmark的单位，下属的所有页面都作为此bookmark的page。其实现方式是将该目录的name添加到下属的所有页面的names中。
    const names = directoryProperty.asBookmark !== undefined ? arrays.distinct([...metadata.names, directoryProperty.asBookmark]) : metadata.names

    return {names, descriptions: metadata.descriptions, lastCollect: metadata.lastCollect, lastCollectTime: metadata.lastCollectTime, score, keywords, groups, createTime, url}
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
    plains.forEach(t => {
        const bracketMatched = t.match(/(?<T1>\S+?)[_\s]+\((?<T2>\S+)\)/)
        if(bracketMatched && bracketMatched.groups) {
            const t1 = bracketMatched.groups["T1"], t2 = bracketMatched.groups["T2"]
            if(!names.includes(t1)) names.push(t1)
            if(!names.includes(t2)) names.push(t2)
        }else{
            if(!names.includes(t)) names.push(t)
        }
    })
    words.filter(([b]) => b === "<>" || b === "「」").map(([, t]) => t).forEach(t => { if(!names.includes(t)) names.push(t) })

    const keywords: string[] = []
    words.filter(([b]) => b === "[]").map(([, t]) => t).forEach(t => { if(!keywords.includes(t)) keywords.push(t) })

    const descriptions: string[] = []
    words.filter(([b]) => b === "()" || b === "【】").map(([, t]) => t).forEach(t => { if(!descriptions.includes(t)) descriptions.push(t) })

    let lastCollect: string | undefined
    let lastCollectTime: Date | undefined
    words.filter(([b]) => b === "{}").map(([, t]) => t).forEach(t => {
        const matchUpTo = t.match(/up\s+to\s+(?<UpTo>[^\s\/\-&]+)(\/(?<Date>[-\d\/]+))?/)
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
            const matchBkTo = t.match(/bk\s+to\s+(?<UpTo>[^\s\/\-&]+)(\/(?<Date>[-\d\/]+))?/)
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
