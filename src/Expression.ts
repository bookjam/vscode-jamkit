import { assert } from "console";

export enum TokenKind {
    UNDEF,  // invalid char
    EOS,    // end-of-stream

    VAR,    // varialble:    e.g.) $DEVICE
    STR,    // string:       e.g.) "iPhone"
    NUM,    // number:       e.g.) 640

    NUM_U,  // number+unit:  e.g.) 0.3em

    AND,    // logical and:  &&
    OR,     // logical or:   ||

    EQ,     // equal:        ==
    NEQ,    // not equal:    !=
    SW,     // starts with:  =~
    EW,     // ends with:    ~=
    GT,     // greater than: >
    LT,     // less than:    <
    GTE,    // gt or eq:     >=
    LTE,    // lt or eq:     <=

    ADD,    // add:       +
    SUB,    // substract: -
    MUL,    // multiply:  *
    DIV,    // divide:    /

    IDENT,  // identifier

    COMMA,  // comma: ,

    LPARAN, // left paran:   (
    RPARAN  // right paran:  )
}

export interface Token {
    kind: TokenKind;
    beginIndex: number;
    endIndex: number;
}

function isAlpha(ch?: string) {
    if (!ch) {
        return false;
    }

    const code = ch.charCodeAt(0);
    return (
        (65 <= code && code <= 90) || // upper alpha (A-Z)
        (97 <= code && code <= 120)   // lower alpha (a-z)
    );
}

function isNumeric(ch?: string) {
    if (!ch) {
        return false;
    }

    const code = ch.charCodeAt(0);
    return (48 <= code && code <= 57);  // numeric (0-9)
}

function isAlphaNumeric(ch?: string) {
    if (!ch) {
        return false;
    }

    const code = ch.charCodeAt(0);
    return (
        (48 <= code && code <= 57) || // numeric (0-9)
        (65 <= code && code <= 90) || // upper alpha (A-Z)
        (97 <= code && code <= 120)   // lower alpha (a-z)
    );
}

export class Scanner {
    private inputText;
    private inputIndex = 0;

    constructor(text: string) {
        this.inputText = text;
    }

    getToken(): Token {

        let ch = this.getChar();
        while (ch === '\t' || ch === '\r' || ch === ' ') {
            ch = this.getChar();
        }
        if (!ch) {
            return {
                kind: TokenKind.EOS,
                beginIndex: this.inputIndex,
                endIndex: this.inputIndex
            };
        }

        console.log(`ch = ${ch}`);

        const token = {
            kind: TokenKind.UNDEF,
            beginIndex: this.inputIndex,
            endIndex: this.inputIndex
        };

        if (ch === '$') {
            for (; ;) {
                ch = this.peekChar();
                if (ch != '_' && ch != '.' && !isAlphaNumeric(ch)) {
                    break;
                }
                this.getChar();
            }

            token.kind = TokenKind.VAR;
        }
        else if (ch === '"') {
            const text = this.readQuotedText(ch);
            if (text) {
                token.kind = TokenKind.STR;
            }
        }
        else if (ch === '.' || isNumeric(ch)) {
            let dotSeen = ch === '.';

            for (; ;) {
                ch = this.peekChar();
                if (isNumeric(ch)) {
                    this.getChar();
                }
                else if (ch === '.' && !dotSeen) {
                    dotSeen = true;
                    this.getChar();
                }
                else {
                    break;
                }
            }

            if (this.peekChar() === '%') {
                token.kind = TokenKind.NUM_U;
                this.getChar();
            }
            else if (isAlpha(this.peekChar())) {
                token.kind = TokenKind.NUM_U;
                for (; ;) {
                    this.getChar();
                    if (!isAlpha(this.peekChar()))
                        break;
                }
            }
            else {
                token.kind = TokenKind.NUM;
            }
        }
        else if (ch === '&') {
            if (this.getChar() === '&') {
                token.kind = TokenKind.AND;
            }
        }
        else if (ch === '|') {
            if (this.getChar() === '|') {
                token.kind = TokenKind.OR;
            }
        }
        else if (ch === '~') {
            if (this.getChar() === '=') {
                token.kind = TokenKind.EW;
            }
        }
        else if (ch === '=') {
            ch = this.getChar();
            if (ch === '=') {
                token.kind = TokenKind.EQ;
            }
            else if (ch === '~') {
                token.kind = TokenKind.SW;
            }
        }
        else if (ch === '!') {
            if (this.getChar() === '=') {
                token.kind = TokenKind.NEQ;
            }
        }
        else if (ch === '>') {
            if (this.peekChar() === '=') {
                this.getChar();
                token.kind = TokenKind.GTE;
            }
            else {
                token.kind = TokenKind.GT;
            }
        }
        else if (ch === '<') {
            if (this.peekChar() === '=') {
                this.getChar();
                token.kind = TokenKind.LTE;
            }
            else {
                token.kind = TokenKind.LT;
            }
        }
        else if (ch === '+') {
            token.kind = TokenKind.ADD;
        }
        else if (ch === '-') {
            token.kind = TokenKind.SUB;
        }
        else if (ch === '*') {
            token.kind = TokenKind.MUL;
        }
        else if (ch === '/') {
            token.kind = TokenKind.DIV;
        }
        else if (ch === ',') {
            token.kind = TokenKind.COMMA;
        }
        else if (ch === '(') {
            token.kind = TokenKind.LPARAN;
        }
        else if (ch === ')') {
            token.kind = TokenKind.RPARAN;
        }
        else if (ch === '_' || isAlpha(ch)) {

            for (; ;) {
                ch = this.peekChar();
                if (ch != '_' && !isAlphaNumeric(ch)) {
                    break;
                }
                this.getChar();
            }
            token.kind = TokenKind.IDENT;

        }

        token.endIndex = this.inputIndex;

        console.log(`token.kind = ${token.kind}`);

        return token;
    }

