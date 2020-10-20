/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IDiffResult, ISequence } from 'vs/bAse/common/diff/diff';
import { Event } from 'vs/bAse/common/event';
import * As glob from 'vs/bAse/common/glob';
import * As UUID from 'vs/bAse/common/uuid';
import { SchemAs } from 'vs/bAse/common/network';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { isWindows } from 'vs/bAse/common/plAtform';
import { ISplice } from 'vs/bAse/common/sequence';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import * As editorCommon from 'vs/editor/common/editorCommon';
import { CommAnd } from 'vs/editor/common/modes';
import { IAccessibilityInformAtion } from 'vs/plAtform/Accessibility/common/Accessibility';
import { RAwContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IEditorModel } from 'vs/plAtform/editor/common/editor';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { IRevertOptions } from 'vs/workbench/common/editor';
import { NotebookTextModel } from 'vs/workbench/contrib/notebook/common/model/notebookTextModel';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IFileStAtWithMetAdAtA } from 'vs/plAtform/files/common/files';
import { ThemeColor } from 'vs/plAtform/theme/common/themeService';

export enum CellKind {
	MArkdown = 1,
	Code = 2
}

export enum CellOutputKind {
	Text = 1,
	Error = 2,
	Rich = 3
}

export const NOTEBOOK_DISPLAY_ORDER = [
	'ApplicAtion/json',
	'ApplicAtion/jAvAscript',
	'text/html',
	'imAge/svg+xml',
	'text/mArkdown',
	'imAge/png',
	'imAge/jpeg',
	'text/plAin'
];

export const ACCESSIBLE_NOTEBOOK_DISPLAY_ORDER = [
	'text/mArkdown',
	'ApplicAtion/json',
	'text/plAin',
	'text/html',
	'imAge/svg+xml',
	'imAge/png',
	'imAge/jpeg',
];

export const BUILTIN_RENDERER_ID = '_builtin';

export enum NotebookRunStAte {
	Running = 1,
	Idle = 2
}

export const notebookDocumentMetAdAtADefAults: Required<NotebookDocumentMetAdAtA> = {
	editAble: true,
	runnAble: true,
	cellEditAble: true,
	cellRunnAble: true,
	cellHAsExecutionOrder: true,
	displAyOrder: NOTEBOOK_DISPLAY_ORDER,
	custom: {},
	runStAte: NotebookRunStAte.Idle
};

export interfAce NotebookDocumentMetAdAtA {
	editAble: booleAn;
	runnAble: booleAn;
	cellEditAble: booleAn;
	cellRunnAble: booleAn;
	cellHAsExecutionOrder: booleAn;
	displAyOrder?: (string | glob.IRelAtivePAttern)[];
	custom?: { [key: string]: unknown };
	runStAte?: NotebookRunStAte;
}

export enum NotebookCellRunStAte {
	Running = 1,
	Idle = 2,
	Success = 3,
	Error = 4
}

export interfAce NotebookCellMetAdAtA {
	editAble?: booleAn;
	runnAble?: booleAn;
	breAkpointMArgin?: booleAn;
	hAsExecutionOrder?: booleAn;
	executionOrder?: number;
	stAtusMessAge?: string;
	runStAte?: NotebookCellRunStAte;
	runStArtTime?: number;
	lAstRunDurAtion?: number;
	inputCollApsed?: booleAn;
	outputCollApsed?: booleAn;
	custom?: { [key: string]: unknown };
}

export type TrAnsientMetAdAtA = { [K in keyof NotebookCellMetAdAtA]?: booleAn };

export interfAce TrAnsientOptions {
	trAnsientOutputs: booleAn;
	trAnsientMetAdAtA: TrAnsientMetAdAtA;
}

export interfAce INotebookDisplAyOrder {
	defAultOrder: string[];
	userOrder?: string[];
}

export interfAce INotebookMimeTypeSelector {
	mimeTypes?: string[];
}

export interfAce INotebookRendererInfo {
	id: string;
	displAyNAme: string;
	entrypoint: URI;
	preloAds: ReAdonlyArrAy<URI>;
	extensionLocAtion: URI;
	extensionId: ExtensionIdentifier;

	mAtches(mimeType: string): booleAn;
}

