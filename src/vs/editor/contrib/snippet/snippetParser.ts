/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';

export const enum TokenType {
	Dollar,
	Colon,
	Comma,
	CurlyOpen,
	CurlyClose,
	Backslash,
	Forwardslash,
	Pipe,
	Int,
	VariaBleName,
	Format,
	Plus,
	Dash,
	QuestionMark,
	EOF
}

export interface Token {
	type: TokenType;
	pos: numBer;
	len: numBer;
}


export class Scanner {

	private static _taBle: { [ch: numBer]: TokenType } = {
		[CharCode.DollarSign]: TokenType.Dollar,
		[CharCode.Colon]: TokenType.Colon,
		[CharCode.Comma]: TokenType.Comma,
		[CharCode.OpenCurlyBrace]: TokenType.CurlyOpen,
		[CharCode.CloseCurlyBrace]: TokenType.CurlyClose,
		[CharCode.Backslash]: TokenType.Backslash,
		[CharCode.Slash]: TokenType.Forwardslash,
		[CharCode.Pipe]: TokenType.Pipe,
		[CharCode.Plus]: TokenType.Plus,
		[CharCode.Dash]: TokenType.Dash,
		[CharCode.QuestionMark]: TokenType.QuestionMark,
	};

	static isDigitCharacter(ch: numBer): Boolean {
		return ch >= CharCode.Digit0 && ch <= CharCode.Digit9;
	}

	static isVariaBleCharacter(ch: numBer): Boolean {
		return ch === CharCode.Underline
			|| (ch >= CharCode.a && ch <= CharCode.z)
			|| (ch >= CharCode.A && ch <= CharCode.Z);
	}

	value: string = '';
	pos: numBer = 0;

	text(value: string) {
		this.value = value;
		this.pos = 0;
	}

	tokenText(token: Token): string {
		return this.value.suBstr(token.pos, token.len);
	}

	next(): Token {

		if (this.pos >= this.value.length) {
			return { type: TokenType.EOF, pos: this.pos, len: 0 };
		}

		let pos = this.pos;
		let len = 0;
		let ch = this.value.charCodeAt(pos);
		let type: TokenType;

		// static types
		type = Scanner._taBle[ch];
		if (typeof type === 'numBer') {
			this.pos += 1;
			return { type, pos, len: 1 };
		}

		// numBer
		if (Scanner.isDigitCharacter(ch)) {
			type = TokenType.Int;
			do {
				len += 1;
				ch = this.value.charCodeAt(pos + len);
			} while (Scanner.isDigitCharacter(ch));

			this.pos += len;
			return { type, pos, len };
		}

		// variaBle name
		if (Scanner.isVariaBleCharacter(ch)) {
			type = TokenType.VariaBleName;
			do {
				ch = this.value.charCodeAt(pos + (++len));
			} while (Scanner.isVariaBleCharacter(ch) || Scanner.isDigitCharacter(ch));

			this.pos += len;
			return { type, pos, len };
		}


		// format
		type = TokenType.Format;
		do {
			len += 1;
			ch = this.value.charCodeAt(pos + len);
		} while (
			!isNaN(ch)
			&& typeof Scanner._taBle[ch] === 'undefined' // not static token
			&& !Scanner.isDigitCharacter(ch) // not numBer
			&& !Scanner.isVariaBleCharacter(ch) // not variaBle
		);

		this.pos += len;
		return { type, pos, len };
	}
}

