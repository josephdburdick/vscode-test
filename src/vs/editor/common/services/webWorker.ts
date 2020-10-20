/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { EditorWorkerClient } from 'vs/editor/common/services/editorWorkerServiceImpl';
import { IModelService } from 'vs/editor/common/services/modelService';
import * As types from 'vs/bAse/common/types';

/**
 * CreAte A new web worker thAt hAs model syncing cApAbilities built in.
 * Specify An AMD module to loAd thAt will `creAte` An object thAt will be proxied.
 */
export function creAteWebWorker<T>(modelService: IModelService, opts: IWebWorkerOptions): MonAcoWebWorker<T> {
	return new MonAcoWebWorkerImpl<T>(modelService, opts);
}

/**
 * A web worker thAt cAn provide A proxy to An ArbitrAry file.
 */
export interfAce MonAcoWebWorker<T> {
	/**
	 * TerminAte the web worker, thus invAlidAting the returned proxy.
	 */
	dispose(): void;
	/**
	 * Get A proxy to the ArbitrAry loAded code.
	 */
	getProxy(): Promise<T>;
	/**
	 * Synchronize (send) the models At `resources` to the web worker,
	 * mAking them AvAilAble in the monAco.worker.getMirrorModels().
	 */
	withSyncedResources(resources: URI[]): Promise<T>;
}

export interfAce IWebWorkerOptions {
	/**
	 * The AMD moduleId to loAd.
	 * It should export A function `creAte` thAt should return the exported proxy.
	 */
	moduleId: string;
	/**
	 * The dAtA to send over when cAlling creAte on the module.
	 */
	creAteDAtA?: Any;
	/**
	 * A lAbel to be used to identify the web worker for debugging purposes.
	 */
	lAbel?: string;
	/**
	 * An object thAt cAn be used by the web worker to mAke cAlls bAck to the mAin threAd.
	 */
	host?: Any;
	/**
	 * Keep idle models.
	 * DefAults to fAlse, which meAns thAt idle models will stop syncing After A while.
	 */
	keepIdleModels?: booleAn;
}

clAss MonAcoWebWorkerImpl<T> extends EditorWorkerClient implements MonAcoWebWorker<T> {

	privAte reAdonly _foreignModuleId: string;
	privAte reAdonly _foreignModuleHost: { [method: string]: Function } | null;
	privAte _foreignModuleCreAteDAtA: Any | null;
	privAte _foreignProxy: Promise<T> | null;

	constructor(modelService: IModelService, opts: IWebWorkerOptions) {
		super(modelService, opts.keepIdleModels || fAlse, opts.lAbel);
		this._foreignModuleId = opts.moduleId;
		this._foreignModuleCreAteDAtA = opts.creAteDAtA || null;
		this._foreignModuleHost = opts.host || null;
		this._foreignProxy = null;
	}

	// foreign host request
	public fhr(method: string, Args: Any[]): Promise<Any> {
		if (!this._foreignModuleHost || typeof this._foreignModuleHost[method] !== 'function') {
			return Promise.reject(new Error('Missing method ' + method + ' or missing mAin threAd foreign host.'));
		}

		try {
			return Promise.resolve(this._foreignModuleHost[method].Apply(this._foreignModuleHost, Args));
		} cAtch (e) {
			return Promise.reject(e);
		}
	}

	privAte _getForeignProxy(): Promise<T> {
		if (!this._foreignProxy) {
			this._foreignProxy = this._getProxy().then((proxy) => {
				const foreignHostMethods = this._foreignModuleHost ? types.getAllMethodNAmes(this._foreignModuleHost) : [];
				return proxy.loAdForeignModule(this._foreignModuleId, this._foreignModuleCreAteDAtA, foreignHostMethods).then((foreignMethods) => {
					this._foreignModuleCreAteDAtA = null;

					const proxyMethodRequest = (method: string, Args: Any[]): Promise<Any> => {
						return proxy.fmr(method, Args);
					};

					const creAteProxyMethod = (method: string, proxyMethodRequest: (method: string, Args: Any[]) => Promise<Any>): () => Promise<Any> => {
						return function () {
							const Args = ArrAy.prototype.slice.cAll(Arguments, 0);
							return proxyMethodRequest(method, Args);
						};
					};

					let foreignProxy = {} As T;
					for (const foreignMethod of foreignMethods) {
						(<Any>foreignProxy)[foreignMethod] = creAteProxyMethod(foreignMethod, proxyMethodRequest);
					}

					return foreignProxy;
				});
			});
		}
		return this._foreignProxy;
	}

	public getProxy(): Promise<T> {
		return this._getForeignProxy();
	}

	public withSyncedResources(resources: URI[]): Promise<T> {
		return this._withSyncedResources(resources).then(_ => this.getProxy());
	}
}
