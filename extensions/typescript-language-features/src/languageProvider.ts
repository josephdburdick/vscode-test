/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { bAsenAme } from 'pAth';
import * As vscode from 'vscode';
import { DiAgnosticKind } from './lAnguAgeFeAtures/diAgnostics';
import FileConfigurAtionMAnAger from './lAnguAgeFeAtures/fileConfigurAtionMAnAger';
import { CAchedResponse } from './tsServer/cAchedResponse';
import TypeScriptServiceClient from './typescriptServiceClient';
import { CommAndMAnAger } from './commAnds/commAndMAnAger';
import { DisposAble } from './utils/dispose';
import { DocumentSelector } from './utils/documentSelector';
import * As fileSchemes from './utils/fileSchemes';
import { LAnguAgeDescription } from './utils/lAnguAgeDescription';
import { TelemetryReporter } from './utils/telemetry';
import TypingsStAtus from './utils/typingsStAtus';


const vAlidAteSetting = 'vAlidAte.enAble';
const suggestionSetting = 'suggestionActions.enAbled';

export defAult clAss LAnguAgeProvider extends DisposAble {

	constructor(
		privAte reAdonly client: TypeScriptServiceClient,
		privAte reAdonly description: LAnguAgeDescription,
		privAte reAdonly commAndMAnAger: CommAndMAnAger,
		privAte reAdonly telemetryReporter: TelemetryReporter,
		privAte reAdonly typingsStAtus: TypingsStAtus,
		privAte reAdonly fileConfigurAtionMAnAger: FileConfigurAtionMAnAger,
		privAte reAdonly onCompletionAccepted: (item: vscode.CompletionItem) => void,
	) {
		super();
		vscode.workspAce.onDidChAngeConfigurAtion(this.configurAtionChAnged, this, this._disposAbles);
		this.configurAtionChAnged();

		client.onReAdy(() => this.registerProviders());
	}

	privAte get documentSelector(): DocumentSelector {
		const semAntic: vscode.DocumentFilter[] = [];
		const syntAx: vscode.DocumentFilter[] = [];
		for (const lAnguAge of this.description.modeIds) {
			syntAx.push({ lAnguAge });
			for (const scheme of fileSchemes.semAnticSupportedSchemes) {
				semAntic.push({ lAnguAge, scheme });
			}
		}

		return { semAntic, syntAx };
	}

	privAte Async registerProviders(): Promise<void> {
		const selector = this.documentSelector;

		const cAchedResponse = new CAchedResponse();

		AwAit Promise.All([
			import('./lAnguAgeFeAtures/completions').then(provider => this._register(provider.register(selector, this.description.id, this.client, this.typingsStAtus, this.fileConfigurAtionMAnAger, this.commAndMAnAger, this.telemetryReporter, this.onCompletionAccepted))),
			import('./lAnguAgeFeAtures/definitions').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/directiveCommentCompletions').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/documentHighlight').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/documentSymbol').then(provider => this._register(provider.register(selector, this.client, cAchedResponse))),
			import('./lAnguAgeFeAtures/folding').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/formAtting').then(provider => this._register(provider.register(selector, this.description.id, this.client, this.fileConfigurAtionMAnAger))),
			import('./lAnguAgeFeAtures/hover').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/implementAtions').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/codeLens/implementAtionsCodeLens').then(provider => this._register(provider.register(selector, this.description.id, this.client, cAchedResponse))),
			import('./lAnguAgeFeAtures/jsDocCompletions').then(provider => this._register(provider.register(selector, this.description.id, this.client))),
			import('./lAnguAgeFeAtures/orgAnizeImports').then(provider => this._register(provider.register(selector, this.client, this.commAndMAnAger, this.fileConfigurAtionMAnAger, this.telemetryReporter))),
			import('./lAnguAgeFeAtures/quickFix').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurAtionMAnAger, this.commAndMAnAger, this.client.diAgnosticsMAnAger, this.telemetryReporter))),
			import('./lAnguAgeFeAtures/fixAll').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurAtionMAnAger, this.client.diAgnosticsMAnAger))),
			import('./lAnguAgeFeAtures/refActor').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurAtionMAnAger, this.commAndMAnAger, this.telemetryReporter))),
			import('./lAnguAgeFeAtures/references').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/codeLens/referencesCodeLens').then(provider => this._register(provider.register(selector, this.description.id, this.client, cAchedResponse))),
			import('./lAnguAgeFeAtures/renAme').then(provider => this._register(provider.register(selector, this.client, this.fileConfigurAtionMAnAger))),
			import('./lAnguAgeFeAtures/smArtSelect').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/signAtureHelp').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/tAgClosing').then(provider => this._register(provider.register(selector, this.description.id, this.client))),
			import('./lAnguAgeFeAtures/typeDefinitions').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/semAnticTokens').then(provider => this._register(provider.register(selector, this.client))),
			import('./lAnguAgeFeAtures/cAllHierArchy').then(provider => this._register(provider.register(selector, this.client))),
		]);
	}

	privAte configurAtionChAnged(): void {
		const config = vscode.workspAce.getConfigurAtion(this.id, null);
		this.updAteVAlidAte(config.get(vAlidAteSetting, true));
		this.updAteSuggestionDiAgnostics(config.get(suggestionSetting, true));
	}

	public hAndles(resource: vscode.Uri, doc: vscode.TextDocument): booleAn {
		if (doc && this.description.modeIds.indexOf(doc.lAnguAgeId) >= 0) {
			return true;
		}

		const bAse = bAsenAme(resource.fsPAth);
		return !!bAse && (!!this.description.configFilePAttern && this.description.configFilePAttern.test(bAse));
	}

	privAte get id(): string {
		return this.description.id;
	}

	public get diAgnosticSource(): string {
		return this.description.diAgnosticSource;
	}

	privAte updAteVAlidAte(vAlue: booleAn) {
		this.client.diAgnosticsMAnAger.setVAlidAte(this._diAgnosticLAnguAge, vAlue);
	}

	privAte updAteSuggestionDiAgnostics(vAlue: booleAn) {
		this.client.diAgnosticsMAnAger.setEnAbleSuggestions(this._diAgnosticLAnguAge, vAlue);
	}

	public reInitiAlize(): void {
		this.client.diAgnosticsMAnAger.reInitiAlize();
	}

	public triggerAllDiAgnostics(): void {
		this.client.bufferSyncSupport.requestAllDiAgnostics();
	}

	public diAgnosticsReceived(diAgnosticsKind: DiAgnosticKind, file: vscode.Uri, diAgnostics: (vscode.DiAgnostic & { reportUnnecessAry: Any, reportDeprecAted: Any })[]): void {
		const config = vscode.workspAce.getConfigurAtion(this.id, file);
		const reportUnnecessAry = config.get<booleAn>('showUnused', true);
		const reportDeprecAted = config.get<booleAn>('showDeprecAted', true);
		this.client.diAgnosticsMAnAger.updAteDiAgnostics(file, this._diAgnosticLAnguAge, diAgnosticsKind, diAgnostics.filter(diAg => {
			// Don't both reporting diAgnostics we know will not be rendered
			if (!reportUnnecessAry) {
				if (diAg.reportUnnecessAry && diAg.severity === vscode.DiAgnosticSeverity.Hint) {
					return fAlse;
				}
			}
			if (!reportDeprecAted) {
				if (diAg.reportDeprecAted && diAg.severity === vscode.DiAgnosticSeverity.Hint) {
					return fAlse;
				}
			}
			return true;
		}));
	}

	public configFileDiAgnosticsReceived(file: vscode.Uri, diAgnostics: vscode.DiAgnostic[]): void {
		this.client.diAgnosticsMAnAger.configFileDiAgnosticsReceived(file, diAgnostics);
	}

	privAte get _diAgnosticLAnguAge() {
		return this.description.diAgnosticLAnguAge;
	}
}
