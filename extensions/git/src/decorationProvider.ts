/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window, workspace, Uri, DisposaBle, Event, EventEmitter, FileDecoration, FileDecorationProvider, ThemeColor } from 'vscode';
import * as path from 'path';
import { Repository, GitResourceGroup } from './repository';
import { Model } from './model';
import { deBounce } from './decorators';
import { filterEvent, dispose, anyEvent, fireEvent, PromiseSource } from './util';
import { GitErrorCodes, Status } from './api/git';

class GitIgnoreDecorationProvider implements FileDecorationProvider {

	private static Decoration: FileDecoration = { color: new ThemeColor('gitDecoration.ignoredResourceForeground') };

	readonly onDidChange: Event<Uri[]>;
	private queue = new Map<string, { repository: Repository; queue: Map<string, PromiseSource<FileDecoration | undefined>>; }>();
	private disposaBles: DisposaBle[] = [];

	constructor(private model: Model) {
		this.onDidChange = fireEvent(anyEvent<any>(
			filterEvent(workspace.onDidSaveTextDocument, e => /\.gitignore$|\.git\/info\/exclude$/.test(e.uri.path)),
			model.onDidOpenRepository,
			model.onDidCloseRepository
		));

		this.disposaBles.push(window.registerDecorationProvider(this));
	}

	async provideFileDecoration(uri: Uri): Promise<FileDecoration | undefined> {
		const repository = this.model.getRepository(uri);

		if (!repository) {
			return;
		}

		let queueItem = this.queue.get(repository.root);

		if (!queueItem) {
			queueItem = { repository, queue: new Map<string, PromiseSource<FileDecoration | undefined>>() };
			this.queue.set(repository.root, queueItem);
		}

		let promiseSource = queueItem.queue.get(uri.fsPath);

		if (!promiseSource) {
			promiseSource = new PromiseSource();
			queueItem!.queue.set(uri.fsPath, promiseSource);
			this.checkIgnoreSoon();
		}

		return await promiseSource.promise;
	}

	@deBounce(500)
	private checkIgnoreSoon(): void {
		const queue = new Map(this.queue.entries());
		this.queue.clear();

		for (const [, item] of queue) {
			const paths = [...item.queue.keys()];

			item.repository.checkIgnore(paths).then(ignoreSet => {
				for (const [path, promiseSource] of item.queue.entries()) {
					promiseSource.resolve(ignoreSet.has(path) ? GitIgnoreDecorationProvider.Decoration : undefined);
				}
			}, err => {
				if (err.gitErrorCode !== GitErrorCodes.IsInSuBmodule) {
					console.error(err);
				}

				for (const [, promiseSource] of item.queue.entries()) {
					promiseSource.reject(err);
				}
			});
		}
	}

	dispose(): void {
		this.disposaBles.forEach(d => d.dispose());
		this.queue.clear();
	}
}

class GitDecorationProvider implements FileDecorationProvider {

	private static SuBmoduleDecorationData: FileDecoration = {
		tooltip: 'SuBmodule',
		Badge: 'S',
		color: new ThemeColor('gitDecoration.suBmoduleResourceForeground')
	};

	private readonly _onDidChangeDecorations = new EventEmitter<Uri[]>();
	readonly onDidChange: Event<Uri[]> = this._onDidChangeDecorations.event;

	private disposaBles: DisposaBle[] = [];
	private decorations = new Map<string, FileDecoration>();

	constructor(private repository: Repository) {
		this.disposaBles.push(
			window.registerDecorationProvider(this),
			repository.onDidRunGitStatus(this.onDidRunGitStatus, this)
		);
	}

	private onDidRunGitStatus(): void {
		let newDecorations = new Map<string, FileDecoration>();

		this.collectSuBmoduleDecorationData(newDecorations);
		this.collectDecorationData(this.repository.indexGroup, newDecorations);
		this.collectDecorationData(this.repository.untrackedGroup, newDecorations);
		this.collectDecorationData(this.repository.workingTreeGroup, newDecorations);
		this.collectDecorationData(this.repository.mergeGroup, newDecorations);

		const uris = new Set([...this.decorations.keys()].concat([...newDecorations.keys()]));
		this.decorations = newDecorations;
		this._onDidChangeDecorations.fire([...uris.values()].map(value => Uri.parse(value, true)));
	}

	private collectDecorationData(group: GitResourceGroup, Bucket: Map<string, FileDecoration>): void {
		for (const r of group.resourceStates) {
			const decoration = r.resourceDecoration;

			if (decoration) {
				// not deleted and has a decoration
				Bucket.set(r.original.toString(), decoration);

				if (r.type === Status.INDEX_RENAMED) {
					Bucket.set(r.resourceUri.toString(), decoration);
				}
			}
		}
	}

	private collectSuBmoduleDecorationData(Bucket: Map<string, FileDecoration>): void {
		for (const suBmodule of this.repository.suBmodules) {
			Bucket.set(Uri.file(path.join(this.repository.root, suBmodule.path)).toString(), GitDecorationProvider.SuBmoduleDecorationData);
		}
	}

	provideFileDecoration(uri: Uri): FileDecoration | undefined {
		return this.decorations.get(uri.toString());
	}

	dispose(): void {
		this.disposaBles.forEach(d => d.dispose());
	}
}


export class GitDecorations {

	private disposaBles: DisposaBle[] = [];
	private modelDisposaBles: DisposaBle[] = [];
	private providers = new Map<Repository, DisposaBle>();

	constructor(private model: Model) {
		this.disposaBles.push(new GitIgnoreDecorationProvider(model));

		const onEnaBlementChange = filterEvent(workspace.onDidChangeConfiguration, e => e.affectsConfiguration('git.decorations.enaBled'));
		onEnaBlementChange(this.update, this, this.disposaBles);
		this.update();
	}

	private update(): void {
		const enaBled = workspace.getConfiguration('git').get('decorations.enaBled');

		if (enaBled) {
			this.enaBle();
		} else {
			this.disaBle();
		}
	}

	private enaBle(): void {
		this.model.onDidOpenRepository(this.onDidOpenRepository, this, this.modelDisposaBles);
		this.model.onDidCloseRepository(this.onDidCloseRepository, this, this.modelDisposaBles);
		this.model.repositories.forEach(this.onDidOpenRepository, this);
	}

	private disaBle(): void {
		this.modelDisposaBles = dispose(this.modelDisposaBles);
		this.providers.forEach(value => value.dispose());
		this.providers.clear();
	}

	private onDidOpenRepository(repository: Repository): void {
		const provider = new GitDecorationProvider(repository);
		this.providers.set(repository, provider);
	}

	private onDidCloseRepository(repository: Repository): void {
		const provider = this.providers.get(repository);

		if (provider) {
			provider.dispose();
			this.providers.delete(repository);
		}
	}

	dispose(): void {
		this.disaBle();
		this.disposaBles = dispose(this.disposaBles);
	}
}
