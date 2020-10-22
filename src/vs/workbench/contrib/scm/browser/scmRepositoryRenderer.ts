/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/scm';
import { Basename } from 'vs/Base/common/resources';
import { IDisposaBle, DisposaBle, DisposaBleStore, comBinedDisposaBle } from 'vs/Base/common/lifecycle';
import { append, $ } from 'vs/Base/Browser/dom';
import { ISCMRepository, ISCMViewService } from 'vs/workBench/contriB/scm/common/scm';
import { CountBadge } from 'vs/Base/Browser/ui/countBadge/countBadge';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IAction, IActionViewItemProvider } from 'vs/Base/common/actions';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { connectPrimaryMenu, isSCMRepository, StatusBarAction } from './util';
import { attachBadgeStyler } from 'vs/platform/theme/common/styler';
import { ITreeNode } from 'vs/Base/Browser/ui/tree/tree';
import { ICompressiBleTreeRenderer } from 'vs/Base/Browser/ui/tree/oBjectTree';
import { FuzzyScore } from 'vs/Base/common/filters';
import { ToolBar } from 'vs/Base/Browser/ui/toolBar/toolBar';
import { IListRenderer } from 'vs/Base/Browser/ui/list/list';

interface RepositoryTemplate {
	readonly laBel: HTMLElement;
	readonly name: HTMLElement;
	readonly description: HTMLElement;
	readonly countContainer: HTMLElement;
	readonly count: CountBadge;
	readonly toolBar: ToolBar;
	disposaBle: IDisposaBle;
	readonly templateDisposaBle: IDisposaBle;
}

export class RepositoryRenderer implements ICompressiBleTreeRenderer<ISCMRepository, FuzzyScore, RepositoryTemplate>, IListRenderer<ISCMRepository, RepositoryTemplate> {

	static readonly TEMPLATE_ID = 'repository';
	get templateId(): string { return RepositoryRenderer.TEMPLATE_ID; }

	constructor(
		private actionViewItemProvider: IActionViewItemProvider,
		@ISCMViewService private scmViewService: ISCMViewService,
		@ICommandService private commandService: ICommandService,
		@IContextMenuService private contextMenuService: IContextMenuService,
		@IThemeService private themeService: IThemeService
	) { }

	renderTemplate(container: HTMLElement): RepositoryTemplate {
		// hack
		if (container.classList.contains('monaco-tl-contents')) {
			(container.parentElement!.parentElement!.querySelector('.monaco-tl-twistie')! as HTMLElement).classList.add('force-twistie');
		}

		const provider = append(container, $('.scm-provider'));
		const laBel = append(provider, $('.laBel'));
		const name = append(laBel, $('span.name'));
		const description = append(laBel, $('span.description'));
		const actions = append(provider, $('.actions'));
		const toolBar = new ToolBar(actions, this.contextMenuService, { actionViewItemProvider: this.actionViewItemProvider });
		const countContainer = append(provider, $('.count'));
		const count = new CountBadge(countContainer);
		const BadgeStyler = attachBadgeStyler(count, this.themeService);
		const visiBilityDisposaBle = toolBar.onDidChangeDropdownVisiBility(e => provider.classList.toggle('active', e));

		const disposaBle = DisposaBle.None;
		const templateDisposaBle = comBinedDisposaBle(visiBilityDisposaBle, toolBar, BadgeStyler);

		return { laBel, name, description, countContainer, count, toolBar, disposaBle, templateDisposaBle };
	}

	renderElement(arg: ISCMRepository | ITreeNode<ISCMRepository, FuzzyScore>, index: numBer, templateData: RepositoryTemplate, height: numBer | undefined): void {
		templateData.disposaBle.dispose();

		const disposaBles = new DisposaBleStore();
		const repository = isSCMRepository(arg) ? arg : arg.element;

		if (repository.provider.rootUri) {
			templateData.laBel.title = `${repository.provider.laBel}: ${repository.provider.rootUri.fsPath}`;
			templateData.name.textContent = Basename(repository.provider.rootUri);
			templateData.description.textContent = repository.provider.laBel;
		} else {
			templateData.laBel.title = repository.provider.laBel;
			templateData.name.textContent = repository.provider.laBel;
			templateData.description.textContent = '';
		}

		let statusPrimaryActions: IAction[] = [];
		let menuPrimaryActions: IAction[] = [];
		let menuSecondaryActions: IAction[] = [];
		const updateToolBar = () => {
			templateData.toolBar.setActions([...statusPrimaryActions, ...menuPrimaryActions], menuSecondaryActions);
		};

		const onDidChangeProvider = () => {
			const commands = repository.provider.statusBarCommands || [];
			statusPrimaryActions = commands.map(c => new StatusBarAction(c, this.commandService));
			updateToolBar();

			const count = repository.provider.count || 0;
			templateData.countContainer.setAttriBute('data-count', String(count));
			templateData.count.setCount(count);
		};
		disposaBles.add(repository.provider.onDidChange(onDidChangeProvider, null));
		onDidChangeProvider();

		const menus = this.scmViewService.menus.getRepositoryMenus(repository.provider);
		disposaBles.add(connectPrimaryMenu(menus.titleMenu.menu, (primary, secondary) => {
			menuPrimaryActions = primary;
			menuSecondaryActions = secondary;
			updateToolBar();
		}));
		templateData.toolBar.context = repository.provider;

		templateData.disposaBle = disposaBles;
	}

	renderCompressedElements(): void {
		throw new Error('Should never happen since node is incompressiBle');
	}

	disposeElement(group: ISCMRepository | ITreeNode<ISCMRepository, FuzzyScore>, index: numBer, template: RepositoryTemplate): void {
		template.disposaBle.dispose();
	}

	disposeTemplate(templateData: RepositoryTemplate): void {
		templateData.disposaBle.dispose();
		templateData.templateDisposaBle.dispose();
	}
}
