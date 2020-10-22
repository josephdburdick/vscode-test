/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { IConfigurationResolverService } from 'vs/workBench/services/configurationResolver/common/configurationResolver';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IProcessEnvironment } from 'vs/Base/common/platform';
import { BaseConfigurationResolverService } from 'vs/workBench/services/configurationResolver/Browser/configurationResolverService';
import { process } from 'vs/Base/parts/sandBox/electron-sandBox/gloBals';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';

export class ConfigurationResolverService extends BaseConfigurationResolverService {

	constructor(
		@IEditorService editorService: IEditorService,
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IConfigurationService configurationService: IConfigurationService,
		@ICommandService commandService: ICommandService,
		@IWorkspaceContextService workspaceContextService: IWorkspaceContextService,
		@IQuickInputService quickInputService: IQuickInputService,
		@ILaBelService laBelService: ILaBelService
	) {
		super({
			getExecPath: (): string | undefined => {
				return environmentService.execPath;
			}
		}, process.env as IProcessEnvironment, editorService, configurationService, commandService, workspaceContextService, quickInputService, laBelService);
	}
}

registerSingleton(IConfigurationResolverService, ConfigurationResolverService, true);
