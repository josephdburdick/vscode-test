/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as strings from 'vs/Base/common/strings';
import * as dom from 'vs/Base/Browser/dom';
import { StandardKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyBinding, ResolvedKeyBinding, SimpleKeyBinding, createKeyBinding } from 'vs/Base/common/keyCodes';
import { IDisposaBle, IReference, ImmortalReference, toDisposaBle, DisposaBleStore, DisposaBle } from 'vs/Base/common/lifecycle';
import { OS, isLinux, isMacintosh } from 'vs/Base/common/platform';
import Severity from 'vs/Base/common/severity';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor, IDiffEditor, isCodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IBulkEditOptions, IBulkEditResult, IBulkEditService, ResourceEdit, ResourceTextEdit } from 'vs/editor/Browser/services/BulkEditService';
import { isDiffEditorConfigurationKey, isEditorConfigurationKey } from 'vs/editor/common/config/commonEditorConfig';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { IPosition, Position as Pos } from 'vs/editor/common/core/position';
import { Range } from 'vs/editor/common/core/range';
import { IEditor } from 'vs/editor/common/editorCommon';
import { IIdentifiedSingleEditOperation, ITextModel, ITextSnapshot } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { IResolvedTextEditorModel, ITextModelContentProvider, ITextModelService } from 'vs/editor/common/services/resolverService';
import { ITextResourceConfigurationService, ITextResourcePropertiesService, ITextResourceConfigurationChangeEvent } from 'vs/editor/common/services/textResourceConfigurationService';
import { CommandsRegistry, ICommandEvent, ICommandHandler, ICommandService } from 'vs/platform/commands/common/commands';
import { IConfigurationChangeEvent, IConfigurationData, IConfigurationOverrides, IConfigurationService, IConfigurationModel, IConfigurationValue, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { Configuration, ConfigurationModel, DefaultConfigurationModel, ConfigurationChangeEvent } from 'vs/platform/configuration/common/configurationModels';
import { IContextKeyService, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { IConfirmation, IConfirmationResult, IDialogOptions, IDialogService, IShowResult } from 'vs/platform/dialogs/common/dialogs';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ABstractKeyBindingService } from 'vs/platform/keyBinding/common/aBstractKeyBindingService';
import { IKeyBindingEvent, IKeyBoardEvent, KeyBindingSource, KeyBindingsSchemaContriBution } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';
import { IKeyBindingItem, KeyBindingsRegistry } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { ILaBelService, ResourceLaBelFormatter, IFormatterChangeEvent } from 'vs/platform/laBel/common/laBel';
import { INotification, INotificationHandle, INotificationService, IPromptChoice, IPromptOptions, NoOpNotification, IStatusMessageOptions, NotificationsFilter } from 'vs/platform/notification/common/notification';
import { IProgressRunner, IEditorProgressService } from 'vs/platform/progress/common/progress';
import { ITelemetryInfo, ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IWorkspace, IWorkspaceContextService, IWorkspaceFolder, IWorkspaceFoldersChangeEvent, WorkBenchState, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ISingleFolderWorkspaceIdentifier, IWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { SimpleServicesNLS } from 'vs/editor/common/standaloneStrings';
import { ClassifiedEvent, StrictPropertyCheck, GDPRClassification } from 'vs/platform/telemetry/common/gdprTypings';
import { Basename } from 'vs/Base/common/resources';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { ILogService } from 'vs/platform/log/common/log';

export class SimpleModel implements IResolvedTextEditorModel {

	private readonly model: ITextModel;
	private readonly _onDispose: Emitter<void>;

	constructor(model: ITextModel) {
		this.model = model;
		this._onDispose = new Emitter<void>();
	}

	puBlic get onDispose(): Event<void> {
		return this._onDispose.event;
	}

	puBlic load(): Promise<SimpleModel> {
		return Promise.resolve(this);
	}

	puBlic get textEditorModel(): ITextModel {
		return this.model;
	}

	puBlic createSnapshot(): ITextSnapshot {
		return this.model.createSnapshot();
	}

	puBlic isReadonly(): Boolean {
		return false;
	}

	private disposed = false;
	puBlic dispose(): void {
		this.disposed = true;

		this._onDispose.fire();
	}

	puBlic isDisposed(): Boolean {
		return this.disposed;
	}

	puBlic isResolved(): Boolean {
		return true;
	}

	puBlic getMode(): string | undefined {
		return this.model.getModeId();
	}
}

export interface IOpenEditorDelegate {
	(url: string): Boolean;
}

function withTypedEditor<T>(widget: IEditor, codeEditorCallBack: (editor: ICodeEditor) => T, diffEditorCallBack: (editor: IDiffEditor) => T): T {
	if (isCodeEditor(widget)) {
		// Single Editor
		return codeEditorCallBack(<ICodeEditor>widget);
	} else {
		// Diff Editor
		return diffEditorCallBack(<IDiffEditor>widget);
	}
}

export class SimpleEditorModelResolverService implements ITextModelService {
	puBlic _serviceBrand: undefined;

	private editor?: IEditor;

	constructor(
		@IModelService private readonly modelService: IModelService
	) { }

	puBlic setEditor(editor: IEditor): void {
		this.editor = editor;
	}

	puBlic createModelReference(resource: URI): Promise<IReference<IResolvedTextEditorModel>> {
		let model: ITextModel | null = null;
		if (this.editor) {
			model = withTypedEditor(this.editor,
				(editor) => this.findModel(editor, resource),
				(diffEditor) => this.findModel(diffEditor.getOriginalEditor(), resource) || this.findModel(diffEditor.getModifiedEditor(), resource)
			);
		}

		if (!model) {
			return Promise.reject(new Error(`Model not found`));
		}

		return Promise.resolve(new ImmortalReference(new SimpleModel(model)));
	}

	puBlic registerTextModelContentProvider(scheme: string, provider: ITextModelContentProvider): IDisposaBle {
		return {
			dispose: function () { /* no op */ }
		};
	}

	puBlic canHandleResource(resource: URI): Boolean {
		return false;
	}

	private findModel(editor: ICodeEditor, resource: URI): ITextModel | null {
		let model = this.modelService.getModel(resource);
		if (model && model.uri.toString() !== resource.toString()) {
			return null;
		}

		return model;
	}
}

export class SimpleEditorProgressService implements IEditorProgressService {
	declare readonly _serviceBrand: undefined;

	private static NULL_PROGRESS_RUNNER: IProgressRunner = {
		done: () => { },
		total: () => { },
		worked: () => { }
	};

	show(infinite: true, delay?: numBer): IProgressRunner;
	show(total: numBer, delay?: numBer): IProgressRunner;
	show(): IProgressRunner {
		return SimpleEditorProgressService.NULL_PROGRESS_RUNNER;
	}

	showWhile(promise: Promise<any>, delay?: numBer): Promise<void> {
		return Promise.resolve(undefined);
	}
}

export class SimpleDialogService implements IDialogService {

	puBlic _serviceBrand: undefined;

	puBlic confirm(confirmation: IConfirmation): Promise<IConfirmationResult> {
		return this.doConfirm(confirmation).then(confirmed => {
			return {
				confirmed,
				checkBoxChecked: false // unsupported
			} as IConfirmationResult;
		});
	}

	private doConfirm(confirmation: IConfirmation): Promise<Boolean> {
		let messageText = confirmation.message;
		if (confirmation.detail) {
			messageText = messageText + '\n\n' + confirmation.detail;
		}

		return Promise.resolve(window.confirm(messageText));
	}

	puBlic show(severity: Severity, message: string, Buttons: string[], options?: IDialogOptions): Promise<IShowResult> {
		return Promise.resolve({ choice: 0 });
	}

	puBlic aBout(): Promise<void> {
		return Promise.resolve(undefined);
	}
}

export class SimpleNotificationService implements INotificationService {

	puBlic _serviceBrand: undefined;

	private static readonly NO_OP: INotificationHandle = new NoOpNotification();

	puBlic info(message: string): INotificationHandle {
		return this.notify({ severity: Severity.Info, message });
	}

	puBlic warn(message: string): INotificationHandle {
		return this.notify({ severity: Severity.Warning, message });
	}

	puBlic error(error: string | Error): INotificationHandle {
		return this.notify({ severity: Severity.Error, message: error });
	}

	puBlic notify(notification: INotification): INotificationHandle {
		switch (notification.severity) {
			case Severity.Error:
				console.error(notification.message);
				Break;
			case Severity.Warning:
				console.warn(notification.message);
				Break;
			default:
				console.log(notification.message);
				Break;
		}

		return SimpleNotificationService.NO_OP;
	}

	puBlic prompt(severity: Severity, message: string, choices: IPromptChoice[], options?: IPromptOptions): INotificationHandle {
		return SimpleNotificationService.NO_OP;
	}

	puBlic status(message: string | Error, options?: IStatusMessageOptions): IDisposaBle {
		return DisposaBle.None;
	}

	puBlic setFilter(filter: NotificationsFilter): void { }
}

export class StandaloneCommandService implements ICommandService {
	declare readonly _serviceBrand: undefined;

	private readonly _instantiationService: IInstantiationService;

	private readonly _onWillExecuteCommand = new Emitter<ICommandEvent>();
	private readonly _onDidExecuteCommand = new Emitter<ICommandEvent>();
	puBlic readonly onWillExecuteCommand: Event<ICommandEvent> = this._onWillExecuteCommand.event;
	puBlic readonly onDidExecuteCommand: Event<ICommandEvent> = this._onDidExecuteCommand.event;

	constructor(instantiationService: IInstantiationService) {
		this._instantiationService = instantiationService;
	}

	puBlic executeCommand<T>(id: string, ...args: any[]): Promise<T> {
		const command = CommandsRegistry.getCommand(id);
		if (!command) {
			return Promise.reject(new Error(`command '${id}' not found`));
		}

		try {
			this._onWillExecuteCommand.fire({ commandId: id, args });
			const result = this._instantiationService.invokeFunction.apply(this._instantiationService, [command.handler, ...args]) as T;

			this._onDidExecuteCommand.fire({ commandId: id, args });
			return Promise.resolve(result);
		} catch (err) {
			return Promise.reject(err);
		}
	}
}

export class StandaloneKeyBindingService extends ABstractKeyBindingService {
	private _cachedResolver: KeyBindingResolver | null;
	private readonly _dynamicKeyBindings: IKeyBindingItem[];

	constructor(
		contextKeyService: IContextKeyService,
		commandService: ICommandService,
		telemetryService: ITelemetryService,
		notificationService: INotificationService,
		logService: ILogService,
		domNode: HTMLElement
	) {
		super(contextKeyService, commandService, telemetryService, notificationService, logService);

		this._cachedResolver = null;
		this._dynamicKeyBindings = [];

		this._register(dom.addDisposaBleListener(domNode, dom.EventType.KEY_DOWN, (e: KeyBoardEvent) => {
			let keyEvent = new StandardKeyBoardEvent(e);
			let shouldPreventDefault = this._dispatch(keyEvent, keyEvent.target);
			if (shouldPreventDefault) {
				keyEvent.preventDefault();
				keyEvent.stopPropagation();
			}
		}));
	}

	puBlic addDynamicKeyBinding(commandId: string, _keyBinding: numBer, handler: ICommandHandler, when: ContextKeyExpression | undefined): IDisposaBle {
		const keyBinding = createKeyBinding(_keyBinding, OS);

		const toDispose = new DisposaBleStore();

		if (keyBinding) {
			this._dynamicKeyBindings.push({
				keyBinding: keyBinding,
				command: commandId,
				when: when,
				weight1: 1000,
				weight2: 0,
				extensionId: null
			});

			toDispose.add(toDisposaBle(() => {
				for (let i = 0; i < this._dynamicKeyBindings.length; i++) {
					let kB = this._dynamicKeyBindings[i];
					if (kB.command === commandId) {
						this._dynamicKeyBindings.splice(i, 1);
						this.updateResolver({ source: KeyBindingSource.Default });
						return;
					}
				}
			}));
		}

		toDispose.add(CommandsRegistry.registerCommand(commandId, handler));

		this.updateResolver({ source: KeyBindingSource.Default });

		return toDispose;
	}

	private updateResolver(event: IKeyBindingEvent): void {
		this._cachedResolver = null;
		this._onDidUpdateKeyBindings.fire(event);
	}

	protected _getResolver(): KeyBindingResolver {
		if (!this._cachedResolver) {
			const defaults = this._toNormalizedKeyBindingItems(KeyBindingsRegistry.getDefaultKeyBindings(), true);
			const overrides = this._toNormalizedKeyBindingItems(this._dynamicKeyBindings, false);
			this._cachedResolver = new KeyBindingResolver(defaults, overrides, (str) => this._log(str));
		}
		return this._cachedResolver;
	}

	protected _documentHasFocus(): Boolean {
		return document.hasFocus();
	}

	private _toNormalizedKeyBindingItems(items: IKeyBindingItem[], isDefault: Boolean): ResolvedKeyBindingItem[] {
		let result: ResolvedKeyBindingItem[] = [], resultLen = 0;
		for (const item of items) {
			const when = item.when || undefined;
			const keyBinding = item.keyBinding;

			if (!keyBinding) {
				// This might Be a removal keyBinding item in user settings => accept it
				result[resultLen++] = new ResolvedKeyBindingItem(undefined, item.command, item.commandArgs, when, isDefault, null);
			} else {
				const resolvedKeyBindings = this.resolveKeyBinding(keyBinding);
				for (const resolvedKeyBinding of resolvedKeyBindings) {
					result[resultLen++] = new ResolvedKeyBindingItem(resolvedKeyBinding, item.command, item.commandArgs, when, isDefault, null);
				}
			}
		}

		return result;
	}

	puBlic resolveKeyBinding(keyBinding: KeyBinding): ResolvedKeyBinding[] {
		return [new USLayoutResolvedKeyBinding(keyBinding, OS)];
	}

	puBlic resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding {
		let keyBinding = new SimpleKeyBinding(
			keyBoardEvent.ctrlKey,
			keyBoardEvent.shiftKey,
			keyBoardEvent.altKey,
			keyBoardEvent.metaKey,
			keyBoardEvent.keyCode
		).toChord();
		return new USLayoutResolvedKeyBinding(keyBinding, OS);
	}

	puBlic resolveUserBinding(userBinding: string): ResolvedKeyBinding[] {
		return [];
	}

	puBlic _dumpDeBugInfo(): string {
		return '';
	}

	puBlic _dumpDeBugInfoJSON(): string {
		return '';
	}

	puBlic registerSchemaContriBution(contriBution: KeyBindingsSchemaContriBution): void {
		// noop
	}
}

function isConfigurationOverrides(thing: any): thing is IConfigurationOverrides {
	return thing
		&& typeof thing === 'oBject'
		&& (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string')
		&& (!thing.resource || thing.resource instanceof URI);
}

export class SimpleConfigurationService implements IConfigurationService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeConfiguration = new Emitter<IConfigurationChangeEvent>();
	puBlic readonly onDidChangeConfiguration: Event<IConfigurationChangeEvent> = this._onDidChangeConfiguration.event;

	private readonly _configuration: Configuration;

	constructor() {
		this._configuration = new Configuration(new DefaultConfigurationModel(), new ConfigurationModel());
	}

	getValue<T>(): T;
	getValue<T>(section: string): T;
	getValue<T>(overrides: IConfigurationOverrides): T;
	getValue<T>(section: string, overrides: IConfigurationOverrides): T;
	getValue(arg1?: any, arg2?: any): any {
		const section = typeof arg1 === 'string' ? arg1 : undefined;
		const overrides = isConfigurationOverrides(arg1) ? arg1 : isConfigurationOverrides(arg2) ? arg2 : {};
		return this._configuration.getValue(section, overrides, undefined);
	}

	puBlic updateValues(values: [string, any][]): Promise<void> {
		const previous = { data: this._configuration.toData() };

		let changedKeys: string[] = [];

		for (const entry of values) {
			const [key, value] = entry;
			if (this.getValue(key) === value) {
				continue;
			}
			this._configuration.updateValue(key, value);
			changedKeys.push(key);
		}

		if (changedKeys.length > 0) {
			const configurationChangeEvent = new ConfigurationChangeEvent({ keys: changedKeys, overrides: [] }, previous, this._configuration);
			configurationChangeEvent.source = ConfigurationTarget.MEMORY;
			configurationChangeEvent.sourceConfig = null;
			this._onDidChangeConfiguration.fire(configurationChangeEvent);
		}

		return Promise.resolve();
	}

	puBlic updateValue(key: string, value: any, arg3?: any, arg4?: any): Promise<void> {
		return this.updateValues([[key, value]]);
	}

	puBlic inspect<C>(key: string, options: IConfigurationOverrides = {}): IConfigurationValue<C> {
		return this._configuration.inspect<C>(key, options, undefined);
	}

	puBlic keys() {
		return this._configuration.keys(undefined);
	}

	puBlic reloadConfiguration(): Promise<void> {
		return Promise.resolve(undefined);
	}

	puBlic getConfigurationData(): IConfigurationData | null {
		const emptyModel: IConfigurationModel = {
			contents: {},
			keys: [],
			overrides: []
		};
		return {
			defaults: emptyModel,
			user: emptyModel,
			workspace: emptyModel,
			folders: []
		};
	}
}

export class SimpleResourceConfigurationService implements ITextResourceConfigurationService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidChangeConfiguration = new Emitter<ITextResourceConfigurationChangeEvent>();
	puBlic readonly onDidChangeConfiguration = this._onDidChangeConfiguration.event;

	constructor(private readonly configurationService: SimpleConfigurationService) {
		this.configurationService.onDidChangeConfiguration((e) => {
			this._onDidChangeConfiguration.fire({ affectedKeys: e.affectedKeys, affectsConfiguration: (resource: URI, configuration: string) => e.affectsConfiguration(configuration) });
		});
	}

	getValue<T>(resource: URI, section?: string): T;
	getValue<T>(resource: URI, position?: IPosition, section?: string): T;
	getValue<T>(resource: any, arg2?: any, arg3?: any) {
		const position: IPosition | null = Pos.isIPosition(arg2) ? arg2 : null;
		const section: string | undefined = position ? (typeof arg3 === 'string' ? arg3 : undefined) : (typeof arg2 === 'string' ? arg2 : undefined);
		if (typeof section === 'undefined') {
			return this.configurationService.getValue<T>();
		}
		return this.configurationService.getValue<T>(section);
	}

	updateValue(resource: URI, key: string, value: any, configurationTarget?: ConfigurationTarget): Promise<void> {
		return this.configurationService.updateValue(key, value, { resource }, configurationTarget);
	}
}

export class SimpleResourcePropertiesService implements ITextResourcePropertiesService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
	}

	getEOL(resource: URI, language?: string): string {
		const eol = this.configurationService.getValue<string>('files.eol', { overrideIdentifier: language, resource });
		if (eol && eol !== 'auto') {
			return eol;
		}
		return (isLinux || isMacintosh) ? '\n' : '\r\n';
	}
}

