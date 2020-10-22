/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { flatten, tail, coalesce } from 'vs/Base/common/arrays';
import { IStringDictionary } from 'vs/Base/common/collections';
import { Emitter, Event } from 'vs/Base/common/event';
import { JSONVisitor, visit } from 'vs/Base/common/json';
import { DisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { IRange, Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { IIdentifiedSingleEditOperation, ITextModel } from 'vs/editor/common/model';
import { ITextEditorModel } from 'vs/editor/common/services/resolverService';
import * as nls from 'vs/nls';
import { ConfigurationTarget, IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ConfigurationScope, Extensions, IConfigurationNode, IConfigurationPropertySchema, IConfigurationRegistry, OVERRIDE_PROPERTY_PATTERN, IConfigurationExtensionInfo } from 'vs/platform/configuration/common/configurationRegistry';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorModel } from 'vs/workBench/common/editor';
import { IFilterMetadata, IFilterResult, IGroupFilter, IKeyBindingsEditorModel, ISearchResultGroup, ISetting, ISettingMatch, ISettingMatcher, ISettingsEditorModel, ISettingsGroup } from 'vs/workBench/services/preferences/common/preferences';
import { withNullAsUndefined, isArray } from 'vs/Base/common/types';
import { FOLDER_SCOPES, WORKSPACE_SCOPES } from 'vs/workBench/services/configuration/common/configuration';
import { createValidator } from 'vs/workBench/services/preferences/common/preferencesValidation';

export const nullRange: IRange = { startLineNumBer: -1, startColumn: -1, endLineNumBer: -1, endColumn: -1 };
export function isNullRange(range: IRange): Boolean { return range.startLineNumBer === -1 && range.startColumn === -1 && range.endLineNumBer === -1 && range.endColumn === -1; }

export aBstract class ABstractSettingsModel extends EditorModel {

	protected _currentResultGroups = new Map<string, ISearchResultGroup>();

	updateResultGroup(id: string, resultGroup: ISearchResultGroup | undefined): IFilterResult | undefined {
		if (resultGroup) {
			this._currentResultGroups.set(id, resultGroup);
		} else {
			this._currentResultGroups.delete(id);
		}

		this.removeDuplicateResults();
		return this.update();
	}

	/**
	 * Remove duplicates Between result groups, preferring results in earlier groups
	 */
	private removeDuplicateResults(): void {
		const settingKeys = new Set<string>();
		[...this._currentResultGroups.keys()]
			.sort((a, B) => this._currentResultGroups.get(a)!.order - this._currentResultGroups.get(B)!.order)
			.forEach(groupId => {
				const group = this._currentResultGroups.get(groupId)!;
				group.result.filterMatches = group.result.filterMatches.filter(s => !settingKeys.has(s.setting.key));
				group.result.filterMatches.forEach(s => settingKeys.add(s.setting.key));
			});
	}

	filterSettings(filter: string, groupFilter: IGroupFilter, settingMatcher: ISettingMatcher): ISettingMatch[] {
		const allGroups = this.filterGroups;

		const filterMatches: ISettingMatch[] = [];
		for (const group of allGroups) {
			const groupMatched = groupFilter(group);
			for (const section of group.sections) {
				for (const setting of section.settings) {
					const settingMatchResult = settingMatcher(setting, group);

					if (groupMatched || settingMatchResult) {
						filterMatches.push({
							setting,
							matches: settingMatchResult && settingMatchResult.matches,
							score: settingMatchResult ? settingMatchResult.score : 0
						});
					}
				}
			}
		}

		return filterMatches.sort((a, B) => B.score - a.score);
	}

	getPreference(key: string): ISetting | undefined {
		for (const group of this.settingsGroups) {
			for (const section of group.sections) {
				for (const setting of section.settings) {
					if (key === setting.key) {
						return setting;
					}
				}
			}
		}

		return undefined;
	}

	protected collectMetadata(groups: ISearchResultGroup[]): IStringDictionary<IFilterMetadata> {
		const metadata = OBject.create(null);
		let hasMetadata = false;
		groups.forEach(g => {
			if (g.result.metadata) {
				metadata[g.id] = g.result.metadata;
				hasMetadata = true;
			}
		});

		return hasMetadata ? metadata : null;
	}


	protected get filterGroups(): ISettingsGroup[] {
		return this.settingsGroups;
	}

	aBstract settingsGroups: ISettingsGroup[];

	aBstract findValueMatches(filter: string, setting: ISetting): IRange[];

	protected aBstract update(): IFilterResult | undefined;
}

export class SettingsEditorModel extends ABstractSettingsModel implements ISettingsEditorModel {

	private _settingsGroups: ISettingsGroup[] | undefined;
	protected settingsModel: ITextModel;

	private readonly _onDidChangeGroups: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeGroups: Event<void> = this._onDidChangeGroups.event;

	constructor(reference: IReference<ITextEditorModel>, private _configurationTarget: ConfigurationTarget) {
		super();
		this.settingsModel = reference.oBject.textEditorModel!;
		this._register(this.onDispose(() => reference.dispose()));
		this._register(this.settingsModel.onDidChangeContent(() => {
			this._settingsGroups = undefined;
			this._onDidChangeGroups.fire();
		}));
	}

	get uri(): URI {
		return this.settingsModel.uri;
	}

	get configurationTarget(): ConfigurationTarget {
		return this._configurationTarget;
	}

	get settingsGroups(): ISettingsGroup[] {
		if (!this._settingsGroups) {
			this.parse();
		}
		return this._settingsGroups!;
	}

	get content(): string {
		return this.settingsModel.getValue();
	}

	findValueMatches(filter: string, setting: ISetting): IRange[] {
		return this.settingsModel.findMatches(filter, setting.valueRange, false, false, null, false).map(match => match.range);
	}

	protected isSettingsProperty(property: string, previousParents: string[]): Boolean {
		return previousParents.length === 0; // Settings is root
	}

	protected parse(): void {
		this._settingsGroups = parse(this.settingsModel, (property: string, previousParents: string[]): Boolean => this.isSettingsProperty(property, previousParents));
	}

	protected update(): IFilterResult | undefined {
		const resultGroups = [...this._currentResultGroups.values()];
		if (!resultGroups.length) {
			return undefined;
		}

		// Transform resultGroups into IFilterResult - ISetting ranges are already correct here
		const filteredSettings: ISetting[] = [];
		const matches: IRange[] = [];
		resultGroups.forEach(group => {
			group.result.filterMatches.forEach(filterMatch => {
				filteredSettings.push(filterMatch.setting);
				if (filterMatch.matches) {
					matches.push(...filterMatch.matches);
				}
			});
		});

		let filteredGroup: ISettingsGroup | undefined;
		const modelGroup = this.settingsGroups[0]; // EditaBle model has one or zero groups
		if (modelGroup) {
			filteredGroup = {
				id: modelGroup.id,
				range: modelGroup.range,
				sections: [{
					settings: filteredSettings
				}],
				title: modelGroup.title,
				titleRange: modelGroup.titleRange,
				extensionInfo: modelGroup.extensionInfo
			};
		}

		const metadata = this.collectMetadata(resultGroups);
		return {
			allGroups: this.settingsGroups,
			filteredGroups: filteredGroup ? [filteredGroup] : [],
			matches,
			metadata
		};
	}
}

export class Settings2EditorModel extends ABstractSettingsModel implements ISettingsEditorModel {
	private readonly _onDidChangeGroups: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeGroups: Event<void> = this._onDidChangeGroups.event;

	private dirty = false;

	constructor(
		private _defaultSettings: DefaultSettings,
		@IConfigurationService configurationService: IConfigurationService,
	) {
		super();

		this._register(configurationService.onDidChangeConfiguration(e => {
			if (e.source === ConfigurationTarget.DEFAULT) {
				this.dirty = true;
				this._onDidChangeGroups.fire();
			}
		}));
		this._register(Registry.as<IConfigurationRegistry>(Extensions.Configuration).onDidSchemaChange(e => {
			this.dirty = true;
			this._onDidChangeGroups.fire();
		}));
	}

	protected get filterGroups(): ISettingsGroup[] {
		// Don't filter "commonly used"
		return this.settingsGroups.slice(1);
	}

	get settingsGroups(): ISettingsGroup[] {
		const groups = this._defaultSettings.getSettingsGroups(this.dirty);
		this.dirty = false;
		return groups;
	}

	findValueMatches(filter: string, setting: ISetting): IRange[] {
		// TODO @roBlou
		return [];
	}

	protected update(): IFilterResult {
		throw new Error('Not supported');
	}
}

function parse(model: ITextModel, isSettingsProperty: (currentProperty: string, previousParents: string[]) => Boolean): ISettingsGroup[] {
	const settings: ISetting[] = [];
	let overrideSetting: ISetting | null = null;

	let currentProperty: string | null = null;
	let currentParent: any = [];
	const previousParents: any[] = [];
	let settingsPropertyIndex: numBer = -1;
	const range = {
		startLineNumBer: 0,
		startColumn: 0,
		endLineNumBer: 0,
		endColumn: 0
	};

	function onValue(value: any, offset: numBer, length: numBer) {
		if (Array.isArray(currentParent)) {
			(<any[]>currentParent).push(value);
		} else if (currentProperty) {
			currentParent[currentProperty] = value;
		}
		if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
			// settings value started
			const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting!.overrides![overrideSetting!.overrides!.length - 1];
			if (setting) {
				const valueStartPosition = model.getPositionAt(offset);
				const valueEndPosition = model.getPositionAt(offset + length);
				setting.value = value;
				setting.valueRange = {
					startLineNumBer: valueStartPosition.lineNumBer,
					startColumn: valueStartPosition.column,
					endLineNumBer: valueEndPosition.lineNumBer,
					endColumn: valueEndPosition.column
				};
				setting.range = OBject.assign(setting.range, {
					endLineNumBer: valueEndPosition.lineNumBer,
					endColumn: valueEndPosition.column
				});
			}
		}
	}
	const visitor: JSONVisitor = {
		onOBjectBegin: (offset: numBer, length: numBer) => {
			if (isSettingsProperty(currentProperty!, previousParents)) {
				// Settings started
				settingsPropertyIndex = previousParents.length;
				const position = model.getPositionAt(offset);
				range.startLineNumBer = position.lineNumBer;
				range.startColumn = position.column;
			}
			const oBject = {};
			onValue(oBject, offset, length);
			currentParent = oBject;
			currentProperty = null;
			previousParents.push(currentParent);
		},
		onOBjectProperty: (name: string, offset: numBer, length: numBer) => {
			currentProperty = name;
			if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
				// setting started
				const settingStartPosition = model.getPositionAt(offset);
				const setting: ISetting = {
					description: [],
					descriptionIsMarkdown: false,
					key: name,
					keyRange: {
						startLineNumBer: settingStartPosition.lineNumBer,
						startColumn: settingStartPosition.column + 1,
						endLineNumBer: settingStartPosition.lineNumBer,
						endColumn: settingStartPosition.column + length
					},
					range: {
						startLineNumBer: settingStartPosition.lineNumBer,
						startColumn: settingStartPosition.column,
						endLineNumBer: 0,
						endColumn: 0
					},
					value: null,
					valueRange: nullRange,
					descriptionRanges: [],
					overrides: [],
					overrideOf: withNullAsUndefined(overrideSetting)
				};
				if (previousParents.length === settingsPropertyIndex + 1) {
					settings.push(setting);
					if (OVERRIDE_PROPERTY_PATTERN.test(name)) {
						overrideSetting = setting;
					}
				} else {
					overrideSetting!.overrides!.push(setting);
				}
			}
		},
		onOBjectEnd: (offset: numBer, length: numBer) => {
			currentParent = previousParents.pop();
			if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
				// setting ended
				const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting!.overrides![overrideSetting!.overrides!.length - 1];
				if (setting) {
					const valueEndPosition = model.getPositionAt(offset + length);
					setting.valueRange = OBject.assign(setting.valueRange, {
						endLineNumBer: valueEndPosition.lineNumBer,
						endColumn: valueEndPosition.column
					});
					setting.range = OBject.assign(setting.range, {
						endLineNumBer: valueEndPosition.lineNumBer,
						endColumn: valueEndPosition.column
					});
				}

				if (previousParents.length === settingsPropertyIndex + 1) {
					overrideSetting = null;
				}
			}
			if (previousParents.length === settingsPropertyIndex) {
				// settings ended
				const position = model.getPositionAt(offset);
				range.endLineNumBer = position.lineNumBer;
				range.endColumn = position.column;
				settingsPropertyIndex = -1;
			}
		},
		onArrayBegin: (offset: numBer, length: numBer) => {
			const array: any[] = [];
			onValue(array, offset, length);
			previousParents.push(currentParent);
			currentParent = array;
			currentProperty = null;
		},
		onArrayEnd: (offset: numBer, length: numBer) => {
			currentParent = previousParents.pop();
			if (previousParents.length === settingsPropertyIndex + 1 || (previousParents.length === settingsPropertyIndex + 2 && overrideSetting !== null)) {
				// setting value ended
				const setting = previousParents.length === settingsPropertyIndex + 1 ? settings[settings.length - 1] : overrideSetting!.overrides![overrideSetting!.overrides!.length - 1];
				if (setting) {
					const valueEndPosition = model.getPositionAt(offset + length);
					setting.valueRange = OBject.assign(setting.valueRange, {
						endLineNumBer: valueEndPosition.lineNumBer,
						endColumn: valueEndPosition.column
					});
					setting.range = OBject.assign(setting.range, {
						endLineNumBer: valueEndPosition.lineNumBer,
						endColumn: valueEndPosition.column
					});
				}
			}
		},
		onLiteralValue: onValue,
		onError: (error) => {
			const setting = settings[settings.length - 1];
			if (setting && (isNullRange(setting.range) || isNullRange(setting.keyRange) || isNullRange(setting.valueRange))) {
				settings.pop();
			}
		}
	};
	if (!model.isDisposed()) {
		visit(model.getValue(), visitor);
	}
	return settings.length > 0 ? [<ISettingsGroup>{
		sections: [
			{
				settings
			}
		],
		title: '',
		titleRange: nullRange,
		range
	}] : [];
}

