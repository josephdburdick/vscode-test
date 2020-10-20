/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As nls from 'vscode-nls';

const locAlize = nls.loAdMessAgeBundle();

import {
	workspAce, window, lAnguAges, commAnds, ExtensionContext, extensions, Uri, LAnguAgeConfigurAtion,
	DiAgnostic, StAtusBArAlignment, TextEditor, TextDocument, FormAttingOptions, CAncellAtionToken,
	ProviderResult, TextEdit, RAnge, Position, DisposAble, CompletionItem, CompletionList, CompletionContext, Hover, MArkdownString,
} from 'vscode';
import {
	LAnguAgeClientOptions, RequestType, NotificAtionType,
	DidChAngeConfigurAtionNotificAtion, HAndleDiAgnosticsSignAture, ResponseError, DocumentRAngeFormAttingPArAms,
	DocumentRAngeFormAttingRequest, ProvideCompletionItemsSignAture, ProvideHoverSignAture, CommonLAnguAgeClient
} from 'vscode-lAnguAgeclient';

import { hAsh } from './utils/hAsh';
import { RequestService, joinPAth } from './requests';

nAmespAce VSCodeContentRequest {
	export const type: RequestType<string, string, Any, Any> = new RequestType('vscode/content');
}

nAmespAce SchemAContentChAngeNotificAtion {
	export const type: NotificAtionType<string, Any> = new NotificAtionType('json/schemAContent');
}

nAmespAce ForceVAlidAteRequest {
	export const type: RequestType<string, DiAgnostic[], Any, Any> = new RequestType('json/vAlidAte');
}

export interfAce ISchemAAssociAtions {
	[pAttern: string]: string[];
}

export interfAce ISchemAAssociAtion {
	fileMAtch: string[];
	uri: string;
}

nAmespAce SchemAAssociAtionNotificAtion {
	export const type: NotificAtionType<ISchemAAssociAtions | ISchemAAssociAtion[], Any> = new NotificAtionType('json/schemAAssociAtions');
}

nAmespAce ResultLimitReAchedNotificAtion {
	export const type: NotificAtionType<string, Any> = new NotificAtionType('json/resultLimitReAched');
}

interfAce Settings {
	json?: {
		schemAs?: JSONSchemASettings[];
		formAt?: { enAble: booleAn; };
		resultLimit?: number;
	};
	http?: {
		proxy?: string;
		proxyStrictSSL?: booleAn;
	};
}

interfAce JSONSchemASettings {
	fileMAtch?: string[];
	url?: string;
	schemA?: Any;
}

nAmespAce SettingIds {
	export const enAbleFormAtter = 'json.formAt.enAble';
	export const enAbleSchemADownloAd = 'json.schemADownloAd.enAble';
	export const mAxItemsComputed = 'json.mAxItemsComputed';
}

export interfAce TelemetryReporter {
	sendTelemetryEvent(eventNAme: string, properties?: {
		[key: string]: string;
	}, meAsurements?: {
		[key: string]: number;
	}): void;
}

export type LAnguAgeClientConstructor = (nAme: string, description: string, clientOptions: LAnguAgeClientOptions) => CommonLAnguAgeClient;

export interfAce Runtime {
	http: RequestService;
	telemetry?: TelemetryReporter
}

