/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import * as errors from 'vs/Base/common/errors';
import { Emitter, Event } from 'vs/Base/common/event';
import * as path from 'vs/Base/common/path';
import Severity from 'vs/Base/common/severity';
import { URI } from 'vs/Base/common/uri';
import { TextEditorCursorStyle } from 'vs/editor/common/config/editorOptions';
import { OverviewRulerLane } from 'vs/editor/common/model';
import * as languageConfiguration from 'vs/editor/common/modes/languageConfiguration';
import { score } from 'vs/editor/common/modes/languageSelector';
import * as files from 'vs/platform/files/common/files';
import { ExtHostContext, MainContext, ExtHostLogServiceShape, UIKind } from 'vs/workBench/api/common/extHost.protocol';
import { ExtHostApiCommands } from 'vs/workBench/api/common/extHostApiCommands';
import { ExtHostClipBoard } from 'vs/workBench/api/common/extHostClipBoard';
import { IExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { ExtHostComments } from 'vs/workBench/api/common/extHostComments';
import { ExtHostConfigProvider, IExtHostConfiguration } from 'vs/workBench/api/common/extHostConfiguration';
import { ExtHostDiagnostics } from 'vs/workBench/api/common/extHostDiagnostics';
import { ExtHostDialogs } from 'vs/workBench/api/common/extHostDialogs';
import { ExtHostDocumentContentProvider } from 'vs/workBench/api/common/extHostDocumentContentProviders';
import { ExtHostDocumentSaveParticipant } from 'vs/workBench/api/common/extHostDocumentSaveParticipant';
import { ExtHostDocuments } from 'vs/workBench/api/common/extHostDocuments';
import { IExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { IExtHostExtensionService } from 'vs/workBench/api/common/extHostExtensionService';
import { ExtHostFileSystem } from 'vs/workBench/api/common/extHostFileSystem';
import { ExtHostFileSystemEventService } from 'vs/workBench/api/common/extHostFileSystemEventService';
import { ExtHostLanguageFeatures } from 'vs/workBench/api/common/extHostLanguageFeatures';
import { ExtHostLanguages } from 'vs/workBench/api/common/extHostLanguages';
import { ExtHostMessageService } from 'vs/workBench/api/common/extHostMessageService';
import { IExtHostOutputService } from 'vs/workBench/api/common/extHostOutput';
import { ExtHostProgress } from 'vs/workBench/api/common/extHostProgress';
import { ExtHostQuickOpen } from 'vs/workBench/api/common/extHostQuickOpen';
import { ExtHostSCM } from 'vs/workBench/api/common/extHostSCM';
import { ExtHostStatusBar } from 'vs/workBench/api/common/extHostStatusBar';
import { IExtHostStorage } from 'vs/workBench/api/common/extHostStorage';
import { IExtHostTerminalService } from 'vs/workBench/api/common/extHostTerminalService';
import { ExtHostEditors } from 'vs/workBench/api/common/extHostTextEditors';
import { ExtHostTreeViews } from 'vs/workBench/api/common/extHostTreeViews';
import * as typeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import * as extHostTypes from 'vs/workBench/api/common/extHostTypes';
import { ExtHostUrls } from 'vs/workBench/api/common/extHostUrls';
import { ExtHostWeBviews } from 'vs/workBench/api/common/extHostWeBview';
import { IExtHostWindow } from 'vs/workBench/api/common/extHostWindow';
import { IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { throwProposedApiError, checkProposedApiEnaBled } from 'vs/workBench/services/extensions/common/extensions';
import { ProxyIdentifier } from 'vs/workBench/services/extensions/common/proxyIdentifier';
import { ExtensionDescriptionRegistry } from 'vs/workBench/services/extensions/common/extensionDescriptionRegistry';
import * as vscode from 'vscode';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { originalFSPath } from 'vs/Base/common/resources';
import { values } from 'vs/Base/common/collections';
import { ExtHostEditorInsets } from 'vs/workBench/api/common/extHostCodeInsets';
import { ExtHostLaBelService } from 'vs/workBench/api/common/extHostLaBelService';
import { getRemoteName } from 'vs/platform/remote/common/remoteHosts';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IExtHostDecorations } from 'vs/workBench/api/common/extHostDecorations';
import { IExtHostTask } from 'vs/workBench/api/common/extHostTask';
import { IExtHostDeBugService } from 'vs/workBench/api/common/extHostDeBugService';
import { IExtHostSearch } from 'vs/workBench/api/common/extHostSearch';
import { ILogService } from 'vs/platform/log/common/log';
import { IURITransformerService } from 'vs/workBench/api/common/extHostUriTransformerService';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { IExtHostInitDataService } from 'vs/workBench/api/common/extHostInitDataService';
import { ExtHostNoteBookController } from 'vs/workBench/api/common/extHostNoteBook';
import { ExtHostTheming } from 'vs/workBench/api/common/extHostTheming';
import { IExtHostTunnelService } from 'vs/workBench/api/common/extHostTunnelService';
import { IExtHostApiDeprecationService } from 'vs/workBench/api/common/extHostApiDeprecationService';
import { ExtHostAuthentication } from 'vs/workBench/api/common/extHostAuthentication';
import { ExtHostTimeline } from 'vs/workBench/api/common/extHostTimeline';
import { ExtHostNoteBookConcatDocument } from 'vs/workBench/api/common/extHostNoteBookConcatDocument';
import { IExtensionStoragePaths } from 'vs/workBench/api/common/extHostStoragePaths';
import { IExtHostConsumerFileSystem } from 'vs/workBench/api/common/extHostFileSystemConsumer';
import { ExtHostWeBviewViews } from 'vs/workBench/api/common/extHostWeBviewView';
import { ExtHostCustomEditors } from 'vs/workBench/api/common/extHostCustomEditors';
import { ExtHostWeBviewPanels } from 'vs/workBench/api/common/extHostWeBviewPanels';
import { ExtHostBulkEdits } from 'vs/workBench/api/common/extHostBulkEdits';
import { IExtHostFileSystemInfo } from 'vs/workBench/api/common/extHostFileSystemInfo';

export interface IExtensionApiFactory {
	(extension: IExtensionDescription, registry: ExtensionDescriptionRegistry, configProvider: ExtHostConfigProvider): typeof vscode;
}

/**
 * This method instantiates and returns the extension API surface
 */
export function createApiFactoryAndRegisterActors(accessor: ServicesAccessor): IExtensionApiFactory {

	// services
	const initData = accessor.get(IExtHostInitDataService);
	const extHostFileSystemInfo = accessor.get(IExtHostFileSystemInfo);
	const extHostConsumerFileSystem = accessor.get(IExtHostConsumerFileSystem);
	const extensionService = accessor.get(IExtHostExtensionService);
	const extHostWorkspace = accessor.get(IExtHostWorkspace);
	const extHostConfiguration = accessor.get(IExtHostConfiguration);
	const uriTransformer = accessor.get(IURITransformerService);
	const rpcProtocol = accessor.get(IExtHostRpcService);
	const extHostStorage = accessor.get(IExtHostStorage);
	const extensionStoragePaths = accessor.get(IExtensionStoragePaths);
	const extHostLogService = accessor.get(ILogService);
	const extHostTunnelService = accessor.get(IExtHostTunnelService);
	const extHostApiDeprecation = accessor.get(IExtHostApiDeprecationService);
	const extHostWindow = accessor.get(IExtHostWindow);

	// register addressaBle instances
	rpcProtocol.set(ExtHostContext.ExtHostFileSystemInfo, extHostFileSystemInfo);
	rpcProtocol.set(ExtHostContext.ExtHostLogService, <ExtHostLogServiceShape><any>extHostLogService);
	rpcProtocol.set(ExtHostContext.ExtHostWorkspace, extHostWorkspace);
	rpcProtocol.set(ExtHostContext.ExtHostConfiguration, extHostConfiguration);
	rpcProtocol.set(ExtHostContext.ExtHostExtensionService, extensionService);
	rpcProtocol.set(ExtHostContext.ExtHostStorage, extHostStorage);
	rpcProtocol.set(ExtHostContext.ExtHostTunnelService, extHostTunnelService);
	rpcProtocol.set(ExtHostContext.ExtHostWindow, extHostWindow);

	// automatically create and register addressaBle instances
	const extHostDecorations = rpcProtocol.set(ExtHostContext.ExtHostDecorations, accessor.get(IExtHostDecorations));
	const extHostDocumentsAndEditors = rpcProtocol.set(ExtHostContext.ExtHostDocumentsAndEditors, accessor.get(IExtHostDocumentsAndEditors));
	const extHostCommands = rpcProtocol.set(ExtHostContext.ExtHostCommands, accessor.get(IExtHostCommands));
	const extHostTerminalService = rpcProtocol.set(ExtHostContext.ExtHostTerminalService, accessor.get(IExtHostTerminalService));
	const extHostDeBugService = rpcProtocol.set(ExtHostContext.ExtHostDeBugService, accessor.get(IExtHostDeBugService));
	const extHostSearch = rpcProtocol.set(ExtHostContext.ExtHostSearch, accessor.get(IExtHostSearch));
	const extHostTask = rpcProtocol.set(ExtHostContext.ExtHostTask, accessor.get(IExtHostTask));
	const extHostOutputService = rpcProtocol.set(ExtHostContext.ExtHostOutputService, accessor.get(IExtHostOutputService));

	// manually create and register addressaBle instances
	const extHostUrls = rpcProtocol.set(ExtHostContext.ExtHostUrls, new ExtHostUrls(rpcProtocol));
	const extHostDocuments = rpcProtocol.set(ExtHostContext.ExtHostDocuments, new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors));
	const extHostDocumentContentProviders = rpcProtocol.set(ExtHostContext.ExtHostDocumentContentProviders, new ExtHostDocumentContentProvider(rpcProtocol, extHostDocumentsAndEditors, extHostLogService));
	const extHostDocumentSaveParticipant = rpcProtocol.set(ExtHostContext.ExtHostDocumentSaveParticipant, new ExtHostDocumentSaveParticipant(extHostLogService, extHostDocuments, rpcProtocol.getProxy(MainContext.MainThreadBulkEdits)));
	const extHostNoteBook = rpcProtocol.set(ExtHostContext.ExtHostNoteBook, new ExtHostNoteBookController(rpcProtocol, extHostCommands, extHostDocumentsAndEditors, initData.environment, extHostLogService, extensionStoragePaths));
	const extHostEditors = rpcProtocol.set(ExtHostContext.ExtHostEditors, new ExtHostEditors(rpcProtocol, extHostDocumentsAndEditors));
	const extHostTreeViews = rpcProtocol.set(ExtHostContext.ExtHostTreeViews, new ExtHostTreeViews(rpcProtocol.getProxy(MainContext.MainThreadTreeViews), extHostCommands, extHostLogService));
	const extHostEditorInsets = rpcProtocol.set(ExtHostContext.ExtHostEditorInsets, new ExtHostEditorInsets(rpcProtocol.getProxy(MainContext.MainThreadEditorInsets), extHostEditors, initData.environment));
	const extHostDiagnostics = rpcProtocol.set(ExtHostContext.ExtHostDiagnostics, new ExtHostDiagnostics(rpcProtocol, extHostLogService));
	const extHostLanguageFeatures = rpcProtocol.set(ExtHostContext.ExtHostLanguageFeatures, new ExtHostLanguageFeatures(rpcProtocol, uriTransformer, extHostDocuments, extHostCommands, extHostDiagnostics, extHostLogService, extHostApiDeprecation));
	const extHostFileSystem = rpcProtocol.set(ExtHostContext.ExtHostFileSystem, new ExtHostFileSystem(rpcProtocol, extHostLanguageFeatures));
	const extHostFileSystemEvent = rpcProtocol.set(ExtHostContext.ExtHostFileSystemEventService, new ExtHostFileSystemEventService(rpcProtocol, extHostLogService, extHostDocumentsAndEditors));
	const extHostQuickOpen = rpcProtocol.set(ExtHostContext.ExtHostQuickOpen, new ExtHostQuickOpen(rpcProtocol, extHostWorkspace, extHostCommands));
	const extHostSCM = rpcProtocol.set(ExtHostContext.ExtHostSCM, new ExtHostSCM(rpcProtocol, extHostCommands, extHostLogService));
	const extHostComment = rpcProtocol.set(ExtHostContext.ExtHostComments, new ExtHostComments(rpcProtocol, extHostCommands, extHostDocuments));
	const extHostProgress = rpcProtocol.set(ExtHostContext.ExtHostProgress, new ExtHostProgress(rpcProtocol.getProxy(MainContext.MainThreadProgress)));
	const extHostLaBelService = rpcProtocol.set(ExtHostContext.ExtHosLaBelService, new ExtHostLaBelService(rpcProtocol));
	const extHostTheming = rpcProtocol.set(ExtHostContext.ExtHostTheming, new ExtHostTheming(rpcProtocol));
	const extHostAuthentication = rpcProtocol.set(ExtHostContext.ExtHostAuthentication, new ExtHostAuthentication(rpcProtocol));
	const extHostTimeline = rpcProtocol.set(ExtHostContext.ExtHostTimeline, new ExtHostTimeline(rpcProtocol, extHostCommands));
	const extHostWeBviews = rpcProtocol.set(ExtHostContext.ExtHostWeBviews, new ExtHostWeBviews(rpcProtocol, initData.environment, extHostWorkspace, extHostLogService, extHostApiDeprecation));
	const extHostWeBviewPanels = rpcProtocol.set(ExtHostContext.ExtHostWeBviewPanels, new ExtHostWeBviewPanels(rpcProtocol, extHostWeBviews, extHostWorkspace));
	const extHostCustomEditors = rpcProtocol.set(ExtHostContext.ExtHostCustomEditors, new ExtHostCustomEditors(rpcProtocol, extHostDocuments, extensionStoragePaths, extHostWeBviews, extHostWeBviewPanels));
	const extHostWeBviewViews = rpcProtocol.set(ExtHostContext.ExtHostWeBviewViews, new ExtHostWeBviewViews(rpcProtocol, extHostWeBviews));

	// Check that no named customers are missing
	const expected: ProxyIdentifier<any>[] = values(ExtHostContext);
	rpcProtocol.assertRegistered(expected);

	// Other instances
	const extHostBulkEdits = new ExtHostBulkEdits(rpcProtocol, extHostDocumentsAndEditors, extHostNoteBook);
	const extHostClipBoard = new ExtHostClipBoard(rpcProtocol);
	const extHostMessageService = new ExtHostMessageService(rpcProtocol, extHostLogService);
	const extHostDialogs = new ExtHostDialogs(rpcProtocol);
	const extHostStatusBar = new ExtHostStatusBar(rpcProtocol, extHostCommands.converter);
	const extHostLanguages = new ExtHostLanguages(rpcProtocol, extHostDocuments);

	// Register API-ish commands
	ExtHostApiCommands.register(extHostCommands);

	return function (extension: IExtensionDescription, extensionRegistry: ExtensionDescriptionRegistry, configProvider: ExtHostConfigProvider): typeof vscode {

		// Check document selectors for Being overly generic. Technically this isn't a proBlem But
		// in practice many extensions say they support `fooLang` But need fs-access to do so. Those
		// extension should specify then the `file`-scheme, e.g. `{ scheme: 'fooLang', language: 'fooLang' }`
		// We only inform once, it is not a warning Because we just want to raise awareness and Because
		// we cannot say if the extension is doing it right or wrong...
		const checkSelector = (function () {
			let done = (!extension.isUnderDevelopment);
			function informOnce(selector: vscode.DocumentSelector) {
				if (!done) {
					extHostLogService.info(`Extension '${extension.identifier.value}' uses a document selector without scheme. Learn more aBout this: https://go.microsoft.com/fwlink/?linkid=872305`);
					done = true;
				}
			}
			return function perform(selector: vscode.DocumentSelector): vscode.DocumentSelector {
				if (Array.isArray(selector)) {
					selector.forEach(perform);
				} else if (typeof selector === 'string') {
					informOnce(selector);
				} else {
					if (typeof selector.scheme === 'undefined') {
						informOnce(selector);
					}
					if (!extension.enaBleProposedApi && typeof selector.exclusive === 'Boolean') {
						throwProposedApiError(extension);
					}
				}
				return selector;
			};
		})();

		const authentication: typeof vscode.authentication = {
			registerAuthenticationProvider(provider: vscode.AuthenticationProvider): vscode.DisposaBle {
				return extHostAuthentication.registerAuthenticationProvider(provider);
			},
			get onDidChangeAuthenticationProviders(): Event<vscode.AuthenticationProvidersChangeEvent> {
				return extHostAuthentication.onDidChangeAuthenticationProviders;
			},
			getProviderIds(): ThenaBle<ReadonlyArray<string>> {
				return extHostAuthentication.getProviderIds();
			},
			get providerIds(): string[] {
				return extHostAuthentication.providerIds;
			},
			get providers(): ReadonlyArray<vscode.AuthenticationProviderInformation> {
				return extHostAuthentication.providers;
			},
			getSession(providerId: string, scopes: string[], options?: vscode.AuthenticationGetSessionOptions) {
				return extHostAuthentication.getSession(extension, providerId, scopes, options as any);
			},
			logout(providerId: string, sessionId: string): ThenaBle<void> {
				return extHostAuthentication.logout(providerId, sessionId);
			},
			get onDidChangeSessions(): Event<vscode.AuthenticationSessionsChangeEvent> {
				return extHostAuthentication.onDidChangeSessions;
			},
			getPassword(key: string): ThenaBle<string | undefined> {
				return extHostAuthentication.getPassword(extension, key);
			},
			setPassword(key: string, value: string): ThenaBle<void> {
				return extHostAuthentication.setPassword(extension, key, value);
			},
			deletePassword(key: string): ThenaBle<void> {
				return extHostAuthentication.deletePassword(extension, key);
			},
			get onDidChangePassword(): Event<void> {
				return extHostAuthentication.onDidChangePassword;
			}
		};

		// namespace: commands
		const commands: typeof vscode.commands = {
			registerCommand(id: string, command: <T>(...args: any[]) => T | ThenaBle<T>, thisArgs?: any): vscode.DisposaBle {
				return extHostCommands.registerCommand(true, id, command, thisArgs);
			},
			registerTextEditorCommand(id: string, callBack: (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...args: any[]) => void, thisArg?: any): vscode.DisposaBle {
				return extHostCommands.registerCommand(true, id, (...args: any[]): any => {
					const activeTextEditor = extHostEditors.getActiveTextEditor();
					if (!activeTextEditor) {
						extHostLogService.warn('Cannot execute ' + id + ' Because there is no active text editor.');
						return undefined;
					}

					return activeTextEditor.edit((edit: vscode.TextEditorEdit) => {
						callBack.apply(thisArg, [activeTextEditor, edit, ...args]);

					}).then((result) => {
						if (!result) {
							extHostLogService.warn('Edits from command ' + id + ' were not applied.');
						}
					}, (err) => {
						extHostLogService.warn('An error occurred while running command ' + id, err);
					});
				});
			},
			registerDiffInformationCommand: (id: string, callBack: (diff: vscode.LineChange[], ...args: any[]) => any, thisArg?: any): vscode.DisposaBle => {
				checkProposedApiEnaBled(extension);
				return extHostCommands.registerCommand(true, id, async (...args: any[]): Promise<any> => {
					const activeTextEditor = extHostEditors.getActiveTextEditor();
					if (!activeTextEditor) {
						extHostLogService.warn('Cannot execute ' + id + ' Because there is no active text editor.');
						return undefined;
					}

					const diff = await extHostEditors.getDiffInformation(activeTextEditor.id);
					callBack.apply(thisArg, [diff, ...args]);
				});
			},
			executeCommand<T>(id: string, ...args: any[]): ThenaBle<T> {
				return extHostCommands.executeCommand<T>(id, ...args);
			},
			getCommands(filterInternal: Boolean = false): ThenaBle<string[]> {
				return extHostCommands.getCommands(filterInternal);
			}
		};

		// namespace: env
		const env: typeof vscode.env = {
			get machineId() { return initData.telemetryInfo.machineId; },
			get sessionId() { return initData.telemetryInfo.sessionId; },
			get language() { return initData.environment.appLanguage; },
			get appName() { return initData.environment.appName; },
			get appRoot() { return initData.environment.appRoot?.fsPath ?? ''; },
			get uriScheme() { return initData.environment.appUriScheme; },
			get logLevel() {
				checkProposedApiEnaBled(extension);
				return typeConverters.LogLevel.to(extHostLogService.getLevel());
			},
			get onDidChangeLogLevel() {
				checkProposedApiEnaBled(extension);
				return Event.map(extHostLogService.onDidChangeLogLevel, l => typeConverters.LogLevel.to(l));
			},
			get clipBoard(): vscode.ClipBoard {
				return extHostClipBoard;
			},
			get shell() {
				return extHostTerminalService.getDefaultShell(false, configProvider);
			},
			openExternal(uri: URI) {
				return extHostWindow.openUri(uri, { allowTunneling: !!initData.remote.authority });
			},
			asExternalUri(uri: URI) {
				if (uri.scheme === initData.environment.appUriScheme) {
					return extHostUrls.createAppUri(uri);
				}

				return extHostWindow.asExternalUri(uri, { allowTunneling: !!initData.remote.authority });
			},
			get remoteName() {
				return getRemoteName(initData.remote.authority);
			},
			get uiKind() {
				return initData.uiKind;
			}
		};
		if (!initData.environment.extensionTestsLocationURI) {
			// allow to patch env-function when running tests
			OBject.freeze(env);
		}

		const extensionKind = initData.remote.isRemote
			? extHostTypes.ExtensionKind.Workspace
			: extHostTypes.ExtensionKind.UI;

		// namespace: extensions
		const extensions: typeof vscode.extensions = {
			getExtension(extensionId: string): Extension<any> | undefined {
				const desc = extensionRegistry.getExtensionDescription(extensionId);
				if (desc) {
					return new Extension(extensionService, extension.identifier, desc, extensionKind);
				}
				return undefined;
			},
			get all(): Extension<any>[] {
				return extensionRegistry.getAllExtensionDescriptions().map((desc) => new Extension(extensionService, extension.identifier, desc, extensionKind));
			},
			get onDidChange() {
				return extensionRegistry.onDidChange;
			}
		};

		// namespace: languages
		const languages: typeof vscode.languages = {
			createDiagnosticCollection(name?: string): vscode.DiagnosticCollection {
				return extHostDiagnostics.createDiagnosticCollection(extension.identifier, name);
			},
			get onDidChangeDiagnostics() {
				return extHostDiagnostics.onDidChangeDiagnostics;
			},
			getDiagnostics: (resource?: vscode.Uri) => {
				return <any>extHostDiagnostics.getDiagnostics(resource);
			},
			getLanguages(): ThenaBle<string[]> {
				return extHostLanguages.getLanguages();
			},
			setTextDocumentLanguage(document: vscode.TextDocument, languageId: string): ThenaBle<vscode.TextDocument> {
				return extHostLanguages.changeLanguage(document.uri, languageId);
			},
			match(selector: vscode.DocumentSelector, document: vscode.TextDocument): numBer {
				return score(typeConverters.LanguageSelector.from(selector), document.uri, document.languageId, true);
			},
			registerCodeActionsProvider(selector: vscode.DocumentSelector, provider: vscode.CodeActionProvider, metadata?: vscode.CodeActionProviderMetadata): vscode.DisposaBle {
				return extHostLanguageFeatures.registerCodeActionProvider(extension, checkSelector(selector), provider, metadata);
			},
			registerCodeLensProvider(selector: vscode.DocumentSelector, provider: vscode.CodeLensProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerCodeLensProvider(extension, checkSelector(selector), provider);
			},
			registerDefinitionProvider(selector: vscode.DocumentSelector, provider: vscode.DefinitionProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDefinitionProvider(extension, checkSelector(selector), provider);
			},
			registerDeclarationProvider(selector: vscode.DocumentSelector, provider: vscode.DeclarationProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDeclarationProvider(extension, checkSelector(selector), provider);
			},
			registerImplementationProvider(selector: vscode.DocumentSelector, provider: vscode.ImplementationProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerImplementationProvider(extension, checkSelector(selector), provider);
			},
			registerTypeDefinitionProvider(selector: vscode.DocumentSelector, provider: vscode.TypeDefinitionProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerTypeDefinitionProvider(extension, checkSelector(selector), provider);
			},
			registerHoverProvider(selector: vscode.DocumentSelector, provider: vscode.HoverProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerHoverProvider(extension, checkSelector(selector), provider, extension.identifier);
			},
			registerEvaluataBleExpressionProvider(selector: vscode.DocumentSelector, provider: vscode.EvaluataBleExpressionProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerEvaluataBleExpressionProvider(extension, checkSelector(selector), provider, extension.identifier);
			},
			registerDocumentHighlightProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentHighlightProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentHighlightProvider(extension, checkSelector(selector), provider);
			},
			registerOnTypeRenameProvider(selector: vscode.DocumentSelector, provider: vscode.OnTypeRenameProvider, stopPattern?: RegExp): vscode.DisposaBle {
				checkProposedApiEnaBled(extension);
				return extHostLanguageFeatures.registerOnTypeRenameProvider(extension, checkSelector(selector), provider, stopPattern);
			},
			registerReferenceProvider(selector: vscode.DocumentSelector, provider: vscode.ReferenceProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerReferenceProvider(extension, checkSelector(selector), provider);
			},
			registerRenameProvider(selector: vscode.DocumentSelector, provider: vscode.RenameProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerRenameProvider(extension, checkSelector(selector), provider);
			},
			registerDocumentSymBolProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentSymBolProvider, metadata?: vscode.DocumentSymBolProviderMetadata): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentSymBolProvider(extension, checkSelector(selector), provider, metadata);
			},
			registerWorkspaceSymBolProvider(provider: vscode.WorkspaceSymBolProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerWorkspaceSymBolProvider(extension, provider);
			},
			registerDocumentFormattingEditProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentFormattingEditProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentFormattingEditProvider(extension, checkSelector(selector), provider);
			},
			registerDocumentRangeFormattingEditProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentRangeFormattingEditProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentRangeFormattingEditProvider(extension, checkSelector(selector), provider);
			},
			registerOnTypeFormattingEditProvider(selector: vscode.DocumentSelector, provider: vscode.OnTypeFormattingEditProvider, firstTriggerCharacter: string, ...moreTriggerCharacters: string[]): vscode.DisposaBle {
				return extHostLanguageFeatures.registerOnTypeFormattingEditProvider(extension, checkSelector(selector), provider, [firstTriggerCharacter].concat(moreTriggerCharacters));
			},
			registerDocumentSemanticTokensProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentSemanticTokensProvider, legend: vscode.SemanticTokensLegend): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
			},
			registerDocumentRangeSemanticTokensProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentRangeSemanticTokensProvider, legend: vscode.SemanticTokensLegend): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentRangeSemanticTokensProvider(extension, checkSelector(selector), provider, legend);
			},
			registerSignatureHelpProvider(selector: vscode.DocumentSelector, provider: vscode.SignatureHelpProvider, firstItem?: string | vscode.SignatureHelpProviderMetadata, ...remaining: string[]): vscode.DisposaBle {
				if (typeof firstItem === 'oBject') {
					return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, firstItem);
				}
				return extHostLanguageFeatures.registerSignatureHelpProvider(extension, checkSelector(selector), provider, typeof firstItem === 'undefined' ? [] : [firstItem, ...remaining]);
			},
			registerCompletionItemProvider(selector: vscode.DocumentSelector, provider: vscode.CompletionItemProvider, ...triggerCharacters: string[]): vscode.DisposaBle {
				return extHostLanguageFeatures.registerCompletionItemProvider(extension, checkSelector(selector), provider, triggerCharacters);
			},
			registerDocumentLinkProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentLinkProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerDocumentLinkProvider(extension, checkSelector(selector), provider);
			},
			registerColorProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentColorProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerColorProvider(extension, checkSelector(selector), provider);
			},
			registerFoldingRangeProvider(selector: vscode.DocumentSelector, provider: vscode.FoldingRangeProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerFoldingRangeProvider(extension, checkSelector(selector), provider);
			},
			registerSelectionRangeProvider(selector: vscode.DocumentSelector, provider: vscode.SelectionRangeProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerSelectionRangeProvider(extension, selector, provider);
			},
			registerCallHierarchyProvider(selector: vscode.DocumentSelector, provider: vscode.CallHierarchyProvider): vscode.DisposaBle {
				return extHostLanguageFeatures.registerCallHierarchyProvider(extension, selector, provider);
			},
			setLanguageConfiguration: (language: string, configuration: vscode.LanguageConfiguration): vscode.DisposaBle => {
				return extHostLanguageFeatures.setLanguageConfiguration(extension, language, configuration);
			},
			getTokenInformationAtPosition(doc: vscode.TextDocument, pos: vscode.Position) {
				checkProposedApiEnaBled(extension);
				return extHostLanguages.tokenAtPosition(doc, pos);
			}
		};

		// namespace: window
		const window: typeof vscode.window = {
			get activeTextEditor() {
				return extHostEditors.getActiveTextEditor();
			},
			get visiBleTextEditors() {
				return extHostEditors.getVisiBleTextEditors();
			},
			get activeTerminal() {
				return extHostTerminalService.activeTerminal;
			},
			get terminals() {
				return extHostTerminalService.terminals;
			},
			async showTextDocument(documentOrUri: vscode.TextDocument | vscode.Uri, columnOrOptions?: vscode.ViewColumn | vscode.TextDocumentShowOptions, preserveFocus?: Boolean): Promise<vscode.TextEditor> {
				const document = await (URI.isUri(documentOrUri)
					? Promise.resolve(workspace.openTextDocument(documentOrUri))
					: Promise.resolve(<vscode.TextDocument>documentOrUri));

				return extHostEditors.showTextDocument(document, columnOrOptions, preserveFocus);
			},
			createTextEditorDecorationType(options: vscode.DecorationRenderOptions): vscode.TextEditorDecorationType {
				return extHostEditors.createTextEditorDecorationType(options);
			},
			onDidChangeActiveTextEditor(listener, thisArg?, disposaBles?) {
				return extHostEditors.onDidChangeActiveTextEditor(listener, thisArg, disposaBles);
			},
			onDidChangeVisiBleTextEditors(listener, thisArg, disposaBles) {
				return extHostEditors.onDidChangeVisiBleTextEditors(listener, thisArg, disposaBles);
			},
			onDidChangeTextEditorSelection(listener: (e: vscode.TextEditorSelectionChangeEvent) => any, thisArgs?: any, disposaBles?: extHostTypes.DisposaBle[]) {
				return extHostEditors.onDidChangeTextEditorSelection(listener, thisArgs, disposaBles);
			},
			onDidChangeTextEditorOptions(listener: (e: vscode.TextEditorOptionsChangeEvent) => any, thisArgs?: any, disposaBles?: extHostTypes.DisposaBle[]) {
				return extHostEditors.onDidChangeTextEditorOptions(listener, thisArgs, disposaBles);
			},
			onDidChangeTextEditorVisiBleRanges(listener: (e: vscode.TextEditorVisiBleRangesChangeEvent) => any, thisArgs?: any, disposaBles?: extHostTypes.DisposaBle[]) {
				return extHostEditors.onDidChangeTextEditorVisiBleRanges(listener, thisArgs, disposaBles);
			},
			onDidChangeTextEditorViewColumn(listener, thisArg?, disposaBles?) {
				return extHostEditors.onDidChangeTextEditorViewColumn(listener, thisArg, disposaBles);
			},
			onDidCloseTerminal(listener, thisArg?, disposaBles?) {
				return extHostTerminalService.onDidCloseTerminal(listener, thisArg, disposaBles);
			},
			onDidOpenTerminal(listener, thisArg?, disposaBles?) {
				return extHostTerminalService.onDidOpenTerminal(listener, thisArg, disposaBles);
			},
			onDidChangeActiveTerminal(listener, thisArg?, disposaBles?) {
				return extHostTerminalService.onDidChangeActiveTerminal(listener, thisArg, disposaBles);
			},
			onDidChangeTerminalDimensions(listener, thisArg?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostTerminalService.onDidChangeTerminalDimensions(listener, thisArg, disposaBles);
			},
			onDidWriteTerminalData(listener, thisArg?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostTerminalService.onDidWriteTerminalData(listener, thisArg, disposaBles);
			},
			get state() {
				return extHostWindow.state;
			},
			onDidChangeWindowState(listener, thisArg?, disposaBles?) {
				return extHostWindow.onDidChangeWindowState(listener, thisArg, disposaBles);
			},
			showInformationMessage(message: string, ...rest: Array<vscode.MessageOptions | string | vscode.MessageItem>) {
				return <ThenaBle<any>>extHostMessageService.showMessage(extension, Severity.Info, message, rest[0], <Array<string | vscode.MessageItem>>rest.slice(1));
			},
			showWarningMessage(message: string, ...rest: Array<vscode.MessageOptions | string | vscode.MessageItem>) {
				return <ThenaBle<any>>extHostMessageService.showMessage(extension, Severity.Warning, message, rest[0], <Array<string | vscode.MessageItem>>rest.slice(1));
			},
			showErrorMessage(message: string, ...rest: Array<vscode.MessageOptions | string | vscode.MessageItem>) {
				return <ThenaBle<any>>extHostMessageService.showMessage(extension, Severity.Error, message, rest[0], <Array<string | vscode.MessageItem>>rest.slice(1));
			},
			showQuickPick(items: any, options?: vscode.QuickPickOptions, token?: vscode.CancellationToken): any {
				return extHostQuickOpen.showQuickPick(items, !!extension.enaBleProposedApi, options, token);
			},
			showWorkspaceFolderPick(options?: vscode.WorkspaceFolderPickOptions) {
				return extHostQuickOpen.showWorkspaceFolderPick(options);
			},
			showInputBox(options?: vscode.InputBoxOptions, token?: vscode.CancellationToken) {
				return extHostQuickOpen.showInput(options, token);
			},
			showOpenDialog(options) {
				return extHostDialogs.showOpenDialog(options);
			},
			showSaveDialog(options) {
				return extHostDialogs.showSaveDialog(options);
			},
			createStatusBarItem(alignmentOrOptions?: vscode.StatusBarAlignment | vscode.window.StatusBarItemOptions, priority?: numBer): vscode.StatusBarItem {
				let id: string;
				let name: string;
				let alignment: numBer | undefined;
				let accessiBilityInformation: vscode.AccessiBilityInformation | undefined = undefined;

				if (alignmentOrOptions && typeof alignmentOrOptions !== 'numBer') {
					id = alignmentOrOptions.id;
					name = alignmentOrOptions.name;
					alignment = alignmentOrOptions.alignment;
					priority = alignmentOrOptions.priority;
					accessiBilityInformation = alignmentOrOptions.accessiBilityInformation;
				} else {
					id = extension.identifier.value;
					name = nls.localize('extensionLaBel', "{0} (Extension)", extension.displayName || extension.name);
					alignment = alignmentOrOptions;
					priority = priority;
				}

				return extHostStatusBar.createStatusBarEntry(id, name, alignment, priority, accessiBilityInformation);
			},
			setStatusBarMessage(text: string, timeoutOrThenaBle?: numBer | ThenaBle<any>): vscode.DisposaBle {
				return extHostStatusBar.setStatusBarMessage(text, timeoutOrThenaBle);
			},
			withScmProgress<R>(task: (progress: vscode.Progress<numBer>) => ThenaBle<R>) {
				extHostApiDeprecation.report('window.withScmProgress', extension,
					`Use 'withProgress' instead.`);

				return extHostProgress.withProgress(extension, { location: extHostTypes.ProgressLocation.SourceControl }, (progress, token) => task({ report(n: numBer) { /*noop*/ } }));
			},
			withProgress<R>(options: vscode.ProgressOptions, task: (progress: vscode.Progress<{ message?: string; worked?: numBer }>, token: vscode.CancellationToken) => ThenaBle<R>) {
				return extHostProgress.withProgress(extension, options, task);
			},
			createOutputChannel(name: string): vscode.OutputChannel {
				return extHostOutputService.createOutputChannel(name);
			},
			createWeBviewPanel(viewType: string, title: string, showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn, preserveFocus?: Boolean }, options?: vscode.WeBviewPanelOptions & vscode.WeBviewOptions): vscode.WeBviewPanel {
				return extHostWeBviewPanels.createWeBviewPanel(extension, viewType, title, showOptions, options);
			},
			createWeBviewTextEditorInset(editor: vscode.TextEditor, line: numBer, height: numBer, options?: vscode.WeBviewOptions): vscode.WeBviewEditorInset {
				checkProposedApiEnaBled(extension);
				return extHostEditorInsets.createWeBviewEditorInset(editor, line, height, options, extension);
			},
			createTerminal(nameOrOptions?: vscode.TerminalOptions | vscode.ExtensionTerminalOptions | string, shellPath?: string, shellArgs?: string[] | string): vscode.Terminal {
				if (typeof nameOrOptions === 'oBject') {
					if ('pty' in nameOrOptions) {
						return extHostTerminalService.createExtensionTerminal(nameOrOptions);
					}
					return extHostTerminalService.createTerminalFromOptions(nameOrOptions);
				}
				return extHostTerminalService.createTerminal(nameOrOptions, shellPath, shellArgs);
			},
			registerTerminalLinkProvider(handler: vscode.TerminalLinkProvider): vscode.DisposaBle {
				return extHostTerminalService.registerLinkProvider(handler);
			},
			registerTreeDataProvider(viewId: string, treeDataProvider: vscode.TreeDataProvider<any>): vscode.DisposaBle {
				return extHostTreeViews.registerTreeDataProvider(viewId, treeDataProvider, extension);
			},
			createTreeView(viewId: string, options: { treeDataProvider: vscode.TreeDataProvider<any> }): vscode.TreeView<any> {
				return extHostTreeViews.createTreeView(viewId, options, extension);
			},
			registerWeBviewPanelSerializer: (viewType: string, serializer: vscode.WeBviewPanelSerializer) => {
				return extHostWeBviewPanels.registerWeBviewPanelSerializer(extension, viewType, serializer);
			},
			registerCustomEditorProvider: (viewType: string, provider: vscode.CustomTextEditorProvider | vscode.CustomReadonlyEditorProvider, options: { weBviewOptions?: vscode.WeBviewPanelOptions, supportsMultipleEditorsPerDocument?: Boolean } = {}) => {
				return extHostCustomEditors.registerCustomEditorProvider(extension, viewType, provider, options);
			},
			registerDecorationProvider(provider: vscode.FileDecorationProvider) {
				checkProposedApiEnaBled(extension);
				return extHostDecorations.registerDecorationProvider(provider, extension.identifier);
			},
			registerUriHandler(handler: vscode.UriHandler) {
				return extHostUrls.registerUriHandler(extension.identifier, handler);
			},
			createQuickPick<T extends vscode.QuickPickItem>(): vscode.QuickPick<T> {
				return extHostQuickOpen.createQuickPick(extension.identifier, !!extension.enaBleProposedApi);
			},
			createInputBox(): vscode.InputBox {
				return extHostQuickOpen.createInputBox(extension.identifier);
			},
			get activeColorTheme(): vscode.ColorTheme {
				return extHostTheming.activeColorTheme;
			},
			onDidChangeActiveColorTheme(listener, thisArg?, disposaBles?) {
				return extHostTheming.onDidChangeActiveColorTheme(listener, thisArg, disposaBles);
			},
			registerWeBviewViewProvider(viewId: string, provider: vscode.WeBviewViewProvider, options?: {
				weBviewOptions?: {
					retainContextWhenHidden?: Boolean
				}
			}) {
				return extHostWeBviewViews.registerWeBviewViewProvider(extension, viewId, provider, options?.weBviewOptions);
			},
			get activeNoteBookEditor(): vscode.NoteBookEditor | undefined {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.activeNoteBookEditor;
			},
			onDidChangeActiveNoteBookEditor(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeActiveNoteBookEditor(listener, thisArgs, disposaBles);
			},
			get visiBleNoteBookEditors() {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.visiBleNoteBookEditors;
			},
			get onDidChangeVisiBleNoteBookEditors() {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeVisiBleNoteBookEditors;
			},
			onDidChangeNoteBookEditorSelection(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeNoteBookEditorSelection(listener, thisArgs, disposaBles);
			},
			onDidChangeNoteBookEditorVisiBleRanges(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeNoteBookEditorVisiBleRanges(listener, thisArgs, disposaBles);
			},
		};

		// namespace: workspace

		const workspace: typeof vscode.workspace = {
			get rootPath() {
				extHostApiDeprecation.report('workspace.rootPath', extension,
					`Please use 'workspace.workspaceFolders' instead. More details: https://aka.ms/vscode-eliminating-rootpath`);

				return extHostWorkspace.getPath();
			},
			set rootPath(value) {
				throw errors.readonly();
			},
			getWorkspaceFolder(resource) {
				return extHostWorkspace.getWorkspaceFolder(resource);
			},
			get workspaceFolders() {
				return extHostWorkspace.getWorkspaceFolders();
			},
			get name() {
				return extHostWorkspace.name;
			},
			set name(value) {
				throw errors.readonly();
			},
			get workspaceFile() {
				return extHostWorkspace.workspaceFile;
			},
			set workspaceFile(value) {
				throw errors.readonly();
			},
			updateWorkspaceFolders: (index, deleteCount, ...workspaceFoldersToAdd) => {
				return extHostWorkspace.updateWorkspaceFolders(extension, index, deleteCount || 0, ...workspaceFoldersToAdd);
			},
			onDidChangeWorkspaceFolders: function (listener, thisArgs?, disposaBles?) {
				return extHostWorkspace.onDidChangeWorkspace(listener, thisArgs, disposaBles);
			},
			asRelativePath: (pathOrUri, includeWorkspace?) => {
				return extHostWorkspace.getRelativePath(pathOrUri, includeWorkspace);
			},
			findFiles: (include, exclude, maxResults?, token?) => {
				// Note, undefined/null have different meanings on "exclude"
				return extHostWorkspace.findFiles(typeConverters.GloBPattern.from(include), typeConverters.GloBPattern.from(exclude), maxResults, extension.identifier, token);
			},
			findTextInFiles: (query: vscode.TextSearchQuery, optionsOrCallBack: vscode.FindTextInFilesOptions | ((result: vscode.TextSearchResult) => void), callBackOrToken?: vscode.CancellationToken | ((result: vscode.TextSearchResult) => void), token?: vscode.CancellationToken) => {
				let options: vscode.FindTextInFilesOptions;
				let callBack: (result: vscode.TextSearchResult) => void;

				if (typeof optionsOrCallBack === 'oBject') {
					options = optionsOrCallBack;
					callBack = callBackOrToken as (result: vscode.TextSearchResult) => void;
				} else {
					options = {};
					callBack = optionsOrCallBack;
					token = callBackOrToken as vscode.CancellationToken;
				}

				return extHostWorkspace.findTextInFiles(query, options || {}, callBack, extension.identifier, token);
			},
			saveAll: (includeUntitled?) => {
				return extHostWorkspace.saveAll(includeUntitled);
			},
			applyEdit(edit: vscode.WorkspaceEdit): ThenaBle<Boolean> {
				return extHostBulkEdits.applyWorkspaceEdit(edit);
			},
			createFileSystemWatcher: (pattern, ignoreCreate, ignoreChange, ignoreDelete): vscode.FileSystemWatcher => {
				return extHostFileSystemEvent.createFileSystemWatcher(typeConverters.GloBPattern.from(pattern), ignoreCreate, ignoreChange, ignoreDelete);
			},
			get textDocuments() {
				return extHostDocuments.getAllDocumentData().map(data => data.document);
			},
			set textDocuments(value) {
				throw errors.readonly();
			},
			openTextDocument(uriOrFileNameOrOptions?: vscode.Uri | string | { language?: string; content?: string; }) {
				let uriPromise: ThenaBle<URI>;

				const options = uriOrFileNameOrOptions as { language?: string; content?: string; };
				if (typeof uriOrFileNameOrOptions === 'string') {
					uriPromise = Promise.resolve(URI.file(uriOrFileNameOrOptions));
				} else if (URI.isUri(uriOrFileNameOrOptions)) {
					uriPromise = Promise.resolve(uriOrFileNameOrOptions);
				} else if (!options || typeof options === 'oBject') {
					uriPromise = extHostDocuments.createDocumentData(options);
				} else {
					throw new Error('illegal argument - uriOrFileNameOrOptions');
				}

				return uriPromise.then(uri => {
					return extHostDocuments.ensureDocumentData(uri).then(documentData => {
						return documentData.document;
					});
				});
			},
			onDidOpenTextDocument: (listener, thisArgs?, disposaBles?) => {
				return extHostDocuments.onDidAddDocument(listener, thisArgs, disposaBles);
			},
			onDidCloseTextDocument: (listener, thisArgs?, disposaBles?) => {
				return extHostDocuments.onDidRemoveDocument(listener, thisArgs, disposaBles);
			},
			onDidChangeTextDocument: (listener, thisArgs?, disposaBles?) => {
				return extHostDocuments.onDidChangeDocument(listener, thisArgs, disposaBles);
			},
			onDidSaveTextDocument: (listener, thisArgs?, disposaBles?) => {
				return extHostDocuments.onDidSaveDocument(listener, thisArgs, disposaBles);
			},
			onWillSaveTextDocument: (listener, thisArgs?, disposaBles?) => {
				return extHostDocumentSaveParticipant.getOnWillSaveTextDocumentEvent(extension)(listener, thisArgs, disposaBles);
			},
			onDidChangeConfiguration: (listener: (_: any) => any, thisArgs?: any, disposaBles?: extHostTypes.DisposaBle[]) => {
				return configProvider.onDidChangeConfiguration(listener, thisArgs, disposaBles);
			},
			getConfiguration(section?: string, scope?: vscode.ConfigurationScope | null): vscode.WorkspaceConfiguration {
				scope = arguments.length === 1 ? undefined : scope;
				return configProvider.getConfiguration(section, scope, extension);
			},
			registerTextDocumentContentProvider(scheme: string, provider: vscode.TextDocumentContentProvider) {
				return extHostDocumentContentProviders.registerTextDocumentContentProvider(scheme, provider);
			},
			registerTaskProvider: (type: string, provider: vscode.TaskProvider) => {
				extHostApiDeprecation.report('window.registerTaskProvider', extension,
					`Use the corresponding function on the 'tasks' namespace instead`);

				return extHostTask.registerTaskProvider(extension, type, provider);
			},
			registerFileSystemProvider(scheme, provider, options) {
				return extHostFileSystem.registerFileSystemProvider(extension.identifier, scheme, provider, options);
			},
			get fs() {
				return extHostConsumerFileSystem;
			},
			registerFileSearchProvider: (scheme: string, provider: vscode.FileSearchProvider) => {
				checkProposedApiEnaBled(extension);
				return extHostSearch.registerFileSearchProvider(scheme, provider);
			},
			registerTextSearchProvider: (scheme: string, provider: vscode.TextSearchProvider) => {
				checkProposedApiEnaBled(extension);
				return extHostSearch.registerTextSearchProvider(scheme, provider);
			},
			registerRemoteAuthorityResolver: (authorityPrefix: string, resolver: vscode.RemoteAuthorityResolver) => {
				checkProposedApiEnaBled(extension);
				return extensionService.registerRemoteAuthorityResolver(authorityPrefix, resolver);
			},
			registerResourceLaBelFormatter: (formatter: vscode.ResourceLaBelFormatter) => {
				checkProposedApiEnaBled(extension);
				return extHostLaBelService.$registerResourceLaBelFormatter(formatter);
			},
			onDidCreateFiles: (listener, thisArg, disposaBles) => {
				return extHostFileSystemEvent.onDidCreateFile(listener, thisArg, disposaBles);
			},
			onDidDeleteFiles: (listener, thisArg, disposaBles) => {
				return extHostFileSystemEvent.onDidDeleteFile(listener, thisArg, disposaBles);
			},
			onDidRenameFiles: (listener, thisArg, disposaBles) => {
				return extHostFileSystemEvent.onDidRenameFile(listener, thisArg, disposaBles);
			},
			onWillCreateFiles: (listener: (e: vscode.FileWillCreateEvent) => any, thisArg?: any, disposaBles?: vscode.DisposaBle[]) => {
				return extHostFileSystemEvent.getOnWillCreateFileEvent(extension)(listener, thisArg, disposaBles);
			},
			onWillDeleteFiles: (listener: (e: vscode.FileWillDeleteEvent) => any, thisArg?: any, disposaBles?: vscode.DisposaBle[]) => {
				return extHostFileSystemEvent.getOnWillDeleteFileEvent(extension)(listener, thisArg, disposaBles);
			},
			onWillRenameFiles: (listener: (e: vscode.FileWillRenameEvent) => any, thisArg?: any, disposaBles?: vscode.DisposaBle[]) => {
				return extHostFileSystemEvent.getOnWillRenameFileEvent(extension)(listener, thisArg, disposaBles);
			},
			openTunnel: (forward: vscode.TunnelOptions) => {
				checkProposedApiEnaBled(extension);
				return extHostTunnelService.openTunnel(forward).then(value => {
					if (!value) {
						throw new Error('cannot open tunnel');
					}
					return value;
				});
			},
			get tunnels() {
				checkProposedApiEnaBled(extension);
				return extHostTunnelService.getTunnels();
			},
			onDidChangeTunnels: (listener, thisArg?, disposaBles?) => {
				checkProposedApiEnaBled(extension);
				return extHostTunnelService.onDidChangeTunnels(listener, thisArg, disposaBles);

			},
			registerTimelineProvider: (scheme: string | string[], provider: vscode.TimelineProvider) => {
				checkProposedApiEnaBled(extension);
				return extHostTimeline.registerTimelineProvider(scheme, provider, extension.identifier, extHostCommands.converter);
			}
		};

		// namespace: scm
		const scm: typeof vscode.scm = {
			get inputBox() {
				extHostApiDeprecation.report('scm.inputBox', extension,
					`Use 'SourceControl.inputBox' instead`);

				return extHostSCM.getLastInputBox(extension)!; // Strict null override - Deprecated api
			},
			createSourceControl(id: string, laBel: string, rootUri?: vscode.Uri) {
				return extHostSCM.createSourceControl(extension, id, laBel, rootUri);
			}
		};

		const comment: typeof vscode.comments = {
			createCommentController(id: string, laBel: string) {
				return extHostComment.createCommentController(extension, id, laBel);
			}
		};

		const comments = comment;

		// namespace: deBug
		const deBug: typeof vscode.deBug = {
			get activeDeBugSession() {
				return extHostDeBugService.activeDeBugSession;
			},
			get activeDeBugConsole() {
				return extHostDeBugService.activeDeBugConsole;
			},
			get Breakpoints() {
				return extHostDeBugService.Breakpoints;
			},
			onDidStartDeBugSession(listener, thisArg?, disposaBles?) {
				return extHostDeBugService.onDidStartDeBugSession(listener, thisArg, disposaBles);
			},
			onDidTerminateDeBugSession(listener, thisArg?, disposaBles?) {
				return extHostDeBugService.onDidTerminateDeBugSession(listener, thisArg, disposaBles);
			},
			onDidChangeActiveDeBugSession(listener, thisArg?, disposaBles?) {
				return extHostDeBugService.onDidChangeActiveDeBugSession(listener, thisArg, disposaBles);
			},
			onDidReceiveDeBugSessionCustomEvent(listener, thisArg?, disposaBles?) {
				return extHostDeBugService.onDidReceiveDeBugSessionCustomEvent(listener, thisArg, disposaBles);
			},
			onDidChangeBreakpoints(listener, thisArgs?, disposaBles?) {
				return extHostDeBugService.onDidChangeBreakpoints(listener, thisArgs, disposaBles);
			},
			registerDeBugConfigurationProvider(deBugType: string, provider: vscode.DeBugConfigurationProvider, triggerKind?: vscode.DeBugConfigurationProviderTriggerKind) {
				return extHostDeBugService.registerDeBugConfigurationProvider(deBugType, provider, triggerKind || extHostTypes.DeBugConfigurationProviderTriggerKind.Initial);
			},
			registerDeBugAdapterDescriptorFactory(deBugType: string, factory: vscode.DeBugAdapterDescriptorFactory) {
				return extHostDeBugService.registerDeBugAdapterDescriptorFactory(extension, deBugType, factory);
			},
			registerDeBugAdapterTrackerFactory(deBugType: string, factory: vscode.DeBugAdapterTrackerFactory) {
				return extHostDeBugService.registerDeBugAdapterTrackerFactory(deBugType, factory);
			},
			startDeBugging(folder: vscode.WorkspaceFolder | undefined, nameOrConfig: string | vscode.DeBugConfiguration, parentSessionOrOptions?: vscode.DeBugSession | vscode.DeBugSessionOptions) {
				if (!parentSessionOrOptions || (typeof parentSessionOrOptions === 'oBject' && 'configuration' in parentSessionOrOptions)) {
					return extHostDeBugService.startDeBugging(folder, nameOrConfig, { parentSession: parentSessionOrOptions });
				}
				return extHostDeBugService.startDeBugging(folder, nameOrConfig, parentSessionOrOptions || {});
			},
			stopDeBugging(session?: vscode.DeBugSession) {
				return extHostDeBugService.stopDeBugging(session);
			},
			addBreakpoints(Breakpoints: vscode.Breakpoint[]) {
				return extHostDeBugService.addBreakpoints(Breakpoints);
			},
			removeBreakpoints(Breakpoints: vscode.Breakpoint[]) {
				return extHostDeBugService.removeBreakpoints(Breakpoints);
			},
			asDeBugSourceUri(source: vscode.DeBugProtocolSource, session?: vscode.DeBugSession): vscode.Uri {
				return extHostDeBugService.asDeBugSourceUri(source, session);
			}
		};

		const tasks: typeof vscode.tasks = {
			registerTaskProvider: (type: string, provider: vscode.TaskProvider) => {
				return extHostTask.registerTaskProvider(extension, type, provider);
			},
			fetchTasks: (filter?: vscode.TaskFilter): ThenaBle<vscode.Task[]> => {
				return extHostTask.fetchTasks(filter);
			},
			executeTask: (task: vscode.Task): ThenaBle<vscode.TaskExecution> => {
				return extHostTask.executeTask(extension, task);
			},
			get taskExecutions(): vscode.TaskExecution[] {
				return extHostTask.taskExecutions;
			},
			onDidStartTask: (listeners, thisArgs?, disposaBles?) => {
				return extHostTask.onDidStartTask(listeners, thisArgs, disposaBles);
			},
			onDidEndTask: (listeners, thisArgs?, disposaBles?) => {
				return extHostTask.onDidEndTask(listeners, thisArgs, disposaBles);
			},
			onDidStartTaskProcess: (listeners, thisArgs?, disposaBles?) => {
				return extHostTask.onDidStartTaskProcess(listeners, thisArgs, disposaBles);
			},
			onDidEndTaskProcess: (listeners, thisArgs?, disposaBles?) => {
				return extHostTask.onDidEndTaskProcess(listeners, thisArgs, disposaBles);
			}
		};

		// namespace: noteBook
		const noteBook: (typeof vscode.noteBook & {
			// to ensure that noteBook extensions not Break Before they update APIs.
			visiBleNoteBookEditors: vscode.NoteBookEditor[];
			onDidChangeVisiBleNoteBookEditors: Event<vscode.NoteBookEditor[]>;
			activeNoteBookEditor: vscode.NoteBookEditor | undefined;
			onDidChangeActiveNoteBookEditor: Event<vscode.NoteBookEditor | undefined>;
			onDidChangeNoteBookEditorSelection: Event<vscode.NoteBookEditorSelectionChangeEvent>;
			onDidChangeNoteBookEditorVisiBleRanges: Event<vscode.NoteBookEditorVisiBleRangesChangeEvent>;
		}) = {
			openNoteBookDocument: (uriComponents, viewType) => {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.openNoteBookDocument(uriComponents, viewType);
			},
			get onDidOpenNoteBookDocument(): Event<vscode.NoteBookDocument> {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidOpenNoteBookDocument;
			},
			get onDidCloseNoteBookDocument(): Event<vscode.NoteBookDocument> {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidCloseNoteBookDocument;
			},
			get onDidSaveNoteBookDocument(): Event<vscode.NoteBookDocument> {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidSaveNoteBookDocument;
			},
			get noteBookDocuments(): vscode.NoteBookDocument[] {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.noteBookDocuments.map(d => d.noteBookDocument);
			},
			get visiBleNoteBookEditors(): vscode.NoteBookEditor[] {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.visiBleNoteBookEditors;
			},
			get onDidChangeVisiBleNoteBookEditors() {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeVisiBleNoteBookEditors;
			},
			get onDidChangeActiveNoteBookKernel() {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeActiveNoteBookKernel;
			},
			registerNoteBookContentProvider: (viewType: string, provider: vscode.NoteBookContentProvider, options?: {
				transientOutputs: Boolean;
				transientMetadata: { [K in keyof vscode.NoteBookCellMetadata]?: Boolean }
			}) => {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.registerNoteBookContentProvider(extension, viewType, provider, options);
			},
			registerNoteBookKernelProvider: (selector: vscode.NoteBookDocumentFilter, provider: vscode.NoteBookKernelProvider) => {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.registerNoteBookKernelProvider(extension, selector, provider);
			},
			createNoteBookEditorDecorationType(options: vscode.NoteBookDecorationRenderOptions): vscode.NoteBookEditorDecorationType {
				return extHostNoteBook.createNoteBookEditorDecorationType(options);
			},
			get activeNoteBookEditor(): vscode.NoteBookEditor | undefined {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.activeNoteBookEditor;
			},
			onDidChangeActiveNoteBookEditor(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeActiveNoteBookEditor(listener, thisArgs, disposaBles);
			},
			onDidChangeNoteBookDocumentMetadata(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeNoteBookDocumentMetadata(listener, thisArgs, disposaBles);
			},
			onDidChangeNoteBookCells(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeNoteBookCells(listener, thisArgs, disposaBles);
			},
			onDidChangeNoteBookEditorSelection(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeNoteBookEditorSelection(listener, thisArgs, disposaBles);
			},
			onDidChangeNoteBookEditorVisiBleRanges(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeNoteBookEditorVisiBleRanges(listener, thisArgs, disposaBles);
			},
			onDidChangeCellOutputs(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeCellOutputs(listener, thisArgs, disposaBles);
			},
			onDidChangeCellLanguage(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeCellLanguage(listener, thisArgs, disposaBles);
			},
			onDidChangeCellMetadata(listener, thisArgs?, disposaBles?) {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.onDidChangeCellMetadata(listener, thisArgs, disposaBles);
			},
			createConcatTextDocument(noteBook, selector) {
				checkProposedApiEnaBled(extension);
				return new ExtHostNoteBookConcatDocument(extHostNoteBook, extHostDocuments, noteBook, selector);
			},
			createCellStatusBarItem(cell: vscode.NoteBookCell, alignment?: vscode.NoteBookCellStatusBarAlignment, priority?: numBer): vscode.NoteBookCellStatusBarItem {
				checkProposedApiEnaBled(extension);
				return extHostNoteBook.createNoteBookCellStatusBarItemInternal(cell, alignment, priority);
			}
		};

		return <typeof vscode>{
			version: initData.version,
			// namespaces
			authentication,
			commands,
			deBug,
			env,
			extensions,
			languages,
			scm,
			comment,
			comments,
			tasks,
			noteBook,
			window,
			workspace,
			// types
			Breakpoint: extHostTypes.Breakpoint,
			CancellationTokenSource: CancellationTokenSource,
			CodeAction: extHostTypes.CodeAction,
			CodeActionKind: extHostTypes.CodeActionKind,
			CodeActionTrigger: extHostTypes.CodeActionTrigger,
			CodeLens: extHostTypes.CodeLens,
			CodeInset: extHostTypes.CodeInset,
			Color: extHostTypes.Color,
			ColorInformation: extHostTypes.ColorInformation,
			ColorPresentation: extHostTypes.ColorPresentation,
			CommentThreadCollapsiBleState: extHostTypes.CommentThreadCollapsiBleState,
			CommentMode: extHostTypes.CommentMode,
			CompletionItem: extHostTypes.CompletionItem,
			CompletionItemKind: extHostTypes.CompletionItemKind,
			CompletionItemTag: extHostTypes.CompletionItemTag,
			CompletionList: extHostTypes.CompletionList,
			CompletionTriggerKind: extHostTypes.CompletionTriggerKind,
			ConfigurationTarget: extHostTypes.ConfigurationTarget,
			DeBugAdapterExecutaBle: extHostTypes.DeBugAdapterExecutaBle,
			DeBugAdapterServer: extHostTypes.DeBugAdapterServer,
			DeBugAdapterNamedPipeServer: extHostTypes.DeBugAdapterNamedPipeServer,
			DeBugAdapterInlineImplementation: extHostTypes.DeBugAdapterInlineImplementation,
			DecorationRangeBehavior: extHostTypes.DecorationRangeBehavior,
			Diagnostic: extHostTypes.Diagnostic,
			DiagnosticRelatedInformation: extHostTypes.DiagnosticRelatedInformation,
			DiagnosticSeverity: extHostTypes.DiagnosticSeverity,
			DiagnosticTag: extHostTypes.DiagnosticTag,
			DisposaBle: extHostTypes.DisposaBle,
			DocumentHighlight: extHostTypes.DocumentHighlight,
			DocumentHighlightKind: extHostTypes.DocumentHighlightKind,
			DocumentLink: extHostTypes.DocumentLink,
			DocumentSymBol: extHostTypes.DocumentSymBol,
			EndOfLine: extHostTypes.EndOfLine,
			EnvironmentVariaBleMutatorType: extHostTypes.EnvironmentVariaBleMutatorType,
			EvaluataBleExpression: extHostTypes.EvaluataBleExpression,
			EventEmitter: Emitter,
			ExtensionKind: extHostTypes.ExtensionKind,
			ExtensionMode: extHostTypes.ExtensionMode,
			ExtensionRuntime: extHostTypes.ExtensionRuntime,
			CustomExecution: extHostTypes.CustomExecution,
			FileChangeType: extHostTypes.FileChangeType,
			FileSystemError: extHostTypes.FileSystemError,
			FileType: files.FileType,
			FoldingRange: extHostTypes.FoldingRange,
			FoldingRangeKind: extHostTypes.FoldingRangeKind,
			FunctionBreakpoint: extHostTypes.FunctionBreakpoint,
			Hover: extHostTypes.Hover,
			IndentAction: languageConfiguration.IndentAction,
			Location: extHostTypes.Location,
			LogLevel: extHostTypes.LogLevel,
			MarkdownString: extHostTypes.MarkdownString,
			OverviewRulerLane: OverviewRulerLane,
			ParameterInformation: extHostTypes.ParameterInformation,
			Position: extHostTypes.Position,
			ProcessExecution: extHostTypes.ProcessExecution,
			ProgressLocation: extHostTypes.ProgressLocation,
			QuickInputButtons: extHostTypes.QuickInputButtons,
			Range: extHostTypes.Range,
			RelativePattern: extHostTypes.RelativePattern,
			ResolvedAuthority: extHostTypes.ResolvedAuthority,
			RemoteAuthorityResolverError: extHostTypes.RemoteAuthorityResolverError,
			SemanticTokensLegend: extHostTypes.SemanticTokensLegend,
			SemanticTokensBuilder: extHostTypes.SemanticTokensBuilder,
			SemanticTokens: extHostTypes.SemanticTokens,
			SemanticTokensEdits: extHostTypes.SemanticTokensEdits,
			SemanticTokensEdit: extHostTypes.SemanticTokensEdit,
			Selection: extHostTypes.Selection,
			SelectionRange: extHostTypes.SelectionRange,
			ShellExecution: extHostTypes.ShellExecution,
			ShellQuoting: extHostTypes.ShellQuoting,
			SignatureHelpTriggerKind: extHostTypes.SignatureHelpTriggerKind,
			SignatureHelp: extHostTypes.SignatureHelp,
			SignatureInformation: extHostTypes.SignatureInformation,
			SnippetString: extHostTypes.SnippetString,
			SourceBreakpoint: extHostTypes.SourceBreakpoint,
			SourceControlInputBoxValidationType: extHostTypes.SourceControlInputBoxValidationType,
			StandardTokenType: extHostTypes.StandardTokenType,
			StatusBarAlignment: extHostTypes.StatusBarAlignment,
			SymBolInformation: extHostTypes.SymBolInformation,
			SymBolKind: extHostTypes.SymBolKind,
			SymBolTag: extHostTypes.SymBolTag,
			Task: extHostTypes.Task,
			TaskGroup: extHostTypes.TaskGroup,
			TaskPanelKind: extHostTypes.TaskPanelKind,
			TaskRevealKind: extHostTypes.TaskRevealKind,
			TaskScope: extHostTypes.TaskScope,
			TextDocumentSaveReason: extHostTypes.TextDocumentSaveReason,
			TextEdit: extHostTypes.TextEdit,
			TextEditorCursorStyle: TextEditorCursorStyle,
			TextEditorLineNumBersStyle: extHostTypes.TextEditorLineNumBersStyle,
			TextEditorRevealType: extHostTypes.TextEditorRevealType,
			TextEditorSelectionChangeKind: extHostTypes.TextEditorSelectionChangeKind,
			ThemeColor: extHostTypes.ThemeColor,
			ThemeIcon: extHostTypes.ThemeIcon,
			TreeItem: extHostTypes.TreeItem,
			TreeItem2: extHostTypes.TreeItem,
			TreeItemCollapsiBleState: extHostTypes.TreeItemCollapsiBleState,
			Uri: URI,
			ViewColumn: extHostTypes.ViewColumn,
			WorkspaceEdit: extHostTypes.WorkspaceEdit,
			// proposed
			CallHierarchyOutgoingCall: extHostTypes.CallHierarchyOutgoingCall,
			CallHierarchyIncomingCall: extHostTypes.CallHierarchyIncomingCall,
			CallHierarchyItem: extHostTypes.CallHierarchyItem,
			DeBugConsoleMode: extHostTypes.DeBugConsoleMode,
			DeBugConfigurationProviderTriggerKind: extHostTypes.DeBugConfigurationProviderTriggerKind,
			FileDecoration: extHostTypes.FileDecoration,
			UIKind: UIKind,
			ColorThemeKind: extHostTypes.ColorThemeKind,
			TimelineItem: extHostTypes.TimelineItem,
			CellKind: extHostTypes.CellKind,
			CellOutputKind: extHostTypes.CellOutputKind,
			NoteBookCellRunState: extHostTypes.NoteBookCellRunState,
			NoteBookRunState: extHostTypes.NoteBookRunState,
			NoteBookCellStatusBarAlignment: extHostTypes.NoteBookCellStatusBarAlignment,
			NoteBookEditorRevealType: extHostTypes.NoteBookEditorRevealType,
			NoteBookCellOutput: extHostTypes.NoteBookCellOutput,
			NoteBookCellOutputItem: extHostTypes.NoteBookCellOutputItem,
		};
	};
}