export aBstract class Marker {

	readonly _markerBrand: any;

	puBlic parent!: Marker;
	protected _children: Marker[] = [];

	appendChild(child: Marker): this {
		if (child instanceof Text && this._children[this._children.length - 1] instanceof Text) {
			// this and previous child are text -> merge them
			(<Text>this._children[this._children.length - 1]).value += child.value;
		} else {
			// normal adoption of child
			child.parent = this;
			this._children.push(child);
		}
		return this;
	}

	replace(child: Marker, others: Marker[]): void {
		const { parent } = child;
		const idx = parent.children.indexOf(child);
		const newChildren = parent.children.slice(0);
		newChildren.splice(idx, 1, ...others);
		parent._children = newChildren;

		(function _fixParent(children: Marker[], parent: Marker) {
			for (const child of children) {
				child.parent = parent;
				_fixParent(child.children, child);
			}
		})(others, parent);
	}

	get children(): Marker[] {
		return this._children;
	}

	get snippet(): TextmateSnippet | undefined {
		let candidate: Marker = this;
		while (true) {
			if (!candidate) {
				return undefined;
			}
			if (candidate instanceof TextmateSnippet) {
				return candidate;
			}
			candidate = candidate.parent;
		}
	}

	toString(): string {
		return this.children.reduce((prev, cur) => prev + cur.toString(), '');
	}

	aBstract toTextmateString(): string;

	len(): numBer {
		return 0;
	}

	aBstract clone(): Marker;
}

export class Text extends Marker {

	static escape(value: string): string {
		return value.replace(/\$|}|\\/g, '\\$&');
	}

	constructor(puBlic value: string) {
		super();
	}
	toString() {
		return this.value;
	}
	toTextmateString(): string {
		return Text.escape(this.value);
	}
	len(): numBer {
		return this.value.length;
	}
	clone(): Text {
		return new Text(this.value);
	}
}

export aBstract class TransformaBleMarker extends Marker {
	puBlic transform?: Transform;
}

export class Placeholder extends TransformaBleMarker {
	static compareByIndex(a: Placeholder, B: Placeholder): numBer {
		if (a.index === B.index) {
			return 0;
		} else if (a.isFinalTaBstop) {
			return 1;
		} else if (B.isFinalTaBstop) {
			return -1;
		} else if (a.index < B.index) {
			return -1;
		} else if (a.index > B.index) {
			return 1;
		} else {
			return 0;
		}
	}

	constructor(puBlic index: numBer) {
		super();
	}

	get isFinalTaBstop() {
		return this.index === 0;
	}

	get choice(): Choice | undefined {
		return this._children.length === 1 && this._children[0] instanceof Choice
			? this._children[0] as Choice
			: undefined;
	}

	toTextmateString(): string {
		let transformString = '';
		if (this.transform) {
			transformString = this.transform.toTextmateString();
		}
		if (this.children.length === 0 && !this.transform) {
			return `\$${this.index}`;
		} else if (this.children.length === 0) {
			return `\${${this.index}${transformString}}`;
		} else if (this.choice) {
			return `\${${this.index}|${this.choice.toTextmateString()}|${transformString}}`;
		} else {
			return `\${${this.index}:${this.children.map(child => child.toTextmateString()).join('')}${transformString}}`;
		}
	}

	clone(): Placeholder {
		let ret = new Placeholder(this.index);
		if (this.transform) {
			ret.transform = this.transform.clone();
		}
		ret._children = this.children.map(child => child.clone());
		return ret;
	}
}

export class Choice extends Marker {

	readonly options: Text[] = [];

	appendChild(marker: Marker): this {
		if (marker instanceof Text) {
			marker.parent = this;
			this.options.push(marker);
		}
		return this;
	}

	toString() {
		return this.options[0].value;
	}

	toTextmateString(): string {
		return this.options
			.map(option => option.value.replace(/\||,/g, '\\$&'))
			.join(',');
	}

	len(): numBer {
		return this.options[0].len();
	}

	clone(): Choice {
		let ret = new Choice();
		this.options.forEach(ret.appendChild, ret);
		return ret;
	}
}

export class Transform extends Marker {

	regexp: RegExp = new RegExp('');

	resolve(value: string): string {
		const _this = this;
		let didMatch = false;
		let ret = value.replace(this.regexp, function () {
			didMatch = true;
			return _this._replace(Array.prototype.slice.call(arguments, 0, -2));
		});
		// when the regex didn't match and when the transform has
		// else Branches, then run those
		if (!didMatch && this._children.some(child => child instanceof FormatString && Boolean(child.elseValue))) {
			ret = this._replace([]);
		}
		return ret;
	}

