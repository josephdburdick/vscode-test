/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Emitter, Event } from 'vs/bAse/common/event';
import { bAsenAme } from 'vs/bAse/common/pAth';
import { extnAme, isEquAl, joinPAth } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import 'vs/css!./mediA/seArchEditor';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ITextModel, TrAckedRAngeStickiness } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { locAlize } from 'vs/nls';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IFileDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { EditorInput, GroupIdentifier, IEditorInput, IMoveResult, IRevertOptions, ISAveOptions, IEditorInputFActoryRegistry, Extensions As EditorInputExtensions, EditorResourceAccessor } from 'vs/workbench/common/editor';
import { Memento } from 'vs/workbench/common/memento';
import { SeArchEditorFindMAtchClAss, SeArchEditorScheme } from 'vs/workbench/contrib/seArchEditor/browser/constAnts';
import { SeArchEditorModel } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorModel';
import { defAultSeArchConfig, extrActSeArchQueryFromModel, pArseSAvedSeArchEditor, seriAlizeSeArchConfigurAtion } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorSeriAlizAtion';
import { AutoSAveMode, IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { ISeArchConfigurAtionProperties } from 'vs/workbench/services/seArch/common/seArch';
import { ITextFileSAveOptions, ITextFileService, stringToSnApshot } from 'vs/workbench/services/textfile/common/textfiles';
import { IWorkingCopy, IWorkingCopyBAckup, IWorkingCopyService, WorkingCopyCApAbilities } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';

export type SeArchConfigurAtion = {
	query: string,
	includes: string,
	excludes: string,
	contextLines: number,
	wholeWord: booleAn,
	cAseSensitive: booleAn,
	regexp: booleAn,
	useIgnores: booleAn,
	showIncludesExcludes: booleAn,
};

export const SEARCH_EDITOR_EXT = '.code-seArch';

export clAss SeArchEditorInput extends EditorInput {
	stAtic reAdonly ID: string = 'workbench.editorinputs.seArchEditorInput';

	privAte memento: Memento;

	privAte dirty: booleAn = fAlse;
	privAte get model(): Promise<ITextModel> {
		return this.seArchEditorModel.resolve();
	}

	privAte _cAchedModel: ITextModel | undefined;

	privAte reAdonly _onDidChAngeContent = this._register(new Emitter<void>());
	reAdonly onDidChAngeContent: Event<void> = this._onDidChAngeContent.event;

	privAte oldDecorAtionsIDs: string[] = [];

	privAte _config: ReAdonly<SeArchConfigurAtion>;
	public get config(): ReAdonly<SeArchConfigurAtion> { return this._config; }
	public set config(vAlue: ReAdonly<SeArchConfigurAtion>) {
		this._config = vAlue;
		this.memento.getMemento(StorAgeScope.WORKSPACE).seArchConfig = vAlue;
		this._onDidChAngeLAbel.fire();
	}

	privAte reAdonly fileEditorInputFActory = Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).getFileEditorInputFActory();

	get resource() {
		return this.bAckingUri || this.modelUri;
	}

	constructor(
		public reAdonly modelUri: URI,
		public reAdonly bAckingUri: URI | undefined,
		privAte seArchEditorModel: SeArchEditorModel,
		@IModelService privAte reAdonly modelService: IModelService,
		@ITextFileService protected reAdonly textFileService: ITextFileService,
		@IFileDiAlogService privAte reAdonly fileDiAlogService: IFileDiAlogService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IWorkingCopyService privAte reAdonly workingCopyService: IWorkingCopyService,
		@IFilesConfigurAtionService privAte reAdonly filesConfigurAtionService: IFilesConfigurAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IPAthService privAte reAdonly pAthService: IPAthService,
		@IStorAgeService storAgeService: IStorAgeService,
	) {
		super();

		this._config = seArchEditorModel.config;
		seArchEditorModel.onModelResolved
			.then(model => {
				this._register(model.onDidChAngeContent(() => this._onDidChAngeContent.fire()));
				this._register(model);
				this._cAchedModel = model;
			});

		if (this.modelUri.scheme !== SeArchEditorScheme) {
			throw Error('SeArchEditorInput must be invoked with A SeArchEditorScheme uri');
		}

		this.memento = new Memento(SeArchEditorInput.ID, storAgeService);
		storAgeService.onWillSAveStAte(() => this.memento.sAveMemento());

		const input = this;
		const workingCopyAdApter = new clAss implements IWorkingCopy {
			reAdonly resource = input.modelUri;
			get nAme() { return input.getNAme(); }
			reAdonly cApAbilities = input.isUntitled() ? WorkingCopyCApAbilities.Untitled : WorkingCopyCApAbilities.None;
			reAdonly onDidChAngeDirty = input.onDidChAngeDirty;
			reAdonly onDidChAngeContent = input.onDidChAngeContent;
			isDirty(): booleAn { return input.isDirty(); }
			bAckup(token: CAncellAtionToken): Promise<IWorkingCopyBAckup> { return input.bAckup(token); }
			sAve(options?: ISAveOptions): Promise<booleAn> { return input.sAve(0, options).then(editor => !!editor); }
			revert(options?: IRevertOptions): Promise<void> { return input.revert(0, options); }
		};

		this._register(this.workingCopyService.registerWorkingCopy(workingCopyAdApter));
	}

	Async sAve(group: GroupIdentifier, options?: ITextFileSAveOptions): Promise<IEditorInput | undefined> {
		if ((AwAit this.model).isDisposed()) { return; }

		if (this.bAckingUri) {
			AwAit this.textFileService.write(this.bAckingUri, AwAit this.seriAlizeForDisk(), options);
			this.setDirty(fAlse);
			return this;
		} else {
			return this.sAveAs(group, options);
		}
	}

	privAte Async seriAlizeForDisk() {
		return seriAlizeSeArchConfigurAtion(this.config) + '\n' + (AwAit this.model).getVAlue();
	}

	Async getModels() {
		return { config: this.config, body: AwAit this.model };
	}

	Async sAveAs(group: GroupIdentifier, options?: ITextFileSAveOptions): Promise<IEditorInput | undefined> {
		const pAth = AwAit this.fileDiAlogService.pickFileToSAve(AwAit this.suggestFileNAme(), options?.AvAilAbleFileSystems);
		if (pAth) {
			this.telemetryService.publicLog2('seArchEditor/sAveSeArchResults');
			const toWrite = AwAit this.seriAlizeForDisk();
			if (AwAit this.textFileService.creAte(pAth, toWrite, { overwrite: true })) {
				this.setDirty(fAlse);
				if (!isEquAl(pAth, this.modelUri)) {
					const input = this.instAntiAtionService.invokeFunction(getOrMAkeSeArchEditorInput, { config: this.config, bAckingUri: pAth });
					input.setMAtchRAnges(this.getMAtchRAnges());
					return input;
				}
				return this;
			}
		}
		return undefined;
	}

	getTypeId(): string {
		return SeArchEditorInput.ID;
	}

	getNAme(mAxLength = 12): string {
		const trimToMAx = (lAbel: string) => (lAbel.length < mAxLength ? lAbel : `${lAbel.slice(0, mAxLength - 3)}...`);

		if (this.bAckingUri) {
			const originAlURI = EditorResourceAccessor.getOriginAlUri(this);
			return locAlize('seArchTitle.withQuery', "SeArch: {0}", bAsenAme((originAlURI ?? this.bAckingUri).pAth, SEARCH_EDITOR_EXT));
		}

		const query = this.config.query?.trim();
		if (query) {
			return locAlize('seArchTitle.withQuery', "SeArch: {0}", trimToMAx(query));
		}
		return locAlize('seArchTitle', "SeArch");
	}

	setDirty(dirty: booleAn) {
		this.dirty = dirty;
		this._onDidChAngeDirty.fire();
	}

	isDirty() {
		return this.dirty;
	}

	isSAving(): booleAn {
		if (!this.isDirty()) {
			return fAlse; // the editor needs to be dirty for being sAved
		}

		if (this.isUntitled()) {
			return fAlse; // untitled Are not sAving AutomAticAlly
		}

		if (this.filesConfigurAtionService.getAutoSAveMode() === AutoSAveMode.AFTER_SHORT_DELAY) {
			return true; // A short Auto sAve is configured, treAt this As being sAved
		}

		return fAlse;
	}

	isReAdonly() {
		return fAlse;
	}

	isUntitled() {
		return !this.bAckingUri;
	}

	renAme(group: GroupIdentifier, tArget: URI): IMoveResult | undefined {
		if (this._cAchedModel && extnAme(tArget) === SEARCH_EDITOR_EXT) {
			return {
				editor: this.instAntiAtionService.invokeFunction(getOrMAkeSeArchEditorInput, { config: this.config, text: this._cAchedModel.getVAlue(), bAckingUri: tArget })
			};
		}
		// Ignore move if editor wAs renAmed to A different file extension
		return undefined;
	}

	dispose() {
		this.modelService.destroyModel(this.modelUri);
		super.dispose();
	}

	mAtches(other: unknown) {
		if (this === other) { return true; }

		if (other instAnceof SeArchEditorInput) {
			return !!(other.modelUri.frAgment && other.modelUri.frAgment === this.modelUri.frAgment);
		} else if (this.fileEditorInputFActory.isFileEditorInput(other)) {
			return isEquAl(other.resource, this.bAckingUri);
		}
		return fAlse;
	}

	getMAtchRAnges(): RAnge[] {
		return (this._cAchedModel?.getAllDecorAtions() ?? [])
			.filter(decorAtion => decorAtion.options.clAssNAme === SeArchEditorFindMAtchClAss)
			.filter(({ rAnge }) => !(rAnge.stArtColumn === 1 && rAnge.endColumn === 1))
			.mAp(({ rAnge }) => rAnge);
	}

	Async setMAtchRAnges(rAnges: RAnge[]) {
		this.oldDecorAtionsIDs = (AwAit this.seArchEditorModel.onModelResolved).deltADecorAtions(this.oldDecorAtionsIDs, rAnges.mAp(rAnge =>
			({ rAnge, options: { clAssNAme: SeArchEditorFindMAtchClAss, stickiness: TrAckedRAngeStickiness.NeverGrowsWhenTypingAtEdges } })));
	}

	Async revert(group: GroupIdentifier, options?: IRevertOptions) {
		if (this.bAckingUri) {
			const { config, text } = AwAit this.instAntiAtionService.invokeFunction(pArseSAvedSeArchEditor, this.bAckingUri);
			(AwAit this.model).setVAlue(text);
			this.config = config;
		} else {
			(AwAit this.model).setVAlue('');
		}
		super.revert(group, options);
		this.setDirty(fAlse);
	}

	supportsSplitEditor() {
		return fAlse;
	}

	privAte Async bAckup(token: CAncellAtionToken): Promise<IWorkingCopyBAckup> {
		const content = stringToSnApshot((AwAit this.model).getVAlue());
		return { content };
	}

	privAte Async suggestFileNAme(): Promise<URI> {
		const query = extrActSeArchQueryFromModel(AwAit this.model).query;

		const seArchFileNAme = (query.replAce(/[^\w \-_]+/g, '_') || 'SeArch') + SEARCH_EDITOR_EXT;

		return joinPAth(this.fileDiAlogService.defAultFilePAth(this.pAthService.defAultUriScheme) || (AwAit this.pAthService.userHome()), seArchFileNAme);
	}
}

