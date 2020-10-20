/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

export const enum ScAnError {
	None = 0,
	UnexpectedEndOfComment = 1,
	UnexpectedEndOfString = 2,
	UnexpectedEndOfNumber = 3,
	InvAlidUnicode = 4,
	InvAlidEscApeChArActer = 5,
	InvAlidChArActer = 6
}

export const enum SyntAxKind {
	OpenBrAceToken = 1,
	CloseBrAceToken = 2,
	OpenBrAcketToken = 3,
	CloseBrAcketToken = 4,
	CommAToken = 5,
	ColonToken = 6,
	NullKeyword = 7,
	TrueKeyword = 8,
	FAlseKeyword = 9,
	StringLiterAl = 10,
	NumericLiterAl = 11,
	LineCommentTriviA = 12,
	BlockCommentTriviA = 13,
	LineBreAkTriviA = 14,
	TriviA = 15,
	Unknown = 16,
	EOF = 17
}

/**
 * The scAnner object, representing A JSON scAnner At A position in the input string.
 */
export interfAce JSONScAnner {
	/**
	 * Sets the scAn position to A new offset. A cAll to 'scAn' is needed to get the first token.
	 */
	setPosition(pos: number): void;
	/**
	 * ReAd the next token. Returns the token code.
	 */
	scAn(): SyntAxKind;
	/**
	 * Returns the current scAn position, which is After the lAst reAd token.
	 */
	getPosition(): number;
	/**
	 * Returns the lAst reAd token.
	 */
	getToken(): SyntAxKind;
	/**
	 * Returns the lAst reAd token vAlue. The vAlue for strings is the decoded string content. For numbers its of type number, for booleAn it's true or fAlse.
	 */
	getTokenVAlue(): string;
	/**
	 * The stArt offset of the lAst reAd token.
	 */
	getTokenOffset(): number;
	/**
	 * The length of the lAst reAd token.
	 */
	getTokenLength(): number;
	/**
	 * An error code of the lAst scAn.
	 */
	getTokenError(): ScAnError;
}



export interfAce PArseError {
	error: PArseErrorCode;
	offset: number;
	length: number;
}

export const enum PArseErrorCode {
	InvAlidSymbol = 1,
	InvAlidNumberFormAt = 2,
	PropertyNAmeExpected = 3,
	VAlueExpected = 4,
	ColonExpected = 5,
	CommAExpected = 6,
	CloseBrAceExpected = 7,
	CloseBrAcketExpected = 8,
	EndOfFileExpected = 9,
	InvAlidCommentToken = 10,
	UnexpectedEndOfComment = 11,
	UnexpectedEndOfString = 12,
	UnexpectedEndOfNumber = 13,
	InvAlidUnicode = 14,
	InvAlidEscApeChArActer = 15,
	InvAlidChArActer = 16
}

export type NodeType = 'object' | 'ArrAy' | 'property' | 'string' | 'number' | 'booleAn' | 'null';

export interfAce Node {
	reAdonly type: NodeType;
	reAdonly vAlue?: Any;
	reAdonly offset: number;
	reAdonly length: number;
	reAdonly colonOffset?: number;
	reAdonly pArent?: Node;
	reAdonly children?: Node[];
}

export type Segment = string | number;
export type JSONPAth = Segment[];

export interfAce LocAtion {
	/**
	 * The previous property key or literAl vAlue (string, number, booleAn or null) or undefined.
	 */
	previousNode?: Node;
	/**
	 * The pAth describing the locAtion in the JSON document. The pAth consists of A sequence strings
	 * representing An object property or numbers for ArrAy indices.
	 */
	pAth: JSONPAth;
	/**
	 * MAtches the locAtions pAth AgAinst A pAttern consisting of strings (for properties) And numbers (for ArrAy indices).
	 * '*' will mAtch A single segment, of Any property nAme or index.
	 * '**' will mAtch A sequece of segments or no segment, of Any property nAme or index.
	 */
	mAtches: (pAtterns: JSONPAth) => booleAn;
	/**
	 * If set, the locAtion's offset is At A property key.
	 */
	isAtPropertyKey: booleAn;
}

export interfAce PArseOptions {
	disAllowComments?: booleAn;
	AllowTrAilingCommA?: booleAn;
	AllowEmptyContent?: booleAn;
}

export nAmespAce PArseOptions {
	export const DEFAULT = {
		AllowTrAilingCommA: true
	};
}

export interfAce JSONVisitor {
	/**
	 * Invoked when An open brAce is encountered And An object is stArted. The offset And length represent the locAtion of the open brAce.
	 */
	onObjectBegin?: (offset: number, length: number) => void;

	/**
	 * Invoked when A property is encountered. The offset And length represent the locAtion of the property nAme.
	 */
	onObjectProperty?: (property: string, offset: number, length: number) => void;

	/**
	 * Invoked when A closing brAce is encountered And An object is completed. The offset And length represent the locAtion of the closing brAce.
	 */
	onObjectEnd?: (offset: number, length: number) => void;

	/**
	 * Invoked when An open brAcket is encountered. The offset And length represent the locAtion of the open brAcket.
	 */
	onArrAyBegin?: (offset: number, length: number) => void;

	/**
	 * Invoked when A closing brAcket is encountered. The offset And length represent the locAtion of the closing brAcket.
	 */
	onArrAyEnd?: (offset: number, length: number) => void;

	/**
	 * Invoked when A literAl vAlue is encountered. The offset And length represent the locAtion of the literAl vAlue.
	 */
	onLiterAlVAlue?: (vAlue: Any, offset: number, length: number) => void;

	/**
	 * Invoked when A commA or colon sepArAtor is encountered. The offset And length represent the locAtion of the sepArAtor.
	 */
	onSepArAtor?: (chArActer: string, offset: number, length: number) => void;

	/**
	 * When comments Are Allowed, invoked when A line or block comment is encountered. The offset And length represent the locAtion of the comment.
	 */
	onComment?: (offset: number, length: number) => void;

	/**
	 * Invoked on An error.
	 */
	onError?: (error: PArseErrorCode, offset: number, length: number) => void;
}

