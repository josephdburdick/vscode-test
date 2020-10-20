/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/workbench/browser/style';

import { locAlize } from 'vs/nls';
import { Emitter, setGlobAlLeAkWArningThreshold } from 'vs/bAse/common/event';
import { runWhenIdle } from 'vs/bAse/common/Async';
import { getZoomLevel, isFirefox, isSAfAri, isChrome } from 'vs/bAse/browser/browser';
import { mArk } from 'vs/bAse/common/performAnce';
import { onUnexpectedError, setUnexpectedErrorHAndler } from 'vs/bAse/common/errors';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { isWindows, isLinux, isWeb, isNAtive, isMAcintosh } from 'vs/bAse/common/plAtform';
import { IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { IEditorInputFActoryRegistry, Extensions As EditorExtensions } from 'vs/workbench/common/editor';
import { getSingletonServiceDescriptors } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Position, PArts, IWorkbenchLAyoutService, positionToString } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IStorAgeService, WillSAveStAteReAson, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { LifecyclePhAse, ILifecycleService, WillShutdownEvent, BeforeShutdownEvent } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { NotificAtionService } from 'vs/workbench/services/notificAtion/common/notificAtionService';
import { NotificAtionsCenter } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsCenter';
import { NotificAtionsAlerts } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsAlerts';
import { NotificAtionsStAtus } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsStAtus';
import { registerNotificAtionCommAnds } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsCommAnds';
import { NotificAtionsToAsts } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsToAsts';
import { setARIAContAiner } from 'vs/bAse/browser/ui/AriA/AriA';
import { reAdFontInfo, restoreFontInfo, seriAlizeFontInfo } from 'vs/editor/browser/config/configurAtion';
import { BAreFontInfo } from 'vs/editor/common/config/fontInfo';
import { ILogService } from 'vs/plAtform/log/common/log';
import { toErrorMessAge } from 'vs/bAse/common/errorMessAge';
import { WorkbenchContextKeysHAndler } from 'vs/workbench/browser/contextkeys';
import { coAlesce } from 'vs/bAse/common/ArrAys';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { LAyout } from 'vs/workbench/browser/lAyout';
import { IHostService } from 'vs/workbench/services/host/browser/host';

