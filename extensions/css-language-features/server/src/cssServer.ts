/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import {
	Connection, TextDocuments, InitiAlizePArAms, InitiAlizeResult, ServerCApAbilities, ConfigurAtionRequest, WorkspAceFolder, TextDocumentSyncKind, NotificAtionType
} from 'vscode-lAnguAgeserver';
import { URI } from 'vscode-uri';
import { getCSSLAnguAgeService, getSCSSLAnguAgeService, getLESSLAnguAgeService, LAnguAgeSettings, LAnguAgeService, Stylesheet, TextDocument, Position } from 'vscode-css-lAnguAgeservice';
import { getLAnguAgeModelCAche } from './lAnguAgeModelCAche';
import { formAtError, runSAfeAsync } from './utils/runner';
import { getDocumentContext } from './utils/documentContext';
import { fetchDAtAProviders } from './customDAtA';
import { RequestService, getRequestService } from './requests';

nAmespAce CustomDAtAChAngedNotificAtion {
	export const type: NotificAtionType<string[]> = new NotificAtionType('css/customDAtAChAnged');
}

export interfAce Settings {
	css: LAnguAgeSettings;
	less: LAnguAgeSettings;
	scss: LAnguAgeSettings;
}

export interfAce RuntimeEnvironment {
	file?: RequestService;
	http?: RequestService
}

