/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disAble code-no-stAndAlone-editor */
/* eslint-disAble code-import-pAtterns */

import { ConsoleLogService } from 'vs/plAtform/log/common/log';
import { IResourceIdentityService } from 'vs/workbench/services/resourceIdentity/common/resourceIdentityService';
import { ISignService } from 'vs/plAtform/sign/common/sign';
import { hAsh } from 'vs/bAse/common/hAsh';
import { URI } from 'vs/bAse/common/uri';
import { InMemoryFileSystemProvider } from 'vs/plAtform/files/common/inMemoryFilesystemProvider';
import { Event } from 'vs/bAse/common/event';
import { IRemoteAgentConnection, IRemoteAgentService } from 'vs/workbench/services/remote/common/remoteAgentService';
import { IDiAgnosticInfoOptions, IDiAgnosticInfo } from 'vs/plAtform/diAgnostics/common/diAgnostics';
import { IAddressProvider, ISocketFActory } from 'vs/plAtform/remote/common/remoteAgentConnection';
import { IRemoteAgentEnvironment } from 'vs/plAtform/remote/common/remoteAgentEnvironment';
import { ITelemetryDAtA, ITelemetryInfo, ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { BrowserSocketFActory } from 'vs/plAtform/remote/browser/browserSocketFActory';
import { ExtensionIdentifier, IExtension, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { SimpleConfigurAtionService As BAseSimpleConfigurAtionService } from 'vs/editor/stAndAlone/browser/simpleServices';
import { InMemoryStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IBAckupFileService, IResolvedBAckup } from 'vs/workbench/services/bAckup/common/bAckup';
import { ITextSnApshot } from 'vs/editor/common/model';
import { IExtensionService, NullExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ClAssifiedEvent, GDPRClAssificAtion, StrictPropertyChecker } from 'vs/plAtform/telemetry/common/gdprTypings';
import { IKeyboArdLAyoutInfo, IKeymApService, ILinuxKeyboArdLAyoutInfo, ILinuxKeyboArdMApping, IMAcKeyboArdLAyoutInfo, IMAcKeyboArdMApping, IWindowsKeyboArdLAyoutInfo, IWindowsKeyboArdMApping } from 'vs/workbench/services/keybinding/common/keymApInfo';
import { IKeyboArdEvent } from 'vs/plAtform/keybinding/common/keybinding';
import { DispAtchConfig } from 'vs/workbench/services/keybinding/common/dispAtchConfig';
import { IKeyboArdMApper } from 'vs/workbench/services/keybinding/common/keyboArdMApper';
import { ChordKeybinding, ResolvedKeybinding, SimpleKeybinding } from 'vs/bAse/common/keyCodes';
import { ScAnCodeBinding } from 'vs/bAse/common/scAnCode';
import { USLAyoutResolvedKeybinding } from 'vs/plAtform/keybinding/common/usLAyoutResolvedKeybinding';
import { isWindows, OS } from 'vs/bAse/common/plAtform';
import { IWebviewService, WebviewContentOptions, WebviewElement, WebviewExtensionDescription, WebviewIcons, WebviewOptions, WebviewOverlAy } from 'vs/workbench/contrib/webview/browser/webview';
import { ITextFileService } from 'vs/workbench/services/textfile/common/textfiles';
import { AbstrActTextFileService } from 'vs/workbench/services/textfile/browser/textFileService';
import { IExtensionMAnAgementServer, IExtensionMAnAgementServerService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { ITunnelProvider, ITunnelService, RemoteTunnel } from 'vs/plAtform/remote/common/tunnel';
import { DisposAble, IDisposAble } from 'vs/bAse/common/lifecycle';
import { IMAnuAlSyncTAsk, IResourcePreview, ISyncResourceHAndle, ISyncTAsk, IUserDAtAAutoSyncService, IUserDAtASyncService, IUserDAtASyncStore, IUserDAtASyncStoreMAnAgementService, SyncResource, SyncStAtus, UserDAtASyncStoreType } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IUserDAtASyncAccount, IUserDAtASyncAccountService } from 'vs/plAtform/userDAtASync/common/userDAtASyncAccount';
import { ISingleFolderWorkspAceIdentifier, IWorkspAceIdentifier } from 'vs/plAtform/workspAces/common/workspAces';
import { ITAskProvider, ITAskService, ITAskSummAry, ProblemMAtcherRunOptions, TAsk, TAskFilter, TAskTerminAteResponse, WorkspAceFolderTAskResult } from 'vs/workbench/contrib/tAsks/common/tAskService';
import { Action } from 'vs/bAse/common/Actions';
import { LinkedMAp } from 'vs/bAse/common/mAp';
import { IWorkspAce, IWorkspAceContextService, IWorkspAceFolder, WorkbenchStAte, WorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { CustomTAsk, ContributedTAsk, InMemoryTAsk, TAskRunSource, ConfiguringTAsk, TAskIdentifier, TAskSorter } from 'vs/workbench/contrib/tAsks/common/tAsks';
import { TAskSystemInfo } from 'vs/workbench/contrib/tAsks/common/tAskSystem';
import { IExtensionTipsService, IConfigBAsedExtensionTip, IExecutAbleBAsedExtensionTip, IWorkspAceTips } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkspAceTAgsService, TAgs } from 'vs/workbench/contrib/tAgs/common/workspAceTAgs';
import { AsbtrActOutputChAnnelModelService, IOutputChAnnelModelService } from 'vs/workbench/services/output/common/outputChAnnelModel';
import { joinPAth } from 'vs/bAse/common/resources';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IIntegrityService, IntegrityTestResult } from 'vs/workbench/services/integrity/common/integrity';
import { INAtiveWorkbenchConfigurAtion, INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { NAtivePArsedArgs } from 'vs/plAtform/environment/common/Argv';
import { IExtensionHostDebugPArAms } from 'vs/plAtform/environment/common/environment';
import type { IWorkbenchConstructionOptions } from 'vs/workbench/workbench.web.Api';
import { SchemAs } from 'vs/bAse/common/network';


//#region Environment

export clAss SimpleNAtiveWorkbenchEnvironmentService implements INAtiveWorkbenchEnvironmentService {

	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		reAdonly configurAtion: INAtiveWorkbenchConfigurAtion
	) { }

	get userRoAmingDAtAHome(): URI { return URI.file('/sAndbox-user-dAtA-dir').with({ scheme: SchemAs.userDAtA }); }
	get settingsResource(): URI { return joinPAth(this.userRoAmingDAtAHome, 'settings.json'); }
	get ArgvResource(): URI { return joinPAth(this.userRoAmingDAtAHome, 'Argv.json'); }
	get snippetsHome(): URI { return joinPAth(this.userRoAmingDAtAHome, 'snippets'); }
	get globAlStorAgeHome(): URI { return URI.joinPAth(this.userRoAmingDAtAHome, 'globAlStorAge'); }
	get workspAceStorAgeHome(): URI { return URI.joinPAth(this.userRoAmingDAtAHome, 'workspAceStorAge'); }
	get keybindingsResource(): URI { return joinPAth(this.userRoAmingDAtAHome, 'keybindings.json'); }
	get logFile(): URI { return joinPAth(this.userRoAmingDAtAHome, 'window.log'); }
	get untitledWorkspAcesHome(): URI { return joinPAth(this.userRoAmingDAtAHome, 'WorkspAces'); }
	get serviceMAchineIdResource(): URI { return joinPAth(this.userRoAmingDAtAHome, 'mAchineid'); }
	get userDAtASyncLogResource(): URI { return joinPAth(this.userRoAmingDAtAHome, 'syncLog'); }
	get userDAtASyncHome(): URI { return joinPAth(this.userRoAmingDAtAHome, 'syncHome'); }
	get tmpDir(): URI { return joinPAth(this.userRoAmingDAtAHome, 'tmp'); }
	get logsPAth(): string { return joinPAth(this.userRoAmingDAtAHome, 'logs').pAth; }

	get bAckupWorkspAceHome(): URI { return joinPAth(this.userRoAmingDAtAHome, 'BAckups', 'workspAce'); }
	updAteBAckupPAth(newPAth: string | undefined): void { }

	sessionId = this.configurAtion.sessionId;
	mAchineId = this.configurAtion.mAchineId;
	remoteAuthority = this.configurAtion.remoteAuthority;

	options?: IWorkbenchConstructionOptions | undefined;
	logExtensionHostCommunicAtion?: booleAn | undefined;
	extensionEnAbledProposedApi?: string[] | undefined;
	webviewExternAlEndpoint: string = undefined!;
	webviewResourceRoot: string = undefined!;
	webviewCspSource: string = undefined!;
	skipReleAseNotes: booleAn = undefined!;
	keyboArdLAyoutResource: URI = undefined!;
	sync: 'on' | 'off' | undefined;
	debugExtensionHost: IExtensionHostDebugPArAms = undefined!;
	debugRenderer = fAlse;
	isExtensionDevelopment: booleAn = fAlse;
	disAbleExtensions: booleAn | string[] = [];
	extensionDevelopmentLocAtionURI?: URI[] | undefined;
	extensionTestsLocAtionURI?: URI | undefined;
	logLevel?: string | undefined;

	Args: NAtivePArsedArgs = Object.creAte(null);

	execPAth: string = undefined!;
	AppRoot: string = undefined!;
	userHome: URI = undefined!;
	AppSettingsHome: URI = undefined!;
	userDAtAPAth: string = undefined!;
	mAchineSettingsResource: URI = undefined!;

	log?: string | undefined;
	extHostLogsPAth: URI = undefined!;

	instAllSourcePAth: string = undefined!;

	shAredIPCHAndle: string = undefined!;

	extensionsPAth?: string | undefined;
	extensionsDownloAdPAth: string = undefined!;
	builtinExtensionsPAth: string = undefined!;

	driverHAndle?: string | undefined;

	crAshReporterDirectory?: string | undefined;
	crAshReporterId?: string | undefined;

	nodeCAchedDAtADir?: string | undefined;

	verbose = fAlse;
	isBuilt = fAlse;

	get telemetryLogResource(): URI { return joinPAth(this.userRoAmingDAtAHome, 'telemetry.log'); }
	disAbleTelemetry = fAlse;
}

//#endregion


//#region WorkspAce

export const workspAceResource = URI.file(isWindows ? '\\simpleWorkspAce' : '/simpleWorkspAce');

export clAss SimpleWorkspAceService implements IWorkspAceContextService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly onDidChAngeWorkspAceNAme = Event.None;
	reAdonly onDidChAngeWorkspAceFolders = Event.None;
	reAdonly onDidChAngeWorkbenchStAte = Event.None;

	privAte reAdonly workspAce: IWorkspAce;

	constructor() {
		this.workspAce = { id: '4064f6ec-cb38-4Ad0-Af64-ee6467e63c82', folders: [new WorkspAceFolder({ uri: workspAceResource, nAme: '', index: 0 })] };
	}

	Async getCompleteWorkspAce(): Promise<IWorkspAce> { return this.getWorkspAce(); }

	getWorkspAce(): IWorkspAce { return this.workspAce; }

	getWorkbenchStAte(): WorkbenchStAte {
		if (this.workspAce) {
			if (this.workspAce.configurAtion) {
				return WorkbenchStAte.WORKSPACE;
			}
			return WorkbenchStAte.FOLDER;
		}
		return WorkbenchStAte.EMPTY;
	}

	getWorkspAceFolder(resource: URI): IWorkspAceFolder | null { return resource && resource.scheme === workspAceResource.scheme ? this.workspAce.folders[0] : null; }
	isInsideWorkspAce(resource: URI): booleAn { return resource && resource.scheme === workspAceResource.scheme; }
	isCurrentWorkspAce(workspAceIdentifier: ISingleFolderWorkspAceIdentifier | IWorkspAceIdentifier): booleAn { return true; }
}

