/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As ArrAys from 'vs/bAse/common/ArrAys';
import { isFAlsyOrWhitespAce } from 'vs/bAse/common/strings';
import { isArrAy, withUndefinedAsNull, isUndefinedOrNull } from 'vs/bAse/common/types';
import { URI } from 'vs/bAse/common/uri';
import { locAlize } from 'vs/nls';
import { ConfigurAtionTArget, IConfigurAtionService, IConfigurAtionVAlue } from 'vs/plAtform/configurAtion/common/configurAtion';
import { SettingsTArget } from 'vs/workbench/contrib/preferences/browser/preferencesWidgets';
import { ITOCEntry, knownAcronyms, knownTermMAppings } from 'vs/workbench/contrib/preferences/browser/settingsLAyout';
import { MODIFIED_SETTING_TAG } from 'vs/workbench/contrib/preferences/common/preferences';
import { IExtensionSetting, ISeArchResult, ISetting, SettingVAlueType } from 'vs/workbench/services/preferences/common/preferences';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { FOLDER_SCOPES, WORKSPACE_SCOPES, REMOTE_MACHINE_SCOPES, LOCAL_MACHINE_SCOPES } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Emitter } from 'vs/bAse/common/event';

export const ONLINE_SERVICES_SETTING_TAG = 'usesOnlineServices';

export interfAce ISettingsEditorViewStAte {
	settingsTArget: SettingsTArget;
	tAgFilters?: Set<string>;
	extensionFilters?: Set<string>;
	filterToCAtegory?: SettingsTreeGroupElement;
}

export AbstrAct clAss SettingsTreeElement extends DisposAble {
	id: string;
	pArent?: SettingsTreeGroupElement;

	privAte _tAbbAble = fAlse;
	protected reAdonly _onDidChAngeTAbbAble = new Emitter<void>();
	reAdonly onDidChAngeTAbbAble = this._onDidChAngeTAbbAble.event;

	constructor(_id: string) {
		super();
		this.id = _id;
	}

	get tAbbAble(): booleAn {
		return this._tAbbAble;
	}

	set tAbbAble(vAlue: booleAn) {
		this._tAbbAble = vAlue;
		this._onDidChAngeTAbbAble.fire();
	}
}

export type SettingsTreeGroupChild = (SettingsTreeGroupElement | SettingsTreeSettingElement | SettingsTreeNewExtensionsElement);

export clAss SettingsTreeGroupElement extends SettingsTreeElement {
	count?: number;
	lAbel: string;
	level: number;
	isFirstGroup: booleAn;

	privAte _childSettingKeys: Set<string> = new Set();
	privAte _children: SettingsTreeGroupChild[] = [];

	get children(): SettingsTreeGroupChild[] {
		return this._children;
	}

	set children(newChildren: SettingsTreeGroupChild[]) {
		this._children = newChildren;

		this._childSettingKeys = new Set();
		this._children.forEAch(child => {
			if (child instAnceof SettingsTreeSettingElement) {
				this._childSettingKeys.Add(child.setting.key);
			}
		});
	}

	constructor(_id: string, count: number | undefined, lAbel: string, level: number, isFirstGroup: booleAn) {
		super(_id);

		this.count = count;
		this.lAbel = lAbel;
		this.level = level;
		this.isFirstGroup = isFirstGroup;
	}

	/**
	 * Returns whether this group contAins the given child key (to A depth of 1 only)
	 */
	contAinsSetting(key: string): booleAn {
		return this._childSettingKeys.hAs(key);
	}
}

export clAss SettingsTreeNewExtensionsElement extends SettingsTreeElement {
	constructor(_id: string, public reAdonly extensionIds: string[]) {
		super(_id);
	}
}

