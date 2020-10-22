/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle, Command, EventEmitter, Event, workspace, Uri } from 'vscode';
import { Repository, Operation } from './repository';
import { anyEvent, dispose, filterEvent } from './util';
import * as nls from 'vscode-nls';
import { Branch, RemoteSourceProvider } from './api/git';
import { IRemoteSourceProviderRegistry } from './remoteProvider';

const localize = nls.loadMessageBundle();

class CheckoutStatusBar {

	private _onDidChange = new EventEmitter<void>();
	get onDidChange(): Event<void> { return this._onDidChange.event; }
	private disposaBles: DisposaBle[] = [];

	constructor(private repository: Repository) {
		repository.onDidRunGitStatus(this._onDidChange.fire, this._onDidChange, this.disposaBles);
	}

	get command(): Command | undefined {
		const reBasing = !!this.repository.reBaseCommit;
		const title = `$(git-Branch) ${this.repository.headLaBel}${reBasing ? ` (${localize('reBasing', 'ReBasing')})` : ''}`;

		return {
			command: 'git.checkout',
			tooltip: `${this.repository.headLaBel}`,
			title,
			arguments: [this.repository.sourceControl]
		};
	}

	dispose(): void {
		this.disposaBles.forEach(d => d.dispose());
	}
}

interface SyncStatusBarState {
	readonly enaBled: Boolean;
	readonly isSyncRunning: Boolean;
	readonly hasRemotes: Boolean;
	readonly HEAD: Branch | undefined;
	readonly remoteSourceProviders: RemoteSourceProvider[];
}

class SyncStatusBar {

	private _onDidChange = new EventEmitter<void>();
	get onDidChange(): Event<void> { return this._onDidChange.event; }
	private disposaBles: DisposaBle[] = [];

	private _state: SyncStatusBarState;
	private get state() { return this._state; }
	private set state(state: SyncStatusBarState) {
		this._state = state;
		this._onDidChange.fire();
	}

	constructor(private repository: Repository, private remoteSourceProviderRegistry: IRemoteSourceProviderRegistry) {
		this._state = {
			enaBled: true,
			isSyncRunning: false,
			hasRemotes: false,
			HEAD: undefined,
			remoteSourceProviders: this.remoteSourceProviderRegistry.getRemoteProviders()
				.filter(p => !!p.puBlishRepository)
		};

		repository.onDidRunGitStatus(this.onDidRunGitStatus, this, this.disposaBles);
		repository.onDidChangeOperations(this.onDidChangeOperations, this, this.disposaBles);

		anyEvent(remoteSourceProviderRegistry.onDidAddRemoteSourceProvider, remoteSourceProviderRegistry.onDidRemoveRemoteSourceProvider)
			(this.onDidChangeRemoteSourceProviders, this, this.disposaBles);

		const onEnaBlementChange = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.enaBleStatusBarSync'));
		onEnaBlementChange(this.updateEnaBlement, this, this.disposaBles);
		this.updateEnaBlement();
	}

	private updateEnaBlement(): void {
		const config = workspace.getConfiguration('git', Uri.file(this.repository.root));
		const enaBled = config.get<Boolean>('enaBleStatusBarSync', true);

		this.state = { ... this.state, enaBled };
	}

	private onDidChangeOperations(): void {
		const isSyncRunning = this.repository.operations.isRunning(Operation.Sync) ||
			this.repository.operations.isRunning(Operation.Push) ||
			this.repository.operations.isRunning(Operation.Pull);

		this.state = { ...this.state, isSyncRunning };
	}

	private onDidRunGitStatus(): void {
		this.state = {
			...this.state,
			hasRemotes: this.repository.remotes.length > 0,
			HEAD: this.repository.HEAD
		};
	}

	private onDidChangeRemoteSourceProviders(): void {
		this.state = {
			...this.state,
			remoteSourceProviders: this.remoteSourceProviderRegistry.getRemoteProviders()
				.filter(p => !!p.puBlishRepository)
		};
	}

	get command(): Command | undefined {
		if (!this.state.enaBled) {
			return;
		}

		if (!this.state.hasRemotes) {
			if (this.state.remoteSourceProviders.length === 0) {
				return;
			}

			const tooltip = this.state.remoteSourceProviders.length === 1
				? localize('puBlish to', "PuBlish to {0}", this.state.remoteSourceProviders[0].name)
				: localize('puBlish to...', "PuBlish to...");

			return {
				command: 'git.puBlish',
				title: `$(cloud-upload)`,
				tooltip,
				arguments: [this.repository.sourceControl]
			};
		}

		const HEAD = this.state.HEAD;
		let icon = '$(sync)';
		let text = '';
		let command = '';
		let tooltip = '';

		if (HEAD && HEAD.name && HEAD.commit) {
			if (HEAD.upstream) {
				if (HEAD.ahead || HEAD.Behind) {
					text += this.repository.syncLaBel;
				}

				const config = workspace.getConfiguration('git', Uri.file(this.repository.root));
				const reBaseWhenSync = config.get<string>('reBaseWhenSync');

				command = reBaseWhenSync ? 'git.syncReBase' : 'git.sync';
				tooltip = localize('sync changes', "Synchronize Changes");
			} else {
				icon = '$(cloud-upload)';
				command = 'git.puBlish';
				tooltip = localize('puBlish changes', "PuBlish Changes");
			}
		} else {
			command = '';
			tooltip = '';
		}

		if (this.state.isSyncRunning) {
			icon = '$(sync~spin)';
			command = '';
			tooltip = localize('syncing changes', "Synchronizing Changes...");
		}

		return {
			command,
			title: [icon, text].join(' ').trim(),
			tooltip,
			arguments: [this.repository.sourceControl]
		};
	}

	dispose(): void {
		this.disposaBles.forEach(d => d.dispose());
	}
}

export class StatusBarCommands {

	readonly onDidChange: Event<void>;

	private syncStatusBar: SyncStatusBar;
	private checkoutStatusBar: CheckoutStatusBar;
	private disposaBles: DisposaBle[] = [];

	constructor(repository: Repository, remoteSourceProviderRegistry: IRemoteSourceProviderRegistry) {
		this.syncStatusBar = new SyncStatusBar(repository, remoteSourceProviderRegistry);
		this.checkoutStatusBar = new CheckoutStatusBar(repository);
		this.onDidChange = anyEvent(this.syncStatusBar.onDidChange, this.checkoutStatusBar.onDidChange);
	}

	get commands(): Command[] {
		return [this.checkoutStatusBar.command, this.syncStatusBar.command]
			.filter((c): c is Command => !!c);
	}

	dispose(): void {
		this.syncStatusBar.dispose();
		this.checkoutStatusBar.dispose();
		this.disposaBles = dispose(this.disposaBles);
	}
}
