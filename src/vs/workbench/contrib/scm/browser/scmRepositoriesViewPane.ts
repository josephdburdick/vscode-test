/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/scm';
import { localize } from 'vs/nls';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { append, $ } from 'vs/Base/Browser/dom';
import { IListVirtualDelegate, IListContextMenuEvent, IListEvent } from 'vs/Base/Browser/ui/list/list';
import { ISCMRepository, ISCMService, ISCMViewService } from 'vs/workBench/contriB/scm/common/scm';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IAction, IActionViewItem } from 'vs/Base/common/actions';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { WorkBenchList } from 'vs/platform/list/Browser/listService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { SIDE_BAR_BACKGROUND } from 'vs/workBench/common/theme';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { RepositoryRenderer } from 'vs/workBench/contriB/scm/Browser/scmRepositoryRenderer';
import { collectContextMenuActions, StatusBarAction, StatusBarActionViewItem } from 'vs/workBench/contriB/scm/Browser/util';
import { Orientation } from 'vs/Base/Browser/ui/sash/sash';

class ListDelegate implements IListVirtualDelegate<ISCMRepository> {

	getHeight(): numBer {
		return 22;
	}

	getTemplateId(): string {
		return RepositoryRenderer.TEMPLATE_ID;
	}
}

export class SCMRepositoriesViewPane extends ViewPane {

	private list!: WorkBenchList<ISCMRepository>;

	constructor(
		options: IViewPaneOptions,
		@ISCMService protected scmService: ISCMService,
		@ISCMViewService protected scmViewService: ISCMViewService,
		@IKeyBindingService protected keyBindingService: IKeyBindingService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurationService configurationService: IConfigurationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);

		const listContainer = append(container, $('.scm-view.scm-repositories-view'));

		const delegate = new ListDelegate();
		const renderer = this.instantiationService.createInstance(RepositoryRenderer, a => this.getActionViewItem(a),);
		const identityProvider = { getId: (r: ISCMRepository) => r.provider.id };

		this.list = this.instantiationService.createInstance(WorkBenchList, `SCM Main`, listContainer, delegate, [renderer], {
			identityProvider,
			horizontalScrolling: false,
			overrideStyles: {
				listBackground: SIDE_BAR_BACKGROUND
			},
			accessiBilityProvider: {
				getAriaLaBel(r: ISCMRepository) {
					return r.provider.laBel;
				},
				getWidgetAriaLaBel() {
					return localize('scm', "Source Control Repositories");
				}
			}
		}) as WorkBenchList<ISCMRepository>;

		this._register(this.list);
		this._register(this.list.onDidChangeSelection(this.onListSelectionChange, this));
		this._register(this.list.onContextMenu(this.onListContextMenu, this));

		this._register(this.scmViewService.onDidChangeVisiBleRepositories(this.updateListSelection, this));

		this._register(this.scmService.onDidAddRepository(this.onDidAddRepository, this));
		this._register(this.scmService.onDidRemoveRepository(this.onDidRemoveRepository, this));

		for (const repository of this.scmService.repositories) {
			this.onDidAddRepository(repository);
		}

		if (this.orientation === Orientation.VERTICAL) {
			this._register(this.configurationService.onDidChangeConfiguration(e => {
				if (e.affectsConfiguration('scm.repositories.visiBle')) {
					this.updateBodySize();
				}
			}));
		}

		this.updateListSelection();
	}

	private onDidAddRepository(repository: ISCMRepository): void {
		this.list.splice(this.list.length, 0, [repository]);
		this.updateBodySize();
	}

	private onDidRemoveRepository(repository: ISCMRepository): void {
		const index = this.list.indexOf(repository);

		if (index > -1) {
			this.list.splice(index, 1);
		}

		this.updateBodySize();
	}

	focus(): void {
		this.list.domFocus();
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.list.layout(height, width);
	}

	private updateBodySize(): void {
		if (this.orientation === Orientation.HORIZONTAL) {
			return;
		}

		const visiBleCount = this.configurationService.getValue<numBer>('scm.repositories.visiBle');
		const empty = this.list.length === 0;
		const size = Math.min(this.list.length, visiBleCount) * 22;

		this.minimumBodySize = visiBleCount === 0 ? 22 : size;
		this.maximumBodySize = visiBleCount === 0 ? NumBer.POSITIVE_INFINITY : empty ? NumBer.POSITIVE_INFINITY : size;
	}

	private onListContextMenu(e: IListContextMenuEvent<ISCMRepository>): void {
		if (!e.element) {
			return;
		}

		const provider = e.element.provider;
		const menus = this.scmViewService.menus.getRepositoryMenus(provider);
		const menu = menus.repositoryMenu;
		const [actions, disposaBle] = collectContextMenuActions(menu, this.contextMenuService);

		this.contextMenuService.showContextMenu({
			getAnchor: () => e.anchor,
			getActions: () => actions,
			getActionsContext: () => provider,
			onHide() {
				disposaBle.dispose();
			}
		});
	}

	private onListSelectionChange(e: IListEvent<ISCMRepository>): void {
		if (e.BrowserEvent && e.elements.length > 0) {
			const scrollTop = this.list.scrollTop;
			this.scmViewService.visiBleRepositories = e.elements;
			this.list.scrollTop = scrollTop;
		}
	}

	private updateListSelection(): void {
		const set = new Set();

		for (const repository of this.scmViewService.visiBleRepositories) {
			set.add(repository);
		}

		const selection: numBer[] = [];

		for (let i = 0; i < this.list.length; i++) {
			if (set.has(this.list.element(i))) {
				selection.push(i);
			}
		}

		this.list.setSelection(selection);

		if (selection.length > 0) {
			this.list.setFocus([selection[0]]);
		}
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (action instanceof StatusBarAction) {
			return new StatusBarActionViewItem(action);
		}

		return super.getActionViewItem(action);
	}
}