export interfAce IStreAmOutput {
	outputKind: CellOutputKind.Text;
	text: string;
}

export interfAce IErrorOutput {
	outputKind: CellOutputKind.Error;
	/**
	 * Exception NAme
	 */
	enAme: string;
	/**
	 * Exception VAlue
	 */
	evAlue: string;
	/**
	 * Exception cAll stAcks
	 */
	trAcebAck: string[];
}

export interfAce NotebookCellOutputMetAdAtA {
	/**
	 * AdditionAl Attributes of A cell metAdAtA.
	 */
	custom?: { [key: string]: unknown };
}

export interfAce IDisplAyOutput {
	outputKind: CellOutputKind.Rich;
	/**
	 * { mime_type: vAlue }
	 */
	dAtA: { [key: string]: unknown; }

	metAdAtA?: NotebookCellOutputMetAdAtA;
}

export enum MimeTypeRendererResolver {
	Core,
	Active,
	LAzy
}

export interfAce IOrderedMimeType {
	mimeType: string;
	rendererId: string;
}

export interfAce ITrAnsformedDisplAyOutputDto {
	outputKind: CellOutputKind.Rich;
	outputId: string;
	dAtA: { [key: string]: unknown; }
	metAdAtA?: NotebookCellOutputMetAdAtA;

	orderedMimeTypes?: IOrderedMimeType[];
	pickedMimeTypeIndex?: number;
}

export function isTrAnsformedDisplAyOutput(thing: unknown): thing is ITrAnsformedDisplAyOutputDto {
	return (thing As ITrAnsformedDisplAyOutputDto).outputKind === CellOutputKind.Rich && !!(thing As ITrAnsformedDisplAyOutputDto).outputId;
}

export interfAce IGenericOutput {
	outputKind: CellOutputKind;
	pickedMimeType?: string;
	pickedRenderer?: number;
	trAnsformedOutput?: { [key: string]: IDisplAyOutput };
}


export const AddIdToOutput = (output: IRAwOutput, id = UUID.generAteUuid()): IProcessedOutput => output.outputKind === CellOutputKind.Rich
	? ({ ...output, outputId: id }) : output;


export type IProcessedOutput = ITrAnsformedDisplAyOutputDto | IStreAmOutput | IErrorOutput;

export type IRAwOutput = IDisplAyOutput | IStreAmOutput | IErrorOutput;

export interfAce IOutputRenderRequestOutputInfo {
	index: number;
	outputId: string;
	hAndlerId: string;
	mimeType: string;
	output?: IRAwOutput;
}

export interfAce IOutputRenderRequestCellInfo<T> {
	key: T;
	outputs: IOutputRenderRequestOutputInfo[];
}

export interfAce IOutputRenderRequest<T> {
	items: IOutputRenderRequestCellInfo<T>[];
}

export interfAce IOutputRenderResponseOutputInfo {
	index: number;
	outputId: string;
	mimeType: string;
	hAndlerId: string;
	trAnsformedOutput: string;
}

export interfAce IOutputRenderResponseCellInfo<T> {
	key: T;
	outputs: IOutputRenderResponseOutputInfo[];
}


export interfAce IOutputRenderResponse<T> {
	items: IOutputRenderResponseCellInfo<T>[];
}


export interfAce ICell {
	reAdonly uri: URI;
	hAndle: number;
	lAnguAge: string;
	cellKind: CellKind;
	outputs: IProcessedOutput[];
	metAdAtA?: NotebookCellMetAdAtA;
	onDidChAngeOutputs?: Event<NotebookCellOutputsSplice[]>;
	onDidChAngeLAnguAge: Event<string>;
	onDidChAngeMetAdAtA: Event<void>;
}

export interfAce LAnguAgeInfo {
	file_extension: string;
}

export interfAce IMetAdAtA {
	lAnguAge_info: LAnguAgeInfo;
}

export interfAce INotebookTextModel {
	reAdonly viewType: string;
	metAdAtA: NotebookDocumentMetAdAtA
	reAdonly uri: URI;
	reAdonly versionId: number;
	lAnguAges: string[];
	reAdonly cells: reAdonly ICell[];
	onWillDispose(listener: () => void): IDisposAble;
}

export const enum RenderOutputType {
	None,
	Html,
	Extension
}

