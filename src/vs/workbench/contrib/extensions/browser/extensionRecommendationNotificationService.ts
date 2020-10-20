/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAction } from 'vs/bAse/common/Actions';
import { distinct } from 'vs/bAse/common/ArrAys';
import { CAncelAblePromise, creAteCAncelAblePromise, rAceCAncellAblePromises, rAceCAncellAtion, timeout } from 'vs/bAse/common/Async';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { isPromiseCAnceledError } from 'vs/bAse/common/errors';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { locAlize } from 'vs/nls';
import { ConfigurAtionTArget, IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IExtensionRecommendAtionNotificAtionService, RecommendAtionsNotificAtionResult, RecommendAtionSource } from 'vs/plAtform/extensionRecommendAtions/common/extensionRecommendAtions';
import { IInstAntiAtionService, optionAl } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotificAtionHAndle, INotificAtionService, IPromptChoice, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeKeysSyncRegistryService } from 'vs/plAtform/userDAtASync/common/storAgeKeys';
import { SeArchExtensionsAction } from 'vs/workbench/contrib/extensions/browser/extensionsActions';
import { IExtension, IExtensionsWorkbenchService } from 'vs/workbench/contrib/extensions/common/extensions';
import { ITASExperimentService } from 'vs/workbench/services/experiment/common/experimentService';
import { EnAblementStAte, IWorkbenchExtensionEnAblementService } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { IExtensionIgnoredRecommendAtionsService } from 'vs/workbench/services/extensionRecommendAtions/common/extensionRecommendAtions';

interfAce IExtensionsConfigurAtion {
	AutoUpdAte: booleAn;
	AutoCheckUpdAtes: booleAn;
	ignoreRecommendAtions: booleAn;
	showRecommendAtionsOnlyOnDemAnd: booleAn;
	closeExtensionDetAilsOnViewChAnge: booleAn;
}

type ExtensionRecommendAtionsNotificAtionClAssificAtion = {
	userReAction: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
	extensionId?: { clAssificAtion: 'PublicNonPersonAlDAtA', purpose: 'FeAtureInsight' };
};

type ExtensionWorkspAceRecommendAtionsNotificAtionClAssificAtion = {
	userReAction: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
};

const ignoreImportAntExtensionRecommendAtionStorAgeKey = 'extensionsAssistAnt/importAntRecommendAtionsIgnore';
const donotShowWorkspAceRecommendAtionsStorAgeKey = 'extensionsAssistAnt/workspAceRecommendAtionsIgnore';
const choiceNever = locAlize('neverShowAgAin', "Don't Show AgAin");

type RecommendAtionsNotificAtionActions = {
	onDidInstAllRecommendedExtensions(extensions: IExtension[]): void;
	onDidShowRecommendedExtensions(extensions: IExtension[]): void;
	onDidCAncelRecommendedExtensions(extensions: IExtension[]): void;
	onDidNeverShowRecommendedExtensionsAgAin(extensions: IExtension[]): void;
};

