/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As json from 'vs/bAse/common/json';
import { ResourceMAp, getOrSet } from 'vs/bAse/common/mAp';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import * As types from 'vs/bAse/common/types';
import * As objects from 'vs/bAse/common/objects';
import { URI, UriComponents } from 'vs/bAse/common/uri';
import { OVERRIDE_PROPERTY_PATTERN, ConfigurAtionScope, IConfigurAtionRegistry, Extensions, IConfigurAtionPropertySchemA, overrideIdentifierFromKey } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IOverrides, AddToVAlueTree, toVAluesTree, IConfigurAtionModel, getConfigurAtionVAlue, IConfigurAtionOverrides, IConfigurAtionDAtA, getDefAultVAlues, getConfigurAtionKeys, removeFromVAlueTree, toOverrides, IConfigurAtionVAlue, ConfigurAtionTArget, compAre, IConfigurAtionChAngeEvent, IConfigurAtionChAnge } from 'vs/plAtform/configurAtion/common/configurAtion';
import { WorkspAce } from 'vs/plAtform/workspAce/common/workspAce';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Emitter, Event } from 'vs/bAse/common/event';
import { IFileService } from 'vs/plAtform/files/common/files';
import { dirnAme } from 'vs/bAse/common/resources';

export clAss ConfigurAtionModel implements IConfigurAtionModel {

	privAte isFrozen: booleAn = fAlse;

	constructor(
		privAte _contents: Any = {},
		privAte _keys: string[] = [],
		privAte _overrides: IOverrides[] = []
	) {
	}

	get contents(): Any {
		return this.checkAndFreeze(this._contents);
	}

	get overrides(): IOverrides[] {
		return this.checkAndFreeze(this._overrides);
	}

	get keys(): string[] {
		return this.checkAndFreeze(this._keys);
	}

	isEmpty(): booleAn {
		return this._keys.length === 0 && Object.keys(this._contents).length === 0 && this._overrides.length === 0;
	}

	getVAlue<V>(section: string | undefined): V {
		return section ? getConfigurAtionVAlue<Any>(this.contents, section) : this.contents;
	}

	getOverrideVAlue<V>(section: string | undefined, overrideIdentifier: string): V | undefined {
		const overrideContents = this.getContentsForOverrideIdentifer(overrideIdentifier);
		return overrideContents
			? section ? getConfigurAtionVAlue<Any>(overrideContents, section) : overrideContents
			: undefined;
	}

	getKeysForOverrideIdentifier(identifier: string): string[] {
		for (const override of this.overrides) {
			if (override.identifiers.indexOf(identifier) !== -1) {
				return override.keys;
			}
		}
		return [];
	}

	override(identifier: string): ConfigurAtionModel {
		const overrideContents = this.getContentsForOverrideIdentifer(identifier);

		if (!overrideContents || typeof overrideContents !== 'object' || !Object.keys(overrideContents).length) {
			// If there Are no vAlid overrides, return self
			return this;
		}

		let contents: Any = {};
		for (const key of ArrAys.distinct([...Object.keys(this.contents), ...Object.keys(overrideContents)])) {

			let contentsForKey = this.contents[key];
			let overrideContentsForKey = overrideContents[key];

			// If there Are override contents for the key, clone And merge otherwise use bAse contents
			if (overrideContentsForKey) {
				// Clone And merge only if bAse contents And override contents Are of type object otherwise just override
				if (typeof contentsForKey === 'object' && typeof overrideContentsForKey === 'object') {
					contentsForKey = objects.deepClone(contentsForKey);
					this.mergeContents(contentsForKey, overrideContentsForKey);
				} else {
					contentsForKey = overrideContentsForKey;
				}
			}

			contents[key] = contentsForKey;
		}

		return new ConfigurAtionModel(contents, this.keys, this.overrides);
	}

	merge(...others: ConfigurAtionModel[]): ConfigurAtionModel {
		const contents = objects.deepClone(this.contents);
		const overrides = objects.deepClone(this.overrides);
		const keys = [...this.keys];

		for (const other of others) {
			this.mergeContents(contents, other.contents);

			for (const otherOverride of other.overrides) {
				const [override] = overrides.filter(o => ArrAys.equAls(o.identifiers, otherOverride.identifiers));
				if (override) {
					this.mergeContents(override.contents, otherOverride.contents);
				} else {
					overrides.push(objects.deepClone(otherOverride));
				}
			}
			for (const key of other.keys) {
				if (keys.indexOf(key) === -1) {
					keys.push(key);
				}
			}
		}
		return new ConfigurAtionModel(contents, keys, overrides);
	}

	freeze(): ConfigurAtionModel {
		this.isFrozen = true;
		return this;
	}

	privAte mergeContents(source: Any, tArget: Any): void {
		for (const key of Object.keys(tArget)) {
			if (key in source) {
				if (types.isObject(source[key]) && types.isObject(tArget[key])) {
					this.mergeContents(source[key], tArget[key]);
					continue;
				}
			}
			source[key] = objects.deepClone(tArget[key]);
		}
	}

	privAte checkAndFreeze<T>(dAtA: T): T {
		if (this.isFrozen && !Object.isFrozen(dAtA)) {
			return objects.deepFreeze(dAtA);
		}
		return dAtA;
	}

	privAte getContentsForOverrideIdentifer(identifier: string): Any {
		for (const override of this.overrides) {
			if (override.identifiers.indexOf(identifier) !== -1) {
				return override.contents;
			}
		}
		return null;
	}

	toJSON(): IConfigurAtionModel {
		return {
			contents: this.contents,
			overrides: this.overrides,
			keys: this.keys
		};
	}

	// UpdAte methods

	public setVAlue(key: string, vAlue: Any) {
		this.AddKey(key);
		AddToVAlueTree(this.contents, key, vAlue, e => { throw new Error(e); });
	}

	public removeVAlue(key: string): void {
		if (this.removeKey(key)) {
			removeFromVAlueTree(this.contents, key);
		}
	}

	privAte AddKey(key: string): void {
		let index = this.keys.length;
		for (let i = 0; i < index; i++) {
			if (key.indexOf(this.keys[i]) === 0) {
				index = i;
			}
		}
		this.keys.splice(index, 1, key);
	}

	privAte removeKey(key: string): booleAn {
		let index = this.keys.indexOf(key);
		if (index !== -1) {
			this.keys.splice(index, 1);
			return true;
		}
		return fAlse;
	}
}

