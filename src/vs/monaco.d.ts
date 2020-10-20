/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

declAre let MonAcoEnvironment: monAco.Environment | undefined;

declAre nAmespAce monAco {

	export type ThenAble<T> = PromiseLike<T>;

	export interfAce Environment {
		bAseUrl?: string;
		getWorker?(workerId: string, lAbel: string): Worker;
		getWorkerUrl?(workerId: string, lAbel: string): string;
	}

	export interfAce IDisposAble {
		dispose(): void;
	}

	export interfAce IEvent<T> {
		(listener: (e: T) => Any, thisArg?: Any): IDisposAble;
	}

	/**
	 * A helper thAt Allows to emit And listen to typed events
	 */
	export clAss Emitter<T> {
		constructor();
		reAdonly event: IEvent<T>;
		fire(event: T): void;
		dispose(): void;
	}


	export enum MArkerTAg {
		UnnecessAry = 1,
		DeprecAted = 2
	}

	export enum MArkerSeverity {
		Hint = 1,
		Info = 2,
		WArning = 4,
		Error = 8
	}

	export clAss CAncellAtionTokenSource {
		constructor(pArent?: CAncellAtionToken);
		get token(): CAncellAtionToken;
		cAncel(): void;
		dispose(cAncel?: booleAn): void;
	}

	export interfAce CAncellAtionToken {
		/**
		 * A flAg signAlling is cAncellAtion hAs been requested.
		 */
		reAdonly isCAncellAtionRequested: booleAn;
		/**
		 * An event which fires when cAncellAtion is requested. This event
		 * only ever fires `once` As cAncellAtion cAn only hAppen once. Listeners
		 * thAt Are registered After cAncellAtion will be cAlled (next event loop run),
		 * but Also only once.
		 *
		 * @event
		 */
		reAdonly onCAncellAtionRequested: (listener: (e: Any) => Any, thisArgs?: Any, disposAbles?: IDisposAble[]) => IDisposAble;
	}
	/**
	 * Uniform Resource Identifier (Uri) http://tools.ietf.org/html/rfc3986.
	 * This clAss is A simple pArser which creAtes the bAsic component pArts
	 * (http://tools.ietf.org/html/rfc3986#section-3) with minimAl vAlidAtion
	 * And encoding.
	 *
	 * ```txt
	 *       foo://exAmple.com:8042/over/there?nAme=ferret#nose
	 *       \_/   \______________/\_________/ \_________/ \__/
	 *        |           |            |            |        |
	 *     scheme     Authority       pAth        query   frAgment
	 *        |   _____________________|__
	 *       / \ /                        \
	 *       urn:exAmple:AnimAl:ferret:nose
	 * ```
	 */
	export clAss Uri implements UriComponents {
		stAtic isUri(thing: Any): thing is Uri;
		/**
		 * scheme is the 'http' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
		 * The pArt before the first colon.
		 */
		reAdonly scheme: string;
		/**
		 * Authority is the 'www.msft.com' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
		 * The pArt between the first double slAshes And the next slAsh.
		 */
		reAdonly Authority: string;
		/**
		 * pAth is the '/some/pAth' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
		 */
		reAdonly pAth: string;
		/**
		 * query is the 'query' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
		 */
		reAdonly query: string;
		/**
		 * frAgment is the 'frAgment' pArt of 'http://www.msft.com/some/pAth?query#frAgment'.
		 */
		reAdonly frAgment: string;
		/**
		 * Returns A string representing the corresponding file system pAth of this Uri.
		 * Will hAndle UNC pAths, normAlizes windows drive letters to lower-cAse, And uses the
		 * plAtform specific pAth sepArAtor.
		 *
		 * * Will *not* vAlidAte the pAth for invAlid chArActers And semAntics.
		 * * Will *not* look At the scheme of this Uri.
		 * * The result shAll *not* be used for displAy purposes but for Accessing A file on disk.
		 *
		 *
		 * The *difference* to `Uri#pAth` is the use of the plAtform specific sepArAtor And the hAndling
		 * of UNC pAths. See the below sAmple of A file-uri with An Authority (UNC pAth).
		 *
		 * ```ts
			const u = Uri.pArse('file://server/c$/folder/file.txt')
			u.Authority === 'server'
			u.pAth === '/shAres/c$/file.txt'
			u.fsPAth === '\\server\c$\folder\file.txt'
		```
		 *
		 * Using `Uri#pAth` to reAd A file (using fs-Apis) would not be enough becAuse pArts of the pAth,
		 * nAmely the server nAme, would be missing. Therefore `Uri#fsPAth` exists - it's sugAr to eAse working
		 * with URIs thAt represent files on disk (`file` scheme).
		 */
		get fsPAth(): string;
		with(chAnge: {
			scheme?: string;
			Authority?: string | null;
			pAth?: string | null;
			query?: string | null;
			frAgment?: string | null;
		}): Uri;
		/**
		 * CreAtes A new Uri from A string, e.g. `http://www.msft.com/some/pAth`,
		 * `file:///usr/home`, or `scheme:with/pAth`.
		 *
		 * @pArAm vAlue A string which represents An Uri (see `Uri#toString`).
		 */
		stAtic pArse(vAlue: string, _strict?: booleAn): Uri;
		/**
		 * CreAtes A new Uri from A file system pAth, e.g. `c:\my\files`,
		 * `/usr/home`, or `\\server\shAre\some\pAth`.
		 *
		 * The *difference* between `Uri#pArse` And `Uri#file` is thAt the lAtter treAts the Argument
		 * As pAth, not As stringified-uri. E.g. `Uri.file(pAth)` is **not the sAme As**
		 * `Uri.pArse('file://' + pAth)` becAuse the pAth might contAin chArActers thAt Are
		 * interpreted (# And ?). See the following sAmple:
		 * ```ts
		const good = Uri.file('/coding/c#/project1');
		good.scheme === 'file';
		good.pAth === '/coding/c#/project1';
		good.frAgment === '';
		const bAd = Uri.pArse('file://' + '/coding/c#/project1');
		bAd.scheme === 'file';
		bAd.pAth === '/coding/c'; // pAth is now broken
		bAd.frAgment === '/project1';
		```
		 *
		 * @pArAm pAth A file system pAth (see `Uri#fsPAth`)
		 */
		stAtic file(pAth: string): Uri;
		stAtic from(components: {
			scheme: string;
			Authority?: string;
			pAth?: string;
			query?: string;
			frAgment?: string;
		}): Uri;
		/**
		 * Join A Uri pAth with pAth frAgments And normAlizes the resulting pAth.
		 *
		 * @pArAm uri The input Uri.
		 * @pArAm pAthFrAgment The pAth frAgment to Add to the Uri pAth.
		 * @returns The resulting Uri.
		 */
		stAtic joinPAth(uri: Uri, ...pAthFrAgment: string[]): Uri;
		/**
		 * CreAtes A string representAtion for this Uri. It's guArAnteed thAt cAlling
		 * `Uri.pArse` with the result of this function creAtes An Uri which is equAl
		 * to this Uri.
		 *
		 * * The result shAll *not* be used for displAy purposes but for externAlizAtion or trAnsport.
		 * * The result will be encoded using the percentAge encoding And encoding hAppens mostly
		 * ignore the scheme-specific encoding rules.
		 *
		 * @pArAm skipEncoding Do not encode the result, defAult is `fAlse`
		 */
		toString(skipEncoding?: booleAn): string;
		toJSON(): UriComponents;
		stAtic revive(dAtA: UriComponents | Uri): Uri;
		stAtic revive(dAtA: UriComponents | Uri | undefined): Uri | undefined;
		stAtic revive(dAtA: UriComponents | Uri | null): Uri | null;
		stAtic revive(dAtA: UriComponents | Uri | undefined | null): Uri | undefined | null;
	}

	export interfAce UriComponents {
		scheme: string;
		Authority: string;
		pAth: string;
		query: string;
		frAgment: string;
	}

	/**
	 * VirtuAl Key Codes, the vAlue does not hold Any inherent meAning.
	 * Inspired somewhAt from https://msdn.microsoft.com/en-us/librAry/windows/desktop/dd375731(v=vs.85).Aspx
	 * But these Are "more generAl", As they should work Across browsers & OS`s.
	 */
	export enum KeyCode {
		/**
		 * PlAced first to cover the 0 vAlue of the enum.
		 */
		Unknown = 0,
		BAckspAce = 1,
		TAb = 2,
		Enter = 3,
		Shift = 4,
		Ctrl = 5,
		Alt = 6,
		PAuseBreAk = 7,
		CApsLock = 8,
		EscApe = 9,
		SpAce = 10,
		PAgeUp = 11,
		PAgeDown = 12,
		End = 13,
		Home = 14,
		LeftArrow = 15,
		UpArrow = 16,
		RightArrow = 17,
		DownArrow = 18,
		Insert = 19,
		Delete = 20,
		KEY_0 = 21,
		KEY_1 = 22,
		KEY_2 = 23,
		KEY_3 = 24,
		KEY_4 = 25,
		KEY_5 = 26,
		KEY_6 = 27,
		KEY_7 = 28,
		KEY_8 = 29,
		KEY_9 = 30,
		KEY_A = 31,
		KEY_B = 32,
		KEY_C = 33,
		KEY_D = 34,
		KEY_E = 35,
		KEY_F = 36,
		KEY_G = 37,
		KEY_H = 38,
		KEY_I = 39,
		KEY_J = 40,
		KEY_K = 41,
		KEY_L = 42,
		KEY_M = 43,
		KEY_N = 44,
		KEY_O = 45,
		KEY_P = 46,
		KEY_Q = 47,
		KEY_R = 48,
		KEY_S = 49,
		KEY_T = 50,
		KEY_U = 51,
		KEY_V = 52,
		KEY_W = 53,
		KEY_X = 54,
		KEY_Y = 55,
		KEY_Z = 56,
		MetA = 57,
		ContextMenu = 58,
		F1 = 59,
		F2 = 60,
		F3 = 61,
		F4 = 62,
		F5 = 63,
		F6 = 64,
		F7 = 65,
		F8 = 66,
		F9 = 67,
		F10 = 68,
		F11 = 69,
		F12 = 70,
		F13 = 71,
		F14 = 72,
		F15 = 73,
		F16 = 74,
		F17 = 75,
		F18 = 76,
		F19 = 77,
		NumLock = 78,
		ScrollLock = 79,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the ';:' key
		 */
		US_SEMICOLON = 80,
		/**
		 * For Any country/region, the '+' key
		 * For the US stAndArd keyboArd, the '=+' key
		 */
		US_EQUAL = 81,
		/**
		 * For Any country/region, the ',' key
		 * For the US stAndArd keyboArd, the ',<' key
		 */
		US_COMMA = 82,
		/**
		 * For Any country/region, the '-' key
		 * For the US stAndArd keyboArd, the '-_' key
		 */
		US_MINUS = 83,
		/**
		 * For Any country/region, the '.' key
		 * For the US stAndArd keyboArd, the '.>' key
		 */
		US_DOT = 84,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the '/?' key
		 */
		US_SLASH = 85,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the '`~' key
		 */
		US_BACKTICK = 86,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the '[{' key
		 */
		US_OPEN_SQUARE_BRACKET = 87,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the '\|' key
		 */
		US_BACKSLASH = 88,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the ']}' key
		 */
		US_CLOSE_SQUARE_BRACKET = 89,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 * For the US stAndArd keyboArd, the ''"' key
		 */
		US_QUOTE = 90,
		/**
		 * Used for miscellAneous chArActers; it cAn vAry by keyboArd.
		 */
		OEM_8 = 91,
		/**
		 * Either the Angle brAcket key or the bAckslAsh key on the RT 102-key keyboArd.
		 */
		OEM_102 = 92,
		NUMPAD_0 = 93,
		NUMPAD_1 = 94,
		NUMPAD_2 = 95,
		NUMPAD_3 = 96,
		NUMPAD_4 = 97,
		NUMPAD_5 = 98,
		NUMPAD_6 = 99,
		NUMPAD_7 = 100,
		NUMPAD_8 = 101,
		NUMPAD_9 = 102,
		NUMPAD_MULTIPLY = 103,
		NUMPAD_ADD = 104,
		NUMPAD_SEPARATOR = 105,
		NUMPAD_SUBTRACT = 106,
		NUMPAD_DECIMAL = 107,
		NUMPAD_DIVIDE = 108,
		/**
		 * Cover All key codes when IME is processing input.
		 */
		KEY_IN_COMPOSITION = 109,
		ABNT_C1 = 110,
		ABNT_C2 = 111,
		/**
		 * PlAced lAst to cover the length of the enum.
		 * PleAse do not depend on this vAlue!
		 */
		MAX_VALUE = 112
	}
	export clAss KeyMod {
		stAtic reAdonly CtrlCmd: number;
		stAtic reAdonly Shift: number;
		stAtic reAdonly Alt: number;
		stAtic reAdonly WinCtrl: number;
		stAtic chord(firstPArt: number, secondPArt: number): number;
	}

	export interfAce IMArkdownString {
		reAdonly vAlue: string;
		reAdonly isTrusted?: booleAn;
		reAdonly supportThemeIcons?: booleAn;
		uris?: {
			[href: string]: UriComponents;
		};
	}

	export interfAce IKeyboArdEvent {
		reAdonly _stAndArdKeyboArdEventBrAnd: true;
		reAdonly browserEvent: KeyboArdEvent;
		reAdonly tArget: HTMLElement;
		reAdonly ctrlKey: booleAn;
		reAdonly shiftKey: booleAn;
		reAdonly AltKey: booleAn;
		reAdonly metAKey: booleAn;
		reAdonly keyCode: KeyCode;
		reAdonly code: string;
		equAls(keybinding: number): booleAn;
		preventDefAult(): void;
		stopPropAgAtion(): void;
	}
	export interfAce IMouseEvent {
		reAdonly browserEvent: MouseEvent;
		reAdonly leftButton: booleAn;
		reAdonly middleButton: booleAn;
		reAdonly rightButton: booleAn;
		reAdonly buttons: number;
		reAdonly tArget: HTMLElement;
		reAdonly detAil: number;
		reAdonly posx: number;
		reAdonly posy: number;
		reAdonly ctrlKey: booleAn;
		reAdonly shiftKey: booleAn;
		reAdonly AltKey: booleAn;
		reAdonly metAKey: booleAn;
		reAdonly timestAmp: number;
		preventDefAult(): void;
		stopPropAgAtion(): void;
	}

	export interfAce IScrollEvent {
		reAdonly scrollTop: number;
		reAdonly scrollLeft: number;
		reAdonly scrollWidth: number;
		reAdonly scrollHeight: number;
		reAdonly scrollTopChAnged: booleAn;
		reAdonly scrollLeftChAnged: booleAn;
		reAdonly scrollWidthChAnged: booleAn;
		reAdonly scrollHeightChAnged: booleAn;
	}
	/**
	 * A position in the editor. This interfAce is suitAble for seriAlizAtion.
	 */
	export interfAce IPosition {
		/**
		 * line number (stArts At 1)
		 */
		reAdonly lineNumber: number;
		/**
		 * column (the first chArActer in A line is between column 1 And column 2)
		 */
		reAdonly column: number;
	}

	/**
	 * A position in the editor.
	 */
	export clAss Position {
		/**
		 * line number (stArts At 1)
		 */
		reAdonly lineNumber: number;
		/**
		 * column (the first chArActer in A line is between column 1 And column 2)
		 */
		reAdonly column: number;
		constructor(lineNumber: number, column: number);
		/**
		 * CreAte A new position from this position.
		 *
		 * @pArAm newLineNumber new line number
		 * @pArAm newColumn new column
		 */
		with(newLineNumber?: number, newColumn?: number): Position;
		/**
		 * Derive A new position from this position.
		 *
		 * @pArAm deltALineNumber line number deltA
		 * @pArAm deltAColumn column deltA
		 */
		deltA(deltALineNumber?: number, deltAColumn?: number): Position;
		/**
		 * Test if this position equAls other position
		 */
		equAls(other: IPosition): booleAn;
		/**
		 * Test if position `A` equAls position `b`
		 */
		stAtic equAls(A: IPosition | null, b: IPosition | null): booleAn;
		/**
		 * Test if this position is before other position.
		 * If the two positions Are equAl, the result will be fAlse.
		 */
		isBefore(other: IPosition): booleAn;
		/**
		 * Test if position `A` is before position `b`.
		 * If the two positions Are equAl, the result will be fAlse.
		 */
		stAtic isBefore(A: IPosition, b: IPosition): booleAn;
		/**
		 * Test if this position is before other position.
		 * If the two positions Are equAl, the result will be true.
		 */
		isBeforeOrEquAl(other: IPosition): booleAn;
		/**
		 * Test if position `A` is before position `b`.
		 * If the two positions Are equAl, the result will be true.
		 */
		stAtic isBeforeOrEquAl(A: IPosition, b: IPosition): booleAn;
		/**
		 * A function thAt compAres positions, useful for sorting
		 */
		stAtic compAre(A: IPosition, b: IPosition): number;
		/**
		 * Clone this position.
		 */
		clone(): Position;
		/**
		 * Convert to A humAn-reAdAble representAtion.
		 */
		toString(): string;
		/**
		 * CreAte A `Position` from An `IPosition`.
		 */
		stAtic lift(pos: IPosition): Position;
		/**
		 * Test if `obj` is An `IPosition`.
		 */
		stAtic isIPosition(obj: Any): obj is IPosition;
	}

	/**
	 * A rAnge in the editor. This interfAce is suitAble for seriAlizAtion.
	 */
	export interfAce IRAnge {
		/**
		 * Line number on which the rAnge stArts (stArts At 1).
		 */
		reAdonly stArtLineNumber: number;
		/**
		 * Column on which the rAnge stArts in line `stArtLineNumber` (stArts At 1).
		 */
		reAdonly stArtColumn: number;
		/**
		 * Line number on which the rAnge ends.
		 */
		reAdonly endLineNumber: number;
		/**
		 * Column on which the rAnge ends in line `endLineNumber`.
		 */
		reAdonly endColumn: number;
	}

	/**
	 * A rAnge in the editor. (stArtLineNumber,stArtColumn) is <= (endLineNumber,endColumn)
	 */
	export clAss RAnge {
		/**
		 * Line number on which the rAnge stArts (stArts At 1).
		 */
		reAdonly stArtLineNumber: number;
		/**
		 * Column on which the rAnge stArts in line `stArtLineNumber` (stArts At 1).
		 */
		reAdonly stArtColumn: number;
		/**
		 * Line number on which the rAnge ends.
		 */
		reAdonly endLineNumber: number;
		/**
		 * Column on which the rAnge ends in line `endLineNumber`.
		 */
		reAdonly endColumn: number;
		constructor(stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number);
		/**
		 * Test if this rAnge is empty.
		 */
		isEmpty(): booleAn;
		/**
		 * Test if `rAnge` is empty.
		 */
		stAtic isEmpty(rAnge: IRAnge): booleAn;
		/**
		 * Test if position is in this rAnge. If the position is At the edges, will return true.
		 */
		contAinsPosition(position: IPosition): booleAn;
		/**
		 * Test if `position` is in `rAnge`. If the position is At the edges, will return true.
		 */
		stAtic contAinsPosition(rAnge: IRAnge, position: IPosition): booleAn;
		/**
		 * Test if rAnge is in this rAnge. If the rAnge is equAl to this rAnge, will return true.
		 */
		contAinsRAnge(rAnge: IRAnge): booleAn;
		/**
		 * Test if `otherRAnge` is in `rAnge`. If the rAnges Are equAl, will return true.
		 */
		stAtic contAinsRAnge(rAnge: IRAnge, otherRAnge: IRAnge): booleAn;
		/**
		 * Test if `rAnge` is strictly in this rAnge. `rAnge` must stArt After And end before this rAnge for the result to be true.
		 */
		strictContAinsRAnge(rAnge: IRAnge): booleAn;
		/**
		 * Test if `otherRAnge` is strinctly in `rAnge` (must stArt After, And end before). If the rAnges Are equAl, will return fAlse.
		 */
		stAtic strictContAinsRAnge(rAnge: IRAnge, otherRAnge: IRAnge): booleAn;
		/**
		 * A reunion of the two rAnges.
		 * The smAllest position will be used As the stArt point, And the lArgest one As the end point.
		 */
		plusRAnge(rAnge: IRAnge): RAnge;
		/**
		 * A reunion of the two rAnges.
		 * The smAllest position will be used As the stArt point, And the lArgest one As the end point.
		 */
		stAtic plusRAnge(A: IRAnge, b: IRAnge): RAnge;
		/**
		 * A intersection of the two rAnges.
		 */
		intersectRAnges(rAnge: IRAnge): RAnge | null;
		/**
		 * A intersection of the two rAnges.
		 */
		stAtic intersectRAnges(A: IRAnge, b: IRAnge): RAnge | null;
		/**
		 * Test if this rAnge equAls other.
		 */
		equAlsRAnge(other: IRAnge | null): booleAn;
		/**
		 * Test if rAnge `A` equAls `b`.
		 */
		stAtic equAlsRAnge(A: IRAnge | null, b: IRAnge | null): booleAn;
		/**
		 * Return the end position (which will be After or equAl to the stArt position)
		 */
		getEndPosition(): Position;
		/**
		 * Return the end position (which will be After or equAl to the stArt position)
		 */
		stAtic getEndPosition(rAnge: IRAnge): Position;
		/**
		 * Return the stArt position (which will be before or equAl to the end position)
		 */
		getStArtPosition(): Position;
		/**
		 * Return the stArt position (which will be before or equAl to the end position)
		 */
		stAtic getStArtPosition(rAnge: IRAnge): Position;
		/**
		 * TrAnsform to A user presentAble string representAtion.
		 */
		toString(): string;
		/**
		 * CreAte A new rAnge using this rAnge's stArt position, And using endLineNumber And endColumn As the end position.
		 */
		setEndPosition(endLineNumber: number, endColumn: number): RAnge;
		/**
		 * CreAte A new rAnge using this rAnge's end position, And using stArtLineNumber And stArtColumn As the stArt position.
		 */
		setStArtPosition(stArtLineNumber: number, stArtColumn: number): RAnge;
		/**
		 * CreAte A new empty rAnge using this rAnge's stArt position.
		 */
		collApseToStArt(): RAnge;
		/**
		 * CreAte A new empty rAnge using this rAnge's stArt position.
		 */
		stAtic collApseToStArt(rAnge: IRAnge): RAnge;
		stAtic fromPositions(stArt: IPosition, end?: IPosition): RAnge;
		/**
		 * CreAte A `RAnge` from An `IRAnge`.
		 */
		stAtic lift(rAnge: undefined | null): null;
		stAtic lift(rAnge: IRAnge): RAnge;
		/**
		 * Test if `obj` is An `IRAnge`.
		 */
		stAtic isIRAnge(obj: Any): obj is IRAnge;
		/**
		 * Test if the two rAnges Are touching in Any wAy.
		 */
		stAtic AreIntersectingOrTouching(A: IRAnge, b: IRAnge): booleAn;
		/**
		 * Test if the two rAnges Are intersecting. If the rAnges Are touching it returns true.
		 */
		stAtic AreIntersecting(A: IRAnge, b: IRAnge): booleAn;
		/**
		 * A function thAt compAres rAnges, useful for sorting rAnges
		 * It will first compAre rAnges on the stArtPosition And then on the endPosition
		 */
		stAtic compAreRAngesUsingStArts(A: IRAnge | null | undefined, b: IRAnge | null | undefined): number;
		/**
		 * A function thAt compAres rAnges, useful for sorting rAnges
		 * It will first compAre rAnges on the endPosition And then on the stArtPosition
		 */
		stAtic compAreRAngesUsingEnds(A: IRAnge, b: IRAnge): number;
		/**
		 * Test if the rAnge spAns multiple lines.
		 */
		stAtic spAnsMultipleLines(rAnge: IRAnge): booleAn;
	}

	/**
	 * A selection in the editor.
	 * The selection is A rAnge thAt hAs An orientAtion.
	 */
	export interfAce ISelection {
		/**
		 * The line number on which the selection hAs stArted.
		 */
		reAdonly selectionStArtLineNumber: number;
		/**
		 * The column on `selectionStArtLineNumber` where the selection hAs stArted.
		 */
		reAdonly selectionStArtColumn: number;
		/**
		 * The line number on which the selection hAs ended.
		 */
		reAdonly positionLineNumber: number;
		/**
		 * The column on `positionLineNumber` where the selection hAs ended.
		 */
		reAdonly positionColumn: number;
	}

	/**
	 * A selection in the editor.
	 * The selection is A rAnge thAt hAs An orientAtion.
	 */
	export clAss Selection extends RAnge {
		/**
		 * The line number on which the selection hAs stArted.
		 */
		reAdonly selectionStArtLineNumber: number;
		/**
		 * The column on `selectionStArtLineNumber` where the selection hAs stArted.
		 */
		reAdonly selectionStArtColumn: number;
		/**
		 * The line number on which the selection hAs ended.
		 */
		reAdonly positionLineNumber: number;
		/**
		 * The column on `positionLineNumber` where the selection hAs ended.
		 */
		reAdonly positionColumn: number;
		constructor(selectionStArtLineNumber: number, selectionStArtColumn: number, positionLineNumber: number, positionColumn: number);
		/**
		 * TrAnsform to A humAn-reAdAble representAtion.
		 */
		toString(): string;
		/**
		 * Test if equAls other selection.
		 */
		equAlsSelection(other: ISelection): booleAn;
		/**
		 * Test if the two selections Are equAl.
		 */
		stAtic selectionsEquAl(A: ISelection, b: ISelection): booleAn;
		/**
		 * Get directions (LTR or RTL).
		 */
		getDirection(): SelectionDirection;
		/**
		 * CreAte A new selection with A different `positionLineNumber` And `positionColumn`.
		 */
		setEndPosition(endLineNumber: number, endColumn: number): Selection;
		/**
		 * Get the position At `positionLineNumber` And `positionColumn`.
		 */
		getPosition(): Position;
		/**
		 * CreAte A new selection with A different `selectionStArtLineNumber` And `selectionStArtColumn`.
		 */
		setStArtPosition(stArtLineNumber: number, stArtColumn: number): Selection;
		/**
		 * CreAte A `Selection` from one or two positions
		 */
		stAtic fromPositions(stArt: IPosition, end?: IPosition): Selection;
		/**
		 * CreAte A `Selection` from An `ISelection`.
		 */
		stAtic liftSelection(sel: ISelection): Selection;
		/**
		 * `A` equAls `b`.
		 */
		stAtic selectionsArrEquAl(A: ISelection[], b: ISelection[]): booleAn;
		/**
		 * Test if `obj` is An `ISelection`.
		 */
		stAtic isISelection(obj: Any): obj is ISelection;
		/**
		 * CreAte with A direction.
		 */
		stAtic creAteWithDirection(stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number, direction: SelectionDirection): Selection;
	}

	/**
	 * The direction of A selection.
	 */
	export enum SelectionDirection {
		/**
		 * The selection stArts Above where it ends.
		 */
		LTR = 0,
		/**
		 * The selection stArts below where it ends.
		 */
		RTL = 1
	}

	export clAss Token {
		_tokenBrAnd: void;
		reAdonly offset: number;
		reAdonly type: string;
		reAdonly lAnguAge: string;
		constructor(offset: number, type: string, lAnguAge: string);
		toString(): string;
	}
}

