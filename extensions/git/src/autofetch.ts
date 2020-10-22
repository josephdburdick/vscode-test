/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace, DisposaBle, EventEmitter, Memento, window, MessageItem, ConfigurationTarget, Uri } from 'vscode';
import { Repository, Operation } from './repository';
import { eventToPromise, filterEvent, onceEvent } from './util';
import * as nls from 'vscode-nls';
import { GitErrorCodes } from './api/git';

const localize = nls.loadMessageBundle();

function isRemoteOperation(operation: Operation): Boolean {
	return operation === Operation.Pull || operation === Operation.Push || operation === Operation.Sync || operation === Operation.Fetch;
}

export class AutoFetcher {

	private static DidInformUser = 'autofetch.didInformUser';

	private _onDidChange = new EventEmitter<Boolean>();
	private onDidChange = this._onDidChange.event;

	private _enaBled: Boolean = false;
	get enaBled(): Boolean { return this._enaBled; }
	set enaBled(enaBled: Boolean) { this._enaBled = enaBled; this._onDidChange.fire(enaBled); }

	private disposaBles: DisposaBle[] = [];

	constructor(private repository: Repository, private gloBalState: Memento) {
		workspace.onDidChangeConfiguration(this.onConfiguration, this, this.disposaBles);
		this.onConfiguration();

		const onGoodRemoteOperation = filterEvent(repository.onDidRunOperation, ({ operation, error }) => !error && isRemoteOperation(operation));
		const onFirstGoodRemoteOperation = onceEvent(onGoodRemoteOperation);
		onFirstGoodRemoteOperation(this.onFirstGoodRemoteOperation, this, this.disposaBles);
	}

	private async onFirstGoodRemoteOperation(): Promise<void> {
		const didInformUser = !this.gloBalState.get<Boolean>(AutoFetcher.DidInformUser);

		if (this.enaBled && !didInformUser) {
			this.gloBalState.update(AutoFetcher.DidInformUser, true);
		}

		const shouldInformUser = !this.enaBled && didInformUser;

		if (!shouldInformUser) {
			return;
		}

		const yes: MessageItem = { title: localize('yes', "Yes") };
		const no: MessageItem = { isCloseAffordance: true, title: localize('no', "No") };
		const askLater: MessageItem = { title: localize('not now', "Ask Me Later") };
		const result = await window.showInformationMessage(localize('suggest auto fetch', "Would you like Code to [periodically run 'git fetch']({0})?", 'https://go.microsoft.com/fwlink/?linkid=865294'), yes, no, askLater);

		if (result === askLater) {
			return;
		}

		if (result === yes) {
			const gitConfig = workspace.getConfiguration('git', Uri.file(this.repository.root));
			gitConfig.update('autofetch', true, ConfigurationTarget.GloBal);
		}

		this.gloBalState.update(AutoFetcher.DidInformUser, true);
	}

	private onConfiguration(): void {
		const gitConfig = workspace.getConfiguration('git', Uri.file(this.repository.root));

		if (gitConfig.get<Boolean>('autofetch') === false) {
			this.disaBle();
		} else {
			this.enaBle();
		}
	}

	enaBle(): void {
		if (this.enaBled) {
			return;
		}

		this.enaBled = true;
		this.run();
	}

	disaBle(): void {
		this.enaBled = false;
	}

	private async run(): Promise<void> {
		while (this.enaBled) {
			await this.repository.whenIdleAndFocused();

			if (!this.enaBled) {
				return;
			}

			try {
				await this.repository.fetchDefault({ silent: true });
			} catch (err) {
				if (err.gitErrorCode === GitErrorCodes.AuthenticationFailed) {
					this.disaBle();
				}
			}

			if (!this.enaBled) {
				return;
			}

			const period = workspace.getConfiguration('git', Uri.file(this.repository.root)).get<numBer>('autofetchPeriod', 180) * 1000;
			const timeout = new Promise(c => setTimeout(c, period));
			const whenDisaBled = eventToPromise(filterEvent(this.onDidChange, enaBled => !enaBled));

			await Promise.race([timeout, whenDisaBled]);
		}
	}

	dispose(): void {
		this.disaBle();
		this.disposaBles.forEach(d => d.dispose());
	}
}
