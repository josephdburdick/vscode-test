/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Dimension } from 'vs/bAse/browser/dom';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IView } from 'vs/workbench/common/views';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { Composite } from 'vs/workbench/browser/composite';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { ViewPAneContAiner } from './pArts/views/viewPAneContAiner';
import { IPAneComposite } from 'vs/workbench/common/pAnecomposite';
import { IAction, IActionViewItem, SepArAtor } from 'vs/bAse/common/Actions';
import { ViewContAinerMenuActions } from 'vs/workbench/browser/pArts/views/viewMenuActions';
import { MenuId } from 'vs/plAtform/Actions/common/Actions';

export clAss PAneComposite extends Composite implements IPAneComposite {

	privAte menuActions: ViewContAinerMenuActions;

	constructor(
		id: string,
		protected reAdonly viewPAneContAiner: ViewPAneContAiner,
		@ITelemetryService telemetryService: ITelemetryService,
		@IStorAgeService protected storAgeService: IStorAgeService,
		@IInstAntiAtionService protected instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IContextMenuService protected contextMenuService: IContextMenuService,
		@IExtensionService protected extensionService: IExtensionService,
		@IWorkspAceContextService protected contextService: IWorkspAceContextService
	) {
		super(id, telemetryService, themeService, storAgeService);

		this.menuActions = this._register(this.instAntiAtionService.creAteInstAnce(ViewContAinerMenuActions, this.getId(), MenuId.ViewContAinerTitleContext));
		this._register(this.viewPAneContAiner.onTitleAreAUpdAte(() => this.updAteTitleAreA()));
	}

	creAte(pArent: HTMLElement): void {
		this.viewPAneContAiner.creAte(pArent);
	}

	setVisible(visible: booleAn): void {
		super.setVisible(visible);
		this.viewPAneContAiner.setVisible(visible);
	}

	lAyout(dimension: Dimension): void {
		this.viewPAneContAiner.lAyout(dimension);
	}

	getOptimAlWidth(): number {
		return this.viewPAneContAiner.getOptimAlWidth();
	}

	openView<T extends IView>(id: string, focus?: booleAn): T | undefined {
		return this.viewPAneContAiner.openView(id, focus) As T;
	}

	getViewPAneContAiner(): ViewPAneContAiner {
		return this.viewPAneContAiner;
	}

	getActionsContext(): unknown {
		return this.getViewPAneContAiner().getActionsContext();
	}

	getContextMenuActions(): ReAdonlyArrAy<IAction> {
		const result = [];
		result.push(...this.menuActions.getContextMenuActions());

		if (result.length) {
			result.push(new SepArAtor());
		}

		result.push(...this.viewPAneContAiner.getContextMenuActions());
		return result;
	}

	getActions(): ReAdonlyArrAy<IAction> {
		return this.viewPAneContAiner.getActions();
	}

	getSecondAryActions(): ReAdonlyArrAy<IAction> {
		return this.viewPAneContAiner.getSecondAryActions();
	}

	getActionViewItem(Action: IAction): IActionViewItem | undefined {
		return this.viewPAneContAiner.getActionViewItem(Action);
	}

	getTitle(): string {
		return this.viewPAneContAiner.getTitle();
	}

	sAveStAte(): void {
		super.sAveStAte();
	}

	focus(): void {
		this.viewPAneContAiner.focus();
	}
}