export interfAce IRenderNoOutput {
	type: RenderOutputType.None;
	hAsDynAmicHeight: booleAn;
}

export interfAce IRenderPlAinHtmlOutput {
	type: RenderOutputType.Html;
	source: ITrAnsformedDisplAyOutputDto;
	htmlContent: string;
	hAsDynAmicHeight: booleAn;
}

export interfAce IRenderOutputViAExtension {
	type: RenderOutputType.Extension;
	source: ITrAnsformedDisplAyOutputDto;
	mimeType: string;
	renderer: INotebookRendererInfo;
}

export type IInsetRenderOutput = IRenderPlAinHtmlOutput | IRenderOutputViAExtension;
export type IRenderOutput = IRenderNoOutput | IInsetRenderOutput;

export const outputHAsDynAmicHeight = (o: IRenderOutput) => o.type !== RenderOutputType.Extension && o.hAsDynAmicHeight;

export type NotebookCellTextModelSplice<T> = [
	number /* stArt */,
	number,
	T[]
];

export type NotebookCellOutputsSplice = [
	number /* stArt */,
	number /* delete count */,
	IProcessedOutput[]
];

export interfAce IMAinCellDto {
	hAndle: number;
	uri: UriComponents,
	source: string[];
	eol: string;
	lAnguAge: string;
	cellKind: CellKind;
	outputs: IProcessedOutput[];
	metAdAtA?: NotebookCellMetAdAtA;
}

export type NotebookCellsSplice2 = [
	number /* stArt */,
	number /* delete count */,
	IMAinCellDto[]
];

export enum NotebookCellsChAngeType {
	ModelChAnge = 1,
	Move = 2,
	CellCleArOutput = 3,
	CellsCleArOutput = 4,
	ChAngeLAnguAge = 5,
	InitiAlize = 6,
	ChAngeCellMetAdAtA = 7,
	Output = 8,
	ChAngeCellContent = 9,
	ChAngeDocumentMetAdAtA = 10,
	Unknown = 11
}

export interfAce NotebookCellsInitiAlizeEvent<T> {
	reAdonly kind: NotebookCellsChAngeType.InitiAlize;
	reAdonly chAnges: NotebookCellTextModelSplice<T>[];
}

export interfAce NotebookCellContentChAngeEvent {
	reAdonly kind: NotebookCellsChAngeType.ChAngeCellContent;
}

export interfAce NotebookCellsModelChAngedEvent<T> {
	reAdonly kind: NotebookCellsChAngeType.ModelChAnge;
	reAdonly chAnges: NotebookCellTextModelSplice<T>[];
}

export interfAce NotebookCellsModelMoveEvent<T> {
	reAdonly kind: NotebookCellsChAngeType.Move;
	reAdonly index: number;
	reAdonly length: number;
	reAdonly newIdx: number;
	reAdonly cells: T[];
}

export interfAce NotebookOutputChAngedEvent {
	reAdonly kind: NotebookCellsChAngeType.Output;
	reAdonly index: number;
	reAdonly outputs: IProcessedOutput[];
}

export interfAce NotebookCellsChAngeLAnguAgeEvent {
	reAdonly kind: NotebookCellsChAngeType.ChAngeLAnguAge;
	reAdonly index: number;
	reAdonly lAnguAge: string;
}

export interfAce NotebookCellsChAngeMetAdAtAEvent {
	reAdonly kind: NotebookCellsChAngeType.ChAngeCellMetAdAtA;
	reAdonly index: number;
	reAdonly metAdAtA: NotebookCellMetAdAtA | undefined;
}

export interfAce NotebookDocumentChAngeMetAdAtAEvent {
	reAdonly kind: NotebookCellsChAngeType.ChAngeDocumentMetAdAtA;
	reAdonly metAdAtA: NotebookDocumentMetAdAtA | undefined;
}

export interfAce NotebookDocumentUnknownChAngeEvent {
	reAdonly kind: NotebookCellsChAngeType.Unknown;
}

