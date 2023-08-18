import React from "react"

interface ButtonProps {
    onClick?(e: React.MouseEvent<HTMLButtonElement, MouseEvent>): void
    disabled?: boolean
    children?: JSX.Element | JSX.Element[] | string
}

export function Button(props: ButtonProps) {
    const { onClick, disabled, children } = props

    return <button disabled={disabled} onClick={onClick}>
        {children}
    </button>
}