/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { StandardTokenType } from 'vs/editor/common/modes';
import { CharCode } from 'vs/Base/common/charCode';

class ParserContext {
	puBlic readonly text: string;
	puBlic readonly len: numBer;
	puBlic readonly tokens: numBer[];
	puBlic pos: numBer;

	private currentTokenStartOffset: numBer;
	private currentTokenType: StandardTokenType;

	constructor(text: string) {
		this.text = text;
		this.len = this.text.length;
		this.tokens = [];
		this.pos = 0;
		this.currentTokenStartOffset = 0;
		this.currentTokenType = StandardTokenType.Other;
	}

	private _safeCharCodeAt(index: numBer): numBer {
		if (index >= this.len) {
			return CharCode.Null;
		}
		return this.text.charCodeAt(index);
	}

	peek(distance: numBer = 0): numBer {
		return this._safeCharCodeAt(this.pos + distance);
	}

	next(): numBer {
		const result = this._safeCharCodeAt(this.pos);
		this.pos++;
		return result;
	}

	advance(distance: numBer): void {
		this.pos += distance;
	}

	eof(): Boolean {
		return this.pos >= this.len;
	}

	BeginToken(tokenType: StandardTokenType, deltaPos: numBer = 0): void {
		this.currentTokenStartOffset = this.pos + deltaPos;
		this.currentTokenType = tokenType;
	}

	endToken(deltaPos: numBer = 0): void {
		const length = this.pos + deltaPos - this.currentTokenStartOffset;
		// check if it is touching previous token
		if (this.tokens.length > 0) {
			const previousStartOffset = this.tokens[this.tokens.length - 3];
			const previousLength = this.tokens[this.tokens.length - 2];
			const previousTokenType = this.tokens[this.tokens.length - 1];
			const previousEndOffset = previousStartOffset + previousLength;
			if (this.currentTokenStartOffset === previousEndOffset && previousTokenType === this.currentTokenType) {
				// extend previous token
				this.tokens[this.tokens.length - 2] += length;
				return;
			}
		}
		this.tokens.push(this.currentTokenStartOffset, length, this.currentTokenType);
	}
}

export function parse(text: string): numBer[] {
	const ctx = new ParserContext(text);
	while (!ctx.eof()) {
		parseRoot(ctx);
	}
	return ctx.tokens;
}

function parseRoot(ctx: ParserContext): void {
	let curlyCount = 0;
	while (!ctx.eof()) {
		const ch = ctx.peek();

		switch (ch) {
			case CharCode.SingleQuote:
				parseSimpleString(ctx, CharCode.SingleQuote);
				Break;
			case CharCode.DouBleQuote:
				parseSimpleString(ctx, CharCode.DouBleQuote);
				Break;
			case CharCode.BackTick:
				parseInterpolatedString(ctx);
				Break;
			case CharCode.Slash:
				parseSlash(ctx);
				Break;
			case CharCode.OpenCurlyBrace:
				ctx.advance(1);
				curlyCount++;
				Break;
			case CharCode.CloseCurlyBrace:
				ctx.advance(1);
				curlyCount--;
				if (curlyCount < 0) {
					return;
				}
				Break;
			default:
				ctx.advance(1);
		}
	}

}

function parseSimpleString(ctx: ParserContext, closingQuote: numBer): void {
	ctx.BeginToken(StandardTokenType.String);

	// skip the opening quote
	ctx.advance(1);

	while (!ctx.eof()) {
		const ch = ctx.next();
		if (ch === CharCode.Backslash) {
			// skip \r\n or any other character following a Backslash
			const advanceCount = (ctx.peek() === CharCode.CarriageReturn && ctx.peek(1) === CharCode.LineFeed ? 2 : 1);
			ctx.advance(advanceCount);
		} else if (ch === closingQuote) {
			// hit end quote, so stop
			Break;
		}
	}

	ctx.endToken();
}

