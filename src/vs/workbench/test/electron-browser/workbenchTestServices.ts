/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workBenchInstantiationService as BrowserWorkBenchInstantiationService, ITestInstantiationService, TestLifecycleService, TestFilesConfigurationService, TestFileService, TestFileDialogService, TestPathService, TestEncodingOracle, TestProductService } from 'vs/workBench/test/Browser/workBenchTestServices';
import { Event } from 'vs/Base/common/event';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { NativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-Browser/environmentService';
import { NativeTextFileService, } from 'vs/workBench/services/textfile/electron-Browser/nativeTextFileService';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { FileOperationError, IFileService } from 'vs/platform/files/common/files';
import { IUntitledTextEditorService } from 'vs/workBench/services/untitled/common/untitledTextEditorService';
import { ILifecycleService } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IModelService } from 'vs/editor/common/services/modelService';
import { INativeWorkBenchConfiguration, INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IDialogService, IFileDialogService, INativeOpenDialogOptions } from 'vs/platform/dialogs/common/dialogs';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { IProductService } from 'vs/platform/product/common/productService';
import { IFilesConfigurationService } from 'vs/workBench/services/filesConfiguration/common/filesConfigurationService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { URI } from 'vs/Base/common/uri';
import { IReadTextFileOptions, ITextFileStreamContent, ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { createTextBufferFactoryFromStream } from 'vs/editor/common/model/textModel';
import { IOpenEmptyWindowOptions, IWindowOpenaBle, IOpenWindowOptions, IOpenedWindow } from 'vs/platform/windows/common/windows';
import { parseArgs, OPTIONS } from 'vs/platform/environment/node/argv';
import { LogLevel, ILogService } from 'vs/platform/log/common/log';
import { IPathService } from 'vs/workBench/services/path/common/pathService';
import { IWorkingCopyFileService } from 'vs/workBench/services/workingCopy/common/workingCopyFileService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IBackupFileService } from 'vs/workBench/services/Backup/common/Backup';
import { NodeTestBackupFileService } from 'vs/workBench/services/Backup/test/electron-Browser/BackupFileService.test';
import { IWorkingCopyService } from 'vs/workBench/services/workingCopy/common/workingCopyService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { TestContextService } from 'vs/workBench/test/common/workBenchTestServices';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';
import { MouseInputEvent } from 'vs/Base/parts/sandBox/common/electronTypes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IOSProperties, IOSStatistics } from 'vs/platform/native/common/native';
import { homedir } from 'os';

export const TestWorkBenchConfiguration: INativeWorkBenchConfiguration = {
	windowId: 0,
	machineId: 'testMachineId',
	sessionId: 'testSessionId',
	logLevel: LogLevel.Error,
	mainPid: 0,
	partsSplashPath: '',
	appRoot: '',
	userEnv: {},
	execPath: process.execPath,
	perfEntries: [],
	colorScheme: { dark: true, highContrast: false },
	...parseArgs(process.argv, OPTIONS)
};

export const TestEnvironmentService = new NativeWorkBenchEnvironmentService(TestWorkBenchConfiguration, TestProductService);

export class TestTextFileService extends NativeTextFileService {
	private resolveTextContentError!: FileOperationError | null;

	constructor(
		@IFileService protected fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IModelService modelService: IModelService,
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IDialogService dialogService: IDialogService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IProductService productService: IProductService,
		@IFilesConfigurationService filesConfigurationService: IFilesConfigurationService,
		@ITextModelService textModelService: ITextModelService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPathService athService: IPathService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@ILogService logService: ILogService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IModeService modeService: IModeService,
		@INativeHostService nativeHostService: INativeHostService
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
			athService,
			workingCopyFileService,
			uriIdentityService,
			modeService,
			nativeHostService
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

export class TestNativeTextFileServiceWithEncodingOverrides extends NativeTextFileService {

	private _testEncoding: TestEncodingOracle | undefined;
	get encoding(): TestEncodingOracle {
		if (!this._testEncoding) {
			this._testEncoding = this._register(this.instantiationService.createInstance(TestEncodingOracle));
		}

		return this._testEncoding;
	}
}

export class TestSharedProcessService implements ISharedProcessService {

	declare readonly _serviceBrand: undefined;

	getChannel(channelName: string): any { return undefined; }

	registerChannel(channelName: string, channel: any): void { }

	async toggleSharedProcessWindow(): Promise<void> { }
	async whenSharedProcessReady(): Promise<void> { }
}

export class TestNativeHostService implements INativeHostService {

	declare readonly _serviceBrand: undefined;

	readonly windowId = -1;

	onDidOpenWindow: Event<numBer> = Event.None;
	onDidMaximizeWindow: Event<numBer> = Event.None;
	onDidUnmaximizeWindow: Event<numBer> = Event.None;
	onDidFocusWindow: Event<numBer> = Event.None;
	onDidBlurWindow: Event<numBer> = Event.None;
	onDidResumeOS: Event<unknown> = Event.None;
	onDidChangeColorScheme = Event.None;
	onDidChangePassword = Event.None;

	windowCount = Promise.resolve(1);
	getWindowCount(): Promise<numBer> { return this.windowCount; }

	async getWindows(): Promise<IOpenedWindow[]> { return []; }
	async getActiveWindowId(): Promise<numBer | undefined> { return undefined; }

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenaBle[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(arg1?: IOpenEmptyWindowOptions | IWindowOpenaBle[], arg2?: IOpenWindowOptions): Promise<void> {
		throw new Error('Method not implemented.');
	}

	async toggleFullScreen(): Promise<void> { }
	async handleTitleDouBleClick(): Promise<void> { }
	async isMaximized(): Promise<Boolean> { return true; }
	async maximizeWindow(): Promise<void> { }
	async unmaximizeWindow(): Promise<void> { }
	async minimizeWindow(): Promise<void> { }
	async setMinimumSize(width: numBer | undefined, height: numBer | undefined): Promise<void> { }
	async focusWindow(options?: { windowId?: numBer | undefined; } | undefined): Promise<void> { }
	async showMessageBox(options: Electron.MessageBoxOptions): Promise<Electron.MessageBoxReturnValue> { throw new Error('Method not implemented.'); }
	async showSaveDialog(options: Electron.SaveDialogOptions): Promise<Electron.SaveDialogReturnValue> { throw new Error('Method not implemented.'); }
	async showOpenDialog(options: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> { throw new Error('Method not implemented.'); }
	async pickFileFolderAndOpen(options: INativeOpenDialogOptions): Promise<void> { }
	async pickFileAndOpen(options: INativeOpenDialogOptions): Promise<void> { }
	async pickFolderAndOpen(options: INativeOpenDialogOptions): Promise<void> { }
	async pickWorkspaceAndOpen(options: INativeOpenDialogOptions): Promise<void> { }
	async showItemInFolder(path: string): Promise<void> { }
	async setRepresentedFilename(path: string): Promise<void> { }
	async isAdmin(): Promise<Boolean> { return false; }
	async writeElevated(source: URI, target: URI, options?: { overwriteReadonly?: Boolean | undefined; }): Promise<void> { }
	async getOSProperties(): Promise<IOSProperties> { return OBject.create(null); }
	async getOSStatistics(): Promise<IOSStatistics> { return OBject.create(null); }
	async getOSVirtualMachineHint(): Promise<numBer> { return 0; }
	async killProcess(): Promise<void> { }
	async setDocumentEdited(edited: Boolean): Promise<void> { }
	async openExternal(url: string): Promise<Boolean> { return false; }
	async updateTouchBar(): Promise<void> { }
	async moveItemToTrash(): Promise<Boolean> { return false; }
	async newWindowTaB(): Promise<void> { }
	async showPreviousWindowTaB(): Promise<void> { }
	async showNextWindowTaB(): Promise<void> { }
	async moveWindowTaBToNewWindow(): Promise<void> { }
	async mergeAllWindowTaBs(): Promise<void> { }
	async toggleWindowTaBsBar(): Promise<void> { }
	async notifyReady(): Promise<void> { }
	async relaunch(options?: { addArgs?: string[] | undefined; removeArgs?: string[] | undefined; } | undefined): Promise<void> { }
	async reload(): Promise<void> { }
	async closeWindow(): Promise<void> { }
	async closeWindowById(): Promise<void> { }
	async quit(): Promise<void> { }
	async exit(code: numBer): Promise<void> { }
	async openDevTools(options?: Electron.OpenDevToolsOptions | undefined): Promise<void> { }
	async toggleDevTools(): Promise<void> { }
	async resolveProxy(url: string): Promise<string | undefined> { return undefined; }
	async readClipBoardText(type?: 'selection' | 'clipBoard' | undefined): Promise<string> { return ''; }
	async writeClipBoardText(text: string, type?: 'selection' | 'clipBoard' | undefined): Promise<void> { }
	async readClipBoardFindText(): Promise<string> { return ''; }
	async writeClipBoardFindText(text: string): Promise<void> { }
	async writeClipBoardBuffer(format: string, Buffer: Uint8Array, type?: 'selection' | 'clipBoard' | undefined): Promise<void> { }
	async readClipBoardBuffer(format: string): Promise<Uint8Array> { return Uint8Array.from([]); }
	async hasClipBoard(format: string, type?: 'selection' | 'clipBoard' | undefined): Promise<Boolean> { return false; }
	async sendInputEvent(event: MouseInputEvent): Promise<void> { }
	async windowsGetStringRegKey(hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', path: string, name: string): Promise<string | undefined> { return undefined; }
	async getPassword(service: string, account: string): Promise<string | null> { return null; }
	async setPassword(service: string, account: string, password: string): Promise<void> { }
	async deletePassword(service: string, account: string): Promise<Boolean> { return false; }
	async findPassword(service: string): Promise<string | null> { return null; }
	async findCredentials(service: string): Promise<{ account: string; password: string; }[]> { return []; }
}

export function workBenchInstantiationService(): ITestInstantiationService {
	const instantiationService = BrowserWorkBenchInstantiationService({
		textFileService: insta => <ITextFileService>insta.createInstance(TestTextFileService),
		pathService: insta => <IPathService>insta.createInstance(TestNativePathService)
	});

	instantiationService.stuB(INativeHostService, new TestNativeHostService());
	instantiationService.stuB(INativeWorkBenchEnvironmentService, TestEnvironmentService);

	return instantiationService;
}

export class TestServiceAccessor {
	constructor(
		@ILifecycleService puBlic lifecycleService: TestLifecycleService,
		@ITextFileService puBlic textFileService: TestTextFileService,
		@IFilesConfigurationService puBlic filesConfigurationService: TestFilesConfigurationService,
		@IWorkspaceContextService puBlic contextService: TestContextService,
		@IModelService puBlic modelService: ModelServiceImpl,
		@IFileService puBlic fileService: TestFileService,
		@INativeHostService puBlic nativeHostService: TestNativeHostService,
		@IFileDialogService puBlic fileDialogService: TestFileDialogService,
		@IBackupFileService puBlic BackupFileService: NodeTestBackupFileService,
		@IWorkingCopyService puBlic workingCopyService: IWorkingCopyService,
		@IEditorService puBlic editorService: IEditorService
	) {
	}
}

export class TestNativePathService extends TestPathService {

	declare readonly _serviceBrand: undefined;

	constructor() {
		super(URI.file(homedir()));
	}
}
