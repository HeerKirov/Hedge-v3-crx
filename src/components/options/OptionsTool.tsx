import styled from "styled-components"
import { Button, CheckBox, Input, Label, SecondaryText } from "@/components/universal"
import { Setting } from "@/functions/setting"
import { useEditor } from "@/utils/reactivity"
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
            sankakucomplexEnableShortcutForbidden: v.sankakucomplex.enableShortcutForbidden,
            sankakucomplexEnablePaginationEnhancement: v.sankakucomplex.enablePaginationEnhancement,
            sankakucomplexEnableTagListEnhancement: v.sankakucomplex.enableTagListEnhancement,
            sankakucomplexEnableBookEnhancement: v.sankakucomplex.enableBookEnhancement,
            sankakucomplexEnableImageLinkReplacement: v.sankakucomplex.enableImageLinkReplacement,
            sankakucomplexEnableAddPostId: v.sankakucomplex.enableAddPostId,
            ehentaiEnableCommentForbidden: v.ehentai.enableCommentForbidden,
            ehentaiEnableCommentBanned: v.ehentai.enableCommentBanned,
            ehentaiCommentBannedList: v.ehentai.commentBannedList?.join(" ")
        }),
        to: f => ({
            sankakucomplex: {
                enableShortcutForbidden: f.sankakucomplexEnableShortcutForbidden,
                enablePaginationEnhancement: f.sankakucomplexEnablePaginationEnhancement,
                enableTagListEnhancement: f.sankakucomplexEnableTagListEnhancement,
                enableBookEnhancement: f.sankakucomplexEnableBookEnhancement,
                enableImageLinkReplacement: f.sankakucomplexEnableImageLinkReplacement,
                enableAddPostId: f.sankakucomplexEnableAddPostId
            },
            ehentai: {
                enableCommentForbidden: f.ehentaiEnableCommentForbidden,
                enableCommentBanned: f.ehentaiEnableCommentBanned,
                commentBannedList: f.ehentaiCommentBannedList.split(" ").filter(s => !!s)
            }
        }),
        default: () => ({
            sankakucomplexEnableShortcutForbidden: true,
            sankakucomplexEnablePaginationEnhancement: true,
            sankakucomplexEnableTagListEnhancement: true,
            sankakucomplexEnableBookEnhancement: true,
            sankakucomplexEnableImageLinkReplacement: true,
            sankakucomplexEnableAddPostId: true,
            ehentaiEnableCommentForbidden: true,
            ehentaiEnableCommentBanned: true,
            ehentaiCommentBannedList: ""
        })
    })

    return <>
        <p>
            扩展工具提供了几种图源网站易用性优化功能。
        </p>
        <Label>Sankaku Complex</Label>
        <StyledP>
            <CheckBox checked={editor.sankakucomplexEnableShortcutForbidden} onUpdateChecked={v => setProperty("sankakucomplexEnableShortcutForbidden", v)}>屏蔽部分快捷键</CheckBox>
            <SecondaryText>屏蔽网站的Tab快捷键与CTRL+D快捷键。这两个快捷键给浏览器的使用带来了一些麻烦。</SecondaryText>
        </StyledP>
        <StyledP>
            <CheckBox checked={editor.sankakucomplexEnablePaginationEnhancement} onUpdateChecked={v => setProperty("sankakucomplexEnablePaginationEnhancement", v)}>增强翻页</CheckBox>
            <SecondaryText>使翻页可以突破最大页码上限。不过不能突破跳页限制，需要逐页翻页。</SecondaryText>
        </StyledP>
        <StyledP>
            <CheckBox checked={editor.sankakucomplexEnableTagListEnhancement} onUpdateChecked={v => setProperty("sankakucomplexEnableTagListEnhancement", v)}>增强标签列表</CheckBox>
            <SecondaryText>在artist, publish, copyright, character类型的标签后面追加该标签的Post/Book数量。</SecondaryText>
        </StyledP>
        <StyledP>
            <CheckBox checked={editor.sankakucomplexEnableBookEnhancement} onUpdateChecked={v => setProperty("sankakucomplexEnableBookEnhancement", v)}>增强Book列表</CheckBox>
            <SecondaryText>在Book的后面追加Legacy Pool的跳转链接。</SecondaryText>
        </StyledP>
        <StyledP>
            <CheckBox checked={editor.sankakucomplexEnableImageLinkReplacement} onUpdateChecked={v => setProperty("sankakucomplexEnableImageLinkReplacement", v)}>替换图像链接</CheckBox>
            <SecondaryText>将所有图像的<code>https://v</code>链接替换为<code>https://s</code>链接。</SecondaryText>
        </StyledP>
        <StyledP>
            <CheckBox checked={editor.sankakucomplexEnableAddPostId} onUpdateChecked={v => setProperty("sankakucomplexEnableAddPostId", v)}>在URL添加PID显示</CheckBox>
            <SecondaryText>在URL后面以<code>#PID=XXX</code>的形式追加Post ID。</SecondaryText>
        </StyledP>
        <Label>E-Hentai</Label>
        <StyledP>
            <CheckBox checked={editor.ehentaiEnableCommentForbidden} onUpdateChecked={v => setProperty("ehentaiEnableCommentForbidden", v)}>评论区整体屏蔽</CheckBox>
            <SecondaryText>结合关键词屏蔽列表，在评论区可能打起来时，屏蔽整个评论区。</SecondaryText>
        </StyledP>
        <StyledP>
            <CheckBox checked={editor.ehentaiEnableCommentBanned} onUpdateChecked={v => setProperty("ehentaiEnableCommentBanned", v)}>评论关键字屏蔽</CheckBox>
            <SecondaryText>根据关键词屏蔽列表，屏蔽不想看到的评论。</SecondaryText>
        </StyledP>
        {(editor.ehentaiEnableCommentForbidden || editor.ehentaiEnableCommentBanned) && <StyledP>
            <p>关键词屏蔽列表 (以空格分隔多个关键词)</p>
            <Input type="textarea" size="small" width="400px" value={editor.ehentaiCommentBannedList} onUpdateValue={v => setProperty("ehentaiCommentBannedList", v)}/>
        </StyledP>}
        <StyledSaveButton mode="filled" type="primary" disabled={!changed} onClick={save}>保存</StyledSaveButton>
    </>
}

const StyledP = styled.p`
    margin-top: ${SPACINGS[1]};
`

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[2]};
    padding: 0 ${SPACINGS[5]};
`