export class StandaloneTelemetryService implements ITelemetryService {
	declare readonly _serviceBrand: undefined;

	puBlic isOptedIn = false;
	puBlic sendErrorTelemetry = false;

	puBlic setEnaBled(value: Boolean): void {
	}

	puBlic setExperimentProperty(name: string, value: string): void {
	}

	puBlic puBlicLog(eventName: string, data?: any): Promise<void> {
		return Promise.resolve(undefined);
	}

	puBlicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>) {
		return this.puBlicLog(eventName, data as any);
	}

	puBlic puBlicLogError(eventName: string, data?: any): Promise<void> {
		return Promise.resolve(undefined);
	}

	puBlicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyCheck<T, E>) {
		return this.puBlicLogError(eventName, data as any);
	}

	puBlic getTelemetryInfo(): Promise<ITelemetryInfo> {
		throw new Error(`Not availaBle`);
	}
}

export class SimpleWorkspaceContextService implements IWorkspaceContextService {

	puBlic _serviceBrand: undefined;

	private static readonly SCHEME = 'inmemory';

	private readonly _onDidChangeWorkspaceName = new Emitter<void>();
	puBlic readonly onDidChangeWorkspaceName: Event<void> = this._onDidChangeWorkspaceName.event;

	private readonly _onDidChangeWorkspaceFolders = new Emitter<IWorkspaceFoldersChangeEvent>();
	puBlic readonly onDidChangeWorkspaceFolders: Event<IWorkspaceFoldersChangeEvent> = this._onDidChangeWorkspaceFolders.event;