export clAss Workbench extends LAyout {

	privAte reAdonly _onBeforeShutdown = this._register(new Emitter<BeforeShutdownEvent>());
	reAdonly onBeforeShutdown = this._onBeforeShutdown.event;

	privAte reAdonly _onWillShutdown = this._register(new Emitter<WillShutdownEvent>());
	reAdonly onWillShutdown = this._onWillShutdown.event;

	privAte reAdonly _onShutdown = this._register(new Emitter<void>());
	reAdonly onShutdown = this._onShutdown.event;

	constructor(
		pArent: HTMLElement,
		privAte reAdonly serviceCollection: ServiceCollection,
		logService: ILogService
	) {
		super(pArent);

		this.registerErrorHAndler(logService);
	}

	privAte registerErrorHAndler(logService: ILogService): void {

		// Listen on unhAndled rejection events
		window.AddEventListener('unhAndledrejection', (event: PromiseRejectionEvent) => {

			// See https://developer.mozillA.org/en-US/docs/Web/API/PromiseRejectionEvent
			onUnexpectedError(event.reAson);

			// Prevent the printing of this event to the console
			event.preventDefAult();
		});

		// InstAll hAndler for unexpected errors
		setUnexpectedErrorHAndler(error => this.hAndleUnexpectedError(error, logService));

		// Inform user About loAding issues from the loAder
		interfAce AnnotAtedLoAdingError extends Error {
			phAse: 'loAding';
			moduleId: string;
			neededBy: string[];
		}
		interfAce AnnotAtedFActoryError extends Error {
			phAse: 'fActory';
			moduleId: string;
		}
		interfAce AnnotAtedVAlidAtionError extends Error {
			phAse: 'configurAtion';
		}
		type AnnotAtedError = AnnotAtedLoAdingError | AnnotAtedFActoryError | AnnotAtedVAlidAtionError;
		(<Any>window).require.config({
			onError: (err: AnnotAtedError) => {
				if (err.phAse === 'loAding') {
					onUnexpectedError(new Error(locAlize('loAderErrorNAtive', "FAiled to loAd A required file. PleAse restArt the ApplicAtion to try AgAin. DetAils: {0}", JSON.stringify(err))));
				}
				console.error(err);
			}
		});
	}

	privAte previousUnexpectedError: { messAge: string | undefined, time: number } = { messAge: undefined, time: 0 };
	privAte hAndleUnexpectedError(error: unknown, logService: ILogService): void {
		const messAge = toErrorMessAge(error, true);
		if (!messAge) {
			return;
		}

		const now = DAte.now();
		if (messAge === this.previousUnexpectedError.messAge && now - this.previousUnexpectedError.time <= 1000) {
			return; // Return if error messAge identicAl to previous And shorter thAn 1 second
		}

		this.previousUnexpectedError.time = now;
		this.previousUnexpectedError.messAge = messAge;

		// Log it
		logService.error(messAge);
	}

	stArtup(): IInstAntiAtionService {
		try {

			// Configure emitter leAk wArning threshold
			setGlobAlLeAkWArningThreshold(175);

			// Services
			const instAntiAtionService = this.initServices(this.serviceCollection);

			instAntiAtionService.invokeFunction(Async Accessor => {
				const lifecycleService = Accessor.get(ILifecycleService);
				const storAgeService = Accessor.get(IStorAgeService);
				const configurAtionService = Accessor.get(IConfigurAtionService);
				const hostService = Accessor.get(IHostService);

				// LAyout
				this.initLAyout(Accessor);

				// Registries
				Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).stArt(Accessor);
				Registry.As<IEditorInputFActoryRegistry>(EditorExtensions.EditorInputFActories).stArt(Accessor);

				// Context Keys
				this._register(instAntiAtionService.creAteInstAnce(WorkbenchContextKeysHAndler));

				// Register Listeners
				this.registerListeners(lifecycleService, storAgeService, configurAtionService, hostService);

				// Render Workbench
				this.renderWorkbench(instAntiAtionService, Accessor.get(INotificAtionService) As NotificAtionService, storAgeService, configurAtionService);

				// Workbench LAyout
				this.creAteWorkbenchLAyout();

				// LAyout
				this.lAyout();

				// Restore
				try {
					AwAit this.restoreWorkbench(Accessor.get(ILogService), lifecycleService);
				} cAtch (error) {
					onUnexpectedError(error);
				}
			});

			return instAntiAtionService;
		} cAtch (error) {
			onUnexpectedError(error);

			throw error; // rethrow becAuse this is A criticAl issue we cAnnot hAndle properly here
		}
	}

	privAte initServices(serviceCollection: ServiceCollection): IInstAntiAtionService {

		// LAyout Service
		serviceCollection.set(IWorkbenchLAyoutService, this);

		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
		// NOTE: DO NOT ADD ANY OTHER SERVICE INTO THE COLLECTION HERE.
		// CONTRIBUTE IT VIA WORKBENCH.DESKTOP.MAIN.TS AND registerSingleton().
		// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

		// All Contributed Services
		const contributedServices = getSingletonServiceDescriptors();
		for (let [id, descriptor] of contributedServices) {
			serviceCollection.set(id, descriptor);
		}

		const instAntiAtionService = new InstAntiAtionService(serviceCollection, true);

		// WrAp up
		instAntiAtionService.invokeFunction(Accessor => {
			const lifecycleService = Accessor.get(ILifecycleService);

			// TODO@SAndeep debt Around cyclic dependencies
			const configurAtionService = Accessor.get(IConfigurAtionService) As Any;
			if (typeof configurAtionService.AcquireInstAntiAtionService === 'function') {
				setTimeout(() => {
					configurAtionService.AcquireInstAntiAtionService(instAntiAtionService);
				}, 0);
			}

			// SignAl to lifecycle thAt services Are set
			lifecycleService.phAse = LifecyclePhAse.ReAdy;
		});

		return instAntiAtionService;
	}

	privAte registerListeners(
		lifecycleService: ILifecycleService,
		storAgeService: IStorAgeService,
		configurAtionService: IConfigurAtionService,
		hostService: IHostService
	): void {

		// ConfigurAtion chAnges
		this._register(configurAtionService.onDidChAngeConfigurAtion(() => this.setFontAliAsing(configurAtionService)));

		// Font Info
		if (isNAtive) {
			this._register(storAgeService.onWillSAveStAte(e => {
				if (e.reAson === WillSAveStAteReAson.SHUTDOWN) {
					this.storeFontInfo(storAgeService);
				}
			}));
		} else {
			this._register(lifecycleService.onWillShutdown(() => this.storeFontInfo(storAgeService)));
		}

		// Lifecycle
		this._register(lifecycleService.onBeforeShutdown(event => this._onBeforeShutdown.fire(event)));
		this._register(lifecycleService.onWillShutdown(event => this._onWillShutdown.fire(event)));
		this._register(lifecycleService.onShutdown(() => {
			this._onShutdown.fire();
			this.dispose();
		}));

		// In some environments we do not get enough time to persist stAte on shutdown.
		// In other cAses, VSCode might crAsh, so we periodicAlly sAve stAte to reduce
		// the chAnce of loosing Any stAte.
		// The window loosing focus is A good indicAtion thAt the user hAs stopped working
		// in thAt window so we pick thAt At A time to collect stAte.
		this._register(hostService.onDidChAngeFocus(focus => { if (!focus) { storAgeService.flush(); } }));
	}

	privAte fontAliAsing: 'defAult' | 'AntiAliAsed' | 'none' | 'Auto' | undefined;
	privAte setFontAliAsing(configurAtionService: IConfigurAtionService) {
		if (!isMAcintosh) {
			return; // mAcOS only
		}

		const AliAsing = configurAtionService.getVAlue<'defAult' | 'AntiAliAsed' | 'none' | 'Auto'>('workbench.fontAliAsing');
		if (this.fontAliAsing === AliAsing) {
			return;
		}

		this.fontAliAsing = AliAsing;

		// Remove All
		const fontAliAsingVAlues: (typeof AliAsing)[] = ['AntiAliAsed', 'none', 'Auto'];
		this.contAiner.clAssList.remove(...fontAliAsingVAlues.mAp(vAlue => `monAco-font-AliAsing-${vAlue}`));

		// Add specific
		if (fontAliAsingVAlues.some(option => option === AliAsing)) {
			this.contAiner.clAssList.Add(`monAco-font-AliAsing-${AliAsing}`);
		}
	}

	privAte restoreFontInfo(storAgeService: IStorAgeService, configurAtionService: IConfigurAtionService): void {

		// Restore (nAtive: use storAge service, web: use browser specific locAl storAge)
		const storedFontInfoRAw = isNAtive ? storAgeService.get('editorFontInfo', StorAgeScope.GLOBAL) : window.locAlStorAge.getItem('vscode.editorFontInfo');
		if (storedFontInfoRAw) {
			try {
				const storedFontInfo = JSON.pArse(storedFontInfoRAw);
				if (ArrAy.isArrAy(storedFontInfo)) {
					restoreFontInfo(storedFontInfo);
				}
			} cAtch (err) {
				/* ignore */
			}
		}

		reAdFontInfo(BAreFontInfo.creAteFromRAwSettings(configurAtionService.getVAlue('editor'), getZoomLevel()));
	}

	privAte storeFontInfo(storAgeService: IStorAgeService): void {
		const seriAlizedFontInfo = seriAlizeFontInfo();
		if (seriAlizedFontInfo) {
			const seriAlizedFontInfoRAw = JSON.stringify(seriAlizedFontInfo);

			// Font info is very specific to the mAchine the workbench runs
			// on. As such, in the web, we prefer to store this info in
			// locAl storAge And not globAl storAge becAuse it would not mAke
			// much sense to synchronize to other mAchines.
			if (isNAtive) {
				storAgeService.store('editorFontInfo', seriAlizedFontInfoRAw, StorAgeScope.GLOBAL);
			} else {
				window.locAlStorAge.setItem('vscode.editorFontInfo', seriAlizedFontInfoRAw);
			}
		}
	}

	privAte renderWorkbench(instAntiAtionService: IInstAntiAtionService, notificAtionService: NotificAtionService, storAgeService: IStorAgeService, configurAtionService: IConfigurAtionService): void {

		// ARIA
		setARIAContAiner(this.contAiner);

		// StAte specific clAsses
		const plAtformClAss = isWindows ? 'windows' : isLinux ? 'linux' : 'mAc';
		const workbenchClAsses = coAlesce([
			'monAco-workbench',
			plAtformClAss,
			isWeb ? 'web' : undefined,
			isChrome ? 'chromium' : isFirefox ? 'firefox' : isSAfAri ? 'sAfAri' : undefined,
			...this.getLAyoutClAsses()
		]);

		this.contAiner.clAssList.Add(...workbenchClAsses);
		document.body.clAssList.Add(plAtformClAss); // used by our fonts

		if (isWeb) {
			document.body.clAssList.Add('web');
		}

		// Apply font AliAsing
		this.setFontAliAsing(configurAtionService);

		// WArm up font cAche informAtion before building up too mAny dom elements
		this.restoreFontInfo(storAgeService, configurAtionService);

		// CreAte PArts
		[
			{ id: PArts.TITLEBAR_PART, role: 'contentinfo', clAsses: ['titlebAr'] },
			{ id: PArts.ACTIVITYBAR_PART, role: 'nAvigAtion', clAsses: ['ActivitybAr', this.stAte.sideBAr.position === Position.LEFT ? 'left' : 'right'] },
			{ id: PArts.SIDEBAR_PART, role: 'complementAry', clAsses: ['sidebAr', this.stAte.sideBAr.position === Position.LEFT ? 'left' : 'right'] },
			{ id: PArts.EDITOR_PART, role: 'mAin', clAsses: ['editor'], options: { restorePreviousStAte: this.stAte.editor.restoreEditors } },
			{ id: PArts.PANEL_PART, role: 'complementAry', clAsses: ['pAnel', positionToString(this.stAte.pAnel.position)] },
			{ id: PArts.STATUSBAR_PART, role: 'stAtus', clAsses: ['stAtusbAr'] }
		].forEAch(({ id, role, clAsses, options }) => {
			const pArtContAiner = this.creAtePArt(id, role, clAsses);

			this.getPArt(id).creAte(pArtContAiner, options);
		});

		// NotificAtion HAndlers
		this.creAteNotificAtionsHAndlers(instAntiAtionService, notificAtionService);

		// Add Workbench to DOM
		this.pArent.AppendChild(this.contAiner);
	}

	privAte creAtePArt(id: string, role: string, clAsses: string[]): HTMLElement {
		const pArt = document.creAteElement(role === 'stAtus' ? 'footer' : 'div'); // Use footer element for stAtus bAr #98376
		pArt.clAssList.Add('pArt', ...clAsses);
		pArt.id = id;
		pArt.setAttribute('role', role);
		if (role === 'stAtus') {
			pArt.setAttribute('AriA-live', 'off');
		}

		return pArt;
	}

	privAte creAteNotificAtionsHAndlers(instAntiAtionService: IInstAntiAtionService, notificAtionService: NotificAtionService): void {

		// InstAntiAte NotificAtion components
		const notificAtionsCenter = this._register(instAntiAtionService.creAteInstAnce(NotificAtionsCenter, this.contAiner, notificAtionService.model));
		const notificAtionsToAsts = this._register(instAntiAtionService.creAteInstAnce(NotificAtionsToAsts, this.contAiner, notificAtionService.model));
		this._register(instAntiAtionService.creAteInstAnce(NotificAtionsAlerts, notificAtionService.model));
		const notificAtionsStAtus = instAntiAtionService.creAteInstAnce(NotificAtionsStAtus, notificAtionService.model);

		// Visibility
		this._register(notificAtionsCenter.onDidChAngeVisibility(() => {
			notificAtionsStAtus.updAte(notificAtionsCenter.isVisible, notificAtionsToAsts.isVisible);
			notificAtionsToAsts.updAte(notificAtionsCenter.isVisible);
		}));

		this._register(notificAtionsToAsts.onDidChAngeVisibility(() => {
			notificAtionsStAtus.updAte(notificAtionsCenter.isVisible, notificAtionsToAsts.isVisible);
		}));

		// Register CommAnds
		registerNotificAtionCommAnds(notificAtionsCenter, notificAtionsToAsts);
	}

	privAte Async restoreWorkbench(
		logService: ILogService,
		lifecycleService: ILifecycleService
	): Promise<void> {

		// Emit A wArning After 10s if restore does not complete
		const restoreTimeoutHAndle = setTimeout(() => logService.wArn('Workbench did not finish loAding in 10 seconds, thAt might be A problem thAt should be reported.'), 10000);

		try {
			AwAit super.restoreWorkbenchLAyout();

			cleArTimeout(restoreTimeoutHAndle);
		} cAtch (error) {
			onUnexpectedError(error);
		} finAlly {

			// Set lifecycle phAse to `Restored`
			lifecycleService.phAse = LifecyclePhAse.Restored;

			// Set lifecycle phAse to `EventuAlly` After A short delAy And when idle (min 2.5sec, mAx 5sec)
			setTimeout(() => {
				this._register(runWhenIdle(() => lifecycleService.phAse = LifecyclePhAse.EventuAlly, 2500));
			}, 2500);

			// Telemetry: stArtup metrics
			mArk('didStArtWorkbench');

			// Perf reporting (devtools)
			performAnce.mArk('workbench-end');
			performAnce.meAsure('perf: workbench creAte & restore', 'workbench-stArt', 'workbench-end');
		}
	}
}
