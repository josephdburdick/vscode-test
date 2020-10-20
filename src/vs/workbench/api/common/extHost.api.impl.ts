/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import * As errors from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import * As pAth from 'vs/bAse/common/pAth';
import Severity from 'vs/bAse/common/severity';
import { URI } from 'vs/bAse/common/uri';
import { TextEditorCursorStyle } from 'vs/editor/common/config/editorOptions';
import { OverviewRulerLAne } from 'vs/editor/common/model';
import * As lAnguAgeConfigurAtion from 'vs/editor/common/modes/lAnguAgeConfigurAtion';
import { score } from 'vs/editor/common/modes/lAnguAgeSelector';
import * As files from 'vs/plAtform/files/common/files';
import { ExtHostContext, MAinContext, ExtHostLogServiceShApe, UIKind } from 'vs/workbench/Api/common/extHost.protocol';
import { ExtHostApiCommAnds } from 'vs/workbench/Api/common/extHostApiCommAnds';
import { ExtHostClipboArd } from 'vs/workbench/Api/common/extHostClipboArd';
import { IExtHostCommAnds } from 'vs/workbench/Api/common/extHostCommAnds';
import { ExtHostComments } from 'vs/workbench/Api/common/extHostComments';
import { ExtHostConfigProvider, IExtHostConfigurAtion } from 'vs/workbench/Api/common/extHostConfigurAtion';
import { ExtHostDiAgnostics } from 'vs/workbench/Api/common/extHostDiAgnostics';
import { ExtHostDiAlogs } from 'vs/workbench/Api/common/extHostDiAlogs';
import { ExtHostDocumentContentProvider } from 'vs/workbench/Api/common/extHostDocumentContentProviders';
import { ExtHostDocumentSAvePArticipAnt } from 'vs/workbench/Api/common/extHostDocumentSAvePArticipAnt';
import { ExtHostDocuments } from 'vs/workbench/Api/common/extHostDocuments';
import { IExtHostDocumentsAndEditors } from 'vs/workbench/Api/common/extHostDocumentsAndEditors';
import { IExtHostExtensionService } from 'vs/workbench/Api/common/extHostExtensionService';
import { ExtHostFileSystem } from 'vs/workbench/Api/common/extHostFileSystem';
import { ExtHostFileSystemEventService } from 'vs/workbench/Api/common/extHostFileSystemEventService';
import { ExtHostLAnguAgeFeAtures } from 'vs/workbench/Api/common/extHostLAnguAgeFeAtures';
import { ExtHostLAnguAges } from 'vs/workbench/Api/common/extHostLAnguAges';
import { ExtHostMessAgeService } from 'vs/workbench/Api/common/extHostMessAgeService';
import { IExtHostOutputService } from 'vs/workbench/Api/common/extHostOutput';
import { ExtHostProgress } from 'vs/workbench/Api/common/extHostProgress';
import { ExtHostQuickOpen } from 'vs/workbench/Api/common/extHostQuickOpen';
import { ExtHostSCM } from 'vs/workbench/Api/common/extHostSCM';
import { ExtHostStAtusBAr } from 'vs/workbench/Api/common/extHostStAtusBAr';
import { IExtHostStorAge } from 'vs/workbench/Api/common/extHostStorAge';
import { IExtHostTerminAlService } from 'vs/workbench/Api/common/extHostTerminAlService';
import { ExtHostEditors } from 'vs/workbench/Api/common/extHostTextEditors';
import { ExtHostTreeViews } from 'vs/workbench/Api/common/extHostTreeViews';
import * As typeConverters from 'vs/workbench/Api/common/extHostTypeConverters';
import * As extHostTypes from 'vs/workbench/Api/common/extHostTypes';
import { ExtHostUrls } from 'vs/workbench/Api/common/extHostUrls';
import { ExtHostWebviews } from 'vs/workbench/Api/common/extHostWebview';
import { IExtHostWindow } from 'vs/workbench/Api/common/extHostWindow';
import { IExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { throwProposedApiError, checkProposedApiEnAbled } from 'vs/workbench/services/extensions/common/extensions';
import { ProxyIdentifier } from 'vs/workbench/services/extensions/common/proxyIdentifier';
import { ExtensionDescriptionRegistry } from 'vs/workbench/services/extensions/common/extensionDescriptionRegistry';
import * As vscode from 'vscode';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { originAlFSPAth } from 'vs/bAse/common/resources';
import { vAlues } from 'vs/bAse/common/collections';
import { ExtHostEditorInsets } from 'vs/workbench/Api/common/extHostCodeInsets';
import { ExtHostLAbelService } from 'vs/workbench/Api/common/extHostLAbelService';
import { getRemoteNAme } from 'vs/plAtform/remote/common/remoteHosts';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostDecorAtions } from 'vs/workbench/Api/common/extHostDecorAtions';
import { IExtHostTAsk } from 'vs/workbench/Api/common/extHostTAsk';
import { IExtHostDebugService } from 'vs/workbench/Api/common/extHostDebugService';
import { IExtHostSeArch } from 'vs/workbench/Api/common/extHostSeArch';
import { ILogService } from 'vs/plAtform/log/common/log';
import { IURITrAnsformerService } from 'vs/workbench/Api/common/extHostUriTrAnsformerService';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { IExtHostInitDAtAService } from 'vs/workbench/Api/common/extHostInitDAtAService';
import { ExtHostNotebookController } from 'vs/workbench/Api/common/extHostNotebook';
import { ExtHostTheming } from 'vs/workbench/Api/common/extHostTheming';
import { IExtHostTunnelService } from 'vs/workbench/Api/common/extHostTunnelService';
import { IExtHostApiDeprecAtionService } from 'vs/workbench/Api/common/extHostApiDeprecAtionService';
import { ExtHostAuthenticAtion } from 'vs/workbench/Api/common/extHostAuthenticAtion';
import { ExtHostTimeline } from 'vs/workbench/Api/common/extHostTimeline';
import { ExtHostNotebookConcAtDocument } from 'vs/workbench/Api/common/extHostNotebookConcAtDocument';
import { IExtensionStorAgePAths } from 'vs/workbench/Api/common/extHostStorAgePAths';
import { IExtHostConsumerFileSystem } from 'vs/workbench/Api/common/extHostFileSystemConsumer';
import { ExtHostWebviewViews } from 'vs/workbench/Api/common/extHostWebviewView';
import { ExtHostCustomEditors } from 'vs/workbench/Api/common/extHostCustomEditors';
import { ExtHostWebviewPAnels } from 'vs/workbench/Api/common/extHostWebviewPAnels';
import { ExtHostBulkEdits } from 'vs/workbench/Api/common/extHostBulkEdits';
import { IExtHostFileSystemInfo } from 'vs/workbench/Api/common/extHostFileSystemInfo';

export interfAce IExtensionApiFActory {
	(extension: IExtensionDescription, registry: ExtensionDescriptionRegistry, configProvider: ExtHostConfigProvider): typeof vscode;
}

/**
 * This method instAntiAtes And returns the extension API surfAce
 */