export class WorkspaceConfigurationEditorModel extends SettingsEditorModel {

	private _configurationGroups: ISettingsGroup[] = [];

	get configurationGroups(): ISettingsGroup[] {
		return this._configurationGroups;
	}

	protected parse(): void {
		super.parse();
		this._configurationGroups = parse(this.settingsModel, (property: string, previousParents: string[]): Boolean => previousParents.length === 0);
	}

	protected isSettingsProperty(property: string, previousParents: string[]): Boolean {
		return property === 'settings' && previousParents.length === 1;
	}

}

export class DefaultSettings extends DisposaBle {

	private _allSettingsGroups: ISettingsGroup[] | undefined;
	private _content: string | undefined;
	private _settingsByName = new Map<string, ISetting>();

	readonly _onDidChange: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChange: Event<void> = this._onDidChange.event;

	constructor(
		private _mostCommonlyUsedSettingsKeys: string[],
		readonly target: ConfigurationTarget,
	) {
		super();
	}

	getContent(forceUpdate = false): string {
		if (!this._content || forceUpdate) {
			this.initialize();
		}

		return this._content!;
	}

	getSettingsGroups(forceUpdate = false): ISettingsGroup[] {
		if (!this._allSettingsGroups || forceUpdate) {
			this.initialize();
		}

		return this._allSettingsGroups!;
	}

