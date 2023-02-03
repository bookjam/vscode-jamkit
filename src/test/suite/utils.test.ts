import * as assert from 'assert';
import * as vscode from 'vscode';
import * as utils from '../../utils';

suite('Utils Test Suite', () => {
    test('toString', () => {
        assert.strictEqual('#ffffff', utils.toString(new vscode.Color(1, 1, 1, 1)));
        assert.strictEqual('#ffffff00', utils.toString(new vscode.Color(1, 1, 1, 0)));
    });
    test('unquote', () => {
        assert.strictEqual('abc', utils.unquote('"abc"'));
        assert.strictEqual('a"bc', utils.unquote('"a\\"bc"'));
    });
});
