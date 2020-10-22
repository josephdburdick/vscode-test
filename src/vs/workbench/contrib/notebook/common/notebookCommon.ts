/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from 'vs/Base/common/cancellation';
import { IDiffResult, ISequence } from 'vs/Base/common/diff/diff';
import { Event } from 'vs/Base/common/event';
import * as gloB from 'vs/Base/common/gloB';
import * as UUID from 'vs/Base/common/uuid';
import { Schemas } from 'vs/Base/common/network';
import { Basename } from 'vs/Base/common/path';
import { isWindows } from 'vs/Base/common/platform';
import { ISplice } from 'vs/Base/common/sequence';
import { URI, UriComponents } from 'vs/Base/common/uri';
import * as editorCommon from 'vs/editor/common/editorCommon';
import { Command } from 'vs/editor/common/modes';
import { IAccessiBilityInformation } from 'vs/platform/accessiBility/common/accessiBility';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IEditorModel } from 'vs/platform/editor/common/editor';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';
import { IRevertOptions } from 'vs/workBench/common/editor';
import { NoteBookTextModel } from 'vs/workBench/contriB/noteBook/common/model/noteBookTextModel';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { IFileStatWithMetadata } from 'vs/platform/files/common/files';
import { ThemeColor } from 'vs/platform/theme/common/themeService';

export enum CellKind {
	Markdown = 1,
	Code = 2
}

export enum CellOutputKind {
	Text = 1,
	Error = 2,
	Rich = 3
}

export const NOTEBOOK_DISPLAY_ORDER = [
	'application/json',
	'application/javascript',
	'text/html',
	'image/svg+xml',
	'text/markdown',
	'image/png',
	'image/jpeg',
	'text/plain'
];

export const ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER = [
	'text/markdown',
	'application/json',
	'text/plain',
	'text/html',
	'image/svg+xml',
	'image/png',
	'image/jpeg',
];

export const BUILTIN_RENDERER_ID = '_Builtin';

export enum NoteBookRunState {
	Running = 1,
	Idle = 2
}

export const noteBookDocumentMetadataDefaults: Required<NoteBookDocumentMetadata> = {
	editaBle: true,
	runnaBle: true,
	cellEditaBle: true,
	cellRunnaBle: true,
	cellHasExecutionOrder: true,
	displayOrder: NOTEBOOK_DISPLAY_ORDER,
	custom: {},
	runState: NoteBookRunState.Idle
};

export interface NoteBookDocumentMetadata {
	editaBle: Boolean;
	runnaBle: Boolean;
	cellEditaBle: Boolean;
	cellRunnaBle: Boolean;
	cellHasExecutionOrder: Boolean;
	displayOrder?: (string | gloB.IRelativePattern)[];
	custom?: { [key: string]: unknown };
	runState?: NoteBookRunState;
}

export enum NoteBookCellRunState {
	Running = 1,
	Idle = 2,
	Success = 3,
	Error = 4
}

export interface NoteBookCellMetadata {
	editaBle?: Boolean;
	runnaBle?: Boolean;
	BreakpointMargin?: Boolean;
	hasExecutionOrder?: Boolean;
	executionOrder?: numBer;
	statusMessage?: string;
	runState?: NoteBookCellRunState;
	runStartTime?: numBer;
	lastRunDuration?: numBer;
	inputCollapsed?: Boolean;
	outputCollapsed?: Boolean;
	custom?: { [key: string]: unknown };
}

export type TransientMetadata = { [K in keyof NoteBookCellMetadata]?: Boolean };

export interface TransientOptions {
	transientOutputs: Boolean;
	transientMetadata: TransientMetadata;
}

export interface INoteBookDisplayOrder {
	defaultOrder: string[];
	userOrder?: string[];
}

export interface INoteBookMimeTypeSelector {
	mimeTypes?: string[];
}

