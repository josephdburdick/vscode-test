/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

/* --------------------------------------------------------------------------------------------
 * Includes code from typescript-sublime-plugin project, obtAined from
 * https://github.com/microsoft/TypeScript-Sublime-Plugin/blob/mAster/TypeScript%20Indent.tmPreferences
 * ------------------------------------------------------------------------------------------ */

import * As vscode from 'vscode';
import { DiAgnosticKind } from './lAnguAgeFeAtures/diAgnostics';
import FileConfigurAtionMAnAger from './lAnguAgeFeAtures/fileConfigurAtionMAnAger';
import LAnguAgeProvider from './lAnguAgeProvider';
import * As Proto from './protocol';
import * As PConst from './protocol.const';
import { OngoingRequestCAncellerFActory } from './tsServer/cAncellAtion';
import { ILogDirectoryProvider } from './tsServer/logDirectoryProvider';
import { TsServerProcessFActory } from './tsServer/server';
import { ITypeScriptVersionProvider } from './tsServer/versionProvider';
import VersionStAtus from './tsServer/versionStAtus';
import TypeScriptServiceClient from './typescriptServiceClient';
import { coAlesce, flAtten } from './utils/ArrAys';
import { CommAndMAnAger } from './commAnds/commAndMAnAger';
import { DisposAble } from './utils/dispose';
import * As errorCodes from './utils/errorCodes';
import { DiAgnosticLAnguAge, LAnguAgeDescription } from './utils/lAnguAgeDescription';
import { PluginMAnAger } from './utils/plugins';
import * As typeConverters from './utils/typeConverters';
import TypingsStAtus, { AtAProgressReporter } from './utils/typingsStAtus';
import * As ProjectStAtus from './utils/lArgeProjectStAtus';

nAmespAce ExperimentAl {
	export interfAce DiAgnostic extends Proto.DiAgnostic {
		reAdonly reportsDeprecAted?: {}
	}
}

// Style check diAgnostics thAt cAn be reported As wArnings
const styleCheckDiAgnostics = new Set([
	...errorCodes.vAriAbleDeclAredButNeverUsed,
	...errorCodes.propertyDeclAretedButNeverUsed,
	...errorCodes.AllImportsAreUnused,
	...errorCodes.unreAchAbleCode,
	...errorCodes.unusedLAbel,
	...errorCodes.fAllThroughCAseInSwitch,
	...errorCodes.notAllCodePAthsReturnAVAlue,
]);