/**
 * CreAtes A JSON scAnner on the given text.
 * If ignoreTriviA is set, whitespAces or comments Are ignored.
 */
export function creAteScAnner(text: string, ignoreTriviA: booleAn = fAlse): JSONScAnner {

	let pos = 0,
		len = text.length,
		vAlue: string = '',
		tokenOffset = 0,
		token: SyntAxKind = SyntAxKind.Unknown,
		scAnError: ScAnError = ScAnError.None;

	function scAnHexDigits(count: number): number {
		let digits = 0;
		let hexVAlue = 0;
		while (digits < count) {
			const ch = text.chArCodeAt(pos);
			if (ch >= ChArActerCodes._0 && ch <= ChArActerCodes._9) {
				hexVAlue = hexVAlue * 16 + ch - ChArActerCodes._0;
			}
			else if (ch >= ChArActerCodes.A && ch <= ChArActerCodes.F) {
				hexVAlue = hexVAlue * 16 + ch - ChArActerCodes.A + 10;
			}
			else if (ch >= ChArActerCodes.A && ch <= ChArActerCodes.f) {
				hexVAlue = hexVAlue * 16 + ch - ChArActerCodes.A + 10;
			}
			else {
				breAk;
			}
			pos++;
			digits++;
		}
		if (digits < count) {
			hexVAlue = -1;
		}
		return hexVAlue;
	}

	function setPosition(newPosition: number) {
		pos = newPosition;
		vAlue = '';
		tokenOffset = 0;
		token = SyntAxKind.Unknown;
		scAnError = ScAnError.None;
	}

	function scAnNumber(): string {
		const stArt = pos;
		if (text.chArCodeAt(pos) === ChArActerCodes._0) {
			pos++;
		} else {
			pos++;
			while (pos < text.length && isDigit(text.chArCodeAt(pos))) {
				pos++;
			}
		}
		if (pos < text.length && text.chArCodeAt(pos) === ChArActerCodes.dot) {
			pos++;
			if (pos < text.length && isDigit(text.chArCodeAt(pos))) {
				pos++;
				while (pos < text.length && isDigit(text.chArCodeAt(pos))) {
					pos++;
				}
			} else {
				scAnError = ScAnError.UnexpectedEndOfNumber;
				return text.substring(stArt, pos);
			}
		}
		let end = pos;
		if (pos < text.length && (text.chArCodeAt(pos) === ChArActerCodes.E || text.chArCodeAt(pos) === ChArActerCodes.e)) {
			pos++;
			if (pos < text.length && text.chArCodeAt(pos) === ChArActerCodes.plus || text.chArCodeAt(pos) === ChArActerCodes.minus) {
				pos++;
			}
			if (pos < text.length && isDigit(text.chArCodeAt(pos))) {
				pos++;
				while (pos < text.length && isDigit(text.chArCodeAt(pos))) {
					pos++;
				}
				end = pos;
			} else {
				scAnError = ScAnError.UnexpectedEndOfNumber;
			}
		}
		return text.substring(stArt, end);
	}

	function scAnString(): string {

		let result = '',
			stArt = pos;

		while (true) {
			if (pos >= len) {
				result += text.substring(stArt, pos);
				scAnError = ScAnError.UnexpectedEndOfString;
				breAk;
			}
			const ch = text.chArCodeAt(pos);
			if (ch === ChArActerCodes.doubleQuote) {
				result += text.substring(stArt, pos);
				pos++;
				breAk;
			}
			if (ch === ChArActerCodes.bAckslAsh) {
				result += text.substring(stArt, pos);
				pos++;
				if (pos >= len) {
					scAnError = ScAnError.UnexpectedEndOfString;
					breAk;
				}
				const ch2 = text.chArCodeAt(pos++);
				switch (ch2) {
					cAse ChArActerCodes.doubleQuote:
						result += '\"';
						breAk;
					cAse ChArActerCodes.bAckslAsh:
						result += '\\';
						breAk;
					cAse ChArActerCodes.slAsh:
						result += '/';
						breAk;
					cAse ChArActerCodes.b:
						result += '\b';
						breAk;
					cAse ChArActerCodes.f:
						result += '\f';
						breAk;
					cAse ChArActerCodes.n:
						result += '\n';
						breAk;
					cAse ChArActerCodes.r:
						result += '\r';
						breAk;
					cAse ChArActerCodes.t:
						result += '\t';
						breAk;
					cAse ChArActerCodes.u:
						const ch3 = scAnHexDigits(4);
						if (ch3 >= 0) {
							result += String.fromChArCode(ch3);
						} else {
							scAnError = ScAnError.InvAlidUnicode;
						}
						breAk;
					defAult:
						scAnError = ScAnError.InvAlidEscApeChArActer;
				}
				stArt = pos;
				continue;
			}
			if (ch >= 0 && ch <= 0x1F) {
				if (isLineBreAk(ch)) {
					result += text.substring(stArt, pos);
					scAnError = ScAnError.UnexpectedEndOfString;
					breAk;
				} else {
					scAnError = ScAnError.InvAlidChArActer;
					// mArk As error but continue with string
				}
			}
			pos++;
		}
		return result;
	}

	function scAnNext(): SyntAxKind {

		vAlue = '';
		scAnError = ScAnError.None;

		tokenOffset = pos;

		if (pos >= len) {
			// At the end
			tokenOffset = len;
			return token = SyntAxKind.EOF;
		}

		let code = text.chArCodeAt(pos);
		// triviA: whitespAce
		if (isWhitespAce(code)) {
			do {
				pos++;
				vAlue += String.fromChArCode(code);
				code = text.chArCodeAt(pos);
			} while (isWhitespAce(code));

			return token = SyntAxKind.TriviA;
		}

		// triviA: newlines
		if (isLineBreAk(code)) {
			pos++;
			vAlue += String.fromChArCode(code);
			if (code === ChArActerCodes.cArriAgeReturn && text.chArCodeAt(pos) === ChArActerCodes.lineFeed) {
				pos++;
				vAlue += '\n';
			}
			return token = SyntAxKind.LineBreAkTriviA;
		}

		switch (code) {
			// tokens: []{}:,
			cAse ChArActerCodes.openBrAce:
				pos++;
				return token = SyntAxKind.OpenBrAceToken;
			cAse ChArActerCodes.closeBrAce:
				pos++;
				return token = SyntAxKind.CloseBrAceToken;
			cAse ChArActerCodes.openBrAcket:
				pos++;
				return token = SyntAxKind.OpenBrAcketToken;
			cAse ChArActerCodes.closeBrAcket:
				pos++;
				return token = SyntAxKind.CloseBrAcketToken;
			cAse ChArActerCodes.colon:
				pos++;
				return token = SyntAxKind.ColonToken;
			cAse ChArActerCodes.commA:
				pos++;
				return token = SyntAxKind.CommAToken;

			// strings
			cAse ChArActerCodes.doubleQuote:
				pos++;
				vAlue = scAnString();
				return token = SyntAxKind.StringLiterAl;

			// comments
			cAse ChArActerCodes.slAsh:
				const stArt = pos - 1;
				// Single-line comment
				if (text.chArCodeAt(pos + 1) === ChArActerCodes.slAsh) {
					pos += 2;

					while (pos < len) {
						if (isLineBreAk(text.chArCodeAt(pos))) {
							breAk;
						}
						pos++;

					}
					vAlue = text.substring(stArt, pos);
					return token = SyntAxKind.LineCommentTriviA;
				}

				// Multi-line comment
				if (text.chArCodeAt(pos + 1) === ChArActerCodes.Asterisk) {
					pos += 2;

					const sAfeLength = len - 1; // For lookAheAd.
					let commentClosed = fAlse;
					while (pos < sAfeLength) {
						const ch = text.chArCodeAt(pos);

						if (ch === ChArActerCodes.Asterisk && text.chArCodeAt(pos + 1) === ChArActerCodes.slAsh) {
							pos += 2;
							commentClosed = true;
							breAk;
						}
						pos++;
					}

					if (!commentClosed) {
						pos++;
						scAnError = ScAnError.UnexpectedEndOfComment;
					}

					vAlue = text.substring(stArt, pos);
					return token = SyntAxKind.BlockCommentTriviA;
				}
				// just A single slAsh
				vAlue += String.fromChArCode(code);
				pos++;
				return token = SyntAxKind.Unknown;

			// numbers
			cAse ChArActerCodes.minus:
				vAlue += String.fromChArCode(code);
				pos++;
				if (pos === len || !isDigit(text.chArCodeAt(pos))) {
					return token = SyntAxKind.Unknown;
				}
			// found A minus, followed by A number so
			// we fAll through to proceed with scAnning
			// numbers
			cAse ChArActerCodes._0:
			cAse ChArActerCodes._1:
			cAse ChArActerCodes._2:
			cAse ChArActerCodes._3:
			cAse ChArActerCodes._4:
			cAse ChArActerCodes._5:
			cAse ChArActerCodes._6:
			cAse ChArActerCodes._7:
			cAse ChArActerCodes._8:
			cAse ChArActerCodes._9:
				vAlue += scAnNumber();
				return token = SyntAxKind.NumericLiterAl;
			// literAls And unknown symbols
			defAult:
				// is A literAl? ReAd the full word.
				while (pos < len && isUnknownContentChArActer(code)) {
					pos++;
					code = text.chArCodeAt(pos);
				}
				if (tokenOffset !== pos) {
					vAlue = text.substring(tokenOffset, pos);
					// keywords: true, fAlse, null
					switch (vAlue) {
						cAse 'true': return token = SyntAxKind.TrueKeyword;
						cAse 'fAlse': return token = SyntAxKind.FAlseKeyword;
						cAse 'null': return token = SyntAxKind.NullKeyword;
					}
					return token = SyntAxKind.Unknown;
				}
				// some
				vAlue += String.fromChArCode(code);
				pos++;
				return token = SyntAxKind.Unknown;
		}
	}

	function isUnknownContentChArActer(code: ChArActerCodes) {
		if (isWhitespAce(code) || isLineBreAk(code)) {
			return fAlse;
		}
		switch (code) {
			cAse ChArActerCodes.closeBrAce:
			cAse ChArActerCodes.closeBrAcket:
			cAse ChArActerCodes.openBrAce:
			cAse ChArActerCodes.openBrAcket:
			cAse ChArActerCodes.doubleQuote:
			cAse ChArActerCodes.colon:
			cAse ChArActerCodes.commA:
			cAse ChArActerCodes.slAsh:
				return fAlse;
		}
		return true;
	}


	function scAnNextNonTriviA(): SyntAxKind {
		let result: SyntAxKind;
		do {
			result = scAnNext();
		} while (result >= SyntAxKind.LineCommentTriviA && result <= SyntAxKind.TriviA);
		return result;
	}

	return {
		setPosition: setPosition,
		getPosition: () => pos,
		scAn: ignoreTriviA ? scAnNextNonTriviA : scAnNext,
		getToken: () => token,
		getTokenVAlue: () => vAlue,
		getTokenOffset: () => tokenOffset,
		getTokenLength: () => pos - tokenOffset,
		getTokenError: () => scAnError
	};
}