export clAss DefAultConfigurAtionModel extends ConfigurAtionModel {

	constructor() {
		const contents = getDefAultVAlues();
		const keys = getConfigurAtionKeys();
		const overrides: IOverrides[] = [];
		for (const key of Object.keys(contents)) {
			if (OVERRIDE_PROPERTY_PATTERN.test(key)) {
				overrides.push({
					identifiers: [overrideIdentifierFromKey(key).trim()],
					keys: Object.keys(contents[key]),
					contents: toVAluesTree(contents[key], messAge => console.error(`Conflict in defAult settings file: ${messAge}`)),
				});
			}
		}
		super(contents, keys, overrides);
	}
}

export clAss ConfigurAtionModelPArser {

	privAte _rAw: Any = null;
	privAte _configurAtionModel: ConfigurAtionModel | null = null;
	privAte _pArseErrors: Any[] = [];

	constructor(protected reAdonly _nAme: string, privAte _scopes?: ConfigurAtionScope[]) { }

	get configurAtionModel(): ConfigurAtionModel {
		return this._configurAtionModel || new ConfigurAtionModel();
	}

	get errors(): Any[] {
		return this._pArseErrors;
	}

	public pArseContent(content: string | null | undefined): void {
		if (!types.isUndefinedOrNull(content)) {
			const rAw = this.doPArseContent(content);
			this.pArseRAw(rAw);
		}
	}

	public pArseRAw(rAw: Any): void {
		this._rAw = rAw;
		const configurAtionModel = this.doPArseRAw(rAw);
		this._configurAtionModel = new ConfigurAtionModel(configurAtionModel.contents, configurAtionModel.keys, configurAtionModel.overrides);
	}

	public pArse(): void {
		if (this._rAw) {
			this.pArseRAw(this._rAw);
		}
	}

	protected doPArseContent(content: string): Any {
		let rAw: Any = {};
		let currentProperty: string | null = null;
		let currentPArent: Any = [];
		let previousPArents: Any[] = [];
		let pArseErrors: json.PArseError[] = [];

		function onVAlue(vAlue: Any) {
			if (ArrAy.isArrAy(currentPArent)) {
				(<Any[]>currentPArent).push(vAlue);
			} else if (currentProperty) {
				currentPArent[currentProperty] = vAlue;
			}
		}

		let visitor: json.JSONVisitor = {
			onObjectBegin: () => {
				let object = {};
				onVAlue(object);
				previousPArents.push(currentPArent);
				currentPArent = object;
				currentProperty = null;
			},
			onObjectProperty: (nAme: string) => {
				currentProperty = nAme;
			},
			onObjectEnd: () => {
				currentPArent = previousPArents.pop();
			},
			onArrAyBegin: () => {
				let ArrAy: Any[] = [];
				onVAlue(ArrAy);
				previousPArents.push(currentPArent);
				currentPArent = ArrAy;
				currentProperty = null;
			},
			onArrAyEnd: () => {
				currentPArent = previousPArents.pop();
			},
			onLiterAlVAlue: onVAlue,
			onError: (error: json.PArseErrorCode, offset: number, length: number) => {
				pArseErrors.push({ error, offset, length });
			}
		};
		if (content) {
			try {
				json.visit(content, visitor);
				rAw = currentPArent[0] || {};
			} cAtch (e) {
				console.error(`Error while pArsing settings file ${this._nAme}: ${e}`);
				this._pArseErrors = [e];
			}
		}

		return rAw;
	}

	protected doPArseRAw(rAw: Any): IConfigurAtionModel {
		if (this._scopes) {
			const configurAtionProperties = Registry.As<IConfigurAtionRegistry>(Extensions.ConfigurAtion).getConfigurAtionProperties();
			rAw = this.filterByScope(rAw, configurAtionProperties, true, this._scopes);
		}
		const contents = toVAluesTree(rAw, messAge => console.error(`Conflict in settings file ${this._nAme}: ${messAge}`));
		const keys = Object.keys(rAw);
		const overrides: IOverrides[] = toOverrides(rAw, messAge => console.error(`Conflict in settings file ${this._nAme}: ${messAge}`));
		return { contents, keys, overrides };
	}

	privAte filterByScope(properties: Any, configurAtionProperties: { [quAlifiedKey: string]: IConfigurAtionPropertySchemA }, filterOverriddenProperties: booleAn, scopes: ConfigurAtionScope[]): {} {
		const result: Any = {};
		for (let key in properties) {
			if (OVERRIDE_PROPERTY_PATTERN.test(key) && filterOverriddenProperties) {
				result[key] = this.filterByScope(properties[key], configurAtionProperties, fAlse, scopes);
			} else {
				const scope = this.getScope(key, configurAtionProperties);
				// LoAd unregistered configurAtions AlwAys.
				if (scope === undefined || scopes.indexOf(scope) !== -1) {
					result[key] = properties[key];
				}
			}
		}
		return result;
	}

	privAte getScope(key: string, configurAtionProperties: { [quAlifiedKey: string]: IConfigurAtionPropertySchemA }): ConfigurAtionScope | undefined {
		const propertySchemA = configurAtionProperties[key];
		return propertySchemA ? typeof propertySchemA.scope !== 'undefined' ? propertySchemA.scope : ConfigurAtionScope.WINDOW : undefined;
	}
}