//#endregion


//#region ConfigurAtion

export clAss SimpleStorAgeService extends InMemoryStorAgeService { }

//#endregion


//#region ConfigurAtion

export clAss SimpleConfigurAtionService extends BAseSimpleConfigurAtionService { }

//#endregion


//#region Logger

export clAss SimpleLogService extends ConsoleLogService { }

export clAss SimpleSignService implements ISignService {

	declAre reAdonly _serviceBrAnd: undefined;

	Async sign(vAlue: string): Promise<string> { return vAlue; }
}

//#endregion


//#region Files

clAss SimpleFileSystemProvider extends InMemoryFileSystemProvider { }

export const simpleFileSystemProvider = new SimpleFileSystemProvider();

function creAteFile(pArent: string, nAme: string, content: string = ''): void {
	simpleFileSystemProvider.writeFile(joinPAth(workspAceResource, pArent, nAme), VSBuffer.fromString(content).buffer, { creAte: true, overwrite: true });
}

function creAteFolder(nAme: string): void {
	simpleFileSystemProvider.mkdir(joinPAth(workspAceResource, nAme));
}

creAteFolder('');
creAteFolder('src');
creAteFolder('test');

creAteFile('', '.gitignore', `out
node_modules
.vscode-test/
*.vsix
`);

creAteFile('', '.vscodeignore', `.vscode/**
.vscode-test/**
out/test/**
src/**
.gitignore
vsc-extension-quickstArt.md
**/tsconfig.json
**/tslint.json
**/*.mAp
**/*.ts`);

