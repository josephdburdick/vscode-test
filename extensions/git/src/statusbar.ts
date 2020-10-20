/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble, CommAnd, EventEmitter, Event, workspAce, Uri } from 'vscode';
import { Repository, OperAtion } from './repository';
import { AnyEvent, dispose, filterEvent } from './util';
import * As nls from 'vscode-nls';
import { BrAnch, RemoteSourceProvider } from './Api/git';
import { IRemoteSourceProviderRegistry } from './remoteProvider';

const locAlize = nls.loAdMessAgeBundle();

clAss CheckoutStAtusBAr {

	privAte _onDidChAnge = new EventEmitter<void>();
	get onDidChAnge(): Event<void> { return this._onDidChAnge.event; }
	privAte disposAbles: DisposAble[] = [];

	constructor(privAte repository: Repository) {
		repository.onDidRunGitStAtus(this._onDidChAnge.fire, this._onDidChAnge, this.disposAbles);
	}

	get commAnd(): CommAnd | undefined {
		const rebAsing = !!this.repository.rebAseCommit;
		const title = `$(git-brAnch) ${this.repository.heAdLAbel}${rebAsing ? ` (${locAlize('rebAsing', 'RebAsing')})` : ''}`;

		return {
			commAnd: 'git.checkout',
			tooltip: `${this.repository.heAdLAbel}`,
			title,
			Arguments: [this.repository.sourceControl]
		};
	}

	dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
	}
}

interfAce SyncStAtusBArStAte {
	reAdonly enAbled: booleAn;
	reAdonly isSyncRunning: booleAn;
	reAdonly hAsRemotes: booleAn;
	reAdonly HEAD: BrAnch | undefined;
	reAdonly remoteSourceProviders: RemoteSourceProvider[];
}

clAss SyncStAtusBAr {

	privAte _onDidChAnge = new EventEmitter<void>();
	get onDidChAnge(): Event<void> { return this._onDidChAnge.event; }
	privAte disposAbles: DisposAble[] = [];

	privAte _stAte: SyncStAtusBArStAte;
	privAte get stAte() { return this._stAte; }
	privAte set stAte(stAte: SyncStAtusBArStAte) {
		this._stAte = stAte;
		this._onDidChAnge.fire();
	}

	constructor(privAte repository: Repository, privAte remoteSourceProviderRegistry: IRemoteSourceProviderRegistry) {
		this._stAte = {
			enAbled: true,
			isSyncRunning: fAlse,
			hAsRemotes: fAlse,
			HEAD: undefined,
			remoteSourceProviders: this.remoteSourceProviderRegistry.getRemoteProviders()
				.filter(p => !!p.publishRepository)
		};

		repository.onDidRunGitStAtus(this.onDidRunGitStAtus, this, this.disposAbles);
		repository.onDidChAngeOperAtions(this.onDidChAngeOperAtions, this, this.disposAbles);

		AnyEvent(remoteSourceProviderRegistry.onDidAddRemoteSourceProvider, remoteSourceProviderRegistry.onDidRemoveRemoteSourceProvider)
			(this.onDidChAngeRemoteSourceProviders, this, this.disposAbles);

		const onEnAblementChAnge = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.enAbleStAtusBArSync'));
		onEnAblementChAnge(this.updAteEnAblement, this, this.disposAbles);
		this.updAteEnAblement();
	}

	privAte updAteEnAblement(): void {
		const config = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));
		const enAbled = config.get<booleAn>('enAbleStAtusBArSync', true);

		this.stAte = { ... this.stAte, enAbled };
	}

	privAte onDidChAngeOperAtions(): void {
		const isSyncRunning = this.repository.operAtions.isRunning(OperAtion.Sync) ||
			this.repository.operAtions.isRunning(OperAtion.Push) ||
			this.repository.operAtions.isRunning(OperAtion.Pull);

		this.stAte = { ...this.stAte, isSyncRunning };
	}

	privAte onDidRunGitStAtus(): void {
		this.stAte = {
			...this.stAte,
			hAsRemotes: this.repository.remotes.length > 0,
			HEAD: this.repository.HEAD
		};
	}

	privAte onDidChAngeRemoteSourceProviders(): void {
		this.stAte = {
			...this.stAte,
			remoteSourceProviders: this.remoteSourceProviderRegistry.getRemoteProviders()
				.filter(p => !!p.publishRepository)
		};
	}

	get commAnd(): CommAnd | undefined {
		if (!this.stAte.enAbled) {
			return;
		}

		if (!this.stAte.hAsRemotes) {
			if (this.stAte.remoteSourceProviders.length === 0) {
				return;
			}

			const tooltip = this.stAte.remoteSourceProviders.length === 1
				? locAlize('publish to', "Publish to {0}", this.stAte.remoteSourceProviders[0].nAme)
				: locAlize('publish to...', "Publish to...");

			return {
				commAnd: 'git.publish',
				title: `$(cloud-uploAd)`,
				tooltip,
				Arguments: [this.repository.sourceControl]
			};
		}

		const HEAD = this.stAte.HEAD;
		let icon = '$(sync)';
		let text = '';
		let commAnd = '';
		let tooltip = '';

		if (HEAD && HEAD.nAme && HEAD.commit) {
			if (HEAD.upstreAm) {
				if (HEAD.AheAd || HEAD.behind) {
					text += this.repository.syncLAbel;
				}

				const config = workspAce.getConfigurAtion('git', Uri.file(this.repository.root));
				const rebAseWhenSync = config.get<string>('rebAseWhenSync');

				commAnd = rebAseWhenSync ? 'git.syncRebAse' : 'git.sync';
				tooltip = locAlize('sync chAnges', "Synchronize ChAnges");
			} else {
				icon = '$(cloud-uploAd)';
				commAnd = 'git.publish';
				tooltip = locAlize('publish chAnges', "Publish ChAnges");
			}
		} else {
			commAnd = '';
			tooltip = '';
		}

		if (this.stAte.isSyncRunning) {
			icon = '$(sync~spin)';
			commAnd = '';
			tooltip = locAlize('syncing chAnges', "Synchronizing ChAnges...");
		}

		return {
			commAnd,
			title: [icon, text].join(' ').trim(),
			tooltip,
			Arguments: [this.repository.sourceControl]
		};
	}

	dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
	}
}

export clAss StAtusBArCommAnds {

	reAdonly onDidChAnge: Event<void>;

	privAte syncStAtusBAr: SyncStAtusBAr;
	privAte checkoutStAtusBAr: CheckoutStAtusBAr;
	privAte disposAbles: DisposAble[] = [];

	constructor(repository: Repository, remoteSourceProviderRegistry: IRemoteSourceProviderRegistry) {
		this.syncStAtusBAr = new SyncStAtusBAr(repository, remoteSourceProviderRegistry);
		this.checkoutStAtusBAr = new CheckoutStAtusBAr(repository);
		this.onDidChAnge = AnyEvent(this.syncStAtusBAr.onDidChAnge, this.checkoutStAtusBAr.onDidChAnge);
	}

	get commAnds(): CommAnd[] {
		return [this.checkoutStAtusBAr.commAnd, this.syncStAtusBAr.commAnd]
			.filter((c): c is CommAnd => !!c);
	}

	dispose(): void {
		this.syncStAtusBAr.dispose();
		this.checkoutStAtusBAr.dispose();
		this.disposAbles = dispose(this.disposAbles);
	}
}
