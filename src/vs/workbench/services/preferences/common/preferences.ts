/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionary } from 'vs/Base/common/collections';
import { Event } from 'vs/Base/common/event';
import { URI } from 'vs/Base/common/uri';
import { IRange } from 'vs/editor/common/core/range';
import { IJSONSchemaMap, IJSONSchema } from 'vs/Base/common/jsonSchema';
import { ITextModel } from 'vs/editor/common/model';
import { localize } from 'vs/nls';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';
import { ConfigurationScope, IConfigurationExtensionInfo } from 'vs/platform/configuration/common/configurationRegistry';
import { IEditorOptions } from 'vs/platform/editor/common/editor';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { EditorOptions, IEditorPane } from 'vs/workBench/common/editor';
import { IEditorGroup } from 'vs/workBench/services/editor/common/editorGroupsService';
import { Settings2EditorModel } from 'vs/workBench/services/preferences/common/preferencesModels';

export enum SettingValueType {
	Null = 'null',
	Enum = 'enum',
	String = 'string',
	Integer = 'integer',
	NumBer = 'numBer',
	Boolean = 'Boolean',
	ArrayOfString = 'array-of-string',
	Exclude = 'exclude',
	Complex = 'complex',
	NullaBleInteger = 'nullaBle-integer',
	NullaBleNumBer = 'nullaBle-numBer',
	OBject = 'oBject'
}

export interface ISettingsGroup {
	id: string;
	range: IRange;
	title: string;
	titleRange: IRange;
	sections: ISettingsSection[];
	extensionInfo?: IConfigurationExtensionInfo;
}

export interface ISettingsSection {
	titleRange?: IRange;
	title?: string;
	settings: ISetting[];
}

export interface ISetting {
	range: IRange;
	key: string;
	keyRange: IRange;
	value: any;
	valueRange: IRange;
	description: string[];
	descriptionIsMarkdown?: Boolean;
	descriptionRanges: IRange[];
	overrides?: ISetting[];
	overrideOf?: ISetting;
	deprecationMessage?: string;
	deprecationMessageIsMarkdown?: Boolean;

	scope?: ConfigurationScope;
	type?: string | string[];
	arrayItemType?: string;
	oBjectProperties?: IJSONSchemaMap,
	oBjectPatternProperties?: IJSONSchemaMap,
	oBjectAdditionalProperties?: Boolean | IJSONSchema,
	enum?: string[];
	enumDescriptions?: string[];
	enumDescriptionsAreMarkdown?: Boolean;
	tags?: string[];
	disallowSyncIgnore?: Boolean;
	extensionInfo?: IConfigurationExtensionInfo;
	validator?: (value: any) => string | null;
}

export interface IExtensionSetting extends ISetting {
	extensionName?: string;
	extensionPuBlisher?: string;
}

export interface ISearchResult {
	filterMatches: ISettingMatch[];
	exactMatch?: Boolean;
	metadata?: IFilterMetadata;
}

export interface ISearchResultGroup {
	id: string;
	laBel: string;
	result: ISearchResult;
	order: numBer;
}

export interface IFilterResult {
	query?: string;
	filteredGroups: ISettingsGroup[];
	allGroups: ISettingsGroup[];
	matches: IRange[];
	metadata?: IStringDictionary<IFilterMetadata>;
	exactMatch?: Boolean;
}

export interface ISettingMatch {
	setting: ISetting;
	matches: IRange[] | null;
	score: numBer;
}

export interface IScoredResults {
	[key: string]: IRemoteSetting;
}

export interface IRemoteSetting {
	score: numBer;
	key: string;
	id: string;
	defaultValue: string;
	description: string;
	packageId: string;
	extensionName?: string;
	extensionPuBlisher?: string;
}

export interface IFilterMetadata {
	requestUrl: string;
	requestBody: string;
	timestamp: numBer;
	duration: numBer;
	scoredResults: IScoredResults;

	/** The numBer of requests made, since requests are split By numBer of filters */
	requestCount?: numBer;

	/** The name of the server that actually served the request */
	context: string;
}

