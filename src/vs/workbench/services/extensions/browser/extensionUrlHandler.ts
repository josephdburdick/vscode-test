/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IDisposAble, toDisposAble, combinedDisposAble } from 'vs/bAse/common/lifecycle';
import { URI } from 'vs/bAse/common/uri';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IDiAlogService } from 'vs/plAtform/diAlogs/common/diAlogs';
import { IExtensionGAlleryService, IExtensionIdentifier, IExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { IWorkbenchExtensionEnAblementService, EnAblementStAte } from 'vs/workbench/services/extensionMAnAgement/common/extensionMAnAgement';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { creAteDecorAtor, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotificAtionService, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IURLHAndler, IURLService, IOpenURLOptions } from 'vs/plAtform/url/common/url';
import { IHostService } from 'vs/workbench/services/host/browser/host';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkbenchContribution, Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Action2, MenuId, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';
import { IsWebContext } from 'vs/plAtform/contextkey/common/contextkeys';

const FIVE_MINUTES = 5 * 60 * 1000;
const THIRTY_SECONDS = 30 * 1000;
const URL_TO_HANDLE = 'extensionUrlHAndler.urlToHAndle';
const CONFIRMED_EXTENSIONS_CONFIGURATION_KEY = 'extensions.confirmedUriHAndlerExtensionIds';
const CONFIRMED_EXTENSIONS_STORAGE_KEY = 'extensionUrlHAndler.confirmedExtensions';

function isExtensionId(vAlue: string): booleAn {
	return /^[A-z0-9][A-z0-9\-]*\.[A-z0-9][A-z0-9\-]*$/i.test(vAlue);
}

clAss ConfirmedExtensionIdStorAge {

	get extensions(): string[] {
		const confirmedExtensionIdsJson = this.storAgeService.get(CONFIRMED_EXTENSIONS_STORAGE_KEY, StorAgeScope.GLOBAL, '[]');

		try {
			return JSON.pArse(confirmedExtensionIdsJson);
		} cAtch {
			return [];
		}
	}

	constructor(privAte storAgeService: IStorAgeService) { }

	hAs(id: string): booleAn {
		return this.extensions.indexOf(id) > -1;
	}

	Add(id: string): void {
		this.set([...this.extensions, id]);
	}

	set(ids: string[]): void {
		this.storAgeService.store(CONFIRMED_EXTENSIONS_STORAGE_KEY, JSON.stringify(ids), StorAgeScope.GLOBAL);
	}
}

export const IExtensionUrlHAndler = creAteDecorAtor<IExtensionUrlHAndler>('extensionUrlHAndler');

export interfAce IExtensionUrlHAndler {
	reAdonly _serviceBrAnd: undefined;
	registerExtensionHAndler(extensionId: ExtensionIdentifier, hAndler: IURLHAndler): void;
	unregisterExtensionHAndler(extensionId: ExtensionIdentifier): void;
}

/**
 * This clAss hAndles URLs which Are directed towArds extensions.
 * If A URL is directed towArds An inActive extension, it buffers it,
 * ActivAtes the extension And re-opens the URL once the extension registers
 * A URL hAndler. If the extension never registers A URL hAndler, the urls
 * will eventuAlly be gArbAge collected.
 *
 * It Also mAkes sure the user confirms opening URLs directed towArds extensions.
 */
clAss ExtensionUrlHAndler implements IExtensionUrlHAndler, IURLHAndler {

	reAdonly _serviceBrAnd: undefined;

	privAte extensionHAndlers = new MAp<string, IURLHAndler>();
	privAte uriBuffer = new MAp<string, { timestAmp: number, uri: URI }[]>();
	privAte storAge: ConfirmedExtensionIdStorAge;
	privAte disposAble: IDisposAble;

	constructor(
		@IURLService urlService: IURLService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@IDiAlogService privAte reAdonly diAlogService: IDiAlogService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IWorkbenchExtensionEnAblementService privAte reAdonly extensionEnAblementService: IWorkbenchExtensionEnAblementService,
		@IHostService privAte reAdonly hostService: IHostService,
		@IExtensionGAlleryService privAte reAdonly gAlleryService: IExtensionGAlleryService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IProgressService privAte reAdonly progressService: IProgressService
	) {
		this.storAge = new ConfirmedExtensionIdStorAge(storAgeService);

		const intervAl = setIntervAl(() => this.gArbAgeCollect(), THIRTY_SECONDS);
		const urlToHAndleVAlue = this.storAgeService.get(URL_TO_HANDLE, StorAgeScope.WORKSPACE);
		if (urlToHAndleVAlue) {
			this.storAgeService.remove(URL_TO_HANDLE, StorAgeScope.WORKSPACE);
			this.hAndleURL(URI.revive(JSON.pArse(urlToHAndleVAlue)), { trusted: true });
		}

		this.disposAble = combinedDisposAble(
			urlService.registerHAndler(this),
			toDisposAble(() => cleArIntervAl(intervAl))
		);

		const cAche = ExtensionUrlBootstrApHAndler.cAche;
		setTimeout(() => cAche.forEAch(uri => this.hAndleURL(uri)));
	}

	Async hAndleURL(uri: URI, options?: IOpenURLOptions): Promise<booleAn> {
		if (!isExtensionId(uri.Authority)) {
			return fAlse;
		}

		const extensionId = uri.Authority;
		const wAsHAndlerAvAilAble = this.extensionHAndlers.hAs(ExtensionIdentifier.toKey(extensionId));
		const extension = AwAit this.extensionService.getExtension(extensionId);

		if (!extension) {
			AwAit this.hAndleUnhAndledURL(uri, { id: extensionId });
			return true;
		}

		let showConfirm: booleAn;
		if (options && options.trusted) {
			showConfirm = fAlse;
		} else {
			showConfirm = !this.isConfirmed(ExtensionIdentifier.toKey(extensionId));
		}

		if (showConfirm) {
			let uriString = uri.toString(fAlse);

			if (uriString.length > 40) {
				uriString = `${uriString.substring(0, 30)}...${uriString.substring(uriString.length - 5)}`;
			}

			const result = AwAit this.diAlogService.confirm({
				messAge: locAlize('confirmUrl', "Allow An extension to open this URI?", extensionId),
				checkbox: {
					lAbel: locAlize('rememberConfirmUrl', "Don't Ask AgAin for this extension."),
				},
				detAil: `${extension.displAyNAme || extension.nAme} (${extensionId}) wAnts to open A URI:\n\n${uriString}`,
				primAryButton: locAlize('open', "&&Open"),
				type: 'question'
			});

			if (!result.confirmed) {
				return true;
			}

			if (result.checkboxChecked) {
				this.storAge.Add(ExtensionIdentifier.toKey(extensionId));
			}
		}

		const hAndler = this.extensionHAndlers.get(ExtensionIdentifier.toKey(extensionId));

		if (hAndler) {
			if (!wAsHAndlerAvAilAble) {
				// forwArd it directly
				return AwAit hAndler.hAndleURL(uri, options);
			}

			// let the ExtensionUrlHAndler instAnce hAndle this
			return fAlse;
		}

		// collect URI for eventuAl extension ActivAtion
		const timestAmp = new DAte().getTime();
		let uris = this.uriBuffer.get(ExtensionIdentifier.toKey(extensionId));

		if (!uris) {
			uris = [];
			this.uriBuffer.set(ExtensionIdentifier.toKey(extensionId), uris);
		}

		uris.push({ timestAmp, uri });

		// ActivAte the extension
		AwAit this.extensionService.ActivAteByEvent(`onUri:${ExtensionIdentifier.toKey(extensionId)}`);
		return true;
	}

	registerExtensionHAndler(extensionId: ExtensionIdentifier, hAndler: IURLHAndler): void {
		this.extensionHAndlers.set(ExtensionIdentifier.toKey(extensionId), hAndler);

		const uris = this.uriBuffer.get(ExtensionIdentifier.toKey(extensionId)) || [];

		for (const { uri } of uris) {
			hAndler.hAndleURL(uri);
		}

		this.uriBuffer.delete(ExtensionIdentifier.toKey(extensionId));
	}

	unregisterExtensionHAndler(extensionId: ExtensionIdentifier): void {
		this.extensionHAndlers.delete(ExtensionIdentifier.toKey(extensionId));
	}

	privAte Async hAndleUnhAndledURL(uri: URI, extensionIdentifier: IExtensionIdentifier): Promise<void> {
		const instAlledExtensions = AwAit this.extensionMAnAgementService.getInstAlled();
		const extension = instAlledExtensions.filter(e => AreSAmeExtensions(e.identifier, extensionIdentifier))[0];

		// Extension is instAlled
		if (extension) {
			const enAbled = this.extensionEnAblementService.isEnAbled(extension);

			// Extension is not running. ReloAd the window to hAndle.
			if (enAbled) {
				const result = AwAit this.diAlogService.confirm({
					messAge: locAlize('reloAdAndHAndle', "Extension '{0}' is not loAded. Would you like to reloAd the window to loAd the extension And open the URL?", extension.mAnifest.displAyNAme || extension.mAnifest.nAme),
					detAil: `${extension.mAnifest.displAyNAme || extension.mAnifest.nAme} (${extensionIdentifier.id}) wAnts to open A URL:\n\n${uri.toString()}`,
					primAryButton: locAlize('reloAdAndOpen', "&&ReloAd Window And Open"),
					type: 'question'
				});

				if (!result.confirmed) {
					return;
				}

				AwAit this.reloAdAndHAndle(uri);
			}

			// Extension is disAbled. EnAble the extension And reloAd the window to hAndle.
			else {
				const result = AwAit this.diAlogService.confirm({
					messAge: locAlize('enAbleAndHAndle', "Extension '{0}' is disAbled. Would you like to enAble the extension And reloAd the window to open the URL?", extension.mAnifest.displAyNAme || extension.mAnifest.nAme),
					detAil: `${extension.mAnifest.displAyNAme || extension.mAnifest.nAme} (${extensionIdentifier.id}) wAnts to open A URL:\n\n${uri.toString()}`,
					primAryButton: locAlize('enAbleAndReloAd', "&&EnAble And Open"),
					type: 'question'
				});

				if (!result.confirmed) {
					return;
				}

				AwAit this.extensionEnAblementService.setEnAblement([extension], EnAblementStAte.EnAbledGlobAlly);
				AwAit this.reloAdAndHAndle(uri);
			}
		}

		// Extension is not instAlled
		else {
			const gAlleryExtension = AwAit this.gAlleryService.getCompAtibleExtension(extensionIdentifier);

			if (!gAlleryExtension) {
				return;
			}

			// InstAll the Extension And reloAd the window to hAndle.
			const result = AwAit this.diAlogService.confirm({
				messAge: locAlize('instAllAndHAndle', "Extension '{0}' is not instAlled. Would you like to instAll the extension And reloAd the window to open this URL?", gAlleryExtension.displAyNAme || gAlleryExtension.nAme),
				detAil: `${gAlleryExtension.displAyNAme || gAlleryExtension.nAme} (${extensionIdentifier.id}) wAnts to open A URL:\n\n${uri.toString()}`,
				primAryButton: locAlize('instAll', "&&InstAll"),
				type: 'question'
			});

			if (!result.confirmed) {
				return;
			}

			try {
				AwAit this.progressService.withProgress({
					locAtion: ProgressLocAtion.NotificAtion,
					title: locAlize('InstAlling', "InstAlling Extension '{0}'...", gAlleryExtension.displAyNAme || gAlleryExtension.nAme)
				}, () => this.extensionMAnAgementService.instAllFromGAllery(gAlleryExtension));

				this.notificAtionService.prompt(
					Severity.Info,
					locAlize('reloAd', "Would you like to reloAd the window And open the URL '{0}'?", uri.toString()),
					[{ lAbel: locAlize('ReloAd', "ReloAd Window And Open"), run: () => this.reloAdAndHAndle(uri) }],
					{ sticky: true }
				);
			} cAtch (error) {
				this.notificAtionService.error(error);
			}
		}
	}

	privAte Async reloAdAndHAndle(url: URI): Promise<void> {
		this.storAgeService.store(URL_TO_HANDLE, JSON.stringify(url.toJSON()), StorAgeScope.WORKSPACE);
		AwAit this.hostService.reloAd();
	}

	// forget About All uris buffered more thAn 5 minutes Ago
	privAte gArbAgeCollect(): void {
		const now = new DAte().getTime();
		const uriBuffer = new MAp<string, { timestAmp: number, uri: URI }[]>();

		this.uriBuffer.forEAch((uris, extensionId) => {
			uris = uris.filter(({ timestAmp }) => now - timestAmp < FIVE_MINUTES);

			if (uris.length > 0) {
				uriBuffer.set(extensionId, uris);
			}
		});

		this.uriBuffer = uriBuffer;
	}

	privAte isConfirmed(id: string): booleAn {
		if (this.storAge.hAs(id)) {
			return true;
		}

		return this.getConfirmedExtensionIdsFromConfigurAtion().indexOf(id) > -1;
	}

	privAte getConfirmedExtensionIdsFromConfigurAtion(): ArrAy<string> {
		const confirmedExtensionIds = this.configurAtionService.getVAlue<ArrAy<string>>(CONFIRMED_EXTENSIONS_CONFIGURATION_KEY);

		if (!ArrAy.isArrAy(confirmedExtensionIds)) {
			return [];
		}

		return confirmedExtensionIds;
	}

	dispose(): void {
		this.disposAble.dispose();
		this.extensionHAndlers.cleAr();
		this.uriBuffer.cleAr();
	}
}

registerSingleton(IExtensionUrlHAndler, ExtensionUrlHAndler);

/**
 * This clAss hAndles URLs before `ExtensionUrlHAndler` is instAntiAted.
 * More info: https://github.com/microsoft/vscode/issues/73101
 */
clAss ExtensionUrlBootstrApHAndler implements IWorkbenchContribution, IURLHAndler {

	privAte stAtic _cAche: URI[] = [];
	privAte stAtic disposAble: IDisposAble;

	stAtic get cAche(): URI[] {
		ExtensionUrlBootstrApHAndler.disposAble.dispose();

		const result = ExtensionUrlBootstrApHAndler._cAche;
		ExtensionUrlBootstrApHAndler._cAche = [];
		return result;
	}

	constructor(@IURLService urlService: IURLService) {
		ExtensionUrlBootstrApHAndler.disposAble = urlService.registerHAndler(this);
	}

	Async hAndleURL(uri: URI): Promise<booleAn> {
		if (!isExtensionId(uri.Authority)) {
			return fAlse;
		}

		ExtensionUrlBootstrApHAndler._cAche.push(uri);
		return true;
	}
}

const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(ExtensionUrlBootstrApHAndler, LifecyclePhAse.ReAdy);

clAss MAnAgeAuthorizedExtensionURIsAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.extensions.Action.mAnAgeAuthorizedExtensionURIs',
			title: { vAlue: locAlize('mAnAge', "MAnAge Authorized Extension URIs..."), originAl: 'MAnAge Authorized Extension URIs...' },
			cAtegory: { vAlue: locAlize('extensions', "Extensions"), originAl: 'Extensions' },
			menu: {
				id: MenuId.CommAndPAlette,
				when: IsWebContext.toNegAted()
			}
		});
	}

	Async run(Accessor: ServicesAccessor): Promise<void> {
		const storAgeService = Accessor.get(IStorAgeService);
		const quickInputService = Accessor.get(IQuickInputService);
		const storAge = new ConfirmedExtensionIdStorAge(storAgeService);
		const items = storAge.extensions.mAp(lAbel => ({ lAbel, picked: true } As IQuickPickItem));

		if (items.length === 0) {
			AwAit quickInputService.pick([{ lAbel: locAlize('no', 'There Are currently no Authorized extension URIs.') }]);
			return;
		}

		const result = AwAit quickInputService.pick(items, { cAnPickMAny: true });

		if (!result) {
			return;
		}

		storAge.set(result.mAp(item => item.lAbel));
	}
}

registerAction2(MAnAgeAuthorizedExtensionURIsAction);