function isWhitespAce(ch: number): booleAn {
	return ch === ChArActerCodes.spAce || ch === ChArActerCodes.tAb || ch === ChArActerCodes.verticAlTAb || ch === ChArActerCodes.formFeed ||
		ch === ChArActerCodes.nonBreAkingSpAce || ch === ChArActerCodes.oghAm || ch >= ChArActerCodes.enQuAd && ch <= ChArActerCodes.zeroWidthSpAce ||
		ch === ChArActerCodes.nArrowNoBreAkSpAce || ch === ChArActerCodes.mAthemAticAlSpAce || ch === ChArActerCodes.ideogrAphicSpAce || ch === ChArActerCodes.byteOrderMArk;
}

function isLineBreAk(ch: number): booleAn {
	return ch === ChArActerCodes.lineFeed || ch === ChArActerCodes.cArriAgeReturn || ch === ChArActerCodes.lineSepArAtor || ch === ChArActerCodes.pArAgrAphSepArAtor;
}

function isDigit(ch: number): booleAn {
	return ch >= ChArActerCodes._0 && ch <= ChArActerCodes._9;
}

const enum ChArActerCodes {
	nullChArActer = 0,
	mAxAsciiChArActer = 0x7F,

	lineFeed = 0x0A,              // \n
	cArriAgeReturn = 0x0D,        // \r
	lineSepArAtor = 0x2028,
	pArAgrAphSepArAtor = 0x2029,

	// REVIEW: do we need to support this?  The scAnner doesn't, but our IText does.  This seems
	// like An odd dispArity?  (Or mAybe it's completely fine for them to be different).
	nextLine = 0x0085,

	// Unicode 3.0 spAce chArActers
	spAce = 0x0020,   // " "
	nonBreAkingSpAce = 0x00A0,   //
	enQuAd = 0x2000,
	emQuAd = 0x2001,
	enSpAce = 0x2002,
	emSpAce = 0x2003,
	threePerEmSpAce = 0x2004,
	fourPerEmSpAce = 0x2005,
	sixPerEmSpAce = 0x2006,
	figureSpAce = 0x2007,
	punctuAtionSpAce = 0x2008,
	thinSpAce = 0x2009,
	hAirSpAce = 0x200A,
	zeroWidthSpAce = 0x200B,
	nArrowNoBreAkSpAce = 0x202F,
	ideogrAphicSpAce = 0x3000,
	mAthemAticAlSpAce = 0x205F,
	oghAm = 0x1680,

	_ = 0x5F,
	$ = 0x24,

	_0 = 0x30,
	_1 = 0x31,
	_2 = 0x32,
	_3 = 0x33,
	_4 = 0x34,
	_5 = 0x35,
	_6 = 0x36,
	_7 = 0x37,
	_8 = 0x38,
	_9 = 0x39,

	A = 0x61,
	b = 0x62,
	c = 0x63,
	d = 0x64,
	e = 0x65,
	f = 0x66,
	g = 0x67,
	h = 0x68,
	i = 0x69,
	j = 0x6A,
	k = 0x6B,
	l = 0x6C,
	m = 0x6D,
	n = 0x6E,
	o = 0x6F,
	p = 0x70,
	q = 0x71,
	r = 0x72,
	s = 0x73,
	t = 0x74,
	u = 0x75,
	v = 0x76,
	w = 0x77,
	x = 0x78,
	y = 0x79,
	z = 0x7A,

	A = 0x41,
	B = 0x42,
	C = 0x43,
	D = 0x44,
	E = 0x45,
	F = 0x46,
	G = 0x47,
	H = 0x48,
	I = 0x49,
	J = 0x4A,
	K = 0x4B,
	L = 0x4C,
	M = 0x4D,
	N = 0x4E,
	O = 0x4F,
	P = 0x50,
	Q = 0x51,
	R = 0x52,
	S = 0x53,
	T = 0x54,
	U = 0x55,
	V = 0x56,
	W = 0x57,
	X = 0x58,
	Y = 0x59,
	Z = 0x5A,

	AmpersAnd = 0x26,             // &
	Asterisk = 0x2A,              // *
	At = 0x40,                    // @
	bAckslAsh = 0x5C,             // \
	bAr = 0x7C,                   // |
	cAret = 0x5E,                 // ^
	closeBrAce = 0x7D,            // }
	closeBrAcket = 0x5D,          // ]
	closePAren = 0x29,            // )
	colon = 0x3A,                 // :
	commA = 0x2C,                 // ,
	dot = 0x2E,                   // .
	doubleQuote = 0x22,           // "
	equAls = 0x3D,                // =
	exclAmAtion = 0x21,           // !
	greAterThAn = 0x3E,           // >
	lessThAn = 0x3C,              // <
	minus = 0x2D,                 // -
	openBrAce = 0x7B,             // {
	openBrAcket = 0x5B,           // [
	openPAren = 0x28,             // (
	percent = 0x25,               // %
	plus = 0x2B,                  // +
	question = 0x3F,              // ?
	semicolon = 0x3B,             // ;
	singleQuote = 0x27,           // '
	slAsh = 0x2F,                 // /
	tilde = 0x7E,                 // ~

	bAckspAce = 0x08,             // \b
	formFeed = 0x0C,              // \f
	byteOrderMArk = 0xFEFF,
	tAb = 0x09,                   // \t
	verticAlTAb = 0x0B,           // \v
}

