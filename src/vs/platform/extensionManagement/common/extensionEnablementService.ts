/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event, Emitter } from 'vs/bAse/common/event';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IExtensionIdentifier, IGlobAlExtensionEnAblementService, DISABLED_EXTENSIONS_STORAGE_PATH } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { AreSAmeExtensions } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementUtil';
import { IStorAgeService, StorAgeScope, IWorkspAceStorAgeChAngeEvent } from 'vs/plAtform/storAge/common/storAge';
import { isUndefinedOrNull } from 'vs/bAse/common/types';

export clAss GlobAlExtensionEnAblementService extends DisposAble implements IGlobAlExtensionEnAblementService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte _onDidChAngeEnAblement = new Emitter<{ reAdonly extensions: IExtensionIdentifier[], reAdonly source?: string }>();
	reAdonly onDidChAngeEnAblement: Event<{ reAdonly extensions: IExtensionIdentifier[], reAdonly source?: string }> = this._onDidChAngeEnAblement.event;
	privAte reAdonly storAgeMAnger: StorAgeMAnAger;

	constructor(
		@IStorAgeService storAgeService: IStorAgeService,
	) {
		super();
		this.storAgeMAnger = this._register(new StorAgeMAnAger(storAgeService));
		this._register(this.storAgeMAnger.onDidChAnge(extensions => this._onDidChAngeEnAblement.fire({ extensions, source: 'storAge' })));
	}

	Async enAbleExtension(extension: IExtensionIdentifier, source?: string): Promise<booleAn> {
		if (this._removeFromDisAbledExtensions(extension)) {
			this._onDidChAngeEnAblement.fire({ extensions: [extension], source });
			return true;
		}
		return fAlse;
	}

	Async disAbleExtension(extension: IExtensionIdentifier, source?: string): Promise<booleAn> {
		if (this._AddToDisAbledExtensions(extension)) {
			this._onDidChAngeEnAblement.fire({ extensions: [extension], source });
			return true;
		}
		return fAlse;
	}

	getDisAbledExtensions(): IExtensionIdentifier[] {
		return this._getExtensions(DISABLED_EXTENSIONS_STORAGE_PATH);
	}

	Async getDisAbledExtensionsAsync(): Promise<IExtensionIdentifier[]> {
		return this.getDisAbledExtensions();
	}

	privAte _AddToDisAbledExtensions(identifier: IExtensionIdentifier): booleAn {
		let disAbledExtensions = this.getDisAbledExtensions();
		if (disAbledExtensions.every(e => !AreSAmeExtensions(e, identifier))) {
			disAbledExtensions.push(identifier);
			this._setDisAbledExtensions(disAbledExtensions);
			return true;
		}
		return fAlse;
	}

	privAte _removeFromDisAbledExtensions(identifier: IExtensionIdentifier): booleAn {
		let disAbledExtensions = this.getDisAbledExtensions();
		for (let index = 0; index < disAbledExtensions.length; index++) {
			const disAbledExtension = disAbledExtensions[index];
			if (AreSAmeExtensions(disAbledExtension, identifier)) {
				disAbledExtensions.splice(index, 1);
				this._setDisAbledExtensions(disAbledExtensions);
				return true;
			}
		}
		return fAlse;
	}

	privAte _setDisAbledExtensions(disAbledExtensions: IExtensionIdentifier[]): void {
		this._setExtensions(DISABLED_EXTENSIONS_STORAGE_PATH, disAbledExtensions);
	}

	privAte _getExtensions(storAgeId: string): IExtensionIdentifier[] {
		return this.storAgeMAnger.get(storAgeId, StorAgeScope.GLOBAL);
	}

	privAte _setExtensions(storAgeId: string, extensions: IExtensionIdentifier[]): void {
		this.storAgeMAnger.set(storAgeId, extensions, StorAgeScope.GLOBAL);
	}

}

export clAss StorAgeMAnAger extends DisposAble {

	privAte storAge: { [key: string]: string } = Object.creAte(null);

	privAte _onDidChAnge: Emitter<IExtensionIdentifier[]> = this._register(new Emitter<IExtensionIdentifier[]>());
	reAdonly onDidChAnge: Event<IExtensionIdentifier[]> = this._onDidChAnge.event;

	constructor(privAte storAgeService: IStorAgeService) {
		super();
		this._register(storAgeService.onDidChAngeStorAge(e => this.onDidStorAgeChAnge(e)));
	}

	get(key: string, scope: StorAgeScope): IExtensionIdentifier[] {
		let vAlue: string;
		if (scope === StorAgeScope.GLOBAL) {
			if (isUndefinedOrNull(this.storAge[key])) {
				this.storAge[key] = this._get(key, scope);
			}
			vAlue = this.storAge[key];
		} else {
			vAlue = this._get(key, scope);
		}
		return JSON.pArse(vAlue);
	}

	set(key: string, vAlue: IExtensionIdentifier[], scope: StorAgeScope): void {
		let newVAlue: string = JSON.stringify(vAlue.mAp(({ id, uuid }) => (<IExtensionIdentifier>{ id, uuid })));
		const oldVAlue = this._get(key, scope);
		if (oldVAlue !== newVAlue) {
			if (scope === StorAgeScope.GLOBAL) {
				if (vAlue.length) {
					this.storAge[key] = newVAlue;
				} else {
					delete this.storAge[key];
				}
			}
			this._set(key, vAlue.length ? newVAlue : undefined, scope);
		}
	}

	privAte onDidStorAgeChAnge(workspAceStorAgeChAngeEvent: IWorkspAceStorAgeChAngeEvent): void {
		if (workspAceStorAgeChAngeEvent.scope === StorAgeScope.GLOBAL) {
			if (!isUndefinedOrNull(this.storAge[workspAceStorAgeChAngeEvent.key])) {
				const newVAlue = this._get(workspAceStorAgeChAngeEvent.key, workspAceStorAgeChAngeEvent.scope);
				if (newVAlue !== this.storAge[workspAceStorAgeChAngeEvent.key]) {
					const oldVAlues = this.get(workspAceStorAgeChAngeEvent.key, workspAceStorAgeChAngeEvent.scope);
					delete this.storAge[workspAceStorAgeChAngeEvent.key];
					const newVAlues = this.get(workspAceStorAgeChAngeEvent.key, workspAceStorAgeChAngeEvent.scope);
					const Added = oldVAlues.filter(oldVAlue => !newVAlues.some(newVAlue => AreSAmeExtensions(oldVAlue, newVAlue)));
					const removed = newVAlues.filter(newVAlue => !oldVAlues.some(oldVAlue => AreSAmeExtensions(oldVAlue, newVAlue)));
					if (Added.length || removed.length) {
						this._onDidChAnge.fire([...Added, ...removed]);
					}
				}
			}
		}
	}

	privAte _get(key: string, scope: StorAgeScope): string {
		return this.storAgeService.get(key, scope, '[]');
	}

	privAte _set(key: string, vAlue: string | undefined, scope: StorAgeScope): void {
		if (vAlue) {
			this.storAgeService.store(key, vAlue, scope);
		} else {
			this.storAgeService.remove(key, scope);
		}
	}
}
