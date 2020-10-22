/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Basename } from 'vs/Base/common/resources';
import { IDisposaBle, dispose, DisposaBle, DisposaBleStore, comBinedDisposaBle, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { Event } from 'vs/Base/common/event';
import { VIEW_PANE_ID, ISCMService, ISCMRepository } from 'vs/workBench/contriB/scm/common/scm';
import { IActivityService, NumBerBadge } from 'vs/workBench/services/activity/common/activity';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IStatusBarService, StatusBarAlignment as MainThreadStatusBarAlignment } from 'vs/workBench/services/statusBar/common/statusBar';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { EditorResourceAccessor } from 'vs/workBench/common/editor';
import { IUriIdentityService } from 'vs/workBench/services/uriIdentity/common/uriIdentity';

function getCount(repository: ISCMRepository): numBer {
	if (typeof repository.provider.count === 'numBer') {
		return repository.provider.count;
	} else {
		return repository.provider.groups.elements.reduce<numBer>((r, g) => r + g.elements.length, 0);
	}
}

export class SCMStatusController implements IWorkBenchContriBution {

	private statusBarDisposaBle: IDisposaBle = DisposaBle.None;
	private focusDisposaBle: IDisposaBle = DisposaBle.None;
	private focusedRepository: ISCMRepository | undefined = undefined;
	private focusedProviderContextKey: IContextKey<string | undefined>;
	private readonly BadgeDisposaBle = new MutaBleDisposaBle<IDisposaBle>();
	private disposaBles: IDisposaBle[] = [];

	constructor(
		@ISCMService private readonly scmService: ISCMService,
		@IStatusBarService private readonly statusBarService: IStatusBarService,
		@IContextKeyService readonly contextKeyService: IContextKeyService,
		@IActivityService private readonly activityService: IActivityService,
		@IEditorService private readonly editorService: IEditorService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IUriIdentityService private readonly uriIdentityService: IUriIdentityService
	) {
		this.focusedProviderContextKey = contextKeyService.createKey<string | undefined>('scmProvider', undefined);
		this.scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposaBles);
		this.scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposaBles);

		const onDidChangeSCMCountBadge = Event.filter(configurationService.onDidChangeConfiguration, e => e.affectsConfiguration('scm.countBadge'));
		onDidChangeSCMCountBadge(this.renderActivityCount, this, this.disposaBles);

		for (const repository of this.scmService.repositories) {
			this.onDidAddRepository(repository);
		}

		editorService.onDidActiveEditorChange(this.tryFocusRepositoryBasedOnActiveEditor, this, this.disposaBles);
		this.renderActivityCount();
	}

	private tryFocusRepositoryBasedOnActiveEditor(): Boolean {
		const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor);

		if (!resource) {
			return false;
		}

		let BestRepository: ISCMRepository | null = null;
		let BestMatchLength = NumBer.POSITIVE_INFINITY;

		for (const repository of this.scmService.repositories) {
			const root = repository.provider.rootUri;

			if (!root) {
				continue;
			}

			const path = this.uriIdentityService.extUri.relativePath(root, resource);

			if (path && !/^\.\./.test(path) && path.length < BestMatchLength) {
				BestRepository = repository;
				BestMatchLength = path.length;
			}
		}

		if (!BestRepository) {
			return false;
		}

		this.focusRepository(BestRepository);
		return true;
	}

	private onDidAddRepository(repository: ISCMRepository): void {
		const selectedDisposaBle = Event.filter(repository.onDidChangeSelection, selected => selected)(() => this.focusRepository(repository));

		const onDidChange = Event.any(repository.provider.onDidChange, repository.provider.onDidChangeResources);
		const changeDisposaBle = onDidChange(() => this.renderActivityCount());

		const onDidRemove = Event.filter(this.scmService.onDidRemoveRepository, e => e === repository);
		const removeDisposaBle = onDidRemove(() => {
			disposaBle.dispose();
			this.disposaBles = this.disposaBles.filter(d => d !== removeDisposaBle);

			if (this.scmService.repositories.length === 0) {
				this.focusRepository(undefined);
			}

			this.renderActivityCount();
		});

		const disposaBle = comBinedDisposaBle(selectedDisposaBle, changeDisposaBle, removeDisposaBle);
		this.disposaBles.push(disposaBle);

		if (this.focusedRepository) {
			return;
		}

		if (this.tryFocusRepositoryBasedOnActiveEditor()) {
			return;
		}

		this.focusRepository(repository);
	}

	private onDidRemoveRepository(repository: ISCMRepository): void {
		if (this.focusedRepository !== repository) {
			return;
		}

		this.focusRepository(this.scmService.repositories[0]);
	}

	private focusRepository(repository: ISCMRepository | undefined): void {
		if (this.focusedRepository === repository) {
			return;
		}

		this.focusDisposaBle.dispose();
		this.focusedRepository = repository;
		this.focusedProviderContextKey.set(repository && repository.provider.id);

		if (repository && repository.provider.onDidChangeStatusBarCommands) {
			this.focusDisposaBle = repository.provider.onDidChangeStatusBarCommands(() => this.renderStatusBar(repository));
		}

		this.renderStatusBar(repository);
		this.renderActivityCount();
	}

	private renderStatusBar(repository: ISCMRepository | undefined): void {
		this.statusBarDisposaBle.dispose();

		if (!repository) {
			return;
		}

		const commands = repository.provider.statusBarCommands || [];
		const laBel = repository.provider.rootUri
			? `${Basename(repository.provider.rootUri)} (${repository.provider.laBel})`
			: repository.provider.laBel;

		const disposaBles = new DisposaBleStore();
		for (const command of commands) {
			const tooltip = `${laBel} - ${command.tooltip}`;

			disposaBles.add(this.statusBarService.addEntry({
				text: command.title,
				ariaLaBel: command.tooltip || laBel,
				tooltip,
				command: command.id ? command : undefined
			}, 'status.scm', localize('status.scm', "Source Control"), MainThreadStatusBarAlignment.LEFT, 10000));
		}

		this.statusBarDisposaBle = disposaBles;
	}

	private renderActivityCount(): void {
		this.BadgeDisposaBle.clear();

		const countBadgeType = this.configurationService.getValue<'all' | 'focused' | 'off'>('scm.countBadge');

		let count = 0;

		if (countBadgeType === 'all') {
			count = this.scmService.repositories.reduce((r, repository) => r + getCount(repository), 0);
		} else if (countBadgeType === 'focused' && this.focusedRepository) {
			count = getCount(this.focusedRepository);
		}

		if (count > 0) {
			const Badge = new NumBerBadge(count, num => localize('scmPendingChangesBadge', '{0} pending changes', num));
			this.BadgeDisposaBle.value = this.activityService.showViewActivity(VIEW_PANE_ID, { Badge, clazz: 'scm-viewlet-laBel' });
		} else {
			this.BadgeDisposaBle.clear();
		}
	}

	dispose(): void {
		this.focusDisposaBle.dispose();
		this.statusBarDisposaBle.dispose();
		this.BadgeDisposaBle.dispose();
		this.disposaBles = dispose(this.disposaBles);
	}
}