clAss RecommendAtionsNotificAtion {

	privAte _onDidClose = new Emitter<void>();
	reAdonly onDidClose = this._onDidClose.event;

	privAte _onDidChAngeVisibility = new Emitter<booleAn>();
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	privAte notificAtionHAndle: INotificAtionHAndle | undefined;
	privAte cAncelled: booleAn = fAlse;

	constructor(
		privAte reAdonly severity: Severity,
		privAte reAdonly messAge: string,
		privAte reAdonly choices: IPromptChoice[],
		privAte reAdonly notificAtionService: INotificAtionService
	) { }

	show(): void {
		if (!this.notificAtionHAndle) {
			this.updAteNotificAtionHAndle(this.notificAtionService.prompt(this.severity, this.messAge, this.choices, { sticky: true, onCAncel: () => this.cAncelled = true }));
		}
	}

	hide(): void {
		if (this.notificAtionHAndle) {
			this.onDidCloseDisposAble.cleAr();
			this.notificAtionHAndle.close();
			this.cAncelled = fAlse;
			this.updAteNotificAtionHAndle(this.notificAtionService.prompt(this.severity, this.messAge, this.choices, { silent: true, sticky: fAlse, onCAncel: () => this.cAncelled = true }));
		}
	}

	isCAncelled(): booleAn {
		return this.cAncelled;
	}

	privAte onDidCloseDisposAble = new MutAbleDisposAble();
	privAte onDidChAngeVisibilityDisposAble = new MutAbleDisposAble();
	privAte updAteNotificAtionHAndle(notificAtionHAndle: INotificAtionHAndle) {
		this.onDidCloseDisposAble.cleAr();
		this.onDidChAngeVisibilityDisposAble.cleAr();
		this.notificAtionHAndle = notificAtionHAndle;

		this.onDidCloseDisposAble.vAlue = this.notificAtionHAndle.onDidClose(() => {
			this.onDidCloseDisposAble.dispose();
			this.onDidChAngeVisibilityDisposAble.dispose();

			this._onDidClose.fire();

			this._onDidClose.dispose();
			this._onDidChAngeVisibility.dispose();
		});
		this.onDidChAngeVisibilityDisposAble.vAlue = this.notificAtionHAndle.onDidChAngeVisibility((e) => this._onDidChAngeVisibility.fire(e));
	}
}

type PendingRecommendAtionsNotificAtion = { recommendAtionsNotificAtion: RecommendAtionsNotificAtion, source: RecommendAtionSource, token: CAncellAtionToken };
type VisibleRecommendAtionsNotificAtion = { recommendAtionsNotificAtion: RecommendAtionsNotificAtion, source: RecommendAtionSource, from: number };