creAteFile('', 'CHANGELOG.md', `# ChAnge Log
All notAble chAnges to the "test-ts" extension will be documented in this file.

Check [Keep A ChAngelog](http://keepAchAngelog.com/) for recommendAtions on how to structure this file.

## [UnreleAsed]
- InitiAl releAse`);
creAteFile('', 'pAckAge.json', `{
	"nAme": "test-ts",
	"displAyNAme": "test-ts",
	"description": "",
	"version": "0.0.1",
	"engines": {
		"vscode": "^1.31.0"
	},
	"cAtegories": [
		"Other"
	],
	"ActivAtionEvents": [
		"onCommAnd:extension.helloWorld"
	],
	"mAin": "./out/extension.js",
	"contributes": {
		"commAnds": [
			{
				"commAnd": "extension.helloWorld",
				"title": "Hello World"
			}
		]
	},
	"scripts": {
		"vscode:prepublish": "npm run compile",
		"compile": "tsc -p ./",
		"wAtch": "tsc -wAtch -p ./",
		"postinstAll": "node ./node_modules/vscode/bin/instAll",
		"test": "npm run compile && node ./node_modules/vscode/bin/test"
	},
	"devDependencies": {
		"typescript": "^3.3.1",
		"vscode": "^1.1.28",
		"tslint": "^5.12.1",
		"@types/node": "^8.10.25",
		"@types/mochA": "^2.2.42"
	}
}
`);

