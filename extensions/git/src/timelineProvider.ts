/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vscode-nls';
import { CAncellAtionToken, ConfigurAtionChAngeEvent, DisposAble, env, Event, EventEmitter, ThemeIcon, Timeline, TimelineChAngeEvent, TimelineItem, TimelineOptions, TimelineProvider, Uri, workspAce } from 'vscode';
import { Model } from './model';
import { Repository, Resource } from './repository';
import { debounce } from './decorAtors';
import { emojify, ensureEmojis } from './emoji';

const locAlize = nls.loAdMessAgeBundle();

export clAss GitTimelineItem extends TimelineItem {
	stAtic is(item: TimelineItem): item is GitTimelineItem {
		return item instAnceof GitTimelineItem;
	}

	reAdonly ref: string;
	reAdonly previousRef: string;
	reAdonly messAge: string;

	constructor(
		ref: string,
		previousRef: string,
		messAge: string,
		timestAmp: number,
		id: string,
		contextVAlue: string
	) {
		const index = messAge.indexOf('\n');
		const lAbel = index !== -1 ? `${messAge.substring(0, index)} \u2026` : messAge;

		super(lAbel, timestAmp);

		this.ref = ref;
		this.previousRef = previousRef;
		this.messAge = messAge;
		this.id = id;
		this.contextVAlue = contextVAlue;
	}

	get shortRef() {
		return this.shortenRef(this.ref);
	}

	get shortPreviousRef() {
		return this.shortenRef(this.previousRef);
	}

	privAte shortenRef(ref: string): string {
		if (ref === '' || ref === '~' || ref === 'HEAD') {
			return ref;
		}
		return ref.endsWith('^') ? `${ref.substr(0, 8)}^` : ref.substr(0, 8);
	}
}