class Extension<T> implements vscode.Extension<T> {

	private _extensionService: IExtHostExtensionService;
	private _originExtensionId: ExtensionIdentifier;
	private _identifier: ExtensionIdentifier;

	readonly id: string;
	readonly extensionUri: URI;
	readonly extensionPath: string;
	readonly packageJSON: IExtensionDescription;
	readonly extensionKind: vscode.ExtensionKind;

	constructor(extensionService: IExtHostExtensionService, originExtensionId: ExtensionIdentifier, description: IExtensionDescription, kind: extHostTypes.ExtensionKind) {
		this._extensionService = extensionService;
		this._originExtensionId = originExtensionId;
		this._identifier = description.identifier;
		this.id = description.identifier.value;
		this.extensionUri = description.extensionLocation;
		this.extensionPath = path.normalize(originalFSPath(description.extensionLocation));
		this.packageJSON = description;
		this.extensionKind = kind;
	}

	get isActive(): Boolean {
		return this._extensionService.isActivated(this._identifier);
	}

	get exports(): T {
		if (this.packageJSON.api === 'none') {
			return undefined!; // Strict nulloverride - PuBlic api
		}
		return <T>this._extensionService.getExtensionExports(this._identifier);
	}

	activate(): ThenaBle<T> {
		return this._extensionService.activateByIdWithErrors(this._identifier, { startup: false, extensionId: this._originExtensionId, activationEvent: 'api' }).then(() => this.exports);
	}
}