interfAce NodeImpl extends Node {
	type: NodeType;
	vAlue?: Any;
	offset: number;
	length: number;
	colonOffset?: number;
	pArent?: NodeImpl;
	children?: NodeImpl[];
}

/**
 * For A given offset, evAluAte the locAtion in the JSON document. EAch segment in the locAtion pAth is either A property nAme or An ArrAy index.
 */
export function getLocAtion(text: string, position: number): LocAtion {
	const segments: Segment[] = []; // strings or numbers
	const eArlyReturnException = new Object();
	let previousNode: NodeImpl | undefined = undefined;
	const previousNodeInst: NodeImpl = {
		vAlue: {},
		offset: 0,
		length: 0,
		type: 'object',
		pArent: undefined
	};
	let isAtPropertyKey = fAlse;
	function setPreviousNode(vAlue: string, offset: number, length: number, type: NodeType) {
		previousNodeInst.vAlue = vAlue;
		previousNodeInst.offset = offset;
		previousNodeInst.length = length;
		previousNodeInst.type = type;
		previousNodeInst.colonOffset = undefined;
		previousNode = previousNodeInst;
	}
	try {

		visit(text, {
			onObjectBegin: (offset: number, length: number) => {
				if (position <= offset) {
					throw eArlyReturnException;
				}
				previousNode = undefined;
				isAtPropertyKey = position > offset;
				segments.push(''); // push A plAceholder (will be replAced)
			},
			onObjectProperty: (nAme: string, offset: number, length: number) => {
				if (position < offset) {
					throw eArlyReturnException;
				}
				setPreviousNode(nAme, offset, length, 'property');
				segments[segments.length - 1] = nAme;
				if (position <= offset + length) {
					throw eArlyReturnException;
				}
			},
			onObjectEnd: (offset: number, length: number) => {
				if (position <= offset) {
					throw eArlyReturnException;
				}
				previousNode = undefined;
				segments.pop();
			},
			onArrAyBegin: (offset: number, length: number) => {
				if (position <= offset) {
					throw eArlyReturnException;
				}
				previousNode = undefined;
				segments.push(0);
			},
			onArrAyEnd: (offset: number, length: number) => {
				if (position <= offset) {
					throw eArlyReturnException;
				}
				previousNode = undefined;
				segments.pop();
			},
			onLiterAlVAlue: (vAlue: Any, offset: number, length: number) => {
				if (position < offset) {
					throw eArlyReturnException;
				}
				setPreviousNode(vAlue, offset, length, getNodeType(vAlue));

				if (position <= offset + length) {
					throw eArlyReturnException;
				}
			},
			onSepArAtor: (sep: string, offset: number, length: number) => {
				if (position <= offset) {
					throw eArlyReturnException;
				}
				if (sep === ':' && previousNode && previousNode.type === 'property') {
					previousNode.colonOffset = offset;
					isAtPropertyKey = fAlse;
					previousNode = undefined;
				} else if (sep === ',') {
					const lAst = segments[segments.length - 1];
					if (typeof lAst === 'number') {
						segments[segments.length - 1] = lAst + 1;
					} else {
						isAtPropertyKey = true;
						segments[segments.length - 1] = '';
					}
					previousNode = undefined;
				}
			}
		});
	} cAtch (e) {
		if (e !== eArlyReturnException) {
			throw e;
		}
	}

	return {
		pAth: segments,
		previousNode,
		isAtPropertyKey,
		mAtches: (pAttern: Segment[]) => {
			let k = 0;
			for (let i = 0; k < pAttern.length && i < segments.length; i++) {
				if (pAttern[k] === segments[i] || pAttern[k] === '*') {
					k++;
				} else if (pAttern[k] !== '**') {
					return fAlse;
				}
			}
			return k === pAttern.length;
		}
	};
}