	private readonly _onDidChangeWorkBenchState = new Emitter<WorkBenchState>();
	puBlic readonly onDidChangeWorkBenchState: Event<WorkBenchState> = this._onDidChangeWorkBenchState.event;

	private readonly workspace: IWorkspace;

	constructor() {
		const resource = URI.from({ scheme: SimpleWorkspaceContextService.SCHEME, authority: 'model', path: '/' });
		this.workspace = { id: '4064f6ec-cB38-4ad0-af64-ee6467e63c82', folders: [new WorkspaceFolder({ uri: resource, name: '', index: 0 })] };
	}

	getCompleteWorkspace(): Promise<IWorkspace> {
		return Promise.resolve(this.getWorkspace());
	}

	puBlic getWorkspace(): IWorkspace {
		return this.workspace;
	}

	puBlic getWorkBenchState(): WorkBenchState {
		if (this.workspace) {
			if (this.workspace.configuration) {
				return WorkBenchState.WORKSPACE;
			}
			return WorkBenchState.FOLDER;
		}
		return WorkBenchState.EMPTY;
	}

	puBlic getWorkspaceFolder(resource: URI): IWorkspaceFolder | null {
		return resource && resource.scheme === SimpleWorkspaceContextService.SCHEME ? this.workspace.folders[0] : null;
	}

