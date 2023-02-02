import { assert } from 'console';
import { Color } from 'vscode';

export function unquote(value: string): string {
    if (value.length >= 2 && value[0] == value[value.length - 1] && (value[0] == '"' || value[0] == "'")) {
        value = value.substring(1, value.length - 1);
        value = value.replace(/\\(.)/g, '$1');
    }
    return value;
}

export function isColorText(value: string): boolean {

    // #fff, #ffff, #ffffff, #ffffffff
    if (value.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/))
        return true;

    // rgba(128, 128, 128)
    if (value.match(/^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/))
        return true;

    // rgba(128, 128, 128, 1.0)
    if (value.match(/^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d\.]+\s*\)$/))
        return true;

    return false;
}

function hexToColorNum(hex: string): number {
    return Number('0x' + hex) / 255;
}

export function toColor(value: string): Color | undefined {

    let m;

    // #fff, #ffff, #ffffff, #ffffffff
    if (m = value.match(/^#(([0-9A-Fa-f]{3})|([0-9A-Fa-f]{4})|([0-9A-Fa-f]{6})|([0-9A-Fa-f]{8}))$/)) {
        if (m[2] || m[3]) {
            const hex = m[2] ?? m[3];
            const r = hexToColorNum(hex.substring(0, 1).repeat(2));
            const g = hexToColorNum(hex.substring(1, 2).repeat(2));
            const b = hexToColorNum(hex.substring(2, 3).repeat(2));
            const a = m[3] ? hexToColorNum(hex.substring(3, 4).repeat(2)) : 1.0;
            return new Color(r, g, b, a);
        }
        else {
            assert(m[4] || m[5]);
            const hex = m[4] ?? m[5];
            const r = hexToColorNum(hex.substring(0, 2));
            const g = hexToColorNum(hex.substring(2, 4));
            const b = hexToColorNum(hex.substring(4, 6));
            const a = m[5] ? hexToColorNum(hex.substring(6, 8)) : 1.0;
            return new Color(r, g, b, a);
        }
    }

    // rgba(128, 50%, 128)
    if (m = value.match(/^rgb\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*\)$/)) {
        // TODO: implement
        return;
    }

    // rgba(128, 50%, 128, 1.0)
    if (m = value.match(/^rgba\(\s*\d+%?\s*,\s*\d+%?\s*,\s*\d+%?\s*,\s*[\d\.]+\s*\)$/)) {
        // TODO: implement
        return;
    }
}