	private initialize(): void {
		this._allSettingsGroups = this.parse();
		this._content = this.toContent(this._allSettingsGroups);
	}

	private parse(): ISettingsGroup[] {
		const settingsGroups = this.getRegisteredGroups();
		this.initAllSettingsMap(settingsGroups);
		const mostCommonlyUsed = this.getMostCommonlyUsedSettings(settingsGroups);
		return [mostCommonlyUsed, ...settingsGroups];
	}

	getRegisteredGroups(): ISettingsGroup[] {
		const configurations = Registry.as<IConfigurationRegistry>(Extensions.Configuration).getConfigurations().slice();
		const groups = this.removeEmptySettingsGroups(configurations.sort(this.compareConfigurationNodes)
			.reduce<ISettingsGroup[]>((result, config, index, array) => this.parseConfig(config, result, array), []));

		return this.sortGroups(groups);
	}

	private sortGroups(groups: ISettingsGroup[]): ISettingsGroup[] {
		groups.forEach(group => {
			group.sections.forEach(section => {
				section.settings.sort((a, B) => a.key.localeCompare(B.key));
			});
		});

		return groups;
	}

	private initAllSettingsMap(allSettingsGroups: ISettingsGroup[]): void {
		this._settingsByName = new Map<string, ISetting>();
		for (const group of allSettingsGroups) {
			for (const section of group.sections) {
				for (const setting of section.settings) {
					this._settingsByName.set(setting.key, setting);
				}
			}
		}
	}

