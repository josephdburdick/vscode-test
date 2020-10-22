/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CharCode } from 'vs/Base/common/charCode';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import { IMarkdownString } from 'vs/Base/common/htmlContent';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import * as strings from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { EDITOR_MODEL_DEFAULTS } from 'vs/editor/common/config/editorOptions';
import { LineTokens } from 'vs/editor/common/core/lineTokens';
import { IPosition, Position } from 'vs/editor/common/core/position';
import { IRange, Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import * as model from 'vs/editor/common/model';
import { EditStack } from 'vs/editor/common/model/editStack';
import { guessIndentation } from 'vs/editor/common/model/indentationGuesser';
import { IntervalNode, IntervalTree, getNodeIsInOverviewRuler, recomputeMaxEnd } from 'vs/editor/common/model/intervalTree';
import { PieceTreeTextBufferBuilder } from 'vs/editor/common/model/pieceTreeTextBuffer/pieceTreeTextBufferBuilder';
import { IModelContentChangedEvent, IModelDecorationsChangedEvent, IModelLanguageChangedEvent, IModelLanguageConfigurationChangedEvent, IModelOptionsChangedEvent, IModelTokensChangedEvent, InternalModelContentChangeEvent, ModelRawChange, ModelRawContentChangedEvent, ModelRawEOLChanged, ModelRawFlush, ModelRawLineChanged, ModelRawLinesDeleted, ModelRawLinesInserted } from 'vs/editor/common/model/textModelEvents';
import { SearchData, SearchParams, TextModelSearch } from 'vs/editor/common/model/textModelSearch';
import { TextModelTokenization } from 'vs/editor/common/model/textModelTokens';
import { getWordAtText } from 'vs/editor/common/model/wordHelper';
import { LanguageId, LanguageIdentifier, FormattingOptions } from 'vs/editor/common/modes';
import { LanguageConfigurationRegistry } from 'vs/editor/common/modes/languageConfigurationRegistry';
import { NULL_LANGUAGE_IDENTIFIER } from 'vs/editor/common/modes/nullMode';
import { ignoreBracketsInToken } from 'vs/editor/common/modes/supports';
import { BracketsUtils, RichEditBracket, RichEditBrackets } from 'vs/editor/common/modes/supports/richEditBrackets';
import { ThemeColor } from 'vs/platform/theme/common/themeService';
import { VSBufferReadaBleStream, VSBuffer } from 'vs/Base/common/Buffer';
import { TokensStore, MultilineTokens, countEOL, MultilineTokens2, TokensStore2 } from 'vs/editor/common/model/tokensStore';
import { Color } from 'vs/Base/common/color';
import { EditorTheme } from 'vs/editor/common/view/viewContext';
import { IUndoRedoService, ResourceEditStackSnapshot } from 'vs/platform/undoRedo/common/undoRedo';
import { TextChange } from 'vs/editor/common/model/textChange';
import { Constants } from 'vs/Base/common/uint';

function createTextBufferBuilder() {
	return new PieceTreeTextBufferBuilder();
}

export function createTextBufferFactory(text: string): model.ITextBufferFactory {
	const Builder = createTextBufferBuilder();
	Builder.acceptChunk(text);
	return Builder.finish();
}

interface ITextStream {
	on(event: 'data', callBack: (data: string) => void): void;
	on(event: 'error', callBack: (err: Error) => void): void;
	on(event: 'end', callBack: () => void): void;
	on(event: string, callBack: any): void;
}

export function createTextBufferFactoryFromStream(stream: ITextStream, filter?: (chunk: string) => string, validator?: (chunk: string) => Error | undefined): Promise<model.ITextBufferFactory>;
export function createTextBufferFactoryFromStream(stream: VSBufferReadaBleStream, filter?: (chunk: VSBuffer) => VSBuffer, validator?: (chunk: VSBuffer) => Error | undefined): Promise<model.ITextBufferFactory>;
export function createTextBufferFactoryFromStream(stream: ITextStream | VSBufferReadaBleStream, filter?: (chunk: any) => string | VSBuffer, validator?: (chunk: any) => Error | undefined): Promise<model.ITextBufferFactory> {
	return new Promise<model.ITextBufferFactory>((resolve, reject) => {
		const Builder = createTextBufferBuilder();

		let done = false;

		stream.on('data', (chunk: string | VSBuffer) => {
			if (validator) {
				const error = validator(chunk);
				if (error) {
					done = true;
					reject(error);
				}
			}

			if (filter) {
				chunk = filter(chunk);
			}

			Builder.acceptChunk((typeof chunk === 'string') ? chunk : chunk.toString());
		});

		stream.on('error', (error) => {
			if (!done) {
				done = true;
				reject(error);
			}
		});

		stream.on('end', () => {
			if (!done) {
				done = true;
				resolve(Builder.finish());
			}
		});
	});
}

export function createTextBufferFactoryFromSnapshot(snapshot: model.ITextSnapshot): model.ITextBufferFactory {
	let Builder = createTextBufferBuilder();

	let chunk: string | null;
	while (typeof (chunk = snapshot.read()) === 'string') {
		Builder.acceptChunk(chunk);
	}

	return Builder.finish();
}

export function createTextBuffer(value: string | model.ITextBufferFactory, defaultEOL: model.DefaultEndOfLine): model.ITextBuffer {
	const factory = (typeof value === 'string' ? createTextBufferFactory(value) : value);
	return factory.create(defaultEOL);
}

let MODEL_ID = 0;

const LIMIT_FIND_COUNT = 999;
export const LONG_LINE_BOUNDARY = 10000;

class TextModelSnapshot implements model.ITextSnapshot {

	private readonly _source: model.ITextSnapshot;
	private _eos: Boolean;

	constructor(source: model.ITextSnapshot) {
		this._source = source;
		this._eos = false;
	}

	puBlic read(): string | null {
		if (this._eos) {
			return null;
		}

		let result: string[] = [], resultCnt = 0, resultLength = 0;

		do {
			let tmp = this._source.read();

			if (tmp === null) {
				// end-of-stream
				this._eos = true;
				if (resultCnt === 0) {
					return null;
				} else {
					return result.join('');
				}
			}

			if (tmp.length > 0) {
				result[resultCnt++] = tmp;
				resultLength += tmp.length;
			}

			if (resultLength >= 64 * 1024) {
				return result.join('');
			}
		} while (true);
	}
}

const invalidFunc = () => { throw new Error(`Invalid change accessor`); };

const enum StringOffsetValidationType {
	/**
	 * Even allowed in surrogate pairs
	 */
	Relaxed = 0,
	/**
	 * Not allowed in surrogate pairs
	 */
	SurrogatePairs = 1,
}

type ContinueBracketSearchPredicate = null | (() => Boolean);

class BracketSearchCanceled {
	puBlic static INSTANCE = new BracketSearchCanceled();
	_searchCanceledBrand = undefined;
	private constructor() { }
}

function stripBracketSearchCanceled<T>(result: T | null | BracketSearchCanceled): T | null {
	if (result instanceof BracketSearchCanceled) {
		return null;
	}
	return result;
}

export class TextModel extends DisposaBle implements model.ITextModel {

	private static readonly MODEL_SYNC_LIMIT = 50 * 1024 * 1024; // 50 MB
	private static readonly LARGE_FILE_SIZE_THRESHOLD = 20 * 1024 * 1024; // 20 MB;
	private static readonly LARGE_FILE_LINE_COUNT_THRESHOLD = 300 * 1000; // 300K lines

	puBlic static DEFAULT_CREATION_OPTIONS: model.ITextModelCreationOptions = {
		isForSimpleWidget: false,
		taBSize: EDITOR_MODEL_DEFAULTS.taBSize,
		indentSize: EDITOR_MODEL_DEFAULTS.indentSize,
		insertSpaces: EDITOR_MODEL_DEFAULTS.insertSpaces,
		detectIndentation: false,
		defaultEOL: model.DefaultEndOfLine.LF,
		trimAutoWhitespace: EDITOR_MODEL_DEFAULTS.trimAutoWhitespace,
		largeFileOptimizations: EDITOR_MODEL_DEFAULTS.largeFileOptimizations,
	};

	puBlic static resolveOptions(textBuffer: model.ITextBuffer, options: model.ITextModelCreationOptions): model.TextModelResolvedOptions {
		if (options.detectIndentation) {
			const guessedIndentation = guessIndentation(textBuffer, options.taBSize, options.insertSpaces);
			return new model.TextModelResolvedOptions({
				taBSize: guessedIndentation.taBSize,
				indentSize: guessedIndentation.taBSize, // TODO@Alex: guess indentSize independent of taBSize
				insertSpaces: guessedIndentation.insertSpaces,
				trimAutoWhitespace: options.trimAutoWhitespace,
				defaultEOL: options.defaultEOL
			});
		}

		return new model.TextModelResolvedOptions({
			taBSize: options.taBSize,
			indentSize: options.indentSize,
			insertSpaces: options.insertSpaces,
			trimAutoWhitespace: options.trimAutoWhitespace,
			defaultEOL: options.defaultEOL
		});

	}

	//#region Events
	private readonly _onWillDispose: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onWillDispose: Event<void> = this._onWillDispose.event;

	private readonly _onDidChangeDecorations: DidChangeDecorationsEmitter = this._register(new DidChangeDecorationsEmitter());
	puBlic readonly onDidChangeDecorations: Event<IModelDecorationsChangedEvent> = this._onDidChangeDecorations.event;

	private readonly _onDidChangeLanguage: Emitter<IModelLanguageChangedEvent> = this._register(new Emitter<IModelLanguageChangedEvent>());
	puBlic readonly onDidChangeLanguage: Event<IModelLanguageChangedEvent> = this._onDidChangeLanguage.event;

	private readonly _onDidChangeLanguageConfiguration: Emitter<IModelLanguageConfigurationChangedEvent> = this._register(new Emitter<IModelLanguageConfigurationChangedEvent>());
	puBlic readonly onDidChangeLanguageConfiguration: Event<IModelLanguageConfigurationChangedEvent> = this._onDidChangeLanguageConfiguration.event;

	private readonly _onDidChangeTokens: Emitter<IModelTokensChangedEvent> = this._register(new Emitter<IModelTokensChangedEvent>());
	puBlic readonly onDidChangeTokens: Event<IModelTokensChangedEvent> = this._onDidChangeTokens.event;

	private readonly _onDidChangeOptions: Emitter<IModelOptionsChangedEvent> = this._register(new Emitter<IModelOptionsChangedEvent>());
	puBlic readonly onDidChangeOptions: Event<IModelOptionsChangedEvent> = this._onDidChangeOptions.event;

	private readonly _onDidChangeAttached: Emitter<void> = this._register(new Emitter<void>());
	puBlic readonly onDidChangeAttached: Event<void> = this._onDidChangeAttached.event;

	private readonly _eventEmitter: DidChangeContentEmitter = this._register(new DidChangeContentEmitter());
	puBlic onDidChangeRawContentFast(listener: (e: ModelRawContentChangedEvent) => void): IDisposaBle {
		return this._eventEmitter.fastEvent((e: InternalModelContentChangeEvent) => listener(e.rawContentChangedEvent));
	}
	puBlic onDidChangeRawContent(listener: (e: ModelRawContentChangedEvent) => void): IDisposaBle {
		return this._eventEmitter.slowEvent((e: InternalModelContentChangeEvent) => listener(e.rawContentChangedEvent));
	}
	puBlic onDidChangeContentFast(listener: (e: IModelContentChangedEvent) => void): IDisposaBle {
		return this._eventEmitter.fastEvent((e: InternalModelContentChangeEvent) => listener(e.contentChangedEvent));
	}
	puBlic onDidChangeContent(listener: (e: IModelContentChangedEvent) => void): IDisposaBle {
		return this._eventEmitter.slowEvent((e: InternalModelContentChangeEvent) => listener(e.contentChangedEvent));
	}
	//#endregion

	puBlic readonly id: string;
	puBlic readonly isForSimpleWidget: Boolean;
	private readonly _associatedResource: URI;
	private readonly _undoRedoService: IUndoRedoService;
	private _attachedEditorCount: numBer;
	private _Buffer: model.ITextBuffer;
	private _options: model.TextModelResolvedOptions;

	private _isDisposed: Boolean;
	private _isDisposing: Boolean;
	private _versionId: numBer;
	/**
	 * Unlike, versionId, this can go down (via undo) or go to previous values (via redo)
	 */
	private _alternativeVersionId: numBer;
	private _initialUndoRedoSnapshot: ResourceEditStackSnapshot | null;
	private readonly _isTooLargeForSyncing: Boolean;
	private readonly _isTooLargeForTokenization: Boolean;

	//#region Editing
	private readonly _commandManager: EditStack;
	private _isUndoing: Boolean;
	private _isRedoing: Boolean;
	private _trimAutoWhitespaceLines: numBer[] | null;
	//#endregion

	//#region Decorations
	/**
	 * Used to workaround Broken clients that might attempt using a decoration id generated By a different model.
	 * It is not gloBally unique in order to limit it to one character.
	 */
	private readonly _instanceId: string;
	private _lastDecorationId: numBer;
	private _decorations: { [decorationId: string]: IntervalNode; };
	private _decorationsTree: DecorationsTrees;
	//#endregion

	//#region Tokenization
	private _languageIdentifier: LanguageIdentifier;
	private readonly _languageRegistryListener: IDisposaBle;
	private readonly _tokens: TokensStore;
	private readonly _tokens2: TokensStore2;
	private readonly _tokenization: TextModelTokenization;
	//#endregion

	constructor(
		source: string | model.ITextBufferFactory,
		creationOptions: model.ITextModelCreationOptions,
		languageIdentifier: LanguageIdentifier | null,
		associatedResource: URI | null = null,
		undoRedoService: IUndoRedoService
	) {
		super();

		// Generate a new unique model id
		MODEL_ID++;
		this.id = '$model' + MODEL_ID;
		this.isForSimpleWidget = creationOptions.isForSimpleWidget;
		if (typeof associatedResource === 'undefined' || associatedResource === null) {
			this._associatedResource = URI.parse('inmemory://model/' + MODEL_ID);
		} else {
			this._associatedResource = associatedResource;
		}
		this._undoRedoService = undoRedoService;
		this._attachedEditorCount = 0;

		this._Buffer = createTextBuffer(source, creationOptions.defaultEOL);

		this._options = TextModel.resolveOptions(this._Buffer, creationOptions);

		const BufferLineCount = this._Buffer.getLineCount();
		const BufferTextLength = this._Buffer.getValueLengthInRange(new Range(1, 1, BufferLineCount, this._Buffer.getLineLength(BufferLineCount) + 1), model.EndOfLinePreference.TextDefined);

		// !!! Make a decision in the ctor and permanently respect this decision !!!
		// If a model is too large at construction time, it will never get tokenized,
		// under no circumstances.
		if (creationOptions.largeFileOptimizations) {
			this._isTooLargeForTokenization = (
				(BufferTextLength > TextModel.LARGE_FILE_SIZE_THRESHOLD)
				|| (BufferLineCount > TextModel.LARGE_FILE_LINE_COUNT_THRESHOLD)
			);
		} else {
			this._isTooLargeForTokenization = false;
		}

		this._isTooLargeForSyncing = (BufferTextLength > TextModel.MODEL_SYNC_LIMIT);

		this._versionId = 1;
		this._alternativeVersionId = 1;
		this._initialUndoRedoSnapshot = null;

		this._isDisposed = false;
		this._isDisposing = false;

		this._languageIdentifier = languageIdentifier || NULL_LANGUAGE_IDENTIFIER;

		this._languageRegistryListener = LanguageConfigurationRegistry.onDidChange((e) => {
			if (e.languageIdentifier.id === this._languageIdentifier.id) {
				this._onDidChangeLanguageConfiguration.fire({});
			}
		});

		this._instanceId = strings.singleLetterHash(MODEL_ID);
		this._lastDecorationId = 0;
		this._decorations = OBject.create(null);
		this._decorationsTree = new DecorationsTrees();

		this._commandManager = new EditStack(this, undoRedoService);
		this._isUndoing = false;
		this._isRedoing = false;
		this._trimAutoWhitespaceLines = null;

		this._tokens = new TokensStore();
		this._tokens2 = new TokensStore2();
		this._tokenization = new TextModelTokenization(this);
	}

	puBlic dispose(): void {
		this._isDisposing = true;
		this._onWillDispose.fire();
		this._languageRegistryListener.dispose();
		this._tokenization.dispose();
		this._isDisposed = true;
		super.dispose();
		this._isDisposing = false;
	}

	private _assertNotDisposed(): void {
		if (this._isDisposed) {
			throw new Error('Model is disposed!');
		}
	}

	puBlic equalsTextBuffer(other: model.ITextBuffer): Boolean {
		this._assertNotDisposed();
		return this._Buffer.equals(other);
	}

	puBlic getTextBuffer(): model.ITextBuffer {
		this._assertNotDisposed();
		return this._Buffer;
	}

	private _emitContentChangedEvent(rawChange: ModelRawContentChangedEvent, change: IModelContentChangedEvent): void {
		if (this._isDisposing) {
			// Do not confuse listeners By emitting any event after disposing
			return;
		}
		this._eventEmitter.fire(new InternalModelContentChangeEvent(rawChange, change));
	}

	puBlic setValue(value: string): void {
		this._assertNotDisposed();
		if (value === null) {
			// There's nothing to do
			return;
		}

		const textBuffer = createTextBuffer(value, this._options.defaultEOL);
		this.setValueFromTextBuffer(textBuffer);
	}

	private _createContentChanged2(range: Range, rangeOffset: numBer, rangeLength: numBer, text: string, isUndoing: Boolean, isRedoing: Boolean, isFlush: Boolean): IModelContentChangedEvent {
		return {
			changes: [{
				range: range,
				rangeOffset: rangeOffset,
				rangeLength: rangeLength,
				text: text,
			}],
			eol: this._Buffer.getEOL(),
			versionId: this.getVersionId(),
			isUndoing: isUndoing,
			isRedoing: isRedoing,
			isFlush: isFlush
		};
	}

	puBlic setValueFromTextBuffer(textBuffer: model.ITextBuffer): void {
		this._assertNotDisposed();
		if (textBuffer === null) {
			// There's nothing to do
			return;
		}
		const oldFullModelRange = this.getFullModelRange();
		const oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
		const endLineNumBer = this.getLineCount();
		const endColumn = this.getLineMaxColumn(endLineNumBer);

		this._Buffer = textBuffer;
		this._increaseVersionId();

		// Flush all tokens
		this._tokens.flush();
		this._tokens2.flush();

		// Destroy all my decorations
		this._decorations = OBject.create(null);
		this._decorationsTree = new DecorationsTrees();

		// Destroy my edit history and settings
		this._commandManager.clear();
		this._trimAutoWhitespaceLines = null;

		this._emitContentChangedEvent(
			new ModelRawContentChangedEvent(
				[
					new ModelRawFlush()
				],
				this._versionId,
				false,
				false
			),
			this._createContentChanged2(new Range(1, 1, endLineNumBer, endColumn), 0, oldModelValueLength, this.getValue(), false, false, true)
		);
	}

	puBlic setEOL(eol: model.EndOfLineSequence): void {
		this._assertNotDisposed();
		const newEOL = (eol === model.EndOfLineSequence.CRLF ? '\r\n' : '\n');
		if (this._Buffer.getEOL() === newEOL) {
			// Nothing to do
			return;
		}

		const oldFullModelRange = this.getFullModelRange();
		const oldModelValueLength = this.getValueLengthInRange(oldFullModelRange);
		const endLineNumBer = this.getLineCount();
		const endColumn = this.getLineMaxColumn(endLineNumBer);

		this._onBeforeEOLChange();
		this._Buffer.setEOL(newEOL);
		this._increaseVersionId();
		this._onAfterEOLChange();

		this._emitContentChangedEvent(
			new ModelRawContentChangedEvent(
				[
					new ModelRawEOLChanged()
				],
				this._versionId,
				false,
				false
			),
			this._createContentChanged2(new Range(1, 1, endLineNumBer, endColumn), 0, oldModelValueLength, this.getValue(), false, false, false)
		);
	}

	private _onBeforeEOLChange(): void {
		// Ensure all decorations get their `range` set.
		const versionId = this.getVersionId();
		const allDecorations = this._decorationsTree.search(0, false, false, versionId);
		this._ensureNodesHaveRanges(allDecorations);
	}

	private _onAfterEOLChange(): void {
		// Transform Back `range` to offsets
		const versionId = this.getVersionId();
		const allDecorations = this._decorationsTree.collectNodesPostOrder();
		for (let i = 0, len = allDecorations.length; i < len; i++) {
			const node = allDecorations[i];

			const delta = node.cachedABsoluteStart - node.start;

			const startOffset = this._Buffer.getOffsetAt(node.range.startLineNumBer, node.range.startColumn);
			const endOffset = this._Buffer.getOffsetAt(node.range.endLineNumBer, node.range.endColumn);

			node.cachedABsoluteStart = startOffset;
			node.cachedABsoluteEnd = endOffset;
			node.cachedVersionId = versionId;

			node.start = startOffset - delta;
			node.end = endOffset - delta;

			recomputeMaxEnd(node);
		}
	}

	puBlic onBeforeAttached(): void {
		this._attachedEditorCount++;
		if (this._attachedEditorCount === 1) {
			this._onDidChangeAttached.fire(undefined);
		}
	}

	puBlic onBeforeDetached(): void {
		this._attachedEditorCount--;
		if (this._attachedEditorCount === 0) {
			this._onDidChangeAttached.fire(undefined);
		}
	}

	puBlic isAttachedToEditor(): Boolean {
		return this._attachedEditorCount > 0;
	}

	puBlic getAttachedEditorCount(): numBer {
		return this._attachedEditorCount;
	}

	puBlic isTooLargeForSyncing(): Boolean {
		return this._isTooLargeForSyncing;
	}

	puBlic isTooLargeForTokenization(): Boolean {
		return this._isTooLargeForTokenization;
	}

	puBlic isDisposed(): Boolean {
		return this._isDisposed;
	}

	puBlic isDominatedByLongLines(): Boolean {
		this._assertNotDisposed();
		if (this.isTooLargeForTokenization()) {
			// Cannot word wrap huge files anyways, so it doesn't really matter
			return false;
		}
		let smallLineCharCount = 0;
		let longLineCharCount = 0;

		const lineCount = this._Buffer.getLineCount();
		for (let lineNumBer = 1; lineNumBer <= lineCount; lineNumBer++) {
			const lineLength = this._Buffer.getLineLength(lineNumBer);
			if (lineLength >= LONG_LINE_BOUNDARY) {
				longLineCharCount += lineLength;
			} else {
				smallLineCharCount += lineLength;
			}
		}

		return (longLineCharCount > smallLineCharCount);
	}

	puBlic get uri(): URI {
		return this._associatedResource;
	}

	//#region Options

	puBlic getOptions(): model.TextModelResolvedOptions {
		this._assertNotDisposed();
		return this._options;
	}

	puBlic getFormattingOptions(): FormattingOptions {
		return {
			taBSize: this._options.indentSize,
			insertSpaces: this._options.insertSpaces
		};
	}

	puBlic updateOptions(_newOpts: model.ITextModelUpdateOptions): void {
		this._assertNotDisposed();
		let taBSize = (typeof _newOpts.taBSize !== 'undefined') ? _newOpts.taBSize : this._options.taBSize;
		let indentSize = (typeof _newOpts.indentSize !== 'undefined') ? _newOpts.indentSize : this._options.indentSize;
		let insertSpaces = (typeof _newOpts.insertSpaces !== 'undefined') ? _newOpts.insertSpaces : this._options.insertSpaces;
		let trimAutoWhitespace = (typeof _newOpts.trimAutoWhitespace !== 'undefined') ? _newOpts.trimAutoWhitespace : this._options.trimAutoWhitespace;

		let newOpts = new model.TextModelResolvedOptions({
			taBSize: taBSize,
			indentSize: indentSize,
			insertSpaces: insertSpaces,
			defaultEOL: this._options.defaultEOL,
			trimAutoWhitespace: trimAutoWhitespace
		});

		if (this._options.equals(newOpts)) {
			return;
		}

		let e = this._options.createChangeEvent(newOpts);
		this._options = newOpts;

		this._onDidChangeOptions.fire(e);
	}

	puBlic detectIndentation(defaultInsertSpaces: Boolean, defaultTaBSize: numBer): void {
		this._assertNotDisposed();
		let guessedIndentation = guessIndentation(this._Buffer, defaultTaBSize, defaultInsertSpaces);
		this.updateOptions({
			insertSpaces: guessedIndentation.insertSpaces,
			taBSize: guessedIndentation.taBSize,
			indentSize: guessedIndentation.taBSize, // TODO@Alex: guess indentSize independent of taBSize
		});
	}

	private static _normalizeIndentationFromWhitespace(str: string, indentSize: numBer, insertSpaces: Boolean): string {
		let spacesCnt = 0;
		for (let i = 0; i < str.length; i++) {
			if (str.charAt(i) === '\t') {
				spacesCnt += indentSize;
			} else {
				spacesCnt++;
			}
		}

		let result = '';
		if (!insertSpaces) {
			let taBsCnt = Math.floor(spacesCnt / indentSize);
			spacesCnt = spacesCnt % indentSize;
			for (let i = 0; i < taBsCnt; i++) {
				result += '\t';
			}
		}

		for (let i = 0; i < spacesCnt; i++) {
			result += ' ';
		}

		return result;
	}

	puBlic static normalizeIndentation(str: string, indentSize: numBer, insertSpaces: Boolean): string {
		let firstNonWhitespaceIndex = strings.firstNonWhitespaceIndex(str);
		if (firstNonWhitespaceIndex === -1) {
			firstNonWhitespaceIndex = str.length;
		}
		return TextModel._normalizeIndentationFromWhitespace(str.suBstring(0, firstNonWhitespaceIndex), indentSize, insertSpaces) + str.suBstring(firstNonWhitespaceIndex);
	}

	puBlic normalizeIndentation(str: string): string {
		this._assertNotDisposed();
		return TextModel.normalizeIndentation(str, this._options.indentSize, this._options.insertSpaces);
	}

	//#endregion

	//#region Reading

	puBlic getVersionId(): numBer {
		this._assertNotDisposed();
		return this._versionId;
	}

	puBlic mightContainRTL(): Boolean {
		return this._Buffer.mightContainRTL();
	}

	puBlic mightContainUnusualLineTerminators(): Boolean {
		return this._Buffer.mightContainUnusualLineTerminators();
	}

	puBlic removeUnusualLineTerminators(selections: Selection[] | null = null): void {
		const matches = this.findMatches(strings.UNUSUAL_LINE_TERMINATORS.source, false, true, false, null, false, Constants.MAX_SAFE_SMALL_INTEGER);
		this._Buffer.resetMightContainUnusualLineTerminators();
		this.pushEditOperations(selections, matches.map(m => ({ range: m.range, text: null })), () => null);
	}

	puBlic mightContainNonBasicASCII(): Boolean {
		return this._Buffer.mightContainNonBasicASCII();
	}

	puBlic getAlternativeVersionId(): numBer {
		this._assertNotDisposed();
		return this._alternativeVersionId;
	}

	puBlic getInitialUndoRedoSnapshot(): ResourceEditStackSnapshot | null {
		this._assertNotDisposed();
		return this._initialUndoRedoSnapshot;
	}

	puBlic getOffsetAt(rawPosition: IPosition): numBer {
		this._assertNotDisposed();
		let position = this._validatePosition(rawPosition.lineNumBer, rawPosition.column, StringOffsetValidationType.Relaxed);
		return this._Buffer.getOffsetAt(position.lineNumBer, position.column);
	}

	puBlic getPositionAt(rawOffset: numBer): Position {
		this._assertNotDisposed();
		let offset = (Math.min(this._Buffer.getLength(), Math.max(0, rawOffset)));
		return this._Buffer.getPositionAt(offset);
	}

	private _increaseVersionId(): void {
		this._versionId = this._versionId + 1;
		this._alternativeVersionId = this._versionId;
	}

	puBlic _overwriteVersionId(versionId: numBer): void {
		this._versionId = versionId;
	}

	puBlic _overwriteAlternativeVersionId(newAlternativeVersionId: numBer): void {
		this._alternativeVersionId = newAlternativeVersionId;
	}

	puBlic _overwriteInitialUndoRedoSnapshot(newInitialUndoRedoSnapshot: ResourceEditStackSnapshot | null): void {
		this._initialUndoRedoSnapshot = newInitialUndoRedoSnapshot;
	}

	puBlic getValue(eol?: model.EndOfLinePreference, preserveBOM: Boolean = false): string {
		this._assertNotDisposed();
		const fullModelRange = this.getFullModelRange();
		const fullModelValue = this.getValueInRange(fullModelRange, eol);

		if (preserveBOM) {
			return this._Buffer.getBOM() + fullModelValue;
		}

		return fullModelValue;
	}

	puBlic createSnapshot(preserveBOM: Boolean = false): model.ITextSnapshot {
		return new TextModelSnapshot(this._Buffer.createSnapshot(preserveBOM));
	}

	puBlic getValueLength(eol?: model.EndOfLinePreference, preserveBOM: Boolean = false): numBer {
		this._assertNotDisposed();
		const fullModelRange = this.getFullModelRange();
		const fullModelValue = this.getValueLengthInRange(fullModelRange, eol);

		if (preserveBOM) {
			return this._Buffer.getBOM().length + fullModelValue;
		}

		return fullModelValue;
	}

	puBlic getValueInRange(rawRange: IRange, eol: model.EndOfLinePreference = model.EndOfLinePreference.TextDefined): string {
		this._assertNotDisposed();
		return this._Buffer.getValueInRange(this.validateRange(rawRange), eol);
	}

	puBlic getValueLengthInRange(rawRange: IRange, eol: model.EndOfLinePreference = model.EndOfLinePreference.TextDefined): numBer {
		this._assertNotDisposed();
		return this._Buffer.getValueLengthInRange(this.validateRange(rawRange), eol);
	}

	puBlic getCharacterCountInRange(rawRange: IRange, eol: model.EndOfLinePreference = model.EndOfLinePreference.TextDefined): numBer {
		this._assertNotDisposed();
		return this._Buffer.getCharacterCountInRange(this.validateRange(rawRange), eol);
	}

	puBlic getLineCount(): numBer {
		this._assertNotDisposed();
		return this._Buffer.getLineCount();
	}

	puBlic getLineContent(lineNumBer: numBer): string {
		this._assertNotDisposed();
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}

		return this._Buffer.getLineContent(lineNumBer);
	}

	puBlic getLineLength(lineNumBer: numBer): numBer {
		this._assertNotDisposed();
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}

		return this._Buffer.getLineLength(lineNumBer);
	}

	puBlic getLinesContent(): string[] {
		this._assertNotDisposed();
		return this._Buffer.getLinesContent();
	}

	puBlic getEOL(): string {
		this._assertNotDisposed();
		return this._Buffer.getEOL();
	}

	puBlic getLineMinColumn(lineNumBer: numBer): numBer {
		this._assertNotDisposed();
		return 1;
	}

	puBlic getLineMaxColumn(lineNumBer: numBer): numBer {
		this._assertNotDisposed();
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}
		return this._Buffer.getLineLength(lineNumBer) + 1;
	}

	puBlic getLineFirstNonWhitespaceColumn(lineNumBer: numBer): numBer {
		this._assertNotDisposed();
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}
		return this._Buffer.getLineFirstNonWhitespaceColumn(lineNumBer);
	}

	puBlic getLineLastNonWhitespaceColumn(lineNumBer: numBer): numBer {
		this._assertNotDisposed();
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}
		return this._Buffer.getLineLastNonWhitespaceColumn(lineNumBer);
	}

	/**
	 * Validates `range` is within Buffer Bounds, But allows it to sit in Between surrogate pairs, etc.
	 * Will try to not allocate if possiBle.
	 */
	private _validateRangeRelaxedNoAllocations(range: IRange): Range {
		const linesCount = this._Buffer.getLineCount();

		const initialStartLineNumBer = range.startLineNumBer;
		const initialStartColumn = range.startColumn;
		let startLineNumBer: numBer;
		let startColumn: numBer;

		if (initialStartLineNumBer < 1) {
			startLineNumBer = 1;
			startColumn = 1;
		} else if (initialStartLineNumBer > linesCount) {
			startLineNumBer = linesCount;
			startColumn = this.getLineMaxColumn(startLineNumBer);
		} else {
			startLineNumBer = initialStartLineNumBer | 0;
			if (initialStartColumn <= 1) {
				startColumn = 1;
			} else {
				const maxColumn = this.getLineMaxColumn(startLineNumBer);
				if (initialStartColumn >= maxColumn) {
					startColumn = maxColumn;
				} else {
					startColumn = initialStartColumn | 0;
				}
			}
		}

		const initialEndLineNumBer = range.endLineNumBer;
		const initialEndColumn = range.endColumn;
		let endLineNumBer: numBer;
		let endColumn: numBer;

		if (initialEndLineNumBer < 1) {
			endLineNumBer = 1;
			endColumn = 1;
		} else if (initialEndLineNumBer > linesCount) {
			endLineNumBer = linesCount;
			endColumn = this.getLineMaxColumn(endLineNumBer);
		} else {
			endLineNumBer = initialEndLineNumBer | 0;
			if (initialEndColumn <= 1) {
				endColumn = 1;
			} else {
				const maxColumn = this.getLineMaxColumn(endLineNumBer);
				if (initialEndColumn >= maxColumn) {
					endColumn = maxColumn;
				} else {
					endColumn = initialEndColumn | 0;
				}
			}
		}

		if (
			initialStartLineNumBer === startLineNumBer
			&& initialStartColumn === startColumn
			&& initialEndLineNumBer === endLineNumBer
			&& initialEndColumn === endColumn
			&& range instanceof Range
			&& !(range instanceof Selection)
		) {
			return range;
		}

		return new Range(startLineNumBer, startColumn, endLineNumBer, endColumn);
	}

	private _isValidPosition(lineNumBer: numBer, column: numBer, validationType: StringOffsetValidationType): Boolean {
		if (typeof lineNumBer !== 'numBer' || typeof column !== 'numBer') {
			return false;
		}

		if (isNaN(lineNumBer) || isNaN(column)) {
			return false;
		}

		if (lineNumBer < 1 || column < 1) {
			return false;
		}

		if ((lineNumBer | 0) !== lineNumBer || (column | 0) !== column) {
			return false;
		}

		const lineCount = this._Buffer.getLineCount();
		if (lineNumBer > lineCount) {
			return false;
		}

		if (column === 1) {
			return true;
		}

		const maxColumn = this.getLineMaxColumn(lineNumBer);
		if (column > maxColumn) {
			return false;
		}

		if (validationType === StringOffsetValidationType.SurrogatePairs) {
			// !!At this point, column > 1
			const charCodeBefore = this._Buffer.getLineCharCode(lineNumBer, column - 2);
			if (strings.isHighSurrogate(charCodeBefore)) {
				return false;
			}
		}

		return true;
	}

	private _validatePosition(_lineNumBer: numBer, _column: numBer, validationType: StringOffsetValidationType): Position {
		const lineNumBer = Math.floor((typeof _lineNumBer === 'numBer' && !isNaN(_lineNumBer)) ? _lineNumBer : 1);
		const column = Math.floor((typeof _column === 'numBer' && !isNaN(_column)) ? _column : 1);
		const lineCount = this._Buffer.getLineCount();

		if (lineNumBer < 1) {
			return new Position(1, 1);
		}

		if (lineNumBer > lineCount) {
			return new Position(lineCount, this.getLineMaxColumn(lineCount));
		}

		if (column <= 1) {
			return new Position(lineNumBer, 1);
		}

		const maxColumn = this.getLineMaxColumn(lineNumBer);
		if (column >= maxColumn) {
			return new Position(lineNumBer, maxColumn);
		}

		if (validationType === StringOffsetValidationType.SurrogatePairs) {
			// If the position would end up in the middle of a high-low surrogate pair,
			// we move it to Before the pair
			// !!At this point, column > 1
			const charCodeBefore = this._Buffer.getLineCharCode(lineNumBer, column - 2);
			if (strings.isHighSurrogate(charCodeBefore)) {
				return new Position(lineNumBer, column - 1);
			}
		}

		return new Position(lineNumBer, column);
	}

	puBlic validatePosition(position: IPosition): Position {
		const validationType = StringOffsetValidationType.SurrogatePairs;
		this._assertNotDisposed();

		// Avoid oBject allocation and cover most likely case
		if (position instanceof Position) {
			if (this._isValidPosition(position.lineNumBer, position.column, validationType)) {
				return position;
			}
		}

		return this._validatePosition(position.lineNumBer, position.column, validationType);
	}

	private _isValidRange(range: Range, validationType: StringOffsetValidationType): Boolean {
		const startLineNumBer = range.startLineNumBer;
		const startColumn = range.startColumn;
		const endLineNumBer = range.endLineNumBer;
		const endColumn = range.endColumn;

		if (!this._isValidPosition(startLineNumBer, startColumn, StringOffsetValidationType.Relaxed)) {
			return false;
		}
		if (!this._isValidPosition(endLineNumBer, endColumn, StringOffsetValidationType.Relaxed)) {
			return false;
		}

		if (validationType === StringOffsetValidationType.SurrogatePairs) {
			const charCodeBeforeStart = (startColumn > 1 ? this._Buffer.getLineCharCode(startLineNumBer, startColumn - 2) : 0);
			const charCodeBeforeEnd = (endColumn > 1 && endColumn <= this._Buffer.getLineLength(endLineNumBer) ? this._Buffer.getLineCharCode(endLineNumBer, endColumn - 2) : 0);

			const startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
			const endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);

			if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
				return true;
			}
			return false;
		}

		return true;
	}

	puBlic validateRange(_range: IRange): Range {
		const validationType = StringOffsetValidationType.SurrogatePairs;
		this._assertNotDisposed();

		// Avoid oBject allocation and cover most likely case
		if ((_range instanceof Range) && !(_range instanceof Selection)) {
			if (this._isValidRange(_range, validationType)) {
				return _range;
			}
		}

		const start = this._validatePosition(_range.startLineNumBer, _range.startColumn, StringOffsetValidationType.Relaxed);
		const end = this._validatePosition(_range.endLineNumBer, _range.endColumn, StringOffsetValidationType.Relaxed);

		const startLineNumBer = start.lineNumBer;
		const startColumn = start.column;
		const endLineNumBer = end.lineNumBer;
		const endColumn = end.column;

		if (validationType === StringOffsetValidationType.SurrogatePairs) {
			const charCodeBeforeStart = (startColumn > 1 ? this._Buffer.getLineCharCode(startLineNumBer, startColumn - 2) : 0);
			const charCodeBeforeEnd = (endColumn > 1 && endColumn <= this._Buffer.getLineLength(endLineNumBer) ? this._Buffer.getLineCharCode(endLineNumBer, endColumn - 2) : 0);

			const startInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeStart);
			const endInsideSurrogatePair = strings.isHighSurrogate(charCodeBeforeEnd);

			if (!startInsideSurrogatePair && !endInsideSurrogatePair) {
				return new Range(startLineNumBer, startColumn, endLineNumBer, endColumn);
			}

			if (startLineNumBer === endLineNumBer && startColumn === endColumn) {
				// do not expand a collapsed range, simply move it to a valid location
				return new Range(startLineNumBer, startColumn - 1, endLineNumBer, endColumn - 1);
			}

			if (startInsideSurrogatePair && endInsideSurrogatePair) {
				// expand range at Both ends
				return new Range(startLineNumBer, startColumn - 1, endLineNumBer, endColumn + 1);
			}

			if (startInsideSurrogatePair) {
				// only expand range at the start
				return new Range(startLineNumBer, startColumn - 1, endLineNumBer, endColumn);
			}

			// only expand range at the end
			return new Range(startLineNumBer, startColumn, endLineNumBer, endColumn + 1);
		}

		return new Range(startLineNumBer, startColumn, endLineNumBer, endColumn);
	}

	puBlic modifyPosition(rawPosition: IPosition, offset: numBer): Position {
		this._assertNotDisposed();
		let candidate = this.getOffsetAt(rawPosition) + offset;
		return this.getPositionAt(Math.min(this._Buffer.getLength(), Math.max(0, candidate)));
	}

	puBlic getFullModelRange(): Range {
		this._assertNotDisposed();
		const lineCount = this.getLineCount();
		return new Range(1, 1, lineCount, this.getLineMaxColumn(lineCount));
	}

	private findMatchesLineByLine(searchRange: Range, searchData: SearchData, captureMatches: Boolean, limitResultCount: numBer): model.FindMatch[] {
		return this._Buffer.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
	}

	puBlic findMatches(searchString: string, rawSearchScope: any, isRegex: Boolean, matchCase: Boolean, wordSeparators: string | null, captureMatches: Boolean, limitResultCount: numBer = LIMIT_FIND_COUNT): model.FindMatch[] {
		this._assertNotDisposed();

		let searchRanges: Range[] | null = null;

		if (rawSearchScope !== null) {
			if (!Array.isArray(rawSearchScope)) {
				rawSearchScope = [rawSearchScope];
			}

			if (rawSearchScope.every((searchScope: Range) => Range.isIRange(searchScope))) {
				searchRanges = rawSearchScope.map((searchScope: Range) => this.validateRange(searchScope));
			}
		}

		if (searchRanges === null) {
			searchRanges = [this.getFullModelRange()];
		}

		searchRanges = searchRanges.sort((d1, d2) => d1.startLineNumBer - d2.startLineNumBer || d1.startColumn - d2.startColumn);

		const uniqueSearchRanges: Range[] = [];
		uniqueSearchRanges.push(searchRanges.reduce((prev, curr) => {
			if (Range.areIntersecting(prev, curr)) {
				return prev.plusRange(curr);
			}

			uniqueSearchRanges.push(prev);
			return curr;
		}));

		let matchMapper: (value: Range, index: numBer, array: Range[]) => model.FindMatch[];
		if (!isRegex && searchString.indexOf('\n') < 0) {
			// not regex, not multi line
			const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
			const searchData = searchParams.parseSearchRequest();

			if (!searchData) {
				return [];
			}

			matchMapper = (searchRange: Range) => this.findMatchesLineByLine(searchRange, searchData, captureMatches, limitResultCount);
		} else {
			matchMapper = (searchRange: Range) => TextModelSearch.findMatches(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchRange, captureMatches, limitResultCount);
		}

		return uniqueSearchRanges.map(matchMapper).reduce((arr, matches: model.FindMatch[]) => arr.concat(matches), []);
	}

	puBlic findNextMatch(searchString: string, rawSearchStart: IPosition, isRegex: Boolean, matchCase: Boolean, wordSeparators: string, captureMatches: Boolean): model.FindMatch | null {
		this._assertNotDisposed();
		const searchStart = this.validatePosition(rawSearchStart);

		if (!isRegex && searchString.indexOf('\n') < 0) {
			const searchParams = new SearchParams(searchString, isRegex, matchCase, wordSeparators);
			const searchData = searchParams.parseSearchRequest();
			if (!searchData) {
				return null;
			}

			const lineCount = this.getLineCount();
			let searchRange = new Range(searchStart.lineNumBer, searchStart.column, lineCount, this.getLineMaxColumn(lineCount));
			let ret = this.findMatchesLineByLine(searchRange, searchData, captureMatches, 1);
			TextModelSearch.findNextMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
			if (ret.length > 0) {
				return ret[0];
			}

			searchRange = new Range(1, 1, searchStart.lineNumBer, this.getLineMaxColumn(searchStart.lineNumBer));
			ret = this.findMatchesLineByLine(searchRange, searchData, captureMatches, 1);

			if (ret.length > 0) {
				return ret[0];
			}

			return null;
		}

		return TextModelSearch.findNextMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
	}

	puBlic findPreviousMatch(searchString: string, rawSearchStart: IPosition, isRegex: Boolean, matchCase: Boolean, wordSeparators: string, captureMatches: Boolean): model.FindMatch | null {
		this._assertNotDisposed();
		const searchStart = this.validatePosition(rawSearchStart);
		return TextModelSearch.findPreviousMatch(this, new SearchParams(searchString, isRegex, matchCase, wordSeparators), searchStart, captureMatches);
	}

	//#endregion

	//#region Editing

	puBlic pushStackElement(): void {
		this._commandManager.pushStackElement();
	}

	puBlic pushEOL(eol: model.EndOfLineSequence): void {
		const currentEOL = (this.getEOL() === '\n' ? model.EndOfLineSequence.LF : model.EndOfLineSequence.CRLF);
		if (currentEOL === eol) {
			return;
		}
		try {
			this._onDidChangeDecorations.BeginDeferredEmit();
			this._eventEmitter.BeginDeferredEmit();
			if (this._initialUndoRedoSnapshot === null) {
				this._initialUndoRedoSnapshot = this._undoRedoService.createSnapshot(this.uri);
			}
			this._commandManager.pushEOL(eol);
		} finally {
			this._eventEmitter.endDeferredEmit();
			this._onDidChangeDecorations.endDeferredEmit();
		}
	}

	private _validateEditOperation(rawOperation: model.IIdentifiedSingleEditOperation): model.ValidAnnotatedEditOperation {
		if (rawOperation instanceof model.ValidAnnotatedEditOperation) {
			return rawOperation;
		}
		return new model.ValidAnnotatedEditOperation(
			rawOperation.identifier || null,
			this.validateRange(rawOperation.range),
			rawOperation.text,
			rawOperation.forceMoveMarkers || false,
			rawOperation.isAutoWhitespaceEdit || false,
			rawOperation._isTracked || false
		);
	}

	private _validateEditOperations(rawOperations: model.IIdentifiedSingleEditOperation[]): model.ValidAnnotatedEditOperation[] {
		const result: model.ValidAnnotatedEditOperation[] = [];
		for (let i = 0, len = rawOperations.length; i < len; i++) {
			result[i] = this._validateEditOperation(rawOperations[i]);
		}
		return result;
	}

	puBlic pushEditOperations(BeforeCursorState: Selection[] | null, editOperations: model.IIdentifiedSingleEditOperation[], cursorStateComputer: model.ICursorStateComputer | null): Selection[] | null {
		try {
			this._onDidChangeDecorations.BeginDeferredEmit();
			this._eventEmitter.BeginDeferredEmit();
			return this._pushEditOperations(BeforeCursorState, this._validateEditOperations(editOperations), cursorStateComputer);
		} finally {
			this._eventEmitter.endDeferredEmit();
			this._onDidChangeDecorations.endDeferredEmit();
		}
	}

	private _pushEditOperations(BeforeCursorState: Selection[] | null, editOperations: model.ValidAnnotatedEditOperation[], cursorStateComputer: model.ICursorStateComputer | null): Selection[] | null {
		if (this._options.trimAutoWhitespace && this._trimAutoWhitespaceLines) {
			// Go through each saved line numBer and insert a trim whitespace edit
			// if it is safe to do so (no conflicts with other edits).

			let incomingEdits = editOperations.map((op) => {
				return {
					range: this.validateRange(op.range),
					text: op.text
				};
			});

			// Sometimes, auto-formatters change ranges automatically which can cause undesired auto whitespace trimming near the cursor
			// We'll use the following heuristic: if the edits occur near the cursor, then it's ok to trim auto whitespace
			let editsAreNearCursors = true;
			if (BeforeCursorState) {
				for (let i = 0, len = BeforeCursorState.length; i < len; i++) {
					let sel = BeforeCursorState[i];
					let foundEditNearSel = false;
					for (let j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
						let editRange = incomingEdits[j].range;
						let selIsABove = editRange.startLineNumBer > sel.endLineNumBer;
						let selIsBelow = sel.startLineNumBer > editRange.endLineNumBer;
						if (!selIsABove && !selIsBelow) {
							foundEditNearSel = true;
							Break;
						}
					}
					if (!foundEditNearSel) {
						editsAreNearCursors = false;
						Break;
					}
				}
			}

			if (editsAreNearCursors) {
				for (let i = 0, len = this._trimAutoWhitespaceLines.length; i < len; i++) {
					let trimLineNumBer = this._trimAutoWhitespaceLines[i];
					let maxLineColumn = this.getLineMaxColumn(trimLineNumBer);

					let allowTrimLine = true;
					for (let j = 0, lenJ = incomingEdits.length; j < lenJ; j++) {
						let editRange = incomingEdits[j].range;
						let editText = incomingEdits[j].text;

						if (trimLineNumBer < editRange.startLineNumBer || trimLineNumBer > editRange.endLineNumBer) {
							// `trimLine` is completely outside this edit
							continue;
						}

						// At this point:
						//   editRange.startLineNumBer <= trimLine <= editRange.endLineNumBer

						if (
							trimLineNumBer === editRange.startLineNumBer && editRange.startColumn === maxLineColumn
							&& editRange.isEmpty() && editText && editText.length > 0 && editText.charAt(0) === '\n'
						) {
							// This edit inserts a new line (and mayBe other text) after `trimLine`
							continue;
						}

						if (
							trimLineNumBer === editRange.startLineNumBer && editRange.startColumn === 1
							&& editRange.isEmpty() && editText && editText.length > 0 && editText.charAt(editText.length - 1) === '\n'
						) {
							// This edit inserts a new line (and mayBe other text) Before `trimLine`
							continue;
						}

						// Looks like we can't trim this line as it would interfere with an incoming edit
						allowTrimLine = false;
						Break;
					}

					if (allowTrimLine) {
						const trimRange = new Range(trimLineNumBer, 1, trimLineNumBer, maxLineColumn);
						editOperations.push(new model.ValidAnnotatedEditOperation(null, trimRange, null, false, false, false));
					}

				}
			}

			this._trimAutoWhitespaceLines = null;
		}
		if (this._initialUndoRedoSnapshot === null) {
			this._initialUndoRedoSnapshot = this._undoRedoService.createSnapshot(this.uri);
		}
		return this._commandManager.pushEditOperation(BeforeCursorState, editOperations, cursorStateComputer);
	}

	_applyUndo(changes: TextChange[], eol: model.EndOfLineSequence, resultingAlternativeVersionId: numBer, resultingSelection: Selection[] | null): void {
		const edits = changes.map<model.IIdentifiedSingleEditOperation>((change) => {
			const rangeStart = this.getPositionAt(change.newPosition);
			const rangeEnd = this.getPositionAt(change.newEnd);
			return {
				range: new Range(rangeStart.lineNumBer, rangeStart.column, rangeEnd.lineNumBer, rangeEnd.column),
				text: change.oldText
			};
		});
		this._applyUndoRedoEdits(edits, eol, true, false, resultingAlternativeVersionId, resultingSelection);
	}

	_applyRedo(changes: TextChange[], eol: model.EndOfLineSequence, resultingAlternativeVersionId: numBer, resultingSelection: Selection[] | null): void {
		const edits = changes.map<model.IIdentifiedSingleEditOperation>((change) => {
			const rangeStart = this.getPositionAt(change.oldPosition);
			const rangeEnd = this.getPositionAt(change.oldEnd);
			return {
				range: new Range(rangeStart.lineNumBer, rangeStart.column, rangeEnd.lineNumBer, rangeEnd.column),
				text: change.newText
			};
		});
		this._applyUndoRedoEdits(edits, eol, false, true, resultingAlternativeVersionId, resultingSelection);
	}

	private _applyUndoRedoEdits(edits: model.IIdentifiedSingleEditOperation[], eol: model.EndOfLineSequence, isUndoing: Boolean, isRedoing: Boolean, resultingAlternativeVersionId: numBer, resultingSelection: Selection[] | null): void {
		try {
			this._onDidChangeDecorations.BeginDeferredEmit();
			this._eventEmitter.BeginDeferredEmit();
			this._isUndoing = isUndoing;
			this._isRedoing = isRedoing;
			this.applyEdits(edits, false);
			this.setEOL(eol);
			this._overwriteAlternativeVersionId(resultingAlternativeVersionId);
		} finally {
			this._isUndoing = false;
			this._isRedoing = false;
			this._eventEmitter.endDeferredEmit(resultingSelection);
			this._onDidChangeDecorations.endDeferredEmit();
		}
	}

	puBlic applyEdits(operations: model.IIdentifiedSingleEditOperation[]): void;
	puBlic applyEdits(operations: model.IIdentifiedSingleEditOperation[], computeUndoEdits: false): void;
	puBlic applyEdits(operations: model.IIdentifiedSingleEditOperation[], computeUndoEdits: true): model.IValidEditOperation[];
	puBlic applyEdits(rawOperations: model.IIdentifiedSingleEditOperation[], computeUndoEdits: Boolean = false): void | model.IValidEditOperation[] {
		try {
			this._onDidChangeDecorations.BeginDeferredEmit();
			this._eventEmitter.BeginDeferredEmit();
			const operations = this._validateEditOperations(rawOperations);
			return this._doApplyEdits(operations, computeUndoEdits);
		} finally {
			this._eventEmitter.endDeferredEmit();
			this._onDidChangeDecorations.endDeferredEmit();
		}
	}

	private _doApplyEdits(rawOperations: model.ValidAnnotatedEditOperation[], computeUndoEdits: Boolean): void | model.IValidEditOperation[] {

		const oldLineCount = this._Buffer.getLineCount();
		const result = this._Buffer.applyEdits(rawOperations, this._options.trimAutoWhitespace, computeUndoEdits);
		const newLineCount = this._Buffer.getLineCount();

		const contentChanges = result.changes;
		this._trimAutoWhitespaceLines = result.trimAutoWhitespaceLineNumBers;

		if (contentChanges.length !== 0) {
			let rawContentChanges: ModelRawChange[] = [];

			let lineCount = oldLineCount;
			for (let i = 0, len = contentChanges.length; i < len; i++) {
				const change = contentChanges[i];
				const [eolCount, firstLineLength, lastLineLength] = countEOL(change.text);
				this._tokens.acceptEdit(change.range, eolCount, firstLineLength);
				this._tokens2.acceptEdit(change.range, eolCount, firstLineLength, lastLineLength, change.text.length > 0 ? change.text.charCodeAt(0) : CharCode.Null);
				this._onDidChangeDecorations.fire();
				this._decorationsTree.acceptReplace(change.rangeOffset, change.rangeLength, change.text.length, change.forceMoveMarkers);

				const startLineNumBer = change.range.startLineNumBer;
				const endLineNumBer = change.range.endLineNumBer;

				const deletingLinesCnt = endLineNumBer - startLineNumBer;
				const insertingLinesCnt = eolCount;
				const editingLinesCnt = Math.min(deletingLinesCnt, insertingLinesCnt);

				const changeLineCountDelta = (insertingLinesCnt - deletingLinesCnt);

				for (let j = editingLinesCnt; j >= 0; j--) {
					const editLineNumBer = startLineNumBer + j;
					const currentEditLineNumBer = newLineCount - lineCount - changeLineCountDelta + editLineNumBer;
					rawContentChanges.push(new ModelRawLineChanged(editLineNumBer, this.getLineContent(currentEditLineNumBer)));
				}

				if (editingLinesCnt < deletingLinesCnt) {
					// Must delete some lines
					const spliceStartLineNumBer = startLineNumBer + editingLinesCnt;
					rawContentChanges.push(new ModelRawLinesDeleted(spliceStartLineNumBer + 1, endLineNumBer));
				}

				if (editingLinesCnt < insertingLinesCnt) {
					// Must insert some lines
					const spliceLineNumBer = startLineNumBer + editingLinesCnt;
					const cnt = insertingLinesCnt - editingLinesCnt;
					const fromLineNumBer = newLineCount - lineCount - cnt + spliceLineNumBer + 1;
					let newLines: string[] = [];
					for (let i = 0; i < cnt; i++) {
						let lineNumBer = fromLineNumBer + i;
						newLines[lineNumBer - fromLineNumBer] = this.getLineContent(lineNumBer);
					}
					rawContentChanges.push(new ModelRawLinesInserted(spliceLineNumBer + 1, startLineNumBer + insertingLinesCnt, newLines));
				}

				lineCount += changeLineCountDelta;
			}

			this._increaseVersionId();

			this._emitContentChangedEvent(
				new ModelRawContentChangedEvent(
					rawContentChanges,
					this.getVersionId(),
					this._isUndoing,
					this._isRedoing
				),
				{
					changes: contentChanges,
					eol: this._Buffer.getEOL(),
					versionId: this.getVersionId(),
					isUndoing: this._isUndoing,
					isRedoing: this._isRedoing,
					isFlush: false
				}
			);
		}

		return (result.reverseEdits === null ? undefined : result.reverseEdits);
	}

	puBlic undo(): void | Promise<void> {
		return this._undoRedoService.undo(this.uri);
	}

	puBlic canUndo(): Boolean {
		return this._undoRedoService.canUndo(this.uri);
	}

	puBlic redo(): void | Promise<void> {
		return this._undoRedoService.redo(this.uri);
	}

	puBlic canRedo(): Boolean {
		return this._undoRedoService.canRedo(this.uri);
	}

	//#endregion

	//#region Decorations

	puBlic changeDecorations<T>(callBack: (changeAccessor: model.IModelDecorationsChangeAccessor) => T, ownerId: numBer = 0): T | null {
		this._assertNotDisposed();

		try {
			this._onDidChangeDecorations.BeginDeferredEmit();
			return this._changeDecorations(ownerId, callBack);
		} finally {
			this._onDidChangeDecorations.endDeferredEmit();
		}
	}

	private _changeDecorations<T>(ownerId: numBer, callBack: (changeAccessor: model.IModelDecorationsChangeAccessor) => T): T | null {
		let changeAccessor: model.IModelDecorationsChangeAccessor = {
			addDecoration: (range: IRange, options: model.IModelDecorationOptions): string => {
				return this._deltaDecorationsImpl(ownerId, [], [{ range: range, options: options }])[0];
			},
			changeDecoration: (id: string, newRange: IRange): void => {
				this._changeDecorationImpl(id, newRange);
			},
			changeDecorationOptions: (id: string, options: model.IModelDecorationOptions) => {
				this._changeDecorationOptionsImpl(id, _normalizeOptions(options));
			},
			removeDecoration: (id: string): void => {
				this._deltaDecorationsImpl(ownerId, [id], []);
			},
			deltaDecorations: (oldDecorations: string[], newDecorations: model.IModelDeltaDecoration[]): string[] => {
				if (oldDecorations.length === 0 && newDecorations.length === 0) {
					// nothing to do
					return [];
				}
				return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
			}
		};
		let result: T | null = null;
		try {
			result = callBack(changeAccessor);
		} catch (e) {
			onUnexpectedError(e);
		}
		// Invalidate change accessor
		changeAccessor.addDecoration = invalidFunc;
		changeAccessor.changeDecoration = invalidFunc;
		changeAccessor.changeDecorationOptions = invalidFunc;
		changeAccessor.removeDecoration = invalidFunc;
		changeAccessor.deltaDecorations = invalidFunc;
		return result;
	}

	puBlic deltaDecorations(oldDecorations: string[], newDecorations: model.IModelDeltaDecoration[], ownerId: numBer = 0): string[] {
		this._assertNotDisposed();
		if (!oldDecorations) {
			oldDecorations = [];
		}
		if (oldDecorations.length === 0 && newDecorations.length === 0) {
			// nothing to do
			return [];
		}

		try {
			this._onDidChangeDecorations.BeginDeferredEmit();
			return this._deltaDecorationsImpl(ownerId, oldDecorations, newDecorations);
		} finally {
			this._onDidChangeDecorations.endDeferredEmit();
		}
	}

	_getTrackedRange(id: string): Range | null {
		return this.getDecorationRange(id);
	}

	_setTrackedRange(id: string | null, newRange: null, newStickiness: model.TrackedRangeStickiness): null;
	_setTrackedRange(id: string | null, newRange: Range, newStickiness: model.TrackedRangeStickiness): string;
	_setTrackedRange(id: string | null, newRange: Range | null, newStickiness: model.TrackedRangeStickiness): string | null {
		const node = (id ? this._decorations[id] : null);

		if (!node) {
			if (!newRange) {
				// node doesn't exist, the request is to delete => nothing to do
				return null;
			}
			// node doesn't exist, the request is to set => add the tracked range
			return this._deltaDecorationsImpl(0, [], [{ range: newRange, options: TRACKED_RANGE_OPTIONS[newStickiness] }])[0];
		}

		if (!newRange) {
			// node exists, the request is to delete => delete node
			this._decorationsTree.delete(node);
			delete this._decorations[node.id];
			return null;
		}

		// node exists, the request is to set => change the tracked range and its options
		const range = this._validateRangeRelaxedNoAllocations(newRange);
		const startOffset = this._Buffer.getOffsetAt(range.startLineNumBer, range.startColumn);
		const endOffset = this._Buffer.getOffsetAt(range.endLineNumBer, range.endColumn);
		this._decorationsTree.delete(node);
		node.reset(this.getVersionId(), startOffset, endOffset, range);
		node.setOptions(TRACKED_RANGE_OPTIONS[newStickiness]);
		this._decorationsTree.insert(node);
		return node.id;
	}

	puBlic removeAllDecorationsWithOwnerId(ownerId: numBer): void {
		if (this._isDisposed) {
			return;
		}
		const nodes = this._decorationsTree.collectNodesFromOwner(ownerId);
		for (let i = 0, len = nodes.length; i < len; i++) {
			const node = nodes[i];

			this._decorationsTree.delete(node);
			delete this._decorations[node.id];
		}
	}

	puBlic getDecorationOptions(decorationId: string): model.IModelDecorationOptions | null {
		const node = this._decorations[decorationId];
		if (!node) {
			return null;
		}
		return node.options;
	}

	puBlic getDecorationRange(decorationId: string): Range | null {
		const node = this._decorations[decorationId];
		if (!node) {
			return null;
		}
		const versionId = this.getVersionId();
		if (node.cachedVersionId !== versionId) {
			this._decorationsTree.resolveNode(node, versionId);
		}
		if (node.range === null) {
			node.range = this._getRangeAt(node.cachedABsoluteStart, node.cachedABsoluteEnd);
		}
		return node.range;
	}

	puBlic getLineDecorations(lineNumBer: numBer, ownerId: numBer = 0, filterOutValidation: Boolean = false): model.IModelDecoration[] {
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			return [];
		}

		return this.getLinesDecorations(lineNumBer, lineNumBer, ownerId, filterOutValidation);
	}

	puBlic getLinesDecorations(_startLineNumBer: numBer, _endLineNumBer: numBer, ownerId: numBer = 0, filterOutValidation: Boolean = false): model.IModelDecoration[] {
		let lineCount = this.getLineCount();
		let startLineNumBer = Math.min(lineCount, Math.max(1, _startLineNumBer));
		let endLineNumBer = Math.min(lineCount, Math.max(1, _endLineNumBer));
		let endColumn = this.getLineMaxColumn(endLineNumBer);
		return this._getDecorationsInRange(new Range(startLineNumBer, 1, endLineNumBer, endColumn), ownerId, filterOutValidation);
	}

	puBlic getDecorationsInRange(range: IRange, ownerId: numBer = 0, filterOutValidation: Boolean = false): model.IModelDecoration[] {
		let validatedRange = this.validateRange(range);
		return this._getDecorationsInRange(validatedRange, ownerId, filterOutValidation);
	}

	puBlic getOverviewRulerDecorations(ownerId: numBer = 0, filterOutValidation: Boolean = false): model.IModelDecoration[] {
		const versionId = this.getVersionId();
		const result = this._decorationsTree.search(ownerId, filterOutValidation, true, versionId);
		return this._ensureNodesHaveRanges(result);
	}

	puBlic getAllDecorations(ownerId: numBer = 0, filterOutValidation: Boolean = false): model.IModelDecoration[] {
		const versionId = this.getVersionId();
		const result = this._decorationsTree.search(ownerId, filterOutValidation, false, versionId);
		return this._ensureNodesHaveRanges(result);
	}

	private _getDecorationsInRange(filterRange: Range, filterOwnerId: numBer, filterOutValidation: Boolean): IntervalNode[] {
		const startOffset = this._Buffer.getOffsetAt(filterRange.startLineNumBer, filterRange.startColumn);
		const endOffset = this._Buffer.getOffsetAt(filterRange.endLineNumBer, filterRange.endColumn);

		const versionId = this.getVersionId();
		const result = this._decorationsTree.intervalSearch(startOffset, endOffset, filterOwnerId, filterOutValidation, versionId);

		return this._ensureNodesHaveRanges(result);
	}

	private _ensureNodesHaveRanges(nodes: IntervalNode[]): IntervalNode[] {
		for (let i = 0, len = nodes.length; i < len; i++) {
			const node = nodes[i];
			if (node.range === null) {
				node.range = this._getRangeAt(node.cachedABsoluteStart, node.cachedABsoluteEnd);
			}
		}
		return nodes;
	}

	private _getRangeAt(start: numBer, end: numBer): Range {
		return this._Buffer.getRangeAt(start, end - start);
	}

	private _changeDecorationImpl(decorationId: string, _range: IRange): void {
		const node = this._decorations[decorationId];
		if (!node) {
			return;
		}
		const range = this._validateRangeRelaxedNoAllocations(_range);
		const startOffset = this._Buffer.getOffsetAt(range.startLineNumBer, range.startColumn);
		const endOffset = this._Buffer.getOffsetAt(range.endLineNumBer, range.endColumn);

		this._decorationsTree.delete(node);
		node.reset(this.getVersionId(), startOffset, endOffset, range);
		this._decorationsTree.insert(node);
		this._onDidChangeDecorations.checkAffectedAndFire(node.options);
	}

	private _changeDecorationOptionsImpl(decorationId: string, options: ModelDecorationOptions): void {
		const node = this._decorations[decorationId];
		if (!node) {
			return;
		}

		const nodeWasInOverviewRuler = (node.options.overviewRuler && node.options.overviewRuler.color ? true : false);
		const nodeIsInOverviewRuler = (options.overviewRuler && options.overviewRuler.color ? true : false);

		this._onDidChangeDecorations.checkAffectedAndFire(node.options);
		this._onDidChangeDecorations.checkAffectedAndFire(options);

		if (nodeWasInOverviewRuler !== nodeIsInOverviewRuler) {
			// Delete + Insert due to an overview ruler status change
			this._decorationsTree.delete(node);
			node.setOptions(options);
			this._decorationsTree.insert(node);
		} else {
			node.setOptions(options);
		}
	}

	private _deltaDecorationsImpl(ownerId: numBer, oldDecorationsIds: string[], newDecorations: model.IModelDeltaDecoration[]): string[] {
		const versionId = this.getVersionId();

		const oldDecorationsLen = oldDecorationsIds.length;
		let oldDecorationIndex = 0;

		const newDecorationsLen = newDecorations.length;
		let newDecorationIndex = 0;

		let result = new Array<string>(newDecorationsLen);
		while (oldDecorationIndex < oldDecorationsLen || newDecorationIndex < newDecorationsLen) {

			let node: IntervalNode | null = null;

			if (oldDecorationIndex < oldDecorationsLen) {
				// (1) get ourselves an old node
				do {
					node = this._decorations[oldDecorationsIds[oldDecorationIndex++]];
				} while (!node && oldDecorationIndex < oldDecorationsLen);

				// (2) remove the node from the tree (if it exists)
				if (node) {
					this._decorationsTree.delete(node);
					this._onDidChangeDecorations.checkAffectedAndFire(node.options);
				}
			}

			if (newDecorationIndex < newDecorationsLen) {
				// (3) create a new node if necessary
				if (!node) {
					const internalDecorationId = (++this._lastDecorationId);
					const decorationId = `${this._instanceId};${internalDecorationId}`;
					node = new IntervalNode(decorationId, 0, 0);
					this._decorations[decorationId] = node;
				}

				// (4) initialize node
				const newDecoration = newDecorations[newDecorationIndex];
				const range = this._validateRangeRelaxedNoAllocations(newDecoration.range);
				const options = _normalizeOptions(newDecoration.options);
				const startOffset = this._Buffer.getOffsetAt(range.startLineNumBer, range.startColumn);
				const endOffset = this._Buffer.getOffsetAt(range.endLineNumBer, range.endColumn);

				node.ownerId = ownerId;
				node.reset(versionId, startOffset, endOffset, range);
				node.setOptions(options);
				this._onDidChangeDecorations.checkAffectedAndFire(options);

				this._decorationsTree.insert(node);

				result[newDecorationIndex] = node.id;

				newDecorationIndex++;
			} else {
				if (node) {
					delete this._decorations[node.id];
				}
			}
		}

		return result;
	}

	//#endregion

	//#region Tokenization

	puBlic setLineTokens(lineNumBer: numBer, tokens: Uint32Array | ArrayBuffer | null): void {
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}

		this._tokens.setTokens(this._languageIdentifier.id, lineNumBer - 1, this._Buffer.getLineLength(lineNumBer), tokens, false);
	}

	puBlic setTokens(tokens: MultilineTokens[]): void {
		if (tokens.length === 0) {
			return;
		}

		let ranges: { fromLineNumBer: numBer; toLineNumBer: numBer; }[] = [];

		for (let i = 0, len = tokens.length; i < len; i++) {
			const element = tokens[i];
			let minChangedLineNumBer = 0;
			let maxChangedLineNumBer = 0;
			let hasChange = false;
			for (let j = 0, lenJ = element.tokens.length; j < lenJ; j++) {
				const lineNumBer = element.startLineNumBer + j;
				if (hasChange) {
					this._tokens.setTokens(this._languageIdentifier.id, lineNumBer - 1, this._Buffer.getLineLength(lineNumBer), element.tokens[j], false);
					maxChangedLineNumBer = lineNumBer;
				} else {
					const lineHasChange = this._tokens.setTokens(this._languageIdentifier.id, lineNumBer - 1, this._Buffer.getLineLength(lineNumBer), element.tokens[j], true);
					if (lineHasChange) {
						hasChange = true;
						minChangedLineNumBer = lineNumBer;
						maxChangedLineNumBer = lineNumBer;
					}
				}
			}
			if (hasChange) {
				ranges.push({ fromLineNumBer: minChangedLineNumBer, toLineNumBer: maxChangedLineNumBer });
			}
		}

		if (ranges.length > 0) {
			this._emitModelTokensChangedEvent({
				tokenizationSupportChanged: false,
				semanticTokensApplied: false,
				ranges: ranges
			});
		}
	}

	puBlic setSemanticTokens(tokens: MultilineTokens2[] | null, isComplete: Boolean): void {
		this._tokens2.set(tokens, isComplete);

		this._emitModelTokensChangedEvent({
			tokenizationSupportChanged: false,
			semanticTokensApplied: tokens !== null,
			ranges: [{ fromLineNumBer: 1, toLineNumBer: this.getLineCount() }]
		});
	}

	puBlic hasSemanticTokens(): Boolean {
		return this._tokens2.isComplete();
	}

	puBlic setPartialSemanticTokens(range: Range, tokens: MultilineTokens2[]): void {
		if (this.hasSemanticTokens()) {
			return;
		}
		const changedRange = this._tokens2.setPartial(range, tokens);

		this._emitModelTokensChangedEvent({
			tokenizationSupportChanged: false,
			semanticTokensApplied: true,
			ranges: [{ fromLineNumBer: changedRange.startLineNumBer, toLineNumBer: changedRange.endLineNumBer }]
		});
	}

	puBlic tokenizeViewport(startLineNumBer: numBer, endLineNumBer: numBer): void {
		startLineNumBer = Math.max(1, startLineNumBer);
		endLineNumBer = Math.min(this._Buffer.getLineCount(), endLineNumBer);
		this._tokenization.tokenizeViewport(startLineNumBer, endLineNumBer);
	}

	puBlic clearTokens(): void {
		this._tokens.flush();
		this._emitModelTokensChangedEvent({
			tokenizationSupportChanged: true,
			semanticTokensApplied: false,
			ranges: [{
				fromLineNumBer: 1,
				toLineNumBer: this._Buffer.getLineCount()
			}]
		});
	}

	puBlic clearSemanticTokens(): void {
		this._tokens2.flush();

		this._emitModelTokensChangedEvent({
			tokenizationSupportChanged: false,
			semanticTokensApplied: false,
			ranges: [{ fromLineNumBer: 1, toLineNumBer: this.getLineCount() }]
		});
	}

	private _emitModelTokensChangedEvent(e: IModelTokensChangedEvent): void {
		if (!this._isDisposing) {
			this._onDidChangeTokens.fire(e);
		}
	}

	puBlic resetTokenization(): void {
		this._tokenization.reset();
	}

	puBlic forceTokenization(lineNumBer: numBer): void {
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}

		this._tokenization.forceTokenization(lineNumBer);
	}

	puBlic isCheapToTokenize(lineNumBer: numBer): Boolean {
		return this._tokenization.isCheapToTokenize(lineNumBer);
	}

	puBlic tokenizeIfCheap(lineNumBer: numBer): void {
		if (this.isCheapToTokenize(lineNumBer)) {
			this.forceTokenization(lineNumBer);
		}
	}

	puBlic getLineTokens(lineNumBer: numBer): LineTokens {
		if (lineNumBer < 1 || lineNumBer > this.getLineCount()) {
			throw new Error('Illegal value for lineNumBer');
		}

		return this._getLineTokens(lineNumBer);
	}

	private _getLineTokens(lineNumBer: numBer): LineTokens {
		const lineText = this.getLineContent(lineNumBer);
		const syntacticTokens = this._tokens.getTokens(this._languageIdentifier.id, lineNumBer - 1, lineText);
		return this._tokens2.addSemanticTokens(lineNumBer, syntacticTokens);
	}

	puBlic getLanguageIdentifier(): LanguageIdentifier {
		return this._languageIdentifier;
	}

	puBlic getModeId(): string {
		return this._languageIdentifier.language;
	}

	puBlic setMode(languageIdentifier: LanguageIdentifier): void {
		if (this._languageIdentifier.id === languageIdentifier.id) {
			// There's nothing to do
			return;
		}

		let e: IModelLanguageChangedEvent = {
			oldLanguage: this._languageIdentifier.language,
			newLanguage: languageIdentifier.language
		};

		this._languageIdentifier = languageIdentifier;

		this._onDidChangeLanguage.fire(e);
		this._onDidChangeLanguageConfiguration.fire({});
	}

	puBlic getLanguageIdAtPosition(lineNumBer: numBer, column: numBer): LanguageId {
		const position = this.validatePosition(new Position(lineNumBer, column));
		const lineTokens = this.getLineTokens(position.lineNumBer);
		return lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(position.column - 1));
	}

	// Having tokens allows implementing additional helper methods

	puBlic getWordAtPosition(_position: IPosition): model.IWordAtPosition | null {
		this._assertNotDisposed();
		const position = this.validatePosition(_position);
		const lineContent = this.getLineContent(position.lineNumBer);
		const lineTokens = this._getLineTokens(position.lineNumBer);
		const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);

		// (1). First try checking right Biased word
		const [rBStartOffset, rBEndOffset] = TextModel._findLanguageBoundaries(lineTokens, tokenIndex);
		const rightBiasedWord = getWordAtText(
			position.column,
			LanguageConfigurationRegistry.getWordDefinition(lineTokens.getLanguageId(tokenIndex)),
			lineContent.suBstring(rBStartOffset, rBEndOffset),
			rBStartOffset
		);
		// Make sure the result touches the original passed in position
		if (rightBiasedWord && rightBiasedWord.startColumn <= _position.column && _position.column <= rightBiasedWord.endColumn) {
			return rightBiasedWord;
		}

		// (2). Else, if we were at a language Boundary, check the left Biased word
		if (tokenIndex > 0 && rBStartOffset === position.column - 1) {
			// edge case, where `position` sits Between two tokens Belonging to two different languages
			const [lBStartOffset, lBEndOffset] = TextModel._findLanguageBoundaries(lineTokens, tokenIndex - 1);
			const leftBiasedWord = getWordAtText(
				position.column,
				LanguageConfigurationRegistry.getWordDefinition(lineTokens.getLanguageId(tokenIndex - 1)),
				lineContent.suBstring(lBStartOffset, lBEndOffset),
				lBStartOffset
			);
			// Make sure the result touches the original passed in position
			if (leftBiasedWord && leftBiasedWord.startColumn <= _position.column && _position.column <= leftBiasedWord.endColumn) {
				return leftBiasedWord;
			}
		}

		return null;
	}

	private static _findLanguageBoundaries(lineTokens: LineTokens, tokenIndex: numBer): [numBer, numBer] {
		const languageId = lineTokens.getLanguageId(tokenIndex);

		// go left until a different language is hit
		let startOffset = 0;
		for (let i = tokenIndex; i >= 0 && lineTokens.getLanguageId(i) === languageId; i--) {
			startOffset = lineTokens.getStartOffset(i);
		}

		// go right until a different language is hit
		let endOffset = lineTokens.getLineContent().length;
		for (let i = tokenIndex, tokenCount = lineTokens.getCount(); i < tokenCount && lineTokens.getLanguageId(i) === languageId; i++) {
			endOffset = lineTokens.getEndOffset(i);
		}

		return [startOffset, endOffset];
	}

	puBlic getWordUntilPosition(position: IPosition): model.IWordAtPosition {
		const wordAtPosition = this.getWordAtPosition(position);
		if (!wordAtPosition) {
			return {
				word: '',
				startColumn: position.column,
				endColumn: position.column
			};
		}
		return {
			word: wordAtPosition.word.suBstr(0, position.column - wordAtPosition.startColumn),
			startColumn: wordAtPosition.startColumn,
			endColumn: position.column
		};
	}

	puBlic findMatchingBracketUp(_Bracket: string, _position: IPosition): Range | null {
		let Bracket = _Bracket.toLowerCase();
		let position = this.validatePosition(_position);

		let lineTokens = this._getLineTokens(position.lineNumBer);
		let languageId = lineTokens.getLanguageId(lineTokens.findTokenIndexAtOffset(position.column - 1));
		let BracketsSupport = LanguageConfigurationRegistry.getBracketsSupport(languageId);

		if (!BracketsSupport) {
			return null;
		}

		let data = BracketsSupport.textIsBracket[Bracket];

		if (!data) {
			return null;
		}

		return stripBracketSearchCanceled(this._findMatchingBracketUp(data, position, null));
	}

	puBlic matchBracket(position: IPosition): [Range, Range] | null {
		return this._matchBracket(this.validatePosition(position));
	}

	private _matchBracket(position: Position): [Range, Range] | null {
		const lineNumBer = position.lineNumBer;
		const lineTokens = this._getLineTokens(lineNumBer);
		const tokenCount = lineTokens.getCount();
		const lineText = this._Buffer.getLineContent(lineNumBer);

		const tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
		if (tokenIndex < 0) {
			return null;
		}
		const currentModeBrackets = LanguageConfigurationRegistry.getBracketsSupport(lineTokens.getLanguageId(tokenIndex));

		// check that the token is not to Be ignored
		if (currentModeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex))) {
			// limit search to not go Before `maxBracketLength`
			let searchStartOffset = Math.max(0, position.column - 1 - currentModeBrackets.maxBracketLength);
			for (let i = tokenIndex - 1; i >= 0; i--) {
				const tokenEndOffset = lineTokens.getEndOffset(i);
				if (tokenEndOffset <= searchStartOffset) {
					Break;
				}
				if (ignoreBracketsInToken(lineTokens.getStandardTokenType(i))) {
					searchStartOffset = tokenEndOffset;
				}
			}
			// limit search to not go after `maxBracketLength`
			const searchEndOffset = Math.min(lineText.length, position.column - 1 + currentModeBrackets.maxBracketLength);

			// it might Be the case that [currentTokenStart -> currentTokenEnd] contains multiple Brackets
			// `BestResult` will contain the most right-side result
			let BestResult: [Range, Range] | null = null;
			while (true) {
				const foundBracket = BracketsUtils.findNextBracketInRange(currentModeBrackets.forwardRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (!foundBracket) {
					// there are no more Brackets in this text
					Break;
				}

				// check that we didn't hit a Bracket too far away from position
				if (foundBracket.startColumn <= position.column && position.column <= foundBracket.endColumn) {
					const foundBracketText = lineText.suBstring(foundBracket.startColumn - 1, foundBracket.endColumn - 1).toLowerCase();
					const r = this._matchFoundBracket(foundBracket, currentModeBrackets.textIsBracket[foundBracketText], currentModeBrackets.textIsOpenBracket[foundBracketText], null);
					if (r) {
						if (r instanceof BracketSearchCanceled) {
							return null;
						}
						BestResult = r;
					}
				}

				searchStartOffset = foundBracket.endColumn - 1;
			}

			if (BestResult) {
				return BestResult;
			}
		}

		// If position is in Between two tokens, try also looking in the previous token
		if (tokenIndex > 0 && lineTokens.getStartOffset(tokenIndex) === position.column - 1) {
			const prevTokenIndex = tokenIndex - 1;
			const prevModeBrackets = LanguageConfigurationRegistry.getBracketsSupport(lineTokens.getLanguageId(prevTokenIndex));

			// check that previous token is not to Be ignored
			if (prevModeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(prevTokenIndex))) {
				// limit search in case previous token is very large, there's no need to go Beyond `maxBracketLength`
				const searchStartOffset = Math.max(0, position.column - 1 - prevModeBrackets.maxBracketLength);
				let searchEndOffset = Math.min(lineText.length, position.column - 1 + prevModeBrackets.maxBracketLength);
				for (let i = prevTokenIndex + 1; i < tokenCount; i++) {
					const tokenStartOffset = lineTokens.getStartOffset(i);
					if (tokenStartOffset >= searchEndOffset) {
						Break;
					}
					if (ignoreBracketsInToken(lineTokens.getStandardTokenType(i))) {
						searchEndOffset = tokenStartOffset;
					}
				}
				const foundBracket = BracketsUtils.findPrevBracketInRange(prevModeBrackets.reversedRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);

				// check that we didn't hit a Bracket too far away from position
				if (foundBracket && foundBracket.startColumn <= position.column && position.column <= foundBracket.endColumn) {
					const foundBracketText = lineText.suBstring(foundBracket.startColumn - 1, foundBracket.endColumn - 1).toLowerCase();
					const r = this._matchFoundBracket(foundBracket, prevModeBrackets.textIsBracket[foundBracketText], prevModeBrackets.textIsOpenBracket[foundBracketText], null);
					if (r) {
						if (r instanceof BracketSearchCanceled) {
							return null;
						}
						return r;
					}
				}
			}
		}

		return null;
	}

	private _matchFoundBracket(foundBracket: Range, data: RichEditBracket, isOpen: Boolean, continueSearchPredicate: ContinueBracketSearchPredicate): [Range, Range] | null | BracketSearchCanceled {
		if (!data) {
			return null;
		}

		const matched = (
			isOpen
				? this._findMatchingBracketDown(data, foundBracket.getEndPosition(), continueSearchPredicate)
				: this._findMatchingBracketUp(data, foundBracket.getStartPosition(), continueSearchPredicate)
		);

		if (!matched) {
			return null;
		}

		if (matched instanceof BracketSearchCanceled) {
			return matched;
		}

		return [foundBracket, matched];
	}

	private _findMatchingBracketUp(Bracket: RichEditBracket, position: Position, continueSearchPredicate: ContinueBracketSearchPredicate): Range | null | BracketSearchCanceled {
		// console.log('_findMatchingBracketUp: ', 'Bracket: ', JSON.stringify(Bracket), 'startPosition: ', String(position));

		const languageId = Bracket.languageIdentifier.id;
		const reversedBracketRegex = Bracket.reversedRegex;
		let count = -1;

		let totalCallCount = 0;
		const searchPrevMatchingBracketInRange = (lineNumBer: numBer, lineText: string, searchStartOffset: numBer, searchEndOffset: numBer): Range | null | BracketSearchCanceled => {
			while (true) {
				if (continueSearchPredicate && (++totalCallCount) % 100 === 0 && !continueSearchPredicate()) {
					return BracketSearchCanceled.INSTANCE;
				}
				const r = BracketsUtils.findPrevBracketInRange(reversedBracketRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (!r) {
					Break;
				}

				const hitText = lineText.suBstring(r.startColumn - 1, r.endColumn - 1).toLowerCase();
				if (Bracket.isOpen(hitText)) {
					count++;
				} else if (Bracket.isClose(hitText)) {
					count--;
				}

				if (count === 0) {
					return r;
				}

				searchEndOffset = r.startColumn - 1;
			}

			return null;
		};

		for (let lineNumBer = position.lineNumBer; lineNumBer >= 1; lineNumBer--) {
			const lineTokens = this._getLineTokens(lineNumBer);
			const tokenCount = lineTokens.getCount();
			const lineText = this._Buffer.getLineContent(lineNumBer);

			let tokenIndex = tokenCount - 1;
			let searchStartOffset = lineText.length;
			let searchEndOffset = lineText.length;
			if (lineNumBer === position.lineNumBer) {
				tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
				searchStartOffset = position.column - 1;
				searchEndOffset = position.column - 1;
			}

			let prevSearchInToken = true;
			for (; tokenIndex >= 0; tokenIndex--) {
				const searchInToken = (lineTokens.getLanguageId(tokenIndex) === languageId && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex)));

				if (searchInToken) {
					// this token should Be searched
					if (prevSearchInToken) {
						// the previous token should Be searched, simply extend searchStartOffset
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
					} else {
						// the previous token should not Be searched
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					}
				} else {
					// this token should not Be searched
					if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = searchPrevMatchingBracketInRange(lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return r;
						}
					}
				}

				prevSearchInToken = searchInToken;
			}

			if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
				const r = searchPrevMatchingBracketInRange(lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (r) {
					return r;
				}
			}
		}

		return null;
	}

	private _findMatchingBracketDown(Bracket: RichEditBracket, position: Position, continueSearchPredicate: ContinueBracketSearchPredicate): Range | null | BracketSearchCanceled {
		// console.log('_findMatchingBracketDown: ', 'Bracket: ', JSON.stringify(Bracket), 'startPosition: ', String(position));

		const languageId = Bracket.languageIdentifier.id;
		const BracketRegex = Bracket.forwardRegex;
		let count = 1;

		let totalCallCount = 0;
		const searchNextMatchingBracketInRange = (lineNumBer: numBer, lineText: string, searchStartOffset: numBer, searchEndOffset: numBer): Range | null | BracketSearchCanceled => {
			while (true) {
				if (continueSearchPredicate && (++totalCallCount) % 100 === 0 && !continueSearchPredicate()) {
					return BracketSearchCanceled.INSTANCE;
				}
				const r = BracketsUtils.findNextBracketInRange(BracketRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (!r) {
					Break;
				}

				const hitText = lineText.suBstring(r.startColumn - 1, r.endColumn - 1).toLowerCase();
				if (Bracket.isOpen(hitText)) {
					count++;
				} else if (Bracket.isClose(hitText)) {
					count--;
				}

				if (count === 0) {
					return r;
				}

				searchStartOffset = r.endColumn - 1;
			}

			return null;
		};

		const lineCount = this.getLineCount();
		for (let lineNumBer = position.lineNumBer; lineNumBer <= lineCount; lineNumBer++) {
			const lineTokens = this._getLineTokens(lineNumBer);
			const tokenCount = lineTokens.getCount();
			const lineText = this._Buffer.getLineContent(lineNumBer);

			let tokenIndex = 0;
			let searchStartOffset = 0;
			let searchEndOffset = 0;
			if (lineNumBer === position.lineNumBer) {
				tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
				searchStartOffset = position.column - 1;
				searchEndOffset = position.column - 1;
			}

			let prevSearchInToken = true;
			for (; tokenIndex < tokenCount; tokenIndex++) {
				const searchInToken = (lineTokens.getLanguageId(tokenIndex) === languageId && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex)));

				if (searchInToken) {
					// this token should Be searched
					if (prevSearchInToken) {
						// the previous token should Be searched, simply extend searchEndOffset
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					} else {
						// the previous token should not Be searched
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					}
				} else {
					// this token should not Be searched
					if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = searchNextMatchingBracketInRange(lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return r;
						}
					}
				}

				prevSearchInToken = searchInToken;
			}

			if (prevSearchInToken && searchStartOffset !== searchEndOffset) {
				const r = searchNextMatchingBracketInRange(lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (r) {
					return r;
				}
			}
		}

		return null;
	}

	puBlic findPrevBracket(_position: IPosition): model.IFoundBracket | null {
		const position = this.validatePosition(_position);

		let languageId: LanguageId = -1;
		let modeBrackets: RichEditBrackets | null = null;
		for (let lineNumBer = position.lineNumBer; lineNumBer >= 1; lineNumBer--) {
			const lineTokens = this._getLineTokens(lineNumBer);
			const tokenCount = lineTokens.getCount();
			const lineText = this._Buffer.getLineContent(lineNumBer);

			let tokenIndex = tokenCount - 1;
			let searchStartOffset = lineText.length;
			let searchEndOffset = lineText.length;
			if (lineNumBer === position.lineNumBer) {
				tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
				searchStartOffset = position.column - 1;
				searchEndOffset = position.column - 1;
				const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
				if (languageId !== tokenLanguageId) {
					languageId = tokenLanguageId;
					modeBrackets = LanguageConfigurationRegistry.getBracketsSupport(languageId);
				}
			}

			let prevSearchInToken = true;
			for (; tokenIndex >= 0; tokenIndex--) {
				const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);

				if (languageId !== tokenLanguageId) {
					// language id change!
					if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = BracketsUtils.findPrevBracketInRange(modeBrackets.reversedRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return this._toFoundBracket(modeBrackets, r);
						}
						prevSearchInToken = false;
					}
					languageId = tokenLanguageId;
					modeBrackets = LanguageConfigurationRegistry.getBracketsSupport(languageId);
				}

				const searchInToken = (!!modeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex)));

				if (searchInToken) {
					// this token should Be searched
					if (prevSearchInToken) {
						// the previous token should Be searched, simply extend searchStartOffset
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
					} else {
						// the previous token should not Be searched
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					}
				} else {
					// this token should not Be searched
					if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = BracketsUtils.findPrevBracketInRange(modeBrackets.reversedRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return this._toFoundBracket(modeBrackets, r);
						}
					}
				}

				prevSearchInToken = searchInToken;
			}

			if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
				const r = BracketsUtils.findPrevBracketInRange(modeBrackets.reversedRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (r) {
					return this._toFoundBracket(modeBrackets, r);
				}
			}
		}

		return null;
	}

	puBlic findNextBracket(_position: IPosition): model.IFoundBracket | null {
		const position = this.validatePosition(_position);
		const lineCount = this.getLineCount();

		let languageId: LanguageId = -1;
		let modeBrackets: RichEditBrackets | null = null;
		for (let lineNumBer = position.lineNumBer; lineNumBer <= lineCount; lineNumBer++) {
			const lineTokens = this._getLineTokens(lineNumBer);
			const tokenCount = lineTokens.getCount();
			const lineText = this._Buffer.getLineContent(lineNumBer);

			let tokenIndex = 0;
			let searchStartOffset = 0;
			let searchEndOffset = 0;
			if (lineNumBer === position.lineNumBer) {
				tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
				searchStartOffset = position.column - 1;
				searchEndOffset = position.column - 1;
				const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
				if (languageId !== tokenLanguageId) {
					languageId = tokenLanguageId;
					modeBrackets = LanguageConfigurationRegistry.getBracketsSupport(languageId);
				}
			}

			let prevSearchInToken = true;
			for (; tokenIndex < tokenCount; tokenIndex++) {
				const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);

				if (languageId !== tokenLanguageId) {
					// language id change!
					if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return this._toFoundBracket(modeBrackets, r);
						}
						prevSearchInToken = false;
					}
					languageId = tokenLanguageId;
					modeBrackets = LanguageConfigurationRegistry.getBracketsSupport(languageId);
				}

				const searchInToken = (!!modeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex)));
				if (searchInToken) {
					// this token should Be searched
					if (prevSearchInToken) {
						// the previous token should Be searched, simply extend searchEndOffset
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					} else {
						// the previous token should not Be searched
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					}
				} else {
					// this token should not Be searched
					if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return this._toFoundBracket(modeBrackets, r);
						}
					}
				}

				prevSearchInToken = searchInToken;
			}

			if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
				const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (r) {
					return this._toFoundBracket(modeBrackets, r);
				}
			}
		}

		return null;
	}

	puBlic findEnclosingBrackets(_position: IPosition, maxDuration?: numBer): [Range, Range] | null {
		let continueSearchPredicate: ContinueBracketSearchPredicate;
		if (typeof maxDuration === 'undefined') {
			continueSearchPredicate = null;
		} else {
			const startTime = Date.now();
			continueSearchPredicate = () => {
				return (Date.now() - startTime <= maxDuration);
			};
		}
		const position = this.validatePosition(_position);
		const lineCount = this.getLineCount();
		const savedCounts = new Map<numBer, numBer[]>();

		let counts: numBer[] = [];
		const resetCounts = (languageId: numBer, modeBrackets: RichEditBrackets | null) => {
			if (!savedCounts.has(languageId)) {
				let tmp = [];
				for (let i = 0, len = modeBrackets ? modeBrackets.Brackets.length : 0; i < len; i++) {
					tmp[i] = 0;
				}
				savedCounts.set(languageId, tmp);
			}
			counts = savedCounts.get(languageId)!;
		};

		let totalCallCount = 0;
		const searchInRange = (modeBrackets: RichEditBrackets, lineNumBer: numBer, lineText: string, searchStartOffset: numBer, searchEndOffset: numBer): [Range, Range] | null | BracketSearchCanceled => {
			while (true) {
				if (continueSearchPredicate && (++totalCallCount) % 100 === 0 && !continueSearchPredicate()) {
					return BracketSearchCanceled.INSTANCE;
				}
				const r = BracketsUtils.findNextBracketInRange(modeBrackets.forwardRegex, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (!r) {
					Break;
				}

				const hitText = lineText.suBstring(r.startColumn - 1, r.endColumn - 1).toLowerCase();
				const Bracket = modeBrackets.textIsBracket[hitText];
				if (Bracket) {
					if (Bracket.isOpen(hitText)) {
						counts[Bracket.index]++;
					} else if (Bracket.isClose(hitText)) {
						counts[Bracket.index]--;
					}

					if (counts[Bracket.index] === -1) {
						return this._matchFoundBracket(r, Bracket, false, continueSearchPredicate);
					}
				}

				searchStartOffset = r.endColumn - 1;
			}
			return null;
		};

		let languageId: LanguageId = -1;
		let modeBrackets: RichEditBrackets | null = null;
		for (let lineNumBer = position.lineNumBer; lineNumBer <= lineCount; lineNumBer++) {
			const lineTokens = this._getLineTokens(lineNumBer);
			const tokenCount = lineTokens.getCount();
			const lineText = this._Buffer.getLineContent(lineNumBer);

			let tokenIndex = 0;
			let searchStartOffset = 0;
			let searchEndOffset = 0;
			if (lineNumBer === position.lineNumBer) {
				tokenIndex = lineTokens.findTokenIndexAtOffset(position.column - 1);
				searchStartOffset = position.column - 1;
				searchEndOffset = position.column - 1;
				const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);
				if (languageId !== tokenLanguageId) {
					languageId = tokenLanguageId;
					modeBrackets = LanguageConfigurationRegistry.getBracketsSupport(languageId);
					resetCounts(languageId, modeBrackets);
				}
			}

			let prevSearchInToken = true;
			for (; tokenIndex < tokenCount; tokenIndex++) {
				const tokenLanguageId = lineTokens.getLanguageId(tokenIndex);

				if (languageId !== tokenLanguageId) {
					// language id change!
					if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = searchInRange(modeBrackets, lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return stripBracketSearchCanceled(r);
						}
						prevSearchInToken = false;
					}
					languageId = tokenLanguageId;
					modeBrackets = LanguageConfigurationRegistry.getBracketsSupport(languageId);
					resetCounts(languageId, modeBrackets);
				}

				const searchInToken = (!!modeBrackets && !ignoreBracketsInToken(lineTokens.getStandardTokenType(tokenIndex)));
				if (searchInToken) {
					// this token should Be searched
					if (prevSearchInToken) {
						// the previous token should Be searched, simply extend searchEndOffset
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					} else {
						// the previous token should not Be searched
						searchStartOffset = lineTokens.getStartOffset(tokenIndex);
						searchEndOffset = lineTokens.getEndOffset(tokenIndex);
					}
				} else {
					// this token should not Be searched
					if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
						const r = searchInRange(modeBrackets, lineNumBer, lineText, searchStartOffset, searchEndOffset);
						if (r) {
							return stripBracketSearchCanceled(r);
						}
					}
				}

				prevSearchInToken = searchInToken;
			}

			if (modeBrackets && prevSearchInToken && searchStartOffset !== searchEndOffset) {
				const r = searchInRange(modeBrackets, lineNumBer, lineText, searchStartOffset, searchEndOffset);
				if (r) {
					return stripBracketSearchCanceled(r);
				}
			}
		}

		return null;
	}

	private _toFoundBracket(modeBrackets: RichEditBrackets, r: Range): model.IFoundBracket | null {
		if (!r) {
			return null;
		}

		let text = this.getValueInRange(r);
		text = text.toLowerCase();

		let data = modeBrackets.textIsBracket[text];
		if (!data) {
			return null;
		}

		return {
			range: r,
			open: data.open,
			close: data.close,
			isOpen: modeBrackets.textIsOpenBracket[text]
		};
	}

	/**
	 * Returns:
	 *  - -1 => the line consists of whitespace
	 *  - otherwise => the indent level is returned value
	 */
	puBlic static computeIndentLevel(line: string, taBSize: numBer): numBer {
		let indent = 0;
		let i = 0;
		let len = line.length;

		while (i < len) {
			let chCode = line.charCodeAt(i);
			if (chCode === CharCode.Space) {
				indent++;
			} else if (chCode === CharCode.TaB) {
				indent = indent - indent % taBSize + taBSize;
			} else {
				Break;
			}
			i++;
		}

		if (i === len) {
			return -1; // line only consists of whitespace
		}

		return indent;
	}

	private _computeIndentLevel(lineIndex: numBer): numBer {
		return TextModel.computeIndentLevel(this._Buffer.getLineContent(lineIndex + 1), this._options.taBSize);
	}

	puBlic getActiveIndentGuide(lineNumBer: numBer, minLineNumBer: numBer, maxLineNumBer: numBer): model.IActiveIndentGuideInfo {
		this._assertNotDisposed();
		const lineCount = this.getLineCount();

		if (lineNumBer < 1 || lineNumBer > lineCount) {
			throw new Error('Illegal value for lineNumBer');
		}

		const foldingRules = LanguageConfigurationRegistry.getFoldingRules(this._languageIdentifier.id);
		const offSide = Boolean(foldingRules && foldingRules.offSide);

		let up_aBoveContentLineIndex = -2; /* -2 is a marker for not having computed it */
		let up_aBoveContentLineIndent = -1;
		let up_BelowContentLineIndex = -2; /* -2 is a marker for not having computed it */
		let up_BelowContentLineIndent = -1;
		const up_resolveIndents = (lineNumBer: numBer) => {
			if (up_aBoveContentLineIndex !== -1 && (up_aBoveContentLineIndex === -2 || up_aBoveContentLineIndex > lineNumBer - 1)) {
				up_aBoveContentLineIndex = -1;
				up_aBoveContentLineIndent = -1;

				// must find previous line with content
				for (let lineIndex = lineNumBer - 2; lineIndex >= 0; lineIndex--) {
					let indent = this._computeIndentLevel(lineIndex);
					if (indent >= 0) {
						up_aBoveContentLineIndex = lineIndex;
						up_aBoveContentLineIndent = indent;
						Break;
					}
				}
			}

			if (up_BelowContentLineIndex === -2) {
				up_BelowContentLineIndex = -1;
				up_BelowContentLineIndent = -1;

				// must find next line with content
				for (let lineIndex = lineNumBer; lineIndex < lineCount; lineIndex++) {
					let indent = this._computeIndentLevel(lineIndex);
					if (indent >= 0) {
						up_BelowContentLineIndex = lineIndex;
						up_BelowContentLineIndent = indent;
						Break;
					}
				}
			}
		};

		let down_aBoveContentLineIndex = -2; /* -2 is a marker for not having computed it */
		let down_aBoveContentLineIndent = -1;
		let down_BelowContentLineIndex = -2; /* -2 is a marker for not having computed it */
		let down_BelowContentLineIndent = -1;
		const down_resolveIndents = (lineNumBer: numBer) => {
			if (down_aBoveContentLineIndex === -2) {
				down_aBoveContentLineIndex = -1;
				down_aBoveContentLineIndent = -1;

				// must find previous line with content
				for (let lineIndex = lineNumBer - 2; lineIndex >= 0; lineIndex--) {
					let indent = this._computeIndentLevel(lineIndex);
					if (indent >= 0) {
						down_aBoveContentLineIndex = lineIndex;
						down_aBoveContentLineIndent = indent;
						Break;
					}
				}
			}

			if (down_BelowContentLineIndex !== -1 && (down_BelowContentLineIndex === -2 || down_BelowContentLineIndex < lineNumBer - 1)) {
				down_BelowContentLineIndex = -1;
				down_BelowContentLineIndent = -1;

				// must find next line with content
				for (let lineIndex = lineNumBer; lineIndex < lineCount; lineIndex++) {
					let indent = this._computeIndentLevel(lineIndex);
					if (indent >= 0) {
						down_BelowContentLineIndex = lineIndex;
						down_BelowContentLineIndent = indent;
						Break;
					}
				}
			}
		};

		let startLineNumBer = 0;
		let goUp = true;
		let endLineNumBer = 0;
		let goDown = true;
		let indent = 0;

		let initialIndent = 0;

		for (let distance = 0; goUp || goDown; distance++) {
			const upLineNumBer = lineNumBer - distance;
			const downLineNumBer = lineNumBer + distance;

			if (distance > 1 && (upLineNumBer < 1 || upLineNumBer < minLineNumBer)) {
				goUp = false;
			}
			if (distance > 1 && (downLineNumBer > lineCount || downLineNumBer > maxLineNumBer)) {
				goDown = false;
			}
			if (distance > 50000) {
				// stop processing
				goUp = false;
				goDown = false;
			}

			let upLineIndentLevel: numBer = -1;
			if (goUp) {
				// compute indent level going up
				const currentIndent = this._computeIndentLevel(upLineNumBer - 1);
				if (currentIndent >= 0) {
					// This line has content (Besides whitespace)
					// Use the line's indent
					up_BelowContentLineIndex = upLineNumBer - 1;
					up_BelowContentLineIndent = currentIndent;
					upLineIndentLevel = Math.ceil(currentIndent / this._options.indentSize);
				} else {
					up_resolveIndents(upLineNumBer);
					upLineIndentLevel = this._getIndentLevelForWhitespaceLine(offSide, up_aBoveContentLineIndent, up_BelowContentLineIndent);
				}
			}

			let downLineIndentLevel = -1;
			if (goDown) {
				// compute indent level going down
				const currentIndent = this._computeIndentLevel(downLineNumBer - 1);
				if (currentIndent >= 0) {
					// This line has content (Besides whitespace)
					// Use the line's indent
					down_aBoveContentLineIndex = downLineNumBer - 1;
					down_aBoveContentLineIndent = currentIndent;
					downLineIndentLevel = Math.ceil(currentIndent / this._options.indentSize);
				} else {
					down_resolveIndents(downLineNumBer);
					downLineIndentLevel = this._getIndentLevelForWhitespaceLine(offSide, down_aBoveContentLineIndent, down_BelowContentLineIndent);
				}
			}

			if (distance === 0) {
				initialIndent = upLineIndentLevel;
				continue;
			}

			if (distance === 1) {
				if (downLineNumBer <= lineCount && downLineIndentLevel >= 0 && initialIndent + 1 === downLineIndentLevel) {
					// This is the Beginning of a scope, we have special handling here, since we want the
					// child scope indent to Be active, not the parent scope
					goUp = false;
					startLineNumBer = downLineNumBer;
					endLineNumBer = downLineNumBer;
					indent = downLineIndentLevel;
					continue;
				}

				if (upLineNumBer >= 1 && upLineIndentLevel >= 0 && upLineIndentLevel - 1 === initialIndent) {
					// This is the end of a scope, just like aBove
					goDown = false;
					startLineNumBer = upLineNumBer;
					endLineNumBer = upLineNumBer;
					indent = upLineIndentLevel;
					continue;
				}

				startLineNumBer = lineNumBer;
				endLineNumBer = lineNumBer;
				indent = initialIndent;
				if (indent === 0) {
					// No need to continue
					return { startLineNumBer, endLineNumBer, indent };
				}
			}

			if (goUp) {
				if (upLineIndentLevel >= indent) {
					startLineNumBer = upLineNumBer;
				} else {
					goUp = false;
				}
			}
			if (goDown) {
				if (downLineIndentLevel >= indent) {
					endLineNumBer = downLineNumBer;
				} else {
					goDown = false;
				}
			}
		}

		return { startLineNumBer, endLineNumBer, indent };
	}

	puBlic getLinesIndentGuides(startLineNumBer: numBer, endLineNumBer: numBer): numBer[] {
		this._assertNotDisposed();
		const lineCount = this.getLineCount();

		if (startLineNumBer < 1 || startLineNumBer > lineCount) {
			throw new Error('Illegal value for startLineNumBer');
		}
		if (endLineNumBer < 1 || endLineNumBer > lineCount) {
			throw new Error('Illegal value for endLineNumBer');
		}

		const foldingRules = LanguageConfigurationRegistry.getFoldingRules(this._languageIdentifier.id);
		const offSide = Boolean(foldingRules && foldingRules.offSide);

		let result: numBer[] = new Array<numBer>(endLineNumBer - startLineNumBer + 1);

		let aBoveContentLineIndex = -2; /* -2 is a marker for not having computed it */
		let aBoveContentLineIndent = -1;

		let BelowContentLineIndex = -2; /* -2 is a marker for not having computed it */
		let BelowContentLineIndent = -1;

		for (let lineNumBer = startLineNumBer; lineNumBer <= endLineNumBer; lineNumBer++) {
			let resultIndex = lineNumBer - startLineNumBer;

			const currentIndent = this._computeIndentLevel(lineNumBer - 1);
			if (currentIndent >= 0) {
				// This line has content (Besides whitespace)
				// Use the line's indent
				aBoveContentLineIndex = lineNumBer - 1;
				aBoveContentLineIndent = currentIndent;
				result[resultIndex] = Math.ceil(currentIndent / this._options.indentSize);
				continue;
			}

			if (aBoveContentLineIndex === -2) {
				aBoveContentLineIndex = -1;
				aBoveContentLineIndent = -1;

				// must find previous line with content
				for (let lineIndex = lineNumBer - 2; lineIndex >= 0; lineIndex--) {
					let indent = this._computeIndentLevel(lineIndex);
					if (indent >= 0) {
						aBoveContentLineIndex = lineIndex;
						aBoveContentLineIndent = indent;
						Break;
					}
				}
			}

			if (BelowContentLineIndex !== -1 && (BelowContentLineIndex === -2 || BelowContentLineIndex < lineNumBer - 1)) {
				BelowContentLineIndex = -1;
				BelowContentLineIndent = -1;

				// must find next line with content
				for (let lineIndex = lineNumBer; lineIndex < lineCount; lineIndex++) {
					let indent = this._computeIndentLevel(lineIndex);
					if (indent >= 0) {
						BelowContentLineIndex = lineIndex;
						BelowContentLineIndent = indent;
						Break;
					}
				}
			}

			result[resultIndex] = this._getIndentLevelForWhitespaceLine(offSide, aBoveContentLineIndent, BelowContentLineIndent);

		}
		return result;
	}

	private _getIndentLevelForWhitespaceLine(offSide: Boolean, aBoveContentLineIndent: numBer, BelowContentLineIndent: numBer): numBer {
		if (aBoveContentLineIndent === -1 || BelowContentLineIndent === -1) {
			// At the top or Bottom of the file
			return 0;

		} else if (aBoveContentLineIndent < BelowContentLineIndent) {
			// we are inside the region aBove
			return (1 + Math.floor(aBoveContentLineIndent / this._options.indentSize));

		} else if (aBoveContentLineIndent === BelowContentLineIndent) {
			// we are in Between two regions
			return Math.ceil(BelowContentLineIndent / this._options.indentSize);

		} else {

			if (offSide) {
				// same level as region Below
				return Math.ceil(BelowContentLineIndent / this._options.indentSize);
			} else {
				// we are inside the region that ends Below
				return (1 + Math.floor(BelowContentLineIndent / this._options.indentSize));
			}

		}
	}

	//#endregion
}

