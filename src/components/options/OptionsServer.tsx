import { Button, Input } from "@/components/universal"
import { Setting } from "@/functions/setting"
import { useServerHealth } from "@/functions/server"
import { useEditor } from "@/utils/reactivity"

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
        <label>后台服务连通状态</label>
        <p>
            {health}
            <Button onClick={refreshHealth}>刷新</Button>
        </p>
        <label>通信端口</label>
        <p>
            <Input placeholder="通信端口" value={editor.port} onUpdateValue={v => setProperty("port", v)}/>
        </p>
        <label>通信Token</label>
        <p>
            <Input placeholder="通信Token" value={editor.token} onUpdateValue={v => setProperty("token", v)}/>
        </p>
        <Button disabled={!changed} onClick={save}>保存</Button>
    </>
}