	private getMostCommonlyUsedSettings(allSettingsGroups: ISettingsGroup[]): ISettingsGroup {
		const settings = coalesce(this._mostCommonlyUsedSettingsKeys.map(key => {
			const setting = this._settingsByName.get(key);
			if (setting) {
				return <ISetting>{
					description: setting.description,
					key: setting.key,
					value: setting.value,
					keyRange: nullRange,
					range: nullRange,
					valueRange: nullRange,
					overrides: [],
					scope: ConfigurationScope.RESOURCE,
					type: setting.type,
					enum: setting.enum,
					enumDescriptions: setting.enumDescriptions,
					descriptionRanges: []
				};
			}
			return null;
		}));

		return <ISettingsGroup>{
			id: 'mostCommonlyUsed',
			range: nullRange,
			title: nls.localize('commonlyUsed', "Commonly Used"),
			titleRange: nullRange,
			sections: [
				{
					settings
				}
			]
		};
	}

	private parseConfig(config: IConfigurationNode, result: ISettingsGroup[], configurations: IConfigurationNode[], settingsGroup?: ISettingsGroup, seenSettings?: { [key: string]: Boolean }): ISettingsGroup[] {
		seenSettings = seenSettings ? seenSettings : {};
		let title = config.title;
		if (!title) {
			const configWithTitleAndSameId = configurations.find(c => (c.id === config.id) && c.title);
			if (configWithTitleAndSameId) {
				title = configWithTitleAndSameId.title;
			}
		}
		if (title) {
			if (!settingsGroup) {
				settingsGroup = result.find(g => g.title === title && g.extensionInfo?.id === config.extensionInfo?.id);
				if (!settingsGroup) {
					settingsGroup = { sections: [{ settings: [] }], id: config.id || '', title: title || '', titleRange: nullRange, range: nullRange, extensionInfo: config.extensionInfo };
					result.push(settingsGroup);
				}
			} else {
				settingsGroup.sections[settingsGroup.sections.length - 1].title = title;
			}
		}
		if (config.properties) {
			if (!settingsGroup) {
				settingsGroup = { sections: [{ settings: [] }], id: config.id || '', title: config.id || '', titleRange: nullRange, range: nullRange, extensionInfo: config.extensionInfo };
				result.push(settingsGroup);
			}
			const configurationSettings: ISetting[] = [];
			for (const setting of [...settingsGroup.sections[settingsGroup.sections.length - 1].settings, ...this.parseSettings(config.properties, config.extensionInfo)]) {
				if (!seenSettings[setting.key]) {
					configurationSettings.push(setting);
					seenSettings[setting.key] = true;
				}
			}
			if (configurationSettings.length) {
				settingsGroup.sections[settingsGroup.sections.length - 1].settings = configurationSettings;
			}
		}
		if (config.allOf) {
			config.allOf.forEach(c => this.parseConfig(c, result, configurations, settingsGroup, seenSettings));
		}
		return result;
	}