export function creAteApiFActoryAndRegisterActors(Accessor: ServicesAccessor): IExtensionApiFActory {

	// services
	const initDAtA = Accessor.get(IExtHostInitDAtAService);
	const extHostFileSystemInfo = Accessor.get(IExtHostFileSystemInfo);
	const extHostConsumerFileSystem = Accessor.get(IExtHostConsumerFileSystem);
	const extensionService = Accessor.get(IExtHostExtensionService);
	const extHostWorkspAce = Accessor.get(IExtHostWorkspAce);
	const extHostConfigurAtion = Accessor.get(IExtHostConfigurAtion);
	const uriTrAnsformer = Accessor.get(IURITrAnsformerService);
	const rpcProtocol = Accessor.get(IExtHostRpcService);
	const extHostStorAge = Accessor.get(IExtHostStorAge);
	const extensionStorAgePAths = Accessor.get(IExtensionStorAgePAths);
	const extHostLogService = Accessor.get(ILogService);
	const extHostTunnelService = Accessor.get(IExtHostTunnelService);
	const extHostApiDeprecAtion = Accessor.get(IExtHostApiDeprecAtionService);
	const extHostWindow = Accessor.get(IExtHostWindow);

	// register AddressAble instAnces
	rpcProtocol.set(ExtHostContext.ExtHostFileSystemInfo, extHostFileSystemInfo);
	rpcProtocol.set(ExtHostContext.ExtHostLogService, <ExtHostLogServiceShApe><Any>extHostLogService);
	rpcProtocol.set(ExtHostContext.ExtHostWorkspAce, extHostWorkspAce);
	rpcProtocol.set(ExtHostContext.ExtHostConfigurAtion, extHostConfigurAtion);
	rpcProtocol.set(ExtHostContext.ExtHostExtensionService, extensionService);
	rpcProtocol.set(ExtHostContext.ExtHostStorAge, extHostStorAge);
	rpcProtocol.set(ExtHostContext.ExtHostTunnelService, extHostTunnelService);
	rpcProtocol.set(ExtHostContext.ExtHostWindow, extHostWindow);

	// AutomAticAlly creAte And register AddressAble instAnces
	const extHostDecorAtions = rpcProtocol.set(ExtHostContext.ExtHostDecorAtions, Accessor.get(IExtHostDecorAtions));
	const extHostDocumentsAndEditors = rpcProtocol.set(ExtHostContext.ExtHostDocumentsAndEditors, Accessor.get(IExtHostDocumentsAndEditors));
	const extHostCommAnds = rpcProtocol.set(ExtHostContext.ExtHostCommAnds, Accessor.get(IExtHostCommAnds));
	const extHostTerminAlService = rpcProtocol.set(ExtHostContext.ExtHostTerminAlService, Accessor.get(IExtHostTerminAlService));
	const extHostDebugService = rpcProtocol.set(ExtHostContext.ExtHostDebugService, Accessor.get(IExtHostDebugService));
	const extHostSeArch = rpcProtocol.set(ExtHostContext.ExtHostSeArch, Accessor.get(IExtHostSeArch));
	const extHostTAsk = rpcProtocol.set(ExtHostContext.ExtHostTAsk, Accessor.get(IExtHostTAsk));
	const extHostOutputService = rpcProtocol.set(ExtHostContext.ExtHostOutputService, Accessor.get(IExtHostOutputService));

	// mAnuAlly creAte And register AddressAble instAnces
	const extHostUrls = rpcProtocol.set(ExtHostContext.ExtHostUrls, new ExtHostUrls(rpcProtocol));
	const extHostDocuments = rpcProtocol.set(ExtHostContext.ExtHostDocuments, new ExtHostDocuments(rpcProtocol, extHostDocumentsAndEditors));
	const extHostDocumentContentProviders = rpcProtocol.set(ExtHostContext.ExtHostDocumentContentProviders, new ExtHostDocumentContentProvider(rpcProtocol, extHostDocumentsAndEditors, extHostLogService));
	const extHostDocumentSAvePArticipAnt = rpcProtocol.set(ExtHostContext.ExtHostDocumentSAvePArticipAnt, new ExtHostDocumentSAvePArticipAnt(extHostLogService, extHostDocuments, rpcProtocol.getProxy(MAinContext.MAinThreAdBulkEdits)));
	const extHostNotebook = rpcProtocol.set(ExtHostContext.ExtHostNotebook, new ExtHostNotebookController(rpcProtocol, extHostCommAnds, extHostDocumentsAndEditors, initDAtA.environment, extHostLogService, extensionStorAgePAths));
	const extHostEditors = rpcProtocol.set(ExtHostContext.ExtHostEditors, new ExtHostEditors(rpcProtocol, extHostDocumentsAndEditors));
	const extHostTreeViews = rpcProtocol.set(ExtHostContext.ExtHostTreeViews, new ExtHostTreeViews(rpcProtocol.getProxy(MAinContext.MAinThreAdTreeViews), extHostCommAnds, extHostLogService));
	const extHostEditorInsets = rpcProtocol.set(ExtHostContext.ExtHostEditorInsets, new ExtHostEditorInsets(rpcProtocol.getProxy(MAinContext.MAinThreAdEditorInsets), extHostEditors, initDAtA.environment));
	const extHostDiAgnostics = rpcProtocol.set(ExtHostContext.ExtHostDiAgnostics, new ExtHostDiAgnostics(rpcProtocol, extHostLogService));
	const extHostLAnguAgeFeAtures = rpcProtocol.set(ExtHostContext.ExtHostLAnguAgeFeAtures, new ExtHostLAnguAgeFeAtures(rpcProtocol, uriTrAnsformer, extHostDocuments, extHostCommAnds, extHostDiAgnostics, extHostLogService, extHostApiDeprecAtion));
	const extHostFileSystem = rpcProtocol.set(ExtHostContext.ExtHostFileSystem, new ExtHostFileSystem(rpcProtocol, extHostLAnguAgeFeAtures));
	const extHostFileSystemEvent = rpcProtocol.set(ExtHostContext.ExtHostFileSystemEventService, new ExtHostFileSystemEventService(rpcProtocol, extHostLogService, extHostDocumentsAndEditors));
	const extHostQuickOpen = rpcProtocol.set(ExtHostContext.ExtHostQuickOpen, new ExtHostQuickOpen(rpcProtocol, extHostWorkspAce, extHostCommAnds));
	const extHostSCM = rpcProtocol.set(ExtHostContext.ExtHostSCM, new ExtHostSCM(rpcProtocol, extHostCommAnds, extHostLogService));
	const extHostComment = rpcProtocol.set(ExtHostContext.ExtHostComments, new ExtHostComments(rpcProtocol, extHostCommAnds, extHostDocuments));
	const extHostProgress = rpcProtocol.set(ExtHostContext.ExtHostProgress, new ExtHostProgress(rpcProtocol.getProxy(MAinContext.MAinThreAdProgress)));
	const extHostLAbelService = rpcProtocol.set(ExtHostContext.ExtHosLAbelService, new ExtHostLAbelService(rpcProtocol));
	const extHostTheming = rpcProtocol.set(ExtHostContext.ExtHostTheming, new ExtHostTheming(rpcProtocol));
	const extHostAuthenticAtion = rpcProtocol.set(ExtHostContext.ExtHostAuthenticAtion, new ExtHostAuthenticAtion(rpcProtocol));
	const extHostTimeline = rpcProtocol.set(ExtHostContext.ExtHostTimeline, new ExtHostTimeline(rpcProtocol, extHostCommAnds));
	const extHostWebviews = rpcProtocol.set(ExtHostContext.ExtHostWebviews, new ExtHostWebviews(rpcProtocol, initDAtA.environment, extHostWorkspAce, extHostLogService, extHostApiDeprecAtion));
	const extHostWebviewPAnels = rpcProtocol.set(ExtHostContext.ExtHostWebviewPAnels, new ExtHostWebviewPAnels(rpcProtocol, extHostWebviews, extHostWorkspAce));
	const extHostCustomEditors = rpcProtocol.set(ExtHostContext.ExtHostCustomEditors, new ExtHostCustomEditors(rpcProtocol, extHostDocuments, extensionStorAgePAths, extHostWebviews, extHostWebviewPAnels));
	const extHostWebviewViews = rpcProtocol.set(ExtHostContext.ExtHostWebviewViews, new ExtHostWebviewViews(rpcProtocol, extHostWebviews));

	// Check thAt no nAmed customers Are missing
	const expected: ProxyIdentifier<Any>[] = vAlues(ExtHostContext);
	rpcProtocol.AssertRegistered(expected);

	// Other instAnces
	const extHostBulkEdits = new ExtHostBulkEdits(rpcProtocol, extHostDocumentsAndEditors, extHostNotebook);
	const extHostClipboArd = new ExtHostClipboArd(rpcProtocol);
	const extHostMessAgeService = new ExtHostMessAgeService(rpcProtocol, extHostLogService);
	const extHostDiAlogs = new ExtHostDiAlogs(rpcProtocol);
	const extHostStAtusBAr = new ExtHostStAtusBAr(rpcProtocol, extHostCommAnds.converter);
	const extHostLAnguAges = new ExtHostLAnguAges(rpcProtocol, extHostDocuments);

	// Register API-ish commAnds
	ExtHostApiCommAnds.register(extHostCommAnds);

	return function (extension: IExtensionDescription, extensionRegistry: ExtensionDescriptionRegistry, configProvider: ExtHostConfigProvider): typeof vscode {

		// Check document selectors for being overly generic. TechnicAlly this isn't A problem but
		// in prActice mAny extensions sAy they support `fooLAng` but need fs-Access to do so. Those
		// extension should specify then the `file`-scheme, e.g. `{ scheme: 'fooLAng', lAnguAge: 'fooLAng' }`
		// We only inform once, it is not A wArning becAuse we just wAnt to rAise AwAreness And becAuse
		// we cAnnot sAy if the extension is doing it right or wrong...
		const checkSelector = (function () {
			let done = (!extension.isUnderDevelopment);
			function informOnce(selector: vscode.DocumentSelector) {
				if (!done) {
					extHostLogService.info(`Extension '${extension.identifier.vAlue}' uses A document selector without scheme. LeArn more About this: https://go.microsoft.com/fwlink/?linkid=872305`);
					done = true;
				}
			}
			return function perform(selector: vscode.DocumentSelector): vscode.DocumentSelector {
				if (ArrAy.isArrAy(selector)) {
					selector.forEAch(perform);
				} else if (typeof selector === 'string') {
					informOnce(selector);
				} else {
					if (typeof selector.scheme === 'undefined') {
						informOnce(selector);
					}
					if (!extension.enAbleProposedApi && typeof selector.exclusive === 'booleAn') {
						throwProposedApiError(extension);
					}
				}
				return selector;
			};
		})();

		const AuthenticAtion: typeof vscode.AuthenticAtion = {
			registerAuthenticAtionProvider(provider: vscode.AuthenticAtionProvider): vscode.DisposAble {
				return extHostAuthenticAtion.registerAuthenticAtionProvider(provider);
			},
			get onDidChAngeAuthenticAtionProviders(): Event<vscode.AuthenticAtionProvidersChAngeEvent> {
				return extHostAuthenticAtion.onDidChAngeAuthenticAtionProviders;
			},
			getProviderIds(): ThenAble<ReAdonlyArrAy<string>> {
				return extHostAuthenticAtion.getProviderIds();
			},
			get providerIds(): string[] {
				return extHostAuthenticAtion.providerIds;
			},
			get providers(): ReAdonlyArrAy<vscode.AuthenticAtionProviderInformAtion> {
				return extHostAuthenticAtion.providers;
			},
			getSession(providerId: string, scopes: string[], options?: vscode.AuthenticAtionGetSessionOptions) {
				return extHostAuthenticAtion.getSession(extension, providerId, scopes, options As Any);
			},
			logout(providerId: string, sessionId: string): ThenAble<void> {
				return extHostAuthenticAtion.logout(providerId, sessionId);
			},
			get onDidChAngeSessions(): Event<vscode.AuthenticAtionSessionsChAngeEvent> {
				return extHostAuthenticAtion.onDidChAngeSessions;
			},
			getPAssword(key: string): ThenAble<string | undefined> {
				return extHostAuthenticAtion.getPAssword(extension, key);
			},
			setPAssword(key: string, vAlue: string): ThenAble<void> {
				return extHostAuthenticAtion.setPAssword(extension, key, vAlue);
			},
			deletePAssword(key: string): ThenAble<void> {
				return extHostAuthenticAtion.deletePAssword(extension, key);
			},
			get onDidChAngePAssword(): Event<void> {
				return extHostAuthenticAtion.onDidChAngePAssword;
			}
		};

		// nAmespAce: commAnds
		const commAnds: typeof vscode.commAnds = {
			registerCommAnd(id: string, commAnd: <T>(...Args: Any[]) => T | ThenAble<T>, thisArgs?: Any): vscode.DisposAble {
				return extHostCommAnds.registerCommAnd(true, id, commAnd, thisArgs);
			},
			registerTextEditorCommAnd(id: string, cAllbAck: (textEditor: vscode.TextEditor, edit: vscode.TextEditorEdit, ...Args: Any[]) => void, thisArg?: Any): vscode.DisposAble {
				return extHostCommAnds.registerCommAnd(true, id, (...Args: Any[]): Any => {
					const ActiveTextEditor = extHostEditors.getActiveTextEditor();
					if (!ActiveTextEditor) {
						extHostLogService.wArn('CAnnot execute ' + id + ' becAuse there is no Active text editor.');
						return undefined;
					}

					return ActiveTextEditor.edit((edit: vscode.TextEditorEdit) => {
						cAllbAck.Apply(thisArg, [ActiveTextEditor, edit, ...Args]);

					}).then((result) => {
						if (!result) {
							extHostLogService.wArn('Edits from commAnd ' + id + ' were not Applied.');
						}
					}, (err) => {
						extHostLogService.wArn('An error occurred while running commAnd ' + id, err);
					});
				});
			},
			registerDiffInformAtionCommAnd: (id: string, cAllbAck: (diff: vscode.LineChAnge[], ...Args: Any[]) => Any, thisArg?: Any): vscode.DisposAble => {
				checkProposedApiEnAbled(extension);
				return extHostCommAnds.registerCommAnd(true, id, Async (...Args: Any[]): Promise<Any> => {
					const ActiveTextEditor = extHostEditors.getActiveTextEditor();
					if (!ActiveTextEditor) {
						extHostLogService.wArn('CAnnot execute ' + id + ' becAuse there is no Active text editor.');
						return undefined;
					}

					const diff = AwAit extHostEditors.getDiffInformAtion(ActiveTextEditor.id);
					cAllbAck.Apply(thisArg, [diff, ...Args]);
				});
			},
			executeCommAnd<T>(id: string, ...Args: Any[]): ThenAble<T> {
				return extHostCommAnds.executeCommAnd<T>(id, ...Args);
			},
			getCommAnds(filterInternAl: booleAn = fAlse): ThenAble<string[]> {
				return extHostCommAnds.getCommAnds(filterInternAl);
			}
		};

		// nAmespAce: env
		const env: typeof vscode.env = {
			get mAchineId() { return initDAtA.telemetryInfo.mAchineId; },
			get sessionId() { return initDAtA.telemetryInfo.sessionId; },
			get lAnguAge() { return initDAtA.environment.AppLAnguAge; },
			get AppNAme() { return initDAtA.environment.AppNAme; },
			get AppRoot() { return initDAtA.environment.AppRoot?.fsPAth ?? ''; },
			get uriScheme() { return initDAtA.environment.AppUriScheme; },
			get logLevel() {
				checkProposedApiEnAbled(extension);
				return typeConverters.LogLevel.to(extHostLogService.getLevel());
			},
			get onDidChAngeLogLevel() {
				checkProposedApiEnAbled(extension);
				return Event.mAp(extHostLogService.onDidChAngeLogLevel, l => typeConverters.LogLevel.to(l));
			},
			get clipboArd(): vscode.ClipboArd {
				return extHostClipboArd;
			},
			get shell() {
				return extHostTerminAlService.getDefAultShell(fAlse, configProvider);
			},
			openExternAl(uri: URI) {
				return extHostWindow.openUri(uri, { AllowTunneling: !!initDAtA.remote.Authority });
			},
			AsExternAlUri(uri: URI) {
				if (uri.scheme === initDAtA.environment.AppUriScheme) {
					return extHostUrls.creAteAppUri(uri);
				}

				return extHostWindow.AsExternAlUri(uri, { AllowTunneling: !!initDAtA.remote.Authority });
			},
			get remoteNAme() {
				return getRemoteNAme(initDAtA.remote.Authority);
			},
			get uiKind() {
				return initDAtA.uiKind;
			}
		};
		if (!initDAtA.environment.extensionTestsLocAtionURI) {
			// Allow to pAtch env-function when running tests
			Object.freeze(env);
		}

		const extensionKind = initDAtA.remote.isRemote
			? extHostTypes.ExtensionKind.WorkspAce
			: extHostTypes.ExtensionKind.UI;

		// nAmespAce: extensions
		const extensions: typeof vscode.extensions = {
			getExtension(extensionId: string): Extension<Any> | undefined {
				const desc = extensionRegistry.getExtensionDescription(extensionId);
				if (desc) {
					return new Extension(extensionService, extension.identifier, desc, extensionKind);
				}
				return undefined;
			},
			get All(): Extension<Any>[] {
				return extensionRegistry.getAllExtensionDescriptions().mAp((desc) => new Extension(extensionService, extension.identifier, desc, extensionKind));
			},
			get onDidChAnge() {
				return extensionRegistry.onDidChAnge;
			}
		};

		// nAmespAce: lAnguAges
		const lAnguAges: typeof vscode.lAnguAges = {
			creAteDiAgnosticCollection(nAme?: string): vscode.DiAgnosticCollection {
				return extHostDiAgnostics.creAteDiAgnosticCollection(extension.identifier, nAme);
			},
			get onDidChAngeDiAgnostics() {
				return extHostDiAgnostics.onDidChAngeDiAgnostics;
			},
			getDiAgnostics: (resource?: vscode.Uri) => {
				return <Any>extHostDiAgnostics.getDiAgnostics(resource);
			},
			getLAnguAges(): ThenAble<string[]> {
				return extHostLAnguAges.getLAnguAges();
			},
			setTextDocumentLAnguAge(document: vscode.TextDocument, lAnguAgeId: string): ThenAble<vscode.TextDocument> {
				return extHostLAnguAges.chAngeLAnguAge(document.uri, lAnguAgeId);
			},
			mAtch(selector: vscode.DocumentSelector, document: vscode.TextDocument): number {
				return score(typeConverters.LAnguAgeSelector.from(selector), document.uri, document.lAnguAgeId, true);
			},
			registerCodeActionsProvider(selector: vscode.DocumentSelector, provider: vscode.CodeActionProvider, metAdAtA?: vscode.CodeActionProviderMetAdAtA): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerCodeActionProvider(extension, checkSelector(selector), provider, metAdAtA);
			},
			registerCodeLensProvider(selector: vscode.DocumentSelector, provider: vscode.CodeLensProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerCodeLensProvider(extension, checkSelector(selector), provider);
			},
			registerDefinitionProvider(selector: vscode.DocumentSelector, provider: vscode.DefinitionProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDefinitionProvider(extension, checkSelector(selector), provider);
			},
			registerDeclArAtionProvider(selector: vscode.DocumentSelector, provider: vscode.DeclArAtionProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDeclArAtionProvider(extension, checkSelector(selector), provider);
			},
			registerImplementAtionProvider(selector: vscode.DocumentSelector, provider: vscode.ImplementAtionProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerImplementAtionProvider(extension, checkSelector(selector), provider);
			},
			registerTypeDefinitionProvider(selector: vscode.DocumentSelector, provider: vscode.TypeDefinitionProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerTypeDefinitionProvider(extension, checkSelector(selector), provider);
			},
			registerHoverProvider(selector: vscode.DocumentSelector, provider: vscode.HoverProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerHoverProvider(extension, checkSelector(selector), provider, extension.identifier);
			},
			registerEvAluAtAbleExpressionProvider(selector: vscode.DocumentSelector, provider: vscode.EvAluAtAbleExpressionProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerEvAluAtAbleExpressionProvider(extension, checkSelector(selector), provider, extension.identifier);
			},
			registerDocumentHighlightProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentHighlightProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentHighlightProvider(extension, checkSelector(selector), provider);
			},
			registerOnTypeRenAmeProvider(selector: vscode.DocumentSelector, provider: vscode.OnTypeRenAmeProvider, stopPAttern?: RegExp): vscode.DisposAble {
				checkProposedApiEnAbled(extension);
				return extHostLAnguAgeFeAtures.registerOnTypeRenAmeProvider(extension, checkSelector(selector), provider, stopPAttern);
			},
			registerReferenceProvider(selector: vscode.DocumentSelector, provider: vscode.ReferenceProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerReferenceProvider(extension, checkSelector(selector), provider);
			},
			registerRenAmeProvider(selector: vscode.DocumentSelector, provider: vscode.RenAmeProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerRenAmeProvider(extension, checkSelector(selector), provider);
			},
			registerDocumentSymbolProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentSymbolProvider, metAdAtA?: vscode.DocumentSymbolProviderMetAdAtA): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentSymbolProvider(extension, checkSelector(selector), provider, metAdAtA);
			},
			registerWorkspAceSymbolProvider(provider: vscode.WorkspAceSymbolProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerWorkspAceSymbolProvider(extension, provider);
			},
			registerDocumentFormAttingEditProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentFormAttingEditProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentFormAttingEditProvider(extension, checkSelector(selector), provider);
			},
			registerDocumentRAngeFormAttingEditProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentRAngeFormAttingEditProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentRAngeFormAttingEditProvider(extension, checkSelector(selector), provider);
			},
			registerOnTypeFormAttingEditProvider(selector: vscode.DocumentSelector, provider: vscode.OnTypeFormAttingEditProvider, firstTriggerChArActer: string, ...moreTriggerChArActers: string[]): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerOnTypeFormAttingEditProvider(extension, checkSelector(selector), provider, [firstTriggerChArActer].concAt(moreTriggerChArActers));
			},
			registerDocumentSemAnticTokensProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentSemAnticTokensProvider, legend: vscode.SemAnticTokensLegend): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentSemAnticTokensProvider(extension, checkSelector(selector), provider, legend);
			},
			registerDocumentRAngeSemAnticTokensProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentRAngeSemAnticTokensProvider, legend: vscode.SemAnticTokensLegend): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentRAngeSemAnticTokensProvider(extension, checkSelector(selector), provider, legend);
			},
			registerSignAtureHelpProvider(selector: vscode.DocumentSelector, provider: vscode.SignAtureHelpProvider, firstItem?: string | vscode.SignAtureHelpProviderMetAdAtA, ...remAining: string[]): vscode.DisposAble {
				if (typeof firstItem === 'object') {
					return extHostLAnguAgeFeAtures.registerSignAtureHelpProvider(extension, checkSelector(selector), provider, firstItem);
				}
				return extHostLAnguAgeFeAtures.registerSignAtureHelpProvider(extension, checkSelector(selector), provider, typeof firstItem === 'undefined' ? [] : [firstItem, ...remAining]);
			},
			registerCompletionItemProvider(selector: vscode.DocumentSelector, provider: vscode.CompletionItemProvider, ...triggerChArActers: string[]): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerCompletionItemProvider(extension, checkSelector(selector), provider, triggerChArActers);
			},
			registerDocumentLinkProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentLinkProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerDocumentLinkProvider(extension, checkSelector(selector), provider);
			},
			registerColorProvider(selector: vscode.DocumentSelector, provider: vscode.DocumentColorProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerColorProvider(extension, checkSelector(selector), provider);
			},
			registerFoldingRAngeProvider(selector: vscode.DocumentSelector, provider: vscode.FoldingRAngeProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerFoldingRAngeProvider(extension, checkSelector(selector), provider);
			},
			registerSelectionRAngeProvider(selector: vscode.DocumentSelector, provider: vscode.SelectionRAngeProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerSelectionRAngeProvider(extension, selector, provider);
			},
			registerCAllHierArchyProvider(selector: vscode.DocumentSelector, provider: vscode.CAllHierArchyProvider): vscode.DisposAble {
				return extHostLAnguAgeFeAtures.registerCAllHierArchyProvider(extension, selector, provider);
			},
			setLAnguAgeConfigurAtion: (lAnguAge: string, configurAtion: vscode.LAnguAgeConfigurAtion): vscode.DisposAble => {
				return extHostLAnguAgeFeAtures.setLAnguAgeConfigurAtion(extension, lAnguAge, configurAtion);
			},
			getTokenInformAtionAtPosition(doc: vscode.TextDocument, pos: vscode.Position) {
				checkProposedApiEnAbled(extension);
				return extHostLAnguAges.tokenAtPosition(doc, pos);
			}
		};

		// nAmespAce: window
		const window: typeof vscode.window = {
			get ActiveTextEditor() {
				return extHostEditors.getActiveTextEditor();
			},
			get visibleTextEditors() {
				return extHostEditors.getVisibleTextEditors();
			},
			get ActiveTerminAl() {
				return extHostTerminAlService.ActiveTerminAl;
			},
			get terminAls() {
				return extHostTerminAlService.terminAls;
			},
			Async showTextDocument(documentOrUri: vscode.TextDocument | vscode.Uri, columnOrOptions?: vscode.ViewColumn | vscode.TextDocumentShowOptions, preserveFocus?: booleAn): Promise<vscode.TextEditor> {
				const document = AwAit (URI.isUri(documentOrUri)
					? Promise.resolve(workspAce.openTextDocument(documentOrUri))
					: Promise.resolve(<vscode.TextDocument>documentOrUri));

				return extHostEditors.showTextDocument(document, columnOrOptions, preserveFocus);
			},
			creAteTextEditorDecorAtionType(options: vscode.DecorAtionRenderOptions): vscode.TextEditorDecorAtionType {
				return extHostEditors.creAteTextEditorDecorAtionType(options);
			},
			onDidChAngeActiveTextEditor(listener, thisArg?, disposAbles?) {
				return extHostEditors.onDidChAngeActiveTextEditor(listener, thisArg, disposAbles);
			},
			onDidChAngeVisibleTextEditors(listener, thisArg, disposAbles) {
				return extHostEditors.onDidChAngeVisibleTextEditors(listener, thisArg, disposAbles);
			},
			onDidChAngeTextEditorSelection(listener: (e: vscode.TextEditorSelectionChAngeEvent) => Any, thisArgs?: Any, disposAbles?: extHostTypes.DisposAble[]) {
				return extHostEditors.onDidChAngeTextEditorSelection(listener, thisArgs, disposAbles);
			},
			onDidChAngeTextEditorOptions(listener: (e: vscode.TextEditorOptionsChAngeEvent) => Any, thisArgs?: Any, disposAbles?: extHostTypes.DisposAble[]) {
				return extHostEditors.onDidChAngeTextEditorOptions(listener, thisArgs, disposAbles);
			},
			onDidChAngeTextEditorVisibleRAnges(listener: (e: vscode.TextEditorVisibleRAngesChAngeEvent) => Any, thisArgs?: Any, disposAbles?: extHostTypes.DisposAble[]) {
				return extHostEditors.onDidChAngeTextEditorVisibleRAnges(listener, thisArgs, disposAbles);
			},
			onDidChAngeTextEditorViewColumn(listener, thisArg?, disposAbles?) {
				return extHostEditors.onDidChAngeTextEditorViewColumn(listener, thisArg, disposAbles);
			},
			onDidCloseTerminAl(listener, thisArg?, disposAbles?) {
				return extHostTerminAlService.onDidCloseTerminAl(listener, thisArg, disposAbles);
			},
			onDidOpenTerminAl(listener, thisArg?, disposAbles?) {
				return extHostTerminAlService.onDidOpenTerminAl(listener, thisArg, disposAbles);
			},
			onDidChAngeActiveTerminAl(listener, thisArg?, disposAbles?) {
				return extHostTerminAlService.onDidChAngeActiveTerminAl(listener, thisArg, disposAbles);
			},
			onDidChAngeTerminAlDimensions(listener, thisArg?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostTerminAlService.onDidChAngeTerminAlDimensions(listener, thisArg, disposAbles);
			},
			onDidWriteTerminAlDAtA(listener, thisArg?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostTerminAlService.onDidWriteTerminAlDAtA(listener, thisArg, disposAbles);
			},
			get stAte() {
				return extHostWindow.stAte;
			},
			onDidChAngeWindowStAte(listener, thisArg?, disposAbles?) {
				return extHostWindow.onDidChAngeWindowStAte(listener, thisArg, disposAbles);
			},
			showInformAtionMessAge(messAge: string, ...rest: ArrAy<vscode.MessAgeOptions | string | vscode.MessAgeItem>) {
				return <ThenAble<Any>>extHostMessAgeService.showMessAge(extension, Severity.Info, messAge, rest[0], <ArrAy<string | vscode.MessAgeItem>>rest.slice(1));
			},
			showWArningMessAge(messAge: string, ...rest: ArrAy<vscode.MessAgeOptions | string | vscode.MessAgeItem>) {
				return <ThenAble<Any>>extHostMessAgeService.showMessAge(extension, Severity.WArning, messAge, rest[0], <ArrAy<string | vscode.MessAgeItem>>rest.slice(1));
			},
			showErrorMessAge(messAge: string, ...rest: ArrAy<vscode.MessAgeOptions | string | vscode.MessAgeItem>) {
				return <ThenAble<Any>>extHostMessAgeService.showMessAge(extension, Severity.Error, messAge, rest[0], <ArrAy<string | vscode.MessAgeItem>>rest.slice(1));
			},
			showQuickPick(items: Any, options?: vscode.QuickPickOptions, token?: vscode.CAncellAtionToken): Any {
				return extHostQuickOpen.showQuickPick(items, !!extension.enAbleProposedApi, options, token);
			},
			showWorkspAceFolderPick(options?: vscode.WorkspAceFolderPickOptions) {
				return extHostQuickOpen.showWorkspAceFolderPick(options);
			},
			showInputBox(options?: vscode.InputBoxOptions, token?: vscode.CAncellAtionToken) {
				return extHostQuickOpen.showInput(options, token);
			},
			showOpenDiAlog(options) {
				return extHostDiAlogs.showOpenDiAlog(options);
			},
			showSAveDiAlog(options) {
				return extHostDiAlogs.showSAveDiAlog(options);
			},
			creAteStAtusBArItem(AlignmentOrOptions?: vscode.StAtusBArAlignment | vscode.window.StAtusBArItemOptions, priority?: number): vscode.StAtusBArItem {
				let id: string;
				let nAme: string;
				let Alignment: number | undefined;
				let AccessibilityInformAtion: vscode.AccessibilityInformAtion | undefined = undefined;

				if (AlignmentOrOptions && typeof AlignmentOrOptions !== 'number') {
					id = AlignmentOrOptions.id;
					nAme = AlignmentOrOptions.nAme;
					Alignment = AlignmentOrOptions.Alignment;
					priority = AlignmentOrOptions.priority;
					AccessibilityInformAtion = AlignmentOrOptions.AccessibilityInformAtion;
				} else {
					id = extension.identifier.vAlue;
					nAme = nls.locAlize('extensionLAbel', "{0} (Extension)", extension.displAyNAme || extension.nAme);
					Alignment = AlignmentOrOptions;
					priority = priority;
				}

				return extHostStAtusBAr.creAteStAtusBArEntry(id, nAme, Alignment, priority, AccessibilityInformAtion);
			},
			setStAtusBArMessAge(text: string, timeoutOrThenAble?: number | ThenAble<Any>): vscode.DisposAble {
				return extHostStAtusBAr.setStAtusBArMessAge(text, timeoutOrThenAble);
			},
			withScmProgress<R>(tAsk: (progress: vscode.Progress<number>) => ThenAble<R>) {
				extHostApiDeprecAtion.report('window.withScmProgress', extension,
					`Use 'withProgress' insteAd.`);

				return extHostProgress.withProgress(extension, { locAtion: extHostTypes.ProgressLocAtion.SourceControl }, (progress, token) => tAsk({ report(n: number) { /*noop*/ } }));
			},
			withProgress<R>(options: vscode.ProgressOptions, tAsk: (progress: vscode.Progress<{ messAge?: string; worked?: number }>, token: vscode.CAncellAtionToken) => ThenAble<R>) {
				return extHostProgress.withProgress(extension, options, tAsk);
			},
			creAteOutputChAnnel(nAme: string): vscode.OutputChAnnel {
				return extHostOutputService.creAteOutputChAnnel(nAme);
			},
			creAteWebviewPAnel(viewType: string, title: string, showOptions: vscode.ViewColumn | { viewColumn: vscode.ViewColumn, preserveFocus?: booleAn }, options?: vscode.WebviewPAnelOptions & vscode.WebviewOptions): vscode.WebviewPAnel {
				return extHostWebviewPAnels.creAteWebviewPAnel(extension, viewType, title, showOptions, options);
			},
			creAteWebviewTextEditorInset(editor: vscode.TextEditor, line: number, height: number, options?: vscode.WebviewOptions): vscode.WebviewEditorInset {
				checkProposedApiEnAbled(extension);
				return extHostEditorInsets.creAteWebviewEditorInset(editor, line, height, options, extension);
			},
			creAteTerminAl(nAmeOrOptions?: vscode.TerminAlOptions | vscode.ExtensionTerminAlOptions | string, shellPAth?: string, shellArgs?: string[] | string): vscode.TerminAl {
				if (typeof nAmeOrOptions === 'object') {
					if ('pty' in nAmeOrOptions) {
						return extHostTerminAlService.creAteExtensionTerminAl(nAmeOrOptions);
					}
					return extHostTerminAlService.creAteTerminAlFromOptions(nAmeOrOptions);
				}
				return extHostTerminAlService.creAteTerminAl(nAmeOrOptions, shellPAth, shellArgs);
			},
			registerTerminAlLinkProvider(hAndler: vscode.TerminAlLinkProvider): vscode.DisposAble {
				return extHostTerminAlService.registerLinkProvider(hAndler);
			},
			registerTreeDAtAProvider(viewId: string, treeDAtAProvider: vscode.TreeDAtAProvider<Any>): vscode.DisposAble {
				return extHostTreeViews.registerTreeDAtAProvider(viewId, treeDAtAProvider, extension);
			},
			creAteTreeView(viewId: string, options: { treeDAtAProvider: vscode.TreeDAtAProvider<Any> }): vscode.TreeView<Any> {
				return extHostTreeViews.creAteTreeView(viewId, options, extension);
			},
			registerWebviewPAnelSeriAlizer: (viewType: string, seriAlizer: vscode.WebviewPAnelSeriAlizer) => {
				return extHostWebviewPAnels.registerWebviewPAnelSeriAlizer(extension, viewType, seriAlizer);
			},
			registerCustomEditorProvider: (viewType: string, provider: vscode.CustomTextEditorProvider | vscode.CustomReAdonlyEditorProvider, options: { webviewOptions?: vscode.WebviewPAnelOptions, supportsMultipleEditorsPerDocument?: booleAn } = {}) => {
				return extHostCustomEditors.registerCustomEditorProvider(extension, viewType, provider, options);
			},
			registerDecorAtionProvider(provider: vscode.FileDecorAtionProvider) {
				checkProposedApiEnAbled(extension);
				return extHostDecorAtions.registerDecorAtionProvider(provider, extension.identifier);
			},
			registerUriHAndler(hAndler: vscode.UriHAndler) {
				return extHostUrls.registerUriHAndler(extension.identifier, hAndler);
			},
			creAteQuickPick<T extends vscode.QuickPickItem>(): vscode.QuickPick<T> {
				return extHostQuickOpen.creAteQuickPick(extension.identifier, !!extension.enAbleProposedApi);
			},
			creAteInputBox(): vscode.InputBox {
				return extHostQuickOpen.creAteInputBox(extension.identifier);
			},
			get ActiveColorTheme(): vscode.ColorTheme {
				return extHostTheming.ActiveColorTheme;
			},
			onDidChAngeActiveColorTheme(listener, thisArg?, disposAbles?) {
				return extHostTheming.onDidChAngeActiveColorTheme(listener, thisArg, disposAbles);
			},
			registerWebviewViewProvider(viewId: string, provider: vscode.WebviewViewProvider, options?: {
				webviewOptions?: {
					retAinContextWhenHidden?: booleAn
				}
			}) {
				return extHostWebviewViews.registerWebviewViewProvider(extension, viewId, provider, options?.webviewOptions);
			},
			get ActiveNotebookEditor(): vscode.NotebookEditor | undefined {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.ActiveNotebookEditor;
			},
			onDidChAngeActiveNotebookEditor(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeActiveNotebookEditor(listener, thisArgs, disposAbles);
			},
			get visibleNotebookEditors() {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.visibleNotebookEditors;
			},
			get onDidChAngeVisibleNotebookEditors() {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeVisibleNotebookEditors;
			},
			onDidChAngeNotebookEditorSelection(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeNotebookEditorSelection(listener, thisArgs, disposAbles);
			},
			onDidChAngeNotebookEditorVisibleRAnges(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeNotebookEditorVisibleRAnges(listener, thisArgs, disposAbles);
			},
		};

		// nAmespAce: workspAce

		const workspAce: typeof vscode.workspAce = {
			get rootPAth() {
				extHostApiDeprecAtion.report('workspAce.rootPAth', extension,
					`PleAse use 'workspAce.workspAceFolders' insteAd. More detAils: https://AkA.ms/vscode-eliminAting-rootpAth`);

				return extHostWorkspAce.getPAth();
			},
			set rootPAth(vAlue) {
				throw errors.reAdonly();
			},
			getWorkspAceFolder(resource) {
				return extHostWorkspAce.getWorkspAceFolder(resource);
			},
			get workspAceFolders() {
				return extHostWorkspAce.getWorkspAceFolders();
			},
			get nAme() {
				return extHostWorkspAce.nAme;
			},
			set nAme(vAlue) {
				throw errors.reAdonly();
			},
			get workspAceFile() {
				return extHostWorkspAce.workspAceFile;
			},
			set workspAceFile(vAlue) {
				throw errors.reAdonly();
			},
			updAteWorkspAceFolders: (index, deleteCount, ...workspAceFoldersToAdd) => {
				return extHostWorkspAce.updAteWorkspAceFolders(extension, index, deleteCount || 0, ...workspAceFoldersToAdd);
			},
			onDidChAngeWorkspAceFolders: function (listener, thisArgs?, disposAbles?) {
				return extHostWorkspAce.onDidChAngeWorkspAce(listener, thisArgs, disposAbles);
			},
			AsRelAtivePAth: (pAthOrUri, includeWorkspAce?) => {
				return extHostWorkspAce.getRelAtivePAth(pAthOrUri, includeWorkspAce);
			},
			findFiles: (include, exclude, mAxResults?, token?) => {
				// Note, undefined/null hAve different meAnings on "exclude"
				return extHostWorkspAce.findFiles(typeConverters.GlobPAttern.from(include), typeConverters.GlobPAttern.from(exclude), mAxResults, extension.identifier, token);
			},
			findTextInFiles: (query: vscode.TextSeArchQuery, optionsOrCAllbAck: vscode.FindTextInFilesOptions | ((result: vscode.TextSeArchResult) => void), cAllbAckOrToken?: vscode.CAncellAtionToken | ((result: vscode.TextSeArchResult) => void), token?: vscode.CAncellAtionToken) => {
				let options: vscode.FindTextInFilesOptions;
				let cAllbAck: (result: vscode.TextSeArchResult) => void;

				if (typeof optionsOrCAllbAck === 'object') {
					options = optionsOrCAllbAck;
					cAllbAck = cAllbAckOrToken As (result: vscode.TextSeArchResult) => void;
				} else {
					options = {};
					cAllbAck = optionsOrCAllbAck;
					token = cAllbAckOrToken As vscode.CAncellAtionToken;
				}

				return extHostWorkspAce.findTextInFiles(query, options || {}, cAllbAck, extension.identifier, token);
			},
			sAveAll: (includeUntitled?) => {
				return extHostWorkspAce.sAveAll(includeUntitled);
			},
			ApplyEdit(edit: vscode.WorkspAceEdit): ThenAble<booleAn> {
				return extHostBulkEdits.ApplyWorkspAceEdit(edit);
			},
			creAteFileSystemWAtcher: (pAttern, ignoreCreAte, ignoreChAnge, ignoreDelete): vscode.FileSystemWAtcher => {
				return extHostFileSystemEvent.creAteFileSystemWAtcher(typeConverters.GlobPAttern.from(pAttern), ignoreCreAte, ignoreChAnge, ignoreDelete);
			},
			get textDocuments() {
				return extHostDocuments.getAllDocumentDAtA().mAp(dAtA => dAtA.document);
			},
			set textDocuments(vAlue) {
				throw errors.reAdonly();
			},
			openTextDocument(uriOrFileNAmeOrOptions?: vscode.Uri | string | { lAnguAge?: string; content?: string; }) {
				let uriPromise: ThenAble<URI>;

				const options = uriOrFileNAmeOrOptions As { lAnguAge?: string; content?: string; };
				if (typeof uriOrFileNAmeOrOptions === 'string') {
					uriPromise = Promise.resolve(URI.file(uriOrFileNAmeOrOptions));
				} else if (URI.isUri(uriOrFileNAmeOrOptions)) {
					uriPromise = Promise.resolve(uriOrFileNAmeOrOptions);
				} else if (!options || typeof options === 'object') {
					uriPromise = extHostDocuments.creAteDocumentDAtA(options);
				} else {
					throw new Error('illegAl Argument - uriOrFileNAmeOrOptions');
				}

				return uriPromise.then(uri => {
					return extHostDocuments.ensureDocumentDAtA(uri).then(documentDAtA => {
						return documentDAtA.document;
					});
				});
			},
			onDidOpenTextDocument: (listener, thisArgs?, disposAbles?) => {
				return extHostDocuments.onDidAddDocument(listener, thisArgs, disposAbles);
			},
			onDidCloseTextDocument: (listener, thisArgs?, disposAbles?) => {
				return extHostDocuments.onDidRemoveDocument(listener, thisArgs, disposAbles);
			},
			onDidChAngeTextDocument: (listener, thisArgs?, disposAbles?) => {
				return extHostDocuments.onDidChAngeDocument(listener, thisArgs, disposAbles);
			},
			onDidSAveTextDocument: (listener, thisArgs?, disposAbles?) => {
				return extHostDocuments.onDidSAveDocument(listener, thisArgs, disposAbles);
			},
			onWillSAveTextDocument: (listener, thisArgs?, disposAbles?) => {
				return extHostDocumentSAvePArticipAnt.getOnWillSAveTextDocumentEvent(extension)(listener, thisArgs, disposAbles);
			},
			onDidChAngeConfigurAtion: (listener: (_: Any) => Any, thisArgs?: Any, disposAbles?: extHostTypes.DisposAble[]) => {
				return configProvider.onDidChAngeConfigurAtion(listener, thisArgs, disposAbles);
			},
			getConfigurAtion(section?: string, scope?: vscode.ConfigurAtionScope | null): vscode.WorkspAceConfigurAtion {
				scope = Arguments.length === 1 ? undefined : scope;
				return configProvider.getConfigurAtion(section, scope, extension);
			},
			registerTextDocumentContentProvider(scheme: string, provider: vscode.TextDocumentContentProvider) {
				return extHostDocumentContentProviders.registerTextDocumentContentProvider(scheme, provider);
			},
			registerTAskProvider: (type: string, provider: vscode.TAskProvider) => {
				extHostApiDeprecAtion.report('window.registerTAskProvider', extension,
					`Use the corresponding function on the 'tAsks' nAmespAce insteAd`);

				return extHostTAsk.registerTAskProvider(extension, type, provider);
			},
			registerFileSystemProvider(scheme, provider, options) {
				return extHostFileSystem.registerFileSystemProvider(extension.identifier, scheme, provider, options);
			},
			get fs() {
				return extHostConsumerFileSystem;
			},
			registerFileSeArchProvider: (scheme: string, provider: vscode.FileSeArchProvider) => {
				checkProposedApiEnAbled(extension);
				return extHostSeArch.registerFileSeArchProvider(scheme, provider);
			},
			registerTextSeArchProvider: (scheme: string, provider: vscode.TextSeArchProvider) => {
				checkProposedApiEnAbled(extension);
				return extHostSeArch.registerTextSeArchProvider(scheme, provider);
			},
			registerRemoteAuthorityResolver: (AuthorityPrefix: string, resolver: vscode.RemoteAuthorityResolver) => {
				checkProposedApiEnAbled(extension);
				return extensionService.registerRemoteAuthorityResolver(AuthorityPrefix, resolver);
			},
			registerResourceLAbelFormAtter: (formAtter: vscode.ResourceLAbelFormAtter) => {
				checkProposedApiEnAbled(extension);
				return extHostLAbelService.$registerResourceLAbelFormAtter(formAtter);
			},
			onDidCreAteFiles: (listener, thisArg, disposAbles) => {
				return extHostFileSystemEvent.onDidCreAteFile(listener, thisArg, disposAbles);
			},
			onDidDeleteFiles: (listener, thisArg, disposAbles) => {
				return extHostFileSystemEvent.onDidDeleteFile(listener, thisArg, disposAbles);
			},
			onDidRenAmeFiles: (listener, thisArg, disposAbles) => {
				return extHostFileSystemEvent.onDidRenAmeFile(listener, thisArg, disposAbles);
			},
			onWillCreAteFiles: (listener: (e: vscode.FileWillCreAteEvent) => Any, thisArg?: Any, disposAbles?: vscode.DisposAble[]) => {
				return extHostFileSystemEvent.getOnWillCreAteFileEvent(extension)(listener, thisArg, disposAbles);
			},
			onWillDeleteFiles: (listener: (e: vscode.FileWillDeleteEvent) => Any, thisArg?: Any, disposAbles?: vscode.DisposAble[]) => {
				return extHostFileSystemEvent.getOnWillDeleteFileEvent(extension)(listener, thisArg, disposAbles);
			},
			onWillRenAmeFiles: (listener: (e: vscode.FileWillRenAmeEvent) => Any, thisArg?: Any, disposAbles?: vscode.DisposAble[]) => {
				return extHostFileSystemEvent.getOnWillRenAmeFileEvent(extension)(listener, thisArg, disposAbles);
			},
			openTunnel: (forwArd: vscode.TunnelOptions) => {
				checkProposedApiEnAbled(extension);
				return extHostTunnelService.openTunnel(forwArd).then(vAlue => {
					if (!vAlue) {
						throw new Error('cAnnot open tunnel');
					}
					return vAlue;
				});
			},
			get tunnels() {
				checkProposedApiEnAbled(extension);
				return extHostTunnelService.getTunnels();
			},
			onDidChAngeTunnels: (listener, thisArg?, disposAbles?) => {
				checkProposedApiEnAbled(extension);
				return extHostTunnelService.onDidChAngeTunnels(listener, thisArg, disposAbles);

			},
			registerTimelineProvider: (scheme: string | string[], provider: vscode.TimelineProvider) => {
				checkProposedApiEnAbled(extension);
				return extHostTimeline.registerTimelineProvider(scheme, provider, extension.identifier, extHostCommAnds.converter);
			}
		};

		// nAmespAce: scm
		const scm: typeof vscode.scm = {
			get inputBox() {
				extHostApiDeprecAtion.report('scm.inputBox', extension,
					`Use 'SourceControl.inputBox' insteAd`);

				return extHostSCM.getLAstInputBox(extension)!; // Strict null override - DeprecAted Api
			},
			creAteSourceControl(id: string, lAbel: string, rootUri?: vscode.Uri) {
				return extHostSCM.creAteSourceControl(extension, id, lAbel, rootUri);
			}
		};

		const comment: typeof vscode.comments = {
			creAteCommentController(id: string, lAbel: string) {
				return extHostComment.creAteCommentController(extension, id, lAbel);
			}
		};

		const comments = comment;

		// nAmespAce: debug
		const debug: typeof vscode.debug = {
			get ActiveDebugSession() {
				return extHostDebugService.ActiveDebugSession;
			},
			get ActiveDebugConsole() {
				return extHostDebugService.ActiveDebugConsole;
			},
			get breAkpoints() {
				return extHostDebugService.breAkpoints;
			},
			onDidStArtDebugSession(listener, thisArg?, disposAbles?) {
				return extHostDebugService.onDidStArtDebugSession(listener, thisArg, disposAbles);
			},
			onDidTerminAteDebugSession(listener, thisArg?, disposAbles?) {
				return extHostDebugService.onDidTerminAteDebugSession(listener, thisArg, disposAbles);
			},
			onDidChAngeActiveDebugSession(listener, thisArg?, disposAbles?) {
				return extHostDebugService.onDidChAngeActiveDebugSession(listener, thisArg, disposAbles);
			},
			onDidReceiveDebugSessionCustomEvent(listener, thisArg?, disposAbles?) {
				return extHostDebugService.onDidReceiveDebugSessionCustomEvent(listener, thisArg, disposAbles);
			},
			onDidChAngeBreAkpoints(listener, thisArgs?, disposAbles?) {
				return extHostDebugService.onDidChAngeBreAkpoints(listener, thisArgs, disposAbles);
			},
			registerDebugConfigurAtionProvider(debugType: string, provider: vscode.DebugConfigurAtionProvider, triggerKind?: vscode.DebugConfigurAtionProviderTriggerKind) {
				return extHostDebugService.registerDebugConfigurAtionProvider(debugType, provider, triggerKind || extHostTypes.DebugConfigurAtionProviderTriggerKind.InitiAl);
			},
			registerDebugAdApterDescriptorFActory(debugType: string, fActory: vscode.DebugAdApterDescriptorFActory) {
				return extHostDebugService.registerDebugAdApterDescriptorFActory(extension, debugType, fActory);
			},
			registerDebugAdApterTrAckerFActory(debugType: string, fActory: vscode.DebugAdApterTrAckerFActory) {
				return extHostDebugService.registerDebugAdApterTrAckerFActory(debugType, fActory);
			},
			stArtDebugging(folder: vscode.WorkspAceFolder | undefined, nAmeOrConfig: string | vscode.DebugConfigurAtion, pArentSessionOrOptions?: vscode.DebugSession | vscode.DebugSessionOptions) {
				if (!pArentSessionOrOptions || (typeof pArentSessionOrOptions === 'object' && 'configurAtion' in pArentSessionOrOptions)) {
					return extHostDebugService.stArtDebugging(folder, nAmeOrConfig, { pArentSession: pArentSessionOrOptions });
				}
				return extHostDebugService.stArtDebugging(folder, nAmeOrConfig, pArentSessionOrOptions || {});
			},
			stopDebugging(session?: vscode.DebugSession) {
				return extHostDebugService.stopDebugging(session);
			},
			AddBreAkpoints(breAkpoints: vscode.BreAkpoint[]) {
				return extHostDebugService.AddBreAkpoints(breAkpoints);
			},
			removeBreAkpoints(breAkpoints: vscode.BreAkpoint[]) {
				return extHostDebugService.removeBreAkpoints(breAkpoints);
			},
			AsDebugSourceUri(source: vscode.DebugProtocolSource, session?: vscode.DebugSession): vscode.Uri {
				return extHostDebugService.AsDebugSourceUri(source, session);
			}
		};

		const tAsks: typeof vscode.tAsks = {
			registerTAskProvider: (type: string, provider: vscode.TAskProvider) => {
				return extHostTAsk.registerTAskProvider(extension, type, provider);
			},
			fetchTAsks: (filter?: vscode.TAskFilter): ThenAble<vscode.TAsk[]> => {
				return extHostTAsk.fetchTAsks(filter);
			},
			executeTAsk: (tAsk: vscode.TAsk): ThenAble<vscode.TAskExecution> => {
				return extHostTAsk.executeTAsk(extension, tAsk);
			},
			get tAskExecutions(): vscode.TAskExecution[] {
				return extHostTAsk.tAskExecutions;
			},
			onDidStArtTAsk: (listeners, thisArgs?, disposAbles?) => {
				return extHostTAsk.onDidStArtTAsk(listeners, thisArgs, disposAbles);
			},
			onDidEndTAsk: (listeners, thisArgs?, disposAbles?) => {
				return extHostTAsk.onDidEndTAsk(listeners, thisArgs, disposAbles);
			},
			onDidStArtTAskProcess: (listeners, thisArgs?, disposAbles?) => {
				return extHostTAsk.onDidStArtTAskProcess(listeners, thisArgs, disposAbles);
			},
			onDidEndTAskProcess: (listeners, thisArgs?, disposAbles?) => {
				return extHostTAsk.onDidEndTAskProcess(listeners, thisArgs, disposAbles);
			}
		};

		// nAmespAce: notebook
		const notebook: (typeof vscode.notebook & {
			// to ensure thAt notebook extensions not breAk before they updAte APIs.
			visibleNotebookEditors: vscode.NotebookEditor[];
			onDidChAngeVisibleNotebookEditors: Event<vscode.NotebookEditor[]>;
			ActiveNotebookEditor: vscode.NotebookEditor | undefined;
			onDidChAngeActiveNotebookEditor: Event<vscode.NotebookEditor | undefined>;
			onDidChAngeNotebookEditorSelection: Event<vscode.NotebookEditorSelectionChAngeEvent>;
			onDidChAngeNotebookEditorVisibleRAnges: Event<vscode.NotebookEditorVisibleRAngesChAngeEvent>;
		}) = {
			openNotebookDocument: (uriComponents, viewType) => {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.openNotebookDocument(uriComponents, viewType);
			},
			get onDidOpenNotebookDocument(): Event<vscode.NotebookDocument> {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidOpenNotebookDocument;
			},
			get onDidCloseNotebookDocument(): Event<vscode.NotebookDocument> {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidCloseNotebookDocument;
			},
			get onDidSAveNotebookDocument(): Event<vscode.NotebookDocument> {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidSAveNotebookDocument;
			},
			get notebookDocuments(): vscode.NotebookDocument[] {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.notebookDocuments.mAp(d => d.notebookDocument);
			},
			get visibleNotebookEditors(): vscode.NotebookEditor[] {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.visibleNotebookEditors;
			},
			get onDidChAngeVisibleNotebookEditors() {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeVisibleNotebookEditors;
			},
			get onDidChAngeActiveNotebookKernel() {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeActiveNotebookKernel;
			},
			registerNotebookContentProvider: (viewType: string, provider: vscode.NotebookContentProvider, options?: {
				trAnsientOutputs: booleAn;
				trAnsientMetAdAtA: { [K in keyof vscode.NotebookCellMetAdAtA]?: booleAn }
			}) => {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.registerNotebookContentProvider(extension, viewType, provider, options);
			},
			registerNotebookKernelProvider: (selector: vscode.NotebookDocumentFilter, provider: vscode.NotebookKernelProvider) => {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.registerNotebookKernelProvider(extension, selector, provider);
			},
			creAteNotebookEditorDecorAtionType(options: vscode.NotebookDecorAtionRenderOptions): vscode.NotebookEditorDecorAtionType {
				return extHostNotebook.creAteNotebookEditorDecorAtionType(options);
			},
			get ActiveNotebookEditor(): vscode.NotebookEditor | undefined {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.ActiveNotebookEditor;
			},
			onDidChAngeActiveNotebookEditor(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeActiveNotebookEditor(listener, thisArgs, disposAbles);
			},
			onDidChAngeNotebookDocumentMetAdAtA(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeNotebookDocumentMetAdAtA(listener, thisArgs, disposAbles);
			},
			onDidChAngeNotebookCells(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeNotebookCells(listener, thisArgs, disposAbles);
			},
			onDidChAngeNotebookEditorSelection(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeNotebookEditorSelection(listener, thisArgs, disposAbles);
			},
			onDidChAngeNotebookEditorVisibleRAnges(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeNotebookEditorVisibleRAnges(listener, thisArgs, disposAbles);
			},
			onDidChAngeCellOutputs(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeCellOutputs(listener, thisArgs, disposAbles);
			},
			onDidChAngeCellLAnguAge(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeCellLAnguAge(listener, thisArgs, disposAbles);
			},
			onDidChAngeCellMetAdAtA(listener, thisArgs?, disposAbles?) {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.onDidChAngeCellMetAdAtA(listener, thisArgs, disposAbles);
			},
			creAteConcAtTextDocument(notebook, selector) {
				checkProposedApiEnAbled(extension);
				return new ExtHostNotebookConcAtDocument(extHostNotebook, extHostDocuments, notebook, selector);
			},
			creAteCellStAtusBArItem(cell: vscode.NotebookCell, Alignment?: vscode.NotebookCellStAtusBArAlignment, priority?: number): vscode.NotebookCellStAtusBArItem {
				checkProposedApiEnAbled(extension);
				return extHostNotebook.creAteNotebookCellStAtusBArItemInternAl(cell, Alignment, priority);
			}
		};

		return <typeof vscode>{
			version: initDAtA.version,
			// nAmespAces
			AuthenticAtion,
			commAnds,
			debug,
			env,
			extensions,
			lAnguAges,
			scm,
			comment,
			comments,
			tAsks,
			notebook,
			window,
			workspAce,
			// types
			BreAkpoint: extHostTypes.BreAkpoint,
			CAncellAtionTokenSource: CAncellAtionTokenSource,
			CodeAction: extHostTypes.CodeAction,
			CodeActionKind: extHostTypes.CodeActionKind,
			CodeActionTrigger: extHostTypes.CodeActionTrigger,
			CodeLens: extHostTypes.CodeLens,
			CodeInset: extHostTypes.CodeInset,
			Color: extHostTypes.Color,
			ColorInformAtion: extHostTypes.ColorInformAtion,
			ColorPresentAtion: extHostTypes.ColorPresentAtion,
			CommentThreAdCollApsibleStAte: extHostTypes.CommentThreAdCollApsibleStAte,
			CommentMode: extHostTypes.CommentMode,
			CompletionItem: extHostTypes.CompletionItem,
			CompletionItemKind: extHostTypes.CompletionItemKind,
			CompletionItemTAg: extHostTypes.CompletionItemTAg,
			CompletionList: extHostTypes.CompletionList,
			CompletionTriggerKind: extHostTypes.CompletionTriggerKind,
			ConfigurAtionTArget: extHostTypes.ConfigurAtionTArget,
			DebugAdApterExecutAble: extHostTypes.DebugAdApterExecutAble,
			DebugAdApterServer: extHostTypes.DebugAdApterServer,
			DebugAdApterNAmedPipeServer: extHostTypes.DebugAdApterNAmedPipeServer,
			DebugAdApterInlineImplementAtion: extHostTypes.DebugAdApterInlineImplementAtion,
			DecorAtionRAngeBehAvior: extHostTypes.DecorAtionRAngeBehAvior,
			DiAgnostic: extHostTypes.DiAgnostic,
			DiAgnosticRelAtedInformAtion: extHostTypes.DiAgnosticRelAtedInformAtion,
			DiAgnosticSeverity: extHostTypes.DiAgnosticSeverity,
			DiAgnosticTAg: extHostTypes.DiAgnosticTAg,
			DisposAble: extHostTypes.DisposAble,
			DocumentHighlight: extHostTypes.DocumentHighlight,
			DocumentHighlightKind: extHostTypes.DocumentHighlightKind,
			DocumentLink: extHostTypes.DocumentLink,
			DocumentSymbol: extHostTypes.DocumentSymbol,
			EndOfLine: extHostTypes.EndOfLine,
			EnvironmentVAriAbleMutAtorType: extHostTypes.EnvironmentVAriAbleMutAtorType,
			EvAluAtAbleExpression: extHostTypes.EvAluAtAbleExpression,
			EventEmitter: Emitter,
			ExtensionKind: extHostTypes.ExtensionKind,
			ExtensionMode: extHostTypes.ExtensionMode,
			ExtensionRuntime: extHostTypes.ExtensionRuntime,
			CustomExecution: extHostTypes.CustomExecution,
			FileChAngeType: extHostTypes.FileChAngeType,
			FileSystemError: extHostTypes.FileSystemError,
			FileType: files.FileType,
			FoldingRAnge: extHostTypes.FoldingRAnge,
			FoldingRAngeKind: extHostTypes.FoldingRAngeKind,
			FunctionBreAkpoint: extHostTypes.FunctionBreAkpoint,
			Hover: extHostTypes.Hover,
			IndentAction: lAnguAgeConfigurAtion.IndentAction,
			LocAtion: extHostTypes.LocAtion,
			LogLevel: extHostTypes.LogLevel,
			MArkdownString: extHostTypes.MArkdownString,
			OverviewRulerLAne: OverviewRulerLAne,
			PArAmeterInformAtion: extHostTypes.PArAmeterInformAtion,
			Position: extHostTypes.Position,
			ProcessExecution: extHostTypes.ProcessExecution,
			ProgressLocAtion: extHostTypes.ProgressLocAtion,
			QuickInputButtons: extHostTypes.QuickInputButtons,
			RAnge: extHostTypes.RAnge,
			RelAtivePAttern: extHostTypes.RelAtivePAttern,
			ResolvedAuthority: extHostTypes.ResolvedAuthority,
			RemoteAuthorityResolverError: extHostTypes.RemoteAuthorityResolverError,
			SemAnticTokensLegend: extHostTypes.SemAnticTokensLegend,
			SemAnticTokensBuilder: extHostTypes.SemAnticTokensBuilder,
			SemAnticTokens: extHostTypes.SemAnticTokens,
			SemAnticTokensEdits: extHostTypes.SemAnticTokensEdits,
			SemAnticTokensEdit: extHostTypes.SemAnticTokensEdit,
			Selection: extHostTypes.Selection,
			SelectionRAnge: extHostTypes.SelectionRAnge,
			ShellExecution: extHostTypes.ShellExecution,
			ShellQuoting: extHostTypes.ShellQuoting,
			SignAtureHelpTriggerKind: extHostTypes.SignAtureHelpTriggerKind,
			SignAtureHelp: extHostTypes.SignAtureHelp,
			SignAtureInformAtion: extHostTypes.SignAtureInformAtion,
			SnippetString: extHostTypes.SnippetString,
			SourceBreAkpoint: extHostTypes.SourceBreAkpoint,
			SourceControlInputBoxVAlidAtionType: extHostTypes.SourceControlInputBoxVAlidAtionType,
			StAndArdTokenType: extHostTypes.StAndArdTokenType,
			StAtusBArAlignment: extHostTypes.StAtusBArAlignment,
			SymbolInformAtion: extHostTypes.SymbolInformAtion,
			SymbolKind: extHostTypes.SymbolKind,
			SymbolTAg: extHostTypes.SymbolTAg,
			TAsk: extHostTypes.TAsk,
			TAskGroup: extHostTypes.TAskGroup,
			TAskPAnelKind: extHostTypes.TAskPAnelKind,
			TAskReveAlKind: extHostTypes.TAskReveAlKind,
			TAskScope: extHostTypes.TAskScope,
			TextDocumentSAveReAson: extHostTypes.TextDocumentSAveReAson,
			TextEdit: extHostTypes.TextEdit,
			TextEditorCursorStyle: TextEditorCursorStyle,
			TextEditorLineNumbersStyle: extHostTypes.TextEditorLineNumbersStyle,
			TextEditorReveAlType: extHostTypes.TextEditorReveAlType,
			TextEditorSelectionChAngeKind: extHostTypes.TextEditorSelectionChAngeKind,
			ThemeColor: extHostTypes.ThemeColor,
			ThemeIcon: extHostTypes.ThemeIcon,
			TreeItem: extHostTypes.TreeItem,
			TreeItem2: extHostTypes.TreeItem,
			TreeItemCollApsibleStAte: extHostTypes.TreeItemCollApsibleStAte,
			Uri: URI,
			ViewColumn: extHostTypes.ViewColumn,
			WorkspAceEdit: extHostTypes.WorkspAceEdit,
			// proposed
			CAllHierArchyOutgoingCAll: extHostTypes.CAllHierArchyOutgoingCAll,
			CAllHierArchyIncomingCAll: extHostTypes.CAllHierArchyIncomingCAll,
			CAllHierArchyItem: extHostTypes.CAllHierArchyItem,
			DebugConsoleMode: extHostTypes.DebugConsoleMode,
			DebugConfigurAtionProviderTriggerKind: extHostTypes.DebugConfigurAtionProviderTriggerKind,
			FileDecorAtion: extHostTypes.FileDecorAtion,
			UIKind: UIKind,
			ColorThemeKind: extHostTypes.ColorThemeKind,
			TimelineItem: extHostTypes.TimelineItem,
			CellKind: extHostTypes.CellKind,
			CellOutputKind: extHostTypes.CellOutputKind,
			NotebookCellRunStAte: extHostTypes.NotebookCellRunStAte,
			NotebookRunStAte: extHostTypes.NotebookRunStAte,
			NotebookCellStAtusBArAlignment: extHostTypes.NotebookCellStAtusBArAlignment,
			NotebookEditorReveAlType: extHostTypes.NotebookEditorReveAlType,
			NotebookCellOutput: extHostTypes.NotebookCellOutput,
			NotebookCellOutputItem: extHostTypes.NotebookCellOutputItem,
		};
	};
}

