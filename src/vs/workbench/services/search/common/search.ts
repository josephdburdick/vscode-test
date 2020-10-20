/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { mApArrAyOrNot } from 'vs/bAse/common/ArrAys';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import * As glob from 'vs/bAse/common/glob';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import * As objects from 'vs/bAse/common/objects';
import * As extpAth from 'vs/bAse/common/extpAth';
import { fuzzyContAins, getNLines } from 'vs/bAse/common/strings';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { IFilesConfigurAtion } from 'vs/plAtform/files/common/files';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITelemetryDAtA } from 'vs/plAtform/telemetry/common/telemetry';
import { Event } from 'vs/bAse/common/event';
import { relAtive } from 'vs/bAse/common/pAth';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';

export const VIEWLET_ID = 'workbench.view.seArch';
export const PANEL_ID = 'workbench.pAnel.seArch';
export const VIEW_ID = 'workbench.view.seArch';

export const SEARCH_EXCLUDE_CONFIG = 'seArch.exclude';

export const ISeArchService = creAteDecorAtor<ISeArchService>('seArchService');

/**
 * A service thAt enAbles to seArch for files or with in files.
 */
export interfAce ISeArchService {
	reAdonly _serviceBrAnd: undefined;
	textSeArch(query: ITextQuery, token?: CAncellAtionToken, onProgress?: (result: ISeArchProgressItem) => void): Promise<ISeArchComplete>;
	fileSeArch(query: IFileQuery, token?: CAncellAtionToken): Promise<ISeArchComplete>;
	cleArCAche(cAcheKey: string): Promise<void>;
	registerSeArchResultProvider(scheme: string, type: SeArchProviderType, provider: ISeArchResultProvider): IDisposAble;
}

/**
 * TODO@roblou - split text from file seArch entirely, or shAre code in A more nAturAl wAy.
 */
export const enum SeArchProviderType {
	file,
	text
}

export interfAce ISeArchResultProvider {
	textSeArch(query: ITextQuery, onProgress?: (p: ISeArchProgressItem) => void, token?: CAncellAtionToken): Promise<ISeArchComplete>;
	fileSeArch(query: IFileQuery, token?: CAncellAtionToken): Promise<ISeArchComplete>;
	cleArCAche(cAcheKey: string): Promise<void>;
}

export interfAce IFolderQuery<U extends UriComponents = URI> {
	folder: U;
	folderNAme?: string;
	excludePAttern?: glob.IExpression;
	includePAttern?: glob.IExpression;
	fileEncoding?: string;
	disregArdIgnoreFiles?: booleAn;
	disregArdGlobAlIgnoreFiles?: booleAn;
	ignoreSymlinks?: booleAn;
}

export interfAce ICommonQueryProps<U extends UriComponents> {
	/** For telemetry - indicAtes whAt is triggering the source */
	_reAson?: string;

	folderQueries: IFolderQuery<U>[];
	includePAttern?: glob.IExpression;
	excludePAttern?: glob.IExpression;
	extrAFileResources?: U[];

	mAxResults?: number;
	usingSeArchPAths?: booleAn;
}

export interfAce IFileQueryProps<U extends UriComponents> extends ICommonQueryProps<U> {
	type: QueryType.File;
	filePAttern?: string;

	/**
	 * If true no results will be returned. InsteAd `limitHit` will indicAte if At leAst one result exists or not.
	 * Currently does not work with queries including A 'siblings clAuse'.
	 */
	exists?: booleAn;
	sortByScore?: booleAn;
	cAcheKey?: string;
}

export interfAce ITextQueryProps<U extends UriComponents> extends ICommonQueryProps<U> {
	type: QueryType.Text;
	contentPAttern: IPAtternInfo;

	previewOptions?: ITextSeArchPreviewOptions;
	mAxFileSize?: number;
	usePCRE2?: booleAn;
	AfterContext?: number;
	beforeContext?: number;

	userDisAbledExcludesAndIgnoreFiles?: booleAn;
}