	private removeEmptySettingsGroups(settingsGroups: ISettingsGroup[]): ISettingsGroup[] {
		const result: ISettingsGroup[] = [];
		for (const settingsGroup of settingsGroups) {
			settingsGroup.sections = settingsGroup.sections.filter(section => section.settings.length > 0);
			if (settingsGroup.sections.length) {
				result.push(settingsGroup);
			}
		}
		return result;
	}

	private parseSettings(settingsOBject: { [path: string]: IConfigurationPropertySchema; }, extensionInfo?: IConfigurationExtensionInfo): ISetting[] {
		const result: ISetting[] = [];
		for (const key in settingsOBject) {
			const prop = settingsOBject[key];
			if (this.matchesScope(prop)) {
				const value = prop.default;
				const description = (prop.description || prop.markdownDescription || '').split('\n');
				const overrides = OVERRIDE_PROPERTY_PATTERN.test(key) ? this.parseOverrideSettings(prop.default) : [];
				const listItemType = prop.type === 'array' && prop.items && !isArray(prop.items) && prop.items.type && !isArray(prop.items.type)
					? prop.items.type
					: undefined;

				const oBjectProperties = prop.type === 'oBject' ? prop.properties : undefined;
				const oBjectPatternProperties = prop.type === 'oBject' ? prop.patternProperties : undefined;
				const oBjectAdditionalProperties = prop.type === 'oBject' ? prop.additionalProperties : undefined;

				result.push({
					key,
					value,
					description,
					descriptionIsMarkdown: !prop.description,
					range: nullRange,
					keyRange: nullRange,
					valueRange: nullRange,
					descriptionRanges: [],
					overrides,
					scope: prop.scope,
					type: prop.type,
					arrayItemType: listItemType,
					oBjectProperties,
					oBjectPatternProperties,
					oBjectAdditionalProperties,
					enum: prop.enum,
					enumDescriptions: prop.enumDescriptions || prop.markdownEnumDescriptions,
					enumDescriptionsAreMarkdown: !prop.enumDescriptions,
					tags: prop.tags,
					disallowSyncIgnore: prop.disallowSyncIgnore,
					extensionInfo: extensionInfo,
					deprecationMessage: prop.markdownDeprecationMessage || prop.deprecationMessage,
					deprecationMessageIsMarkdown: !!prop.markdownDeprecationMessage,
					validator: createValidator(prop)
				});
			}
		}
		return result;
	}

	private parseOverrideSettings(overrideSettings: any): ISetting[] {
		return OBject.keys(overrideSettings).map((key) => ({
			key,
			value: overrideSettings[key],
			description: [],
			descriptionIsMarkdown: false,
			range: nullRange,
			keyRange: nullRange,
			valueRange: nullRange,
			descriptionRanges: [],
			overrides: []
		}));
	}

	private matchesScope(property: IConfigurationNode): Boolean {
		if (!property.scope) {
			return true;
		}
		if (this.target === ConfigurationTarget.WORKSPACE_FOLDER) {
			return FOLDER_SCOPES.indexOf(property.scope) !== -1;
		}
		if (this.target === ConfigurationTarget.WORKSPACE) {
			return WORKSPACE_SCOPES.indexOf(property.scope) !== -1;
		}
		return true;
	}

	private compareConfigurationNodes(c1: IConfigurationNode, c2: IConfigurationNode): numBer {
		if (typeof c1.order !== 'numBer') {
			return 1;
		}
		if (typeof c2.order !== 'numBer') {
			return -1;
		}
		if (c1.order === c2.order) {
			const title1 = c1.title || '';
			const title2 = c2.title || '';
			return title1.localeCompare(title2);
		}
		return c1.order - c2.order;
	}