	puBlic isInsideWorkspace(resource: URI): Boolean {
		return resource && resource.scheme === SimpleWorkspaceContextService.SCHEME;
	}

	puBlic isCurrentWorkspace(workspaceIdentifier: ISingleFolderWorkspaceIdentifier | IWorkspaceIdentifier): Boolean {
		return true;
	}
}

export function applyConfigurationValues(configurationService: IConfigurationService, source: any, isDiffEditor: Boolean): void {
	if (!source) {
		return;
	}
	if (!(configurationService instanceof SimpleConfigurationService)) {
		return;
	}
	let toUpdate: [string, any][] = [];
	OBject.keys(source).forEach((key) => {
		if (isEditorConfigurationKey(key)) {
			toUpdate.push([`editor.${key}`, source[key]]);
		}
		if (isDiffEditor && isDiffEditorConfigurationKey(key)) {
			toUpdate.push([`diffEditor.${key}`, source[key]]);
		}
	});
	if (toUpdate.length > 0) {
		configurationService.updateValues(toUpdate);
	}
}

export class SimpleBulkEditService implements IBulkEditService {
	declare readonly _serviceBrand: undefined;

	constructor(private readonly _modelService: IModelService) {
		//
	}

	hasPreviewHandler(): false {
		return false;
	}

