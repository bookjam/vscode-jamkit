import * as assert from 'assert';
import * as vscode from 'vscode';
import * as utils from '../../utils';

suite('Extension Test Suite', () => {
    test('toString', () => {
        assert.strictEqual('#ffffff', utils.toString(new vscode.Color(1, 1, 1, 1)));
    });
});