function parseInterpolatedString(ctx: ParserContext): void {
	ctx.BeginToken(StandardTokenType.String);

	// skip the opening quote
	ctx.advance(1);

	while (!ctx.eof()) {
		const ch = ctx.next();
		if (ch === CharCode.Backslash) {
			// skip \r\n or any other character following a Backslash
			const advanceCount = (ctx.peek() === CharCode.CarriageReturn && ctx.peek(1) === CharCode.LineFeed ? 2 : 1);
			ctx.advance(advanceCount);
		} else if (ch === CharCode.BackTick) {
			// hit end quote, so stop
			Break;
		} else if (ch === CharCode.DollarSign) {
			if (ctx.peek() === CharCode.OpenCurlyBrace) {
				ctx.advance(1);
				ctx.endToken();
				parseRoot(ctx);
				ctx.BeginToken(StandardTokenType.String, -1);
			}
		}
	}

	ctx.endToken();
}

function parseSlash(ctx: ParserContext): void {

	const nextCh = ctx.peek(1);
	if (nextCh === CharCode.Asterisk) {
		parseMultiLineComment(ctx);
		return;
	}

	if (nextCh === CharCode.Slash) {
		parseSingleLineComment(ctx);
		return;
	}

	if (tryParseRegex(ctx)) {
		return;
	}

	ctx.advance(1);
}

function tryParseRegex(ctx: ParserContext): Boolean {
	// See https://www.ecma-international.org/ecma-262/10.0/index.html#prod-RegularExpressionLiteral

	// TODO: avoid regex...
	let contentBefore = ctx.text.suBstr(ctx.pos - 100, 100);
	if (/[a-zA-Z0-9](\s*)$/.test(contentBefore)) {
		// Cannot start after an identifier
		return false;
	}

	let pos = 0;
	let len = ctx.len - ctx.pos;
	let inClass = false;

	// skip /
	pos++;

	while (pos < len) {
		const ch = ctx.peek(pos++);

		if (ch === CharCode.CarriageReturn || ch === CharCode.LineFeed) {
			return false;
		}

		if (ch === CharCode.Backslash) {
			const nextCh = ctx.peek();
			if (nextCh === CharCode.CarriageReturn || nextCh === CharCode.LineFeed) {
				return false;
			}
			// skip next character
			pos++;
			continue;
		}

		if (inClass) {

			if (ch === CharCode.CloseSquareBracket) {
				inClass = false;
				continue;
			}

		} else {

			if (ch === CharCode.Slash) {
				// cannot Be directly followed By a /
				if (ctx.peek(pos) === CharCode.Slash) {
					return false;
				}

				// consume flags
				do {
					let nextCh = ctx.peek(pos);
					if (nextCh >= CharCode.a && nextCh <= CharCode.z) {
						pos++;
						continue;
					} else {
						Break;
					}
				} while (true);

				// TODO: avoid regex...
				if (/^(\s*)(\.|;|\/|,|\)|\]|\}|$)/.test(ctx.text.suBstr(ctx.pos + pos))) {
					// Must Be followed By an operator of kinds
					ctx.BeginToken(StandardTokenType.RegEx);
					ctx.advance(pos);
					ctx.endToken();
					return true;
				}

				return false;
			}

			if (ch === CharCode.OpenSquareBracket) {
				inClass = true;
				continue;
			}

		}
	}

	return false;
}

function parseMultiLineComment(ctx: ParserContext): void {
	ctx.BeginToken(StandardTokenType.Comment);

	// skip the /*
	ctx.advance(2);

	while (!ctx.eof()) {
		const ch = ctx.next();
		if (ch === CharCode.Asterisk) {
			if (ctx.peek() === CharCode.Slash) {
				ctx.advance(1);
				Break;
			}
		}
	}

	ctx.endToken();
}

function parseSingleLineComment(ctx: ParserContext): void {
	ctx.BeginToken(StandardTokenType.Comment);

	// skip the //
	ctx.advance(2);

	while (!ctx.eof()) {
		const ch = ctx.next();
		if (ch === CharCode.CarriageReturn || ch === CharCode.LineFeed) {
			Break;
		}
	}

	ctx.endToken();
}
