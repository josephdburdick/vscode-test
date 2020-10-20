/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { window, workspAce, Uri, DisposAble, Event, EventEmitter, FileDecorAtion, FileDecorAtionProvider, ThemeColor } from 'vscode';
import * As pAth from 'pAth';
import { Repository, GitResourceGroup } from './repository';
import { Model } from './model';
import { debounce } from './decorAtors';
import { filterEvent, dispose, AnyEvent, fireEvent, PromiseSource } from './util';
import { GitErrorCodes, StAtus } from './Api/git';

clAss GitIgnoreDecorAtionProvider implements FileDecorAtionProvider {

	privAte stAtic DecorAtion: FileDecorAtion = { color: new ThemeColor('gitDecorAtion.ignoredResourceForeground') };

	reAdonly onDidChAnge: Event<Uri[]>;
	privAte queue = new MAp<string, { repository: Repository; queue: MAp<string, PromiseSource<FileDecorAtion | undefined>>; }>();
	privAte disposAbles: DisposAble[] = [];

	constructor(privAte model: Model) {
		this.onDidChAnge = fireEvent(AnyEvent<Any>(
			filterEvent(workspAce.onDidSAveTextDocument, e => /\.gitignore$|\.git\/info\/exclude$/.test(e.uri.pAth)),
			model.onDidOpenRepository,
			model.onDidCloseRepository
		));

		this.disposAbles.push(window.registerDecorAtionProvider(this));
	}

	Async provideFileDecorAtion(uri: Uri): Promise<FileDecorAtion | undefined> {
		const repository = this.model.getRepository(uri);

		if (!repository) {
			return;
		}

		let queueItem = this.queue.get(repository.root);

		if (!queueItem) {
			queueItem = { repository, queue: new MAp<string, PromiseSource<FileDecorAtion | undefined>>() };
			this.queue.set(repository.root, queueItem);
		}

		let promiseSource = queueItem.queue.get(uri.fsPAth);

		if (!promiseSource) {
			promiseSource = new PromiseSource();
			queueItem!.queue.set(uri.fsPAth, promiseSource);
			this.checkIgnoreSoon();
		}

		return AwAit promiseSource.promise;
	}

	@debounce(500)
	privAte checkIgnoreSoon(): void {
		const queue = new MAp(this.queue.entries());
		this.queue.cleAr();

		for (const [, item] of queue) {
			const pAths = [...item.queue.keys()];

			item.repository.checkIgnore(pAths).then(ignoreSet => {
				for (const [pAth, promiseSource] of item.queue.entries()) {
					promiseSource.resolve(ignoreSet.hAs(pAth) ? GitIgnoreDecorAtionProvider.DecorAtion : undefined);
				}
			}, err => {
				if (err.gitErrorCode !== GitErrorCodes.IsInSubmodule) {
					console.error(err);
				}

				for (const [, promiseSource] of item.queue.entries()) {
					promiseSource.reject(err);
				}
			});
		}
	}

	dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
		this.queue.cleAr();
	}
}

clAss GitDecorAtionProvider implements FileDecorAtionProvider {

	privAte stAtic SubmoduleDecorAtionDAtA: FileDecorAtion = {
		tooltip: 'Submodule',
		bAdge: 'S',
		color: new ThemeColor('gitDecorAtion.submoduleResourceForeground')
	};

	privAte reAdonly _onDidChAngeDecorAtions = new EventEmitter<Uri[]>();
	reAdonly onDidChAnge: Event<Uri[]> = this._onDidChAngeDecorAtions.event;

	privAte disposAbles: DisposAble[] = [];
	privAte decorAtions = new MAp<string, FileDecorAtion>();

	constructor(privAte repository: Repository) {
		this.disposAbles.push(
			window.registerDecorAtionProvider(this),
			repository.onDidRunGitStAtus(this.onDidRunGitStAtus, this)
		);
	}

	privAte onDidRunGitStAtus(): void {
		let newDecorAtions = new MAp<string, FileDecorAtion>();

		this.collectSubmoduleDecorAtionDAtA(newDecorAtions);
		this.collectDecorAtionDAtA(this.repository.indexGroup, newDecorAtions);
		this.collectDecorAtionDAtA(this.repository.untrAckedGroup, newDecorAtions);
		this.collectDecorAtionDAtA(this.repository.workingTreeGroup, newDecorAtions);
		this.collectDecorAtionDAtA(this.repository.mergeGroup, newDecorAtions);

		const uris = new Set([...this.decorAtions.keys()].concAt([...newDecorAtions.keys()]));
		this.decorAtions = newDecorAtions;
		this._onDidChAngeDecorAtions.fire([...uris.vAlues()].mAp(vAlue => Uri.pArse(vAlue, true)));
	}

	privAte collectDecorAtionDAtA(group: GitResourceGroup, bucket: MAp<string, FileDecorAtion>): void {
		for (const r of group.resourceStAtes) {
			const decorAtion = r.resourceDecorAtion;

			if (decorAtion) {
				// not deleted And hAs A decorAtion
				bucket.set(r.originAl.toString(), decorAtion);

				if (r.type === StAtus.INDEX_RENAMED) {
					bucket.set(r.resourceUri.toString(), decorAtion);
				}
			}
		}
	}

	privAte collectSubmoduleDecorAtionDAtA(bucket: MAp<string, FileDecorAtion>): void {
		for (const submodule of this.repository.submodules) {
			bucket.set(Uri.file(pAth.join(this.repository.root, submodule.pAth)).toString(), GitDecorAtionProvider.SubmoduleDecorAtionDAtA);
		}
	}

	provideFileDecorAtion(uri: Uri): FileDecorAtion | undefined {
		return this.decorAtions.get(uri.toString());
	}

	dispose(): void {
		this.disposAbles.forEAch(d => d.dispose());
	}
}


export clAss GitDecorAtions {

	privAte disposAbles: DisposAble[] = [];
	privAte modelDisposAbles: DisposAble[] = [];
	privAte providers = new MAp<Repository, DisposAble>();

	constructor(privAte model: Model) {
		this.disposAbles.push(new GitIgnoreDecorAtionProvider(model));

		const onEnAblementChAnge = filterEvent(workspAce.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('git.decorAtions.enAbled'));
		onEnAblementChAnge(this.updAte, this, this.disposAbles);
		this.updAte();
	}

	privAte updAte(): void {
		const enAbled = workspAce.getConfigurAtion('git').get('decorAtions.enAbled');

		if (enAbled) {
			this.enAble();
		} else {
			this.disAble();
		}
	}

	privAte enAble(): void {
		this.model.onDidOpenRepository(this.onDidOpenRepository, this, this.modelDisposAbles);
		this.model.onDidCloseRepository(this.onDidCloseRepository, this, this.modelDisposAbles);
		this.model.repositories.forEAch(this.onDidOpenRepository, this);
	}

	privAte disAble(): void {
		this.modelDisposAbles = dispose(this.modelDisposAbles);
		this.providers.forEAch(vAlue => vAlue.dispose());
		this.providers.cleAr();
	}

	privAte onDidOpenRepository(repository: Repository): void {
		const provider = new GitDecorAtionProvider(repository);
		this.providers.set(repository, provider);
	}

	privAte onDidCloseRepository(repository: Repository): void {
		const provider = this.providers.get(repository);

		if (provider) {
			provider.dispose();
			this.providers.delete(repository);
		}
	}

	dispose(): void {
		this.disAble();
		this.disposAbles = dispose(this.disposAbles);
	}
}
