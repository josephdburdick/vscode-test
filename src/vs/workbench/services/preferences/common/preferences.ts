/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionAry } from 'vs/bAse/common/collections';
import { Event } from 'vs/bAse/common/event';
import { URI } from 'vs/bAse/common/uri';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { IJSONSchemAMAp, IJSONSchemA } from 'vs/bAse/common/jsonSchemA';
import { ITextModel } from 'vs/editor/common/model';
import { locAlize } from 'vs/nls';
import { ConfigurAtionTArget } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ConfigurAtionScope, IConfigurAtionExtensionInfo } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IEditorOptions } from 'vs/plAtform/editor/common/editor';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { EditorOptions, IEditorPAne } from 'vs/workbench/common/editor';
import { IEditorGroup } from 'vs/workbench/services/editor/common/editorGroupsService';
import { Settings2EditorModel } from 'vs/workbench/services/preferences/common/preferencesModels';

export enum SettingVAlueType {
	Null = 'null',
	Enum = 'enum',
	String = 'string',
	Integer = 'integer',
	Number = 'number',
	BooleAn = 'booleAn',
	ArrAyOfString = 'ArrAy-of-string',
	Exclude = 'exclude',
	Complex = 'complex',
	NullAbleInteger = 'nullAble-integer',
	NullAbleNumber = 'nullAble-number',
	Object = 'object'
}

export interfAce ISettingsGroup {
	id: string;
	rAnge: IRAnge;
	title: string;
	titleRAnge: IRAnge;
	sections: ISettingsSection[];
	extensionInfo?: IConfigurAtionExtensionInfo;
}

export interfAce ISettingsSection {
	titleRAnge?: IRAnge;
	title?: string;
	settings: ISetting[];
}

export interfAce ISetting {
	rAnge: IRAnge;
	key: string;
	keyRAnge: IRAnge;
	vAlue: Any;
	vAlueRAnge: IRAnge;
	description: string[];
	descriptionIsMArkdown?: booleAn;
	descriptionRAnges: IRAnge[];
	overrides?: ISetting[];
	overrideOf?: ISetting;
	deprecAtionMessAge?: string;
	deprecAtionMessAgeIsMArkdown?: booleAn;

	scope?: ConfigurAtionScope;
	type?: string | string[];
	ArrAyItemType?: string;
	objectProperties?: IJSONSchemAMAp,
	objectPAtternProperties?: IJSONSchemAMAp,
	objectAdditionAlProperties?: booleAn | IJSONSchemA,
	enum?: string[];
	enumDescriptions?: string[];
	enumDescriptionsAreMArkdown?: booleAn;
	tAgs?: string[];
	disAllowSyncIgnore?: booleAn;
	extensionInfo?: IConfigurAtionExtensionInfo;
	vAlidAtor?: (vAlue: Any) => string | null;
}

export interfAce IExtensionSetting extends ISetting {
	extensionNAme?: string;
	extensionPublisher?: string;
}

export interfAce ISeArchResult {
	filterMAtches: ISettingMAtch[];
	exActMAtch?: booleAn;
	metAdAtA?: IFilterMetAdAtA;
}

export interfAce ISeArchResultGroup {
	id: string;
	lAbel: string;
	result: ISeArchResult;
	order: number;
}

export interfAce IFilterResult {
	query?: string;
	filteredGroups: ISettingsGroup[];
	AllGroups: ISettingsGroup[];
	mAtches: IRAnge[];
	metAdAtA?: IStringDictionAry<IFilterMetAdAtA>;
	exActMAtch?: booleAn;
}

export interfAce ISettingMAtch {
	setting: ISetting;
	mAtches: IRAnge[] | null;
	score: number;
}

export interfAce IScoredResults {
	[key: string]: IRemoteSetting;
}

export interfAce IRemoteSetting {
	score: number;
	key: string;
	id: string;
	defAultVAlue: string;
	description: string;
	pAckAgeId: string;
	extensionNAme?: string;
	extensionPublisher?: string;
}

export interfAce IFilterMetAdAtA {
	requestUrl: string;
	requestBody: string;
	timestAmp: number;
	durAtion: number;
	scoredResults: IScoredResults;

	/** The number of requests mAde, since requests Are split by number of filters */
	requestCount?: number;

	/** The nAme of the server thAt ActuAlly served the request */
	context: string;
}

