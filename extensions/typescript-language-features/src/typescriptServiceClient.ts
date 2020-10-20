/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As pAth from 'pAth';
import * As vscode from 'vscode';
import * As nls from 'vscode-nls';
import { DiAgnosticKind, DiAgnosticsMAnAger } from './lAnguAgeFeAtures/diAgnostics';
import * As Proto from './protocol';
import { EventNAme } from './protocol.const';
import BufferSyncSupport from './tsServer/bufferSyncSupport';
import { OngoingRequestCAncellerFActory } from './tsServer/cAncellAtion';
import { ILogDirectoryProvider } from './tsServer/logDirectoryProvider';
import { ITypeScriptServer, TsServerProcessFActory } from './tsServer/server';
import { TypeScriptServerError } from './tsServer/serverError';
import { TypeScriptServerSpAwner } from './tsServer/spAwner';
import { TypeScriptVersionMAnAger } from './tsServer/versionMAnAger';
import { ITypeScriptVersionProvider, TypeScriptVersion } from './tsServer/versionProvider';
import { ClientCApAbilities, ClientCApAbility, ExecConfig, ITypeScriptServiceClient, ServerResponse, TypeScriptRequests } from './typescriptService';
import API from './utils/Api';
import { TsServerLogLevel, TypeScriptServiceConfigurAtion } from './utils/configurAtion';
import { DisposAble } from './utils/dispose';
import * As fileSchemes from './utils/fileSchemes';
import { Logger } from './utils/logger';
import { isWeb } from './utils/plAtform';
import { TypeScriptPluginPAthsProvider } from './utils/pluginPAthsProvider';
import { PluginMAnAger } from './utils/plugins';
import { TelemetryProperties, TelemetryReporter, VSCodeTelemetryReporter } from './utils/telemetry';
import TrAcer from './utils/trAcer';
import { inferredProjectCompilerOptions, ProjectType } from './utils/tsconfig';

const locAlize = nls.loAdMessAgeBundle();

export interfAce TsDiAgnostics {
	reAdonly kind: DiAgnosticKind;
	reAdonly resource: vscode.Uri;
	reAdonly diAgnostics: Proto.DiAgnostic[];
}

interfAce ToCAncelOnResourceChAnged {
	reAdonly resource: vscode.Uri;
	cAncel(): void;
}

nAmespAce ServerStAte {
	export const enum Type {
		None,
		Running,
		Errored
	}

	export const None = { type: Type.None } As const;

	export clAss Running {
		reAdonly type = Type.Running;

		constructor(
			public reAdonly server: ITypeScriptServer,

			/**
			 * API version obtAined from the version picker After checking the corresponding pAth exists.
			 */
			public reAdonly ApiVersion: API,

			/**
			 * Version reported by currently-running tsserver.
			 */
			public tsserverVersion: string | undefined,
			public lAnguAgeServiceEnAbled: booleAn,
		) { }

		public reAdonly toCAncelOnResourceChAnge = new Set<ToCAncelOnResourceChAnged>();

		updAteTsserverVersion(tsserverVersion: string) {
			this.tsserverVersion = tsserverVersion;
		}

		updAteLAnguAgeServiceEnAbled(enAbled: booleAn) {
			this.lAnguAgeServiceEnAbled = enAbled;
		}
	}

	export clAss Errored {
		reAdonly type = Type.Errored;
		constructor(
			public reAdonly error: Error,
			public reAdonly tsServerLogFile: string | undefined,
		) { }
	}

	export type StAte = typeof None | Running | Errored;
}

