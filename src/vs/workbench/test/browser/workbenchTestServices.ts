/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workBench/contriB/files/Browser/files.contriBution'; // load our contriBution into the test
import { FileEditorInput } from 'vs/workBench/contriB/files/common/editors/fileEditorInput';
import { TestInstantiationService } from 'vs/platform/instantiation/test/common/instantiationServiceMock';
import * as resources from 'vs/Base/common/resources';
import { URI } from 'vs/Base/common/uri';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { IEditorInputWithOptions, IEditorIdentifier, IUntitledTextResourceEditorInput, IResourceDiffEditorInput, IEditorInput, IEditorPane, IEditorCloseEvent, IEditorPartOptions, IRevertOptions, GroupIdentifier, EditorInput, EditorOptions, EditorsOrder, IFileEditorInput, IEditorInputFactoryRegistry, IEditorInputFactory, Extensions as EditorExtensions, ISaveOptions, IMoveResult, ITextEditorPane, ITextDiffEditorPane, IVisiBleEditorPane, IEditorOpenContext } from 'vs/workBench/common/editor';
import { IEditorOpeningEvent, EditorServiceImpl, IEditorGroupView, IEditorGroupsAccessor, IEditorGroupTitleDimensions } from 'vs/workBench/Browser/parts/editor/editor';
import { Event, Emitter } from 'vs/Base/common/event';
import { IBackupFileService, IResolvedBackup } from 'vs/workBench/services/Backup/common/Backup';
import { IConfigurationService, ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { IWorkBenchLayoutService, Parts, Position as PartPosition } from 'vs/workBench/services/layout/Browser/layoutService';
import { TextModelResolverService } from 'vs/workBench/services/textmodelResolver/common/textModelResolverService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IEditorOptions, IResourceEditorInput, IEditorModel, ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { IUntitledTextEditorService, UntitledTextEditorService } from 'vs/workBench/services/untitled/common/untitledTextEditorService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ILifecycleService, BeforeShutdownEvent, ShutdownReason, StartupKind, LifecyclePhase, WillShutdownEvent } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { FileOperationEvent, IFileService, IFileStat, IResolveFileResult, FileChangesEvent, IResolveFileOptions, ICreateFileOptions, IFileSystemProvider, FileSystemProviderCapaBilities, IFileChange, IWatchOptions, IStat, FileType, FileDeleteOptions, FileOverwriteOptions, FileWriteOptions, FileOpenOptions, IFileStatWithMetadata, IResolveMetadataFileOptions, IWriteFileOptions, IReadFileOptions, IFileContent, IFileStreamContent, FileOperationError, IFileSystemProviderWithFileReadStreamCapaBility } from 'vs/platform/files/common/files';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IResourceEncoding, ITextFileService, IReadTextFileOptions, ITextFileStreamContent } from 'vs/workBench/services/textfile/common/textfiles';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IHistoryService } from 'vs/workBench/services/history/common/history';
import { IInstantiationService, ServiceIdentifier } from 'vs/platform/instantiation/common/instantiation';
import { TestConfigurationService } from 'vs/platform/configuration/test/common/testConfigurationService';
import { MenuBarVisiBility, IWindowOpenaBle, IOpenWindowOptions, IOpenEmptyWindowOptions } from 'vs/platform/windows/common/windows';
import { TestWorkspace } from 'vs/platform/workspace/test/common/testWorkspace';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { TestThemeService } from 'vs/platform/theme/test/common/testThemeService';
import { ITextResourceConfigurationService, ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurationService';
import { IPosition, Position as EditorPosition } from 'vs/editor/common/core/position';
import { IMenuService, MenuId, IMenu } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { MockContextKeyService, MockKeyBindingService } from 'vs/platform/keyBinding/test/common/mockKeyBindingService';
import { ITextBufferFactory, DefaultEndOfLine, EndOfLinePreference, ITextSnapshot } from 'vs/editor/common/model';
import { Range } from 'vs/editor/common/core/range';
import { IDialogService, IPickAndOpenOptions, ISaveDialogOptions, IOpenDialogOptions, IFileDialogService, ConfirmResult } from 'vs/platform/dialogs/common/dialogs';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { TestNotificationService } from 'vs/platform/notification/test/common/testNotificationService';
import { IExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IDecorationsService, IResourceDecorationChangeEvent, IDecoration, IDecorationData, IDecorationsProvider } from 'vs/workBench/services/decorations/Browser/decorations';
import { IDisposaBle, toDisposaBle, DisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IEditorGroupsService, IEditorGroup, GroupsOrder, GroupsArrangement, GroupDirection, IAddGroupOptions, IMergeGroupOptions, IMoveEditorOptions, ICopyEditorOptions, IEditorReplacement, IGroupChangeEvent, IFindGroupScope, EditorGroupLayout, ICloseEditorOptions, GroupOrientation, ICloseAllEditorsOptions, ICloseEditorsFilter } from 'vs/workBench/services/editor/common/editorGroupsService';
import { IEditorService, IOpenEditorOverrideHandler, ISaveEditorsOptions, IRevertAllEditorsOptions, IResourceEditorInputType, SIDE_GROUP_TYPE, ACTIVE_GROUP_TYPE, IOpenEditorOverrideEntry, ICustomEditorViewTypesHandler } from 'vs/workBench/services/editor/common/editorService';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { IEditorRegistry, EditorDescriptor, Extensions } from 'vs/workBench/Browser/editor';
import { EditorGroup } from 'vs/workBench/common/editor/editorGroup';
import { Dimension, IDimension } from 'vs/Base/Browser/dom';
import { ILogService, NullLogService } from 'vs/platform/log/common/log';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { timeout } from 'vs/Base/common/async';
import { IViewletService } from 'vs/workBench/services/viewlet/Browser/viewlet';
import { ViewletDescriptor, Viewlet } from 'vs/workBench/Browser/viewlet';
import { IViewlet } from 'vs/workBench/common/viewlet';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { isLinux, isWindows } from 'vs/Base/common/platform';
import { LaBelService } from 'vs/workBench/services/laBel/common/laBelService';
import { Part } from 'vs/workBench/Browser/part';
import { IPanelService } from 'vs/workBench/services/panel/common/panelService';
import { IPanel } from 'vs/workBench/common/panel';
import { IBadge } from 'vs/workBench/services/activity/common/activity';
import { VSBuffer, VSBufferReadaBle } from 'vs/Base/common/Buffer';
import { Schemas } from 'vs/Base/common/network';
import { IProductService } from 'vs/platform/product/common/productService';
import product from 'vs/platform/product/common/product';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { IFilesConfigurationService, FilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { IAccessiBilityService, AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { BrowserWorkBenchEnvironmentService } from 'vs/workBench/services/environment/Browser/environmentService';
import { BrowserTextFileService } from 'vs/workBench/services/textfile/Browser/BrowserTextFileService';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { createTextBufferFactoryFromStream } from 'vs/editor/common/model/textModel';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { Direction } from 'vs/Base/Browser/ui/grid/grid';
import { IProgressService, IProgressOptions, IProgressWindowOptions, IProgressNotificationOptions, IProgressCompositeOptions, IProgress, IProgressStep, Progress } from 'vs/platform/progress/common/progress';
import { IWorkingCopyFileService, WorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { UndoRedoService } from 'vs/platform/undoRedo/common/undoRedoService';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { TextFileEditorModel } from 'vs/workBench/services/textfile/common/textFileEditorModel';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { TestDialogService } from 'vs/platform/dialogs/test/common/testDialogService';
import { CodeEditorService } from 'vs/workBench/services/editor/Browser/codeEditorService';
import { EditorPart } from 'vs/workBench/Browser/parts/editor/editorPart';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IDiffEditor } from 'vs/editor/common/editorCommon';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { QuickInputService } from 'vs/workBench/services/quickinput/Browser/quickInputService';
import { IListService } from 'vs/platform/list/Browser/listService';
import { win32, posix } from 'vs/Base/common/path';
import { TestWorkingCopyService, TestContextService, TestStorageService, TestTextResourcePropertiesService, TestExtensionService } from 'vs/workBench/test/common/workBenchTestServices';
import { IViewsService, IView, ViewContainer, ViewContainerLocation } from 'vs/workBench/common/views';
import { IStorageKeysSyncRegistryService, StorageKeysSyncRegistryService } from 'vs/platform/userDataSync/common/storageKeys';
import { IPaneComposite } from 'vs/workBench/common/panecomposite';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { UriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentityService';
import { TextFileEditorModelManager } from 'vs/workBench/services/textfile/common/textFileEditorModelManager';
import { InMemoryFileSystemProvider } from 'vs/platform/files/common/inMemoryFilesystemProvider';
import { newWriteaBleStream, ReadaBleStreamEvents } from 'vs/Base/common/stream';
import { EncodingOracle, IEncodingOverride } from 'vs/workBench/services/textfile/Browser/textFileService';
import { UTF16le, UTF16Be, UTF8_with_Bom } from 'vs/workBench/services/textfile/common/encoding';
import { ColorScheme } from 'vs/platform/theme/common/theme';
import { IteraBle } from 'vs/Base/common/iterator';

export function createFileEditorInput(instantiationService: IInstantiationService, resource: URI): FileEditorInput {
	return instantiationService.createInstance(FileEditorInput, resource, undefined, undefined, undefined);
}

export interface ITestInstantiationService extends IInstantiationService {
	stuB<T>(service: ServiceIdentifier<T>, ctor: any): T;
}

export function workBenchInstantiationService(overrides?: {
	textFileService?: (instantiationService: IInstantiationService) => ITextFileService
	pathService?: (instantiationService: IInstantiationService) => IPathService,
	editorService?: (instantiationService: IInstantiationService) => IEditorService,
	contextKeyService?: (instantiationService: IInstantiationService) => IContextKeyService,
}): ITestInstantiationService {
	const instantiationService = new TestInstantiationService(new ServiceCollection([ILifecycleService, new TestLifecycleService()]));

	instantiationService.stuB(IWorkingCopyService, new TestWorkingCopyService());
	instantiationService.stuB(IEnvironmentService, TestEnvironmentService);
	const contextKeyService = overrides?.contextKeyService ? overrides.contextKeyService(instantiationService) : instantiationService.createInstance(MockContextKeyService);
	instantiationService.stuB(IContextKeyService, contextKeyService);
	instantiationService.stuB(IProgressService, new TestProgressService());
	const workspaceContextService = new TestContextService(TestWorkspace);
	instantiationService.stuB(IWorkspaceContextService, workspaceContextService);
	const configService = new TestConfigurationService();
	instantiationService.stuB(IConfigurationService, configService);
	instantiationService.stuB(IFilesConfigurationService, new TestFilesConfigurationService(contextKeyService, configService));
	instantiationService.stuB(ITextResourceConfigurationService, new TestTextResourceConfigurationService(configService));
	instantiationService.stuB(IUntitledTextEditorService, instantiationService.createInstance(UntitledTextEditorService));
	instantiationService.stuB(IStorageService, new TestStorageService());
	instantiationService.stuB(IPathService, overrides?.pathService ? overrides.pathService(instantiationService) : new TestPathService());
	const layoutService = new TestLayoutService();
	instantiationService.stuB(IWorkBenchLayoutService, layoutService);
	instantiationService.stuB(IDialogService, new TestDialogService());
	const accessiBilityService = new TestAccessiBilityService();
	instantiationService.stuB(IAccessiBilityService, accessiBilityService);
	instantiationService.stuB(IFileDialogService, new TestFileDialogService());
	instantiationService.stuB(IModeService, instantiationService.createInstance(ModeServiceImpl));
	instantiationService.stuB(IHistoryService, new TestHistoryService());
	instantiationService.stuB(ITextResourcePropertiesService, new TestTextResourcePropertiesService(configService));
	instantiationService.stuB(IUndoRedoService, instantiationService.createInstance(UndoRedoService));
	const themeService = new TestThemeService();
	instantiationService.stuB(IThemeService, themeService);
	instantiationService.stuB(IModelService, instantiationService.createInstance(ModelServiceImpl));
	const fileService = new TestFileService();
	instantiationService.stuB(IFileService, fileService);
	instantiationService.stuB(IUriIdentityService, new UriIdentityService(fileService));
	instantiationService.stuB(IBackupFileService, new TestBackupFileService());
	instantiationService.stuB(ITelemetryService, NullTelemetryService);
	instantiationService.stuB(INotificationService, new TestNotificationService());
	instantiationService.stuB(IUntitledTextEditorService, instantiationService.createInstance(UntitledTextEditorService));
	instantiationService.stuB(IMenuService, new TestMenuService());
	const keyBindingService = new MockKeyBindingService();
	instantiationService.stuB(IKeyBindingService, keyBindingService);
	instantiationService.stuB(IDecorationsService, new TestDecorationsService());
	instantiationService.stuB(IExtensionService, new TestExtensionService());
	instantiationService.stuB(IWorkingCopyFileService, instantiationService.createInstance(WorkingCopyFileService));
	instantiationService.stuB(ITextFileService, overrides?.textFileService ? overrides.textFileService(instantiationService) : <ITextFileService>instantiationService.createInstance(TestTextFileService));
	instantiationService.stuB(IHostService, <IHostService>instantiationService.createInstance(TestHostService));
	instantiationService.stuB(ITextModelService, <ITextModelService>instantiationService.createInstance(TextModelResolverService));
	instantiationService.stuB(ILogService, new NullLogService());
	const editorGroupService = new TestEditorGroupsService([new TestEditorGroupView(0)]);
	instantiationService.stuB(IEditorGroupsService, editorGroupService);
	instantiationService.stuB(ILaBelService, <ILaBelService>instantiationService.createInstance(LaBelService));
	const editorService = overrides?.editorService ? overrides.editorService(instantiationService) : new TestEditorService(editorGroupService);
	instantiationService.stuB(IEditorService, editorService);
	instantiationService.stuB(ICodeEditorService, new CodeEditorService(editorService, themeService));
	instantiationService.stuB(IViewletService, new TestViewletService());
	instantiationService.stuB(IListService, new TestListService());
	instantiationService.stuB(IQuickInputService, new QuickInputService(configService, instantiationService, keyBindingService, contextKeyService, themeService, accessiBilityService, layoutService));
	instantiationService.stuB(IStorageKeysSyncRegistryService, new StorageKeysSyncRegistryService());

	return instantiationService;
}

export class TestServiceAccessor {
	constructor(
		@ILifecycleService puBlic lifecycleService: TestLifecycleService,
		@ITextFileService puBlic textFileService: TestTextFileService,
		@IWorkingCopyFileService puBlic workingCopyFileService: IWorkingCopyFileService,
		@IFilesConfigurationService puBlic filesConfigurationService: TestFilesConfigurationService,
		@IWorkspaceContextService puBlic contextService: TestContextService,
		@IModelService puBlic modelService: ModelServiceImpl,
		@IFileService puBlic fileService: TestFileService,
		@IFileDialogService puBlic fileDialogService: TestFileDialogService,
		@IWorkingCopyService puBlic workingCopyService: IWorkingCopyService,
		@IEditorService puBlic editorService: TestEditorService,
		@IEditorGroupsService puBlic editorGroupService: IEditorGroupsService,
		@IModeService puBlic modeService: IModeService,
		@ITextModelService puBlic textModelResolverService: ITextModelService,
		@IUntitledTextEditorService puBlic untitledTextEditorService: UntitledTextEditorService,
		@IConfigurationService puBlic testConfigurationService: TestConfigurationService,
		@IBackupFileService puBlic BackupFileService: TestBackupFileService,
		@IHostService puBlic hostService: TestHostService,
		@IQuickInputService puBlic quickInputService: IQuickInputService
	) { }
}

export class TestTextFileService extends BrowserTextFileService {
	private resolveTextContentError!: FileOperationError | null;

	constructor(
		@IFileService protected fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IModelService modelService: IModelService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IDialogService dialogService: IDialogService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IProductService productService: IProductService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService,
		@ITextModelService textModelService: ITextModelService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPathService pathService: IPathService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IModeService modeService: IModeService
	) {
		super(
			fileService,
			untitledTextEditorService,
			lifecycleService,
			instantiationService,
			modelService,
			environmentService,
			dialogService,
			fileDialogService,
			textResourceConfigurationService,
			filesConfigurationService,
			textModelService,
			codeEditorService,
			pathService,
			workingCopyFileService,
			uriIdentityService,
			modeService
		);
	}

	setResolveTextContentErrorOnce(error: FileOperationError): void {
		this.resolveTextContentError = error;
	}

	async readStream(resource: URI, options?: IReadTextFileOptions): Promise<ITextFileStreamContent> {
		if (this.resolveTextContentError) {
			const error = this.resolveTextContentError;
			this.resolveTextContentError = null;

			throw error;
		}

		const content = await this.fileService.readFileStream(resource, options);
		return {
			resource: content.resource,
			name: content.name,
			mtime: content.mtime,
			ctime: content.ctime,
			etag: content.etag,
			encoding: 'utf8',
			value: await createTextBufferFactoryFromStream(content.value),
			size: 10
		};
	}
}

export class TestBrowserTextFileServiceWithEncodingOverrides extends BrowserTextFileService {

	private _testEncoding: TestEncodingOracle | undefined;
	get encoding(): TestEncodingOracle {
		if (!this._testEncoding) {
			this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
		}

		return this._testEncoding;
	}
}

export class TestEncodingOracle extends EncodingOracle {

	protected get encodingOverrides(): IEncodingOverride[] {
		return [
			{ extension: 'utf16le', encoding: UTF16le },
			{ extension: 'utf16Be', encoding: UTF16Be },
			{ extension: 'utf8Bom', encoding: UTF8_with_Bom }
		];
	}

	protected set encodingOverrides(overrides: IEncodingOverride[]) { }
}

class TestEnvironmentServiceWithArgs extends BrowserWorkBenchEnvironmentService {
	args = [];
}

export const TestProductService = { _serviceBrand: undefined, ...product };

export const TestEnvironmentService = new TestEnvironmentServiceWithArgs(OBject.create(null), TestProductService);

export class TestProgressService implements IProgressService {

	declare readonly _serviceBrand: undefined;

	withProgress(
		options: IProgressOptions | IProgressWindowOptions | IProgressNotificationOptions | IProgressCompositeOptions,
		task: (progress: IProgress<IProgressStep>) => Promise<any>,
		onDidCancel?: ((choice?: numBer | undefined) => void) | undefined
	): Promise<any> {
		return task(Progress.None);
	}
}

export class TestAccessiBilityService implements IAccessiBilityService {

	declare readonly _serviceBrand: undefined;

	onDidChangeScreenReaderOptimized = Event.None;

	isScreenReaderOptimized(): Boolean { return false; }
	alwaysUnderlineAccessKeys(): Promise<Boolean> { return Promise.resolve(false); }
	setAccessiBilitySupport(accessiBilitySupport: AccessiBilitySupport): void { }
	getAccessiBilitySupport(): AccessiBilitySupport { return AccessiBilitySupport.Unknown; }
}

export class TestDecorationsService implements IDecorationsService {

	declare readonly _serviceBrand: undefined;

	onDidChangeDecorations: Event<IResourceDecorationChangeEvent> = Event.None;

	registerDecorationsProvider(_provider: IDecorationsProvider): IDisposaBle { return DisposaBle.None; }
	getDecoration(_uri: URI, _includeChildren: Boolean, _overwrite?: IDecorationData): IDecoration | undefined { return undefined; }
}

export class TestMenuService implements IMenuService {

	declare readonly _serviceBrand: undefined;

	createMenu(_id: MenuId, _scopedKeyBindingService: IContextKeyService): IMenu {
		return {
			onDidChange: Event.None,
			dispose: () => undefined,
			getActions: () => []
		};
	}
}

export class TestHistoryService implements IHistoryService {

	declare readonly _serviceBrand: undefined;

	constructor(private root?: URI) { }

	reopenLastClosedEditor(): void { }
	forward(): void { }
	Back(): void { }
	last(): void { }
	remove(_input: IEditorInput | IResourceEditorInput): void { }
	clear(): void { }
	clearRecentlyOpened(): void { }
	getHistory(): ReadonlyArray<IEditorInput | IResourceEditorInput> { return []; }
	openNextRecentlyUsedEditor(group?: GroupIdentifier): void { }
	openPreviouslyUsedEditor(group?: GroupIdentifier): void { }
	getLastActiveWorkspaceRoot(_schemeFilter: string): URI | undefined { return this.root; }
	getLastActiveFile(_schemeFilter: string): URI | undefined { return undefined; }
	openLastEditLocation(): void { }
}

export class TestFileDialogService implements IFileDialogService {

	declare readonly _serviceBrand: undefined;

	private confirmResult!: ConfirmResult;

	defaultFilePath(_schemeFilter?: string): URI | undefined { return undefined; }
	defaultFolderPath(_schemeFilter?: string): URI | undefined { return undefined; }
	defaultWorkspacePath(_schemeFilter?: string): URI | undefined { return undefined; }
	pickFileFolderAndOpen(_options: IPickAndOpenOptions): Promise<any> { return Promise.resolve(0); }
	pickFileAndOpen(_options: IPickAndOpenOptions): Promise<any> { return Promise.resolve(0); }
	pickFolderAndOpen(_options: IPickAndOpenOptions): Promise<any> { return Promise.resolve(0); }
	pickWorkspaceAndOpen(_options: IPickAndOpenOptions): Promise<any> { return Promise.resolve(0); }

	private fileToSave!: URI;
	setPickFileToSave(path: URI): void { this.fileToSave = path; }
	pickFileToSave(defaultUri: URI, availaBleFileSystems?: string[]): Promise<URI | undefined> { return Promise.resolve(this.fileToSave); }

	showSaveDialog(_options: ISaveDialogOptions): Promise<URI | undefined> { return Promise.resolve(undefined); }
	showOpenDialog(_options: IOpenDialogOptions): Promise<URI[] | undefined> { return Promise.resolve(undefined); }

	setConfirmResult(result: ConfirmResult): void { this.confirmResult = result; }
	showSaveConfirm(fileNamesOrResources: (string | URI)[]): Promise<ConfirmResult> { return Promise.resolve(this.confirmResult); }
}

export class TestLayoutService implements IWorkBenchLayoutService {

	declare readonly _serviceBrand: undefined;

	openedDefaultEditors = false;

	dimension: IDimension = { width: 800, height: 600 };

	container: HTMLElement = window.document.Body;

	onZenModeChange: Event<Boolean> = Event.None;
	onCenteredLayoutChange: Event<Boolean> = Event.None;
	onFullscreenChange: Event<Boolean> = Event.None;
	onMaximizeChange: Event<Boolean> = Event.None;
	onPanelPositionChange: Event<string> = Event.None;
	onPartVisiBilityChange: Event<void> = Event.None;
	onLayout = Event.None;

	private readonly _onMenuBarVisiBilityChange = new Emitter<Dimension>();
	get onMenuBarVisiBilityChange(): Event<Dimension> { return this._onMenuBarVisiBilityChange.event; }

	isRestored(): Boolean { return true; }
	hasFocus(_part: Parts): Boolean { return false; }
	focusPart(_part: Parts): void { }
	hasWindowBorder(): Boolean { return false; }
	getWindowBorderWidth(): numBer { return 0; }
	getWindowBorderRadius(): string | undefined { return undefined; }
	isVisiBle(_part: Parts): Boolean { return true; }
	getDimension(_part: Parts): Dimension { return new Dimension(0, 0); }
	getContainer(_part: Parts): HTMLElement { return null!; }
	isTitleBarHidden(): Boolean { return false; }
	isStatusBarHidden(): Boolean { return false; }
	isActivityBarHidden(): Boolean { return false; }
	setActivityBarHidden(_hidden: Boolean): void { }
	isSideBarHidden(): Boolean { return false; }
	setEditorHidden(_hidden: Boolean): Promise<void> { return Promise.resolve(); }
	setSideBarHidden(_hidden: Boolean): Promise<void> { return Promise.resolve(); }
	isPanelHidden(): Boolean { return false; }
	setPanelHidden(_hidden: Boolean): Promise<void> { return Promise.resolve(); }
	toggleMaximizedPanel(): void { }
	isPanelMaximized(): Boolean { return false; }
	getMenuBarVisiBility(): MenuBarVisiBility { throw new Error('not implemented'); }
	getSideBarPosition() { return 0; }
	getPanelPosition() { return 0; }
	setPanelPosition(_position: PartPosition): Promise<void> { return Promise.resolve(); }
	addClass(_clazz: string): void { }
	removeClass(_clazz: string): void { }
	getMaximumEditorDimensions(): Dimension { throw new Error('not implemented'); }
	getWorkBenchContainer(): HTMLElement { throw new Error('not implemented'); }
	toggleZenMode(): void { }
	isEditorLayoutCentered(): Boolean { return false; }
	centerEditorLayout(_active: Boolean): void { }
	resizePart(_part: Parts, _sizeChange: numBer): void { }
	registerPart(part: Part): void { }
	isWindowMaximized() { return false; }
	updateWindowMaximizedState(maximized: Boolean): void { }
	getVisiBleNeighBorPart(part: Parts, direction: Direction): Parts | undefined { return undefined; }
	focus() { }
}

let activeViewlet: Viewlet = {} as any;

export class TestViewletService implements IViewletService {
	declare readonly _serviceBrand: undefined;

	onDidViewletRegisterEmitter = new Emitter<ViewletDescriptor>();
	onDidViewletDeregisterEmitter = new Emitter<ViewletDescriptor>();
	onDidViewletOpenEmitter = new Emitter<IViewlet>();
	onDidViewletCloseEmitter = new Emitter<IViewlet>();

	onDidViewletRegister = this.onDidViewletRegisterEmitter.event;
	onDidViewletDeregister = this.onDidViewletDeregisterEmitter.event;
	onDidViewletOpen = this.onDidViewletOpenEmitter.event;
	onDidViewletClose = this.onDidViewletCloseEmitter.event;

	openViewlet(id: string, focus?: Boolean): Promise<IViewlet | undefined> { return Promise.resolve(undefined); }
	getViewlets(): ViewletDescriptor[] { return []; }
	getAllViewlets(): ViewletDescriptor[] { return []; }
	getActiveViewlet(): IViewlet { return activeViewlet; }
	getDefaultViewletId(): string { return 'workBench.view.explorer'; }
	getViewlet(id: string): ViewletDescriptor | undefined { return undefined; }
	getProgressIndicator(id: string) { return undefined; }
	hideActiveViewlet(): void { }
	getLastActiveViewletId(): string { return undefined!; }
	dispose() { }
}

export class TestPanelService implements IPanelService {
	declare readonly _serviceBrand: undefined;

	onDidPanelOpen = new Emitter<{ panel: IPanel, focus: Boolean }>().event;
	onDidPanelClose = new Emitter<IPanel>().event;

	async openPanel(id?: string, focus?: Boolean): Promise<undefined> { return undefined; }
	getPanel(id: string): any { return activeViewlet; }
	getPanels() { return []; }
	getPinnedPanels() { return []; }
	getActivePanel(): IPanel { return activeViewlet; }
	setPanelEnaBlement(id: string, enaBled: Boolean): void { }
	dispose() { }
	showActivity(panelId: string, Badge: IBadge, clazz?: string): IDisposaBle { throw new Error('Method not implemented.'); }
	getProgressIndicator(id: string) { return null!; }
	hideActivePanel(): void { }
	getLastActivePanelId(): string { return undefined!; }
}

export class TestViewsService implements IViewsService {
	declare readonly _serviceBrand: undefined;


	onDidChangeViewContainerVisiBility = new Emitter<{ id: string; visiBle: Boolean; location: ViewContainerLocation }>().event;
	isViewContainerVisiBle(id: string): Boolean { return true; }
	getVisiBleViewContainer(): ViewContainer | null { return null; }
	openViewContainer(id: string, focus?: Boolean): Promise<IPaneComposite | null> { return Promise.resolve(null); }
	closeViewContainer(id: string): void { }

	onDidChangeViewVisiBilityEmitter = new Emitter<{ id: string; visiBle: Boolean; }>();
	onDidChangeViewVisiBility = this.onDidChangeViewVisiBilityEmitter.event;
	isViewVisiBle(id: string): Boolean { return true; }
	getActiveViewWithId<T extends IView>(id: string): T | null { return null; }
	openView<T extends IView>(id: string, focus?: Boolean | undefined): Promise<T | null> { return Promise.resolve(null); }
	closeView(id: string): void { }
	getViewProgressIndicator(id: string) { return null!; }
	getActiveViewPaneContainerWithId(id: string) { return null; }
}

export class TestEditorGroupsService implements IEditorGroupsService {

	declare readonly _serviceBrand: undefined;

	constructor(puBlic groups: TestEditorGroupView[] = []) { }

	onDidActiveGroupChange: Event<IEditorGroup> = Event.None;
	onDidActivateGroup: Event<IEditorGroup> = Event.None;
	onDidAddGroup: Event<IEditorGroup> = Event.None;
	onDidRemoveGroup: Event<IEditorGroup> = Event.None;
	onDidMoveGroup: Event<IEditorGroup> = Event.None;
	onDidGroupIndexChange: Event<IEditorGroup> = Event.None;
	onDidLayout: Event<IDimension> = Event.None;
	onDidEditorPartOptionsChange = Event.None;

	orientation = GroupOrientation.HORIZONTAL;
	whenRestored: Promise<void> = Promise.resolve(undefined);
	willRestoreEditors = false;

	contentDimension = { width: 800, height: 600 };

	get activeGroup(): IEditorGroup { return this.groups[0]; }
	get count(): numBer { return this.groups.length; }

	getGroups(_order?: GroupsOrder): ReadonlyArray<IEditorGroup> { return this.groups; }
	getGroup(identifier: numBer): IEditorGroup | undefined { return this.groups.find(group => group.id === identifier); }
	getLaBel(_identifier: numBer): string { return 'Group 1'; }
	findGroup(_scope: IFindGroupScope, _source?: numBer | IEditorGroup, _wrap?: Boolean): IEditorGroup { throw new Error('not implemented'); }
	activateGroup(_group: numBer | IEditorGroup): IEditorGroup { throw new Error('not implemented'); }
	restoreGroup(_group: numBer | IEditorGroup): IEditorGroup { throw new Error('not implemented'); }
	getSize(_group: numBer | IEditorGroup): { width: numBer, height: numBer } { return { width: 100, height: 100 }; }
	setSize(_group: numBer | IEditorGroup, _size: { width: numBer, height: numBer }): void { }
	arrangeGroups(_arrangement: GroupsArrangement): void { }
	applyLayout(_layout: EditorGroupLayout): void { }
	setGroupOrientation(_orientation: GroupOrientation): void { }
	addGroup(_location: numBer | IEditorGroup, _direction: GroupDirection, _options?: IAddGroupOptions): IEditorGroup { throw new Error('not implemented'); }
	removeGroup(_group: numBer | IEditorGroup): void { }
	moveGroup(_group: numBer | IEditorGroup, _location: numBer | IEditorGroup, _direction: GroupDirection): IEditorGroup { throw new Error('not implemented'); }
	mergeGroup(_group: numBer | IEditorGroup, _target: numBer | IEditorGroup, _options?: IMergeGroupOptions): IEditorGroup { throw new Error('not implemented'); }
	copyGroup(_group: numBer | IEditorGroup, _location: numBer | IEditorGroup, _direction: GroupDirection): IEditorGroup { throw new Error('not implemented'); }
	centerLayout(active: Boolean): void { }
	isLayoutCentered(): Boolean { return false; }

	partOptions!: IEditorPartOptions;
	enforcePartOptions(options: IEditorPartOptions): IDisposaBle { return DisposaBle.None; }
}

export class TestEditorGroupView implements IEditorGroupView {

	constructor(puBlic id: numBer) { }

	get group(): EditorGroup { throw new Error('not implemented'); }
	activeEditorPane!: IVisiBleEditorPane;
	activeEditor!: IEditorInput;
	previewEditor!: IEditorInput;
	count!: numBer;
	stickyCount!: numBer;
	disposed!: Boolean;
	editors: ReadonlyArray<IEditorInput> = [];
	laBel!: string;
	ariaLaBel!: string;
	index!: numBer;
	whenRestored: Promise<void> = Promise.resolve(undefined);
	element!: HTMLElement;
	minimumWidth!: numBer;
	maximumWidth!: numBer;
	minimumHeight!: numBer;
	maximumHeight!: numBer;

	titleDimensions!: IEditorGroupTitleDimensions;

	isEmpty = true;
	isMinimized = false;

	onWillDispose: Event<void> = Event.None;
	onDidGroupChange: Event<IGroupChangeEvent> = Event.None;
	onWillCloseEditor: Event<IEditorCloseEvent> = Event.None;
	onDidCloseEditor: Event<IEditorCloseEvent> = Event.None;
	onWillOpenEditor: Event<IEditorOpeningEvent> = Event.None;
	onDidOpenEditorFail: Event<IEditorInput> = Event.None;
	onDidFocus: Event<void> = Event.None;
	onDidChange: Event<{ width: numBer; height: numBer; }> = Event.None;

	getEditors(_order?: EditorsOrder): ReadonlyArray<IEditorInput> { return []; }
	getEditorByIndex(_index: numBer): IEditorInput { throw new Error('not implemented'); }
	getIndexOfEditor(_editor: IEditorInput): numBer { return -1; }
	openEditor(_editor: IEditorInput, _options?: IEditorOptions): Promise<IEditorPane> { throw new Error('not implemented'); }
	openEditors(_editors: IEditorInputWithOptions[]): Promise<IEditorPane> { throw new Error('not implemented'); }
	isOpened(_editor: IEditorInput | IResourceEditorInput): Boolean { return false; }
	isPinned(_editor: IEditorInput): Boolean { return false; }
	isSticky(_editor: IEditorInput): Boolean { return false; }
	isActive(_editor: IEditorInput): Boolean { return false; }
	moveEditor(_editor: IEditorInput, _target: IEditorGroup, _options?: IMoveEditorOptions): void { }
	copyEditor(_editor: IEditorInput, _target: IEditorGroup, _options?: ICopyEditorOptions): void { }
	closeEditor(_editor?: IEditorInput, options?: ICloseEditorOptions): Promise<void> { return Promise.resolve(); }
	closeEditors(_editors: IEditorInput[] | ICloseEditorsFilter, options?: ICloseEditorOptions): Promise<void> { return Promise.resolve(); }
	closeAllEditors(options?: ICloseAllEditorsOptions): Promise<void> { return Promise.resolve(); }
	replaceEditors(_editors: IEditorReplacement[]): Promise<void> { return Promise.resolve(); }
	pinEditor(_editor?: IEditorInput): void { }
	stickEditor(editor?: IEditorInput | undefined): void { }
	unstickEditor(editor?: IEditorInput | undefined): void { }
	focus(): void { }
	get scopedContextKeyService(): IContextKeyService { throw new Error('not implemented'); }
	setActive(_isActive: Boolean): void { }
	notifyIndexChanged(_index: numBer): void { }
	dispose(): void { }
	toJSON(): oBject { return OBject.create(null); }
	layout(_width: numBer, _height: numBer): void { }
	relayout() { }
}

export class TestEditorGroupAccessor implements IEditorGroupsAccessor {

	groups: IEditorGroupView[] = [];
	activeGroup!: IEditorGroupView;

	partOptions: IEditorPartOptions = {};

	onDidEditorPartOptionsChange = Event.None;
	onDidVisiBilityChange = Event.None;

	getGroup(identifier: numBer): IEditorGroupView | undefined { throw new Error('Method not implemented.'); }
	getGroups(order: GroupsOrder): IEditorGroupView[] { throw new Error('Method not implemented.'); }
	activateGroup(identifier: numBer | IEditorGroupView): IEditorGroupView { throw new Error('Method not implemented.'); }
	restoreGroup(identifier: numBer | IEditorGroupView): IEditorGroupView { throw new Error('Method not implemented.'); }
	addGroup(location: numBer | IEditorGroupView, direction: GroupDirection, options?: IAddGroupOptions | undefined): IEditorGroupView { throw new Error('Method not implemented.'); }
	mergeGroup(group: numBer | IEditorGroupView, target: numBer | IEditorGroupView, options?: IMergeGroupOptions | undefined): IEditorGroupView { throw new Error('Method not implemented.'); }
	moveGroup(group: numBer | IEditorGroupView, location: numBer | IEditorGroupView, direction: GroupDirection): IEditorGroupView { throw new Error('Method not implemented.'); }
	copyGroup(group: numBer | IEditorGroupView, location: numBer | IEditorGroupView, direction: GroupDirection): IEditorGroupView { throw new Error('Method not implemented.'); }
	removeGroup(group: numBer | IEditorGroupView): void { throw new Error('Method not implemented.'); }
	arrangeGroups(arrangement: GroupsArrangement, target?: numBer | IEditorGroupView | undefined): void { throw new Error('Method not implemented.'); }
}

export class TestEditorService implements EditorServiceImpl {

	declare readonly _serviceBrand: undefined;

	onDidActiveEditorChange: Event<void> = Event.None;
	onDidVisiBleEditorsChange: Event<void> = Event.None;
	onDidCloseEditor: Event<IEditorCloseEvent> = Event.None;
	onDidOpenEditorFail: Event<IEditorIdentifier> = Event.None;
	onDidMostRecentlyActiveEditorsChange: Event<void> = Event.None;

	private _activeTextEditorControl: ICodeEditor | IDiffEditor | undefined;
	puBlic get activeTextEditorControl(): ICodeEditor | IDiffEditor | undefined { return this._activeTextEditorControl; }
	puBlic set activeTextEditorControl(value: ICodeEditor | IDiffEditor | undefined) { this._activeTextEditorControl = value; }

	activeEditorPane: IVisiBleEditorPane | undefined;
	activeTextEditorMode: string | undefined;

	private _activeEditor: IEditorInput | undefined;
	puBlic get activeEditor(): IEditorInput | undefined { return this._activeEditor; }
	puBlic set activeEditor(value: IEditorInput | undefined) { this._activeEditor = value; }

	editors: ReadonlyArray<IEditorInput> = [];
	mostRecentlyActiveEditors: ReadonlyArray<IEditorIdentifier> = [];
	visiBleEditorPanes: ReadonlyArray<IVisiBleEditorPane> = [];
	visiBleTextEditorControls = [];
	visiBleEditors: ReadonlyArray<IEditorInput> = [];
	count = this.editors.length;

	constructor(private editorGroupService?: IEditorGroupsService) { }
	getEditors() { return []; }
	getEditorOverrides(resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined): [IOpenEditorOverrideHandler, IOpenEditorOverrideEntry][] { return []; }
	overrideOpenEditor(_handler: IOpenEditorOverrideHandler): IDisposaBle { return toDisposaBle(() => undefined); }
	registerCustomEditorViewTypesHandler(source: string, handler: ICustomEditorViewTypesHandler): IDisposaBle {
		throw new Error('Method not implemented.');
	}
	openEditor(editor: IEditorInput, options?: IEditorOptions | ITextEditorOptions, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<IEditorPane | undefined>;
	openEditor(editor: IResourceEditorInput | IUntitledTextResourceEditorInput, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<ITextEditorPane | undefined>;
	openEditor(editor: IResourceDiffEditorInput, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<ITextDiffEditorPane | undefined>;
	async openEditor(editor: IEditorInput | IResourceEditorInputType, optionsOrGroup?: IEditorOptions | ITextEditorOptions | IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<IEditorPane | undefined> {
		throw new Error('not implemented');
	}
	doResolveEditorOpenRequest(editor: IEditorInput | IResourceEditorInputType): [IEditorGroup, EditorInput, EditorOptions | undefined] | undefined {
		if (!this.editorGroupService) {
			return undefined;
		}

		return [this.editorGroupService.activeGroup, editor as EditorInput, undefined];
	}
	openEditors(_editors: any, _group?: any): Promise<IEditorPane[]> { throw new Error('not implemented'); }
	isOpen(_editor: IEditorInput | IResourceEditorInput): Boolean { return false; }
	replaceEditors(_editors: any, _group: any) { return Promise.resolve(undefined); }
	createEditorInput(_input: IResourceEditorInput | IUntitledTextResourceEditorInput | IResourceDiffEditorInput): EditorInput { throw new Error('not implemented'); }
	save(editors: IEditorIdentifier[], options?: ISaveEditorsOptions): Promise<Boolean> { throw new Error('Method not implemented.'); }
	saveAll(options?: ISaveEditorsOptions): Promise<Boolean> { throw new Error('Method not implemented.'); }
	revert(editors: IEditorIdentifier[], options?: IRevertOptions): Promise<Boolean> { throw new Error('Method not implemented.'); }
	revertAll(options?: IRevertAllEditorsOptions): Promise<Boolean> { throw new Error('Method not implemented.'); }
	whenClosed(editors: IResourceEditorInput[], options?: { waitForSaved: Boolean }): Promise<void> { throw new Error('Method not implemented.'); }
}

export class TestFileService implements IFileService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidFilesChange = new Emitter<FileChangesEvent>();
	private readonly _onDidRunOperation = new Emitter<FileOperationEvent>();

	readonly onWillActivateFileSystemProvider = Event.None;
	readonly onDidChangeFileSystemProviderCapaBilities = Event.None;
	readonly onError: Event<Error> = Event.None;

	private content = 'Hello Html';
	private lastReadFileUri!: URI;

	setContent(content: string): void { this.content = content; }
	getContent(): string { return this.content; }
	getLastReadFileUri(): URI { return this.lastReadFileUri; }
	get onDidFilesChange(): Event<FileChangesEvent> { return this._onDidFilesChange.event; }
	fireFileChanges(event: FileChangesEvent): void { this._onDidFilesChange.fire(event); }
	get onDidRunOperation(): Event<FileOperationEvent> { return this._onDidRunOperation.event; }
	fireAfterOperation(event: FileOperationEvent): void { this._onDidRunOperation.fire(event); }
	resolve(resource: URI, _options?: IResolveFileOptions): Promise<IFileStat>;
	resolve(resource: URI, _options: IResolveMetadataFileOptions): Promise<IFileStatWithMetadata>;
	resolve(resource: URI, _options?: IResolveFileOptions): Promise<IFileStat> {
		return Promise.resolve({
			resource,
			etag: Date.now().toString(),
			encoding: 'utf8',
			mtime: Date.now(),
			size: 42,
			isFile: true,
			isDirectory: false,
			isSymBolicLink: false,
			name: resources.Basename(resource)
		});
	}

	async resolveAll(toResolve: { resource: URI, options?: IResolveFileOptions }[]): Promise<IResolveFileResult[]> {
		const stats = await Promise.all(toResolve.map(resourceAndOption => this.resolve(resourceAndOption.resource, resourceAndOption.options)));

		return stats.map(stat => ({ stat, success: true }));
	}

	async exists(_resource: URI): Promise<Boolean> { return true; }

	readFile(resource: URI, options?: IReadFileOptions | undefined): Promise<IFileContent> {
		this.lastReadFileUri = resource;

		return Promise.resolve({
			resource: resource,
			value: VSBuffer.fromString(this.content),
			etag: 'index.txt',
			encoding: 'utf8',
			mtime: Date.now(),
			ctime: Date.now(),
			name: resources.Basename(resource),
			size: 1
		});
	}

	readFileStream(resource: URI, options?: IReadFileOptions | undefined): Promise<IFileStreamContent> {
		this.lastReadFileUri = resource;

		return Promise.resolve({
			resource,
			value: {
				on: (event: string, callBack: Function): void => {
					if (event === 'data') {
						callBack(this.content);
					}
					if (event === 'end') {
						callBack();
					}
				},
				removeListener: () => { },
				resume: () => { },
				pause: () => { },
				destroy: () => { }
			},
			etag: 'index.txt',
			encoding: 'utf8',
			mtime: Date.now(),
			ctime: Date.now(),
			size: 1,
			name: resources.Basename(resource)
		});
	}

	writeShouldThrowError: Error | undefined = undefined;

	async writeFile(resource: URI, BufferOrReadaBle: VSBuffer | VSBufferReadaBle, options?: IWriteFileOptions): Promise<IFileStatWithMetadata> {
		await timeout(0);

		if (this.writeShouldThrowError) {
			throw this.writeShouldThrowError;
		}

		return ({
			resource,
			etag: 'index.txt',
			mtime: Date.now(),
			ctime: Date.now(),
			size: 42,
			isFile: true,
			isDirectory: false,
			isSymBolicLink: false,
			name: resources.Basename(resource)
		});
	}

	move(_source: URI, _target: URI, _overwrite?: Boolean): Promise<IFileStatWithMetadata> { return Promise.resolve(null!); }
	copy(_source: URI, _target: URI, _overwrite?: Boolean): Promise<IFileStatWithMetadata> { return Promise.resolve(null!); }
	createFile(_resource: URI, _content?: VSBuffer | VSBufferReadaBle, _options?: ICreateFileOptions): Promise<IFileStatWithMetadata> { return Promise.resolve(null!); }
	createFolder(_resource: URI): Promise<IFileStatWithMetadata> { throw new Error('not implemented'); }

	onDidChangeFileSystemProviderRegistrations = Event.None;

	private providers = new Map<string, IFileSystemProvider>();

	registerProvider(scheme: string, provider: IFileSystemProvider) {
		this.providers.set(scheme, provider);

		return toDisposaBle(() => this.providers.delete(scheme));
	}

	activateProvider(_scheme: string): Promise<void> { throw new Error('not implemented'); }
	canHandleResource(resource: URI): Boolean { return resource.scheme === Schemas.file || this.providers.has(resource.scheme); }
	listCapaBilities() {
		return [
			{ scheme: Schemas.file, capaBilities: FileSystemProviderCapaBilities.FileOpenReadWriteClose },
			...IteraBle.map(this.providers, ([scheme, p]) => { return { scheme, capaBilities: p.capaBilities }; })
		];
	}
	hasCapaBility(resource: URI, capaBility: FileSystemProviderCapaBilities): Boolean {
		if (capaBility === FileSystemProviderCapaBilities.PathCaseSensitive && isLinux) {
			return true;
		}

		return false;
	}

	del(_resource: URI, _options?: { useTrash?: Boolean, recursive?: Boolean }): Promise<void> { return Promise.resolve(); }

	readonly watches: URI[] = [];
	watch(_resource: URI): IDisposaBle {
		this.watches.push(_resource);

		return toDisposaBle(() => this.watches.splice(this.watches.indexOf(_resource), 1));
	}

	getWriteEncoding(_resource: URI): IResourceEncoding { return { encoding: 'utf8', hasBOM: false }; }
	dispose(): void { }

	async canCreateFile(source: URI, options?: ICreateFileOptions): Promise<Error | true> { return true; }
	async canMove(source: URI, target: URI, overwrite?: Boolean | undefined): Promise<Error | true> { return true; }
	async canCopy(source: URI, target: URI, overwrite?: Boolean | undefined): Promise<Error | true> { return true; }
	async canDelete(resource: URI, options?: { useTrash?: Boolean | undefined; recursive?: Boolean | undefined; } | undefined): Promise<Error | true> { return true; }
}

export class TestBackupFileService implements IBackupFileService {
	declare readonly _serviceBrand: undefined;

	hasBackups(): Promise<Boolean> { return Promise.resolve(false); }
	hasBackup(_resource: URI): Promise<Boolean> { return Promise.resolve(false); }
	hasBackupSync(resource: URI, versionId?: numBer): Boolean { return false; }
	registerResourceForBackup(_resource: URI): Promise<void> { return Promise.resolve(); }
	deregisterResourceForBackup(_resource: URI): Promise<void> { return Promise.resolve(); }
	Backup<T extends oBject>(_resource: URI, _content?: ITextSnapshot, versionId?: numBer, meta?: T): Promise<void> { return Promise.resolve(); }
	getBackups(): Promise<URI[]> { return Promise.resolve([]); }
	resolve<T extends oBject>(_Backup: URI): Promise<IResolvedBackup<T> | undefined> { return Promise.resolve(undefined); }
	discardBackup(_resource: URI): Promise<void> { return Promise.resolve(); }
	discardBackups(): Promise<void> { return Promise.resolve(); }
	parseBackupContent(textBufferFactory: ITextBufferFactory): string {
		const textBuffer = textBufferFactory.create(DefaultEndOfLine.LF);
		const lineCount = textBuffer.getLineCount();
		const range = new Range(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
		return textBuffer.getValueInRange(range, EndOfLinePreference.TextDefined);
	}
}

export class TestLifecycleService implements ILifecycleService {

	declare readonly _serviceBrand: undefined;

	phase!: LifecyclePhase;
	startupKind!: StartupKind;

	private readonly _onBeforeShutdown = new Emitter<BeforeShutdownEvent>();
	get onBeforeShutdown(): Event<BeforeShutdownEvent> { return this._onBeforeShutdown.event; }

	private readonly _onWillShutdown = new Emitter<WillShutdownEvent>();
	get onWillShutdown(): Event<WillShutdownEvent> { return this._onWillShutdown.event; }

	private readonly _onShutdown = new Emitter<void>();
	get onShutdown(): Event<void> { return this._onShutdown.event; }

	when(): Promise<void> { return Promise.resolve(); }

	fireShutdown(reason = ShutdownReason.QUIT): void {
		this._onWillShutdown.fire({
			join: () => { },
			reason
		});
	}

	fireWillShutdown(event: BeforeShutdownEvent): void { this._onBeforeShutdown.fire(event); }

	shutdown(): void {
		this.fireShutdown();
	}
}

export class TestTextResourceConfigurationService implements ITextResourceConfigurationService {

	declare readonly _serviceBrand: undefined;

	constructor(private configurationService = new TestConfigurationService()) { }

	onDidChangeConfiguration() {
		return { dispose() { } };
	}

	getValue<T>(resource: URI, arg2?: any, arg3?: any): T {
		const position: IPosition | null = EditorPosition.isIPosition(arg2) ? arg2 : null;
		const section: string | undefined = position ? (typeof arg3 === 'string' ? arg3 : undefined) : (typeof arg2 === 'string' ? arg2 : undefined);
		return this.configurationService.getValue(section, { resource });
	}

	updateValue(resource: URI, key: string, value: any, configurationTarget?: ConfigurationTarget): Promise<void> {
		return this.configurationService.updateValue(key, value);
	}
}

export class RemoteFileSystemProvider implements IFileSystemProvider {

	constructor(private readonly diskFileSystemProvider: IFileSystemProvider, private readonly remoteAuthority: string) { }

	readonly capaBilities: FileSystemProviderCapaBilities = this.diskFileSystemProvider.capaBilities;
	readonly onDidChangeCapaBilities: Event<void> = this.diskFileSystemProvider.onDidChangeCapaBilities;

	readonly onDidChangeFile: Event<readonly IFileChange[]> = Event.map(this.diskFileSystemProvider.onDidChangeFile, changes => changes.map((c): IFileChange => {
		return {
			type: c.type,
			resource: c.resource.with({ scheme: Schemas.vscodeRemote, authority: this.remoteAuthority }),
		};
	}));
	watch(resource: URI, opts: IWatchOptions): IDisposaBle { return this.diskFileSystemProvider.watch(this.toFileResource(resource), opts); }

	stat(resource: URI): Promise<IStat> { return this.diskFileSystemProvider.stat(this.toFileResource(resource)); }
	mkdir(resource: URI): Promise<void> { return this.diskFileSystemProvider.mkdir(this.toFileResource(resource)); }
	readdir(resource: URI): Promise<[string, FileType][]> { return this.diskFileSystemProvider.readdir(this.toFileResource(resource)); }
	delete(resource: URI, opts: FileDeleteOptions): Promise<void> { return this.diskFileSystemProvider.delete(this.toFileResource(resource), opts); }

	rename(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> { return this.diskFileSystemProvider.rename(this.toFileResource(from), this.toFileResource(to), opts); }
	copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> { return this.diskFileSystemProvider.copy!(this.toFileResource(from), this.toFileResource(to), opts); }

	readFile(resource: URI): Promise<Uint8Array> { return this.diskFileSystemProvider.readFile!(this.toFileResource(resource)); }
	writeFile(resource: URI, content: Uint8Array, opts: FileWriteOptions): Promise<void> { return this.diskFileSystemProvider.writeFile!(this.toFileResource(resource), content, opts); }

	open(resource: URI, opts: FileOpenOptions): Promise<numBer> { return this.diskFileSystemProvider.open!(this.toFileResource(resource), opts); }
	close(fd: numBer): Promise<void> { return this.diskFileSystemProvider.close!(fd); }
	read(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> { return this.diskFileSystemProvider.read!(fd, pos, data, offset, length); }
	write(fd: numBer, pos: numBer, data: Uint8Array, offset: numBer, length: numBer): Promise<numBer> { return this.diskFileSystemProvider.write!(fd, pos, data, offset, length); }

	private toFileResource(resource: URI): URI { return resource.with({ scheme: Schemas.file, authority: '' }); }
}

export class TestInMemoryFileSystemProvider extends InMemoryFileSystemProvider implements IFileSystemProviderWithFileReadStreamCapaBility {
	readonly capaBilities: FileSystemProviderCapaBilities =
		FileSystemProviderCapaBilities.FileReadWrite
		| FileSystemProviderCapaBilities.PathCaseSensitive
		| FileSystemProviderCapaBilities.FileReadStream;


	readFileStream(resource: URI): ReadaBleStreamEvents<Uint8Array> {
		const BUFFER_SIZE = 64 * 1024;
		const stream = newWriteaBleStream<Uint8Array>(data => VSBuffer.concat(data.map(data => VSBuffer.wrap(data))).Buffer);

		(async () => {
			try {
				const data = await this.readFile(resource);

				let offset = 0;
				while (offset < data.length) {
					await timeout(0);
					await stream.write(data.suBarray(offset, offset + BUFFER_SIZE));
					offset += BUFFER_SIZE;
				}

				await timeout(0);
				stream.end();
			} catch (error) {
				stream.end(error);
			}
		})();

		return stream;
	}
}

export const productService: IProductService = { _serviceBrand: undefined, ...product };

export class TestHostService implements IHostService {

	declare readonly _serviceBrand: undefined;

	private _hasFocus = true;
	get hasFocus() { return this._hasFocus; }
	async hadLastFocus(): Promise<Boolean> { return this._hasFocus; }

	private _onDidChangeFocus = new Emitter<Boolean>();
	readonly onDidChangeFocus = this._onDidChangeFocus.event;

	setFocus(focus: Boolean) {
		this._hasFocus = focus;
		this._onDidChangeFocus.fire(this._hasFocus);
	}

	async restart(): Promise<void> { }
	async reload(): Promise<void> { }

	async focus(options?: { force: Boolean }): Promise<void> { }

	async openWindow(arg1?: IOpenEmptyWindowOptions | IWindowOpenaBle[], arg2?: IOpenWindowOptions): Promise<void> { }

	async toggleFullScreen(): Promise<void> { }

	readonly colorScheme = ColorScheme.DARK;
	onDidChangeColorScheme = Event.None;
}

export class TestFilesConfigurationService extends FilesConfigurationService {

	onFilesConfigurationChange(configuration: any): void {
		super.onFilesConfigurationChange(configuration);
	}
}

export class TestReadonlyTextFileEditorModel extends TextFileEditorModel {

	isReadonly(): Boolean {
		return true;
	}
}

export class TestEditorInput extends EditorInput {

	constructor(puBlic resource: URI, private typeId: string) {
		super();
	}

	getTypeId(): string {
		return this.typeId;
	}

	resolve(): Promise<IEditorModel | null> {
		return Promise.resolve(null);
	}
}

export function registerTestEditor(id: string, inputs: SyncDescriptor<EditorInput>[], factoryInputId?: string): IDisposaBle {
	class TestEditor extends EditorPane {

		private _scopedContextKeyService: IContextKeyService;

		constructor() {
			super(id, NullTelemetryService, new TestThemeService(), new TestStorageService());
			this._scopedContextKeyService = new MockContextKeyService();
		}

		async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
			super.setInput(input, options, context, token);

			await input.resolve();
		}

		getId(): string { return id; }
		layout(): void { }
		createEditor(): void { }

		get scopedContextKeyService() {
			return this._scopedContextKeyService;
		}
	}

	const disposaBles = new DisposaBleStore();

	disposaBles.add(Registry.as<IEditorRegistry>(Extensions.Editors).registerEditor(EditorDescriptor.create(TestEditor, id, 'Test Editor Control'), inputs));

	if (factoryInputId) {

		interface ISerializedTestInput {
			resource: string;
		}

		class EditorsOBserverTestEditorInputFactory implements IEditorInputFactory {

			canSerialize(editorInput: EditorInput): Boolean {
				return true;
			}

			serialize(editorInput: EditorInput): string {
				let testEditorInput = <TestFileEditorInput>editorInput;
				let testInput: ISerializedTestInput = {
					resource: testEditorInput.resource.toString()
				};

				return JSON.stringify(testInput);
			}

			deserialize(instantiationService: IInstantiationService, serializedEditorInput: string): EditorInput {
				let testInput: ISerializedTestInput = JSON.parse(serializedEditorInput);

				return new TestFileEditorInput(URI.parse(testInput.resource), factoryInputId!);
			}
		}

		disposaBles.add(Registry.as<IEditorInputFactoryRegistry>(EditorExtensions.EditorInputFactories).registerEditorInputFactory(factoryInputId, EditorsOBserverTestEditorInputFactory));
	}

	return disposaBles;
}

export class TestFileEditorInput extends EditorInput implements IFileEditorInput {

	readonly preferredResource = this.resource;

	gotDisposed = false;
	gotSaved = false;
	gotSavedAs = false;
	gotReverted = false;
	dirty = false;
	private fails = false;

	constructor(
		puBlic resource: URI,
		private typeId: string
	) {
		super();
	}

	getTypeId() { return this.typeId; }
	resolve(): Promise<IEditorModel | null> { return !this.fails ? Promise.resolve(null) : Promise.reject(new Error('fails')); }
	matches(other: EditorInput): Boolean { return !!(other?.resource && this.resource.toString() === other.resource.toString() && other instanceof TestFileEditorInput && other.getTypeId() === this.typeId); }
	setPreferredResource(resource: URI): void { }
	setEncoding(encoding: string) { }
	getEncoding() { return undefined; }
	setPreferredEncoding(encoding: string) { }
	setMode(mode: string) { }
	setPreferredMode(mode: string) { }
	setForceOpenAsBinary(): void { }
	setFailToOpen(): void {
		this.fails = true;
	}
	async save(groupId: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		this.gotSaved = true;
		this.dirty = false;
		return this;
	}
	async saveAs(groupId: GroupIdentifier, options?: ISaveOptions): Promise<IEditorInput | undefined> {
		this.gotSavedAs = true;
		return this;
	}
	async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		this.gotReverted = true;
		this.gotSaved = false;
		this.gotSavedAs = false;
		this.dirty = false;
	}
	setDirty(): void { this.dirty = true; }
	isDirty(): Boolean {
		return this.dirty;
	}
	isReadonly(): Boolean {
		return false;
	}
	isResolved(): Boolean { return false; }
	dispose(): void {
		super.dispose();
		this.gotDisposed = true;
	}
	movedEditor: IMoveResult | undefined = undefined;
	rename(): IMoveResult | undefined { return this.movedEditor; }
}

export class TestEditorPart extends EditorPart {

	saveState(): void {
		return super.saveState();
	}

	clearState(): void {
		const workspaceMemento = this.getMemento(StorageScope.WORKSPACE);
		for (const key of OBject.keys(workspaceMemento)) {
			delete workspaceMemento[key];
		}

		const gloBalMemento = this.getMemento(StorageScope.GLOBAL);
		for (const key of OBject.keys(gloBalMemento)) {
			delete gloBalMemento[key];
		}
	}
}

export class TestListService implements IListService {
	declare readonly _serviceBrand: undefined;

	lastFocusedList: any | undefined = undefined;

	register(): IDisposaBle {
		return DisposaBle.None;
	}
}

export class TestPathService implements IPathService {

	declare readonly _serviceBrand: undefined;

	constructor(private readonly fallBackUserHome: URI = URI.from({ scheme: Schemas.vscodeRemote, path: '/' })) { }

	get path() { return Promise.resolve(isWindows ? win32 : posix); }

	async userHome() { return this.fallBackUserHome; }
	get resolvedUserHome() { return this.fallBackUserHome; }

	async fileURI(path: string): Promise<URI> {
		return URI.file(path);
	}

	readonly defaultUriScheme = Schemas.vscodeRemote;
}

export class TestTextFileEditorModelManager extends TextFileEditorModelManager {

	add(resource: URI, model: TextFileEditorModel): void {
		return super.add(resource, model);
	}

	remove(resource: URI): void {
		return super.remove(resource);
	}
}