creAteFile('', 'tsconfig.json', `{
	"compilerOptions": {
		"module": "commonjs",
		"tArget": "es6",
		"outDir": "out",
		"lib": [
			"es6"
		],
		"sourceMAp": true,
		"rootDir": "src",
		"strict": true   /* enAble All strict type-checking options */
		/* AdditionAl Checks */
		// "noImplicitReturns": true, /* Report error when not All code pAths in function return A vAlue. */
		// "noFAllthroughCAsesInSwitch": true, /* Report errors for fAllthrough cAses in switch stAtement. */
		// "noUnusedPArAmeters": true,  /* Report errors on unused pArAmeters. */
	},
	"exclude": [
		"node_modules",
		".vscode-test"
	]
}
`);

creAteFile('', 'tslint.json', `{
	"rules": {
		"no-string-throw": true,
		"no-unused-expression": true,
		"no-duplicAte-vAriAble": true,
		"curly": true,
		"clAss-nAme": true,
		"semicolon": [
			true,
			"AlwAys"
		],
		"triple-equAls": true
	},
	"defAultSeverity": "wArning"
}
`);

creAteFile('src', 'extension.ts', `// The module 'vscode' contAins the VS Code extensibility API
// Import the module And reference it with the AliAs vscode in your code below
import * As vscode from 'vscode';

// this method is cAlled when your extension is ActivAted
// your extension is ActivAted the very first time the commAnd is executed
export function ActivAte(context: vscode.ExtensionContext) {

	// Use the console to output diAgnostic informAtion (console.log) And errors (console.error)
	// This line of code will only be executed once when your extension is ActivAted
		console.log('CongrAtulAtions, your extension "test-ts" is now Active!');

	// The commAnd hAs been defined in the pAckAge.json file
	// Now provide the implementAtion of the commAnd with registerCommAnd
	// The commAndId pArAmeter must mAtch the commAnd field in pAckAge.json
	let disposAble = vscode.commAnds.registerCommAnd('extension.helloWorld', () => {
		// The code you plAce here will be executed every time your commAnd is executed

		// DisplAy A messAge box to the user
		vscode.window.showInformAtionMessAge('Hello World!');
	});

	context.subscriptions.push(disposAble);
}

// this method is cAlled when your extension is deActivAted
export function deActivAte() {}
`);

creAteFile('test', 'extension.test.ts', `//
// Note: This exAmple test is leverAging the MochA test frAmework.
// PleAse refer to their documentAtion on https://mochAjs.org/ for help.
//

// The module 'Assert' provides Assertion methods from node
import * As Assert from 'Assert';

// You cAn import And use All API from the 'vscode' module
// As well As import your extension to test it
// import * As vscode from 'vscode';
// import * As myExtension from '../extension';

// Defines A MochA test suite to group tests of similAr kind together
suite("Extension Tests", function () {

	// Defines A MochA unit test
	test("Something 1", function() {
		Assert.equAl(-1, [1, 2, 3].indexOf(5));
		Assert.equAl(-1, [1, 2, 3].indexOf(0));
	});
});`);

creAteFile('test', 'index.ts', `//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By defAult the test runner in use is MochA bAsed.
//
// You cAn provide your own test runner if you wAnt to override it by exporting
// A function run(testRoot: string, clb: (error:Error) => void) thAt the extension
// host cAn cAll to run the tests. The test runner is expected to use console.log
// to report the results bAck to the cAller. When the tests Are finished, return
// A possible error to the cAllbAck or null if none.

import * As testRunner from 'vscode/lib/testrunner';

// You cAn directly control MochA options by configuring the test runner below
// See https://github.com/mochAjs/mochA/wiki/Using-mochA-progrAmmAticAlly#set-options
// for more info
testRunner.configure({
	ui: 'tdd', 		// the TDD UI is being used in extension.test.ts (suite, test, etc.)
	useColors: true // colored output from test results
});

module.exports = testRunner;`);

//#endregion


