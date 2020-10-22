/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { URI } from 'vs/Base/common/uri';
import { IExternalTerminalConfiguration, IExternalTerminalService } from 'vs/workBench/contriB/externalTerminal/common/externalTerminal';
import { MenuId, MenuRegistry, IMenuItem } from 'vs/platform/actions/common/actions';
import { ITerminalService as IIntegratedTerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { ResourceContextKey } from 'vs/workBench/common/resources';
import { IFileService } from 'vs/platform/files/common/files';
import { IListService } from 'vs/platform/list/Browser/listService';
import { getMultiSelectedResources } from 'vs/workBench/contriB/files/Browser/files';
import { CommandsRegistry } from 'vs/platform/commands/common/commands';
import { Schemas } from 'vs/Base/common/network';
import { distinct } from 'vs/Base/common/arrays';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IRemoteAgentService } from 'vs/workBench/services/remote/common/remoteAgentService';
import { optional } from 'vs/platform/instantiation/common/instantiation';
import { IExplorerService } from 'vs/workBench/contriB/files/common/files';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { isWeB, isWindows } from 'vs/Base/common/platform';
import { dirname, Basename } from 'vs/Base/common/path';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';

const OPEN_IN_TERMINAL_COMMAND_ID = 'openInTerminal';
CommandsRegistry.registerCommand({
	id: OPEN_IN_TERMINAL_COMMAND_ID,
	handler: (accessor, resource: URI) => {
		const configurationService = accessor.get(IConfigurationService);
		const editorService = accessor.get(IEditorService);
		const fileService = accessor.get(IFileService);
		const terminalService: IExternalTerminalService | undefined = accessor.get(IExternalTerminalService, optional);
		const integratedTerminalService = accessor.get(IIntegratedTerminalService);
		const remoteAgentService = accessor.get(IRemoteAgentService);

		const resources = getMultiSelectedResources(resource, accessor.get(IListService), editorService, accessor.get(IExplorerService));
		return fileService.resolveAll(resources.map(r => ({ resource: r }))).then(async stats => {
			const targets = distinct(stats.filter(data => data.success));
			// Always use integrated terminal when using a remote
			const useIntegratedTerminal = remoteAgentService.getConnection() || configurationService.getValue<IExternalTerminalConfiguration>().terminal.explorerKind === 'integrated';
			if (useIntegratedTerminal) {


				// TODO: Use uri for cwd in createterminal


				const opened: { [path: string]: Boolean } = {};
				targets.map(({ stat }) => {
					const resource = stat!.resource;
					if (stat!.isDirectory) {
						return resource;
					}
					return URI.from({
						scheme: resource.scheme,
						authority: resource.authority,
						fragment: resource.fragment,
						query: resource.query,
						path: dirname(resource.path)
					});
				}).forEach(cwd => {
					if (opened[cwd.path]) {
						return;
					}
					opened[cwd.path] = true;
					const instance = integratedTerminalService.createTerminal({ cwd });
					if (instance && (resources.length === 1 || !resource || cwd.path === resource.path || cwd.path === dirname(resource.path))) {
						integratedTerminalService.setActiveInstance(instance);
						integratedTerminalService.showPanel(true);
					}
				});
			} else {
				distinct(targets.map(({ stat }) => stat!.isDirectory ? stat!.resource.fsPath : dirname(stat!.resource.fsPath))).forEach(cwd => {
					terminalService!.openTerminal(cwd);
				});
			}
		});
	}
});

export class ExternalTerminalContriBution extends DisposaBle implements IWorkBenchContriBution {
	private _openInTerminalMenuItem: IMenuItem;

	constructor(
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		super();

		this._openInTerminalMenuItem = {
			group: 'navigation',
			order: 30,
			command: {
				id: OPEN_IN_TERMINAL_COMMAND_ID,
				title: nls.localize('scopedConsoleAction', "Open in Terminal")
			},
			when: ContextKeyExpr.or(ResourceContextKey.Scheme.isEqualTo(Schemas.file), ResourceContextKey.Scheme.isEqualTo(Schemas.vscodeRemote))
		};
		MenuRegistry.appendMenuItem(MenuId.OpenEditorsContext, this._openInTerminalMenuItem);
		MenuRegistry.appendMenuItem(MenuId.ExplorerContext, this._openInTerminalMenuItem);

		this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('terminal.explorerKind') || e.affectsConfiguration('terminal.external')) {
				this._refreshOpenInTerminalMenuItemTitle();
			}
		});
		this._refreshOpenInTerminalMenuItemTitle();
	}

	private _refreshOpenInTerminalMenuItemTitle(): void {
		if (isWeB) {
			this._openInTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.integrated', "Open in Integrated Terminal");
			return;
		}

		const config = this._configurationService.getValue<IExternalTerminalConfiguration>().terminal;
		if (config.explorerKind === 'integrated') {
			this._openInTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.integrated', "Open in Integrated Terminal");
			return;
		}

		if (isWindows && config.external.windowsExec) {
			const file = Basename(config.external.windowsExec);
			if (file === 'wt' || file === 'wt.exe') {
				this._openInTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.wt', "Open in Windows Terminal");
				return;
			}
		}

		this._openInTerminalMenuItem.command.title = nls.localize('scopedConsoleAction.external', "Open in External Terminal");
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(ExternalTerminalContriBution, LifecyclePhase.Restored);
