import { Fragment } from "react"
import { styled } from "styled-components"
import { Button, CheckBox, FormattedText, Icon, Input, Label, SecondaryText } from "@/components"
import { Setting } from "@/functions/setting"
import { SOURCE_DATA_COLLECT_SITES } from "@/functions/sites"
import { maps, objects } from "@/utils/primitives"
import { useAsyncLoading, useEditor } from "@/utils/reactivity"
import { SPACINGS } from "@/styles"
import { sessions } from "@/functions/storage"

interface OptionsSourceDataPanelProps {
    sourceData: Setting["sourceData"] | null | undefined
    onUpdateSourceData?(sourceData: Setting["sourceData"]): void
}

export function OptionsSourceDataPanel(props: OptionsSourceDataPanelProps) {
    const [closeAutoCollect, refreshCloseAutoCollect] = useAsyncLoading({call: sessions.cache.closeAutoCollect, default: false})

    const resetCloseAutoCollect = async () => {
        if(closeAutoCollect) {
            await sessions.cache.closeAutoCollect(false)
            refreshCloseAutoCollect(false)
        }
    }

    const { editor, changed, setProperty, save } = useEditor({
        value: props.sourceData,
        updateValue: props.onUpdateSourceData,
        from: v => ({
            autoCollectWhenDownload: v.autoCollectWhenDownload,
            rules: Object.entries(SOURCE_DATA_COLLECT_SITES).map(([siteName, rule]) => {
                const overrideRule = v.overrideRules[siteName]
                return {
                    siteName,
                    enable: overrideRule?.enable ?? true,
                    sourceSite: overrideRule?.sourceSite ?? rule.sourceSite,
                    additionalInfo: Object.entries(overrideRule?.additionalInfo ?? rule.additionalInfo).map(([key, additionalField]) => ({key, additionalField}))
                }
            })
        }),
        to: f => ({
            autoCollectWhenDownload: f.autoCollectWhenDownload,
            overrideRules: (() => {
                const overrideRules: Record<string, {enable: boolean, sourceSite: string, additionalInfo: Record<string, string>}> = {}
                for(let i = 0; i < f.rules.length; ++i) {
                    const rule = f.rules[i], stdRule = SOURCE_DATA_COLLECT_SITES[rule.siteName]
                    const additionalInfo = maps.parse(rule.additionalInfo.map(i => [i.key, i.additionalField]))
                    if(!rule.enable || rule.sourceSite !== stdRule.sourceSite || !objects.deepEquals(additionalInfo, stdRule.additionalInfo)) {
                        overrideRules[rule.siteName] = {
                            enable: rule.enable, 
                            sourceSite: rule.sourceSite, 
                            additionalInfo
                        }
                    }
                }
                return overrideRules
            })()
        }),
        default: () => ({
            autoCollectWhenDownload: false,
            rules: []
        })
    })

    const updateCollectRuleAt = (index: number, item: CollectRule) => {
        setProperty("rules", [...editor.rules.slice(0, index), item, ...editor.rules.slice(index + 1)])
    }

    return <>
        <p>来源数据收集功能在提供文件重命名建议的同时收集该项目的来源数据，并保存到Hedge。</p>
        <Label>设置</Label>
        <CheckBox checked={editor.autoCollectWhenDownload} onUpdateChecked={v => setProperty("autoCollectWhenDownload", v)}>在下载文件时，自动收集来源数据</CheckBox>
        {closeAutoCollect && <>
            <FormattedText bold ml={4}><Icon icon="warning" mr={1}/>自动收集功能已临时关闭。</FormattedText>
            <Button size="small" type="primary" onClick={resetCloseAutoCollect}><Icon icon="toggle-on" mr={1}/>重新打开</Button>
        </>}
        <Label>来源数据收集规则</Label>
        <SecondaryText>为每一类来源数据收集指定其在Hedge中对应的site名称，以及每一种附加数据在Hedge中对应的附加数据字段名。</SecondaryText>
        {editor.rules.map((rule, i) => <CollectRuleItem key={rule.siteName} {...rule} onUpdate={v => updateCollectRuleAt(i ,v)}/>)}
        {changed && <StyledSaveButton mode="filled" width="10em" type="primary" onClick={save}><Icon icon="save" mr={2}/>保存</StyledSaveButton>}
    </>
}

interface CollectRule {
    enable: boolean
    siteName: string
    sourceSite: string
    additionalInfo: {key: string, additionalField: string}[]
}

interface CollectRuleItemProps extends CollectRule {
    onUpdate(item: CollectRule): void
}

function CollectRuleItem({ onUpdate, ...rule }: CollectRuleItemProps) {
    return <p>
        <CheckBox checked={rule.enable} onUpdateChecked={v => onUpdate({...rule, enable: v})}/>
        <StyledFixedRuleName>{rule.siteName}</StyledFixedRuleName>
        <Input disabled={!rule.enable} value={rule.sourceSite} placeholder="对应site名称" onUpdateValue={v => onUpdate({...rule, sourceSite: v})}/>
        {rule.additionalInfo.map((additionalInfo, i) => <Fragment key={additionalInfo.key}>
            <StyledFixedAdditionalKey>{additionalInfo.key}</StyledFixedAdditionalKey>
            <Input width="100px" disabled={!rule.enable} placeholder="对应附加数据字段名" value={additionalInfo.additionalField} onUpdateValue={v => onUpdate({...rule, additionalInfo: [...rule.additionalInfo.slice(0, i), {key: additionalInfo.key, additionalField: v}, ...rule.additionalInfo.slice(i + 1)]})}/>
        </Fragment>)}
    </p>
}

const StyledSaveButton = styled(Button)`
    margin-top: ${SPACINGS[4]};
    padding: 0 ${SPACINGS[5]};
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