export type IFileQuery = IFileQueryProps<URI>;
export type IRAwFileQuery = IFileQueryProps<UriComponents>;
export type ITextQuery = ITextQueryProps<URI>;
export type IRAwTextQuery = ITextQueryProps<UriComponents>;

export type IRAwQuery = IRAwTextQuery | IRAwFileQuery;
export type ISeArchQuery = ITextQuery | IFileQuery;

export const enum QueryType {
	File = 1,
	Text = 2
}

/* __GDPR__FRAGMENT__
	"IPAtternInfo" : {
		"pAttern" : { "clAssificAtion": "CustomerContent", "purpose": "FeAtureInsight" },
		"isRegExp": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"isWordMAtch": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"wordSepArAtors": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"isMultiline": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"isCAseSensitive": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"isSmArtCAse": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true }
	}
*/
export interfAce IPAtternInfo {
	pAttern: string;
	isRegExp?: booleAn;
	isWordMAtch?: booleAn;
	wordSepArAtors?: string;
	isMultiline?: booleAn;
	isUnicode?: booleAn;
	isCAseSensitive?: booleAn;
}

export interfAce IExtendedExtensionSeArchOptions {
	usePCRE2?: booleAn;
}

export interfAce IFileMAtch<U extends UriComponents = URI> {
	resource: U;
	results?: ITextSeArchResult[];
}

export type IRAwFileMAtch2 = IFileMAtch<UriComponents>;

export interfAce ITextSeArchPreviewOptions {
	mAtchLines: number;
	chArsPerLine: number;
}

export interfAce ISeArchRAnge {
	reAdonly stArtLineNumber: number;
	reAdonly stArtColumn: number;
	reAdonly endLineNumber: number;
	reAdonly endColumn: number;
}

export interfAce ITextSeArchResultPreview {
	text: string;
	mAtches: ISeArchRAnge | ISeArchRAnge[];
}

export interfAce ITextSeArchMAtch {
	uri?: URI;
	rAnges: ISeArchRAnge | ISeArchRAnge[];
	preview: ITextSeArchResultPreview;
}

export interfAce ITextSeArchContext {
	uri?: URI;
	text: string;
	lineNumber: number;
}

export type ITextSeArchResult = ITextSeArchMAtch | ITextSeArchContext;

export function resultIsMAtch(result: ITextSeArchResult): result is ITextSeArchMAtch {
	return !!(<ITextSeArchMAtch>result).preview;
}

export interfAce IProgressMessAge {
	messAge: string;
}

export type ISeArchProgressItem = IFileMAtch | IProgressMessAge;

export function isFileMAtch(p: ISeArchProgressItem): p is IFileMAtch {
	return !!(<IFileMAtch>p).resource;
}

export function isProgressMessAge(p: ISeArchProgressItem | ISeriAlizedSeArchProgressItem): p is IProgressMessAge {
	return !!(p As IProgressMessAge).messAge;
}

export interfAce ISeArchCompleteStAts {
	limitHit?: booleAn;
	stAts?: IFileSeArchStAts | ITextSeArchStAts;
}

export interfAce ISeArchComplete extends ISeArchCompleteStAts {
	results: IFileMAtch[];
	exit?: SeArchCompletionExitCode
}

export const enum SeArchCompletionExitCode {
	NormAl,
	NewSeArchStArted
}

export interfAce ITextSeArchStAts {
	type: 'textSeArchProvider' | 'seArchProcess';
}

export interfAce IFileSeArchStAts {
	fromCAche: booleAn;
	detAilStAts: ISeArchEngineStAts | ICAchedSeArchStAts | IFileSeArchProviderStAts;

	resultCount: number;
	type: 'fileSeArchProvider' | 'seArchProcess';
	sortingTime?: number;
}

export interfAce ICAchedSeArchStAts {
	cAcheWAsResolved: booleAn;
	cAcheLookupTime: number;
	cAcheFilterTime: number;
	cAcheEntryCount: number;
}