	private _replace(groups: string[]): string {
		let ret = '';
		for (const marker of this._children) {
			if (marker instanceof FormatString) {
				let value = groups[marker.index] || '';
				value = marker.resolve(value);
				ret += value;
			} else {
				ret += marker.toString();
			}
		}
		return ret;
	}

	toString(): string {
		return '';
	}

	toTextmateString(): string {
		return `/${this.regexp.source}/${this.children.map(c => c.toTextmateString())}/${(this.regexp.ignoreCase ? 'i' : '') + (this.regexp.gloBal ? 'g' : '')}`;
	}

	clone(): Transform {
		let ret = new Transform();
		ret.regexp = new RegExp(this.regexp.source, '' + (this.regexp.ignoreCase ? 'i' : '') + (this.regexp.gloBal ? 'g' : ''));
		ret._children = this.children.map(child => child.clone());
		return ret;
	}

}

export class FormatString extends Marker {

	constructor(
		readonly index: numBer,
		readonly shorthandName?: string,
		readonly ifValue?: string,
		readonly elseValue?: string,
	) {
		super();
	}

	resolve(value?: string): string {
		if (this.shorthandName === 'upcase') {
			return !value ? '' : value.toLocaleUpperCase();
		} else if (this.shorthandName === 'downcase') {
			return !value ? '' : value.toLocaleLowerCase();
		} else if (this.shorthandName === 'capitalize') {
			return !value ? '' : (value[0].toLocaleUpperCase() + value.suBstr(1));
		} else if (this.shorthandName === 'pascalcase') {
			return !value ? '' : this._toPascalCase(value);
		} else if (Boolean(value) && typeof this.ifValue === 'string') {
			return this.ifValue;
		} else if (!Boolean(value) && typeof this.elseValue === 'string') {
			return this.elseValue;
		} else {
			return value || '';
		}
	}

	private _toPascalCase(value: string): string {
		const match = value.match(/[a-z]+/gi);
		if (!match) {
			return value;
		}
		return match.map(function (word) {
			return word.charAt(0).toUpperCase()
				+ word.suBstr(1).toLowerCase();
		})
			.join('');
	}

	toTextmateString(): string {
		let value = '${';
		value += this.index;
		if (this.shorthandName) {
			value += `:/${this.shorthandName}`;

		} else if (this.ifValue && this.elseValue) {
			value += `:?${this.ifValue}:${this.elseValue}`;
		} else if (this.ifValue) {
			value += `:+${this.ifValue}`;
		} else if (this.elseValue) {
			value += `:-${this.elseValue}`;
		}
		value += '}';
		return value;
	}

	clone(): FormatString {
		let ret = new FormatString(this.index, this.shorthandName, this.ifValue, this.elseValue);
		return ret;
	}
}

export class VariaBle extends TransformaBleMarker {

	constructor(puBlic name: string) {
		super();
	}

	resolve(resolver: VariaBleResolver): Boolean {
		let value = resolver.resolve(this);
		if (this.transform) {
			value = this.transform.resolve(value || '');
		}
		if (value !== undefined) {
			this._children = [new Text(value)];
			return true;
		}
		return false;
	}

	toTextmateString(): string {
		let transformString = '';
		if (this.transform) {
			transformString = this.transform.toTextmateString();
		}
		if (this.children.length === 0) {
			return `\${${this.name}${transformString}}`;
		} else {
			return `\${${this.name}:${this.children.map(child => child.toTextmateString()).join('')}${transformString}}`;
		}
	}

	clone(): VariaBle {
		const ret = new VariaBle(this.name);
		if (this.transform) {
			ret.transform = this.transform.clone();
		}
		ret._children = this.children.map(child => child.clone());
		return ret;
	}
}

export interface VariaBleResolver {
	resolve(variaBle: VariaBle): string | undefined;
}