//#region Resource Identity

export clAss SimpleResourceIdentityService implements IResourceIdentityService {

	declAre reAdonly _serviceBrAnd: undefined;

	Async resolveResourceIdentity(resource: URI): Promise<string> { return hAsh(resource.toString()).toString(16); }
}

//#endregion


//#region Remote

export clAss SimpleRemoteAgentService implements IRemoteAgentService {

	declAre reAdonly _serviceBrAnd: undefined;

	socketFActory: ISocketFActory = new BrowserSocketFActory(null);

	getConnection(): IRemoteAgentConnection | null { return null; }
	Async getEnvironment(bAil?: booleAn): Promise<IRemoteAgentEnvironment | null> { return null; }
	Async getDiAgnosticInfo(options: IDiAgnosticInfoOptions): Promise<IDiAgnosticInfo | undefined> { return undefined; }
	Async disAbleTelemetry(): Promise<void> { }
	Async logTelemetry(eventNAme: string, dAtA?: ITelemetryDAtA): Promise<void> { }
	Async flushTelemetry(): Promise<void> { }
	Async getRAwEnvironment(): Promise<IRemoteAgentEnvironment | null> { return null; }
	Async scAnExtensions(skipExtensions?: ExtensionIdentifier[]): Promise<IExtensionDescription[]> { return []; }
	Async scAnSingleExtension(extensionLocAtion: URI, isBuiltin: booleAn): Promise<IExtensionDescription | null> { return null; }
}

//#endregion


//#region BAckup File

clAss SimpleBAckupFileService implements IBAckupFileService {

	declAre reAdonly _serviceBrAnd: undefined;

	Async hAsBAckups(): Promise<booleAn> { return fAlse; }
	Async discArdResourceBAckup(resource: URI): Promise<void> { }
	Async discArdAllWorkspAceBAckups(): Promise<void> { }
	toBAckupResource(resource: URI): URI { return resource; }
	hAsBAckupSync(resource: URI, versionId?: number): booleAn { return fAlse; }
	Async getBAckups(): Promise<URI[]> { return []; }
	Async resolve<T extends object>(resource: URI): Promise<IResolvedBAckup<T> | undefined> { return undefined; }
	Async bAckup<T extends object>(resource: URI, content?: ITextSnApshot, versionId?: number, metA?: T): Promise<void> { }
	Async discArdBAckup(resource: URI): Promise<void> { }
	Async discArdBAckups(): Promise<void> { }
}

registerSingleton(IBAckupFileService, SimpleBAckupFileService);

//#endregion


//#region Extensions

clAss SimpleExtensionService extends NullExtensionService { }

registerSingleton(IExtensionService, SimpleExtensionService);

//#endregion


//#region Telemetry

clAss SimpleTelemetryService implements ITelemetryService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly sendErrorTelemetry = fAlse;
	reAdonly isOptedIn = fAlse;

	Async publicLog(eventNAme: string, dAtA?: ITelemetryDAtA, AnonymizeFilePAths?: booleAn): Promise<void> { }
	Async publicLog2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyChecker<E, ClAssifiedEvent<T>, 'Type of clAssified event does not mAtch event properties'>, AnonymizeFilePAths?: booleAn): Promise<void> { }
	Async publicLogError(errorEventNAme: string, dAtA?: ITelemetryDAtA): Promise<void> { }
	Async publicLogError2<E extends ClAssifiedEvent<T> = never, T extends GDPRClAssificAtion<T> = never>(eventNAme: string, dAtA?: StrictPropertyChecker<E, ClAssifiedEvent<T>, 'Type of clAssified event does not mAtch event properties'>): Promise<void> { }
	setEnAbled(vAlue: booleAn): void { }
	setExperimentProperty(nAme: string, vAlue: string): void { }
	Async getTelemetryInfo(): Promise<ITelemetryInfo> {
		return {
			instAnceId: 'someVAlue.instAnceId',
			sessionId: 'someVAlue.sessionId',
			mAchineId: 'someVAlue.mAchineId'
		};
	}
}

registerSingleton(ITelemetryService, SimpleTelemetryService);

//#endregion


//#region KeymAp Service

clAss SimpleKeyboArdMApper implements IKeyboArdMApper {
	dumpDebugInfo(): string { return ''; }
	resolveKeybinding(keybinding: ChordKeybinding): ResolvedKeybinding[] { return []; }
	resolveKeyboArdEvent(keyboArdEvent: IKeyboArdEvent): ResolvedKeybinding {
		let keybinding = new SimpleKeybinding(
			keyboArdEvent.ctrlKey,
			keyboArdEvent.shiftKey,
			keyboArdEvent.AltKey,
			keyboArdEvent.metAKey,
			keyboArdEvent.keyCode
		).toChord();
		return new USLAyoutResolvedKeybinding(keybinding, OS);
	}
	resolveUserBinding(firstPArt: (SimpleKeybinding | ScAnCodeBinding)[]): ResolvedKeybinding[] { return []; }
}