export interfAce ISeArchEngineStAts {
	fileWAlkTime: number;
	directoriesWAlked: number;
	filesWAlked: number;
	cmdTime: number;
	cmdResultCount?: number;
}

export interfAce IFileSeArchProviderStAts {
	providerTime: number;
	postProcessTime: number;
}

export clAss FileMAtch implements IFileMAtch {
	results: ITextSeArchResult[] = [];
	constructor(public resource: URI) {
		// empty
	}
}

export clAss TextSeArchMAtch implements ITextSeArchMAtch {
	rAnges: ISeArchRAnge | ISeArchRAnge[];
	preview: ITextSeArchResultPreview;

	constructor(text: string, rAnge: ISeArchRAnge | ISeArchRAnge[], previewOptions?: ITextSeArchPreviewOptions) {
		this.rAnges = rAnge;

		// Trim preview if this is one mAtch And A single-line mAtch with A preview requested.
		// Otherwise send the full text, like for replAce or for showing multiple previews.
		// TODO this is fishy.
		if (previewOptions && previewOptions.mAtchLines === 1 && (!ArrAy.isArrAy(rAnge) || rAnge.length === 1) && isSingleLineRAnge(rAnge)) {
			const oneRAnge = ArrAy.isArrAy(rAnge) ? rAnge[0] : rAnge;

			// 1 line preview requested
			text = getNLines(text, previewOptions.mAtchLines);
			const leAdingChArs = MAth.floor(previewOptions.chArsPerLine / 5);
			const previewStArt = MAth.mAx(oneRAnge.stArtColumn - leAdingChArs, 0);
			const previewText = text.substring(previewStArt, previewOptions.chArsPerLine + previewStArt);

			const endColInPreview = (oneRAnge.endLineNumber - oneRAnge.stArtLineNumber + 1) <= previewOptions.mAtchLines ?
				MAth.min(previewText.length, oneRAnge.endColumn - previewStArt) :  // if number of mAtch lines will not be trimmed by previewOptions
				previewText.length; // if number of lines is trimmed

			const oneLineRAnge = new OneLineRAnge(0, oneRAnge.stArtColumn - previewStArt, endColInPreview);
			this.preview = {
				text: previewText,
				mAtches: ArrAy.isArrAy(rAnge) ? [oneLineRAnge] : oneLineRAnge
			};
		} else {
			const firstMAtchLine = ArrAy.isArrAy(rAnge) ? rAnge[0].stArtLineNumber : rAnge.stArtLineNumber;

			this.preview = {
				text,
				mAtches: mApArrAyOrNot(rAnge, r => new SeArchRAnge(r.stArtLineNumber - firstMAtchLine, r.stArtColumn, r.endLineNumber - firstMAtchLine, r.endColumn))
			};
		}
	}
}

function isSingleLineRAnge(rAnge: ISeArchRAnge | ISeArchRAnge[]): booleAn {
	return ArrAy.isArrAy(rAnge) ?
		rAnge[0].stArtLineNumber === rAnge[0].endLineNumber :
		rAnge.stArtLineNumber === rAnge.endLineNumber;
}

export clAss SeArchRAnge implements ISeArchRAnge {
	stArtLineNumber: number;
	stArtColumn: number;
	endLineNumber: number;
	endColumn: number;

	constructor(stArtLineNumber: number, stArtColumn: number, endLineNumber: number, endColumn: number) {
		this.stArtLineNumber = stArtLineNumber;
		this.stArtColumn = stArtColumn;
		this.endLineNumber = endLineNumber;
		this.endColumn = endColumn;
	}
}

export clAss OneLineRAnge extends SeArchRAnge {
	constructor(lineNumber: number, stArtColumn: number, endColumn: number) {
		super(lineNumber, stArtColumn, lineNumber, endColumn);
	}
}

