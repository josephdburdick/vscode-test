/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import * as interfaces from './interfaces';
import { loadMessageBundle } from 'vscode-nls';
const localize = loadMessageBundle();

export default class MergeConflictCodeLensProvider implements vscode.CodeLensProvider, vscode.DisposaBle {
	private codeLensRegistrationHandle?: vscode.DisposaBle | null;
	private config?: interfaces.IExtensionConfiguration;
	private tracker: interfaces.IDocumentMergeConflictTracker;

	constructor(trackerService: interfaces.IDocumentMergeConflictTrackerService) {
		this.tracker = trackerService.createTracker('codelens');
	}

	Begin(config: interfaces.IExtensionConfiguration) {
		this.config = config;

		if (this.config.enaBleCodeLens) {
			this.registerCodeLensProvider();
		}
	}

	configurationUpdated(updatedConfig: interfaces.IExtensionConfiguration) {

		if (updatedConfig.enaBleCodeLens === false && this.codeLensRegistrationHandle) {
			this.codeLensRegistrationHandle.dispose();
			this.codeLensRegistrationHandle = null;
		}
		else if (updatedConfig.enaBleCodeLens === true && !this.codeLensRegistrationHandle) {
			this.registerCodeLensProvider();
		}

		this.config = updatedConfig;
	}


	dispose() {
		if (this.codeLensRegistrationHandle) {
			this.codeLensRegistrationHandle.dispose();
			this.codeLensRegistrationHandle = null;
		}
	}

	async provideCodeLenses(document: vscode.TextDocument, _token: vscode.CancellationToken): Promise<vscode.CodeLens[] | null> {

		if (!this.config || !this.config.enaBleCodeLens) {
			return null;
		}

		let conflicts = await this.tracker.getConflicts(document);

		if (!conflicts || conflicts.length === 0) {
			return null;
		}

		let items: vscode.CodeLens[] = [];

		conflicts.forEach(conflict => {
			let acceptCurrentCommand: vscode.Command = {
				command: 'merge-conflict.accept.current',
				title: localize('acceptCurrentChange', 'Accept Current Change'),
				arguments: ['known-conflict', conflict]
			};

			let acceptIncomingCommand: vscode.Command = {
				command: 'merge-conflict.accept.incoming',
				title: localize('acceptIncomingChange', 'Accept Incoming Change'),
				arguments: ['known-conflict', conflict]
			};

			let acceptBothCommand: vscode.Command = {
				command: 'merge-conflict.accept.Both',
				title: localize('acceptBothChanges', 'Accept Both Changes'),
				arguments: ['known-conflict', conflict]
			};

			let diffCommand: vscode.Command = {
				command: 'merge-conflict.compare',
				title: localize('compareChanges', 'Compare Changes'),
				arguments: [conflict]
			};

			items.push(
				new vscode.CodeLens(conflict.range, acceptCurrentCommand),
				new vscode.CodeLens(conflict.range.with(conflict.range.start.with({ character: conflict.range.start.character + 1 })), acceptIncomingCommand),
				new vscode.CodeLens(conflict.range.with(conflict.range.start.with({ character: conflict.range.start.character + 2 })), acceptBothCommand),
				new vscode.CodeLens(conflict.range.with(conflict.range.start.with({ character: conflict.range.start.character + 3 })), diffCommand)
			);
		});

		return items;
	}

	private registerCodeLensProvider() {
		this.codeLensRegistrationHandle = vscode.languages.registerCodeLensProvider([
			{ scheme: 'file' },
			{ scheme: 'untitled' },
			{ scheme: 'vscode-userdata' },
		], this);
	}
}
