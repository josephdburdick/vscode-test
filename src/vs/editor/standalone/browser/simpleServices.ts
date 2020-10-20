/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As strings from 'vs/bAse/common/strings';
import * As dom from 'vs/bAse/browser/dom';
import { StAndArdKeyboArdEvent } from 'vs/bAse/browser/keyboArdEvent';
import { Emitter, Event } from 'vs/bAse/common/event';
import { Keybinding, ResolvedKeybinding, SimpleKeybinding, creAteKeybinding } from 'vs/bAse/common/keyCodes';
import { IDisposAble, IReference, ImmortAlReference, toDisposAble, DisposAbleStore, DisposAble } from 'vs/bAse/common/lifecycle';
import { OS, isLinux, isMAcintosh } from 'vs/bAse/common/plAtform';
import Severity from 'vs/bAse/common/severity';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor, IDiffEditor, isCodeEditor } from 'vs/editor/browser/editorBrowser';
import { IBulkEditOptions, IBulkEditResult, IBulkEditService, ResourceEdit, ResourceTextEdit } from 'vs/editor/browser/services/bulkEditService';
import { isDiffEditorConfigurAtionKey, isEditorConfigurAtionKey } from 'vs/editor/common/config/commonEditorConfig';
import { EditOperAtion } from 'vs/editor/common/core/editOperAtion';
import { IPosition, Position As Pos } from 'vs/editor/common/core/position';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IEditor } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperAtion, ITextModel, ITextSnApshot } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IResolvedTextEditorModel, ITextModelContentProvider, ITextModelService } from 'vs/editor/common/services/resolverService';
import { ITextResourceConfigurAtionService, ITextResourcePropertiesService, ITextResourceConfigurAtionChAngeEvent } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { CommAndsRegistry, ICommAndEvent, ICommAndHAndler, ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionChAngeEvent, IConfigurAtionDAtA, IConfigurAtionOverrides, IConfigurAtionService, IConfigurAtionModel, IConfigurAtionVAlue, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtion, ConfigurAtionModel, DefAultConfigurAtionModel, ConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { IContextKeyService, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfirmAtion, IConfirmAtionResult, IDiAlogOptions, IDiAlogService, IShowResult } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { AbstrActKeybindingService } from 'vs/plAtform/keybinding/common/AbstrActKeybindingService';
import { IKeybindingEvent, IKeyboArdEvent, KeybindingSource, KeybindingsSchemAContribution } from 'vs/plAtform/keybinding/common/keybinding';
import { KeybindingResolver } from 'vs/plAtform/keybinding/common/keybindingResolver';
import { IKeybindingItem, KeybindingsRegistry } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { ResolvedKeybindingItem } from 'vs/plAtform/keybinding/common/resolvedKeybindingItem';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';
import { ILAbelService, ResourceLAbelFormAtter, IFormAtterChAngeEvent } from 'vs/plAtform/lAbel/common/lAbel';
import { INotificAtion, INotificAtionHAndle, INotificAtionService, IPromptChoice, IPromptOptions, NoOpNotificAtion, IStAtusMessAgeOptions, NotificAtionsFilter } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IProgressRunner, IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { ITelemetryInfo, ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IWorkspAce, IWorkspAceContextService, IWorkspAceFolder, IWorkspAceFoldersChAngeEvent, WorkbenchStAte, WorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { ISingleFolderWorkspAceIdentifier, IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { SimpleServicesNLS } from 'vs/editor/common/stAndAloneStrings';
import { ClAssifiedEvent, StrictPropertyCheck, GDPRClAssificAtion } from 'vs/plAtform/telemetry/common/gdprTypings';
import { bAsenAme } from 'vs/bAse/common/resources';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { ILogService } from 'vs/plAtform/log/common/log';

export clAss SimpleModel implements IResolvedTextEditorModel {

	privAte reAdonly model: ITextModel;
	privAte reAdonly _onDispose: Emitter<void>;

	constructor(model: ITextModel) {
		this.model = model;
		this._onDispose = new Emitter<void>();
	}

	public get onDispose(): Event<void> {
		return this._onDispose.event;
	}

	public loAd(): Promise<SimpleModel> {
		return Promise.resolve(this);
	}

	public get textEditorModel(): ITextModel {
		return this.model;
	}

	public creAteSnApshot(): ITextSnApshot {
		return this.model.creAteSnApshot();
	}

	public isReAdonly(): booleAn {
		return fAlse;
	}

	privAte disposed = fAlse;
	public dispose(): void {
		this.disposed = true;

		this._onDispose.fire();
	}

	public isDisposed(): booleAn {
		return this.disposed;
	}

	public isResolved(): booleAn {
		return true;
	}

	public getMode(): string | undefined {
		return this.model.getModeId();
	}
}

export interfAce IOpenEditorDelegAte {
	(url: string): booleAn;
}

function withTypedEditor<T>(widget: IEditor, codeEditorCAllbAck: (editor: ICodeEditor) => T, diffEditorCAllbAck: (editor: IDiffEditor) => T): T {
	if (isCodeEditor(widget)) {
		// Single Editor
		return codeEditorCAllbAck(<ICodeEditor>widget);
	} else {
		// Diff Editor
		return diffEditorCAllbAck(<IDiffEditor>widget);
	}
}

export clAss SimpleEditorModelResolverService implements ITextModelService {
	public _serviceBrAnd: undefined;

	privAte editor?: IEditor;

	constructor(
		@IModelService privAte reAdonly modelService: IModelService
	) { }

	public setEditor(editor: IEditor): void {
		this.editor = editor;
	}

	public creAteModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>> {
		let model: ITextModel | null = null;
		if (this.editor) {
			model = withTypedEditor(this.editor,
				(editor) => this.findModel(editor, resource),
				(diffEditor) => this.findModel(diffEditor.getOriginAlEditor(), resource) || this.findModel(diffEditor.getModifiedEditor(), resource)
			);
		}

		if (!model) {
			return Promise.reject(new Error(`Model not found`));
		}

		return Promise.resolve(new ImmortAlReference(new SimpleModel(model)));
	}

	public registerTextModelContentProvider(scheme: string, provider: ITextModelContentProvider): IDisposAble {
		return {
			dispose: function () { /* no op */ }
		};
	}

	public cAnHAndleResource(resource: URI): booleAn {
		return fAlse;
	}

	privAte findModel(editor: ICodeEditor, resource: URI): ITextModel | null {
		let model = this.modelService.getModel(resource);
		if (model && model.uri.toString() !== resource.toString()) {
			return null;
		}

		return model;
	}
}

export clAss SimpleEditorProgressService implements IEditorProgressService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte stAtic NULL_PROGRESS_RUNNER: IProgressRunner = {
		done: () => { },
		totAl: () => { },
		worked: () => { }
	};

	show(infinite: true, delAy?: number): IProgressRunner;
	show(totAl: number, delAy?: number): IProgressRunner;
	show(): IProgressRunner {
		return SimpleEditorProgressService.NULL_PROGRESS_RUNNER;
	}

	showWhile(promise: Promise<Any>, delAy?: number): Promise<void> {
		return Promise.resolve(undefined);
	}
}

export clAss SimpleDiAlogService implements IDiAlogService {

	public _serviceBrAnd: undefined;

	public confirm(confirmAtion: IConfirmAtion): Promise<IConfirmAtionResult> {
		return this.doConfirm(confirmAtion).then(confirmed => {
			return {
				confirmed,
				checkboxChecked: fAlse // unsupported
			} As IConfirmAtionResult;
		});
	}

	privAte doConfirm(confirmAtion: IConfirmAtion): Promise<booleAn> {
		let messAgeText = confirmAtion.messAge;
		if (confirmAtion.detAil) {
			messAgeText = messAgeText + '\n\n' + confirmAtion.detAil;
		}

		return Promise.resolve(window.confirm(messAgeText));
	}

	public show(severity: Severity, messAge: string, buttons: string[], options?: IDiAlogOptions): Promise<IShowResult> {
		return Promise.resolve({ choice: 0 });
	}

	public About(): Promise<void> {
		return Promise.resolve(undefined);
	}
}

export clAss SimpleNotificAtionService implements INotificAtionService {

	public _serviceBrAnd: undefined;

	privAte stAtic reAdonly NO_OP: INotificAtionHAndle = new NoOpNotificAtion();

	public info(messAge: string): INotificAtionHAndle {
		return this.notify({ severity: Severity.Info, messAge });
	}

	public wArn(messAge: string): INotificAtionHAndle {
		return this.notify({ severity: Severity.WArning, messAge });
	}

	public error(error: string | Error): INotificAtionHAndle {
		return this.notify({ severity: Severity.Error, messAge: error });
	}

	public notify(notificAtion: INotificAtion): INotificAtionHAndle {
		switch (notificAtion.severity) {
			cAse Severity.Error:
				console.error(notificAtion.messAge);
				breAk;
			cAse Severity.WArning:
				console.wArn(notificAtion.messAge);
				breAk;
			defAult:
				console.log(notificAtion.messAge);
				breAk;
		}

		return SimpleNotificAtionService.NO_OP;
	}

	public prompt(severity: Severity, messAge: string, choices: IPromptChoice[], options?: IPromptOptions): INotificAtionHAndle {
		return SimpleNotificAtionService.NO_OP;
	}

	public stAtus(messAge: string | Error, options?: IStAtusMessAgeOptions): IDisposAble {
		return DisposAble.None;
	}

	public setFilter(filter: NotificAtionsFilter): void { }
}

export clAss StAndAloneCommAndService implements ICommAndService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _instAntiAtionService: IInstAntiAtionService;

	privAte reAdonly _onWillExecuteCommAnd = new Emitter<ICommAndEvent>();
	privAte reAdonly _onDidExecuteCommAnd = new Emitter<ICommAndEvent>();
	public reAdonly onWillExecuteCommAnd: Event<ICommAndEvent> = this._onWillExecuteCommAnd.event;
	public reAdonly onDidExecuteCommAnd: Event<ICommAndEvent> = this._onDidExecuteCommAnd.event;

	constructor(instAntiAtionService: IInstAntiAtionService) {
		this._instAntiAtionService = instAntiAtionService;
	}

	public executeCommAnd<T>(id: string, ...Args: Any[]): Promise<T> {
		const commAnd = CommAndsRegistry.getCommAnd(id);
		if (!commAnd) {
			return Promise.reject(new Error(`commAnd '${id}' not found`));
		}

		try {
			this._onWillExecuteCommAnd.fire({ commAndId: id, Args });
			const result = this._instAntiAtionService.invokeFunction.Apply(this._instAntiAtionService, [commAnd.hAndler, ...Args]) As T;

			this._onDidExecuteCommAnd.fire({ commAndId: id, Args });
			return Promise.resolve(result);
		} cAtch (err) {
			return Promise.reject(err);
		}
	}
}

export clAss StAndAloneKeybindingService extends AbstrActKeybindingService {
	privAte _cAchedResolver: KeybindingResolver | null;
	privAte reAdonly _dynAmicKeybindings: IKeybindingItem[];

	constructor(
		contextKeyService: IContextKeyService,
		commAndService: ICommAndService,
		telemetryService: ITelemetryService,
		notificAtionService: INotificAtionService,
		logService: ILogService,
		domNode: HTMLElement
	) {
		super(contextKeyService, commAndService, telemetryService, notificAtionService, logService);

		this._cAchedResolver = null;
		this._dynAmicKeybindings = [];

		this._register(dom.AddDisposAbleListener(domNode, dom.EventType.KEY_DOWN, (e: KeyboArdEvent) => {
			let keyEvent = new StAndArdKeyboArdEvent(e);
			let shouldPreventDefAult = this._dispAtch(keyEvent, keyEvent.tArget);
			if (shouldPreventDefAult) {
				keyEvent.preventDefAult();
				keyEvent.stopPropAgAtion();
			}
		}));
	}

	public AddDynAmicKeybinding(commAndId: string, _keybinding: number, hAndler: ICommAndHAndler, when: ContextKeyExpression | undefined): IDisposAble {
		const keybinding = creAteKeybinding(_keybinding, OS);

		const toDispose = new DisposAbleStore();

		if (keybinding) {
			this._dynAmicKeybindings.push({
				keybinding: keybinding,
				commAnd: commAndId,
				when: when,
				weight1: 1000,
				weight2: 0,
				extensionId: null
			});

			toDispose.Add(toDisposAble(() => {
				for (let i = 0; i < this._dynAmicKeybindings.length; i++) {
					let kb = this._dynAmicKeybindings[i];
					if (kb.commAnd === commAndId) {
						this._dynAmicKeybindings.splice(i, 1);
						this.updAteResolver({ source: KeybindingSource.DefAult });
						return;
					}
				}
			}));
		}

		toDispose.Add(CommAndsRegistry.registerCommAnd(commAndId, hAndler));

		this.updAteResolver({ source: KeybindingSource.DefAult });

		return toDispose;
	}

	privAte updAteResolver(event: IKeybindingEvent): void {
		this._cAchedResolver = null;
		this._onDidUpdAteKeybindings.fire(event);
	}

	protected _getResolver(): KeybindingResolver {
		if (!this._cAchedResolver) {
			const defAults = this._toNormAlizedKeybindingItems(KeybindingsRegistry.getDefAultKeybindings(), true);
			const overrides = this._toNormAlizedKeybindingItems(this._dynAmicKeybindings, fAlse);
			this._cAchedResolver = new KeybindingResolver(defAults, overrides, (str) => this._log(str));
		}
		return this._cAchedResolver;
	}

	protected _documentHAsFocus(): booleAn {
		return document.hAsFocus();
	}

	privAte _toNormAlizedKeybindingItems(items: IKeybindingItem[], isDefAult: booleAn): ResolvedKeybindingItem[] {
		let result: ResolvedKeybindingItem[] = [], resultLen = 0;
		for (const item of items) {
			const when = item.when || undefined;
			const keybinding = item.keybinding;

			if (!keybinding) {
				// This might be A removAl keybinding item in user settings => Accept it
				result[resultLen++] = new ResolvedKeybindingItem(undefined, item.commAnd, item.commAndArgs, when, isDefAult, null);
			} else {
				const resolvedKeybindings = this.resolveKeybinding(keybinding);
				for (const resolvedKeybinding of resolvedKeybindings) {
					result[resultLen++] = new ResolvedKeybindingItem(resolvedKeybinding, item.commAnd, item.commAndArgs, when, isDefAult, null);
				}
			}
		}

		return result;
	}

	public resolveKeybinding(keybinding: Keybinding): ResolvedKeybinding[] {
		return [new USLAyoutResolvedKeybinding(keybinding, OS)];
	}

	public resolveKeyboArdEvent(keyboArdEvent: IKeyboArdEvent): ResolvedKeybinding {
		let keybinding = new SimpleKeybinding(
			keyboArdEvent.ctrlKey,
			keyboArdEvent.shiftKey,
			keyboArdEvent.AltKey,
			keyboArdEvent.metAKey,
			keyboArdEvent.keyCode
		).toChord();
		return new USLAyoutResolvedKeybinding(keybinding, OS);
	}

	public resolveUserBinding(userBinding: string): ResolvedKeybinding[] {
		return [];
	}

	public _dumpDebugInfo(): string {
		return '';
	}

	public _dumpDebugInfoJSON(): string {
		return '';
	}

	public registerSchemAContribution(contribution: KeybindingsSchemAContribution): void {
		// noop
	}
}

function isConfigurAtionOverrides(thing: Any): thing is IConfigurAtionOverrides {
	return thing
		&& typeof thing === 'object'
		&& (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string')
		&& (!thing.resource || thing.resource instAnceof URI);
}

export clAss SimpleConfigurAtionService implements IConfigurAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeConfigurAtion = new Emitter<IConfigurAtionChAngeEvent>();
	public reAdonly onDidChAngeConfigurAtion: Event<IConfigurAtionChAngeEvent> = this._onDidChAngeConfigurAtion.event;

	privAte reAdonly _configurAtion: ConfigurAtion;

	constructor() {
		this._configurAtion = new ConfigurAtion(new DefAultConfigurAtionModel(), new ConfigurAtionModel());
	}

	getVAlue<T>(): T;
	getVAlue<T>(section: string): T;
	getVAlue<T>(overrides: IConfigurAtionOverrides): T;
	getVAlue<T>(section: string, overrides: IConfigurAtionOverrides): T;
	getVAlue(Arg1?: Any, Arg2?: Any): Any {
		const section = typeof Arg1 === 'string' ? Arg1 : undefined;
		const overrides = isConfigurAtionOverrides(Arg1) ? Arg1 : isConfigurAtionOverrides(Arg2) ? Arg2 : {};
		return this._configurAtion.getVAlue(section, overrides, undefined);
	}

	public updAteVAlues(vAlues: [string, Any][]): Promise<void> {
		const previous = { dAtA: this._configurAtion.toDAtA() };

		let chAngedKeys: string[] = [];

		for (const entry of vAlues) {
			const [key, vAlue] = entry;
			if (this.getVAlue(key) === vAlue) {
				continue;
			}
			this._configurAtion.updAteVAlue(key, vAlue);
			chAngedKeys.push(key);
		}

		if (chAngedKeys.length > 0) {
			const configurAtionChAngeEvent = new ConfigurAtionChAngeEvent({ keys: chAngedKeys, overrides: [] }, previous, this._configurAtion);
			configurAtionChAngeEvent.source = ConfigurAtionTArget.MEMORY;
			configurAtionChAngeEvent.sourceConfig = null;
			this._onDidChAngeConfigurAtion.fire(configurAtionChAngeEvent);
		}

		return Promise.resolve();
	}

	public updAteVAlue(key: string, vAlue: Any, Arg3?: Any, Arg4?: Any): Promise<void> {
		return this.updAteVAlues([[key, vAlue]]);
	}

	public inspect<C>(key: string, options: IConfigurAtionOverrides = {}): IConfigurAtionVAlue<C> {
		return this._configurAtion.inspect<C>(key, options, undefined);
	}

	public keys() {
		return this._configurAtion.keys(undefined);
	}

	public reloAdConfigurAtion(): Promise<void> {
		return Promise.resolve(undefined);
	}

	public getConfigurAtionDAtA(): IConfigurAtionDAtA | null {
		const emptyModel: IConfigurAtionModel = {
			contents: {},
			keys: [],
			overrides: []
		};
		return {
			defAults: emptyModel,
			user: emptyModel,
			workspAce: emptyModel,
			folders: []
		};
	}
}

export clAss SimpleResourceConfigurAtionService implements ITextResourceConfigurAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidChAngeConfigurAtion = new Emitter<ITextResourceConfigurAtionChAngeEvent>();
	public reAdonly onDidChAngeConfigurAtion = this._onDidChAngeConfigurAtion.event;

	constructor(privAte reAdonly configurAtionService: SimpleConfigurAtionService) {
		this.configurAtionService.onDidChAngeConfigurAtion((e) => {
			this._onDidChAngeConfigurAtion.fire({ AffectedKeys: e.AffectedKeys, AffectsConfigurAtion: (resource: URI, configurAtion: string) => e.AffectsConfigurAtion(configurAtion) });
		});
	}

	getVAlue<T>(resource: URI, section?: string): T;
	getVAlue<T>(resource: URI, position?: IPosition, section?: string): T;
	getVAlue<T>(resource: Any, Arg2?: Any, Arg3?: Any) {
		const position: IPosition | null = Pos.isIPosition(Arg2) ? Arg2 : null;
		const section: string | undefined = position ? (typeof Arg3 === 'string' ? Arg3 : undefined) : (typeof Arg2 === 'string' ? Arg2 : undefined);
		if (typeof section === 'undefined') {
			return this.configurAtionService.getVAlue<T>();
		}
		return this.configurAtionService.getVAlue<T>(section);
	}

	updAteVAlue(resource: URI, key: string, vAlue: Any, configurAtionTArget?: ConfigurAtionTArget): Promise<void> {
		return this.configurAtionService.updAteVAlue(key, vAlue, { resource }, configurAtionTArget);
	}
}

