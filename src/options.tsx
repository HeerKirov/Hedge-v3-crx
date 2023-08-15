import React from "react"
import ReactDOM from "react-dom/client"
import { useSetting } from "./utils/reactivity"

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>)

function App() {
    const setting = useSetting()

    return (<>
        <h1>Hedge v3 Helper</h1>
        <p>Hedge options</p>
        {setting !== null && <p>{JSON.stringify(setting)}</p>}
    </>)
}
