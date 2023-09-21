import React, { memo, useCallback, useMemo, useRef, useState } from "react"
import { css, styled } from "styled-components"
import { GroupModel } from "@/functions/database"
import {
    Anchor, Button, CheckBox, FormattedText,
    Group, GroupPicker, GroupTag, Icon, Input, LayouttedDiv, Starlight
} from "@/components"
import { useOutsideClick } from "@/utils/sensors"
import { HTML_TYPE, JSON_TYPE, readFile, saveFile } from "@/utils/file-system"
import { analyseHTMLBookmarkFile, getStatistics, HTMLBookmark } from "@/utils/html-bookmark"
import {
    generateDirectoryProperty,
    DirectoryProperty,
    KeywordProperty,
    NamedDirectoryProperty,
    analyseHTMLBookmarks
} from "@/utils/html-bookmark-parser"
import { SPACINGS } from "@/styles"
import { Backup, BackupBookmark, backups } from "@/services/bookmarks"
import { dates } from "@/utils/primitives"

export const HTMLImport = memo(function (props: { allGroups?: GroupModel[] | null }) {
    const [data, setData] = useState<{html: HTMLBookmark[], bookmarkCount: number, dirCount: number}>()

    const [step, setStep] = useState(0)

    const [dirProperty, setDirProperty] = useState<DirectoryProperty>()

    const [keywordProperty, setKeywordProperty] = useState<KeywordProperty[]>([])

    const [result, setResult] = useState<{data: BackupBookmark[], bookmarkCount: number, pageCount: number}>()

    const stepPrev = () => {
        const stepTo = step - 1
        setStep(stepTo)
        if(result !== undefined) setResult(undefined)
    }

    const stepNext = () => {
        const stepTo = step + 1
        if(stepTo === 3) {
            if(data !== undefined && dirProperty !== undefined) {
                const res = analyseHTMLBookmarks(data.html, {
                    directoryProperties: dirProperty,
                    keywordProperties: keywordProperty,
                    allGroups: props.allGroups ?? []
                })
                const bookmarkCount = res.length
                const pageCount = res.map(b => b.pages.length).reduce((p, c) => p + c)
                setResult({data: res, bookmarkCount, pageCount})
                setStep(stepTo)
            }
        }else{
            setStep(stepTo)
        }
    }

    const importHTML = useCallback(async () => {
        const text = await readFile({types: [HTML_TYPE]})
        if(text !== undefined) {
            const html = analyseHTMLBookmarkFile(text)
            const statistics = getStatistics(html)
            const dirProperty = generateDirectoryProperty(html)
            setData({html, ...statistics})
            setDirProperty(dirProperty)
        }
    }, [])

    const importConfiguration = async () => {
        if(data !== undefined) {
            const text = await readFile({types: [JSON_TYPE]})
            if(text !== undefined) {
                const json = JSON.parse(text)
                if(json["directoryProperties"]) setDirProperty(json["directoryProperties"])
                if(json["keywordProperties"]) setKeywordProperty(json["keywordProperties"])
                alert("配置项已导入。")
                const res = analyseHTMLBookmarks(data.html, {
                    directoryProperties: json["directoryProperties"] ?? dirProperty,
                    keywordProperties: json["keywordProperties"] ?? [],
                    allGroups: props.allGroups ?? []
                })
                const bookmarkCount = res.length
                const pageCount = res.map(b => b.pages.length).reduce((p, c) => p + c)
                setResult({data: res, bookmarkCount, pageCount})
                setStep(3)
            }
        }
    }

    const importToDB = async () => {
        if(result !== undefined) {
            const res = await backups.import({
                bookmarks: result.data,
                storedQueries: [],
                groups: []
            })
            if(res.ok) {
                alert("数据已导入。")
                setStep(4)
            }
        }
    }

    const exportAsBackupFile = async () => {
        if(result !== undefined) {
            const content = JSON.stringify({
                bookmarks: result.data,
                storedQueries: [],
                groups: []
            } as Backup)
            const date = dates.toFormatDate(new Date())
            await saveFile({suggestedName: `HedgeBookmark-${date}.json`, types: [JSON_TYPE], content})
            alert("数据已生成。")
            setStep(4)
        }
    }

    const exportConfiguration = async () => {
        if(dirProperty !== undefined) {
            const content = JSON.stringify({
                directoryProperties: dirProperty,
                keywordProperties: keywordProperty
            })
            const date = dates.toFormatDate(new Date())
            await saveFile({suggestedName: `HedgeBookmark-ImportConfiguration-${date}.json`, types: [JSON_TYPE], content})
            alert("配置项已生成。")
        }
    }

    return data === undefined ? <LayouttedDiv mt={1}>
        <Group>
            <Button onClick={importHTML}><Icon icon="file-import" mr={2}/>从书签备份文件导入</Button>
            <FormattedText color="secondary" size="small">从通用格式的浏览器书签导入，并生成为专有格式。</FormattedText>
        </Group>
    </LayouttedDiv> : step === 0 ? <LayouttedDiv mt={1} border radius="std" backgroundColor="block" padding={2}>
        <LayouttedDiv float="right">
            <Group>
                <Button size="small" onClick={importConfiguration}><Icon icon="cloud-download" mr={2}/>导入已写好的配置文件</Button>
                <Button size="small" mode="filled" type="primary" onClick={stepNext}>继续：配置目录</Button>
            </Group>
        </LayouttedDiv>
        <LayouttedDiv lineHeight="small">已读取<b>{data.bookmarkCount}</b>个书签，<b>{data.dirCount}</b>个目录。</LayouttedDiv>
        <LayouttedDiv mt={1} mb={1}>通用格式的浏览器书签与内置书签并不是一一对应的。管理器会采取一系列分析策略，从通用书签的标题中分析元数据，并聚合相似的页面至相同的书签下。</LayouttedDiv>
        <LayouttedDiv size="small">
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>分析策略使用各类括号从标题中分离元数据。会被处理的括号包括<code>()</code>、<code>[]</code>、<code>{"{}"}</code>、<code>{"<>"}</code>、<code>「」</code>、<code>【】</code>、<code>（）</code>。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/><code>[]</code>会被解析作为关键词列表。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/><code>{"<>"}</code>、<code>「」</code>会被解析成为别名。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/><code>()</code>、<code>【】</code>、<code>（）</code>会被解析成描述信息，每一条描述单独占据一行。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/><code>{"{}"}</code>会被解析成UpTo信息，遵循格式<code>up to xxx/YYYY-MM-DD</code>，时间信息可省略。在这个格式之外的部分会被作为描述信息记录。</p>
        </LayouttedDiv>
        <LayouttedDiv mt={1} mb={1}>不过，规则存在一些例外，用于处理多变的情况。</LayouttedDiv>
        <LayouttedDiv size="small">
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>没有匹配的单个括号字符会被当作是普通文本的一部分。解析程序会以括号匹配来确定哪些括号是成对的。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>处于标题单词之后，开头的首个<code>()</code>，其内容也会被当作别名，前提是他前面要有空格或<code>_</code>隔开。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>然而，如果上述<code>()</code>内含中文文本，或以<code>&</code>开头，它还是会被当作描述。</p>
        </LayouttedDiv>
        <LayouttedDiv mt={1} mb={1}>组、评分会被作为目录属性在稍后被配置，然后施加到目录下的每一个通用书签上。或者，在稍后的关键词配置中，将一部分关键词转换为组、评分。</LayouttedDiv>
        <LayouttedDiv mt={1} mb={1}>在上述分析都完成后，通用书签被映射为页面，随后以名称、别名为基准，聚合成书签。</LayouttedDiv>
        <LayouttedDiv size="small">
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>当多个书签有重复的页面时，书签会合并。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>书签的名称取所有页面名称的总和，选出在各页面出现次数最多的作为主名称，其他的作为别名。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>页面的所有关键字向上提取至书签，页面自己不含关键字。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>页面的描述信息的公共部分向上提取至书签，其余部分归页面。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>页面的组中，标记为"仅用于书签"的与公共部分会被向上提取至书签，其余部分归页面。</p>
            <p><Icon icon="circle" size="2xs" ml={1} mr={1}/>书签的评分取所有页面中的最大值。</p>
        </LayouttedDiv>
    </LayouttedDiv> : step === 1 ? <LayouttedDiv mt={1} border radius="std" backgroundColor="block" padding={2}>
        <LayouttedDiv float="right">
            <Group>
                <Button size="small" mode="filled" type="primary" onClick={stepPrev}>返回：策略解释</Button>
                <Button size="small" mode="filled" type="primary" onClick={stepNext}>继续：配置关键词</Button>
            </Group>
        </LayouttedDiv>
        <LayouttedDiv lineHeight="small" mb={1}>勾选要导入的目录，并以目录为单位，为书签设置元数据。</LayouttedDiv>
        {dirProperty !== undefined && <HTMLImportDirTree dirProperty={dirProperty} allGroups={props.allGroups} onUpdate={setDirProperty}/>}
    </LayouttedDiv> : step === 2 ? <LayouttedDiv mt={1} border radius="std" backgroundColor="block" padding={2}>
        <LayouttedDiv float="right">
            <Group>
                <Button size="small" mode="filled" type="primary" onClick={stepPrev}>返回：配置目录</Button>
                <Button size="small" mode="filled" type="primary" onClick={stepNext}>继续：完成处理</Button>
            </Group>
        </LayouttedDiv>
        <LayouttedDiv lineHeight="small" mb={1}>添加针对关键词的特殊处理，将关键词转换为其他元数据。</LayouttedDiv>
        <KeywordPropertyList keywordProperties={keywordProperty} allGroups={props.allGroups} onUpdate={setKeywordProperty}/>
    </LayouttedDiv> : step === 3 ? <LayouttedDiv mt={1} border radius="std" backgroundColor="block" padding={2}>
        <LayouttedDiv float="right">
            <Group>
                <Button size="small" mode="filled" type="primary" onClick={stepPrev}>返回：配置关键词</Button>
                <Button size="small" mode="filled" type="primary" disabled>继续：完成处理</Button>
            </Group>
        </LayouttedDiv>
        <LayouttedDiv lineHeight="small" mb={1}>解析已完成。共生成{result?.bookmarkCount}个标签，包含{result?.pageCount}个页面。</LayouttedDiv>
        <Group>
            <Button size="small" mode="filled" type="primary" onClick={importToDB}><Icon icon="download" mr={2}/>直接导入数据库</Button>
            <Button size="small" mode="filled" type="primary" onClick={exportAsBackupFile}><Icon icon="file-export" mr={2}/>导出为书签备份文件</Button>
            <Button size="small" onClick={exportConfiguration}><Icon icon="cloud-upload" mr={2}/>导出配置项</Button>
        </Group>
    </LayouttedDiv> : <LayouttedDiv mt={1}>
        导入已完成。
    </LayouttedDiv>
})

