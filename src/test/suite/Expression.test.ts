import * as assert from 'assert';
import { Scanner, TokenKind } from '../../Expression';

suite('Scanner', () => {
    test('getToken()', () => {
        const scanner = new Scanner('1% + (20 - 3em * $ABC) / 2');
        const TK = TokenKind;
        [
            TK.NUM_U, TK.ADD,
            TK.LPARAN,
            TK.NUM, TK.SUB, TK.NUM_U, TK.MUL, TK.VAR,
            TK.RPARAN,
            TK.DIV, TK.NUM
        ].forEach(
            tk => assert.strictEqual(tk, scanner.getToken().kind)
        );
        assert.strictEqual(TK.EOS, scanner.getToken().kind);
    });
});