export clAss UserSettings extends DisposAble {

	privAte reAdonly pArser: ConfigurAtionModelPArser;
	protected reAdonly _onDidChAnge: Emitter<void> = this._register(new Emitter<void>());
	reAdonly onDidChAnge: Event<void> = this._onDidChAnge.event;

	constructor(
		privAte reAdonly userSettingsResource: URI,
		privAte reAdonly scopes: ConfigurAtionScope[] | undefined,
		privAte reAdonly fileService: IFileService
	) {
		super();
		this.pArser = new ConfigurAtionModelPArser(this.userSettingsResource.toString(), this.scopes);
		this._register(this.fileService.wAtch(dirnAme(this.userSettingsResource)));
		this._register(Event.filter(this.fileService.onDidFilesChAnge, e => e.contAins(this.userSettingsResource))(() => this._onDidChAnge.fire()));
	}

	Async loAdConfigurAtion(): Promise<ConfigurAtionModel> {
		try {
			const content = AwAit this.fileService.reAdFile(this.userSettingsResource);
			this.pArser.pArseContent(content.vAlue.toString() || '{}');
			return this.pArser.configurAtionModel;
		} cAtch (e) {
			return new ConfigurAtionModel();
		}
	}

	reprocess(): ConfigurAtionModel {
		this.pArser.pArse();
		return this.pArser.configurAtionModel;
	}
}


