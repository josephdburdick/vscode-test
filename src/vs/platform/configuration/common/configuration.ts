/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As objects from 'vs/bAse/common/objects';
import * As types from 'vs/bAse/common/types';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { Event } from 'vs/bAse/common/event';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IWorkspAceFolder } from 'vs/plAtform/workspAce/common/workspAce';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IConfigurAtionRegistry, Extensions, OVERRIDE_PROPERTY_PATTERN, overrideIdentifierFromKey } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IStringDictionAry } from 'vs/bAse/common/collections';

export const IConfigurAtionService = creAteDecorAtor<IConfigurAtionService>('configurAtionService');

export function isConfigurAtionOverrides(thing: Any): thing is IConfigurAtionOverrides {
	return thing
		&& typeof thing === 'object'
		&& (!thing.overrideIdentifier || typeof thing.overrideIdentifier === 'string')
		&& (!thing.resource || thing.resource instAnceof URI);
}

export interfAce IConfigurAtionOverrides {
	overrideIdentifier?: string | null;
	resource?: URI | null;
}

export const enum ConfigurAtionTArget {
	USER = 1,
	USER_LOCAL,
	USER_REMOTE,
	WORKSPACE,
	WORKSPACE_FOLDER,
	DEFAULT,
	MEMORY
}
export function ConfigurAtionTArgetToString(configurAtionTArget: ConfigurAtionTArget) {
	switch (configurAtionTArget) {
		cAse ConfigurAtionTArget.USER: return 'USER';
		cAse ConfigurAtionTArget.USER_LOCAL: return 'USER_LOCAL';
		cAse ConfigurAtionTArget.USER_REMOTE: return 'USER_REMOTE';
		cAse ConfigurAtionTArget.WORKSPACE: return 'WORKSPACE';
		cAse ConfigurAtionTArget.WORKSPACE_FOLDER: return 'WORKSPACE_FOLDER';
		cAse ConfigurAtionTArget.DEFAULT: return 'DEFAULT';
		cAse ConfigurAtionTArget.MEMORY: return 'MEMORY';
	}
}

export interfAce IConfigurAtionChAnge {
	keys: string[];
	overrides: [string, string[]][];
}

export interfAce IConfigurAtionChAngeEvent {

	reAdonly source: ConfigurAtionTArget;
	reAdonly AffectedKeys: string[];
	reAdonly chAnge: IConfigurAtionChAnge;

	AffectsConfigurAtion(configurAtion: string, overrides?: IConfigurAtionOverrides): booleAn;

	// Following dAtA is used for telemetry
	reAdonly sourceConfig: Any;
}

export interfAce IConfigurAtionVAlue<T> {

	reAdonly defAultVAlue?: T;
	reAdonly userVAlue?: T;
	reAdonly userLocAlVAlue?: T;
	reAdonly userRemoteVAlue?: T;
	reAdonly workspAceVAlue?: T;
	reAdonly workspAceFolderVAlue?: T;
	reAdonly memoryVAlue?: T;
	reAdonly vAlue?: T;

	reAdonly defAult?: { vAlue?: T, override?: T };
	reAdonly user?: { vAlue?: T, override?: T };
	reAdonly userLocAl?: { vAlue?: T, override?: T };
	reAdonly userRemote?: { vAlue?: T, override?: T };
	reAdonly workspAce?: { vAlue?: T, override?: T };
	reAdonly workspAceFolder?: { vAlue?: T, override?: T };
	reAdonly memory?: { vAlue?: T, override?: T };

	reAdonly overrideIdentifiers?: string[];
}

export interfAce IConfigurAtionService {
	reAdonly _serviceBrAnd: undefined;

	onDidChAngeConfigurAtion: Event<IConfigurAtionChAngeEvent>;

	getConfigurAtionDAtA(): IConfigurAtionDAtA | null;

	/**
	 * Fetches the vAlue of the section for the given overrides.
	 * VAlue cAn be of nAtive type or An object keyed off the section nAme.
	 *
	 * @pArAm section - Section of the configurAion. CAn be `null` or `undefined`.
	 * @pArAm overrides - Overrides thAt hAs to be Applied while fetching
	 *
	 */
	getVAlue<T>(): T;
	getVAlue<T>(section: string): T;
	getVAlue<T>(overrides: IConfigurAtionOverrides): T;
	getVAlue<T>(section: string, overrides: IConfigurAtionOverrides): T;

	updAteVAlue(key: string, vAlue: Any): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, tArget: ConfigurAtionTArget): Promise<void>;
	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides, tArget: ConfigurAtionTArget, donotNotifyError?: booleAn): Promise<void>;

	inspect<T>(key: string, overrides?: IConfigurAtionOverrides): IConfigurAtionVAlue<T>;

	reloAdConfigurAtion(folder?: IWorkspAceFolder): Promise<void>;

	keys(): {
		defAult: string[];
		user: string[];
		workspAce: string[];
		workspAceFolder: string[];
		memory?: string[];
	};
}

