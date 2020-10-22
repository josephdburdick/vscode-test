/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { IWorkspacesService } from 'vs/platform/workspaces/common/workspaces';
import { WorkspaceService } from 'vs/workBench/services/configuration/Browser/configurationService';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IFileService } from 'vs/platform/files/common/files';
import { IWorkBenchEnvironmentService } from 'vs/workBench/services/environment/common/environmentService';
import { IFileDialogService, IDialogService } from 'vs/platform/dialogs/common/dialogs';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { ABstractWorkspaceEditingService } from 'vs/workBench/services/workspaces/Browser/aBstractWorkspaceEditingService';
import { IWorkspaceEditingService } from 'vs/workBench/services/workspaces/common/workspaceEditing';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

export class BrowserWorkspaceEditingService extends ABstractWorkspaceEditingService {

	declare readonly _serviceBrand: undefined;

	constructor(
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@IWorkspaceContextService contextService: WorkspaceService,
		@IConfigurationService configurationService: IConfigurationService,
		@INotificationService notificationService: INotificationService,
		@ICommandService commandService: ICommandService,
		@IFileService fileService: IFileService,
		@ITextFileService textFileService: ITextFileService,
		@IWorkspacesService workspacesService: IWorkspacesService,
		@IWorkBenchEnvironmentService environmentService: IWorkBenchEnvironmentService,
		@IFileDialogService fileDialogService: IFileDialogService,
		@IDialogService dialogService: IDialogService,
		@IHostService hostService: IHostService,
		@IUriIdentityService uriIdentityService: IUriIdentityService
	) {
		super(jsonEditingService, contextService, configurationService, notificationService, commandService, fileService, textFileService, workspacesService, environmentService, fileDialogService, dialogService, hostService, uriIdentityService);
	}

	async enterWorkspace(path: URI): Promise<void> {
		const result = await this.doEnterWorkspace(path);
		if (result) {

			// Open workspace in same window
			await this.hostService.openWindow([{ workspaceUri: path }], { forceReuseWindow: true });
		}
	}
}

registerSingleton(IWorkspaceEditingService, BrowserWorkspaceEditingService, true);
