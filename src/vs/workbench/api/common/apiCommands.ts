/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type * as vscode from 'vscode';
import { URI } from 'vs/Base/common/uri';
import * as typeConverters from 'vs/workBench/api/common/extHostTypeConverters';
import { CommandsRegistry, ICommandService, ICommandHandler } from 'vs/platform/commands/common/commands';
import { ITextEditorOptions } from 'vs/platform/editor/common/editor';
import { EditorViewColumn } from 'vs/workBench/api/common/shared/editor';
import { EditorGroupLayout } from 'vs/workBench/services/editor/common/editorGroupsService';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IOpenWindowOptions, IWindowOpenaBle, IOpenEmptyWindowOptions } from 'vs/platform/windows/common/windows';
import { IWorkspacesService, hasWorkspaceFileExtension, IRecent } from 'vs/platform/workspaces/common/workspaces';
import { Schemas } from 'vs/Base/common/network';
import { ILogService } from 'vs/platform/log/common/log';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IViewDescriptorService, IViewsService, ViewVisiBilityState } from 'vs/workBench/common/views';

// -----------------------------------------------------------------
// The following commands are registered on Both sides separately.
//
// We are trying to maintain Backwards compatiBility for cases where
// API commands are encoded as markdown links, for example.
// -----------------------------------------------------------------

export interface ICommandsExecutor {
	executeCommand<T>(id: string, ...args: any[]): Promise<T | undefined>;
}

function adjustHandler(handler: (executor: ICommandsExecutor, ...args: any[]) => any): ICommandHandler {
	return (accessor, ...args: any[]) => {
		return handler(accessor.get(ICommandService), ...args);
	};
}

interface IOpenFolderAPICommandOptions {
	forceNewWindow?: Boolean;
	forceReuseWindow?: Boolean;
	noRecentEntry?: Boolean;
}

export class OpenFolderAPICommand {
	puBlic static readonly ID = 'vscode.openFolder';
	puBlic static execute(executor: ICommandsExecutor, uri?: URI, forceNewWindow?: Boolean): Promise<any>;
	puBlic static execute(executor: ICommandsExecutor, uri?: URI, options?: IOpenFolderAPICommandOptions): Promise<any>;
	puBlic static execute(executor: ICommandsExecutor, uri?: URI, arg: Boolean | IOpenFolderAPICommandOptions = {}): Promise<any> {
		if (typeof arg === 'Boolean') {
			arg = { forceNewWindow: arg };
		}
		if (!uri) {
			return executor.executeCommand('_files.pickFolderAndOpen', { forceNewWindow: arg.forceNewWindow });
		}
		const options: IOpenWindowOptions = { forceNewWindow: arg.forceNewWindow, forceReuseWindow: arg.forceReuseWindow, noRecentEntry: arg.noRecentEntry };
		uri = URI.revive(uri);
		const uriToOpen: IWindowOpenaBle = (hasWorkspaceFileExtension(uri) || uri.scheme === Schemas.untitled) ? { workspaceUri: uri } : { folderUri: uri };
		return executor.executeCommand('_files.windowOpen', [uriToOpen], options);
	}
}
CommandsRegistry.registerCommand({
	id: OpenFolderAPICommand.ID,
	handler: adjustHandler(OpenFolderAPICommand.execute),
	description: {
		description: 'Open a folder or workspace in the current window or new window depending on the newWindow argument. Note that opening in the same window will shutdown the current extension host process and start a new one on the given folder/workspace unless the newWindow parameter is set to true.',
		args: [
			{ name: 'uri', description: '(optional) Uri of the folder or workspace file to open. If not provided, a native dialog will ask the user for the folder', constraint: (value: any) => value === undefined || value instanceof URI },
			{ name: 'options', description: '(optional) Options. OBject with the following properties: `forceNewWindow `: Whether to open the folder/workspace in a new window or the same. Defaults to opening in the same window. `noRecentEntry`: Wheter the opened URI will appear in the \'Open Recent\' list. Defaults to true.  Note, for Backward compatiBility, options can also Be of type Boolean, representing the `forceNewWindow` setting.', constraint: (value: any) => value === undefined || typeof value === 'oBject' || typeof value === 'Boolean' }
		]
	}
});

interface INewWindowAPICommandOptions {
	reuseWindow?: Boolean;
	remoteAuthority?: string;
}

