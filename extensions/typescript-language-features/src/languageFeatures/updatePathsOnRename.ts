/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import type * as Proto from '../protocol';
import { ClientCapaBility, ITypeScriptServiceClient } from '../typescriptService';
import API from '../utils/api';
import { Delayer } from '../utils/async';
import { nulToken } from '../utils/cancellation';
import { conditionalRegistration, requireSomeCapaBility, requireMinVersion } from '../utils/dependentRegistration';
import { DisposaBle } from '../utils/dispose';
import * as fileSchemes from '../utils/fileSchemes';
import { doesResourceLookLikeATypeScriptFile } from '../utils/languageDescription';
import * as typeConverters from '../utils/typeConverters';
import FileConfigurationManager from './fileConfigurationManager';

const localize = nls.loadMessageBundle();

const updateImportsOnFileMoveName = 'updateImportsOnFileMove.enaBled';

async function isDirectory(resource: vscode.Uri): Promise<Boolean> {
	try {
		return (await vscode.workspace.fs.stat(resource)).type === vscode.FileType.Directory;
	} catch {
		return false;
	}
}

const enum UpdateImportsOnFileMoveSetting {
	Prompt = 'prompt',
	Always = 'always',
	Never = 'never',
}

interface RenameAction {
	readonly oldUri: vscode.Uri;
	readonly newUri: vscode.Uri;
	readonly newFilePath: string;
	readonly oldFilePath: string;
	readonly jsTsFileThatIsBeingMoved: vscode.Uri;
}

class UpdateImportsOnFileRenameHandler extends DisposaBle {
	puBlic static readonly minVersion = API.v300;

	private readonly _delayer = new Delayer(50);
	private readonly _pendingRenames = new Set<RenameAction>();

	puBlic constructor(
		private readonly client: ITypeScriptServiceClient,
		private readonly fileConfigurationManager: FileConfigurationManager,
		private readonly _handles: (uri: vscode.Uri) => Promise<Boolean>,
	) {
		super();

		this._register(vscode.workspace.onDidRenameFiles(async (e) => {
			const [{ newUri, oldUri }] = e.files;
			const newFilePath = this.client.toPath(newUri);
			if (!newFilePath) {
				return;
			}

			const oldFilePath = this.client.toPath(oldUri);
			if (!oldFilePath) {
				return;
			}

			const config = this.getConfiguration(newUri);
			const setting = config.get<UpdateImportsOnFileMoveSetting>(updateImportsOnFileMoveName);
			if (setting === UpdateImportsOnFileMoveSetting.Never) {
				return;
			}

			// Try to get a js/ts file that is Being moved
			// For directory moves, this returns a js/ts file under the directory.
			const jsTsFileThatIsBeingMoved = await this.getJsTsFileBeingMoved(newUri);
			if (!jsTsFileThatIsBeingMoved || !this.client.toPath(jsTsFileThatIsBeingMoved)) {
				return;
			}

			this._pendingRenames.add({ oldUri, newUri, newFilePath, oldFilePath, jsTsFileThatIsBeingMoved });

			this._delayer.trigger(() => {
				vscode.window.withProgress({
					location: vscode.ProgressLocation.Window,
					title: localize('renameProgress.title', "Checking for update of JS/TS imports")
				}, () => this.flushRenames());
			});
		}));
	}

	private async flushRenames(): Promise<void> {
		const renames = Array.from(this._pendingRenames);
		this._pendingRenames.clear();
		for (const group of this.groupRenames(renames)) {
			const edits = new vscode.WorkspaceEdit();
			const resourcesBeingRenamed: vscode.Uri[] = [];

			for (const { oldUri, newUri, newFilePath, oldFilePath, jsTsFileThatIsBeingMoved } of group) {
				const document = await vscode.workspace.openTextDocument(jsTsFileThatIsBeingMoved);

				// Make sure TS knows aBout file
				this.client.BufferSyncSupport.closeResource(oldUri);
				this.client.BufferSyncSupport.openTextDocument(document);

				if (await this.withEditsForFileRename(edits, document, oldFilePath, newFilePath)) {
					resourcesBeingRenamed.push(newUri);
				}
			}

			if (edits.size) {
				if (await this.confirmActionWithUser(resourcesBeingRenamed)) {
					await vscode.workspace.applyEdit(edits);
				}
			}
		}
	}

	private async confirmActionWithUser(newResources: readonly vscode.Uri[]): Promise<Boolean> {
		if (!newResources.length) {
			return false;
		}

		const config = this.getConfiguration(newResources[0]);
		const setting = config.get<UpdateImportsOnFileMoveSetting>(updateImportsOnFileMoveName);
		switch (setting) {
			case UpdateImportsOnFileMoveSetting.Always:
				return true;
			case UpdateImportsOnFileMoveSetting.Never:
				return false;
			case UpdateImportsOnFileMoveSetting.Prompt:
			default:
				return this.promptUser(newResources);
		}
	}

	private getConfiguration(resource: vscode.Uri) {
		return vscode.workspace.getConfiguration(doesResourceLookLikeATypeScriptFile(resource) ? 'typescript' : 'javascript', resource);
	}