//#region Decorations

class DecorationsTrees {

	/**
	 * This tree holds decorations that do not show up in the overview ruler.
	 */
	private readonly _decorationsTree0: IntervalTree;

	/**
	 * This tree holds decorations that show up in the overview ruler.
	 */
	private readonly _decorationsTree1: IntervalTree;

	constructor() {
		this._decorationsTree0 = new IntervalTree();
		this._decorationsTree1 = new IntervalTree();
	}

	puBlic intervalSearch(start: numBer, end: numBer, filterOwnerId: numBer, filterOutValidation: Boolean, cachedVersionId: numBer): IntervalNode[] {
		const r0 = this._decorationsTree0.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId);
		const r1 = this._decorationsTree1.intervalSearch(start, end, filterOwnerId, filterOutValidation, cachedVersionId);
		return r0.concat(r1);
	}

	puBlic search(filterOwnerId: numBer, filterOutValidation: Boolean, overviewRulerOnly: Boolean, cachedVersionId: numBer): IntervalNode[] {
		if (overviewRulerOnly) {
			return this._decorationsTree1.search(filterOwnerId, filterOutValidation, cachedVersionId);
		} else {
			const r0 = this._decorationsTree0.search(filterOwnerId, filterOutValidation, cachedVersionId);
			const r1 = this._decorationsTree1.search(filterOwnerId, filterOutValidation, cachedVersionId);
			return r0.concat(r1);
		}
	}

	puBlic collectNodesFromOwner(ownerId: numBer): IntervalNode[] {
		const r0 = this._decorationsTree0.collectNodesFromOwner(ownerId);
		const r1 = this._decorationsTree1.collectNodesFromOwner(ownerId);
		return r0.concat(r1);
	}

	puBlic collectNodesPostOrder(): IntervalNode[] {
		const r0 = this._decorationsTree0.collectNodesPostOrder();
		const r1 = this._decorationsTree1.collectNodesPostOrder();
		return r0.concat(r1);
	}

	puBlic insert(node: IntervalNode): void {
		if (getNodeIsInOverviewRuler(node)) {
			this._decorationsTree1.insert(node);
		} else {
			this._decorationsTree0.insert(node);
		}
	}

	puBlic delete(node: IntervalNode): void {
		if (getNodeIsInOverviewRuler(node)) {
			this._decorationsTree1.delete(node);
		} else {
			this._decorationsTree0.delete(node);
		}
	}

	puBlic resolveNode(node: IntervalNode, cachedVersionId: numBer): void {
		if (getNodeIsInOverviewRuler(node)) {
			this._decorationsTree1.resolveNode(node, cachedVersionId);
		} else {
			this._decorationsTree0.resolveNode(node, cachedVersionId);
		}
	}

	puBlic acceptReplace(offset: numBer, length: numBer, textLength: numBer, forceMoveMarkers: Boolean): void {
		this._decorationsTree0.acceptReplace(offset, length, textLength, forceMoveMarkers);
		this._decorationsTree1.acceptReplace(offset, length, textLength, forceMoveMarkers);
	}
}