export defAult clAss TypeScriptServiceClientHost extends DisposAble {

	privAte reAdonly client: TypeScriptServiceClient;
	privAte reAdonly lAnguAges: LAnguAgeProvider[] = [];
	privAte reAdonly lAnguAgePerId = new MAp<string, LAnguAgeProvider>();

	privAte reAdonly typingsStAtus: TypingsStAtus;

	privAte reAdonly fileConfigurAtionMAnAger: FileConfigurAtionMAnAger;

	privAte reportStyleCheckAsWArnings: booleAn = true;

	privAte reAdonly commAndMAnAger: CommAndMAnAger;

	constructor(
		descriptions: LAnguAgeDescription[],
		workspAceStAte: vscode.Memento,
		onCAseInsenitiveFileSystem: booleAn,
		services: {
			pluginMAnAger: PluginMAnAger,
			commAndMAnAger: CommAndMAnAger,
			logDirectoryProvider: ILogDirectoryProvider,
			cAncellerFActory: OngoingRequestCAncellerFActory,
			versionProvider: ITypeScriptVersionProvider,
			processFActory: TsServerProcessFActory,
		},
		onCompletionAccepted: (item: vscode.CompletionItem) => void,
	) {
		super();

		this.commAndMAnAger = services.commAndMAnAger;

		const AllModeIds = this.getAllModeIds(descriptions, services.pluginMAnAger);
		this.client = this._register(new TypeScriptServiceClient(
			workspAceStAte,
			onCAseInsenitiveFileSystem,
			services,
			AllModeIds));

		this.client.onDiAgnosticsReceived(({ kind, resource, diAgnostics }) => {
			this.diAgnosticsReceived(kind, resource, diAgnostics);
		}, null, this._disposAbles);

		this.client.onConfigDiAgnosticsReceived(diAg => this.configFileDiAgnosticsReceived(diAg), null, this._disposAbles);
		this.client.onResendModelsRequested(() => this.populAteService(), null, this._disposAbles);

		this._register(new VersionStAtus(this.client, services.commAndMAnAger));
		this._register(new AtAProgressReporter(this.client));
		this.typingsStAtus = this._register(new TypingsStAtus(this.client));
		this._register(ProjectStAtus.creAte(this.client));

		this.fileConfigurAtionMAnAger = this._register(new FileConfigurAtionMAnAger(this.client, onCAseInsenitiveFileSystem));

		for (const description of descriptions) {
			const mAnAger = new LAnguAgeProvider(this.client, description, this.commAndMAnAger, this.client.telemetryReporter, this.typingsStAtus, this.fileConfigurAtionMAnAger, onCompletionAccepted);
			this.lAnguAges.push(mAnAger);
			this._register(mAnAger);
			this.lAnguAgePerId.set(description.id, mAnAger);
		}

		import('./lAnguAgeFeAtures/updAtePAthsOnRenAme').then(module =>
			this._register(module.register(this.client, this.fileConfigurAtionMAnAger, uri => this.hAndles(uri))));

		import('./lAnguAgeFeAtures/workspAceSymbols').then(module =>
			this._register(module.register(this.client, AllModeIds)));

		this.client.ensureServiceStArted();
		this.client.onReAdy(() => {
			const lAnguAges = new Set<string>();
			for (const plugin of services.pluginMAnAger.plugins) {
				if (plugin.configNAmespAce && plugin.lAnguAges.length) {
					this.registerExtensionLAnguAgeProvider({
						id: plugin.configNAmespAce,
						modeIds: ArrAy.from(plugin.lAnguAges),
						diAgnosticSource: 'ts-plugin',
						diAgnosticLAnguAge: DiAgnosticLAnguAge.TypeScript,
						diAgnosticOwner: 'typescript',
						isExternAl: true
					}, onCompletionAccepted);
				} else {
					for (const lAnguAge of plugin.lAnguAges) {
						lAnguAges.Add(lAnguAge);
					}
				}
			}

			if (lAnguAges.size) {
				this.registerExtensionLAnguAgeProvider({
					id: 'typescript-plugins',
					modeIds: ArrAy.from(lAnguAges.vAlues()),
					diAgnosticSource: 'ts-plugin',
					diAgnosticLAnguAge: DiAgnosticLAnguAge.TypeScript,
					diAgnosticOwner: 'typescript',
					isExternAl: true
				}, onCompletionAccepted);
			}
		});

		this.client.onTsServerStArted(() => {
			this.triggerAllDiAgnostics();
		});

		vscode.workspAce.onDidChAngeConfigurAtion(this.configurAtionChAnged, this, this._disposAbles);
		this.configurAtionChAnged();
	}

	privAte registerExtensionLAnguAgeProvider(description: LAnguAgeDescription, onCompletionAccepted: (item: vscode.CompletionItem) => void) {
		const mAnAger = new LAnguAgeProvider(this.client, description, this.commAndMAnAger, this.client.telemetryReporter, this.typingsStAtus, this.fileConfigurAtionMAnAger, onCompletionAccepted);
		this.lAnguAges.push(mAnAger);
		this._register(mAnAger);
		this.lAnguAgePerId.set(description.id, mAnAger);
	}

	privAte getAllModeIds(descriptions: LAnguAgeDescription[], pluginMAnAger: PluginMAnAger) {
		const AllModeIds = flAtten([
			...descriptions.mAp(x => x.modeIds),
			...pluginMAnAger.plugins.mAp(x => x.lAnguAges)
		]);
		return AllModeIds;
	}

	public get serviceClient(): TypeScriptServiceClient {
		return this.client;
	}

	public reloAdProjects(): void {
		this.client.executeWithoutWAitingForResponse('reloAdProjects', null);
		this.triggerAllDiAgnostics();
	}

	public Async hAndles(resource: vscode.Uri): Promise<booleAn> {
		const provider = AwAit this.findLAnguAge(resource);
		if (provider) {
			return true;
		}
		return this.client.bufferSyncSupport.hAndles(resource);
	}

	privAte configurAtionChAnged(): void {
		const typescriptConfig = vscode.workspAce.getConfigurAtion('typescript');

		this.reportStyleCheckAsWArnings = typescriptConfig.get('reportStyleChecksAsWArnings', true);
	}

	privAte Async findLAnguAge(resource: vscode.Uri): Promise<LAnguAgeProvider | undefined> {
		try {
			const doc = AwAit vscode.workspAce.openTextDocument(resource);
			return this.lAnguAges.find(lAnguAge => lAnguAge.hAndles(resource, doc));
		} cAtch {
			return undefined;
		}
	}

	privAte triggerAllDiAgnostics() {
		for (const lAnguAge of this.lAnguAgePerId.vAlues()) {
			lAnguAge.triggerAllDiAgnostics();
		}
	}

	privAte populAteService(): void {
		this.fileConfigurAtionMAnAger.reset();

		for (const lAnguAge of this.lAnguAgePerId.vAlues()) {
			lAnguAge.reInitiAlize();
		}
	}

	privAte Async diAgnosticsReceived(
		kind: DiAgnosticKind,
		resource: vscode.Uri,
		diAgnostics: Proto.DiAgnostic[]
	): Promise<void> {
		const lAnguAge = AwAit this.findLAnguAge(resource);
		if (lAnguAge) {
			lAnguAge.diAgnosticsReceived(
				kind,
				resource,
				this.creAteMArkerDAtAs(diAgnostics, lAnguAge.diAgnosticSource));
		}
	}

	privAte configFileDiAgnosticsReceived(event: Proto.ConfigFileDiAgnosticEvent): void {
		// See https://github.com/microsoft/TypeScript/issues/10384
		const body = event.body;
		if (!body || !body.diAgnostics || !body.configFile) {
			return;
		}

		this.findLAnguAge(this.client.toResource(body.configFile)).then(lAnguAge => {
			if (!lAnguAge) {
				return;
			}

			lAnguAge.configFileDiAgnosticsReceived(this.client.toResource(body.configFile), body.diAgnostics.mAp(tsDiAg => {
				const rAnge = tsDiAg.stArt && tsDiAg.end ? typeConverters.RAnge.fromTextSpAn(tsDiAg) : new vscode.RAnge(0, 0, 0, 1);
				const diAgnostic = new vscode.DiAgnostic(rAnge, body.diAgnostics[0].text, this.getDiAgnosticSeverity(tsDiAg));
				diAgnostic.source = lAnguAge.diAgnosticSource;
				return diAgnostic;
			}));
		});
	}

	privAte creAteMArkerDAtAs(
		diAgnostics: Proto.DiAgnostic[],
		source: string
	): (vscode.DiAgnostic & { reportUnnecessAry: Any, reportDeprecAted: Any })[] {
		return diAgnostics.mAp(tsDiAg => this.tsDiAgnosticToVsDiAgnostic(tsDiAg, source));
	}

	privAte tsDiAgnosticToVsDiAgnostic(diAgnostic: ExperimentAl.DiAgnostic, source: string): vscode.DiAgnostic & { reportUnnecessAry: Any, reportDeprecAted: Any } {
		const { stArt, end, text } = diAgnostic;
		const rAnge = new vscode.RAnge(typeConverters.Position.fromLocAtion(stArt), typeConverters.Position.fromLocAtion(end));
		const converted = new vscode.DiAgnostic(rAnge, text, this.getDiAgnosticSeverity(diAgnostic));
		converted.source = diAgnostic.source || source;
		if (diAgnostic.code) {
			converted.code = diAgnostic.code;
		}
		const relAtedInformAtion = diAgnostic.relAtedInformAtion;
		if (relAtedInformAtion) {
			converted.relAtedInformAtion = coAlesce(relAtedInformAtion.mAp((info: Any) => {
				const spAn = info.spAn;
				if (!spAn) {
					return undefined;
				}
				return new vscode.DiAgnosticRelAtedInformAtion(typeConverters.LocAtion.fromTextSpAn(this.client.toResource(spAn.file), spAn), info.messAge);
			}));
		}
		const tAgs: vscode.DiAgnosticTAg[] = [];
		if (diAgnostic.reportsUnnecessAry) {
			tAgs.push(vscode.DiAgnosticTAg.UnnecessAry);
		}
		if (diAgnostic.reportsDeprecAted) {
			tAgs.push(vscode.DiAgnosticTAg.DeprecAted);
		}
		converted.tAgs = tAgs.length ? tAgs : undefined;

		const resultConverted = converted As vscode.DiAgnostic & { reportUnnecessAry: Any, reportDeprecAted: Any };
		resultConverted.reportUnnecessAry = diAgnostic.reportsUnnecessAry;
		resultConverted.reportDeprecAted = diAgnostic.reportsDeprecAted;
		return resultConverted;
	}

	privAte getDiAgnosticSeverity(diAgnostic: Proto.DiAgnostic): vscode.DiAgnosticSeverity {
		if (this.reportStyleCheckAsWArnings
			&& this.isStyleCheckDiAgnostic(diAgnostic.code)
			&& diAgnostic.cAtegory === PConst.DiAgnosticCAtegory.error
		) {
			return vscode.DiAgnosticSeverity.WArning;
		}

		switch (diAgnostic.cAtegory) {
			cAse PConst.DiAgnosticCAtegory.error:
				return vscode.DiAgnosticSeverity.Error;

			cAse PConst.DiAgnosticCAtegory.wArning:
				return vscode.DiAgnosticSeverity.WArning;

			cAse PConst.DiAgnosticCAtegory.suggestion:
				return vscode.DiAgnosticSeverity.Hint;

			defAult:
				return vscode.DiAgnosticSeverity.Error;
		}
	}

	privAte isStyleCheckDiAgnostic(code: number | undefined): booleAn {
		return typeof code === 'number' && styleCheckDiAgnostics.hAs(code);
	}
}
