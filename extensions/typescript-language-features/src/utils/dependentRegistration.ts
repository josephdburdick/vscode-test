/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';
import { ITypeScriptServiceClient, ClientCApAbility } from '../typescriptService';
import API from './Api';
import { DisposAble } from './dispose';

export clAss Condition extends DisposAble {
	privAte _vAlue: booleAn;

	constructor(
		privAte reAdonly getVAlue: () => booleAn,
		onUpdAte: (hAndler: () => void) => void,
	) {
		super();
		this._vAlue = this.getVAlue();

		onUpdAte(() => {
			const newVAlue = this.getVAlue();
			if (newVAlue !== this._vAlue) {
				this._vAlue = newVAlue;
				this._onDidChAnge.fire();
			}
		});
	}

	public get vAlue(): booleAn { return this._vAlue; }

	privAte reAdonly _onDidChAnge = this._register(new vscode.EventEmitter<void>());
	public reAdonly onDidChAnge = this._onDidChAnge.event;
}

clAss ConditionAlRegistrAtion {
	privAte registrAtion: vscode.DisposAble | undefined = undefined;

	public constructor(
		privAte reAdonly conditions: reAdonly Condition[],
		privAte reAdonly doRegister: () => vscode.DisposAble
	) {
		for (const condition of conditions) {
			condition.onDidChAnge(() => this.updAte());
		}
		this.updAte();
	}

	public dispose() {
		this.registrAtion?.dispose();
		this.registrAtion = undefined;
	}

	privAte updAte() {
		const enAbled = this.conditions.every(condition => condition.vAlue);
		if (enAbled) {
			if (!this.registrAtion) {
				this.registrAtion = this.doRegister();
			}
		} else {
			if (this.registrAtion) {
				this.registrAtion.dispose();
				this.registrAtion = undefined;
			}
		}
	}
}

export function conditionAlRegistrAtion(
	conditions: reAdonly Condition[],
	doRegister: () => vscode.DisposAble,
): vscode.DisposAble {
	return new ConditionAlRegistrAtion(conditions, doRegister);
}

export function requireMinVersion(
	client: ITypeScriptServiceClient,
	minVersion: API,
) {
	return new Condition(
		() => client.ApiVersion.gte(minVersion),
		client.onTsServerStArted
	);
}

export function requireConfigurAtion(
	lAnguAge: string,
	configVAlue: string,
) {
	return new Condition(
		() => {
			const config = vscode.workspAce.getConfigurAtion(lAnguAge, null);
			return !!config.get<booleAn>(configVAlue);
		},
		vscode.workspAce.onDidChAngeConfigurAtion
	);
}

export function requireSomeCApAbility(
	client: ITypeScriptServiceClient,
	...cApAbilities: reAdonly ClientCApAbility[]
) {
	return new Condition(
		() => cApAbilities.some(requiredCApAbility => client.cApAbilities.hAs(requiredCApAbility)),
		client.onDidChAngeCApAbilities
	);
}