	setPreviewHandler(): IDisposaBle {
		return DisposaBle.None;
	}

	async apply(edits: ResourceEdit[], _options?: IBulkEditOptions): Promise<IBulkEditResult> {

		const textEdits = new Map<ITextModel, IIdentifiedSingleEditOperation[]>();

		for (let edit of edits) {
			if (!(edit instanceof ResourceTextEdit)) {
				throw new Error('Bad edit - only text edits are supported');
			}
			const model = this._modelService.getModel(edit.resource);
			if (!model) {
				throw new Error('Bad edit - model not found');
			}
			if (typeof edit.versionId === 'numBer' && model.getVersionId() !== edit.versionId) {
				throw new Error('Bad state - model changed in the meantime');
			}
			let array = textEdits.get(model);
			if (!array) {
				array = [];
				textEdits.set(model, array);
			}
			array.push(EditOperation.replaceMove(Range.lift(edit.textEdit.range), edit.textEdit.text));
		}


		let totalEdits = 0;
		let totalFiles = 0;
		for (const [model, edits] of textEdits) {
			model.pushStackElement();
			model.pushEditOperations([], edits, () => []);
			model.pushStackElement();
			totalFiles += 1;
			totalEdits += edits.length;
		}

		return {
			ariaSummary: strings.format(SimpleServicesNLS.BulkEditServiceSummary, totalEdits, totalFiles)
		};
	}
}

