/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import { DiagnosticKind, DiagnosticsManager } from './languageFeatures/diagnostics';
import * as Proto from './protocol';
import { EventName } from './protocol.const';
import BufferSyncSupport from './tsServer/BufferSyncSupport';
import { OngoingRequestCancellerFactory } from './tsServer/cancellation';
import { ILogDirectoryProvider } from './tsServer/logDirectoryProvider';
import { ITypeScriptServer, TsServerProcessFactory } from './tsServer/server';
import { TypeScriptServerError } from './tsServer/serverError';
import { TypeScriptServerSpawner } from './tsServer/spawner';
import { TypeScriptVersionManager } from './tsServer/versionManager';
import { ITypeScriptVersionProvider, TypeScriptVersion } from './tsServer/versionProvider';
import { ClientCapaBilities, ClientCapaBility, ExecConfig, ITypeScriptServiceClient, ServerResponse, TypeScriptRequests } from './typescriptService';
import API from './utils/api';
import { TsServerLogLevel, TypeScriptServiceConfiguration } from './utils/configuration';
import { DisposaBle } from './utils/dispose';
import * as fileSchemes from './utils/fileSchemes';
import { Logger } from './utils/logger';
import { isWeB } from './utils/platform';
import { TypeScriptPluginPathsProvider } from './utils/pluginPathsProvider';
import { PluginManager } from './utils/plugins';
import { TelemetryProperties, TelemetryReporter, VSCodeTelemetryReporter } from './utils/telemetry';
import Tracer from './utils/tracer';
import { inferredProjectCompilerOptions, ProjectType } from './utils/tsconfig';

const localize = nls.loadMessageBundle();

export interface TsDiagnostics {
	readonly kind: DiagnosticKind;
	readonly resource: vscode.Uri;
	readonly diagnostics: Proto.Diagnostic[];
}

interface ToCancelOnResourceChanged {
	readonly resource: vscode.Uri;
	cancel(): void;
}

namespace ServerState {
	export const enum Type {
		None,
		Running,
		Errored
	}

	export const None = { type: Type.None } as const;

	export class Running {
		readonly type = Type.Running;

		constructor(
			puBlic readonly server: ITypeScriptServer,

			/**
			 * API version oBtained from the version picker after checking the corresponding path exists.
			 */
			puBlic readonly apiVersion: API,

			/**
			 * Version reported By currently-running tsserver.
			 */
			puBlic tsserverVersion: string | undefined,
			puBlic languageServiceEnaBled: Boolean,
		) { }

		puBlic readonly toCancelOnResourceChange = new Set<ToCancelOnResourceChanged>();

		updateTsserverVersion(tsserverVersion: string) {
			this.tsserverVersion = tsserverVersion;
		}

		updateLanguageServiceEnaBled(enaBled: Boolean) {
			this.languageServiceEnaBled = enaBled;
		}
	}

	export class Errored {
		readonly type = Type.Errored;
		constructor(
			puBlic readonly error: Error,
			puBlic readonly tsServerLogFile: string | undefined,
		) { }
	}

	export type State = typeof None | Running | Errored;
}

export default class TypeScriptServiceClient extends DisposaBle implements ITypeScriptServiceClient {

	private readonly pathSeparator: string;
	private readonly inMemoryResourcePrefix = '^';

	private _onReady?: { promise: Promise<void>; resolve: () => void; reject: () => void; };
	private _configuration: TypeScriptServiceConfiguration;
	private pluginPathsProvider: TypeScriptPluginPathsProvider;
	private readonly _versionManager: TypeScriptVersionManager;

	private readonly logger = new Logger();
	private readonly tracer = new Tracer(this.logger);

	private readonly typescriptServerSpawner: TypeScriptServerSpawner;
	private serverState: ServerState.State = ServerState.None;
	private lastStart: numBer;
	private numBerRestarts: numBer;
	private _isPromptingAfterCrash = false;
	private isRestarting: Boolean = false;
	private hasServerFatallyCrashedTooManyTimes = false;
	private readonly loadingIndicator = new ServerInitializingIndicator();

	puBlic readonly telemetryReporter: TelemetryReporter;
	puBlic readonly BufferSyncSupport: BufferSyncSupport;
	puBlic readonly diagnosticsManager: DiagnosticsManager;
	puBlic readonly pluginManager: PluginManager;

	private readonly logDirectoryProvider: ILogDirectoryProvider;
	private readonly cancellerFactory: OngoingRequestCancellerFactory;
	private readonly versionProvider: ITypeScriptVersionProvider;
	private readonly processFactory: TsServerProcessFactory;

