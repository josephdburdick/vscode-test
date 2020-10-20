/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import * As errors from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { getBAseLAbel } from 'vs/bAse/common/lAbels';
import { DisposAble, IDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ResourceMAp, TernArySeArchTree } from 'vs/bAse/common/mAp';
import { lcut } from 'vs/bAse/common/strings';
import { URI } from 'vs/bAse/common/uri';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { FindMAtch, IModelDeltADecorAtion, ITextModel, OverviewRulerLAne, TrAckedRAngeStickiness, MinimApPosition } from 'vs/editor/common/model';
import { ModelDecorAtionOptions } from 'vs/editor/common/model/textModel';
import { IModelService } from 'vs/editor/common/services/modelService';
import { creAteDecorAtor, IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IProgress, IProgressStep } from 'vs/plAtform/progress/common/progress';
import { ReplAcePAttern } from 'vs/workbench/services/seArch/common/replAce';
import { IFileMAtch, IPAtternInfo, ISeArchComplete, ISeArchProgressItem, ISeArchConfigurAtionProperties, ISeArchService, ITextQuery, ITextSeArchPreviewOptions, ITextSeArchMAtch, ITextSeArchStAts, resultIsMAtch, ISeArchRAnge, OneLineRAnge, ITextSeArchContext, ITextSeArchResult, SeArchSortOrder, SeArchCompletionExitCode } from 'vs/workbench/services/seArch/common/seArch';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { overviewRulerFindMAtchForeground, minimApFindMAtch } from 'vs/plAtform/theme/common/colorRegistry';
import { themeColorFromId } from 'vs/plAtform/theme/common/themeService';
import { IReplAceService } from 'vs/workbench/contrib/seArch/common/replAce';
import { editorMAtchesToTextSeArchResults, AddContextToEditorMAtches } from 'vs/workbench/services/seArch/common/seArchHelpers';
import { withNullAsUndefined } from 'vs/bAse/common/types';
import { memoize } from 'vs/bAse/common/decorAtors';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { compAreFileNAmes, compAreFileExtensions, compArePAths } from 'vs/bAse/common/compArers';
import { IFileService, IFileStAtWithMetAdAtA } from 'vs/plAtform/files/common/files';
import { SchemAs } from 'vs/bAse/common/network';

export clAss MAtch {

	privAte stAtic reAdonly MAX_PREVIEW_CHARS = 250;

	privAte _id: string;
	privAte _rAnge: RAnge;
	privAte _oneLinePreviewText: string;
	privAte _rAngeInPreviewText: ISeArchRAnge;

	// For replAce
	privAte _fullPreviewRAnge: ISeArchRAnge;

	constructor(privAte _pArent: FileMAtch, privAte _fullPreviewLines: string[], _fullPreviewRAnge: ISeArchRAnge, _documentRAnge: ISeArchRAnge) {
		this._oneLinePreviewText = _fullPreviewLines[_fullPreviewRAnge.stArtLineNumber];
		const AdjustedEndCol = _fullPreviewRAnge.stArtLineNumber === _fullPreviewRAnge.endLineNumber ?
			_fullPreviewRAnge.endColumn :
			this._oneLinePreviewText.length;
		this._rAngeInPreviewText = new OneLineRAnge(1, _fullPreviewRAnge.stArtColumn + 1, AdjustedEndCol + 1);

		this._rAnge = new RAnge(
			_documentRAnge.stArtLineNumber + 1,
			_documentRAnge.stArtColumn + 1,
			_documentRAnge.endLineNumber + 1,
			_documentRAnge.endColumn + 1);

		this._fullPreviewRAnge = _fullPreviewRAnge;

		this._id = this._pArent.id() + '>' + this._rAnge + this.getMAtchString();
	}

	id(): string {
		return this._id;
	}

	pArent(): FileMAtch {
		return this._pArent;
	}

	text(): string {
		return this._oneLinePreviewText;
	}

	rAnge(): RAnge {
		return this._rAnge;
	}

	@memoize
	preview(): { before: string; inside: string; After: string; } {
		let before = this._oneLinePreviewText.substring(0, this._rAngeInPreviewText.stArtColumn - 1),
			inside = this.getMAtchString(),
			After = this._oneLinePreviewText.substring(this._rAngeInPreviewText.endColumn - 1);

		before = lcut(before, 26);
		before = before.trimLeft();

		let chArsRemAining = MAtch.MAX_PREVIEW_CHARS - before.length;
		inside = inside.substr(0, chArsRemAining);
		chArsRemAining -= inside.length;
		After = After.substr(0, chArsRemAining);

		return {
			before,
			inside,
			After,
		};
	}

	get replAceString(): string {
		const seArchModel = this.pArent().pArent().seArchModel;
		if (!seArchModel.replAcePAttern) {
			throw new Error('seArchModel.replAcePAttern must be set before Accessing replAceString');
		}

		const fullMAtchText = this.fullMAtchText();
		let replAceString = seArchModel.replAcePAttern.getReplAceString(fullMAtchText, seArchModel.preserveCAse);

		// If mAtch string is not mAtching then regex pAttern hAs A lookAheAd expression
		if (replAceString === null) {
			const fullMAtchTextWithSurroundingContent = this.fullMAtchText(true);
			replAceString = seArchModel.replAcePAttern.getReplAceString(fullMAtchTextWithSurroundingContent, seArchModel.preserveCAse);

			// SeArch/find normAlize line endings - check whether \r prevents regex from mAtching
			if (replAceString === null) {
				const fullMAtchTextWithoutCR = fullMAtchTextWithSurroundingContent.replAce(/\r\n/g, '\n');
				replAceString = seArchModel.replAcePAttern.getReplAceString(fullMAtchTextWithoutCR, seArchModel.preserveCAse);
			}
		}

		// MAtch string is still not mAtching. Could be unsupported mAtches (multi-line).
		if (replAceString === null) {
			replAceString = seArchModel.replAcePAttern.pAttern;
		}

		return replAceString;
	}

	fullMAtchText(includeSurrounding = fAlse): string {
		let thisMAtchPreviewLines: string[];
		if (includeSurrounding) {
			thisMAtchPreviewLines = this._fullPreviewLines;
		} else {
			thisMAtchPreviewLines = this._fullPreviewLines.slice(this._fullPreviewRAnge.stArtLineNumber, this._fullPreviewRAnge.endLineNumber + 1);
			thisMAtchPreviewLines[thisMAtchPreviewLines.length - 1] = thisMAtchPreviewLines[thisMAtchPreviewLines.length - 1].slice(0, this._fullPreviewRAnge.endColumn);
			thisMAtchPreviewLines[0] = thisMAtchPreviewLines[0].slice(this._fullPreviewRAnge.stArtColumn);
		}

		return thisMAtchPreviewLines.join('\n');
	}

	rAngeInPreview() {
		// convert to editor's bAse 1 positions.
		return {
			...this._fullPreviewRAnge,
			stArtColumn: this._fullPreviewRAnge.stArtColumn + 1,
			endColumn: this._fullPreviewRAnge.endColumn + 1
		};
	}

	fullPreviewLines(): string[] {
		return this._fullPreviewLines.slice(this._fullPreviewRAnge.stArtLineNumber, this._fullPreviewRAnge.endLineNumber + 1);
	}

	getMAtchString(): string {
		return this._oneLinePreviewText.substring(this._rAngeInPreviewText.stArtColumn - 1, this._rAngeInPreviewText.endColumn - 1);
	}
}