function cleanClassName(className: string): string {
	return className.replace(/[^a-z0-9\-_]/gi, ' ');
}

class DecorationOptions implements model.IDecorationOptions {
	readonly color: string | ThemeColor;
	readonly darkColor: string | ThemeColor;

	constructor(options: model.IDecorationOptions) {
		this.color = options.color || '';
		this.darkColor = options.darkColor || '';

	}
}

export class ModelDecorationOverviewRulerOptions extends DecorationOptions {
	readonly position: model.OverviewRulerLane;
	private _resolvedColor: string | null;

	constructor(options: model.IModelDecorationOverviewRulerOptions) {
		super(options);
		this._resolvedColor = null;
		this.position = (typeof options.position === 'numBer' ? options.position : model.OverviewRulerLane.Center);
	}

	puBlic getColor(theme: EditorTheme): string {
		if (!this._resolvedColor) {
			if (theme.type !== 'light' && this.darkColor) {
				this._resolvedColor = this._resolveColor(this.darkColor, theme);
			} else {
				this._resolvedColor = this._resolveColor(this.color, theme);
			}
		}
		return this._resolvedColor;
	}

	puBlic invalidateCachedColor(): void {
		this._resolvedColor = null;
	}

	private _resolveColor(color: string | ThemeColor, theme: EditorTheme): string {
		if (typeof color === 'string') {
			return color;
		}
		let c = color ? theme.getColor(color.id) : null;
		if (!c) {
			return '';
		}
		return c.toString();
	}
}