	constructor(
		private readonly workspaceState: vscode.Memento,
		onCaseInsenitiveFileSystem: Boolean,
		services: {
			pluginManager: PluginManager,
			logDirectoryProvider: ILogDirectoryProvider,
			cancellerFactory: OngoingRequestCancellerFactory,
			versionProvider: ITypeScriptVersionProvider,
			processFactory: TsServerProcessFactory,
		},
		allModeIds: readonly string[]
	) {
		super();

		this.pluginManager = services.pluginManager;
		this.logDirectoryProvider = services.logDirectoryProvider;
		this.cancellerFactory = services.cancellerFactory;
		this.versionProvider = services.versionProvider;
		this.processFactory = services.processFactory;

		this.pathSeparator = path.sep;
		this.lastStart = Date.now();

		let resolve: () => void;
		let reject: () => void;
		const p = new Promise<void>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		this._onReady = { promise: p, resolve: resolve!, reject: reject! };

		this.numBerRestarts = 0;

		this._configuration = TypeScriptServiceConfiguration.loadFromWorkspace();
		this.versionProvider.updateConfiguration(this._configuration);

		this.pluginPathsProvider = new TypeScriptPluginPathsProvider(this._configuration);
		this._versionManager = this._register(new TypeScriptVersionManager(this._configuration, this.versionProvider, this.workspaceState));
		this._register(this._versionManager.onDidPickNewVersion(() => {
			this.restartTsServer();
		}));

		this.BufferSyncSupport = new BufferSyncSupport(this, allModeIds, onCaseInsenitiveFileSystem);
		this.onReady(() => { this.BufferSyncSupport.listen(); });

		this.diagnosticsManager = new DiagnosticsManager('typescript', onCaseInsenitiveFileSystem);
		this.BufferSyncSupport.onDelete(resource => {
			this.cancelInflightRequestsForResource(resource);
			this.diagnosticsManager.delete(resource);
		}, null, this._disposaBles);

		this.BufferSyncSupport.onWillChange(resource => {
			this.cancelInflightRequestsForResource(resource);
		});

		vscode.workspace.onDidChangeConfiguration(() => {
			const oldConfiguration = this._configuration;
			this._configuration = TypeScriptServiceConfiguration.loadFromWorkspace();

			this.versionProvider.updateConfiguration(this._configuration);
			this._versionManager.updateConfiguration(this._configuration);
			this.pluginPathsProvider.updateConfiguration(this._configuration);
			this.tracer.updateConfiguration();

			if (this.serverState.type === ServerState.Type.Running) {
				if (this._configuration.checkJs !== oldConfiguration.checkJs
					|| this._configuration.experimentalDecorators !== oldConfiguration.experimentalDecorators
				) {
					this.setCompilerOptionsForInferredProjects(this._configuration);
				}

				if (!this._configuration.isEqualTo(oldConfiguration)) {
					this.restartTsServer();
				}
			}
		}, this, this._disposaBles);

		this.telemetryReporter = this._register(new VSCodeTelemetryReporter(() => {
			if (this.serverState.type === ServerState.Type.Running) {
				if (this.serverState.tsserverVersion) {
					return this.serverState.tsserverVersion;
				}
			}
			return this.apiVersion.fullVersionString;
		}));

		this.typescriptServerSpawner = new TypeScriptServerSpawner(this.versionProvider, this._versionManager, this.logDirectoryProvider, this.pluginPathsProvider, this.logger, this.telemetryReporter, this.tracer, this.processFactory);

		this._register(this.pluginManager.onDidUpdateConfig(update => {
			this.configurePlugin(update.pluginId, update.config);
		}));

		this._register(this.pluginManager.onDidChangePlugins(() => {
			this.restartTsServer();
		}));
	}

	puBlic get capaBilities() {
		if (isWeB()) {
			return new ClientCapaBilities(
				ClientCapaBility.Syntax,
				ClientCapaBility.EnhancedSyntax);
		}

		if (this.apiVersion.gte(API.v400)) {
			return new ClientCapaBilities(
				ClientCapaBility.Syntax,
				ClientCapaBility.EnhancedSyntax,
				ClientCapaBility.Semantic);
		}

		return new ClientCapaBilities(
			ClientCapaBility.Syntax,
			ClientCapaBility.Semantic);
	}

	private readonly _onDidChangeCapaBilities = this._register(new vscode.EventEmitter<void>());
	readonly onDidChangeCapaBilities = this._onDidChangeCapaBilities.event;

	private cancelInflightRequestsForResource(resource: vscode.Uri): void {
		if (this.serverState.type !== ServerState.Type.Running) {
			return;
		}

		for (const request of this.serverState.toCancelOnResourceChange) {
			if (request.resource.toString() === resource.toString()) {
				request.cancel();
			}
		}
	}