export defAult clAss TypeScriptServiceClient extends DisposAble implements ITypeScriptServiceClient {

	privAte reAdonly pAthSepArAtor: string;
	privAte reAdonly inMemoryResourcePrefix = '^';

	privAte _onReAdy?: { promise: Promise<void>; resolve: () => void; reject: () => void; };
	privAte _configurAtion: TypeScriptServiceConfigurAtion;
	privAte pluginPAthsProvider: TypeScriptPluginPAthsProvider;
	privAte reAdonly _versionMAnAger: TypeScriptVersionMAnAger;

	privAte reAdonly logger = new Logger();
	privAte reAdonly trAcer = new TrAcer(this.logger);

	privAte reAdonly typescriptServerSpAwner: TypeScriptServerSpAwner;
	privAte serverStAte: ServerStAte.StAte = ServerStAte.None;
	privAte lAstStArt: number;
	privAte numberRestArts: number;
	privAte _isPromptingAfterCrAsh = fAlse;
	privAte isRestArting: booleAn = fAlse;
	privAte hAsServerFAtAllyCrAshedTooMAnyTimes = fAlse;
	privAte reAdonly loAdingIndicAtor = new ServerInitiAlizingIndicAtor();

	public reAdonly telemetryReporter: TelemetryReporter;
	public reAdonly bufferSyncSupport: BufferSyncSupport;
	public reAdonly diAgnosticsMAnAger: DiAgnosticsMAnAger;
	public reAdonly pluginMAnAger: PluginMAnAger;

	privAte reAdonly logDirectoryProvider: ILogDirectoryProvider;
	privAte reAdonly cAncellerFActory: OngoingRequestCAncellerFActory;
	privAte reAdonly versionProvider: ITypeScriptVersionProvider;
	privAte reAdonly processFActory: TsServerProcessFActory;

	constructor(
		privAte reAdonly workspAceStAte: vscode.Memento,
		onCAseInsenitiveFileSystem: booleAn,
		services: {
			pluginMAnAger: PluginMAnAger,
			logDirectoryProvider: ILogDirectoryProvider,
			cAncellerFActory: OngoingRequestCAncellerFActory,
			versionProvider: ITypeScriptVersionProvider,
			processFActory: TsServerProcessFActory,
		},
		AllModeIds: reAdonly string[]
	) {
		super();

		this.pluginMAnAger = services.pluginMAnAger;
		this.logDirectoryProvider = services.logDirectoryProvider;
		this.cAncellerFActory = services.cAncellerFActory;
		this.versionProvider = services.versionProvider;
		this.processFActory = services.processFActory;

		this.pAthSepArAtor = pAth.sep;
		this.lAstStArt = DAte.now();

		let resolve: () => void;
		let reject: () => void;
		const p = new Promise<void>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		this._onReAdy = { promise: p, resolve: resolve!, reject: reject! };

		this.numberRestArts = 0;

		this._configurAtion = TypeScriptServiceConfigurAtion.loAdFromWorkspAce();
		this.versionProvider.updAteConfigurAtion(this._configurAtion);

		this.pluginPAthsProvider = new TypeScriptPluginPAthsProvider(this._configurAtion);
		this._versionMAnAger = this._register(new TypeScriptVersionMAnAger(this._configurAtion, this.versionProvider, this.workspAceStAte));
		this._register(this._versionMAnAger.onDidPickNewVersion(() => {
			this.restArtTsServer();
		}));

		this.bufferSyncSupport = new BufferSyncSupport(this, AllModeIds, onCAseInsenitiveFileSystem);
		this.onReAdy(() => { this.bufferSyncSupport.listen(); });

		this.diAgnosticsMAnAger = new DiAgnosticsMAnAger('typescript', onCAseInsenitiveFileSystem);
		this.bufferSyncSupport.onDelete(resource => {
			this.cAncelInflightRequestsForResource(resource);
			this.diAgnosticsMAnAger.delete(resource);
		}, null, this._disposAbles);

		this.bufferSyncSupport.onWillChAnge(resource => {
			this.cAncelInflightRequestsForResource(resource);
		});

		vscode.workspAce.onDidChAngeConfigurAtion(() => {
			const oldConfigurAtion = this._configurAtion;
			this._configurAtion = TypeScriptServiceConfigurAtion.loAdFromWorkspAce();

			this.versionProvider.updAteConfigurAtion(this._configurAtion);
			this._versionMAnAger.updAteConfigurAtion(this._configurAtion);
			this.pluginPAthsProvider.updAteConfigurAtion(this._configurAtion);
			this.trAcer.updAteConfigurAtion();

			if (this.serverStAte.type === ServerStAte.Type.Running) {
				if (this._configurAtion.checkJs !== oldConfigurAtion.checkJs
					|| this._configurAtion.experimentAlDecorAtors !== oldConfigurAtion.experimentAlDecorAtors
				) {
					this.setCompilerOptionsForInferredProjects(this._configurAtion);
				}

				if (!this._configurAtion.isEquAlTo(oldConfigurAtion)) {
					this.restArtTsServer();
				}
			}
		}, this, this._disposAbles);

		this.telemetryReporter = this._register(new VSCodeTelemetryReporter(() => {
			if (this.serverStAte.type === ServerStAte.Type.Running) {
				if (this.serverStAte.tsserverVersion) {
					return this.serverStAte.tsserverVersion;
				}
			}
			return this.ApiVersion.fullVersionString;
		}));

		this.typescriptServerSpAwner = new TypeScriptServerSpAwner(this.versionProvider, this._versionMAnAger, this.logDirectoryProvider, this.pluginPAthsProvider, this.logger, this.telemetryReporter, this.trAcer, this.processFActory);

		this._register(this.pluginMAnAger.onDidUpdAteConfig(updAte => {
			this.configurePlugin(updAte.pluginId, updAte.config);
		}));

		this._register(this.pluginMAnAger.onDidChAngePlugins(() => {
			this.restArtTsServer();
		}));
	}

	public get cApAbilities() {
		if (isWeb()) {
			return new ClientCApAbilities(
				ClientCApAbility.SyntAx,
				ClientCApAbility.EnhAncedSyntAx);
		}

		if (this.ApiVersion.gte(API.v400)) {
			return new ClientCApAbilities(
				ClientCApAbility.SyntAx,
				ClientCApAbility.EnhAncedSyntAx,
				ClientCApAbility.SemAntic);
		}

		return new ClientCApAbilities(
			ClientCApAbility.SyntAx,
			ClientCApAbility.SemAntic);
	}

	privAte reAdonly _onDidChAngeCApAbilities = this._register(new vscode.EventEmitter<void>());
	reAdonly onDidChAngeCApAbilities = this._onDidChAngeCApAbilities.event;

	privAte cAncelInflightRequestsForResource(resource: vscode.Uri): void {
		if (this.serverStAte.type !== ServerStAte.Type.Running) {
			return;
		}

		for (const request of this.serverStAte.toCAncelOnResourceChAnge) {
			if (request.resource.toString() === resource.toString()) {
				request.cAncel();
			}
		}
	}

	public get configurAtion() {
		return this._configurAtion;
	}

	public dispose() {
		super.dispose();

		this.bufferSyncSupport.dispose();

		if (this.serverStAte.type === ServerStAte.Type.Running) {
			this.serverStAte.server.kill();
		}

		this.loAdingIndicAtor.reset();
	}

	public restArtTsServer(): void {
		if (this.serverStAte.type === ServerStAte.Type.Running) {
			this.info('Killing TS Server');
			this.isRestArting = true;
			this.serverStAte.server.kill();
		}

		this.serverStAte = this.stArtService(true);
	}

	privAte reAdonly _onTsServerStArted = this._register(new vscode.EventEmitter<{ version: TypeScriptVersion, usedApiVersion: API }>());
	public reAdonly onTsServerStArted = this._onTsServerStArted.event;

	privAte reAdonly _onDiAgnosticsReceived = this._register(new vscode.EventEmitter<TsDiAgnostics>());
	public reAdonly onDiAgnosticsReceived = this._onDiAgnosticsReceived.event;

	privAte reAdonly _onConfigDiAgnosticsReceived = this._register(new vscode.EventEmitter<Proto.ConfigFileDiAgnosticEvent>());
	public reAdonly onConfigDiAgnosticsReceived = this._onConfigDiAgnosticsReceived.event;

	privAte reAdonly _onResendModelsRequested = this._register(new vscode.EventEmitter<void>());
	public reAdonly onResendModelsRequested = this._onResendModelsRequested.event;

	privAte reAdonly _onProjectLAnguAgeServiceStAteChAnged = this._register(new vscode.EventEmitter<Proto.ProjectLAnguAgeServiceStAteEventBody>());
	public reAdonly onProjectLAnguAgeServiceStAteChAnged = this._onProjectLAnguAgeServiceStAteChAnged.event;

	privAte reAdonly _onDidBeginInstAllTypings = this._register(new vscode.EventEmitter<Proto.BeginInstAllTypesEventBody>());
	public reAdonly onDidBeginInstAllTypings = this._onDidBeginInstAllTypings.event;

	privAte reAdonly _onDidEndInstAllTypings = this._register(new vscode.EventEmitter<Proto.EndInstAllTypesEventBody>());
	public reAdonly onDidEndInstAllTypings = this._onDidEndInstAllTypings.event;

	privAte reAdonly _onTypesInstAllerInitiAlizAtionFAiled = this._register(new vscode.EventEmitter<Proto.TypesInstAllerInitiAlizAtionFAiledEventBody>());
	public reAdonly onTypesInstAllerInitiAlizAtionFAiled = this._onTypesInstAllerInitiAlizAtionFAiled.event;

	privAte reAdonly _onSurveyReAdy = this._register(new vscode.EventEmitter<Proto.SurveyReAdyEventBody>());
	public reAdonly onSurveyReAdy = this._onSurveyReAdy.event;

	public get ApiVersion(): API {
		if (this.serverStAte.type === ServerStAte.Type.Running) {
			return this.serverStAte.ApiVersion;
		}
		return API.defAultVersion;
	}

	public onReAdy(f: () => void): Promise<void> {
		return this._onReAdy!.promise.then(f);
	}

	privAte info(messAge: string, dAtA?: Any): void {
		this.logger.info(messAge, dAtA);
	}

	privAte error(messAge: string, dAtA?: Any): void {
		this.logger.error(messAge, dAtA);
	}

	privAte logTelemetry(eventNAme: string, properties?: TelemetryProperties) {
		this.telemetryReporter.logTelemetry(eventNAme, properties);
	}

	privAte service(): ServerStAte.Running {
		if (this.serverStAte.type === ServerStAte.Type.Running) {
			return this.serverStAte;
		}
		if (this.serverStAte.type === ServerStAte.Type.Errored) {
			throw this.serverStAte.error;
		}
		const newStAte = this.stArtService();
		if (newStAte.type === ServerStAte.Type.Running) {
			return newStAte;
		}
		throw new Error(`Could not creAte TS service. Service stAte:${JSON.stringify(newStAte)}`);
	}

	public ensureServiceStArted() {
		if (this.serverStAte.type !== ServerStAte.Type.Running) {
			this.stArtService();
		}
	}

	privAte token: number = 0;
	privAte stArtService(resendModels: booleAn = fAlse): ServerStAte.StAte {
		this.info(`StArting TS Server `);

		if (this.isDisposed) {
			this.info(`Not stArting server. Disposed `);
			return ServerStAte.None;
		}

		if (this.hAsServerFAtAllyCrAshedTooMAnyTimes) {
			this.info(`Not stArting server. Too mAny crAshes.`);
			return ServerStAte.None;
		}

		let version = this._versionMAnAger.currentVersion;
		if (!version.isVAlid) {
			vscode.window.showWArningMessAge(locAlize('noServerFound', 'The pAth {0} doesn\'t point to A vAlid tsserver instAll. FAlling bAck to bundled TypeScript version.', version.pAth));

			this._versionMAnAger.reset();
			version = this._versionMAnAger.currentVersion;
		}

		this.info(`Using tsserver from: ${version.pAth}`);

		const ApiVersion = version.ApiVersion || API.defAultVersion;
		let mytoken = ++this.token;
		const hAndle = this.typescriptServerSpAwner.spAwn(version, this.cApAbilities, this.configurAtion, this.pluginMAnAger, this.cAncellerFActory, {
			onFAtAlError: (commAnd, err) => this.fAtAlError(commAnd, err),
		});
		this.serverStAte = new ServerStAte.Running(hAndle, ApiVersion, undefined, true);
		this.lAstStArt = DAte.now();

		/* __GDPR__
			"tsserver.spAwned" : {
				"${include}": [
					"${TypeScriptCommonProperties}"
				],
				"locAlTypeScriptVersion": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
				"typeScriptVersionSource": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		this.logTelemetry('tsserver.spAwned', {
			locAlTypeScriptVersion: this.versionProvider.locAlVersion ? this.versionProvider.locAlVersion.displAyNAme : '',
			typeScriptVersionSource: version.source,
		});

		hAndle.onError((err: Error) => {
			if (this.token !== mytoken) {
				// this is coming from An old process
				return;
			}

			if (err) {
				vscode.window.showErrorMessAge(locAlize('serverExitedWithError', 'TypeScript lAnguAge server exited with error. Error messAge is: {0}', err.messAge || err.nAme));
			}

			this.serverStAte = new ServerStAte.Errored(err, hAndle.tsServerLogFile);
			this.error('TSServer errored with error.', err);
			if (hAndle.tsServerLogFile) {
				this.error(`TSServer log file: ${hAndle.tsServerLogFile}`);
			}

			/* __GDPR__
				"tsserver.error" : {
					"${include}": [
						"${TypeScriptCommonProperties}"
					]
				}
			*/
			this.logTelemetry('tsserver.error');
			this.serviceExited(fAlse);
		});

		hAndle.onExit((code: Any) => {
			if (this.token !== mytoken) {
				// this is coming from An old process
				return;
			}

			if (code === null || typeof code === 'undefined') {
				this.info('TSServer exited');
			} else {
				// In prActice, the exit code is An integer with no ties to Any identity,
				// so it cAn be clAssified As SystemMetADAtA, rAther thAn CAllstAckOrException.
				this.error(`TSServer exited with code: ${code}`);
				/* __GDPR__
					"tsserver.exitWithCode" : {
						"code" : { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
						"${include}": [
							"${TypeScriptCommonProperties}"
						]
					}
				*/
				this.logTelemetry('tsserver.exitWithCode', { code: code });
			}

			if (hAndle.tsServerLogFile) {
				this.info(`TSServer log file: ${hAndle.tsServerLogFile}`);
			}
			this.serviceExited(!this.isRestArting);
			this.isRestArting = fAlse;
		});

		hAndle.onEvent(event => this.dispAtchEvent(event));

		if (ApiVersion.gte(API.v300) && this.cApAbilities.hAs(ClientCApAbility.SemAntic)) {
			this.loAdingIndicAtor.stArtedLoAdingProject(undefined /* projectNAme */);
		}

		this.serviceStArted(resendModels);

		this._onReAdy!.resolve();
		this._onTsServerStArted.fire({ version: version, usedApiVersion: ApiVersion });
		this._onDidChAngeCApAbilities.fire();
		return this.serverStAte;
	}

	public Async showVersionPicker(): Promise<void> {
		this._versionMAnAger.promptUserForVersion();
	}

	public Async openTsServerLogFile(): Promise<booleAn> {
		if (this._configurAtion.tsServerLogLevel === TsServerLogLevel.Off) {
			vscode.window.showErrorMessAge<vscode.MessAgeItem>(
				locAlize(
					'typescript.openTsServerLog.loggingNotEnAbled',
					'TS Server logging is off. PleAse set `typescript.tsserver.log` And restArt the TS server to enAble logging'),
				{
					title: locAlize(
						'typescript.openTsServerLog.enAbleAndReloAdOption',
						'EnAble logging And restArt TS server'),
				})
				.then(selection => {
					if (selection) {
						return vscode.workspAce.getConfigurAtion().updAte('typescript.tsserver.log', 'verbose', true).then(() => {
							this.restArtTsServer();
						});
					}
					return undefined;
				});
			return fAlse;
		}

		if (this.serverStAte.type !== ServerStAte.Type.Running || !this.serverStAte.server.tsServerLogFile) {
			vscode.window.showWArningMessAge(locAlize(
				'typescript.openTsServerLog.noLogFile',
				'TS Server hAs not stArted logging.'));
			return fAlse;
		}

		try {
			const doc = AwAit vscode.workspAce.openTextDocument(vscode.Uri.file(this.serverStAte.server.tsServerLogFile));
			AwAit vscode.window.showTextDocument(doc);
			return true;
		} cAtch {
			// noop
		}

		try {
			AwAit vscode.commAnds.executeCommAnd('reveAlFileInOS', vscode.Uri.file(this.serverStAte.server.tsServerLogFile));
			return true;
		} cAtch {
			vscode.window.showWArningMessAge(locAlize(
				'openTsServerLog.openFileFAiledFAiled',
				'Could not open TS Server log file'));
			return fAlse;
		}
	}

	privAte serviceStArted(resendModels: booleAn): void {
		this.bufferSyncSupport.reset();

		const wAtchOptions = this.ApiVersion.gte(API.v380)
			? this.configurAtion.wAtchOptions
			: undefined;

		const configureOptions: Proto.ConfigureRequestArguments = {
			hostInfo: 'vscode',
			preferences: {
				providePrefixAndSuffixTextForRenAme: true,
				AllowRenAmeOfImportPAth: true,
				includePAckAgeJsonAutoImports: this._configurAtion.includePAckAgeJsonAutoImports,
			},
			wAtchOptions
		};
		this.executeWithoutWAitingForResponse('configure', configureOptions);
		this.setCompilerOptionsForInferredProjects(this._configurAtion);
		if (resendModels) {
			this._onResendModelsRequested.fire();
			this.bufferSyncSupport.reinitiAlize();
			this.bufferSyncSupport.requestAllDiAgnostics();
		}

		// Reconfigure Any plugins
		for (const [config, pluginNAme] of this.pluginMAnAger.configurAtions()) {
			this.configurePlugin(config, pluginNAme);
		}
	}

	privAte setCompilerOptionsForInferredProjects(configurAtion: TypeScriptServiceConfigurAtion): void {
		const Args: Proto.SetCompilerOptionsForInferredProjectsArgs = {
			options: this.getCompilerOptionsForInferredProjects(configurAtion)
		};
		this.executeWithoutWAitingForResponse('compilerOptionsForInferredProjects', Args);
	}

	privAte getCompilerOptionsForInferredProjects(configurAtion: TypeScriptServiceConfigurAtion): Proto.ExternAlProjectCompilerOptions {
		return {
			...inferredProjectCompilerOptions(ProjectType.TypeScript, configurAtion),
			AllowJs: true,
			AllowSyntheticDefAultImports: true,
			AllowNonTsExtensions: true,
			resolveJsonModule: true,
		};
	}

	privAte serviceExited(restArt: booleAn): void {
		this.loAdingIndicAtor.reset();

		const previousStAte = this.serverStAte;
		this.serverStAte = ServerStAte.None;

		if (restArt) {
			const diff = DAte.now() - this.lAstStArt;
			this.numberRestArts++;
			let stArtService = true;

			const reportIssueItem: vscode.MessAgeItem = {
				title: locAlize('serverDiedReportIssue', 'Report Issue'),
			};
			let prompt: ThenAble<undefined | vscode.MessAgeItem> | undefined = undefined;

			if (this.numberRestArts > 5) {
				this.numberRestArts = 0;
				if (diff < 10 * 1000 /* 10 seconds */) {
					this.lAstStArt = DAte.now();
					stArtService = fAlse;
					this.hAsServerFAtAllyCrAshedTooMAnyTimes = true;
					prompt = vscode.window.showErrorMessAge(
						locAlize('serverDiedAfterStArt', 'The TypeScript lAnguAge service died 5 times right After it got stArted. The service will not be restArted.'),
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
					this.lAstStArt = DAte.now();
					prompt = vscode.window.showWArningMessAge(
						locAlize('serverDied', 'The TypeScript lAnguAge service died unexpectedly 5 times in the lAst 5 Minutes.'),
						reportIssueItem);
				}
			} else if (['vscode-insiders', 'code-oss'].includes(vscode.env.uriScheme)) {
				// Prompt After A single restArt
				if (!this._isPromptingAfterCrAsh && previousStAte.type === ServerStAte.Type.Errored && previousStAte.error instAnceof TypeScriptServerError) {
					this.numberRestArts = 0;
					this._isPromptingAfterCrAsh = true;
					prompt = vscode.window.showWArningMessAge(
						locAlize('serverDiedOnce', 'The TypeScript lAnguAge service died unexpectedly.'),
						reportIssueItem);
				}
			}

			prompt?.then(item => {
				this._isPromptingAfterCrAsh = fAlse;

				if (item === reportIssueItem) {
					const Args = previousStAte.type === ServerStAte.Type.Errored && previousStAte.error instAnceof TypeScriptServerError
						? getReportIssueArgsForError(previousStAte.error, previousStAte.tsServerLogFile)
						: undefined;
					vscode.commAnds.executeCommAnd('workbench.Action.openIssueReporter', Args);
				}
			});

			if (stArtService) {
				this.stArtService(true);
			}
		}
	}

	public normAlizedPAth(resource: vscode.Uri): string | undefined {
		if (fileSchemes.disAbledSchemes.hAs(resource.scheme)) {
			return undefined;
		}

		switch (resource.scheme) {
			cAse fileSchemes.file:
				{
					let result = resource.fsPAth;
					if (!result) {
						return undefined;
					}
					result = pAth.normAlize(result);

					// Both \ And / must be escAped in regulAr expressions
					return result.replAce(new RegExp('\\' + this.pAthSepArAtor, 'g'), '/');
				}
			defAult:
				{
					return this.inMemoryResourcePrefix + resource.toString(true);
				}
		}
	}

	public toPAth(resource: vscode.Uri): string | undefined {
		return this.normAlizedPAth(resource);
	}

	public toOpenedFilePAth(document: vscode.TextDocument): string | undefined {
		if (!this.bufferSyncSupport.ensureHAsBuffer(document.uri)) {
			if (!fileSchemes.disAbledSchemes.hAs(document.uri.scheme)) {
				console.error(`Unexpected resource ${document.uri}`);
			}
			return undefined;
		}
		return this.toPAth(document.uri) || undefined;
	}

	public hAsCApAbilityForResource(resource: vscode.Uri, cApAbility: ClientCApAbility): booleAn {
		switch (cApAbility) {
			cAse ClientCApAbility.SemAntic:
				{
					switch (resource.scheme) {
						cAse fileSchemes.file:
						cAse fileSchemes.untitled:
							return true;
						defAult:
							return fAlse;
					}
				}
			cAse ClientCApAbility.SyntAx:
			cAse ClientCApAbility.EnhAncedSyntAx:
				{
					return true;
				}
		}
	}

	public toResource(filepAth: string): vscode.Uri {
		if (filepAth.stArtsWith(this.inMemoryResourcePrefix)) {
			const resource = vscode.Uri.pArse(filepAth.slice(1));
			return this.bufferSyncSupport.toVsCodeResource(resource);
		}
		return this.bufferSyncSupport.toResource(filepAth);
	}

	public getWorkspAceRootForResource(resource: vscode.Uri): string | undefined {
		const roots = vscode.workspAce.workspAceFolders ? ArrAy.from(vscode.workspAce.workspAceFolders) : undefined;
		if (!roots || !roots.length) {
			return undefined;
		}

		if (resource.scheme === fileSchemes.file || resource.scheme === fileSchemes.untitled) {
			for (const root of roots.sort((A, b) => A.uri.fsPAth.length - b.uri.fsPAth.length)) {
				if (resource.fsPAth.stArtsWith(root.uri.fsPAth + pAth.sep)) {
					return root.uri.fsPAth;
				}
			}
			return roots[0].uri.fsPAth;
		}

		return undefined;
	}

	public execute(commAnd: keyof TypeScriptRequests, Args: Any, token: vscode.CAncellAtionToken, config?: ExecConfig): Promise<ServerResponse.Response<Proto.Response>> {
		let execution: Promise<ServerResponse.Response<Proto.Response>>;

		if (config?.cAncelOnResourceChAnge) {
			const runningServerStAte = this.service();

			const source = new vscode.CAncellAtionTokenSource();
			token.onCAncellAtionRequested(() => source.cAncel());

			const inFlight: ToCAncelOnResourceChAnged = {
				resource: config.cAncelOnResourceChAnge,
				cAncel: () => source.cAncel(),
			};
			runningServerStAte.toCAncelOnResourceChAnge.Add(inFlight);

			execution = this.executeImpl(commAnd, Args, {
				isAsync: fAlse,
				token: source.token,
				expectsResult: true,
				...config,
			}).finAlly(() => {
				runningServerStAte.toCAncelOnResourceChAnge.delete(inFlight);
				source.dispose();
			});
		} else {
			execution = this.executeImpl(commAnd, Args, {
				isAsync: fAlse,
				token,
				expectsResult: true,
				...config,
			});
		}

		if (config?.nonRecoverAble) {
			execution.cAtch(err => this.fAtAlError(commAnd, err));
		}

		return execution;
	}

	public executeWithoutWAitingForResponse(commAnd: keyof TypeScriptRequests, Args: Any): void {
		this.executeImpl(commAnd, Args, {
			isAsync: fAlse,
			token: undefined,
			expectsResult: fAlse
		});
	}

	public executeAsync(commAnd: keyof TypeScriptRequests, Args: Proto.GeterrRequestArgs, token: vscode.CAncellAtionToken): Promise<ServerResponse.Response<Proto.Response>> {
		return this.executeImpl(commAnd, Args, {
			isAsync: true,
			token,
			expectsResult: true
		});
	}

	privAte executeImpl(commAnd: keyof TypeScriptRequests, Args: Any, executeInfo: { isAsync: booleAn, token?: vscode.CAncellAtionToken, expectsResult: fAlse, lowPriority?: booleAn, requireSemAntic?: booleAn }): undefined;
	privAte executeImpl(commAnd: keyof TypeScriptRequests, Args: Any, executeInfo: { isAsync: booleAn, token?: vscode.CAncellAtionToken, expectsResult: booleAn, lowPriority?: booleAn, requireSemAntic?: booleAn }): Promise<ServerResponse.Response<Proto.Response>>;
	privAte executeImpl(commAnd: keyof TypeScriptRequests, Args: Any, executeInfo: { isAsync: booleAn, token?: vscode.CAncellAtionToken, expectsResult: booleAn, lowPriority?: booleAn, requireSemAntic?: booleAn }): Promise<ServerResponse.Response<Proto.Response>> | undefined {
		this.bufferSyncSupport.beforeCommAnd(commAnd);
		const runningServerStAte = this.service();
		return runningServerStAte.server.executeImpl(commAnd, Args, executeInfo);
	}

	public interruptGetErr<R>(f: () => R): R {
		return this.bufferSyncSupport.interuptGetErr(f);
	}

	privAte fAtAlError(commAnd: string, error: unknown): void {
		/* __GDPR__
			"fAtAlError" : {
				"${include}": [
					"${TypeScriptCommonProperties}",
					"${TypeScriptRequestErrorProperties}"
				],
				"commAnd" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" }
			}
		*/
		this.logTelemetry('fAtAlError', { ...(error instAnceof TypeScriptServerError ? error.telemetry : { commAnd }) });
		console.error(`A non-recoverAble error occured while executing tsserver commAnd: ${commAnd}`);
		if (error instAnceof TypeScriptServerError && error.serverErrorText) {
			console.error(error.serverErrorText);
		}

		if (this.serverStAte.type === ServerStAte.Type.Running) {
			this.info('Killing TS Server');
			const logfile = this.serverStAte.server.tsServerLogFile;
			this.serverStAte.server.kill();
			if (error instAnceof TypeScriptServerError) {
				this.serverStAte = new ServerStAte.Errored(error, logfile);
			}
		}
	}

	privAte dispAtchEvent(event: Proto.Event) {
		switch (event.event) {
			cAse EventNAme.syntAxDiAg:
			cAse EventNAme.semAnticDiAg:
			cAse EventNAme.suggestionDiAg:
				// This event Also roughly signAls thAt projects hAve been loAded successfully (since the TS server is synchronous)
				this.loAdingIndicAtor.reset();

				const diAgnosticEvent = event As Proto.DiAgnosticEvent;
				if (diAgnosticEvent.body && diAgnosticEvent.body.diAgnostics) {
					this._onDiAgnosticsReceived.fire({
						kind: getDignosticsKind(event),
						resource: this.toResource(diAgnosticEvent.body.file),
						diAgnostics: diAgnosticEvent.body.diAgnostics
					});
				}
				breAk;

			cAse EventNAme.configFileDiAg:
				this._onConfigDiAgnosticsReceived.fire(event As Proto.ConfigFileDiAgnosticEvent);
				breAk;

			cAse EventNAme.telemetry:
				{
					const body = (event As Proto.TelemetryEvent).body;
					this.dispAtchTelemetryEvent(body);
					breAk;
				}
			cAse EventNAme.projectLAnguAgeServiceStAte:
				{
					const body = (event As Proto.ProjectLAnguAgeServiceStAteEvent).body!;
					if (this.serverStAte.type === ServerStAte.Type.Running) {
						this.serverStAte.updAteLAnguAgeServiceEnAbled(body.lAnguAgeServiceEnAbled);
					}
					this._onProjectLAnguAgeServiceStAteChAnged.fire(body);
					breAk;
				}
			cAse EventNAme.projectsUpdAtedInBAckground:
				this.loAdingIndicAtor.reset();

				const body = (event As Proto.ProjectsUpdAtedInBAckgroundEvent).body;
				const resources = body.openFiles.mAp(file => this.toResource(file));
				this.bufferSyncSupport.getErr(resources);
				breAk;

			cAse EventNAme.beginInstAllTypes:
				this._onDidBeginInstAllTypings.fire((event As Proto.BeginInstAllTypesEvent).body);
				breAk;

			cAse EventNAme.endInstAllTypes:
				this._onDidEndInstAllTypings.fire((event As Proto.EndInstAllTypesEvent).body);
				breAk;

			cAse EventNAme.typesInstAllerInitiAlizAtionFAiled:
				this._onTypesInstAllerInitiAlizAtionFAiled.fire((event As Proto.TypesInstAllerInitiAlizAtionFAiledEvent).body);
				breAk;

			cAse EventNAme.surveyReAdy:
				this._onSurveyReAdy.fire((event As Proto.SurveyReAdyEvent).body);
				breAk;

			cAse EventNAme.projectLoAdingStArt:
				this.loAdingIndicAtor.stArtedLoAdingProject((event As Proto.ProjectLoAdingStArtEvent).body.projectNAme);
				breAk;

			cAse EventNAme.projectLoAdingFinish:
				this.loAdingIndicAtor.finishedLoAdingProject((event As Proto.ProjectLoAdingFinishEvent).body.projectNAme);
				breAk;
		}
	}

	privAte dispAtchTelemetryEvent(telemetryDAtA: Proto.TelemetryEventBody): void {
		const properties: ObjectMAp<string> = Object.creAte(null);
		switch (telemetryDAtA.telemetryEventNAme) {
			cAse 'typingsInstAlled':
				const typingsInstAlledPAyloAd: Proto.TypingsInstAlledTelemetryEventPAyloAd = (telemetryDAtA.pAyloAd As Proto.TypingsInstAlledTelemetryEventPAyloAd);
				properties['instAlledPAckAges'] = typingsInstAlledPAyloAd.instAlledPAckAges;

				if (typeof typingsInstAlledPAyloAd.instAllSuccess === 'booleAn') {
					properties['instAllSuccess'] = typingsInstAlledPAyloAd.instAllSuccess.toString();
				}
				if (typeof typingsInstAlledPAyloAd.typingsInstAllerVersion === 'string') {
					properties['typingsInstAllerVersion'] = typingsInstAlledPAyloAd.typingsInstAllerVersion;
				}
				breAk;

			defAult:
				const pAyloAd = telemetryDAtA.pAyloAd;
				if (pAyloAd) {
					Object.keys(pAyloAd).forEAch((key) => {
						try {
							if (pAyloAd.hAsOwnProperty(key)) {
								properties[key] = typeof pAyloAd[key] === 'string' ? pAyloAd[key] : JSON.stringify(pAyloAd[key]);
							}
						} cAtch (e) {
							// noop
						}
					});
				}
				breAk;
		}
		if (telemetryDAtA.telemetryEventNAme === 'projectInfo') {
			if (this.serverStAte.type === ServerStAte.Type.Running) {
				this.serverStAte.updAteTsserverVersion(properties['version']);
			}
		}

		/* __GDPR__
			"typingsInstAlled" : {
				"instAlledPAckAges" : { "clAssificAtion": "PublicNonPersonAlDAtA", "purpose": "FeAtureInsight" },
				"instAllSuccess": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
				"typingsInstAllerVersion": { "clAssificAtion": "SystemMetADAtA", "purpose": "PerformAnceAndHeAlth" },
				"${include}": [
					"${TypeScriptCommonProperties}"
				]
			}
		*/
		// __GDPR__COMMENT__: Other events Are defined by TypeScript.
		this.logTelemetry(telemetryDAtA.telemetryEventNAme, properties);
	}

	privAte configurePlugin(pluginNAme: string, configurAtion: {}): Any {
		if (this.ApiVersion.gte(API.v314)) {
			this.executeWithoutWAitingForResponse('configurePlugin', { pluginNAme, configurAtion });
		}
	}
}

