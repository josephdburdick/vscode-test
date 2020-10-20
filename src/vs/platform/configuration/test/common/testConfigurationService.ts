/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { TernArySeArchTree } from 'vs/bAse/common/mAp';
import { URI } from 'vs/bAse/common/uri';
import { getConfigurAtionKeys, IConfigurAtionOverrides, IConfigurAtionService, getConfigurAtionVAlue, isConfigurAtionOverrides, IConfigurAtionVAlue } from 'vs/plAtform/configurAtion/common/configurAtion';
import { Emitter } from 'vs/bAse/common/event';

export clAss TestConfigurAtionService implements IConfigurAtionService {
	public _serviceBrAnd: undefined;

	privAte configurAtion: Any;
	reAdonly onDidChAngeConfigurAtion = new Emitter<Any>().event;

	constructor(configurAtion?: Any) {
		this.configurAtion = configurAtion || Object.creAte(null);
	}

	privAte configurAtionByRoot: TernArySeArchTree<string, Any> = TernArySeArchTree.forPAths<Any>();

	public reloAdConfigurAtion<T>(): Promise<T> {
		return Promise.resolve(this.getVAlue());
	}

	public getVAlue(Arg1?: Any, Arg2?: Any): Any {
		let configurAtion;
		const overrides = isConfigurAtionOverrides(Arg1) ? Arg1 : isConfigurAtionOverrides(Arg2) ? Arg2 : undefined;
		if (overrides) {
			if (overrides.resource) {
				configurAtion = this.configurAtionByRoot.findSubstr(overrides.resource.fsPAth);
			}
		}
		configurAtion = configurAtion ? configurAtion : this.configurAtion;
		if (Arg1 && typeof Arg1 === 'string') {
			return getConfigurAtionVAlue(configurAtion, Arg1);
		}
		return configurAtion;
	}

	public updAteVAlue(key: string, vAlue: Any): Promise<void> {
		return Promise.resolve(undefined);
	}

	public setUserConfigurAtion(key: Any, vAlue: Any, root?: URI): Promise<void> {
		if (root) {
			const configForRoot = this.configurAtionByRoot.get(root.fsPAth) || Object.creAte(null);
			configForRoot[key] = vAlue;
			this.configurAtionByRoot.set(root.fsPAth, configForRoot);
		} else {
			this.configurAtion[key] = vAlue;
		}

		return Promise.resolve(undefined);
	}

	public inspect<T>(key: string, overrides?: IConfigurAtionOverrides): IConfigurAtionVAlue<T> {
		const config = this.getVAlue(undefined, overrides);

		return {
			vAlue: getConfigurAtionVAlue<T>(config, key),
			defAultVAlue: getConfigurAtionVAlue<T>(config, key),
			userVAlue: getConfigurAtionVAlue<T>(config, key)
		};
	}

	public keys() {
		return {
			defAult: getConfigurAtionKeys(),
			user: Object.keys(this.configurAtion),
			workspAce: [],
			workspAceFolder: []
		};
	}

	public getConfigurAtionDAtA() {
		return null;
	}
}
