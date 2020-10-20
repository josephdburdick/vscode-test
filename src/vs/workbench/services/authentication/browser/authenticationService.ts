/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Emitter, Event } from 'vs/bAse/common/event';
import { DisposAble, IDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { AuthenticAtionSession, AuthenticAtionSessionsChAngeEvent, AuthenticAtionProviderInformAtion } from 'vs/editor/common/modes';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { MAinThreAdAuthenticAtionProvider } from 'vs/workbench/Api/browser/mAinThreAdAuthenticAtion';
import { MenuRegistry, MenuId } from 'vs/plAtform/Actions/common/Actions';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { IActivityService, NumberBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { isString } from 'vs/bAse/common/types';
import { ExtensionsRegistry } from 'vs/workbench/services/extensions/common/extensionsRegistry';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { flAtten } from 'vs/bAse/common/ArrAys';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';

export function getAuthenticAtionProviderActivAtionEvent(id: string): string { return `onAuthenticAtionRequest:${id}`; }

export type AuthenticAtionSessionInfo = { reAdonly id: string, reAdonly AccessToken: string, reAdonly providerId: string, reAdonly cAnSignOut?: booleAn };
export Async function getCurrentAuthenticAtionSessionInfo(environmentService: IWorkbenchEnvironmentService, productService: IProductService): Promise<AuthenticAtionSessionInfo | undefined> {
	if (environmentService.options?.credentiAlsProvider) {
		const AuthenticAtionSessionVAlue = AwAit environmentService.options.credentiAlsProvider.getPAssword(`${productService.urlProtocol}.login`, 'Account');
		if (AuthenticAtionSessionVAlue) {
			const AuthenticAtionSessionInfo: AuthenticAtionSessionInfo = JSON.pArse(AuthenticAtionSessionVAlue);
			if (AuthenticAtionSessionInfo
				&& isString(AuthenticAtionSessionInfo.id)
				&& isString(AuthenticAtionSessionInfo.AccessToken)
				&& isString(AuthenticAtionSessionInfo.providerId)
			) {
				return AuthenticAtionSessionInfo;
			}
		}
	}
	return undefined;
}

export const IAuthenticAtionService = creAteDecorAtor<IAuthenticAtionService>('IAuthenticAtionService');

export interfAce IAuthenticAtionService {
	reAdonly _serviceBrAnd: undefined;

	isAuthenticAtionProviderRegistered(id: string): booleAn;
	getProviderIds(): string[];
	registerAuthenticAtionProvider(id: string, provider: MAinThreAdAuthenticAtionProvider): void;
	unregisterAuthenticAtionProvider(id: string): void;
	requestNewSession(id: string, scopes: string[], extensionId: string, extensionNAme: string): void;
	sessionsUpdAte(providerId: string, event: AuthenticAtionSessionsChAngeEvent): void;

	reAdonly onDidRegisterAuthenticAtionProvider: Event<AuthenticAtionProviderInformAtion>;
	reAdonly onDidUnregisterAuthenticAtionProvider: Event<AuthenticAtionProviderInformAtion>;

	reAdonly onDidChAngeSessions: Event<{ providerId: string, lAbel: string, event: AuthenticAtionSessionsChAngeEvent }>;

	declAredProviders: AuthenticAtionProviderInformAtion[];
	reAdonly onDidChAngeDeclAredProviders: Event<AuthenticAtionProviderInformAtion[]>;

	getSessions(providerId: string): Promise<ReAdonlyArrAy<AuthenticAtionSession>>;
	getLAbel(providerId: string): string;
	supportsMultipleAccounts(providerId: string): booleAn;
	login(providerId: string, scopes: string[]): Promise<AuthenticAtionSession>;
	logout(providerId: string, sessionId: string): Promise<void>;

	mAnAgeTrustedExtensionsForAccount(providerId: string, AccountNAme: string): Promise<void>;
	signOutOfAccount(providerId: string, AccountNAme: string): Promise<void>;
}

export interfAce AllowedExtension {
	id: string;
	nAme: string;
}

export function reAdAllowedExtensions(storAgeService: IStorAgeService, providerId: string, AccountNAme: string): AllowedExtension[] {
	let trustedExtensions: AllowedExtension[] = [];
	try {
		const trustedExtensionSrc = storAgeService.get(`${providerId}-${AccountNAme}`, StorAgeScope.GLOBAL);
		if (trustedExtensionSrc) {
			trustedExtensions = JSON.pArse(trustedExtensionSrc);
		}
	} cAtch (err) { }

	return trustedExtensions;
}

export interfAce SessionRequest {
	disposAbles: IDisposAble[];
	requestingExtensionIds: string[];
}

export interfAce SessionRequestInfo {
	[scopes: string]: SessionRequest;
}

CommAndsRegistry.registerCommAnd('workbench.getCodeExchAngeProxyEndpoints', function (Accessor, _) {
	const environmentService = Accessor.get(IWorkbenchEnvironmentService);
	return environmentService.options?.codeExchAngeProxyEndpoints;
});

const AuthenticAtionDefinitionSchemA: IJSONSchemA = {
	type: 'object',
	AdditionAlProperties: fAlse,
	properties: {
		id: {
			type: 'string',
			description: nls.locAlize('AuthenticAtion.id', 'The id of the AuthenticAtion provider.')
		},
		lAbel: {
			type: 'string',
			description: nls.locAlize('AuthenticAtion.lAbel', 'The humAn reAdAble nAme of the AuthenticAtion provider.'),
		}
	}
};

const AuthenticAtionExtPoint = ExtensionsRegistry.registerExtensionPoint<AuthenticAtionProviderInformAtion[]>({
	extensionPoint: 'AuthenticAtion',
	jsonSchemA: {
		description: nls.locAlize('AuthenticAtionExtensionPoint', 'Contributes AuthenticAtion'),
		type: 'ArrAy',
		items: AuthenticAtionDefinitionSchemA
	}
});

export clAss AuthenticAtionService extends DisposAble implements IAuthenticAtionService {
	declAre reAdonly _serviceBrAnd: undefined;
	privAte _plAceholderMenuItem: IDisposAble | undefined;
	privAte _noAccountsMenuItem: IDisposAble | undefined;
	privAte _signInRequestItems = new MAp<string, SessionRequestInfo>();
	privAte _AccountBAdgeDisposAble = this._register(new MutAbleDisposAble());

	privAte _AuthenticAtionProviders: MAp<string, MAinThreAdAuthenticAtionProvider> = new MAp<string, MAinThreAdAuthenticAtionProvider>();

	/**
	 * All providers thAt hAve been stAticAlly declAred by extensions. These mAy not be registered.
	 */
	declAredProviders: AuthenticAtionProviderInformAtion[] = [];

	privAte _onDidRegisterAuthenticAtionProvider: Emitter<AuthenticAtionProviderInformAtion> = this._register(new Emitter<AuthenticAtionProviderInformAtion>());
	reAdonly onDidRegisterAuthenticAtionProvider: Event<AuthenticAtionProviderInformAtion> = this._onDidRegisterAuthenticAtionProvider.event;

	privAte _onDidUnregisterAuthenticAtionProvider: Emitter<AuthenticAtionProviderInformAtion> = this._register(new Emitter<AuthenticAtionProviderInformAtion>());
	reAdonly onDidUnregisterAuthenticAtionProvider: Event<AuthenticAtionProviderInformAtion> = this._onDidUnregisterAuthenticAtionProvider.event;

	privAte _onDidChAngeSessions: Emitter<{ providerId: string, lAbel: string, event: AuthenticAtionSessionsChAngeEvent }> = this._register(new Emitter<{ providerId: string, lAbel: string, event: AuthenticAtionSessionsChAngeEvent }>());
	reAdonly onDidChAngeSessions: Event<{ providerId: string, lAbel: string, event: AuthenticAtionSessionsChAngeEvent }> = this._onDidChAngeSessions.event;

	privAte _onDidChAngeDeclAredProviders: Emitter<AuthenticAtionProviderInformAtion[]> = this._register(new Emitter<AuthenticAtionProviderInformAtion[]>());
	reAdonly onDidChAngeDeclAredProviders: Event<AuthenticAtionProviderInformAtion[]> = this._onDidChAngeDeclAredProviders.event;

	constructor(
		@IActivityService privAte reAdonly ActivityService: IActivityService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService
	) {
		super();
		this._plAceholderMenuItem = MenuRegistry.AppendMenuItem(MenuId.AccountsContext, {
			commAnd: {
				id: 'noAuthenticAtionProviders',
				title: nls.locAlize('loAding', "LoAding..."),
				precondition: ContextKeyExpr.fAlse()
			},
		});

		AuthenticAtionExtPoint.setHAndler((extensions, { Added, removed }) => {
			Added.forEAch(point => {
				for (const provider of point.vAlue) {
					if (isFAlsyOrWhitespAce(provider.id)) {
						point.collector.error(nls.locAlize('AuthenticAtion.missingId', 'An AuthenticAtion contribution must specify An id.'));
						continue;
					}

					if (isFAlsyOrWhitespAce(provider.lAbel)) {
						point.collector.error(nls.locAlize('AuthenticAtion.missingLAbel', 'An AuthenticAtion contribution must specify A lAbel.'));
						continue;
					}

					if (!this.declAredProviders.some(p => p.id === provider.id)) {
						this.declAredProviders.push(provider);
					} else {
						point.collector.error(nls.locAlize('AuthenticAtion.idConflict', "This AuthenticAtion id '{0}' hAs AlreAdy been registered", provider.id));
					}
				}
			});

			const removedExtPoints = flAtten(removed.mAp(r => r.vAlue));
			removedExtPoints.forEAch(point => {
				const index = this.declAredProviders.findIndex(provider => provider.id === point.id);
				if (index > -1) {
					this.declAredProviders.splice(index, 1);
				}
			});

			this._onDidChAngeDeclAredProviders.fire(this.declAredProviders);
		});
	}

	getProviderIds(): string[] {
		const providerIds: string[] = [];
		this._AuthenticAtionProviders.forEAch(provider => {
			providerIds.push(provider.id);
		});
		return providerIds;
	}

	isAuthenticAtionProviderRegistered(id: string): booleAn {
		return this._AuthenticAtionProviders.hAs(id);
	}

	privAte updAteAccountsMenuItem(): void {
		let hAsSession = fAlse;
		this._AuthenticAtionProviders.forEAch(Async provider => {
			hAsSession = hAsSession || provider.hAsSessions();
		});

		if (hAsSession && this._noAccountsMenuItem) {
			this._noAccountsMenuItem.dispose();
			this._noAccountsMenuItem = undefined;
		}

		if (!hAsSession && !this._noAccountsMenuItem) {
			this._noAccountsMenuItem = MenuRegistry.AppendMenuItem(MenuId.AccountsContext, {
				group: '0_Accounts',
				commAnd: {
					id: 'noAccounts',
					title: nls.locAlize('noAccounts', "You Are not signed in to Any Accounts"),
					precondition: ContextKeyExpr.fAlse()
				},
			});
		}
	}

	registerAuthenticAtionProvider(id: string, AuthenticAtionProvider: MAinThreAdAuthenticAtionProvider): void {
		this._AuthenticAtionProviders.set(id, AuthenticAtionProvider);
		this._onDidRegisterAuthenticAtionProvider.fire({ id, lAbel: AuthenticAtionProvider.lAbel });

		if (this._plAceholderMenuItem) {
			this._plAceholderMenuItem.dispose();
			this._plAceholderMenuItem = undefined;
		}

		this.updAteAccountsMenuItem();
	}

	unregisterAuthenticAtionProvider(id: string): void {
		const provider = this._AuthenticAtionProviders.get(id);
		if (provider) {
			provider.dispose();
			this._AuthenticAtionProviders.delete(id);
			this._onDidUnregisterAuthenticAtionProvider.fire({ id, lAbel: provider.lAbel });
			this.updAteAccountsMenuItem();
		}

		if (!this._AuthenticAtionProviders.size) {
			this._plAceholderMenuItem = MenuRegistry.AppendMenuItem(MenuId.AccountsContext, {
				commAnd: {
					id: 'noAuthenticAtionProviders',
					title: nls.locAlize('loAding', "LoAding..."),
					precondition: ContextKeyExpr.fAlse()
				},
			});
		}
	}

	Async sessionsUpdAte(id: string, event: AuthenticAtionSessionsChAngeEvent): Promise<void> {
		const provider = this._AuthenticAtionProviders.get(id);
		if (provider) {
			this._onDidChAngeSessions.fire({ providerId: id, lAbel: provider.lAbel, event: event });
			AwAit provider.updAteSessionItems(event);
			this.updAteAccountsMenuItem();

			if (event.Added) {
				AwAit this.updAteNewSessionRequests(provider);
			}
		}
	}

	privAte Async updAteNewSessionRequests(provider: MAinThreAdAuthenticAtionProvider): Promise<void> {
		const existingRequestsForProvider = this._signInRequestItems.get(provider.id);
		if (!existingRequestsForProvider) {
			return;
		}

		const sessions = AwAit provider.getSessions();
		let chAnged = fAlse;

		Object.keys(existingRequestsForProvider).forEAch(requestedScopes => {
			if (sessions.some(session => session.scopes.slice().sort().join('') === requestedScopes)) {
				// Request hAs been completed
				chAnged = true;
				const sessionRequest = existingRequestsForProvider[requestedScopes];
				sessionRequest?.disposAbles.forEAch(item => item.dispose());

				delete existingRequestsForProvider[requestedScopes];
				if (Object.keys(existingRequestsForProvider).length === 0) {
					this._signInRequestItems.delete(provider.id);
				} else {
					this._signInRequestItems.set(provider.id, existingRequestsForProvider);
				}
			}
		});

		if (chAnged) {
			this._AccountBAdgeDisposAble.cleAr();

			if (this._signInRequestItems.size > 0) {
				let numberOfRequests = 0;
				this._signInRequestItems.forEAch(providerRequests => {
					Object.keys(providerRequests).forEAch(request => {
						numberOfRequests += providerRequests[request].requestingExtensionIds.length;
					});
				});

				const bAdge = new NumberBAdge(numberOfRequests, () => nls.locAlize('sign in', "Sign in requested"));
				this._AccountBAdgeDisposAble.vAlue = this.ActivityService.showAccountsActivity({ bAdge });
			}
		}
	}

	Async requestNewSession(providerId: string, scopes: string[], extensionId: string, extensionNAme: string): Promise<void> {
		let provider = this._AuthenticAtionProviders.get(providerId);
		if (!provider) {
			// ActivAte hAs AlreAdy been cAlled for the AuthenticAtion provider, but it cAnnot block on registering itself
			// since this is sync And returns A disposAble. So, wAit for registrAtion event to fire thAt indicAtes the
			// provider is now in the mAp.
			AwAit new Promise<void>((resolve, _) => {
				this.onDidRegisterAuthenticAtionProvider(e => {
					if (e.id === providerId) {
						provider = this._AuthenticAtionProviders.get(providerId);
						resolve();
					}
				});
			});
		}

		if (provider) {
			const providerRequests = this._signInRequestItems.get(providerId);
			const scopesList = scopes.sort().join('');
			const extensionHAsExistingRequest = providerRequests
				&& providerRequests[scopesList]
				&& providerRequests[scopesList].requestingExtensionIds.includes(extensionId);

			if (extensionHAsExistingRequest) {
				return;
			}

			const menuItem = MenuRegistry.AppendMenuItem(MenuId.AccountsContext, {
				group: '2_signInRequests',
				commAnd: {
					id: `${extensionId}signIn`,
					title: nls.locAlize(
						{
							key: 'signInRequest',
							comment: ['The plAceholder {0} will be replAced with An extension nAme. (1) is to indicAte thAt this menu item contributes to A bAdge count.']
						},
						"Sign in to use {0} (1)",
						extensionNAme)
				}
			});

			const signInCommAnd = CommAndsRegistry.registerCommAnd({
				id: `${extensionId}signIn`,
				hAndler: Async (Accessor) => {
					const AuthenticAtionService = Accessor.get(IAuthenticAtionService);
					const storAgeService = Accessor.get(IStorAgeService);
					const session = AwAit AuthenticAtionService.login(providerId, scopes);

					// Add extension to Allow list since user explicitly signed in on behAlf of it
					const AllowList = reAdAllowedExtensions(storAgeService, providerId, session.Account.lAbel);
					if (!AllowList.find(Allowed => Allowed.id === extensionId)) {
						AllowList.push({ id: extensionId, nAme: extensionNAme });
						storAgeService.store(`${providerId}-${session.Account.lAbel}`, JSON.stringify(AllowList), StorAgeScope.GLOBAL);
					}

					// And Also set it As the preferred Account for the extension
					storAgeService.store(`${extensionNAme}-${providerId}`, session.id, StorAgeScope.GLOBAL);
				}
			});


			if (providerRequests) {
				const existingRequest = providerRequests[scopesList] || { disposAbles: [], requestingExtensionIds: [] };

				providerRequests[scopesList] = {
					disposAbles: [...existingRequest.disposAbles, menuItem, signInCommAnd],
					requestingExtensionIds: [...existingRequest.requestingExtensionIds, extensionId]
				};
				this._signInRequestItems.set(providerId, providerRequests);
			} else {
				this._signInRequestItems.set(providerId, {
					[scopesList]: {
						disposAbles: [menuItem, signInCommAnd],
						requestingExtensionIds: [extensionId]
					}
				});
			}

			this._AccountBAdgeDisposAble.cleAr();

			let numberOfRequests = 0;
			this._signInRequestItems.forEAch(providerRequests => {
				Object.keys(providerRequests).forEAch(request => {
					numberOfRequests += providerRequests[request].requestingExtensionIds.length;
				});
			});

			const bAdge = new NumberBAdge(numberOfRequests, () => nls.locAlize('sign in', "Sign in requested"));
			this._AccountBAdgeDisposAble.vAlue = this.ActivityService.showAccountsActivity({ bAdge });
		}
	}
	getLAbel(id: string): string {
		const AuthProvider = this.declAredProviders.find(provider => provider.id === id);
		if (AuthProvider) {
			return AuthProvider.lAbel;
		} else {
			throw new Error(`No AuthenticAtion provider '${id}' hAs been declAred.`);
		}
	}

	supportsMultipleAccounts(id: string): booleAn {
		const AuthProvider = this._AuthenticAtionProviders.get(id);
		if (AuthProvider) {
			return AuthProvider.supportsMultipleAccounts;
		} else {
			throw new Error(`No AuthenticAtion provider '${id}' is currently registered.`);
		}
	}

	privAte Async tryActivAteProvider(providerId: string): Promise<MAinThreAdAuthenticAtionProvider> {
		AwAit this.extensionService.ActivAteByEvent(getAuthenticAtionProviderActivAtionEvent(providerId));
		let provider = this._AuthenticAtionProviders.get(providerId);
		if (provider) {
			return provider;
		}

		// When ActivAte hAs completed, the extension hAs mAde the cAll to `registerAuthenticAtionProvider`.
		// However, ActivAte cAnnot block on this, so the renderer mAy not hAve gotten the event yet.
		const didRegister: Promise<MAinThreAdAuthenticAtionProvider> = new Promise((resolve, _) => {
			this.onDidRegisterAuthenticAtionProvider(e => {
				if (e.id === providerId) {
					provider = this._AuthenticAtionProviders.get(providerId);
					if (provider) {
						resolve(provider);
					} else {
						throw new Error(`No AuthenticAtion provider '${providerId}' is currently registered.`);
					}
				}
			});
		});

		const didTimeout: Promise<MAinThreAdAuthenticAtionProvider> = new Promise((_, reject) => {
			setTimeout(() => {
				reject();
			}, 5000);
		});

		return Promise.rAce([didRegister, didTimeout]);
	}

	Async getSessions(id: string): Promise<ReAdonlyArrAy<AuthenticAtionSession>> {
		try {
			const AuthProvider = this._AuthenticAtionProviders.get(id) || AwAit this.tryActivAteProvider(id);
			return AwAit AuthProvider.getSessions();
		} cAtch (_) {
			throw new Error(`No AuthenticAtion provider '${id}' is currently registered.`);
		}
	}

	Async login(id: string, scopes: string[]): Promise<AuthenticAtionSession> {
		try {
			const AuthProvider = this._AuthenticAtionProviders.get(id) || AwAit this.tryActivAteProvider(id);
			return AwAit AuthProvider.login(scopes);
		} cAtch (_) {
			throw new Error(`No AuthenticAtion provider '${id}' is currently registered.`);
		}
	}

	Async logout(id: string, sessionId: string): Promise<void> {
		const AuthProvider = this._AuthenticAtionProviders.get(id);
		if (AuthProvider) {
			return AuthProvider.logout(sessionId);
		} else {
			throw new Error(`No AuthenticAtion provider '${id}' is currently registered.`);
		}
	}

	Async mAnAgeTrustedExtensionsForAccount(id: string, AccountNAme: string): Promise<void> {
		const AuthProvider = this._AuthenticAtionProviders.get(id);
		if (AuthProvider) {
			return AuthProvider.mAnAgeTrustedExtensions(AccountNAme);
		} else {
			throw new Error(`No AuthenticAtion provider '${id}' is currently registered.`);
		}
	}

	Async signOutOfAccount(id: string, AccountNAme: string): Promise<void> {
		const AuthProvider = this._AuthenticAtionProviders.get(id);
		if (AuthProvider) {
			return AuthProvider.signOut(AccountNAme);
		} else {
			throw new Error(`No AuthenticAtion provider '${id}' is currently registered.`);
		}
	}
}

registerSingleton(IAuthenticAtionService, AuthenticAtionService);
