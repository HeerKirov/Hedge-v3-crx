import { styled } from "styled-components"

interface CheckBoxProps {
    checked?: boolean
    onUpdateChecked?(checked: boolean): void
    disabled?: boolean
    children?: JSX.Element | JSX.Element[] | string
}

export function CheckBox(props: CheckBoxProps) {
    const { checked, onUpdateChecked, disabled, children } = props

    return <StyledCheckBoxLabel $disabled={disabled ?? false}>
        <input type="checkbox" disabled={disabled} checked={checked} onChange={e => onUpdateChecked?.(e.target.checked)}/>
        {children}
    </StyledCheckBoxLabel>
}

const StyledCheckBoxLabel = styled.label<{ $disabled: boolean }>`
    cursor: ${p => p.$disabled ? "pointer" : "default"};
    display: inline-block;
    line-height: 1;
    position: relative;
    input[type=checkbox] {
        cursor: ${p => p.$disabled ? "pointer" : "default"};
        vertical-align: middle;
        margin: 0 0.25em 0.05em 0;
    }
`