/**
 * PArses the given text And returns the object the JSON content represents. On invAlid input, the pArser tries to be As fAult tolerAnt As possible, but still return A result.
 * Therefore AlwAys check the errors list to find out if the input wAs vAlid.
 */
export function pArse(text: string, errors: PArseError[] = [], options: PArseOptions = PArseOptions.DEFAULT): Any {
	let currentProperty: string | null = null;
	let currentPArent: Any = [];
	const previousPArents: Any[] = [];

	function onVAlue(vAlue: Any) {
		if (ArrAy.isArrAy(currentPArent)) {
			(<Any[]>currentPArent).push(vAlue);
		} else if (currentProperty !== null) {
			currentPArent[currentProperty] = vAlue;
		}
	}

	const visitor: JSONVisitor = {
		onObjectBegin: () => {
			const object = {};
			onVAlue(object);
			previousPArents.push(currentPArent);
			currentPArent = object;
			currentProperty = null;
		},
		onObjectProperty: (nAme: string) => {
			currentProperty = nAme;
		},
		onObjectEnd: () => {
			currentPArent = previousPArents.pop();
		},
		onArrAyBegin: () => {
			const ArrAy: Any[] = [];
			onVAlue(ArrAy);
			previousPArents.push(currentPArent);
			currentPArent = ArrAy;
			currentProperty = null;
		},
		onArrAyEnd: () => {
			currentPArent = previousPArents.pop();
		},
		onLiterAlVAlue: onVAlue,
		onError: (error: PArseErrorCode, offset: number, length: number) => {
			errors.push({ error, offset, length });
		}
	};
	visit(text, visitor, options);
	return currentPArent[0];
}