export interface INoteBookRendererInfo {
	id: string;
	displayName: string;
	entrypoint: URI;
	preloads: ReadonlyArray<URI>;
	extensionLocation: URI;
	extensionId: ExtensionIdentifier;

	matches(mimeType: string): Boolean;
}

export interface IStreamOutput {
	outputKind: CellOutputKind.Text;
	text: string;
}

export interface IErrorOutput {
	outputKind: CellOutputKind.Error;
	/**
	 * Exception Name
	 */
	ename: string;
	/**
	 * Exception Value
	 */
	evalue: string;
	/**
	 * Exception call stacks
	 */
	traceBack: string[];
}

export interface NoteBookCellOutputMetadata {
	/**
	 * Additional attriButes of a cell metadata.
	 */
	custom?: { [key: string]: unknown };
}

export interface IDisplayOutput {
	outputKind: CellOutputKind.Rich;
	/**
	 * { mime_type: value }
	 */
	data: { [key: string]: unknown; }

	metadata?: NoteBookCellOutputMetadata;
}

export enum MimeTypeRendererResolver {
	Core,
	Active,
	Lazy
}

export interface IOrderedMimeType {
	mimeType: string;
	rendererId: string;
}

export interface ITransformedDisplayOutputDto {
	outputKind: CellOutputKind.Rich;
	outputId: string;
	data: { [key: string]: unknown; }
	metadata?: NoteBookCellOutputMetadata;

	orderedMimeTypes?: IOrderedMimeType[];
	pickedMimeTypeIndex?: numBer;
}

export function isTransformedDisplayOutput(thing: unknown): thing is ITransformedDisplayOutputDto {
	return (thing as ITransformedDisplayOutputDto).outputKind === CellOutputKind.Rich && !!(thing as ITransformedDisplayOutputDto).outputId;
}

export interface IGenericOutput {
	outputKind: CellOutputKind;
	pickedMimeType?: string;
	pickedRenderer?: numBer;
	transformedOutput?: { [key: string]: IDisplayOutput };
}


export const addIdToOutput = (output: IRawOutput, id = UUID.generateUuid()): IProcessedOutput => output.outputKind === CellOutputKind.Rich
	? ({ ...output, outputId: id }) : output;


export type IProcessedOutput = ITransformedDisplayOutputDto | IStreamOutput | IErrorOutput;

export type IRawOutput = IDisplayOutput | IStreamOutput | IErrorOutput;

export interface IOutputRenderRequestOutputInfo {
	index: numBer;
	outputId: string;
	handlerId: string;
	mimeType: string;
	output?: IRawOutput;
}

export interface IOutputRenderRequestCellInfo<T> {
	key: T;
	outputs: IOutputRenderRequestOutputInfo[];
}

export interface IOutputRenderRequest<T> {
	items: IOutputRenderRequestCellInfo<T>[];
}

export interface IOutputRenderResponseOutputInfo {
	index: numBer;
	outputId: string;
	mimeType: string;
	handlerId: string;
	transformedOutput: string;
}

export interface IOutputRenderResponseCellInfo<T> {
	key: T;
	outputs: IOutputRenderResponseOutputInfo[];
}


export interface IOutputRenderResponse<T> {
	items: IOutputRenderResponseCellInfo<T>[];
}


export interface ICell {
	readonly uri: URI;
	handle: numBer;
	language: string;
	cellKind: CellKind;
	outputs: IProcessedOutput[];
	metadata?: NoteBookCellMetadata;
	onDidChangeOutputs?: Event<NoteBookCellOutputsSplice[]>;
	onDidChangeLanguage: Event<string>;
	onDidChangeMetadata: Event<void>;
}

export interface LanguageInfo {
	file_extension: string;
}

export interface IMetadata {
	language_info: LanguageInfo;
}

export interface INoteBookTextModel {
	readonly viewType: string;
	metadata: NoteBookDocumentMetadata
	readonly uri: URI;
	readonly versionId: numBer;
	languages: string[];
	readonly cells: readonly ICell[];
	onWillDispose(listener: () => void): IDisposaBle;
}