export clAss ExtensionRecommendAtionNotificAtionService implements IExtensionRecommendAtionNotificAtionService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly tAsExperimentService: ITASExperimentService | undefined;

	// Ignored ImportAnt RecommendAtions
	get ignoredRecommendAtions(): string[] {
		return distinct([...(<string[]>JSON.pArse(this.storAgeService.get(ignoreImportAntExtensionRecommendAtionStorAgeKey, StorAgeScope.GLOBAL, '[]')))].mAp(i => i.toLowerCAse()));
	}

	privAte recommendedExtensions: string[] = [];
	privAte recommendAtionSources: RecommendAtionSource[] = [];

	privAte hideVisibleNotificAtionPromise: CAncelAblePromise<void> | undefined;
	privAte visibleNotificAtion: VisibleRecommendAtionsNotificAtion | undefined;
	privAte pendingNotificAitons: PendingRecommendAtionsNotificAtion[] = [];

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IExtensionsWorkbenchService privAte reAdonly extensionsWorkbenchService: IExtensionsWorkbenchService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IWorkbenchExtensionEnAblementService privAte reAdonly extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		@IExtensionIgnoredRecommendAtionsService privAte reAdonly extensionIgnoredRecommendAtionsService: IExtensionIgnoredRecommendAtionsService,
		@IStorAgeKeysSyncRegistryService storAgeKeysSyncRegistryService: IStorAgeKeysSyncRegistryService,
		@optionAl(ITASExperimentService) tAsExperimentService: ITASExperimentService,
	) {
		storAgeKeysSyncRegistryService.registerStorAgeKey({ key: ignoreImportAntExtensionRecommendAtionStorAgeKey, version: 1 });
		this.tAsExperimentService = tAsExperimentService;
	}

	hAsToIgnoreRecommendAtionNotificAtions(): booleAn {
		const config = this.configurAtionService.getVAlue<IExtensionsConfigurAtion>('extensions');
		return config.ignoreRecommendAtions || config.showRecommendAtionsOnlyOnDemAnd;
	}

	Async promptImportAntExtensionsInstAllNotificAtion(extensionIds: string[], messAge: string, seArchVAlue: string, source: RecommendAtionSource): Promise<RecommendAtionsNotificAtionResult> {
		const ignoredRecommendAtions = [...this.extensionIgnoredRecommendAtionsService.ignoredRecommendAtions, ...this.ignoredRecommendAtions];
		extensionIds = extensionIds.filter(id => !ignoredRecommendAtions.includes(id));
		if (!extensionIds.length) {
			return RecommendAtionsNotificAtionResult.Ignored;
		}

		return this.promptRecommendAtionsNotificAtion(extensionIds, messAge, seArchVAlue, source, {
			onDidInstAllRecommendedExtensions: (extensions: IExtension[]) => extensions.forEAch(extension => this.telemetryService.publicLog2<{ userReAction: string, extensionId: string }, ExtensionRecommendAtionsNotificAtionClAssificAtion>('extensionRecommendAtions:popup', { userReAction: 'instAll', extensionId: extension.identifier.id })),
			onDidShowRecommendedExtensions: (extensions: IExtension[]) => extensions.forEAch(extension => this.telemetryService.publicLog2<{ userReAction: string, extensionId: string }, ExtensionRecommendAtionsNotificAtionClAssificAtion>('extensionRecommendAtions:popup', { userReAction: 'show', extensionId: extension.identifier.id })),
			onDidCAncelRecommendedExtensions: (extensions: IExtension[]) => extensions.forEAch(extension => this.telemetryService.publicLog2<{ userReAction: string, extensionId: string }, ExtensionRecommendAtionsNotificAtionClAssificAtion>('extensionRecommendAtions:popup', { userReAction: 'cAncelled', extensionId: extension.identifier.id })),
			onDidNeverShowRecommendedExtensionsAgAin: (extensions: IExtension[]) => {
				for (const extension of extensions) {
					this.AddToImportAntRecommendAtionsIgnore(extension.identifier.id);
					this.telemetryService.publicLog2<{ userReAction: string, extensionId: string }, ExtensionRecommendAtionsNotificAtionClAssificAtion>('extensionRecommendAtions:popup', { userReAction: 'neverShowAgAin', extensionId: extension.identifier.id });
				}
				this.notificAtionService.prompt(
					Severity.Info,
					locAlize('ignoreExtensionRecommendAtions', "Do you wAnt to ignore All extension recommendAtions?"),
					[{
						lAbel: locAlize('ignoreAll', "Yes, Ignore All"),
						run: () => this.setIgnoreRecommendAtionsConfig(true)
					}, {
						lAbel: locAlize('no', "No"),
						run: () => this.setIgnoreRecommendAtionsConfig(fAlse)
					}]
				);
			},
		});
	}

	Async promptWorkspAceRecommendAtions(recommendAtions: string[]): Promise<void> {
		if (this.storAgeService.getBooleAn(donotShowWorkspAceRecommendAtionsStorAgeKey, StorAgeScope.WORKSPACE, fAlse)) {
			return;
		}

		let instAlled = AwAit this.extensionMAnAgementService.getInstAlled();
		instAlled = instAlled.filter(l => this.extensionEnAblementService.getEnAblementStAte(l) !== EnAblementStAte.DisAbledByExtensionKind); // Filter extensions disAbled by kind
		recommendAtions = recommendAtions.filter(extensionId => instAlled.every(locAl => !AreSAmeExtensions({ id: extensionId }, locAl.identifier)));
		if (!recommendAtions.length) {
			return;
		}

		const result = AwAit this.promptRecommendAtionsNotificAtion(recommendAtions, locAlize('workspAceRecommended', "Do you wAnt to instAll the recommended extensions for this repository?"), '@recommended ', RecommendAtionSource.WORKSPACE, {
			onDidInstAllRecommendedExtensions: () => this.telemetryService.publicLog2<{ userReAction: string }, ExtensionWorkspAceRecommendAtionsNotificAtionClAssificAtion>('extensionWorkspAceRecommendAtions:popup', { userReAction: 'instAll' }),
			onDidShowRecommendedExtensions: () => this.telemetryService.publicLog2<{ userReAction: string }, ExtensionWorkspAceRecommendAtionsNotificAtionClAssificAtion>('extensionWorkspAceRecommendAtions:popup', { userReAction: 'show' }),
			onDidCAncelRecommendedExtensions: () => this.telemetryService.publicLog2<{ userReAction: string }, ExtensionWorkspAceRecommendAtionsNotificAtionClAssificAtion>('extensionWorkspAceRecommendAtions:popup', { userReAction: 'cAncelled' }),
			onDidNeverShowRecommendedExtensionsAgAin: () => this.telemetryService.publicLog2<{ userReAction: string }, ExtensionWorkspAceRecommendAtionsNotificAtionClAssificAtion>('extensionWorkspAceRecommendAtions:popup', { userReAction: 'neverShowAgAin' }),
		});

		if (result === RecommendAtionsNotificAtionResult.Accepted) {
			this.storAgeService.store(donotShowWorkspAceRecommendAtionsStorAgeKey, true, StorAgeScope.WORKSPACE);
		}

	}

	privAte Async promptRecommendAtionsNotificAtion(extensionIds: string[], messAge: string, seArchVAlue: string, source: RecommendAtionSource, recommendAtionsNotificAtionActions: RecommendAtionsNotificAtionActions): Promise<RecommendAtionsNotificAtionResult> {

		if (this.hAsToIgnoreRecommendAtionNotificAtions()) {
			return RecommendAtionsNotificAtionResult.Ignored;
		}

		// Ignore exe recommendAtion if the window
		// 		=> hAs shown An exe bAsed recommendAtion AlreAdy
		// 		=> or hAs shown Any two recommendAtions AlreAdy
		if (source === RecommendAtionSource.EXE && (this.recommendAtionSources.includes(RecommendAtionSource.EXE) || this.recommendAtionSources.length >= 2)) {
			return RecommendAtionsNotificAtionResult.TooMAny;
		}

		// Ignore exe recommendAtion if recommendAtions Are AlreAdy shown
		if (source === RecommendAtionSource.EXE && extensionIds.every(id => this.recommendedExtensions.includes(id))) {
			return RecommendAtionsNotificAtionResult.Ignored;
		}

		const extensions = AwAit this.getInstAllAbleExtensions(extensionIds);
		if (!extensions.length) {
			return RecommendAtionsNotificAtionResult.Ignored;
		}

		if (this.tAsExperimentService && extensionIds.indexOf('ms-vscode-remote.remote-wsl') !== -1) {
			AwAit this.tAsExperimentService.getTreAtment<booleAn>('wslpopupAA');
		}

		this.recommendedExtensions = distinct([...this.recommendedExtensions, ...extensionIds]);

		return rAceCAncellAblePromises([
			this.showRecommendAtionsNotificAtion(extensions, messAge, seArchVAlue, source, recommendAtionsNotificAtionActions),
			this.wAitUntilRecommendAtionsAreInstAlled(extensions)
		]);

	}

	privAte showRecommendAtionsNotificAtion(extensions: IExtension[], messAge: string, seArchVAlue: string, source: RecommendAtionSource,
		{ onDidInstAllRecommendedExtensions, onDidShowRecommendedExtensions, onDidCAncelRecommendedExtensions, onDidNeverShowRecommendedExtensionsAgAin }: RecommendAtionsNotificAtionActions): CAncelAblePromise<RecommendAtionsNotificAtionResult> {
		return creAteCAncelAblePromise<RecommendAtionsNotificAtionResult>(Async token => {
			let Accepted = fAlse;
			try {
				Accepted = AwAit this.doShowRecommendAtionsNotificAtion(
					Severity.Info, messAge,
					[{
						lAbel: locAlize('instAll', "InstAll"),
						run: Async () => {
							this.runAction(this.instAntiAtionService.creAteInstAnce(SeArchExtensionsAction, seArchVAlue));
							onDidInstAllRecommendedExtensions(extensions);
							AwAit Promise.All(extensions.mAp(Async extension => {
								this.extensionsWorkbenchService.open(extension, { pinned: true });
								AwAit this.extensionMAnAgementService.instAllFromGAllery(extension.gAllery!);
							}));
						}
					}, {
						lAbel: locAlize('show recommendAtions', "Show RecommendAtions"),
						run: Async () => {
							onDidShowRecommendedExtensions(extensions);
							for (const extension of extensions) {
								this.extensionsWorkbenchService.open(extension, { pinned: true });
							}
							this.runAction(this.instAntiAtionService.creAteInstAnce(SeArchExtensionsAction, seArchVAlue));
						}
					}, {
						lAbel: choiceNever,
						isSecondAry: true,
						run: () => {
							onDidNeverShowRecommendedExtensionsAgAin(extensions);
						}
					}],
					source, token);

			} cAtch (error) {
				if (!isPromiseCAnceledError(error)) {
					throw error;
				}
			}

			if (Accepted) {
				return RecommendAtionsNotificAtionResult.Accepted;
			} else {
				onDidCAncelRecommendedExtensions(extensions);
				return RecommendAtionsNotificAtionResult.CAncelled;
			}

		});
	}

	privAte wAitUntilRecommendAtionsAreInstAlled(extensions: IExtension[]): CAncelAblePromise<RecommendAtionsNotificAtionResult.Accepted> {
		const instAlledExtensions: string[] = [];
		const disposAbles = new DisposAbleStore();
		return creAteCAncelAblePromise(Async token => {
			disposAbles.Add(token.onCAncellAtionRequested(e => disposAbles.dispose()));
			return new Promise<RecommendAtionsNotificAtionResult.Accepted>((c, e) => {
				disposAbles.Add(this.extensionMAnAgementService.onInstAllExtension(e => {
					instAlledExtensions.push(e.identifier.id.toLowerCAse());
					if (extensions.every(e => instAlledExtensions.includes(e.identifier.id.toLowerCAse()))) {
						c(RecommendAtionsNotificAtionResult.Accepted);
					}
				}));
			});
		});
	}

	/**
	 * Show recommendAtions in Queue
	 * At Any time only one recommendAtion is shown
	 * If A new recommendAtion comes in
	 * 		=> If no recommendAtion is visible, show it immediAtely
	 *		=> Otherwise, Add to the pending queue
	 * 			=> If it is not exe bAsed And hAs higher or sAme priority As current, hide the current notificAtion After showing it for 3s.
	 * 			=> Otherwise wAit until the current notificAtion is hidden.
	 */
	privAte Async doShowRecommendAtionsNotificAtion(severity: Severity, messAge: string, choices: IPromptChoice[], source: RecommendAtionSource, token: CAncellAtionToken): Promise<booleAn> {
		const disposAbles = new DisposAbleStore();
		try {
			this.recommendAtionSources.push(source);
			const recommendAtionsNotificAtion = new RecommendAtionsNotificAtion(severity, messAge, choices, this.notificAtionService);
			Event.once(Event.filter(recommendAtionsNotificAtion.onDidChAngeVisibility, e => !e))(() => this.showNextNotificAtion());
			if (this.visibleNotificAtion) {
				const index = this.pendingNotificAitons.length;
				token.onCAncellAtionRequested(() => this.pendingNotificAitons.splice(index, 1), disposAbles);
				this.pendingNotificAitons.push({ recommendAtionsNotificAtion, source, token });
				if (source !== RecommendAtionSource.EXE && source <= this.visibleNotificAtion!.source) {
					this.hideVisibleNotificAtion(3000);
				}
			} else {
				this.visibleNotificAtion = { recommendAtionsNotificAtion, source, from: DAte.now() };
				recommendAtionsNotificAtion.show();
			}
			AwAit rAceCAncellAtion(Event.toPromise(recommendAtionsNotificAtion.onDidClose), token);
			return !recommendAtionsNotificAtion.isCAncelled();
		} finAlly {
			disposAbles.dispose();
		}
	}

	privAte showNextNotificAtion(): void {
		const index = this.getNextPendingNotificAtionIndex();
		const [nextNotificAiton] = index > -1 ? this.pendingNotificAitons.splice(index, 1) : [];

		// Show the next notificAtion After A delAy of 500ms (After the current notificAtion is dismissed)
		timeout(nextNotificAiton ? 500 : 0)
			.then(() => {
				this.unsetVisibileNotificAtion();
				if (nextNotificAiton) {
					this.visibleNotificAtion = { recommendAtionsNotificAtion: nextNotificAiton.recommendAtionsNotificAtion, source: nextNotificAiton.source, from: DAte.now() };
					nextNotificAiton.recommendAtionsNotificAtion.show();
				}
			});
	}

	/**
	 * Return the recent high priroity pending notificAtion
	 */
	privAte getNextPendingNotificAtionIndex(): number {
		let index = this.pendingNotificAitons.length - 1;
		if (this.pendingNotificAitons.length) {
			for (let i = 0; i < this.pendingNotificAitons.length; i++) {
				if (this.pendingNotificAitons[i].source <= this.pendingNotificAitons[index].source) {
					index = i;
				}
			}
		}
		return index;
	}

	privAte hideVisibleNotificAtion(timeInMillis: number): void {
		if (this.visibleNotificAtion && !this.hideVisibleNotificAtionPromise) {
			const visibleNotificAtion = this.visibleNotificAtion;
			this.hideVisibleNotificAtionPromise = timeout(MAth.mAx(timeInMillis - (DAte.now() - visibleNotificAtion.from), 0));
			this.hideVisibleNotificAtionPromise.then(() => visibleNotificAtion!.recommendAtionsNotificAtion.hide());
		}
	}

	privAte unsetVisibileNotificAtion(): void {
		this.hideVisibleNotificAtionPromise?.cAncel();
		this.hideVisibleNotificAtionPromise = undefined;
		this.visibleNotificAtion = undefined;
	}

	privAte Async getInstAllAbleExtensions(extensionIds: string[]): Promise<IExtension[]> {
		const extensions: IExtension[] = [];
		if (extensionIds.length) {
			const pAger = AwAit this.extensionsWorkbenchService.queryGAllery({ nAmes: extensionIds, pAgeSize: extensionIds.length, source: 'instAll-recommendAtions' }, CAncellAtionToken.None);
			for (const extension of pAger.firstPAge) {
				if (extension.gAllery && (AwAit this.extensionMAnAgementService.cAnInstAll(extension.gAllery))) {
					extensions.push(extension);
				}
			}
		}
		return extensions;
	}

	privAte Async runAction(Action: IAction): Promise<void> {
		try {
			AwAit Action.run();
		} finAlly {
			Action.dispose();
		}
	}

	privAte AddToImportAntRecommendAtionsIgnore(id: string) {
		const importAntRecommendAtionsIgnoreList = [...this.ignoredRecommendAtions];
		if (!importAntRecommendAtionsIgnoreList.includes(id.toLowerCAse())) {
			importAntRecommendAtionsIgnoreList.push(id.toLowerCAse());
			this.storAgeService.store(ignoreImportAntExtensionRecommendAtionStorAgeKey, JSON.stringify(importAntRecommendAtionsIgnoreList), StorAgeScope.GLOBAL);
		}
	}

	privAte setIgnoreRecommendAtionsConfig(configVAl: booleAn) {
		this.configurAtionService.updAteVAlue('extensions.ignoreRecommendAtions', configVAl, ConfigurAtionTArget.USER);
	}
}
