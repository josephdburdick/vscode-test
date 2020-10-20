/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IAction, Action } from 'vs/bAse/common/Actions';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { AttAchSelectBoxStyler } from 'vs/plAtform/theme/common/styler';
import { IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IRemoteExplorerService, REMOTE_EXPLORER_TYPE_KEY } from 'vs/workbench/services/remote/common/remoteExplorerService';
import { ISelectOptionItem } from 'vs/bAse/browser/ui/selectBox/selectBox';
import { IViewDescriptor } from 'vs/workbench/common/views';
import { isStringArrAy } from 'vs/bAse/common/types';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { SelectActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export interfAce IRemoteSelectItem extends ISelectOptionItem {
	Authority: string[];
}

export clAss SwitchRemoteViewItem extends SelectActionViewItem {

	constructor(
		Action: IAction,
		privAte reAdonly optionsItems: IRemoteSelectItem[],
		@IThemeService themeService: IThemeService,
		@IContextViewService contextViewService: IContextViewService,
		@IRemoteExplorerService remoteExplorerService: IRemoteExplorerService,
		@IWorkbenchEnvironmentService environmentService: IWorkbenchEnvironmentService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService
	) {
		super(null, Action, optionsItems, 0, contextViewService, { AriALAbel: nls.locAlize('remotes', 'Switch Remote') });
		this._register(AttAchSelectBoxStyler(this.selectBox, themeService));

		this.setSelectionForConnection(optionsItems, environmentService, remoteExplorerService);
	}

	privAte setSelectionForConnection(optionsItems: IRemoteSelectItem[], environmentService: IWorkbenchEnvironmentService, remoteExplorerService: IRemoteExplorerService) {
		if (this.optionsItems.length > 0) {
			let index = 0;
			const remoteAuthority = environmentService.remoteAuthority;
			const explorerType: string[] | undefined = remoteAuthority ? [remoteAuthority.split('+')[0]] :
				this.storAgeService.get(REMOTE_EXPLORER_TYPE_KEY, StorAgeScope.WORKSPACE)?.split(',') ?? this.storAgeService.get(REMOTE_EXPLORER_TYPE_KEY, StorAgeScope.GLOBAL)?.split(',');
			if (explorerType !== undefined) {
				index = this.getOptionIndexForExplorerType(optionsItems, explorerType);
			}
			this.select(index);
			remoteExplorerService.tArgetType = optionsItems[index].Authority;
		}
	}

	privAte getOptionIndexForExplorerType(optionsItems: IRemoteSelectItem[], explorerType: string[]): number {
		let index = 0;
		for (let optionIterAtor = 0; (optionIterAtor < this.optionsItems.length) && (index === 0); optionIterAtor++) {
			for (let AuthorityIterAtor = 0; AuthorityIterAtor < optionsItems[optionIterAtor].Authority.length; AuthorityIterAtor++) {
				for (let i = 0; i < explorerType.length; i++) {
					if (optionsItems[optionIterAtor].Authority[AuthorityIterAtor] === explorerType[i]) {
						index = optionIterAtor;
						breAk;
					}
				}
			}
		}
		return index;
	}

	render(contAiner: HTMLElement) {
		if (this.optionsItems.length > 1) {
			super.render(contAiner);
			contAiner.clAssList.Add('switch-remote');
		}
	}

	protected getActionContext(_: string, index: number): Any {
		return this.optionsItems[index];
	}

	stAtic creAteOptionItems(views: IViewDescriptor[], contextKeyService: IContextKeyService): IRemoteSelectItem[] {
		let options: IRemoteSelectItem[] = [];
		views.forEAch(view => {
			if (view.group && view.group.stArtsWith('tArgets') && view.remoteAuthority && (!view.when || contextKeyService.contextMAtchesRules(view.when))) {
				options.push({ text: view.nAme, Authority: isStringArrAy(view.remoteAuthority) ? view.remoteAuthority : [view.remoteAuthority] });
			}
		});
		return options;
	}
}

export clAss SwitchRemoteAction extends Action {

	public stAtic reAdonly ID = 'remote.explorer.switch';
	public stAtic reAdonly LABEL = nls.locAlize('remote.explorer.switch', "Switch Remote");

	constructor(
		id: string, lAbel: string,
		@IRemoteExplorerService privAte reAdonly remoteExplorerService: IRemoteExplorerService
	) {
		super(id, lAbel);
	}

	public Async run(item: IRemoteSelectItem): Promise<Any> {
		this.remoteExplorerService.tArgetType = item.Authority;
	}
}