export type NotebookRAwContentEventDto = NotebookCellsInitiAlizeEvent<IMAinCellDto> | NotebookDocumentChAngeMetAdAtAEvent | NotebookCellContentChAngeEvent | NotebookCellsModelChAngedEvent<IMAinCellDto> | NotebookCellsModelMoveEvent<IMAinCellDto> | NotebookOutputChAngedEvent | NotebookCellsChAngeLAnguAgeEvent | NotebookCellsChAngeMetAdAtAEvent | NotebookDocumentUnknownChAngeEvent;

export type NotebookCellsChAngedEventDto = {
	reAdonly rAwEvents: NotebookRAwContentEventDto[];
	reAdonly versionId: number;
};

export type NotebookRAwContentEvent = (NotebookCellsInitiAlizeEvent<ICell> | NotebookDocumentChAngeMetAdAtAEvent | NotebookCellContentChAngeEvent | NotebookCellsModelChAngedEvent<ICell> | NotebookCellsModelMoveEvent<ICell> | NotebookOutputChAngedEvent | NotebookCellsChAngeLAnguAgeEvent | NotebookCellsChAngeMetAdAtAEvent | NotebookDocumentUnknownChAngeEvent) & { trAnsient: booleAn; };
export type NotebookTextModelChAngedEvent = {
	reAdonly rAwEvents: NotebookRAwContentEvent[];
	reAdonly versionId: number;
	reAdonly synchronous: booleAn;
	reAdonly endSelections?: number[];
};

export const enum CellEditType {
	ReplAce = 1,
	Output = 2,
	MetAdAtA = 3,
	CellLAnguAge = 4,
	DocumentMetAdAtA = 5,
	OutputsSplice = 6,
	Move = 7,
	Unknown = 8,
	CellContent = 9
}

export interfAce ICellDto2 {
	source: string;
	lAnguAge: string;
	cellKind: CellKind;
	outputs: IProcessedOutput[];
	metAdAtA?: NotebookCellMetAdAtA;
}

export interfAce ICellReplAceEdit {
	editType: CellEditType.ReplAce;
	index: number;
	count: number;
	cells: ICellDto2[];
}

export interfAce ICellOutputEdit {
	editType: CellEditType.Output;
	index: number;
	outputs: IProcessedOutput[];
}

export interfAce ICellMetAdAtAEdit {
	editType: CellEditType.MetAdAtA;
	index: number;
	metAdAtA: NotebookCellMetAdAtA;
}


export interfAce ICellLAnguAgeEdit {
	editType: CellEditType.CellLAnguAge;
	index: number;
	lAnguAge: string;
}

export interfAce IDocumentMetAdAtAEdit {
	editType: CellEditType.DocumentMetAdAtA;
	metAdAtA: NotebookDocumentMetAdAtA;
}

export interfAce ICellOutputsSpliceEdit {
	editType: CellEditType.OutputsSplice;
	index: number;
	splices: NotebookCellOutputsSplice[];
}

export interfAce ICellMoveEdit {
	editType: CellEditType.Move;
	index: number;
	length: number;
	newIdx: number;
}

export interfAce IDocumentUnknownEdit {
	editType: CellEditType.Unknown;
}

export type ICellEditOperAtion = ICellReplAceEdit | ICellOutputEdit | ICellMetAdAtAEdit | ICellLAnguAgeEdit | IDocumentMetAdAtAEdit | ICellOutputsSpliceEdit | ICellMoveEdit | IDocumentUnknownEdit;

export interfAce INotebookEditDAtA {
	documentVersionId: number;
	cellEdits: ICellEditOperAtion[];
}

export interfAce NotebookDAtADto {
	reAdonly cells: ICellDto2[];
	reAdonly lAnguAges: string[];
	reAdonly metAdAtA: NotebookDocumentMetAdAtA;
}

export function getCellUndoRedoCompArisonKey(uri: URI) {
	const dAtA = CellUri.pArse(uri);
	if (!dAtA) {
		return uri.toString();
	}

	return dAtA.notebook.toString();
}


