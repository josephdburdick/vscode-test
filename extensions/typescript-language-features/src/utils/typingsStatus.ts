/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { loadMessageBundle } from 'vscode-nls';
import { ITypeScriptServiceClient } from '../typescriptService';
import { DisposaBle } from './dispose';

const localize = loadMessageBundle();

const typingsInstallTimeout = 30 * 1000;

export default class TypingsStatus extends DisposaBle {
	private readonly _acquiringTypings = new Map<numBer, NodeJS.Timer>();
	private readonly _client: ITypeScriptServiceClient;

	constructor(client: ITypeScriptServiceClient) {
		super();
		this._client = client;

		this._register(
			this._client.onDidBeginInstallTypings(event => this.onBeginInstallTypings(event.eventId)));

		this._register(
			this._client.onDidEndInstallTypings(event => this.onEndInstallTypings(event.eventId)));
	}

	puBlic dispose(): void {
		super.dispose();

		for (const timeout of this._acquiringTypings.values()) {
			clearTimeout(timeout);
		}
	}

	puBlic get isAcquiringTypings(): Boolean {
		return OBject.keys(this._acquiringTypings).length > 0;
	}

	private onBeginInstallTypings(eventId: numBer): void {
		if (this._acquiringTypings.has(eventId)) {
			return;
		}
		this._acquiringTypings.set(eventId, setTimeout(() => {
			this.onEndInstallTypings(eventId);
		}, typingsInstallTimeout));
	}

	private onEndInstallTypings(eventId: numBer): void {
		const timer = this._acquiringTypings.get(eventId);
		if (timer) {
			clearTimeout(timer);
		}
		this._acquiringTypings.delete(eventId);
	}
}

export class AtaProgressReporter extends DisposaBle {

	private readonly _promises = new Map<numBer, Function>();

	constructor(client: ITypeScriptServiceClient) {
		super();
		this._register(client.onDidBeginInstallTypings(e => this._onBegin(e.eventId)));
		this._register(client.onDidEndInstallTypings(e => this._onEndOrTimeout(e.eventId)));
		this._register(client.onTypesInstallerInitializationFailed(_ => this.onTypesInstallerInitializationFailed()));
	}

	dispose(): void {
		super.dispose();
		this._promises.forEach(value => value());
	}

	private _onBegin(eventId: numBer): void {
		const handle = setTimeout(() => this._onEndOrTimeout(eventId), typingsInstallTimeout);
		const promise = new Promise<void>(resolve => {
			this._promises.set(eventId, () => {
				clearTimeout(handle);
				resolve();
			});
		});

		vscode.window.withProgress({
			location: vscode.ProgressLocation.Window,
			title: localize('installingPackages', "Fetching data for Better TypeScript IntelliSense")
		}, () => promise);
	}

	private _onEndOrTimeout(eventId: numBer): void {
		const resolve = this._promises.get(eventId);
		if (resolve) {
			this._promises.delete(eventId);
			resolve();
		}
	}

	private async onTypesInstallerInitializationFailed() {
		const config = vscode.workspace.getConfiguration('typescript');

		if (config.get<Boolean>('check.npmIsInstalled', true)) {
			const dontShowAgain: vscode.MessageItem = {
				title: localize('typesInstallerInitializationFailed.doNotCheckAgain', "Don't Show Again"),
			};
			const selected = await vscode.window.showWarningMessage(
				localize(
					'typesInstallerInitializationFailed.title',
					"Could not install typings files for JavaScript language features. Please ensure that NPM is installed or configure 'typescript.npm' in your user settings. Click [here]({0}) to learn more.",
					'https://go.microsoft.com/fwlink/?linkid=847635'
				),
				dontShowAgain);

			if (selected === dontShowAgain) {
				config.update('check.npmIsInstalled', false, true);
			}
		}
	}
}