const HTMLImportDirTree = memo(function (props: {dirProperty: DirectoryProperty, allGroups?: GroupModel[] | null, onUpdate(v: DirectoryProperty): void}) {
    const root = useMemo<NamedDirectoryProperty>(() => ({...props.dirProperty, name: "根目录"}), [props.dirProperty])

    return <ContentRootDiv>
        <HTMLImportDirTreeNode dirProperty={root} allGroups={props.allGroups} depth={0} onUpdate={props.onUpdate}/>
    </ContentRootDiv>
})

const HTMLImportDirTreeNode = memo(function (props: {dirProperty: NamedDirectoryProperty, disabled?: boolean, depth: number, allGroups?: GroupModel[] | null, onUpdate(v: NamedDirectoryProperty): void}) {
    const [expanded, setExpanded] = useState(props.depth < 2 && !props.dirProperty.exclude)

    const setChildren = useCallback((index: number, nv: NamedDirectoryProperty) => {
        props.onUpdate({...props.dirProperty, children: [...props.dirProperty.children!.slice(0, index), nv, ...props.dirProperty.children!.slice(index + 1)]})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.onUpdate, props.dirProperty])

    return <>
        <DirTreeNodeRow dirProperty={props.dirProperty} expanded={expanded} depth={props.depth} allGroups={props.allGroups} onUpdate={props.onUpdate} onUpdateExpanded={setExpanded}/>
        {expanded && props.dirProperty.children?.map((child, index) => (
            <HTMLImportDirTreeNode key={index} dirProperty={child} disabled={props.disabled || props.dirProperty.exclude || false} depth={props.depth + 1} allGroups={props.allGroups} onUpdate={v => setChildren(index, v)}/>
        ))}
    </>
})

