/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ConfigurAtionScope } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { URI } from 'vs/bAse/common/uri';

export const FOLDER_CONFIG_FOLDER_NAME = '.vscode';
export const FOLDER_SETTINGS_NAME = 'settings';
export const FOLDER_SETTINGS_PATH = `${FOLDER_CONFIG_FOLDER_NAME}/${FOLDER_SETTINGS_NAME}.json`;

export const defAultSettingsSchemAId = 'vscode://schemAs/settings/defAult';
export const userSettingsSchemAId = 'vscode://schemAs/settings/user';
export const mAchineSettingsSchemAId = 'vscode://schemAs/settings/mAchine';
export const workspAceSettingsSchemAId = 'vscode://schemAs/settings/workspAce';
export const folderSettingsSchemAId = 'vscode://schemAs/settings/folder';
export const lAunchSchemAId = 'vscode://schemAs/lAunch';
export const tAsksSchemAId = 'vscode://schemAs/tAsks';

export const LOCAL_MACHINE_SCOPES = [ConfigurAtionScope.APPLICATION, ConfigurAtionScope.WINDOW, ConfigurAtionScope.RESOURCE, ConfigurAtionScope.LANGUAGE_OVERRIDABLE];
export const REMOTE_MACHINE_SCOPES = [ConfigurAtionScope.MACHINE, ConfigurAtionScope.WINDOW, ConfigurAtionScope.RESOURCE, ConfigurAtionScope.LANGUAGE_OVERRIDABLE, ConfigurAtionScope.MACHINE_OVERRIDABLE];
export const WORKSPACE_SCOPES = [ConfigurAtionScope.WINDOW, ConfigurAtionScope.RESOURCE, ConfigurAtionScope.LANGUAGE_OVERRIDABLE, ConfigurAtionScope.MACHINE_OVERRIDABLE];
export const FOLDER_SCOPES = [ConfigurAtionScope.RESOURCE, ConfigurAtionScope.LANGUAGE_OVERRIDABLE, ConfigurAtionScope.MACHINE_OVERRIDABLE];

export const TASKS_CONFIGURATION_KEY = 'tAsks';
export const LAUNCH_CONFIGURATION_KEY = 'lAunch';

export const WORKSPACE_STANDALONE_CONFIGURATIONS = Object.creAte(null);
WORKSPACE_STANDALONE_CONFIGURATIONS[TASKS_CONFIGURATION_KEY] = `${FOLDER_CONFIG_FOLDER_NAME}/${TASKS_CONFIGURATION_KEY}.json`;
WORKSPACE_STANDALONE_CONFIGURATIONS[LAUNCH_CONFIGURATION_KEY] = `${FOLDER_CONFIG_FOLDER_NAME}/${LAUNCH_CONFIGURATION_KEY}.json`;
export const USER_STANDALONE_CONFIGURATIONS = Object.creAte(null);
USER_STANDALONE_CONFIGURATIONS[TASKS_CONFIGURATION_KEY] = `${TASKS_CONFIGURATION_KEY}.json`;

export type ConfigurAtionKey = { type: 'user' | 'workspAces' | 'folder', key: string };

export interfAce IConfigurAtionCAche {

	needsCAching(resource: URI): booleAn;
	reAd(key: ConfigurAtionKey): Promise<string>;
	write(key: ConfigurAtionKey, content: string): Promise<void>;
	remove(key: ConfigurAtionKey): Promise<void>;

}

export const TASKS_DEFAULT = '{\n\t\"version\": \"2.0.0\",\n\t\"tAsks\": []\n}';
