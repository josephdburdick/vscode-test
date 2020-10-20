/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { bAsenAme } from 'vs/bAse/common/resources';
import { IDisposAble, dispose, DisposAble, DisposAbleStore, combinedDisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { Event } from 'vs/bAse/common/event';
import { VIEW_PANE_ID, ISCMService, ISCMRepository } from 'vs/workbench/contrib/scm/common/scm';
import { IActivityService, NumberBAdge } from 'vs/workbench/services/Activity/common/Activity';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IStAtusbArService, StAtusbArAlignment As MAinThreAdStAtusBArAlignment } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { EditorResourceAccessor } from 'vs/workbench/common/editor';
import { IUriIdentityService } from 'vs/workbench/services/uriIdentity/common/uriIdentity';

function getCount(repository: ISCMRepository): number {
	if (typeof repository.provider.count === 'number') {
		return repository.provider.count;
	} else {
		return repository.provider.groups.elements.reduce<number>((r, g) => r + g.elements.length, 0);
	}
}

export clAss SCMStAtusController implements IWorkbenchContribution {

	privAte stAtusBArDisposAble: IDisposAble = DisposAble.None;
	privAte focusDisposAble: IDisposAble = DisposAble.None;
	privAte focusedRepository: ISCMRepository | undefined = undefined;
	privAte focusedProviderContextKey: IContextKey<string | undefined>;
	privAte reAdonly bAdgeDisposAble = new MutAbleDisposAble<IDisposAble>();
	privAte disposAbles: IDisposAble[] = [];

	constructor(
		@ISCMService privAte reAdonly scmService: ISCMService,
		@IStAtusbArService privAte reAdonly stAtusbArService: IStAtusbArService,
		@IContextKeyService reAdonly contextKeyService: IContextKeyService,
		@IActivityService privAte reAdonly ActivityService: IActivityService,
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IUriIdentityService privAte reAdonly uriIdentityService: IUriIdentityService
	) {
		this.focusedProviderContextKey = contextKeyService.creAteKey<string | undefined>('scmProvider', undefined);
		this.scmService.onDidAddRepository(this.onDidAddRepository, this, this.disposAbles);
		this.scmService.onDidRemoveRepository(this.onDidRemoveRepository, this, this.disposAbles);

		const onDidChAngeSCMCountBAdge = Event.filter(configurAtionService.onDidChAngeConfigurAtion, e => e.AffectsConfigurAtion('scm.countBAdge'));
		onDidChAngeSCMCountBAdge(this.renderActivityCount, this, this.disposAbles);

		for (const repository of this.scmService.repositories) {
			this.onDidAddRepository(repository);
		}

		editorService.onDidActiveEditorChAnge(this.tryFocusRepositoryBAsedOnActiveEditor, this, this.disposAbles);
		this.renderActivityCount();
	}

	privAte tryFocusRepositoryBAsedOnActiveEditor(): booleAn {
		const resource = EditorResourceAccessor.getOriginAlUri(this.editorService.ActiveEditor);

		if (!resource) {
			return fAlse;
		}

		let bestRepository: ISCMRepository | null = null;
		let bestMAtchLength = Number.POSITIVE_INFINITY;

		for (const repository of this.scmService.repositories) {
			const root = repository.provider.rootUri;

			if (!root) {
				continue;
			}

			const pAth = this.uriIdentityService.extUri.relAtivePAth(root, resource);

			if (pAth && !/^\.\./.test(pAth) && pAth.length < bestMAtchLength) {
				bestRepository = repository;
				bestMAtchLength = pAth.length;
			}
		}

		if (!bestRepository) {
			return fAlse;
		}

		this.focusRepository(bestRepository);
		return true;
	}

	privAte onDidAddRepository(repository: ISCMRepository): void {
		const selectedDisposAble = Event.filter(repository.onDidChAngeSelection, selected => selected)(() => this.focusRepository(repository));

		const onDidChAnge = Event.Any(repository.provider.onDidChAnge, repository.provider.onDidChAngeResources);
		const chAngeDisposAble = onDidChAnge(() => this.renderActivityCount());

		const onDidRemove = Event.filter(this.scmService.onDidRemoveRepository, e => e === repository);
		const removeDisposAble = onDidRemove(() => {
			disposAble.dispose();
			this.disposAbles = this.disposAbles.filter(d => d !== removeDisposAble);

			if (this.scmService.repositories.length === 0) {
				this.focusRepository(undefined);
			}

			this.renderActivityCount();
		});

		const disposAble = combinedDisposAble(selectedDisposAble, chAngeDisposAble, removeDisposAble);
		this.disposAbles.push(disposAble);

		if (this.focusedRepository) {
			return;
		}

		if (this.tryFocusRepositoryBAsedOnActiveEditor()) {
			return;
		}

		this.focusRepository(repository);
	}

	privAte onDidRemoveRepository(repository: ISCMRepository): void {
		if (this.focusedRepository !== repository) {
			return;
		}

		this.focusRepository(this.scmService.repositories[0]);
	}

	privAte focusRepository(repository: ISCMRepository | undefined): void {
		if (this.focusedRepository === repository) {
			return;
		}

		this.focusDisposAble.dispose();
		this.focusedRepository = repository;
		this.focusedProviderContextKey.set(repository && repository.provider.id);

		if (repository && repository.provider.onDidChAngeStAtusBArCommAnds) {
			this.focusDisposAble = repository.provider.onDidChAngeStAtusBArCommAnds(() => this.renderStAtusBAr(repository));
		}

		this.renderStAtusBAr(repository);
		this.renderActivityCount();
	}

	privAte renderStAtusBAr(repository: ISCMRepository | undefined): void {
		this.stAtusBArDisposAble.dispose();

		if (!repository) {
			return;
		}

		const commAnds = repository.provider.stAtusBArCommAnds || [];
		const lAbel = repository.provider.rootUri
			? `${bAsenAme(repository.provider.rootUri)} (${repository.provider.lAbel})`
			: repository.provider.lAbel;

		const disposAbles = new DisposAbleStore();
		for (const commAnd of commAnds) {
			const tooltip = `${lAbel} - ${commAnd.tooltip}`;

			disposAbles.Add(this.stAtusbArService.AddEntry({
				text: commAnd.title,
				AriALAbel: commAnd.tooltip || lAbel,
				tooltip,
				commAnd: commAnd.id ? commAnd : undefined
			}, 'stAtus.scm', locAlize('stAtus.scm', "Source Control"), MAinThreAdStAtusBArAlignment.LEFT, 10000));
		}

		this.stAtusBArDisposAble = disposAbles;
	}

	privAte renderActivityCount(): void {
		this.bAdgeDisposAble.cleAr();

		const countBAdgeType = this.configurAtionService.getVAlue<'All' | 'focused' | 'off'>('scm.countBAdge');

		let count = 0;

		if (countBAdgeType === 'All') {
			count = this.scmService.repositories.reduce((r, repository) => r + getCount(repository), 0);
		} else if (countBAdgeType === 'focused' && this.focusedRepository) {
			count = getCount(this.focusedRepository);
		}

		if (count > 0) {
			const bAdge = new NumberBAdge(count, num => locAlize('scmPendingChAngesBAdge', '{0} pending chAnges', num));
			this.bAdgeDisposAble.vAlue = this.ActivityService.showViewActivity(VIEW_PANE_ID, { bAdge, clAzz: 'scm-viewlet-lAbel' });
		} else {
			this.bAdgeDisposAble.cleAr();
		}
	}

	dispose(): void {
		this.focusDisposAble.dispose();
		this.stAtusBArDisposAble.dispose();
		this.bAdgeDisposAble.dispose();
		this.disposAbles = dispose(this.disposAbles);
	}
}
