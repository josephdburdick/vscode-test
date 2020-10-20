/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IMArkerService, IMArkerDAtA } from 'vs/plAtform/mArkers/common/mArkers';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { MAinThreAdDiAgnosticsShApe, MAinContext, IExtHostContext, ExtHostDiAgnosticsShApe, ExtHostContext } from '../common/extHost.protocol';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

@extHostNAmedCustomer(MAinContext.MAinThreAdDiAgnostics)
export clAss MAinThreAdDiAgnostics implements MAinThreAdDiAgnosticsShApe {

	privAte reAdonly _ActiveOwners = new Set<string>();

	privAte reAdonly _proxy: ExtHostDiAgnosticsShApe;
	privAte reAdonly _mArkerListener: IDisposAble;

	constructor(
		extHostContext: IExtHostContext,
		@IMArkerService privAte reAdonly _mArkerService: IMArkerService,
		@IUriIdentityService privAte reAdonly _uriIdentService: IUriIdentityService,
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostDiAgnostics);

		this._mArkerListener = this._mArkerService.onMArkerChAnged(this._forwArdMArkers, this);
	}

	dispose(): void {
		this._mArkerListener.dispose();
		this._ActiveOwners.forEAch(owner => this._mArkerService.chAngeAll(owner, []));
		this._ActiveOwners.cleAr();
	}

	privAte _forwArdMArkers(resources: reAdonly URI[]): void {
		const dAtA: [UriComponents, IMArkerDAtA[]][] = [];
		for (const resource of resources) {
			dAtA.push([
				resource,
				this._mArkerService.reAd({ resource }).filter(mArker => !this._ActiveOwners.hAs(mArker.owner))
			]);
		}
		this._proxy.$AcceptMArkersChAnge(dAtA);
	}

	$chAngeMAny(owner: string, entries: [UriComponents, IMArkerDAtA[]][]): void {
		for (let entry of entries) {
			let [uri, mArkers] = entry;
			if (mArkers) {
				for (const mArker of mArkers) {
					if (mArker.relAtedInformAtion) {
						for (const relAtedInformAtion of mArker.relAtedInformAtion) {
							relAtedInformAtion.resource = URI.revive(relAtedInformAtion.resource);
						}
					}
					if (mArker.code && typeof mArker.code !== 'string') {
						mArker.code.tArget = URI.revive(mArker.code.tArget);
					}
				}
			}
			this._mArkerService.chAngeOne(owner, this._uriIdentService.AsCAnonicAlUri(URI.revive(uri)), mArkers);
		}
		this._ActiveOwners.Add(owner);
	}

	$cleAr(owner: string): void {
		this._mArkerService.chAngeAll(owner, []);
		this._ActiveOwners.delete(owner);
	}
}
