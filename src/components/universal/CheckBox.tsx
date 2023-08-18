
interface CheckBoxProps {
    checked?: boolean
    onUpdateChecked?(checked: boolean): void
    disabled?: boolean
    children?: JSX.Element | JSX.Element[] | string
}

export function CheckBox(props: CheckBoxProps) {
    const { checked, onUpdateChecked, disabled, children } = props

    return <label>
        <input type="checkbox" disabled={disabled} checked={checked} onChange={e => onUpdateChecked?.(e.target.checked)}/>
        {children}
    </label>
}