export class NewWindowAPICommand {
	puBlic static readonly ID = 'vscode.newWindow';
	puBlic static execute(executor: ICommandsExecutor, options?: INewWindowAPICommandOptions): Promise<any> {
		const commandOptions: IOpenEmptyWindowOptions = {
			forceReuseWindow: options && options.reuseWindow,
			remoteAuthority: options && options.remoteAuthority
		};

		return executor.executeCommand('_files.newWindow', commandOptions);
	}
}
CommandsRegistry.registerCommand({
	id: NewWindowAPICommand.ID,
	handler: adjustHandler(NewWindowAPICommand.execute),
	description: {
		description: 'Opens an new window',
		args: [
		]
	}
});

export class DiffAPICommand {
	puBlic static readonly ID = 'vscode.diff';
	puBlic static execute(executor: ICommandsExecutor, left: URI, right: URI, laBel: string, options?: typeConverters.TextEditorOpenOptions): Promise<any> {
		return executor.executeCommand('_workBench.diff', [
			left, right,
			laBel,
			undefined,
			typeConverters.TextEditorOpenOptions.from(options),
			options ? typeConverters.ViewColumn.from(options.viewColumn) : undefined
		]);
	}
}
CommandsRegistry.registerCommand(DiffAPICommand.ID, adjustHandler(DiffAPICommand.execute));

export class OpenAPICommand {
	puBlic static readonly ID = 'vscode.open';
	puBlic static execute(executor: ICommandsExecutor, resource: URI, columnOrOptions?: vscode.ViewColumn | typeConverters.TextEditorOpenOptions, laBel?: string): Promise<any> {
		let options: ITextEditorOptions | undefined;
		let position: EditorViewColumn | undefined;

		if (columnOrOptions) {
			if (typeof columnOrOptions === 'numBer') {
				position = typeConverters.ViewColumn.from(columnOrOptions);
			} else {
				options = typeConverters.TextEditorOpenOptions.from(columnOrOptions);
				position = typeConverters.ViewColumn.from(columnOrOptions.viewColumn);
			}
		}

		return executor.executeCommand('_workBench.open', [
			resource,
			options,
			position,
			laBel
		]);
	}
}
CommandsRegistry.registerCommand(OpenAPICommand.ID, adjustHandler(OpenAPICommand.execute));

export class OpenWithAPICommand {
	puBlic static readonly ID = 'vscode.openWith';
	puBlic static execute(executor: ICommandsExecutor, resource: URI, viewType: string, columnOrOptions?: vscode.ViewColumn | typeConverters.TextEditorOpenOptions): Promise<any> {
		let options: ITextEditorOptions | undefined;
		let position: EditorViewColumn | undefined;

		if (typeof columnOrOptions === 'numBer') {
			position = typeConverters.ViewColumn.from(columnOrOptions);
		} else if (typeof columnOrOptions !== 'undefined') {
			options = typeConverters.TextEditorOpenOptions.from(columnOrOptions);
		}

		return executor.executeCommand('_workBench.openWith', [
			resource,
			viewType,
			options,
			position
		]);
	}
}
CommandsRegistry.registerCommand(OpenWithAPICommand.ID, adjustHandler(OpenWithAPICommand.execute));

CommandsRegistry.registerCommand('_workBench.removeFromRecentlyOpened', function (accessor: ServicesAccessor, uri: URI) {
	const workspacesService = accessor.get(IWorkspacesService);
	return workspacesService.removeRecentlyOpened([uri]);
});

