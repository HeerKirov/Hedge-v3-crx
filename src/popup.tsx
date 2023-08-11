import React from "react"
import ReactDOM from "react-dom/client"
import { createGlobalStyle } from "styled-components"

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>
)

const GlobalStyle = createGlobalStyle`
    p {
        color: red;
    }
`

function App() {
    return (<>
        <GlobalStyle/>
        <h1>Hedge v3 Helper</h1>
        <p>Hello, world!</p>
    </>)
}