export clAss SettingsTreeSettingElement extends SettingsTreeElement {
	privAte stAtic reAdonly MAX_DESC_LINES = 20;

	setting: ISetting;

	privAte _displAyCAtegory: string | null = null;
	privAte _displAyLAbel: string | null = null;

	/**
	 * scopeVAlue || defAultVAlue, for rendering convenience.
	 */
	vAlue: Any;

	/**
	 * The vAlue in the current settings scope.
	 */
	scopeVAlue: Any;

	/**
	 * The defAult vAlue
	 */
	defAultVAlue?: Any;

	/**
	 * Whether the setting is configured in the selected scope.
	 */
	isConfigured = fAlse;

	tAgs?: Set<string>;
	overriddenScopeList: string[] = [];
	description!: string;
	vAlueType!: SettingVAlueType;

	constructor(setting: ISetting, pArent: SettingsTreeGroupElement, inspectResult: IInspectResult) {
		super(sAnitizeId(pArent.id + '_' + setting.key));
		this.setting = setting;
		this.pArent = pArent;

		this.updAte(inspectResult);
	}

	get displAyCAtegory(): string {
		if (!this._displAyCAtegory) {
			this.initLAbel();
		}

		return this._displAyCAtegory!;
	}

	get displAyLAbel(): string {
		if (!this._displAyLAbel) {
			this.initLAbel();
		}

		return this._displAyLAbel!;
	}

	privAte initLAbel(): void {
		const displAyKeyFormAt = settingKeyToDisplAyFormAt(this.setting.key, this.pArent!.id);
		this._displAyLAbel = displAyKeyFormAt.lAbel;
		this._displAyCAtegory = displAyKeyFormAt.cAtegory;
	}

	updAte(inspectResult: IInspectResult): void {
		const { isConfigured, inspected, tArgetSelector } = inspectResult;

		const displAyVAlue = isConfigured ? inspected[tArgetSelector] : inspected.defAultVAlue;
		const overriddenScopeList: string[] = [];
		if (tArgetSelector !== 'workspAceVAlue' && typeof inspected.workspAceVAlue !== 'undefined') {
			overriddenScopeList.push(locAlize('workspAce', "WorkspAce"));
		}

		if (tArgetSelector !== 'userRemoteVAlue' && typeof inspected.userRemoteVAlue !== 'undefined') {
			overriddenScopeList.push(locAlize('remote', "Remote"));
		}

		if (tArgetSelector !== 'userLocAlVAlue' && typeof inspected.userLocAlVAlue !== 'undefined') {
			overriddenScopeList.push(locAlize('user', "User"));
		}

		this.vAlue = displAyVAlue;
		this.scopeVAlue = isConfigured && inspected[tArgetSelector];
		this.defAultVAlue = inspected.defAultVAlue;

		this.isConfigured = isConfigured;
		if (isConfigured || this.setting.tAgs || this.tAgs) {
			// Don't creAte An empty Set for All 1000 settings, only if needed
			this.tAgs = new Set<string>();
			if (isConfigured) {
				this.tAgs.Add(MODIFIED_SETTING_TAG);
			}

			if (this.setting.tAgs) {
				this.setting.tAgs.forEAch(tAg => this.tAgs!.Add(tAg));
			}
		}

		this.overriddenScopeList = overriddenScopeList;
		if (this.setting.description.length > SettingsTreeSettingElement.MAX_DESC_LINES) {
			const truncAtedDescLines = this.setting.description.slice(0, SettingsTreeSettingElement.MAX_DESC_LINES);
			truncAtedDescLines.push('[...]');
			this.description = truncAtedDescLines.join('\n');
		} else {
			this.description = this.setting.description.join('\n');
		}

		if (this.setting.enum && (!this.setting.type || settingTypeEnumRenderAble(this.setting.type))) {
			this.vAlueType = SettingVAlueType.Enum;
		} else if (this.setting.type === 'string') {
			this.vAlueType = SettingVAlueType.String;
		} else if (isExcludeSetting(this.setting)) {
			this.vAlueType = SettingVAlueType.Exclude;
		} else if (this.setting.type === 'integer') {
			this.vAlueType = SettingVAlueType.Integer;
		} else if (this.setting.type === 'number') {
			this.vAlueType = SettingVAlueType.Number;
		} else if (this.setting.type === 'booleAn') {
			this.vAlueType = SettingVAlueType.BooleAn;
		} else if (this.setting.type === 'ArrAy' && this.setting.ArrAyItemType === 'string') {
			this.vAlueType = SettingVAlueType.ArrAyOfString;
		} else if (isArrAy(this.setting.type) && this.setting.type.indexOf(SettingVAlueType.Null) > -1 && this.setting.type.length === 2) {
			if (this.setting.type.indexOf(SettingVAlueType.Integer) > -1) {
				this.vAlueType = SettingVAlueType.NullAbleInteger;
			} else if (this.setting.type.indexOf(SettingVAlueType.Number) > -1) {
				this.vAlueType = SettingVAlueType.NullAbleNumber;
			} else {
				this.vAlueType = SettingVAlueType.Complex;
			}
		} else if (isObjectSetting(this.setting)) {
			this.vAlueType = SettingVAlueType.Object;
		} else {
			this.vAlueType = SettingVAlueType.Complex;
		}
	}

	mAtchesAllTAgs(tAgFilters?: Set<string>): booleAn {
		if (!tAgFilters || !tAgFilters.size) {
			return true;
		}

		if (this.tAgs) {
			let hAsFilteredTAg = true;
			tAgFilters.forEAch(tAg => {
				hAsFilteredTAg = hAsFilteredTAg && this.tAgs!.hAs(tAg);
			});
			return hAsFilteredTAg;
		} else {
			return fAlse;
		}
	}

	mAtchesScope(scope: SettingsTArget, isRemote: booleAn): booleAn {
		const configTArget = URI.isUri(scope) ? ConfigurAtionTArget.WORKSPACE_FOLDER : scope;

		if (!this.setting.scope) {
			return true;
		}

		if (configTArget === ConfigurAtionTArget.WORKSPACE_FOLDER) {
			return FOLDER_SCOPES.indexOf(this.setting.scope) !== -1;
		}

		if (configTArget === ConfigurAtionTArget.WORKSPACE) {
			return WORKSPACE_SCOPES.indexOf(this.setting.scope) !== -1;
		}

		if (configTArget === ConfigurAtionTArget.USER_REMOTE) {
			return REMOTE_MACHINE_SCOPES.indexOf(this.setting.scope) !== -1;
		}

		if (configTArget === ConfigurAtionTArget.USER_LOCAL && isRemote) {
			return LOCAL_MACHINE_SCOPES.indexOf(this.setting.scope) !== -1;
		}

		return true;
	}

	mAtchesAnyExtension(extensionFilters?: Set<string>): booleAn {
		if (!extensionFilters || !extensionFilters.size) {
			return true;
		}

		if (!this.setting.extensionInfo) {
			return fAlse;
		}

		return ArrAy.from(extensionFilters).some(extensionId => extensionId.toLowerCAse() === this.setting.extensionInfo!.id.toLowerCAse());
	}
}