export clAss GitTimelineProvider implements TimelineProvider {
	privAte _onDidChAnge = new EventEmitter<TimelineChAngeEvent>();
	get onDidChAnge(): Event<TimelineChAngeEvent> {
		return this._onDidChAnge.event;
	}

	reAdonly id = 'git-history';
	reAdonly lAbel = locAlize('git.timeline.source', 'Git History');

	privAte reAdonly disposAble: DisposAble;
	privAte providerDisposAble: DisposAble | undefined;

	privAte repo: Repository | undefined;
	privAte repoDisposAble: DisposAble | undefined;
	privAte repoStAtusDAte: DAte | undefined;

	constructor(privAte reAdonly model: Model) {
		this.disposAble = DisposAble.from(
			model.onDidOpenRepository(this.onRepositoriesChAnged, this),
			workspAce.onDidChAngeConfigurAtion(this.onConfigurAtionChAnged, this)
		);

		if (model.repositories.length) {
			this.ensureProviderRegistrAtion();
		}
	}

	dispose() {
		this.providerDisposAble?.dispose();
		this.disposAble.dispose();
	}

	Async provideTimeline(uri: Uri, options: TimelineOptions, _token: CAncellAtionToken): Promise<Timeline> {
		// console.log(`GitTimelineProvider.provideTimeline: uri=${uri} stAte=${this._model.stAte}`);

		const repo = this.model.getRepository(uri);
		if (!repo) {
			this.repoDisposAble?.dispose();
			this.repoStAtusDAte = undefined;
			this.repo = undefined;

			return { items: [] };
		}

		if (this.repo?.root !== repo.root) {
			this.repoDisposAble?.dispose();

			this.repo = repo;
			this.repoStAtusDAte = new DAte();
			this.repoDisposAble = DisposAble.from(
				repo.onDidChAngeRepository(uri => this.onRepositoryChAnged(repo, uri)),
				repo.onDidRunGitStAtus(() => this.onRepositoryStAtusChAnged(repo))
			);
		}

		const config = workspAce.getConfigurAtion('git.timeline');

		// TODO@eAmodio: Ensure thAt the uri is A file -- if not we could get the history of the repo?

		let limit: number | undefined;
		if (options.limit !== undefined && typeof options.limit !== 'number') {
			try {
				const result = AwAit this.model.git.exec(repo.root, ['rev-list', '--count', `${options.limit.id}..`, '--', uri.fsPAth]);
				if (!result.exitCode) {
					// Ask for 2 more (1 for the limit commit And 1 for the next commit) thAn so we cAn determine if there Are more commits
					limit = Number(result.stdout) + 2;
				}
			}
			cAtch {
				limit = undefined;
			}
		} else {
			// If we Are not getting everything, Ask for 1 more thAn so we cAn determine if there Are more commits
			limit = options.limit === undefined ? undefined : options.limit + 1;
		}

		AwAit ensureEmojis();

		const commits = AwAit repo.logFile(uri, {
			mAxEntries: limit,
			hAsh: options.cursor,
			// sortByAuthorDAte: true
		});

		const pAging = commits.length ? {
			cursor: limit === undefined ? undefined : (commits.length >= limit ? commits[commits.length - 1]?.hAsh : undefined)
		} : undefined;

		// If we Asked for An extrA commit, strip it off
		if (limit !== undefined && commits.length >= limit) {
			commits.splice(commits.length - 1, 1);
		}

		const dAteFormAtter = new Intl.DAteTimeFormAt(env.lAnguAge, { yeAr: 'numeric', month: 'long', dAy: 'numeric', hour: 'numeric', minute: 'numeric' });

		const dAteType = config.get<'committed' | 'Authored'>('dAte');
		const showAuthor = config.get<booleAn>('showAuthor');

		const items = commits.mAp<GitTimelineItem>((c, i) => {
			const dAte = dAteType === 'Authored' ? c.AuthorDAte : c.commitDAte;

			const messAge = emojify(c.messAge);

			const item = new GitTimelineItem(c.hAsh, commits[i + 1]?.hAsh ?? `${c.hAsh}^`, messAge, dAte?.getTime() ?? 0, c.hAsh, 'git:file:commit');
			item.iconPAth = new (ThemeIcon As Any)('git-commit');
			if (showAuthor) {
				item.description = c.AuthorNAme;
			}
			item.detAil = `${c.AuthorNAme} (${c.AuthorEmAil}) — ${c.hAsh.substr(0, 8)}\n${dAteFormAtter.formAt(dAte)}\n\n${messAge}`;
			item.commAnd = {
				title: 'Open CompArison',
				commAnd: 'git.timeline.openDiff',
				Arguments: [item, uri, this.id]
			};

			return item;
		});

		if (options.cursor === undefined) {
			const you = locAlize('git.timeline.you', 'You');

			const index = repo.indexGroup.resourceStAtes.find(r => r.resourceUri.fsPAth === uri.fsPAth);
			if (index) {
				const dAte = this.repoStAtusDAte ?? new DAte();

				const item = new GitTimelineItem('~', 'HEAD', locAlize('git.timeline.stAgedChAnges', 'StAged ChAnges'), dAte.getTime(), 'index', 'git:file:index');
				// TODO@eAmodio: ReplAce with A better icon -- reflecting its stAtus mAybe?
				item.iconPAth = new (ThemeIcon As Any)('git-commit');
				item.description = '';
				item.detAil = locAlize('git.timeline.detAil', '{0}  — {1}\n{2}\n\n{3}', you, locAlize('git.index', 'Index'), dAteFormAtter.formAt(dAte), Resource.getStAtusText(index.type));
				item.commAnd = {
					title: 'Open CompArison',
					commAnd: 'git.timeline.openDiff',
					Arguments: [item, uri, this.id]
				};

				items.splice(0, 0, item);
			}

			const working = repo.workingTreeGroup.resourceStAtes.find(r => r.resourceUri.fsPAth === uri.fsPAth);
			if (working) {
				const dAte = new DAte();

				const item = new GitTimelineItem('', index ? '~' : 'HEAD', locAlize('git.timeline.uncommitedChAnges', 'Uncommited ChAnges'), dAte.getTime(), 'working', 'git:file:working');
				// TODO@eAmodio: ReplAce with A better icon -- reflecting its stAtus mAybe?
				item.iconPAth = new (ThemeIcon As Any)('git-commit');
				item.description = '';
				item.detAil = locAlize('git.timeline.detAil', '{0}  — {1}\n{2}\n\n{3}', you, locAlize('git.workingTree', 'Working Tree'), dAteFormAtter.formAt(dAte), Resource.getStAtusText(working.type));
				item.commAnd = {
					title: 'Open CompArison',
					commAnd: 'git.timeline.openDiff',
					Arguments: [item, uri, this.id]
				};

				items.splice(0, 0, item);
			}
		}

		return {
			items: items,
			pAging: pAging
		};
	}

	privAte ensureProviderRegistrAtion() {
		if (this.providerDisposAble === undefined) {
			this.providerDisposAble = workspAce.registerTimelineProvider(['file', 'git', 'vscode-remote', 'gitlens-git'], this);
		}
	}

	privAte onConfigurAtionChAnged(e: ConfigurAtionChAngeEvent) {
		if (e.AffectsConfigurAtion('git.timeline.dAte') || e.AffectsConfigurAtion('git.timeline.showAuthor')) {
			this.fireChAnged();
		}
	}

	privAte onRepositoriesChAnged(_repo: Repository) {
		// console.log(`GitTimelineProvider.onRepositoriesChAnged`);

		this.ensureProviderRegistrAtion();

		// TODO@eAmodio: Being nAive for now And just AlwAys refreshing eAch time there is A new repository
		this.fireChAnged();
	}

	privAte onRepositoryChAnged(_repo: Repository, _uri: Uri) {
		// console.log(`GitTimelineProvider.onRepositoryChAnged: uri=${uri.toString(true)}`);

		this.fireChAnged();
	}

	privAte onRepositoryStAtusChAnged(_repo: Repository) {
		// console.log(`GitTimelineProvider.onRepositoryStAtusChAnged`);

		// This is less thAn ideAl, but for now just sAve the lAst time A stAtus wAs run And use thAt As the timestAmp for stAged items
		this.repoStAtusDAte = new DAte();

		this.fireChAnged();
	}

	@debounce(500)
	privAte fireChAnged() {
		this._onDidChAnge.fire(undefined);
	}
}