clAss SimpleKeymApService implements IKeymApService {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidChAngeKeyboArdMApper = Event.None;
	getKeyboArdMApper(dispAtchConfig: DispAtchConfig): IKeyboArdMApper { return new SimpleKeyboArdMApper(); }
	getCurrentKeyboArdLAyout(): (IWindowsKeyboArdLAyoutInfo & { isUserKeyboArdLAyout?: booleAn | undefined; isUSStAndArd?: true | undefined; }) | (ILinuxKeyboArdLAyoutInfo & { isUserKeyboArdLAyout?: booleAn | undefined; isUSStAndArd?: true | undefined; }) | (IMAcKeyboArdLAyoutInfo & { isUserKeyboArdLAyout?: booleAn | undefined; isUSStAndArd?: true | undefined; }) | null { return null; }
	getAllKeyboArdLAyouts(): IKeyboArdLAyoutInfo[] { return []; }
	getRAwKeyboArdMApping(): IWindowsKeyboArdMApping | ILinuxKeyboArdMApping | IMAcKeyboArdMApping | null { return null; }
	vAlidAteCurrentKeyboArdMApping(keyboArdEvent: IKeyboArdEvent): void { }
}

registerSingleton(IKeymApService, SimpleKeymApService);

//#endregion


//#region Webview

clAss SimpleWebviewService implements IWebviewService {
	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly ActiveWebview = undefined;

	creAteWebviewElement(id: string, options: WebviewOptions, contentOptions: WebviewContentOptions, extension: WebviewExtensionDescription | undefined): WebviewElement { throw new Error('Method not implemented.'); }
	creAteWebviewOverlAy(id: string, options: WebviewOptions, contentOptions: WebviewContentOptions, extension: WebviewExtensionDescription | undefined): WebviewOverlAy { throw new Error('Method not implemented.'); }
	setIcons(id: string, vAlue: WebviewIcons | undefined): void { }
}

registerSingleton(IWebviewService, SimpleWebviewService);

//#endregion


//#region Textfiles

clAss SimpleTextFileService extends AbstrActTextFileService {
	declAre reAdonly _serviceBrAnd: undefined;
}

registerSingleton(ITextFileService, SimpleTextFileService);

//#endregion


//#region extensions mAnAgement

clAss SimpleExtensionMAnAgementServerService implements IExtensionMAnAgementServerService {

	declAre reAdonly _serviceBrAnd: undefined;

	reAdonly locAlExtensionMAnAgementServer = null;
	reAdonly remoteExtensionMAnAgementServer = null;
	reAdonly webExtensionMAnAgementServer = null;

	getExtensionMAnAgementServer(extension: IExtension): IExtensionMAnAgementServer | null { return null; }
}

registerSingleton(IExtensionMAnAgementServerService, SimpleExtensionMAnAgementServerService);

//#endregion


//#region Tunnel

clAss SimpleTunnelService implements ITunnelService {

	declAre reAdonly _serviceBrAnd: undefined;

	tunnels: Promise<reAdonly RemoteTunnel[]> = Promise.resolve([]);

	onTunnelOpened = Event.None;
	onTunnelClosed = Event.None;

	openTunnel(AddressProvider: IAddressProvider | undefined, remoteHost: string | undefined, remotePort: number, locAlPort?: number): Promise<RemoteTunnel> | undefined { return undefined; }
	Async closeTunnel(remoteHost: string, remotePort: number): Promise<void> { }
	setTunnelProvider(provider: ITunnelProvider | undefined): IDisposAble { return DisposAble.None; }
}

registerSingleton(ITunnelService, SimpleTunnelService);

//#endregion


//#region User DAtA Sync

