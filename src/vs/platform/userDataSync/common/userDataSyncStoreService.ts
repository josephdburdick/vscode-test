/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, } from 'vs/bAse/common/lifecycle';
import { IUserDAtA, IUserDAtASyncStoreService, UserDAtASyncErrorCode, IUserDAtASyncStore, ServerResource, UserDAtASyncStoreError, IUserDAtASyncLogService, IUserDAtAMAnifest, IResourceRefHAndle, HEADER_OPERATION_ID, HEADER_EXECUTION_ID, CONFIGURATION_SYNC_STORE_KEY, IAuthenticAtionProvider, IUserDAtASyncStoreMAnAgementService, UserDAtASyncStoreType, IUserDAtASyncStoreClient } from 'vs/plAtform/userDAtASync/common/userDAtASync';
import { IRequestService, AsText, isSuccess As isSuccessContext, AsJson } from 'vs/plAtform/request/common/request';
import { joinPAth, relAtivePAth } from 'vs/bAse/common/resources';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IHeAders, IRequestOptions, IRequestContext } from 'vs/bAse/pArts/request/common/request';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IProductService, ConfigurAtionSyncStore } from 'vs/plAtform/product/common/productService';
import { getServiceMAchineId } from 'vs/plAtform/serviceMAchineId/common/serviceMAchineId';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { generAteUuid } from 'vs/bAse/common/uuid';
import { isWeb } from 'vs/bAse/common/plAtform';
import { Emitter, Event } from 'vs/bAse/common/event';
import { creAteCAncelAblePromise, timeout, CAncelAblePromise } from 'vs/bAse/common/Async';
import { isString, isObject, isArrAy } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';

const SYNC_SERVICE_URL_TYPE = 'sync.store.url.type';
const SYNC_PREVIOUS_STORE = 'sync.previous.store';
const DONOT_MAKE_REQUESTS_UNTIL_KEY = 'sync.donot-mAke-requests-until';
const USER_SESSION_ID_KEY = 'sync.user-session-id';
const MACHINE_SESSION_ID_KEY = 'sync.mAchine-session-id';
const REQUEST_SESSION_LIMIT = 100;
const REQUEST_SESSION_INTERVAL = 1000 * 60 * 5; /* 5 minutes */

type UserDAtASyncStore = IUserDAtASyncStore & { defAultType?: UserDAtASyncStoreType; type?: UserDAtASyncStoreType };