export const enum RenderOutputType {
	None,
	Html,
	Extension
}

export interface IRenderNoOutput {
	type: RenderOutputType.None;
	hasDynamicHeight: Boolean;
}

export interface IRenderPlainHtmlOutput {
	type: RenderOutputType.Html;
	source: ITransformedDisplayOutputDto;
	htmlContent: string;
	hasDynamicHeight: Boolean;
}

export interface IRenderOutputViaExtension {
	type: RenderOutputType.Extension;
	source: ITransformedDisplayOutputDto;
	mimeType: string;
	renderer: INoteBookRendererInfo;
}

export type IInsetRenderOutput = IRenderPlainHtmlOutput | IRenderOutputViaExtension;
export type IRenderOutput = IRenderNoOutput | IInsetRenderOutput;

export const outputHasDynamicHeight = (o: IRenderOutput) => o.type !== RenderOutputType.Extension && o.hasDynamicHeight;

export type NoteBookCellTextModelSplice<T> = [
	numBer /* start */,
	numBer,
	T[]
];

export type NoteBookCellOutputsSplice = [
	numBer /* start */,
	numBer /* delete count */,
	IProcessedOutput[]
];

export interface IMainCellDto {
	handle: numBer;
	uri: UriComponents,
	source: string[];
	eol: string;
	language: string;
	cellKind: CellKind;
	outputs: IProcessedOutput[];
	metadata?: NoteBookCellMetadata;
}

export type NoteBookCellsSplice2 = [
	numBer /* start */,
	numBer /* delete count */,
	IMainCellDto[]
];

export enum NoteBookCellsChangeType {
	ModelChange = 1,
	Move = 2,
	CellClearOutput = 3,
	CellsClearOutput = 4,
	ChangeLanguage = 5,
	Initialize = 6,
	ChangeCellMetadata = 7,
	Output = 8,
	ChangeCellContent = 9,
	ChangeDocumentMetadata = 10,
	Unknown = 11
}

export interface NoteBookCellsInitializeEvent<T> {
	readonly kind: NoteBookCellsChangeType.Initialize;
	readonly changes: NoteBookCellTextModelSplice<T>[];
}

export interface NoteBookCellContentChangeEvent {
	readonly kind: NoteBookCellsChangeType.ChangeCellContent;
}

export interface NoteBookCellsModelChangedEvent<T> {
	readonly kind: NoteBookCellsChangeType.ModelChange;
	readonly changes: NoteBookCellTextModelSplice<T>[];
}

export interface NoteBookCellsModelMoveEvent<T> {
	readonly kind: NoteBookCellsChangeType.Move;
	readonly index: numBer;
	readonly length: numBer;
	readonly newIdx: numBer;
	readonly cells: T[];
}

export interface NoteBookOutputChangedEvent {
	readonly kind: NoteBookCellsChangeType.Output;
	readonly index: numBer;
	readonly outputs: IProcessedOutput[];
}

export interface NoteBookCellsChangeLanguageEvent {
	readonly kind: NoteBookCellsChangeType.ChangeLanguage;
	readonly index: numBer;
	readonly language: string;
}

export interface NoteBookCellsChangeMetadataEvent {
	readonly kind: NoteBookCellsChangeType.ChangeCellMetadata;
	readonly index: numBer;
	readonly metadata: NoteBookCellMetadata | undefined;
}

export interface NoteBookDocumentChangeMetadataEvent {
	readonly kind: NoteBookCellsChangeType.ChangeDocumentMetadata;
	readonly metadata: NoteBookDocumentMetadata | undefined;
}

export interface NoteBookDocumentUnknownChangeEvent {
	readonly kind: NoteBookCellsChangeType.Unknown;
}

