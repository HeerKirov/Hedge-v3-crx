import { Button, Input, Label, SecondaryText } from "@/components/universal"
import { Setting } from "@/functions/setting"
import { useServerHealth } from "@/functions/server"
import { useEditor } from "@/utils/reactivity"
import { styled } from "styled-components"

interface OptionsServerPanelProps {
    server: Setting["server"] | null | undefined
    onUpdateServer?(server: Setting["server"]): void
}

export function OptionsServerPanel(props: OptionsServerPanelProps) {
    const { health, refreshHealth } = useServerHealth()
    
    const { editor, changed, setProperty, save } = useEditor({
        value: props.server,
        updateValue: props.onUpdateServer,
        from: v => ({
            port: v.port.toString(),
            token: v.token
        }),
        to: f => ({
            port: parseInt(f.port),
            token: f.token
        }),
        default: () => ({
            port: "",
            token: ""
        }),
        effect() {
            refreshHealth()
        }
    })

    return <>
        <p>
            连接到后台服务后，可以使用一系列与来源数据相关的交互功能。
        </p>
        <Label>后台服务连通状态</Label>
        <StyledHealthDiv>
            <StyledHealth $status={health}>{health}</StyledHealth>
            <Button size="small" onClick={refreshHealth}>刷新</Button>
            <SecondaryText>{STATUS_TO_DESCRIPTION[health]}</SecondaryText>
        </StyledHealthDiv>
        <Label>通信端口</Label>
        <p>
            <Input placeholder="通信端口" value={editor.port} onUpdateValue={v => setProperty("port", v)}/>
            <SecondaryText>连接到后台服务的端口。为了确保稳定连接，建议在「核心服务」设置中设定固定的端口号。</SecondaryText>
        </p>
        <Label>通信Token</Label>
        <p>
            <Input placeholder="通信Token" value={editor.token} onUpdateValue={v => setProperty("token", v)}/>
            <SecondaryText>连接到后台服务的Token。建议在「核心服务」设置中设定固定的Token。</SecondaryText>
        </p>
        <StyledSaveButton mode="filled" type="primary" disabled={!changed} onClick={save}>保存</StyledSaveButton>
    </>
}

const StyledHealthDiv = styled.div`
    padding: var(--spacing-2);
    vertical-align: middle;
`

const StyledHealth = styled.span<{ $status: "NOT_INITIALIZED" | "INITIALIZING" | "LOADING" | "READY" | "DISCONNECTED" | "UNKNOWN" }>`
    font-size: var(--font-size-large);
    color: var(--${p => STATUS_TO_COLOR[p.$status]});
    margin-right: var(--spacing-4);
`

const StyledSaveButton = styled(Button)`
    margin-top: var(--spacing-2);
    padding: 0 var(--spacing-5);
`

const STATUS_TO_COLOR = {
    "NOT_INITIALIZED": "warning",
    "INITIALIZING": "warning",
    "LOADING": "primary",
    "READY": "success",
    "DISCONNECTED": "danger",
    "UNKNOWN": "warning",
}

const STATUS_TO_DESCRIPTION = {
    "NOT_INITIALIZED": "后台服务还没有初始化。",
    "INITIALIZING": "后台服务正在初始化……",
    "LOADING": "后台服务正在启动……",
    "READY": "后台服务已连接。",
    "DISCONNECTED": "后台服务未连接。请检查后台服务是否开启，以及端口、Token是否正确。",
    "UNKNOWN": "后台服务状态未知。",
}