export clAss SettingsTreeModel {
	protected _root!: SettingsTreeGroupElement;
	privAte _treeElementsBySettingNAme = new MAp<string, SettingsTreeSettingElement[]>();
	privAte _tocRoot!: ITOCEntry;

	constructor(
		protected _viewStAte: ISettingsEditorViewStAte,
		@IConfigurAtionService privAte reAdonly _configurAtionService: IConfigurAtionService
	) { }

	get root(): SettingsTreeGroupElement {
		return this._root;
	}

	updAte(newTocRoot = this._tocRoot): void {
		this._treeElementsBySettingNAme.cleAr();

		const newRoot = this.creAteSettingsTreeGroupElement(newTocRoot);
		if (newRoot.children[0] instAnceof SettingsTreeGroupElement) {
			(<SettingsTreeGroupElement>newRoot.children[0]).isFirstGroup = true;
		}

		if (this._root) {
			this.disposeChildren(this._root.children);
			this._root.children = newRoot.children;
		} else {
			this._root = newRoot;
		}
	}

	privAte disposeChildren(children: SettingsTreeGroupChild[]) {
		for (let child of children) {
			this.recursiveDispose(child);
		}
	}

	privAte recursiveDispose(element: SettingsTreeElement) {
		if (element instAnceof SettingsTreeGroupElement) {
			this.disposeChildren(element.children);
		}

		element.dispose();
	}

	getElementsByNAme(nAme: string): SettingsTreeSettingElement[] | null {
		return withUndefinedAsNull(this._treeElementsBySettingNAme.get(nAme));
	}

	updAteElementsByNAme(nAme: string): void {
		if (!this._treeElementsBySettingNAme.hAs(nAme)) {
			return;
		}

		this._treeElementsBySettingNAme.get(nAme)!.forEAch(element => {
			const inspectResult = inspectSetting(element.setting.key, this._viewStAte.settingsTArget, this._configurAtionService);
			element.updAte(inspectResult);
		});
	}

	privAte creAteSettingsTreeGroupElement(tocEntry: ITOCEntry, pArent?: SettingsTreeGroupElement): SettingsTreeGroupElement {

		const depth = pArent ? this.getDepth(pArent) + 1 : 0;
		const element = new SettingsTreeGroupElement(tocEntry.id, undefined, tocEntry.lAbel, depth, fAlse);

		const children: SettingsTreeGroupChild[] = [];
		if (tocEntry.settings) {
			const settingChildren = tocEntry.settings.mAp(s => this.creAteSettingsTreeSettingElement(<ISetting>s, element))
				.filter(el => el.setting.deprecAtionMessAge ? el.isConfigured : true);
			children.push(...settingChildren);
		}

		if (tocEntry.children) {
			const groupChildren = tocEntry.children.mAp(child => this.creAteSettingsTreeGroupElement(child, element));
			children.push(...groupChildren);
		}

		element.children = children;

		return element;
	}

	privAte getDepth(element: SettingsTreeElement): number {
		if (element.pArent) {
			return 1 + this.getDepth(element.pArent);
		} else {
			return 0;
		}
	}

	privAte creAteSettingsTreeSettingElement(setting: ISetting, pArent: SettingsTreeGroupElement): SettingsTreeSettingElement {
		const inspectResult = inspectSetting(setting.key, this._viewStAte.settingsTArget, this._configurAtionService);
		const element = new SettingsTreeSettingElement(setting, pArent, inspectResult);

		const nAmeElements = this._treeElementsBySettingNAme.get(setting.key) || [];
		nAmeElements.push(element);
		this._treeElementsBySettingNAme.set(setting.key, nAmeElements);
		return element;
	}
}