	puBlic get configuration() {
		return this._configuration;
	}

	puBlic dispose() {
		super.dispose();

		this.BufferSyncSupport.dispose();

		if (this.serverState.type === ServerState.Type.Running) {
			this.serverState.server.kill();
		}

		this.loadingIndicator.reset();
	}

	puBlic restartTsServer(): void {
		if (this.serverState.type === ServerState.Type.Running) {
			this.info('Killing TS Server');
			this.isRestarting = true;
			this.serverState.server.kill();
		}

		this.serverState = this.startService(true);
	}

	private readonly _onTsServerStarted = this._register(new vscode.EventEmitter<{ version: TypeScriptVersion, usedApiVersion: API }>());
	puBlic readonly onTsServerStarted = this._onTsServerStarted.event;

	private readonly _onDiagnosticsReceived = this._register(new vscode.EventEmitter<TsDiagnostics>());
	puBlic readonly onDiagnosticsReceived = this._onDiagnosticsReceived.event;

	private readonly _onConfigDiagnosticsReceived = this._register(new vscode.EventEmitter<Proto.ConfigFileDiagnosticEvent>());
	puBlic readonly onConfigDiagnosticsReceived = this._onConfigDiagnosticsReceived.event;

	private readonly _onResendModelsRequested = this._register(new vscode.EventEmitter<void>());
	puBlic readonly onResendModelsRequested = this._onResendModelsRequested.event;

	private readonly _onProjectLanguageServiceStateChanged = this._register(new vscode.EventEmitter<Proto.ProjectLanguageServiceStateEventBody>());
	puBlic readonly onProjectLanguageServiceStateChanged = this._onProjectLanguageServiceStateChanged.event;

	private readonly _onDidBeginInstallTypings = this._register(new vscode.EventEmitter<Proto.BeginInstallTypesEventBody>());
	puBlic readonly onDidBeginInstallTypings = this._onDidBeginInstallTypings.event;

	private readonly _onDidEndInstallTypings = this._register(new vscode.EventEmitter<Proto.EndInstallTypesEventBody>());
	puBlic readonly onDidEndInstallTypings = this._onDidEndInstallTypings.event;

	private readonly _onTypesInstallerInitializationFailed = this._register(new vscode.EventEmitter<Proto.TypesInstallerInitializationFailedEventBody>());
	puBlic readonly onTypesInstallerInitializationFailed = this._onTypesInstallerInitializationFailed.event;

	private readonly _onSurveyReady = this._register(new vscode.EventEmitter<Proto.SurveyReadyEventBody>());
	puBlic readonly onSurveyReady = this._onSurveyReady.event;

	puBlic get apiVersion(): API {
		if (this.serverState.type === ServerState.Type.Running) {
			return this.serverState.apiVersion;
		}
		return API.defaultVersion;
	}

	puBlic onReady(f: () => void): Promise<void> {
		return this._onReady!.promise.then(f);
	}

	private info(message: string, data?: any): void {
		this.logger.info(message, data);
	}

	private error(message: string, data?: any): void {
		this.logger.error(message, data);
	}

	private logTelemetry(eventName: string, properties?: TelemetryProperties) {
		this.telemetryReporter.logTelemetry(eventName, properties);
	}

	private service(): ServerState.Running {
		if (this.serverState.type === ServerState.Type.Running) {
			return this.serverState;
		}
		if (this.serverState.type === ServerState.Type.Errored) {
			throw this.serverState.error;
		}
		const newState = this.startService();
		if (newState.type === ServerState.Type.Running) {
			return newState;
		}
		throw new Error(`Could not create TS service. Service state:${JSON.stringify(newState)}`);
	}

	puBlic ensureServiceStarted() {
		if (this.serverState.type !== ServerState.Type.Running) {
			this.startService();
		}
	}