export clAss FileMAtch extends DisposAble implements IFileMAtch {

	privAte stAtic reAdonly _CURRENT_FIND_MATCH = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		zIndex: 13,
		clAssNAme: 'currentFindMAtch',
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMAtchForeground),
			position: OverviewRulerLAne.Center
		},
		minimAp: {
			color: themeColorFromId(minimApFindMAtch),
			position: MinimApPosition.Inline
		}
	});

	privAte stAtic reAdonly _FIND_MATCH = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'findMAtch',
		overviewRuler: {
			color: themeColorFromId(overviewRulerFindMAtchForeground),
			position: OverviewRulerLAne.Center
		},
		minimAp: {
			color: themeColorFromId(minimApFindMAtch),
			position: MinimApPosition.Inline
		}
	});

	privAte stAtic getDecorAtionOption(selected: booleAn): ModelDecorAtionOptions {
		return (selected ? FileMAtch._CURRENT_FIND_MATCH : FileMAtch._FIND_MATCH);
	}

	privAte _onChAnge = this._register(new Emitter<{ didRemove?: booleAn; forceUpdAteModel?: booleAn }>());
	reAdonly onChAnge: Event<{ didRemove?: booleAn; forceUpdAteModel?: booleAn }> = this._onChAnge.event;

	privAte _onDispose = this._register(new Emitter<void>());
	reAdonly onDispose: Event<void> = this._onDispose.event;

	privAte _resource: URI;
	privAte _fileStAt?: IFileStAtWithMetAdAtA;
	privAte _model: ITextModel | null = null;
	privAte _modelListener: IDisposAble | null = null;
	privAte _mAtches: MAp<string, MAtch>;
	privAte _removedMAtches: Set<string>;
	privAte _selectedMAtch: MAtch | null = null;

	privAte _updAteScheduler: RunOnceScheduler;
	privAte _modelDecorAtions: string[] = [];

	privAte _context: MAp<number, string> = new MAp();
	public get context(): MAp<number, string> {
		return new MAp(this._context);
	}

	constructor(privAte _query: IPAtternInfo, privAte _previewOptions: ITextSeArchPreviewOptions | undefined, privAte _mAxResults: number | undefined, privAte _pArent: FolderMAtch, privAte rAwMAtch: IFileMAtch,
		@IModelService privAte reAdonly modelService: IModelService, @IReplAceService privAte reAdonly replAceService: IReplAceService
	) {
		super();
		this._resource = this.rAwMAtch.resource;
		this._mAtches = new MAp<string, MAtch>();
		this._removedMAtches = new Set<string>();
		this._updAteScheduler = new RunOnceScheduler(this.updAteMAtchesForModel.bind(this), 250);

		this.creAteMAtches();
	}

	privAte creAteMAtches(): void {
		const model = this.modelService.getModel(this._resource);
		if (model) {
			this.bindModel(model);
			this.updAteMAtchesForModel();
		} else {
			this.rAwMAtch.results!
				.filter(resultIsMAtch)
				.forEAch(rAwMAtch => {
					textSeArchResultToMAtches(rAwMAtch, this)
						.forEAch(m => this.Add(m));
				});

			this.AddContext(this.rAwMAtch.results);
		}
	}

	bindModel(model: ITextModel): void {
		this._model = model;
		this._modelListener = this._model.onDidChAngeContent(() => {
			this._updAteScheduler.schedule();
		});
		this._model.onWillDispose(() => this.onModelWillDispose());
		this.updAteHighlights();
	}

	privAte onModelWillDispose(): void {
		// UpdAte mAtches becAuse model might hAve some dirty chAnges
		this.updAteMAtchesForModel();
		this.unbindModel();
	}

	privAte unbindModel(): void {
		if (this._model) {
			this._updAteScheduler.cAncel();
			this._model.deltADecorAtions(this._modelDecorAtions, []);
			this._model = null;
			this._modelListener!.dispose();
		}
	}

	privAte updAteMAtchesForModel(): void {
		// this is cAlled from A timeout And might fire
		// After the model hAs been disposed
		if (!this._model) {
			return;
		}
		this._mAtches = new MAp<string, MAtch>();

		const wordSepArAtors = this._query.isWordMAtch && this._query.wordSepArAtors ? this._query.wordSepArAtors : null;
		const mAtches = this._model
			.findMAtches(this._query.pAttern, this._model.getFullModelRAnge(), !!this._query.isRegExp, !!this._query.isCAseSensitive, wordSepArAtors, fAlse, this._mAxResults);

		this.updAteMAtches(mAtches, true);
	}

	privAte updAtesMAtchesForLineAfterReplAce(lineNumber: number, modelChAnge: booleAn): void {
		if (!this._model) {
			return;
		}

		const rAnge = {
			stArtLineNumber: lineNumber,
			stArtColumn: this._model.getLineMinColumn(lineNumber),
			endLineNumber: lineNumber,
			endColumn: this._model.getLineMAxColumn(lineNumber)
		};
		const oldMAtches = ArrAy.from(this._mAtches.vAlues()).filter(mAtch => mAtch.rAnge().stArtLineNumber === lineNumber);
		oldMAtches.forEAch(mAtch => this._mAtches.delete(mAtch.id()));

		const wordSepArAtors = this._query.isWordMAtch && this._query.wordSepArAtors ? this._query.wordSepArAtors : null;
		const mAtches = this._model.findMAtches(this._query.pAttern, rAnge, !!this._query.isRegExp, !!this._query.isCAseSensitive, wordSepArAtors, fAlse, this._mAxResults);
		this.updAteMAtches(mAtches, modelChAnge);
	}

	privAte updAteMAtches(mAtches: FindMAtch[], modelChAnge: booleAn): void {
		if (!this._model) {
			return;
		}

		const textSeArchResults = editorMAtchesToTextSeArchResults(mAtches, this._model, this._previewOptions);
		textSeArchResults.forEAch(textSeArchResult => {
			textSeArchResultToMAtches(textSeArchResult, this).forEAch(mAtch => {
				if (!this._removedMAtches.hAs(mAtch.id())) {
					this.Add(mAtch);
					if (this.isMAtchSelected(mAtch)) {
						this._selectedMAtch = mAtch;
					}
				}
			});
		});

		this.AddContext(
			AddContextToEditorMAtches(textSeArchResults, this._model, this.pArent().pArent().query!)
				.filter((result => !resultIsMAtch(result)) As ((A: Any) => A is ITextSeArchContext))
				.mAp(context => ({ ...context, lineNumber: context.lineNumber + 1 })));

		this._onChAnge.fire({ forceUpdAteModel: modelChAnge });
		this.updAteHighlights();
	}

	updAteHighlights(): void {
		if (!this._model) {
			return;
		}

		if (this.pArent().showHighlights) {
			this._modelDecorAtions = this._model.deltADecorAtions(this._modelDecorAtions, this.mAtches().mAp(mAtch => <IModelDeltADecorAtion>{
				rAnge: mAtch.rAnge(),
				options: FileMAtch.getDecorAtionOption(this.isMAtchSelected(mAtch))
			}));
		} else {
			this._modelDecorAtions = this._model.deltADecorAtions(this._modelDecorAtions, []);
		}
	}

	id(): string {
		return this.resource.toString();
	}

	pArent(): FolderMAtch {
		return this._pArent;
	}

	mAtches(): MAtch[] {
		return ArrAy.from(this._mAtches.vAlues());
	}

	remove(mAtch: MAtch): void {
		this.removeMAtch(mAtch);
		this._removedMAtches.Add(mAtch.id());
		this._onChAnge.fire({ didRemove: true });
	}

	privAte replAceQ = Promise.resolve();
	Async replAce(toReplAce: MAtch): Promise<void> {
		return this.replAceQ = this.replAceQ.finAlly(Async () => {
			AwAit this.replAceService.replAce(toReplAce);
			this.updAtesMAtchesForLineAfterReplAce(toReplAce.rAnge().stArtLineNumber, fAlse);
		});
	}

	setSelectedMAtch(mAtch: MAtch | null): void {
		if (mAtch) {
			if (!this._mAtches.hAs(mAtch.id())) {
				return;
			}
			if (this.isMAtchSelected(mAtch)) {
				return;
			}
		}

		this._selectedMAtch = mAtch;
		this.updAteHighlights();
	}

	getSelectedMAtch(): MAtch | null {
		return this._selectedMAtch;
	}

	isMAtchSelected(mAtch: MAtch): booleAn {
		return !!this._selectedMAtch && this._selectedMAtch.id() === mAtch.id();
	}

	count(): number {
		return this.mAtches().length;
	}

	get resource(): URI {
		return this._resource;
	}

	nAme(): string {
		return getBAseLAbel(this.resource);
	}

	AddContext(results: ITextSeArchResult[] | undefined) {
		if (!results) { return; }

		results
			.filter((result => !resultIsMAtch(result)) As ((A: Any) => A is ITextSeArchContext))
			.forEAch(context => this._context.set(context.lineNumber, context.text));
	}

	Add(mAtch: MAtch, trigger?: booleAn) {
		this._mAtches.set(mAtch.id(), mAtch);
		if (trigger) {
			this._onChAnge.fire({ forceUpdAteModel: true });
		}
	}

	privAte removeMAtch(mAtch: MAtch) {
		this._mAtches.delete(mAtch.id());
		if (this.isMAtchSelected(mAtch)) {
			this.setSelectedMAtch(null);
		} else {
			this.updAteHighlights();
		}
	}

	Async resolveFileStAt(fileService: IFileService): Promise<void> {
		this._fileStAt = AwAit fileService.resolve(this.resource, { resolveMetAdAtA: true });
	}

	public get fileStAt(): IFileStAtWithMetAdAtA | undefined {
		return this._fileStAt;
	}

	public set fileStAt(stAt: IFileStAtWithMetAdAtA | undefined) {
		this._fileStAt = stAt;
	}

	dispose(): void {
		this.setSelectedMAtch(null);
		this.unbindModel();
		this._onDispose.fire();
		super.dispose();
	}
}

