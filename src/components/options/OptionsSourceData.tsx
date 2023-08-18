import { Button, CheckBox, Input } from "@/components/universal"
import { Setting } from "@/functions/setting"
import { SOURCE_DATA_COLLECT_RULES } from "@/services/downloads"
import { objects } from "@/utils/primitives"
import { useEditor } from "@/utils/reactivity"

interface OptionsSourceDataPanelProps {
    sourceData: Setting["sourceData"] | null | undefined
    onUpdateSourceData?(sourceData: Setting["sourceData"]): void
}

export function OptionsSourceDataPanel(props: OptionsSourceDataPanelProps) {
    const { editor, changed, setProperty, save } = useEditor({
        value: props.sourceData,
        updateValue: props.onUpdateSourceData,
        from: v => ({
            rules: SOURCE_DATA_COLLECT_RULES.map(rule => {
                const overrideRule = v.overrideRules[rule.ruleName]
                return {
                    ruleName: rule.ruleName,
                    enable: overrideRule?.enable ?? true,
                    sourceSite: overrideRule?.sourceSite ?? rule.sourceSite,
                    additionalInfo: overrideRule?.additionalInfo ?? rule.additionalInfo
                }
            })
        }),
        to: f => ({
            overrideRules: (() => {
                const overrideRules: Record<string, {enable: boolean, sourceSite: string, additionalInfo: {key: string, additionalField: string}[]}> = {}
                for(let i = 0; i < f.rules.length; ++i) {
                    const rule = f.rules[i], stdRule = SOURCE_DATA_COLLECT_RULES[i]
                    if(!rule.enable || rule.sourceSite !== stdRule.sourceSite || !objects.deepEquals(rule.additionalInfo, stdRule.additionalInfo)) {
                        overrideRules[rule.ruleName] = {enable: rule.enable, sourceSite: rule.sourceSite, additionalInfo: rule.additionalInfo}
                    }
                }
                return overrideRules
            })()
        }),
        default: () => ({
            rules: []
        })
    })

    const updateCollectRuleAt = (index: number, item: CollectRule) => {
        setProperty("rules", [...editor.rules.slice(0, index), item, ...editor.rules.slice(index + 1)])
    }

    return <>
        <label>来源数据收集规则</label>
        {editor.rules.map((rule, i) => <CollectRuleItem {...rule} onUpdate={v => updateCollectRuleAt(i ,v)}/>)}
        <Button disabled={!changed} onClick={save}>保存</Button>
    </>
}

interface CollectRule {
    enable: boolean
    ruleName: string
    sourceSite: string
    additionalInfo: {key: string, additionalField: string}[]
}

interface CollectRuleItemProps extends CollectRule {
    onUpdate(item: CollectRule): void
}

function CollectRuleItem({ onUpdate, ...rule }: CollectRuleItemProps) {
    return <p>
        <CheckBox checked={rule.enable} onUpdateChecked={v => onUpdate({...rule, enable: v})}>{rule.ruleName}</CheckBox>
        <Input disabled={!rule.enable} value={rule.sourceSite} onUpdateValue={v => onUpdate({...rule, sourceSite: v})}/>
        {rule.additionalInfo.map((additionalInfo, i) => <>
            {additionalInfo.key}
            <Input disabled={!rule.enable} value={additionalInfo.additionalField} onUpdateValue={v => onUpdate({...rule, additionalInfo: [...rule.additionalInfo.slice(0, i), {key: additionalInfo.key, additionalField: v}, ...rule.additionalInfo.slice(i + 1)]})}/>
        </>)}
    </p>
}