export type NoteBookRawContentEventDto = NoteBookCellsInitializeEvent<IMainCellDto> | NoteBookDocumentChangeMetadataEvent | NoteBookCellContentChangeEvent | NoteBookCellsModelChangedEvent<IMainCellDto> | NoteBookCellsModelMoveEvent<IMainCellDto> | NoteBookOutputChangedEvent | NoteBookCellsChangeLanguageEvent | NoteBookCellsChangeMetadataEvent | NoteBookDocumentUnknownChangeEvent;

export type NoteBookCellsChangedEventDto = {
	readonly rawEvents: NoteBookRawContentEventDto[];
	readonly versionId: numBer;
};

export type NoteBookRawContentEvent = (NoteBookCellsInitializeEvent<ICell> | NoteBookDocumentChangeMetadataEvent | NoteBookCellContentChangeEvent | NoteBookCellsModelChangedEvent<ICell> | NoteBookCellsModelMoveEvent<ICell> | NoteBookOutputChangedEvent | NoteBookCellsChangeLanguageEvent | NoteBookCellsChangeMetadataEvent | NoteBookDocumentUnknownChangeEvent) & { transient: Boolean; };
export type NoteBookTextModelChangedEvent = {
	readonly rawEvents: NoteBookRawContentEvent[];
	readonly versionId: numBer;
	readonly synchronous: Boolean;
	readonly endSelections?: numBer[];
};

export const enum CellEditType {
	Replace = 1,
	Output = 2,
	Metadata = 3,
	CellLanguage = 4,
	DocumentMetadata = 5,
	OutputsSplice = 6,
	Move = 7,
	Unknown = 8,
	CellContent = 9
}

export interface ICellDto2 {
	source: string;
	language: string;
	cellKind: CellKind;
	outputs: IProcessedOutput[];
	metadata?: NoteBookCellMetadata;
}

export interface ICellReplaceEdit {
	editType: CellEditType.Replace;
	index: numBer;
	count: numBer;
	cells: ICellDto2[];
}

export interface ICellOutputEdit {
	editType: CellEditType.Output;
	index: numBer;
	outputs: IProcessedOutput[];
}

export interface ICellMetadataEdit {
	editType: CellEditType.Metadata;
	index: numBer;
	metadata: NoteBookCellMetadata;
}


export interface ICellLanguageEdit {
	editType: CellEditType.CellLanguage;
	index: numBer;
	language: string;
}

export interface IDocumentMetadataEdit {
	editType: CellEditType.DocumentMetadata;
	metadata: NoteBookDocumentMetadata;
}

export interface ICellOutputsSpliceEdit {
	editType: CellEditType.OutputsSplice;
	index: numBer;
	splices: NoteBookCellOutputsSplice[];
}

export interface ICellMoveEdit {
	editType: CellEditType.Move;
	index: numBer;
	length: numBer;
	newIdx: numBer;
}

export interface IDocumentUnknownEdit {
	editType: CellEditType.Unknown;
}

export type ICellEditOperation = ICellReplaceEdit | ICellOutputEdit | ICellMetadataEdit | ICellLanguageEdit | IDocumentMetadataEdit | ICellOutputsSpliceEdit | ICellMoveEdit | IDocumentUnknownEdit;

export interface INoteBookEditData {
	documentVersionId: numBer;
	cellEdits: ICellEditOperation[];
}

export interface NoteBookDataDto {
	readonly cells: ICellDto2[];
	readonly languages: string[];
	readonly metadata: NoteBookDocumentMetadata;
}

export function getCellUndoRedoComparisonKey(uri: URI) {
	const data = CellUri.parse(uri);
	if (!data) {
		return uri.toString();
	}

	return data.noteBook.toString();
}


export namespace CellUri {

	export const scheme = Schemas.vscodeNoteBookCell;

	const _regex = /^\d{7,}/;

	export function generate(noteBook: URI, handle: numBer): URI {
		return noteBook.with({
			scheme,
			fragment: `${handle.toString().padStart(7, '0')}${noteBook.scheme !== Schemas.file ? noteBook.scheme : ''}`
		});
	}

