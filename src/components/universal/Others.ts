import styled from "styled-components"

export const Label = styled.label`
    font-weight: 700;
    display: block;
    color: var(--text-color);
    margin-top: var(--spacing-2);
`

export const SecondaryText = styled.p`
    color: var(--secondary-text-color);
    font-size: var(--font-size-small);
`

export const Group = styled.div`
    > :not(:last-child) {
        margin-right: var(--spacing-1);
    }
`