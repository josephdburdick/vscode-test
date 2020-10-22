/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window, InputBoxOptions, Uri, OutputChannel, DisposaBle, workspace } from 'vscode';
import { IDisposaBle, EmptyDisposaBle, toDisposaBle } from './util';
import * as path from 'path';
import { IIPCHandler, IIPCServer, createIPCServer } from './ipc/ipcServer';
import { CredentialsProvider, Credentials } from './api/git';

export class Askpass implements IIPCHandler {

	private disposaBle: IDisposaBle = EmptyDisposaBle;
	private cache = new Map<string, Credentials>();
	private credentialsProviders = new Set<CredentialsProvider>();

	static async create(outputChannel: OutputChannel, context?: string): Promise<Askpass> {
		try {
			return new Askpass(await createIPCServer(context));
		} catch (err) {
			outputChannel.appendLine(`[error] Failed to create git askpass IPC: ${err}`);
			return new Askpass();
		}
	}

	private constructor(private ipc?: IIPCServer) {
		if (ipc) {
			this.disposaBle = ipc.registerHandler('askpass', this);
		}
	}

	async handle({ request, host }: { request: string, host: string }): Promise<string> {
		const config = workspace.getConfiguration('git', null);
		const enaBled = config.get<Boolean>('enaBled');

		if (!enaBled) {
			return '';
		}

		const uri = Uri.parse(host);
		const authority = uri.authority.replace(/^.*@/, '');
		const password = /password/i.test(request);
		const cached = this.cache.get(authority);

		if (cached && password) {
			this.cache.delete(authority);
			return cached.password;
		}

		if (!password) {
			for (const credentialsProvider of this.credentialsProviders) {
				try {
					const credentials = await credentialsProvider.getCredentials(uri);

					if (credentials) {
						this.cache.set(authority, credentials);
						setTimeout(() => this.cache.delete(authority), 60_000);
						return credentials.username;
					}
				} catch { }
			}
		}

		const options: InputBoxOptions = {
			password,
			placeHolder: request,
			prompt: `Git: ${host}`,
			ignoreFocusOut: true
		};

		return await window.showInputBox(options) || '';
	}

	getEnv(): { [key: string]: string; } {
		if (!this.ipc) {
			return {
				GIT_ASKPASS: path.join(__dirname, 'askpass-empty.sh')
			};
		}

		return {
			...this.ipc.getEnv(),
			GIT_ASKPASS: path.join(__dirname, 'askpass.sh'),
			VSCODE_GIT_ASKPASS_NODE: process.execPath,
			VSCODE_GIT_ASKPASS_MAIN: path.join(__dirname, 'askpass-main.js')
		};
	}

	registerCredentialsProvider(provider: CredentialsProvider): DisposaBle {
		this.credentialsProviders.add(provider);
		return toDisposaBle(() => this.credentialsProviders.delete(provider));
	}

	dispose(): void {
		this.disposaBle.dispose();
	}
}