    private peekChar(): string | undefined {
        return this.inputText.at(this.inputIndex);
    }

    private getChar(): string | undefined {
        const ch = this.peekChar();
        if (ch) {
            this.inputIndex += 1;
        }
        return ch;
    }

    private ungetChar(): void {
        if (this.inputIndex > 0) {
            this.inputIndex -= 1;
        }
    }

    // private readNumber(startChar: string): string {
    // }

    private readQuotedText(quote: string): string | undefined {
        assert(quote === "'" || quote === '"');

        let text = "";
        let escaped = false;

        for (let ch = this.getChar(); ch; ch = this.getChar()) {

            if (escaped) {
                escaped = false;

                switch (ch) {
                    case 'b':
                        ch = '\b';
                        break;
                    case 'f':
                        ch = '\f';
                        break;
                    case 'n':
                        ch = '\b';
                        break;
                    case 'r':
                        ch = '\r';
                        break;
                    case 't':
                        ch = '\t';
                        break;
                    default:
                        break;
                }

                text += ch;
            }
            else if (ch == '\\') {
                escaped = true;
            }
            else {
                if (ch == quote)
                    return text;

                text += ch;
            }
        }

        return undefined;
    }
}

// ========== VALUE EXPRESSION GRAMMAR ==========
//
// expr   = term   { ( "+" | "-" ) term   }
//
// term   = factor { ( "*" | "/" ) factor }
//
// factor = number | length | '(' expression ')' | func '(' args ')'
//
// func   = "min" | "max" | "floor" | "ceil" | "round"
//
// args   = expression { ( "," ) expression }
//
// number = ... e.g.) 3.5, 10, 256
//
// length = ... e.g.) 0.5cw, 1.2em
//

export interface ExprCheckResult {
    success: boolean;
    message?: string;
}

export class ExprChecker {
    private readonly text;
    private readonly scanner;
    private token;

    constructor(text: string) {
        this.text = text;
        this.scanner = new Scanner(text);
        this.token = this.scanner.getToken();
    }

    check(): ExprCheckResult {
        try {
            this.expression();
        }
        catch (e) {
            return { success: false, message: (e as Error).message };
        }

        if (this.token.kind == TokenKind.EOS) {
            return { success: true };
        }

        return { success: false, message: `Unexpected token: ${this.getTokenText()} (expected EOS)` };
    }

    private match(kind: TokenKind): boolean {
        if (this.token.kind == kind) {
            this.token = this.scanner.getToken();
            return true;
        }
        return false;
    }

    private expect(kind: TokenKind): void {
        if (!this.match(kind)) {
            throw new Error(`Unexpected token: ${this.getTokenText()} (expected ${TokenKind[kind]})`);
        }
    }

    private expression(): void {
        this.term();
        while (this.match(TokenKind.ADD) || this.match(TokenKind.SUB)) {
            this.term();
        }
    }

    private term(): void {
        this.factor();
        while (this.match(TokenKind.MUL) || this.match(TokenKind.DIV)) {
            this.factor();
        }
    }

    private factor(): void {

        if (this.match(TokenKind.ADD) || this.match(TokenKind.SUB)) {
            // consume
        }

        if (this.match(TokenKind.NUM) || this.match(TokenKind.NUM_U)) {
            // pass
        }
        else if (this.match(TokenKind.IDENT)) {
            const funcName = this.getTokenText();
            const arity = getBultInFuncArity(funcName);
            if (arity === undefined) {
                throw new Error(`Undefined function: + ${funcName}`);
            }

            this.expect(TokenKind.LPARAN);
            for (let i = 0; i < arity; ++i) {
                this.expression();
                if (i < arity - 1) {
                    this.expect(TokenKind.COMMA);
                }
            }
            this.expect(TokenKind.RPARAN);
        }
        else if (this.match(TokenKind.LPARAN)) {
            this.expression();
            this.expect(TokenKind.RPARAN);
        }
        else {
            throw new Error(`Unexpected token:  + ${this.getTokenText()}`);
        }
    }

    private getTokenText(): string {
        return this.text.substring(this.token.beginIndex, this.token.endIndex);
    }
}

function getBultInFuncArity(name: string): number | undefined {
    switch (name) {
        case 'floor':
        case 'ceil':
        case 'round':
            return 1;
        case 'max':
        case 'min':
            return 2;
    }
}