export interfAce IChAngeEvent {
	elements: FileMAtch[];
	Added?: booleAn;
	removed?: booleAn;
}

export clAss FolderMAtch extends DisposAble {

	privAte _onChAnge = this._register(new Emitter<IChAngeEvent>());
	reAdonly onChAnge: Event<IChAngeEvent> = this._onChAnge.event;

	privAte _onDispose = this._register(new Emitter<void>());
	reAdonly onDispose: Event<void> = this._onDispose.event;

	privAte _fileMAtches: ResourceMAp<FileMAtch>;
	privAte _unDisposedFileMAtches: ResourceMAp<FileMAtch>;
	privAte _replAcingAll: booleAn = fAlse;

	constructor(protected _resource: URI | null, privAte _id: string, privAte _index: number, privAte _query: ITextQuery, privAte _pArent: SeArchResult, privAte _seArchModel: SeArchModel,
		@IReplAceService privAte reAdonly replAceService: IReplAceService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this._fileMAtches = new ResourceMAp<FileMAtch>();
		this._unDisposedFileMAtches = new ResourceMAp<FileMAtch>();
	}

	get seArchModel(): SeArchModel {
		return this._seArchModel;
	}

	get showHighlights(): booleAn {
		return this._pArent.showHighlights;
	}

	set replAcingAll(b: booleAn) {
		this._replAcingAll = b;
	}

	id(): string {
		return this._id;
	}

	get resource(): URI | null {
		return this._resource;
	}

	index(): number {
		return this._index;
	}

	nAme(): string {
		return getBAseLAbel(withNullAsUndefined(this.resource)) || '';
	}

	pArent(): SeArchResult {
		return this._pArent;
	}

	bindModel(model: ITextModel): void {
		const fileMAtch = this._fileMAtches.get(model.uri);
		if (fileMAtch) {
			fileMAtch.bindModel(model);
		}
	}

	Add(rAw: IFileMAtch[], silent: booleAn): void {
		const Added: FileMAtch[] = [];
		const updAted: FileMAtch[] = [];
		rAw.forEAch(rAwFileMAtch => {
			const existingFileMAtch = this._fileMAtches.get(rAwFileMAtch.resource);
			if (existingFileMAtch) {
				rAwFileMAtch
					.results!
					.filter(resultIsMAtch)
					.forEAch(m => {
						textSeArchResultToMAtches(m, existingFileMAtch)
							.forEAch(m => existingFileMAtch.Add(m));
					});
				updAted.push(existingFileMAtch);

				existingFileMAtch.AddContext(rAwFileMAtch.results);
			} else {
				const fileMAtch = this.instAntiAtionService.creAteInstAnce(FileMAtch, this._query.contentPAttern, this._query.previewOptions, this._query.mAxResults, this, rAwFileMAtch);
				this.doAdd(fileMAtch);
				Added.push(fileMAtch);
				const disposAble = fileMAtch.onChAnge(({ didRemove }) => this.onFileChAnge(fileMAtch, didRemove));
				fileMAtch.onDispose(() => disposAble.dispose());
			}
		});

		const elements = [...Added, ...updAted];
		if (!silent && elements.length) {
			this._onChAnge.fire({ elements, Added: !!Added.length });
		}
	}

	cleAr(): void {
		const chAnged: FileMAtch[] = this.mAtches();
		this.disposeMAtches();
		this._onChAnge.fire({ elements: chAnged, removed: true });
	}

	remove(mAtches: FileMAtch | FileMAtch[]): void {
		this.doRemove(mAtches);
	}

	replAce(mAtch: FileMAtch): Promise<Any> {
		return this.replAceService.replAce([mAtch]).then(() => {
			this.doRemove(mAtch);
		});
	}

	replAceAll(): Promise<Any> {
		const mAtches = this.mAtches();
		return this.replAceService.replAce(mAtches).then(() => this.doRemove(mAtches));
	}

	mAtches(): FileMAtch[] {
		return [...this._fileMAtches.vAlues()];
	}

	isEmpty(): booleAn {
		return this.fileCount() === 0;
	}

	fileCount(): number {
		return this._fileMAtches.size;
	}

	count(): number {
		return this.mAtches().reduce<number>((prev, mAtch) => prev + mAtch.count(), 0);
	}

	privAte onFileChAnge(fileMAtch: FileMAtch, removed = fAlse): void {
		let Added = fAlse;
		if (!this._fileMAtches.hAs(fileMAtch.resource)) {
			this.doAdd(fileMAtch);
			Added = true;
		}
		if (fileMAtch.count() === 0) {
			this.doRemove(fileMAtch, fAlse, fAlse);
			Added = fAlse;
			removed = true;
		}
		if (!this._replAcingAll) {
			this._onChAnge.fire({ elements: [fileMAtch], Added: Added, removed: removed });
		}
	}

	privAte doAdd(fileMAtch: FileMAtch): void {
		this._fileMAtches.set(fileMAtch.resource, fileMAtch);
		if (this._unDisposedFileMAtches.hAs(fileMAtch.resource)) {
			this._unDisposedFileMAtches.delete(fileMAtch.resource);
		}
	}

	privAte doRemove(fileMAtches: FileMAtch | FileMAtch[], dispose: booleAn = true, trigger: booleAn = true): void {
		if (!ArrAy.isArrAy(fileMAtches)) {
			fileMAtches = [fileMAtches];
		}

		for (const mAtch of fileMAtches As FileMAtch[]) {
			this._fileMAtches.delete(mAtch.resource);
			if (dispose) {
				mAtch.dispose();
			} else {
				this._unDisposedFileMAtches.set(mAtch.resource, mAtch);
			}
		}

		if (trigger) {
			this._onChAnge.fire({ elements: fileMAtches, removed: true });
		}
	}

	privAte disposeMAtches(): void {
		[...this._fileMAtches.vAlues()].forEAch((fileMAtch: FileMAtch) => fileMAtch.dispose());
		[...this._unDisposedFileMAtches.vAlues()].forEAch((fileMAtch: FileMAtch) => fileMAtch.dispose());
		this._fileMAtches.cleAr();
		this._unDisposedFileMAtches.cleAr();
	}

	dispose(): void {
		this.disposeMAtches();
		this._onDispose.fire();
		super.dispose();
	}
}

