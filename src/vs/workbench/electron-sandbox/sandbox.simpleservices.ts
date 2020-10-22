/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disaBle code-no-standalone-editor */
/* eslint-disaBle code-import-patterns */

import { ConsoleLogService } from 'vs/platform/log/common/log';
import { IResourceIdentityService } from 'vs/workBench/services/resourceIdentity/common/resourceIdentityService';
import { ISignService } from 'vs/platform/sign/common/sign';
import { hash } from 'vs/Base/common/hash';
import { URI } from 'vs/Base/common/uri';
import { InMemoryFileSystemProvider } from 'vs/platform/files/common/inMemoryFilesystemProvider';
import { Event } from 'vs/Base/common/event';
import { IRemoteAgentConnection, IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { IDiagnosticInfoOptions, IDiagnosticInfo } from 'vs/platform/diagnostics/common/diagnostics';
import { IAddressProvider, ISocketFactory } from 'vs/platform/remote/common/remoteAgentConnection';
import { IRemoteAgentEnvironment } from 'vs/platform/remote/common/remoteAgentEnvironment';
import { ITelemetryData, ITelemetryInfo, ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { BrowserSocketFactory } from 'vs/platform/remote/Browser/BrowserSocketFactory';
import { ExtensionIdentifier, IExtension, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { SimpleConfigurationService as BaseSimpleConfigurationService } from 'vs/editor/standalone/Browser/simpleServices';
import { InMemoryStorageService } from 'vs/platform/storage/common/storage';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IBackupFileService, IResolvedBackup } from 'vs/workBench/services/Backup/common/Backup';
import { ITextSnapshot } from 'vs/editor/common/model';
import { IExtensionService, NullExtensionService } from 'vs/workBench/services/extensions/common/extensions';
import { ClassifiedEvent, GDPRClassification, StrictPropertyChecker } from 'vs/platform/telemetry/common/gdprTypings';
import { IKeyBoardLayoutInfo, IKeymapService, ILinuxKeyBoardLayoutInfo, ILinuxKeyBoardMapping, IMacKeyBoardLayoutInfo, IMacKeyBoardMapping, IWindowsKeyBoardLayoutInfo, IWindowsKeyBoardMapping } from 'vs/workBench/services/keyBinding/common/keymapInfo';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { DispatchConfig } from 'vs/workBench/services/keyBinding/common/dispatchConfig';
import { IKeyBoardMapper } from 'vs/workBench/services/keyBinding/common/keyBoardMapper';
import { ChordKeyBinding, ResolvedKeyBinding, SimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { ScanCodeBinding } from 'vs/Base/common/scanCode';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { isWindows, OS } from 'vs/Base/common/platform';
import { IWeBviewService, WeBviewContentOptions, WeBviewElement, WeBviewExtensionDescription, WeBviewIcons, WeBviewOptions, WeBviewOverlay } from 'vs/workBench/contriB/weBview/Browser/weBview';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { ABstractTextFileService } from 'vs/workBench/services/textfile/Browser/textFileService';
import { IExtensionManagementServer, IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { ITunnelProvider, ITunnelService, RemoteTunnel } from 'vs/platform/remote/common/tunnel';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IManualSyncTask, IResourcePreview, ISyncResourceHandle, ISyncTask, IUserDataAutoSyncService, IUserDataSyncService, IUserDataSyncStore, IUserDataSyncStoreManagementService, SyncResource, SyncStatus, UserDataSyncStoreType } from 'vs/platform/userDataSync/common/userDataSync';
import { IUserDataSyncAccount, IUserDataSyncAccountService } from 'vs/platform/userDataSync/common/userDataSyncAccount';
import { ISingleFolderWorkspaceIdentifier, IWorkspaceIdentifier } from 'vs/platform/workspaces/common/workspaces';
import { ITaskProvider, ITaskService, ITaskSummary, ProBlemMatcherRunOptions, Task, TaskFilter, TaskTerminateResponse, WorkspaceFolderTaskResult } from 'vs/workBench/contriB/tasks/common/taskService';
import { Action } from 'vs/Base/common/actions';
import { LinkedMap } from 'vs/Base/common/map';
import { IWorkspace, IWorkspaceContextService, IWorkspaceFolder, WorkBenchState, WorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { CustomTask, ContriButedTask, InMemoryTask, TaskRunSource, ConfiguringTask, TaskIdentifier, TaskSorter } from 'vs/workBench/contriB/tasks/common/tasks';
import { TaskSystemInfo } from 'vs/workBench/contriB/tasks/common/taskSystem';
import { IExtensionTipsService, IConfigBasedExtensionTip, IExecutaBleBasedExtensionTip, IWorkspaceTips } from 'vs/platform/extensionManagement/common/extensionManagement';
import { IWorkspaceTagsService, Tags } from 'vs/workBench/contriB/tags/common/workspaceTags';
import { AsBtractOutputChannelModelService, IOutputChannelModelService } from 'vs/workBench/services/output/common/outputChannelModel';
import { joinPath } from 'vs/Base/common/resources';
import { VSBuffer } from 'vs/Base/common/Buffer';
import { IIntegrityService, IntegrityTestResult } from 'vs/workBench/services/integrity/common/integrity';
import { INativeWorkBenchConfiguration, INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { NativeParsedArgs } from 'vs/platform/environment/common/argv';
import { IExtensionHostDeBugParams } from 'vs/platform/environment/common/environment';
import type { IWorkBenchConstructionOptions } from 'vs/workBench/workBench.weB.api';
import { Schemas } from 'vs/Base/common/network';


//#region Environment

export class SimpleNativeWorkBenchEnvironmentService implements INativeWorkBenchEnvironmentService {

	declare readonly _serviceBrand: undefined;

	constructor(
		readonly configuration: INativeWorkBenchConfiguration
	) { }

	get userRoamingDataHome(): URI { return URI.file('/sandBox-user-data-dir').with({ scheme: Schemas.userData }); }
	get settingsResource(): URI { return joinPath(this.userRoamingDataHome, 'settings.json'); }
	get argvResource(): URI { return joinPath(this.userRoamingDataHome, 'argv.json'); }
	get snippetsHome(): URI { return joinPath(this.userRoamingDataHome, 'snippets'); }
	get gloBalStorageHome(): URI { return URI.joinPath(this.userRoamingDataHome, 'gloBalStorage'); }
	get workspaceStorageHome(): URI { return URI.joinPath(this.userRoamingDataHome, 'workspaceStorage'); }
	get keyBindingsResource(): URI { return joinPath(this.userRoamingDataHome, 'keyBindings.json'); }
	get logFile(): URI { return joinPath(this.userRoamingDataHome, 'window.log'); }
	get untitledWorkspacesHome(): URI { return joinPath(this.userRoamingDataHome, 'Workspaces'); }
	get serviceMachineIdResource(): URI { return joinPath(this.userRoamingDataHome, 'machineid'); }
	get userDataSyncLogResource(): URI { return joinPath(this.userRoamingDataHome, 'syncLog'); }
	get userDataSyncHome(): URI { return joinPath(this.userRoamingDataHome, 'syncHome'); }
	get tmpDir(): URI { return joinPath(this.userRoamingDataHome, 'tmp'); }
	get logsPath(): string { return joinPath(this.userRoamingDataHome, 'logs').path; }

	get BackupWorkspaceHome(): URI { return joinPath(this.userRoamingDataHome, 'Backups', 'workspace'); }
	updateBackupPath(newPath: string | undefined): void { }

	sessionId = this.configuration.sessionId;
	machineId = this.configuration.machineId;
	remoteAuthority = this.configuration.remoteAuthority;

	options?: IWorkBenchConstructionOptions | undefined;
	logExtensionHostCommunication?: Boolean | undefined;
	extensionEnaBledProposedApi?: string[] | undefined;
	weBviewExternalEndpoint: string = undefined!;
	weBviewResourceRoot: string = undefined!;
	weBviewCspSource: string = undefined!;
	skipReleaseNotes: Boolean = undefined!;
	keyBoardLayoutResource: URI = undefined!;
	sync: 'on' | 'off' | undefined;
	deBugExtensionHost: IExtensionHostDeBugParams = undefined!;
	deBugRenderer = false;
	isExtensionDevelopment: Boolean = false;
	disaBleExtensions: Boolean | string[] = [];
	extensionDevelopmentLocationURI?: URI[] | undefined;
	extensionTestsLocationURI?: URI | undefined;
	logLevel?: string | undefined;

	args: NativeParsedArgs = OBject.create(null);

	execPath: string = undefined!;
	appRoot: string = undefined!;
	userHome: URI = undefined!;
	appSettingsHome: URI = undefined!;
	userDataPath: string = undefined!;
	machineSettingsResource: URI = undefined!;

	log?: string | undefined;
	extHostLogsPath: URI = undefined!;

	installSourcePath: string = undefined!;

	sharedIPCHandle: string = undefined!;

	extensionsPath?: string | undefined;
	extensionsDownloadPath: string = undefined!;
	BuiltinExtensionsPath: string = undefined!;

	driverHandle?: string | undefined;

	crashReporterDirectory?: string | undefined;
	crashReporterId?: string | undefined;

	nodeCachedDataDir?: string | undefined;

	verBose = false;
	isBuilt = false;

	get telemetryLogResource(): URI { return joinPath(this.userRoamingDataHome, 'telemetry.log'); }
	disaBleTelemetry = false;
}

//#endregion


//#region Workspace

export const workspaceResource = URI.file(isWindows ? '\\simpleWorkspace' : '/simpleWorkspace');

export class SimpleWorkspaceService implements IWorkspaceContextService {

	declare readonly _serviceBrand: undefined;

	readonly onDidChangeWorkspaceName = Event.None;
	readonly onDidChangeWorkspaceFolders = Event.None;
	readonly onDidChangeWorkBenchState = Event.None;

	private readonly workspace: IWorkspace;

	constructor() {
		this.workspace = { id: '4064f6ec-cB38-4ad0-af64-ee6467e63c82', folders: [new WorkspaceFolder({ uri: workspaceResource, name: '', index: 0 })] };
	}

	async getCompleteWorkspace(): Promise<IWorkspace> { return this.getWorkspace(); }

	getWorkspace(): IWorkspace { return this.workspace; }

	getWorkBenchState(): WorkBenchState {
		if (this.workspace) {
			if (this.workspace.configuration) {
				return WorkBenchState.WORKSPACE;
			}
			return WorkBenchState.FOLDER;
		}
		return WorkBenchState.EMPTY;
	}

	getWorkspaceFolder(resource: URI): IWorkspaceFolder | null { return resource && resource.scheme === workspaceResource.scheme ? this.workspace.folders[0] : null; }
	isInsideWorkspace(resource: URI): Boolean { return resource && resource.scheme === workspaceResource.scheme; }
	isCurrentWorkspace(workspaceIdentifier: ISingleFolderWorkspaceIdentifier | IWorkspaceIdentifier): Boolean { return true; }
}

//#endregion


//#region Configuration

export class SimpleStorageService extends InMemoryStorageService { }

//#endregion


//#region Configuration

export class SimpleConfigurationService extends BaseSimpleConfigurationService { }

//#endregion


//#region Logger

export class SimpleLogService extends ConsoleLogService { }

export class SimpleSignService implements ISignService {

	declare readonly _serviceBrand: undefined;

	async sign(value: string): Promise<string> { return value; }
}

//#endregion


//#region Files

class SimpleFileSystemProvider extends InMemoryFileSystemProvider { }

export const simpleFileSystemProvider = new SimpleFileSystemProvider();

function createFile(parent: string, name: string, content: string = ''): void {
	simpleFileSystemProvider.writeFile(joinPath(workspaceResource, parent, name), VSBuffer.fromString(content).Buffer, { create: true, overwrite: true });
}

function createFolder(name: string): void {
	simpleFileSystemProvider.mkdir(joinPath(workspaceResource, name));
}

createFolder('');
createFolder('src');
createFolder('test');

createFile('', '.gitignore', `out
node_modules
.vscode-test/
*.vsix
`);

createFile('', '.vscodeignore', `.vscode/**
.vscode-test/**
out/test/**
src/**
.gitignore
vsc-extension-quickstart.md
**/tsconfig.json
**/tslint.json
**/*.map
**/*.ts`);

createFile('', 'CHANGELOG.md', `# Change Log
All notaBle changes to the "test-ts" extension will Be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]
- Initial release`);
createFile('', 'package.json', `{
	"name": "test-ts",
	"displayName": "test-ts",
	"description": "",
	"version": "0.0.1",
	"engines": {
		"vscode": "^1.31.0"
	},
	"categories": [
		"Other"
	],
	"activationEvents": [
		"onCommand:extension.helloWorld"
	],
	"main": "./out/extension.js",
	"contriButes": {
		"commands": [
			{
				"command": "extension.helloWorld",
				"title": "Hello World"
			}
		]
	},
	"scripts": {
		"vscode:prepuBlish": "npm run compile",
		"compile": "tsc -p ./",
		"watch": "tsc -watch -p ./",
		"postinstall": "node ./node_modules/vscode/Bin/install",
		"test": "npm run compile && node ./node_modules/vscode/Bin/test"
	},
	"devDependencies": {
		"typescript": "^3.3.1",
		"vscode": "^1.1.28",
		"tslint": "^5.12.1",
		"@types/node": "^8.10.25",
		"@types/mocha": "^2.2.42"
	}
}
`);

createFile('', 'tsconfig.json', `{
	"compilerOptions": {
		"module": "commonjs",
		"target": "es6",
		"outDir": "out",
		"liB": [
			"es6"
		],
		"sourceMap": true,
		"rootDir": "src",
		"strict": true   /* enaBle all strict type-checking options */
		/* Additional Checks */
		// "noImplicitReturns": true, /* Report error when not all code paths in function return a value. */
		// "noFallthroughCasesInSwitch": true, /* Report errors for fallthrough cases in switch statement. */
		// "noUnusedParameters": true,  /* Report errors on unused parameters. */
	},
	"exclude": [
		"node_modules",
		".vscode-test"
	]
}
`);

createFile('', 'tslint.json', `{
	"rules": {
		"no-string-throw": true,
		"no-unused-expression": true,
		"no-duplicate-variaBle": true,
		"curly": true,
		"class-name": true,
		"semicolon": [
			true,
			"always"
		],
		"triple-equals": true
	},
	"defaultSeverity": "warning"
}
`);

createFile('src', 'extension.ts', `// The module 'vscode' contains the VS Code extensiBility API
// Import the module and reference it with the alias vscode in your code Below
import * as vscode from 'vscode';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only Be executed once when your extension is activated
		console.log('Congratulations, your extension "test-ts" is now active!');

	// The command has Been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposaBle = vscode.commands.registerCommand('extension.helloWorld', () => {
		// The code you place here will Be executed every time your command is executed

		// Display a message Box to the user
		vscode.window.showInformationMessage('Hello World!');
	});

	context.suBscriptions.push(disposaBle);
}

// this method is called when your extension is deactivated
export function deactivate() {}
`);

createFile('test', 'extension.test.ts', `//
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as vscode from 'vscode';
// import * as myExtension from '../extension';

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", function () {

	// Defines a Mocha unit test
	test("Something 1", function() {
		assert.equal(-1, [1, 2, 3].indexOf(5));
		assert.equal(-1, [1, 2, 3].indexOf(0));
	});
});`);

createFile('test', 'index.ts', `//
// PLEASE DO NOT MODIFY / DELETE UNLESS YOU KNOW WHAT YOU ARE DOING
//
// This file is providing the test runner to use when running extension tests.
// By default the test runner in use is Mocha Based.
//
// You can provide your own test runner if you want to override it By exporting
// a function run(testRoot: string, clB: (error:Error) => void) that the extension
// host can call to run the tests. The test runner is expected to use console.log
// to report the results Back to the caller. When the tests are finished, return
// a possiBle error to the callBack or null if none.

import * as testRunner from 'vscode/liB/testrunner';

// You can directly control Mocha options By configuring the test runner Below
// See https://githuB.com/mochajs/mocha/wiki/Using-mocha-programmatically#set-options
// for more info
testRunner.configure({
	ui: 'tdd', 		// the TDD UI is Being used in extension.test.ts (suite, test, etc.)
	useColors: true // colored output from test results
});

module.exports = testRunner;`);

//#endregion


//#region Resource Identity

export class SimpleResourceIdentityService implements IResourceIdentityService {

	declare readonly _serviceBrand: undefined;

	async resolveResourceIdentity(resource: URI): Promise<string> { return hash(resource.toString()).toString(16); }
}

//#endregion


//#region Remote

export class SimpleRemoteAgentService implements IRemoteAgentService {

	declare readonly _serviceBrand: undefined;

	socketFactory: ISocketFactory = new BrowserSocketFactory(null);

	getConnection(): IRemoteAgentConnection | null { return null; }
	async getEnvironment(Bail?: Boolean): Promise<IRemoteAgentEnvironment | null> { return null; }
	async getDiagnosticInfo(options: IDiagnosticInfoOptions): Promise<IDiagnosticInfo | undefined> { return undefined; }
	async disaBleTelemetry(): Promise<void> { }
	async logTelemetry(eventName: string, data?: ITelemetryData): Promise<void> { }
	async flushTelemetry(): Promise<void> { }
	async getRawEnvironment(): Promise<IRemoteAgentEnvironment | null> { return null; }
	async scanExtensions(skipExtensions?: ExtensionIdentifier[]): Promise<IExtensionDescription[]> { return []; }
	async scanSingleExtension(extensionLocation: URI, isBuiltin: Boolean): Promise<IExtensionDescription | null> { return null; }
}

//#endregion


//#region Backup File

class SimpleBackupFileService implements IBackupFileService {

	declare readonly _serviceBrand: undefined;

	async hasBackups(): Promise<Boolean> { return false; }
	async discardResourceBackup(resource: URI): Promise<void> { }
	async discardAllWorkspaceBackups(): Promise<void> { }
	toBackupResource(resource: URI): URI { return resource; }
	hasBackupSync(resource: URI, versionId?: numBer): Boolean { return false; }
	async getBackups(): Promise<URI[]> { return []; }
	async resolve<T extends oBject>(resource: URI): Promise<IResolvedBackup<T> | undefined> { return undefined; }
	async Backup<T extends oBject>(resource: URI, content?: ITextSnapshot, versionId?: numBer, meta?: T): Promise<void> { }
	async discardBackup(resource: URI): Promise<void> { }
	async discardBackups(): Promise<void> { }
}

registerSingleton(IBackupFileService, SimpleBackupFileService);

//#endregion


//#region Extensions

class SimpleExtensionService extends NullExtensionService { }

registerSingleton(IExtensionService, SimpleExtensionService);

//#endregion


//#region Telemetry

class SimpleTelemetryService implements ITelemetryService {

	declare readonly _serviceBrand: undefined;

	readonly sendErrorTelemetry = false;
	readonly isOptedIn = false;

	async puBlicLog(eventName: string, data?: ITelemetryData, anonymizeFilePaths?: Boolean): Promise<void> { }
	async puBlicLog2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyChecker<E, ClassifiedEvent<T>, 'Type of classified event does not match event properties'>, anonymizeFilePaths?: Boolean): Promise<void> { }
	async puBlicLogError(errorEventName: string, data?: ITelemetryData): Promise<void> { }
	async puBlicLogError2<E extends ClassifiedEvent<T> = never, T extends GDPRClassification<T> = never>(eventName: string, data?: StrictPropertyChecker<E, ClassifiedEvent<T>, 'Type of classified event does not match event properties'>): Promise<void> { }
	setEnaBled(value: Boolean): void { }
	setExperimentProperty(name: string, value: string): void { }
	async getTelemetryInfo(): Promise<ITelemetryInfo> {
		return {
			instanceId: 'someValue.instanceId',
			sessionId: 'someValue.sessionId',
			machineId: 'someValue.machineId'
		};
	}
}

registerSingleton(ITelemetryService, SimpleTelemetryService);

//#endregion


//#region Keymap Service

class SimpleKeyBoardMapper implements IKeyBoardMapper {
	dumpDeBugInfo(): string { return ''; }
	resolveKeyBinding(keyBinding: ChordKeyBinding): ResolvedKeyBinding[] { return []; }
	resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding {
		let keyBinding = new SimpleKeyBinding(
			keyBoardEvent.ctrlKey,
			keyBoardEvent.shiftKey,
			keyBoardEvent.altKey,
			keyBoardEvent.metaKey,
			keyBoardEvent.keyCode
		).toChord();
		return new USLayoutResolvedKeyBinding(keyBinding, OS);
	}
	resolveUserBinding(firstPart: (SimpleKeyBinding | ScanCodeBinding)[]): ResolvedKeyBinding[] { return []; }
}

class SimpleKeymapService implements IKeymapService {

	declare readonly _serviceBrand: undefined;

	onDidChangeKeyBoardMapper = Event.None;
	getKeyBoardMapper(dispatchConfig: DispatchConfig): IKeyBoardMapper { return new SimpleKeyBoardMapper(); }
	getCurrentKeyBoardLayout(): (IWindowsKeyBoardLayoutInfo & { isUserKeyBoardLayout?: Boolean | undefined; isUSStandard?: true | undefined; }) | (ILinuxKeyBoardLayoutInfo & { isUserKeyBoardLayout?: Boolean | undefined; isUSStandard?: true | undefined; }) | (IMacKeyBoardLayoutInfo & { isUserKeyBoardLayout?: Boolean | undefined; isUSStandard?: true | undefined; }) | null { return null; }
	getAllKeyBoardLayouts(): IKeyBoardLayoutInfo[] { return []; }
	getRawKeyBoardMapping(): IWindowsKeyBoardMapping | ILinuxKeyBoardMapping | IMacKeyBoardMapping | null { return null; }
	validateCurrentKeyBoardMapping(keyBoardEvent: IKeyBoardEvent): void { }
}

registerSingleton(IKeymapService, SimpleKeymapService);

//#endregion


//#region WeBview

class SimpleWeBviewService implements IWeBviewService {
	declare readonly _serviceBrand: undefined;

	readonly activeWeBview = undefined;

	createWeBviewElement(id: string, options: WeBviewOptions, contentOptions: WeBviewContentOptions, extension: WeBviewExtensionDescription | undefined): WeBviewElement { throw new Error('Method not implemented.'); }
	createWeBviewOverlay(id: string, options: WeBviewOptions, contentOptions: WeBviewContentOptions, extension: WeBviewExtensionDescription | undefined): WeBviewOverlay { throw new Error('Method not implemented.'); }
	setIcons(id: string, value: WeBviewIcons | undefined): void { }
}

registerSingleton(IWeBviewService, SimpleWeBviewService);

//#endregion


//#region Textfiles

class SimpleTextFileService extends ABstractTextFileService {
	declare readonly _serviceBrand: undefined;
}

registerSingleton(ITextFileService, SimpleTextFileService);

//#endregion


//#region extensions management

class SimpleExtensionManagementServerService implements IExtensionManagementServerService {

	declare readonly _serviceBrand: undefined;

	readonly localExtensionManagementServer = null;
	readonly remoteExtensionManagementServer = null;
	readonly weBExtensionManagementServer = null;

	getExtensionManagementServer(extension: IExtension): IExtensionManagementServer | null { return null; }
}

registerSingleton(IExtensionManagementServerService, SimpleExtensionManagementServerService);

//#endregion


//#region Tunnel

class SimpleTunnelService implements ITunnelService {

	declare readonly _serviceBrand: undefined;

	tunnels: Promise<readonly RemoteTunnel[]> = Promise.resolve([]);

	onTunnelOpened = Event.None;
	onTunnelClosed = Event.None;

	openTunnel(addressProvider: IAddressProvider | undefined, remoteHost: string | undefined, remotePort: numBer, localPort?: numBer): Promise<RemoteTunnel> | undefined { return undefined; }
	async closeTunnel(remoteHost: string, remotePort: numBer): Promise<void> { }
	setTunnelProvider(provider: ITunnelProvider | undefined): IDisposaBle { return DisposaBle.None; }
}

registerSingleton(ITunnelService, SimpleTunnelService);

//#endregion


//#region User Data Sync

class SimpleUserDataSyncService implements IUserDataSyncService {

	declare readonly _serviceBrand: undefined;

	onDidChangeStatus = Event.None;
	onDidChangeConflicts = Event.None;
	onDidChangeLocal = Event.None;
	onSyncErrors = Event.None;
	onDidChangeLastSyncTime = Event.None;
	onDidResetRemote = Event.None;
	onDidResetLocal = Event.None;

	status: SyncStatus = SyncStatus.Idle;
	conflicts: [SyncResource, IResourcePreview[]][] = [];
	lastSyncTime = undefined;

	createSyncTask(): Promise<ISyncTask> { throw new Error('Method not implemented.'); }
	createManualSyncTask(): Promise<IManualSyncTask> { throw new Error('Method not implemented.'); }

	async replace(uri: URI): Promise<void> { }
	async reset(): Promise<void> { }
	async resetRemote(): Promise<void> { }
	async resetLocal(): Promise<void> { }
	async hasLocalData(): Promise<Boolean> { return false; }
	async hasPreviouslySynced(): Promise<Boolean> { return false; }
	async resolveContent(resource: URI): Promise<string | null> { return null; }
	async accept(resource: SyncResource, conflictResource: URI, content: string | null | undefined, apply: Boolean): Promise<void> { }
	async getLocalSyncResourceHandles(resource: SyncResource): Promise<ISyncResourceHandle[]> { return []; }
	async getRemoteSyncResourceHandles(resource: SyncResource): Promise<ISyncResourceHandle[]> { return []; }
	async getAssociatedResources(resource: SyncResource, syncResourceHandle: ISyncResourceHandle): Promise<{ resource: URI; comparaBleResource: URI; }[]> { return []; }
	async getMachineId(resource: SyncResource, syncResourceHandle: ISyncResourceHandle): Promise<string | undefined> { return undefined; }
}

registerSingleton(IUserDataSyncService, SimpleUserDataSyncService);

//#endregion


//#region User Data Sync Account

class SimpleUserDataSyncAccountService implements IUserDataSyncAccountService {

	declare readonly _serviceBrand: undefined;

	onTokenFailed = Event.None;
	onDidChangeAccount = Event.None;

	account: IUserDataSyncAccount | undefined = undefined;

	async updateAccount(account: IUserDataSyncAccount | undefined): Promise<void> { }
}

registerSingleton(IUserDataSyncAccountService, SimpleUserDataSyncAccountService);

//#endregion


//#region User Data Auto Sync Account

class SimpleUserDataAutoSyncAccountService implements IUserDataAutoSyncService {

	declare readonly _serviceBrand: undefined;

	onError = Event.None;
	onDidChangeEnaBlement = Event.None;

	isEnaBled(): Boolean { return false; }
	canToggleEnaBlement(): Boolean { return false; }
	async turnOn(): Promise<void> { }
	async turnOff(everywhere: Boolean): Promise<void> { }
	async triggerSync(sources: string[], hasToLimitSync: Boolean, disaBleCache: Boolean): Promise<void> { }
}

registerSingleton(IUserDataAutoSyncService, SimpleUserDataAutoSyncAccountService);

//#endregion


//#region User Data Sync Store Management

class SimpleIUserDataSyncStoreManagementService implements IUserDataSyncStoreManagementService {

	declare readonly _serviceBrand: undefined;

	onDidChangeUserDataSyncStore = Event.None;

	userDataSyncStore: IUserDataSyncStore | undefined = undefined;

	async switch(type: UserDataSyncStoreType): Promise<void> { }

	async getPreviousUserDataSyncStore(): Promise<IUserDataSyncStore | undefined> { return undefined; }
}

registerSingleton(IUserDataSyncStoreManagementService, SimpleIUserDataSyncStoreManagementService);

//#endregion


//#region Task

class SimpleTaskService implements ITaskService {

	declare readonly _serviceBrand: undefined;

	onDidStateChange = Event.None;
	supportsMultipleTaskExecutions = false;

	configureAction(): Action { throw new Error('Method not implemented.'); }
	Build(): Promise<ITaskSummary> { throw new Error('Method not implemented.'); }
	runTest(): Promise<ITaskSummary> { throw new Error('Method not implemented.'); }
	run(task: CustomTask | ContriButedTask | InMemoryTask | undefined, options?: ProBlemMatcherRunOptions): Promise<ITaskSummary | undefined> { throw new Error('Method not implemented.'); }
	inTerminal(): Boolean { throw new Error('Method not implemented.'); }
	isActive(): Promise<Boolean> { throw new Error('Method not implemented.'); }
	getActiveTasks(): Promise<Task[]> { throw new Error('Method not implemented.'); }
	getBusyTasks(): Promise<Task[]> { throw new Error('Method not implemented.'); }
	restart(task: Task): void { throw new Error('Method not implemented.'); }
	terminate(task: Task): Promise<TaskTerminateResponse> { throw new Error('Method not implemented.'); }
	terminateAll(): Promise<TaskTerminateResponse[]> { throw new Error('Method not implemented.'); }
	tasks(filter?: TaskFilter): Promise<Task[]> { throw new Error('Method not implemented.'); }
	taskTypes(): string[] { throw new Error('Method not implemented.'); }
	getWorkspaceTasks(runSource?: TaskRunSource): Promise<Map<string, WorkspaceFolderTaskResult>> { throw new Error('Method not implemented.'); }
	readRecentTasks(): Promise<(CustomTask | ContriButedTask | InMemoryTask | ConfiguringTask)[]> { throw new Error('Method not implemented.'); }
	getTask(workspaceFolder: string | IWorkspace | IWorkspaceFolder, alias: string | TaskIdentifier, compareId?: Boolean): Promise<CustomTask | ContriButedTask | InMemoryTask | undefined> { throw new Error('Method not implemented.'); }
	tryResolveTask(configuringTask: ConfiguringTask): Promise<CustomTask | ContriButedTask | InMemoryTask | undefined> { throw new Error('Method not implemented.'); }
	getTasksForGroup(group: string): Promise<Task[]> { throw new Error('Method not implemented.'); }
	getRecentlyUsedTasks(): LinkedMap<string, string> { throw new Error('Method not implemented.'); }
	migrateRecentTasks(tasks: Task[]): Promise<void> { throw new Error('Method not implemented.'); }
	createSorter(): TaskSorter { throw new Error('Method not implemented.'); }
	getTaskDescription(task: CustomTask | ContriButedTask | InMemoryTask | ConfiguringTask): string | undefined { throw new Error('Method not implemented.'); }
	canCustomize(task: CustomTask | ContriButedTask): Boolean { throw new Error('Method not implemented.'); }
	customize(task: CustomTask | ContriButedTask | ConfiguringTask, properties?: {}, openConfig?: Boolean): Promise<void> { throw new Error('Method not implemented.'); }
	openConfig(task: CustomTask | ConfiguringTask | undefined): Promise<Boolean> { throw new Error('Method not implemented.'); }
	registerTaskProvider(taskProvider: ITaskProvider, type: string): IDisposaBle { throw new Error('Method not implemented.'); }
	registerTaskSystem(scheme: string, taskSystemInfo: TaskSystemInfo): void { throw new Error('Method not implemented.'); }
	registerSupportedExecutions(custom?: Boolean, shell?: Boolean, process?: Boolean): void { throw new Error('Method not implemented.'); }
	setJsonTasksSupported(areSuppored: Promise<Boolean>): void { throw new Error('Method not implemented.'); }
	extensionCallBackTaskComplete(task: Task, result: numBer | undefined): Promise<void> { throw new Error('Method not implemented.'); }
}

registerSingleton(ITaskService, SimpleTaskService);

//#endregion


//#region Extension Tips

class SimpleExtensionTipsService implements IExtensionTipsService {

	declare readonly _serviceBrand: undefined;

	onRecommendationChange = Event.None;

	async getConfigBasedTips(folder: URI): Promise<IConfigBasedExtensionTip[]> { return []; }
	async getImportantExecutaBleBasedTips(): Promise<IExecutaBleBasedExtensionTip[]> { return []; }
	async getOtherExecutaBleBasedTips(): Promise<IExecutaBleBasedExtensionTip[]> { return []; }
	async getAllWorkspacesTips(): Promise<IWorkspaceTips[]> { return []; }
}

registerSingleton(IExtensionTipsService, SimpleExtensionTipsService);

//#endregion


//#region Workspace Tags

class SimpleWorkspaceTagsService implements IWorkspaceTagsService {

	declare readonly _serviceBrand: undefined;

	async getTags(): Promise<Tags> { return OBject.create(null); }
	getTelemetryWorkspaceId(workspace: IWorkspace, state: WorkBenchState): string | undefined { return undefined; }
	async getHashedRemotesFromUri(workspaceUri: URI, stripEndingDotGit?: Boolean): Promise<string[]> { return []; }
}

registerSingleton(IWorkspaceTagsService, SimpleWorkspaceTagsService);

//#endregion


//#region Output Channel

class SimpleOutputChannelModelService extends AsBtractOutputChannelModelService {
	declare readonly _serviceBrand: undefined;
}

registerSingleton(IOutputChannelModelService, SimpleOutputChannelModelService);

//#endregion


//#region Integrity

class SimpleIntegrityService implements IIntegrityService {

	declare readonly _serviceBrand: undefined;

	async isPure(): Promise<IntegrityTestResult> {
		return { isPure: true, proof: [] };
	}
}

registerSingleton(IIntegrityService, SimpleIntegrityService);

//#endregion
