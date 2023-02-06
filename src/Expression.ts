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
    text?: string;
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
            return { kind: TokenKind.EOS };
        }

        console.log(`ch = ${ch}`);

        const token = { kind: TokenKind.UNDEF, text: '' };

        if (ch === '$') {
            for (; ;) {
                ch = this.getChar();

                if (ch != '_' && ch != '.' && !isAlphaNumeric(ch)) {
                    this.ungetChar();
                    break;
                }

                token.text += ch;
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

            token.text += ch;

            for (; ;) {
                ch = this.peekChar();

                if (isNumeric(ch)) {
                    token.text += ch;
                    this.getChar();
                }
                else if (ch === '.' && !dotSeen) {
                    token.text += ch;
                    dotSeen = true;
                    this.getChar();
                }
                else {
                    break;
                }
            }

            if (token.text.at(-1) === '.') {
                this.ungetChar();
            }
            else if (this.peekChar() === '%') {
                token.kind = TokenKind.NUM_U;
                token.text += this.getChar();
            }
            else if (isAlpha(this.peekChar())) {
                token.kind = TokenKind.NUM_U;
                for (; ;) {
                    token.text += this.getChar();
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
            if (this.getChar() === '=') {
                token.kind = TokenKind.GTE;
            }
            else {
                this.ungetChar();
                token.kind = TokenKind.GT;
            }
        }
        else if (ch === '<') {
            if (this.getChar() === '=') {
                token.kind = TokenKind.LTE;
            }
            else {
                this.ungetChar();
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

            token.text += ch;
            for (; ;) {
                ch = this.getChar();
                if (ch != '_' && !isAlphaNumeric(ch)) {
                    this.ungetChar();
                    break;
                }

                token.text += ch;
            }

            if (token.text == "and") {
                token.kind = TokenKind.OR;
            }
            else if (token.text == "or") {
                token.kind = TokenKind.OR;
            }
            else {
                token.kind = TokenKind.IDENT;
            }
        } else {
            token.text += ch;
        }

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

export interface ExprParseResult {
    success: boolean;
    message?: string;
}

export class ExprParser {
    private token?: Token;
    private scanner?: Scanner;

    parse(text: string): ExprParseResult {
        this.scanner = new Scanner(text);
        return { success: false };
    }

    private getToken(): Token | undefined {
        return this.scanner?.getToken();
    }
}