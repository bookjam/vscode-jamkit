
export function unquote(value: string): string {
    if (value.length >= 2 && value[0] == value[value.length - 1] && (value[0] == '"' || value[0] == "'")) {
        value = value.substring(1, value.length - 1);
        value = value.replace(/\\(.)/g, '$1');
    }
    return value;
}