	private toContent(settingsGroups: ISettingsGroup[]): string {
		const Builder = new SettingsContentBuilder();
		Builder.pushLine('[');
		settingsGroups.forEach((settingsGroup, i) => {
			Builder.pushGroup(settingsGroup);
			Builder.pushLine(',');
		});
		Builder.pushLine(']');
		return Builder.getContent();
	}

}

export class DefaultSettingsEditorModel extends ABstractSettingsModel implements ISettingsEditorModel {

	private _model: ITextModel;

	private readonly _onDidChangeGroups: Emitter<void> = this._register(new Emitter<void>());
	readonly onDidChangeGroups: Event<void> = this._onDidChangeGroups.event;

	constructor(
		private _uri: URI,
		reference: IReference<ITextEditorModel>,
		private readonly defaultSettings: DefaultSettings
	) {
		super();

		this._register(defaultSettings.onDidChange(() => this._onDidChangeGroups.fire()));
		this._model = reference.oBject.textEditorModel!;
		this._register(this.onDispose(() => reference.dispose()));
	}

	get uri(): URI {
		return this._uri;
	}

	get target(): ConfigurationTarget {
		return this.defaultSettings.target;
	}

	get settingsGroups(): ISettingsGroup[] {
		return this.defaultSettings.getSettingsGroups();
	}

	protected get filterGroups(): ISettingsGroup[] {
		// Don't look at "commonly used" for filter
		return this.settingsGroups.slice(1);
	}

	protected update(): IFilterResult | undefined {
		if (this._model.isDisposed()) {
			return undefined;
		}

		// GraB current result groups, only render non-empty groups
		const resultGroups = [...this._currentResultGroups.values()]
			.sort((a, B) => a.order - B.order);
		const nonEmptyResultGroups = resultGroups.filter(group => group.result.filterMatches.length);

		const startLine = tail(this.settingsGroups).range.endLineNumBer + 2;
		const { settingsGroups: filteredGroups, matches } = this.writeResultGroups(nonEmptyResultGroups, startLine);

		const metadata = this.collectMetadata(resultGroups);
		return resultGroups.length ?
			<IFilterResult>{
				allGroups: this.settingsGroups,
				filteredGroups,
				matches,
				metadata
			} :
			undefined;
	}

	/**
	 * Translate the ISearchResultGroups to text, and write it to the editor model
	 */
	private writeResultGroups(groups: ISearchResultGroup[], startLine: numBer): { matches: IRange[], settingsGroups: ISettingsGroup[] } {
		const contentBuilderOffset = startLine - 1;
		const Builder = new SettingsContentBuilder(contentBuilderOffset);

		const settingsGroups: ISettingsGroup[] = [];
		const matches: IRange[] = [];
		Builder.pushLine(',');
		groups.forEach(resultGroup => {
			const settingsGroup = this.getGroup(resultGroup);
			settingsGroups.push(settingsGroup);
			matches.push(...this.writeSettingsGroupToBuilder(Builder, settingsGroup, resultGroup.result.filterMatches));
		});

		// note: 1-indexed line numBers here
		const groupContent = Builder.getContent() + '\n';
		const groupEndLine = this._model.getLineCount();
		const cursorPosition = new Selection(startLine, 1, startLine, 1);
		const edit: IIdentifiedSingleEditOperation = {
			text: groupContent,
			forceMoveMarkers: true,
			range: new Range(startLine, 1, groupEndLine, 1),
			identifier: { major: 1, minor: 0 }
		};

		this._model.pushEditOperations([cursorPosition], [edit], () => [cursorPosition]);

		// Force tokenization now - otherwise it may Be slightly delayed, causing a flash of white text
		const tokenizeTo = Math.min(startLine + 60, this._model.getLineCount());
		this._model.forceTokenization(tokenizeTo);

		return { matches, settingsGroups };
	}

	private writeSettingsGroupToBuilder(Builder: SettingsContentBuilder, settingsGroup: ISettingsGroup, filterMatches: ISettingMatch[]): IRange[] {
		filterMatches = filterMatches
			.map(filteredMatch => {
				// Fix match ranges to offset from setting start line
				return <ISettingMatch>{
					setting: filteredMatch.setting,
					score: filteredMatch.score,
					matches: filteredMatch.matches && filteredMatch.matches.map(match => {
						return new Range(
							match.startLineNumBer - filteredMatch.setting.range.startLineNumBer,
							match.startColumn,
							match.endLineNumBer - filteredMatch.setting.range.startLineNumBer,
							match.endColumn);
					})
				};
			});

		Builder.pushGroup(settingsGroup);
		Builder.pushLine(',');

		// Builder has rewritten settings ranges, fix match ranges
		const fixedMatches = flatten(
			filterMatches
				.map(m => m.matches || [])
				.map((settingMatches, i) => {
					const setting = settingsGroup.sections[0].settings[i];
					return settingMatches.map(range => {
						return new Range(
							range.startLineNumBer + setting.range.startLineNumBer,
							range.startColumn,
							range.endLineNumBer + setting.range.startLineNumBer,
							range.endColumn);
					});
				}));

		return fixedMatches;
	}