const DirTreeNodeRow = memo(function (props: {dirProperty: NamedDirectoryProperty, expanded: boolean, disabled?: boolean, depth: number, allGroups?: GroupModel[] | null, onUpdateExpanded(ex: boolean): void, onUpdate(v: NamedDirectoryProperty): void}) {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const [showEditCallout, setShowEditCallout] = useState(false)

    const enabled = !props.disabled && !props.dirProperty.exclude

    useOutsideClick(rootRef, useCallback(() => { if(showEditCallout) setShowEditCallout(false) }, [showEditCallout]), showEditCallout)

    const setInclude = (include: boolean) => {
        props.onUpdate({...props.dirProperty, exclude: !include || undefined})
    }

    return <FlexRowDiv ref={rootRef} lineHeight="small" backgroundColor={showEditCallout ? "primary" : undefined} color={showEditCallout ? "text-inverted" : undefined}>
        <FlexRowDivCol $tab={props.depth} $showCaret={!!props.dirProperty.children?.length} $width="50%">
            <a onClick={() => props.onUpdateExpanded(!props.expanded)}><Icon icon={props.expanded ? "caret-down" : "caret-right"}/></a>
            <CheckBox disabled={props.disabled} checked={enabled} onUpdateChecked={setInclude}/>
            <FormattedText color={enabled ? undefined : "secondary"}>{props.dirProperty.name}</FormattedText>
        </FlexRowDivCol>
        <FlexRowDivCol $width="6rem" $shrink={0}>
            {enabled && props.dirProperty.asBookmark !== undefined && <><Icon icon="check" mr={1}/>作为书签</>}
        </FlexRowDivCol>
        <FlexRowDivCol $width="50%">
            {enabled && props.dirProperty.score !== undefined && <Starlight score={props.dirProperty.score}/>}
            {enabled && props.dirProperty.groups !== undefined && props.dirProperty.groups.map(g => <GroupTag key={`${g[0]}-${g[1]}`} item={g} allGroups={props.allGroups ?? []} colored bold/>)}
        </FlexRowDivCol>
        <FlexRowDivCol $width="3rem" $shrink={0}>
            <Anchor disabled={!enabled} onClick={() => setShowEditCallout(true)}><Icon icon="edit" mr={1}/>编辑</Anchor>
        </FlexRowDivCol>
        {showEditCallout && <DirTreeNodeEditCallout dirProperty={props.dirProperty} allGroups={props.allGroups} onUpdate={props.onUpdate} onClose={() => setShowEditCallout(false)}/>}
    </FlexRowDiv>
})

