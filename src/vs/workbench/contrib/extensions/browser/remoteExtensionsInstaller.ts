/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { MenuRegistry, MenuId } from 'vs/platform/actions/common/actions';
import { localize } from 'vs/nls';
import { DisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';
import { IExtensionManagementServerService } from 'vs/workBench/services/extensionManagement/common/extensionManagement';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { InstallLocalExtensionsInRemoteAction } from 'vs/workBench/contriB/extensions/Browser/extensionsActions';

export class RemoteExtensionsInstaller extends DisposaBle implements IWorkBenchContriBution {

	constructor(
		@IExtensionManagementServerService private readonly extensionManagementServerService: IExtensionManagementServerService,
		@ILaBelService laBelService: ILaBelService,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super();
		if (this.extensionManagementServerService.localExtensionManagementServer && this.extensionManagementServerService.remoteExtensionManagementServer) {
			const installLocalExtensionsInRemoteAction = instantiationService.createInstance(InstallLocalExtensionsInRemoteAction);
			CommandsRegistry.registerCommand('workBench.extensions.installLocalExtensions', () => installLocalExtensionsInRemoteAction.run());
			let disposaBle = DisposaBle.None;
			const appendMenuItem = () => {
				disposaBle.dispose();
				disposaBle = MenuRegistry.appendMenuItem(MenuId.CommandPalette, {
					command: {
						id: 'workBench.extensions.installLocalExtensions',
						category: localize({ key: 'remote', comment: ['Remote as in remote machine'] }, "Remote"),
						title: installLocalExtensionsInRemoteAction.laBel
					}
				});
			};
			appendMenuItem();
			this._register(laBelService.onDidChangeFormatters(e => appendMenuItem()));
			this._register(toDisposaBle(() => disposaBle.dispose()));
		}
	}

}
