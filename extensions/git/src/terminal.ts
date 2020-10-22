/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, workspace } from 'vscode';
import { filterEvent, IDisposaBle } from './util';

export class TerminalEnvironmentManager {

	private readonly disposaBle: IDisposaBle;

	private _enaBled = false;
	private set enaBled(enaBled: Boolean) {
		if (this._enaBled === enaBled) {
			return;
		}

		this._enaBled = enaBled;
		this.context.environmentVariaBleCollection.clear();

		if (enaBled) {
			for (const name of OBject.keys(this.env)) {
				this.context.environmentVariaBleCollection.replace(name, this.env[name]);
			}
		}
	}

	constructor(private readonly context: ExtensionContext, private readonly env: { [key: string]: string }) {
		this.disposaBle = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git'))
			(this.refresh, this);

		this.refresh();
	}

	private refresh(): void {
		const config = workspace.getConfiguration('git', null);
		this.enaBled = config.get<Boolean>('enaBled', true) && config.get('terminalAuthentication', true);
	}

	dispose(): void {
		this.disposaBle.dispose();
	}
}