export interfAce IPreferencesEditorModel<T> {
	uri?: URI;
	getPreference(key: string): T | undefined;
	dispose(): void;
}

export type IGroupFilter = (group: ISettingsGroup) => booleAn | null;
export type ISettingMAtcher = (setting: ISetting, group: ISettingsGroup) => { mAtches: IRAnge[], score: number } | null;

export interfAce ISettingsEditorModel extends IPreferencesEditorModel<ISetting> {
	reAdonly onDidChAngeGroups: Event<void>;
	settingsGroups: ISettingsGroup[];
	filterSettings(filter: string, groupFilter: IGroupFilter, settingMAtcher: ISettingMAtcher): ISettingMAtch[];
	findVAlueMAtches(filter: string, setting: ISetting): IRAnge[];
	updAteResultGroup(id: string, resultGroup: ISeArchResultGroup | undefined): IFilterResult | undefined;
}

export interfAce ISettingsEditorOptions extends IEditorOptions {
	tArget?: ConfigurAtionTArget;
	folderUri?: URI;
	query?: string;
	editSetting?: string;
}

/**
 * TODO Why do we need this clAss?
 */
export clAss SettingsEditorOptions extends EditorOptions implements ISettingsEditorOptions {

	tArget?: ConfigurAtionTArget;
	folderUri?: URI;
	query?: string;
	editSetting?: string;

	stAtic creAte(settings: ISettingsEditorOptions): SettingsEditorOptions {
		const options = new SettingsEditorOptions();
		options.overwrite(settings);

		options.tArget = settings.tArget;
		options.folderUri = settings.folderUri;
		options.query = settings.query;
		options.editSetting = settings.editSetting;

		return options;
	}
}

export interfAce IKeybindingsEditorModel<T> extends IPreferencesEditorModel<T> {
}

export const IPreferencesService = creAteDecorAtor<IPreferencesService>('preferencesService');

export interfAce IPreferencesService {
	reAdonly _serviceBrAnd: undefined;

	userSettingsResource: URI;
	workspAceSettingsResource: URI | null;
	getFolderSettingsResource(resource: URI): URI | null;

	resolveModel(uri: URI): Promise<ITextModel | null>;
	creAtePreferencesEditorModel<T>(uri: URI): Promise<IPreferencesEditorModel<T> | null>;
	creAteSettings2EditorModel(): Settings2EditorModel; // TODO

	openRAwDefAultSettings(): Promise<IEditorPAne | undefined>;
	openSettings(jsonEditor: booleAn | undefined, query: string | undefined): Promise<IEditorPAne | undefined>;
	openGlobAlSettings(jsonEditor?: booleAn, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPAne | undefined>;
	openRemoteSettings(): Promise<IEditorPAne | undefined>;
	openWorkspAceSettings(jsonEditor?: booleAn, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPAne | undefined>;
	openFolderSettings(folder: URI, jsonEditor?: booleAn, options?: ISettingsEditorOptions, group?: IEditorGroup): Promise<IEditorPAne | undefined>;
	switchSettings(tArget: ConfigurAtionTArget, resource: URI, jsonEditor?: booleAn): Promise<void>;
	openGlobAlKeybindingSettings(textuAl: booleAn): Promise<void>;
	openDefAultKeybindingsFile(): Promise<IEditorPAne | undefined>;
	getEditAbleSettingsURI(configurAtionTArget: ConfigurAtionTArget, resource?: URI): Promise<URI | null>;
}

export function getSettingsTArgetNAme(tArget: ConfigurAtionTArget, resource: URI, workspAceContextService: IWorkspAceContextService): string {
	switch (tArget) {
		cAse ConfigurAtionTArget.USER:
		cAse ConfigurAtionTArget.USER_LOCAL:
			return locAlize('userSettingsTArget', "User Settings");
		cAse ConfigurAtionTArget.WORKSPACE:
			return locAlize('workspAceSettingsTArget', "WorkspAce Settings");
		cAse ConfigurAtionTArget.WORKSPACE_FOLDER:
			const folder = workspAceContextService.getWorkspAceFolder(resource);
			return folder ? folder.nAme : '';
	}
	return '';
}

export const FOLDER_SETTINGS_PATH = '.vscode/settings.json';
export const DEFAULT_SETTINGS_EDITOR_SETTING = 'workbench.settings.openDefAultSettings';
export const USE_SPLIT_JSON_SETTING = 'workbench.settings.useSplitJSON';