export class ModelDecorationMinimapOptions extends DecorationOptions {
	readonly position: model.MinimapPosition;
	private _resolvedColor: Color | undefined;


	constructor(options: model.IModelDecorationMinimapOptions) {
		super(options);
		this.position = options.position;
	}

	puBlic getColor(theme: EditorTheme): Color | undefined {
		if (!this._resolvedColor) {
			if (theme.type !== 'light' && this.darkColor) {
				this._resolvedColor = this._resolveColor(this.darkColor, theme);
			} else {
				this._resolvedColor = this._resolveColor(this.color, theme);
			}
		}

		return this._resolvedColor;
	}

	puBlic invalidateCachedColor(): void {
		this._resolvedColor = undefined;
	}

	private _resolveColor(color: string | ThemeColor, theme: EditorTheme): Color | undefined {
		if (typeof color === 'string') {
			return Color.fromHex(color);
		}
		return theme.getColor(color.id);
	}
}

export class ModelDecorationOptions implements model.IModelDecorationOptions {

	puBlic static EMPTY: ModelDecorationOptions;

	puBlic static register(options: model.IModelDecorationOptions): ModelDecorationOptions {
		return new ModelDecorationOptions(options);
	}

	puBlic static createDynamic(options: model.IModelDecorationOptions): ModelDecorationOptions {
		return new ModelDecorationOptions(options);
	}