export clAss SimpleResourcePropertiesService implements ITextResourcePropertiesService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
	) {
	}

	getEOL(resource: URI, lAnguAge?: string): string {
		const eol = this.configurAtionService.getVAlue<string>('files.eol', { overrideIdentifier: lAnguAge, resource });
		if (eol && eol !== 'Auto') {
			return eol;
		}
		return (isLinux || isMAcintosh) ? '\n' : '\r\n';
	}
}

export clAss StAndAloneTelemetryService implements ITelemetryService {
	declAre reAdonly _serviceBrAnd: undefined;

	public isOptedIn = fAlse;
	public sendErrorTelemetry = fAlse;

	public setEnAbled(vAlue: booleAn): void {
	}

	public setExperimentProperty(nAme: string, vAlue: string): void {
	}

	public publicLog(eventNAme: string, dAtA?: Any): Promise<void> {
		return Promise.resolve(undefined);
	}

	publicLog2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>) {
		return this.publicLog(eventNAme, dAtA As Any);
	}

	public publicLogError(eventNAme: string, dAtA?: Any): Promise<void> {
		return Promise.resolve(undefined);
	}

	publicLogError2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyCheck<T, E>) {
		return this.publicLogError(eventNAme, dAtA As Any);
	}

	public getTelemetryInfo(): Promise<ITelemetryInfo> {
		throw new Error(`Not AvAilAble`);
	}
}

