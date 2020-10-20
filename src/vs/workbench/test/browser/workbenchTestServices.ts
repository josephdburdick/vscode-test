/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workbench/contrib/files/browser/files.contribution'; // loAd our contribution into the test
import { FileEditorInput } from 'vs/workbench/contrib/files/common/editors/fileEditorInput';
import { TestInstAntiAtionService } from 'vs/plAtform/instAntiAtion/test/common/instAntiAtionServiceMock';
import * As resources from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';
import { IEditorInputWithOptions, IEditorIdentifier, IUntitledTextResourceEditorInput, IResourceDiffEditorInput, IEditorInput, IEditorPAne, IEditorCloseEvent, IEditorPArtOptions, IRevertOptions, GroupIdentifier, EditorInput, EditorOptions, EditorsOrder, IFileEditorInput, IEditorInputFActoryRegistry, IEditorInputFActory, Extensions As EditorExtensions, ISAveOptions, IMoveResult, ITextEditorPAne, ITextDiffEditorPAne, IVisibleEditorPAne, IEditorOpenContext } from 'vs/workbench/common/editor';
import { IEditorOpeningEvent, EditorServiceImpl, IEditorGroupView, IEditorGroupsAccessor, IEditorGroupTitleDimensions } from 'vs/workbench/browser/pArts/editor/editor';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IBAckupFileService, IResolvedBAckup } from 'vs/workbench/services/bAckup/common/bAckup';
import { IConfigurAtionService, ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchLAyoutService, PArts, Position As PArtPosition } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { TextModelResolverService } from 'vs/workbench/services/textmodelResolver/common/textModelResolverService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { IEditorOptions, IResourceEditorInput, IEditorModel, ITextEditorOptions } from 'vs/plAtform/editor/common/editor';
import { IUntitledTextEditorService, UntitledTextEditorService } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ILifecycleService, BeforeShutdownEvent, ShutdownReAson, StArtupKind, LifecyclePhAse, WillShutdownEvent } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { FileOperAtionEvent, IFileService, IFileStAt, IResolveFileResult, FileChAngesEvent, IResolveFileOptions, ICreAteFileOptions, IFileSystemProvider, FileSystemProviderCApAbilities, IFileChAnge, IWAtchOptions, IStAt, FileType, FileDeleteOptions, FileOverwriteOptions, FileWriteOptions, FileOpenOptions, IFileStAtWithMetAdAtA, IResolveMetAdAtAFileOptions, IWriteFileOptions, IReAdFileOptions, IFileContent, IFileStreAmContent, FileOperAtionError, IFileSystemProviderWithFileReAdStreAmCApAbility } from 'vs/plAtform/files/common/files';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ModeServiceImpl } from 'vs/editor/common/services/modeServiceImpl';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IResourceEncoding, ITextFileService, IReAdTextFileOptions, ITextFileStreAmContent } from 'vs/workbench/services/textfile/common/textfiles';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IHistoryService } from 'vs/workbench/services/history/common/history';
import { IInstAntiAtionService, ServiceIdentifier } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { TestConfigurAtionService } from 'vs/plAtform/configurAtion/test/common/testConfigurAtionService';
import { MenuBArVisibility, IWindowOpenAble, IOpenWindowOptions, IOpenEmptyWindowOptions } from 'vs/plAtform/windows/common/windows';
import { TestWorkspAce } from 'vs/plAtform/workspAce/test/common/testWorkspAce';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { TestThemeService } from 'vs/plAtform/theme/test/common/testThemeService';
import { ITextResourceConfigurAtionService, ITextResourcePropertiesService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IPosition, Position As EditorPosition } from 'vs/editor/common/core/position';
import { IMenuService, MenuId, IMenu } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { MockContextKeyService, MockKeybindingService } from 'vs/plAtform/keybinding/test/common/mockKeybindingService';
import { ITextBufferFActory, DefAultEndOfLine, EndOfLinePreference, ITextSnApshot } from 'vs/editor/common/model';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { IDiAlogService, IPickAndOpenOptions, ISAveDiAlogOptions, IOpenDiAlogOptions, IFileDiAlogService, ConfirmResult } from 'vs/plAtform/diAlogs/common/diAlogs';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { TestNotificAtionService } from 'vs/plAtform/notificAtion/test/common/testNotificAtionService';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IDecorAtionsService, IResourceDecorAtionChAngeEvent, IDecorAtion, IDecorAtionDAtA, IDecorAtionsProvider } from 'vs/workbench/services/decorAtions/browser/decorAtions';
import { IDisposAble, toDisposAble, DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { IEditorGroupsService, IEditorGroup, GroupsOrder, GroupsArrAngement, GroupDirection, IAddGroupOptions, IMergeGroupOptions, IMoveEditorOptions, ICopyEditorOptions, IEditorReplAcement, IGroupChAngeEvent, IFindGroupScope, EditorGroupLAyout, ICloseEditorOptions, GroupOrientAtion, ICloseAllEditorsOptions, ICloseEditorsFilter } from 'vs/workbench/services/editor/common/editorGroupsService';
import { IEditorService, IOpenEditorOverrideHAndler, ISAveEditorsOptions, IRevertAllEditorsOptions, IResourceEditorInputType, SIDE_GROUP_TYPE, ACTIVE_GROUP_TYPE, IOpenEditorOverrideEntry, ICustomEditorViewTypesHAndler } from 'vs/workbench/services/editor/common/editorService';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { IEditorRegistry, EditorDescriptor, Extensions } from 'vs/workbench/browser/editor';
import { EditorGroup } from 'vs/workbench/common/editor/editorGroup';
import { Dimension, IDimension } from 'vs/bAse/browser/dom';
import { ILogService, NullLogService } from 'vs/plAtform/log/common/log';
import { ILAbelService } from 'vs/plAtform/lAbel/common/lAbel';
import { timeout } from 'vs/bAse/common/Async';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { ViewletDescriptor, Viewlet } from 'vs/workbench/browser/viewlet';
import { IViewlet } from 'vs/workbench/common/viewlet';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { LAbelService } from 'vs/workbench/services/lAbel/common/lAbelService';
import { PArt } from 'vs/workbench/browser/pArt';
import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { IPAnel } from 'vs/workbench/common/pAnel';
import { IBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { VSBuffer, VSBufferReAdAble } from 'vs/bAse/common/buffer';
import { SchemAs } from 'vs/bAse/common/network';
import { IProductService } from 'vs/plAtform/product/common/productService';
import product from 'vs/plAtform/product/common/product';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { IFilesConfigurAtionService, FilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { IAccessibilityService, AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { BrowserWorkbenchEnvironmentService } from 'vs/workbench/services/environment/browser/environmentService';
import { BrowserTextFileService } from 'vs/workbench/services/textfile/browser/browserTextFileService';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { creAteTextBufferFActoryFromStreAm } from 'vs/editor/common/model/textModel';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { Direction } from 'vs/bAse/browser/ui/grid/grid';
import { IProgressService, IProgressOptions, IProgressWindowOptions, IProgressNotificAtionOptions, IProgressCompositeOptions, IProgress, IProgressStep, Progress } from 'vs/plAtform/progress/common/progress';
import { IWorkingCopyFileService, WorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { UndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedoService';
import { IUndoRedoService } from 'vs/plAtform/undoRedo/common/undoRedo';
import { TextFileEditorModel } from 'vs/workbench/services/textfile/common/textFileEditorModel';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { TestDiAlogService } from 'vs/plAtform/diAlogs/test/common/testDiAlogService';
import { CodeEditorService } from 'vs/workbench/services/editor/browser/codeEditorService';
import { EditorPArt } from 'vs/workbench/browser/pArts/editor/editorPArt';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IDiffEditor } from 'vs/editor/common/editorCommon';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { QuickInputService } from 'vs/workbench/services/quickinput/browser/quickInputService';
import { IListService } from 'vs/plAtform/list/browser/listService';
import { win32, posix } from 'vs/bAse/common/pAth';
import { TestWorkingCopyService, TestContextService, TestStorAgeService, TestTextResourcePropertiesService, TestExtensionService } from 'vs/workbench/test/common/workbenchTestServices';
import { IViewsService, IView, ViewContAiner, ViewContAinerLocAtion } from 'vs/workbench/common/views';
import { IStorAgeKeysSyncRegistryService, StorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { IPAneComposite } from 'vs/workbench/common/pAnecomposite';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { UriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentityService';
import { TextFileEditorModelMAnAger } from 'vs/workbench/services/textfile/common/textFileEditorModelMAnAger';
import { InMemoryFileSystemProvider } from 'vs/plAtform/files/common/inMemoryFilesystemProvider';
import { newWriteAbleStreAm, ReAdAbleStreAmEvents } from 'vs/bAse/common/streAm';
import { EncodingOrAcle, IEncodingOverride } from 'vs/workbench/services/textfile/browser/textFileService';
import { UTF16le, UTF16be, UTF8_with_bom } from 'vs/workbench/services/textfile/common/encoding';
import { ColorScheme } from 'vs/plAtform/theme/common/theme';
import { IterAble } from 'vs/bAse/common/iterAtor';

export function creAteFileEditorInput(instAntiAtionService: IInstAntiAtionService, resource: URI): FileEditorInput {
	return instAntiAtionService.creAteInstAnce(FileEditorInput, resource, undefined, undefined, undefined);
}

export interfAce ITestInstAntiAtionService extends IInstAntiAtionService {
	stub<T>(service: ServiceIdentifier<T>, ctor: Any): T;
}

export function workbenchInstAntiAtionService(overrides?: {
	textFileService?: (instAntiAtionService: IInstAntiAtionService) => ITextFileService
	pAthService?: (instAntiAtionService: IInstAntiAtionService) => IPAthService,
	editorService?: (instAntiAtionService: IInstAntiAtionService) => IEditorService,
	contextKeyService?: (instAntiAtionService: IInstAntiAtionService) => IContextKeyService,
}): ITestInstAntiAtionService {
	const instAntiAtionService = new TestInstAntiAtionService(new ServiceCollection([ILifecycleService, new TestLifecycleService()]));

	instAntiAtionService.stub(IWorkingCopyService, new TestWorkingCopyService());
	instAntiAtionService.stub(IEnvironmentService, TestEnvironmentService);
	const contextKeyService = overrides?.contextKeyService ? overrides.contextKeyService(instAntiAtionService) : instAntiAtionService.creAteInstAnce(MockContextKeyService);
	instAntiAtionService.stub(IContextKeyService, contextKeyService);
	instAntiAtionService.stub(IProgressService, new TestProgressService());
	const workspAceContextService = new TestContextService(TestWorkspAce);
	instAntiAtionService.stub(IWorkspAceContextService, workspAceContextService);
	const configService = new TestConfigurAtionService();
	instAntiAtionService.stub(IConfigurAtionService, configService);
	instAntiAtionService.stub(IFilesConfigurAtionService, new TestFilesConfigurAtionService(contextKeyService, configService));
	instAntiAtionService.stub(ITextResourceConfigurAtionService, new TestTextResourceConfigurAtionService(configService));
	instAntiAtionService.stub(IUntitledTextEditorService, instAntiAtionService.creAteInstAnce(UntitledTextEditorService));
	instAntiAtionService.stub(IStorAgeService, new TestStorAgeService());
	instAntiAtionService.stub(IPAthService, overrides?.pAthService ? overrides.pAthService(instAntiAtionService) : new TestPAthService());
	const lAyoutService = new TestLAyoutService();
	instAntiAtionService.stub(IWorkbenchLAyoutService, lAyoutService);
	instAntiAtionService.stub(IDiAlogService, new TestDiAlogService());
	const AccessibilityService = new TestAccessibilityService();
	instAntiAtionService.stub(IAccessibilityService, AccessibilityService);
	instAntiAtionService.stub(IFileDiAlogService, new TestFileDiAlogService());
	instAntiAtionService.stub(IModeService, instAntiAtionService.creAteInstAnce(ModeServiceImpl));
	instAntiAtionService.stub(IHistoryService, new TestHistoryService());
	instAntiAtionService.stub(ITextResourcePropertiesService, new TestTextResourcePropertiesService(configService));
	instAntiAtionService.stub(IUndoRedoService, instAntiAtionService.creAteInstAnce(UndoRedoService));
	const themeService = new TestThemeService();
	instAntiAtionService.stub(IThemeService, themeService);
	instAntiAtionService.stub(IModelService, instAntiAtionService.creAteInstAnce(ModelServiceImpl));
	const fileService = new TestFileService();
	instAntiAtionService.stub(IFileService, fileService);
	instAntiAtionService.stub(IUriIdentityService, new UriIdentityService(fileService));
	instAntiAtionService.stub(IBAckupFileService, new TestBAckupFileService());
	instAntiAtionService.stub(ITelemetryService, NullTelemetryService);
	instAntiAtionService.stub(INotificAtionService, new TestNotificAtionService());
	instAntiAtionService.stub(IUntitledTextEditorService, instAntiAtionService.creAteInstAnce(UntitledTextEditorService));
	instAntiAtionService.stub(IMenuService, new TestMenuService());
	const keybindingService = new MockKeybindingService();
	instAntiAtionService.stub(IKeybindingService, keybindingService);
	instAntiAtionService.stub(IDecorAtionsService, new TestDecorAtionsService());
	instAntiAtionService.stub(IExtensionService, new TestExtensionService());
	instAntiAtionService.stub(IWorkingCopyFileService, instAntiAtionService.creAteInstAnce(WorkingCopyFileService));
	instAntiAtionService.stub(ITextFileService, overrides?.textFileService ? overrides.textFileService(instAntiAtionService) : <ITextFileService>instAntiAtionService.creAteInstAnce(TestTextFileService));
	instAntiAtionService.stub(IHostService, <IHostService>instAntiAtionService.creAteInstAnce(TestHostService));
	instAntiAtionService.stub(ITextModelService, <ITextModelService>instAntiAtionService.creAteInstAnce(TextModelResolverService));
	instAntiAtionService.stub(ILogService, new NullLogService());
	const editorGroupService = new TestEditorGroupsService([new TestEditorGroupView(0)]);
	instAntiAtionService.stub(IEditorGroupsService, editorGroupService);
	instAntiAtionService.stub(ILAbelService, <ILAbelService>instAntiAtionService.creAteInstAnce(LAbelService));
	const editorService = overrides?.editorService ? overrides.editorService(instAntiAtionService) : new TestEditorService(editorGroupService);
	instAntiAtionService.stub(IEditorService, editorService);
	instAntiAtionService.stub(ICodeEditorService, new CodeEditorService(editorService, themeService));
	instAntiAtionService.stub(IViewletService, new TestViewletService());
	instAntiAtionService.stub(IListService, new TestListService());
	instAntiAtionService.stub(IQuickInputService, new QuickInputService(configService, instAntiAtionService, keybindingService, contextKeyService, themeService, AccessibilityService, lAyoutService));
	instAntiAtionService.stub(IStorAgeKeysSyncRegistryService, new StorAgeKeysSyncRegistryService());

	return instAntiAtionService;
}

export clAss TestServiceAccessor {
	constructor(
		@ILifecycleService public lifecycleService: TestLifecycleService,
		@ITextFileService public textFileService: TestTextFileService,
		@IWorkingCopyFileService public workingCopyFileService: IWorkingCopyFileService,
		@IFilesConfigurAtionService public filesConfigurAtionService: TestFilesConfigurAtionService,
		@IWorkspAceContextService public contextService: TestContextService,
		@IModelService public modelService: ModelServiceImpl,
		@IFileService public fileService: TestFileService,
		@IFileDiAlogService public fileDiAlogService: TestFileDiAlogService,
		@IWorkingCopyService public workingCopyService: IWorkingCopyService,
		@IEditorService public editorService: TestEditorService,
		@IEditorGroupsService public editorGroupService: IEditorGroupsService,
		@IModeService public modeService: IModeService,
		@ITextModelService public textModelResolverService: ITextModelService,
		@IUntitledTextEditorService public untitledTextEditorService: UntitledTextEditorService,
		@IConfigurAtionService public testConfigurAtionService: TestConfigurAtionService,
		@IBAckupFileService public bAckupFileService: TestBAckupFileService,
		@IHostService public hostService: TestHostService,
		@IQuickInputService public quickInputService: IQuickInputService
	) { }
}

export clAss TestTextFileService extends BrowserTextFileService {
	privAte resolveTextContentError!: FileOperAtionError | null;

	constructor(
		@IFileService protected fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IModelService modelService: IModelService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IDiAlogService diAlogService: IDiAlogService,
		@IFileDiAlogService fileDiAlogService: IFileDiAlogService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IProductService productService: IProductService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService,
		@ITextModelService textModelService: ITextModelService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPAthService pAthService: IPAthService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IModeService modeService: IModeService
	) {
		super(
			fileService,
			untitledTextEditorService,
			lifecycleService,
			instAntiAtionService,
			modelService,
			environmentService,
			diAlogService,
			fileDiAlogService,
			textResourceConfigurAtionService,
			filesConfigurAtionService,
			textModelService,
			codeEditorService,
			pAthService,
			workingCopyFileService,
			uriIdentityService,
			modeService
		);
	}

	setResolveTextContentErrorOnce(error: FileOperAtionError): void {
		this.resolveTextContentError = error;
	}

	Async reAdStreAm(resource: URI, options?: IReAdTextFileOptions): Promise<ITextFileStreAmContent> {
		if (this.resolveTextContentError) {
			const error = this.resolveTextContentError;
			this.resolveTextContentError = null;

			throw error;
		}

		const content = AwAit this.fileService.reAdFileStreAm(resource, options);
		return {
			resource: content.resource,
			nAme: content.nAme,
			mtime: content.mtime,
			ctime: content.ctime,
			etAg: content.etAg,
			encoding: 'utf8',
			vAlue: AwAit creAteTextBufferFActoryFromStreAm(content.vAlue),
			size: 10
		};
	}
}

export clAss TestBrowserTextFileServiceWithEncodingOverrides extends BrowserTextFileService {

	privAte _testEncoding: TestEncodingOrAcle | undefined;
	get encoding(): TestEncodingOrAcle {
		if (!this._testEncoding) {
			this._testEncoding = this._register(this.instAntiAtionService.creAteInstAnce(TestEncodingOrAcle));
		}

		return this._testEncoding;
	}
}

export clAss TestEncodingOrAcle extends EncodingOrAcle {

	protected get encodingOverrides(): IEncodingOverride[] {
		return [
			{ extension: 'utf16le', encoding: UTF16le },
			{ extension: 'utf16be', encoding: UTF16be },
			{ extension: 'utf8bom', encoding: UTF8_with_bom }
		];
	}

	protected set encodingOverrides(overrides: IEncodingOverride[]) { }
}

clAss TestEnvironmentServiceWithArgs extends BrowserWorkbenchEnvironmentService {
	Args = [];
}

export const TestProductService = { _serviceBrAnd: undefined, ...product };

export const TestEnvironmentService = new TestEnvironmentServiceWithArgs(Object.creAte(null), TestProductService);

export clAss TestProgressService implements IProgressService {

	declAre reAdonly _serviceBrAnd: undefined;

	withProgress(
		options: IProgressOptions | IProgressWindowOptions | IProgressNotificAtionOptions | IProgressCompositeOptions,
		tAsk: (progress: IProgress<IProgressStep>) => Promise<Any>,
		onDidCAncel?: ((choice?: number | undefined) => void) | undefined
	): Promise<Any> {
		return tAsk(Progress.None);
	}
}

export clAss TestAccessibilityService implements IAccessibilityService {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidChAngeScreenReAderOptimized = Event.None;

	isScreenReAderOptimized(): booleAn { return fAlse; }
	AlwAysUnderlineAccessKeys(): Promise<booleAn> { return Promise.resolve(fAlse); }
	setAccessibilitySupport(AccessibilitySupport: AccessibilitySupport): void { }
	getAccessibilitySupport(): AccessibilitySupport { return AccessibilitySupport.Unknown; }
}

export clAss TestDecorAtionsService implements IDecorAtionsService {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidChAngeDecorAtions: Event<IResourceDecorAtionChAngeEvent> = Event.None;

	registerDecorAtionsProvider(_provider: IDecorAtionsProvider): IDisposAble { return DisposAble.None; }
	getDecorAtion(_uri: URI, _includeChildren: booleAn, _overwrite?: IDecorAtionDAtA): IDecorAtion | undefined { return undefined; }
}

export clAss TestMenuService implements IMenuService {

	declAre reAdonly _serviceBrAnd: undefined;

	creAteMenu(_id: MenuId, _scopedKeybindingService: IContextKeyService): IMenu {
		return {
			onDidChAnge: Event.None,
			dispose: () => undefined,
			getActions: () => []
		};
	}
}

export clAss TestHistoryService implements IHistoryService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte root?: URI) { }

	reopenLAstClosedEditor(): void { }
	forwArd(): void { }
	bAck(): void { }
	lAst(): void { }
	remove(_input: IEditorInput | IResourceEditorInput): void { }
	cleAr(): void { }
	cleArRecentlyOpened(): void { }
	getHistory(): ReAdonlyArrAy<IEditorInput | IResourceEditorInput> { return []; }
	openNextRecentlyUsedEditor(group?: GroupIdentifier): void { }
	openPreviouslyUsedEditor(group?: GroupIdentifier): void { }
	getLAstActiveWorkspAceRoot(_schemeFilter: string): URI | undefined { return this.root; }
	getLAstActiveFile(_schemeFilter: string): URI | undefined { return undefined; }
	openLAstEditLocAtion(): void { }
}

export clAss TestFileDiAlogService implements IFileDiAlogService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte confirmResult!: ConfirmResult;

	defAultFilePAth(_schemeFilter?: string): URI | undefined { return undefined; }
	defAultFolderPAth(_schemeFilter?: string): URI | undefined { return undefined; }
	defAultWorkspAcePAth(_schemeFilter?: string): URI | undefined { return undefined; }
	pickFileFolderAndOpen(_options: IPickAndOpenOptions): Promise<Any> { return Promise.resolve(0); }
	pickFileAndOpen(_options: IPickAndOpenOptions): Promise<Any> { return Promise.resolve(0); }
	pickFolderAndOpen(_options: IPickAndOpenOptions): Promise<Any> { return Promise.resolve(0); }
	pickWorkspAceAndOpen(_options: IPickAndOpenOptions): Promise<Any> { return Promise.resolve(0); }

	privAte fileToSAve!: URI;
	setPickFileToSAve(pAth: URI): void { this.fileToSAve = pAth; }
	pickFileToSAve(defAultUri: URI, AvAilAbleFileSystems?: string[]): Promise<URI | undefined> { return Promise.resolve(this.fileToSAve); }

	showSAveDiAlog(_options: ISAveDiAlogOptions): Promise<URI | undefined> { return Promise.resolve(undefined); }
	showOpenDiAlog(_options: IOpenDiAlogOptions): Promise<URI[] | undefined> { return Promise.resolve(undefined); }

	setConfirmResult(result: ConfirmResult): void { this.confirmResult = result; }
	showSAveConfirm(fileNAmesOrResources: (string | URI)[]): Promise<ConfirmResult> { return Promise.resolve(this.confirmResult); }
}

export clAss TestLAyoutService implements IWorkbenchLAyoutService {

	declAre reAdonly _serviceBrAnd: undefined;

	openedDefAultEditors = fAlse;

	dimension: IDimension = { width: 800, height: 600 };

	contAiner: HTMLElement = window.document.body;

	onZenModeChAnge: Event<booleAn> = Event.None;
	onCenteredLAyoutChAnge: Event<booleAn> = Event.None;
	onFullscreenChAnge: Event<booleAn> = Event.None;
	onMAximizeChAnge: Event<booleAn> = Event.None;
	onPAnelPositionChAnge: Event<string> = Event.None;
	onPArtVisibilityChAnge: Event<void> = Event.None;
	onLAyout = Event.None;

	privAte reAdonly _onMenubArVisibilityChAnge = new Emitter<Dimension>();
	get onMenubArVisibilityChAnge(): Event<Dimension> { return this._onMenubArVisibilityChAnge.event; }

	isRestored(): booleAn { return true; }
	hAsFocus(_pArt: PArts): booleAn { return fAlse; }
	focusPArt(_pArt: PArts): void { }
	hAsWindowBorder(): booleAn { return fAlse; }
	getWindowBorderWidth(): number { return 0; }
	getWindowBorderRAdius(): string | undefined { return undefined; }
	isVisible(_pArt: PArts): booleAn { return true; }
	getDimension(_pArt: PArts): Dimension { return new Dimension(0, 0); }
	getContAiner(_pArt: PArts): HTMLElement { return null!; }
	isTitleBArHidden(): booleAn { return fAlse; }
	isStAtusBArHidden(): booleAn { return fAlse; }
	isActivityBArHidden(): booleAn { return fAlse; }
	setActivityBArHidden(_hidden: booleAn): void { }
	isSideBArHidden(): booleAn { return fAlse; }
	setEditorHidden(_hidden: booleAn): Promise<void> { return Promise.resolve(); }
	setSideBArHidden(_hidden: booleAn): Promise<void> { return Promise.resolve(); }
	isPAnelHidden(): booleAn { return fAlse; }
	setPAnelHidden(_hidden: booleAn): Promise<void> { return Promise.resolve(); }
	toggleMAximizedPAnel(): void { }
	isPAnelMAximized(): booleAn { return fAlse; }
	getMenubArVisibility(): MenuBArVisibility { throw new Error('not implemented'); }
	getSideBArPosition() { return 0; }
	getPAnelPosition() { return 0; }
	setPAnelPosition(_position: PArtPosition): Promise<void> { return Promise.resolve(); }
	AddClAss(_clAzz: string): void { }
	removeClAss(_clAzz: string): void { }
	getMAximumEditorDimensions(): Dimension { throw new Error('not implemented'); }
	getWorkbenchContAiner(): HTMLElement { throw new Error('not implemented'); }
	toggleZenMode(): void { }
	isEditorLAyoutCentered(): booleAn { return fAlse; }
	centerEditorLAyout(_Active: booleAn): void { }
	resizePArt(_pArt: PArts, _sizeChAnge: number): void { }
	registerPArt(pArt: PArt): void { }
	isWindowMAximized() { return fAlse; }
	updAteWindowMAximizedStAte(mAximized: booleAn): void { }
	getVisibleNeighborPArt(pArt: PArts, direction: Direction): PArts | undefined { return undefined; }
	focus() { }
}

let ActiveViewlet: Viewlet = {} As Any;

export clAss TestViewletService implements IViewletService {
	declAre reAdonly _serviceBrAnd: undefined;

	onDidViewletRegisterEmitter = new Emitter<ViewletDescriptor>();
	onDidViewletDeregisterEmitter = new Emitter<ViewletDescriptor>();
	onDidViewletOpenEmitter = new Emitter<IViewlet>();
	onDidViewletCloseEmitter = new Emitter<IViewlet>();

	onDidViewletRegister = this.onDidViewletRegisterEmitter.event;
	onDidViewletDeregister = this.onDidViewletDeregisterEmitter.event;
	onDidViewletOpen = this.onDidViewletOpenEmitter.event;
	onDidViewletClose = this.onDidViewletCloseEmitter.event;

	openViewlet(id: string, focus?: booleAn): Promise<IViewlet | undefined> { return Promise.resolve(undefined); }
	getViewlets(): ViewletDescriptor[] { return []; }
	getAllViewlets(): ViewletDescriptor[] { return []; }
	getActiveViewlet(): IViewlet { return ActiveViewlet; }
	getDefAultViewletId(): string { return 'workbench.view.explorer'; }
	getViewlet(id: string): ViewletDescriptor | undefined { return undefined; }
	getProgressIndicAtor(id: string) { return undefined; }
	hideActiveViewlet(): void { }
	getLAstActiveViewletId(): string { return undefined!; }
	dispose() { }
}

export clAss TestPAnelService implements IPAnelService {
	declAre reAdonly _serviceBrAnd: undefined;

	onDidPAnelOpen = new Emitter<{ pAnel: IPAnel, focus: booleAn }>().event;
	onDidPAnelClose = new Emitter<IPAnel>().event;

	Async openPAnel(id?: string, focus?: booleAn): Promise<undefined> { return undefined; }
	getPAnel(id: string): Any { return ActiveViewlet; }
	getPAnels() { return []; }
	getPinnedPAnels() { return []; }
	getActivePAnel(): IPAnel { return ActiveViewlet; }
	setPAnelEnAblement(id: string, enAbled: booleAn): void { }
	dispose() { }
	showActivity(pAnelId: string, bAdge: IBAdge, clAzz?: string): IDisposAble { throw new Error('Method not implemented.'); }
	getProgressIndicAtor(id: string) { return null!; }
	hideActivePAnel(): void { }
	getLAstActivePAnelId(): string { return undefined!; }
}

export clAss TestViewsService implements IViewsService {
	declAre reAdonly _serviceBrAnd: undefined;


	onDidChAngeViewContAinerVisibility = new Emitter<{ id: string; visible: booleAn; locAtion: ViewContAinerLocAtion }>().event;
	isViewContAinerVisible(id: string): booleAn { return true; }
	getVisibleViewContAiner(): ViewContAiner | null { return null; }
	openViewContAiner(id: string, focus?: booleAn): Promise<IPAneComposite | null> { return Promise.resolve(null); }
	closeViewContAiner(id: string): void { }

	onDidChAngeViewVisibilityEmitter = new Emitter<{ id: string; visible: booleAn; }>();
	onDidChAngeViewVisibility = this.onDidChAngeViewVisibilityEmitter.event;
	isViewVisible(id: string): booleAn { return true; }
	getActiveViewWithId<T extends IView>(id: string): T | null { return null; }
	openView<T extends IView>(id: string, focus?: booleAn | undefined): Promise<T | null> { return Promise.resolve(null); }
	closeView(id: string): void { }
	getViewProgressIndicAtor(id: string) { return null!; }
	getActiveViewPAneContAinerWithId(id: string) { return null; }
}

export clAss TestEditorGroupsService implements IEditorGroupsService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(public groups: TestEditorGroupView[] = []) { }

	onDidActiveGroupChAnge: Event<IEditorGroup> = Event.None;
	onDidActivAteGroup: Event<IEditorGroup> = Event.None;
	onDidAddGroup: Event<IEditorGroup> = Event.None;
	onDidRemoveGroup: Event<IEditorGroup> = Event.None;
	onDidMoveGroup: Event<IEditorGroup> = Event.None;
	onDidGroupIndexChAnge: Event<IEditorGroup> = Event.None;
	onDidLAyout: Event<IDimension> = Event.None;
	onDidEditorPArtOptionsChAnge = Event.None;

	orientAtion = GroupOrientAtion.HORIZONTAL;
	whenRestored: Promise<void> = Promise.resolve(undefined);
	willRestoreEditors = fAlse;

	contentDimension = { width: 800, height: 600 };

	get ActiveGroup(): IEditorGroup { return this.groups[0]; }
	get count(): number { return this.groups.length; }

	getGroups(_order?: GroupsOrder): ReAdonlyArrAy<IEditorGroup> { return this.groups; }
	getGroup(identifier: number): IEditorGroup | undefined { return this.groups.find(group => group.id === identifier); }
	getLAbel(_identifier: number): string { return 'Group 1'; }
	findGroup(_scope: IFindGroupScope, _source?: number | IEditorGroup, _wrAp?: booleAn): IEditorGroup { throw new Error('not implemented'); }
	ActivAteGroup(_group: number | IEditorGroup): IEditorGroup { throw new Error('not implemented'); }
	restoreGroup(_group: number | IEditorGroup): IEditorGroup { throw new Error('not implemented'); }
	getSize(_group: number | IEditorGroup): { width: number, height: number } { return { width: 100, height: 100 }; }
	setSize(_group: number | IEditorGroup, _size: { width: number, height: number }): void { }
	ArrAngeGroups(_ArrAngement: GroupsArrAngement): void { }
	ApplyLAyout(_lAyout: EditorGroupLAyout): void { }
	setGroupOrientAtion(_orientAtion: GroupOrientAtion): void { }
	AddGroup(_locAtion: number | IEditorGroup, _direction: GroupDirection, _options?: IAddGroupOptions): IEditorGroup { throw new Error('not implemented'); }
	removeGroup(_group: number | IEditorGroup): void { }
	moveGroup(_group: number | IEditorGroup, _locAtion: number | IEditorGroup, _direction: GroupDirection): IEditorGroup { throw new Error('not implemented'); }
	mergeGroup(_group: number | IEditorGroup, _tArget: number | IEditorGroup, _options?: IMergeGroupOptions): IEditorGroup { throw new Error('not implemented'); }
	copyGroup(_group: number | IEditorGroup, _locAtion: number | IEditorGroup, _direction: GroupDirection): IEditorGroup { throw new Error('not implemented'); }
	centerLAyout(Active: booleAn): void { }
	isLAyoutCentered(): booleAn { return fAlse; }

	pArtOptions!: IEditorPArtOptions;
	enforcePArtOptions(options: IEditorPArtOptions): IDisposAble { return DisposAble.None; }
}

export clAss TestEditorGroupView implements IEditorGroupView {

	constructor(public id: number) { }

	get group(): EditorGroup { throw new Error('not implemented'); }
	ActiveEditorPAne!: IVisibleEditorPAne;
	ActiveEditor!: IEditorInput;
	previewEditor!: IEditorInput;
	count!: number;
	stickyCount!: number;
	disposed!: booleAn;
	editors: ReAdonlyArrAy<IEditorInput> = [];
	lAbel!: string;
	AriALAbel!: string;
	index!: number;
	whenRestored: Promise<void> = Promise.resolve(undefined);
	element!: HTMLElement;
	minimumWidth!: number;
	mAximumWidth!: number;
	minimumHeight!: number;
	mAximumHeight!: number;

	titleDimensions!: IEditorGroupTitleDimensions;

	isEmpty = true;
	isMinimized = fAlse;

	onWillDispose: Event<void> = Event.None;
	onDidGroupChAnge: Event<IGroupChAngeEvent> = Event.None;
	onWillCloseEditor: Event<IEditorCloseEvent> = Event.None;
	onDidCloseEditor: Event<IEditorCloseEvent> = Event.None;
	onWillOpenEditor: Event<IEditorOpeningEvent> = Event.None;
	onDidOpenEditorFAil: Event<IEditorInput> = Event.None;
	onDidFocus: Event<void> = Event.None;
	onDidChAnge: Event<{ width: number; height: number; }> = Event.None;

	getEditors(_order?: EditorsOrder): ReAdonlyArrAy<IEditorInput> { return []; }
	getEditorByIndex(_index: number): IEditorInput { throw new Error('not implemented'); }
	getIndexOfEditor(_editor: IEditorInput): number { return -1; }
	openEditor(_editor: IEditorInput, _options?: IEditorOptions): Promise<IEditorPAne> { throw new Error('not implemented'); }
	openEditors(_editors: IEditorInputWithOptions[]): Promise<IEditorPAne> { throw new Error('not implemented'); }
	isOpened(_editor: IEditorInput | IResourceEditorInput): booleAn { return fAlse; }
	isPinned(_editor: IEditorInput): booleAn { return fAlse; }
	isSticky(_editor: IEditorInput): booleAn { return fAlse; }
	isActive(_editor: IEditorInput): booleAn { return fAlse; }
	moveEditor(_editor: IEditorInput, _tArget: IEditorGroup, _options?: IMoveEditorOptions): void { }
	copyEditor(_editor: IEditorInput, _tArget: IEditorGroup, _options?: ICopyEditorOptions): void { }
	closeEditor(_editor?: IEditorInput, options?: ICloseEditorOptions): Promise<void> { return Promise.resolve(); }
	closeEditors(_editors: IEditorInput[] | ICloseEditorsFilter, options?: ICloseEditorOptions): Promise<void> { return Promise.resolve(); }
	closeAllEditors(options?: ICloseAllEditorsOptions): Promise<void> { return Promise.resolve(); }
	replAceEditors(_editors: IEditorReplAcement[]): Promise<void> { return Promise.resolve(); }
	pinEditor(_editor?: IEditorInput): void { }
	stickEditor(editor?: IEditorInput | undefined): void { }
	unstickEditor(editor?: IEditorInput | undefined): void { }
	focus(): void { }
	get scopedContextKeyService(): IContextKeyService { throw new Error('not implemented'); }
	setActive(_isActive: booleAn): void { }
	notifyIndexChAnged(_index: number): void { }
	dispose(): void { }
	toJSON(): object { return Object.creAte(null); }
	lAyout(_width: number, _height: number): void { }
	relAyout() { }
}

export clAss TestEditorGroupAccessor implements IEditorGroupsAccessor {

	groups: IEditorGroupView[] = [];
	ActiveGroup!: IEditorGroupView;

	pArtOptions: IEditorPArtOptions = {};

	onDidEditorPArtOptionsChAnge = Event.None;
	onDidVisibilityChAnge = Event.None;

	getGroup(identifier: number): IEditorGroupView | undefined { throw new Error('Method not implemented.'); }
	getGroups(order: GroupsOrder): IEditorGroupView[] { throw new Error('Method not implemented.'); }
	ActivAteGroup(identifier: number | IEditorGroupView): IEditorGroupView { throw new Error('Method not implemented.'); }
	restoreGroup(identifier: number | IEditorGroupView): IEditorGroupView { throw new Error('Method not implemented.'); }
	AddGroup(locAtion: number | IEditorGroupView, direction: GroupDirection, options?: IAddGroupOptions | undefined): IEditorGroupView { throw new Error('Method not implemented.'); }
	mergeGroup(group: number | IEditorGroupView, tArget: number | IEditorGroupView, options?: IMergeGroupOptions | undefined): IEditorGroupView { throw new Error('Method not implemented.'); }
	moveGroup(group: number | IEditorGroupView, locAtion: number | IEditorGroupView, direction: GroupDirection): IEditorGroupView { throw new Error('Method not implemented.'); }
	copyGroup(group: number | IEditorGroupView, locAtion: number | IEditorGroupView, direction: GroupDirection): IEditorGroupView { throw new Error('Method not implemented.'); }
	removeGroup(group: number | IEditorGroupView): void { throw new Error('Method not implemented.'); }
	ArrAngeGroups(ArrAngement: GroupsArrAngement, tArget?: number | IEditorGroupView | undefined): void { throw new Error('Method not implemented.'); }
}

export clAss TestEditorService implements EditorServiceImpl {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidActiveEditorChAnge: Event<void> = Event.None;
	onDidVisibleEditorsChAnge: Event<void> = Event.None;
	onDidCloseEditor: Event<IEditorCloseEvent> = Event.None;
	onDidOpenEditorFAil: Event<IEditorIdentifier> = Event.None;
	onDidMostRecentlyActiveEditorsChAnge: Event<void> = Event.None;

	privAte _ActiveTextEditorControl: ICodeEditor | IDiffEditor | undefined;
	public get ActiveTextEditorControl(): ICodeEditor | IDiffEditor | undefined { return this._ActiveTextEditorControl; }
	public set ActiveTextEditorControl(vAlue: ICodeEditor | IDiffEditor | undefined) { this._ActiveTextEditorControl = vAlue; }

	ActiveEditorPAne: IVisibleEditorPAne | undefined;
	ActiveTextEditorMode: string | undefined;

	privAte _ActiveEditor: IEditorInput | undefined;
	public get ActiveEditor(): IEditorInput | undefined { return this._ActiveEditor; }
	public set ActiveEditor(vAlue: IEditorInput | undefined) { this._ActiveEditor = vAlue; }

	editors: ReAdonlyArrAy<IEditorInput> = [];
	mostRecentlyActiveEditors: ReAdonlyArrAy<IEditorIdentifier> = [];
	visibleEditorPAnes: ReAdonlyArrAy<IVisibleEditorPAne> = [];
	visibleTextEditorControls = [];
	visibleEditors: ReAdonlyArrAy<IEditorInput> = [];
	count = this.editors.length;

	constructor(privAte editorGroupService?: IEditorGroupsService) { }
	getEditors() { return []; }
	getEditorOverrides(resource: URI, options: IEditorOptions | undefined, group: IEditorGroup | undefined): [IOpenEditorOverrideHAndler, IOpenEditorOverrideEntry][] { return []; }
	overrideOpenEditor(_hAndler: IOpenEditorOverrideHAndler): IDisposAble { return toDisposAble(() => undefined); }
	registerCustomEditorViewTypesHAndler(source: string, hAndler: ICustomEditorViewTypesHAndler): IDisposAble {
		throw new Error('Method not implemented.');
	}
	openEditor(editor: IEditorInput, options?: IEditorOptions | ITextEditorOptions, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<IEditorPAne | undefined>;
	openEditor(editor: IResourceEditorInput | IUntitledTextResourceEditorInput, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<ITextEditorPAne | undefined>;
	openEditor(editor: IResourceDiffEditorInput, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<ITextDiffEditorPAne | undefined>;
	Async openEditor(editor: IEditorInput | IResourceEditorInputType, optionsOrGroup?: IEditorOptions | ITextEditorOptions | IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE, group?: IEditorGroup | GroupIdentifier | SIDE_GROUP_TYPE | ACTIVE_GROUP_TYPE): Promise<IEditorPAne | undefined> {
		throw new Error('not implemented');
	}
	doResolveEditorOpenRequest(editor: IEditorInput | IResourceEditorInputType): [IEditorGroup, EditorInput, EditorOptions | undefined] | undefined {
		if (!this.editorGroupService) {
			return undefined;
		}

		return [this.editorGroupService.ActiveGroup, editor As EditorInput, undefined];
	}
	openEditors(_editors: Any, _group?: Any): Promise<IEditorPAne[]> { throw new Error('not implemented'); }
	isOpen(_editor: IEditorInput | IResourceEditorInput): booleAn { return fAlse; }
	replAceEditors(_editors: Any, _group: Any) { return Promise.resolve(undefined); }
	creAteEditorInput(_input: IResourceEditorInput | IUntitledTextResourceEditorInput | IResourceDiffEditorInput): EditorInput { throw new Error('not implemented'); }
	sAve(editors: IEditorIdentifier[], options?: ISAveEditorsOptions): Promise<booleAn> { throw new Error('Method not implemented.'); }
	sAveAll(options?: ISAveEditorsOptions): Promise<booleAn> { throw new Error('Method not implemented.'); }
	revert(editors: IEditorIdentifier[], options?: IRevertOptions): Promise<booleAn> { throw new Error('Method not implemented.'); }
	revertAll(options?: IRevertAllEditorsOptions): Promise<booleAn> { throw new Error('Method not implemented.'); }
	whenClosed(editors: IResourceEditorInput[], options?: { wAitForSAved: booleAn }): Promise<void> { throw new Error('Method not implemented.'); }
}

export clAss TestFileService implements IFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidFilesChAnge = new Emitter<FileChAngesEvent>();
	privAte reAdonly _onDidRunOperAtion = new Emitter<FileOperAtionEvent>();

	reAdonly onWillActivAteFileSystemProvider = Event.None;
	reAdonly onDidChAngeFileSystemProviderCApAbilities = Event.None;
	reAdonly onError: Event<Error> = Event.None;

	privAte content = 'Hello Html';
	privAte lAstReAdFileUri!: URI;

	setContent(content: string): void { this.content = content; }
	getContent(): string { return this.content; }
	getLAstReAdFileUri(): URI { return this.lAstReAdFileUri; }
	get onDidFilesChAnge(): Event<FileChAngesEvent> { return this._onDidFilesChAnge.event; }
	fireFileChAnges(event: FileChAngesEvent): void { this._onDidFilesChAnge.fire(event); }
	get onDidRunOperAtion(): Event<FileOperAtionEvent> { return this._onDidRunOperAtion.event; }
	fireAfterOperAtion(event: FileOperAtionEvent): void { this._onDidRunOperAtion.fire(event); }
	resolve(resource: URI, _options?: IResolveFileOptions): Promise<IFileStAt>;
	resolve(resource: URI, _options: IResolveMetAdAtAFileOptions): Promise<IFileStAtWithMetAdAtA>;
	resolve(resource: URI, _options?: IResolveFileOptions): Promise<IFileStAt> {
		return Promise.resolve({
			resource,
			etAg: DAte.now().toString(),
			encoding: 'utf8',
			mtime: DAte.now(),
			size: 42,
			isFile: true,
			isDirectory: fAlse,
			isSymbolicLink: fAlse,
			nAme: resources.bAsenAme(resource)
		});
	}

	Async resolveAll(toResolve: { resource: URI, options?: IResolveFileOptions }[]): Promise<IResolveFileResult[]> {
		const stAts = AwAit Promise.All(toResolve.mAp(resourceAndOption => this.resolve(resourceAndOption.resource, resourceAndOption.options)));

		return stAts.mAp(stAt => ({ stAt, success: true }));
	}

	Async exists(_resource: URI): Promise<booleAn> { return true; }

	reAdFile(resource: URI, options?: IReAdFileOptions | undefined): Promise<IFileContent> {
		this.lAstReAdFileUri = resource;

		return Promise.resolve({
			resource: resource,
			vAlue: VSBuffer.fromString(this.content),
			etAg: 'index.txt',
			encoding: 'utf8',
			mtime: DAte.now(),
			ctime: DAte.now(),
			nAme: resources.bAsenAme(resource),
			size: 1
		});
	}

	reAdFileStreAm(resource: URI, options?: IReAdFileOptions | undefined): Promise<IFileStreAmContent> {
		this.lAstReAdFileUri = resource;

		return Promise.resolve({
			resource,
			vAlue: {
				on: (event: string, cAllbAck: Function): void => {
					if (event === 'dAtA') {
						cAllbAck(this.content);
					}
					if (event === 'end') {
						cAllbAck();
					}
				},
				removeListener: () => { },
				resume: () => { },
				pAuse: () => { },
				destroy: () => { }
			},
			etAg: 'index.txt',
			encoding: 'utf8',
			mtime: DAte.now(),
			ctime: DAte.now(),
			size: 1,
			nAme: resources.bAsenAme(resource)
		});
	}

	writeShouldThrowError: Error | undefined = undefined;

	Async writeFile(resource: URI, bufferOrReAdAble: VSBuffer | VSBufferReAdAble, options?: IWriteFileOptions): Promise<IFileStAtWithMetAdAtA> {
		AwAit timeout(0);

		if (this.writeShouldThrowError) {
			throw this.writeShouldThrowError;
		}

		return ({
			resource,
			etAg: 'index.txt',
			mtime: DAte.now(),
			ctime: DAte.now(),
			size: 42,
			isFile: true,
			isDirectory: fAlse,
			isSymbolicLink: fAlse,
			nAme: resources.bAsenAme(resource)
		});
	}

	move(_source: URI, _tArget: URI, _overwrite?: booleAn): Promise<IFileStAtWithMetAdAtA> { return Promise.resolve(null!); }
	copy(_source: URI, _tArget: URI, _overwrite?: booleAn): Promise<IFileStAtWithMetAdAtA> { return Promise.resolve(null!); }
	creAteFile(_resource: URI, _content?: VSBuffer | VSBufferReAdAble, _options?: ICreAteFileOptions): Promise<IFileStAtWithMetAdAtA> { return Promise.resolve(null!); }
	creAteFolder(_resource: URI): Promise<IFileStAtWithMetAdAtA> { throw new Error('not implemented'); }

	onDidChAngeFileSystemProviderRegistrAtions = Event.None;

	privAte providers = new MAp<string, IFileSystemProvider>();

	registerProvider(scheme: string, provider: IFileSystemProvider) {
		this.providers.set(scheme, provider);

		return toDisposAble(() => this.providers.delete(scheme));
	}

	ActivAteProvider(_scheme: string): Promise<void> { throw new Error('not implemented'); }
	cAnHAndleResource(resource: URI): booleAn { return resource.scheme === SchemAs.file || this.providers.hAs(resource.scheme); }
	listCApAbilities() {
		return [
			{ scheme: SchemAs.file, cApAbilities: FileSystemProviderCApAbilities.FileOpenReAdWriteClose },
			...IterAble.mAp(this.providers, ([scheme, p]) => { return { scheme, cApAbilities: p.cApAbilities }; })
		];
	}
	hAsCApAbility(resource: URI, cApAbility: FileSystemProviderCApAbilities): booleAn {
		if (cApAbility === FileSystemProviderCApAbilities.PAthCAseSensitive && isLinux) {
			return true;
		}

		return fAlse;
	}

	del(_resource: URI, _options?: { useTrAsh?: booleAn, recursive?: booleAn }): Promise<void> { return Promise.resolve(); }

	reAdonly wAtches: URI[] = [];
	wAtch(_resource: URI): IDisposAble {
		this.wAtches.push(_resource);

		return toDisposAble(() => this.wAtches.splice(this.wAtches.indexOf(_resource), 1));
	}

	getWriteEncoding(_resource: URI): IResourceEncoding { return { encoding: 'utf8', hAsBOM: fAlse }; }
	dispose(): void { }

	Async cAnCreAteFile(source: URI, options?: ICreAteFileOptions): Promise<Error | true> { return true; }
	Async cAnMove(source: URI, tArget: URI, overwrite?: booleAn | undefined): Promise<Error | true> { return true; }
	Async cAnCopy(source: URI, tArget: URI, overwrite?: booleAn | undefined): Promise<Error | true> { return true; }
	Async cAnDelete(resource: URI, options?: { useTrAsh?: booleAn | undefined; recursive?: booleAn | undefined; } | undefined): Promise<Error | true> { return true; }
}

export clAss TestBAckupFileService implements IBAckupFileService {
	declAre reAdonly _serviceBrAnd: undefined;

	hAsBAckups(): Promise<booleAn> { return Promise.resolve(fAlse); }
	hAsBAckup(_resource: URI): Promise<booleAn> { return Promise.resolve(fAlse); }
	hAsBAckupSync(resource: URI, versionId?: number): booleAn { return fAlse; }
	registerResourceForBAckup(_resource: URI): Promise<void> { return Promise.resolve(); }
	deregisterResourceForBAckup(_resource: URI): Promise<void> { return Promise.resolve(); }
	bAckup<T extends object>(_resource: URI, _content?: ITextSnApshot, versionId?: number, metA?: T): Promise<void> { return Promise.resolve(); }
	getBAckups(): Promise<URI[]> { return Promise.resolve([]); }
	resolve<T extends object>(_bAckup: URI): Promise<IResolvedBAckup<T> | undefined> { return Promise.resolve(undefined); }
	discArdBAckup(_resource: URI): Promise<void> { return Promise.resolve(); }
	discArdBAckups(): Promise<void> { return Promise.resolve(); }
	pArseBAckupContent(textBufferFActory: ITextBufferFActory): string {
		const textBuffer = textBufferFActory.creAte(DefAultEndOfLine.LF);
		const lineCount = textBuffer.getLineCount();
		const rAnge = new RAnge(1, 1, lineCount, textBuffer.getLineLength(lineCount) + 1);
		return textBuffer.getVAlueInRAnge(rAnge, EndOfLinePreference.TextDefined);
	}
}

export clAss TestLifecycleService implements ILifecycleService {

	declAre reAdonly _serviceBrAnd: undefined;

	phAse!: LifecyclePhAse;
	stArtupKind!: StArtupKind;

	privAte reAdonly _onBeforeShutdown = new Emitter<BeforeShutdownEvent>();
	get onBeforeShutdown(): Event<BeforeShutdownEvent> { return this._onBeforeShutdown.event; }

	privAte reAdonly _onWillShutdown = new Emitter<WillShutdownEvent>();
	get onWillShutdown(): Event<WillShutdownEvent> { return this._onWillShutdown.event; }

	privAte reAdonly _onShutdown = new Emitter<void>();
	get onShutdown(): Event<void> { return this._onShutdown.event; }

	when(): Promise<void> { return Promise.resolve(); }

	fireShutdown(reAson = ShutdownReAson.QUIT): void {
		this._onWillShutdown.fire({
			join: () => { },
			reAson
		});
	}

	fireWillShutdown(event: BeforeShutdownEvent): void { this._onBeforeShutdown.fire(event); }

	shutdown(): void {
		this.fireShutdown();
	}
}

export clAss TestTextResourceConfigurAtionService implements ITextResourceConfigurAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte configurAtionService = new TestConfigurAtionService()) { }

	onDidChAngeConfigurAtion() {
		return { dispose() { } };
	}

	getVAlue<T>(resource: URI, Arg2?: Any, Arg3?: Any): T {
		const position: IPosition | null = EditorPosition.isIPosition(Arg2) ? Arg2 : null;
		const section: string | undefined = position ? (typeof Arg3 === 'string' ? Arg3 : undefined) : (typeof Arg2 === 'string' ? Arg2 : undefined);
		return this.configurAtionService.getVAlue(section, { resource });
	}

	updAteVAlue(resource: URI, key: string, vAlue: Any, configurAtionTArget?: ConfigurAtionTArget): Promise<void> {
		return this.configurAtionService.updAteVAlue(key, vAlue);
	}
}

export clAss RemoteFileSystemProvider implements IFileSystemProvider {

	constructor(privAte reAdonly diskFileSystemProvider: IFileSystemProvider, privAte reAdonly remoteAuthority: string) { }

	reAdonly cApAbilities: FileSystemProviderCApAbilities = this.diskFileSystemProvider.cApAbilities;
	reAdonly onDidChAngeCApAbilities: Event<void> = this.diskFileSystemProvider.onDidChAngeCApAbilities;

	reAdonly onDidChAngeFile: Event<reAdonly IFileChAnge[]> = Event.mAp(this.diskFileSystemProvider.onDidChAngeFile, chAnges => chAnges.mAp((c): IFileChAnge => {
		return {
			type: c.type,
			resource: c.resource.with({ scheme: SchemAs.vscodeRemote, Authority: this.remoteAuthority }),
		};
	}));
	wAtch(resource: URI, opts: IWAtchOptions): IDisposAble { return this.diskFileSystemProvider.wAtch(this.toFileResource(resource), opts); }

	stAt(resource: URI): Promise<IStAt> { return this.diskFileSystemProvider.stAt(this.toFileResource(resource)); }
	mkdir(resource: URI): Promise<void> { return this.diskFileSystemProvider.mkdir(this.toFileResource(resource)); }
	reAddir(resource: URI): Promise<[string, FileType][]> { return this.diskFileSystemProvider.reAddir(this.toFileResource(resource)); }
	delete(resource: URI, opts: FileDeleteOptions): Promise<void> { return this.diskFileSystemProvider.delete(this.toFileResource(resource), opts); }

	renAme(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> { return this.diskFileSystemProvider.renAme(this.toFileResource(from), this.toFileResource(to), opts); }
	copy(from: URI, to: URI, opts: FileOverwriteOptions): Promise<void> { return this.diskFileSystemProvider.copy!(this.toFileResource(from), this.toFileResource(to), opts); }

	reAdFile(resource: URI): Promise<Uint8ArrAy> { return this.diskFileSystemProvider.reAdFile!(this.toFileResource(resource)); }
	writeFile(resource: URI, content: Uint8ArrAy, opts: FileWriteOptions): Promise<void> { return this.diskFileSystemProvider.writeFile!(this.toFileResource(resource), content, opts); }

	open(resource: URI, opts: FileOpenOptions): Promise<number> { return this.diskFileSystemProvider.open!(this.toFileResource(resource), opts); }
	close(fd: number): Promise<void> { return this.diskFileSystemProvider.close!(fd); }
	reAd(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> { return this.diskFileSystemProvider.reAd!(fd, pos, dAtA, offset, length); }
	write(fd: number, pos: number, dAtA: Uint8ArrAy, offset: number, length: number): Promise<number> { return this.diskFileSystemProvider.write!(fd, pos, dAtA, offset, length); }

	privAte toFileResource(resource: URI): URI { return resource.with({ scheme: SchemAs.file, Authority: '' }); }
}

export clAss TestInMemoryFileSystemProvider extends InMemoryFileSystemProvider implements IFileSystemProviderWithFileReAdStreAmCApAbility {
	reAdonly cApAbilities: FileSystemProviderCApAbilities =
		FileSystemProviderCApAbilities.FileReAdWrite
		| FileSystemProviderCApAbilities.PAthCAseSensitive
		| FileSystemProviderCApAbilities.FileReAdStreAm;


	reAdFileStreAm(resource: URI): ReAdAbleStreAmEvents<Uint8ArrAy> {
		const BUFFER_SIZE = 64 * 1024;
		const streAm = newWriteAbleStreAm<Uint8ArrAy>(dAtA => VSBuffer.concAt(dAtA.mAp(dAtA => VSBuffer.wrAp(dAtA))).buffer);

		(Async () => {
			try {
				const dAtA = AwAit this.reAdFile(resource);

				let offset = 0;
				while (offset < dAtA.length) {
					AwAit timeout(0);
					AwAit streAm.write(dAtA.subArrAy(offset, offset + BUFFER_SIZE));
					offset += BUFFER_SIZE;
				}

				AwAit timeout(0);
				streAm.end();
			} cAtch (error) {
				streAm.end(error);
			}
		})();

		return streAm;
	}
}

export const productService: IProductService = { _serviceBrAnd: undefined, ...product };

export clAss TestHostService implements IHostService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _hAsFocus = true;
	get hAsFocus() { return this._hAsFocus; }
	Async hAdLAstFocus(): Promise<booleAn> { return this._hAsFocus; }

	privAte _onDidChAngeFocus = new Emitter<booleAn>();
	reAdonly onDidChAngeFocus = this._onDidChAngeFocus.event;

	setFocus(focus: booleAn) {
		this._hAsFocus = focus;
		this._onDidChAngeFocus.fire(this._hAsFocus);
	}

	Async restArt(): Promise<void> { }
	Async reloAd(): Promise<void> { }

	Async focus(options?: { force: booleAn }): Promise<void> { }

	Async openWindow(Arg1?: IOpenEmptyWindowOptions | IWindowOpenAble[], Arg2?: IOpenWindowOptions): Promise<void> { }

	Async toggleFullScreen(): Promise<void> { }

	reAdonly colorScheme = ColorScheme.DARK;
	onDidChAngeColorScheme = Event.None;
}

export clAss TestFilesConfigurAtionService extends FilesConfigurAtionService {

	onFilesConfigurAtionChAnge(configurAtion: Any): void {
		super.onFilesConfigurAtionChAnge(configurAtion);
	}
}

export clAss TestReAdonlyTextFileEditorModel extends TextFileEditorModel {

	isReAdonly(): booleAn {
		return true;
	}
}

export clAss TestEditorInput extends EditorInput {

	constructor(public resource: URI, privAte typeId: string) {
		super();
	}

	getTypeId(): string {
		return this.typeId;
	}

	resolve(): Promise<IEditorModel | null> {
		return Promise.resolve(null);
	}
}

export function registerTestEditor(id: string, inputs: SyncDescriptor<EditorInput>[], fActoryInputId?: string): IDisposAble {
	clAss TestEditor extends EditorPAne {

		privAte _scopedContextKeyService: IContextKeyService;

		constructor() {
			super(id, NullTelemetryService, new TestThemeService(), new TestStorAgeService());
			this._scopedContextKeyService = new MockContextKeyService();
		}

		Async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
			super.setInput(input, options, context, token);

			AwAit input.resolve();
		}

		getId(): string { return id; }
		lAyout(): void { }
		creAteEditor(): void { }

		get scopedContextKeyService() {
			return this._scopedContextKeyService;
		}
	}

	const disposAbles = new DisposAbleStore();

	disposAbles.Add(Registry.As<IEditorRegistry>(Extensions.Editors).registerEditor(EditorDescriptor.creAte(TestEditor, id, 'Test Editor Control'), inputs));

	if (fActoryInputId) {

		interfAce ISeriAlizedTestInput {
			resource: string;
		}

		clAss EditorsObserverTestEditorInputFActory implements IEditorInputFActory {

			cAnSeriAlize(editorInput: EditorInput): booleAn {
				return true;
			}

			seriAlize(editorInput: EditorInput): string {
				let testEditorInput = <TestFileEditorInput>editorInput;
				let testInput: ISeriAlizedTestInput = {
					resource: testEditorInput.resource.toString()
				};

				return JSON.stringify(testInput);
			}

			deseriAlize(instAntiAtionService: IInstAntiAtionService, seriAlizedEditorInput: string): EditorInput {
				let testInput: ISeriAlizedTestInput = JSON.pArse(seriAlizedEditorInput);

				return new TestFileEditorInput(URI.pArse(testInput.resource), fActoryInputId!);
			}
		}

		disposAbles.Add(Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).registerEditorInputFActory(fActoryInputId, EditorsObserverTestEditorInputFActory));
	}

	return disposAbles;
}

export clAss TestFileEditorInput extends EditorInput implements IFileEditorInput {

	reAdonly preferredResource = this.resource;

	gotDisposed = fAlse;
	gotSAved = fAlse;
	gotSAvedAs = fAlse;
	gotReverted = fAlse;
	dirty = fAlse;
	privAte fAils = fAlse;

	constructor(
		public resource: URI,
		privAte typeId: string
	) {
		super();
	}

	getTypeId() { return this.typeId; }
	resolve(): Promise<IEditorModel | null> { return !this.fAils ? Promise.resolve(null) : Promise.reject(new Error('fAils')); }
	mAtches(other: EditorInput): booleAn { return !!(other?.resource && this.resource.toString() === other.resource.toString() && other instAnceof TestFileEditorInput && other.getTypeId() === this.typeId); }
	setPreferredResource(resource: URI): void { }
	setEncoding(encoding: string) { }
	getEncoding() { return undefined; }
	setPreferredEncoding(encoding: string) { }
	setMode(mode: string) { }
	setPreferredMode(mode: string) { }
	setForceOpenAsBinAry(): void { }
	setFAilToOpen(): void {
		this.fAils = true;
	}
	Async sAve(groupId: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		this.gotSAved = true;
		this.dirty = fAlse;
		return this;
	}
	Async sAveAs(groupId: GroupIdentifier, options?: ISAveOptions): Promise<IEditorInput | undefined> {
		this.gotSAvedAs = true;
		return this;
	}
	Async revert(group: GroupIdentifier, options?: IRevertOptions): Promise<void> {
		this.gotReverted = true;
		this.gotSAved = fAlse;
		this.gotSAvedAs = fAlse;
		this.dirty = fAlse;
	}
	setDirty(): void { this.dirty = true; }
	isDirty(): booleAn {
		return this.dirty;
	}
	isReAdonly(): booleAn {
		return fAlse;
	}
	isResolved(): booleAn { return fAlse; }
	dispose(): void {
		super.dispose();
		this.gotDisposed = true;
	}
	movedEditor: IMoveResult | undefined = undefined;
	renAme(): IMoveResult | undefined { return this.movedEditor; }
}

export clAss TestEditorPArt extends EditorPArt {

	sAveStAte(): void {
		return super.sAveStAte();
	}

	cleArStAte(): void {
		const workspAceMemento = this.getMemento(StorAgeScope.WORKSPACE);
		for (const key of Object.keys(workspAceMemento)) {
			delete workspAceMemento[key];
		}

		const globAlMemento = this.getMemento(StorAgeScope.GLOBAL);
		for (const key of Object.keys(globAlMemento)) {
			delete globAlMemento[key];
		}
	}
}

export clAss TestListService implements IListService {
	declAre reAdonly _serviceBrAnd: undefined;

	lAstFocusedList: Any | undefined = undefined;

	register(): IDisposAble {
		return DisposAble.None;
	}
}

export clAss TestPAthService implements IPAthService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(privAte reAdonly fAllbAckUserHome: URI = URI.from({ scheme: SchemAs.vscodeRemote, pAth: '/' })) { }

	get pAth() { return Promise.resolve(isWindows ? win32 : posix); }

	Async userHome() { return this.fAllbAckUserHome; }
	get resolvedUserHome() { return this.fAllbAckUserHome; }

	Async fileURI(pAth: string): Promise<URI> {
		return URI.file(pAth);
	}

	reAdonly defAultUriScheme = SchemAs.vscodeRemote;
}

export clAss TestTextFileEditorModelMAnAger extends TextFileEditorModelMAnAger {

	Add(resource: URI, model: TextFileEditorModel): void {
		return super.Add(resource, model);
	}

	remove(resource: URI): void {
		return super.remove(resource);
	}
}