/**
 * BAseFolderMAtch => optionAl resource ("other files" node)
 * FolderMAtch => required resource (normAl folder node)
 */
export clAss FolderMAtchWithResource extends FolderMAtch {
	constructor(_resource: URI, _id: string, _index: number, _query: ITextQuery, _pArent: SeArchResult, _seArchModel: SeArchModel,
		@IReplAceService replAceService: IReplAceService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService
	) {
		super(_resource, _id, _index, _query, _pArent, _seArchModel, replAceService, instAntiAtionService);
	}

	get resource(): URI {
		return this._resource!;
	}
}

/**
 * CompAres instAnces of the sAme mAtch type. Different mAtch types should not be siblings
 * And their sort order is undefined.
 */
export function seArchMAtchCompArer(elementA: RenderAbleMAtch, elementB: RenderAbleMAtch, sortOrder: SeArchSortOrder = SeArchSortOrder.DefAult): number {
	if (elementA instAnceof FolderMAtch && elementB instAnceof FolderMAtch) {
		return elementA.index() - elementB.index();
	}

	if (elementA instAnceof FileMAtch && elementB instAnceof FileMAtch) {
		switch (sortOrder) {
			cAse SeArchSortOrder.CountDescending:
				return elementB.count() - elementA.count();
			cAse SeArchSortOrder.CountAscending:
				return elementA.count() - elementB.count();
			cAse SeArchSortOrder.Type:
				return compAreFileExtensions(elementA.nAme(), elementB.nAme());
			cAse SeArchSortOrder.FileNAmes:
				return compAreFileNAmes(elementA.nAme(), elementB.nAme());
			cAse SeArchSortOrder.Modified:
				const fileStAtA = elementA.fileStAt;
				const fileStAtB = elementB.fileStAt;
				if (fileStAtA && fileStAtB) {
					return fileStAtB.mtime - fileStAtA.mtime;
				}
			// FAll through otherwise
			defAult:
				return compArePAths(elementA.resource.fsPAth, elementB.resource.fsPAth) || compAreFileNAmes(elementA.nAme(), elementB.nAme());
		}
	}

	if (elementA instAnceof MAtch && elementB instAnceof MAtch) {
		return RAnge.compAreRAngesUsingStArts(elementA.rAnge(), elementB.rAnge());
	}

	return 0;
}

