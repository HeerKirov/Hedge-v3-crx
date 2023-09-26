import { styled } from "styled-components"
import { Button, CheckBox, Icon, Input, Label, LayouttedDiv, SecondaryText } from "@/components"
import { defaultSetting, Setting } from "@/functions/setting"
import { useEditor, usePartialSet } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"

interface OptionsToolPanelProps {
    tool: Setting["tool"] | null | undefined
    onUpdateTool?(tool: Setting["tool"]): void
}

export function OptionsToolPanel(props: OptionsToolPanelProps) {
    const { editor, changed, setProperty, save } = useEditor({
        value: props.tool,
        updateValue: props.onUpdateTool,
        from: v => ({
            sankakucomplex: v.sankakucomplex,
            ehentai: {
                ...v.ehentai,
                commentBlockKeywords: v.ehentai.commentBlockKeywords?.join(" ")
            }
        }),
        to: f => ({
            sankakucomplex: f.sankakucomplex,
            ehentai: {
                ...f.ehentai,
                commentBlockKeywords: f.ehentai.commentBlockKeywords?.split(" ").filter(s => !!s)
            }
        }),
        default: () => {
            const d = defaultSetting()
            return {
                sankakucomplex: d.tool.sankakucomplex,
                ehentai: {
                    ...d.tool.ehentai,
                    commentBlockKeywords: d.tool.ehentai.commentBlockKeywords?.join(" ")
                }
            }
        }
    })

    const setSankakucomplexProperty = usePartialSet(editor.sankakucomplex, v => setProperty("sankakucomplex", v))

    const setEHentaiProperty = usePartialSet(editor.ehentai, v => setProperty("ehentai", v))

    return <>
        <p>
            扩展工具提供了几种图源网站易用性优化功能。
        </p>
        <Label>Sankaku Complex</Label>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableBlockAds} onUpdateChecked={v => setSankakucomplexProperty("enableBlockAds", v)}>屏蔽部分广告和弹窗</CheckBox>
            <SecondaryText>网站总有一些弹窗无法被广告屏蔽插件干掉，但CSS选择器可以做到。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableShortcutForbidden} onUpdateChecked={v => setSankakucomplexProperty("enableShortcutForbidden", v)}>屏蔽部分快捷键</CheckBox>
            <SecondaryText>屏蔽网站的Tab快捷键与CTRL+D快捷键。这两个快捷键给浏览器的使用带来了一些麻烦。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enablePaginationEnhancement} onUpdateChecked={v => setSankakucomplexProperty("enablePaginationEnhancement", v)}>增强翻页</CheckBox>
            <SecondaryText>使翻页可以突破最大页码上限。不过不能突破跳页限制，需要逐页翻页。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableTagListEnhancement} onUpdateChecked={v => setSankakucomplexProperty("enableTagListEnhancement", v)}>增强标签列表</CheckBox>
            <SecondaryText>在artist, publish, copyright, character类型的标签后面追加该标签的Post/Book数量。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableBookNoticeEnhancement} onUpdateChecked={v => setSankakucomplexProperty("enableBookNoticeEnhancement", v)}>增强Book列表</CheckBox>
            <SecondaryText>在Book链接的后面追加Legacy Pool的跳转链接。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableImageLinkReplacement} onUpdateChecked={v => setSankakucomplexProperty("enableImageLinkReplacement", v)}>替换图像链接</CheckBox>
            <SecondaryText>将所有图像的<code>https://v</code>链接替换为<code>https://s</code>链接。此举可能减少无法访问的文件数量。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.sankakucomplex.enableAddPostId} onUpdateChecked={v => setSankakucomplexProperty("enableAddPostId", v)}>在URL添加PID显示</CheckBox>
            <SecondaryText>在URL后面以<code>#PID=XXX</code>的形式追加Post ID。</SecondaryText>
        </StyledDiv>
        <Label>E-Hentai</Label>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableImageDownloadAnchor} onUpdateChecked={v => setEHentaiProperty("enableImageDownloadAnchor", v)}>添加图像下载链接。</CheckBox>
            <SecondaryText>没有original的图像不会在下方显示下载链接。为了统一操作，在这些图像下方也增加一个链接。</SecondaryText>
            <SecondaryText>此下载链接使用Extension API实现，与原链接的性状并不完全一致。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentBlock} onUpdateChecked={v => setEHentaiProperty("enableCommentBlock", v)}>评论区整体屏蔽</CheckBox>
            <SecondaryText>在评论区可能打起来时，屏蔽评论区的中文评论。</SecondaryText>
            <SecondaryText>Vote较低的评论会被直接屏蔽；当存在Vote较低/至少2条被屏蔽的中文评论，还存在至少2条Vote较高的中文评论时，会连同其他中文评论一起屏蔽。</SecondaryText>
        </StyledDiv>
        <StyledDiv>
            <CheckBox checked={editor.ehentai.enableCommentKeywordBlock} onUpdateChecked={v => setEHentaiProperty("enableCommentKeywordBlock", v)}>评论关键字屏蔽</CheckBox>
            <SecondaryText>根据关键词屏蔽列表，屏蔽不想看到的评论。</SecondaryText>
        </StyledDiv>
        {editor.ehentai.enableCommentKeywordBlock && <StyledDiv>
            <LayouttedDiv size="small">关键词屏蔽列表 (以空格分隔多个关键词)</LayouttedDiv>
            <Input type="textarea" size="small" width="400px" value={editor.ehentai.commentBlockKeywords} onUpdateValue={v => setEHentaiProperty("commentBlockKeywords", v)}/>
        </StyledDiv>}
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
}

const StyledDiv = styled.div`
    margin-top: ${SPACINGS[1]};
`

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
`
