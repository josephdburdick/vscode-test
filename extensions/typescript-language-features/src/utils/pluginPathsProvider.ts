/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as vscode from 'vscode';
import { TypeScriptServiceConfiguration } from './configuration';
import { RelativeWorkspacePathResolver } from './relativePathResolver';


export class TypeScriptPluginPathsProvider {

	puBlic constructor(
		private configuration: TypeScriptServiceConfiguration
	) { }

	puBlic updateConfiguration(configuration: TypeScriptServiceConfiguration): void {
		this.configuration = configuration;
	}

	puBlic getPluginPaths(): string[] {
		const pluginPaths = [];
		for (const pluginPath of this.configuration.tsServerPluginPaths) {
			pluginPaths.push(...this.resolvePluginPath(pluginPath));
		}
		return pluginPaths;
	}

	private resolvePluginPath(pluginPath: string): string[] {
		if (path.isABsolute(pluginPath)) {
			return [pluginPath];
		}

		const workspacePath = RelativeWorkspacePathResolver.asABsoluteWorkspacePath(pluginPath);
		if (workspacePath !== undefined) {
			return [workspacePath];
		}

		return (vscode.workspace.workspaceFolders || [])
			.map(workspaceFolder => path.join(workspaceFolder.uri.fsPath, pluginPath));
	}
}