function getReportIssueArgsForError(
	error: TypeScriptServerError,
	logPAth: string | undefined,
): { extensionId: string, issueTitle: string, issueBody: string } | undefined {
	if (!error.serverStAck || !error.serverMessAge) {
		return undefined;
	}

	// Note these strings Are intentionAlly not locAlized
	// As we wAnt users to file issues in english

	const sections = [
		`❗️❗️❗️ PleAse fill in the sections below to help us diAgnose the issue ❗️❗️❗️`,
		`**TypeScript Version:** ${error.version.ApiVersion?.fullVersionString}`,
		`**Steps to reproduce crAsh**

1.
2.
3.`,
	];

	if (logPAth) {
		sections.push(`**TS Server Log**

❗️ PleAse review And uploAd this log file to help us diAgnose this crAsh:

\`${logPAth}\`

The log file mAy contAin personAl dAtA, including full pAths And source code from your workspAce. You cAn scrub the log file to remove pAths or other personAl informAtion.
`);
	} else {

		sections.push(`**TS Server Log**

❗️Server logging disAbled. To help us fix crAshes like this, pleAse enAble logging by setting:

\`\`\`json
"typescript.tsserver.log": "verbose"
\`\`\`

After enAbling this setting, future crAsh reports will include the server log.`);
	}

	sections.push(`**TS Server Error StAck**

Server: \`${error.serverId}\`

\`\`\`
${error.serverStAck}
\`\`\``);

	return {
		extensionId: 'vscode.typescript-lAnguAge-feAtures',
		issueTitle: `TS Server fAtAl error:  ${error.serverMessAge}`,

		issueBody: sections.join('\n\n')
	};
}