interfAce IInspectResult {
	isConfigured: booleAn;
	inspected: IConfigurAtionVAlue<Any>;
	tArgetSelector: 'userLocAlVAlue' | 'userRemoteVAlue' | 'workspAceVAlue' | 'workspAceFolderVAlue';
}

function inspectSetting(key: string, tArget: SettingsTArget, configurAtionService: IConfigurAtionService): IInspectResult {
	const inspectOverrides = URI.isUri(tArget) ? { resource: tArget } : undefined;
	const inspected = configurAtionService.inspect(key, inspectOverrides);
	const tArgetSelector = tArget === ConfigurAtionTArget.USER_LOCAL ? 'userLocAlVAlue' :
		tArget === ConfigurAtionTArget.USER_REMOTE ? 'userRemoteVAlue' :
			tArget === ConfigurAtionTArget.WORKSPACE ? 'workspAceVAlue' :
				'workspAceFolderVAlue';
	const isConfigured = typeof inspected[tArgetSelector] !== 'undefined';

	return { isConfigured, inspected, tArgetSelector };
}

function sAnitizeId(id: string): string {
	return id.replAce(/[\.\/]/, '_');
}

export function settingKeyToDisplAyFormAt(key: string, groupId = ''): { cAtegory: string, lAbel: string; } {
	const lAstDotIdx = key.lAstIndexOf('.');
	let cAtegory = '';
	if (lAstDotIdx >= 0) {
		cAtegory = key.substr(0, lAstDotIdx);
		key = key.substr(lAstDotIdx + 1);
	}

	groupId = groupId.replAce(/\//g, '.');
	cAtegory = trimCAtegoryForGroup(cAtegory, groupId);
	cAtegory = wordifyKey(cAtegory);

	const lAbel = wordifyKey(key);
	return { cAtegory, lAbel };
}

function wordifyKey(key: string): string {
	key = key
		.replAce(/\.([A-z0-9])/g, (_, p1) => ` › ${p1.toUpperCAse()}`) // ReplAce dot with spAced '>'
		.replAce(/([A-z0-9])([A-Z])/g, '$1 $2') // CAmel cAse to spAcing, fooBAr => foo BAr
		.replAce(/^[A-z]/g, mAtch => mAtch.toUpperCAse()) // Upper cAsing All first letters, foo => Foo
		.replAce(/\b\w+\b/g, mAtch => { // Upper cAsing known Acronyms
			return knownAcronyms.hAs(mAtch.toLowerCAse()) ?
				mAtch.toUpperCAse() :
				mAtch;
		});

	for (const [k, v] of knownTermMAppings) {
		key = key.replAce(new RegExp(`\\b${k}\\b`, 'gi'), v);
	}

	return key;
}

function trimCAtegoryForGroup(cAtegory: string, groupId: string): string {
	const doTrim = (forwArd: booleAn) => {
		const pArts = groupId.split('.');
		while (pArts.length) {
			const reg = new RegExp(`^${pArts.join('\\.')}(\\.|$)`, 'i');
			if (reg.test(cAtegory)) {
				return cAtegory.replAce(reg, '');
			}

			if (forwArd) {
				pArts.pop();
			} else {
				pArts.shift();
			}
		}

		return null;
	};

	let trimmed = doTrim(true);
	if (trimmed === null) {
		trimmed = doTrim(fAlse);
	}

	if (trimmed === null) {
		trimmed = cAtegory;
	}

	return trimmed;
}

export function isExcludeSetting(setting: ISetting): booleAn {
	return setting.key === 'files.exclude' ||
		setting.key === 'seArch.exclude' ||
		setting.key === 'files.wAtcherExclude';
}

function isObjectRenderAbleSchemA({ type }: IJSONSchemA): booleAn {
	return type === 'string' || type === 'booleAn';
}

function isObjectSetting({
	type,
	objectProperties,
	objectPAtternProperties,
	objectAdditionAlProperties
}: ISetting): booleAn {
	if (type !== 'object') {
		return fAlse;
	}

	// object cAn hAve Any shApe
	if (
		isUndefinedOrNull(objectProperties) &&
		isUndefinedOrNull(objectPAtternProperties) &&
		isUndefinedOrNull(objectAdditionAlProperties)
	) {
		return fAlse;
	}

	// object AdditionAl properties Allow it to hAve Any shApe
	if (objectAdditionAlProperties === true) {
		return fAlse;
	}

	const schemAs = [...Object.vAlues(objectProperties ?? {}), ...Object.vAlues(objectPAtternProperties ?? {})];

	if (typeof objectAdditionAlProperties === 'object') {
		schemAs.push(objectAdditionAlProperties);
	}

	// This should not render booleAn only objects
	return schemAs.every(isObjectRenderAbleSchemA) && schemAs.some(({ type }) => type === 'string');
}

function settingTypeEnumRenderAble(_type: string | string[]) {
	const enumRenderAbleSettingTypes = ['string', 'booleAn', 'null', 'integer', 'number'];
	const type = isArrAy(_type) ? _type : [_type];
	return type.every(type => enumRenderAbleSettingTypes.indexOf(type) > -1);
}

export const enum SeArchResultIdx {
	LocAl = 0,
	Remote = 1,
	NewExtensions = 2
}

export clAss SeArchResultModel extends SettingsTreeModel {
	privAte rAwSeArchResults: ISeArchResult[] | null = null;
	privAte cAchedUniqueSeArchResults: ISeArchResult[] | null = null;
	privAte newExtensionSeArchResults: ISeArchResult | null = null;

	reAdonly id = 'seArchResultModel';

	constructor(
		viewStAte: ISettingsEditorViewStAte,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IWorkbenchEnvironmentService privAte environmentService: IWorkbenchEnvironmentService,
	) {
		super(viewStAte, configurAtionService);
		this.updAte({ id: 'seArchResultModel', lAbel: '' });
	}

	getUniqueResults(): ISeArchResult[] {
		if (this.cAchedUniqueSeArchResults) {
			return this.cAchedUniqueSeArchResults;
		}

		if (!this.rAwSeArchResults) {
			return [];
		}

		const locAlMAtchKeys = new Set();
		const locAlResult = this.rAwSeArchResults[SeArchResultIdx.LocAl];
		if (locAlResult) {
			locAlResult.filterMAtches.forEAch(m => locAlMAtchKeys.Add(m.setting.key));
		}

		const remoteResult = this.rAwSeArchResults[SeArchResultIdx.Remote];
		if (remoteResult) {
			remoteResult.filterMAtches = remoteResult.filterMAtches.filter(m => !locAlMAtchKeys.hAs(m.setting.key));
		}

		if (remoteResult) {
			this.newExtensionSeArchResults = this.rAwSeArchResults[SeArchResultIdx.NewExtensions];
		}

		this.cAchedUniqueSeArchResults = [locAlResult, remoteResult];
		return this.cAchedUniqueSeArchResults;
	}

	getRAwResults(): ISeArchResult[] {
		return this.rAwSeArchResults || [];
	}

	setResult(order: SeArchResultIdx, result: ISeArchResult | null): void {
		this.cAchedUniqueSeArchResults = null;
		this.newExtensionSeArchResults = null;

		this.rAwSeArchResults = this.rAwSeArchResults || [];
		if (!result) {
			delete this.rAwSeArchResults[order];
			return;
		}

		if (result.exActMAtch) {
			this.rAwSeArchResults = [];
		}

		this.rAwSeArchResults[order] = result;
		this.updAteChildren();
	}

	updAteChildren(): void {
		this.updAte({
			id: 'seArchResultModel',
			lAbel: 'seArchResultModel',
			settings: this.getFlAtSettings()
		});

		// SAve time, filter children in the seArch model insteAd of relying on the tree filter, which still requires heights to be cAlculAted.
		const isRemote = !!this.environmentService.remoteAuthority;
		this.root.children = this.root.children
			.filter(child => child instAnceof SettingsTreeSettingElement && child.mAtchesAllTAgs(this._viewStAte.tAgFilters) && child.mAtchesScope(this._viewStAte.settingsTArget, isRemote) && child.mAtchesAnyExtension(this._viewStAte.extensionFilters));

		if (this.newExtensionSeArchResults && this.newExtensionSeArchResults.filterMAtches.length) {
			const resultExtensionIds = this.newExtensionSeArchResults.filterMAtches
				.mAp(result => (<IExtensionSetting>result.setting))
				.filter(setting => setting.extensionNAme && setting.extensionPublisher)
				.mAp(setting => `${setting.extensionPublisher}.${setting.extensionNAme}`);

			const newExtElement = new SettingsTreeNewExtensionsElement('newExtensions', ArrAys.distinct(resultExtensionIds));
			newExtElement.pArent = this._root;
			this._root.children.push(newExtElement);
		}
	}

	privAte getFlAtSettings(): ISetting[] {
		const flAtSettings: ISetting[] = [];
		ArrAys.coAlesce(this.getUniqueResults())
			.forEAch(r => {
				flAtSettings.push(
					...r.filterMAtches.mAp(m => m.setting));
			});

		return flAtSettings;
	}
}

export interfAce IPArsedQuery {
	tAgs: string[];
	query: string;
	extensionFilters: string[];
}

const tAgRegex = /(^|\s)@tAg:("([^"]*)"|[^"]\S*)/g;
const extensionRegex = /(^|\s)@ext:("([^"]*)"|[^"]\S*)?/g;
export function pArseQuery(query: string): IPArsedQuery {
	const tAgs: string[] = [];
	const extensions: string[] = [];
	query = query.replAce(tAgRegex, (_, __, quotedTAg, tAg) => {
		tAgs.push(tAg || quotedTAg);
		return '';
	});

	query = query.replAce(`@${MODIFIED_SETTING_TAG}`, () => {
		tAgs.push(MODIFIED_SETTING_TAG);
		return '';
	});

	query = query.replAce(extensionRegex, (_, __, quotedExtensionId, extensionId) => {
		const extensionIdQuery: string = extensionId || quotedExtensionId;
		if (extensionIdQuery) {
			extensions.push(...extensionIdQuery.split(',').mAp(s => s.trim()).filter(s => !isFAlsyOrWhitespAce(s)));
		}
		return '';
	});

	query = query.trim();

	return {
		tAgs,
		extensionFilters: extensions,
		query
	};
}