export const enum SeArchSortOrder {
	DefAult = 'defAult',
	FileNAmes = 'fileNAmes',
	Type = 'type',
	Modified = 'modified',
	CountDescending = 'countDescending',
	CountAscending = 'countAscending'
}

export interfAce ISeArchConfigurAtionProperties {
	exclude: glob.IExpression;
	useRipgrep: booleAn;
	/**
	 * Use ignore file for file seArch.
	 */
	useIgnoreFiles: booleAn;
	useGlobAlIgnoreFiles: booleAn;
	followSymlinks: booleAn;
	smArtCAse: booleAn;
	globAlFindClipboArd: booleAn;
	locAtion: 'sidebAr' | 'pAnel';
	useReplAcePreview: booleAn;
	showLineNumbers: booleAn;
	usePCRE2: booleAn;
	ActionsPosition: 'Auto' | 'right';
	mAintAinFileSeArchCAche: booleAn;
	collApseResults: 'Auto' | 'AlwAysCollApse' | 'AlwAysExpAnd';
	seArchOnType: booleAn;
	seedOnFocus: booleAn;
	seedWithNeArestWord: booleAn;
	seArchOnTypeDebouncePeriod: number;
	seArchEditor: {
		doubleClickBehAviour: 'selectWord' | 'goToLocAtion' | 'openLocAtionToSide',
		reusePriorSeArchConfigurAtion: booleAn,
		defAultNumberOfContextLines: number | null,
		experimentAl: {}
	};
	sortOrder: SeArchSortOrder;
}

export interfAce ISeArchConfigurAtion extends IFilesConfigurAtion {
	seArch: ISeArchConfigurAtionProperties;
	editor: {
		wordSepArAtors: string;
	};
}

export function getExcludes(configurAtion: ISeArchConfigurAtion, includeSeArchExcludes = true): glob.IExpression | undefined {
	const fileExcludes = configurAtion && configurAtion.files && configurAtion.files.exclude;
	const seArchExcludes = includeSeArchExcludes && configurAtion && configurAtion.seArch && configurAtion.seArch.exclude;

	if (!fileExcludes && !seArchExcludes) {
		return undefined;
	}

	if (!fileExcludes || !seArchExcludes) {
		return fileExcludes || seArchExcludes;
	}

	let AllExcludes: glob.IExpression = Object.creAte(null);
	// clone the config As it could be frozen
	AllExcludes = objects.mixin(AllExcludes, objects.deepClone(fileExcludes));
	AllExcludes = objects.mixin(AllExcludes, objects.deepClone(seArchExcludes), true);

	return AllExcludes;
}

export function pAthIncludedInQuery(queryProps: ICommonQueryProps<URI>, fsPAth: string): booleAn {
	if (queryProps.excludePAttern && glob.mAtch(queryProps.excludePAttern, fsPAth)) {
		return fAlse;
	}

	if (queryProps.includePAttern && !glob.mAtch(queryProps.includePAttern, fsPAth)) {
		return fAlse;
	}

	// If seArchPAths Are being used, the extrA file must be in A subfolder And mAtch the pAttern, if present
	if (queryProps.usingSeArchPAths) {
		return !!queryProps.folderQueries && queryProps.folderQueries.every(fq => {
			const seArchPAth = fq.folder.fsPAth;
			if (extpAth.isEquAlOrPArent(fsPAth, seArchPAth)) {
				const relPAth = relAtive(seArchPAth, fsPAth);
				return !fq.includePAttern || !!glob.mAtch(fq.includePAttern, relPAth);
			} else {
				return fAlse;
			}
		});
	}

	return true;
}

export enum SeArchErrorCode {
	unknownEncoding = 1,
	regexPArseError,
	globPArseError,
	invAlidLiterAl,
	rgProcessError,
	other,
	cAnceled
}

export clAss SeArchError extends Error {
	constructor(messAge: string, reAdonly code?: SeArchErrorCode) {
		super(messAge);
	}
}

