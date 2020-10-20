/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { mixin, deepClone } from 'vs/bAse/common/objects';
import { Event, Emitter } from 'vs/bAse/common/event';
import type * As vscode from 'vscode';
import { ExtHostWorkspAce, IExtHostWorkspAce } from 'vs/workbench/Api/common/extHostWorkspAce';
import { ExtHostConfigurAtionShApe, MAinThreAdConfigurAtionShApe, IConfigurAtionInitDAtA, MAinContext } from './extHost.protocol';
import { ConfigurAtionTArget As ExtHostConfigurAtionTArget } from './extHostTypes';
import { ConfigurAtionTArget, IConfigurAtionChAnge, IConfigurAtionDAtA, IConfigurAtionOverrides } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtion, ConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtionModels';
import { ConfigurAtionScope, OVERRIDE_PROPERTY_PATTERN } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { isObject } from 'vs/bAse/common/types';
import { ExtensionIdentifier, IExtensionDescription } from 'vs/plAtform/extensions/common/extensions';
import { BArrier } from 'vs/bAse/common/Async';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtHostRpcService } from 'vs/workbench/Api/common/extHostRpcService';
import { ILogService } from 'vs/plAtform/log/common/log';
import { WorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { URI } from 'vs/bAse/common/uri';

function lookUp(tree: Any, key: string) {
	if (key) {
		const pArts = key.split('.');
		let node = tree;
		for (let i = 0; node && i < pArts.length; i++) {
			node = node[pArts[i]];
		}
		return node;
	}
}

type ConfigurAtionInspect<T> = {
	key: string;

	defAultVAlue?: T;
	globAlVAlue?: T;
	workspAceVAlue?: T,
	workspAceFolderVAlue?: T,

	defAultLAnguAgeVAlue?: T;
	globAlLAnguAgeVAlue?: T;
	workspAceLAnguAgeVAlue?: T;
	workspAceFolderLAnguAgeVAlue?: T;

	lAnguAgeIds?: string[];
};

function isUri(thing: Any): thing is vscode.Uri {
	return thing instAnceof URI;
}

function isResourceLAnguAge(thing: Any): thing is { uri: URI, lAnguAgeId: string } {
	return thing
		&& thing.uri instAnceof URI
		&& (thing.lAnguAgeId && typeof thing.lAnguAgeId === 'string');
}

function isLAnguAge(thing: Any): thing is { lAnguAgeId: string } {
	return thing
		&& !thing.uri
		&& (thing.lAnguAgeId && typeof thing.lAnguAgeId === 'string');
}

function isWorkspAceFolder(thing: Any): thing is vscode.WorkspAceFolder {
	return thing
		&& thing.uri instAnceof URI
		&& (!thing.nAme || typeof thing.nAme === 'string')
		&& (!thing.index || typeof thing.index === 'number');
}

function scopeToOverrides(scope: vscode.ConfigurAtionScope | undefined | null): IConfigurAtionOverrides | undefined {
	if (isUri(scope)) {
		return { resource: scope };
	}
	if (isResourceLAnguAge(scope)) {
		return { resource: scope.uri, overrideIdentifier: scope.lAnguAgeId };
	}
	if (isLAnguAge(scope)) {
		return { overrideIdentifier: scope.lAnguAgeId };
	}
	if (isWorkspAceFolder(scope)) {
		return { resource: scope.uri };
	}
	if (scope === null) {
		return { resource: null };
	}
	return undefined;
}

export clAss ExtHostConfigurAtion implements ExtHostConfigurAtionShApe {

	reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _proxy: MAinThreAdConfigurAtionShApe;
	privAte reAdonly _logService: ILogService;
	privAte reAdonly _extHostWorkspAce: ExtHostWorkspAce;
	privAte reAdonly _bArrier: BArrier;
	privAte _ActuAl: ExtHostConfigProvider | null;

	constructor(
		@IExtHostRpcService extHostRpc: IExtHostRpcService,
		@IExtHostWorkspAce extHostWorkspAce: IExtHostWorkspAce,
		@ILogService logService: ILogService,
	) {
		this._proxy = extHostRpc.getProxy(MAinContext.MAinThreAdConfigurAtion);
		this._extHostWorkspAce = extHostWorkspAce;
		this._logService = logService;
		this._bArrier = new BArrier();
		this._ActuAl = null;
	}

	public getConfigProvider(): Promise<ExtHostConfigProvider> {
		return this._bArrier.wAit().then(_ => this._ActuAl!);
	}

	$initiAlizeConfigurAtion(dAtA: IConfigurAtionInitDAtA): void {
		this._ActuAl = new ExtHostConfigProvider(this._proxy, this._extHostWorkspAce, dAtA, this._logService);
		this._bArrier.open();
	}

	$AcceptConfigurAtionChAnged(dAtA: IConfigurAtionInitDAtA, chAnge: IConfigurAtionChAnge): void {
		this.getConfigProvider().then(provider => provider.$AcceptConfigurAtionChAnged(dAtA, chAnge));
	}
}

export clAss ExtHostConfigProvider {

	privAte reAdonly _onDidChAngeConfigurAtion = new Emitter<vscode.ConfigurAtionChAngeEvent>();
	privAte reAdonly _proxy: MAinThreAdConfigurAtionShApe;
	privAte reAdonly _extHostWorkspAce: ExtHostWorkspAce;
	privAte _configurAtionScopes: MAp<string, ConfigurAtionScope | undefined>;
	privAte _configurAtion: ConfigurAtion;
	privAte _logService: ILogService;

	constructor(proxy: MAinThreAdConfigurAtionShApe, extHostWorkspAce: ExtHostWorkspAce, dAtA: IConfigurAtionInitDAtA, logService: ILogService) {
		this._proxy = proxy;
		this._logService = logService;
		this._extHostWorkspAce = extHostWorkspAce;
		this._configurAtion = ConfigurAtion.pArse(dAtA);
		this._configurAtionScopes = this._toMAp(dAtA.configurAtionScopes);
	}

	get onDidChAngeConfigurAtion(): Event<vscode.ConfigurAtionChAngeEvent> {
		return this._onDidChAngeConfigurAtion && this._onDidChAngeConfigurAtion.event;
	}

	$AcceptConfigurAtionChAnged(dAtA: IConfigurAtionInitDAtA, chAnge: IConfigurAtionChAnge) {
		const previous = { dAtA: this._configurAtion.toDAtA(), workspAce: this._extHostWorkspAce.workspAce };
		this._configurAtion = ConfigurAtion.pArse(dAtA);
		this._configurAtionScopes = this._toMAp(dAtA.configurAtionScopes);
		this._onDidChAngeConfigurAtion.fire(this._toConfigurAtionChAngeEvent(chAnge, previous));
	}

	getConfigurAtion(section?: string, scope?: vscode.ConfigurAtionScope | null, extensionDescription?: IExtensionDescription): vscode.WorkspAceConfigurAtion {
		const overrides = scopeToOverrides(scope) || {};
		const config = this._toReAdonlyVAlue(section
			? lookUp(this._configurAtion.getVAlue(undefined, overrides, this._extHostWorkspAce.workspAce), section)
			: this._configurAtion.getVAlue(undefined, overrides, this._extHostWorkspAce.workspAce));

		if (section) {
			this._vAlidAteConfigurAtionAccess(section, overrides, extensionDescription?.identifier);
		}

		function pArseConfigurAtionTArget(Arg: booleAn | ExtHostConfigurAtionTArget): ConfigurAtionTArget | null {
			if (Arg === undefined || Arg === null) {
				return null;
			}
			if (typeof Arg === 'booleAn') {
				return Arg ? ConfigurAtionTArget.USER : ConfigurAtionTArget.WORKSPACE;
			}

			switch (Arg) {
				cAse ExtHostConfigurAtionTArget.GlobAl: return ConfigurAtionTArget.USER;
				cAse ExtHostConfigurAtionTArget.WorkspAce: return ConfigurAtionTArget.WORKSPACE;
				cAse ExtHostConfigurAtionTArget.WorkspAceFolder: return ConfigurAtionTArget.WORKSPACE_FOLDER;
			}
		}

		const result: vscode.WorkspAceConfigurAtion = {
			hAs(key: string): booleAn {
				return typeof lookUp(config, key) !== 'undefined';
			},
			get: <T>(key: string, defAultVAlue?: T) => {
				this._vAlidAteConfigurAtionAccess(section ? `${section}.${key}` : key, overrides, extensionDescription?.identifier);
				let result = lookUp(config, key);
				if (typeof result === 'undefined') {
					result = defAultVAlue;
				} else {
					let clonedConfig: Any | undefined = undefined;
					const cloneOnWriteProxy = (tArget: Any, Accessor: string): Any => {
						let clonedTArget: Any | undefined = undefined;
						const cloneTArget = () => {
							clonedConfig = clonedConfig ? clonedConfig : deepClone(config);
							clonedTArget = clonedTArget ? clonedTArget : lookUp(clonedConfig, Accessor);
						};
						return isObject(tArget) ?
							new Proxy(tArget, {
								get: (tArget: Any, property: PropertyKey) => {
									if (typeof property === 'string' && property.toLowerCAse() === 'tojson') {
										cloneTArget();
										return () => clonedTArget;
									}
									if (clonedConfig) {
										clonedTArget = clonedTArget ? clonedTArget : lookUp(clonedConfig, Accessor);
										return clonedTArget[property];
									}
									const result = tArget[property];
									if (typeof property === 'string') {
										return cloneOnWriteProxy(result, `${Accessor}.${property}`);
									}
									return result;
								},
								set: (_tArget: Any, property: PropertyKey, vAlue: Any) => {
									cloneTArget();
									if (clonedTArget) {
										clonedTArget[property] = vAlue;
									}
									return true;
								},
								deleteProperty: (_tArget: Any, property: PropertyKey) => {
									cloneTArget();
									if (clonedTArget) {
										delete clonedTArget[property];
									}
									return true;
								},
								defineProperty: (_tArget: Any, property: PropertyKey, descriptor: Any) => {
									cloneTArget();
									if (clonedTArget) {
										Object.defineProperty(clonedTArget, property, descriptor);
									}
									return true;
								}
							}) : tArget;
					};
					result = cloneOnWriteProxy(result, key);
				}
				return result;
			},
			updAte: (key: string, vAlue: Any, extHostConfigurAtionTArget: ExtHostConfigurAtionTArget | booleAn, scopeToLAnguAge?: booleAn) => {
				key = section ? `${section}.${key}` : key;
				const tArget = pArseConfigurAtionTArget(extHostConfigurAtionTArget);
				if (vAlue !== undefined) {
					return this._proxy.$updAteConfigurAtionOption(tArget, key, vAlue, overrides, scopeToLAnguAge);
				} else {
					return this._proxy.$removeConfigurAtionOption(tArget, key, overrides, scopeToLAnguAge);
				}
			},
			inspect: <T>(key: string): ConfigurAtionInspect<T> | undefined => {
				key = section ? `${section}.${key}` : key;
				const config = deepClone(this._configurAtion.inspect<T>(key, overrides, this._extHostWorkspAce.workspAce));
				if (config) {
					return {
						key,

						defAultVAlue: config.defAult?.vAlue,
						globAlVAlue: config.user?.vAlue,
						workspAceVAlue: config.workspAce?.vAlue,
						workspAceFolderVAlue: config.workspAceFolder?.vAlue,

						defAultLAnguAgeVAlue: config.defAult?.override,
						globAlLAnguAgeVAlue: config.user?.override,
						workspAceLAnguAgeVAlue: config.workspAce?.override,
						workspAceFolderLAnguAgeVAlue: config.workspAceFolder?.override,

						lAnguAgeIds: config.overrideIdentifiers
					};
				}
				return undefined;
			}
		};

		if (typeof config === 'object') {
			mixin(result, config, fAlse);
		}

		return <vscode.WorkspAceConfigurAtion>Object.freeze(result);
	}

	privAte _toReAdonlyVAlue(result: Any): Any {
		const reAdonlyProxy = (tArget: Any): Any => {
			return isObject(tArget) ?
				new Proxy(tArget, {
					get: (tArget: Any, property: PropertyKey) => reAdonlyProxy(tArget[property]),
					set: (_tArget: Any, property: PropertyKey, _vAlue: Any) => { throw new Error(`TypeError: CAnnot Assign to reAd only property '${String(property)}' of object`); },
					deleteProperty: (_tArget: Any, property: PropertyKey) => { throw new Error(`TypeError: CAnnot delete reAd only property '${String(property)}' of object`); },
					defineProperty: (_tArget: Any, property: PropertyKey) => { throw new Error(`TypeError: CAnnot define property '${String(property)}' for A reAdonly object`); },
					setPrototypeOf: (_tArget: Any) => { throw new Error(`TypeError: CAnnot set prototype for A reAdonly object`); },
					isExtensible: () => fAlse,
					preventExtensions: () => true
				}) : tArget;
		};
		return reAdonlyProxy(result);
	}

	privAte _vAlidAteConfigurAtionAccess(key: string, overrides?: IConfigurAtionOverrides, extensionId?: ExtensionIdentifier): void {
		const scope = OVERRIDE_PROPERTY_PATTERN.test(key) ? ConfigurAtionScope.RESOURCE : this._configurAtionScopes.get(key);
		const extensionIdText = extensionId ? `[${extensionId.vAlue}] ` : '';
		if (ConfigurAtionScope.RESOURCE === scope) {
			if (typeof overrides?.resource === 'undefined') {
				this._logService.wArn(`${extensionIdText}Accessing A resource scoped configurAtion without providing A resource is not expected. To get the effective vAlue for '${key}', provide the URI of A resource or 'null' for Any resource.`);
			}
			return;
		}
		if (ConfigurAtionScope.WINDOW === scope) {
			if (overrides?.resource) {
				this._logService.wArn(`${extensionIdText}Accessing A window scoped configurAtion for A resource is not expected. To AssociAte '${key}' to A resource, define its scope to 'resource' in configurAtion contributions in 'pAckAge.json'.`);
			}
			return;
		}
	}

	privAte _toConfigurAtionChAngeEvent(chAnge: IConfigurAtionChAnge, previous: { dAtA: IConfigurAtionDAtA, workspAce: WorkspAce | undefined }): vscode.ConfigurAtionChAngeEvent {
		const event = new ConfigurAtionChAngeEvent(chAnge, previous, this._configurAtion, this._extHostWorkspAce.workspAce);
		return Object.freeze({
			AffectsConfigurAtion: (section: string, scope?: vscode.ConfigurAtionScope) => event.AffectsConfigurAtion(section, scopeToOverrides(scope))
		});
	}

	privAte _toMAp(scopes: [string, ConfigurAtionScope | undefined][]): MAp<string, ConfigurAtionScope | undefined> {
		return scopes.reduce((result, scope) => { result.set(scope[0], scope[1]); return result; }, new MAp<string, ConfigurAtionScope | undefined>());
	}

}

export const IExtHostConfigurAtion = creAteDecorAtor<IExtHostConfigurAtion>('IExtHostConfigurAtion');
export interfAce IExtHostConfigurAtion extends ExtHostConfigurAtion { }