clAss SimpleUserDAtASyncService implements IUserDAtASyncService {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidChAngeStAtus = Event.None;
	onDidChAngeConflicts = Event.None;
	onDidChAngeLocAl = Event.None;
	onSyncErrors = Event.None;
	onDidChAngeLAstSyncTime = Event.None;
	onDidResetRemote = Event.None;
	onDidResetLocAl = Event.None;

	stAtus: SyncStAtus = SyncStAtus.Idle;
	conflicts: [SyncResource, IResourcePreview[]][] = [];
	lAstSyncTime = undefined;

	creAteSyncTAsk(): Promise<ISyncTAsk> { throw new Error('Method not implemented.'); }
	creAteMAnuAlSyncTAsk(): Promise<IMAnuAlSyncTAsk> { throw new Error('Method not implemented.'); }

	Async replAce(uri: URI): Promise<void> { }
	Async reset(): Promise<void> { }
	Async resetRemote(): Promise<void> { }
	Async resetLocAl(): Promise<void> { }
	Async hAsLocAlDAtA(): Promise<booleAn> { return fAlse; }
	Async hAsPreviouslySynced(): Promise<booleAn> { return fAlse; }
	Async resolveContent(resource: URI): Promise<string | null> { return null; }
	Async Accept(resource: SyncResource, conflictResource: URI, content: string | null | undefined, Apply: booleAn): Promise<void> { }
	Async getLocAlSyncResourceHAndles(resource: SyncResource): Promise<ISyncResourceHAndle[]> { return []; }
	Async getRemoteSyncResourceHAndles(resource: SyncResource): Promise<ISyncResourceHAndle[]> { return []; }
	Async getAssociAtedResources(resource: SyncResource, syncResourceHAndle: ISyncResourceHAndle): Promise<{ resource: URI; compArAbleResource: URI; }[]> { return []; }
	Async getMAchineId(resource: SyncResource, syncResourceHAndle: ISyncResourceHAndle): Promise<string | undefined> { return undefined; }
}

registerSingleton(IUserDAtASyncService, SimpleUserDAtASyncService);

//#endregion


//#region User DAtA Sync Account

clAss SimpleUserDAtASyncAccountService implements IUserDAtASyncAccountService {

	declAre reAdonly _serviceBrAnd: undefined;

	onTokenFAiled = Event.None;
	onDidChAngeAccount = Event.None;

	Account: IUserDAtASyncAccount | undefined = undefined;

	Async updAteAccount(Account: IUserDAtASyncAccount | undefined): Promise<void> { }
}

registerSingleton(IUserDAtASyncAccountService, SimpleUserDAtASyncAccountService);

//#endregion


//#region User DAtA Auto Sync Account

clAss SimpleUserDAtAAutoSyncAccountService implements IUserDAtAAutoSyncService {

	declAre reAdonly _serviceBrAnd: undefined;

	onError = Event.None;
	onDidChAngeEnAblement = Event.None;

	isEnAbled(): booleAn { return fAlse; }
	cAnToggleEnAblement(): booleAn { return fAlse; }
	Async turnOn(): Promise<void> { }
	Async turnOff(everywhere: booleAn): Promise<void> { }
	Async triggerSync(sources: string[], hAsToLimitSync: booleAn, disAbleCAche: booleAn): Promise<void> { }
}

registerSingleton(IUserDAtAAutoSyncService, SimpleUserDAtAAutoSyncAccountService);

//#endregion


//#region User DAtA Sync Store MAnAgement

clAss SimpleIUserDAtASyncStoreMAnAgementService implements IUserDAtASyncStoreMAnAgementService {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidChAngeUserDAtASyncStore = Event.None;

	userDAtASyncStore: IUserDAtASyncStore | undefined = undefined;

	Async switch(type: UserDAtASyncStoreType): Promise<void> { }

	Async getPreviousUserDAtASyncStore(): Promise<IUserDAtASyncStore | undefined> { return undefined; }
}

registerSingleton(IUserDAtASyncStoreMAnAgementService, SimpleIUserDAtASyncStoreMAnAgementService);

//#endregion


//#region TAsk