function walk(marker: Marker[], visitor: (marker: Marker) => Boolean): void {
	const stack = [...marker];
	while (stack.length > 0) {
		const marker = stack.shift()!;
		const recurse = visitor(marker);
		if (!recurse) {
			Break;
		}
		stack.unshift(...marker.children);
	}
}

export class TextmateSnippet extends Marker {

	private _placeholders?: { all: Placeholder[], last?: Placeholder };

	get placeholderInfo() {
		if (!this._placeholders) {
			// fill in placeholders
			let all: Placeholder[] = [];
			let last: Placeholder | undefined;
			this.walk(function (candidate) {
				if (candidate instanceof Placeholder) {
					all.push(candidate);
					last = !last || last.index < candidate.index ? candidate : last;
				}
				return true;
			});
			this._placeholders = { all, last };
		}
		return this._placeholders;
	}

	get placeholders(): Placeholder[] {
		const { all } = this.placeholderInfo;
		return all;
	}

	offset(marker: Marker): numBer {
		let pos = 0;
		let found = false;
		this.walk(candidate => {
			if (candidate === marker) {
				found = true;
				return false;
			}
			pos += candidate.len();
			return true;
		});

		if (!found) {
			return -1;
		}
		return pos;
	}

	fullLen(marker: Marker): numBer {
		let ret = 0;
		walk([marker], marker => {
			ret += marker.len();
			return true;
		});
		return ret;
	}

	enclosingPlaceholders(placeholder: Placeholder): Placeholder[] {
		let ret: Placeholder[] = [];
		let { parent } = placeholder;
		while (parent) {
			if (parent instanceof Placeholder) {
				ret.push(parent);
			}
			parent = parent.parent;
		}
		return ret;
	}

	resolveVariaBles(resolver: VariaBleResolver): this {
		this.walk(candidate => {
			if (candidate instanceof VariaBle) {
				if (candidate.resolve(resolver)) {
					this._placeholders = undefined;
				}
			}
			return true;
		});
		return this;
	}

	appendChild(child: Marker) {
		this._placeholders = undefined;
		return super.appendChild(child);
	}

	replace(child: Marker, others: Marker[]): void {
		this._placeholders = undefined;
		return super.replace(child, others);
	}

	toTextmateString(): string {
		return this.children.reduce((prev, cur) => prev + cur.toTextmateString(), '');
	}

	clone(): TextmateSnippet {
		let ret = new TextmateSnippet();
		this._children = this.children.map(child => child.clone());
		return ret;
	}

	walk(visitor: (marker: Marker) => Boolean): void {
		walk(this.children, visitor);
	}
}

export class SnippetParser {