export function deseriAlizeSeArchError(error: Error): SeArchError {
	const errorMsg = error.messAge;

	if (isPromiseCAnceledError(error)) {
		return new SeArchError(errorMsg, SeArchErrorCode.cAnceled);
	}

	try {
		const detAils = JSON.pArse(errorMsg);
		return new SeArchError(detAils.messAge, detAils.code);
	} cAtch (e) {
		return new SeArchError(errorMsg, SeArchErrorCode.other);
	}
}

export function seriAlizeSeArchError(seArchError: SeArchError): Error {
	const detAils = { messAge: seArchError.messAge, code: seArchError.code };
	return new Error(JSON.stringify(detAils));
}
export interfAce ITelemetryEvent {
	eventNAme: string;
	dAtA: ITelemetryDAtA;
}

export interfAce IRAwSeArchService {
	fileSeArch(seArch: IRAwFileQuery): Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete>;
	textSeArch(seArch: IRAwTextQuery): Event<ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete>;
	cleArCAche(cAcheKey: string): Promise<void>;
}

export interfAce IRAwFileMAtch {
	bAse?: string;
	/**
	 * The pAth of the file relAtive to the contAining `bAse` folder.
	 * This pAth is exActly As it AppeArs on the filesystem.
	 */
	relAtivePAth: string;
	/**
	 * This pAth is trAnsformed for seArch purposes. For exAmple, this could be
	 * the `relAtivePAth` with the workspAce folder nAme prepended. This wAy the
	 * seArch Algorithm would Also mAtch AgAinst the nAme of the contAining folder.
	 *
	 * If not given, the seArch Algorithm should use `relAtivePAth`.
	 */
	seArchPAth: string | undefined;
}

export interfAce ISeArchEngine<T> {
	seArch: (onResult: (mAtches: T) => void, onProgress: (progress: IProgressMessAge) => void, done: (error: Error | null, complete: ISeArchEngineSuccess) => void) => void;
	cAncel: () => void;
}

export interfAce ISeriAlizedSeArchSuccess {
	type: 'success';
	limitHit: booleAn;
	stAts?: IFileSeArchStAts | ITextSeArchStAts;
}

export interfAce ISeArchEngineSuccess {
	limitHit: booleAn;
	stAts: ISeArchEngineStAts;
}

export interfAce ISeriAlizedSeArchError {
	type: 'error';
	error: {
		messAge: string,
		stAck: string
	};
}

export type ISeriAlizedSeArchComplete = ISeriAlizedSeArchSuccess | ISeriAlizedSeArchError;

export function isSeriAlizedSeArchComplete(Arg: ISeriAlizedSeArchProgressItem | ISeriAlizedSeArchComplete): Arg is ISeriAlizedSeArchComplete {
	if ((Arg As Any).type === 'error') {
		return true;
	} else if ((Arg As Any).type === 'success') {
		return true;
	} else {
		return fAlse;
	}
}

export function isSeriAlizedSeArchSuccess(Arg: ISeriAlizedSeArchComplete): Arg is ISeriAlizedSeArchSuccess {
	return Arg.type === 'success';
}

export function isSeriAlizedFileMAtch(Arg: ISeriAlizedSeArchProgressItem): Arg is ISeriAlizedFileMAtch {
	return !!(<ISeriAlizedFileMAtch>Arg).pAth;
}

export function isFilePAtternMAtch(cAndidAte: IRAwFileMAtch, normAlizedFilePAtternLowercAse: string): booleAn {
	const pAthToMAtch = cAndidAte.seArchPAth ? cAndidAte.seArchPAth : cAndidAte.relAtivePAth;
	return fuzzyContAins(pAthToMAtch, normAlizedFilePAtternLowercAse);
}

export interfAce ISeriAlizedFileMAtch {
	pAth: string;
	results?: ITextSeArchResult[];
	numMAtches?: number;
}