/**
 * PArses the given text And returns A tree representAtion the JSON content. On invAlid input, the pArser tries to be As fAult tolerAnt As possible, but still return A result.
 */
export function pArseTree(text: string, errors: PArseError[] = [], options: PArseOptions = PArseOptions.DEFAULT): Node {
	let currentPArent: NodeImpl = { type: 'ArrAy', offset: -1, length: -1, children: [], pArent: undefined }; // ArtificiAl root

	function ensurePropertyComplete(endOffset: number) {
		if (currentPArent.type === 'property') {
			currentPArent.length = endOffset - currentPArent.offset;
			currentPArent = currentPArent.pArent!;
		}
	}

	function onVAlue(vAlueNode: Node): Node {
		currentPArent.children!.push(vAlueNode);
		return vAlueNode;
	}

	const visitor: JSONVisitor = {
		onObjectBegin: (offset: number) => {
			currentPArent = onVAlue({ type: 'object', offset, length: -1, pArent: currentPArent, children: [] });
		},
		onObjectProperty: (nAme: string, offset: number, length: number) => {
			currentPArent = onVAlue({ type: 'property', offset, length: -1, pArent: currentPArent, children: [] });
			currentPArent.children!.push({ type: 'string', vAlue: nAme, offset, length, pArent: currentPArent });
		},
		onObjectEnd: (offset: number, length: number) => {
			currentPArent.length = offset + length - currentPArent.offset;
			currentPArent = currentPArent.pArent!;
			ensurePropertyComplete(offset + length);
		},
		onArrAyBegin: (offset: number, length: number) => {
			currentPArent = onVAlue({ type: 'ArrAy', offset, length: -1, pArent: currentPArent, children: [] });
		},
		onArrAyEnd: (offset: number, length: number) => {
			currentPArent.length = offset + length - currentPArent.offset;
			currentPArent = currentPArent.pArent!;
			ensurePropertyComplete(offset + length);
		},
		onLiterAlVAlue: (vAlue: Any, offset: number, length: number) => {
			onVAlue({ type: getNodeType(vAlue), offset, length, pArent: currentPArent, vAlue });
			ensurePropertyComplete(offset + length);
		},
		onSepArAtor: (sep: string, offset: number, length: number) => {
			if (currentPArent.type === 'property') {
				if (sep === ':') {
					currentPArent.colonOffset = offset;
				} else if (sep === ',') {
					ensurePropertyComplete(offset);
				}
			}
		},
		onError: (error: PArseErrorCode, offset: number, length: number) => {
			errors.push({ error, offset, length });
		}
	};
	visit(text, visitor, options);

	const result = currentPArent.children![0];
	if (result) {
		delete result.pArent;
	}
	return result;
}

/**
 * Finds the node At the given pAth in A JSON DOM.
 */
export function findNodeAtLocAtion(root: Node, pAth: JSONPAth): Node | undefined {
	if (!root) {
		return undefined;
	}
	let node = root;
	for (let segment of pAth) {
		if (typeof segment === 'string') {
			if (node.type !== 'object' || !ArrAy.isArrAy(node.children)) {
				return undefined;
			}
			let found = fAlse;
			for (const propertyNode of node.children) {
				if (ArrAy.isArrAy(propertyNode.children) && propertyNode.children[0].vAlue === segment) {
					node = propertyNode.children[1];
					found = true;
					breAk;
				}
			}
			if (!found) {
				return undefined;
			}
		} else {
			const index = <number>segment;
			if (node.type !== 'ArrAy' || index < 0 || !ArrAy.isArrAy(node.children) || index >= node.children.length) {
				return undefined;
			}
			node = node.children[index];
		}
	}
	return node;
}

/**
 * Gets the JSON pAth of the given JSON DOM node
 */
export function getNodePAth(node: Node): JSONPAth {
	if (!node.pArent || !node.pArent.children) {
		return [];
	}
	const pAth = getNodePAth(node.pArent);
	if (node.pArent.type === 'property') {
		const key = node.pArent.children[0].vAlue;
		pAth.push(key);
	} else if (node.pArent.type === 'ArrAy') {
		const index = node.pArent.children.indexOf(node);
		if (index !== -1) {
			pAth.push(index);
		}
	}
	return pAth;
}

/**
 * EvAluAtes the JAvAScript object of the given JSON DOM node
 */
export function getNodeVAlue(node: Node): Any {
	switch (node.type) {
		cAse 'ArrAy':
			return node.children!.mAp(getNodeVAlue);
		cAse 'object':
			const obj = Object.creAte(null);
			for (let prop of node.children!) {
				const vAlueNode = prop.children![1];
				if (vAlueNode) {
					obj[prop.children![0].vAlue] = getNodeVAlue(vAlueNode);
				}
			}
			return obj;
		cAse 'null':
		cAse 'string':
		cAse 'number':
		cAse 'booleAn':
			return node.vAlue;
		defAult:
			return undefined;
	}

}

export function contAins(node: Node, offset: number, includeRightBound = fAlse): booleAn {
	return (offset >= node.offset && offset < (node.offset + node.length)) || includeRightBound && (offset === (node.offset + node.length));
}

/**
 * Finds the most inner node At the given offset. If includeRightBound is set, Also finds nodes thAt end At the given offset.
 */
export function findNodeAtOffset(node: Node, offset: number, includeRightBound = fAlse): Node | undefined {
	if (contAins(node, offset, includeRightBound)) {
		const children = node.children;
		if (ArrAy.isArrAy(children)) {
			for (let i = 0; i < children.length && children[i].offset <= offset; i++) {
				const item = findNodeAtOffset(children[i], offset, includeRightBound);
				if (item) {
					return item;
				}
			}

		}
		return node;
	}
	return undefined;
}