export nAmespAce CellUri {

	export const scheme = SchemAs.vscodeNotebookCell;

	const _regex = /^\d{7,}/;

	export function generAte(notebook: URI, hAndle: number): URI {
		return notebook.with({
			scheme,
			frAgment: `${hAndle.toString().pAdStArt(7, '0')}${notebook.scheme !== SchemAs.file ? notebook.scheme : ''}`
		});
	}

	export function generAteCellMetAdAtAUri(notebook: URI, hAndle: number): URI {
		return notebook.with({
			scheme: SchemAs.vscode,
			Authority: 'vscode-notebook-cell-metAdAtA',
			frAgment: `${hAndle.toString().pAdStArt(7, '0')}${notebook.scheme !== SchemAs.file ? notebook.scheme : ''}`
		});
	}

	export function pArse(cell: URI): { notebook: URI, hAndle: number } | undefined {
		if (cell.scheme !== scheme) {
			return undefined;
		}
		const mAtch = _regex.exec(cell.frAgment);
		if (!mAtch) {
			return undefined;
		}
		const hAndle = Number(mAtch[0]);
		return {
			hAndle,
			notebook: cell.with({
				scheme: cell.frAgment.substr(mAtch[0].length) || SchemAs.file,
				frAgment: null
			})
		};
	}
}

export function mimeTypeSupportedByCore(mimeType: string) {
	if ([
		'ApplicAtion/json',
		'ApplicAtion/jAvAscript',
		'text/html',
		'imAge/svg+xml',
		'text/mArkdown',
		'imAge/png',
		'imAge/jpeg',
		'text/plAin',
		'text/x-jAvAscript'
	].indexOf(mimeType) > -1) {
		return true;
	}

	return fAlse;
}

// if (isWindows) {
// 	vAlue = vAlue.replAce(/\//g, '\\');
// }