const DirTreeNodeEditCallout = memo(function (props: {dirProperty: NamedDirectoryProperty, allGroups?: GroupModel[] | null, onUpdate(v: NamedDirectoryProperty): void, onClose(): void}) {
    const setAsBookmark = (asBookmark: boolean) => {
        props.onUpdate({...props.dirProperty, asBookmark: asBookmark ? props.dirProperty.name : undefined})
    }

    const setGroups = (groups: [string, string][]) => {
        props.onUpdate({...props.dirProperty, groups: groups.length > 0 ? groups : undefined})
    }

    const setScore = (score: number | undefined) => {
        props.onUpdate({...props.dirProperty, score})
    }

    return <CalloutDiv border backgroundColor="block" color="text" radius="small" padding={[1, 2]}>
        <LayouttedDiv float="right"><Button square size="small" onClick={props.onClose}><Icon icon="close"/></Button></LayouttedDiv>
        <LayouttedDiv lineHeight="small"><CheckBox checked={props.dirProperty.asBookmark !== undefined} onUpdateChecked={setAsBookmark}>将目录作为书签</CheckBox></LayouttedDiv>
        <GroupPicker mode="both" allGroups={props.allGroups ?? []} groups={props.dirProperty.groups} onUpdateGroups={setGroups}/>
        <LayouttedDiv lineHeight="small"><Starlight editable score={props.dirProperty.score} onUpdateScore={setScore}/></LayouttedDiv>
    </CalloutDiv>
})

const KeywordPropertyList = memo(function (props: {keywordProperties: KeywordProperty[], allGroups?: GroupModel[] | null, onUpdate(v: KeywordProperty[]): void}) {
    const update = (i: number, item: KeywordProperty) => {
        props.onUpdate([...props.keywordProperties.slice(0, i), item, ...props.keywordProperties.slice(i + 1)])
    }

    const remove = (i: number) => {
        props.onUpdate([...props.keywordProperties.slice(0, i), ...props.keywordProperties.slice(i + 1)])
    }

    const add = () => {
        props.onUpdate([...props.keywordProperties, {keyword: ""}])
    }

    return <div>
        {props.keywordProperties.map((item, index) => (
            <KeywordPropertyListItem key={index} item={item} allGroups={props.allGroups} onUpdate={v => update(index, v)} onDelete={() => remove(index)}/>
        ))}
        <Button size="small" width="100%" onClick={add}><Icon icon="plus" mr={2}/>添加一项</Button>
    </div>
})

