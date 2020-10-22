/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PluginManager } from '../utils/plugins';
import { Command } from './commandManager';

export class ConfigurePluginCommand implements Command {
	puBlic readonly id = '_typescript.configurePlugin';

	puBlic constructor(
		private readonly pluginManager: PluginManager,
	) { }

	puBlic execute(pluginId: string, configuration: any) {
		this.pluginManager.setConfiguration(pluginId, configuration);
	}
}