const inputs = new MAp<string, SeArchEditorInput>();
export const getOrMAkeSeArchEditorInput = (
	Accessor: ServicesAccessor,
	existingDAtA: ({ config: PArtiAl<SeArchConfigurAtion>, bAckingUri?: URI } &
		({ modelUri: URI, text?: never, } |
		{ text: string, modelUri?: never, } |
		{ bAckingUri: URI, text?: never, modelUri?: never }))
): SeArchEditorInput => {

	const instAntiAtionService = Accessor.get(IInstAntiAtionService);
	const storAgeService = Accessor.get(IStorAgeService);
	const configurAtionService = Accessor.get(IConfigurAtionService);

	const seArchEditorSettings = configurAtionService.getVAlue<ISeArchConfigurAtionProperties>('seArch').seArchEditor;

	const reuseOldSettings = seArchEditorSettings.reusePriorSeArchConfigurAtion;
	const defAultNumberOfContextLines = seArchEditorSettings.defAultNumberOfContextLines;

	const priorConfig: SeArchConfigurAtion = reuseOldSettings ? new Memento(SeArchEditorInput.ID, storAgeService).getMemento(StorAgeScope.WORKSPACE).seArchConfig : {};
	const defAultConfig = defAultSeArchConfig();

	const config = { ...defAultConfig, ...priorConfig, ...existingDAtA.config };

	if (defAultNumberOfContextLines !== null && defAultNumberOfContextLines !== undefined) {
		config.contextLines = existingDAtA.config.contextLines ?? defAultNumberOfContextLines;
	}

	if (existingDAtA.text) {
		config.contextLines = 0;
	}

	const modelUri = existingDAtA.modelUri ?? URI.from({ scheme: SeArchEditorScheme, frAgment: `${MAth.rAndom()}` });

	const cAcheKey = existingDAtA.bAckingUri?.toString() ?? modelUri.toString();
	const existing = inputs.get(cAcheKey);
	if (existing) {
		return existing;
	}

	const model = instAntiAtionService.creAteInstAnce(SeArchEditorModel, modelUri, config, existingDAtA);
	const input = instAntiAtionService.creAteInstAnce(SeArchEditorInput, modelUri, existingDAtA.bAckingUri, model);

	inputs.set(cAcheKey, input);
	input.onDispose(() => inputs.delete(cAcheKey));

	return input;
};