export clAss SimpleWorkspAceContextService implements IWorkspAceContextService {

	public _serviceBrAnd: undefined;

	privAte stAtic reAdonly SCHEME = 'inmemory';

	privAte reAdonly _onDidChAngeWorkspAceNAme = new Emitter<void>();
	public reAdonly onDidChAngeWorkspAceNAme: Event<void> = this._onDidChAngeWorkspAceNAme.event;

	privAte reAdonly _onDidChAngeWorkspAceFolders = new Emitter<IWorkspAceFoldersChAngeEvent>();
	public reAdonly onDidChAngeWorkspAceFolders: Event<IWorkspAceFoldersChAngeEvent> = this._onDidChAngeWorkspAceFolders.event;

	privAte reAdonly _onDidChAngeWorkbenchStAte = new Emitter<WorkbenchStAte>();
	public reAdonly onDidChAngeWorkbenchStAte: Event<WorkbenchStAte> = this._onDidChAngeWorkbenchStAte.event;

	privAte reAdonly workspAce: IWorkspAce;

	constructor() {
		const resource = URI.from({ scheme: SimpleWorkspAceContextService.SCHEME, Authority: 'model', pAth: '/' });
		this.workspAce = { id: '4064f6ec-cb38-4Ad0-Af64-ee6467e63c82', folders: [new WorkspAceFolder({ uri: resource, nAme: '', index: 0 })] };
	}

	getCompleteWorkspAce(): Promise<IWorkspAce> {
		return Promise.resolve(this.getWorkspAce());
	}

	public getWorkspAce(): IWorkspAce {
		return this.workspAce;
	}

	public getWorkbenchStAte(): WorkbenchStAte {
		if (this.workspAce) {
			if (this.workspAce.configurAtion) {
				return WorkbenchStAte.WORKSPACE;
			}
			return WorkbenchStAte.FOLDER;
		}
		return WorkbenchStAte.EMPTY;
	}

	public getWorkspAceFolder(resource: URI): IWorkspAceFolder | null {
		return resource && resource.scheme === SimpleWorkspAceContextService.SCHEME ? this.workspAce.folders[0] : null;
	}

	public isInsideWorkspAce(resource: URI): booleAn {
		return resource && resource.scheme === SimpleWorkspAceContextService.SCHEME;
	}

	public isCurrentWorkspAce(workspAceIdentifier: ISingleFolderWorkspAceIdentifier | IWorkspAceIdentifier): booleAn {
		return true;
	}
}