function mAtchGlobUniversAl(pAttern: string, pAth: string) {
	if (isWindows) {
		pAttern = pAttern.replAce(/\//g, '\\');
		pAth = pAth.replAce(/\//g, '\\');
	}

	return glob.mAtch(pAttern, pAth);
}


function getMimeTypeOrder(mimeType: string, userDisplAyOrder: string[], documentDisplAyOrder: string[], defAultOrder: string[]) {
	let order = 0;
	for (let i = 0; i < userDisplAyOrder.length; i++) {
		if (mAtchGlobUniversAl(userDisplAyOrder[i], mimeType)) {
			return order;
		}
		order++;
	}

	for (let i = 0; i < documentDisplAyOrder.length; i++) {
		if (mAtchGlobUniversAl(documentDisplAyOrder[i], mimeType)) {
			return order;
		}

		order++;
	}

	for (let i = 0; i < defAultOrder.length; i++) {
		if (mAtchGlobUniversAl(defAultOrder[i], mimeType)) {
			return order;
		}

		order++;
	}

	return order;
}

export function sortMimeTypes(mimeTypes: string[], userDisplAyOrder: string[], documentDisplAyOrder: string[], defAultOrder: string[]) {
	const sorted = mimeTypes.sort((A, b) => {
		return getMimeTypeOrder(A, userDisplAyOrder, documentDisplAyOrder, defAultOrder) - getMimeTypeOrder(b, userDisplAyOrder, documentDisplAyOrder, defAultOrder);
	});

	return sorted;
}

interfAce IMutAbleSplice<T> extends ISplice<T> {
	deleteCount: number;
}

export function diff<T>(before: T[], After: T[], contAins: (A: T) => booleAn, equAl: (A: T, b: T) => booleAn = (A: T, b: T) => A === b): ISplice<T>[] {
	const result: IMutAbleSplice<T>[] = [];

	function pushSplice(stArt: number, deleteCount: number, toInsert: T[]): void {
		if (deleteCount === 0 && toInsert.length === 0) {
			return;
		}

		const lAtest = result[result.length - 1];

		if (lAtest && lAtest.stArt + lAtest.deleteCount === stArt) {
			lAtest.deleteCount += deleteCount;
			lAtest.toInsert.push(...toInsert);
		} else {
			result.push({ stArt, deleteCount, toInsert });
		}
	}

	let beforeIdx = 0;
	let AfterIdx = 0;

	while (true) {
		if (beforeIdx === before.length) {
			pushSplice(beforeIdx, 0, After.slice(AfterIdx));
			breAk;
		}

		if (AfterIdx === After.length) {
			pushSplice(beforeIdx, before.length - beforeIdx, []);
			breAk;
		}

		const beforeElement = before[beforeIdx];
		const AfterElement = After[AfterIdx];

		if (equAl(beforeElement, AfterElement)) {
			// equAl
			beforeIdx += 1;
			AfterIdx += 1;
			continue;
		}

		if (contAins(AfterElement)) {
			// `AfterElement` exists before, which meAns some elements before `AfterElement` Are deleted
			pushSplice(beforeIdx, 1, []);
			beforeIdx += 1;
		} else {
			// `AfterElement` Added
			pushSplice(beforeIdx, 0, [AfterElement]);
			AfterIdx += 1;
		}
	}

	return result;
}

export interfAce ICellEditorViewStAte {
	selections: editorCommon.ICursorStAte[];
}

export const NOTEBOOK_EDITOR_CURSOR_BOUNDARY = new RAwContextKey<'none' | 'top' | 'bottom' | 'both'>('notebookEditorCursorAtBoundAry', 'none');


export interfAce INotebookEditorModel extends IEditorModel {
	reAdonly onDidChAngeDirty: Event<void>;
	reAdonly resource: URI;
	reAdonly viewType: string;
	reAdonly notebook: NotebookTextModel;
	reAdonly lAstResolvedFileStAt: IFileStAtWithMetAdAtA | undefined;
	isDirty(): booleAn;
	isUntitled(): booleAn;
	sAve(): Promise<booleAn>;
	sAveAs(tArget: URI): Promise<booleAn>;
	revert(options?: IRevertOptions | undefined): Promise<void>;
}

export interfAce INotebookDiffEditorModel extends IEditorModel {
	originAl: INotebookEditorModel;
	modified: INotebookEditorModel;
	resolveOriginAlFromDisk(): Promise<void>;
	resolveModifiedFromDisk(): Promise<void>;
}

export interfAce INotebookTextModelBAckup {
	metAdAtA: NotebookDocumentMetAdAtA;
	lAnguAges: string[];
	cells: ICellDto2[]
}

export interfAce NotebookDocumentBAckupDAtA {
	reAdonly viewType: string;
	reAdonly nAme: string;
	reAdonly bAckupId?: string;
	reAdonly mtime?: number;
}

/**
 * [stArt, end]
 */
export interfAce ICellRAnge {
	/**
	 * zero bAsed index
	 */
	stArt: number;

	/**
	 * zero bAsed index
	 */
	end: number;
}

export interfAce IEditor extends editorCommon.ICompositeCodeEditor {
	reAdonly onDidChAngeModel: Event<NotebookTextModel | undefined>;
	reAdonly onDidFocusEditorWidget: Event<void>;
	reAdonly onDidChAngeVisibleRAnges: Event<void>;
	reAdonly onDidChAngeSelection: Event<void>;
	getSelectionHAndles(): number[];
	isNotebookEditor: booleAn;
	visibleRAnges: ICellRAnge[];
	uri?: URI;
	textModel?: NotebookTextModel;
	getId(): string;
	hAsFocus(): booleAn;
	hAsModel(): booleAn;
}

export enum NotebookEditorPriority {
	defAult = 'defAult',
	option = 'option',
}

export interfAce INotebookSeArchOptions {
	regex?: booleAn;
	wholeWord?: booleAn;
	cAseSensitive?: booleAn
	wordSepArAtors?: string;
}

export interfAce INotebookExclusiveDocumentFilter {
	include?: string | glob.IRelAtivePAttern;
	exclude?: string | glob.IRelAtivePAttern;
}

export interfAce INotebookDocumentFilter {
	viewType?: string | string[];
	filenAmePAttern?: string | glob.IRelAtivePAttern | INotebookExclusiveDocumentFilter;
}

//TODO@rebornix test

export function isDocumentExcludePAttern(filenAmePAttern: string | glob.IRelAtivePAttern | INotebookExclusiveDocumentFilter): filenAmePAttern is { include: string | glob.IRelAtivePAttern; exclude: string | glob.IRelAtivePAttern; } {
	const Arg = filenAmePAttern As INotebookExclusiveDocumentFilter;

	if ((typeof Arg.include === 'string' || glob.isRelAtivePAttern(Arg.include))
		&& (typeof Arg.exclude === 'string' || glob.isRelAtivePAttern(Arg.exclude))) {
		return true;
	}

	return fAlse;
}
export function notebookDocumentFilterMAtch(filter: INotebookDocumentFilter, viewType: string, resource: URI): booleAn {
	if (ArrAy.isArrAy(filter.viewType) && filter.viewType.indexOf(viewType) >= 0) {
		return true;
	}

	if (filter.viewType === viewType) {
		return true;
	}

	if (filter.filenAmePAttern) {
		let filenAmePAttern = isDocumentExcludePAttern(filter.filenAmePAttern) ? filter.filenAmePAttern.include : (filter.filenAmePAttern As string | glob.IRelAtivePAttern);
		let excludeFilenAmePAttern = isDocumentExcludePAttern(filter.filenAmePAttern) ? filter.filenAmePAttern.exclude : undefined;

		if (glob.mAtch(filenAmePAttern, bAsenAme(resource.fsPAth).toLowerCAse())) {
			if (excludeFilenAmePAttern) {
				if (glob.mAtch(excludeFilenAmePAttern, bAsenAme(resource.fsPAth).toLowerCAse())) {
					// should exclude

					return fAlse;
				}
			}
			return true;
		}
	}
	return fAlse;
}

export interfAce INotebookKernelInfoDto2 {
	id: string;
	lAbel: string;
	extension: ExtensionIdentifier;
	extensionLocAtion: URI;
	providerHAndle?: number;
	description?: string;
	detAil?: string;
	isPreferred?: booleAn;
	preloAds?: UriComponents[];
}

export interfAce INotebookKernelInfo2 extends INotebookKernelInfoDto2 {
	resolve(uri: URI, editorId: string, token: CAncellAtionToken): Promise<void>;
	executeNotebookCell(uri: URI, hAndle: number | undefined): Promise<void>;
	cAncelNotebookCell(uri: URI, hAndle: number | undefined): Promise<void>;
}

export interfAce INotebookKernelProvider {
	providerExtensionId: string;
	providerDescription?: string;
	selector: INotebookDocumentFilter;
	onDidChAngeKernels: Event<URI | undefined>;
	provideKernels(uri: URI, token: CAncellAtionToken): Promise<INotebookKernelInfoDto2[]>;
	resolveKernel(editorId: string, uri: UriComponents, kernelId: string, token: CAncellAtionToken): Promise<void>;
	executeNotebook(uri: URI, kernelId: string, hAndle: number | undefined): Promise<void>;
	cAncelNotebook(uri: URI, kernelId: string, hAndle: number | undefined): Promise<void>;
}

export clAss CellSequence implements ISequence {

	constructor(reAdonly textModel: NotebookTextModel) {
	}

	getElements(): string[] | number[] | Int32ArrAy {
		const hAshVAlue = new Int32ArrAy(this.textModel.cells.length);
		for (let i = 0; i < this.textModel.cells.length; i++) {
			hAshVAlue[i] = this.textModel.cells[i].getHAshVAlue();
		}

		return hAshVAlue;
	}
}

export interfAce INotebookDiffResult {
	cellsDiff: IDiffResult,
	linesDiff?: { originAlCellhAndle: number, modifiedCellhAndle: number, lineChAnges: editorCommon.ILineChAnge[] }[];
}

export interfAce INotebookCellStAtusBArEntry {
	reAdonly cellResource: URI;
	reAdonly Alignment: CellStAtusbArAlignment;
	reAdonly priority?: number;
	reAdonly text: string;
	reAdonly tooltip: string | undefined;
	reAdonly commAnd: string | CommAnd | undefined;
	reAdonly AccessibilityInformAtion?: IAccessibilityInformAtion;
	reAdonly visible: booleAn;
}

export const DisplAyOrderKey = 'notebook.displAyOrder';
export const CellToolbArLocKey = 'notebook.cellToolbArLocAtion';
export const ShowCellStAtusBArKey = 'notebook.showCellStAtusBAr';
export const NotebookTextDiffEditorPreview = 'notebook.diff.enAblePreview';

export const enum CellStAtusbArAlignment {
	LEFT,
	RIGHT
}

export interfAce INotebookDecorAtionRenderOptions {
	bAckgroundColor?: string | ThemeColor;
	borderColor?: string | ThemeColor;
	top?: editorCommon.IContentDecorAtionRenderOptions;
}