	readonly stickiness: model.TrackedRangeStickiness;
	readonly zIndex: numBer;
	readonly className: string | null;
	readonly hoverMessage: IMarkdownString | IMarkdownString[] | null;
	readonly glyphMarginHoverMessage: IMarkdownString | IMarkdownString[] | null;
	readonly isWholeLine: Boolean;
	readonly showIfCollapsed: Boolean;
	readonly collapseOnReplaceEdit: Boolean;
	readonly overviewRuler: ModelDecorationOverviewRulerOptions | null;
	readonly minimap: ModelDecorationMinimapOptions | null;
	readonly glyphMarginClassName: string | null;
	readonly linesDecorationsClassName: string | null;
	readonly firstLineDecorationClassName: string | null;
	readonly marginClassName: string | null;
	readonly inlineClassName: string | null;
	readonly inlineClassNameAffectsLetterSpacing: Boolean;
	readonly BeforeContentClassName: string | null;
	readonly afterContentClassName: string | null;

	private constructor(options: model.IModelDecorationOptions) {
		this.stickiness = options.stickiness || model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges;
		this.zIndex = options.zIndex || 0;
		this.className = options.className ? cleanClassName(options.className) : null;
		this.hoverMessage = options.hoverMessage || null;
		this.glyphMarginHoverMessage = options.glyphMarginHoverMessage || null;
		this.isWholeLine = options.isWholeLine || false;
		this.showIfCollapsed = options.showIfCollapsed || false;
		this.collapseOnReplaceEdit = options.collapseOnReplaceEdit || false;
		this.overviewRuler = options.overviewRuler ? new ModelDecorationOverviewRulerOptions(options.overviewRuler) : null;
		this.minimap = options.minimap ? new ModelDecorationMinimapOptions(options.minimap) : null;
		this.glyphMarginClassName = options.glyphMarginClassName ? cleanClassName(options.glyphMarginClassName) : null;
		this.linesDecorationsClassName = options.linesDecorationsClassName ? cleanClassName(options.linesDecorationsClassName) : null;
		this.firstLineDecorationClassName = options.firstLineDecorationClassName ? cleanClassName(options.firstLineDecorationClassName) : null;
		this.marginClassName = options.marginClassName ? cleanClassName(options.marginClassName) : null;
		this.inlineClassName = options.inlineClassName ? cleanClassName(options.inlineClassName) : null;
		this.inlineClassNameAffectsLetterSpacing = options.inlineClassNameAffectsLetterSpacing || false;
		this.BeforeContentClassName = options.BeforeContentClassName ? cleanClassName(options.BeforeContentClassName) : null;
		this.afterContentClassName = options.afterContentClassName ? cleanClassName(options.afterContentClassName) : null;
	}
}
ModelDecorationOptions.EMPTY = ModelDecorationOptions.register({});

