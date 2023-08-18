import { Button, CheckBox, Input } from "@/components/universal"
import { Setting } from "@/functions/setting"
import { DOWNLOAD_RENAME_RULES } from "@/services/downloads"
import { useEditor } from "@/utils/reactivity"
import { useState } from "react"

interface OptionsDownloadPanelProps {
    download: Setting["download"] | null | undefined
    onUpdateDownload?(download: Setting["download"]): void
}

export function OptionsDownloadPanel(props: OptionsDownloadPanelProps) {
    const { editor, changed, setProperty, save } = useEditor({
        value: props.download,
        updateValue: props.onUpdateDownload,
        from: v => ({
            customExtensions: v.customExtensions.join(", "),
            customRules: v.customRules,
            rules: DOWNLOAD_RENAME_RULES.map(rule => {
                const overrideRule = v.overrideRules[rule.ruleName]
                return {
                    ruleName: rule.ruleName,
                    rename: overrideRule?.rename ?? rule.rename,
                    enable: overrideRule?.enable ?? true
                }
            })
        }),
        to: f => ({
            customExtensions: f.customExtensions.split(",").map(s => s.trim()).filter(s => !!s),
            customRules: f.customRules,
            overrideRules: (() => {
                const overrideRules: Record<string, {enable: boolean, rename: string}> = {}
                for(let i = 0; i < f.rules.length; ++i) {
                    const rule = f.rules[i], stdRule = DOWNLOAD_RENAME_RULES[i]
                    if(!rule.enable || rule.rename !== stdRule.rename) {
                        overrideRules[rule.ruleName] = {enable: rule.enable, rename: rule.rename}
                    }
                }
                return overrideRules
            })()
        }),
        default: () => ({
            customExtensions: "",
            customRules: [],
            rules: []
        })
    })

    const updateStandardRuleAt = (index: number, item: StandardRule) => {
        setProperty("rules", [...editor.rules.slice(0, index), item, ...editor.rules.slice(index + 1)])
    }

    const addCustomRule = (item: CustomRule) => {
        setProperty("customRules", [...editor.customRules, item])
    }

    const updateCustomRuleAt = (index: number, item: CustomRule) => {
        setProperty("customRules", [...editor.customRules.slice(0, index), item, ...editor.customRules.slice(index + 1)])
    }

    const removeCustomRuleAt = (index: number) => {
        setProperty("customRules", [...editor.customRules.slice(0, index), ...editor.customRules.slice(index + 1)])
    }

    return <>
        <label>自定义扩展名</label>
        <p>
            <Input value={editor.customExtensions} onUpdateValue={v => setProperty("customExtensions", v)}/>
        </p>
        <label>重命名规则</label>
        {editor.rules.map((rule, i) => <StandardRuleItem {...rule} onUpdate={v => updateStandardRuleAt(i, v)}/>)}
        <label>自定义重命名规则</label>
        {editor.customRules.map((customRule, i) => <CustomRuleItem {...customRule} onUpdate={v => updateCustomRuleAt(i, v)} onRemove={() => removeCustomRuleAt(i)}/>)}
        <CustomRuleAddItem onAdd={addCustomRule}/>
        <Button disabled={!changed} onClick={save}>保存</Button>
    </>
}

interface CustomRule {
    rename: string
    referrer: string | null
    filename: string | null
    url: string | null
}

interface StandardRule {
    ruleName: string
    rename: string
    enable: boolean
}

interface CustomRuleItemProps extends CustomRule {
    onUpdate(item: CustomRule): void
    onRemove(): void
}

interface StandardRuleProps extends StandardRule {
    onUpdate(item: StandardRule): void
}

function StandardRuleItem({ onUpdate, ...rule }: StandardRuleProps) {
    return <p>
        <CheckBox checked={rule.enable} onUpdateChecked={v => onUpdate({...rule, enable: v})}>{rule.ruleName}</CheckBox>
        <Input placeholder="重命名模板" disabled={!rule.enable} value={rule.rename} onUpdateValue={v => onUpdate({...rule, rename: v})}/>
    </p>
}

function CustomRuleItem({ onUpdate, onRemove, ...rule }: CustomRuleItemProps) {
    return <p>
        <Input placeholder="referrer" value={rule.referrer} onUpdateValue={v => onUpdate({...rule, referrer: v})}/>
        <Input placeholder="url"  value={rule.url} onUpdateValue={v => onUpdate({...rule, url: v})}/>
        <Input placeholder="filename"  value={rule.filename} onUpdateValue={v => onUpdate({...rule, filename: v})}/>
        <Input placeholder="重命名模板"  value={rule.rename} onUpdateValue={v => onUpdate({...rule, rename: v})}/>
        <Button onClick={onRemove}>删除</Button>
    </p>
}

function CustomRuleAddItem({ onAdd }: {onAdd(item: CustomRule): void}) {
    const [referrer, setReferrer] = useState("")
    const [url, setUrl] = useState("")
    const [filename, setFilename] = useState("")
    const [rename, setRename] = useState("")

    const disabled = !((referrer || url || filename) && rename)

    const add = () => {
        onAdd({referrer, url, filename, rename})
        setReferrer("")
        setUrl("")
        setFilename("")
        setRename("")
    }

    return <p>
        <Input placeholder="referrer" value={referrer} onUpdateValue={setReferrer}/>
        <Input placeholder="url"  value={url} onUpdateValue={setUrl}/>
        <Input placeholder="filename"  value={filename} onUpdateValue={setFilename}/>
        <Input placeholder="重命名模板"  value={rename} onUpdateValue={setRename}/>
        <Button disabled={disabled} onClick={add}>添加</Button>
    </p>
}