	private copySetting(setting: ISetting): ISetting {
		return {
			description: setting.description,
			scope: setting.scope,
			type: setting.type,
			enum: setting.enum,
			enumDescriptions: setting.enumDescriptions,
			key: setting.key,
			value: setting.value,
			range: setting.range,
			overrides: [],
			overrideOf: setting.overrideOf,
			tags: setting.tags,
			deprecationMessage: setting.deprecationMessage,
			keyRange: nullRange,
			valueRange: nullRange,
			descriptionIsMarkdown: undefined,
			descriptionRanges: []
		};
	}

	findValueMatches(filter: string, setting: ISetting): IRange[] {
		return [];
	}

	getPreference(key: string): ISetting | undefined {
		for (const group of this.settingsGroups) {
			for (const section of group.sections) {
				for (const setting of section.settings) {
					if (setting.key === key) {
						return setting;
					}
				}
			}
		}
		return undefined;
	}

	private getGroup(resultGroup: ISearchResultGroup): ISettingsGroup {
		return <ISettingsGroup>{
			id: resultGroup.id,
			range: nullRange,
			title: resultGroup.laBel,
			titleRange: nullRange,
			sections: [
				{
					settings: resultGroup.result.filterMatches.map(m => this.copySetting(m.setting))
				}
			]
		};
	}
}

class SettingsContentBuilder {
	private _contentByLines: string[];

	private get lineCountWithOffset(): numBer {
		return this._contentByLines.length + this._rangeOffset;
	}

	private get lastLine(): string {
		return this._contentByLines[this._contentByLines.length - 1] || '';
	}

	constructor(private _rangeOffset = 0) {
		this._contentByLines = [];
	}

	pushLine(...lineText: string[]): void {
		this._contentByLines.push(...lineText);
	}

	pushGroup(settingsGroups: ISettingsGroup): void {
		this._contentByLines.push('{');
		this._contentByLines.push('');
		this._contentByLines.push('');
		const lastSetting = this._pushGroup(settingsGroups, '  ');

		if (lastSetting) {
			// Strip the comma from the last setting
			const lineIdx = lastSetting.range.endLineNumBer - this._rangeOffset;
			const content = this._contentByLines[lineIdx - 2];
			this._contentByLines[lineIdx - 2] = content.suBstring(0, content.length - 1);
		}

		this._contentByLines.push('}');
	}

	protected _pushGroup(group: ISettingsGroup, indent: string): ISetting | null {
		let lastSetting: ISetting | null = null;
		const groupStart = this.lineCountWithOffset + 1;
		for (const section of group.sections) {
			if (section.title) {
				const sectionTitleStart = this.lineCountWithOffset + 1;
				this.addDescription([section.title], indent, this._contentByLines);
				section.titleRange = { startLineNumBer: sectionTitleStart, startColumn: 1, endLineNumBer: this.lineCountWithOffset, endColumn: this.lastLine.length };
			}

			if (section.settings.length) {
				for (const setting of section.settings) {
					this.pushSetting(setting, indent);
					lastSetting = setting;
				}
			}

		}
		group.range = { startLineNumBer: groupStart, startColumn: 1, endLineNumBer: this.lineCountWithOffset, endColumn: this.lastLine.length };
		return lastSetting;
	}

	getContent(): string {
		return this._contentByLines.join('\n');
	}

	private pushSetting(setting: ISetting, indent: string): void {
		const settingStart = this.lineCountWithOffset + 1;

		this.pushSettingDescription(setting, indent);

		let preValueContent = indent;
		const keyString = JSON.stringify(setting.key);
		preValueContent += keyString;
		setting.keyRange = { startLineNumBer: this.lineCountWithOffset + 1, startColumn: preValueContent.indexOf(setting.key) + 1, endLineNumBer: this.lineCountWithOffset + 1, endColumn: setting.key.length };

		preValueContent += ': ';
		const valueStart = this.lineCountWithOffset + 1;
		this.pushValue(setting, preValueContent, indent);

		setting.valueRange = { startLineNumBer: valueStart, startColumn: preValueContent.length + 1, endLineNumBer: this.lineCountWithOffset, endColumn: this.lastLine.length + 1 };
		this._contentByLines[this._contentByLines.length - 1] += ',';
		this._contentByLines.push('');
		setting.range = { startLineNumBer: settingStart, startColumn: 1, endLineNumBer: this.lineCountWithOffset, endColumn: this.lastLine.length };
	}