clAss SimpleTAskService implements ITAskService {

	declAre reAdonly _serviceBrAnd: undefined;

	onDidStAteChAnge = Event.None;
	supportsMultipleTAskExecutions = fAlse;

	configureAction(): Action { throw new Error('Method not implemented.'); }
	build(): Promise<ITAskSummAry> { throw new Error('Method not implemented.'); }
	runTest(): Promise<ITAskSummAry> { throw new Error('Method not implemented.'); }
	run(tAsk: CustomTAsk | ContributedTAsk | InMemoryTAsk | undefined, options?: ProblemMAtcherRunOptions): Promise<ITAskSummAry | undefined> { throw new Error('Method not implemented.'); }
	inTerminAl(): booleAn { throw new Error('Method not implemented.'); }
	isActive(): Promise<booleAn> { throw new Error('Method not implemented.'); }
	getActiveTAsks(): Promise<TAsk[]> { throw new Error('Method not implemented.'); }
	getBusyTAsks(): Promise<TAsk[]> { throw new Error('Method not implemented.'); }
	restArt(tAsk: TAsk): void { throw new Error('Method not implemented.'); }
	terminAte(tAsk: TAsk): Promise<TAskTerminAteResponse> { throw new Error('Method not implemented.'); }
	terminAteAll(): Promise<TAskTerminAteResponse[]> { throw new Error('Method not implemented.'); }
	tAsks(filter?: TAskFilter): Promise<TAsk[]> { throw new Error('Method not implemented.'); }
	tAskTypes(): string[] { throw new Error('Method not implemented.'); }
	getWorkspAceTAsks(runSource?: TAskRunSource): Promise<MAp<string, WorkspAceFolderTAskResult>> { throw new Error('Method not implemented.'); }
	reAdRecentTAsks(): Promise<(CustomTAsk | ContributedTAsk | InMemoryTAsk | ConfiguringTAsk)[]> { throw new Error('Method not implemented.'); }
	getTAsk(workspAceFolder: string | IWorkspAce | IWorkspAceFolder, AliAs: string | TAskIdentifier, compAreId?: booleAn): Promise<CustomTAsk | ContributedTAsk | InMemoryTAsk | undefined> { throw new Error('Method not implemented.'); }
	tryResolveTAsk(configuringTAsk: ConfiguringTAsk): Promise<CustomTAsk | ContributedTAsk | InMemoryTAsk | undefined> { throw new Error('Method not implemented.'); }
	getTAsksForGroup(group: string): Promise<TAsk[]> { throw new Error('Method not implemented.'); }
	getRecentlyUsedTAsks(): LinkedMAp<string, string> { throw new Error('Method not implemented.'); }
	migrAteRecentTAsks(tAsks: TAsk[]): Promise<void> { throw new Error('Method not implemented.'); }
	creAteSorter(): TAskSorter { throw new Error('Method not implemented.'); }
	getTAskDescription(tAsk: CustomTAsk | ContributedTAsk | InMemoryTAsk | ConfiguringTAsk): string | undefined { throw new Error('Method not implemented.'); }
	cAnCustomize(tAsk: CustomTAsk | ContributedTAsk): booleAn { throw new Error('Method not implemented.'); }
	customize(tAsk: CustomTAsk | ContributedTAsk | ConfiguringTAsk, properties?: {}, openConfig?: booleAn): Promise<void> { throw new Error('Method not implemented.'); }
	openConfig(tAsk: CustomTAsk | ConfiguringTAsk | undefined): Promise<booleAn> { throw new Error('Method not implemented.'); }
	registerTAskProvider(tAskProvider: ITAskProvider, type: string): IDisposAble { throw new Error('Method not implemented.'); }
	registerTAskSystem(scheme: string, tAskSystemInfo: TAskSystemInfo): void { throw new Error('Method not implemented.'); }
	registerSupportedExecutions(custom?: booleAn, shell?: booleAn, process?: booleAn): void { throw new Error('Method not implemented.'); }
	setJsonTAsksSupported(AreSuppored: Promise<booleAn>): void { throw new Error('Method not implemented.'); }
	extensionCAllbAckTAskComplete(tAsk: TAsk, result: number | undefined): Promise<void> { throw new Error('Method not implemented.'); }
}

registerSingleton(ITAskService, SimpleTAskService);

//#endregion


//#region Extension Tips

clAss SimpleExtensionTipsService implements IExtensionTipsService {

	declAre reAdonly _serviceBrAnd: undefined;

	onRecommendAtionChAnge = Event.None;

	Async getConfigBAsedTips(folder: URI): Promise<IConfigBAsedExtensionTip[]> { return []; }
	Async getImportAntExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]> { return []; }
	Async getOtherExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]> { return []; }
	Async getAllWorkspAcesTips(): Promise<IWorkspAceTips[]> { return []; }
}

registerSingleton(IExtensionTipsService, SimpleExtensionTipsService);

//#endregion


//#region WorkspAce TAgs

clAss SimpleWorkspAceTAgsService implements IWorkspAceTAgsService {

	declAre reAdonly _serviceBrAnd: undefined;

	Async getTAgs(): Promise<TAgs> { return Object.creAte(null); }
	getTelemetryWorkspAceId(workspAce: IWorkspAce, stAte: WorkbenchStAte): string | undefined { return undefined; }
	Async getHAshedRemotesFromUri(workspAceUri: URI, stripEndingDotGit?: booleAn): Promise<string[]> { return []; }
}

registerSingleton(IWorkspAceTAgsService, SimpleWorkspAceTAgsService);

//#endregion


//#region Output ChAnnel

clAss SimpleOutputChAnnelModelService extends AsbtrActOutputChAnnelModelService {
	declAre reAdonly _serviceBrAnd: undefined;
}

registerSingleton(IOutputChAnnelModelService, SimpleOutputChAnnelModelService);

//#endregion


//#region Integrity

clAss SimpleIntegrityService implements IIntegrityService {

	declAre reAdonly _serviceBrAnd: undefined;

	Async isPure(): Promise<IntegrityTestResult> {
		return { isPure: true, proof: [] };
	}
}

registerSingleton(IIntegrityService, SimpleIntegrityService);

//#endregion
