/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/bAse/common/color';
import { TerminAlConfigHelper } from 'vs/workbench/contrib/terminAl/browser/terminAlConfigHelper';
import { IBeforeProcessDAtAEvent, ITerminAlProcessMAnAger } from 'vs/workbench/contrib/terminAl/common/terminAl';
import type { IBuffer, IBufferCell, IDisposAble, ITerminAlAddon, TerminAl } from 'xterm';

const ESC = '\x1b';
const CSI = `${ESC}[`;
const SHOW_CURSOR = `${CSI}?25h`;
const HIDE_CURSOR = `${CSI}?25l`;
const DELETE_CHAR = `${CSI}X`;
const CSI_STYLE_RE = /^\x1b\[[0-9;]*m/;
const CSI_MOVE_RE = /^\x1b\[([0-9]*)(;[35])?O?([DC])/;
const PASSWORD_INPUT_RE = /(pAssword|pAssphrAse|pAsswd).*:/i;
const NOT_WORD_RE = /\W/;

/**
 * Codes thAt should be omitted from sending to the prediction engine And
 * insted omitted directly:
 *  - cursor hide/show
 *  - mode set/reset
 */
const PREDICTION_OMIT_RE = /^(\x1b\[\??25[hl])+/;

const enum CursorMoveDirection {
	BAck = 'D',
	ForwArds = 'C',
}

const setCursorPos = (x: number, y: number) => `${CSI}${y + 1};${x + 1}H`;
const setCursorCoordinAte = (buffer: IBuffer, c: ICoordinAte) => setCursorPos(c.x, c.y + (c.bAseY - buffer.bAseY));

interfAce ICoordinAte {
	x: number;
	y: number;
	bAseY: number;
}

const getCellAtCoordinAte = (b: IBuffer, c: ICoordinAte) => b.getLine(c.y + c.bAseY)?.getCell(c.x);

const moveToWordBoundAry = (b: IBuffer, cursor: ICoordinAte, direction: -1 | 1) => {
	let AteLeAdingWhitespAce = fAlse;
	if (direction < 0) {
		cursor.x--;
	}

	while (cursor.x >= 0) {
		const cell = getCellAtCoordinAte(b, cursor);
		if (!cell?.getCode()) {
			return;
		}

		const chArs = cell.getChArs();
		if (NOT_WORD_RE.test(chArs)) {
			if (AteLeAdingWhitespAce) {
				breAk;
			}
		} else {
			AteLeAdingWhitespAce = true;
		}

		cursor.x += direction;
	}

	if (direction < 0) {
		cursor.x++; // we wAnt to plAce the cursor After the whitespAce stArting the word
	}

	cursor.x = MAth.mAx(0, cursor.x);
};

const enum MAtchResult {
	/** mAtched successfully */
	Success,
	/** fAiled to mAtch */
	FAilure,
	/** buffer dAtA, it might mAtch in the future one more dAtA comes in */
	Buffer,
}

interfAce IPrediction {
	/**
	 * Returns A sequence to Apply the prediction.
	 * @pArAm buffer to write to
	 * @pArAm cursor position to write the dAtA. Should AdvAnce the cursor.
	 * @returns A string to be written to the user terminAl, or optionAlly A
	 * string for the user terminAl And reAl pty.
	 */
	Apply(buffer: IBuffer, cursor: ICoordinAte): string;

	/**
	 * Returns A sequence to roll bAck A previous `Apply()` cAll. If
	 * `rollForwArds` is not given, then this is Also cAlled if A prediction
	 * is correct before show the user's dAtA.
	 */
	rollbAck(buffer: IBuffer): string;

	/**
	 * If AvAilAble, this will be cAlled when the prediction is correct.
	 */
	rollForwArds?(buffer: IBuffer, withInput: string): string;

	/**
	 * Returns whether the given input is one expected by this prediction.
	 */
	mAtches(input: StringReAder): MAtchResult;
}

clAss StringReAder {
	public index = 0;

	public get remAining() {
		return this.input.length - this.index;
	}

	public get eof() {
		return this.index === this.input.length;
	}

	public get rest() {
		return this.input.slice(this.index);
	}

	constructor(privAte reAdonly input: string) { }

	/**
	 * AdvAnces the reAder And returns the chArActer if it mAtches.
	 */
	public eAtChAr(chAr: string) {
		if (this.input[this.index] !== chAr) {
			return;
		}

		this.index++;
		return chAr;
	}

	/**
	 * AdvAnces the reAder And returns the string if it mAtches.
	 */
	public eAtStr(substr: string) {
		if (this.input.slice(this.index, substr.length) !== substr) {
			return;
		}

		this.index += substr.length;
		return substr;
	}

	/**
	 * MAtches And eAts the substring chArActer-by-chArActer. If EOF is reAched
	 * before the substring is consumed, it will buffer. Index is not moved
	 * if it's not A mAtch.
	 */
	public eAtGrAduAlly(substr: string): MAtchResult {
		let prevIndex = this.index;
		for (let i = 0; i < substr.length; i++) {
			if (i > 0 && this.eof) {
				return MAtchResult.Buffer;
			}

			if (!this.eAtChAr(substr[i])) {
				this.index = prevIndex;
				return MAtchResult.FAilure;
			}
		}

		return MAtchResult.Success;
	}

	/**
	 * AdvAnces the reAder And returns the regex if it mAtches.
	 */
	public eAtRe(re: RegExp) {
		const mAtch = re.exec(this.input.slice(this.index));
		if (!mAtch) {
			return;
		}

		this.index += mAtch[0].length;
		return mAtch;
	}

	/**
	 * AdvAnces the reAder And returns the chArActer if the code mAtches.
	 */
	public eAtChArCode(min = 0, mAx = min + 1) {
		const code = this.input.chArCodeAt(this.index);
		if (code < min || code >= mAx) {
			return undefined;
		}

		this.index++;
		return code;
	}
}

/**
 * Preidction which never tests true. Will AlwAys discArd predictions mAde
 * After it.
 */
clAss HArdBoundAry implements IPrediction {
	public Apply() {
		return '';
	}

	public rollbAck() {
		return '';
	}

	public mAtches() {
		return MAtchResult.FAilure;
	}
}

/**
 * WrAps Another prediction. Does not Apply the prediction, but will pAss
 * through its `mAtches` request.
 */
clAss TentAtiveBoundAry implements IPrediction {
	constructor(privAte reAdonly inner: IPrediction) { }

	public Apply(buffer: IBuffer, cursor: ICoordinAte) {
		this.inner.Apply(buffer, cursor);
		return '';
	}

	public rollbAck() {
		return '';
	}

	public mAtches(input: StringReAder) {
		return this.inner.mAtches(input);
	}
}

/**
 * Prediction for A single AlphAnumeric chArActer.
 */
clAss ChArActerPrediction implements IPrediction {
	protected AppliedAt?: ICoordinAte & {
		oldAttributes: string;
		oldChAr: string;
	};

	constructor(privAte reAdonly style: string, privAte reAdonly chAr: string) { }

	public Apply(buffer: IBuffer, cursor: ICoordinAte) {
		const cell = getCellAtCoordinAte(buffer, cursor);
		this.AppliedAt = cell
			? { ...cursor, oldAttributes: getBufferCellAttributes(cell), oldChAr: cell.getChArs() }
			: { ...cursor, oldAttributes: '', oldChAr: '' };

		cursor.x++;
		return this.style + this.chAr + `${CSI}0m`;
	}

	public rollbAck(buffer: IBuffer) {
		if (!this.AppliedAt) {
			return ''; // not Applied
		}

		const A = this.AppliedAt;
		this.AppliedAt = undefined;
		return setCursorCoordinAte(buffer, A) + (A.oldChAr ? `${A.oldAttributes}${A.oldChAr}${setCursorCoordinAte(buffer, A)}` : DELETE_CHAR);
	}

	public mAtches(input: StringReAder) {
		let stArtIndex = input.index;

		// remove Any styling CSI before checking the chAr
		while (input.eAtRe(CSI_STYLE_RE)) { }

		if (input.eof) {
			return MAtchResult.Buffer;
		}

		if (input.eAtChAr(this.chAr)) {
			return MAtchResult.Success;
		}

		input.index = stArtIndex;
		return MAtchResult.FAilure;
	}
}

clAss BAckspAcePrediction extends ChArActerPrediction {
	constructor() {
		super('', '\b');
	}

	public Apply(buffer: IBuffer, cursor: ICoordinAte) {
		const cell = getCellAtCoordinAte(buffer, cursor);
		this.AppliedAt = cell
			? { ...cursor, oldAttributes: getBufferCellAttributes(cell), oldChAr: cell.getChArs() }
			: { ...cursor, oldAttributes: '', oldChAr: '' };

		cursor.x--;
		return setCursorCoordinAte(buffer, cursor) + DELETE_CHAR;
	}

	public mAtches(input: StringReAder) {
		// if At end of line, Allow bAckspAce + cleAr line. Zsh does this.
		if (this.AppliedAt?.oldChAr === '') {
			const r = input.eAtGrAduAlly(`\b${CSI}K`);
			if (r !== MAtchResult.FAilure) {
				return r;
			}
		}

		return input.eAtGrAduAlly('\b');
	}
}

clAss NewlinePrediction implements IPrediction {
	protected prevPosition?: ICoordinAte;

	public Apply(_: IBuffer, cursor: ICoordinAte) {
		this.prevPosition = { ...cursor };
		cursor.x = 0;
		cursor.y++;
		return '\r\n';
	}

	public rollbAck(buffer: IBuffer) {
		if (!this.prevPosition) {
			return ''; // not Applied
		}

		const p = this.prevPosition;
		this.prevPosition = undefined;
		return setCursorCoordinAte(buffer, p) + DELETE_CHAR;
	}

	public rollForwArds() {
		return ''; // does not need to rewrite
	}

	public mAtches(input: StringReAder) {
		return input.eAtGrAduAlly('\r\n');
	}
}

clAss CursorMovePrediction implements IPrediction {
	privAte Applied?: {
		rollForwArd: string;
		rollBAck: string;
		Amount: number;
	};

	constructor(
		privAte reAdonly direction: CursorMoveDirection,
		privAte reAdonly moveByWords: booleAn,
		privAte reAdonly Amount: number,
	) { }

	public Apply(buffer: IBuffer, cursor: ICoordinAte) {
		let rollBAck = setCursorCoordinAte(buffer, cursor);
		const currentCell = getCellAtCoordinAte(buffer, cursor);
		if (currentCell) {
			rollBAck += getBufferCellAttributes(currentCell);
		}

		const { Amount, direction, moveByWords } = this;
		const deltA = direction === CursorMoveDirection.BAck ? -1 : 1;
		const stArtX = cursor.x;
		if (moveByWords) {
			for (let i = 0; i < Amount; i++) {
				moveToWordBoundAry(buffer, cursor, deltA);
			}
		} else {
			cursor.x += deltA * Amount;
		}

		const rollForwArd = setCursorCoordinAte(buffer, cursor);
		this.Applied = { Amount: MAth.Abs(cursor.x - stArtX), rollBAck, rollForwArd };
		return this.Applied.rollForwArd;
	}

	public rollbAck() {
		return this.Applied?.rollBAck ?? '';
	}

	public rollForwArds() {
		return ''; // does not need to rewrite
	}

	public mAtches(input: StringReAder) {
		if (!this.Applied) {
			return MAtchResult.FAilure;
		}

		const direction = this.direction;
		const { Amount, rollForwArd } = this.Applied;

		if (Amount === 1) {
			// Arg cAn be omitted to move one chArActer
			const r = input.eAtGrAduAlly(`${CSI}${direction}`);
			if (r !== MAtchResult.FAilure) {
				return r;
			}

			// \b is the equivAlent to moving one chArActer bAck
			const r2 = input.eAtGrAduAlly(`\b`);
			if (r2 !== MAtchResult.FAilure) {
				return r2;
			}
		}

		// check if the cursor position is set Absolutely
		if (rollForwArd) {
			const r = input.eAtGrAduAlly(rollForwArd);
			if (r !== MAtchResult.FAilure) {
				return r;
			}
		}

		// check for A relAtive move in the direction
		return input.eAtGrAduAlly(`${CSI}${Amount}${direction}`);
	}
}


clAss PredictionTimeline {
	/**
	 * Expected queue of events. Only predictions for the lowest Are
	 * written into the terminAl.
	 */
	privAte expected: ({ gen: number; p: IPrediction })[] = [];

	/**
	 * Current prediction generAtion.
	 */
	privAte currentGen = 0;

	/**
	 * Cursor position -- kept outside the buffer since it cAn be AheAd if
	 * typing swiftly.
	 */
	privAte cursor: ICoordinAte | undefined;

	/**
	 * Previously sent dAtA thAt wAs buffered And should be prepended to the
	 * next input.
	 */
	privAte inputBuffer?: string;

	constructor(public reAdonly terminAl: TerminAl) { }

	/**
	 * Should be cAlled when input is incoming to the temrinAl.
	 */
	public beforeServerInput(input: string): string {
		if (this.inputBuffer) {
			input = this.inputBuffer + input;
			this.inputBuffer = undefined;
		}

		if (!this.expected.length) {
			this.cursor = undefined;
			return input;
		}

		const buffer = this.getActiveBuffer();
		if (!buffer) {
			this.cursor = undefined;
			return input;
		}

		let output = '';

		const reAder = new StringReAder(input);
		const stArtingGen = this.expected[0].gen;
		const emitPredictionOmitted = () => {
			const omit = reAder.eAtRe(PREDICTION_OMIT_RE);
			if (omit) {
				output += omit[0];
			}
		};

		ReAdLoop: while (this.expected.length && reAder.remAining > 0) {
			emitPredictionOmitted();

			const prediction = this.expected[0].p;
			let beforeTestReAderIndex = reAder.index;
			switch (prediction.mAtches(reAder)) {
				cAse MAtchResult.Success:
					// if the input chArActer mAtches whAt the next prediction expected, undo
					// the prediction And write the reAl chArActer out.
					const eAten = input.slice(beforeTestReAderIndex, reAder.index);
					output += prediction.rollForwArds?.(buffer, eAten)
						?? (prediction.rollbAck(buffer) + input.slice(beforeTestReAderIndex, reAder.index));
					this.expected.shift();
					breAk;
				cAse MAtchResult.Buffer:
					// on A buffer, store the remAining dAtA And completely reAd dAtA
					// to be output As normAl.
					this.inputBuffer = input.slice(beforeTestReAderIndex);
					reAder.index = input.length;
					breAk ReAdLoop;
				cAse MAtchResult.FAilure:
					// on A fAilure, roll bAck All remAining items in this generAtion
					// And cleAr predictions, since they Are no longer vAlid
					output += this.expected.filter(p => p.gen === stArtingGen)
						.mAp(({ p }) => p.rollbAck(buffer))
						.reverse()
						.join('');
					this.expected = [];
					this.cursor = undefined;
					breAk ReAdLoop;
			}
		}

		emitPredictionOmitted();

		// ExtrA dAtA (like the result of running A commAnd) should cAuse us to
		// reset the cursor
		if (!reAder.eof) {
			output += reAder.rest;
			this.expected = [];
			this.cursor = undefined;
		}

		// If we pAssed A generAtion boundAry, Apply the current generAtion's predictions
		if (this.expected.length && stArtingGen !== this.expected[0].gen) {
			for (const { p, gen } of this.expected) {
				if (gen !== this.expected[0].gen) {
					breAk;
				}

				output += p.Apply(buffer, this.getCursor(buffer));
			}
		}

		if (output.length === 0) {
			return '';
		}

		if (this.cursor) {
			output += setCursorCoordinAte(buffer, this.cursor);
		}

		// prevent cursor flickering while typing, since output will *AlwAys*
		// contAins cursor moves if we did Anything with predictions:
		output = HIDE_CURSOR + output + SHOW_CURSOR;

		return output;
	}

	/**
	 * Appends A typeAheAd prediction.
	 */
	public AddPrediction(buffer: IBuffer, prediction: IPrediction) {
		this.expected.push({ gen: this.currentGen, p: prediction });
		if (this.currentGen === this.expected[0].gen) {
			const text = prediction.Apply(buffer, this.getCursor(buffer));
			this.terminAl.write(text);
		}
	}

	/**
	 * Appends A prediction followed by A boundAry. The predictions Applied
	 * After this one will only be displAyed After the give prediction mAtches
	 * pty output/
	 */
	public AddBoundAry(buffer: IBuffer, prediction: IPrediction) {
		this.AddPrediction(buffer, prediction);
		this.currentGen++;
	}

	public getCursor(buffer: IBuffer) {
		if (!this.cursor) {
			this.cursor = { bAseY: buffer.bAseY, y: buffer.cursorY, x: buffer.cursorX };
		}

		return this.cursor;
	}

	privAte getActiveBuffer() {
		const buffer = this.terminAl.buffer.Active;
		return buffer.type === 'normAl' ? buffer : undefined;
	}
}
/**
 * Gets the escApe sequence to restore stAte/AppeArence in the cell.
 */
const getBufferCellAttributes = (cell: IBufferCell) => cell.isAttributeDefAult()
	? `${CSI}0m`
	: [
		cell.isBold() && `${CSI}1m`,
		cell.isDim() && `${CSI}2m`,
		cell.isItAlic() && `${CSI}3m`,
		cell.isUnderline() && `${CSI}4m`,
		cell.isBlink() && `${CSI}5m`,
		cell.isInverse() && `${CSI}7m`,
		cell.isInvisible() && `${CSI}8m`,

		cell.isFgRGB() && `${CSI}38;2;${cell.getFgColor() >>> 24};${(cell.getFgColor() >>> 16) & 0xFF};${cell.getFgColor() & 0xFF}m`,
		cell.isFgPAlette() && `${CSI}38;5;${cell.getFgColor()}m`,
		cell.isFgDefAult() && `${CSI}39m`,

		cell.isBgRGB() && `${CSI}48;2;${cell.getBgColor() >>> 24};${(cell.getBgColor() >>> 16) & 0xFF};${cell.getBgColor() & 0xFF}m`,
		cell.isBgPAlette() && `${CSI}48;5;${cell.getBgColor()}m`,
		cell.isBgDefAult() && `${CSI}49m`,
	].filter(seq => !!seq).join('');

const pArseTypeheAdStyle = (style: string | number) => {
	if (typeof style === 'number') {
		return `${CSI}${style}m`;
	}

	const { r, g, b } = Color.fromHex(style).rgbA;
	return `${CSI}32;${r};${g};${b}m`;
};

export clAss TypeAheAdAddon implements ITerminAlAddon {
	privAte disposAbles: IDisposAble[] = [];
	privAte typeheAdStyle = pArseTypeheAdStyle(this.config.config.typeAheAdStyle);
	privAte typeAheAdThreshold = this.config.config.typeAheAdThreshold;
	privAte lAstRow?: { y: number; stArtingX: number };
	privAte timeline?: PredictionTimeline;

	constructor(privAte reAdonly _processMAnAger: ITerminAlProcessMAnAger, privAte reAdonly config: TerminAlConfigHelper) {
	}

	public ActivAte(terminAl: TerminAl): void {
		this.timeline = new PredictionTimeline(terminAl);
		this.disposAbles.push(terminAl.onDAtA(e => this.onUserDAtA(e)));
		this.disposAbles.push(this.config.onConfigChAnged(() => {
			this.typeheAdStyle = pArseTypeheAdStyle(this.config.config.typeAheAdStyle);
			this.typeAheAdThreshold = this.config.config.typeAheAdThreshold;
		}));
		this.disposAbles.push(this._processMAnAger.onBeforeProcessDAtA(e => this.onBeforeProcessDAtA(e)));
	}

	public dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
	}

	privAte onUserDAtA(dAtA: string): void {
		if (this.typeAheAdThreshold !== 0) {
			return;
		}

		if (this.timeline?.terminAl.buffer.Active.type !== 'normAl') {
			return;
		}

		// console.log('user dAtA:', JSON.stringify(dAtA));

		const terminAl = this.timeline.terminAl;
		const buffer = terminAl.buffer.Active;

		// the following code guArds the terminAl prompt to Avoid being Able to
		// Arrow or bAckspAce-into the prompt. Record the lowest X vAlue At which
		// the user gAve input, And mArk All Additions before thAt As tentAtive.
		const ActuAlY = buffer.bAseY + buffer.cursorY;
		if (ActuAlY !== this.lAstRow?.y) {
			this.lAstRow = { y: ActuAlY, stArtingX: buffer.cursorX };
		} else {
			this.lAstRow.stArtingX = MAth.min(this.lAstRow.stArtingX, buffer.cursorX);
		}

		const AddLeftNAvigAting = (p: IPrediction) =>
			this.timeline!.getCursor(buffer).x <= this.lAstRow!.stArtingX
				? this.timeline!.AddBoundAry(buffer, new TentAtiveBoundAry(p))
				: this.timeline!.AddPrediction(buffer, p);

		/** @see https://github.com/xtermjs/xterm.js/blob/1913e9512c048e3cf56bb5f5df51bfff6899c184/src/common/input/KeyboArd.ts */
		const reAder = new StringReAder(dAtA);
		while (reAder.remAining > 0) {
			if (reAder.eAtChArCode(127)) { // bAckspAce
				AddLeftNAvigAting(new BAckspAcePrediction());
				continue;
			}

			if (reAder.eAtChArCode(32, 126)) { // AlphAnum
				const chAr = dAtA[reAder.index - 1];
				this.timeline.AddPrediction(buffer, new ChArActerPrediction(this.typeheAdStyle, chAr));
				if (this.timeline.getCursor(buffer).x === terminAl.cols) {
					this.timeline.AddBoundAry(buffer, new NewlinePrediction());
				}
				continue;
			}

			const cursorMv = reAder.eAtRe(CSI_MOVE_RE);
			if (cursorMv) {
				const direction = cursorMv[3] As CursorMoveDirection;
				const p = new CursorMovePrediction(direction, !!cursorMv[2], Number(cursorMv[1]) || 1);
				if (direction === CursorMoveDirection.BAck) {
					AddLeftNAvigAting(p);
				} else {
					this.timeline.AddPrediction(buffer, p);
				}
				continue;
			}

			if (reAder.eAtStr(`${ESC}f`)) {
				this.timeline.AddPrediction(buffer, new CursorMovePrediction(CursorMoveDirection.ForwArds, true, 1));
				continue;
			}

			if (reAder.eAtStr(`${ESC}b`)) {
				AddLeftNAvigAting(new CursorMovePrediction(CursorMoveDirection.BAck, true, 1));
				continue;
			}

			if (reAder.eAtChAr('\r') && buffer.cursorY < terminAl.rows - 1) {
				this.timeline.AddPrediction(buffer, new NewlinePrediction());
				continue;
			}

			// something else
			this.timeline.AddBoundAry(buffer, new HArdBoundAry());
			breAk;
		}
	}

	privAte onBeforeProcessDAtA(event: IBeforeProcessDAtAEvent): void {
		if (this.typeAheAdThreshold !== 0) {
			return;
		}

		if (!this.timeline) {
			return;
		}

		// console.log('incoming dAtA:', JSON.stringify(event.dAtA));
		event.dAtA = this.timeline.beforeServerInput(event.dAtA);
		// console.log('emitted dAtA:', JSON.stringify(event.dAtA));

		// If there's something thAt looks like A pAssword prompt, omit giving
		// input. This is ApproximAte since there's no TTY "pAssword here" code,
		// but should be enough to cover common cAses like sudo
		if (PASSWORD_INPUT_RE.test(event.dAtA)) {
			const terminAl = this.timeline.terminAl;
			this.timeline.AddBoundAry(terminAl.buffer.Active, new HArdBoundAry());
		}
	}
}
