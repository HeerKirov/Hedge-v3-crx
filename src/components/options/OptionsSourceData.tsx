import React from "react"
import styled from "styled-components"
import { Button, CheckBox, Input, Label, SecondaryText } from "@/components/universal"
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
        <p>来源数据收集功能在提供文件重命名建议的同时收集该项目的来源数据，并保存到Hedge。</p>
        <Label>来源数据收集规则</Label>
        <SecondaryText>为每一类来源数据收集指定其在Hedge中对应的site名称，以及每一种附加数据在Hedge中对应的附加数据字段名。</SecondaryText>
        {editor.rules.map((rule, i) => <CollectRuleItem key={rule.ruleName} {...rule} onUpdate={v => updateCollectRuleAt(i ,v)}/>)}
        <StyledSaveButton mode="filled" type="primary" disabled={!changed} onClick={save}>保存</StyledSaveButton>
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
        <CheckBox checked={rule.enable} onUpdateChecked={v => onUpdate({...rule, enable: v})}/>
        <StyledFixedRuleName>{rule.ruleName}</StyledFixedRuleName>
        <Input disabled={!rule.enable} value={rule.sourceSite} placeholder="对应site名称" onUpdateValue={v => onUpdate({...rule, sourceSite: v})}/>
        {rule.additionalInfo.map((additionalInfo, i) => <React.Fragment key={additionalInfo.key}>
            <StyledFixedAdditionalKey>{additionalInfo.key}</StyledFixedAdditionalKey>
            <Input width="100px" disabled={!rule.enable} placeholder="对应附加数据字段名" value={additionalInfo.additionalField} onUpdateValue={v => onUpdate({...rule, additionalInfo: [...rule.additionalInfo.slice(0, i), {key: additionalInfo.key, additionalField: v}, ...rule.additionalInfo.slice(i + 1)]})}/>
        </React.Fragment>)}
    </p>
}

const StyledSaveButton = styled(Button)`
    margin-top: var(--spacing-2);
    padding: 0 var(--spacing-5);
`

const StyledFixedRuleName = styled.span`
    display: inline-block;
    width: 150px;
`

const StyledFixedAdditionalKey = styled.span`
    display: inline-block;
    text-align: center;
    width: 50px;
`