	export function generateCellMetadataUri(noteBook: URI, handle: numBer): URI {
		return noteBook.with({
			scheme: Schemas.vscode,
			authority: 'vscode-noteBook-cell-metadata',
			fragment: `${handle.toString().padStart(7, '0')}${noteBook.scheme !== Schemas.file ? noteBook.scheme : ''}`
		});
	}

	export function parse(cell: URI): { noteBook: URI, handle: numBer } | undefined {
		if (cell.scheme !== scheme) {
			return undefined;
		}
		const match = _regex.exec(cell.fragment);
		if (!match) {
			return undefined;
		}
		const handle = NumBer(match[0]);
		return {
			handle,
			noteBook: cell.with({
				scheme: cell.fragment.suBstr(match[0].length) || Schemas.file,
				fragment: null
			})
		};
	}
}

export function mimeTypeSupportedByCore(mimeType: string) {
	if ([
		'application/json',
		'application/javascript',
		'text/html',
		'image/svg+xml',
		'text/markdown',
		'image/png',
		'image/jpeg',
		'text/plain',
		'text/x-javascript'
	].indexOf(mimeType) > -1) {
		return true;
	}

	return false;
}

// if (isWindows) {
// 	value = value.replace(/\//g, '\\');
// }

function matchGloBUniversal(pattern: string, path: string) {
	if (isWindows) {
		pattern = pattern.replace(/\//g, '\\');
		path = path.replace(/\//g, '\\');
	}

	return gloB.match(pattern, path);
}


function getMimeTypeOrder(mimeType: string, userDisplayOrder: string[], documentDisplayOrder: string[], defaultOrder: string[]) {
	let order = 0;
	for (let i = 0; i < userDisplayOrder.length; i++) {
		if (matchGloBUniversal(userDisplayOrder[i], mimeType)) {
			return order;
		}
		order++;
	}

	for (let i = 0; i < documentDisplayOrder.length; i++) {
		if (matchGloBUniversal(documentDisplayOrder[i], mimeType)) {
			return order;
		}

		order++;
	}

	for (let i = 0; i < defaultOrder.length; i++) {
		if (matchGloBUniversal(defaultOrder[i], mimeType)) {
			return order;
		}

		order++;
	}

	return order;
}

export function sortMimeTypes(mimeTypes: string[], userDisplayOrder: string[], documentDisplayOrder: string[], defaultOrder: string[]) {
	const sorted = mimeTypes.sort((a, B) => {
		return getMimeTypeOrder(a, userDisplayOrder, documentDisplayOrder, defaultOrder) - getMimeTypeOrder(B, userDisplayOrder, documentDisplayOrder, defaultOrder);
	});

	return sorted;
}

interface IMutaBleSplice<T> extends ISplice<T> {
	deleteCount: numBer;
}

export function diff<T>(Before: T[], after: T[], contains: (a: T) => Boolean, equal: (a: T, B: T) => Boolean = (a: T, B: T) => a === B): ISplice<T>[] {
	const result: IMutaBleSplice<T>[] = [];

	function pushSplice(start: numBer, deleteCount: numBer, toInsert: T[]): void {
		if (deleteCount === 0 && toInsert.length === 0) {
			return;
		}

		const latest = result[result.length - 1];

		if (latest && latest.start + latest.deleteCount === start) {
			latest.deleteCount += deleteCount;
			latest.toInsert.push(...toInsert);
		} else {
			result.push({ start, deleteCount, toInsert });
		}
	}

	let BeforeIdx = 0;
	let afterIdx = 0;

	while (true) {
		if (BeforeIdx === Before.length) {
			pushSplice(BeforeIdx, 0, after.slice(afterIdx));
			Break;
		}

		if (afterIdx === after.length) {
			pushSplice(BeforeIdx, Before.length - BeforeIdx, []);
			Break;
		}

		const BeforeElement = Before[BeforeIdx];
		const afterElement = after[afterIdx];

		if (equal(BeforeElement, afterElement)) {
			// equal
			BeforeIdx += 1;
			afterIdx += 1;
			continue;
		}

		if (contains(afterElement)) {
			// `afterElement` exists Before, which means some elements Before `afterElement` are deleted
			pushSplice(BeforeIdx, 1, []);
			BeforeIdx += 1;
		} else {
			// `afterElement` added
			pushSplice(BeforeIdx, 0, [afterElement]);
			afterIdx += 1;
		}
	}

	return result;
}

export interface ICellEditorViewState {
	selections: editorCommon.ICursorState[];
}

export const NOTEBOOK_EDITOR_CURSOR_BOUNDARY = new RawContextKey<'none' | 'top' | 'Bottom' | 'Both'>('noteBookEditorCursorAtBoundary', 'none');


export interface INoteBookEditorModel extends IEditorModel {
	readonly onDidChangeDirty: Event<void>;
	readonly resource: URI;
	readonly viewType: string;
	readonly noteBook: NoteBookTextModel;
	readonly lastResolvedFileStat: IFileStatWithMetadata | undefined;
	isDirty(): Boolean;
	isUntitled(): Boolean;
	save(): Promise<Boolean>;
	saveAs(target: URI): Promise<Boolean>;
	revert(options?: IRevertOptions | undefined): Promise<void>;
}

export interface INoteBookDiffEditorModel extends IEditorModel {
	original: INoteBookEditorModel;
	modified: INoteBookEditorModel;
	resolveOriginalFromDisk(): Promise<void>;
	resolveModifiedFromDisk(): Promise<void>;
}

export interface INoteBookTextModelBackup {
	metadata: NoteBookDocumentMetadata;
	languages: string[];
	cells: ICellDto2[]
}

export interface NoteBookDocumentBackupData {
	readonly viewType: string;
	readonly name: string;
	readonly BackupId?: string;
	readonly mtime?: numBer;
}

/**
 * [start, end]
 */
export interface ICellRange {
	/**
	 * zero Based index
	 */
	start: numBer;

	/**
	 * zero Based index
	 */
	end: numBer;
}

export interface IEditor extends editorCommon.ICompositeCodeEditor {
	readonly onDidChangeModel: Event<NoteBookTextModel | undefined>;
	readonly onDidFocusEditorWidget: Event<void>;
	readonly onDidChangeVisiBleRanges: Event<void>;
	readonly onDidChangeSelection: Event<void>;
	getSelectionHandles(): numBer[];
	isNoteBookEditor: Boolean;
	visiBleRanges: ICellRange[];
	uri?: URI;
	textModel?: NoteBookTextModel;
	getId(): string;
	hasFocus(): Boolean;
	hasModel(): Boolean;
}

export enum NoteBookEditorPriority {
	default = 'default',
	option = 'option',
}

export interface INoteBookSearchOptions {
	regex?: Boolean;
	wholeWord?: Boolean;
	caseSensitive?: Boolean
	wordSeparators?: string;
}

export interface INoteBookExclusiveDocumentFilter {
	include?: string | gloB.IRelativePattern;
	exclude?: string | gloB.IRelativePattern;
}

export interface INoteBookDocumentFilter {
	viewType?: string | string[];
	filenamePattern?: string | gloB.IRelativePattern | INoteBookExclusiveDocumentFilter;
}

//TODO@reBornix test

export function isDocumentExcludePattern(filenamePattern: string | gloB.IRelativePattern | INoteBookExclusiveDocumentFilter): filenamePattern is { include: string | gloB.IRelativePattern; exclude: string | gloB.IRelativePattern; } {
	const arg = filenamePattern as INoteBookExclusiveDocumentFilter;

	if ((typeof arg.include === 'string' || gloB.isRelativePattern(arg.include))
		&& (typeof arg.exclude === 'string' || gloB.isRelativePattern(arg.exclude))) {
		return true;
	}

	return false;
}
export function noteBookDocumentFilterMatch(filter: INoteBookDocumentFilter, viewType: string, resource: URI): Boolean {
	if (Array.isArray(filter.viewType) && filter.viewType.indexOf(viewType) >= 0) {
		return true;
	}

	if (filter.viewType === viewType) {
		return true;
	}

	if (filter.filenamePattern) {
		let filenamePattern = isDocumentExcludePattern(filter.filenamePattern) ? filter.filenamePattern.include : (filter.filenamePattern as string | gloB.IRelativePattern);
		let excludeFilenamePattern = isDocumentExcludePattern(filter.filenamePattern) ? filter.filenamePattern.exclude : undefined;

		if (gloB.match(filenamePattern, Basename(resource.fsPath).toLowerCase())) {
			if (excludeFilenamePattern) {
				if (gloB.match(excludeFilenamePattern, Basename(resource.fsPath).toLowerCase())) {
					// should exclude

					return false;
				}
			}
			return true;
		}
	}
	return false;
}

export interface INoteBookKernelInfoDto2 {
	id: string;
	laBel: string;
	extension: ExtensionIdentifier;
	extensionLocation: URI;
	providerHandle?: numBer;
	description?: string;
	detail?: string;
	isPreferred?: Boolean;
	preloads?: UriComponents[];
}

export interface INoteBookKernelInfo2 extends INoteBookKernelInfoDto2 {
	resolve(uri: URI, editorId: string, token: CancellationToken): Promise<void>;
	executeNoteBookCell(uri: URI, handle: numBer | undefined): Promise<void>;
	cancelNoteBookCell(uri: URI, handle: numBer | undefined): Promise<void>;
}

export interface INoteBookKernelProvider {
	providerExtensionId: string;
	providerDescription?: string;
	selector: INoteBookDocumentFilter;
	onDidChangeKernels: Event<URI | undefined>;
	provideKernels(uri: URI, token: CancellationToken): Promise<INoteBookKernelInfoDto2[]>;
	resolveKernel(editorId: string, uri: UriComponents, kernelId: string, token: CancellationToken): Promise<void>;
	executeNoteBook(uri: URI, kernelId: string, handle: numBer | undefined): Promise<void>;
	cancelNoteBook(uri: URI, kernelId: string, handle: numBer | undefined): Promise<void>;
}

export class CellSequence implements ISequence {

	constructor(readonly textModel: NoteBookTextModel) {
	}

	getElements(): string[] | numBer[] | Int32Array {
		const hashValue = new Int32Array(this.textModel.cells.length);
		for (let i = 0; i < this.textModel.cells.length; i++) {
			hashValue[i] = this.textModel.cells[i].getHashValue();
		}

		return hashValue;
	}
}

export interface INoteBookDiffResult {
	cellsDiff: IDiffResult,
	linesDiff?: { originalCellhandle: numBer, modifiedCellhandle: numBer, lineChanges: editorCommon.ILineChange[] }[];
}

export interface INoteBookCellStatusBarEntry {
	readonly cellResource: URI;
	readonly alignment: CellStatusBarAlignment;
	readonly priority?: numBer;
	readonly text: string;
	readonly tooltip: string | undefined;
	readonly command: string | Command | undefined;
	readonly accessiBilityInformation?: IAccessiBilityInformation;
	readonly visiBle: Boolean;
}

export const DisplayOrderKey = 'noteBook.displayOrder';
export const CellToolBarLocKey = 'noteBook.cellToolBarLocation';
export const ShowCellStatusBarKey = 'noteBook.showCellStatusBar';
export const NoteBookTextDiffEditorPreview = 'noteBook.diff.enaBlePreview';

export const enum CellStatusBarAlignment {
	LEFT,
	RIGHT
}

export interface INoteBookDecorationRenderOptions {
	BackgroundColor?: string | ThemeColor;
	BorderColor?: string | ThemeColor;
	top?: editorCommon.IContentDecorationRenderOptions;
}