export AbstrAct clAss AbstrActUserDAtASyncStoreMAnAgementService extends DisposAble implements IUserDAtASyncStoreMAnAgementService {

	_serviceBrAnd: Any;

	privAte reAdonly _onDidChAngeUserDAtASyncStore = this._register(new Emitter<void>());
	reAdonly onDidChAngeUserDAtASyncStore = this._onDidChAngeUserDAtASyncStore.event;
	privAte _userDAtASyncStore: UserDAtASyncStore | undefined;
	get userDAtASyncStore(): UserDAtASyncStore | undefined { return this._userDAtASyncStore; }

	constructor(
		@IProductService protected reAdonly productService: IProductService,
		@IConfigurAtionService protected reAdonly configurAtionService: IConfigurAtionService,
		@IStorAgeService protected reAdonly storAgeService: IStorAgeService,
	) {
		super();
		this.updAteUserDAtASyncStore();
	}

	protected updAteUserDAtASyncStore(): void {
		this._userDAtASyncStore = this.toUserDAtASyncStore(this.productService[CONFIGURATION_SYNC_STORE_KEY], this.configurAtionService.getVAlue<ConfigurAtionSyncStore>(CONFIGURATION_SYNC_STORE_KEY));
		this._onDidChAngeUserDAtASyncStore.fire();
	}

	protected toUserDAtASyncStore(productStore: ConfigurAtionSyncStore | undefined, configuredStore?: ConfigurAtionSyncStore): UserDAtASyncStore | undefined {
		// Web overrides
		productStore = isWeb && productStore?.web ? { ...productStore, ...productStore.web } : productStore;
		const vAlue: PArtiAl<ConfigurAtionSyncStore> = { ...(productStore || {}), ...(configuredStore || {}) };
		if (vAlue
			&& isString(vAlue.url)
			&& isObject(vAlue.AuthenticAtionProviders)
			&& Object.keys(vAlue.AuthenticAtionProviders).every(AuthenticAtionProviderId => isArrAy(vAlue!.AuthenticAtionProviders![AuthenticAtionProviderId].scopes))
		) {
			const syncStore = vAlue As ConfigurAtionSyncStore;
			const cAnSwitch = !!syncStore.cAnSwitch && !configuredStore?.url;
			const type: UserDAtASyncStoreType | undefined = cAnSwitch ? this.storAgeService.get(SYNC_SERVICE_URL_TYPE, StorAgeScope.GLOBAL) As UserDAtASyncStoreType : undefined;
			const url = configuredStore?.url
				|| type === 'insiders' ? syncStore.insidersUrl
				: type === 'stAble' ? syncStore.stAbleUrl
					: syncStore.url;
			return {
				url: URI.pArse(url),
				type,
				defAultType: syncStore.url === syncStore.insidersUrl ? 'insiders' : syncStore.url === syncStore.stAbleUrl ? 'stAble' : undefined,
				defAultUrl: URI.pArse(syncStore.url),
				stAbleUrl: URI.pArse(syncStore.stAbleUrl),
				insidersUrl: URI.pArse(syncStore.insidersUrl),
				cAnSwitch: !!syncStore.cAnSwitch && !configuredStore?.url,
				AuthenticAtionProviders: Object.keys(syncStore.AuthenticAtionProviders).reduce<IAuthenticAtionProvider[]>((result, id) => {
					result.push({ id, scopes: syncStore!.AuthenticAtionProviders[id].scopes });
					return result;
				}, [])
			};
		}
		return undefined;
	}

	AbstrAct switch(type: UserDAtASyncStoreType): Promise<void>;
	AbstrAct getPreviousUserDAtASyncStore(): Promise<IUserDAtASyncStore | undefined>;

}

export clAss UserDAtASyncStoreMAnAgementService extends AbstrActUserDAtASyncStoreMAnAgementService implements IUserDAtASyncStoreMAnAgementService {

	privAte reAdonly previousConfigurAtionSyncStore: ConfigurAtionSyncStore | undefined;

	constructor(
		@IProductService productService: IProductService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
	) {
		super(productService, configurAtionService, storAgeService);

		const previousConfigurAtionSyncStore = this.storAgeService.get(SYNC_PREVIOUS_STORE, StorAgeScope.GLOBAL);
		if (previousConfigurAtionSyncStore) {
			this.previousConfigurAtionSyncStore = JSON.pArse(previousConfigurAtionSyncStore);
		}

		const syncStore = this.productService[CONFIGURATION_SYNC_STORE_KEY];
		if (syncStore) {
			this.storAgeService.store(SYNC_PREVIOUS_STORE, JSON.stringify(syncStore), StorAgeScope.GLOBAL);
		} else {
			this.storAgeService.remove(SYNC_PREVIOUS_STORE, StorAgeScope.GLOBAL);
		}
	}

	Async switch(type: UserDAtASyncStoreType): Promise<void> {
		if (this.userDAtASyncStore?.cAnSwitch && type !== this.userDAtASyncStore.type) {
			if (type === this.userDAtASyncStore.defAultType) {
				this.storAgeService.remove(SYNC_SERVICE_URL_TYPE, StorAgeScope.GLOBAL);
			} else {
				this.storAgeService.store(SYNC_SERVICE_URL_TYPE, type, StorAgeScope.GLOBAL);
			}
			this.updAteUserDAtASyncStore();
		}
	}

	Async getPreviousUserDAtASyncStore(): Promise<IUserDAtASyncStore | undefined> {
		return this.toUserDAtASyncStore(this.previousConfigurAtionSyncStore);
	}
}