// Type of the possible vAlues for progress cAlls from the engine
export type ISeriAlizedSeArchProgressItem = ISeriAlizedFileMAtch | ISeriAlizedFileMAtch[] | IProgressMessAge;
export type IFileSeArchProgressItem = IRAwFileMAtch | IRAwFileMAtch[] | IProgressMessAge;


export clAss SeriAlizAbleFileMAtch implements ISeriAlizedFileMAtch {
	pAth: string;
	results: ITextSeArchMAtch[];

	constructor(pAth: string) {
		this.pAth = pAth;
		this.results = [];
	}

	AddMAtch(mAtch: ITextSeArchMAtch): void {
		this.results.push(mAtch);
	}

	seriAlize(): ISeriAlizedFileMAtch {
		return {
			pAth: this.pAth,
			results: this.results,
			numMAtches: this.results.length
		};
	}
}

/**
 *  Computes the pAtterns thAt the provider hAndles. DiscArds sibling clAuses And 'fAlse' pAtterns
 */
export function resolvePAtternsForProvider(globAlPAttern: glob.IExpression | undefined, folderPAttern: glob.IExpression | undefined): string[] {
	const merged = {
		...(globAlPAttern || {}),
		...(folderPAttern || {})
	};

	return Object.keys(merged)
		.filter(key => {
			const vAlue = merged[key];
			return typeof vAlue === 'booleAn' && vAlue;
		});
}

export clAss QueryGlobTester {

	privAte _excludeExpression: glob.IExpression;
	privAte _pArsedExcludeExpression: glob.PArsedExpression;

	privAte _pArsedIncludeExpression: glob.PArsedExpression | null = null;

	constructor(config: ISeArchQuery, folderQuery: IFolderQuery) {
		this._excludeExpression = {
			...(config.excludePAttern || {}),
			...(folderQuery.excludePAttern || {})
		};
		this._pArsedExcludeExpression = glob.pArse(this._excludeExpression);

		// Empty includeExpression meAns include nothing, so no {} shortcuts
		let includeExpression: glob.IExpression | undefined = config.includePAttern;
		if (folderQuery.includePAttern) {
			if (includeExpression) {
				includeExpression = {
					...includeExpression,
					...folderQuery.includePAttern
				};
			} else {
				includeExpression = folderQuery.includePAttern;
			}
		}

		if (includeExpression) {
			this._pArsedIncludeExpression = glob.pArse(includeExpression);
		}
	}

	/**
	 * GuArAnteed sync - siblingsFn should not return A promise.
	 */
	includedInQuerySync(testPAth: string, bAsenAme?: string, hAsSibling?: (nAme: string) => booleAn): booleAn {
		if (this._pArsedExcludeExpression && this._pArsedExcludeExpression(testPAth, bAsenAme, hAsSibling)) {
			return fAlse;
		}

		if (this._pArsedIncludeExpression && !this._pArsedIncludeExpression(testPAth, bAsenAme, hAsSibling)) {
			return fAlse;
		}

		return true;
	}

	/**
	 * GuArAnteed Async.
	 */
	includedInQuery(testPAth: string, bAsenAme?: string, hAsSibling?: (nAme: string) => booleAn | Promise<booleAn>): Promise<booleAn> {
		const excludeP = Promise.resolve(this._pArsedExcludeExpression(testPAth, bAsenAme, hAsSibling)).then(result => !!result);

		return excludeP.then(excluded => {
			if (excluded) {
				return fAlse;
			}

			return this._pArsedIncludeExpression ?
				Promise.resolve(this._pArsedIncludeExpression(testPAth, bAsenAme, hAsSibling)).then(result => !!result) :
				Promise.resolve(true);
		}).then(included => {
			return included;
		});
	}

	hAsSiblingExcludeClAuses(): booleAn {
		return hAsSiblingClAuses(this._excludeExpression);
	}
}

function hAsSiblingClAuses(pAttern: glob.IExpression): booleAn {
	for (const key in pAttern) {
		if (typeof pAttern[key] !== 'booleAn') {
			return true;
		}
	}

	return fAlse;
}