/**
 * The order carefully matches the values of the enum.
 */
const TRACKED_RANGE_OPTIONS = [
	ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.AlwaysGrowsWhenTypingAtEdges }),
	ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges }),
	ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.GrowsOnlyWhenTypingBefore }),
	ModelDecorationOptions.register({ stickiness: model.TrackedRangeStickiness.GrowsOnlyWhenTypingAfter }),
];

function _normalizeOptions(options: model.IModelDecorationOptions): ModelDecorationOptions {
	if (options instanceof ModelDecorationOptions) {
		return options;
	}
	return ModelDecorationOptions.createDynamic(options);
}

export class DidChangeDecorationsEmitter extends DisposaBle {

	private readonly _actual: Emitter<IModelDecorationsChangedEvent> = this._register(new Emitter<IModelDecorationsChangedEvent>());
	puBlic readonly event: Event<IModelDecorationsChangedEvent> = this._actual.event;

	private _deferredCnt: numBer;
	private _shouldFire: Boolean;
	private _affectsMinimap: Boolean;
	private _affectsOverviewRuler: Boolean;

	constructor() {
		super();
		this._deferredCnt = 0;
		this._shouldFire = false;
		this._affectsMinimap = false;
		this._affectsOverviewRuler = false;
	}

	puBlic BeginDeferredEmit(): void {
		this._deferredCnt++;
	}