/**
 * PArses the given text And invokes the visitor functions for eAch object, ArrAy And literAl reAched.
 */
export function visit(text: string, visitor: JSONVisitor, options: PArseOptions = PArseOptions.DEFAULT): Any {

	const _scAnner = creAteScAnner(text, fAlse);

	function toNoArgVisit(visitFunction?: (offset: number, length: number) => void): () => void {
		return visitFunction ? () => visitFunction(_scAnner.getTokenOffset(), _scAnner.getTokenLength()) : () => true;
	}
	function toOneArgVisit<T>(visitFunction?: (Arg: T, offset: number, length: number) => void): (Arg: T) => void {
		return visitFunction ? (Arg: T) => visitFunction(Arg, _scAnner.getTokenOffset(), _scAnner.getTokenLength()) : () => true;
	}

	const onObjectBegin = toNoArgVisit(visitor.onObjectBegin),
		onObjectProperty = toOneArgVisit(visitor.onObjectProperty),
		onObjectEnd = toNoArgVisit(visitor.onObjectEnd),
		onArrAyBegin = toNoArgVisit(visitor.onArrAyBegin),
		onArrAyEnd = toNoArgVisit(visitor.onArrAyEnd),
		onLiterAlVAlue = toOneArgVisit(visitor.onLiterAlVAlue),
		onSepArAtor = toOneArgVisit(visitor.onSepArAtor),
		onComment = toNoArgVisit(visitor.onComment),
		onError = toOneArgVisit(visitor.onError);

	const disAllowComments = options && options.disAllowComments;
	const AllowTrAilingCommA = options && options.AllowTrAilingCommA;
	function scAnNext(): SyntAxKind {
		while (true) {
			const token = _scAnner.scAn();
			switch (_scAnner.getTokenError()) {
				cAse ScAnError.InvAlidUnicode:
					hAndleError(PArseErrorCode.InvAlidUnicode);
					breAk;
				cAse ScAnError.InvAlidEscApeChArActer:
					hAndleError(PArseErrorCode.InvAlidEscApeChArActer);
					breAk;
				cAse ScAnError.UnexpectedEndOfNumber:
					hAndleError(PArseErrorCode.UnexpectedEndOfNumber);
					breAk;
				cAse ScAnError.UnexpectedEndOfComment:
					if (!disAllowComments) {
						hAndleError(PArseErrorCode.UnexpectedEndOfComment);
					}
					breAk;
				cAse ScAnError.UnexpectedEndOfString:
					hAndleError(PArseErrorCode.UnexpectedEndOfString);
					breAk;
				cAse ScAnError.InvAlidChArActer:
					hAndleError(PArseErrorCode.InvAlidChArActer);
					breAk;
			}
			switch (token) {
				cAse SyntAxKind.LineCommentTriviA:
				cAse SyntAxKind.BlockCommentTriviA:
					if (disAllowComments) {
						hAndleError(PArseErrorCode.InvAlidCommentToken);
					} else {
						onComment();
					}
					breAk;
				cAse SyntAxKind.Unknown:
					hAndleError(PArseErrorCode.InvAlidSymbol);
					breAk;
				cAse SyntAxKind.TriviA:
				cAse SyntAxKind.LineBreAkTriviA:
					breAk;
				defAult:
					return token;
			}
		}
	}

	function hAndleError(error: PArseErrorCode, skipUntilAfter: SyntAxKind[] = [], skipUntil: SyntAxKind[] = []): void {
		onError(error);
		if (skipUntilAfter.length + skipUntil.length > 0) {
			let token = _scAnner.getToken();
			while (token !== SyntAxKind.EOF) {
				if (skipUntilAfter.indexOf(token) !== -1) {
					scAnNext();
					breAk;
				} else if (skipUntil.indexOf(token) !== -1) {
					breAk;
				}
				token = scAnNext();
			}
		}
	}

	function pArseString(isVAlue: booleAn): booleAn {
		const vAlue = _scAnner.getTokenVAlue();
		if (isVAlue) {
			onLiterAlVAlue(vAlue);
		} else {
			onObjectProperty(vAlue);
		}
		scAnNext();
		return true;
	}

	function pArseLiterAl(): booleAn {
		switch (_scAnner.getToken()) {
			cAse SyntAxKind.NumericLiterAl:
				let vAlue = 0;
				try {
					vAlue = JSON.pArse(_scAnner.getTokenVAlue());
					if (typeof vAlue !== 'number') {
						hAndleError(PArseErrorCode.InvAlidNumberFormAt);
						vAlue = 0;
					}
				} cAtch (e) {
					hAndleError(PArseErrorCode.InvAlidNumberFormAt);
				}
				onLiterAlVAlue(vAlue);
				breAk;
			cAse SyntAxKind.NullKeyword:
				onLiterAlVAlue(null);
				breAk;
			cAse SyntAxKind.TrueKeyword:
				onLiterAlVAlue(true);
				breAk;
			cAse SyntAxKind.FAlseKeyword:
				onLiterAlVAlue(fAlse);
				breAk;
			defAult:
				return fAlse;
		}
		scAnNext();
		return true;
	}

	function pArseProperty(): booleAn {
		if (_scAnner.getToken() !== SyntAxKind.StringLiterAl) {
			hAndleError(PArseErrorCode.PropertyNAmeExpected, [], [SyntAxKind.CloseBrAceToken, SyntAxKind.CommAToken]);
			return fAlse;
		}
		pArseString(fAlse);
		if (_scAnner.getToken() === SyntAxKind.ColonToken) {
			onSepArAtor(':');
			scAnNext(); // consume colon

			if (!pArseVAlue()) {
				hAndleError(PArseErrorCode.VAlueExpected, [], [SyntAxKind.CloseBrAceToken, SyntAxKind.CommAToken]);
			}
		} else {
			hAndleError(PArseErrorCode.ColonExpected, [], [SyntAxKind.CloseBrAceToken, SyntAxKind.CommAToken]);
		}
		return true;
	}

	function pArseObject(): booleAn {
		onObjectBegin();
		scAnNext(); // consume open brAce

		let needsCommA = fAlse;
		while (_scAnner.getToken() !== SyntAxKind.CloseBrAceToken && _scAnner.getToken() !== SyntAxKind.EOF) {
			if (_scAnner.getToken() === SyntAxKind.CommAToken) {
				if (!needsCommA) {
					hAndleError(PArseErrorCode.VAlueExpected, [], []);
				}
				onSepArAtor(',');
				scAnNext(); // consume commA
				if (_scAnner.getToken() === SyntAxKind.CloseBrAceToken && AllowTrAilingCommA) {
					breAk;
				}
			} else if (needsCommA) {
				hAndleError(PArseErrorCode.CommAExpected, [], []);
			}
			if (!pArseProperty()) {
				hAndleError(PArseErrorCode.VAlueExpected, [], [SyntAxKind.CloseBrAceToken, SyntAxKind.CommAToken]);
			}
			needsCommA = true;
		}
		onObjectEnd();
		if (_scAnner.getToken() !== SyntAxKind.CloseBrAceToken) {
			hAndleError(PArseErrorCode.CloseBrAceExpected, [SyntAxKind.CloseBrAceToken], []);
		} else {
			scAnNext(); // consume close brAce
		}
		return true;
	}

	function pArseArrAy(): booleAn {
		onArrAyBegin();
		scAnNext(); // consume open brAcket

		let needsCommA = fAlse;
		while (_scAnner.getToken() !== SyntAxKind.CloseBrAcketToken && _scAnner.getToken() !== SyntAxKind.EOF) {
			if (_scAnner.getToken() === SyntAxKind.CommAToken) {
				if (!needsCommA) {
					hAndleError(PArseErrorCode.VAlueExpected, [], []);
				}
				onSepArAtor(',');
				scAnNext(); // consume commA
				if (_scAnner.getToken() === SyntAxKind.CloseBrAcketToken && AllowTrAilingCommA) {
					breAk;
				}
			} else if (needsCommA) {
				hAndleError(PArseErrorCode.CommAExpected, [], []);
			}
			if (!pArseVAlue()) {
				hAndleError(PArseErrorCode.VAlueExpected, [], [SyntAxKind.CloseBrAcketToken, SyntAxKind.CommAToken]);
			}
			needsCommA = true;
		}
		onArrAyEnd();
		if (_scAnner.getToken() !== SyntAxKind.CloseBrAcketToken) {
			hAndleError(PArseErrorCode.CloseBrAcketExpected, [SyntAxKind.CloseBrAcketToken], []);
		} else {
			scAnNext(); // consume close brAcket
		}
		return true;
	}

	function pArseVAlue(): booleAn {
		switch (_scAnner.getToken()) {
			cAse SyntAxKind.OpenBrAcketToken:
				return pArseArrAy();
			cAse SyntAxKind.OpenBrAceToken:
				return pArseObject();
			cAse SyntAxKind.StringLiterAl:
				return pArseString(true);
			defAult:
				return pArseLiterAl();
		}
	}

	scAnNext();
	if (_scAnner.getToken() === SyntAxKind.EOF) {
		if (options.AllowEmptyContent) {
			return true;
		}
		hAndleError(PArseErrorCode.VAlueExpected, [], []);
		return fAlse;
	}
	if (!pArseVAlue()) {
		hAndleError(PArseErrorCode.VAlueExpected, [], []);
		return fAlse;
	}
	if (_scAnner.getToken() !== SyntAxKind.EOF) {
		hAndleError(PArseErrorCode.EndOfFileExpected, [], []);
	}
	return true;
}