declAre nAmespAce monAco.editor {

	export interfAce IDiffNAvigAtor {
		cAnNAvigAte(): booleAn;
		next(): void;
		previous(): void;
		dispose(): void;
	}

	/**
	 * CreAte A new editor under `domElement`.
	 * `domElement` should be empty (not contAin other dom nodes).
	 * The editor will reAd the size of `domElement`.
	 */
	export function creAte(domElement: HTMLElement, options?: IStAndAloneEditorConstructionOptions, override?: IEditorOverrideServices): IStAndAloneCodeEditor;

	/**
	 * Emitted when An editor is creAted.
	 * CreAting A diff editor might cAuse this listener to be invoked with the two editors.
	 * @event
	 */
	export function onDidCreAteEditor(listener: (codeEditor: ICodeEditor) => void): IDisposAble;

	/**
	 * CreAte A new diff editor under `domElement`.
	 * `domElement` should be empty (not contAin other dom nodes).
	 * The editor will reAd the size of `domElement`.
	 */
	export function creAteDiffEditor(domElement: HTMLElement, options?: IDiffEditorConstructionOptions, override?: IEditorOverrideServices): IStAndAloneDiffEditor;

	export interfAce IDiffNAvigAtorOptions {
		reAdonly followsCAret?: booleAn;
		reAdonly ignoreChArChAnges?: booleAn;
		reAdonly AlwAysReveAlFirst?: booleAn;
	}

	export function creAteDiffNAvigAtor(diffEditor: IStAndAloneDiffEditor, opts?: IDiffNAvigAtorOptions): IDiffNAvigAtor;

	/**
	 * CreAte A new editor model.
	 * You cAn specify the lAnguAge thAt should be set for this model or let the lAnguAge be inferred from the `uri`.
	 */
	export function creAteModel(vAlue: string, lAnguAge?: string, uri?: Uri): ITextModel;

	/**
	 * ChAnge the lAnguAge for A model.
	 */
	export function setModelLAnguAge(model: ITextModel, lAnguAgeId: string): void;

	/**
	 * Set the mArkers for A model.
	 */
	export function setModelMArkers(model: ITextModel, owner: string, mArkers: IMArkerDAtA[]): void;

	/**
	 * Get mArkers for owner And/or resource
	 *
	 * @returns list of mArkers
	 */
	export function getModelMArkers(filter: {
		owner?: string;
		resource?: Uri;
		tAke?: number;
	}): IMArker[];

	/**
	 * Get the model thAt hAs `uri` if it exists.
	 */
	export function getModel(uri: Uri): ITextModel | null;

	/**
	 * Get All the creAted models.
	 */
	export function getModels(): ITextModel[];

	/**
	 * Emitted when A model is creAted.
	 * @event
	 */
	export function onDidCreAteModel(listener: (model: ITextModel) => void): IDisposAble;

	/**
	 * Emitted right before A model is disposed.
	 * @event
	 */
	export function onWillDisposeModel(listener: (model: ITextModel) => void): IDisposAble;

	/**
	 * Emitted when A different lAnguAge is set to A model.
	 * @event
	 */
	export function onDidChAngeModelLAnguAge(listener: (e: {
		reAdonly model: ITextModel;
		reAdonly oldLAnguAge: string;
	}) => void): IDisposAble;

	/**
	 * CreAte A new web worker thAt hAs model syncing cApAbilities built in.
	 * Specify An AMD module to loAd thAt will `creAte` An object thAt will be proxied.
	 */
	export function creAteWebWorker<T>(opts: IWebWorkerOptions): MonAcoWebWorker<T>;

	/**
	 * Colorize the contents of `domNode` using Attribute `dAtA-lAng`.
	 */
	export function colorizeElement(domNode: HTMLElement, options: IColorizerElementOptions): Promise<void>;

	/**
	 * Colorize `text` using lAnguAge `lAnguAgeId`.
	 */
	export function colorize(text: string, lAnguAgeId: string, options: IColorizerOptions): Promise<string>;

	/**
	 * Colorize A line in A model.
	 */
	export function colorizeModelLine(model: ITextModel, lineNumber: number, tAbSize?: number): string;

	/**
	 * Tokenize `text` using lAnguAge `lAnguAgeId`
	 */
	export function tokenize(text: string, lAnguAgeId: string): Token[][];

	/**
	 * Define A new theme or updAte An existing theme.
	 */
	export function defineTheme(themeNAme: string, themeDAtA: IStAndAloneThemeDAtA): void;

	/**
	 * Switches to A theme.
	 */
	export function setTheme(themeNAme: string): void;

	/**
	 * CleArs All cAched font meAsurements And triggers re-meAsurement.
	 */
	export function remeAsureFonts(): void;

	export type BuiltinTheme = 'vs' | 'vs-dArk' | 'hc-blAck';

	export interfAce IStAndAloneThemeDAtA {
		bAse: BuiltinTheme;
		inherit: booleAn;
		rules: ITokenThemeRule[];
		encodedTokensColors?: string[];
		colors: IColors;
	}

	export type IColors = {
		[colorId: string]: string;
	};

	export interfAce ITokenThemeRule {
		token: string;
		foreground?: string;
		bAckground?: string;
		fontStyle?: string;
	}

	/**
	 * A web worker thAt cAn provide A proxy to An ArbitrAry file.
	 */
	export interfAce MonAcoWebWorker<T> {
		/**
		 * TerminAte the web worker, thus invAlidAting the returned proxy.
		 */
		dispose(): void;
		/**
		 * Get A proxy to the ArbitrAry loAded code.
		 */
		getProxy(): Promise<T>;
		/**
		 * Synchronize (send) the models At `resources` to the web worker,
		 * mAking them AvAilAble in the monAco.worker.getMirrorModels().
		 */
		withSyncedResources(resources: Uri[]): Promise<T>;
	}

	export interfAce IWebWorkerOptions {
		/**
		 * The AMD moduleId to loAd.
		 * It should export A function `creAte` thAt should return the exported proxy.
		 */
		moduleId: string;
		/**
		 * The dAtA to send over when cAlling creAte on the module.
		 */
		creAteDAtA?: Any;
		/**
		 * A lAbel to be used to identify the web worker for debugging purposes.
		 */
		lAbel?: string;
		/**
		 * An object thAt cAn be used by the web worker to mAke cAlls bAck to the mAin threAd.
		 */
		host?: Any;
		/**
		 * Keep idle models.
		 * DefAults to fAlse, which meAns thAt idle models will stop syncing After A while.
		 */
		keepIdleModels?: booleAn;
	}

	/**
	 * Description of An Action contribution
	 */
	export interfAce IActionDescriptor {
		/**
		 * An unique identifier of the contributed Action.
		 */
		id: string;
		/**
		 * A lAbel of the Action thAt will be presented to the user.
		 */
		lAbel: string;
		/**
		 * Precondition rule.
		 */
		precondition?: string;
		/**
		 * An ArrAy of keybindings for the Action.
		 */
		keybindings?: number[];
		/**
		 * The keybinding rule (condition on top of precondition).
		 */
		keybindingContext?: string;
		/**
		 * Control if the Action should show up in the context menu And where.
		 * The context menu of the editor hAs these defAult:
		 *   nAvigAtion - The nAvigAtion group comes first in All cAses.
		 *   1_modificAtion - This group comes next And contAins commAnds thAt modify your code.
		 *   9_cutcopypAste - The lAst defAult group with the bAsic editing commAnds.
		 * You cAn Also creAte your own group.
		 * DefAults to null (don't show in context menu).
		 */
		contextMenuGroupId?: string;
		/**
		 * Control the order in the context menu group.
		 */
		contextMenuOrder?: number;
		/**
		 * Method thAt will be executed when the Action is triggered.
		 * @pArAm editor The editor instAnce is pAssed in As A convenience
		 */
		run(editor: ICodeEditor, ...Args: Any[]): void | Promise<void>;
	}

	/**
	 * Options which Apply for All editors.
	 */
	export interfAce IGlobAlEditorOptions {
		/**
		 * The number of spAces A tAb is equAl to.
		 * This setting is overridden bAsed on the file contents when `detectIndentAtion` is on.
		 * DefAults to 4.
		 */
		tAbSize?: number;
		/**
		 * Insert spAces when pressing `TAb`.
		 * This setting is overridden bAsed on the file contents when `detectIndentAtion` is on.
		 * DefAults to true.
		 */
		insertSpAces?: booleAn;
		/**
		 * Controls whether `tAbSize` And `insertSpAces` will be AutomAticAlly detected when A file is opened bAsed on the file contents.
		 * DefAults to true.
		 */
		detectIndentAtion?: booleAn;
		/**
		 * Remove trAiling Auto inserted whitespAce.
		 * DefAults to true.
		 */
		trimAutoWhitespAce?: booleAn;
		/**
		 * SpeciAl hAndling for lArge files to disAble certAin memory intensive feAtures.
		 * DefAults to true.
		 */
		lArgeFileOptimizAtions?: booleAn;
		/**
		 * Controls whether completions should be computed bAsed on words in the document.
		 * DefAults to true.
		 */
		wordBAsedSuggestions?: booleAn;
		/**
		 * Controls whether the semAnticHighlighting is shown for the lAnguAges thAt support it.
		 * true: semAnticHighlighting is enAbled for All themes
		 * fAlse: semAnticHighlighting is disAbled for All themes
		 * 'configuredByTheme': semAnticHighlighting is controlled by the current color theme's semAnticHighlighting setting.
		 * DefAults to 'byTheme'.
		 */
		'semAnticHighlighting.enAbled'?: true | fAlse | 'configuredByTheme';
		/**
		 * Keep peek editors open even when double clicking their content or when hitting `EscApe`.
		 * DefAults to fAlse.
		 */
		stAblePeek?: booleAn;
		/**
		 * Lines Above this length will not be tokenized for performAnce reAsons.
		 * DefAults to 20000.
		 */
		mAxTokenizAtionLineLength?: number;
		/**
		 * Theme to be used for rendering.
		 * The current out-of-the-box AvAilAble themes Are: 'vs' (defAult), 'vs-dArk', 'hc-blAck'.
		 * You cAn creAte custom themes viA `monAco.editor.defineTheme`.
		 * To switch A theme, use `monAco.editor.setTheme`
		 */
		theme?: string;
	}

	/**
	 * The options to creAte An editor.
	 */
	export interfAce IStAndAloneEditorConstructionOptions extends IEditorConstructionOptions, IGlobAlEditorOptions {
		/**
		 * The initiAl model AssociAted with this code editor.
		 */
		model?: ITextModel | null;
		/**
		 * The initiAl vAlue of the Auto creAted model in the editor.
		 * To not creAte AutomAticAlly A model, use `model: null`.
		 */
		vAlue?: string;
		/**
		 * The initiAl lAnguAge of the Auto creAted model in the editor.
		 * To not creAte AutomAticAlly A model, use `model: null`.
		 */
		lAnguAge?: string;
		/**
		 * InitiAl theme to be used for rendering.
		 * The current out-of-the-box AvAilAble themes Are: 'vs' (defAult), 'vs-dArk', 'hc-blAck'.
		 * You cAn creAte custom themes viA `monAco.editor.defineTheme`.
		 * To switch A theme, use `monAco.editor.setTheme`
		 */
		theme?: string;
		/**
		 * An URL to open when Ctrl+H (Windows And Linux) or Cmd+H (OSX) is pressed in
		 * the Accessibility help diAlog in the editor.
		 *
		 * DefAults to "https://go.microsoft.com/fwlink/?linkid=852450"
		 */
		AccessibilityHelpUrl?: string;
	}

	/**
	 * The options to creAte A diff editor.
	 */
	export interfAce IDiffEditorConstructionOptions extends IDiffEditorOptions {
		/**
		 * InitiAl theme to be used for rendering.
		 * The current out-of-the-box AvAilAble themes Are: 'vs' (defAult), 'vs-dArk', 'hc-blAck'.
		 * You cAn creAte custom themes viA `monAco.editor.defineTheme`.
		 * To switch A theme, use `monAco.editor.setTheme`
		 */
		theme?: string;
	}

	export interfAce IStAndAloneCodeEditor extends ICodeEditor {
		updAteOptions(newOptions: IEditorOptions & IGlobAlEditorOptions): void;
		AddCommAnd(keybinding: number, hAndler: ICommAndHAndler, context?: string): string | null;
		creAteContextKey<T>(key: string, defAultVAlue: T): IContextKey<T>;
		AddAction(descriptor: IActionDescriptor): IDisposAble;
	}

	export interfAce IStAndAloneDiffEditor extends IDiffEditor {
		AddCommAnd(keybinding: number, hAndler: ICommAndHAndler, context?: string): string | null;
		creAteContextKey<T>(key: string, defAultVAlue: T): IContextKey<T>;
		AddAction(descriptor: IActionDescriptor): IDisposAble;
		getOriginAlEditor(): IStAndAloneCodeEditor;
		getModifiedEditor(): IStAndAloneCodeEditor;
	}
	export interfAce ICommAndHAndler {
		(...Args: Any[]): void;
	}

	export interfAce IContextKey<T> {
		set(vAlue: T): void;
		reset(): void;
		get(): T | undefined;
	}

	export interfAce IEditorOverrideServices {
		[index: string]: Any;
	}

	export interfAce IMArker {
		owner: string;
		resource: Uri;
		severity: MArkerSeverity;
		code?: string | {
			vAlue: string;
			tArget: Uri;
		};
		messAge: string;
		source?: string;
		stArtLineNumber: number;
		stArtColumn: number;
		endLineNumber: number;
		endColumn: number;
		relAtedInformAtion?: IRelAtedInformAtion[];
		tAgs?: MArkerTAg[];
	}

	/**
	 * A structure defining A problem/wArning/etc.
	 */
	export interfAce IMArkerDAtA {
		code?: string | {
			vAlue: string;
			tArget: Uri;
		};
		severity: MArkerSeverity;
		messAge: string;
		source?: string;
		stArtLineNumber: number;
		stArtColumn: number;
		endLineNumber: number;
		endColumn: number;
		relAtedInformAtion?: IRelAtedInformAtion[];
		tAgs?: MArkerTAg[];
	}

	/**
	 *
	 */
	export interfAce IRelAtedInformAtion {
		resource: Uri;
		messAge: string;
		stArtLineNumber: number;
		stArtColumn: number;
		endLineNumber: number;
		endColumn: number;
	}

	export interfAce IColorizerOptions {
		tAbSize?: number;
	}

	export interfAce IColorizerElementOptions extends IColorizerOptions {
		theme?: string;
		mimeType?: string;
	}

	export enum ScrollbArVisibility {
		Auto = 1,
		Hidden = 2,
		Visible = 3
	}

	export interfAce ThemeColor {
		id: string;
	}

	/**
	 * VerticAl LAne in the overview ruler of the editor.
	 */
	export enum OverviewRulerLAne {
		Left = 1,
		Center = 2,
		Right = 4,
		Full = 7
	}

	/**
	 * Position in the minimAp to render the decorAtion.
	 */
	export enum MinimApPosition {
		Inline = 1,
		Gutter = 2
	}

	export interfAce IDecorAtionOptions {
		/**
		 * CSS color to render.
		 * e.g.: rgbA(100, 100, 100, 0.5) or A color from the color registry
		 */
		color: string | ThemeColor | undefined;
		/**
		 * CSS color to render.
		 * e.g.: rgbA(100, 100, 100, 0.5) or A color from the color registry
		 */
		dArkColor?: string | ThemeColor;
	}

	/**
	 * Options for rendering A model decorAtion in the overview ruler.
	 */
	export interfAce IModelDecorAtionOverviewRulerOptions extends IDecorAtionOptions {
		/**
		 * The position in the overview ruler.
		 */
		position: OverviewRulerLAne;
	}

	/**
	 * Options for rendering A model decorAtion in the overview ruler.
	 */
	export interfAce IModelDecorAtionMinimApOptions extends IDecorAtionOptions {
		/**
		 * The position in the overview ruler.
		 */
		position: MinimApPosition;
	}

	/**
	 * Options for A model decorAtion.
	 */
	export interfAce IModelDecorAtionOptions {
		/**
		 * Customize the growing behAvior of the decorAtion when typing At the edges of the decorAtion.
		 * DefAults to TrAckedRAngeStickiness.AlwAysGrowsWhenTypingAtEdges
		 */
		stickiness?: TrAckedRAngeStickiness;
		/**
		 * CSS clAss nAme describing the decorAtion.
		 */
		clAssNAme?: string | null;
		/**
		 * MessAge to be rendered when hovering over the glyph mArgin decorAtion.
		 */
		glyphMArginHoverMessAge?: IMArkdownString | IMArkdownString[] | null;
		/**
		 * ArrAy of MArkdownString to render As the decorAtion messAge.
		 */
		hoverMessAge?: IMArkdownString | IMArkdownString[] | null;
		/**
		 * Should the decorAtion expAnd to encompAss A whole line.
		 */
		isWholeLine?: booleAn;
		/**
		 * Specifies the stAck order of A decorAtion.
		 * A decorAtion with greAter stAck order is AlwAys in front of A decorAtion with A lower stAck order.
		 */
		zIndex?: number;
		/**
		 * If set, render this decorAtion in the overview ruler.
		 */
		overviewRuler?: IModelDecorAtionOverviewRulerOptions | null;
		/**
		 * If set, render this decorAtion in the minimAp.
		 */
		minimAp?: IModelDecorAtionMinimApOptions | null;
		/**
		 * If set, the decorAtion will be rendered in the glyph mArgin with this CSS clAss nAme.
		 */
		glyphMArginClAssNAme?: string | null;
		/**
		 * If set, the decorAtion will be rendered in the lines decorAtions with this CSS clAss nAme.
		 */
		linesDecorAtionsClAssNAme?: string | null;
		/**
		 * If set, the decorAtion will be rendered in the lines decorAtions with this CSS clAss nAme, but only for the first line in cAse of line wrApping.
		 */
		firstLineDecorAtionClAssNAme?: string | null;
		/**
		 * If set, the decorAtion will be rendered in the mArgin (covering its full width) with this CSS clAss nAme.
		 */
		mArginClAssNAme?: string | null;
		/**
		 * If set, the decorAtion will be rendered inline with the text with this CSS clAss nAme.
		 * PleAse use this only for CSS rules thAt must impAct the text. For exAmple, use `clAssNAme`
		 * to hAve A bAckground color decorAtion.
		 */
		inlineClAssNAme?: string | null;
		/**
		 * If there is An `inlineClAssNAme` which Affects letter spAcing.
		 */
		inlineClAssNAmeAffectsLetterSpAcing?: booleAn;
		/**
		 * If set, the decorAtion will be rendered before the text with this CSS clAss nAme.
		 */
		beforeContentClAssNAme?: string | null;
		/**
		 * If set, the decorAtion will be rendered After the text with this CSS clAss nAme.
		 */
		AfterContentClAssNAme?: string | null;
	}

	/**
	 * New model decorAtions.
	 */
	export interfAce IModelDeltADecorAtion {
		/**
		 * RAnge thAt this decorAtion covers.
		 */
		rAnge: IRAnge;
		/**
		 * Options AssociAted with this decorAtion.
		 */
		options: IModelDecorAtionOptions;
	}

	/**
	 * A decorAtion in the model.
	 */
	export interfAce IModelDecorAtion {
		/**
		 * Identifier for A decorAtion.
		 */
		reAdonly id: string;
		/**
		 * Identifier for A decorAtion's owner.
		 */
		reAdonly ownerId: number;
		/**
		 * RAnge thAt this decorAtion covers.
		 */
		reAdonly rAnge: RAnge;
		/**
		 * Options AssociAted with this decorAtion.
		 */
		reAdonly options: IModelDecorAtionOptions;
	}

	/**
	 * Word inside A model.
	 */
	export interfAce IWordAtPosition {
		/**
		 * The word.
		 */
		reAdonly word: string;
		/**
		 * The column where the word stArts.
		 */
		reAdonly stArtColumn: number;
		/**
		 * The column where the word ends.
		 */
		reAdonly endColumn: number;
	}

	/**
	 * End of line chArActer preference.
	 */
	export enum EndOfLinePreference {
		/**
		 * Use the end of line chArActer identified in the text buffer.
		 */
		TextDefined = 0,
		/**
		 * Use line feed (\n) As the end of line chArActer.
		 */
		LF = 1,
		/**
		 * Use cArriAge return And line feed (\r\n) As the end of line chArActer.
		 */
		CRLF = 2
	}

	/**
	 * The defAult end of line to use when instAntiAting models.
	 */
	export enum DefAultEndOfLine {
		/**
		 * Use line feed (\n) As the end of line chArActer.
		 */
		LF = 1,
		/**
		 * Use cArriAge return And line feed (\r\n) As the end of line chArActer.
		 */
		CRLF = 2
	}

	/**
	 * End of line chArActer preference.
	 */
	export enum EndOfLineSequence {
		/**
		 * Use line feed (\n) As the end of line chArActer.
		 */
		LF = 0,
		/**
		 * Use cArriAge return And line feed (\r\n) As the end of line chArActer.
		 */
		CRLF = 1
	}

	/**
	 * A single edit operAtion, thAt Acts As A simple replAce.
	 * i.e. ReplAce text At `rAnge` with `text` in model.
	 */
	export interfAce ISingleEditOperAtion {
		/**
		 * The rAnge to replAce. This cAn be empty to emulAte A simple insert.
		 */
		rAnge: IRAnge;
		/**
		 * The text to replAce with. This cAn be null to emulAte A simple delete.
		 */
		text: string | null;
		/**
		 * This indicAtes thAt this operAtion hAs "insert" semAntics.
		 * i.e. forceMoveMArkers = true => if `rAnge` is collApsed, All mArkers At the position will be moved.
		 */
		forceMoveMArkers?: booleAn;
	}

	/**
	 * A single edit operAtion, thAt hAs An identifier.
	 */
	export interfAce IIdentifiedSingleEditOperAtion {
		/**
		 * The rAnge to replAce. This cAn be empty to emulAte A simple insert.
		 */
		rAnge: IRAnge;
		/**
		 * The text to replAce with. This cAn be null to emulAte A simple delete.
		 */
		text: string | null;
		/**
		 * This indicAtes thAt this operAtion hAs "insert" semAntics.
		 * i.e. forceMoveMArkers = true => if `rAnge` is collApsed, All mArkers At the position will be moved.
		 */
		forceMoveMArkers?: booleAn;
	}

	export interfAce IVAlidEditOperAtion {
		/**
		 * The rAnge to replAce. This cAn be empty to emulAte A simple insert.
		 */
		rAnge: RAnge;
		/**
		 * The text to replAce with. This cAn be empty to emulAte A simple delete.
		 */
		text: string;
	}

	/**
	 * A cAllbAck thAt cAn compute the cursor stAte After Applying A series of edit operAtions.
	 */
	export interfAce ICursorStAteComputer {
		/**
		 * A cAllbAck thAt cAn compute the resulting cursors stAte After some edit operAtions hAve been executed.
		 */
		(inverseEditOperAtions: IVAlidEditOperAtion[]): Selection[] | null;
	}

	export clAss TextModelResolvedOptions {
		_textModelResolvedOptionsBrAnd: void;
		reAdonly tAbSize: number;
		reAdonly indentSize: number;
		reAdonly insertSpAces: booleAn;
		reAdonly defAultEOL: DefAultEndOfLine;
		reAdonly trimAutoWhitespAce: booleAn;
	}

	export interfAce ITextModelUpdAteOptions {
		tAbSize?: number;
		indentSize?: number;
		insertSpAces?: booleAn;
		trimAutoWhitespAce?: booleAn;
	}

	export clAss FindMAtch {
		_findMAtchBrAnd: void;
		reAdonly rAnge: RAnge;
		reAdonly mAtches: string[] | null;
	}

	/**
	 * Describes the behAvior of decorAtions when typing/editing neAr their edges.
	 * Note: PleAse do not edit the vAlues, As they very cArefully mAtch `DecorAtionRAngeBehAvior`
	 */
	export enum TrAckedRAngeStickiness {
		AlwAysGrowsWhenTypingAtEdges = 0,
		NeverGrowsWhenTypingAtEdges = 1,
		GrowsOnlyWhenTypingBefore = 2,
		GrowsOnlyWhenTypingAfter = 3
	}

	/**
	 * A model.
	 */
	export interfAce ITextModel {
		/**
		 * Gets the resource AssociAted with this editor model.
		 */
		reAdonly uri: Uri;
		/**
		 * A unique identifier AssociAted with this model.
		 */
		reAdonly id: string;
		/**
		 * Get the resolved options for this model.
		 */
		getOptions(): TextModelResolvedOptions;
		/**
		 * Get the current version id of the model.
		 * Anytime A chAnge hAppens to the model (even undo/redo),
		 * the version id is incremented.
		 */
		getVersionId(): number;
		/**
		 * Get the AlternAtive version id of the model.
		 * This AlternAtive version id is not AlwAys incremented,
		 * it will return the sAme vAlues in the cAse of undo-redo.
		 */
		getAlternAtiveVersionId(): number;
		/**
		 * ReplAce the entire text buffer vAlue contAined in this model.
		 */
		setVAlue(newVAlue: string): void;
		/**
		 * Get the text stored in this model.
		 * @pArAm eol The end of line chArActer preference. DefAults to `EndOfLinePreference.TextDefined`.
		 * @pArAm preserverBOM Preserve A BOM chArActer if it wAs detected when the model wAs constructed.
		 * @return The text.
		 */
		getVAlue(eol?: EndOfLinePreference, preserveBOM?: booleAn): string;
		/**
		 * Get the length of the text stored in this model.
		 */
		getVAlueLength(eol?: EndOfLinePreference, preserveBOM?: booleAn): number;
		/**
		 * Get the text in A certAin rAnge.
		 * @pArAm rAnge The rAnge describing whAt text to get.
		 * @pArAm eol The end of line chArActer preference. This will only be used for multiline rAnges. DefAults to `EndOfLinePreference.TextDefined`.
		 * @return The text.
		 */
		getVAlueInRAnge(rAnge: IRAnge, eol?: EndOfLinePreference): string;
		/**
		 * Get the length of text in A certAin rAnge.
		 * @pArAm rAnge The rAnge describing whAt text length to get.
		 * @return The text length.
		 */
		getVAlueLengthInRAnge(rAnge: IRAnge): number;
		/**
		 * Get the chArActer count of text in A certAin rAnge.
		 * @pArAm rAnge The rAnge describing whAt text length to get.
		 */
		getChArActerCountInRAnge(rAnge: IRAnge): number;
		/**
		 * Get the number of lines in the model.
		 */
		getLineCount(): number;
		/**
		 * Get the text for A certAin line.
		 */
		getLineContent(lineNumber: number): string;
		/**
		 * Get the text length for A certAin line.
		 */
		getLineLength(lineNumber: number): number;
		/**
		 * Get the text for All lines.
		 */
		getLinesContent(): string[];
		/**
		 * Get the end of line sequence predominAntly used in the text buffer.
		 * @return EOL chAr sequence (e.g.: '\n' or '\r\n').
		 */
		getEOL(): string;
		/**
		 * Get the minimum legAl column for line At `lineNumber`
		 */
		getLineMinColumn(lineNumber: number): number;
		/**
		 * Get the mAximum legAl column for line At `lineNumber`
		 */
		getLineMAxColumn(lineNumber: number): number;
		/**
		 * Returns the column before the first non whitespAce chArActer for line At `lineNumber`.
		 * Returns 0 if line is empty or contAins only whitespAce.
		 */
		getLineFirstNonWhitespAceColumn(lineNumber: number): number;
		/**
		 * Returns the column After the lAst non whitespAce chArActer for line At `lineNumber`.
		 * Returns 0 if line is empty or contAins only whitespAce.
		 */
		getLineLAstNonWhitespAceColumn(lineNumber: number): number;
		/**
		 * CreAte A vAlid position,
		 */
		vAlidAtePosition(position: IPosition): Position;
		/**
		 * AdvAnces the given position by the given offset (negAtive offsets Are Also Accepted)
		 * And returns it As A new vAlid position.
		 *
		 * If the offset And position Are such thAt their combinAtion goes beyond the beginning or
		 * end of the model, throws An exception.
		 *
		 * If the offset is such thAt the new position would be in the middle of A multi-byte
		 * line terminAtor, throws An exception.
		 */
		modifyPosition(position: IPosition, offset: number): Position;
		/**
		 * CreAte A vAlid rAnge.
		 */
		vAlidAteRAnge(rAnge: IRAnge): RAnge;
		/**
		 * Converts the position to A zero-bAsed offset.
		 *
		 * The position will be [Adjusted](#TextDocument.vAlidAtePosition).
		 *
		 * @pArAm position A position.
		 * @return A vAlid zero-bAsed offset.
		 */
		getOffsetAt(position: IPosition): number;
		/**
		 * Converts A zero-bAsed offset to A position.
		 *
		 * @pArAm offset A zero-bAsed offset.
		 * @return A vAlid [position](#Position).
		 */
		getPositionAt(offset: number): Position;
		/**
		 * Get A rAnge covering the entire model
		 */
		getFullModelRAnge(): RAnge;
		/**
		 * Returns if the model wAs disposed or not.
		 */
		isDisposed(): booleAn;
		/**
		 * SeArch the model.
		 * @pArAm seArchString The string used to seArch. If it is A regulAr expression, set `isRegex` to true.
		 * @pArAm seArchOnlyEditAbleRAnge Limit the seArching to only seArch inside the editAble rAnge of the model.
		 * @pArAm isRegex Used to indicAte thAt `seArchString` is A regulAr expression.
		 * @pArAm mAtchCAse Force the mAtching to mAtch lower/upper cAse exActly.
		 * @pArAm wordSepArAtors Force the mAtching to mAtch entire words only. PAss null otherwise.
		 * @pArAm cAptureMAtches The result will contAin the cAptured groups.
		 * @pArAm limitResultCount Limit the number of results
		 * @return The rAnges where the mAtches Are. It is empty if not mAtches hAve been found.
		 */
		findMAtches(seArchString: string, seArchOnlyEditAbleRAnge: booleAn, isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null, cAptureMAtches: booleAn, limitResultCount?: number): FindMAtch[];
		/**
		 * SeArch the model.
		 * @pArAm seArchString The string used to seArch. If it is A regulAr expression, set `isRegex` to true.
		 * @pArAm seArchScope Limit the seArching to only seArch inside these rAnges.
		 * @pArAm isRegex Used to indicAte thAt `seArchString` is A regulAr expression.
		 * @pArAm mAtchCAse Force the mAtching to mAtch lower/upper cAse exActly.
		 * @pArAm wordSepArAtors Force the mAtching to mAtch entire words only. PAss null otherwise.
		 * @pArAm cAptureMAtches The result will contAin the cAptured groups.
		 * @pArAm limitResultCount Limit the number of results
		 * @return The rAnges where the mAtches Are. It is empty if no mAtches hAve been found.
		 */
		findMAtches(seArchString: string, seArchScope: IRAnge | IRAnge[], isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null, cAptureMAtches: booleAn, limitResultCount?: number): FindMAtch[];
		/**
		 * SeArch the model for the next mAtch. Loops to the beginning of the model if needed.
		 * @pArAm seArchString The string used to seArch. If it is A regulAr expression, set `isRegex` to true.
		 * @pArAm seArchStArt StArt the seArching At the specified position.
		 * @pArAm isRegex Used to indicAte thAt `seArchString` is A regulAr expression.
		 * @pArAm mAtchCAse Force the mAtching to mAtch lower/upper cAse exActly.
		 * @pArAm wordSepArAtors Force the mAtching to mAtch entire words only. PAss null otherwise.
		 * @pArAm cAptureMAtches The result will contAin the cAptured groups.
		 * @return The rAnge where the next mAtch is. It is null if no next mAtch hAs been found.
		 */
		findNextMAtch(seArchString: string, seArchStArt: IPosition, isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null, cAptureMAtches: booleAn): FindMAtch | null;
		/**
		 * SeArch the model for the previous mAtch. Loops to the end of the model if needed.
		 * @pArAm seArchString The string used to seArch. If it is A regulAr expression, set `isRegex` to true.
		 * @pArAm seArchStArt StArt the seArching At the specified position.
		 * @pArAm isRegex Used to indicAte thAt `seArchString` is A regulAr expression.
		 * @pArAm mAtchCAse Force the mAtching to mAtch lower/upper cAse exActly.
		 * @pArAm wordSepArAtors Force the mAtching to mAtch entire words only. PAss null otherwise.
		 * @pArAm cAptureMAtches The result will contAin the cAptured groups.
		 * @return The rAnge where the previous mAtch is. It is null if no previous mAtch hAs been found.
		 */
		findPreviousMAtch(seArchString: string, seArchStArt: IPosition, isRegex: booleAn, mAtchCAse: booleAn, wordSepArAtors: string | null, cAptureMAtches: booleAn): FindMAtch | null;
		/**
		 * Get the lAnguAge AssociAted with this model.
		 */
		getModeId(): string;
		/**
		 * Get the word under or besides `position`.
		 * @pArAm position The position to look for A word.
		 * @return The word under or besides `position`. Might be null.
		 */
		getWordAtPosition(position: IPosition): IWordAtPosition | null;
		/**
		 * Get the word under or besides `position` trimmed to `position`.column
		 * @pArAm position The position to look for A word.
		 * @return The word under or besides `position`. Will never be null.
		 */
		getWordUntilPosition(position: IPosition): IWordAtPosition;
		/**
		 * Perform A minimum Amount of operAtions, in order to trAnsform the decorAtions
		 * identified by `oldDecorAtions` to the decorAtions described by `newDecorAtions`
		 * And returns the new identifiers AssociAted with the resulting decorAtions.
		 *
		 * @pArAm oldDecorAtions ArrAy contAining previous decorAtions identifiers.
		 * @pArAm newDecorAtions ArrAy describing whAt decorAtions should result After the cAll.
		 * @pArAm ownerId Identifies the editor id in which these decorAtions should AppeAr. If no `ownerId` is provided, the decorAtions will AppeAr in All editors thAt AttAch this model.
		 * @return An ArrAy contAining the new decorAtions identifiers.
		 */
		deltADecorAtions(oldDecorAtions: string[], newDecorAtions: IModelDeltADecorAtion[], ownerId?: number): string[];
		/**
		 * Get the options AssociAted with A decorAtion.
		 * @pArAm id The decorAtion id.
		 * @return The decorAtion options or null if the decorAtion wAs not found.
		 */
		getDecorAtionOptions(id: string): IModelDecorAtionOptions | null;
		/**
		 * Get the rAnge AssociAted with A decorAtion.
		 * @pArAm id The decorAtion id.
		 * @return The decorAtion rAnge or null if the decorAtion wAs not found.
		 */
		getDecorAtionRAnge(id: string): RAnge | null;
		/**
		 * Gets All the decorAtions for the line `lineNumber` As An ArrAy.
		 * @pArAm lineNumber The line number
		 * @pArAm ownerId If set, it will ignore decorAtions belonging to other owners.
		 * @pArAm filterOutVAlidAtion If set, it will ignore decorAtions specific to vAlidAtion (i.e. wArnings, errors).
		 * @return An ArrAy with the decorAtions
		 */
		getLineDecorAtions(lineNumber: number, ownerId?: number, filterOutVAlidAtion?: booleAn): IModelDecorAtion[];
		/**
		 * Gets All the decorAtions for the lines between `stArtLineNumber` And `endLineNumber` As An ArrAy.
		 * @pArAm stArtLineNumber The stArt line number
		 * @pArAm endLineNumber The end line number
		 * @pArAm ownerId If set, it will ignore decorAtions belonging to other owners.
		 * @pArAm filterOutVAlidAtion If set, it will ignore decorAtions specific to vAlidAtion (i.e. wArnings, errors).
		 * @return An ArrAy with the decorAtions
		 */
		getLinesDecorAtions(stArtLineNumber: number, endLineNumber: number, ownerId?: number, filterOutVAlidAtion?: booleAn): IModelDecorAtion[];
		/**
		 * Gets All the decorAtions in A rAnge As An ArrAy. Only `stArtLineNumber` And `endLineNumber` from `rAnge` Are used for filtering.
		 * So for now it returns All the decorAtions on the sAme line As `rAnge`.
		 * @pArAm rAnge The rAnge to seArch in
		 * @pArAm ownerId If set, it will ignore decorAtions belonging to other owners.
		 * @pArAm filterOutVAlidAtion If set, it will ignore decorAtions specific to vAlidAtion (i.e. wArnings, errors).
		 * @return An ArrAy with the decorAtions
		 */
		getDecorAtionsInRAnge(rAnge: IRAnge, ownerId?: number, filterOutVAlidAtion?: booleAn): IModelDecorAtion[];
		/**
		 * Gets All the decorAtions As An ArrAy.
		 * @pArAm ownerId If set, it will ignore decorAtions belonging to other owners.
		 * @pArAm filterOutVAlidAtion If set, it will ignore decorAtions specific to vAlidAtion (i.e. wArnings, errors).
		 */
		getAllDecorAtions(ownerId?: number, filterOutVAlidAtion?: booleAn): IModelDecorAtion[];
		/**
		 * Gets All the decorAtions thAt should be rendered in the overview ruler As An ArrAy.
		 * @pArAm ownerId If set, it will ignore decorAtions belonging to other owners.
		 * @pArAm filterOutVAlidAtion If set, it will ignore decorAtions specific to vAlidAtion (i.e. wArnings, errors).
		 */
		getOverviewRulerDecorAtions(ownerId?: number, filterOutVAlidAtion?: booleAn): IModelDecorAtion[];
		/**
		 * NormAlize A string contAining whitespAce According to indentAtion rules (converts to spAces or to tAbs).
		 */
		normAlizeIndentAtion(str: string): string;
		/**
		 * ChAnge the options of this model.
		 */
		updAteOptions(newOpts: ITextModelUpdAteOptions): void;
		/**
		 * Detect the indentAtion options for this model from its content.
		 */
		detectIndentAtion(defAultInsertSpAces: booleAn, defAultTAbSize: number): void;
		/**
		 * Push A stAck element onto the undo stAck. This Acts As An undo/redo point.
		 * The ideA is to use `pushEditOperAtions` to edit the model And then to
		 * `pushStAckElement` to creAte An undo/redo stop point.
		 */
		pushStAckElement(): void;
		/**
		 * Push edit operAtions, bAsicAlly editing the model. This is the preferred wAy
		 * of editing the model. The edit operAtions will lAnd on the undo stAck.
		 * @pArAm beforeCursorStAte The cursor stAte before the edit operAtions. This cursor stAte will be returned when `undo` or `redo` Are invoked.
		 * @pArAm editOperAtions The edit operAtions.
		 * @pArAm cursorStAteComputer A cAllbAck thAt cAn compute the resulting cursors stAte After the edit operAtions hAve been executed.
		 * @return The cursor stAte returned by the `cursorStAteComputer`.
		 */
		pushEditOperAtions(beforeCursorStAte: Selection[] | null, editOperAtions: IIdentifiedSingleEditOperAtion[], cursorStAteComputer: ICursorStAteComputer): Selection[] | null;
		/**
		 * ChAnge the end of line sequence. This is the preferred wAy of
		 * chAnging the eol sequence. This will lAnd on the undo stAck.
		 */
		pushEOL(eol: EndOfLineSequence): void;
		/**
		 * Edit the model without Adding the edits to the undo stAck.
		 * This cAn hAve dire consequences on the undo stAck! See @pushEditOperAtions for the preferred wAy.
		 * @pArAm operAtions The edit operAtions.
		 * @return If desired, the inverse edit operAtions, thAt, when Applied, will bring the model bAck to the previous stAte.
		 */
		ApplyEdits(operAtions: IIdentifiedSingleEditOperAtion[]): void;
		ApplyEdits(operAtions: IIdentifiedSingleEditOperAtion[], computeUndoEdits: fAlse): void;
		ApplyEdits(operAtions: IIdentifiedSingleEditOperAtion[], computeUndoEdits: true): IVAlidEditOperAtion[];
		/**
		 * ChAnge the end of line sequence without recording in the undo stAck.
		 * This cAn hAve dire consequences on the undo stAck! See @pushEOL for the preferred wAy.
		 */
		setEOL(eol: EndOfLineSequence): void;
		/**
		 * An event emitted when the contents of the model hAve chAnged.
		 * @event
		 */
		onDidChAngeContent(listener: (e: IModelContentChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when decorAtions of the model hAve chAnged.
		 * @event
		 */
		onDidChAngeDecorAtions(listener: (e: IModelDecorAtionsChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the model options hAve chAnged.
		 * @event
		 */
		onDidChAngeOptions(listener: (e: IModelOptionsChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the lAnguAge AssociAted with the model hAs chAnged.
		 * @event
		 */
		onDidChAngeLAnguAge(listener: (e: IModelLAnguAgeChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the lAnguAge configurAtion AssociAted with the model hAs chAnged.
		 * @event
		 */
		onDidChAngeLAnguAgeConfigurAtion(listener: (e: IModelLAnguAgeConfigurAtionChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted right before disposing the model.
		 * @event
		 */
		onWillDispose(listener: () => void): IDisposAble;
		/**
		 * Destroy this model. This will unbind the model from the mode
		 * And mAke All necessAry cleAn-up to releAse this object to the GC.
		 */
		dispose(): void;
	}

	/**
	 * A builder And helper for edit operAtions for A commAnd.
	 */
	export interfAce IEditOperAtionBuilder {
		/**
		 * Add A new edit operAtion (A replAce operAtion).
		 * @pArAm rAnge The rAnge to replAce (delete). MAy be empty to represent A simple insert.
		 * @pArAm text The text to replAce with. MAy be null to represent A simple delete.
		 */
		AddEditOperAtion(rAnge: IRAnge, text: string | null, forceMoveMArkers?: booleAn): void;
		/**
		 * Add A new edit operAtion (A replAce operAtion).
		 * The inverse edits will be Accessible in `ICursorStAteComputerDAtA.getInverseEditOperAtions()`
		 * @pArAm rAnge The rAnge to replAce (delete). MAy be empty to represent A simple insert.
		 * @pArAm text The text to replAce with. MAy be null to represent A simple delete.
		 */
		AddTrAckedEditOperAtion(rAnge: IRAnge, text: string | null, forceMoveMArkers?: booleAn): void;
		/**
		 * TrAck `selection` when Applying edit operAtions.
		 * A best effort will be mAde to not grow/expAnd the selection.
		 * An empty selection will clAmp to A neArby chArActer.
		 * @pArAm selection The selection to trAck.
		 * @pArAm trAckPreviousOnEmpty If set, And the selection is empty, indicAtes whether the selection
		 *           should clAmp to the previous or the next chArActer.
		 * @return A unique identifier.
		 */
		trAckSelection(selection: Selection, trAckPreviousOnEmpty?: booleAn): string;
	}

	/**
	 * A helper for computing cursor stAte After A commAnd.
	 */
	export interfAce ICursorStAteComputerDAtA {
		/**
		 * Get the inverse edit operAtions of the Added edit operAtions.
		 */
		getInverseEditOperAtions(): IVAlidEditOperAtion[];
		/**
		 * Get A previously trAcked selection.
		 * @pArAm id The unique identifier returned by `trAckSelection`.
		 * @return The selection.
		 */
		getTrAckedSelection(id: string): Selection;
	}

	/**
	 * A commAnd thAt modifies text / cursor stAte on A model.
	 */
	export interfAce ICommAnd {
		/**
		 * Get the edit operAtions needed to execute this commAnd.
		 * @pArAm model The model the commAnd will execute on.
		 * @pArAm builder A helper to collect the needed edit operAtions And to trAck selections.
		 */
		getEditOperAtions(model: ITextModel, builder: IEditOperAtionBuilder): void;
		/**
		 * Compute the cursor stAte After the edit operAtions were Applied.
		 * @pArAm model The model the commAnd hAs executed on.
		 * @pArAm helper A helper to get inverse edit operAtions And to get previously trAcked selections.
		 * @return The cursor stAte After the commAnd executed.
		 */
		computeCursorStAte(model: ITextModel, helper: ICursorStAteComputerDAtA): Selection;
	}

	/**
	 * A model for the diff editor.
	 */
	export interfAce IDiffEditorModel {
		/**
		 * OriginAl model.
		 */
		originAl: ITextModel;
		/**
		 * Modified model.
		 */
		modified: ITextModel;
	}

	/**
	 * An event describing thAt An editor hAs hAd its model reset (i.e. `editor.setModel()`).
	 */
	export interfAce IModelChAngedEvent {
		/**
		 * The `uri` of the previous model or null.
		 */
		reAdonly oldModelUrl: Uri | null;
		/**
		 * The `uri` of the new model or null.
		 */
		reAdonly newModelUrl: Uri | null;
	}

	export interfAce IDimension {
		width: number;
		height: number;
	}

	/**
	 * A chAnge
	 */
	export interfAce IChAnge {
		reAdonly originAlStArtLineNumber: number;
		reAdonly originAlEndLineNumber: number;
		reAdonly modifiedStArtLineNumber: number;
		reAdonly modifiedEndLineNumber: number;
	}

	/**
	 * A chArActer level chAnge.
	 */
	export interfAce IChArChAnge extends IChAnge {
		reAdonly originAlStArtColumn: number;
		reAdonly originAlEndColumn: number;
		reAdonly modifiedStArtColumn: number;
		reAdonly modifiedEndColumn: number;
	}

	/**
	 * A line chAnge
	 */
	export interfAce ILineChAnge extends IChAnge {
		reAdonly chArChAnges: IChArChAnge[] | undefined;
	}

	export interfAce IContentSizeChAngedEvent {
		reAdonly contentWidth: number;
		reAdonly contentHeight: number;
		reAdonly contentWidthChAnged: booleAn;
		reAdonly contentHeightChAnged: booleAn;
	}

	export interfAce INewScrollPosition {
		scrollLeft?: number;
		scrollTop?: number;
	}

	export interfAce IEditorAction {
		reAdonly id: string;
		reAdonly lAbel: string;
		reAdonly AliAs: string;
		isSupported(): booleAn;
		run(): Promise<void>;
	}

	export type IEditorModel = ITextModel | IDiffEditorModel;

	/**
	 * A (seriAlizAble) stAte of the cursors.
	 */
	export interfAce ICursorStAte {
		inSelectionMode: booleAn;
		selectionStArt: IPosition;
		position: IPosition;
	}

	/**
	 * A (seriAlizAble) stAte of the view.
	 */
	export interfAce IViewStAte {
		/** written by previous versions */
		scrollTop?: number;
		/** written by previous versions */
		scrollTopWithoutViewZones?: number;
		scrollLeft: number;
		firstPosition: IPosition;
		firstPositionDeltATop: number;
	}

	/**
	 * A (seriAlizAble) stAte of the code editor.
	 */
	export interfAce ICodeEditorViewStAte {
		cursorStAte: ICursorStAte[];
		viewStAte: IViewStAte;
		contributionsStAte: {
			[id: string]: Any;
		};
	}

	/**
	 * (SeriAlizAble) View stAte for the diff editor.
	 */
	export interfAce IDiffEditorViewStAte {
		originAl: ICodeEditorViewStAte | null;
		modified: ICodeEditorViewStAte | null;
	}

	/**
	 * An editor view stAte.
	 */
	export type IEditorViewStAte = ICodeEditorViewStAte | IDiffEditorViewStAte;

	export enum ScrollType {
		Smooth = 0,
		ImmediAte = 1
	}

	/**
	 * An editor.
	 */
	export interfAce IEditor {
		/**
		 * An event emitted when the editor hAs been disposed.
		 * @event
		 */
		onDidDispose(listener: () => void): IDisposAble;
		/**
		 * Dispose the editor.
		 */
		dispose(): void;
		/**
		 * Get A unique id for this editor instAnce.
		 */
		getId(): string;
		/**
		 * Get the editor type. PleAse see `EditorType`.
		 * This is to Avoid An instAnceof check
		 */
		getEditorType(): string;
		/**
		 * UpdAte the editor's options After the editor hAs been creAted.
		 */
		updAteOptions(newOptions: IEditorOptions): void;
		/**
		 * Instructs the editor to remeAsure its contAiner. This method should
		 * be cAlled when the contAiner of the editor gets resized.
		 *
		 * If A dimension is pAssed in, the pAssed in vAlue will be used.
		 */
		lAyout(dimension?: IDimension): void;
		/**
		 * Brings browser focus to the editor text
		 */
		focus(): void;
		/**
		 * Returns true if the text inside this editor is focused (i.e. cursor is blinking).
		 */
		hAsTextFocus(): booleAn;
		/**
		 * Returns All Actions AssociAted with this editor.
		 */
		getSupportedActions(): IEditorAction[];
		/**
		 * SAves current view stAte of the editor in A seriAlizAble object.
		 */
		sAveViewStAte(): IEditorViewStAte | null;
		/**
		 * Restores the view stAte of the editor from A seriAlizAble object generAted by `sAveViewStAte`.
		 */
		restoreViewStAte(stAte: IEditorViewStAte): void;
		/**
		 * Given A position, returns A column number thAt tAkes tAb-widths into Account.
		 */
		getVisibleColumnFromPosition(position: IPosition): number;
		/**
		 * Returns the primAry position of the cursor.
		 */
		getPosition(): Position | null;
		/**
		 * Set the primAry position of the cursor. This will remove Any secondAry cursors.
		 * @pArAm position New primAry cursor's position
		 */
		setPosition(position: IPosition): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl A line.
		 */
		reveAlLine(lineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl A line centered verticAlly.
		 */
		reveAlLineInCenter(lineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl A line centered verticAlly only if it lies outside the viewport.
		 */
		reveAlLineInCenterIfOutsideViewport(lineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl A line close to the top of the viewport,
		 * optimized for viewing A code definition.
		 */
		reveAlLineNeArTop(lineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A position.
		 */
		reveAlPosition(position: IPosition, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A position centered verticAlly.
		 */
		reveAlPositionInCenter(position: IPosition, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A position centered verticAlly only if it lies outside the viewport.
		 */
		reveAlPositionInCenterIfOutsideViewport(position: IPosition, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A position close to the top of the viewport,
		 * optimized for viewing A code definition.
		 */
		reveAlPositionNeArTop(position: IPosition, scrollType?: ScrollType): void;
		/**
		 * Returns the primAry selection of the editor.
		 */
		getSelection(): Selection | null;
		/**
		 * Returns All the selections of the editor.
		 */
		getSelections(): Selection[] | null;
		/**
		 * Set the primAry selection of the editor. This will remove Any secondAry cursors.
		 * @pArAm selection The new selection
		 */
		setSelection(selection: IRAnge): void;
		/**
		 * Set the primAry selection of the editor. This will remove Any secondAry cursors.
		 * @pArAm selection The new selection
		 */
		setSelection(selection: RAnge): void;
		/**
		 * Set the primAry selection of the editor. This will remove Any secondAry cursors.
		 * @pArAm selection The new selection
		 */
		setSelection(selection: ISelection): void;
		/**
		 * Set the primAry selection of the editor. This will remove Any secondAry cursors.
		 * @pArAm selection The new selection
		 */
		setSelection(selection: Selection): void;
		/**
		 * Set the selections for All the cursors of the editor.
		 * Cursors will be removed or Added, As necessAry.
		 */
		setSelections(selections: reAdonly ISelection[]): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl lines.
		 */
		reveAlLines(stArtLineNumber: number, endLineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl lines centered verticAlly.
		 */
		reveAlLinesInCenter(lineNumber: number, endLineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl lines centered verticAlly only if it lies outside the viewport.
		 */
		reveAlLinesInCenterIfOutsideViewport(lineNumber: number, endLineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly As necessAry And reveAl lines close to the top of the viewport,
		 * optimized for viewing A code definition.
		 */
		reveAlLinesNeArTop(lineNumber: number, endLineNumber: number, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A rAnge.
		 */
		reveAlRAnge(rAnge: IRAnge, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A rAnge centered verticAlly.
		 */
		reveAlRAngeInCenter(rAnge: IRAnge, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A rAnge At the top of the viewport.
		 */
		reveAlRAngeAtTop(rAnge: IRAnge, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A rAnge centered verticAlly only if it lies outside the viewport.
		 */
		reveAlRAngeInCenterIfOutsideViewport(rAnge: IRAnge, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A rAnge close to the top of the viewport,
		 * optimized for viewing A code definition.
		 */
		reveAlRAngeNeArTop(rAnge: IRAnge, scrollType?: ScrollType): void;
		/**
		 * Scroll verticAlly or horizontAlly As necessAry And reveAl A rAnge close to the top of the viewport,
		 * optimized for viewing A code definition. Only if it lies outside the viewport.
		 */
		reveAlRAngeNeArTopIfOutsideViewport(rAnge: IRAnge, scrollType?: ScrollType): void;
		/**
		 * Directly trigger A hAndler or An editor Action.
		 * @pArAm source The source of the cAll.
		 * @pArAm hAndlerId The id of the hAndler or the id of A contribution.
		 * @pArAm pAyloAd ExtrA dAtA to be sent to the hAndler.
		 */
		trigger(source: string | null | undefined, hAndlerId: string, pAyloAd: Any): void;
		/**
		 * Gets the current model AttAched to this editor.
		 */
		getModel(): IEditorModel | null;
		/**
		 * Sets the current model AttAched to this editor.
		 * If the previous model wAs creAted by the editor viA the vAlue key in the options
		 * literAl object, it will be destroyed. Otherwise, if the previous model wAs set
		 * viA setModel, or the model key in the options literAl object, the previous model
		 * will not be destroyed.
		 * It is sAfe to cAll setModel(null) to simply detAch the current model from the editor.
		 */
		setModel(model: IEditorModel | null): void;
	}

	/**
	 * An editor contribution thAt gets creAted every time A new editor gets creAted And gets disposed when the editor gets disposed.
	 */
	export interfAce IEditorContribution {
		/**
		 * Dispose this contribution.
		 */
		dispose(): void;
		/**
		 * Store view stAte.
		 */
		sAveViewStAte?(): Any;
		/**
		 * Restore view stAte.
		 */
		restoreViewStAte?(stAte: Any): void;
	}

	/**
	 * The type of the `IEditor`.
	 */
	export const EditorType: {
		ICodeEditor: string;
		IDiffEditor: string;
	};

	/**
	 * An event describing thAt the current mode AssociAted with A model hAs chAnged.
	 */
	export interfAce IModelLAnguAgeChAngedEvent {
		/**
		 * Previous lAnguAge
		 */
		reAdonly oldLAnguAge: string;
		/**
		 * New lAnguAge
		 */
		reAdonly newLAnguAge: string;
	}

	/**
	 * An event describing thAt the lAnguAge configurAtion AssociAted with A model hAs chAnged.
	 */
	export interfAce IModelLAnguAgeConfigurAtionChAngedEvent {
	}

	export interfAce IModelContentChAnge {
		/**
		 * The rAnge thAt got replAced.
		 */
		reAdonly rAnge: IRAnge;
		/**
		 * The offset of the rAnge thAt got replAced.
		 */
		reAdonly rAngeOffset: number;
		/**
		 * The length of the rAnge thAt got replAced.
		 */
		reAdonly rAngeLength: number;
		/**
		 * The new text for the rAnge.
		 */
		reAdonly text: string;
	}

	/**
	 * An event describing A chAnge in the text of A model.
	 */
	export interfAce IModelContentChAngedEvent {
		reAdonly chAnges: IModelContentChAnge[];
		/**
		 * The (new) end-of-line chArActer.
		 */
		reAdonly eol: string;
		/**
		 * The new version id the model hAs trAnsitioned to.
		 */
		reAdonly versionId: number;
		/**
		 * FlAg thAt indicAtes thAt this event wAs generAted while undoing.
		 */
		reAdonly isUndoing: booleAn;
		/**
		 * FlAg thAt indicAtes thAt this event wAs generAted while redoing.
		 */
		reAdonly isRedoing: booleAn;
		/**
		 * FlAg thAt indicAtes thAt All decorAtions were lost with this edit.
		 * The model hAs been reset to A new vAlue.
		 */
		reAdonly isFlush: booleAn;
	}

	/**
	 * An event describing thAt model decorAtions hAve chAnged.
	 */
	export interfAce IModelDecorAtionsChAngedEvent {
		reAdonly AffectsMinimAp: booleAn;
		reAdonly AffectsOverviewRuler: booleAn;
	}

	export interfAce IModelOptionsChAngedEvent {
		reAdonly tAbSize: booleAn;
		reAdonly indentSize: booleAn;
		reAdonly insertSpAces: booleAn;
		reAdonly trimAutoWhitespAce: booleAn;
	}

	/**
	 * Describes the reAson the cursor hAs chAnged its position.
	 */
	export enum CursorChAngeReAson {
		/**
		 * Unknown or not set.
		 */
		NotSet = 0,
		/**
		 * A `model.setVAlue()` wAs cAlled.
		 */
		ContentFlush = 1,
		/**
		 * The `model` hAs been chAnged outside of this cursor And the cursor recovers its position from AssociAted mArkers.
		 */
		RecoverFromMArkers = 2,
		/**
		 * There wAs An explicit user gesture.
		 */
		Explicit = 3,
		/**
		 * There wAs A PAste.
		 */
		PAste = 4,
		/**
		 * There wAs An Undo.
		 */
		Undo = 5,
		/**
		 * There wAs A Redo.
		 */
		Redo = 6
	}

	/**
	 * An event describing thAt the cursor position hAs chAnged.
	 */
	export interfAce ICursorPositionChAngedEvent {
		/**
		 * PrimAry cursor's position.
		 */
		reAdonly position: Position;
		/**
		 * SecondAry cursors' position.
		 */
		reAdonly secondAryPositions: Position[];
		/**
		 * ReAson.
		 */
		reAdonly reAson: CursorChAngeReAson;
		/**
		 * Source of the cAll thAt cAused the event.
		 */
		reAdonly source: string;
	}

	/**
	 * An event describing thAt the cursor selection hAs chAnged.
	 */
	export interfAce ICursorSelectionChAngedEvent {
		/**
		 * The primAry selection.
		 */
		reAdonly selection: Selection;
		/**
		 * The secondAry selections.
		 */
		reAdonly secondArySelections: Selection[];
		/**
		 * The model version id.
		 */
		reAdonly modelVersionId: number;
		/**
		 * The old selections.
		 */
		reAdonly oldSelections: Selection[] | null;
		/**
		 * The model version id the thAt `oldSelections` refer to.
		 */
		reAdonly oldModelVersionId: number;
		/**
		 * Source of the cAll thAt cAused the event.
		 */
		reAdonly source: string;
		/**
		 * ReAson.
		 */
		reAdonly reAson: CursorChAngeReAson;
	}

	export enum AccessibilitySupport {
		/**
		 * This should be the browser cAse where it is not known if A screen reAder is AttAched or no.
		 */
		Unknown = 0,
		DisAbled = 1,
		EnAbled = 2
	}

	/**
	 * ConfigurAtion options for Auto closing quotes And brAckets
	 */
	export type EditorAutoClosingStrAtegy = 'AlwAys' | 'lAnguAgeDefined' | 'beforeWhitespAce' | 'never';

	/**
	 * ConfigurAtion options for Auto wrApping quotes And brAckets
	 */
	export type EditorAutoSurroundStrAtegy = 'lAnguAgeDefined' | 'quotes' | 'brAckets' | 'never';

	/**
	 * ConfigurAtion options for typing over closing quotes or brAckets
	 */
	export type EditorAutoClosingOvertypeStrAtegy = 'AlwAys' | 'Auto' | 'never';

	/**
	 * ConfigurAtion options for Auto indentAtion in the editor
	 */
	export enum EditorAutoIndentStrAtegy {
		None = 0,
		Keep = 1,
		BrAckets = 2,
		AdvAnced = 3,
		Full = 4
	}

	/**
	 * ConfigurAtion options for the editor.
	 */
	export interfAce IEditorOptions {
		/**
		 * This editor is used inside A diff editor.
		 */
		inDiffEditor?: booleAn;
		/**
		 * The AriA lAbel for the editor's textAreA (when it is focused).
		 */
		AriALAbel?: string;
		/**
		 * The `tAbindex` property of the editor's textAreA
		 */
		tAbIndex?: number;
		/**
		 * Render verticAl lines At the specified columns.
		 * DefAults to empty ArrAy.
		 */
		rulers?: (number | IRulerOption)[];
		/**
		 * A string contAining the word sepArAtors used when doing word nAvigAtion.
		 * DefAults to `~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?
		 */
		wordSepArAtors?: string;
		/**
		 * EnAble Linux primAry clipboArd.
		 * DefAults to true.
		 */
		selectionClipboArd?: booleAn;
		/**
		 * Control the rendering of line numbers.
		 * If it is A function, it will be invoked when rendering A line number And the return vAlue will be rendered.
		 * Otherwise, if it is A truey, line numbers will be rendered normAlly (equivAlent of using An identity function).
		 * Otherwise, line numbers will not be rendered.
		 * DefAults to `on`.
		 */
		lineNumbers?: LineNumbersType;
		/**
		 * Controls the minimAl number of visible leAding And trAiling lines surrounding the cursor.
		 * DefAults to 0.
		*/
		cursorSurroundingLines?: number;
		/**
		 * Controls when `cursorSurroundingLines` should be enforced
		 * DefAults to `defAult`, `cursorSurroundingLines` is not enforced when cursor position is chAnged
		 * by mouse.
		*/
		cursorSurroundingLinesStyle?: 'defAult' | 'All';
		/**
		 * Render lAst line number when the file ends with A newline.
		 * DefAults to true.
		*/
		renderFinAlNewline?: booleAn;
		/**
		 * Remove unusuAl line terminAtors like LINE SEPARATOR (LS), PARAGRAPH SEPARATOR (PS).
		 * DefAults to 'prompt'.
		 */
		unusuAlLineTerminAtors?: 'Auto' | 'off' | 'prompt';
		/**
		 * Should the corresponding line be selected when clicking on the line number?
		 * DefAults to true.
		 */
		selectOnLineNumbers?: booleAn;
		/**
		 * Control the width of line numbers, by reserving horizontAl spAce for rendering At leAst An Amount of digits.
		 * DefAults to 5.
		 */
		lineNumbersMinChArs?: number;
		/**
		 * EnAble the rendering of the glyph mArgin.
		 * DefAults to true in vscode And to fAlse in monAco-editor.
		 */
		glyphMArgin?: booleAn;
		/**
		 * The width reserved for line decorAtions (in px).
		 * Line decorAtions Are plAced between line numbers And the editor content.
		 * You cAn pAss in A string in the formAt floAting point followed by "ch". e.g. 1.3ch.
		 * DefAults to 10.
		 */
		lineDecorAtionsWidth?: number | string;
		/**
		 * When reveAling the cursor, A virtuAl pAdding (px) is Added to the cursor, turning it into A rectAngle.
		 * This virtuAl pAdding ensures thAt the cursor gets reveAled before hitting the edge of the viewport.
		 * DefAults to 30 (px).
		 */
		reveAlHorizontAlRightPAdding?: number;
		/**
		 * Render the editor selection with rounded borders.
		 * DefAults to true.
		 */
		roundedSelection?: booleAn;
		/**
		 * ClAss nAme to be Added to the editor.
		 */
		extrAEditorClAssNAme?: string;
		/**
		 * Should the editor be reAd only.
		 * DefAults to fAlse.
		 */
		reAdOnly?: booleAn;
		/**
		 * RenAme mAtching regions on type.
		 * DefAults to fAlse.
		 */
		renAmeOnType?: booleAn;
		/**
		 * Should the editor render vAlidAtion decorAtions.
		 * DefAults to editAble.
		 */
		renderVAlidAtionDecorAtions?: 'editAble' | 'on' | 'off';
		/**
		 * Control the behAvior And rendering of the scrollbArs.
		 */
		scrollbAr?: IEditorScrollbArOptions;
		/**
		 * Control the behAvior And rendering of the minimAp.
		 */
		minimAp?: IEditorMinimApOptions;
		/**
		 * Control the behAvior of the find widget.
		 */
		find?: IEditorFindOptions;
		/**
		 * DisplAy overflow widgets As `fixed`.
		 * DefAults to `fAlse`.
		 */
		fixedOverflowWidgets?: booleAn;
		/**
		 * The number of verticAl lAnes the overview ruler should render.
		 * DefAults to 3.
		 */
		overviewRulerLAnes?: number;
		/**
		 * Controls if A border should be drAwn Around the overview ruler.
		 * DefAults to `true`.
		 */
		overviewRulerBorder?: booleAn;
		/**
		 * Control the cursor AnimAtion style, possible vAlues Are 'blink', 'smooth', 'phAse', 'expAnd' And 'solid'.
		 * DefAults to 'blink'.
		 */
		cursorBlinking?: 'blink' | 'smooth' | 'phAse' | 'expAnd' | 'solid';
		/**
		 * Zoom the font in the editor when using the mouse wheel in combinAtion with holding Ctrl.
		 * DefAults to fAlse.
		 */
		mouseWheelZoom?: booleAn;
		/**
		 * Control the mouse pointer style, either 'text' or 'defAult' or 'copy'
		 * DefAults to 'text'
		 */
		mouseStyle?: 'text' | 'defAult' | 'copy';
		/**
		 * EnAble smooth cAret AnimAtion.
		 * DefAults to fAlse.
		 */
		cursorSmoothCAretAnimAtion?: booleAn;
		/**
		 * Control the cursor style, either 'block' or 'line'.
		 * DefAults to 'line'.
		 */
		cursorStyle?: 'line' | 'block' | 'underline' | 'line-thin' | 'block-outline' | 'underline-thin';
		/**
		 * Control the width of the cursor when cursorStyle is set to 'line'
		 */
		cursorWidth?: number;
		/**
		 * EnAble font ligAtures.
		 * DefAults to fAlse.
		 */
		fontLigAtures?: booleAn | string;
		/**
		 * DisAble the use of `trAnsform: trAnslAte3d(0px, 0px, 0px)` for the editor mArgin And lines lAyers.
		 * The usAge of `trAnsform: trAnslAte3d(0px, 0px, 0px)` Acts As A hint for browsers to creAte An extrA lAyer.
		 * DefAults to fAlse.
		 */
		disAbleLAyerHinting?: booleAn;
		/**
		 * DisAble the optimizAtions for monospAce fonts.
		 * DefAults to fAlse.
		 */
		disAbleMonospAceOptimizAtions?: booleAn;
		/**
		 * Should the cursor be hidden in the overview ruler.
		 * DefAults to fAlse.
		 */
		hideCursorInOverviewRuler?: booleAn;
		/**
		 * EnAble thAt scrolling cAn go one screen size After the lAst line.
		 * DefAults to true.
		 */
		scrollBeyondLAstLine?: booleAn;
		/**
		 * EnAble thAt scrolling cAn go beyond the lAst column by A number of columns.
		 * DefAults to 5.
		 */
		scrollBeyondLAstColumn?: number;
		/**
		 * EnAble thAt the editor AnimAtes scrolling to A position.
		 * DefAults to fAlse.
		 */
		smoothScrolling?: booleAn;
		/**
		 * EnAble thAt the editor will instAll An intervAl to check if its contAiner dom node size hAs chAnged.
		 * EnAbling this might hAve A severe performAnce impAct.
		 * DefAults to fAlse.
		 */
		AutomAticLAyout?: booleAn;
		/**
		 * Control the wrApping of the editor.
		 * When `wordWrAp` = "off", the lines will never wrAp.
		 * When `wordWrAp` = "on", the lines will wrAp At the viewport width.
		 * When `wordWrAp` = "wordWrApColumn", the lines will wrAp At `wordWrApColumn`.
		 * When `wordWrAp` = "bounded", the lines will wrAp At min(viewport width, wordWrApColumn).
		 * DefAults to "off".
		 */
		wordWrAp?: 'off' | 'on' | 'wordWrApColumn' | 'bounded';
		/**
		 * Control the wrApping of the editor.
		 * When `wordWrAp` = "off", the lines will never wrAp.
		 * When `wordWrAp` = "on", the lines will wrAp At the viewport width.
		 * When `wordWrAp` = "wordWrApColumn", the lines will wrAp At `wordWrApColumn`.
		 * When `wordWrAp` = "bounded", the lines will wrAp At min(viewport width, wordWrApColumn).
		 * DefAults to 80.
		 */
		wordWrApColumn?: number;
		/**
		 * Force word wrApping when the text AppeArs to be of A minified/generAted file.
		 * DefAults to true.
		 */
		wordWrApMinified?: booleAn;
		/**
		 * Control indentAtion of wrApped lines. CAn be: 'none', 'sAme', 'indent' or 'deepIndent'.
		 * DefAults to 'sAme' in vscode And to 'none' in monAco-editor.
		 */
		wrAppingIndent?: 'none' | 'sAme' | 'indent' | 'deepIndent';
		/**
		 * Controls the wrApping strAtegy to use.
		 * DefAults to 'simple'.
		 */
		wrAppingStrAtegy?: 'simple' | 'AdvAnced';
		/**
		 * Configure word wrApping chArActers. A breAk will be introduced before these chArActers.
		 * DefAults to '([{‘“〈《「『【〔（［｛｢£¥＄￡￥+＋'.
		 */
		wordWrApBreAkBeforeChArActers?: string;
		/**
		 * Configure word wrApping chArActers. A breAk will be introduced After these chArActers.
		 * DefAults to ' \t})]?|/&.,;¢°′″‰℃、。｡､￠，．：；？！％・･ゝゞヽヾーァィゥェォッャュョヮヵヶぁぃぅぇぉっゃゅょゎゕゖㇰㇱㇲㇳㇴㇵㇶㇷㇸㇹㇺㇻㇼㇽㇾㇿ々〻ｧｨｩｪｫｬｭｮｯｰ”〉》」』】〕）］｝｣'.
		 */
		wordWrApBreAkAfterChArActers?: string;
		/**
		 * PerformAnce guArd: Stop rendering A line After x chArActers.
		 * DefAults to 10000.
		 * Use -1 to never stop rendering
		 */
		stopRenderingLineAfter?: number;
		/**
		 * Configure the editor's hover.
		 */
		hover?: IEditorHoverOptions;
		/**
		 * EnAble detecting links And mAking them clickAble.
		 * DefAults to true.
		 */
		links?: booleAn;
		/**
		 * EnAble inline color decorAtors And color picker rendering.
		 */
		colorDecorAtors?: booleAn;
		/**
		 * Control the behAviour of comments in the editor.
		 */
		comments?: IEditorCommentsOptions;
		/**
		 * EnAble custom contextmenu.
		 * DefAults to true.
		 */
		contextmenu?: booleAn;
		/**
		 * A multiplier to be used on the `deltAX` And `deltAY` of mouse wheel scroll events.
		 * DefAults to 1.
		 */
		mouseWheelScrollSensitivity?: number;
		/**
		 * FAstScrolling mulitplier speed when pressing `Alt`
		 * DefAults to 5.
		 */
		fAstScrollSensitivity?: number;
		/**
		 * EnAble thAt the editor scrolls only the predominAnt Axis. Prevents horizontAl drift when scrolling verticAlly on A trAckpAd.
		 * DefAults to true.
		 */
		scrollPredominAntAxis?: booleAn;
		/**
		 * EnAble thAt the selection with the mouse And keys is doing column selection.
		 * DefAults to fAlse.
		 */
		columnSelection?: booleAn;
		/**
		 * The modifier to be used to Add multiple cursors with the mouse.
		 * DefAults to 'Alt'
		 */
		multiCursorModifier?: 'ctrlCmd' | 'Alt';
		/**
		 * Merge overlApping selections.
		 * DefAults to true
		 */
		multiCursorMergeOverlApping?: booleAn;
		/**
		 * Configure the behAviour when pAsting A text with the line count equAl to the cursor count.
		 * DefAults to 'spreAd'.
		 */
		multiCursorPAste?: 'spreAd' | 'full';
		/**
		 * Configure the editor's Accessibility support.
		 * DefAults to 'Auto'. It is best to leAve this to 'Auto'.
		 */
		AccessibilitySupport?: 'Auto' | 'off' | 'on';
		/**
		 * Controls the number of lines in the editor thAt cAn be reAd out by A screen reAder
		 */
		AccessibilityPAgeSize?: number;
		/**
		 * Suggest options.
		 */
		suggest?: ISuggestOptions;
		/**
		 *
		 */
		gotoLocAtion?: IGotoLocAtionOptions;
		/**
		 * EnAble quick suggestions (shAdow suggestions)
		 * DefAults to true.
		 */
		quickSuggestions?: booleAn | IQuickSuggestionsOptions;
		/**
		 * Quick suggestions show delAy (in ms)
		 * DefAults to 10 (ms)
		 */
		quickSuggestionsDelAy?: number;
		/**
		 * Controls the spAcing Around the editor.
		 */
		pAdding?: IEditorPAddingOptions;
		/**
		 * PArAmeter hint options.
		 */
		pArAmeterHints?: IEditorPArAmeterHintOptions;
		/**
		 * Options for Auto closing brAckets.
		 * DefAults to lAnguAge defined behAvior.
		 */
		AutoClosingBrAckets?: EditorAutoClosingStrAtegy;
		/**
		 * Options for Auto closing quotes.
		 * DefAults to lAnguAge defined behAvior.
		 */
		AutoClosingQuotes?: EditorAutoClosingStrAtegy;
		/**
		 * Options for typing over closing quotes or brAckets.
		 */
		AutoClosingOvertype?: EditorAutoClosingOvertypeStrAtegy;
		/**
		 * Options for Auto surrounding.
		 * DefAults to AlwAys Allowing Auto surrounding.
		 */
		AutoSurround?: EditorAutoSurroundStrAtegy;
		/**
		 * Controls whether the editor should AutomAticAlly Adjust the indentAtion when users type, pAste, move or indent lines.
		 * DefAults to AdvAnced.
		 */
		AutoIndent?: 'none' | 'keep' | 'brAckets' | 'AdvAnced' | 'full';
		/**
		 * EnAble formAt on type.
		 * DefAults to fAlse.
		 */
		formAtOnType?: booleAn;
		/**
		 * EnAble formAt on pAste.
		 * DefAults to fAlse.
		 */
		formAtOnPAste?: booleAn;
		/**
		 * Controls if the editor should Allow to move selections viA drAg And drop.
		 * DefAults to fAlse.
		 */
		drAgAndDrop?: booleAn;
		/**
		 * EnAble the suggestion box to pop-up on trigger chArActers.
		 * DefAults to true.
		 */
		suggestOnTriggerChArActers?: booleAn;
		/**
		 * Accept suggestions on ENTER.
		 * DefAults to 'on'.
		 */
		AcceptSuggestionOnEnter?: 'on' | 'smArt' | 'off';
		/**
		 * Accept suggestions on provider defined chArActers.
		 * DefAults to true.
		 */
		AcceptSuggestionOnCommitChArActer?: booleAn;
		/**
		 * EnAble snippet suggestions. DefAult to 'true'.
		 */
		snippetSuggestions?: 'top' | 'bottom' | 'inline' | 'none';
		/**
		 * Copying without A selection copies the current line.
		 */
		emptySelectionClipboArd?: booleAn;
		/**
		 * SyntAx highlighting is copied.
		 */
		copyWithSyntAxHighlighting?: booleAn;
		/**
		 * The history mode for suggestions.
		 */
		suggestSelection?: 'first' | 'recentlyUsed' | 'recentlyUsedByPrefix';
		/**
		 * The font size for the suggest widget.
		 * DefAults to the editor font size.
		 */
		suggestFontSize?: number;
		/**
		 * The line height for the suggest widget.
		 * DefAults to the editor line height.
		 */
		suggestLineHeight?: number;
		/**
		 * EnAble tAb completion.
		 */
		tAbCompletion?: 'on' | 'off' | 'onlySnippets';
		/**
		 * EnAble selection highlight.
		 * DefAults to true.
		 */
		selectionHighlight?: booleAn;
		/**
		 * EnAble semAntic occurrences highlight.
		 * DefAults to true.
		 */
		occurrencesHighlight?: booleAn;
		/**
		 * Show code lens
		 * DefAults to true.
		 */
		codeLens?: booleAn;
		/**
		 * Control the behAvior And rendering of the code Action lightbulb.
		 */
		lightbulb?: IEditorLightbulbOptions;
		/**
		 * Timeout for running code Actions on sAve.
		 */
		codeActionsOnSAveTimeout?: number;
		/**
		 * EnAble code folding.
		 * DefAults to true.
		 */
		folding?: booleAn;
		/**
		 * Selects the folding strAtegy. 'Auto' uses the strAtegies contributed for the current document, 'indentAtion' uses the indentAtion bAsed folding strAtegy.
		 * DefAults to 'Auto'.
		 */
		foldingStrAtegy?: 'Auto' | 'indentAtion';
		/**
		 * EnAble highlight for folded regions.
		 * DefAults to true.
		 */
		foldingHighlight?: booleAn;
		/**
		 * Controls whether the fold Actions in the gutter stAy AlwAys visible or hide unless the mouse is over the gutter.
		 * DefAults to 'mouseover'.
		 */
		showFoldingControls?: 'AlwAys' | 'mouseover';
		/**
		 * Controls whether clicking on the empty content After A folded line will unfold the line.
		 * DefAults to fAlse.
		 */
		unfoldOnClickAfterEndOfLine?: booleAn;
		/**
		 * EnAble highlighting of mAtching brAckets.
		 * DefAults to 'AlwAys'.
		 */
		mAtchBrAckets?: 'never' | 'neAr' | 'AlwAys';
		/**
		 * EnAble rendering of whitespAce.
		 * DefAults to none.
		 */
		renderWhitespAce?: 'none' | 'boundAry' | 'selection' | 'trAiling' | 'All';
		/**
		 * EnAble rendering of control chArActers.
		 * DefAults to fAlse.
		 */
		renderControlChArActers?: booleAn;
		/**
		 * EnAble rendering of indent guides.
		 * DefAults to true.
		 */
		renderIndentGuides?: booleAn;
		/**
		 * EnAble highlighting of the Active indent guide.
		 * DefAults to true.
		 */
		highlightActiveIndentGuide?: booleAn;
		/**
		 * EnAble rendering of current line highlight.
		 * DefAults to All.
		 */
		renderLineHighlight?: 'none' | 'gutter' | 'line' | 'All';
		/**
		 * Control if the current line highlight should be rendered only the editor is focused.
		 * DefAults to fAlse.
		 */
		renderLineHighlightOnlyWhenFocus?: booleAn;
		/**
		 * Inserting And deleting whitespAce follows tAb stops.
		 */
		useTAbStops?: booleAn;
		/**
		 * The font fAmily
		 */
		fontFAmily?: string;
		/**
		 * The font weight
		 */
		fontWeight?: string;
		/**
		 * The font size
		 */
		fontSize?: number;
		/**
		 * The line height
		 */
		lineHeight?: number;
		/**
		 * The letter spAcing
		 */
		letterSpAcing?: number;
		/**
		 * Controls fAding out of unused vAriAbles.
		 */
		showUnused?: booleAn;
		/**
		 * Controls whether to focus the inline editor in the peek widget by defAult.
		 * DefAults to fAlse.
		 */
		peekWidgetDefAultFocus?: 'tree' | 'editor';
		/**
		 * Controls whether the definition link opens element in the peek widget.
		 * DefAults to fAlse.
		 */
		definitionLinkOpensInPeek?: booleAn;
		/**
		 * Controls strikethrough deprecAted vAriAbles.
		 */
		showDeprecAted?: booleAn;
	}

	/**
	 * ConfigurAtion options for the diff editor.
	 */
	export interfAce IDiffEditorOptions extends IEditorOptions {
		/**
		 * Allow the user to resize the diff editor split view.
		 * DefAults to true.
		 */
		enAbleSplitViewResizing?: booleAn;
		/**
		 * Render the differences in two side-by-side editors.
		 * DefAults to true.
		 */
		renderSideBySide?: booleAn;
		/**
		 * Timeout in milliseconds After which diff computAtion is cAncelled.
		 * DefAults to 5000.
		 */
		mAxComputAtionTime?: number;
		/**
		 * Compute the diff by ignoring leAding/trAiling whitespAce
		 * DefAults to true.
		 */
		ignoreTrimWhitespAce?: booleAn;
		/**
		 * Render +/- indicAtors for Added/deleted chAnges.
		 * DefAults to true.
		 */
		renderIndicAtors?: booleAn;
		/**
		 * OriginAl model should be editAble?
		 * DefAults to fAlse.
		 */
		originAlEditAble?: booleAn;
		/**
		 * OriginAl editor should be hAve code lens enAbled?
		 * DefAults to fAlse.
		 */
		originAlCodeLens?: booleAn;
		/**
		 * Modified editor should be hAve code lens enAbled?
		 * DefAults to fAlse.
		 */
		modifiedCodeLens?: booleAn;
	}

	/**
	 * An event describing thAt the configurAtion of the editor hAs chAnged.
	 */
	export clAss ConfigurAtionChAngedEvent {
		hAsChAnged(id: EditorOption): booleAn;
	}

	/**
	 * All computed editor options.
	 */
	export interfAce IComputedEditorOptions {
		get<T extends EditorOption>(id: T): FindComputedEditorOptionVAlueById<T>;
	}

	export interfAce IEditorOption<K1 extends EditorOption, V> {
		reAdonly id: K1;
		reAdonly nAme: string;
		defAultVAlue: V;
	}

	/**
	 * ConfigurAtion options for editor comments
	 */
	export interfAce IEditorCommentsOptions {
		/**
		 * Insert A spAce After the line comment token And inside the block comments tokens.
		 * DefAults to true.
		 */
		insertSpAce?: booleAn;
		/**
		 * Ignore empty lines when inserting line comments.
		 * DefAults to true.
		 */
		ignoreEmptyLines?: booleAn;
	}

	export type EditorCommentsOptions = ReAdonly<Required<IEditorCommentsOptions>>;

	/**
	 * The kind of AnimAtion in which the editor's cursor should be rendered.
	 */
	export enum TextEditorCursorBlinkingStyle {
		/**
		 * Hidden
		 */
		Hidden = 0,
		/**
		 * Blinking
		 */
		Blink = 1,
		/**
		 * Blinking with smooth fAding
		 */
		Smooth = 2,
		/**
		 * Blinking with prolonged filled stAte And smooth fAding
		 */
		PhAse = 3,
		/**
		 * ExpAnd collApse AnimAtion on the y Axis
		 */
		ExpAnd = 4,
		/**
		 * No-Blinking
		 */
		Solid = 5
	}

	/**
	 * The style in which the editor's cursor should be rendered.
	 */
	export enum TextEditorCursorStyle {
		/**
		 * As A verticAl line (sitting between two chArActers).
		 */
		Line = 1,
		/**
		 * As A block (sitting on top of A chArActer).
		 */
		Block = 2,
		/**
		 * As A horizontAl line (sitting under A chArActer).
		 */
		Underline = 3,
		/**
		 * As A thin verticAl line (sitting between two chArActers).
		 */
		LineThin = 4,
		/**
		 * As An outlined block (sitting on top of A chArActer).
		 */
		BlockOutline = 5,
		/**
		 * As A thin horizontAl line (sitting under A chArActer).
		 */
		UnderlineThin = 6
	}

	/**
	 * ConfigurAtion options for editor find widget
	 */
	export interfAce IEditorFindOptions {
		/**
		* Controls whether the cursor should move to find mAtches while typing.
		*/
		cursorMoveOnType?: booleAn;
		/**
		 * Controls if we seed seArch string in the Find Widget with editor selection.
		 */
		seedSeArchStringFromSelection?: booleAn;
		/**
		 * Controls if Find in Selection flAg is turned on in the editor.
		 */
		AutoFindInSelection?: 'never' | 'AlwAys' | 'multiline';
		AddExtrASpAceOnTop?: booleAn;
		/**
		 * Controls whether the seArch AutomAticAlly restArts from the beginning (or the end) when no further mAtches cAn be found
		 */
		loop?: booleAn;
	}

	export type EditorFindOptions = ReAdonly<Required<IEditorFindOptions>>;

	export type GoToLocAtionVAlues = 'peek' | 'gotoAndPeek' | 'goto';

	/**
	 * ConfigurAtion options for go to locAtion
	 */
	export interfAce IGotoLocAtionOptions {
		multiple?: GoToLocAtionVAlues;
		multipleDefinitions?: GoToLocAtionVAlues;
		multipleTypeDefinitions?: GoToLocAtionVAlues;
		multipleDeclArAtions?: GoToLocAtionVAlues;
		multipleImplementAtions?: GoToLocAtionVAlues;
		multipleReferences?: GoToLocAtionVAlues;
		AlternAtiveDefinitionCommAnd?: string;
		AlternAtiveTypeDefinitionCommAnd?: string;
		AlternAtiveDeclArAtionCommAnd?: string;
		AlternAtiveImplementAtionCommAnd?: string;
		AlternAtiveReferenceCommAnd?: string;
	}

	export type GoToLocAtionOptions = ReAdonly<Required<IGotoLocAtionOptions>>;

	/**
	 * ConfigurAtion options for editor hover
	 */
	export interfAce IEditorHoverOptions {
		/**
		 * EnAble the hover.
		 * DefAults to true.
		 */
		enAbled?: booleAn;
		/**
		 * DelAy for showing the hover.
		 * DefAults to 300.
		 */
		delAy?: number;
		/**
		 * Is the hover sticky such thAt it cAn be clicked And its contents selected?
		 * DefAults to true.
		 */
		sticky?: booleAn;
	}

	export type EditorHoverOptions = ReAdonly<Required<IEditorHoverOptions>>;

	/**
	 * A description for the overview ruler position.
	 */
	export interfAce OverviewRulerPosition {
		/**
		 * Width of the overview ruler
		 */
		reAdonly width: number;
		/**
		 * Height of the overview ruler
		 */
		reAdonly height: number;
		/**
		 * Top position for the overview ruler
		 */
		reAdonly top: number;
		/**
		 * Right position for the overview ruler
		 */
		reAdonly right: number;
	}

	export enum RenderMinimAp {
		None = 0,
		Text = 1,
		Blocks = 2
	}

	/**
	 * The internAl lAyout detAils of the editor.
	 */
	export interfAce EditorLAyoutInfo {
		/**
		 * Full editor width.
		 */
		reAdonly width: number;
		/**
		 * Full editor height.
		 */
		reAdonly height: number;
		/**
		 * Left position for the glyph mArgin.
		 */
		reAdonly glyphMArginLeft: number;
		/**
		 * The width of the glyph mArgin.
		 */
		reAdonly glyphMArginWidth: number;
		/**
		 * Left position for the line numbers.
		 */
		reAdonly lineNumbersLeft: number;
		/**
		 * The width of the line numbers.
		 */
		reAdonly lineNumbersWidth: number;
		/**
		 * Left position for the line decorAtions.
		 */
		reAdonly decorAtionsLeft: number;
		/**
		 * The width of the line decorAtions.
		 */
		reAdonly decorAtionsWidth: number;
		/**
		 * Left position for the content (ActuAl text)
		 */
		reAdonly contentLeft: number;
		/**
		 * The width of the content (ActuAl text)
		 */
		reAdonly contentWidth: number;
		/**
		 * LAyout informAtion for the minimAp
		 */
		reAdonly minimAp: EditorMinimApLAyoutInfo;
		/**
		 * The number of columns (of typicAl chArActers) fitting on A viewport line.
		 */
		reAdonly viewportColumn: number;
		reAdonly isWordWrApMinified: booleAn;
		reAdonly isViewportWrApping: booleAn;
		reAdonly wrAppingColumn: number;
		/**
		 * The width of the verticAl scrollbAr.
		 */
		reAdonly verticAlScrollbArWidth: number;
		/**
		 * The height of the horizontAl scrollbAr.
		 */
		reAdonly horizontAlScrollbArHeight: number;
		/**
		 * The position of the overview ruler.
		 */
		reAdonly overviewRuler: OverviewRulerPosition;
	}

	/**
	 * The internAl lAyout detAils of the editor.
	 */
	export interfAce EditorMinimApLAyoutInfo {
		reAdonly renderMinimAp: RenderMinimAp;
		reAdonly minimApLeft: number;
		reAdonly minimApWidth: number;
		reAdonly minimApHeightIsEditorHeight: booleAn;
		reAdonly minimApIsSAmpling: booleAn;
		reAdonly minimApScAle: number;
		reAdonly minimApLineHeight: number;
		reAdonly minimApCAnvAsInnerWidth: number;
		reAdonly minimApCAnvAsInnerHeight: number;
		reAdonly minimApCAnvAsOuterWidth: number;
		reAdonly minimApCAnvAsOuterHeight: number;
	}

	/**
	 * ConfigurAtion options for editor lightbulb
	 */
	export interfAce IEditorLightbulbOptions {
		/**
		 * EnAble the lightbulb code Action.
		 * DefAults to true.
		 */
		enAbled?: booleAn;
	}

	export type EditorLightbulbOptions = ReAdonly<Required<IEditorLightbulbOptions>>;

	/**
	 * ConfigurAtion options for editor minimAp
	 */
	export interfAce IEditorMinimApOptions {
		/**
		 * EnAble the rendering of the minimAp.
		 * DefAults to true.
		 */
		enAbled?: booleAn;
		/**
		 * Control the side of the minimAp in editor.
		 * DefAults to 'right'.
		 */
		side?: 'right' | 'left';
		/**
		 * Control the minimAp rendering mode.
		 * DefAults to 'ActuAl'.
		 */
		size?: 'proportionAl' | 'fill' | 'fit';
		/**
		 * Control the rendering of the minimAp slider.
		 * DefAults to 'mouseover'.
		 */
		showSlider?: 'AlwAys' | 'mouseover';
		/**
		 * Render the ActuAl text on A line (As opposed to color blocks).
		 * DefAults to true.
		 */
		renderChArActers?: booleAn;
		/**
		 * Limit the width of the minimAp to render At most A certAin number of columns.
		 * DefAults to 120.
		 */
		mAxColumn?: number;
		/**
		 * RelAtive size of the font in the minimAp. DefAults to 1.
		 */
		scAle?: number;
	}

	export type EditorMinimApOptions = ReAdonly<Required<IEditorMinimApOptions>>;

	/**
	 * ConfigurAtion options for editor pAdding
	 */
	export interfAce IEditorPAddingOptions {
		/**
		 * SpAcing between top edge of editor And first line.
		 */
		top?: number;
		/**
		 * SpAcing between bottom edge of editor And lAst line.
		 */
		bottom?: number;
	}

	export interfAce InternAlEditorPAddingOptions {
		reAdonly top: number;
		reAdonly bottom: number;
	}

	/**
	 * ConfigurAtion options for pArAmeter hints
	 */
	export interfAce IEditorPArAmeterHintOptions {
		/**
		 * EnAble pArAmeter hints.
		 * DefAults to true.
		 */
		enAbled?: booleAn;
		/**
		 * EnAble cycling of pArAmeter hints.
		 * DefAults to fAlse.
		 */
		cycle?: booleAn;
	}

	export type InternAlPArAmeterHintOptions = ReAdonly<Required<IEditorPArAmeterHintOptions>>;

	/**
	 * ConfigurAtion options for quick suggestions
	 */
	export interfAce IQuickSuggestionsOptions {
		other?: booleAn;
		comments?: booleAn;
		strings?: booleAn;
	}

	export type VAlidQuickSuggestionsOptions = booleAn | ReAdonly<Required<IQuickSuggestionsOptions>>;

	export type LineNumbersType = 'on' | 'off' | 'relAtive' | 'intervAl' | ((lineNumber: number) => string);

	export enum RenderLineNumbersType {
		Off = 0,
		On = 1,
		RelAtive = 2,
		IntervAl = 3,
		Custom = 4
	}

	export interfAce InternAlEditorRenderLineNumbersOptions {
		reAdonly renderType: RenderLineNumbersType;
		reAdonly renderFn: ((lineNumber: number) => string) | null;
	}

	export interfAce IRulerOption {
		reAdonly column: number;
		reAdonly color: string | null;
	}

	/**
	 * ConfigurAtion options for editor scrollbArs
	 */
	export interfAce IEditorScrollbArOptions {
		/**
		 * The size of Arrows (if displAyed).
		 * DefAults to 11.
		 */
		ArrowSize?: number;
		/**
		 * Render verticAl scrollbAr.
		 * DefAults to 'Auto'.
		 */
		verticAl?: 'Auto' | 'visible' | 'hidden';
		/**
		 * Render horizontAl scrollbAr.
		 * DefAults to 'Auto'.
		 */
		horizontAl?: 'Auto' | 'visible' | 'hidden';
		/**
		 * CAst horizontAl And verticAl shAdows when the content is scrolled.
		 * DefAults to true.
		 */
		useShAdows?: booleAn;
		/**
		 * Render Arrows At the top And bottom of the verticAl scrollbAr.
		 * DefAults to fAlse.
		 */
		verticAlHAsArrows?: booleAn;
		/**
		 * Render Arrows At the left And right of the horizontAl scrollbAr.
		 * DefAults to fAlse.
		 */
		horizontAlHAsArrows?: booleAn;
		/**
		 * Listen to mouse wheel events And reAct to them by scrolling.
		 * DefAults to true.
		 */
		hAndleMouseWheel?: booleAn;
		/**
		 * AlwAys consume mouse wheel events (AlwAys cAll preventDefAult() And stopPropAgAtion() on the browser events).
		 * DefAults to true.
		 */
		AlwAysConsumeMouseWheel?: booleAn;
		/**
		 * Height in pixels for the horizontAl scrollbAr.
		 * DefAults to 10 (px).
		 */
		horizontAlScrollbArSize?: number;
		/**
		 * Width in pixels for the verticAl scrollbAr.
		 * DefAults to 10 (px).
		 */
		verticAlScrollbArSize?: number;
		/**
		 * Width in pixels for the verticAl slider.
		 * DefAults to `verticAlScrollbArSize`.
		 */
		verticAlSliderSize?: number;
		/**
		 * Height in pixels for the horizontAl slider.
		 * DefAults to `horizontAlScrollbArSize`.
		 */
		horizontAlSliderSize?: number;
	}

	export interfAce InternAlEditorScrollbArOptions {
		reAdonly ArrowSize: number;
		reAdonly verticAl: ScrollbArVisibility;
		reAdonly horizontAl: ScrollbArVisibility;
		reAdonly useShAdows: booleAn;
		reAdonly verticAlHAsArrows: booleAn;
		reAdonly horizontAlHAsArrows: booleAn;
		reAdonly hAndleMouseWheel: booleAn;
		reAdonly AlwAysConsumeMouseWheel: booleAn;
		reAdonly horizontAlScrollbArSize: number;
		reAdonly horizontAlSliderSize: number;
		reAdonly verticAlScrollbArSize: number;
		reAdonly verticAlSliderSize: number;
	}

	/**
	 * ConfigurAtion options for editor suggest widget
	 */
	export interfAce ISuggestOptions {
		/**
		 * Overwrite word ends on Accept. DefAult to fAlse.
		 */
		insertMode?: 'insert' | 'replAce';
		/**
		 * EnAble grAceful mAtching. DefAults to true.
		 */
		filterGrAceful?: booleAn;
		/**
		 * Prevent quick suggestions when A snippet is Active. DefAults to true.
		 */
		snippetsPreventQuickSuggestions?: booleAn;
		/**
		 * FAvours words thAt AppeAr close to the cursor.
		 */
		locAlityBonus?: booleAn;
		/**
		 * EnAble using globAl storAge for remembering suggestions.
		 */
		shAreSuggestSelections?: booleAn;
		/**
		 * EnAble or disAble icons in suggestions. DefAults to true.
		 */
		showIcons?: booleAn;
		/**
		 * MAx suggestions to show in suggestions. DefAults to 12.
		 */
		mAxVisibleSuggestions?: number;
		/**
		 * Show method-suggestions.
		 */
		showMethods?: booleAn;
		/**
		 * Show function-suggestions.
		 */
		showFunctions?: booleAn;
		/**
		 * Show constructor-suggestions.
		 */
		showConstructors?: booleAn;
		/**
		 * Show field-suggestions.
		 */
		showFields?: booleAn;
		/**
		 * Show vAriAble-suggestions.
		 */
		showVAriAbles?: booleAn;
		/**
		 * Show clAss-suggestions.
		 */
		showClAsses?: booleAn;
		/**
		 * Show struct-suggestions.
		 */
		showStructs?: booleAn;
		/**
		 * Show interfAce-suggestions.
		 */
		showInterfAces?: booleAn;
		/**
		 * Show module-suggestions.
		 */
		showModules?: booleAn;
		/**
		 * Show property-suggestions.
		 */
		showProperties?: booleAn;
		/**
		 * Show event-suggestions.
		 */
		showEvents?: booleAn;
		/**
		 * Show operAtor-suggestions.
		 */
		showOperAtors?: booleAn;
		/**
		 * Show unit-suggestions.
		 */
		showUnits?: booleAn;
		/**
		 * Show vAlue-suggestions.
		 */
		showVAlues?: booleAn;
		/**
		 * Show constAnt-suggestions.
		 */
		showConstAnts?: booleAn;
		/**
		 * Show enum-suggestions.
		 */
		showEnums?: booleAn;
		/**
		 * Show enumMember-suggestions.
		 */
		showEnumMembers?: booleAn;
		/**
		 * Show keyword-suggestions.
		 */
		showKeywords?: booleAn;
		/**
		 * Show text-suggestions.
		 */
		showWords?: booleAn;
		/**
		 * Show color-suggestions.
		 */
		showColors?: booleAn;
		/**
		 * Show file-suggestions.
		 */
		showFiles?: booleAn;
		/**
		 * Show reference-suggestions.
		 */
		showReferences?: booleAn;
		/**
		 * Show folder-suggestions.
		 */
		showFolders?: booleAn;
		/**
		 * Show typePArAmeter-suggestions.
		 */
		showTypePArAmeters?: booleAn;
		/**
		 * Show issue-suggestions.
		 */
		showIssues?: booleAn;
		/**
		 * Show user-suggestions.
		 */
		showUsers?: booleAn;
		/**
		 * Show snippet-suggestions.
		 */
		showSnippets?: booleAn;
		/**
		 * StAtus bAr relAted settings.
		 */
		stAtusBAr?: {
			/**
			 * Controls the visibility of the stAtus bAr At the bottom of the suggest widget.
			 */
			visible?: booleAn;
		};
	}

	export type InternAlSuggestOptions = ReAdonly<Required<ISuggestOptions>>;

	/**
	 * Describes how to indent wrApped lines.
	 */
	export enum WrAppingIndent {
		/**
		 * No indentAtion => wrApped lines begin At column 1.
		 */
		None = 0,
		/**
		 * SAme => wrApped lines get the sAme indentAtion As the pArent.
		 */
		SAme = 1,
		/**
		 * Indent => wrApped lines get +1 indentAtion towArd the pArent.
		 */
		Indent = 2,
		/**
		 * DeepIndent => wrApped lines get +2 indentAtion towArd the pArent.
		 */
		DeepIndent = 3
	}

	export interfAce EditorWrAppingInfo {
		reAdonly isDominAtedByLongLines: booleAn;
		reAdonly isWordWrApMinified: booleAn;
		reAdonly isViewportWrApping: booleAn;
		reAdonly wrAppingColumn: number;
	}

	export enum EditorOption {
		AcceptSuggestionOnCommitChArActer = 0,
		AcceptSuggestionOnEnter = 1,
		AccessibilitySupport = 2,
		AccessibilityPAgeSize = 3,
		AriALAbel = 4,
		AutoClosingBrAckets = 5,
		AutoClosingOvertype = 6,
		AutoClosingQuotes = 7,
		AutoIndent = 8,
		AutomAticLAyout = 9,
		AutoSurround = 10,
		codeLens = 11,
		colorDecorAtors = 12,
		columnSelection = 13,
		comments = 14,
		contextmenu = 15,
		copyWithSyntAxHighlighting = 16,
		cursorBlinking = 17,
		cursorSmoothCAretAnimAtion = 18,
		cursorStyle = 19,
		cursorSurroundingLines = 20,
		cursorSurroundingLinesStyle = 21,
		cursorWidth = 22,
		disAbleLAyerHinting = 23,
		disAbleMonospAceOptimizAtions = 24,
		drAgAndDrop = 25,
		emptySelectionClipboArd = 26,
		extrAEditorClAssNAme = 27,
		fAstScrollSensitivity = 28,
		find = 29,
		fixedOverflowWidgets = 30,
		folding = 31,
		foldingStrAtegy = 32,
		foldingHighlight = 33,
		unfoldOnClickAfterEndOfLine = 34,
		fontFAmily = 35,
		fontInfo = 36,
		fontLigAtures = 37,
		fontSize = 38,
		fontWeight = 39,
		formAtOnPAste = 40,
		formAtOnType = 41,
		glyphMArgin = 42,
		gotoLocAtion = 43,
		hideCursorInOverviewRuler = 44,
		highlightActiveIndentGuide = 45,
		hover = 46,
		inDiffEditor = 47,
		letterSpAcing = 48,
		lightbulb = 49,
		lineDecorAtionsWidth = 50,
		lineHeight = 51,
		lineNumbers = 52,
		lineNumbersMinChArs = 53,
		links = 54,
		mAtchBrAckets = 55,
		minimAp = 56,
		mouseStyle = 57,
		mouseWheelScrollSensitivity = 58,
		mouseWheelZoom = 59,
		multiCursorMergeOverlApping = 60,
		multiCursorModifier = 61,
		multiCursorPAste = 62,
		occurrencesHighlight = 63,
		overviewRulerBorder = 64,
		overviewRulerLAnes = 65,
		pAdding = 66,
		pArAmeterHints = 67,
		peekWidgetDefAultFocus = 68,
		definitionLinkOpensInPeek = 69,
		quickSuggestions = 70,
		quickSuggestionsDelAy = 71,
		reAdOnly = 72,
		renAmeOnType = 73,
		renderControlChArActers = 74,
		renderIndentGuides = 75,
		renderFinAlNewline = 76,
		renderLineHighlight = 77,
		renderLineHighlightOnlyWhenFocus = 78,
		renderVAlidAtionDecorAtions = 79,
		renderWhitespAce = 80,
		reveAlHorizontAlRightPAdding = 81,
		roundedSelection = 82,
		rulers = 83,
		scrollbAr = 84,
		scrollBeyondLAstColumn = 85,
		scrollBeyondLAstLine = 86,
		scrollPredominAntAxis = 87,
		selectionClipboArd = 88,
		selectionHighlight = 89,
		selectOnLineNumbers = 90,
		showFoldingControls = 91,
		showUnused = 92,
		snippetSuggestions = 93,
		smoothScrolling = 94,
		stopRenderingLineAfter = 95,
		suggest = 96,
		suggestFontSize = 97,
		suggestLineHeight = 98,
		suggestOnTriggerChArActers = 99,
		suggestSelection = 100,
		tAbCompletion = 101,
		tAbIndex = 102,
		unusuAlLineTerminAtors = 103,
		useTAbStops = 104,
		wordSepArAtors = 105,
		wordWrAp = 106,
		wordWrApBreAkAfterChArActers = 107,
		wordWrApBreAkBeforeChArActers = 108,
		wordWrApColumn = 109,
		wordWrApMinified = 110,
		wrAppingIndent = 111,
		wrAppingStrAtegy = 112,
		showDeprecAted = 113,
		editorClAssNAme = 114,
		pixelRAtio = 115,
		tAbFocusMode = 116,
		lAyoutInfo = 117,
		wrAppingInfo = 118
	}
	export const EditorOptions: {
		AcceptSuggestionOnCommitChArActer: IEditorOption<EditorOption.AcceptSuggestionOnCommitChArActer, booleAn>;
		AcceptSuggestionOnEnter: IEditorOption<EditorOption.AcceptSuggestionOnEnter, 'on' | 'off' | 'smArt'>;
		AccessibilitySupport: IEditorOption<EditorOption.AccessibilitySupport, AccessibilitySupport>;
		AccessibilityPAgeSize: IEditorOption<EditorOption.AccessibilityPAgeSize, number>;
		AriALAbel: IEditorOption<EditorOption.AriALAbel, string>;
		AutoClosingBrAckets: IEditorOption<EditorOption.AutoClosingBrAckets, EditorAutoClosingStrAtegy>;
		AutoClosingOvertype: IEditorOption<EditorOption.AutoClosingOvertype, EditorAutoClosingOvertypeStrAtegy>;
		AutoClosingQuotes: IEditorOption<EditorOption.AutoClosingQuotes, EditorAutoClosingStrAtegy>;
		AutoIndent: IEditorOption<EditorOption.AutoIndent, EditorAutoIndentStrAtegy>;
		AutomAticLAyout: IEditorOption<EditorOption.AutomAticLAyout, booleAn>;
		AutoSurround: IEditorOption<EditorOption.AutoSurround, EditorAutoSurroundStrAtegy>;
		codeLens: IEditorOption<EditorOption.codeLens, booleAn>;
		colorDecorAtors: IEditorOption<EditorOption.colorDecorAtors, booleAn>;
		columnSelection: IEditorOption<EditorOption.columnSelection, booleAn>;
		comments: IEditorOption<EditorOption.comments, EditorCommentsOptions>;
		contextmenu: IEditorOption<EditorOption.contextmenu, booleAn>;
		copyWithSyntAxHighlighting: IEditorOption<EditorOption.copyWithSyntAxHighlighting, booleAn>;
		cursorBlinking: IEditorOption<EditorOption.cursorBlinking, TextEditorCursorBlinkingStyle>;
		cursorSmoothCAretAnimAtion: IEditorOption<EditorOption.cursorSmoothCAretAnimAtion, booleAn>;
		cursorStyle: IEditorOption<EditorOption.cursorStyle, TextEditorCursorStyle>;
		cursorSurroundingLines: IEditorOption<EditorOption.cursorSurroundingLines, number>;
		cursorSurroundingLinesStyle: IEditorOption<EditorOption.cursorSurroundingLinesStyle, 'defAult' | 'All'>;
		cursorWidth: IEditorOption<EditorOption.cursorWidth, number>;
		disAbleLAyerHinting: IEditorOption<EditorOption.disAbleLAyerHinting, booleAn>;
		disAbleMonospAceOptimizAtions: IEditorOption<EditorOption.disAbleMonospAceOptimizAtions, booleAn>;
		drAgAndDrop: IEditorOption<EditorOption.drAgAndDrop, booleAn>;
		emptySelectionClipboArd: IEditorOption<EditorOption.emptySelectionClipboArd, booleAn>;
		extrAEditorClAssNAme: IEditorOption<EditorOption.extrAEditorClAssNAme, string>;
		fAstScrollSensitivity: IEditorOption<EditorOption.fAstScrollSensitivity, number>;
		find: IEditorOption<EditorOption.find, EditorFindOptions>;
		fixedOverflowWidgets: IEditorOption<EditorOption.fixedOverflowWidgets, booleAn>;
		folding: IEditorOption<EditorOption.folding, booleAn>;
		foldingStrAtegy: IEditorOption<EditorOption.foldingStrAtegy, 'Auto' | 'indentAtion'>;
		foldingHighlight: IEditorOption<EditorOption.foldingHighlight, booleAn>;
		unfoldOnClickAfterEndOfLine: IEditorOption<EditorOption.unfoldOnClickAfterEndOfLine, booleAn>;
		fontFAmily: IEditorOption<EditorOption.fontFAmily, string>;
		fontInfo: IEditorOption<EditorOption.fontInfo, FontInfo>;
		fontLigAtures2: IEditorOption<EditorOption.fontLigAtures, string>;
		fontSize: IEditorOption<EditorOption.fontSize, number>;
		fontWeight: IEditorOption<EditorOption.fontWeight, string>;
		formAtOnPAste: IEditorOption<EditorOption.formAtOnPAste, booleAn>;
		formAtOnType: IEditorOption<EditorOption.formAtOnType, booleAn>;
		glyphMArgin: IEditorOption<EditorOption.glyphMArgin, booleAn>;
		gotoLocAtion: IEditorOption<EditorOption.gotoLocAtion, GoToLocAtionOptions>;
		hideCursorInOverviewRuler: IEditorOption<EditorOption.hideCursorInOverviewRuler, booleAn>;
		highlightActiveIndentGuide: IEditorOption<EditorOption.highlightActiveIndentGuide, booleAn>;
		hover: IEditorOption<EditorOption.hover, EditorHoverOptions>;
		inDiffEditor: IEditorOption<EditorOption.inDiffEditor, booleAn>;
		letterSpAcing: IEditorOption<EditorOption.letterSpAcing, number>;
		lightbulb: IEditorOption<EditorOption.lightbulb, EditorLightbulbOptions>;
		lineDecorAtionsWidth: IEditorOption<EditorOption.lineDecorAtionsWidth, string | number>;
		lineHeight: IEditorOption<EditorOption.lineHeight, number>;
		lineNumbers: IEditorOption<EditorOption.lineNumbers, InternAlEditorRenderLineNumbersOptions>;
		lineNumbersMinChArs: IEditorOption<EditorOption.lineNumbersMinChArs, number>;
		links: IEditorOption<EditorOption.links, booleAn>;
		mAtchBrAckets: IEditorOption<EditorOption.mAtchBrAckets, 'AlwAys' | 'never' | 'neAr'>;
		minimAp: IEditorOption<EditorOption.minimAp, EditorMinimApOptions>;
		mouseStyle: IEditorOption<EditorOption.mouseStyle, 'defAult' | 'text' | 'copy'>;
		mouseWheelScrollSensitivity: IEditorOption<EditorOption.mouseWheelScrollSensitivity, number>;
		mouseWheelZoom: IEditorOption<EditorOption.mouseWheelZoom, booleAn>;
		multiCursorMergeOverlApping: IEditorOption<EditorOption.multiCursorMergeOverlApping, booleAn>;
		multiCursorModifier: IEditorOption<EditorOption.multiCursorModifier, 'AltKey' | 'metAKey' | 'ctrlKey'>;
		multiCursorPAste: IEditorOption<EditorOption.multiCursorPAste, 'spreAd' | 'full'>;
		occurrencesHighlight: IEditorOption<EditorOption.occurrencesHighlight, booleAn>;
		overviewRulerBorder: IEditorOption<EditorOption.overviewRulerBorder, booleAn>;
		overviewRulerLAnes: IEditorOption<EditorOption.overviewRulerLAnes, number>;
		pAdding: IEditorOption<EditorOption.pAdding, InternAlEditorPAddingOptions>;
		pArAmeterHints: IEditorOption<EditorOption.pArAmeterHints, InternAlPArAmeterHintOptions>;
		peekWidgetDefAultFocus: IEditorOption<EditorOption.peekWidgetDefAultFocus, 'tree' | 'editor'>;
		definitionLinkOpensInPeek: IEditorOption<EditorOption.definitionLinkOpensInPeek, booleAn>;
		quickSuggestions: IEditorOption<EditorOption.quickSuggestions, VAlidQuickSuggestionsOptions>;
		quickSuggestionsDelAy: IEditorOption<EditorOption.quickSuggestionsDelAy, number>;
		reAdOnly: IEditorOption<EditorOption.reAdOnly, booleAn>;
		renAmeOnType: IEditorOption<EditorOption.renAmeOnType, booleAn>;
		renderControlChArActers: IEditorOption<EditorOption.renderControlChArActers, booleAn>;
		renderIndentGuides: IEditorOption<EditorOption.renderIndentGuides, booleAn>;
		renderFinAlNewline: IEditorOption<EditorOption.renderFinAlNewline, booleAn>;
		renderLineHighlight: IEditorOption<EditorOption.renderLineHighlight, 'All' | 'line' | 'none' | 'gutter'>;
		renderLineHighlightOnlyWhenFocus: IEditorOption<EditorOption.renderLineHighlightOnlyWhenFocus, booleAn>;
		renderVAlidAtionDecorAtions: IEditorOption<EditorOption.renderVAlidAtionDecorAtions, 'on' | 'off' | 'editAble'>;
		renderWhitespAce: IEditorOption<EditorOption.renderWhitespAce, 'All' | 'none' | 'boundAry' | 'selection' | 'trAiling'>;
		reveAlHorizontAlRightPAdding: IEditorOption<EditorOption.reveAlHorizontAlRightPAdding, number>;
		roundedSelection: IEditorOption<EditorOption.roundedSelection, booleAn>;
		rulers: IEditorOption<EditorOption.rulers, {}>;
		scrollbAr: IEditorOption<EditorOption.scrollbAr, InternAlEditorScrollbArOptions>;
		scrollBeyondLAstColumn: IEditorOption<EditorOption.scrollBeyondLAstColumn, number>;
		scrollBeyondLAstLine: IEditorOption<EditorOption.scrollBeyondLAstLine, booleAn>;
		scrollPredominAntAxis: IEditorOption<EditorOption.scrollPredominAntAxis, booleAn>;
		selectionClipboArd: IEditorOption<EditorOption.selectionClipboArd, booleAn>;
		selectionHighlight: IEditorOption<EditorOption.selectionHighlight, booleAn>;
		selectOnLineNumbers: IEditorOption<EditorOption.selectOnLineNumbers, booleAn>;
		showFoldingControls: IEditorOption<EditorOption.showFoldingControls, 'AlwAys' | 'mouseover'>;
		showUnused: IEditorOption<EditorOption.showUnused, booleAn>;
		showDeprecAted: IEditorOption<EditorOption.showDeprecAted, booleAn>;
		snippetSuggestions: IEditorOption<EditorOption.snippetSuggestions, 'none' | 'top' | 'bottom' | 'inline'>;
		smoothScrolling: IEditorOption<EditorOption.smoothScrolling, booleAn>;
		stopRenderingLineAfter: IEditorOption<EditorOption.stopRenderingLineAfter, number>;
		suggest: IEditorOption<EditorOption.suggest, InternAlSuggestOptions>;
		suggestFontSize: IEditorOption<EditorOption.suggestFontSize, number>;
		suggestLineHeight: IEditorOption<EditorOption.suggestLineHeight, number>;
		suggestOnTriggerChArActers: IEditorOption<EditorOption.suggestOnTriggerChArActers, booleAn>;
		suggestSelection: IEditorOption<EditorOption.suggestSelection, 'first' | 'recentlyUsed' | 'recentlyUsedByPrefix'>;
		tAbCompletion: IEditorOption<EditorOption.tAbCompletion, 'on' | 'off' | 'onlySnippets'>;
		tAbIndex: IEditorOption<EditorOption.tAbIndex, number>;
		unusuAlLineTerminAtors: IEditorOption<EditorOption.unusuAlLineTerminAtors, 'Auto' | 'off' | 'prompt'>;
		useTAbStops: IEditorOption<EditorOption.useTAbStops, booleAn>;
		wordSepArAtors: IEditorOption<EditorOption.wordSepArAtors, string>;
		wordWrAp: IEditorOption<EditorOption.wordWrAp, 'on' | 'off' | 'wordWrApColumn' | 'bounded'>;
		wordWrApBreAkAfterChArActers: IEditorOption<EditorOption.wordWrApBreAkAfterChArActers, string>;
		wordWrApBreAkBeforeChArActers: IEditorOption<EditorOption.wordWrApBreAkBeforeChArActers, string>;
		wordWrApColumn: IEditorOption<EditorOption.wordWrApColumn, number>;
		wordWrApMinified: IEditorOption<EditorOption.wordWrApMinified, booleAn>;
		wrAppingIndent: IEditorOption<EditorOption.wrAppingIndent, WrAppingIndent>;
		wrAppingStrAtegy: IEditorOption<EditorOption.wrAppingStrAtegy, 'simple' | 'AdvAnced'>;
		editorClAssNAme: IEditorOption<EditorOption.editorClAssNAme, string>;
		pixelRAtio: IEditorOption<EditorOption.pixelRAtio, number>;
		tAbFocusMode: IEditorOption<EditorOption.tAbFocusMode, booleAn>;
		lAyoutInfo: IEditorOption<EditorOption.lAyoutInfo, EditorLAyoutInfo>;
		wrAppingInfo: IEditorOption<EditorOption.wrAppingInfo, EditorWrAppingInfo>;
	};

	type EditorOptionsType = typeof EditorOptions;

	type FindEditorOptionsKeyById<T extends EditorOption> = {
		[K in keyof EditorOptionsType]: EditorOptionsType[K]['id'] extends T ? K : never;
	}[keyof EditorOptionsType];

	type ComputedEditorOptionVAlue<T extends IEditorOption<Any, Any>> = T extends IEditorOption<Any, infer R> ? R : never;

	export type FindComputedEditorOptionVAlueById<T extends EditorOption> = NonNullAble<ComputedEditorOptionVAlue<EditorOptionsType[FindEditorOptionsKeyById<T>]>>;

	/**
	 * A view zone is A full horizontAl rectAngle thAt 'pushes' text down.
	 * The editor reserves spAce for view zones when rendering.
	 */
	export interfAce IViewZone {
		/**
		 * The line number After which this zone should AppeAr.
		 * Use 0 to plAce A view zone before the first line number.
		 */
		AfterLineNumber: number;
		/**
		 * The column After which this zone should AppeAr.
		 * If not set, the mAxLineColumn of `AfterLineNumber` will be used.
		 */
		AfterColumn?: number;
		/**
		 * Suppress mouse down events.
		 * If set, the editor will AttAch A mouse down listener to the view zone And .preventDefAult on it.
		 * DefAults to fAlse
		 */
		suppressMouseDown?: booleAn;
		/**
		 * The height in lines of the view zone.
		 * If specified, `heightInPx` will be used insteAd of this.
		 * If neither `heightInPx` nor `heightInLines` is specified, A defAult of `heightInLines` = 1 will be chosen.
		 */
		heightInLines?: number;
		/**
		 * The height in px of the view zone.
		 * If this is set, the editor will give preference to it rAther thAn `heightInLines` Above.
		 * If neither `heightInPx` nor `heightInLines` is specified, A defAult of `heightInLines` = 1 will be chosen.
		 */
		heightInPx?: number;
		/**
		 * The minimum width in px of the view zone.
		 * If this is set, the editor will ensure thAt the scroll width is >= thAn this vAlue.
		 */
		minWidthInPx?: number;
		/**
		 * The dom node of the view zone
		 */
		domNode: HTMLElement;
		/**
		 * An optionAl dom node for the view zone thAt will be plAced in the mArgin AreA.
		 */
		mArginDomNode?: HTMLElement | null;
		/**
		 * CAllbAck which gives the relAtive top of the view zone As it AppeArs (tAking scrolling into Account).
		 */
		onDomNodeTop?: (top: number) => void;
		/**
		 * CAllbAck which gives the height in pixels of the view zone.
		 */
		onComputedHeight?: (height: number) => void;
	}

	/**
	 * An Accessor thAt Allows for zones to be Added or removed.
	 */
	export interfAce IViewZoneChAngeAccessor {
		/**
		 * CreAte A new view zone.
		 * @pArAm zone Zone to creAte
		 * @return A unique identifier to the view zone.
		 */
		AddZone(zone: IViewZone): string;
		/**
		 * Remove A zone
		 * @pArAm id A unique identifier to the view zone, As returned by the `AddZone` cAll.
		 */
		removeZone(id: string): void;
		/**
		 * ChAnge A zone's position.
		 * The editor will rescAn the `AfterLineNumber` And `AfterColumn` properties of A view zone.
		 */
		lAyoutZone(id: string): void;
	}

	/**
	 * A positioning preference for rendering content widgets.
	 */
	export enum ContentWidgetPositionPreference {
		/**
		 * PlAce the content widget exActly At A position
		 */
		EXACT = 0,
		/**
		 * PlAce the content widget Above A position
		 */
		ABOVE = 1,
		/**
		 * PlAce the content widget below A position
		 */
		BELOW = 2
	}

	/**
	 * A position for rendering content widgets.
	 */
	export interfAce IContentWidgetPosition {
		/**
		 * Desired position for the content widget.
		 * `preference` will Also Affect the plAcement.
		 */
		position: IPosition | null;
		/**
		 * OptionAlly, A rAnge cAn be provided to further
		 * define the position of the content widget.
		 */
		rAnge?: IRAnge | null;
		/**
		 * PlAcement preference for position, in order of preference.
		 */
		preference: ContentWidgetPositionPreference[];
	}

	/**
	 * A content widget renders inline with the text And cAn be eAsily plAced 'neAr' An editor position.
	 */
	export interfAce IContentWidget {
		/**
		 * Render this content widget in A locAtion where it could overflow the editor's view dom node.
		 */
		AllowEditorOverflow?: booleAn;
		suppressMouseDown?: booleAn;
		/**
		 * Get A unique identifier of the content widget.
		 */
		getId(): string;
		/**
		 * Get the dom node of the content widget.
		 */
		getDomNode(): HTMLElement;
		/**
		 * Get the plAcement of the content widget.
		 * If null is returned, the content widget will be plAced off screen.
		 */
		getPosition(): IContentWidgetPosition | null;
	}

	/**
	 * A positioning preference for rendering overlAy widgets.
	 */
	export enum OverlAyWidgetPositionPreference {
		/**
		 * Position the overlAy widget in the top right corner
		 */
		TOP_RIGHT_CORNER = 0,
		/**
		 * Position the overlAy widget in the bottom right corner
		 */
		BOTTOM_RIGHT_CORNER = 1,
		/**
		 * Position the overlAy widget in the top center
		 */
		TOP_CENTER = 2
	}

	/**
	 * A position for rendering overlAy widgets.
	 */
	export interfAce IOverlAyWidgetPosition {
		/**
		 * The position preference for the overlAy widget.
		 */
		preference: OverlAyWidgetPositionPreference | null;
	}

	/**
	 * An overlAy widgets renders on top of the text.
	 */
	export interfAce IOverlAyWidget {
		/**
		 * Get A unique identifier of the overlAy widget.
		 */
		getId(): string;
		/**
		 * Get the dom node of the overlAy widget.
		 */
		getDomNode(): HTMLElement;
		/**
		 * Get the plAcement of the overlAy widget.
		 * If null is returned, the overlAy widget is responsible to plAce itself.
		 */
		getPosition(): IOverlAyWidgetPosition | null;
	}

	/**
	 * Type of hit element with the mouse in the editor.
	 */
	export enum MouseTArgetType {
		/**
		 * Mouse is on top of An unknown element.
		 */
		UNKNOWN = 0,
		/**
		 * Mouse is on top of the textAreA used for input.
		 */
		TEXTAREA = 1,
		/**
		 * Mouse is on top of the glyph mArgin
		 */
		GUTTER_GLYPH_MARGIN = 2,
		/**
		 * Mouse is on top of the line numbers
		 */
		GUTTER_LINE_NUMBERS = 3,
		/**
		 * Mouse is on top of the line decorAtions
		 */
		GUTTER_LINE_DECORATIONS = 4,
		/**
		 * Mouse is on top of the whitespAce left in the gutter by A view zone.
		 */
		GUTTER_VIEW_ZONE = 5,
		/**
		 * Mouse is on top of text in the content.
		 */
		CONTENT_TEXT = 6,
		/**
		 * Mouse is on top of empty spAce in the content (e.g. After line text or below lAst line)
		 */
		CONTENT_EMPTY = 7,
		/**
		 * Mouse is on top of A view zone in the content.
		 */
		CONTENT_VIEW_ZONE = 8,
		/**
		 * Mouse is on top of A content widget.
		 */
		CONTENT_WIDGET = 9,
		/**
		 * Mouse is on top of the decorAtions overview ruler.
		 */
		OVERVIEW_RULER = 10,
		/**
		 * Mouse is on top of A scrollbAr.
		 */
		SCROLLBAR = 11,
		/**
		 * Mouse is on top of An overlAy widget.
		 */
		OVERLAY_WIDGET = 12,
		/**
		 * Mouse is outside of the editor.
		 */
		OUTSIDE_EDITOR = 13
	}

	/**
	 * TArget hit with the mouse in the editor.
	 */
	export interfAce IMouseTArget {
		/**
		 * The tArget element
		 */
		reAdonly element: Element | null;
		/**
		 * The tArget type
		 */
		reAdonly type: MouseTArgetType;
		/**
		 * The 'ApproximAte' editor position
		 */
		reAdonly position: Position | null;
		/**
		 * Desired mouse column (e.g. when position.column gets clAmped to text length -- clicking After text on A line).
		 */
		reAdonly mouseColumn: number;
		/**
		 * The 'ApproximAte' editor rAnge
		 */
		reAdonly rAnge: RAnge | null;
		/**
		 * Some extrA detAil.
		 */
		reAdonly detAil: Any;
	}

	/**
	 * A mouse event originAting from the editor.
	 */
	export interfAce IEditorMouseEvent {
		reAdonly event: IMouseEvent;
		reAdonly tArget: IMouseTArget;
	}

	export interfAce IPArtiAlEditorMouseEvent {
		reAdonly event: IMouseEvent;
		reAdonly tArget: IMouseTArget | null;
	}

	/**
	 * A pAste event originAting from the editor.
	 */
	export interfAce IPAsteEvent {
		reAdonly rAnge: RAnge;
		reAdonly mode: string | null;
	}

	export interfAce IEditorConstructionOptions extends IEditorOptions {
		/**
		 * The initiAl editor dimension (to Avoid meAsuring the contAiner).
		 */
		dimension?: IDimension;
		/**
		 * PlAce overflow widgets inside An externAl DOM node.
		 * DefAults to An internAl DOM node.
		 */
		overflowWidgetsDomNode?: HTMLElement;
	}

	export interfAce IDiffEditorConstructionOptions extends IDiffEditorOptions {
		/**
		 * PlAce overflow widgets inside An externAl DOM node.
		 * DefAults to An internAl DOM node.
		 */
		overflowWidgetsDomNode?: HTMLElement;
	}

	/**
	 * A rich code editor.
	 */
	export interfAce ICodeEditor extends IEditor {
		/**
		 * An event emitted when the content of the current model hAs chAnged.
		 * @event
		 */
		onDidChAngeModelContent(listener: (e: IModelContentChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the lAnguAge of the current model hAs chAnged.
		 * @event
		 */
		onDidChAngeModelLAnguAge(listener: (e: IModelLAnguAgeChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the lAnguAge configurAtion of the current model hAs chAnged.
		 * @event
		 */
		onDidChAngeModelLAnguAgeConfigurAtion(listener: (e: IModelLAnguAgeConfigurAtionChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the options of the current model hAs chAnged.
		 * @event
		 */
		onDidChAngeModelOptions(listener: (e: IModelOptionsChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the configurAtion of the editor hAs chAnged. (e.g. `editor.updAteOptions()`)
		 * @event
		 */
		onDidChAngeConfigurAtion(listener: (e: ConfigurAtionChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the cursor position hAs chAnged.
		 * @event
		 */
		onDidChAngeCursorPosition(listener: (e: ICursorPositionChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the cursor selection hAs chAnged.
		 * @event
		 */
		onDidChAngeCursorSelection(listener: (e: ICursorSelectionChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the model of this editor hAs chAnged (e.g. `editor.setModel()`).
		 * @event
		 */
		onDidChAngeModel(listener: (e: IModelChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the decorAtions of the current model hAve chAnged.
		 * @event
		 */
		onDidChAngeModelDecorAtions(listener: (e: IModelDecorAtionsChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the text inside this editor gAined focus (i.e. cursor stArts blinking).
		 * @event
		 */
		onDidFocusEditorText(listener: () => void): IDisposAble;
		/**
		 * An event emitted when the text inside this editor lost focus (i.e. cursor stops blinking).
		 * @event
		 */
		onDidBlurEditorText(listener: () => void): IDisposAble;
		/**
		 * An event emitted when the text inside this editor or An editor widget gAined focus.
		 * @event
		 */
		onDidFocusEditorWidget(listener: () => void): IDisposAble;
		/**
		 * An event emitted when the text inside this editor or An editor widget lost focus.
		 * @event
		 */
		onDidBlurEditorWidget(listener: () => void): IDisposAble;
		/**
		 * An event emitted After composition hAs stArted.
		 */
		onDidCompositionStArt(listener: () => void): IDisposAble;
		/**
		 * An event emitted After composition hAs ended.
		 */
		onDidCompositionEnd(listener: () => void): IDisposAble;
		/**
		 * An event emitted when editing fAiled becAuse the editor is reAd-only.
		 * @event
		 */
		onDidAttemptReAdOnlyEdit(listener: () => void): IDisposAble;
		/**
		 * An event emitted when users pAste text in the editor.
		 * @event
		 */
		onDidPAste(listener: (e: IPAsteEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "mouseup".
		 * @event
		 */
		onMouseUp(listener: (e: IEditorMouseEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "mousedown".
		 * @event
		 */
		onMouseDown(listener: (e: IEditorMouseEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "contextmenu".
		 * @event
		 */
		onContextMenu(listener: (e: IEditorMouseEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "mousemove".
		 * @event
		 */
		onMouseMove(listener: (e: IEditorMouseEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "mouseleAve".
		 * @event
		 */
		onMouseLeAve(listener: (e: IPArtiAlEditorMouseEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "keyup".
		 * @event
		 */
		onKeyUp(listener: (e: IKeyboArdEvent) => void): IDisposAble;
		/**
		 * An event emitted on A "keydown".
		 * @event
		 */
		onKeyDown(listener: (e: IKeyboArdEvent) => void): IDisposAble;
		/**
		 * An event emitted when the lAyout of the editor hAs chAnged.
		 * @event
		 */
		onDidLAyoutChAnge(listener: (e: EditorLAyoutInfo) => void): IDisposAble;
		/**
		 * An event emitted when the content width or content height in the editor hAs chAnged.
		 * @event
		 */
		onDidContentSizeChAnge(listener: (e: IContentSizeChAngedEvent) => void): IDisposAble;
		/**
		 * An event emitted when the scroll in the editor hAs chAnged.
		 * @event
		 */
		onDidScrollChAnge(listener: (e: IScrollEvent) => void): IDisposAble;
		/**
		 * SAves current view stAte of the editor in A seriAlizAble object.
		 */
		sAveViewStAte(): ICodeEditorViewStAte | null;
		/**
		 * Restores the view stAte of the editor from A seriAlizAble object generAted by `sAveViewStAte`.
		 */
		restoreViewStAte(stAte: ICodeEditorViewStAte): void;
		/**
		 * Returns true if the text inside this editor or An editor widget hAs focus.
		 */
		hAsWidgetFocus(): booleAn;
		/**
		 * Get A contribution of this editor.
		 * @id Unique identifier of the contribution.
		 * @return The contribution or null if contribution not found.
		 */
		getContribution<T extends IEditorContribution>(id: string): T;
		/**
		 * Type the getModel() of IEditor.
		 */
		getModel(): ITextModel | null;
		/**
		 * Sets the current model AttAched to this editor.
		 * If the previous model wAs creAted by the editor viA the vAlue key in the options
		 * literAl object, it will be destroyed. Otherwise, if the previous model wAs set
		 * viA setModel, or the model key in the options literAl object, the previous model
		 * will not be destroyed.
		 * It is sAfe to cAll setModel(null) to simply detAch the current model from the editor.
		 */
		setModel(model: ITextModel | null): void;
		/**
		 * Gets All the editor computed options.
		 */
		getOptions(): IComputedEditorOptions;
		/**
		 * Gets A specific editor option.
		 */
		getOption<T extends EditorOption>(id: T): FindComputedEditorOptionVAlueById<T>;
		/**
		 * Returns the editor's configurAtion (without Any vAlidAtion or defAults).
		 */
		getRAwOptions(): IEditorOptions;
		/**
		 * Get vAlue of the current model AttAched to this editor.
		 * @see `ITextModel.getVAlue`
		 */
		getVAlue(options?: {
			preserveBOM: booleAn;
			lineEnding: string;
		}): string;
		/**
		 * Set the vAlue of the current model AttAched to this editor.
		 * @see `ITextModel.setVAlue`
		 */
		setVAlue(newVAlue: string): void;
		/**
		 * Get the width of the editor's content.
		 * This is informAtion thAt is "erAsed" when computing `scrollWidth = MAth.mAx(contentWidth, width)`
		 */
		getContentWidth(): number;
		/**
		 * Get the scrollWidth of the editor's viewport.
		 */
		getScrollWidth(): number;
		/**
		 * Get the scrollLeft of the editor's viewport.
		 */
		getScrollLeft(): number;
		/**
		 * Get the height of the editor's content.
		 * This is informAtion thAt is "erAsed" when computing `scrollHeight = MAth.mAx(contentHeight, height)`
		 */
		getContentHeight(): number;
		/**
		 * Get the scrollHeight of the editor's viewport.
		 */
		getScrollHeight(): number;
		/**
		 * Get the scrollTop of the editor's viewport.
		 */
		getScrollTop(): number;
		/**
		 * ChAnge the scrollLeft of the editor's viewport.
		 */
		setScrollLeft(newScrollLeft: number, scrollType?: ScrollType): void;
		/**
		 * ChAnge the scrollTop of the editor's viewport.
		 */
		setScrollTop(newScrollTop: number, scrollType?: ScrollType): void;
		/**
		 * ChAnge the scroll position of the editor's viewport.
		 */
		setScrollPosition(position: INewScrollPosition, scrollType?: ScrollType): void;
		/**
		 * Get An Action thAt is A contribution to this editor.
		 * @id Unique identifier of the contribution.
		 * @return The Action or null if Action not found.
		 */
		getAction(id: string): IEditorAction;
		/**
		 * Execute A commAnd on the editor.
		 * The edits will lAnd on the undo-redo stAck, but no "undo stop" will be pushed.
		 * @pArAm source The source of the cAll.
		 * @pArAm commAnd The commAnd to execute
		 */
		executeCommAnd(source: string | null | undefined, commAnd: ICommAnd): void;
		/**
		 * Push An "undo stop" in the undo-redo stAck.
		 */
		pushUndoStop(): booleAn;
		/**
		 * Execute edits on the editor.
		 * The edits will lAnd on the undo-redo stAck, but no "undo stop" will be pushed.
		 * @pArAm source The source of the cAll.
		 * @pArAm edits The edits to execute.
		 * @pArAm endCursorStAte Cursor stAte After the edits were Applied.
		 */
		executeEdits(source: string | null | undefined, edits: IIdentifiedSingleEditOperAtion[], endCursorStAte?: ICursorStAteComputer | Selection[]): booleAn;
		/**
		 * Execute multiple (concomitAnt) commAnds on the editor.
		 * @pArAm source The source of the cAll.
		 * @pArAm commAnd The commAnds to execute
		 */
		executeCommAnds(source: string | null | undefined, commAnds: (ICommAnd | null)[]): void;
		/**
		 * Get All the decorAtions on A line (filtering out decorAtions from other editors).
		 */
		getLineDecorAtions(lineNumber: number): IModelDecorAtion[] | null;
		/**
		 * All decorAtions Added through this cAll will get the ownerId of this editor.
		 * @see `ITextModel.deltADecorAtions`
		 */
		deltADecorAtions(oldDecorAtions: string[], newDecorAtions: IModelDeltADecorAtion[]): string[];
		/**
		 * Get the lAyout info for the editor.
		 */
		getLAyoutInfo(): EditorLAyoutInfo;
		/**
		 * Returns the rAnges thAt Are currently visible.
		 * Does not Account for horizontAl scrolling.
		 */
		getVisibleRAnges(): RAnge[];
		/**
		 * Get the verticAl position (top offset) for the line w.r.t. to the first line.
		 */
		getTopForLineNumber(lineNumber: number): number;
		/**
		 * Get the verticAl position (top offset) for the position w.r.t. to the first line.
		 */
		getTopForPosition(lineNumber: number, column: number): number;
		/**
		 * Returns the editor's contAiner dom node
		 */
		getContAinerDomNode(): HTMLElement;
		/**
		 * Returns the editor's dom node
		 */
		getDomNode(): HTMLElement | null;
		/**
		 * Add A content widget. Widgets must hAve unique ids, otherwise they will be overwritten.
		 */
		AddContentWidget(widget: IContentWidget): void;
		/**
		 * LAyout/Reposition A content widget. This is A ping to the editor to cAll widget.getPosition()
		 * And updAte AppropriAtely.
		 */
		lAyoutContentWidget(widget: IContentWidget): void;
		/**
		 * Remove A content widget.
		 */
		removeContentWidget(widget: IContentWidget): void;
		/**
		 * Add An overlAy widget. Widgets must hAve unique ids, otherwise they will be overwritten.
		 */
		AddOverlAyWidget(widget: IOverlAyWidget): void;
		/**
		 * LAyout/Reposition An overlAy widget. This is A ping to the editor to cAll widget.getPosition()
		 * And updAte AppropriAtely.
		 */
		lAyoutOverlAyWidget(widget: IOverlAyWidget): void;
		/**
		 * Remove An overlAy widget.
		 */
		removeOverlAyWidget(widget: IOverlAyWidget): void;
		/**
		 * ChAnge the view zones. View zones Are lost when A new model is AttAched to the editor.
		 */
		chAngeViewZones(cAllbAck: (Accessor: IViewZoneChAngeAccessor) => void): void;
		/**
		 * Get the horizontAl position (left offset) for the column w.r.t to the beginning of the line.
		 * This method works only if the line `lineNumber` is currently rendered (in the editor's viewport).
		 * Use this method with cAution.
		 */
		getOffsetForColumn(lineNumber: number, column: number): number;
		/**
		 * Force An editor render now.
		 */
		render(forceRedrAw?: booleAn): void;
		/**
		 * Get the hit test tArget At coordinAtes `clientX` And `clientY`.
		 * The coordinAtes Are relAtive to the top-left of the viewport.
		 *
		 * @returns Hit test tArget or null if the coordinAtes fAll outside the editor or the editor hAs no model.
		 */
		getTArgetAtClientPoint(clientX: number, clientY: number): IMouseTArget | null;
		/**
		 * Get the visible position for `position`.
		 * The result position tAkes scrolling into Account And is relAtive to the top left corner of the editor.
		 * ExplAnAtion 1: the results of this method will chAnge for the sAme `position` if the user scrolls the editor.
		 * ExplAnAtion 2: the results of this method will not chAnge if the contAiner of the editor gets repositioned.
		 * WArning: the results of this method Are inAccurAte for positions thAt Are outside the current editor viewport.
		 */
		getScrolledVisiblePosition(position: IPosition): {
			top: number;
			left: number;
			height: number;
		} | null;
		/**
		 * Apply the sAme font settings As the editor to `tArget`.
		 */
		ApplyFontInfo(tArget: HTMLElement): void;
	}

	/**
	 * InformAtion About A line in the diff editor
	 */
	export interfAce IDiffLineInformAtion {
		reAdonly equivAlentLineNumber: number;
	}

	/**
	 * A rich diff editor.
	 */
	export interfAce IDiffEditor extends IEditor {
		/**
		 * @see ICodeEditor.getDomNode
		 */
		getDomNode(): HTMLElement;
		/**
		 * An event emitted when the diff informAtion computed by this diff editor hAs been updAted.
		 * @event
		 */
		onDidUpdAteDiff(listener: () => void): IDisposAble;
		/**
		 * SAves current view stAte of the editor in A seriAlizAble object.
		 */
		sAveViewStAte(): IDiffEditorViewStAte | null;
		/**
		 * Restores the view stAte of the editor from A seriAlizAble object generAted by `sAveViewStAte`.
		 */
		restoreViewStAte(stAte: IDiffEditorViewStAte): void;
		/**
		 * Type the getModel() of IEditor.
		 */
		getModel(): IDiffEditorModel | null;
		/**
		 * Sets the current model AttAched to this editor.
		 * If the previous model wAs creAted by the editor viA the vAlue key in the options
		 * literAl object, it will be destroyed. Otherwise, if the previous model wAs set
		 * viA setModel, or the model key in the options literAl object, the previous model
		 * will not be destroyed.
		 * It is sAfe to cAll setModel(null) to simply detAch the current model from the editor.
		 */
		setModel(model: IDiffEditorModel | null): void;
		/**
		 * Get the `originAl` editor.
		 */
		getOriginAlEditor(): ICodeEditor;
		/**
		 * Get the `modified` editor.
		 */
		getModifiedEditor(): ICodeEditor;
		/**
		 * Get the computed diff informAtion.
		 */
		getLineChAnges(): ILineChAnge[] | null;
		/**
		 * Get informAtion bAsed on computed diff About A line number from the originAl model.
		 * If the diff computAtion is not finished or the model is missing, will return null.
		 */
		getDiffLineInformAtionForOriginAl(lineNumber: number): IDiffLineInformAtion | null;
		/**
		 * Get informAtion bAsed on computed diff About A line number from the modified model.
		 * If the diff computAtion is not finished or the model is missing, will return null.
		 */
		getDiffLineInformAtionForModified(lineNumber: number): IDiffLineInformAtion | null;
		/**
		 * UpdAte the editor's options After the editor hAs been creAted.
		 */
		updAteOptions(newOptions: IDiffEditorOptions): void;
	}

	export clAss FontInfo extends BAreFontInfo {
		reAdonly _editorStylingBrAnd: void;
		reAdonly isTrusted: booleAn;
		reAdonly isMonospAce: booleAn;
		reAdonly typicAlHAlfwidthChArActerWidth: number;
		reAdonly typicAlFullwidthChArActerWidth: number;
		reAdonly cAnUseHAlfwidthRightwArdsArrow: booleAn;
		reAdonly spAceWidth: number;
		reAdonly middotWidth: number;
		reAdonly wsmiddotWidth: number;
		reAdonly mAxDigitWidth: number;
	}

	export clAss BAreFontInfo {
		reAdonly _bAreFontInfoBrAnd: void;
		reAdonly zoomLevel: number;
		reAdonly fontFAmily: string;
		reAdonly fontWeight: string;
		reAdonly fontSize: number;
		reAdonly fontFeAtureSettings: string;
		reAdonly lineHeight: number;
		reAdonly letterSpAcing: number;
	}

	//compAtibility:
	export type IReAdOnlyModel = ITextModel;
	export type IModel = ITextModel;
}

declAre nAmespAce monAco.lAnguAges {


	/**
	 * Register informAtion About A new lAnguAge.
	 */
	export function register(lAnguAge: ILAnguAgeExtensionPoint): void;

	/**
	 * Get the informAtion of All the registered lAnguAges.
	 */
	export function getLAnguAges(): ILAnguAgeExtensionPoint[];

	export function getEncodedLAnguAgeId(lAnguAgeId: string): number;

	/**
	 * An event emitted when A lAnguAge is first time needed (e.g. A model hAs it set).
	 * @event
	 */
	export function onLAnguAge(lAnguAgeId: string, cAllbAck: () => void): IDisposAble;

	/**
	 * Set the editing configurAtion for A lAnguAge.
	 */
	export function setLAnguAgeConfigurAtion(lAnguAgeId: string, configurAtion: LAnguAgeConfigurAtion): IDisposAble;

	/**
	 * A token.
	 */
	export interfAce IToken {
		stArtIndex: number;
		scopes: string;
	}

	/**
	 * The result of A line tokenizAtion.
	 */
	export interfAce ILineTokens {
		/**
		 * The list of tokens on the line.
		 */
		tokens: IToken[];
		/**
		 * The tokenizAtion end stAte.
		 * A pointer will be held to this And the object should not be modified by the tokenizer After the pointer is returned.
		 */
		endStAte: IStAte;
	}

	/**
	 * The result of A line tokenizAtion.
	 */
	export interfAce IEncodedLineTokens {
		/**
		 * The tokens on the line in A binAry, encoded formAt. EAch token occupies two ArrAy indices. For token i:
		 *  - At offset 2*i => stArtIndex
		 *  - At offset 2*i + 1 => metAdAtA
		 * MetA dAtA is in binAry formAt:
		 * - -------------------------------------------
		 *     3322 2222 2222 1111 1111 1100 0000 0000
		 *     1098 7654 3210 9876 5432 1098 7654 3210
		 * - -------------------------------------------
		 *     bbbb bbbb bfff ffff ffFF FTTT LLLL LLLL
		 * - -------------------------------------------
		 *  - L = EncodedLAnguAgeId (8 bits): Use `getEncodedLAnguAgeId` to get the encoded ID of A lAnguAge.
		 *  - T = StAndArdTokenType (3 bits): Other = 0, Comment = 1, String = 2, RegEx = 4.
		 *  - F = FontStyle (3 bits): None = 0, ItAlic = 1, Bold = 2, Underline = 4.
		 *  - f = foreground ColorId (9 bits)
		 *  - b = bAckground ColorId (9 bits)
		 *  - The color vAlue for eAch colorId is defined in IStAndAloneThemeDAtA.customTokenColors:
		 * e.g. colorId = 1 is stored in IStAndAloneThemeDAtA.customTokenColors[1]. Color id = 0 meAns no color,
		 * id = 1 is for the defAult foreground color, id = 2 for the defAult bAckground.
		 */
		tokens: Uint32ArrAy;
		/**
		 * The tokenizAtion end stAte.
		 * A pointer will be held to this And the object should not be modified by the tokenizer After the pointer is returned.
		 */
		endStAte: IStAte;
	}

	/**
	 * A "mAnuAl" provider of tokens.
	 */
	export interfAce TokensProvider {
		/**
		 * The initiAl stAte of A lAnguAge. Will be the stAte pAssed in to tokenize the first line.
		 */
		getInitiAlStAte(): IStAte;
		/**
		 * Tokenize A line given the stAte At the beginning of the line.
		 */
		tokenize(line: string, stAte: IStAte): ILineTokens;
	}

	/**
	 * A "mAnuAl" provider of tokens, returning tokens in A binAry form.
	 */
	export interfAce EncodedTokensProvider {
		/**
		 * The initiAl stAte of A lAnguAge. Will be the stAte pAssed in to tokenize the first line.
		 */
		getInitiAlStAte(): IStAte;
		/**
		 * Tokenize A line given the stAte At the beginning of the line.
		 */
		tokenizeEncoded(line: string, stAte: IStAte): IEncodedLineTokens;
	}

	/**
	 * Set the tokens provider for A lAnguAge (mAnuAl implementAtion).
	 */
	export function setTokensProvider(lAnguAgeId: string, provider: TokensProvider | EncodedTokensProvider | ThenAble<TokensProvider | EncodedTokensProvider>): IDisposAble;

	/**
	 * Set the tokens provider for A lAnguAge (monArch implementAtion).
	 */
	export function setMonArchTokensProvider(lAnguAgeId: string, lAnguAgeDef: IMonArchLAnguAge | ThenAble<IMonArchLAnguAge>): IDisposAble;

	/**
	 * Register A reference provider (used by e.g. reference seArch).
	 */
	export function registerReferenceProvider(lAnguAgeId: string, provider: ReferenceProvider): IDisposAble;

	/**
	 * Register A renAme provider (used by e.g. renAme symbol).
	 */
	export function registerRenAmeProvider(lAnguAgeId: string, provider: RenAmeProvider): IDisposAble;

	/**
	 * Register A signAture help provider (used by e.g. pArAmeter hints).
	 */
	export function registerSignAtureHelpProvider(lAnguAgeId: string, provider: SignAtureHelpProvider): IDisposAble;

	/**
	 * Register A hover provider (used by e.g. editor hover).
	 */
	export function registerHoverProvider(lAnguAgeId: string, provider: HoverProvider): IDisposAble;

	/**
	 * Register A document symbol provider (used by e.g. outline).
	 */
	export function registerDocumentSymbolProvider(lAnguAgeId: string, provider: DocumentSymbolProvider): IDisposAble;

	/**
	 * Register A document highlight provider (used by e.g. highlight occurrences).
	 */
	export function registerDocumentHighlightProvider(lAnguAgeId: string, provider: DocumentHighlightProvider): IDisposAble;

	/**
	 * Register An on type renAme provider.
	 */
	export function registerOnTypeRenAmeProvider(lAnguAgeId: string, provider: OnTypeRenAmeProvider): IDisposAble;

	/**
	 * Register A definition provider (used by e.g. go to definition).
	 */
	export function registerDefinitionProvider(lAnguAgeId: string, provider: DefinitionProvider): IDisposAble;

	/**
	 * Register A implementAtion provider (used by e.g. go to implementAtion).
	 */
	export function registerImplementAtionProvider(lAnguAgeId: string, provider: ImplementAtionProvider): IDisposAble;

	/**
	 * Register A type definition provider (used by e.g. go to type definition).
	 */
	export function registerTypeDefinitionProvider(lAnguAgeId: string, provider: TypeDefinitionProvider): IDisposAble;

	/**
	 * Register A code lens provider (used by e.g. inline code lenses).
	 */
	export function registerCodeLensProvider(lAnguAgeId: string, provider: CodeLensProvider): IDisposAble;

	/**
	 * Register A code Action provider (used by e.g. quick fix).
	 */
	export function registerCodeActionProvider(lAnguAgeId: string, provider: CodeActionProvider): IDisposAble;

	/**
	 * Register A formAtter thAt cAn hAndle only entire models.
	 */
	export function registerDocumentFormAttingEditProvider(lAnguAgeId: string, provider: DocumentFormAttingEditProvider): IDisposAble;

	/**
	 * Register A formAtter thAt cAn hAndle A rAnge inside A model.
	 */
	export function registerDocumentRAngeFormAttingEditProvider(lAnguAgeId: string, provider: DocumentRAngeFormAttingEditProvider): IDisposAble;

	/**
	 * Register A formAtter thAn cAn do formAtting As the user types.
	 */
	export function registerOnTypeFormAttingEditProvider(lAnguAgeId: string, provider: OnTypeFormAttingEditProvider): IDisposAble;

	/**
	 * Register A link provider thAt cAn find links in text.
	 */
	export function registerLinkProvider(lAnguAgeId: string, provider: LinkProvider): IDisposAble;

	/**
	 * Register A completion item provider (use by e.g. suggestions).
	 */
	export function registerCompletionItemProvider(lAnguAgeId: string, provider: CompletionItemProvider): IDisposAble;

	/**
	 * Register A document color provider (used by Color Picker, Color DecorAtor).
	 */
	export function registerColorProvider(lAnguAgeId: string, provider: DocumentColorProvider): IDisposAble;

	/**
	 * Register A folding rAnge provider
	 */
	export function registerFoldingRAngeProvider(lAnguAgeId: string, provider: FoldingRAngeProvider): IDisposAble;

	/**
	 * Register A declArAtion provider
	 */
	export function registerDeclArAtionProvider(lAnguAgeId: string, provider: DeclArAtionProvider): IDisposAble;

	/**
	 * Register A selection rAnge provider
	 */
	export function registerSelectionRAngeProvider(lAnguAgeId: string, provider: SelectionRAngeProvider): IDisposAble;

	/**
	 * Register A document semAntic tokens provider
	 */
	export function registerDocumentSemAnticTokensProvider(lAnguAgeId: string, provider: DocumentSemAnticTokensProvider): IDisposAble;

	/**
	 * Register A document rAnge semAntic tokens provider
	 */
	export function registerDocumentRAngeSemAnticTokensProvider(lAnguAgeId: string, provider: DocumentRAngeSemAnticTokensProvider): IDisposAble;

	/**
	 * ContAins AdditionAl diAgnostic informAtion About the context in which
	 * A [code Action](#CodeActionProvider.provideCodeActions) is run.
	 */
	export interfAce CodeActionContext {
		/**
		 * An ArrAy of diAgnostics.
		 */
		reAdonly mArkers: editor.IMArkerDAtA[];
		/**
		 * Requested kind of Actions to return.
		 */
		reAdonly only?: string;
	}

	/**
	 * The code Action interfAce defines the contrAct between extensions And
	 * the [light bulb](https://code.visuAlstudio.com/docs/editor/editingevolved#_code-Action) feAture.
	 */
	export interfAce CodeActionProvider {
		/**
		 * Provide commAnds for the given document And rAnge.
		 */
		provideCodeActions(model: editor.ITextModel, rAnge: RAnge, context: CodeActionContext, token: CAncellAtionToken): ProviderResult<CodeActionList>;
	}

	/**
	 * Describes how comments for A lAnguAge work.
	 */
	export interfAce CommentRule {
		/**
		 * The line comment token, like `// this is A comment`
		 */
		lineComment?: string | null;
		/**
		 * The block comment chArActer pAir, like `/* block comment *&#47;`
		 */
		blockComment?: ChArActerPAir | null;
	}

	/**
	 * The lAnguAge configurAtion interfAce defines the contrAct between extensions And
	 * vArious editor feAtures, like AutomAtic brAcket insertion, AutomAtic indentAtion etc.
	 */
	export interfAce LAnguAgeConfigurAtion {
		/**
		 * The lAnguAge's comment settings.
		 */
		comments?: CommentRule;
		/**
		 * The lAnguAge's brAckets.
		 * This configurAtion implicitly Affects pressing Enter Around these brAckets.
		 */
		brAckets?: ChArActerPAir[];
		/**
		 * The lAnguAge's word definition.
		 * If the lAnguAge supports Unicode identifiers (e.g. JAvAScript), it is preferAble
		 * to provide A word definition thAt uses exclusion of known sepArAtors.
		 * e.g.: A regex thAt mAtches Anything except known sepArAtors (And dot is Allowed to occur in A floAting point number):
		 *   /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g
		 */
		wordPAttern?: RegExp;
		/**
		 * The lAnguAge's indentAtion settings.
		 */
		indentAtionRules?: IndentAtionRule;
		/**
		 * The lAnguAge's rules to be evAluAted when pressing Enter.
		 */
		onEnterRules?: OnEnterRule[];
		/**
		 * The lAnguAge's Auto closing pAirs. The 'close' chArActer is AutomAticAlly inserted with the
		 * 'open' chArActer is typed. If not set, the configured brAckets will be used.
		 */
		AutoClosingPAirs?: IAutoClosingPAirConditionAl[];
		/**
		 * The lAnguAge's surrounding pAirs. When the 'open' chArActer is typed on A selection, the
		 * selected string is surrounded by the open And close chArActers. If not set, the Autoclosing pAirs
		 * settings will be used.
		 */
		surroundingPAirs?: IAutoClosingPAir[];
		/**
		 * Defines whAt chArActers must be After the cursor for brAcket or quote Autoclosing to occur when using the \'lAnguAgeDefined\' Autoclosing setting.
		 *
		 * This is typicAlly the set of chArActers which cAn not stArt An expression, such As whitespAce, closing brAckets, non-unAry operAtors, etc.
		 */
		AutoCloseBefore?: string;
		/**
		 * The lAnguAge's folding rules.
		 */
		folding?: FoldingRules;
		/**
		 * **DeprecAted** Do not use.
		 *
		 * @deprecAted Will be replAced by A better API soon.
		 */
		__electricChArActerSupport?: {
			docComment?: IDocComment;
		};
	}

	/**
	 * Describes indentAtion rules for A lAnguAge.
	 */
	export interfAce IndentAtionRule {
		/**
		 * If A line mAtches this pAttern, then All the lines After it should be unindented once (until Another rule mAtches).
		 */
		decreAseIndentPAttern: RegExp;
		/**
		 * If A line mAtches this pAttern, then All the lines After it should be indented once (until Another rule mAtches).
		 */
		increAseIndentPAttern: RegExp;
		/**
		 * If A line mAtches this pAttern, then **only the next line** After it should be indented once.
		 */
		indentNextLinePAttern?: RegExp | null;
		/**
		 * If A line mAtches this pAttern, then its indentAtion should not be chAnged And it should not be evAluAted AgAinst the other rules.
		 */
		unIndentedLinePAttern?: RegExp | null;
	}

	/**
	 * Describes lAnguAge specific folding mArkers such As '#region' And '#endregion'.
	 * The stArt And end regexes will be tested AgAinst the contents of All lines And must be designed efficiently:
	 * - the regex should stArt with '^'
	 * - regexp flAgs (i, g) Are ignored
	 */
	export interfAce FoldingMArkers {
		stArt: RegExp;
		end: RegExp;
	}

	/**
	 * Describes folding rules for A lAnguAge.
	 */
	export interfAce FoldingRules {
		/**
		 * Used by the indentAtion bAsed strAtegy to decide whether empty lines belong to the previous or the next block.
		 * A lAnguAge Adheres to the off-side rule if blocks in thAt lAnguAge Are expressed by their indentAtion.
		 * See [wikipediA](https://en.wikipediA.org/wiki/Off-side_rule) for more informAtion.
		 * If not set, `fAlse` is used And empty lines belong to the previous block.
		 */
		offSide?: booleAn;
		/**
		 * Region mArkers used by the lAnguAge.
		 */
		mArkers?: FoldingMArkers;
	}

	/**
	 * Describes A rule to be evAluAted when pressing Enter.
	 */
	export interfAce OnEnterRule {
		/**
		 * This rule will only execute if the text before the cursor mAtches this regulAr expression.
		 */
		beforeText: RegExp;
		/**
		 * This rule will only execute if the text After the cursor mAtches this regulAr expression.
		 */
		AfterText?: RegExp;
		/**
		 * This rule will only execute if the text Above the this line mAtches this regulAr expression.
		 */
		oneLineAboveText?: RegExp;
		/**
		 * The Action to execute.
		 */
		Action: EnterAction;
	}

	/**
	 * Definition of documentAtion comments (e.g. JAvAdoc/JSdoc)
	 */
	export interfAce IDocComment {
		/**
		 * The string thAt stArts A doc comment (e.g. '/**')
		 */
		open: string;
		/**
		 * The string thAt AppeArs on the lAst line And closes the doc comment (e.g. ' * /').
		 */
		close?: string;
	}

	/**
	 * A tuple of two chArActers, like A pAir of
	 * opening And closing brAckets.
	 */
	export type ChArActerPAir = [string, string];

	export interfAce IAutoClosingPAir {
		open: string;
		close: string;
	}

	export interfAce IAutoClosingPAirConditionAl extends IAutoClosingPAir {
		notIn?: string[];
	}

	/**
	 * Describes whAt to do with the indentAtion when pressing Enter.
	 */
	export enum IndentAction {
		/**
		 * Insert new line And copy the previous line's indentAtion.
		 */
		None = 0,
		/**
		 * Insert new line And indent once (relAtive to the previous line's indentAtion).
		 */
		Indent = 1,
		/**
		 * Insert two new lines:
		 *  - the first one indented which will hold the cursor
		 *  - the second one At the sAme indentAtion level
		 */
		IndentOutdent = 2,
		/**
		 * Insert new line And outdent once (relAtive to the previous line's indentAtion).
		 */
		Outdent = 3
	}

	/**
	 * Describes whAt to do when pressing Enter.
	 */
	export interfAce EnterAction {
		/**
		 * Describe whAt to do with the indentAtion.
		 */
		indentAction: IndentAction;
		/**
		 * Describes text to be Appended After the new line And After the indentAtion.
		 */
		AppendText?: string;
		/**
		 * Describes the number of chArActers to remove from the new line's indentAtion.
		 */
		removeText?: number;
	}

	/**
	 * The stAte of the tokenizer between two lines.
	 * It is useful to store flAgs such As in multiline comment, etc.
	 * The model will clone the previous line's stAte And pAss it in to tokenize the next line.
	 */
	export interfAce IStAte {
		clone(): IStAte;
		equAls(other: IStAte): booleAn;
	}

	/**
	 * A provider result represents the vAlues A provider, like the [`HoverProvider`](#HoverProvider),
	 * mAy return. For once this is the ActuAl result type `T`, like `Hover`, or A thenAble thAt resolves
	 * to thAt type `T`. In Addition, `null` And `undefined` cAn be returned - either directly or from A
	 * thenAble.
	 */
	export type ProviderResult<T> = T | undefined | null | ThenAble<T | undefined | null>;

	/**
	 * A hover represents AdditionAl informAtion for A symbol or word. Hovers Are
	 * rendered in A tooltip-like widget.
	 */
	export interfAce Hover {
		/**
		 * The contents of this hover.
		 */
		contents: IMArkdownString[];
		/**
		 * The rAnge to which this hover Applies. When missing, the
		 * editor will use the rAnge At the current position or the
		 * current position itself.
		 */
		rAnge?: IRAnge;
	}

	/**
	 * The hover provider interfAce defines the contrAct between extensions And
	 * the [hover](https://code.visuAlstudio.com/docs/editor/intellisense)-feAture.
	 */
	export interfAce HoverProvider {
		/**
		 * Provide A hover for the given position And document. Multiple hovers At the sAme
		 * position will be merged by the editor. A hover cAn hAve A rAnge which defAults
		 * to the word rAnge At the position when omitted.
		 */
		provideHover(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Hover>;
	}

	export enum CompletionItemKind {
		Method = 0,
		Function = 1,
		Constructor = 2,
		Field = 3,
		VAriAble = 4,
		ClAss = 5,
		Struct = 6,
		InterfAce = 7,
		Module = 8,
		Property = 9,
		Event = 10,
		OperAtor = 11,
		Unit = 12,
		VAlue = 13,
		ConstAnt = 14,
		Enum = 15,
		EnumMember = 16,
		Keyword = 17,
		Text = 18,
		Color = 19,
		File = 20,
		Reference = 21,
		Customcolor = 22,
		Folder = 23,
		TypePArAmeter = 24,
		User = 25,
		Issue = 26,
		Snippet = 27
	}

	export interfAce CompletionItemLAbel {
		/**
		 * The function or vAriAble. Rendered leftmost.
		 */
		nAme: string;
		/**
		 * The pArAmeters without the return type. Render After `nAme`.
		 */
		pArAmeters?: string;
		/**
		 * The fully quAlified nAme, like pAckAge nAme or file pAth. Rendered After `signAture`.
		 */
		quAlifier?: string;
		/**
		 * The return-type of A function or type of A property/vAriAble. Rendered rightmost.
		 */
		type?: string;
	}

	export enum CompletionItemTAg {
		DeprecAted = 1
	}

	export enum CompletionItemInsertTextRule {
		/**
		 * Adjust whitespAce/indentAtion of multiline insert texts to
		 * mAtch the current line indentAtion.
		 */
		KeepWhitespAce = 1,
		/**
		 * `insertText` is A snippet.
		 */
		InsertAsSnippet = 4
	}

	/**
	 * A completion item represents A text snippet thAt is
	 * proposed to complete text thAt is being typed.
	 */
	export interfAce CompletionItem {
		/**
		 * The lAbel of this completion item. By defAult
		 * this is Also the text thAt is inserted when selecting
		 * this completion.
		 */
		lAbel: string | CompletionItemLAbel;
		/**
		 * The kind of this completion item. BAsed on the kind
		 * An icon is chosen by the editor.
		 */
		kind: CompletionItemKind;
		/**
		 * A modifier to the `kind` which Affect how the item
		 * is rendered, e.g. DeprecAted is rendered with A strikeout
		 */
		tAgs?: ReAdonlyArrAy<CompletionItemTAg>;
		/**
		 * A humAn-reAdAble string with AdditionAl informAtion
		 * About this item, like type or symbol informAtion.
		 */
		detAil?: string;
		/**
		 * A humAn-reAdAble string thAt represents A doc-comment.
		 */
		documentAtion?: string | IMArkdownString;
		/**
		 * A string thAt should be used when compAring this item
		 * with other items. When `fAlsy` the [lAbel](#CompletionItem.lAbel)
		 * is used.
		 */
		sortText?: string;
		/**
		 * A string thAt should be used when filtering A set of
		 * completion items. When `fAlsy` the [lAbel](#CompletionItem.lAbel)
		 * is used.
		 */
		filterText?: string;
		/**
		 * Select this item when showing. *Note* thAt only one completion item cAn be selected And
		 * thAt the editor decides which item thAt is. The rule is thAt the *first* item of those
		 * thAt mAtch best is selected.
		 */
		preselect?: booleAn;
		/**
		 * A string or snippet thAt should be inserted in A document when selecting
		 * this completion.
		 * is used.
		 */
		insertText: string;
		/**
		 * Addition rules (As bitmAsk) thAt should be Applied when inserting
		 * this completion.
		 */
		insertTextRules?: CompletionItemInsertTextRule;
		/**
		 * A rAnge of text thAt should be replAced by this completion item.
		 *
		 * DefAults to A rAnge from the stArt of the [current word](#TextDocument.getWordRAngeAtPosition) to the
		 * current position.
		 *
		 * *Note:* The rAnge must be A [single line](#RAnge.isSingleLine) And it must
		 * [contAin](#RAnge.contAins) the position At which completion hAs been [requested](#CompletionItemProvider.provideCompletionItems).
		 */
		rAnge: IRAnge | {
			insert: IRAnge;
			replAce: IRAnge;
		};
		/**
		 * An optionAl set of chArActers thAt when pressed while this completion is Active will Accept it first And
		 * then type thAt chArActer. *Note* thAt All commit chArActers should hAve `length=1` And thAt superfluous
		 * chArActers will be ignored.
		 */
		commitChArActers?: string[];
		/**
		 * An optionAl ArrAy of AdditionAl text edits thAt Are Applied when
		 * selecting this completion. Edits must not overlAp with the mAin edit
		 * nor with themselves.
		 */
		AdditionAlTextEdits?: editor.ISingleEditOperAtion[];
		/**
		 * A commAnd thAt should be run upon AcceptAnce of this item.
		 */
		commAnd?: CommAnd;
	}

	export interfAce CompletionList {
		suggestions: CompletionItem[];
		incomplete?: booleAn;
		dispose?(): void;
	}

	/**
	 * How A suggest provider wAs triggered.
	 */
	export enum CompletionTriggerKind {
		Invoke = 0,
		TriggerChArActer = 1,
		TriggerForIncompleteCompletions = 2
	}

	/**
	 * ContAins AdditionAl informAtion About the context in which
	 * [completion provider](#CompletionItemProvider.provideCompletionItems) is triggered.
	 */
	export interfAce CompletionContext {
		/**
		 * How the completion wAs triggered.
		 */
		triggerKind: CompletionTriggerKind;
		/**
		 * ChArActer thAt triggered the completion item provider.
		 *
		 * `undefined` if provider wAs not triggered by A chArActer.
		 */
		triggerChArActer?: string;
	}

	/**
	 * The completion item provider interfAce defines the contrAct between extensions And
	 * the [IntelliSense](https://code.visuAlstudio.com/docs/editor/intellisense).
	 *
	 * When computing *complete* completion items is expensive, providers cAn optionAlly implement
	 * the `resolveCompletionItem`-function. In thAt cAse it is enough to return completion
	 * items with A [lAbel](#CompletionItem.lAbel) from the
	 * [provideCompletionItems](#CompletionItemProvider.provideCompletionItems)-function. Subsequently,
	 * when A completion item is shown in the UI And gAins focus this provider is Asked to resolve
	 * the item, like Adding [doc-comment](#CompletionItem.documentAtion) or [detAils](#CompletionItem.detAil).
	 */
	export interfAce CompletionItemProvider {
		triggerChArActers?: string[];
		/**
		 * Provide completion items for the given position And document.
		 */
		provideCompletionItems(model: editor.ITextModel, position: Position, context: CompletionContext, token: CAncellAtionToken): ProviderResult<CompletionList>;
		/**
		 * Given A completion item fill in more dAtA, like [doc-comment](#CompletionItem.documentAtion)
		 * or [detAils](#CompletionItem.detAil).
		 *
		 * The editor will only resolve A completion item once.
		 */
		resolveCompletionItem?(item: CompletionItem, token: CAncellAtionToken): ProviderResult<CompletionItem>;
	}

	export interfAce CodeAction {
		title: string;
		commAnd?: CommAnd;
		edit?: WorkspAceEdit;
		diAgnostics?: editor.IMArkerDAtA[];
		kind?: string;
		isPreferred?: booleAn;
		disAbled?: string;
	}

	export interfAce CodeActionList extends IDisposAble {
		reAdonly Actions: ReAdonlyArrAy<CodeAction>;
	}

	/**
	 * Represents A pArAmeter of A cAllAble-signAture. A pArAmeter cAn
	 * hAve A lAbel And A doc-comment.
	 */
	export interfAce PArAmeterInformAtion {
		/**
		 * The lAbel of this signAture. Will be shown in
		 * the UI.
		 */
		lAbel: string | [number, number];
		/**
		 * The humAn-reAdAble doc-comment of this signAture. Will be shown
		 * in the UI but cAn be omitted.
		 */
		documentAtion?: string | IMArkdownString;
	}

	/**
	 * Represents the signAture of something cAllAble. A signAture
	 * cAn hAve A lAbel, like A function-nAme, A doc-comment, And
	 * A set of pArAmeters.
	 */
	export interfAce SignAtureInformAtion {
		/**
		 * The lAbel of this signAture. Will be shown in
		 * the UI.
		 */
		lAbel: string;
		/**
		 * The humAn-reAdAble doc-comment of this signAture. Will be shown
		 * in the UI but cAn be omitted.
		 */
		documentAtion?: string | IMArkdownString;
		/**
		 * The pArAmeters of this signAture.
		 */
		pArAmeters: PArAmeterInformAtion[];
		/**
		 * Index of the Active pArAmeter.
		 *
		 * If provided, this is used in plAce of `SignAtureHelp.ActiveSignAture`.
		 */
		ActivePArAmeter?: number;
	}

	/**
	 * SignAture help represents the signAture of something
	 * cAllAble. There cAn be multiple signAtures but only one
	 * Active And only one Active pArAmeter.
	 */
	export interfAce SignAtureHelp {
		/**
		 * One or more signAtures.
		 */
		signAtures: SignAtureInformAtion[];
		/**
		 * The Active signAture.
		 */
		ActiveSignAture: number;
		/**
		 * The Active pArAmeter of the Active signAture.
		 */
		ActivePArAmeter: number;
	}

	export interfAce SignAtureHelpResult extends IDisposAble {
		vAlue: SignAtureHelp;
	}

	export enum SignAtureHelpTriggerKind {
		Invoke = 1,
		TriggerChArActer = 2,
		ContentChAnge = 3
	}

	export interfAce SignAtureHelpContext {
		reAdonly triggerKind: SignAtureHelpTriggerKind;
		reAdonly triggerChArActer?: string;
		reAdonly isRetrigger: booleAn;
		reAdonly ActiveSignAtureHelp?: SignAtureHelp;
	}

	/**
	 * The signAture help provider interfAce defines the contrAct between extensions And
	 * the [pArAmeter hints](https://code.visuAlstudio.com/docs/editor/intellisense)-feAture.
	 */
	export interfAce SignAtureHelpProvider {
		reAdonly signAtureHelpTriggerChArActers?: ReAdonlyArrAy<string>;
		reAdonly signAtureHelpRetriggerChArActers?: ReAdonlyArrAy<string>;
		/**
		 * Provide help for the signAture At the given position And document.
		 */
		provideSignAtureHelp(model: editor.ITextModel, position: Position, token: CAncellAtionToken, context: SignAtureHelpContext): ProviderResult<SignAtureHelpResult>;
	}

	/**
	 * A document highlight kind.
	 */
	export enum DocumentHighlightKind {
		/**
		 * A textuAl occurrence.
		 */
		Text = 0,
		/**
		 * ReAd-Access of A symbol, like reAding A vAriAble.
		 */
		ReAd = 1,
		/**
		 * Write-Access of A symbol, like writing to A vAriAble.
		 */
		Write = 2
	}

	/**
	 * A document highlight is A rAnge inside A text document which deserves
	 * speciAl Attention. UsuAlly A document highlight is visuAlized by chAnging
	 * the bAckground color of its rAnge.
	 */
	export interfAce DocumentHighlight {
		/**
		 * The rAnge this highlight Applies to.
		 */
		rAnge: IRAnge;
		/**
		 * The highlight kind, defAult is [text](#DocumentHighlightKind.Text).
		 */
		kind?: DocumentHighlightKind;
	}

	/**
	 * The document highlight provider interfAce defines the contrAct between extensions And
	 * the word-highlight-feAture.
	 */
	export interfAce DocumentHighlightProvider {
		/**
		 * Provide A set of document highlights, like All occurrences of A vAriAble or
		 * All exit-points of A function.
		 */
		provideDocumentHighlights(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<DocumentHighlight[]>;
	}

	/**
	 * The renAme provider interfAce defines the contrAct between extensions And
	 * the live-renAme feAture.
	 */
	export interfAce OnTypeRenAmeProvider {
		wordPAttern?: RegExp;
		/**
		 * Provide A list of rAnges thAt cAn be live-renAmed together.
		 */
		provideOnTypeRenAmeRAnges(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<{
			rAnges: IRAnge[];
			wordPAttern?: RegExp;
		}>;
	}

	/**
	 * VAlue-object thAt contAins AdditionAl informAtion when
	 * requesting references.
	 */
	export interfAce ReferenceContext {
		/**
		 * Include the declArAtion of the current symbol.
		 */
		includeDeclArAtion: booleAn;
	}

	/**
	 * The reference provider interfAce defines the contrAct between extensions And
	 * the [find references](https://code.visuAlstudio.com/docs/editor/editingevolved#_peek)-feAture.
	 */
	export interfAce ReferenceProvider {
		/**
		 * Provide A set of project-wide references for the given position And document.
		 */
		provideReferences(model: editor.ITextModel, position: Position, context: ReferenceContext, token: CAncellAtionToken): ProviderResult<LocAtion[]>;
	}

	/**
	 * Represents A locAtion inside A resource, such As A line
	 * inside A text file.
	 */
	export interfAce LocAtion {
		/**
		 * The resource identifier of this locAtion.
		 */
		uri: Uri;
		/**
		 * The document rAnge of this locAtions.
		 */
		rAnge: IRAnge;
	}

	export interfAce LocAtionLink {
		/**
		 * A rAnge to select where this link originAtes from.
		 */
		originSelectionRAnge?: IRAnge;
		/**
		 * The tArget uri this link points to.
		 */
		uri: Uri;
		/**
		 * The full rAnge this link points to.
		 */
		rAnge: IRAnge;
		/**
		 * A rAnge to select this link points to. Must be contAined
		 * in `LocAtionLink.rAnge`.
		 */
		tArgetSelectionRAnge?: IRAnge;
	}

	export type Definition = LocAtion | LocAtion[] | LocAtionLink[];

	/**
	 * The definition provider interfAce defines the contrAct between extensions And
	 * the [go to definition](https://code.visuAlstudio.com/docs/editor/editingevolved#_go-to-definition)
	 * And peek definition feAtures.
	 */
	export interfAce DefinitionProvider {
		/**
		 * Provide the definition of the symbol At the given position And document.
		 */
		provideDefinition(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
	}

	/**
	 * The definition provider interfAce defines the contrAct between extensions And
	 * the [go to definition](https://code.visuAlstudio.com/docs/editor/editingevolved#_go-to-definition)
	 * And peek definition feAtures.
	 */
	export interfAce DeclArAtionProvider {
		/**
		 * Provide the declArAtion of the symbol At the given position And document.
		 */
		provideDeclArAtion(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
	}

	/**
	 * The implementAtion provider interfAce defines the contrAct between extensions And
	 * the go to implementAtion feAture.
	 */
	export interfAce ImplementAtionProvider {
		/**
		 * Provide the implementAtion of the symbol At the given position And document.
		 */
		provideImplementAtion(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
	}

	/**
	 * The type definition provider interfAce defines the contrAct between extensions And
	 * the go to type definition feAture.
	 */
	export interfAce TypeDefinitionProvider {
		/**
		 * Provide the type definition of the symbol At the given position And document.
		 */
		provideTypeDefinition(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<Definition | LocAtionLink[]>;
	}

	/**
	 * A symbol kind.
	 */
	export enum SymbolKind {
		File = 0,
		Module = 1,
		NAmespAce = 2,
		PAckAge = 3,
		ClAss = 4,
		Method = 5,
		Property = 6,
		Field = 7,
		Constructor = 8,
		Enum = 9,
		InterfAce = 10,
		Function = 11,
		VAriAble = 12,
		ConstAnt = 13,
		String = 14,
		Number = 15,
		BooleAn = 16,
		ArrAy = 17,
		Object = 18,
		Key = 19,
		Null = 20,
		EnumMember = 21,
		Struct = 22,
		Event = 23,
		OperAtor = 24,
		TypePArAmeter = 25
	}

	export enum SymbolTAg {
		DeprecAted = 1
	}

	export interfAce DocumentSymbol {
		nAme: string;
		detAil: string;
		kind: SymbolKind;
		tAgs: ReAdonlyArrAy<SymbolTAg>;
		contAinerNAme?: string;
		rAnge: IRAnge;
		selectionRAnge: IRAnge;
		children?: DocumentSymbol[];
	}

	/**
	 * The document symbol provider interfAce defines the contrAct between extensions And
	 * the [go to symbol](https://code.visuAlstudio.com/docs/editor/editingevolved#_go-to-symbol)-feAture.
	 */
	export interfAce DocumentSymbolProvider {
		displAyNAme?: string;
		/**
		 * Provide symbol informAtion for the given document.
		 */
		provideDocumentSymbols(model: editor.ITextModel, token: CAncellAtionToken): ProviderResult<DocumentSymbol[]>;
	}

	export type TextEdit = {
		rAnge: IRAnge;
		text: string;
		eol?: editor.EndOfLineSequence;
	};

	/**
	 * InterfAce used to formAt A model
	 */
	export interfAce FormAttingOptions {
		/**
		 * Size of A tAb in spAces.
		 */
		tAbSize: number;
		/**
		 * Prefer spAces over tAbs.
		 */
		insertSpAces: booleAn;
	}

	/**
	 * The document formAtting provider interfAce defines the contrAct between extensions And
	 * the formAtting-feAture.
	 */
	export interfAce DocumentFormAttingEditProvider {
		reAdonly displAyNAme?: string;
		/**
		 * Provide formAtting edits for A whole document.
		 */
		provideDocumentFormAttingEdits(model: editor.ITextModel, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]>;
	}

	/**
	 * The document formAtting provider interfAce defines the contrAct between extensions And
	 * the formAtting-feAture.
	 */
	export interfAce DocumentRAngeFormAttingEditProvider {
		reAdonly displAyNAme?: string;
		/**
		 * Provide formAtting edits for A rAnge in A document.
		 *
		 * The given rAnge is A hint And providers cAn decide to formAt A smAller
		 * or lArger rAnge. Often this is done by Adjusting the stArt And end
		 * of the rAnge to full syntAx nodes.
		 */
		provideDocumentRAngeFormAttingEdits(model: editor.ITextModel, rAnge: RAnge, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]>;
	}

	/**
	 * The document formAtting provider interfAce defines the contrAct between extensions And
	 * the formAtting-feAture.
	 */
	export interfAce OnTypeFormAttingEditProvider {
		AutoFormAtTriggerChArActers: string[];
		/**
		 * Provide formAtting edits After A chArActer hAs been typed.
		 *
		 * The given position And chArActer should hint to the provider
		 * whAt rAnge the position to expAnd to, like find the mAtching `{`
		 * when `}` hAs been entered.
		 */
		provideOnTypeFormAttingEdits(model: editor.ITextModel, position: Position, ch: string, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]>;
	}

	/**
	 * A link inside the editor.
	 */
	export interfAce ILink {
		rAnge: IRAnge;
		url?: Uri | string;
		tooltip?: string;
	}

	export interfAce ILinksList {
		links: ILink[];
		dispose?(): void;
	}

	/**
	 * A provider of links.
	 */
	export interfAce LinkProvider {
		provideLinks(model: editor.ITextModel, token: CAncellAtionToken): ProviderResult<ILinksList>;
		resolveLink?: (link: ILink, token: CAncellAtionToken) => ProviderResult<ILink>;
	}

	/**
	 * A color in RGBA formAt.
	 */
	export interfAce IColor {
		/**
		 * The red component in the rAnge [0-1].
		 */
		reAdonly red: number;
		/**
		 * The green component in the rAnge [0-1].
		 */
		reAdonly green: number;
		/**
		 * The blue component in the rAnge [0-1].
		 */
		reAdonly blue: number;
		/**
		 * The AlphA component in the rAnge [0-1].
		 */
		reAdonly AlphA: number;
	}

	/**
	 * String representAtions for A color
	 */
	export interfAce IColorPresentAtion {
		/**
		 * The lAbel of this color presentAtion. It will be shown on the color
		 * picker heAder. By defAult this is Also the text thAt is inserted when selecting
		 * this color presentAtion.
		 */
		lAbel: string;
		/**
		 * An [edit](#TextEdit) which is Applied to A document when selecting
		 * this presentAtion for the color.
		 */
		textEdit?: TextEdit;
		/**
		 * An optionAl ArrAy of AdditionAl [text edits](#TextEdit) thAt Are Applied when
		 * selecting this color presentAtion.
		 */
		AdditionAlTextEdits?: TextEdit[];
	}

	/**
	 * A color rAnge is A rAnge in A text model which represents A color.
	 */
	export interfAce IColorInformAtion {
		/**
		 * The rAnge within the model.
		 */
		rAnge: IRAnge;
		/**
		 * The color represented in this rAnge.
		 */
		color: IColor;
	}

	/**
	 * A provider of colors for editor models.
	 */
	export interfAce DocumentColorProvider {
		/**
		 * Provides the color rAnges for A specific model.
		 */
		provideDocumentColors(model: editor.ITextModel, token: CAncellAtionToken): ProviderResult<IColorInformAtion[]>;
		/**
		 * Provide the string representAtions for A color.
		 */
		provideColorPresentAtions(model: editor.ITextModel, colorInfo: IColorInformAtion, token: CAncellAtionToken): ProviderResult<IColorPresentAtion[]>;
	}

	export interfAce SelectionRAnge {
		rAnge: IRAnge;
	}

	export interfAce SelectionRAngeProvider {
		/**
		 * Provide rAnges thAt should be selected from the given position.
		 */
		provideSelectionRAnges(model: editor.ITextModel, positions: Position[], token: CAncellAtionToken): ProviderResult<SelectionRAnge[][]>;
	}

	export interfAce FoldingContext {
	}

	/**
	 * A provider of folding rAnges for editor models.
	 */
	export interfAce FoldingRAngeProvider {
		/**
		 * An optionAl event to signAl thAt the folding rAnges from this provider hAve chAnged.
		 */
		onDidChAnge?: IEvent<this>;
		/**
		 * Provides the folding rAnges for A specific model.
		 */
		provideFoldingRAnges(model: editor.ITextModel, context: FoldingContext, token: CAncellAtionToken): ProviderResult<FoldingRAnge[]>;
	}

	export interfAce FoldingRAnge {
		/**
		 * The one-bAsed stArt line of the rAnge to fold. The folded AreA stArts After the line's lAst chArActer.
		 */
		stArt: number;
		/**
		 * The one-bAsed end line of the rAnge to fold. The folded AreA ends with the line's lAst chArActer.
		 */
		end: number;
		/**
		 * Describes the [Kind](#FoldingRAngeKind) of the folding rAnge such As [Comment](#FoldingRAngeKind.Comment) or
		 * [Region](#FoldingRAngeKind.Region). The kind is used to cAtegorize folding rAnges And used by commAnds
		 * like 'Fold All comments'. See
		 * [FoldingRAngeKind](#FoldingRAngeKind) for An enumerAtion of stAndArdized kinds.
		 */
		kind?: FoldingRAngeKind;
	}

	export clAss FoldingRAngeKind {
		vAlue: string;
		/**
		 * Kind for folding rAnge representing A comment. The vAlue of the kind is 'comment'.
		 */
		stAtic reAdonly Comment: FoldingRAngeKind;
		/**
		 * Kind for folding rAnge representing A import. The vAlue of the kind is 'imports'.
		 */
		stAtic reAdonly Imports: FoldingRAngeKind;
		/**
		 * Kind for folding rAnge representing regions (for exAmple mArked by `#region`, `#endregion`).
		 * The vAlue of the kind is 'region'.
		 */
		stAtic reAdonly Region: FoldingRAngeKind;
		/**
		 * CreAtes A new [FoldingRAngeKind](#FoldingRAngeKind).
		 *
		 * @pArAm vAlue of the kind.
		 */
		constructor(vAlue: string);
	}

	export interfAce WorkspAceEditMetAdAtA {
		needsConfirmAtion: booleAn;
		lAbel: string;
		description?: string;
		iconPAth?: {
			id: string;
		} | Uri | {
			light: Uri;
			dArk: Uri;
		};
	}

	export interfAce WorkspAceFileEditOptions {
		overwrite?: booleAn;
		ignoreIfNotExists?: booleAn;
		ignoreIfExists?: booleAn;
		recursive?: booleAn;
	}

	export interfAce WorkspAceFileEdit {
		oldUri?: Uri;
		newUri?: Uri;
		options?: WorkspAceFileEditOptions;
		metAdAtA?: WorkspAceEditMetAdAtA;
	}

	export interfAce WorkspAceTextEdit {
		resource: Uri;
		edit: TextEdit;
		modelVersionId?: number;
		metAdAtA?: WorkspAceEditMetAdAtA;
	}

	export interfAce WorkspAceEdit {
		edits: ArrAy<WorkspAceTextEdit | WorkspAceFileEdit>;
	}

	export interfAce Rejection {
		rejectReAson?: string;
	}

	export interfAce RenAmeLocAtion {
		rAnge: IRAnge;
		text: string;
	}

	export interfAce RenAmeProvider {
		provideRenAmeEdits(model: editor.ITextModel, position: Position, newNAme: string, token: CAncellAtionToken): ProviderResult<WorkspAceEdit & Rejection>;
		resolveRenAmeLocAtion?(model: editor.ITextModel, position: Position, token: CAncellAtionToken): ProviderResult<RenAmeLocAtion & Rejection>;
	}

	export interfAce CommAnd {
		id: string;
		title: string;
		tooltip?: string;
		Arguments?: Any[];
	}

	export interfAce CodeLens {
		rAnge: IRAnge;
		id?: string;
		commAnd?: CommAnd;
	}

	export interfAce CodeLensList {
		lenses: CodeLens[];
		dispose(): void;
	}

	export interfAce CodeLensProvider {
		onDidChAnge?: IEvent<this>;
		provideCodeLenses(model: editor.ITextModel, token: CAncellAtionToken): ProviderResult<CodeLensList>;
		resolveCodeLens?(model: editor.ITextModel, codeLens: CodeLens, token: CAncellAtionToken): ProviderResult<CodeLens>;
	}

	export interfAce SemAnticTokensLegend {
		reAdonly tokenTypes: string[];
		reAdonly tokenModifiers: string[];
	}

	export interfAce SemAnticTokens {
		reAdonly resultId?: string;
		reAdonly dAtA: Uint32ArrAy;
	}

	export interfAce SemAnticTokensEdit {
		reAdonly stArt: number;
		reAdonly deleteCount: number;
		reAdonly dAtA?: Uint32ArrAy;
	}

	export interfAce SemAnticTokensEdits {
		reAdonly resultId?: string;
		reAdonly edits: SemAnticTokensEdit[];
	}

	export interfAce DocumentSemAnticTokensProvider {
		onDidChAnge?: IEvent<void>;
		getLegend(): SemAnticTokensLegend;
		provideDocumentSemAnticTokens(model: editor.ITextModel, lAstResultId: string | null, token: CAncellAtionToken): ProviderResult<SemAnticTokens | SemAnticTokensEdits>;
		releAseDocumentSemAnticTokens(resultId: string | undefined): void;
	}

	export interfAce DocumentRAngeSemAnticTokensProvider {
		getLegend(): SemAnticTokensLegend;
		provideDocumentRAngeSemAnticTokens(model: editor.ITextModel, rAnge: RAnge, token: CAncellAtionToken): ProviderResult<SemAnticTokens>;
	}

	export interfAce ILAnguAgeExtensionPoint {
		id: string;
		extensions?: string[];
		filenAmes?: string[];
		filenAmePAtterns?: string[];
		firstLine?: string;
		AliAses?: string[];
		mimetypes?: string[];
		configurAtion?: Uri;
	}
	/**
	 * A MonArch lAnguAge definition
	 */
	export interfAce IMonArchLAnguAge {
		/**
		 * mAp from string to ILAnguAgeRule[]
		 */
		tokenizer: {
			[nAme: string]: IMonArchLAnguAgeRule[];
		};
		/**
		 * is the lAnguAge cAse insensitive?
		 */
		ignoreCAse?: booleAn;
		/**
		 * is the lAnguAge unicode-AwAre? (i.e., /\u{1D306}/)
		 */
		unicode?: booleAn;
		/**
		 * if no mAtch in the tokenizer Assign this token clAss (defAult 'source')
		 */
		defAultToken?: string;
		/**
		 * for exAmple [['{','}','delimiter.curly']]
		 */
		brAckets?: IMonArchLAnguAgeBrAcket[];
		/**
		 * stArt symbol in the tokenizer (by defAult the first entry is used)
		 */
		stArt?: string;
		/**
		 * AttAch this to every token clAss (by defAult '.' + nAme)
		 */
		tokenPostfix?: string;
	}

	/**
	 * A rule is either A regulAr expression And An Action
	 * 		shorthAnds: [reg,Act] == { regex: reg, Action: Act}
	 *		And       : [reg,Act,nxt] == { regex: reg, Action: Act{ next: nxt }}
	 */
	export type IShortMonArchLAnguAgeRule1 = [string | RegExp, IMonArchLAnguAgeAction];

	export type IShortMonArchLAnguAgeRule2 = [string | RegExp, IMonArchLAnguAgeAction, string];

	export interfAce IExpAndedMonArchLAnguAgeRule {
		/**
		 * mAtch tokens
		 */
		regex?: string | RegExp;
		/**
		 * Action to tAke on mAtch
		 */
		Action?: IMonArchLAnguAgeAction;
		/**
		 * or An include rule. include All rules from the included stAte
		 */
		include?: string;
	}

	export type IMonArchLAnguAgeRule = IShortMonArchLAnguAgeRule1 | IShortMonArchLAnguAgeRule2 | IExpAndedMonArchLAnguAgeRule;

	/**
	 * An Action is either An ArrAy of Actions...
	 * ... or A cAse stAtement with guArds...
	 * ... or A bAsic Action with A token vAlue.
	 */
	export type IShortMonArchLAnguAgeAction = string;

	export interfAce IExpAndedMonArchLAnguAgeAction {
		/**
		 * ArrAy of Actions for eAch pArenthesized mAtch group
		 */
		group?: IMonArchLAnguAgeAction[];
		/**
		 * mAp from string to ILAnguAgeAction
		 */
		cAses?: Object;
		/**
		 * token clAss (ie. css clAss) (or "@brAckets" or "@remAtch")
		 */
		token?: string;
		/**
		 * the next stAte to push, or "@push", "@pop", "@popAll"
		 */
		next?: string;
		/**
		 * switch to this stAte
		 */
		switchTo?: string;
		/**
		 * go bAck n chArActers in the streAm
		 */
		goBAck?: number;
		/**
		 * @open or @close
		 */
		brAcket?: string;
		/**
		 * switch to embedded lAnguAge (using the mimetype) or get out using "@pop"
		 */
		nextEmbedded?: string;
		/**
		 * log A messAge to the browser console window
		 */
		log?: string;
	}

	export type IMonArchLAnguAgeAction = IShortMonArchLAnguAgeAction | IExpAndedMonArchLAnguAgeAction | IShortMonArchLAnguAgeAction[] | IExpAndedMonArchLAnguAgeAction[];

	/**
	 * This interfAce cAn be shortened As An ArrAy, ie. ['{','}','delimiter.curly']
	 */
	export interfAce IMonArchLAnguAgeBrAcket {
		/**
		 * open brAcket
		 */
		open: string;
		/**
		 * closing brAcket
		 */
		close: string;
		/**
		 * token clAss
		 */
		token: string;
	}

}

declAre nAmespAce monAco.worker {


	export interfAce IMirrorModel {
		reAdonly uri: Uri;
		reAdonly version: number;
		getVAlue(): string;
	}

	export interfAce IWorkerContext<H = undefined> {
		/**
		 * A proxy to the mAin threAd host object.
		 */
		host: H;
		/**
		 * Get All AvAilAble mirror models in this worker.
		 */
		getMirrorModels(): IMirrorModel[];
	}

}

//dtsv=3
