type Primitive = string | number | boolean | null | undefined | Date
type SnakeToCamelCase<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
  : S

type DeepSnakeToCamel<T> = T extends Primitive
  ? T
  : T extends Array<infer U>
  ? Array<DeepSnakeToCamel<U>>
  : T extends object
  ? {
      [K in keyof T as K extends string
        ? SnakeToCamelCase<K>
        : K]: DeepSnakeToCamel<T[K]>
    }
  : T

export function toCamelCase(str: string): string {
  return str.replace(/([-_][a-z])/g, (group) =>
    group.toUpperCase().replace('-', '').replace('_', '')
  )
}

export function convertKeysToCamelCase<T extends object>(obj: T): DeepSnakeToCamel<T> {
  if (obj instanceof Date) {
    return obj as DeepSnakeToCamel<T>
  }
  
  if (Array.isArray(obj)) {
    return obj.map((item) => 
      typeof item === 'object' && item !== null
        ? convertKeysToCamelCase(item)
        : item
    ) as DeepSnakeToCamel<T>
  }

  const camelCaseObj: any = {}

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const camelKey = toCamelCase(key)
      const value = obj[key]

      camelCaseObj[camelKey] = 
        typeof value === 'object' && value !== null
          ? convertKeysToCamelCase(value)
          : value
    }
  }

  return camelCaseObj as DeepSnakeToCamel<T>
} 