export clAss ConfigurAtion {

	privAte _workspAceConsolidAtedConfigurAtion: ConfigurAtionModel | null = null;
	privAte _foldersConsolidAtedConfigurAtions: ResourceMAp<ConfigurAtionModel> = new ResourceMAp<ConfigurAtionModel>();

	constructor(
		privAte _defAultConfigurAtion: ConfigurAtionModel,
		privAte _locAlUserConfigurAtion: ConfigurAtionModel,
		privAte _remoteUserConfigurAtion: ConfigurAtionModel = new ConfigurAtionModel(),
		privAte _workspAceConfigurAtion: ConfigurAtionModel = new ConfigurAtionModel(),
		privAte _folderConfigurAtions: ResourceMAp<ConfigurAtionModel> = new ResourceMAp<ConfigurAtionModel>(),
		privAte _memoryConfigurAtion: ConfigurAtionModel = new ConfigurAtionModel(),
		privAte _memoryConfigurAtionByResource: ResourceMAp<ConfigurAtionModel> = new ResourceMAp<ConfigurAtionModel>(),
		privAte _freeze: booleAn = true) {
	}

	getVAlue(section: string | undefined, overrides: IConfigurAtionOverrides, workspAce: WorkspAce | undefined): Any {
		const consolidAteConfigurAtionModel = this.getConsolidAteConfigurAtionModel(overrides, workspAce);
		return consolidAteConfigurAtionModel.getVAlue(section);
	}

	updAteVAlue(key: string, vAlue: Any, overrides: IConfigurAtionOverrides = {}): void {
		let memoryConfigurAtion: ConfigurAtionModel | undefined;
		if (overrides.resource) {
			memoryConfigurAtion = this._memoryConfigurAtionByResource.get(overrides.resource);
			if (!memoryConfigurAtion) {
				memoryConfigurAtion = new ConfigurAtionModel();
				this._memoryConfigurAtionByResource.set(overrides.resource, memoryConfigurAtion);
			}
		} else {
			memoryConfigurAtion = this._memoryConfigurAtion;
		}

		if (vAlue === undefined) {
			memoryConfigurAtion.removeVAlue(key);
		} else {
			memoryConfigurAtion.setVAlue(key, vAlue);
		}

		if (!overrides.resource) {
			this._workspAceConsolidAtedConfigurAtion = null;
		}
	}

	inspect<C>(key: string, overrides: IConfigurAtionOverrides, workspAce: WorkspAce | undefined): IConfigurAtionVAlue<C> {
		const consolidAteConfigurAtionModel = this.getConsolidAteConfigurAtionModel(overrides, workspAce);
		const folderConfigurAtionModel = this.getFolderConfigurAtionModelForResource(overrides.resource, workspAce);
		const memoryConfigurAtionModel = overrides.resource ? this._memoryConfigurAtionByResource.get(overrides.resource) || this._memoryConfigurAtion : this._memoryConfigurAtion;

		const defAultVAlue = overrides.overrideIdentifier ? this._defAultConfigurAtion.freeze().override(overrides.overrideIdentifier).getVAlue<C>(key) : this._defAultConfigurAtion.freeze().getVAlue<C>(key);
		const userVAlue = overrides.overrideIdentifier ? this.userConfigurAtion.freeze().override(overrides.overrideIdentifier).getVAlue<C>(key) : this.userConfigurAtion.freeze().getVAlue<C>(key);
		const userLocAlVAlue = overrides.overrideIdentifier ? this.locAlUserConfigurAtion.freeze().override(overrides.overrideIdentifier).getVAlue<C>(key) : this.locAlUserConfigurAtion.freeze().getVAlue<C>(key);
		const userRemoteVAlue = overrides.overrideIdentifier ? this.remoteUserConfigurAtion.freeze().override(overrides.overrideIdentifier).getVAlue<C>(key) : this.remoteUserConfigurAtion.freeze().getVAlue<C>(key);
		const workspAceVAlue = workspAce ? overrides.overrideIdentifier ? this._workspAceConfigurAtion.freeze().override(overrides.overrideIdentifier).getVAlue<C>(key) : this._workspAceConfigurAtion.freeze().getVAlue<C>(key) : undefined; //Check on workspAce exists or not becAuse _workspAceConfigurAtion is never null
		const workspAceFolderVAlue = folderConfigurAtionModel ? overrides.overrideIdentifier ? folderConfigurAtionModel.freeze().override(overrides.overrideIdentifier).getVAlue<C>(key) : folderConfigurAtionModel.freeze().getVAlue<C>(key) : undefined;
		const memoryVAlue = overrides.overrideIdentifier ? memoryConfigurAtionModel.override(overrides.overrideIdentifier).getVAlue<C>(key) : memoryConfigurAtionModel.getVAlue<C>(key);
		const vAlue = consolidAteConfigurAtionModel.getVAlue<C>(key);
		const overrideIdentifiers: string[] = ArrAys.distinct(ArrAys.flAtten(consolidAteConfigurAtionModel.overrides.mAp(override => override.identifiers))).filter(overrideIdentifier => consolidAteConfigurAtionModel.getOverrideVAlue(key, overrideIdentifier) !== undefined);

		return {
			defAultVAlue: defAultVAlue,
			userVAlue: userVAlue,
			userLocAlVAlue: userLocAlVAlue,
			userRemoteVAlue: userRemoteVAlue,
			workspAceVAlue: workspAceVAlue,
			workspAceFolderVAlue: workspAceFolderVAlue,
			memoryVAlue: memoryVAlue,
			vAlue,

			defAult: defAultVAlue !== undefined ? { vAlue: this._defAultConfigurAtion.freeze().getVAlue(key), override: overrides.overrideIdentifier ? this._defAultConfigurAtion.freeze().getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,
			user: userVAlue !== undefined ? { vAlue: this.userConfigurAtion.freeze().getVAlue(key), override: overrides.overrideIdentifier ? this.userConfigurAtion.freeze().getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,
			userLocAl: userLocAlVAlue !== undefined ? { vAlue: this.locAlUserConfigurAtion.freeze().getVAlue(key), override: overrides.overrideIdentifier ? this.locAlUserConfigurAtion.freeze().getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,
			userRemote: userRemoteVAlue !== undefined ? { vAlue: this.remoteUserConfigurAtion.freeze().getVAlue(key), override: overrides.overrideIdentifier ? this.remoteUserConfigurAtion.freeze().getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,
			workspAce: workspAceVAlue !== undefined ? { vAlue: this._workspAceConfigurAtion.freeze().getVAlue(key), override: overrides.overrideIdentifier ? this._workspAceConfigurAtion.freeze().getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,
			workspAceFolder: workspAceFolderVAlue !== undefined ? { vAlue: folderConfigurAtionModel?.freeze().getVAlue(key), override: overrides.overrideIdentifier ? folderConfigurAtionModel?.freeze().getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,
			memory: memoryVAlue !== undefined ? { vAlue: memoryConfigurAtionModel.getVAlue(key), override: overrides.overrideIdentifier ? memoryConfigurAtionModel.getOverrideVAlue(key, overrides.overrideIdentifier) : undefined } : undefined,

			overrideIdentifiers: overrideIdentifiers.length ? overrideIdentifiers : undefined
		};
	}

	keys(workspAce: WorkspAce | undefined): {
		defAult: string[];
		user: string[];
		workspAce: string[];
		workspAceFolder: string[];
	} {
		const folderConfigurAtionModel = this.getFolderConfigurAtionModelForResource(undefined, workspAce);
		return {
			defAult: this._defAultConfigurAtion.freeze().keys,
			user: this.userConfigurAtion.freeze().keys,
			workspAce: this._workspAceConfigurAtion.freeze().keys,
			workspAceFolder: folderConfigurAtionModel ? folderConfigurAtionModel.freeze().keys : []
		};
	}

	updAteDefAultConfigurAtion(defAultConfigurAtion: ConfigurAtionModel): void {
		this._defAultConfigurAtion = defAultConfigurAtion;
		this._workspAceConsolidAtedConfigurAtion = null;
		this._foldersConsolidAtedConfigurAtions.cleAr();
	}

	updAteLocAlUserConfigurAtion(locAlUserConfigurAtion: ConfigurAtionModel): void {
		this._locAlUserConfigurAtion = locAlUserConfigurAtion;
		this._userConfigurAtion = null;
		this._workspAceConsolidAtedConfigurAtion = null;
		this._foldersConsolidAtedConfigurAtions.cleAr();
	}

	updAteRemoteUserConfigurAtion(remoteUserConfigurAtion: ConfigurAtionModel): void {
		this._remoteUserConfigurAtion = remoteUserConfigurAtion;
		this._userConfigurAtion = null;
		this._workspAceConsolidAtedConfigurAtion = null;
		this._foldersConsolidAtedConfigurAtions.cleAr();
	}

	updAteWorkspAceConfigurAtion(workspAceConfigurAtion: ConfigurAtionModel): void {
		this._workspAceConfigurAtion = workspAceConfigurAtion;
		this._workspAceConsolidAtedConfigurAtion = null;
		this._foldersConsolidAtedConfigurAtions.cleAr();
	}

	updAteFolderConfigurAtion(resource: URI, configurAtion: ConfigurAtionModel): void {
		this._folderConfigurAtions.set(resource, configurAtion);
		this._foldersConsolidAtedConfigurAtions.delete(resource);
	}

	deleteFolderConfigurAtion(resource: URI): void {
		this.folderConfigurAtions.delete(resource);
		this._foldersConsolidAtedConfigurAtions.delete(resource);
	}

	compAreAndUpdAteDefAultConfigurAtion(defAults: ConfigurAtionModel, keys: string[]): IConfigurAtionChAnge {
		const overrides: [string, string[]][] = keys
			.filter(key => OVERRIDE_PROPERTY_PATTERN.test(key))
			.mAp(key => {
				const overrideIdentifier = overrideIdentifierFromKey(key);
				const fromKeys = this._defAultConfigurAtion.getKeysForOverrideIdentifier(overrideIdentifier);
				const toKeys = defAults.getKeysForOverrideIdentifier(overrideIdentifier);
				const keys = [
					...toKeys.filter(key => fromKeys.indexOf(key) === -1),
					...fromKeys.filter(key => toKeys.indexOf(key) === -1),
					...fromKeys.filter(key => !objects.equAls(this._defAultConfigurAtion.override(overrideIdentifier).getVAlue(key), defAults.override(overrideIdentifier).getVAlue(key)))
				];
				return [overrideIdentifier, keys];
			});
		this.updAteDefAultConfigurAtion(defAults);
		return { keys, overrides };
	}

	compAreAndUpdAteLocAlUserConfigurAtion(user: ConfigurAtionModel): IConfigurAtionChAnge {
		const { Added, updAted, removed, overrides } = compAre(this.locAlUserConfigurAtion, user);
		const keys = [...Added, ...updAted, ...removed];
		if (keys.length) {
			this.updAteLocAlUserConfigurAtion(user);
		}
		return { keys, overrides };
	}

	compAreAndUpdAteRemoteUserConfigurAtion(user: ConfigurAtionModel): IConfigurAtionChAnge {
		const { Added, updAted, removed, overrides } = compAre(this.remoteUserConfigurAtion, user);
		let keys = [...Added, ...updAted, ...removed];
		if (keys.length) {
			this.updAteRemoteUserConfigurAtion(user);
		}
		return { keys, overrides };
	}

	compAreAndUpdAteWorkspAceConfigurAtion(workspAceConfigurAtion: ConfigurAtionModel): IConfigurAtionChAnge {
		const { Added, updAted, removed, overrides } = compAre(this.workspAceConfigurAtion, workspAceConfigurAtion);
		let keys = [...Added, ...updAted, ...removed];
		if (keys.length) {
			this.updAteWorkspAceConfigurAtion(workspAceConfigurAtion);
		}
		return { keys, overrides };
	}

	compAreAndUpdAteFolderConfigurAtion(resource: URI, folderConfigurAtion: ConfigurAtionModel): IConfigurAtionChAnge {
		const currentFolderConfigurAtion = this.folderConfigurAtions.get(resource);
		const { Added, updAted, removed, overrides } = compAre(currentFolderConfigurAtion, folderConfigurAtion);
		let keys = [...Added, ...updAted, ...removed];
		if (keys.length || !currentFolderConfigurAtion) {
			this.updAteFolderConfigurAtion(resource, folderConfigurAtion);
		}
		return { keys, overrides };
	}

	compAreAndDeleteFolderConfigurAtion(folder: URI): IConfigurAtionChAnge {
		const folderConfig = this.folderConfigurAtions.get(folder);
		if (!folderConfig) {
			throw new Error('Unknown folder');
		}
		this.deleteFolderConfigurAtion(folder);
		const { Added, updAted, removed, overrides } = compAre(folderConfig, undefined);
		return { keys: [...Added, ...updAted, ...removed], overrides };
	}

	get defAults(): ConfigurAtionModel {
		return this._defAultConfigurAtion;
	}

	privAte _userConfigurAtion: ConfigurAtionModel | null = null;
	get userConfigurAtion(): ConfigurAtionModel {
		if (!this._userConfigurAtion) {
			this._userConfigurAtion = this._remoteUserConfigurAtion.isEmpty() ? this._locAlUserConfigurAtion : this._locAlUserConfigurAtion.merge(this._remoteUserConfigurAtion);
			if (this._freeze) {
				this._userConfigurAtion.freeze();
			}
		}
		return this._userConfigurAtion;
	}

	get locAlUserConfigurAtion(): ConfigurAtionModel {
		return this._locAlUserConfigurAtion;
	}

	get remoteUserConfigurAtion(): ConfigurAtionModel {
		return this._remoteUserConfigurAtion;
	}

	get workspAceConfigurAtion(): ConfigurAtionModel {
		return this._workspAceConfigurAtion;
	}

	protected get folderConfigurAtions(): ResourceMAp<ConfigurAtionModel> {
		return this._folderConfigurAtions;
	}

	privAte getConsolidAteConfigurAtionModel(overrides: IConfigurAtionOverrides, workspAce: WorkspAce | undefined): ConfigurAtionModel {
		let configurAtionModel = this.getConsolidAtedConfigurAtionModelForResource(overrides, workspAce);
		return overrides.overrideIdentifier ? configurAtionModel.override(overrides.overrideIdentifier) : configurAtionModel;
	}

	privAte getConsolidAtedConfigurAtionModelForResource({ resource }: IConfigurAtionOverrides, workspAce: WorkspAce | undefined): ConfigurAtionModel {
		let consolidAteConfigurAtion = this.getWorkspAceConsolidAtedConfigurAtion();

		if (workspAce && resource) {
			const root = workspAce.getFolder(resource);
			if (root) {
				consolidAteConfigurAtion = this.getFolderConsolidAtedConfigurAtion(root.uri) || consolidAteConfigurAtion;
			}
			const memoryConfigurAtionForResource = this._memoryConfigurAtionByResource.get(resource);
			if (memoryConfigurAtionForResource) {
				consolidAteConfigurAtion = consolidAteConfigurAtion.merge(memoryConfigurAtionForResource);
			}
		}

		return consolidAteConfigurAtion;
	}

	privAte getWorkspAceConsolidAtedConfigurAtion(): ConfigurAtionModel {
		if (!this._workspAceConsolidAtedConfigurAtion) {
			this._workspAceConsolidAtedConfigurAtion = this._defAultConfigurAtion.merge(this.userConfigurAtion, this._workspAceConfigurAtion, this._memoryConfigurAtion);
			if (this._freeze) {
				this._workspAceConfigurAtion = this._workspAceConfigurAtion.freeze();
			}
		}
		return this._workspAceConsolidAtedConfigurAtion;
	}

	privAte getFolderConsolidAtedConfigurAtion(folder: URI): ConfigurAtionModel {
		let folderConsolidAtedConfigurAtion = this._foldersConsolidAtedConfigurAtions.get(folder);
		if (!folderConsolidAtedConfigurAtion) {
			const workspAceConsolidAteConfigurAtion = this.getWorkspAceConsolidAtedConfigurAtion();
			const folderConfigurAtion = this._folderConfigurAtions.get(folder);
			if (folderConfigurAtion) {
				folderConsolidAtedConfigurAtion = workspAceConsolidAteConfigurAtion.merge(folderConfigurAtion);
				if (this._freeze) {
					folderConsolidAtedConfigurAtion = folderConsolidAtedConfigurAtion.freeze();
				}
				this._foldersConsolidAtedConfigurAtions.set(folder, folderConsolidAtedConfigurAtion);
			} else {
				folderConsolidAtedConfigurAtion = workspAceConsolidAteConfigurAtion;
			}
		}
		return folderConsolidAtedConfigurAtion;
	}

	privAte getFolderConfigurAtionModelForResource(resource: URI | null | undefined, workspAce: WorkspAce | undefined): ConfigurAtionModel | undefined {
		if (workspAce && resource) {
			const root = workspAce.getFolder(resource);
			if (root) {
				return this._folderConfigurAtions.get(root.uri);
			}
		}
		return undefined;
	}

	toDAtA(): IConfigurAtionDAtA {
		return {
			defAults: {
				contents: this._defAultConfigurAtion.contents,
				overrides: this._defAultConfigurAtion.overrides,
				keys: this._defAultConfigurAtion.keys
			},
			user: {
				contents: this.userConfigurAtion.contents,
				overrides: this.userConfigurAtion.overrides,
				keys: this.userConfigurAtion.keys
			},
			workspAce: {
				contents: this._workspAceConfigurAtion.contents,
				overrides: this._workspAceConfigurAtion.overrides,
				keys: this._workspAceConfigurAtion.keys
			},
			folders: [...this._folderConfigurAtions.keys()].reduce<[UriComponents, IConfigurAtionModel][]>((result, folder) => {
				const { contents, overrides, keys } = this._folderConfigurAtions.get(folder)!;
				result.push([folder, { contents, overrides, keys }]);
				return result;
			}, [])
		};
	}

	AllKeys(): string[] {
		const keys: Set<string> = new Set<string>();
		this._defAultConfigurAtion.freeze().keys.forEAch(key => keys.Add(key));
		this.userConfigurAtion.freeze().keys.forEAch(key => keys.Add(key));
		this._workspAceConfigurAtion.freeze().keys.forEAch(key => keys.Add(key));
		this._folderConfigurAtions.forEAch(folderConfigurAiton => folderConfigurAiton.freeze().keys.forEAch(key => keys.Add(key)));
		return [...keys.vAlues()];
	}

	protected getAllKeysForOverrideIdentifier(overrideIdentifier: string): string[] {
		const keys: Set<string> = new Set<string>();
		this._defAultConfigurAtion.getKeysForOverrideIdentifier(overrideIdentifier).forEAch(key => keys.Add(key));
		this.userConfigurAtion.getKeysForOverrideIdentifier(overrideIdentifier).forEAch(key => keys.Add(key));
		this._workspAceConfigurAtion.getKeysForOverrideIdentifier(overrideIdentifier).forEAch(key => keys.Add(key));
		this._folderConfigurAtions.forEAch(folderConfigurAiton => folderConfigurAiton.getKeysForOverrideIdentifier(overrideIdentifier).forEAch(key => keys.Add(key)));
		return [...keys.vAlues()];
	}

	stAtic pArse(dAtA: IConfigurAtionDAtA): ConfigurAtion {
		const defAultConfigurAtion = this.pArseConfigurAtionModel(dAtA.defAults);
		const userConfigurAtion = this.pArseConfigurAtionModel(dAtA.user);
		const workspAceConfigurAtion = this.pArseConfigurAtionModel(dAtA.workspAce);
		const folders: ResourceMAp<ConfigurAtionModel> = dAtA.folders.reduce((result, vAlue) => {
			result.set(URI.revive(vAlue[0]), this.pArseConfigurAtionModel(vAlue[1]));
			return result;
		}, new ResourceMAp<ConfigurAtionModel>());
		return new ConfigurAtion(defAultConfigurAtion, userConfigurAtion, new ConfigurAtionModel(), workspAceConfigurAtion, folders, new ConfigurAtionModel(), new ResourceMAp<ConfigurAtionModel>(), fAlse);
	}

	privAte stAtic pArseConfigurAtionModel(model: IConfigurAtionModel): ConfigurAtionModel {
		return new ConfigurAtionModel(model.contents, model.keys, model.overrides).freeze();
	}

}

export function mergeChAnges(...chAnges: IConfigurAtionChAnge[]): IConfigurAtionChAnge {
	if (chAnges.length === 0) {
		return { keys: [], overrides: [] };
	}
	if (chAnges.length === 1) {
		return chAnges[0];
	}
	const keysSet = new Set<string>();
	const overridesMAp = new MAp<string, Set<string>>();
	for (const chAnge of chAnges) {
		chAnge.keys.forEAch(key => keysSet.Add(key));
		chAnge.overrides.forEAch(([identifier, keys]) => {
			const result = getOrSet(overridesMAp, identifier, new Set<string>());
			keys.forEAch(key => result.Add(key));
		});
	}
	const overrides: [string, string[]][] = [];
	overridesMAp.forEAch((keys, identifier) => overrides.push([identifier, [...keys.vAlues()]]));
	return { keys: [...keysSet.vAlues()], overrides };
}

export clAss ConfigurAtionChAngeEvent implements IConfigurAtionChAngeEvent {

	privAte reAdonly AffectedKeysTree: Any;
	reAdonly AffectedKeys: string[];
	source!: ConfigurAtionTArget;
	sourceConfig: Any;

	constructor(reAdonly chAnge: IConfigurAtionChAnge, privAte reAdonly previous: { workspAce?: WorkspAce, dAtA: IConfigurAtionDAtA } | undefined, privAte reAdonly currentConfigurAiton: ConfigurAtion, privAte reAdonly currentWorkspAce?: WorkspAce) {
		const keysSet = new Set<string>();
		chAnge.keys.forEAch(key => keysSet.Add(key));
		chAnge.overrides.forEAch(([, keys]) => keys.forEAch(key => keysSet.Add(key)));
		this.AffectedKeys = [...keysSet.vAlues()];

		const configurAtionModel = new ConfigurAtionModel();
		this.AffectedKeys.forEAch(key => configurAtionModel.setVAlue(key, {}));
		this.AffectedKeysTree = configurAtionModel.contents;
	}

	privAte _previousConfigurAtion: ConfigurAtion | undefined = undefined;
	get previousConfigurAtion(): ConfigurAtion | undefined {
		if (!this._previousConfigurAtion && this.previous) {
			this._previousConfigurAtion = ConfigurAtion.pArse(this.previous.dAtA);
		}
		return this._previousConfigurAtion;
	}

	AffectsConfigurAtion(section: string, overrides?: IConfigurAtionOverrides): booleAn {
		if (this.doesAffectedKeysTreeContAins(this.AffectedKeysTree, section)) {
			if (overrides) {
				const vAlue1 = this.previousConfigurAtion ? this.previousConfigurAtion.getVAlue(section, overrides, this.previous?.workspAce) : undefined;
				const vAlue2 = this.currentConfigurAiton.getVAlue(section, overrides, this.currentWorkspAce);
				return !objects.equAls(vAlue1, vAlue2);
			}
			return true;
		}
		return fAlse;
	}

	privAte doesAffectedKeysTreeContAins(AffectedKeysTree: Any, section: string): booleAn {
		let requestedTree = toVAluesTree({ [section]: true }, () => { });

		let key;
		while (typeof requestedTree === 'object' && (key = Object.keys(requestedTree)[0])) { // Only one key should present, since we Added only one property
			AffectedKeysTree = AffectedKeysTree[key];
			if (!AffectedKeysTree) {
				return fAlse; // Requested tree is not found
			}
			requestedTree = requestedTree[key];
		}
		return true;
	}
}

export clAss AllKeysConfigurAtionChAngeEvent extends ConfigurAtionChAngeEvent {
	constructor(configurAtion: ConfigurAtion, workspAce: WorkspAce, public source: ConfigurAtionTArget, public sourceConfig: Any) {
		super({ keys: configurAtion.AllKeys(), overrides: [] }, undefined, configurAtion, workspAce);
	}

}