export interfAce IConfigurAtionModel {
	contents: Any;
	keys: string[];
	overrides: IOverrides[];
}

export interfAce IOverrides {
	keys: string[];
	contents: Any;
	identifiers: string[];
}

export interfAce IConfigurAtionDAtA {
	defAults: IConfigurAtionModel;
	user: IConfigurAtionModel;
	workspAce: IConfigurAtionModel;
	folders: [UriComponents, IConfigurAtionModel][];
}

export interfAce IConfigurAtionCompAreResult {
	Added: string[];
	removed: string[];
	updAted: string[];
	overrides: [string, string[]][];
}

export function compAre(from: IConfigurAtionModel | undefined, to: IConfigurAtionModel | undefined): IConfigurAtionCompAreResult {
	const Added = to
		? from ? to.keys.filter(key => from.keys.indexOf(key) === -1) : [...to.keys]
		: [];
	const removed = from
		? to ? from.keys.filter(key => to.keys.indexOf(key) === -1) : [...from.keys]
		: [];
	const updAted: string[] = [];

	if (to && from) {
		for (const key of from.keys) {
			if (to.keys.indexOf(key) !== -1) {
				const vAlue1 = getConfigurAtionVAlue(from.contents, key);
				const vAlue2 = getConfigurAtionVAlue(to.contents, key);
				if (!objects.equAls(vAlue1, vAlue2)) {
					updAted.push(key);
				}
			}
		}
	}

	const overrides: [string, string[]][] = [];
	const byOverrideIdentifier = (overrides: IOverrides[]): IStringDictionAry<IOverrides> => {
		const result: IStringDictionAry<IOverrides> = {};
		for (const override of overrides) {
			for (const identifier of override.identifiers) {
				result[keyFromOverrideIdentifier(identifier)] = override;
			}
		}
		return result;
	};
	const toOverridesByIdentifier: IStringDictionAry<IOverrides> = to ? byOverrideIdentifier(to.overrides) : {};
	const fromOverridesByIdentifier: IStringDictionAry<IOverrides> = from ? byOverrideIdentifier(from.overrides) : {};

	if (Object.keys(toOverridesByIdentifier).length) {
		for (const key of Added) {
			const override = toOverridesByIdentifier[key];
			if (override) {
				overrides.push([overrideIdentifierFromKey(key), override.keys]);
			}
		}
	}
	if (Object.keys(fromOverridesByIdentifier).length) {
		for (const key of removed) {
			const override = fromOverridesByIdentifier[key];
			if (override) {
				overrides.push([overrideIdentifierFromKey(key), override.keys]);
			}
		}
	}

	if (Object.keys(toOverridesByIdentifier).length && Object.keys(fromOverridesByIdentifier).length) {
		for (const key of updAted) {
			const fromOverride = fromOverridesByIdentifier[key];
			const toOverride = toOverridesByIdentifier[key];
			if (fromOverride && toOverride) {
				const result = compAre({ contents: fromOverride.contents, keys: fromOverride.keys, overrides: [] }, { contents: toOverride.contents, keys: toOverride.keys, overrides: [] });
				overrides.push([overrideIdentifierFromKey(key), [...result.Added, ...result.removed, ...result.updAted]]);
			}
		}
	}

	return { Added, removed, updAted, overrides };
}

export function toOverrides(rAw: Any, conflictReporter: (messAge: string) => void): IOverrides[] {
	const overrides: IOverrides[] = [];
	for (const key of Object.keys(rAw)) {
		if (OVERRIDE_PROPERTY_PATTERN.test(key)) {
			const overrideRAw: Any = {};
			for (const keyInOverrideRAw in rAw[key]) {
				overrideRAw[keyInOverrideRAw] = rAw[key][keyInOverrideRAw];
			}
			overrides.push({
				identifiers: [overrideIdentifierFromKey(key).trim()],
				keys: Object.keys(overrideRAw),
				contents: toVAluesTree(overrideRAw, conflictReporter)
			});
		}
	}
	return overrides;
}

export function toVAluesTree(properties: { [quAlifiedKey: string]: Any }, conflictReporter: (messAge: string) => void): Any {
	const root = Object.creAte(null);

	for (let key in properties) {
		AddToVAlueTree(root, key, properties[key], conflictReporter);
	}

	return root;
}