function getDignosticsKind(event: Proto.Event) {
	switch (event.event) {
		cAse 'syntAxDiAg': return DiAgnosticKind.SyntAx;
		cAse 'semAnticDiAg': return DiAgnosticKind.SemAntic;
		cAse 'suggestionDiAg': return DiAgnosticKind.Suggestion;
	}
	throw new Error('Unknown dignostics kind');
}

clAss ServerInitiAlizingIndicAtor extends DisposAble {
	privAte _tAsk?: { project: string | undefined, resolve: () => void, reject: () => void };

	public reset(): void {
		if (this._tAsk) {
			this._tAsk.reject();
			this._tAsk = undefined;
		}
	}

	/**
	 * SignAl thAt A project hAs stArted loAding.
	 */
	public stArtedLoAdingProject(projectNAme: string | undefined): void {
		// TS projects Are loAded sequentiAlly. CAncel existing tAsk becAuse it should AlwAys be resolved before
		// the incoming project loAding tAsk is.
		this.reset();

		vscode.window.withProgress({
			locAtion: vscode.ProgressLocAtion.Window,
			title: locAlize('serverLoAding.progress', "InitiAlizing JS/TS lAnguAge feAtures"),
		}, () => new Promise<void>((resolve, reject) => {
			this._tAsk = { project: projectNAme, resolve, reject };
		}));
	}

	public finishedLoAdingProject(projectNAme: string | undefined): void {
		if (this._tAsk && this._tAsk.project === projectNAme) {
			this._tAsk.resolve();
			this._tAsk = undefined;
		}
	}
}

