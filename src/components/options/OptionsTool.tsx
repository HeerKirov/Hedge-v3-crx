import { Button, CheckBox, Input } from "@/components/universal"
import { Setting } from "@/functions/setting"
import { useEditor } from "@/utils/reactivity"

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
        <p>Sankaku Complex</p>
        <p>
            <CheckBox checked={editor.sankakucomplexEnableShortcutForbidden} onUpdateChecked={v => setProperty("sankakucomplexEnableShortcutForbidden", v)}>屏蔽部分快捷键</CheckBox>
        </p>
        <p>
            <CheckBox checked={editor.sankakucomplexEnablePaginationEnhancement} onUpdateChecked={v => setProperty("sankakucomplexEnablePaginationEnhancement", v)}>增强翻页</CheckBox>
        </p>
        <p>
            <CheckBox checked={editor.sankakucomplexEnableTagListEnhancement} onUpdateChecked={v => setProperty("sankakucomplexEnableTagListEnhancement", v)}>增强标签列表</CheckBox>
        </p>
        <p>
            <CheckBox checked={editor.sankakucomplexEnableBookEnhancement} onUpdateChecked={v => setProperty("sankakucomplexEnableBookEnhancement", v)}>增强Book列表</CheckBox>
        </p>
        <p>
            <CheckBox checked={editor.sankakucomplexEnableImageLinkReplacement} onUpdateChecked={v => setProperty("sankakucomplexEnableImageLinkReplacement", v)}>替换图像链接</CheckBox>
        </p>
        <p>
            <CheckBox checked={editor.sankakucomplexEnableAddPostId} onUpdateChecked={v => setProperty("sankakucomplexEnableAddPostId", v)}>在URL添加PID显示</CheckBox>
        </p>
        <p>E-Hentai</p>
        <p>
            <CheckBox checked={editor.ehentaiEnableCommentForbidden} onUpdateChecked={v => setProperty("ehentaiEnableCommentForbidden", v)}>评论区整体屏蔽</CheckBox>
        </p>
        <p>
            <CheckBox checked={editor.ehentaiEnableCommentBanned} onUpdateChecked={v => setProperty("ehentaiEnableCommentBanned", v)}>评论关键字屏蔽</CheckBox>
        </p>
        <p>
            关键字屏蔽列表
            <Input disabled={!editor.ehentaiEnableCommentBanned} value={editor.ehentaiCommentBannedList} onUpdateValue={v => setProperty("ehentaiCommentBannedList", v)}/>
        </p>
        <Button disabled={!changed} onClick={save}>保存</Button>
    </>
}