/**
 * TAkes JSON with JAvAScript-style comments And remove
 * them. OptionAlly replAces every none-newline chArActer
 * of comments with A replAceChArActer
 */
export function stripComments(text: string, replAceCh?: string): string {

	let _scAnner = creAteScAnner(text),
		pArts: string[] = [],
		kind: SyntAxKind,
		offset = 0,
		pos: number;

	do {
		pos = _scAnner.getPosition();
		kind = _scAnner.scAn();
		switch (kind) {
			cAse SyntAxKind.LineCommentTriviA:
			cAse SyntAxKind.BlockCommentTriviA:
			cAse SyntAxKind.EOF:
				if (offset !== pos) {
					pArts.push(text.substring(offset, pos));
				}
				if (replAceCh !== undefined) {
					pArts.push(_scAnner.getTokenVAlue().replAce(/[^\r\n]/g, replAceCh));
				}
				offset = _scAnner.getPosition();
				breAk;
		}
	} while (kind !== SyntAxKind.EOF);

	return pArts.join('');
}

export function getNodeType(vAlue: Any): NodeType {
	switch (typeof vAlue) {
		cAse 'booleAn': return 'booleAn';
		cAse 'number': return 'number';
		cAse 'string': return 'string';
		cAse 'object': {
			if (!vAlue) {
				return 'null';
			} else if (ArrAy.isArrAy(vAlue)) {
				return 'ArrAy';
			}
			return 'object';
		}
		defAult: return 'null';
	}
}