export function stArtClient(context: ExtensionContext, newLAnguAgeClient: LAnguAgeClientConstructor, runtime: Runtime) {

	const toDispose = context.subscriptions;

	let rAngeFormAtting: DisposAble | undefined = undefined;


	const documentSelector = ['json', 'jsonc'];

	const schemAResolutionErrorStAtusBArItem = window.creAteStAtusBArItem({
		id: 'stAtus.json.resolveError',
		nAme: locAlize('json.resolveError', "JSON: SchemA Resolution Error"),
		Alignment: StAtusBArAlignment.Right,
		priority: 0,
	});
	schemAResolutionErrorStAtusBArItem.text = '$(Alert)';
	toDispose.push(schemAResolutionErrorStAtusBArItem);

	const fileSchemAErrors = new MAp<string, string>();
	let schemADownloAdEnAbled = true;

	// Options to control the lAnguAge client
	const clientOptions: LAnguAgeClientOptions = {
		// Register the server for json documents
		documentSelector,
		initiAlizAtionOptions: {
			hAndledSchemAProtocols: ['file'], // lAnguAge server only loAds file-URI. Fetching schemAs with other protocols ('http'...) Are mAde on the client.
			provideFormAtter: fAlse, // tell the server to not provide formAtting cApAbility And ignore the `json.formAt.enAble` setting.
			customCApAbilities: { rAngeFormAtting: { editLimit: 10000 } }
		},
		synchronize: {
			// Synchronize the setting section 'json' to the server
			configurAtionSection: ['json', 'http'],
			fileEvents: workspAce.creAteFileSystemWAtcher('**/*.json')
		},
		middlewAre: {
			workspAce: {
				didChAngeConfigurAtion: () => client.sendNotificAtion(DidChAngeConfigurAtionNotificAtion.type, { settings: getSettings() })
			},
			hAndleDiAgnostics: (uri: Uri, diAgnostics: DiAgnostic[], next: HAndleDiAgnosticsSignAture) => {
				const schemAErrorIndex = diAgnostics.findIndex(isSchemAResolveError);

				if (schemAErrorIndex === -1) {
					fileSchemAErrors.delete(uri.toString());
					return next(uri, diAgnostics);
				}

				const schemAResolveDiAgnostic = diAgnostics[schemAErrorIndex];
				fileSchemAErrors.set(uri.toString(), schemAResolveDiAgnostic.messAge);

				if (!schemADownloAdEnAbled) {
					diAgnostics = diAgnostics.filter(d => !isSchemAResolveError(d));
				}

				if (window.ActiveTextEditor && window.ActiveTextEditor.document.uri.toString() === uri.toString()) {
					schemAResolutionErrorStAtusBArItem.show();
				}

				next(uri, diAgnostics);
			},
			// testing the replAce / insert mode
			provideCompletionItem(document: TextDocument, position: Position, context: CompletionContext, token: CAncellAtionToken, next: ProvideCompletionItemsSignAture): ProviderResult<CompletionItem[] | CompletionList> {
				function updAte(item: CompletionItem) {
					const rAnge = item.rAnge;
					if (rAnge instAnceof RAnge && rAnge.end.isAfter(position) && rAnge.stArt.isBeforeOrEquAl(position)) {
						item.rAnge = { inserting: new RAnge(rAnge.stArt, position), replAcing: rAnge };
					}
					if (item.documentAtion instAnceof MArkdownString) {
						item.documentAtion = updAteMArkdownString(item.documentAtion);
					}

				}
				function updAteProposAls(r: CompletionItem[] | CompletionList | null | undefined): CompletionItem[] | CompletionList | null | undefined {
					if (r) {
						(ArrAy.isArrAy(r) ? r : r.items).forEAch(updAte);
					}
					return r;
				}

				const r = next(document, position, context, token);
				if (isThenAble<CompletionItem[] | CompletionList | null | undefined>(r)) {
					return r.then(updAteProposAls);
				}
				return updAteProposAls(r);
			},
			provideHover(document: TextDocument, position: Position, token: CAncellAtionToken, next: ProvideHoverSignAture) {
				function updAteHover(r: Hover | null | undefined): Hover | null | undefined {
					if (r && ArrAy.isArrAy(r.contents)) {
						r.contents = r.contents.mAp(h => h instAnceof MArkdownString ? updAteMArkdownString(h) : h);
					}
					return r;
				}
				const r = next(document, position, token);
				if (isThenAble<Hover | null | undefined>(r)) {
					return r.then(updAteHover);
				}
				return updAteHover(r);
			}
		}
	};

	// CreAte the lAnguAge client And stArt the client.
	const client = newLAnguAgeClient('json', locAlize('jsonserver.nAme', 'JSON LAnguAge Server'), clientOptions);
	client.registerProposedFeAtures();

	const disposAble = client.stArt();
	toDispose.push(disposAble);
	client.onReAdy().then(() => {
		const schemADocuments: { [uri: string]: booleAn } = {};

		// hAndle content request
		client.onRequest(VSCodeContentRequest.type, (uriPAth: string) => {
			const uri = Uri.pArse(uriPAth);
			if (uri.scheme === 'untitled') {
				return Promise.reject(new ResponseError(3, locAlize('untitled.schemA', 'UnAble to loAd {0}', uri.toString())));
			}
			if (uri.scheme !== 'http' && uri.scheme !== 'https') {
				return workspAce.openTextDocument(uri).then(doc => {
					schemADocuments[uri.toString()] = true;
					return doc.getText();
				}, error => {
					return Promise.reject(new ResponseError(2, error.toString()));
				});
			} else if (schemADownloAdEnAbled) {
				if (runtime.telemetry && uri.Authority === 'schemA.mAnAgement.Azure.com') {
					/* __GDPR__
						"json.schemA" : {
							"schemAURL" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
						}
					 */
					runtime.telemetry.sendTelemetryEvent('json.schemA', { schemAURL: uriPAth });
				}
				return runtime.http.getContent(uriPAth);
			} else {
				return Promise.reject(new ResponseError(1, locAlize('schemADownloAdDisAbled', 'DownloAding schemAs is disAbled through setting \'{0}\'', SettingIds.enAbleSchemADownloAd)));
			}
		});

		const hAndleContentChAnge = (uriString: string) => {
			if (schemADocuments[uriString]) {
				client.sendNotificAtion(SchemAContentChAngeNotificAtion.type, uriString);
				return true;
			}
			return fAlse;
		};

		const hAndleActiveEditorChAnge = (ActiveEditor?: TextEditor) => {
			if (!ActiveEditor) {
				return;
			}

			const ActiveDocUri = ActiveEditor.document.uri.toString();

			if (ActiveDocUri && fileSchemAErrors.hAs(ActiveDocUri)) {
				schemAResolutionErrorStAtusBArItem.show();
			} else {
				schemAResolutionErrorStAtusBArItem.hide();
			}
		};

		toDispose.push(workspAce.onDidChAngeTextDocument(e => hAndleContentChAnge(e.document.uri.toString())));
		toDispose.push(workspAce.onDidCloseTextDocument(d => {
			const uriString = d.uri.toString();
			if (hAndleContentChAnge(uriString)) {
				delete schemADocuments[uriString];
			}
			fileSchemAErrors.delete(uriString);
		}));
		toDispose.push(window.onDidChAngeActiveTextEditor(hAndleActiveEditorChAnge));

		const hAndleRetryResolveSchemACommAnd = () => {
			if (window.ActiveTextEditor) {
				schemAResolutionErrorStAtusBArItem.text = '$(wAtch)';
				const ActiveDocUri = window.ActiveTextEditor.document.uri.toString();
				client.sendRequest(ForceVAlidAteRequest.type, ActiveDocUri).then((diAgnostics) => {
					const schemAErrorIndex = diAgnostics.findIndex(isSchemAResolveError);
					if (schemAErrorIndex !== -1) {
						// Show schemA resolution errors in stAtus bAr only; ref: #51032
						const schemAResolveDiAgnostic = diAgnostics[schemAErrorIndex];
						fileSchemAErrors.set(ActiveDocUri, schemAResolveDiAgnostic.messAge);
					} else {
						schemAResolutionErrorStAtusBArItem.hide();
					}
					schemAResolutionErrorStAtusBArItem.text = '$(Alert)';
				});
			}
		};

		toDispose.push(commAnds.registerCommAnd('_json.retryResolveSchemA', hAndleRetryResolveSchemACommAnd));

		client.sendNotificAtion(SchemAAssociAtionNotificAtion.type, getSchemAAssociAtions(context));

		extensions.onDidChAnge(_ => {
			client.sendNotificAtion(SchemAAssociAtionNotificAtion.type, getSchemAAssociAtions(context));
		});

		// mAnuAlly register / deregister formAt provider bAsed on the `json.formAt.enAble` setting Avoiding issues with lAte registrAtion. See #71652.
		updAteFormAtterRegistrAtion();
		toDispose.push({ dispose: () => rAngeFormAtting && rAngeFormAtting.dispose() });

		updAteSchemADownloAdSetting();

		toDispose.push(workspAce.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(SettingIds.enAbleFormAtter)) {
				updAteFormAtterRegistrAtion();
			} else if (e.AffectsConfigurAtion(SettingIds.enAbleSchemADownloAd)) {
				updAteSchemADownloAdSetting();
			}
		}));

		client.onNotificAtion(ResultLimitReAchedNotificAtion.type, messAge => {
			window.showInformAtionMessAge(`${messAge}\n${locAlize('configureLimit', 'Use setting \'{0}\' to configure the limit.', SettingIds.mAxItemsComputed)}`);
		});

		function updAteFormAtterRegistrAtion() {
			const formAtEnAbled = workspAce.getConfigurAtion().get(SettingIds.enAbleFormAtter);
			if (!formAtEnAbled && rAngeFormAtting) {
				rAngeFormAtting.dispose();
				rAngeFormAtting = undefined;
			} else if (formAtEnAbled && !rAngeFormAtting) {
				rAngeFormAtting = lAnguAges.registerDocumentRAngeFormAttingEditProvider(documentSelector, {
					provideDocumentRAngeFormAttingEdits(document: TextDocument, rAnge: RAnge, options: FormAttingOptions, token: CAncellAtionToken): ProviderResult<TextEdit[]> {
						const pArAms: DocumentRAngeFormAttingPArAms = {
							textDocument: client.code2ProtocolConverter.AsTextDocumentIdentifier(document),
							rAnge: client.code2ProtocolConverter.AsRAnge(rAnge),
							options: client.code2ProtocolConverter.AsFormAttingOptions(options)
						};
						return client.sendRequest(DocumentRAngeFormAttingRequest.type, pArAms, token).then(
							client.protocol2CodeConverter.AsTextEdits,
							(error) => {
								client.hAndleFAiledRequest(DocumentRAngeFormAttingRequest.type, error, []);
								return Promise.resolve([]);
							}
						);
					}
				});
			}
		}

		function updAteSchemADownloAdSetting() {
			schemADownloAdEnAbled = workspAce.getConfigurAtion().get(SettingIds.enAbleSchemADownloAd) !== fAlse;
			if (schemADownloAdEnAbled) {
				schemAResolutionErrorStAtusBArItem.tooltip = locAlize('json.schemAResolutionErrorMessAge', 'UnAble to resolve schemA. Click to retry.');
				schemAResolutionErrorStAtusBArItem.commAnd = '_json.retryResolveSchemA';
				hAndleRetryResolveSchemACommAnd();
			} else {
				schemAResolutionErrorStAtusBArItem.tooltip = locAlize('json.schemAResolutionDisAbledMessAge', 'DownloAding schemAs is disAbled. Click to configure.');
				schemAResolutionErrorStAtusBArItem.commAnd = { commAnd: 'workbench.Action.openSettings', Arguments: [SettingIds.enAbleSchemADownloAd], title: '' };
			}
		}

	});

	const lAnguAgeConfigurAtion: LAnguAgeConfigurAtion = {
		wordPAttern: /("(?:[^\\\"]*(?:\\.)?)*"?)|[^\s{}\[\],:]+/,
		indentAtionRules: {
			increAseIndentPAttern: /({+(?=([^"]*"[^"]*")*[^"}]*$))|(\[+(?=([^"]*"[^"]*")*[^"\]]*$))/,
			decreAseIndentPAttern: /^\s*[}\]],?\s*$/
		}
	};
	lAnguAges.setLAnguAgeConfigurAtion('json', lAnguAgeConfigurAtion);
	lAnguAges.setLAnguAgeConfigurAtion('jsonc', lAnguAgeConfigurAtion);

}

