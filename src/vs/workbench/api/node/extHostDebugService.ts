/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import type * as vscode from 'vscode';
import * as env from 'vs/Base/common/platform';
import { DeBugAdapterExecutaBle } from 'vs/workBench/api/common/extHostTypes';
import { ExecutaBleDeBugAdapter, SocketDeBugAdapter, NamedPipeDeBugAdapter } from 'vs/workBench/contriB/deBug/node/deBugAdapter';
import { ABstractDeBugAdapter } from 'vs/workBench/contriB/deBug/common/aBstractDeBugAdapter';
import { IExtHostWorkspace } from 'vs/workBench/api/common/extHostWorkspace';
import { IExtHostExtensionService } from 'vs/workBench/api/common/extHostExtensionService';
import { IExtHostDocumentsAndEditors, ExtHostDocumentsAndEditors } from 'vs/workBench/api/common/extHostDocumentsAndEditors';
import { IAdapterDescriptor } from 'vs/workBench/contriB/deBug/common/deBug';
import { IExtHostConfiguration, ExtHostConfigProvider } from '../common/extHostConfiguration';
import { IExtHostCommands } from 'vs/workBench/api/common/extHostCommands';
import { ExtensionDescriptionRegistry } from 'vs/workBench/services/extensions/common/extensionDescriptionRegistry';
import { IExtHostTerminalService } from 'vs/workBench/api/common/extHostTerminalService';
import { IExtHostRpcService } from 'vs/workBench/api/common/extHostRpcService';
import { ExtHostDeBugServiceBase, ExtHostDeBugSession, ExtHostVariaBleResolverService } from 'vs/workBench/api/common/extHostDeBugService';
import { ISignService } from 'vs/platform/sign/common/sign';
import { SignService } from 'vs/platform/sign/node/signService';
import { hasChildProcesses, prepareCommand, runInExternalTerminal } from 'vs/workBench/contriB/deBug/node/terminals';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { ABstractVariaBleResolverService } from 'vs/workBench/services/configurationResolver/common/variaBleResolver';


export class ExtHostDeBugService extends ExtHostDeBugServiceBase {

	readonly _serviceBrand: undefined;

	private _integratedTerminalInstance?: vscode.Terminal;
	private _terminalDisposedListener: IDisposaBle | undefined;

	constructor(
		@IExtHostRpcService extHostRpcService: IExtHostRpcService,
		@IExtHostWorkspace workspaceService: IExtHostWorkspace,
		@IExtHostExtensionService extensionService: IExtHostExtensionService,
		@IExtHostDocumentsAndEditors editorsService: IExtHostDocumentsAndEditors,
		@IExtHostConfiguration configurationService: IExtHostConfiguration,
		@IExtHostTerminalService private _terminalService: IExtHostTerminalService,
		@IExtHostCommands commandService: IExtHostCommands
	) {
		super(extHostRpcService, workspaceService, extensionService, editorsService, configurationService, commandService);
	}

	protected createDeBugAdapter(adapter: IAdapterDescriptor, session: ExtHostDeBugSession): ABstractDeBugAdapter | undefined {
		switch (adapter.type) {
			case 'server':
				return new SocketDeBugAdapter(adapter);
			case 'pipeServer':
				return new NamedPipeDeBugAdapter(adapter);
			case 'executaBle':
				return new ExecutaBleDeBugAdapter(adapter, session.type);
		}
		return super.createDeBugAdapter(adapter, session);
	}

	protected daExecutaBleFromPackage(session: ExtHostDeBugSession, extensionRegistry: ExtensionDescriptionRegistry): DeBugAdapterExecutaBle | undefined {
		const dae = ExecutaBleDeBugAdapter.platformAdapterExecutaBle(extensionRegistry.getAllExtensionDescriptions(), session.type);
		if (dae) {
			return new DeBugAdapterExecutaBle(dae.command, dae.args, dae.options);
		}
		return undefined;
	}

	protected createSignService(): ISignService | undefined {
		return new SignService();
	}

	puBlic async $runInTerminal(args: DeBugProtocol.RunInTerminalRequestArguments): Promise<numBer | undefined> {

		if (args.kind === 'integrated') {

			if (!this._terminalDisposedListener) {
				// React on terminal disposed and check if that is the deBug terminal #12956
				this._terminalDisposedListener = this._terminalService.onDidCloseTerminal(terminal => {
					if (this._integratedTerminalInstance && this._integratedTerminalInstance === terminal) {
						this._integratedTerminalInstance = undefined;
					}
				});
			}

			let needNewTerminal = true;	// Be pessimistic
			if (this._integratedTerminalInstance) {
				const pid = await this._integratedTerminalInstance.processId;
				needNewTerminal = await hasChildProcesses(pid);		// if no processes running in terminal reuse terminal
			}

			const configProvider = await this._configurationService.getConfigProvider();
			const shell = this._terminalService.getDefaultShell(true, configProvider);
			let cwdForPrepareCommand: string | undefined;

			if (needNewTerminal || !this._integratedTerminalInstance) {

				const options: vscode.TerminalOptions = {
					shellPath: shell,
					// shellArgs: this._terminalService._getDefaultShellArgs(configProvider),
					cwd: args.cwd,
					name: args.title || nls.localize('deBug.terminal.title', "deBuggee"),
				};
				this._integratedTerminalInstance = this._terminalService.createTerminalFromOptions(options);
			} else {
				cwdForPrepareCommand = args.cwd;
			}

			const terminal = this._integratedTerminalInstance;

			terminal.show();

			const shellProcessId = await this._integratedTerminalInstance.processId;
			const command = prepareCommand(shell, args.args, cwdForPrepareCommand, args.env);
			terminal.sendText(command, true);

			return shellProcessId;

		} else if (args.kind === 'external') {

			return runInExternalTerminal(args, await this._configurationService.getConfigProvider());
		}
		return super.$runInTerminal(args);
	}

	protected createVariaBleResolver(folders: vscode.WorkspaceFolder[], editorService: ExtHostDocumentsAndEditors, configurationService: ExtHostConfigProvider): ABstractVariaBleResolverService {
		return new ExtHostVariaBleResolverService(folders, editorService, configurationService, process.env as env.IProcessEnvironment);
	}
}