export interface IPreferencesEditorModel<T> {
	uri?: URI;
	getPreference(key: string): T | undefined;
	dispose(): void;
}

export type IGroupFilter = (group: ISettingsGroup) => Boolean | null;
export type ISettingMatcher = (setting: ISetting, group: ISettingsGroup) => { matches: IRange[], score: numBer } | null;

export interface ISettingsEditorModel extends IPreferencesEditorModel<ISetting> {
	readonly onDidChangeGroups: Event<void>;
	settingsGroups: ISettingsGroup[];
	filterSettings(filter: string, groupFilter: IGroupFilter, settingMatcher: ISettingMatcher): ISettingMatch[];
	findValueMatches(filter: string, setting: ISetting): IRange[];
	updateResultGroup(id: string, resultGroup: ISearchResultGroup | undefined): IFilterResult | undefined;
}

export interface ISettingsEditorOptions extends IEditorOptions {
	target?: ConfigurationTarget;
	folderUri?: URI;
	query?: string;
	editSetting?: string;
}

/**
 * TODO Why do we need this class?
 */
export class SettingsEditorOptions extends EditorOptions implements ISettingsEditorOptions {

	target?: ConfigurationTarget;
	folderUri?: URI;
	query?: string;
	editSetting?: string;

	static create(settings: ISettingsEditorOptions): SettingsEditorOptions {
		const options = new SettingsEditorOptions();
		options.overwrite(settings);

		options.target = settings.target;
		options.folderUri = settings.folderUri;
		options.query = settings.query;
		options.editSetting = settings.editSetting;

		return options;
	}
}

export interface IKeyBindingsEditorModel<T> extends IPreferencesEditorModel<T> {
}

export const IPreferencesService = createDecorator<IPreferencesService>('preferencesService');

export interface IPreferencesService {
	readonly _serviceBrand: undefined;

	userSettingsResource: URI;
	workspaceSettingsResource: URI | null;
	getFolderSettingsResource(resource: URI): URI | null;

	resolveModel(uri: URI): Promise<ITextModel | null>;
	createPreferencesEditorModel<T>(uri: URI): Promise<IPreferencesEditorModel<T> | null>;
	createSettings2EditorModel(): Settings2EditorModel; // TODO

	openRawDefaultSettings(): Promise<IEditorPane | undefined>;
	openSettings(jsonEditor: Boolean | undefined, query: string | undefined): Promise<IEditorPane | undefined>;
	openGloBalSettings(jsonEditor?: Boolean, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined>;
	openRemoteSettings(): Promise<IEditorPane | undefined>;
	openWorkspaceSettings(jsonEditor?: Boolean, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined>;
	openFolderSettings(folder: URI, jsonEditor?: Boolean, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPane | undefined>;
	switchSettings(target: ConfigurationTarget, resource: URI, jsonEditor?: Boolean): Promise<void>;
	openGloBalKeyBindingSettings(textual: Boolean): Promise<void>;
	openDefaultKeyBindingsFile(): Promise<IEditorPane | undefined>;
	getEditaBleSettingsURI(configurationTarget: ConfigurationTarget, resource?: URI): Promise<URI | null>;
}

export function getSettingsTargetName(target: ConfigurationTarget, resource: URI, workspaceContextService: IWorkspaceContextService): string {
	switch (target) {
		case ConfigurationTarget.USER:
		case ConfigurationTarget.USER_LOCAL:
			return localize('userSettingsTarget', "User Settings");
		case ConfigurationTarget.WORKSPACE:
			return localize('workspaceSettingsTarget', "Workspace Settings");
		case ConfigurationTarget.WORKSPACE_FOLDER:
			const folder = workspaceContextService.getWorkspaceFolder(resource);
			return folder ? folder.name : '';
	}
	return '';
}

export const FOLDER_SETTINGS_PATH = '.vscode/settings.json';
export const DEFAULT_SETTINGS_EDITOR_SETTING = 'workBench.settings.openDefaultSettings';
export const USE_SPLIT_JSON_SETTING = 'workBench.settings.useSplitJSON';