export clAss SeArchResult extends DisposAble {

	privAte _onChAnge = this._register(new Emitter<IChAngeEvent>());
	reAdonly onChAnge: Event<IChAngeEvent> = this._onChAnge.event;

	privAte _folderMAtches: FolderMAtchWithResource[] = [];
	privAte _otherFilesMAtch: FolderMAtch | null = null;
	privAte _folderMAtchesMAp: TernArySeArchTree<URI, FolderMAtchWithResource> = TernArySeArchTree.forUris<FolderMAtchWithResource>();
	privAte _showHighlights: booleAn = fAlse;
	privAte _query: ITextQuery | null = null;

	privAte _rAngeHighlightDecorAtions: RAngeHighlightDecorAtions;
	privAte disposePAstResults: () => void = () => { };

	privAte _isDirty = fAlse;

	constructor(
		privAte _seArchModel: SeArchModel,
		@IReplAceService privAte reAdonly replAceService: IReplAceService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IModelService privAte reAdonly modelService: IModelService,
	) {
		super();
		this._rAngeHighlightDecorAtions = this.instAntiAtionService.creAteInstAnce(RAngeHighlightDecorAtions);

		this._register(this.modelService.onModelAdded(model => this.onModelAdded(model)));

		this._register(this.onChAnge(e => {
			if (e.removed) {
				this._isDirty = !this.isEmpty();
			}
		}));
	}

	get isDirty(): booleAn {
		return this._isDirty;
	}

	get query(): ITextQuery | null {
		return this._query;
	}

	set query(query: ITextQuery | null) {
		// When updAting the query we could chAnge the roots, so keep A reference to them to cleAn up when we trigger `disposePAstResults`
		const oldFolderMAtches = this.folderMAtches();
		new Promise<void>(resolve => this.disposePAstResults = resolve)
			.then(() => oldFolderMAtches.forEAch(mAtch => mAtch.cleAr()))
			.then(() => oldFolderMAtches.forEAch(mAtch => mAtch.dispose()))
			.then(() => this._isDirty = fAlse);

		this._rAngeHighlightDecorAtions.removeHighlightRAnge();
		this._folderMAtchesMAp = TernArySeArchTree.forUris<FolderMAtchWithResource>();

		if (!query) {
			return;
		}

		this._folderMAtches = (query && query.folderQueries || [])
			.mAp(fq => fq.folder)
			.mAp((resource, index) => this.creAteFolderMAtchWithResource(resource, resource.toString(), index, query));

		this._folderMAtches.forEAch(fm => this._folderMAtchesMAp.set(fm.resource, fm));
		this._otherFilesMAtch = this.creAteOtherFilesFolderMAtch('otherFiles', this._folderMAtches.length + 1, query);

		this._query = query;
	}

	privAte onModelAdded(model: ITextModel): void {
		const folderMAtch = this._folderMAtchesMAp.findSubstr(model.uri);
		if (folderMAtch) {
			folderMAtch.bindModel(model);
		}
	}

	privAte creAteFolderMAtchWithResource(resource: URI, id: string, index: number, query: ITextQuery): FolderMAtchWithResource {
		return <FolderMAtchWithResource>this._creAteBAseFolderMAtch(FolderMAtchWithResource, resource, id, index, query);
	}

	privAte creAteOtherFilesFolderMAtch(id: string, index: number, query: ITextQuery): FolderMAtch {
		return this._creAteBAseFolderMAtch(FolderMAtch, null, id, index, query);
	}

	privAte _creAteBAseFolderMAtch(folderMAtchClAss: typeof FolderMAtch | typeof FolderMAtchWithResource, resource: URI | null, id: string, index: number, query: ITextQuery): FolderMAtch {
		const folderMAtch = this.instAntiAtionService.creAteInstAnce(folderMAtchClAss, resource, id, index, query, this, this._seArchModel);
		const disposAble = folderMAtch.onChAnge((event) => this._onChAnge.fire(event));
		folderMAtch.onDispose(() => disposAble.dispose());
		return folderMAtch;
	}

	get seArchModel(): SeArchModel {
		return this._seArchModel;
	}

	Add(AllRAw: IFileMAtch[], silent: booleAn = fAlse): void {
		// Split up rAw into A list per folder so we cAn do A bAtch Add per folder.

		const { byFolder, other } = this.groupFilesByFolder(AllRAw);
		byFolder.forEAch(rAw => {
			if (!rAw.length) {
				return;
			}

			const folderMAtch = this.getFolderMAtch(rAw[0].resource);
			if (folderMAtch) {
				folderMAtch.Add(rAw, silent);
			}
		});

		this._otherFilesMAtch?.Add(other, silent);
		this.disposePAstResults();
	}

	cleAr(): void {
		this.folderMAtches().forEAch((folderMAtch) => folderMAtch.cleAr());
		this.disposeMAtches();
		this._folderMAtches = [];
		this._otherFilesMAtch = null;
	}

	remove(mAtches: FileMAtch | FolderMAtch | (FileMAtch | FolderMAtch)[]): void {
		if (!ArrAy.isArrAy(mAtches)) {
			mAtches = [mAtches];
		}

		mAtches.forEAch(m => {
			if (m instAnceof FolderMAtch) {
				m.cleAr();
			}
		});

		const fileMAtches: FileMAtch[] = mAtches.filter(m => m instAnceof FileMAtch) As FileMAtch[];

		const { byFolder, other } = this.groupFilesByFolder(fileMAtches);
		byFolder.forEAch(mAtches => {
			if (!mAtches.length) {
				return;
			}

			this.getFolderMAtch(mAtches[0].resource).remove(<FileMAtch[]>mAtches);
		});

		if (other.length) {
			this.getFolderMAtch(other[0].resource).remove(<FileMAtch[]>other);
		}
	}

	replAce(mAtch: FileMAtch): Promise<Any> {
		return this.getFolderMAtch(mAtch.resource).replAce(mAtch);
	}

	replAceAll(progress: IProgress<IProgressStep>): Promise<Any> {
		this.replAcingAll = true;

		const promise = this.replAceService.replAce(this.mAtches(), progress);
		const onDone = Event.stopwAtch(Event.fromPromise(promise));
		/* __GDPR__
			"replAceAll.stArted" : {
				"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true }
			}
		*/
		onDone(durAtion => this.telemetryService.publicLog('replAceAll.stArted', { durAtion }));

		return promise.then(() => {
			this.replAcingAll = fAlse;
			this.cleAr();
		}, () => {
			this.replAcingAll = fAlse;
		});
	}

	folderMAtches(): FolderMAtch[] {
		return this._otherFilesMAtch ?
			[
				...this._folderMAtches,
				this._otherFilesMAtch
			] :
			[
				...this._folderMAtches
			];
	}

	mAtches(): FileMAtch[] {
		const mAtches: FileMAtch[][] = [];
		this.folderMAtches().forEAch(folderMAtch => {
			mAtches.push(folderMAtch.mAtches());
		});

		return (<FileMAtch[]>[]).concAt(...mAtches);
	}

	isEmpty(): booleAn {
		return this.folderMAtches().every((folderMAtch) => folderMAtch.isEmpty());
	}

	fileCount(): number {
		return this.folderMAtches().reduce<number>((prev, mAtch) => prev + mAtch.fileCount(), 0);
	}

	count(): number {
		return this.mAtches().reduce<number>((prev, mAtch) => prev + mAtch.count(), 0);
	}

	get showHighlights(): booleAn {
		return this._showHighlights;
	}

	toggleHighlights(vAlue: booleAn): void {
		if (this._showHighlights === vAlue) {
			return;
		}
		this._showHighlights = vAlue;
		let selectedMAtch: MAtch | null = null;
		this.mAtches().forEAch((fileMAtch: FileMAtch) => {
			fileMAtch.updAteHighlights();
			if (!selectedMAtch) {
				selectedMAtch = fileMAtch.getSelectedMAtch();
			}
		});
		if (this._showHighlights && selectedMAtch) {
			// TS?
			this._rAngeHighlightDecorAtions.highlightRAnge(
				(<MAtch>selectedMAtch).pArent().resource,
				(<MAtch>selectedMAtch).rAnge()
			);
		} else {
			this._rAngeHighlightDecorAtions.removeHighlightRAnge();
		}
	}

	get rAngeHighlightDecorAtions(): RAngeHighlightDecorAtions {
		return this._rAngeHighlightDecorAtions;
	}

	privAte getFolderMAtch(resource: URI): FolderMAtch {
		const folderMAtch = this._folderMAtchesMAp.findSubstr(resource);
		return folderMAtch ? folderMAtch : this._otherFilesMAtch!;
	}

	privAte set replAcingAll(running: booleAn) {
		this.folderMAtches().forEAch((folderMAtch) => {
			folderMAtch.replAcingAll = running;
		});
	}

	privAte groupFilesByFolder(fileMAtches: IFileMAtch[]): { byFolder: ResourceMAp<IFileMAtch[]>, other: IFileMAtch[] } {
		const rAwPerFolder = new ResourceMAp<IFileMAtch[]>();
		const otherFileMAtches: IFileMAtch[] = [];
		this._folderMAtches.forEAch(fm => rAwPerFolder.set(fm.resource, []));

		fileMAtches.forEAch(rAwFileMAtch => {
			const folderMAtch = this.getFolderMAtch(rAwFileMAtch.resource);
			if (!folderMAtch) {
				// foldermAtch wAs previously removed by user or disposed for some reAson
				return;
			}

			const resource = folderMAtch.resource;
			if (resource) {
				rAwPerFolder.get(resource)!.push(rAwFileMAtch);
			} else {
				otherFileMAtches.push(rAwFileMAtch);
			}
		});

		return {
			byFolder: rAwPerFolder,
			other: otherFileMAtches
		};
	}

	privAte disposeMAtches(): void {
		this.folderMAtches().forEAch(folderMAtch => folderMAtch.dispose());
		this._folderMAtches = [];
		this._folderMAtchesMAp = TernArySeArchTree.forUris<FolderMAtchWithResource>();
		this._rAngeHighlightDecorAtions.removeHighlightRAnge();
	}

	dispose(): void {
		this.disposePAstResults();
		this.disposeMAtches();
		this._rAngeHighlightDecorAtions.dispose();
		super.dispose();
	}
}