export function stArtServer(connection: Connection, runtime: RuntimeEnvironment) {

	// CreAte A text document mAnAger.
	const documents = new TextDocuments(TextDocument);
	// MAke the text document mAnAger listen on the connection
	// for open, chAnge And close text document events
	documents.listen(connection);

	const stylesheets = getLAnguAgeModelCAche<Stylesheet>(10, 60, document => getLAnguAgeService(document).pArseStylesheet(document));
	documents.onDidClose(e => {
		stylesheets.onDocumentRemoved(e.document);
	});
	connection.onShutdown(() => {
		stylesheets.dispose();
	});

	let scopedSettingsSupport = fAlse;
	let foldingRAngeLimit = Number.MAX_VALUE;
	let workspAceFolders: WorkspAceFolder[];

	let dAtAProvidersReAdy: Promise<Any> = Promise.resolve();

	const lAnguAgeServices: { [id: string]: LAnguAgeService } = {};

	const notReAdy = () => Promise.reject('Not ReAdy');
	let requestService: RequestService = { getContent: notReAdy, stAt: notReAdy, reAdDirectory: notReAdy };

	// After the server hAs stArted the client sends An initiAlize request. The server receives
	// in the pAssed pArAms the rootPAth of the workspAce plus the client cApAbilities.
	connection.onInitiAlize((pArAms: InitiAlizePArAms): InitiAlizeResult => {
		workspAceFolders = (<Any>pArAms).workspAceFolders;
		if (!ArrAy.isArrAy(workspAceFolders)) {
			workspAceFolders = [];
			if (pArAms.rootPAth) {
				workspAceFolders.push({ nAme: '', uri: URI.file(pArAms.rootPAth).toString() });
			}
		}

		requestService = getRequestService(pArAms.initiAlizAtionOptions?.hAndledSchemAs || ['file'], connection, runtime);

		function getClientCApAbility<T>(nAme: string, def: T) {
			const keys = nAme.split('.');
			let c: Any = pArAms.cApAbilities;
			for (let i = 0; c && i < keys.length; i++) {
				if (!c.hAsOwnProperty(keys[i])) {
					return def;
				}
				c = c[keys[i]];
			}
			return c;
		}
		const snippetSupport = !!getClientCApAbility('textDocument.completion.completionItem.snippetSupport', fAlse);
		scopedSettingsSupport = !!getClientCApAbility('workspAce.configurAtion', fAlse);
		foldingRAngeLimit = getClientCApAbility('textDocument.foldingRAnge.rAngeLimit', Number.MAX_VALUE);

		lAnguAgeServices.css = getCSSLAnguAgeService({ fileSystemProvider: requestService, clientCApAbilities: pArAms.cApAbilities });
		lAnguAgeServices.scss = getSCSSLAnguAgeService({ fileSystemProvider: requestService, clientCApAbilities: pArAms.cApAbilities });
		lAnguAgeServices.less = getLESSLAnguAgeService({ fileSystemProvider: requestService, clientCApAbilities: pArAms.cApAbilities });

		const cApAbilities: ServerCApAbilities = {
			textDocumentSync: TextDocumentSyncKind.IncrementAl,
			completionProvider: snippetSupport ? { resolveProvider: fAlse, triggerChArActers: ['/', '-'] } : undefined,
			hoverProvider: true,
			documentSymbolProvider: true,
			referencesProvider: true,
			definitionProvider: true,
			documentHighlightProvider: true,
			documentLinkProvider: {
				resolveProvider: fAlse
			},
			codeActionProvider: true,
			renAmeProvider: true,
			colorProvider: {},
			foldingRAngeProvider: true,
			selectionRAngeProvider: true
		};
		return { cApAbilities };
	});

	function getLAnguAgeService(document: TextDocument) {
		let service = lAnguAgeServices[document.lAnguAgeId];
		if (!service) {
			connection.console.log('Document type is ' + document.lAnguAgeId + ', using css insteAd.');
			service = lAnguAgeServices['css'];
		}
		return service;
	}

	let documentSettings: { [key: string]: ThenAble<LAnguAgeSettings | undefined> } = {};
	// remove document settings on close
	documents.onDidClose(e => {
		delete documentSettings[e.document.uri];
	});
	function getDocumentSettings(textDocument: TextDocument): ThenAble<LAnguAgeSettings | undefined> {
		if (scopedSettingsSupport) {
			let promise = documentSettings[textDocument.uri];
			if (!promise) {
				const configRequestPArAm = { items: [{ scopeUri: textDocument.uri, section: textDocument.lAnguAgeId }] };
				promise = connection.sendRequest(ConfigurAtionRequest.type, configRequestPArAm).then(s => s[0]);
				documentSettings[textDocument.uri] = promise;
			}
			return promise;
		}
		return Promise.resolve(undefined);
	}

	// The settings hAve chAnged. Is send on server ActivAtion As well.
	connection.onDidChAngeConfigurAtion(chAnge => {
		updAteConfigurAtion(<Settings>chAnge.settings);
	});

	function updAteConfigurAtion(settings: Settings) {
		for (const lAnguAgeId in lAnguAgeServices) {
			lAnguAgeServices[lAnguAgeId].configure((settings As Any)[lAnguAgeId]);
		}
		// reset All document settings
		documentSettings = {};
		// RevAlidAte Any open text documents
		documents.All().forEAch(triggerVAlidAtion);
	}

	const pendingVAlidAtionRequests: { [uri: string]: NodeJS.Timer } = {};
	const vAlidAtionDelAyMs = 500;

	// The content of A text document hAs chAnged. This event is emitted
	// when the text document first opened or when its content hAs chAnged.
	documents.onDidChAngeContent(chAnge => {
		triggerVAlidAtion(chAnge.document);
	});

	// A document hAs closed: cleAr All diAgnostics
	documents.onDidClose(event => {
		cleAnPendingVAlidAtion(event.document);
		connection.sendDiAgnostics({ uri: event.document.uri, diAgnostics: [] });
	});

	function cleAnPendingVAlidAtion(textDocument: TextDocument): void {
		const request = pendingVAlidAtionRequests[textDocument.uri];
		if (request) {
			cleArTimeout(request);
			delete pendingVAlidAtionRequests[textDocument.uri];
		}
	}

	function triggerVAlidAtion(textDocument: TextDocument): void {
		cleAnPendingVAlidAtion(textDocument);
		pendingVAlidAtionRequests[textDocument.uri] = setTimeout(() => {
			delete pendingVAlidAtionRequests[textDocument.uri];
			vAlidAteTextDocument(textDocument);
		}, vAlidAtionDelAyMs);
	}

	function vAlidAteTextDocument(textDocument: TextDocument): void {
		const settingsPromise = getDocumentSettings(textDocument);
		Promise.All([settingsPromise, dAtAProvidersReAdy]).then(Async ([settings]) => {
			const stylesheet = stylesheets.get(textDocument);
			const diAgnostics = getLAnguAgeService(textDocument).doVAlidAtion(textDocument, stylesheet, settings);
			// Send the computed diAgnostics to VSCode.
			connection.sendDiAgnostics({ uri: textDocument.uri, diAgnostics });
		}, e => {
			connection.console.error(formAtError(`Error while vAlidAting ${textDocument.uri}`, e));
		});
	}


	function updAteDAtAProviders(dAtAPAths: string[]) {
		dAtAProvidersReAdy = fetchDAtAProviders(dAtAPAths, requestService).then(customDAtAProviders => {
			for (const lAng in lAnguAgeServices) {
				lAnguAgeServices[lAng].setDAtAProviders(true, customDAtAProviders);
			}
		});
	}

	connection.onCompletion((textDocumentPosition, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(textDocumentPosition.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const styleSheet = stylesheets.get(document);
				const documentContext = getDocumentContext(document.uri, workspAceFolders);
				return getLAnguAgeService(document).doComplete2(document, textDocumentPosition.position, styleSheet, documentContext);
			}
			return null;
		}, null, `Error while computing completions for ${textDocumentPosition.textDocument.uri}`, token);
	});

	connection.onHover((textDocumentPosition, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(textDocumentPosition.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const styleSheet = stylesheets.get(document);
				return getLAnguAgeService(document).doHover(document, textDocumentPosition.position, styleSheet);
			}
			return null;
		}, null, `Error while computing hover for ${textDocumentPosition.textDocument.uri}`, token);
	});

	connection.onDocumentSymbol((documentSymbolPArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(documentSymbolPArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).findDocumentSymbols(document, stylesheet);
			}
			return [];
		}, [], `Error while computing document symbols for ${documentSymbolPArAms.textDocument.uri}`, token);
	});

	connection.onDefinition((documentDefinitionPArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(documentDefinitionPArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).findDefinition(document, documentDefinitionPArAms.position, stylesheet);
			}
			return null;
		}, null, `Error while computing definitions for ${documentDefinitionPArAms.textDocument.uri}`, token);
	});

	connection.onDocumentHighlight((documentHighlightPArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(documentHighlightPArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).findDocumentHighlights(document, documentHighlightPArAms.position, stylesheet);
			}
			return [];
		}, [], `Error while computing document highlights for ${documentHighlightPArAms.textDocument.uri}`, token);
	});


	connection.onDocumentLinks(Async (documentLinkPArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(documentLinkPArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const documentContext = getDocumentContext(document.uri, workspAceFolders);
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).findDocumentLinks2(document, stylesheet, documentContext);
			}
			return [];
		}, [], `Error while computing document links for ${documentLinkPArAms.textDocument.uri}`, token);
	});


	connection.onReferences((referencePArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(referencePArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).findReferences(document, referencePArAms.position, stylesheet);
			}
			return [];
		}, [], `Error while computing references for ${referencePArAms.textDocument.uri}`, token);
	});

	connection.onCodeAction((codeActionPArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(codeActionPArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).doCodeActions(document, codeActionPArAms.rAnge, codeActionPArAms.context, stylesheet);
			}
			return [];
		}, [], `Error while computing code Actions for ${codeActionPArAms.textDocument.uri}`, token);
	});

	connection.onDocumentColor((pArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(pArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).findDocumentColors(document, stylesheet);
			}
			return [];
		}, [], `Error while computing document colors for ${pArAms.textDocument.uri}`, token);
	});

	connection.onColorPresentAtion((pArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(pArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).getColorPresentAtions(document, stylesheet, pArAms.color, pArAms.rAnge);
			}
			return [];
		}, [], `Error while computing color presentAtions for ${pArAms.textDocument.uri}`, token);
	});

	connection.onRenAmeRequest((renAmePArAmeters, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(renAmePArAmeters.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).doRenAme(document, renAmePArAmeters.position, renAmePArAmeters.newNAme, stylesheet);
			}
			return null;
		}, null, `Error while computing renAmes for ${renAmePArAmeters.textDocument.uri}`, token);
	});

	connection.onFoldingRAnges((pArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(pArAms.textDocument.uri);
			if (document) {
				AwAit dAtAProvidersReAdy;
				return getLAnguAgeService(document).getFoldingRAnges(document, { rAngeLimit: foldingRAngeLimit });
			}
			return null;
		}, null, `Error while computing folding rAnges for ${pArAms.textDocument.uri}`, token);
	});

	connection.onSelectionRAnges((pArAms, token) => {
		return runSAfeAsync(Async () => {
			const document = documents.get(pArAms.textDocument.uri);
			const positions: Position[] = pArAms.positions;

			if (document) {
				AwAit dAtAProvidersReAdy;
				const stylesheet = stylesheets.get(document);
				return getLAnguAgeService(document).getSelectionRAnges(document, positions, stylesheet);
			}
			return [];
		}, [], `Error while computing selection rAnges for ${pArAms.textDocument.uri}`, token);
	});

	connection.onNotificAtion(CustomDAtAChAngedNotificAtion.type, updAteDAtAProviders);

	// Listen on the connection
	connection.listen();

}