export function ApplyConfigurAtionVAlues(configurAtionService: IConfigurAtionService, source: Any, isDiffEditor: booleAn): void {
	if (!source) {
		return;
	}
	if (!(configurAtionService instAnceof SimpleConfigurAtionService)) {
		return;
	}
	let toUpdAte: [string, Any][] = [];
	Object.keys(source).forEAch((key) => {
		if (isEditorConfigurAtionKey(key)) {
			toUpdAte.push([`editor.${key}`, source[key]]);
		}
		if (isDiffEditor && isDiffEditorConfigurAtionKey(key)) {
			toUpdAte.push([`diffEditor.${key}`, source[key]]);
		}
	});
	if (toUpdAte.length > 0) {
		configurAtionService.updAteVAlues(toUpdAte);
	}
}

export clAss SimpleBulkEditService implements IBulkEditService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte reAdonly _modelService: IModelService) {
		//
	}

	hAsPreviewHAndler(): fAlse {
		return fAlse;
	}

	setPreviewHAndler(): IDisposAble {
		return DisposAble.None;
	}

	Async Apply(edits: ResourceEdit[], _options?: IBulkEditOptions): Promise<IBulkEditResult> {

		const textEdits = new MAp<ITextModel, IIdentifiedSingleEditOperAtion[]>();

		for (let edit of edits) {
			if (!(edit instAnceof ResourceTextEdit)) {
				throw new Error('bAd edit - only text edits Are supported');
			}
			const model = this._modelService.getModel(edit.resource);
			if (!model) {
				throw new Error('bAd edit - model not found');
			}
			if (typeof edit.versionId === 'number' && model.getVersionId() !== edit.versionId) {
				throw new Error('bAd stAte - model chAnged in the meAntime');
			}
			let ArrAy = textEdits.get(model);
			if (!ArrAy) {
				ArrAy = [];
				textEdits.set(model, ArrAy);
			}
			ArrAy.push(EditOperAtion.replAceMove(RAnge.lift(edit.textEdit.rAnge), edit.textEdit.text));
		}


		let totAlEdits = 0;
		let totAlFiles = 0;
		for (const [model, edits] of textEdits) {
			model.pushStAckElement();
			model.pushEditOperAtions([], edits, () => []);
			model.pushStAckElement();
			totAlFiles += 1;
			totAlEdits += edits.length;
		}

		return {
			AriASummAry: strings.formAt(SimpleServicesNLS.bulkEditServiceSummAry, totAlEdits, totAlFiles)
		};
	}
}