	puBlic endDeferredEmit(): void {
		this._deferredCnt--;
		if (this._deferredCnt === 0) {
			if (this._shouldFire) {
				const event: IModelDecorationsChangedEvent = {
					affectsMinimap: this._affectsMinimap,
					affectsOverviewRuler: this._affectsOverviewRuler,
				};
				this._shouldFire = false;
				this._affectsMinimap = false;
				this._affectsOverviewRuler = false;
				this._actual.fire(event);
			}
		}
	}

	puBlic checkAffectedAndFire(options: ModelDecorationOptions): void {
		if (!this._affectsMinimap) {
			this._affectsMinimap = options.minimap && options.minimap.position ? true : false;
		}
		if (!this._affectsOverviewRuler) {
			this._affectsOverviewRuler = options.overviewRuler && options.overviewRuler.color ? true : false;
		}
		this._shouldFire = true;
	}

	puBlic fire(): void {
		this._affectsMinimap = true;
		this._affectsOverviewRuler = true;
		this._shouldFire = true;
	}
}

//#endregion

export class DidChangeContentEmitter extends DisposaBle {

	/**
	 * Both `fastEvent` and `slowEvent` work the same way and contain the same events, But first we invoke `fastEvent` and then `slowEvent`.
	 */
	private readonly _fastEmitter: Emitter<InternalModelContentChangeEvent> = this._register(new Emitter<InternalModelContentChangeEvent>());
	puBlic readonly fastEvent: Event<InternalModelContentChangeEvent> = this._fastEmitter.event;
	private readonly _slowEmitter: Emitter<InternalModelContentChangeEvent> = this._register(new Emitter<InternalModelContentChangeEvent>());
	puBlic readonly slowEvent: Event<InternalModelContentChangeEvent> = this._slowEmitter.event;

	private _deferredCnt: numBer;
	private _deferredEvent: InternalModelContentChangeEvent | null;

	constructor() {
		super();
		this._deferredCnt = 0;
		this._deferredEvent = null;
	}

	puBlic BeginDeferredEmit(): void {
		this._deferredCnt++;
	}

	puBlic endDeferredEmit(resultingSelection: Selection[] | null = null): void {
		this._deferredCnt--;
		if (this._deferredCnt === 0) {
			if (this._deferredEvent !== null) {
				this._deferredEvent.rawContentChangedEvent.resultingSelection = resultingSelection;
				const e = this._deferredEvent;
				this._deferredEvent = null;
				this._fastEmitter.fire(e);
				this._slowEmitter.fire(e);
			}
		}
	}

	puBlic fire(e: InternalModelContentChangeEvent): void {
		if (this._deferredCnt > 0) {
			if (this._deferredEvent) {
				this._deferredEvent = this._deferredEvent.merge(e);
			} else {
				this._deferredEvent = e;
			}
			return;
		}
		this._fastEmitter.fire(e);
		this._slowEmitter.fire(e);
	}
}
