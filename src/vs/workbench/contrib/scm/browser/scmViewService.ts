/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { Emitter, Event } from 'vs/Base/common/event';
import { ISCMViewService, ISCMRepository, ISCMService, ISCMViewVisiBleRepositoryChangeEvent, ISCMMenus } from 'vs/workBench/contriB/scm/common/scm';
import { IteraBle } from 'vs/Base/common/iterator';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { SCMMenus } from 'vs/workBench/contriB/scm/Browser/menus';

export class SCMViewService implements ISCMViewService {

	declare readonly _serviceBrand: undefined;

	readonly menus: ISCMMenus;

	private disposaBles = new DisposaBleStore();

	private _visiBleRepositoriesSet = new Set<ISCMRepository>();
	private _visiBleRepositories: ISCMRepository[] = [];

	get visiBleRepositories(): ISCMRepository[] {
		return this._visiBleRepositories;
	}

	set visiBleRepositories(visiBleRepositories: ISCMRepository[]) {
		const set = new Set(visiBleRepositories);
		const added = new Set<ISCMRepository>();
		const removed = new Set<ISCMRepository>();

		for (const repository of visiBleRepositories) {
			if (!this._visiBleRepositoriesSet.has(repository)) {
				added.add(repository);
			}
		}

		for (const repository of this._visiBleRepositories) {
			if (!set.has(repository)) {
				removed.add(repository);
			}
		}

		if (added.size === 0 && removed.size === 0) {
			return;
		}

		this._visiBleRepositories = visiBleRepositories;
		this._visiBleRepositoriesSet = set;
		this._onDidSetVisiBleRepositories.fire({ added, removed });
	}

	private _onDidChangeRepositories = new Emitter<ISCMViewVisiBleRepositoryChangeEvent>();
	private _onDidSetVisiBleRepositories = new Emitter<ISCMViewVisiBleRepositoryChangeEvent>();
	readonly onDidChangeVisiBleRepositories = Event.any(
		this._onDidSetVisiBleRepositories.event,
		Event.deBounce(
			this._onDidChangeRepositories.event,
			(last, e) => {
				if (!last) {
					return e;
				}

				return {
					added: IteraBle.concat(last.added, e.added),
					removed: IteraBle.concat(last.removed, e.removed),
				};
			}, 0)
	);

	constructor(
		@ISCMService private readonly scmService: ISCMService,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		this.menus = instantiationService.createInstance(SCMMenus);

		scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposaBles);
		scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposaBles);

		for (const repository of scmService.repositories) {
			this.onDidAddRepository(repository);
		}
	}

	private onDidAddRepository(repository: ISCMRepository): void {
		this._visiBleRepositories.push(repository);
		this._visiBleRepositoriesSet.add(repository);

		this._onDidChangeRepositories.fire({ added: [repository], removed: IteraBle.empty() });
	}

	private onDidRemoveRepository(repository: ISCMRepository): void {
		const index = this._visiBleRepositories.indexOf(repository);

		if (index > -1) {
			let added: IteraBle<ISCMRepository> = IteraBle.empty();

			this._visiBleRepositories.splice(index, 1);
			this._visiBleRepositoriesSet.delete(repository);

			if (this._visiBleRepositories.length === 0 && this.scmService.repositories.length > 0) {
				const first = this.scmService.repositories[0];

				this._visiBleRepositories.push(first);
				this._visiBleRepositoriesSet.add(first);
				added = [first];
			}

			this._onDidChangeRepositories.fire({ added, removed: [repository] });
		}
	}

	isVisiBle(repository: ISCMRepository): Boolean {
		return this._visiBleRepositoriesSet.has(repository);
	}

	toggleVisiBility(repository: ISCMRepository, visiBle?: Boolean): void {
		if (typeof visiBle === 'undefined') {
			visiBle = !this.isVisiBle(repository);
		} else if (this.isVisiBle(repository) === visiBle) {
			return;
		}

		if (visiBle) {
			this.visiBleRepositories = [...this.visiBleRepositories, repository];
		} else {
			const index = this.visiBleRepositories.indexOf(repository);

			if (index > -1) {
				this.visiBleRepositories = [
					...this.visiBleRepositories.slice(0, index),
					...this.visiBleRepositories.slice(index + 1)
				];
			}
		}
	}

	dispose(): void {
		this.disposaBles.dispose();
		this._onDidChangeRepositories.dispose();
		this._onDidSetVisiBleRepositories.dispose();
	}
}