clAss Extension<T> implements vscode.Extension<T> {

	privAte _extensionService: IExtHostExtensionService;
	privAte _originExtensionId: ExtensionIdentifier;
	privAte _identifier: ExtensionIdentifier;

	reAdonly id: string;
	reAdonly extensionUri: URI;
	reAdonly extensionPAth: string;
	reAdonly pAckAgeJSON: IExtensionDescription;
	reAdonly extensionKind: vscode.ExtensionKind;

	constructor(extensionService: IExtHostExtensionService, originExtensionId: ExtensionIdentifier, description: IExtensionDescription, kind: extHostTypes.ExtensionKind) {
		this._extensionService = extensionService;
		this._originExtensionId = originExtensionId;
		this._identifier = description.identifier;
		this.id = description.identifier.vAlue;
		this.extensionUri = description.extensionLocAtion;
		this.extensionPAth = pAth.normAlize(originAlFSPAth(description.extensionLocAtion));
		this.pAckAgeJSON = description;
		this.extensionKind = kind;
	}

	get isActive(): booleAn {
		return this._extensionService.isActivAted(this._identifier);
	}

	get exports(): T {
		if (this.pAckAgeJSON.Api === 'none') {
			return undefined!; // Strict nulloverride - Public Api
		}
		return <T>this._extensionService.getExtensionExports(this._identifier);
	}

	ActivAte(): ThenAble<T> {
		return this._extensionService.ActivAteByIdWithErrors(this._identifier, { stArtup: fAlse, extensionId: this._originExtensionId, ActivAtionEvent: 'Api' }).then(() => this.exports);
	}
}