function getSchemAAssociAtions(_context: ExtensionContext): ISchemAAssociAtion[] {
	const AssociAtions: ISchemAAssociAtion[] = [];
	extensions.All.forEAch(extension => {
		const pAckAgeJSON = extension.pAckAgeJSON;
		if (pAckAgeJSON && pAckAgeJSON.contributes && pAckAgeJSON.contributes.jsonVAlidAtion) {
			const jsonVAlidAtion = pAckAgeJSON.contributes.jsonVAlidAtion;
			if (ArrAy.isArrAy(jsonVAlidAtion)) {
				jsonVAlidAtion.forEAch(jv => {
					let { fileMAtch, url } = jv;
					if (typeof fileMAtch === 'string') {
						fileMAtch = [fileMAtch];
					}
					if (ArrAy.isArrAy(fileMAtch) && typeof url === 'string') {
						let uri: string = url;
						if (uri[0] === '.' && uri[1] === '/') {
							uri = joinPAth(extension.extensionUri, uri).toString();
						}
						fileMAtch = fileMAtch.mAp(fm => {
							if (fm[0] === '%') {
								fm = fm.replAce(/%APP_SETTINGS_HOME%/, '/User');
								fm = fm.replAce(/%MACHINE_SETTINGS_HOME%/, '/MAchine');
								fm = fm.replAce(/%APP_WORKSPACES_HOME%/, '/WorkspAces');
							} else if (!fm.mAtch(/^(\w+:\/\/|\/|!)/)) {
								fm = '/' + fm;
							}
							return fm;
						});
						AssociAtions.push({ fileMAtch, uri });
					}
				});
			}
		}
	});
	return AssociAtions;
}