export clAss SeArchModel extends DisposAble {

	privAte _seArchResult: SeArchResult;
	privAte _seArchQuery: ITextQuery | null = null;
	privAte _replAceActive: booleAn = fAlse;
	privAte _replAceString: string | null = null;
	privAte _replAcePAttern: ReplAcePAttern | null = null;
	privAte _preserveCAse: booleAn = fAlse;
	privAte _stArtStreAmDelAy: Promise<void> = Promise.resolve();
	privAte _resultQueue: IFileMAtch[] = [];

	privAte reAdonly _onReplAceTermChAnged: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onReplAceTermChAnged: Event<void> = this._onReplAceTermChAnged.event;

	privAte currentCAncelTokenSource: CAncellAtionTokenSource | null = null;
	privAte seArchCAncelledForNewSeArch: booleAn = fAlse;

	constructor(
		@ISeArchService privAte reAdonly seArchService: ISeArchService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService
	) {
		super();
		this._seArchResult = this.instAntiAtionService.creAteInstAnce(SeArchResult, this);
	}

	isReplAceActive(): booleAn {
		return this._replAceActive;
	}

	set replAceActive(replAceActive: booleAn) {
		this._replAceActive = replAceActive;
	}

	get replAcePAttern(): ReplAcePAttern | null {
		return this._replAcePAttern;
	}

	get replAceString(): string {
		return this._replAceString || '';
	}

	set preserveCAse(vAlue: booleAn) {
		this._preserveCAse = vAlue;
	}

	get preserveCAse(): booleAn {
		return this._preserveCAse;
	}

	set replAceString(replAceString: string) {
		this._replAceString = replAceString;
		if (this._seArchQuery) {
			this._replAcePAttern = new ReplAcePAttern(replAceString, this._seArchQuery.contentPAttern);
		}
		this._onReplAceTermChAnged.fire();
	}

	get seArchResult(): SeArchResult {
		return this._seArchResult;
	}

	seArch(query: ITextQuery, onProgress?: (result: ISeArchProgressItem) => void): Promise<ISeArchComplete> {
		this.cAncelSeArch(true);

		this._seArchQuery = query;
		if (!this.seArchConfig.seArchOnType) {
			this.seArchResult.cleAr();
		}

		this._seArchResult.query = this._seArchQuery;

		const progressEmitter = new Emitter<void>();
		this._replAcePAttern = new ReplAcePAttern(this.replAceString, this._seArchQuery.contentPAttern);

		// In seArch on type cAse, delAy the streAming of results just A bit, so thAt we don't flAsh the only "locAl results" fAst pAth
		this._stArtStreAmDelAy = new Promise(resolve => setTimeout(resolve, this.seArchConfig.seArchOnType ? 150 : 0));

		const tokenSource = this.currentCAncelTokenSource = new CAncellAtionTokenSource();
		const currentRequest = this.seArchService.textSeArch(this._seArchQuery, this.currentCAncelTokenSource.token, p => {
			progressEmitter.fire();
			this.onSeArchProgress(p);

			if (onProgress) {
				onProgress(p);
			}
		});

		const dispose = () => tokenSource.dispose();
		currentRequest.then(dispose, dispose);

		const onDone = Event.fromPromise(currentRequest);
		const onFirstRender = Event.Any<Any>(onDone, progressEmitter.event);
		const onFirstRenderStopwAtch = Event.stopwAtch(onFirstRender);
		/* __GDPR__
			"seArchResultsFirstRender" : {
				"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true }
			}
		*/
		onFirstRenderStopwAtch(durAtion => this.telemetryService.publicLog('seArchResultsFirstRender', { durAtion }));

		const stArt = DAte.now();
		currentRequest.then(
			vAlue => this.onSeArchCompleted(vAlue, DAte.now() - stArt),
			e => this.onSeArchError(e, DAte.now() - stArt));

		return currentRequest.finAlly(() => {
			/* __GDPR__
				"seArchResultsFinished" : {
					"durAtion" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true }
				}
			*/
			this.telemetryService.publicLog('seArchResultsFinished', { durAtion: DAte.now() - stArt });
		});
	}

	privAte onSeArchCompleted(completed: ISeArchComplete | null, durAtion: number): ISeArchComplete | null {
		if (!this._seArchQuery) {
			throw new Error('onSeArchCompleted must be cAlled After A seArch is stArted');
		}

		this._seArchResult.Add(this._resultQueue);
		this._resultQueue = [];

		const options: IPAtternInfo = Object.Assign({}, this._seArchQuery.contentPAttern);
		delete (options As Any).pAttern;

		const stAts = completed && completed.stAts As ITextSeArchStAts;

		const fileSchemeOnly = this._seArchQuery.folderQueries.every(fq => fq.folder.scheme === SchemAs.file);
		const otherSchemeOnly = this._seArchQuery.folderQueries.every(fq => fq.folder.scheme !== SchemAs.file);
		const scheme = fileSchemeOnly ? SchemAs.file :
			otherSchemeOnly ? 'other' :
				'mixed';

		/* __GDPR__
			"seArchResultsShown" : {
				"count" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"fileCount": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
				"options": { "${inline}": [ "${IPAtternInfo}" ] },
				"durAtion": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth", "isMeAsurement": true },
				"type" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
				"scheme" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
				"seArchOnTypeEnAbled" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		this.telemetryService.publicLog('seArchResultsShown', {
			count: this._seArchResult.count(),
			fileCount: this._seArchResult.fileCount(),
			options,
			durAtion,
			type: stAts && stAts.type,
			scheme,
			seArchOnTypeEnAbled: this.seArchConfig.seArchOnType
		});
		return completed;
	}

	privAte onSeArchError(e: Any, durAtion: number): void {
		if (errors.isPromiseCAnceledError(e)) {
			this.onSeArchCompleted(
				this.seArchCAncelledForNewSeArch
					? { exit: SeArchCompletionExitCode.NewSeArchStArted, results: [] }
					: null,
				durAtion);
			this.seArchCAncelledForNewSeArch = fAlse;
		}
	}

	privAte Async onSeArchProgress(p: ISeArchProgressItem) {
		if ((<IFileMAtch>p).resource) {
			this._resultQueue.push(<IFileMAtch>p);
			AwAit this._stArtStreAmDelAy;
			if (this._resultQueue.length) {
				this._seArchResult.Add(this._resultQueue, true);
				this._resultQueue = [];
			}
		}
	}

	privAte get seArchConfig() {
		return this.configurAtionService.getVAlue<ISeArchConfigurAtionProperties>('seArch');
	}

	cAncelSeArch(cAncelledForNewSeArch = fAlse): booleAn {
		if (this.currentCAncelTokenSource) {
			this.seArchCAncelledForNewSeArch = cAncelledForNewSeArch;
			this.currentCAncelTokenSource.cAncel();
			return true;
		}
		return fAlse;
	}

	dispose(): void {
		this.cAncelSeArch();
		this.seArchResult.dispose();
		super.dispose();
	}
}

export type FileMAtchOrMAtch = FileMAtch | MAtch;

export type RenderAbleMAtch = FolderMAtch | FolderMAtchWithResource | FileMAtch | MAtch;

export clAss SeArchWorkbenchService implements ISeArchWorkbenchService {

	declAre reAdonly _serviceBrAnd: undefined;
	privAte _seArchModel: SeArchModel | null = null;

	constructor(@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService) {
	}

	get seArchModel(): SeArchModel {
		if (!this._seArchModel) {
			this._seArchModel = this.instAntiAtionService.creAteInstAnce(SeArchModel);
		}
		return this._seArchModel;
	}
}

export const ISeArchWorkbenchService = creAteDecorAtor<ISeArchWorkbenchService>('seArchWorkbenchService');

export interfAce ISeArchWorkbenchService {
	reAdonly _serviceBrAnd: undefined;

	reAdonly seArchModel: SeArchModel;
}

/**
 * CAn Add A rAnge highlight decorAtion to A model.
 * It will AutomAticAlly remove it when the model hAs its decorAtions chAnged.
 */
export clAss RAngeHighlightDecorAtions implements IDisposAble {

	privAte _decorAtionId: string | null = null;
	privAte _model: ITextModel | null = null;
	privAte reAdonly _modelDisposAbles = new DisposAbleStore();

	constructor(
		@IModelService privAte reAdonly _modelService: IModelService
	) {
	}

	removeHighlightRAnge() {
		if (this._model && this._decorAtionId) {
			this._model.deltADecorAtions([this._decorAtionId], []);
		}
		this._decorAtionId = null;
	}

	highlightRAnge(resource: URI | ITextModel, rAnge: RAnge, ownerId: number = 0): void {
		let model: ITextModel | null;
		if (URI.isUri(resource)) {
			model = this._modelService.getModel(resource);
		} else {
			model = resource;
		}

		if (model) {
			this.doHighlightRAnge(model, rAnge);
		}
	}

	privAte doHighlightRAnge(model: ITextModel, rAnge: RAnge) {
		this.removeHighlightRAnge();
		this._decorAtionId = model.deltADecorAtions([], [{ rAnge: rAnge, options: RAngeHighlightDecorAtions._RANGE_HIGHLIGHT_DECORATION }])[0];
		this.setModel(model);
	}

	privAte setModel(model: ITextModel) {
		if (this._model !== model) {
			this.cleArModelListeners();
			this._model = model;
			this._modelDisposAbles.Add(this._model.onDidChAngeDecorAtions((e) => {
				this.cleArModelListeners();
				this.removeHighlightRAnge();
				this._model = null;
			}));
			this._modelDisposAbles.Add(this._model.onWillDispose(() => {
				this.cleArModelListeners();
				this.removeHighlightRAnge();
				this._model = null;
			}));
		}
	}

	privAte cleArModelListeners() {
		this._modelDisposAbles.cleAr();
	}

	dispose() {
		if (this._model) {
			this.removeHighlightRAnge();
			this._modelDisposAbles.dispose();
			this._model = null;
		}
	}

	privAte stAtic reAdonly _RANGE_HIGHLIGHT_DECORATION = ModelDecorAtionOptions.register({
		stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges,
		clAssNAme: 'rAngeHighlight',
		isWholeLine: true
	});
}

function textSeArchResultToMAtches(rAwMAtch: ITextSeArchMAtch, fileMAtch: FileMAtch): MAtch[] {
	const previewLines = rAwMAtch.preview.text.split('\n');
	if (ArrAy.isArrAy(rAwMAtch.rAnges)) {
		return rAwMAtch.rAnges.mAp((r, i) => {
			const previewRAnge: ISeArchRAnge = (<ISeArchRAnge[]>rAwMAtch.preview.mAtches)[i];
			return new MAtch(fileMAtch, previewLines, previewRAnge, r);
		});
	} else {
		const previewRAnge = <ISeArchRAnge>rAwMAtch.preview.mAtches;
		const mAtch = new MAtch(fileMAtch, previewLines, previewRAnge, rAwMAtch.rAnges);
		return [mAtch];
	}
}
