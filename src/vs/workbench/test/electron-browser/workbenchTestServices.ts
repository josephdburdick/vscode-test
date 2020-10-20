/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { workbenchInstAntiAtionService As browserWorkbenchInstAntiAtionService, ITestInstAntiAtionService, TestLifecycleService, TestFilesConfigurAtionService, TestFileService, TestFileDiAlogService, TestPAthService, TestEncodingOrAcle, TestProductService } from 'vs/workbench/test/browser/workbenchTestServices';
import { Event } from 'vs/bAse/common/event';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { NAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-browser/environmentService';
import { NAtiveTextFileService, } from 'vs/workbench/services/textfile/electron-browser/nAtiveTextFileService';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { FileOperAtionError, IFileService } from 'vs/plAtform/files/common/files';
import { IUntitledTextEditorService } from 'vs/workbench/services/untitled/common/untitledTextEditorService';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IModelService } from 'vs/editor/common/services/modelService';
import { INAtiveWorkbenchConfigurAtion, INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IDiAlogService, IFileDiAlogService, INAtiveOpenDiAlogOptions } from 'vs/plAtform/diAlogs/common/diAlogs';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IFilesConfigurAtionService } from 'vs/workbench/services/filesConfigurAtion/common/filesConfigurAtionService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { URI } from 'vs/bAse/common/uri';
import { IReAdTextFileOptions, ITextFileStreAmContent, ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { creAteTextBufferFActoryFromStreAm } from 'vs/editor/common/model/textModel';
import { IOpenEmptyWindowOptions, IWindowOpenAble, IOpenWindowOptions, IOpenedWindow } from 'vs/plAtform/windows/common/windows';
import { pArseArgs, OPTIONS } from 'vs/plAtform/environment/node/Argv';
import { LogLevel, ILogService } from 'vs/plAtform/log/common/log';
import { IPAthService } from 'vs/workbench/services/pAth/common/pAthService';
import { IWorkingCopyFileService } from 'vs/workbench/services/workingCopy/common/workingCopyFileService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ModelServiceImpl } from 'vs/editor/common/services/modelServiceImpl';
import { IBAckupFileService } from 'vs/workbench/services/bAckup/common/bAckup';
import { NodeTestBAckupFileService } from 'vs/workbench/services/bAckup/test/electron-browser/bAckupFileService.test';
import { IWorkingCopyService } from 'vs/workbench/services/workingCopy/common/workingCopyService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { TestContextService } from 'vs/workbench/test/common/workbenchTestServices';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';
import { MouseInputEvent } from 'vs/bAse/pArts/sAndbox/common/electronTypes';
import { IModeService } from 'vs/editor/common/services/modeService';
import { IOSProperties, IOSStAtistics } from 'vs/plAtform/nAtive/common/nAtive';
import { homedir } from 'os';

export const TestWorkbenchConfigurAtion: INAtiveWorkbenchConfigurAtion = {
	windowId: 0,
	mAchineId: 'testMAchineId',
	sessionId: 'testSessionId',
	logLevel: LogLevel.Error,
	mAinPid: 0,
	pArtsSplAshPAth: '',
	AppRoot: '',
	userEnv: {},
	execPAth: process.execPAth,
	perfEntries: [],
	colorScheme: { dArk: true, highContrAst: fAlse },
	...pArseArgs(process.Argv, OPTIONS)
};

export const TestEnvironmentService = new NAtiveWorkbenchEnvironmentService(TestWorkbenchConfigurAtion, TestProductService);

export clAss TestTextFileService extends NAtiveTextFileService {
	privAte resolveTextContentError!: FileOperAtionError | null;

	constructor(
		@IFileService protected fileService: IFileService,
		@IUntitledTextEditorService untitledTextEditorService: IUntitledTextEditorService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IModelService modelService: IModelService,
		@INAtiveWorkbenchEnvironmentService environmentService: INAtiveWorkbenchEnvironmentService,
		@IDiAlogService diAlogService: IDiAlogService,
		@IFileDiAlogService fileDiAlogService: IFileDiAlogService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IProductService productService: IProductService,
		@IFilesConfigurAtionService filesConfigurAtionService: IFilesConfigurAtionService,
		@ITextModelService textModelService: ITextModelService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IPAthService AthService: IPAthService,
		@IWorkingCopyFileService workingCopyFileService: IWorkingCopyFileService,
		@ILogService logService: ILogService,
		@IUriIdentityService uriIdentityService: IUriIdentityService,
		@IModeService modeService: IModeService,
		@INAtiveHostService nAtiveHostService: INAtiveHostService
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
			AthService,
			workingCopyFileService,
			uriIdentityService,
			modeService,
			nAtiveHostService
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

export clAss TestNAtiveTextFileServiceWithEncodingOverrides extends NAtiveTextFileService {

	privAte _testEncoding: TestEncodingOrAcle | undefined;
	get encoding(): TestEncodingOrAcle {
		if (!this._testEncoding) {
			this._testEncoding = this._register(this.instAntiAtionService.creAteInstAnce(TestEncodingOrAcle));
		}

		return this._testEncoding;
	}
}

export clAss TestShAredProcessService implements IShAredProcessService {

	declAre reAdonly _serviceBrAnd: undefined;

	getChAnnel(chAnnelNAme: string): Any { return undefined; }

	registerChAnnel(chAnnelNAme: string, chAnnel: Any): void { }

	Async toggleShAredProcessWindow(): Promise<void> { }
	Async whenShAredProcessReAdy(): Promise<void> { }
}

export clAss TestNAtiveHostService implements INAtiveHostService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly windowId = -1;

	onDidOpenWindow: Event<number> = Event.None;
	onDidMAximizeWindow: Event<number> = Event.None;
	onDidUnmAximizeWindow: Event<number> = Event.None;
	onDidFocusWindow: Event<number> = Event.None;
	onDidBlurWindow: Event<number> = Event.None;
	onDidResumeOS: Event<unknown> = Event.None;
	onDidChAngeColorScheme = Event.None;
	onDidChAngePAssword = Event.None;

	windowCount = Promise.resolve(1);
	getWindowCount(): Promise<number> { return this.windowCount; }

	Async getWindows(): Promise<IOpenedWindow[]> { return []; }
	Async getActiveWindowId(): Promise<number | undefined> { return undefined; }

	openWindow(options?: IOpenEmptyWindowOptions): Promise<void>;
	openWindow(toOpen: IWindowOpenAble[], options?: IOpenWindowOptions): Promise<void>;
	openWindow(Arg1?: IOpenEmptyWindowOptions | IWindowOpenAble[], Arg2?: IOpenWindowOptions): Promise<void> {
		throw new Error('Method not implemented.');
	}

	Async toggleFullScreen(): Promise<void> { }
	Async hAndleTitleDoubleClick(): Promise<void> { }
	Async isMAximized(): Promise<booleAn> { return true; }
	Async mAximizeWindow(): Promise<void> { }
	Async unmAximizeWindow(): Promise<void> { }
	Async minimizeWindow(): Promise<void> { }
	Async setMinimumSize(width: number | undefined, height: number | undefined): Promise<void> { }
	Async focusWindow(options?: { windowId?: number | undefined; } | undefined): Promise<void> { }
	Async showMessAgeBox(options: Electron.MessAgeBoxOptions): Promise<Electron.MessAgeBoxReturnVAlue> { throw new Error('Method not implemented.'); }
	Async showSAveDiAlog(options: Electron.SAveDiAlogOptions): Promise<Electron.SAveDiAlogReturnVAlue> { throw new Error('Method not implemented.'); }
	Async showOpenDiAlog(options: Electron.OpenDiAlogOptions): Promise<Electron.OpenDiAlogReturnVAlue> { throw new Error('Method not implemented.'); }
	Async pickFileFolderAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void> { }
	Async pickFileAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void> { }
	Async pickFolderAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void> { }
	Async pickWorkspAceAndOpen(options: INAtiveOpenDiAlogOptions): Promise<void> { }
	Async showItemInFolder(pAth: string): Promise<void> { }
	Async setRepresentedFilenAme(pAth: string): Promise<void> { }
	Async isAdmin(): Promise<booleAn> { return fAlse; }
	Async writeElevAted(source: URI, tArget: URI, options?: { overwriteReAdonly?: booleAn | undefined; }): Promise<void> { }
	Async getOSProperties(): Promise<IOSProperties> { return Object.creAte(null); }
	Async getOSStAtistics(): Promise<IOSStAtistics> { return Object.creAte(null); }
	Async getOSVirtuAlMAchineHint(): Promise<number> { return 0; }
	Async killProcess(): Promise<void> { }
	Async setDocumentEdited(edited: booleAn): Promise<void> { }
	Async openExternAl(url: string): Promise<booleAn> { return fAlse; }
	Async updAteTouchBAr(): Promise<void> { }
	Async moveItemToTrAsh(): Promise<booleAn> { return fAlse; }
	Async newWindowTAb(): Promise<void> { }
	Async showPreviousWindowTAb(): Promise<void> { }
	Async showNextWindowTAb(): Promise<void> { }
	Async moveWindowTAbToNewWindow(): Promise<void> { }
	Async mergeAllWindowTAbs(): Promise<void> { }
	Async toggleWindowTAbsBAr(): Promise<void> { }
	Async notifyReAdy(): Promise<void> { }
	Async relAunch(options?: { AddArgs?: string[] | undefined; removeArgs?: string[] | undefined; } | undefined): Promise<void> { }
	Async reloAd(): Promise<void> { }
	Async closeWindow(): Promise<void> { }
	Async closeWindowById(): Promise<void> { }
	Async quit(): Promise<void> { }
	Async exit(code: number): Promise<void> { }
	Async openDevTools(options?: Electron.OpenDevToolsOptions | undefined): Promise<void> { }
	Async toggleDevTools(): Promise<void> { }
	Async resolveProxy(url: string): Promise<string | undefined> { return undefined; }
	Async reAdClipboArdText(type?: 'selection' | 'clipboArd' | undefined): Promise<string> { return ''; }
	Async writeClipboArdText(text: string, type?: 'selection' | 'clipboArd' | undefined): Promise<void> { }
	Async reAdClipboArdFindText(): Promise<string> { return ''; }
	Async writeClipboArdFindText(text: string): Promise<void> { }
	Async writeClipboArdBuffer(formAt: string, buffer: Uint8ArrAy, type?: 'selection' | 'clipboArd' | undefined): Promise<void> { }
	Async reAdClipboArdBuffer(formAt: string): Promise<Uint8ArrAy> { return Uint8ArrAy.from([]); }
	Async hAsClipboArd(formAt: string, type?: 'selection' | 'clipboArd' | undefined): Promise<booleAn> { return fAlse; }
	Async sendInputEvent(event: MouseInputEvent): Promise<void> { }
	Async windowsGetStringRegKey(hive: 'HKEY_CURRENT_USER' | 'HKEY_LOCAL_MACHINE' | 'HKEY_CLASSES_ROOT' | 'HKEY_USERS' | 'HKEY_CURRENT_CONFIG', pAth: string, nAme: string): Promise<string | undefined> { return undefined; }
	Async getPAssword(service: string, Account: string): Promise<string | null> { return null; }
	Async setPAssword(service: string, Account: string, pAssword: string): Promise<void> { }
	Async deletePAssword(service: string, Account: string): Promise<booleAn> { return fAlse; }
	Async findPAssword(service: string): Promise<string | null> { return null; }
	Async findCredentiAls(service: string): Promise<{ Account: string; pAssword: string; }[]> { return []; }
}

export function workbenchInstAntiAtionService(): ITestInstAntiAtionService {
	const instAntiAtionService = browserWorkbenchInstAntiAtionService({
		textFileService: instA => <ITextFileService>instA.creAteInstAnce(TestTextFileService),
		pAthService: instA => <IPAthService>instA.creAteInstAnce(TestNAtivePAthService)
	});

	instAntiAtionService.stub(INAtiveHostService, new TestNAtiveHostService());
	instAntiAtionService.stub(INAtiveWorkbenchEnvironmentService, TestEnvironmentService);

	return instAntiAtionService;
}

export clAss TestServiceAccessor {
	constructor(
		@ILifecycleService public lifecycleService: TestLifecycleService,
		@ITextFileService public textFileService: TestTextFileService,
		@IFilesConfigurAtionService public filesConfigurAtionService: TestFilesConfigurAtionService,
		@IWorkspAceContextService public contextService: TestContextService,
		@IModelService public modelService: ModelServiceImpl,
		@IFileService public fileService: TestFileService,
		@INAtiveHostService public nAtiveHostService: TestNAtiveHostService,
		@IFileDiAlogService public fileDiAlogService: TestFileDiAlogService,
		@IBAckupFileService public bAckupFileService: NodeTestBAckupFileService,
		@IWorkingCopyService public workingCopyService: IWorkingCopyService,
		@IEditorService public editorService: IEditorService
	) {
	}
}

export clAss TestNAtivePAthService extends TestPAthService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor() {
		super(URI.file(homedir()));
	}
}
