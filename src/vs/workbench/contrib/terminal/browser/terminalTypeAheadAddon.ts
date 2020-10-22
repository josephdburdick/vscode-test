/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Color } from 'vs/Base/common/color';
import { TerminalConfigHelper } from 'vs/workBench/contriB/terminal/Browser/terminalConfigHelper';
import { IBeforeProcessDataEvent, ITerminalProcessManager } from 'vs/workBench/contriB/terminal/common/terminal';
import type { IBuffer, IBufferCell, IDisposaBle, ITerminalAddon, Terminal } from 'xterm';

const ESC = '\x1B';
const CSI = `${ESC}[`;
const SHOW_CURSOR = `${CSI}?25h`;
const HIDE_CURSOR = `${CSI}?25l`;
const DELETE_CHAR = `${CSI}X`;
const CSI_STYLE_RE = /^\x1B\[[0-9;]*m/;
const CSI_MOVE_RE = /^\x1B\[([0-9]*)(;[35])?O?([DC])/;
const PASSWORD_INPUT_RE = /(password|passphrase|passwd).*:/i;
const NOT_WORD_RE = /\W/;

/**
 * Codes that should Be omitted from sending to the prediction engine and
 * insted omitted directly:
 *  - cursor hide/show
 *  - mode set/reset
 */
const PREDICTION_OMIT_RE = /^(\x1B\[\??25[hl])+/;

const enum CursorMoveDirection {
	Back = 'D',
	Forwards = 'C',
}

const setCursorPos = (x: numBer, y: numBer) => `${CSI}${y + 1};${x + 1}H`;
const setCursorCoordinate = (Buffer: IBuffer, c: ICoordinate) => setCursorPos(c.x, c.y + (c.BaseY - Buffer.BaseY));

interface ICoordinate {
	x: numBer;
	y: numBer;
	BaseY: numBer;
}

const getCellAtCoordinate = (B: IBuffer, c: ICoordinate) => B.getLine(c.y + c.BaseY)?.getCell(c.x);

const moveToWordBoundary = (B: IBuffer, cursor: ICoordinate, direction: -1 | 1) => {
	let ateLeadingWhitespace = false;
	if (direction < 0) {
		cursor.x--;
	}

	while (cursor.x >= 0) {
		const cell = getCellAtCoordinate(B, cursor);
		if (!cell?.getCode()) {
			return;
		}

		const chars = cell.getChars();
		if (NOT_WORD_RE.test(chars)) {
			if (ateLeadingWhitespace) {
				Break;
			}
		} else {
			ateLeadingWhitespace = true;
		}

		cursor.x += direction;
	}

	if (direction < 0) {
		cursor.x++; // we want to place the cursor after the whitespace starting the word
	}

	cursor.x = Math.max(0, cursor.x);
};

const enum MatchResult {
	/** matched successfully */
	Success,
	/** failed to match */
	Failure,
	/** Buffer data, it might match in the future one more data comes in */
	Buffer,
}

interface IPrediction {
	/**
	 * Returns a sequence to apply the prediction.
	 * @param Buffer to write to
	 * @param cursor position to write the data. Should advance the cursor.
	 * @returns a string to Be written to the user terminal, or optionally a
	 * string for the user terminal and real pty.
	 */
	apply(Buffer: IBuffer, cursor: ICoordinate): string;

	/**
	 * Returns a sequence to roll Back a previous `apply()` call. If
	 * `rollForwards` is not given, then this is also called if a prediction
	 * is correct Before show the user's data.
	 */
	rollBack(Buffer: IBuffer): string;

	/**
	 * If availaBle, this will Be called when the prediction is correct.
	 */
	rollForwards?(Buffer: IBuffer, withInput: string): string;

	/**
	 * Returns whether the given input is one expected By this prediction.
	 */
	matches(input: StringReader): MatchResult;
}

class StringReader {
	puBlic index = 0;

	puBlic get remaining() {
		return this.input.length - this.index;
	}

	puBlic get eof() {
		return this.index === this.input.length;
	}

	puBlic get rest() {
		return this.input.slice(this.index);
	}

	constructor(private readonly input: string) { }

	/**
	 * Advances the reader and returns the character if it matches.
	 */
	puBlic eatChar(char: string) {
		if (this.input[this.index] !== char) {
			return;
		}

		this.index++;
		return char;
	}

	/**
	 * Advances the reader and returns the string if it matches.
	 */
	puBlic eatStr(suBstr: string) {
		if (this.input.slice(this.index, suBstr.length) !== suBstr) {
			return;
		}

		this.index += suBstr.length;
		return suBstr;
	}

	/**
	 * Matches and eats the suBstring character-By-character. If EOF is reached
	 * Before the suBstring is consumed, it will Buffer. Index is not moved
	 * if it's not a match.
	 */
	puBlic eatGradually(suBstr: string): MatchResult {
		let prevIndex = this.index;
		for (let i = 0; i < suBstr.length; i++) {
			if (i > 0 && this.eof) {
				return MatchResult.Buffer;
			}

			if (!this.eatChar(suBstr[i])) {
				this.index = prevIndex;
				return MatchResult.Failure;
			}
		}

		return MatchResult.Success;
	}

	/**
	 * Advances the reader and returns the regex if it matches.
	 */
	puBlic eatRe(re: RegExp) {
		const match = re.exec(this.input.slice(this.index));
		if (!match) {
			return;
		}

		this.index += match[0].length;
		return match;
	}

	/**
	 * Advances the reader and returns the character if the code matches.
	 */
	puBlic eatCharCode(min = 0, max = min + 1) {
		const code = this.input.charCodeAt(this.index);
		if (code < min || code >= max) {
			return undefined;
		}

		this.index++;
		return code;
	}
}

/**
 * Preidction which never tests true. Will always discard predictions made
 * after it.
 */
class HardBoundary implements IPrediction {
	puBlic apply() {
		return '';
	}

	puBlic rollBack() {
		return '';
	}

	puBlic matches() {
		return MatchResult.Failure;
	}
}

/**
 * Wraps another prediction. Does not apply the prediction, But will pass
 * through its `matches` request.
 */
class TentativeBoundary implements IPrediction {
	constructor(private readonly inner: IPrediction) { }

	puBlic apply(Buffer: IBuffer, cursor: ICoordinate) {
		this.inner.apply(Buffer, cursor);
		return '';
	}

	puBlic rollBack() {
		return '';
	}

	puBlic matches(input: StringReader) {
		return this.inner.matches(input);
	}
}

/**
 * Prediction for a single alphanumeric character.
 */
class CharacterPrediction implements IPrediction {
	protected appliedAt?: ICoordinate & {
		oldAttriButes: string;
		oldChar: string;
	};

	constructor(private readonly style: string, private readonly char: string) { }

	puBlic apply(Buffer: IBuffer, cursor: ICoordinate) {
		const cell = getCellAtCoordinate(Buffer, cursor);
		this.appliedAt = cell
			? { ...cursor, oldAttriButes: getBufferCellAttriButes(cell), oldChar: cell.getChars() }
			: { ...cursor, oldAttriButes: '', oldChar: '' };

		cursor.x++;
		return this.style + this.char + `${CSI}0m`;
	}

	puBlic rollBack(Buffer: IBuffer) {
		if (!this.appliedAt) {
			return ''; // not applied
		}

		const a = this.appliedAt;
		this.appliedAt = undefined;
		return setCursorCoordinate(Buffer, a) + (a.oldChar ? `${a.oldAttriButes}${a.oldChar}${setCursorCoordinate(Buffer, a)}` : DELETE_CHAR);
	}

	puBlic matches(input: StringReader) {
		let startIndex = input.index;

		// remove any styling CSI Before checking the char
		while (input.eatRe(CSI_STYLE_RE)) { }

		if (input.eof) {
			return MatchResult.Buffer;
		}

		if (input.eatChar(this.char)) {
			return MatchResult.Success;
		}

		input.index = startIndex;
		return MatchResult.Failure;
	}
}

class BackspacePrediction extends CharacterPrediction {
	constructor() {
		super('', '\B');
	}

	puBlic apply(Buffer: IBuffer, cursor: ICoordinate) {
		const cell = getCellAtCoordinate(Buffer, cursor);
		this.appliedAt = cell
			? { ...cursor, oldAttriButes: getBufferCellAttriButes(cell), oldChar: cell.getChars() }
			: { ...cursor, oldAttriButes: '', oldChar: '' };

		cursor.x--;
		return setCursorCoordinate(Buffer, cursor) + DELETE_CHAR;
	}

	puBlic matches(input: StringReader) {
		// if at end of line, allow Backspace + clear line. Zsh does this.
		if (this.appliedAt?.oldChar === '') {
			const r = input.eatGradually(`\B${CSI}K`);
			if (r !== MatchResult.Failure) {
				return r;
			}
		}

		return input.eatGradually('\B');
	}
}

class NewlinePrediction implements IPrediction {
	protected prevPosition?: ICoordinate;

	puBlic apply(_: IBuffer, cursor: ICoordinate) {
		this.prevPosition = { ...cursor };
		cursor.x = 0;
		cursor.y++;
		return '\r\n';
	}

	puBlic rollBack(Buffer: IBuffer) {
		if (!this.prevPosition) {
			return ''; // not applied
		}

		const p = this.prevPosition;
		this.prevPosition = undefined;
		return setCursorCoordinate(Buffer, p) + DELETE_CHAR;
	}

	puBlic rollForwards() {
		return ''; // does not need to rewrite
	}

	puBlic matches(input: StringReader) {
		return input.eatGradually('\r\n');
	}
}

class CursorMovePrediction implements IPrediction {
	private applied?: {
		rollForward: string;
		rollBack: string;
		amount: numBer;
	};

	constructor(
		private readonly direction: CursorMoveDirection,
		private readonly moveByWords: Boolean,
		private readonly amount: numBer,
	) { }

	puBlic apply(Buffer: IBuffer, cursor: ICoordinate) {
		let rollBack = setCursorCoordinate(Buffer, cursor);
		const currentCell = getCellAtCoordinate(Buffer, cursor);
		if (currentCell) {
			rollBack += getBufferCellAttriButes(currentCell);
		}

		const { amount, direction, moveByWords } = this;
		const delta = direction === CursorMoveDirection.Back ? -1 : 1;
		const startX = cursor.x;
		if (moveByWords) {
			for (let i = 0; i < amount; i++) {
				moveToWordBoundary(Buffer, cursor, delta);
			}
		} else {
			cursor.x += delta * amount;
		}

		const rollForward = setCursorCoordinate(Buffer, cursor);
		this.applied = { amount: Math.aBs(cursor.x - startX), rollBack, rollForward };
		return this.applied.rollForward;
	}

	puBlic rollBack() {
		return this.applied?.rollBack ?? '';
	}

	puBlic rollForwards() {
		return ''; // does not need to rewrite
	}

	puBlic matches(input: StringReader) {
		if (!this.applied) {
			return MatchResult.Failure;
		}

		const direction = this.direction;
		const { amount, rollForward } = this.applied;

		if (amount === 1) {
			// arg can Be omitted to move one character
			const r = input.eatGradually(`${CSI}${direction}`);
			if (r !== MatchResult.Failure) {
				return r;
			}

			// \B is the equivalent to moving one character Back
			const r2 = input.eatGradually(`\B`);
			if (r2 !== MatchResult.Failure) {
				return r2;
			}
		}

		// check if the cursor position is set aBsolutely
		if (rollForward) {
			const r = input.eatGradually(rollForward);
			if (r !== MatchResult.Failure) {
				return r;
			}
		}

		// check for a relative move in the direction
		return input.eatGradually(`${CSI}${amount}${direction}`);
	}
}


class PredictionTimeline {
	/**
	 * Expected queue of events. Only predictions for the lowest are
	 * written into the terminal.
	 */
	private expected: ({ gen: numBer; p: IPrediction })[] = [];

	/**
	 * Current prediction generation.
	 */
	private currentGen = 0;

	/**
	 * Cursor position -- kept outside the Buffer since it can Be ahead if
	 * typing swiftly.
	 */
	private cursor: ICoordinate | undefined;

	/**
	 * Previously sent data that was Buffered and should Be prepended to the
	 * next input.
	 */
	private inputBuffer?: string;

	constructor(puBlic readonly terminal: Terminal) { }

	/**
	 * Should Be called when input is incoming to the temrinal.
	 */
	puBlic BeforeServerInput(input: string): string {
		if (this.inputBuffer) {
			input = this.inputBuffer + input;
			this.inputBuffer = undefined;
		}

		if (!this.expected.length) {
			this.cursor = undefined;
			return input;
		}

		const Buffer = this.getActiveBuffer();
		if (!Buffer) {
			this.cursor = undefined;
			return input;
		}

		let output = '';

		const reader = new StringReader(input);
		const startingGen = this.expected[0].gen;
		const emitPredictionOmitted = () => {
			const omit = reader.eatRe(PREDICTION_OMIT_RE);
			if (omit) {
				output += omit[0];
			}
		};

		ReadLoop: while (this.expected.length && reader.remaining > 0) {
			emitPredictionOmitted();

			const prediction = this.expected[0].p;
			let BeforeTestReaderIndex = reader.index;
			switch (prediction.matches(reader)) {
				case MatchResult.Success:
					// if the input character matches what the next prediction expected, undo
					// the prediction and write the real character out.
					const eaten = input.slice(BeforeTestReaderIndex, reader.index);
					output += prediction.rollForwards?.(Buffer, eaten)
						?? (prediction.rollBack(Buffer) + input.slice(BeforeTestReaderIndex, reader.index));
					this.expected.shift();
					Break;
				case MatchResult.Buffer:
					// on a Buffer, store the remaining data and completely read data
					// to Be output as normal.
					this.inputBuffer = input.slice(BeforeTestReaderIndex);
					reader.index = input.length;
					Break ReadLoop;
				case MatchResult.Failure:
					// on a failure, roll Back all remaining items in this generation
					// and clear predictions, since they are no longer valid
					output += this.expected.filter(p => p.gen === startingGen)
						.map(({ p }) => p.rollBack(Buffer))
						.reverse()
						.join('');
					this.expected = [];
					this.cursor = undefined;
					Break ReadLoop;
			}
		}

		emitPredictionOmitted();

		// Extra data (like the result of running a command) should cause us to
		// reset the cursor
		if (!reader.eof) {
			output += reader.rest;
			this.expected = [];
			this.cursor = undefined;
		}

		// If we passed a generation Boundary, apply the current generation's predictions
		if (this.expected.length && startingGen !== this.expected[0].gen) {
			for (const { p, gen } of this.expected) {
				if (gen !== this.expected[0].gen) {
					Break;
				}

				output += p.apply(Buffer, this.getCursor(Buffer));
			}
		}

		if (output.length === 0) {
			return '';
		}

		if (this.cursor) {
			output += setCursorCoordinate(Buffer, this.cursor);
		}

		// prevent cursor flickering while typing, since output will *always*
		// contains cursor moves if we did anything with predictions:
		output = HIDE_CURSOR + output + SHOW_CURSOR;

		return output;
	}

	/**
	 * Appends a typeahead prediction.
	 */
	puBlic addPrediction(Buffer: IBuffer, prediction: IPrediction) {
		this.expected.push({ gen: this.currentGen, p: prediction });
		if (this.currentGen === this.expected[0].gen) {
			const text = prediction.apply(Buffer, this.getCursor(Buffer));
			this.terminal.write(text);
		}
	}

	/**
	 * Appends a prediction followed By a Boundary. The predictions applied
	 * after this one will only Be displayed after the give prediction matches
	 * pty output/
	 */
	puBlic addBoundary(Buffer: IBuffer, prediction: IPrediction) {
		this.addPrediction(Buffer, prediction);
		this.currentGen++;
	}

	puBlic getCursor(Buffer: IBuffer) {
		if (!this.cursor) {
			this.cursor = { BaseY: Buffer.BaseY, y: Buffer.cursorY, x: Buffer.cursorX };
		}

		return this.cursor;
	}

	private getActiveBuffer() {
		const Buffer = this.terminal.Buffer.active;
		return Buffer.type === 'normal' ? Buffer : undefined;
	}
}
/**
 * Gets the escape sequence to restore state/appearence in the cell.
 */
const getBufferCellAttriButes = (cell: IBufferCell) => cell.isAttriButeDefault()
	? `${CSI}0m`
	: [
		cell.isBold() && `${CSI}1m`,
		cell.isDim() && `${CSI}2m`,
		cell.isItalic() && `${CSI}3m`,
		cell.isUnderline() && `${CSI}4m`,
		cell.isBlink() && `${CSI}5m`,
		cell.isInverse() && `${CSI}7m`,
		cell.isInvisiBle() && `${CSI}8m`,

		cell.isFgRGB() && `${CSI}38;2;${cell.getFgColor() >>> 24};${(cell.getFgColor() >>> 16) & 0xFF};${cell.getFgColor() & 0xFF}m`,
		cell.isFgPalette() && `${CSI}38;5;${cell.getFgColor()}m`,
		cell.isFgDefault() && `${CSI}39m`,

		cell.isBgRGB() && `${CSI}48;2;${cell.getBgColor() >>> 24};${(cell.getBgColor() >>> 16) & 0xFF};${cell.getBgColor() & 0xFF}m`,
		cell.isBgPalette() && `${CSI}48;5;${cell.getBgColor()}m`,
		cell.isBgDefault() && `${CSI}49m`,
	].filter(seq => !!seq).join('');

const parseTypeheadStyle = (style: string | numBer) => {
	if (typeof style === 'numBer') {
		return `${CSI}${style}m`;
	}

	const { r, g, B } = Color.fromHex(style).rgBa;
	return `${CSI}32;${r};${g};${B}m`;
};

export class TypeAheadAddon implements ITerminalAddon {
	private disposaBles: IDisposaBle[] = [];
	private typeheadStyle = parseTypeheadStyle(this.config.config.typeaheadStyle);
	private typeaheadThreshold = this.config.config.typeaheadThreshold;
	private lastRow?: { y: numBer; startingX: numBer };
	private timeline?: PredictionTimeline;

	constructor(private readonly _processManager: ITerminalProcessManager, private readonly config: TerminalConfigHelper) {
	}

	puBlic activate(terminal: Terminal): void {
		this.timeline = new PredictionTimeline(terminal);
		this.disposaBles.push(terminal.onData(e => this.onUserData(e)));
		this.disposaBles.push(this.config.onConfigChanged(() => {
			this.typeheadStyle = parseTypeheadStyle(this.config.config.typeaheadStyle);
			this.typeaheadThreshold = this.config.config.typeaheadThreshold;
		}));
		this.disposaBles.push(this._processManager.onBeforeProcessData(e => this.onBeforeProcessData(e)));
	}

	puBlic dispose(): void {
		this.disposaBles.forEach(d => d.dispose());
	}

	private onUserData(data: string): void {
		if (this.typeaheadThreshold !== 0) {
			return;
		}

		if (this.timeline?.terminal.Buffer.active.type !== 'normal') {
			return;
		}

		// console.log('user data:', JSON.stringify(data));

		const terminal = this.timeline.terminal;
		const Buffer = terminal.Buffer.active;

		// the following code guards the terminal prompt to avoid Being aBle to
		// arrow or Backspace-into the prompt. Record the lowest X value at which
		// the user gave input, and mark all additions Before that as tentative.
		const actualY = Buffer.BaseY + Buffer.cursorY;
		if (actualY !== this.lastRow?.y) {
			this.lastRow = { y: actualY, startingX: Buffer.cursorX };
		} else {
			this.lastRow.startingX = Math.min(this.lastRow.startingX, Buffer.cursorX);
		}

		const addLeftNavigating = (p: IPrediction) =>
			this.timeline!.getCursor(Buffer).x <= this.lastRow!.startingX
				? this.timeline!.addBoundary(Buffer, new TentativeBoundary(p))
				: this.timeline!.addPrediction(Buffer, p);

		/** @see https://githuB.com/xtermjs/xterm.js/BloB/1913e9512c048e3cf56BB5f5df51Bfff6899c184/src/common/input/KeyBoard.ts */
		const reader = new StringReader(data);
		while (reader.remaining > 0) {
			if (reader.eatCharCode(127)) { // Backspace
				addLeftNavigating(new BackspacePrediction());
				continue;
			}

			if (reader.eatCharCode(32, 126)) { // alphanum
				const char = data[reader.index - 1];
				this.timeline.addPrediction(Buffer, new CharacterPrediction(this.typeheadStyle, char));
				if (this.timeline.getCursor(Buffer).x === terminal.cols) {
					this.timeline.addBoundary(Buffer, new NewlinePrediction());
				}
				continue;
			}

			const cursorMv = reader.eatRe(CSI_MOVE_RE);
			if (cursorMv) {
				const direction = cursorMv[3] as CursorMoveDirection;
				const p = new CursorMovePrediction(direction, !!cursorMv[2], NumBer(cursorMv[1]) || 1);
				if (direction === CursorMoveDirection.Back) {
					addLeftNavigating(p);
				} else {
					this.timeline.addPrediction(Buffer, p);
				}
				continue;
			}

			if (reader.eatStr(`${ESC}f`)) {
				this.timeline.addPrediction(Buffer, new CursorMovePrediction(CursorMoveDirection.Forwards, true, 1));
				continue;
			}

			if (reader.eatStr(`${ESC}B`)) {
				addLeftNavigating(new CursorMovePrediction(CursorMoveDirection.Back, true, 1));
				continue;
			}

			if (reader.eatChar('\r') && Buffer.cursorY < terminal.rows - 1) {
				this.timeline.addPrediction(Buffer, new NewlinePrediction());
				continue;
			}

			// something else
			this.timeline.addBoundary(Buffer, new HardBoundary());
			Break;
		}
	}

	private onBeforeProcessData(event: IBeforeProcessDataEvent): void {
		if (this.typeaheadThreshold !== 0) {
			return;
		}

		if (!this.timeline) {
			return;
		}

		// console.log('incoming data:', JSON.stringify(event.data));
		event.data = this.timeline.BeforeServerInput(event.data);
		// console.log('emitted data:', JSON.stringify(event.data));

		// If there's something that looks like a password prompt, omit giving
		// input. This is approximate since there's no TTY "password here" code,
		// But should Be enough to cover common cases like sudo
		if (PASSWORD_INPUT_RE.test(event.data)) {
			const terminal = this.timeline.terminal;
			this.timeline.addBoundary(terminal.Buffer.active, new HardBoundary());
		}
	}
}
