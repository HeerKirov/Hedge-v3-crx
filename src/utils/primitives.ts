
export type Result<T, E> = {ok: true, value: T} | {ok: false, err: E}

export const arrays = {
    equals<T>(a: T[], b: T[], eq: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        if (a.length !== b.length) {
            return false
        }
        for (let i = 0; i < a.length; ++i) {
            if (!eq(a[i], b[i])) {
                return false
            }
        }
        return true
    },
    distinctBy<T>(arr: T[], eq: (a: T, b: T) => boolean = (a, b) => a === b): T[] {
        const ret: T[] = []
        for(const item of arr) {
            if(!ret.find(i => eq(i, item))) {
                ret.push(item)
            }
        }
        return ret
    }
}

export const maps = {
    parse<K extends number | string | symbol, V>(arr: [K, V][]): Record<K, V> {
        const ret: Record<K, V> = {} as Record<K, V>
        for(const [k, v] of arr) {
            ret[k] = v
        }
        return ret
    },
    equals<T>(a: {[key: string]: T}, b: {[key: string]: T}, eq: (a: T, b: T) => boolean = (a, b) => a === b): boolean {
        const entriesA = Object.entries(a)
        if(entriesA.length !== Object.keys(b).length) {
            return false
        }
        for(const [key, valueA] of entriesA) {
            if(!b.hasOwnProperty(key) || !eq(valueA, b[key])) {
                return false
            }
        }
        return true
    }
}

export const objects = {
    deepEquals(a: any, b: any): boolean {
        const typeA = a === null ? "null" : typeof a
        const typeB = b === null ? "null" : typeof b

        if(typeA === "object" && typeB === "object") {
            const aIsArray = a instanceof Array, bIsArray = b instanceof Array
            if(aIsArray && bIsArray) {
                if(arrays.equals(a, b, objects.deepEquals)) {
                    return true
                }
            }else if(!aIsArray && !bIsArray) {
                if(maps.equals(a, b, objects.deepEquals)) {
                    return true
                }
            }
            return false
        }else if(typeA !== typeB) {
            return false
        }else{
            return a === b
        }
    }
}

export const numbers = {
    compareTo(a: number, b: number): -1 | 0 | 1 {
        return a === b ? 0 : a > b ? 1 : -1
    }
}