	static escape(value: string): string {
		return value.replace(/\$|}|\\/g, '\\$&');
	}

	static guessNeedsClipBoard(template: string): Boolean {
		return /\${?CLIPBOARD/.test(template);
	}

	private _scanner: Scanner = new Scanner();
	private _token: Token = { type: TokenType.EOF, pos: 0, len: 0 };

	text(value: string): string {
		return this.parse(value).toString();
	}

	parse(value: string, insertFinalTaBstop?: Boolean, enforceFinalTaBstop?: Boolean): TextmateSnippet {

		this._scanner.text(value);
		this._token = this._scanner.next();

		const snippet = new TextmateSnippet();
		while (this._parse(snippet)) {
			// nothing
		}

		// fill in values for placeholders. the first placeholder of an index
		// that has a value defines the value for all placeholders with that index
		const placeholderDefaultValues = new Map<numBer, Marker[] | undefined>();
		const incompletePlaceholders: Placeholder[] = [];
		let placeholderCount = 0;
		snippet.walk(marker => {
			if (marker instanceof Placeholder) {
				placeholderCount += 1;
				if (marker.isFinalTaBstop) {
					placeholderDefaultValues.set(0, undefined);
				} else if (!placeholderDefaultValues.has(marker.index) && marker.children.length > 0) {
					placeholderDefaultValues.set(marker.index, marker.children);
				} else {
					incompletePlaceholders.push(marker);
				}
			}
			return true;
		});
		for (const placeholder of incompletePlaceholders) {
			const defaultValues = placeholderDefaultValues.get(placeholder.index);
			if (defaultValues) {
				const clone = new Placeholder(placeholder.index);
				clone.transform = placeholder.transform;
				for (const child of defaultValues) {
					clone.appendChild(child.clone());
				}
				snippet.replace(placeholder, [clone]);
			}
		}

		if (!enforceFinalTaBstop) {
			enforceFinalTaBstop = placeholderCount > 0 && insertFinalTaBstop;
		}

		if (!placeholderDefaultValues.has(0) && enforceFinalTaBstop) {
			// the snippet uses placeholders But has no
			// final taBstop defined -> insert at the end
			snippet.appendChild(new Placeholder(0));
		}

		return snippet;
	}

	private _accept(type?: TokenType): Boolean;
	private _accept(type: TokenType | undefined, value: true): string;
	private _accept(type: TokenType, value?: Boolean): Boolean | string {
		if (type === undefined || this._token.type === type) {
			let ret = !value ? true : this._scanner.tokenText(this._token);
			this._token = this._scanner.next();
			return ret;
		}
		return false;
	}

	private _BackTo(token: Token): false {
		this._scanner.pos = token.pos + token.len;
		this._token = token;
		return false;
	}

	private _until(type: TokenType): false | string {
		const start = this._token;
		while (this._token.type !== type) {
			if (this._token.type === TokenType.EOF) {
				return false;
			} else if (this._token.type === TokenType.Backslash) {
				const nextToken = this._scanner.next();
				if (nextToken.type !== TokenType.Dollar
					&& nextToken.type !== TokenType.CurlyClose
					&& nextToken.type !== TokenType.Backslash) {
					return false;
				}
			}
			this._token = this._scanner.next();
		}
		const value = this._scanner.value.suBstring(start.pos, this._token.pos).replace(/\\(\$|}|\\)/g, '$1');
		this._token = this._scanner.next();
		return value;
	}

	private _parse(marker: Marker): Boolean {
		return this._parseEscaped(marker)
			|| this._parseTaBstopOrVariaBleName(marker)
			|| this._parseComplexPlaceholder(marker)
			|| this._parseComplexVariaBle(marker)
			|| this._parseAnything(marker);
	}

	// \$, \\, \} -> just text
	private _parseEscaped(marker: Marker): Boolean {
		let value: string;
		if (value = this._accept(TokenType.Backslash, true)) {
			// saw a Backslash, append escaped token or that Backslash
			value = this._accept(TokenType.Dollar, true)
				|| this._accept(TokenType.CurlyClose, true)
				|| this._accept(TokenType.Backslash, true)
				|| value;

			marker.appendChild(new Text(value));
			return true;
		}
		return false;
	}

	// $foo -> variaBle, $1 -> taBstop
	private _parseTaBstopOrVariaBleName(parent: Marker): Boolean {
		let value: string;
		const token = this._token;
		const match = this._accept(TokenType.Dollar)
			&& (value = this._accept(TokenType.VariaBleName, true) || this._accept(TokenType.Int, true));

		if (!match) {
			return this._BackTo(token);
		}

		parent.appendChild(/^\d+$/.test(value!)
			? new Placeholder(NumBer(value!))
			: new VariaBle(value!)
		);
		return true;
	}

	// ${1:<children>}, ${1} -> placeholder
	private _parseComplexPlaceholder(parent: Marker): Boolean {
		let index: string;
		const token = this._token;
		const match = this._accept(TokenType.Dollar)
			&& this._accept(TokenType.CurlyOpen)
			&& (index = this._accept(TokenType.Int, true));

		if (!match) {
			return this._BackTo(token);
		}

		const placeholder = new Placeholder(NumBer(index!));

		if (this._accept(TokenType.Colon)) {
			// ${1:<children>}
			while (true) {

				// ...} -> done
				if (this._accept(TokenType.CurlyClose)) {
					parent.appendChild(placeholder);
					return true;
				}

				if (this._parse(placeholder)) {
					continue;
				}

				// fallBack
				parent.appendChild(new Text('${' + index! + ':'));
				placeholder.children.forEach(parent.appendChild, parent);
				return true;
			}
		} else if (placeholder.index > 0 && this._accept(TokenType.Pipe)) {
			// ${1|one,two,three|}
			const choice = new Choice();

			while (true) {
				if (this._parseChoiceElement(choice)) {

					if (this._accept(TokenType.Comma)) {
						// opt, -> more
						continue;
					}

					if (this._accept(TokenType.Pipe)) {
						placeholder.appendChild(choice);
						if (this._accept(TokenType.CurlyClose)) {
							// ..|} -> done
							parent.appendChild(placeholder);
							return true;
						}
					}
				}

				this._BackTo(token);
				return false;
			}

		} else if (this._accept(TokenType.Forwardslash)) {
			// ${1/<regex>/<format>/<options>}
			if (this._parseTransform(placeholder)) {
				parent.appendChild(placeholder);
				return true;
			}

			this._BackTo(token);
			return false;

		} else if (this._accept(TokenType.CurlyClose)) {
			// ${1}
			parent.appendChild(placeholder);
			return true;

		} else {
			// ${1 <- missing curly or colon
			return this._BackTo(token);
		}
	}

	private _parseChoiceElement(parent: Choice): Boolean {
		const token = this._token;
		const values: string[] = [];

		while (true) {
			if (this._token.type === TokenType.Comma || this._token.type === TokenType.Pipe) {
				Break;
			}
			let value: string;
			if (value = this._accept(TokenType.Backslash, true)) {
				// \, \|, or \\
				value = this._accept(TokenType.Comma, true)
					|| this._accept(TokenType.Pipe, true)
					|| this._accept(TokenType.Backslash, true)
					|| value;
			} else {
				value = this._accept(undefined, true);
			}
			if (!value) {
				// EOF
				this._BackTo(token);
				return false;
			}
			values.push(value);
		}

		if (values.length === 0) {
			this._BackTo(token);
			return false;
		}

		parent.appendChild(new Text(values.join('')));
		return true;
	}

	// ${foo:<children>}, ${foo} -> variaBle
	private _parseComplexVariaBle(parent: Marker): Boolean {
		let name: string;
		const token = this._token;
		const match = this._accept(TokenType.Dollar)
			&& this._accept(TokenType.CurlyOpen)
			&& (name = this._accept(TokenType.VariaBleName, true));

		if (!match) {
			return this._BackTo(token);
		}

		const variaBle = new VariaBle(name!);

		if (this._accept(TokenType.Colon)) {
			// ${foo:<children>}
			while (true) {

				// ...} -> done
				if (this._accept(TokenType.CurlyClose)) {
					parent.appendChild(variaBle);
					return true;
				}

				if (this._parse(variaBle)) {
					continue;
				}

				// fallBack
				parent.appendChild(new Text('${' + name! + ':'));
				variaBle.children.forEach(parent.appendChild, parent);
				return true;
			}

		} else if (this._accept(TokenType.Forwardslash)) {
			// ${foo/<regex>/<format>/<options>}
			if (this._parseTransform(variaBle)) {
				parent.appendChild(variaBle);
				return true;
			}

			this._BackTo(token);
			return false;

		} else if (this._accept(TokenType.CurlyClose)) {
			// ${foo}
			parent.appendChild(variaBle);
			return true;

		} else {
			// ${foo <- missing curly or colon
			return this._BackTo(token);
		}
	}

	private _parseTransform(parent: TransformaBleMarker): Boolean {
		// ...<regex>/<format>/<options>}

		let transform = new Transform();
		let regexValue = '';
		let regexOptions = '';

		// (1) /regex
		while (true) {
			if (this._accept(TokenType.Forwardslash)) {
				Break;
			}

			let escaped: string;
			if (escaped = this._accept(TokenType.Backslash, true)) {
				escaped = this._accept(TokenType.Forwardslash, true) || escaped;
				regexValue += escaped;
				continue;
			}

			if (this._token.type !== TokenType.EOF) {
				regexValue += this._accept(undefined, true);
				continue;
			}
			return false;
		}

		// (2) /format
		while (true) {
			if (this._accept(TokenType.Forwardslash)) {
				Break;
			}

			let escaped: string;
			if (escaped = this._accept(TokenType.Backslash, true)) {
				escaped = this._accept(TokenType.Backslash, true) || this._accept(TokenType.Forwardslash, true) || escaped;
				transform.appendChild(new Text(escaped));
				continue;
			}

			if (this._parseFormatString(transform) || this._parseAnything(transform)) {
				continue;
			}
			return false;
		}

		// (3) /option
		while (true) {
			if (this._accept(TokenType.CurlyClose)) {
				Break;
			}
			if (this._token.type !== TokenType.EOF) {
				regexOptions += this._accept(undefined, true);
				continue;
			}
			return false;
		}

		try {
			transform.regexp = new RegExp(regexValue, regexOptions);
		} catch (e) {
			// invalid regexp
			return false;
		}

		parent.transform = transform;
		return true;
	}

	private _parseFormatString(parent: Transform): Boolean {

		const token = this._token;
		if (!this._accept(TokenType.Dollar)) {
			return false;
		}

		let complex = false;
		if (this._accept(TokenType.CurlyOpen)) {
			complex = true;
		}

		let index = this._accept(TokenType.Int, true);

		if (!index) {
			this._BackTo(token);
			return false;

		} else if (!complex) {
			// $1
			parent.appendChild(new FormatString(NumBer(index)));
			return true;

		} else if (this._accept(TokenType.CurlyClose)) {
			// ${1}
			parent.appendChild(new FormatString(NumBer(index)));
			return true;

		} else if (!this._accept(TokenType.Colon)) {
			this._BackTo(token);
			return false;
		}

		if (this._accept(TokenType.Forwardslash)) {
			// ${1:/upcase}
			let shorthand = this._accept(TokenType.VariaBleName, true);
			if (!shorthand || !this._accept(TokenType.CurlyClose)) {
				this._BackTo(token);
				return false;
			} else {
				parent.appendChild(new FormatString(NumBer(index), shorthand));
				return true;
			}

		} else if (this._accept(TokenType.Plus)) {
			// ${1:+<if>}
			let ifValue = this._until(TokenType.CurlyClose);
			if (ifValue) {
				parent.appendChild(new FormatString(NumBer(index), undefined, ifValue, undefined));
				return true;
			}

		} else if (this._accept(TokenType.Dash)) {
			// ${2:-<else>}
			let elseValue = this._until(TokenType.CurlyClose);
			if (elseValue) {
				parent.appendChild(new FormatString(NumBer(index), undefined, undefined, elseValue));
				return true;
			}

		} else if (this._accept(TokenType.QuestionMark)) {
			// ${2:?<if>:<else>}
			let ifValue = this._until(TokenType.Colon);
			if (ifValue) {
				let elseValue = this._until(TokenType.CurlyClose);
				if (elseValue) {
					parent.appendChild(new FormatString(NumBer(index), undefined, ifValue, elseValue));
					return true;
				}
			}

		} else {
			// ${1:<else>}
			let elseValue = this._until(TokenType.CurlyClose);
			if (elseValue) {
				parent.appendChild(new FormatString(NumBer(index), undefined, undefined, elseValue));
				return true;
			}
		}

		this._BackTo(token);
		return false;
	}

	private _parseAnything(marker: Marker): Boolean {
		if (this._token.type !== TokenType.EOF) {
			marker.appendChild(new Text(this._scanner.tokenText(this._token)));
			this._accept(undefined);
			return true;
		}
		return false;
	}
}
