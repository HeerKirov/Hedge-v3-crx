import React from "react"

interface InputProps {
    type?: "text" | "password"
    value?: string | null | undefined
    placeholder?: string
    disabled?: boolean
    onUpdateValue?(value: string): void
}

export function Input(props: InputProps) {
    const { type, placeholder, disabled, value, onUpdateValue } = props

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdateValue?.(e.target.value)
    }

    return <input type={type ?? "text"} disabled={disabled} placeholder={placeholder} value={value ?? undefined} onChange={onChange}/>
}