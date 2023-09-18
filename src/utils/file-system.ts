
interface SaveFileOptions {
    suggestedName?: string
    types?: [string, string, string][]
    content: string | Blob
}

interface ReadFileOptions {
    types?: [string, string, string][]
    multiple?: boolean
}

export const JSON_TYPE: [string, string, string] = ["*.json", "application/json", ".json"]

export async function saveFile(options: SaveFileOptions) {
    const handle = await window.showSaveFilePicker({
        suggestedName: options.suggestedName,
        types: options.types?.map(([description, mime, ext]) => ({description, accept: {[mime]: ext}}))
    })
    const writable = await handle.createWritable()
    try {
        await writable.write(options.content)
    }finally{
        await writable.close()
    }
}

export async function readFile(options: ReadFileOptions): Promise<string> {
    const [handle] = await window.showOpenFilePicker({
        multiple: options.multiple,
        types: options.types?.map(([description, mime, ext]) => ({description, accept: {[mime]: ext}}))
    })
    const file = await handle.getFile()
    return await file.text()
}