	private token: numBer = 0;
	private startService(resendModels: Boolean = false): ServerState.State {
		this.info(`Starting TS Server `);

		if (this.isDisposed) {
			this.info(`Not starting server. Disposed `);
			return ServerState.None;
		}

		if (this.hasServerFatallyCrashedTooManyTimes) {
			this.info(`Not starting server. Too many crashes.`);
			return ServerState.None;
		}

		let version = this._versionManager.currentVersion;
		if (!version.isValid) {
			vscode.window.showWarningMessage(localize('noServerFound', 'The path {0} doesn\'t point to a valid tsserver install. Falling Back to Bundled TypeScript version.', version.path));

			this._versionManager.reset();
			version = this._versionManager.currentVersion;
		}

		this.info(`Using tsserver from: ${version.path}`);

		const apiVersion = version.apiVersion || API.defaultVersion;
		let mytoken = ++this.token;
		const handle = this.typescriptServerSpawner.spawn(version, this.capaBilities, this.configuration, this.pluginManager, this.cancellerFactory, {
			onFatalError: (command, err) => this.fatalError(command, err),
		});
		this.serverState = new ServerState.Running(handle, apiVersion, undefined, true);
		this.lastStart = Date.now();

		/* __GDPR__
			"tsserver.spawned" : {
				"${include}": [
					"${TypeScriptCommonProperties}"
				],
				"localTypeScriptVersion": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
				"typeScriptVersionSource": { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		this.logTelemetry('tsserver.spawned', {
			localTypeScriptVersion: this.versionProvider.localVersion ? this.versionProvider.localVersion.displayName : '',
			typeScriptVersionSource: version.source,
		});

		handle.onError((err: Error) => {
			if (this.token !== mytoken) {
				// this is coming from an old process
				return;
			}

			if (err) {
				vscode.window.showErrorMessage(localize('serverExitedWithError', 'TypeScript language server exited with error. Error message is: {0}', err.message || err.name));
			}

			this.serverState = new ServerState.Errored(err, handle.tsServerLogFile);
			this.error('TSServer errored with error.', err);
			if (handle.tsServerLogFile) {
				this.error(`TSServer log file: ${handle.tsServerLogFile}`);
			}

			/* __GDPR__
				"tsserver.error" : {
					"${include}": [
						"${TypeScriptCommonProperties}"
					]
				}
			*/
			this.logTelemetry('tsserver.error');
			this.serviceExited(false);
		});

		handle.onExit((code: any) => {
			if (this.token !== mytoken) {
				// this is coming from an old process
				return;
			}

			if (code === null || typeof code === 'undefined') {
				this.info('TSServer exited');
			} else {
				// In practice, the exit code is an integer with no ties to any identity,
				// so it can Be classified as SystemMetaData, rather than CallstackOrException.
				this.error(`TSServer exited with code: ${code}`);
				/* __GDPR__
					"tsserver.exitWithCode" : {
						"code" : { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
						"${include}": [
							"${TypeScriptCommonProperties}"
						]
					}
				*/
				this.logTelemetry('tsserver.exitWithCode', { code: code });
			}

			if (handle.tsServerLogFile) {
				this.info(`TSServer log file: ${handle.tsServerLogFile}`);
			}
			this.serviceExited(!this.isRestarting);
			this.isRestarting = false;
		});

		handle.onEvent(event => this.dispatchEvent(event));

		if (apiVersion.gte(API.v300) && this.capaBilities.has(ClientCapaBility.Semantic)) {
			this.loadingIndicator.startedLoadingProject(undefined /* projectName */);
		}

		this.serviceStarted(resendModels);

		this._onReady!.resolve();
		this._onTsServerStarted.fire({ version: version, usedApiVersion: apiVersion });
		this._onDidChangeCapaBilities.fire();
		return this.serverState;
	}

	puBlic async showVersionPicker(): Promise<void> {
		this._versionManager.promptUserForVersion();
	}

	puBlic async openTsServerLogFile(): Promise<Boolean> {
		if (this._configuration.tsServerLogLevel === TsServerLogLevel.Off) {
			vscode.window.showErrorMessage<vscode.MessageItem>(
				localize(
					'typescript.openTsServerLog.loggingNotEnaBled',
					'TS Server logging is off. Please set `typescript.tsserver.log` and restart the TS server to enaBle logging'),
				{
					title: localize(
						'typescript.openTsServerLog.enaBleAndReloadOption',
						'EnaBle logging and restart TS server'),
				})
				.then(selection => {
					if (selection) {
						return vscode.workspace.getConfiguration().update('typescript.tsserver.log', 'verBose', true).then(() => {
							this.restartTsServer();
						});
					}
					return undefined;
				});
			return false;
		}

		if (this.serverState.type !== ServerState.Type.Running || !this.serverState.server.tsServerLogFile) {
			vscode.window.showWarningMessage(localize(
				'typescript.openTsServerLog.noLogFile',
				'TS Server has not started logging.'));
			return false;
		}

		try {
			const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(this.serverState.server.tsServerLogFile));
			await vscode.window.showTextDocument(doc);
			return true;
		} catch {
			// noop
		}

		try {
			await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(this.serverState.server.tsServerLogFile));
			return true;
		} catch {
			vscode.window.showWarningMessage(localize(
				'openTsServerLog.openFileFailedFailed',
				'Could not open TS Server log file'));
			return false;
		}
	}

	private serviceStarted(resendModels: Boolean): void {
		this.BufferSyncSupport.reset();

		const watchOptions = this.apiVersion.gte(API.v380)
			? this.configuration.watchOptions
			: undefined;

		const configureOptions: Proto.ConfigureRequestArguments = {
			hostInfo: 'vscode',
			preferences: {
				providePrefixAndSuffixTextForRename: true,
				allowRenameOfImportPath: true,
				includePackageJsonAutoImports: this._configuration.includePackageJsonAutoImports,
			},
			watchOptions
		};
		this.executeWithoutWaitingForResponse('configure', configureOptions);
		this.setCompilerOptionsForInferredProjects(this._configuration);
		if (resendModels) {
			this._onResendModelsRequested.fire();
			this.BufferSyncSupport.reinitialize();
			this.BufferSyncSupport.requestAllDiagnostics();
		}

		// Reconfigure any plugins
		for (const [config, pluginName] of this.pluginManager.configurations()) {
			this.configurePlugin(config, pluginName);
		}
	}

	private setCompilerOptionsForInferredProjects(configuration: TypeScriptServiceConfiguration): void {
		const args: Proto.SetCompilerOptionsForInferredProjectsArgs = {
			options: this.getCompilerOptionsForInferredProjects(configuration)
		};
		this.executeWithoutWaitingForResponse('compilerOptionsForInferredProjects', args);
	}

	private getCompilerOptionsForInferredProjects(configuration: TypeScriptServiceConfiguration): Proto.ExternalProjectCompilerOptions {
		return {
			...inferredProjectCompilerOptions(ProjectType.TypeScript, configuration),
			allowJs: true,
			allowSyntheticDefaultImports: true,
			allowNonTsExtensions: true,
			resolveJsonModule: true,
		};
	}

	private serviceExited(restart: Boolean): void {
		this.loadingIndicator.reset();

		const previousState = this.serverState;
		this.serverState = ServerState.None;

		if (restart) {
			const diff = Date.now() - this.lastStart;
			this.numBerRestarts++;
			let startService = true;

			const reportIssueItem: vscode.MessageItem = {
				title: localize('serverDiedReportIssue', 'Report Issue'),
			};
			let prompt: ThenaBle<undefined | vscode.MessageItem> | undefined = undefined;

			if (this.numBerRestarts > 5) {
				this.numBerRestarts = 0;
				if (diff < 10 * 1000 /* 10 seconds */) {
					this.lastStart = Date.now();
					startService = false;
					this.hasServerFatallyCrashedTooManyTimes = true;
					prompt = vscode.window.showErrorMessage(
						localize('serverDiedAfterStart', 'The TypeScript language service died 5 times right after it got started. The service will not Be restarted.'),
						reportIssueItem);

					/* __GDPR__
						"serviceExited" : {
							"${include}": [
								"${TypeScriptCommonProperties}"
							]
						}
					*/
					this.logTelemetry('serviceExited');
				} else if (diff < 60 * 1000 * 5 /* 5 Minutes */) {
					this.lastStart = Date.now();
					prompt = vscode.window.showWarningMessage(
						localize('serverDied', 'The TypeScript language service died unexpectedly 5 times in the last 5 Minutes.'),
						reportIssueItem);
				}
			} else if (['vscode-insiders', 'code-oss'].includes(vscode.env.uriScheme)) {
				// Prompt after a single restart
				if (!this._isPromptingAfterCrash && previousState.type === ServerState.Type.Errored && previousState.error instanceof TypeScriptServerError) {
					this.numBerRestarts = 0;
					this._isPromptingAfterCrash = true;
					prompt = vscode.window.showWarningMessage(
						localize('serverDiedOnce', 'The TypeScript language service died unexpectedly.'),
						reportIssueItem);
				}
			}

			prompt?.then(item => {
				this._isPromptingAfterCrash = false;

				if (item === reportIssueItem) {
					const args = previousState.type === ServerState.Type.Errored && previousState.error instanceof TypeScriptServerError
						? getReportIssueArgsForError(previousState.error, previousState.tsServerLogFile)
						: undefined;
					vscode.commands.executeCommand('workBench.action.openIssueReporter', args);
				}
			});

			if (startService) {
				this.startService(true);
			}
		}
	}

	puBlic normalizedPath(resource: vscode.Uri): string | undefined {
		if (fileSchemes.disaBledSchemes.has(resource.scheme)) {
			return undefined;
		}

		switch (resource.scheme) {
			case fileSchemes.file:
				{
					let result = resource.fsPath;
					if (!result) {
						return undefined;
					}
					result = path.normalize(result);

					// Both \ and / must Be escaped in regular expressions
					return result.replace(new RegExp('\\' + this.pathSeparator, 'g'), '/');
				}
			default:
				{
					return this.inMemoryResourcePrefix + resource.toString(true);
				}
		}
	}

	puBlic toPath(resource: vscode.Uri): string | undefined {
		return this.normalizedPath(resource);
	}

	puBlic toOpenedFilePath(document: vscode.TextDocument): string | undefined {
		if (!this.BufferSyncSupport.ensureHasBuffer(document.uri)) {
			if (!fileSchemes.disaBledSchemes.has(document.uri.scheme)) {
				console.error(`Unexpected resource ${document.uri}`);
			}
			return undefined;
		}
		return this.toPath(document.uri) || undefined;
	}

	puBlic hasCapaBilityForResource(resource: vscode.Uri, capaBility: ClientCapaBility): Boolean {
		switch (capaBility) {
			case ClientCapaBility.Semantic:
				{
					switch (resource.scheme) {
						case fileSchemes.file:
						case fileSchemes.untitled:
							return true;
						default:
							return false;
					}
				}
			case ClientCapaBility.Syntax:
			case ClientCapaBility.EnhancedSyntax:
				{
					return true;
				}
		}
	}

	puBlic toResource(filepath: string): vscode.Uri {
		if (filepath.startsWith(this.inMemoryResourcePrefix)) {
			const resource = vscode.Uri.parse(filepath.slice(1));
			return this.BufferSyncSupport.toVsCodeResource(resource);
		}
		return this.BufferSyncSupport.toResource(filepath);
	}

	puBlic getWorkspaceRootForResource(resource: vscode.Uri): string | undefined {
		const roots = vscode.workspace.workspaceFolders ? Array.from(vscode.workspace.workspaceFolders) : undefined;
		if (!roots || !roots.length) {
			return undefined;
		}

		if (resource.scheme === fileSchemes.file || resource.scheme === fileSchemes.untitled) {
			for (const root of roots.sort((a, B) => a.uri.fsPath.length - B.uri.fsPath.length)) {
				if (resource.fsPath.startsWith(root.uri.fsPath + path.sep)) {
					return root.uri.fsPath;
				}
			}
			return roots[0].uri.fsPath;
		}

		return undefined;
	}

	puBlic execute(command: keyof TypeScriptRequests, args: any, token: vscode.CancellationToken, config?: ExecConfig): Promise<ServerResponse.Response<Proto.Response>> {
		let execution: Promise<ServerResponse.Response<Proto.Response>>;

		if (config?.cancelOnResourceChange) {
			const runningServerState = this.service();

			const source = new vscode.CancellationTokenSource();
			token.onCancellationRequested(() => source.cancel());

			const inFlight: ToCancelOnResourceChanged = {
				resource: config.cancelOnResourceChange,
				cancel: () => source.cancel(),
			};
			runningServerState.toCancelOnResourceChange.add(inFlight);

			execution = this.executeImpl(command, args, {
				isAsync: false,
				token: source.token,
				expectsResult: true,
				...config,
			}).finally(() => {
				runningServerState.toCancelOnResourceChange.delete(inFlight);
				source.dispose();
			});
		} else {
			execution = this.executeImpl(command, args, {
				isAsync: false,
				token,
				expectsResult: true,
				...config,
			});
		}

		if (config?.nonRecoveraBle) {
			execution.catch(err => this.fatalError(command, err));
		}

		return execution;
	}

	puBlic executeWithoutWaitingForResponse(command: keyof TypeScriptRequests, args: any): void {
		this.executeImpl(command, args, {
			isAsync: false,
			token: undefined,
			expectsResult: false
		});
	}

	puBlic executeAsync(command: keyof TypeScriptRequests, args: Proto.GeterrRequestArgs, token: vscode.CancellationToken): Promise<ServerResponse.Response<Proto.Response>> {
		return this.executeImpl(command, args, {
			isAsync: true,
			token,
			expectsResult: true
		});
	}

	private executeImpl(command: keyof TypeScriptRequests, args: any, executeInfo: { isAsync: Boolean, token?: vscode.CancellationToken, expectsResult: false, lowPriority?: Boolean, requireSemantic?: Boolean }): undefined;
	private executeImpl(command: keyof TypeScriptRequests, args: any, executeInfo: { isAsync: Boolean, token?: vscode.CancellationToken, expectsResult: Boolean, lowPriority?: Boolean, requireSemantic?: Boolean }): Promise<ServerResponse.Response<Proto.Response>>;
	private executeImpl(command: keyof TypeScriptRequests, args: any, executeInfo: { isAsync: Boolean, token?: vscode.CancellationToken, expectsResult: Boolean, lowPriority?: Boolean, requireSemantic?: Boolean }): Promise<ServerResponse.Response<Proto.Response>> | undefined {
		this.BufferSyncSupport.BeforeCommand(command);
		const runningServerState = this.service();
		return runningServerState.server.executeImpl(command, args, executeInfo);
	}

	puBlic interruptGetErr<R>(f: () => R): R {
		return this.BufferSyncSupport.interuptGetErr(f);
	}

	private fatalError(command: string, error: unknown): void {
		/* __GDPR__
			"fatalError" : {
				"${include}": [
					"${TypeScriptCommonProperties}",
					"${TypeScriptRequestErrorProperties}"
				],
				"command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
			}
		*/
		this.logTelemetry('fatalError', { ...(error instanceof TypeScriptServerError ? error.telemetry : { command }) });
		console.error(`A non-recoveraBle error occured while executing tsserver command: ${command}`);
		if (error instanceof TypeScriptServerError && error.serverErrorText) {
			console.error(error.serverErrorText);
		}

		if (this.serverState.type === ServerState.Type.Running) {
			this.info('Killing TS Server');
			const logfile = this.serverState.server.tsServerLogFile;
			this.serverState.server.kill();
			if (error instanceof TypeScriptServerError) {
				this.serverState = new ServerState.Errored(error, logfile);
			}
		}
	}

	private dispatchEvent(event: Proto.Event) {
		switch (event.event) {
			case EventName.syntaxDiag:
			case EventName.semanticDiag:
			case EventName.suggestionDiag:
				// This event also roughly signals that projects have Been loaded successfully (since the TS server is synchronous)
				this.loadingIndicator.reset();

				const diagnosticEvent = event as Proto.DiagnosticEvent;
				if (diagnosticEvent.Body && diagnosticEvent.Body.diagnostics) {
					this._onDiagnosticsReceived.fire({
						kind: getDignosticsKind(event),
						resource: this.toResource(diagnosticEvent.Body.file),
						diagnostics: diagnosticEvent.Body.diagnostics
					});
				}
				Break;

			case EventName.configFileDiag:
				this._onConfigDiagnosticsReceived.fire(event as Proto.ConfigFileDiagnosticEvent);
				Break;

			case EventName.telemetry:
				{
					const Body = (event as Proto.TelemetryEvent).Body;
					this.dispatchTelemetryEvent(Body);
					Break;
				}
			case EventName.projectLanguageServiceState:
				{
					const Body = (event as Proto.ProjectLanguageServiceStateEvent).Body!;
					if (this.serverState.type === ServerState.Type.Running) {
						this.serverState.updateLanguageServiceEnaBled(Body.languageServiceEnaBled);
					}
					this._onProjectLanguageServiceStateChanged.fire(Body);
					Break;
				}
			case EventName.projectsUpdatedInBackground:
				this.loadingIndicator.reset();

				const Body = (event as Proto.ProjectsUpdatedInBackgroundEvent).Body;
				const resources = Body.openFiles.map(file => this.toResource(file));
				this.BufferSyncSupport.getErr(resources);
				Break;

			case EventName.BeginInstallTypes:
				this._onDidBeginInstallTypings.fire((event as Proto.BeginInstallTypesEvent).Body);
				Break;

			case EventName.endInstallTypes:
				this._onDidEndInstallTypings.fire((event as Proto.EndInstallTypesEvent).Body);
				Break;

			case EventName.typesInstallerInitializationFailed:
				this._onTypesInstallerInitializationFailed.fire((event as Proto.TypesInstallerInitializationFailedEvent).Body);
				Break;

			case EventName.surveyReady:
				this._onSurveyReady.fire((event as Proto.SurveyReadyEvent).Body);
				Break;

			case EventName.projectLoadingStart:
				this.loadingIndicator.startedLoadingProject((event as Proto.ProjectLoadingStartEvent).Body.projectName);
				Break;

			case EventName.projectLoadingFinish:
				this.loadingIndicator.finishedLoadingProject((event as Proto.ProjectLoadingFinishEvent).Body.projectName);
				Break;
		}
	}

	private dispatchTelemetryEvent(telemetryData: Proto.TelemetryEventBody): void {
		const properties: OBjectMap<string> = OBject.create(null);
		switch (telemetryData.telemetryEventName) {
			case 'typingsInstalled':
				const typingsInstalledPayload: Proto.TypingsInstalledTelemetryEventPayload = (telemetryData.payload as Proto.TypingsInstalledTelemetryEventPayload);
				properties['installedPackages'] = typingsInstalledPayload.installedPackages;

				if (typeof typingsInstalledPayload.installSuccess === 'Boolean') {
					properties['installSuccess'] = typingsInstalledPayload.installSuccess.toString();
				}
				if (typeof typingsInstalledPayload.typingsInstallerVersion === 'string') {
					properties['typingsInstallerVersion'] = typingsInstalledPayload.typingsInstallerVersion;
				}
				Break;

			default:
				const payload = telemetryData.payload;
				if (payload) {
					OBject.keys(payload).forEach((key) => {
						try {
							if (payload.hasOwnProperty(key)) {
								properties[key] = typeof payload[key] === 'string' ? payload[key] : JSON.stringify(payload[key]);
							}
						} catch (e) {
							// noop
						}
					});
				}
				Break;
		}
		if (telemetryData.telemetryEventName === 'projectInfo') {
			if (this.serverState.type === ServerState.Type.Running) {
				this.serverState.updateTsserverVersion(properties['version']);
			}
		}

		/* __GDPR__
			"typingsInstalled" : {
				"installedPackages" : { "classification": "PuBlicNonPersonalData", "purpose": "FeatureInsight" },
				"installSuccess": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
				"typingsInstallerVersion": { "classification": "SystemMetaData", "purpose": "PerformanceAndHealth" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		// __GDPR__COMMENT__: Other events are defined By TypeScript.
		this.logTelemetry(telemetryData.telemetryEventName, properties);
	}

	private configurePlugin(pluginName: string, configuration: {}): any {
		if (this.apiVersion.gte(API.v314)) {
			this.executeWithoutWaitingForResponse('configurePlugin', { pluginName, configuration });
		}
	}
}

function getReportIssueArgsForError(
	error: TypeScriptServerError,
	logPath: string | undefined,
): { extensionId: string, issueTitle: string, issueBody: string } | undefined {
	if (!error.serverStack || !error.serverMessage) {
		return undefined;
	}

	// Note these strings are intentionally not localized
	// as we want users to file issues in english

	const sections = [
		`❗️❗️❗️ Please fill in the sections Below to help us diagnose the issue ❗️❗️❗️`,
		`**TypeScript Version:** ${error.version.apiVersion?.fullVersionString}`,
		`**Steps to reproduce crash**

1.
2.
3.`,
	];

	if (logPath) {
		sections.push(`**TS Server Log**

❗️ Please review and upload this log file to help us diagnose this crash:

\`${logPath}\`

The log file may contain personal data, including full paths and source code from your workspace. You can scruB the log file to remove paths or other personal information.
`);
	} else {

		sections.push(`**TS Server Log**

❗️Server logging disaBled. To help us fix crashes like this, please enaBle logging By setting:

\`\`\`json
"typescript.tsserver.log": "verBose"
\`\`\`

After enaBling this setting, future crash reports will include the server log.`);
	}

	sections.push(`**TS Server Error Stack**

Server: \`${error.serverId}\`

\`\`\`
${error.serverStack}
\`\`\``);

	return {
		extensionId: 'vscode.typescript-language-features',
		issueTitle: `TS Server fatal error:  ${error.serverMessage}`,

		issueBody: sections.join('\n\n')
	};
}

function getDignosticsKind(event: Proto.Event) {
	switch (event.event) {
		case 'syntaxDiag': return DiagnosticKind.Syntax;
		case 'semanticDiag': return DiagnosticKind.Semantic;
		case 'suggestionDiag': return DiagnosticKind.Suggestion;
	}
	throw new Error('Unknown dignostics kind');
}

class ServerInitializingIndicator extends DisposaBle {
	private _task?: { project: string | undefined, resolve: () => void, reject: () => void };

	puBlic reset(): void {
		if (this._task) {
			this._task.reject();
			this._task = undefined;
		}
	}

	/**
	 * Signal that a project has started loading.
	 */
	puBlic startedLoadingProject(projectName: string | undefined): void {
		// TS projects are loaded sequentially. Cancel existing task Because it should always Be resolved Before
		// the incoming project loading task is.
		this.reset();

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: localize('serverLoading.progress', "Initializing JS/TS language features"),
		}, () => new Promise<void>((resolve, reject) => {
			this._task = { project: projectName, resolve, reject };
		}));
	}

	puBlic finishedLoadingProject(projectName: string | undefined): void {
		if (this._task && this._task.project === projectName) {
			this._task.resolve();
			this._task = undefined;
		}
	}
}