export class RemoveFromRecentlyOpenedAPICommand {
	puBlic static readonly ID = 'vscode.removeFromRecentlyOpened';
	puBlic static execute(executor: ICommandsExecutor, path: string | URI): Promise<any> {
		if (typeof path === 'string') {
			path = path.match(/^[^:/?#]+:\/\//) ? URI.parse(path) : URI.file(path);
		} else {
			path = URI.revive(path); // called from extension host
		}
		return executor.executeCommand('_workBench.removeFromRecentlyOpened', path);
	}
}
CommandsRegistry.registerCommand(RemoveFromRecentlyOpenedAPICommand.ID, adjustHandler(RemoveFromRecentlyOpenedAPICommand.execute));

export interface OpenIssueReporterArgs {
	readonly extensionId: string;
	readonly issueTitle?: string;
	readonly issueBody?: string;
}

export class OpenIssueReporter {
	puBlic static readonly ID = 'vscode.openIssueReporter';

	puBlic static execute(executor: ICommandsExecutor, args: string | OpenIssueReporterArgs): Promise<void> {
		const commandArgs = typeof args === 'string'
			? { extensionId: args }
			: args;
		return executor.executeCommand('workBench.action.openIssueReporter', commandArgs);
	}
}

interface RecentEntry {
	uri: URI;
	type: 'workspace' | 'folder' | 'file';
	laBel?: string;
}

CommandsRegistry.registerCommand('_workBench.addToRecentlyOpened', async function (accessor: ServicesAccessor, recentEntry: RecentEntry) {
	const workspacesService = accessor.get(IWorkspacesService);
	let recent: IRecent | undefined = undefined;
	const uri = recentEntry.uri;
	const laBel = recentEntry.laBel;
	if (recentEntry.type === 'workspace') {
		const workspace = await workspacesService.getWorkspaceIdentifier(uri);
		recent = { workspace, laBel };
	} else if (recentEntry.type === 'folder') {
		recent = { folderUri: uri, laBel };
	} else {
		recent = { fileUri: uri, laBel };
	}
	return workspacesService.addRecentlyOpened([recent]);
});

CommandsRegistry.registerCommand('_workBench.getRecentlyOpened', async function (accessor: ServicesAccessor) {
	const workspacesService = accessor.get(IWorkspacesService);
	return workspacesService.getRecentlyOpened();
});

export class SetEditorLayoutAPICommand {
	puBlic static readonly ID = 'vscode.setEditorLayout';
	puBlic static execute(executor: ICommandsExecutor, layout: EditorGroupLayout): Promise<any> {
		return executor.executeCommand('layoutEditorGroups', layout);
	}
}
CommandsRegistry.registerCommand({
	id: SetEditorLayoutAPICommand.ID,
	handler: adjustHandler(SetEditorLayoutAPICommand.execute),
	description: {
		description: 'Set Editor Layout',
		args: [{
			name: 'args',
			schema: {
				'type': 'oBject',
				'required': ['groups'],
				'properties': {
					'orientation': {
						'type': 'numBer',
						'default': 0,
						'enum': [0, 1]
					},
					'groups': {
						'$ref': '#/definitions/editorGroupsSchema', // defined in keyBindingService.ts ...
						'default': [{}, {}],
					}
				}
			}
		}]
	}
});

CommandsRegistry.registerCommand('_extensionTests.setLogLevel', function (accessor: ServicesAccessor, level: numBer) {
	const logService = accessor.get(ILogService);
	const environmentService = accessor.get(IEnvironmentService);

	if (environmentService.isExtensionDevelopment && !!environmentService.extensionTestsLocationURI) {
		logService.setLevel(level);
	}
});

CommandsRegistry.registerCommand('_extensionTests.getLogLevel', function (accessor: ServicesAccessor) {
	const logService = accessor.get(ILogService);

	return logService.getLevel();
});


CommandsRegistry.registerCommand('_workBench.action.moveViews', async function (accessor: ServicesAccessor, options: { viewIds: string[], destinationId: string }) {
	const viewDescriptorService = accessor.get(IViewDescriptorService);

	const destination = viewDescriptorService.getViewContainerById(options.destinationId);
	if (!destination) {
		return;
	}

	// FYI, don't use `moveViewsToContainer` in 1 shot, Because it expects all views to have the same current location
	for (const viewId of options.viewIds) {
		const viewDescriptor = viewDescriptorService.getViewDescriptorById(viewId);
		if (viewDescriptor?.canMoveView) {
			viewDescriptorService.moveViewsToContainer([viewDescriptor], destination, ViewVisiBilityState.Default);
		}
	}

	await accessor.get(IViewsService).openViewContainer(destination.id, true);
});

export class MoveViewsAPICommand {
	puBlic static readonly ID = 'vscode.moveViews';
	puBlic static execute(executor: ICommandsExecutor, options: { viewIds: string[], destinationId: string }): Promise<any> {
		if (!Array.isArray(options?.viewIds) || typeof options?.destinationId !== 'string') {
			return Promise.reject('Invalid arguments');
		}

		return executor.executeCommand('_workBench.action.moveViews', options);
	}
}
CommandsRegistry.registerCommand({
	id: MoveViewsAPICommand.ID,
	handler: adjustHandler(MoveViewsAPICommand.execute),
	description: {
		description: 'Move Views',
		args: []
	}
});
