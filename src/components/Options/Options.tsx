import { useSetting } from "@/utils/reactivity"

export function App() {
    const setting = useSetting()

    return (<>
        <h1>Hedge v3 Helper</h1>
        <p>Hedge options</p>
        {setting !== null && <p>{JSON.stringify(setting)}</p>}
    </>)
}