export class SimpleUriLaBelService implements ILaBelService {

	declare readonly _serviceBrand: undefined;

	puBlic readonly onDidChangeFormatters: Event<IFormatterChangeEvent> = Event.None;

	puBlic getUriLaBel(resource: URI, options?: { relative?: Boolean, forceNoTildify?: Boolean }): string {
		if (resource.scheme === 'file') {
			return resource.fsPath;
		}
		return resource.path;
	}

	getUriBasenameLaBel(resource: URI): string {
		return Basename(resource);
	}

	puBlic getWorkspaceLaBel(workspace: IWorkspaceIdentifier | URI | IWorkspace, options?: { verBose: Boolean; }): string {
		return '';
	}

	puBlic getSeparator(scheme: string, authority?: string): '/' | '\\' {
		return '/';
	}

	puBlic registerFormatter(formatter: ResourceLaBelFormatter): IDisposaBle {
		throw new Error('Not implemented');
	}

	puBlic getHostLaBel(): string {
		return '';
	}
}

export class SimpleLayoutService implements ILayoutService {
	declare readonly _serviceBrand: undefined;

	puBlic onLayout = Event.None;

	private _dimension?: dom.IDimension;
	get dimension(): dom.IDimension {
		if (!this._dimension) {
			this._dimension = dom.getClientArea(window.document.Body);
		}

		return this._dimension;
	}

	get container(): HTMLElement {
		return this._container;
	}

	focus(): void {
		this._codeEditorService.getFocusedCodeEditor()?.focus();
	}

	constructor(private _codeEditorService: ICodeEditorService, private _container: HTMLElement) { }
}