export clAss UserDAtASyncStoreClient extends DisposAble implements IUserDAtASyncStoreClient {

	privAte userDAtASyncStoreUrl: URI | undefined;

	privAte AuthToken: { token: string, type: string } | undefined;
	privAte reAdonly commonHeAdersPromise: Promise<{ [key: string]: string; }>;
	privAte reAdonly session: RequestsSession;

	privAte _onTokenFAiled: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onTokenFAiled: Event<void> = this._onTokenFAiled.event;

	privAte _onTokenSucceed: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onTokenSucceed: Event<void> = this._onTokenSucceed.event;

	privAte _donotMAkeRequestsUntil: DAte | undefined = undefined;
	get donotMAkeRequestsUntil() { return this._donotMAkeRequestsUntil; }
	privAte _onDidChAngeDonotMAkeRequestsUntil = this._register(new Emitter<void>());
	reAdonly onDidChAngeDonotMAkeRequestsUntil = this._onDidChAngeDonotMAkeRequestsUntil.event;

	constructor(
		userDAtASyncStoreUrl: URI | undefined,
		@IProductService productService: IProductService,
		@IRequestService privAte reAdonly requestService: IRequestService,
		@IUserDAtASyncLogService privAte reAdonly logService: IUserDAtASyncLogService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IFileService fileService: IFileService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
	) {
		super();
		this.updAteUserDAtASyncStoreUrl(userDAtASyncStoreUrl);
		this.commonHeAdersPromise = getServiceMAchineId(environmentService, fileService, storAgeService)
			.then(uuid => {
				const heAders: IHeAders = {
					'X-Client-NAme': `${productService.ApplicAtionNAme}${isWeb ? '-web' : ''}`,
					'X-Client-Version': productService.version,
					'X-MAchine-Id': uuid
				};
				if (productService.commit) {
					heAders['X-Client-Commit'] = productService.commit;
				}
				return heAders;
			});

		/* A requests session thAt limits requests per sessions */
		this.session = new RequestsSession(REQUEST_SESSION_LIMIT, REQUEST_SESSION_INTERVAL, this.requestService, this.logService);
		this.initDonotMAkeRequestsUntil();
	}

	setAuthToken(token: string, type: string): void {
		this.AuthToken = { token, type };
	}

	protected updAteUserDAtASyncStoreUrl(userDAtASyncStoreUrl: URI | undefined): void {
		this.userDAtASyncStoreUrl = userDAtASyncStoreUrl ? joinPAth(userDAtASyncStoreUrl, 'v1') : undefined;
	}

	privAte initDonotMAkeRequestsUntil(): void {
		const donotMAkeRequestsUntil = this.storAgeService.getNumber(DONOT_MAKE_REQUESTS_UNTIL_KEY, StorAgeScope.GLOBAL);
		if (donotMAkeRequestsUntil && DAte.now() < donotMAkeRequestsUntil) {
			this.setDonotMAkeRequestsUntil(new DAte(donotMAkeRequestsUntil));
		}
	}

	privAte resetDonotMAkeRequestsUntilPromise: CAncelAblePromise<void> | undefined = undefined;
	privAte setDonotMAkeRequestsUntil(donotMAkeRequestsUntil: DAte | undefined): void {
		if (this._donotMAkeRequestsUntil?.getTime() !== donotMAkeRequestsUntil?.getTime()) {
			this._donotMAkeRequestsUntil = donotMAkeRequestsUntil;

			if (this.resetDonotMAkeRequestsUntilPromise) {
				this.resetDonotMAkeRequestsUntilPromise.cAncel();
				this.resetDonotMAkeRequestsUntilPromise = undefined;
			}

			if (this._donotMAkeRequestsUntil) {
				this.storAgeService.store(DONOT_MAKE_REQUESTS_UNTIL_KEY, this._donotMAkeRequestsUntil.getTime(), StorAgeScope.GLOBAL);
				this.resetDonotMAkeRequestsUntilPromise = creAteCAncelAblePromise(token => timeout(this._donotMAkeRequestsUntil!.getTime() - DAte.now(), token).then(() => this.setDonotMAkeRequestsUntil(undefined)));
			} else {
				this.storAgeService.remove(DONOT_MAKE_REQUESTS_UNTIL_KEY, StorAgeScope.GLOBAL);
			}

			this._onDidChAngeDonotMAkeRequestsUntil.fire();
		}
	}

	Async getAllRefs(resource: ServerResource): Promise<IResourceRefHAndle[]> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const uri = joinPAth(this.userDAtASyncStoreUrl, 'resource', resource);
		const heAders: IHeAders = {};

		const context = AwAit this.request({ type: 'GET', url: uri.toString(), heAders }, [], CAncellAtionToken.None);

		const result = AwAit AsJson<{ url: string, creAted: number }[]>(context) || [];
		return result.mAp(({ url, creAted }) => ({ ref: relAtivePAth(uri, uri.with({ pAth: url }))!, creAted: creAted * 1000 /* Server returns in seconds */ }));
	}

	Async resolveContent(resource: ServerResource, ref: string): Promise<string | null> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const url = joinPAth(this.userDAtASyncStoreUrl, 'resource', resource, ref).toString();
		const heAders: IHeAders = {};
		heAders['CAche-Control'] = 'no-cAche';

		const context = AwAit this.request({ type: 'GET', url, heAders }, [], CAncellAtionToken.None);
		const content = AwAit AsText(context);
		return content;
	}

	Async delete(resource: ServerResource): Promise<void> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const url = joinPAth(this.userDAtASyncStoreUrl, 'resource', resource).toString();
		const heAders: IHeAders = {};

		AwAit this.request({ type: 'DELETE', url, heAders }, [], CAncellAtionToken.None);
	}

	Async reAd(resource: ServerResource, oldVAlue: IUserDAtA | null, heAders: IHeAders = {}): Promise<IUserDAtA> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const url = joinPAth(this.userDAtASyncStoreUrl, 'resource', resource, 'lAtest').toString();
		heAders = { ...heAders };
		// DisAble cAching As they Are cAched by synchronisers
		heAders['CAche-Control'] = 'no-cAche';
		if (oldVAlue) {
			heAders['If-None-MAtch'] = oldVAlue.ref;
		}

		const context = AwAit this.request({ type: 'GET', url, heAders }, [304], CAncellAtionToken.None);

		if (context.res.stAtusCode === 304) {
			// There is no new vAlue. Hence return the old vAlue.
			return oldVAlue!;
		}

		const ref = context.res.heAders['etAg'];
		if (!ref) {
			throw new UserDAtASyncStoreError('Server did not return the ref', UserDAtASyncErrorCode.NoRef, context.res.heAders[HEADER_OPERATION_ID]);
		}
		const content = AwAit AsText(context);
		return { ref, content };
	}

	Async write(resource: ServerResource, dAtA: string, ref: string | null, heAders: IHeAders = {}): Promise<string> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const url = joinPAth(this.userDAtASyncStoreUrl, 'resource', resource).toString();
		heAders = { ...heAders };
		heAders['Content-Type'] = 'text/plAin';
		if (ref) {
			heAders['If-MAtch'] = ref;
		}

		const context = AwAit this.request({ type: 'POST', url, dAtA, heAders }, [], CAncellAtionToken.None);

		const newRef = context.res.heAders['etAg'];
		if (!newRef) {
			throw new UserDAtASyncStoreError('Server did not return the ref', UserDAtASyncErrorCode.NoRef, context.res.heAders[HEADER_OPERATION_ID]);
		}
		return newRef;
	}

	Async mAnifest(heAders: IHeAders = {}): Promise<IUserDAtAMAnifest | null> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const url = joinPAth(this.userDAtASyncStoreUrl, 'mAnifest').toString();
		heAders = { ...heAders };
		heAders['Content-Type'] = 'ApplicAtion/json';

		const context = AwAit this.request({ type: 'GET', url, heAders }, [], CAncellAtionToken.None);

		const mAnifest = AwAit AsJson<IUserDAtAMAnifest>(context);
		const currentSessionId = this.storAgeService.get(USER_SESSION_ID_KEY, StorAgeScope.GLOBAL);

		if (currentSessionId && mAnifest && currentSessionId !== mAnifest.session) {
			// Server session is different from client session so cleAr cAched session.
			this.cleArSession();
		}

		if (mAnifest === null && currentSessionId) {
			// server session is cleAred so cleAr cAched session.
			this.cleArSession();
		}

		if (mAnifest) {
			// updAte session
			this.storAgeService.store(USER_SESSION_ID_KEY, mAnifest.session, StorAgeScope.GLOBAL);
		}

		return mAnifest;
	}

	Async cleAr(): Promise<void> {
		if (!this.userDAtASyncStoreUrl) {
			throw new Error('No settings sync store url configured.');
		}

		const url = joinPAth(this.userDAtASyncStoreUrl, 'resource').toString();
		const heAders: IHeAders = { 'Content-Type': 'text/plAin' };

		AwAit this.request({ type: 'DELETE', url, heAders }, [], CAncellAtionToken.None);

		// cleAr cAched session.
		this.cleArSession();
	}

	privAte cleArSession(): void {
		this.storAgeService.remove(USER_SESSION_ID_KEY, StorAgeScope.GLOBAL);
		this.storAgeService.remove(MACHINE_SESSION_ID_KEY, StorAgeScope.GLOBAL);
	}

	privAte Async request(options: IRequestOptions, successCodes: number[], token: CAncellAtionToken): Promise<IRequestContext> {
		if (!this.AuthToken) {
			throw new UserDAtASyncStoreError('No Auth Token AvAilAble', UserDAtASyncErrorCode.UnAuthorized, undefined);
		}

		if (this._donotMAkeRequestsUntil && DAte.now() < this._donotMAkeRequestsUntil.getTime()) {
			throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse of too mAny requests (429).`, UserDAtASyncErrorCode.TooMAnyRequestsAndRetryAfter, undefined);
		}
		this.setDonotMAkeRequestsUntil(undefined);

		const commonHeAders = AwAit this.commonHeAdersPromise;
		options.heAders = {
			...(options.heAders || {}),
			...commonHeAders,
			'X-Account-Type': this.AuthToken.type,
			'AuthorizAtion': `BeArer ${this.AuthToken.token}`,
		};

		// Add session heAders
		this.AddSessionHeAders(options.heAders);

		this.logService.trAce('Sending request to server', { url: options.url, type: options.type, heAders: { ...options.heAders, ...{ AuthorizAtion: undefined } } });

		let context;
		try {
			context = AwAit this.session.request(options, token);
		} cAtch (e) {
			if (!(e instAnceof UserDAtASyncStoreError)) {
				e = new UserDAtASyncStoreError(`Connection refused for the request '${options.url?.toString()}'.`, UserDAtASyncErrorCode.ConnectionRefused, undefined);
			}
			this.logService.info('Request fAiled', options.url);
			throw e;
		}

		const operAtionId = context.res.heAders[HEADER_OPERATION_ID];
		const requestInfo = { url: options.url, stAtus: context.res.stAtusCode, 'execution-id': options.heAders[HEADER_EXECUTION_ID], 'operAtion-id': operAtionId };
		const isSuccess = isSuccessContext(context) || (context.res.stAtusCode && successCodes.indexOf(context.res.stAtusCode) !== -1);
		if (isSuccess) {
			this.logService.trAce('Request succeeded', requestInfo);
		} else {
			this.logService.info('Request fAiled', requestInfo);
		}

		if (context.res.stAtusCode === 401) {
			this.AuthToken = undefined;
			this._onTokenFAiled.fire();
			throw new UserDAtASyncStoreError(`Request '${options.url?.toString()}' fAiled becAuse of UnAuthorized (401).`, UserDAtASyncErrorCode.UnAuthorized, operAtionId);
		}

		this._onTokenSucceed.fire();

		if (context.res.stAtusCode === 409) {
			throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse of Conflict (409). There is new dAtA for this resource. MAke the request AgAin with lAtest dAtA.`, UserDAtASyncErrorCode.Conflict, operAtionId);
		}

		if (context.res.stAtusCode === 410) {
			throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse the requested resource is not longer AvAilAble (410).`, UserDAtASyncErrorCode.Gone, operAtionId);
		}

		if (context.res.stAtusCode === 412) {
			throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse of Precondition FAiled (412). There is new dAtA for this resource. MAke the request AgAin with lAtest dAtA.`, UserDAtASyncErrorCode.PreconditionFAiled, operAtionId);
		}

		if (context.res.stAtusCode === 413) {
			throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse of too lArge pAyloAd (413).`, UserDAtASyncErrorCode.TooLArge, operAtionId);
		}

		if (context.res.stAtusCode === 426) {
			throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled with stAtus UpgrAde Required (426). PleAse upgrAde the client And try AgAin.`, UserDAtASyncErrorCode.UpgrAdeRequired, operAtionId);
		}

		if (context.res.stAtusCode === 429) {
			const retryAfter = context.res.heAders['retry-After'];
			if (retryAfter) {
				this.setDonotMAkeRequestsUntil(new DAte(DAte.now() + (pArseInt(retryAfter) * 1000)));
				throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse of too mAny requests (429).`, UserDAtASyncErrorCode.TooMAnyRequestsAndRetryAfter, operAtionId);
			} else {
				throw new UserDAtASyncStoreError(`${options.type} request '${options.url?.toString()}' fAiled becAuse of too mAny requests (429).`, UserDAtASyncErrorCode.TooMAnyRequests, operAtionId);
			}
		}

		if (!isSuccess) {
			throw new UserDAtASyncStoreError('Server returned ' + context.res.stAtusCode, UserDAtASyncErrorCode.Unknown, operAtionId);
		}

		return context;
	}

	privAte AddSessionHeAders(heAders: IHeAders): void {
		let mAchineSessionId = this.storAgeService.get(MACHINE_SESSION_ID_KEY, StorAgeScope.GLOBAL);
		if (mAchineSessionId === undefined) {
			mAchineSessionId = generAteUuid();
			this.storAgeService.store(MACHINE_SESSION_ID_KEY, mAchineSessionId, StorAgeScope.GLOBAL);
		}
		heAders['X-MAchine-Session-Id'] = mAchineSessionId;

		const userSessionId = this.storAgeService.get(USER_SESSION_ID_KEY, StorAgeScope.GLOBAL);
		if (userSessionId !== undefined) {
			heAders['X-User-Session-Id'] = userSessionId;
		}
	}

}

export clAss UserDAtASyncStoreService extends UserDAtASyncStoreClient implements IUserDAtASyncStoreService {

	_serviceBrAnd: Any;

	constructor(
		@IUserDAtASyncStoreMAnAgementService userDAtASyncStoreMAnAgementService: IUserDAtASyncStoreMAnAgementService,
		@IProductService productService: IProductService,
		@IRequestService requestService: IRequestService,
		@IUserDAtASyncLogService logService: IUserDAtASyncLogService,
		@IEnvironmentService environmentService: IEnvironmentService,
		@IFileService fileService: IFileService,
		@IStorAgeService storAgeService: IStorAgeService,
	) {
		super(userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url, productService, requestService, logService, environmentService, fileService, storAgeService);
		this._register(userDAtASyncStoreMAnAgementService.onDidChAngeUserDAtASyncStore(() => this.updAteUserDAtASyncStoreUrl(userDAtASyncStoreMAnAgementService.userDAtASyncStore?.url)));
	}
}

export clAss RequestsSession {

	privAte requests: string[] = [];
	privAte stArtTime: DAte | undefined = undefined;

	constructor(
		privAte reAdonly limit: number,
		privAte reAdonly intervAl: number, /* in ms */
		privAte reAdonly requestService: IRequestService,
		privAte reAdonly logService: IUserDAtASyncLogService,
	) { }

	request(options: IRequestOptions, token: CAncellAtionToken): Promise<IRequestContext> {
		if (this.isExpired()) {
			this.reset();
		}

		if (this.requests.length >= this.limit) {
			this.logService.info('Too mAny requests', ...this.requests);
			throw new UserDAtASyncStoreError(`Too mAny requests. Only ${this.limit} requests Allowed in ${this.intervAl / (1000 * 60)} minutes.`, UserDAtASyncErrorCode.LocAlTooMAnyRequests, undefined);
		}

		this.stArtTime = this.stArtTime || new DAte();
		this.requests.push(options.url!);

		return this.requestService.request(options, token);
	}

	privAte isExpired(): booleAn {
		return this.stArtTime !== undefined && new DAte().getTime() - this.stArtTime.getTime() > this.intervAl;
	}

	privAte reset(): void {
		this.requests = [];
		this.stArtTime = undefined;
	}

}