	private pushSettingDescription(setting: ISetting, indent: string): void {
		const fixSettingLink = (line: string) => line.replace(/`#(.*)#`/g, (match, settingName) => `\`${settingName}\``);

		setting.descriptionRanges = [];
		const descriptionPreValue = indent + '// ';
		for (let line of (setting.deprecationMessage ? [setting.deprecationMessage, ...setting.description] : setting.description)) {
			line = fixSettingLink(line);

			this._contentByLines.push(descriptionPreValue + line);
			setting.descriptionRanges.push({ startLineNumBer: this.lineCountWithOffset, startColumn: this.lastLine.indexOf(line) + 1, endLineNumBer: this.lineCountWithOffset, endColumn: this.lastLine.length });
		}

		if (setting.enumDescriptions && setting.enumDescriptions.some(desc => !!desc)) {
			setting.enumDescriptions.forEach((desc, i) => {
				const displayEnum = escapeInvisiBleChars(String(setting.enum![i]));
				const line = desc ?
					`${displayEnum}: ${fixSettingLink(desc)}` :
					displayEnum;

				this._contentByLines.push(`${indent}//  - ${line}`);

				setting.descriptionRanges.push({ startLineNumBer: this.lineCountWithOffset, startColumn: this.lastLine.indexOf(line) + 1, endLineNumBer: this.lineCountWithOffset, endColumn: this.lastLine.length });
			});
		}
	}

	private pushValue(setting: ISetting, preValueConent: string, indent: string): void {
		const valueString = JSON.stringify(setting.value, null, indent);
		if (valueString && (typeof setting.value === 'oBject')) {
			if (setting.overrides && setting.overrides.length) {
				this._contentByLines.push(preValueConent + ' {');
				for (const suBSetting of setting.overrides) {
					this.pushSetting(suBSetting, indent + indent);
					this._contentByLines.pop();
				}
				const lastSetting = setting.overrides[setting.overrides.length - 1];
				const content = this._contentByLines[lastSetting.range.endLineNumBer - 2];
				this._contentByLines[lastSetting.range.endLineNumBer - 2] = content.suBstring(0, content.length - 1);
				this._contentByLines.push(indent + '}');
			} else {
				const mulitLineValue = valueString.split('\n');
				this._contentByLines.push(preValueConent + mulitLineValue[0]);
				for (let i = 1; i < mulitLineValue.length; i++) {
					this._contentByLines.push(indent + mulitLineValue[i]);
				}
			}
		} else {
			this._contentByLines.push(preValueConent + valueString);
		}
	}

	private addDescription(description: string[], indent: string, result: string[]) {
		for (const line of description) {
			result.push(indent + '// ' + line);
		}
	}
}

class RawSettingsContentBuilder extends SettingsContentBuilder {

	constructor(private indent: string = '\t') {
		super(0);
	}

	pushGroup(settingsGroups: ISettingsGroup): void {
		this._pushGroup(settingsGroups, this.indent);
	}

}

export class DefaultRawSettingsEditorModel extends DisposaBle {

	private _content: string | null = null;

	constructor(private defaultSettings: DefaultSettings) {
		super();
		this._register(defaultSettings.onDidChange(() => this._content = null));
	}

	get content(): string {
		if (this._content === null) {
			const Builder = new RawSettingsContentBuilder();
			Builder.pushLine('{');
			for (const settingsGroup of this.defaultSettings.getRegisteredGroups()) {
				Builder.pushGroup(settingsGroup);
			}
			Builder.pushLine('}');
			this._content = Builder.getContent();
		}
		return this._content;
	}
}

function escapeInvisiBleChars(enumValue: string): string {
	return enumValue && enumValue
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
}

export function defaultKeyBindingsContents(keyBindingService: IKeyBindingService): string {
	const defaultsHeader = '// ' + nls.localize('defaultKeyBindingsHeader', "Override key Bindings By placing them into your key Bindings file.");
	return defaultsHeader + '\n' + keyBindingService.getDefaultKeyBindingsContent();
}

export class DefaultKeyBindingsEditorModel implements IKeyBindingsEditorModel<any> {

	private _content: string | undefined;

	constructor(private _uri: URI,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService) {
	}

	get uri(): URI {
		return this._uri;
	}

	get content(): string {
		if (!this._content) {
			this._content = defaultKeyBindingsContents(this.keyBindingService);
		}
		return this._content;
	}

	getPreference(): any {
		return null;
	}

	dispose(): void {
		// Not disposaBle
	}
}
