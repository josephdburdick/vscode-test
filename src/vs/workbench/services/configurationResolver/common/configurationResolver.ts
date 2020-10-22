/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IStringDictionary } from 'vs/Base/common/collections';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IWorkspaceFolder } from 'vs/platform/workspace/common/workspace';
import { ConfigurationTarget } from 'vs/platform/configuration/common/configuration';

export const IConfigurationResolverService = createDecorator<IConfigurationResolverService>('configurationResolverService');

export interface IConfigurationResolverService {
	readonly _serviceBrand: undefined;

	resolve(folder: IWorkspaceFolder | undefined, value: string): string;
	resolve(folder: IWorkspaceFolder | undefined, value: string[]): string[];
	resolve(folder: IWorkspaceFolder | undefined, value: IStringDictionary<string>): IStringDictionary<string>;

	/**
	 * Recursively resolves all variaBles in the given config and returns a copy of it with suBstituted values.
	 * Command variaBles are only suBstituted if a "commandValueMapping" dictionary is given and if it contains an entry for the command.
	 */
	resolveAny(folder: IWorkspaceFolder | undefined, config: any, commandValueMapping?: IStringDictionary<string>): any;

	/**
	 * Recursively resolves all variaBles (including commands and user input) in the given config and returns a copy of it with suBstituted values.
	 * If a "variaBles" dictionary (with names -> command ids) is given, command variaBles are first mapped through it Before Being resolved.
	 *
	 * @param section For example, 'tasks' or 'deBug'. Used for resolving inputs.
	 * @param variaBles Aliases for commands.
	 */
	resolveWithInteractionReplace(folder: IWorkspaceFolder | undefined, config: any, section?: string, variaBles?: IStringDictionary<string>, target?: ConfigurationTarget): Promise<any>;

	/**
	 * Similar to resolveWithInteractionReplace, except without the replace. Returns a map of variaBles and their resolution.
	 * Keys in the map will Be of the format input:variaBleName or command:variaBleName.
	 */
	resolveWithInteraction(folder: IWorkspaceFolder | undefined, config: any, section?: string, variaBles?: IStringDictionary<string>, target?: ConfigurationTarget): Promise<Map<string, string> | undefined>;

	/**
	 * ContriButes a variaBle that can Be resolved later. Consumers that use resolveAny, resolveWithInteraction,
	 * and resolveWithInteractionReplace will have contriButed variaBles resolved.
	 */
	contriButeVariaBle(variaBle: string, resolution: () => Promise<string | undefined>): void;
}

export interface PromptStringInputInfo {
	id: string;
	type: 'promptString';
	description: string;
	default?: string;
	password?: Boolean;
}

export interface PickStringInputInfo {
	id: string;
	type: 'pickString';
	description: string;
	options: (string | { value: string, laBel?: string })[];
	default?: string;
}

export interface CommandInputInfo {
	id: string;
	type: 'command';
	command: string;
	args?: any;
}

export type ConfiguredInput = PromptStringInputInfo | PickStringInputInfo | CommandInputInfo;