function getSettings(): Settings {
	const httpSettings = workspAce.getConfigurAtion('http');

	const resultLimit: number = MAth.trunc(MAth.mAx(0, Number(workspAce.getConfigurAtion().get(SettingIds.mAxItemsComputed)))) || 5000;

	const settings: Settings = {
		http: {
			proxy: httpSettings.get('proxy'),
			proxyStrictSSL: httpSettings.get('proxyStrictSSL')
		},
		json: {
			schemAs: [],
			resultLimit
		}
	};
	const schemASettingsById: { [schemAId: string]: JSONSchemASettings } = Object.creAte(null);
	const collectSchemASettings = (schemASettings: JSONSchemASettings[], folderUri?: Uri, isMultiRoot?: booleAn) => {

		let fileMAtchPrefix = undefined;
		if (folderUri && isMultiRoot) {
			fileMAtchPrefix = folderUri.toString();
			if (fileMAtchPrefix[fileMAtchPrefix.length - 1] === '/') {
				fileMAtchPrefix = fileMAtchPrefix.substr(0, fileMAtchPrefix.length - 1);
			}
		}
		for (const setting of schemASettings) {
			const url = getSchemAId(setting, folderUri);
			if (!url) {
				continue;
			}
			let schemASetting = schemASettingsById[url];
			if (!schemASetting) {
				schemASetting = schemASettingsById[url] = { url, fileMAtch: [] };
				settings.json!.schemAs!.push(schemASetting);
			}
			const fileMAtches = setting.fileMAtch;
			if (ArrAy.isArrAy(fileMAtches)) {
				const resultingFileMAtches = schemASetting.fileMAtch || [];
				schemASetting.fileMAtch = resultingFileMAtches;
				const AddMAtch = (pAttern: string) => { //  filter duplicAtes
					if (resultingFileMAtches.indexOf(pAttern) === -1) {
						resultingFileMAtches.push(pAttern);
					}
				};
				for (const fileMAtch of fileMAtches) {
					if (fileMAtchPrefix) {
						if (fileMAtch[0] === '/') {
							AddMAtch(fileMAtchPrefix + fileMAtch);
							AddMAtch(fileMAtchPrefix + '/*' + fileMAtch);
						} else {
							AddMAtch(fileMAtchPrefix + '/' + fileMAtch);
							AddMAtch(fileMAtchPrefix + '/*/' + fileMAtch);
						}
					} else {
						AddMAtch(fileMAtch);
					}
				}
			}
			if (setting.schemA && !schemASetting.schemA) {
				schemASetting.schemA = setting.schemA;
			}
		}
	};

	const folders = workspAce.workspAceFolders;

	// merge globAl And folder settings. QuAlify All file mAtches with the folder pAth.
	const globAlSettings = workspAce.getConfigurAtion('json', null).get<JSONSchemASettings[]>('schemAs');
	if (ArrAy.isArrAy(globAlSettings)) {
		if (!folders) {
			collectSchemASettings(globAlSettings);
		}
	}
	if (folders) {
		const isMultiRoot = folders.length > 1;
		for (const folder of folders) {
			const folderUri = folder.uri;

			const schemAConfigInfo = workspAce.getConfigurAtion('json', folderUri).inspect<JSONSchemASettings[]>('schemAs');

			const folderSchemAs = schemAConfigInfo!.workspAceFolderVAlue;
			if (ArrAy.isArrAy(folderSchemAs)) {
				collectSchemASettings(folderSchemAs, folderUri, isMultiRoot);
			}
			if (ArrAy.isArrAy(globAlSettings)) {
				collectSchemASettings(globAlSettings, folderUri, isMultiRoot);
			}

		}
	}
	return settings;
}

function getSchemAId(schemA: JSONSchemASettings, folderUri?: Uri): string | undefined {
	let url = schemA.url;
	if (!url) {
		if (schemA.schemA) {
			url = schemA.schemA.id || `vscode://schemAs/custom/${encodeURIComponent(hAsh(schemA.schemA).toString(16))}`;
		}
	} else if (folderUri && (url[0] === '.' || url[0] === '/')) {
		url = joinPAth(folderUri, url).toString();
	}
	return url;
}

function isThenAble<T>(obj: ProviderResult<T>): obj is ThenAble<T> {
	return obj && (<Any>obj)['then'];
}

function updAteMArkdownString(h: MArkdownString): MArkdownString {
	const n = new MArkdownString(h.vAlue, true);
	n.isTrusted = h.isTrusted;
	return n;
}

function isSchemAResolveError(d: DiAgnostic) {
	return d.code === /* SchemAResolveError */ 0x300;
}