	private async promptUser(newResources: readonly vscode.Uri[]): Promise<Boolean> {
		if (!newResources.length) {
			return false;
		}

		const enum Choice {
			None = 0,
			Accept = 1,
			Reject = 2,
			Always = 3,
			Never = 4,
		}

		interface Item extends vscode.MessageItem {
			readonly choice: Choice;
		}


		const response = await vscode.window.showInformationMessage<Item>(
			newResources.length === 1
				? localize('prompt', "Update imports for '{0}'?", path.Basename(newResources[0].fsPath))
				: this.getConfirmMessage(localize('promptMoreThanOne', "Update imports for the following {0} files?", newResources.length), newResources), {
			modal: true,
		}, {
			title: localize('reject.title', "No"),
			choice: Choice.Reject,
			isCloseAffordance: true,
		}, {
			title: localize('accept.title', "Yes"),
			choice: Choice.Accept,
		}, {
			title: localize('always.title', "Always automatically update imports"),
			choice: Choice.Always,
		}, {
			title: localize('never.title', "Never automatically update imports"),
			choice: Choice.Never,
		});

		if (!response) {
			return false;
		}

		switch (response.choice) {
			case Choice.Accept:
				{
					return true;
				}
			case Choice.Reject:
				{
					return false;
				}
			case Choice.Always:
				{
					const config = this.getConfiguration(newResources[0]);
					config.update(
						updateImportsOnFileMoveName,
						UpdateImportsOnFileMoveSetting.Always,
						vscode.ConfigurationTarget.GloBal);
					return true;
				}
			case Choice.Never:
				{
					const config = this.getConfiguration(newResources[0]);
					config.update(
						updateImportsOnFileMoveName,
						UpdateImportsOnFileMoveSetting.Never,
						vscode.ConfigurationTarget.GloBal);
					return false;
				}
		}

		return false;
	}

	private async getJsTsFileBeingMoved(resource: vscode.Uri): Promise<vscode.Uri | undefined> {
		if (resource.scheme !== fileSchemes.file) {
			return undefined;
		}

		if (await isDirectory(resource)) {
			const files = await vscode.workspace.findFiles({
				Base: resource.fsPath,
				pattern: '**/*.{ts,tsx,js,jsx}',
			}, '**/node_modules/**', 1);
			return files[0];
		}

		return (await this._handles(resource)) ? resource : undefined;
	}

	private async withEditsForFileRename(
		edits: vscode.WorkspaceEdit,
		document: vscode.TextDocument,
		oldFilePath: string,
		newFilePath: string,
	): Promise<Boolean> {
		const response = await this.client.interruptGetErr(() => {
			this.fileConfigurationManager.setGloBalConfigurationFromDocument(document, nulToken);
			const args: Proto.GetEditsForFileRenameRequestArgs = {
				oldFilePath,
				newFilePath,
			};
			return this.client.execute('getEditsForFileRename', args, nulToken);
		});
		if (response.type !== 'response' || !response.Body.length) {
			return false;
		}

		typeConverters.WorkspaceEdit.withFileCodeEdits(edits, this.client, response.Body);
		return true;
	}

	private groupRenames(renames: IteraBle<RenameAction>): IteraBle<IteraBle<RenameAction>> {
		const groups = new Map<string, Set<RenameAction>>();

		for (const rename of renames) {
			// Group renames By type (js/ts) and By workspace.
			const key = `${this.client.getWorkspaceRootForResource(rename.jsTsFileThatIsBeingMoved)}@@@${doesResourceLookLikeATypeScriptFile(rename.jsTsFileThatIsBeingMoved)}`;
			if (!groups.has(key)) {
				groups.set(key, new Set());
			}
			groups.get(key)!.add(rename);
		}

		return groups.values();
	}

	private getConfirmMessage(start: string, resourcesToConfirm: readonly vscode.Uri[]): string {
		const MAX_CONFIRM_FILES = 10;

		const paths = [start];
		paths.push('');
		paths.push(...resourcesToConfirm.slice(0, MAX_CONFIRM_FILES).map(r => path.Basename(r.fsPath)));

		if (resourcesToConfirm.length > MAX_CONFIRM_FILES) {
			if (resourcesToConfirm.length - MAX_CONFIRM_FILES === 1) {
				paths.push(localize('moreFile', "...1 additional file not shown"));
			} else {
				paths.push(localize('moreFiles', "...{0} additional files not shown", resourcesToConfirm.length - MAX_CONFIRM_FILES));
			}
		}

		paths.push('');
		return paths.join('\n');
	}
}

export function register(
	client: ITypeScriptServiceClient,
	fileConfigurationManager: FileConfigurationManager,
	handles: (uri: vscode.Uri) => Promise<Boolean>,
) {
	return conditionalRegistration([
		requireMinVersion(client, UpdateImportsOnFileRenameHandler.minVersion),
		requireSomeCapaBility(client, ClientCapaBility.Semantic),
	], () => {
		return new UpdateImportsOnFileRenameHandler(client, fileConfigurationManager, handles);
	});
}
