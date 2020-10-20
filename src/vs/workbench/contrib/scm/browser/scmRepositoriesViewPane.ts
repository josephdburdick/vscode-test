/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/scm';
import { locAlize } from 'vs/nls';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { Append, $ } from 'vs/bAse/browser/dom';
import { IListVirtuAlDelegAte, IListContextMenuEvent, IListEvent } from 'vs/bAse/browser/ui/list/list';
import { ISCMRepository, ISCMService, ISCMViewService } from 'vs/workbench/contrib/scm/common/scm';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IAction, IActionViewItem } from 'vs/bAse/common/Actions';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { WorkbenchList } from 'vs/plAtform/list/browser/listService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { RepositoryRenderer } from 'vs/workbench/contrib/scm/browser/scmRepositoryRenderer';
import { collectContextMenuActions, StAtusBArAction, StAtusBArActionViewItem } from 'vs/workbench/contrib/scm/browser/util';
import { OrientAtion } from 'vs/bAse/browser/ui/sAsh/sAsh';

clAss ListDelegAte implements IListVirtuAlDelegAte<ISCMRepository> {

	getHeight(): number {
		return 22;
	}

	getTemplAteId(): string {
		return RepositoryRenderer.TEMPLATE_ID;
	}
}

export clAss SCMRepositoriesViewPAne extends ViewPAne {

	privAte list!: WorkbenchList<ISCMRepository>;

	constructor(
		options: IViewPAneOptions,
		@ISCMService protected scmService: ISCMService,
		@ISCMViewService protected scmViewService: ISCMViewService,
		@IKeybindingService protected keybindingService: IKeybindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
	}

	protected renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);

		const listContAiner = Append(contAiner, $('.scm-view.scm-repositories-view'));

		const delegAte = new ListDelegAte();
		const renderer = this.instAntiAtionService.creAteInstAnce(RepositoryRenderer, A => this.getActionViewItem(A),);
		const identityProvider = { getId: (r: ISCMRepository) => r.provider.id };

		this.list = this.instAntiAtionService.creAteInstAnce(WorkbenchList, `SCM MAin`, listContAiner, delegAte, [renderer], {
			identityProvider,
			horizontAlScrolling: fAlse,
			overrideStyles: {
				listBAckground: SIDE_BAR_BACKGROUND
			},
			AccessibilityProvider: {
				getAriALAbel(r: ISCMRepository) {
					return r.provider.lAbel;
				},
				getWidgetAriALAbel() {
					return locAlize('scm', "Source Control Repositories");
				}
			}
		}) As WorkbenchList<ISCMRepository>;

		this._register(this.list);
		this._register(this.list.onDidChAngeSelection(this.onListSelectionChAnge, this));
		this._register(this.list.onContextMenu(this.onListContextMenu, this));

		this._register(this.scmViewService.onDidChAngeVisibleRepositories(this.updAteListSelection, this));

		this._register(this.scmService.onDidAddRepository(this.onDidAddRepository, this));
		this._register(this.scmService.onDidRemoveRepository(this.onDidRemoveRepository, this));

		for (const repository of this.scmService.repositories) {
			this.onDidAddRepository(repository);
		}

		if (this.orientAtion === OrientAtion.VERTICAL) {
			this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
				if (e.AffectsConfigurAtion('scm.repositories.visible')) {
					this.updAteBodySize();
				}
			}));
		}

		this.updAteListSelection();
	}

	privAte onDidAddRepository(repository: ISCMRepository): void {
		this.list.splice(this.list.length, 0, [repository]);
		this.updAteBodySize();
	}

	privAte onDidRemoveRepository(repository: ISCMRepository): void {
		const index = this.list.indexOf(repository);

		if (index > -1) {
			this.list.splice(index, 1);
		}

		this.updAteBodySize();
	}

	focus(): void {
		this.list.domFocus();
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.list.lAyout(height, width);
	}

	privAte updAteBodySize(): void {
		if (this.orientAtion === OrientAtion.HORIZONTAL) {
			return;
		}

		const visibleCount = this.configurAtionService.getVAlue<number>('scm.repositories.visible');
		const empty = this.list.length === 0;
		const size = MAth.min(this.list.length, visibleCount) * 22;

		this.minimumBodySize = visibleCount === 0 ? 22 : size;
		this.mAximumBodySize = visibleCount === 0 ? Number.POSITIVE_INFINITY : empty ? Number.POSITIVE_INFINITY : size;
	}

	privAte onListContextMenu(e: IListContextMenuEvent<ISCMRepository>): void {
		if (!e.element) {
			return;
		}

		const provider = e.element.provider;
		const menus = this.scmViewService.menus.getRepositoryMenus(provider);
		const menu = menus.repositoryMenu;
		const [Actions, disposAble] = collectContextMenuActions(menu, this.contextMenuService);

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.Anchor,
			getActions: () => Actions,
			getActionsContext: () => provider,
			onHide() {
				disposAble.dispose();
			}
		});
	}

	privAte onListSelectionChAnge(e: IListEvent<ISCMRepository>): void {
		if (e.browserEvent && e.elements.length > 0) {
			const scrollTop = this.list.scrollTop;
			this.scmViewService.visibleRepositories = e.elements;
			this.list.scrollTop = scrollTop;
		}
	}

	privAte updAteListSelection(): void {
		const set = new Set();

		for (const repository of this.scmViewService.visibleRepositories) {
			set.Add(repository);
		}

		const selection: number[] = [];

		for (let i = 0; i < this.list.length; i++) {
			if (set.hAs(this.list.element(i))) {
				selection.push(i);
			}
		}

		this.list.setSelection(selection);

		if (selection.length > 0) {
			this.list.setFocus([selection[0]]);
		}
	}

	getActionViewItem(Action: IAction): IActionViewItem | undefined {
		if (Action instAnceof StAtusBArAction) {
			return new StAtusBArActionViewItem(Action);
		}

		return super.getActionViewItem(Action);
	}
}