const KeywordPropertyListItem = memo(function (props: {item: KeywordProperty, allGroups?: GroupModel[] | null, onUpdate(v: KeywordProperty): void, onDelete(): void}) {
    const rootRef = useRef<HTMLDivElement | null>(null)
    const [showEditCallout, setShowEditCallout] = useState(false)

    useOutsideClick(rootRef, useCallback(() => { if(showEditCallout) setShowEditCallout(false) }, [showEditCallout]), showEditCallout)

    const setKeyword = (keyword: string) => props.onUpdate({...props.item, keyword})

    return <FlexRowDiv ref={rootRef} mb={1} lineHeight="small" backgroundColor={showEditCallout ? "primary" : undefined} color={showEditCallout ? "text-inverted" : undefined}>
        <FlexRowDivCol $width="25%">
            <Input width="100%" size="small" placeholder="关键词" value={props.item.keyword} onUpdateValue={setKeyword}/>
        </FlexRowDivCol>
        <FlexRowDivCol $width="75%" pl={1} onClick={() => setShowEditCallout(true)}>
            <Starlight score={props.item.score}/>
            {props.item.groups?.map(item => <GroupTag key={`${item[0]}-${item[1]}`} item={item} allGroups={props.allGroups ?? []} colored bold/>)}
        </FlexRowDivCol>
        <FlexRowDivCol $shrink={0} $width="4em" onClick={() => setShowEditCallout(true)}>
            {props.item.remove && <><Icon icon="check" mr={1}/>移除</>}
        </FlexRowDivCol>
        <FlexRowDivCol $shrink={0}>
            <Button size="small" type="danger" square onClick={props.onDelete}><Icon icon="close"/></Button>
        </FlexRowDivCol>
        {showEditCallout && <KeywordPropertyEditCallout keywordProperty={props.item} allGroups={props.allGroups} onUpdate={props.onUpdate} onClose={() => setShowEditCallout(false)}/>}
    </FlexRowDiv>
})

const KeywordPropertyEditCallout = memo(function (props: {keywordProperty: KeywordProperty, allGroups?: GroupModel[] | null, onUpdate(v: KeywordProperty): void, onClose(): void}) {
    const setRemove = (remove: boolean) => {
        props.onUpdate({...props.keywordProperty, remove})
    }

    const setGroups = (groups: [string, string][]) => {
        props.onUpdate({...props.keywordProperty, groups: groups.length > 0 ? groups : undefined})
    }

    const setScore = (score: number | undefined) => {
        props.onUpdate({...props.keywordProperty, score})
    }

    return <CalloutDiv border backgroundColor="block" color="text" radius="small" padding={[1, 2]}>
        <LayouttedDiv float="right"><Button square size="small" onClick={props.onClose}><Icon icon="close"/></Button></LayouttedDiv>
        <LayouttedDiv lineHeight="small"><CheckBox checked={props.keywordProperty.remove} onUpdateChecked={setRemove}>移除此关键词</CheckBox></LayouttedDiv>
        <GroupPicker mode="both" allGroups={props.allGroups ?? []} groups={props.keywordProperty.groups} onUpdateGroups={setGroups}/>
        <LayouttedDiv lineHeight="small"><Starlight editable score={props.keywordProperty.score} onUpdateScore={setScore}/></LayouttedDiv>
    </CalloutDiv>
})

const ContentRootDiv = styled(LayouttedDiv)`
    max-height: 70vh;
    overflow-y: auto;
`

const FlexRowDiv = styled(LayouttedDiv)`
    position: relative;
    display: flex;
`

const FlexRowDivCol = styled(LayouttedDiv)<{ $tab?: number, $width?: string, $shrink?: number, $showCaret?: boolean }>`
    box-sizing: border-box;
    white-space: nowrap;
    overflow-x: hidden;
    text-overflow: ellipsis;
    ${p => p.$tab !== undefined && css`padding-left: ${p.$tab}rem;`}
    ${p => p.$width !== undefined && css`width: ${p.$width};`}
    ${p => p.$shrink !== undefined && css`flex-shrink: ${p.$shrink};`}

    ${p => p.$showCaret !== undefined && css`
        > a {
            ${!p.$showCaret && css`opacity: 0;`};
            display: inline-block;
            width: 1em;
            text-align: center;
            margin-right: ${SPACINGS[1]};
        }
    `}
`

const CalloutDiv = styled(LayouttedDiv)`
    z-index: 1;
    position: absolute;
    line-height: normal;
    top: ${SPACINGS[1]};
    right: ${SPACINGS[1]};
    width: 45%;
`
