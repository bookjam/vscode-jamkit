import * as assert from 'assert';
import { LengthCheckResult, LengthChecker, Scanner, TokenKind } from '../../Expression';

suite('Scanner', () => {
    test('getToken()', () => {
        const scanner = new Scanner('1% + (20 - 3em * $ABC) / ceil(1.5)');
        const TK = TokenKind;
        [
            TK.NUM_U, TK.ADD,
            TK.LPAREN,
            TK.NUM, TK.SUB, TK.NUM_U, TK.MUL, TK.VAR,
            TK.RPAREN,
            TK.DIV, TK.NAME, TK.LPAREN, TK.NUM, TK.RPAREN
        ].forEach(
            tk => assert.strictEqual(scanner.getToken().kind, tk)
        );
        assert.strictEqual(scanner.getToken().kind, TK.EOS);
    });
});

suite('LengthChecker', () => {
    const check = (expr: string): LengthCheckResult => {
        return new LengthChecker(expr).check();
    };

    test('simple length', () => {
        assert.strictEqual(check('1').success, true);
        assert.strictEqual(check('12').success, true);
        assert.strictEqual(check('1.2').success, true);
        assert.strictEqual(check('-1').success, true);
        assert.strictEqual(check('-12').success, true);
        assert.strictEqual(check('-1.2').success, true);
    });

    test('simple unit', () => {
        assert.strictEqual(check('1em').success, true);
        assert.strictEqual(check('2pw').success, true);
        assert.strictEqual(check('3ph').success, true);
        assert.strictEqual(check('4cw').success, true);
        assert.strictEqual(check('5mt').success, true);
        assert.strictEqual(check('6mr').success, true);
        assert.strictEqual(check('7mb').success, true);
        assert.strictEqual(check('8ml').success, true);
        assert.strictEqual(check('9sbh').success, true);
        assert.strictEqual(check('10eb').success, true);
        assert.strictEqual(check('11%').success, true);

        assert.strictEqual(check('1ab').success, false);
        assert.strictEqual(check('2cd').success, false);
        assert.strictEqual(check('2xyz').success, false);
        assert.strictEqual(check('11#').success, false);
    });

    test('paran mismatch', () => {
        const r = check('(1 + 3');
        assert.strictEqual(r.success, false);
        assert.strictEqual(r.message, 'Unexpected end of expression: (expected RPAREN)');
    });

    test('function sanity', () => {
        assert.strictEqual(check('min(1, 3) + ceil(1.5) + round(1.5)').success, true);
    });

    test('unknown function', () => {
        const r = check('1 + abc(1, 2) + 2');
        //                   ^^^
        assert.strictEqual(r.success, false);
        assert.strictEqual(r.token?.beginIndex, 4);
        assert.strictEqual(r.token?.endIndex, 7);
        assert.strictEqual(r.message, 'Undefined function: abc');
    });

    test('function arity error - 1', () => {
        const r = check('min(2)');
        //                    ^
        assert.strictEqual(r.success, false);
        assert.strictEqual(r.token?.beginIndex, 5);
        assert.strictEqual(r.token?.endIndex, 6);
        assert.strictEqual(r.message, "The function 'min' takes 2 parameters.");
    });

    test('function arity error - 2', () => {
        const r = check('ceil(2, 1)');
        //                     ^
        assert.strictEqual(r.success, false);
        assert.strictEqual(r.token?.beginIndex, 6);
        assert.strictEqual(r.token?.endIndex, 7);
        assert.strictEqual(r.message, "The function 'ceil' takes only 1 parameter.");
    });

    test('function arity error - 3', () => {
        const r = check('min(2, 1, 3)');
        //                       ^
        assert.strictEqual(r.success, false);
        assert.strictEqual(r.token?.beginIndex, 8);
        assert.strictEqual(r.token?.endIndex, 9);
        assert.strictEqual(r.message, "The function 'min' takes only 2 parameters.");
    });
});