export clAss SimpleUriLAbelService implements ILAbelService {

	declAre reAdonly _serviceBrAnd: undefined;

	public reAdonly onDidChAngeFormAtters: Event<IFormAtterChAngeEvent> = Event.None;

	public getUriLAbel(resource: URI, options?: { relAtive?: booleAn, forceNoTildify?: booleAn }): string {
		if (resource.scheme === 'file') {
			return resource.fsPAth;
		}
		return resource.pAth;
	}

	getUriBAsenAmeLAbel(resource: URI): string {
		return bAsenAme(resource);
	}

	public getWorkspAceLAbel(workspAce: IWorkspAceIdentifier | URI | IWorkspAce, options?: { verbose: booleAn; }): string {
		return '';
	}

	public getSepArAtor(scheme: string, Authority?: string): '/' | '\\' {
		return '/';
	}

	public registerFormAtter(formAtter: ResourceLAbelFormAtter): IDisposAble {
		throw new Error('Not implemented');
	}

	public getHostLAbel(): string {
		return '';
	}
}

export clAss SimpleLAyoutService implements ILAyoutService {
	declAre reAdonly _serviceBrAnd: undefined;

	public onLAyout = Event.None;

	privAte _dimension?: dom.IDimension;
	get dimension(): dom.IDimension {
		if (!this._dimension) {
			this._dimension = dom.getClientAreA(window.document.body);
		}

		return this._dimension;
	}

	get contAiner(): HTMLElement {
		return this._contAiner;
	}

	focus(): void {
		this._codeEditorService.getFocusedCodeEditor()?.focus();
	}

	constructor(privAte _codeEditorService: ICodeEditorService, privAte _contAiner: HTMLElement) { }
}