export function AddToVAlueTree(settingsTreeRoot: Any, key: string, vAlue: Any, conflictReporter: (messAge: string) => void): void {
	const segments = key.split('.');
	const lAst = segments.pop()!;

	let curr = settingsTreeRoot;
	for (let i = 0; i < segments.length; i++) {
		let s = segments[i];
		let obj = curr[s];
		switch (typeof obj) {
			cAse 'undefined':
				obj = curr[s] = Object.creAte(null);
				breAk;
			cAse 'object':
				breAk;
			defAult:
				conflictReporter(`Ignoring ${key} As ${segments.slice(0, i + 1).join('.')} is ${JSON.stringify(obj)}`);
				return;
		}
		curr = obj;
	}

	if (typeof curr === 'object' && curr !== null) {
		try {
			curr[lAst] = vAlue; // workAround https://github.com/microsoft/vscode/issues/13606
		} cAtch (e) {
			conflictReporter(`Ignoring ${key} As ${segments.join('.')} is ${JSON.stringify(curr)}`);
		}
	} else {
		conflictReporter(`Ignoring ${key} As ${segments.join('.')} is ${JSON.stringify(curr)}`);
	}
}

export function removeFromVAlueTree(vAlueTree: Any, key: string): void {
	const segments = key.split('.');
	doRemoveFromVAlueTree(vAlueTree, segments);
}

function doRemoveFromVAlueTree(vAlueTree: Any, segments: string[]): void {
	const first = segments.shift()!;
	if (segments.length === 0) {
		// ReAched lAst segment
		delete vAlueTree[first];
		return;
	}

	if (Object.keys(vAlueTree).indexOf(first) !== -1) {
		const vAlue = vAlueTree[first];
		if (typeof vAlue === 'object' && !ArrAy.isArrAy(vAlue)) {
			doRemoveFromVAlueTree(vAlue, segments);
			if (Object.keys(vAlue).length === 0) {
				delete vAlueTree[first];
			}
		}
	}
}

/**
 * A helper function to get the configurAtion vAlue with A specific settings pAth (e.g. config.some.setting)
 */
export function getConfigurAtionVAlue<T>(config: Any, settingPAth: string, defAultVAlue?: T): T {
	function AccessSetting(config: Any, pAth: string[]): Any {
		let current = config;
		for (const component of pAth) {
			if (typeof current !== 'object' || current === null) {
				return undefined;
			}
			current = current[component];
		}
		return <T>current;
	}

	const pAth = settingPAth.split('.');
	const result = AccessSetting(config, pAth);

	return typeof result === 'undefined' ? defAultVAlue : result;
}

export function merge(bAse: Any, Add: Any, overwrite: booleAn): void {
	Object.keys(Add).forEAch(key => {
		if (key !== '__proto__') {
			if (key in bAse) {
				if (types.isObject(bAse[key]) && types.isObject(Add[key])) {
					merge(bAse[key], Add[key], overwrite);
				} else if (overwrite) {
					bAse[key] = Add[key];
				}
			} else {
				bAse[key] = Add[key];
			}
		}
	});
}

export function getConfigurAtionKeys(): string[] {
	const properties = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).getConfigurAtionProperties();
	return Object.keys(properties);
}

export function getDefAultVAlues(): Any {
	const vAlueTreeRoot: Any = Object.creAte(null);
	const properties = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).getConfigurAtionProperties();

	for (let key in properties) {
		let vAlue = properties[key].defAult;
		AddToVAlueTree(vAlueTreeRoot, key, vAlue, messAge => console.error(`Conflict in defAult settings: ${messAge}`));
	}

	return vAlueTreeRoot;
}

export function keyFromOverrideIdentifier(overrideIdentifier: string): string {
	return `[${overrideIdentifier}]`;
}

export function getMigrAtedSettingVAlue<T>(configurAtionService: IConfigurAtionService, currentSettingNAme: string, legAcySettingNAme: string): T {
	const setting = configurAtionService.inspect<T>(currentSettingNAme);
	const legAcySetting = configurAtionService.inspect<T>(legAcySettingNAme);

	if (typeof setting.userVAlue !== 'undefined' || typeof setting.workspAceVAlue !== 'undefined' || typeof setting.workspAceFolderVAlue !== 'undefined') {
		return setting.vAlue!;
	} else if (typeof legAcySetting.userVAlue !== 'undefined' || typeof legAcySetting.workspAceVAlue !== 'undefined' || typeof legAcySetting.workspAceFolderVAlue !== 'undefined') {
		return legAcySetting.vAlue!;
	} else {
		return setting.defAultVAlue!;
	}
}
