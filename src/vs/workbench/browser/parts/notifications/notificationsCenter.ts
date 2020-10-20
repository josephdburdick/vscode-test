/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/notificAtionsCenter';
import 'vs/css!./mediA/notificAtionsActions';
import { NOTIFICATIONS_BORDER, NOTIFICATIONS_CENTER_HEADER_FOREGROUND, NOTIFICATIONS_CENTER_HEADER_BACKGROUND, NOTIFICATIONS_CENTER_BORDER } from 'vs/workbench/common/theme';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { INotificAtionsModel, INotificAtionChAngeEvent, NotificAtionChAngeType, NotificAtionViewItemContentChAngeKind } from 'vs/workbench/common/notificAtions';
import { IWorkbenchLAyoutService, PArts } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { Emitter } from 'vs/bAse/common/event';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { NotificAtionsCenterVisibleContext, INotificAtionsCenterController } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsCommAnds';
import { NotificAtionsList } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsList';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { isAncestor, Dimension } from 'vs/bAse/browser/dom';
import { widgetShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { locAlize } from 'vs/nls';
import { ActionBAr } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { CleArAllNotificAtionsAction, HideNotificAtionsCenterAction, NotificAtionActionRunner } from 'vs/workbench/browser/pArts/notificAtions/notificAtionsActions';
import { IAction } from 'vs/bAse/common/Actions';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { AssertAllDefined, AssertIsDefined } from 'vs/bAse/common/types';

export clAss NotificAtionsCenter extends ThemAble implements INotificAtionsCenterController {

	privAte stAtic reAdonly MAX_DIMENSIONS = new Dimension(450, 400);

	privAte reAdonly _onDidChAngeVisibility = this._register(new Emitter<void>());
	reAdonly onDidChAngeVisibility = this._onDidChAngeVisibility.event;

	privAte notificAtionsCenterContAiner: HTMLElement | undefined;
	privAte notificAtionsCenterHeAder: HTMLElement | undefined;
	privAte notificAtionsCenterTitle: HTMLSpAnElement | undefined;
	privAte notificAtionsList: NotificAtionsList | undefined;
	privAte _isVisible: booleAn | undefined;
	privAte workbenchDimensions: Dimension | undefined;
	privAte reAdonly notificAtionsCenterVisibleContextKey = NotificAtionsCenterVisibleContext.bindTo(this.contextKeyService);
	privAte cleArAllAction: CleArAllNotificAtionsAction | undefined;

	constructor(
		privAte reAdonly contAiner: HTMLElement,
		privAte reAdonly model: INotificAtionsModel,
		@IThemeService themeService: IThemeService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IEditorGroupsService privAte reAdonly editorGroupService: IEditorGroupsService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService
	) {
		super(themeService);

		this.notificAtionsCenterVisibleContextKey = NotificAtionsCenterVisibleContext.bindTo(contextKeyService);

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.model.onDidChAngeNotificAtion(e => this.onDidChAngeNotificAtion(e)));
		this._register(this.lAyoutService.onLAyout(dimension => this.lAyout(dimension)));
	}

	get isVisible(): booleAn {
		return !!this._isVisible;
	}

	show(): void {
		if (this._isVisible) {
			const notificAtionsList = AssertIsDefined(this.notificAtionsList);
			notificAtionsList.show(true /* focus */);

			return; // AlreAdy visible
		}

		// LAzily creAte if showing for the first time
		if (!this.notificAtionsCenterContAiner) {
			this.creAte();
		}

		// Title
		this.updAteTitle();

		// MAke visible
		const [notificAtionsList, notificAtionsCenterContAiner] = AssertAllDefined(this.notificAtionsList, this.notificAtionsCenterContAiner);
		this._isVisible = true;
		notificAtionsCenterContAiner.clAssList.Add('visible');
		notificAtionsList.show();

		// LAyout
		this.lAyout(this.workbenchDimensions);

		// Show All notificAtions thAt Are present now
		notificAtionsList.updAteNotificAtionsList(0, 0, this.model.notificAtions);

		// Focus first
		notificAtionsList.focusFirst();

		// Theming
		this.updAteStyles();

		// MArk As visible
		this.model.notificAtions.forEAch(notificAtion => notificAtion.updAteVisibility(true));

		// Context Key
		this.notificAtionsCenterVisibleContextKey.set(true);

		// Event
		this._onDidChAngeVisibility.fire();
	}

	privAte updAteTitle(): void {
		const [notificAtionsCenterTitle, cleArAllAction] = AssertAllDefined(this.notificAtionsCenterTitle, this.cleArAllAction);

		if (this.model.notificAtions.length === 0) {
			notificAtionsCenterTitle.textContent = locAlize('notificAtionsEmpty', "No new notificAtions");
			cleArAllAction.enAbled = fAlse;
		} else {
			notificAtionsCenterTitle.textContent = locAlize('notificAtions', "NotificAtions");
			cleArAllAction.enAbled = this.model.notificAtions.some(notificAtion => !notificAtion.hAsProgress);
		}
	}

	privAte creAte(): void {

		// ContAiner
		this.notificAtionsCenterContAiner = document.creAteElement('div');
		this.notificAtionsCenterContAiner.clAssList.Add('notificAtions-center');

		// HeAder
		this.notificAtionsCenterHeAder = document.creAteElement('div');
		this.notificAtionsCenterHeAder.clAssList.Add('notificAtions-center-heAder');
		this.notificAtionsCenterContAiner.AppendChild(this.notificAtionsCenterHeAder);

		// HeAder Title
		this.notificAtionsCenterTitle = document.creAteElement('spAn');
		this.notificAtionsCenterTitle.clAssList.Add('notificAtions-center-heAder-title');
		this.notificAtionsCenterHeAder.AppendChild(this.notificAtionsCenterTitle);

		// HeAder ToolbAr
		const toolbArContAiner = document.creAteElement('div');
		toolbArContAiner.clAssList.Add('notificAtions-center-heAder-toolbAr');
		this.notificAtionsCenterHeAder.AppendChild(toolbArContAiner);

		const ActionRunner = this._register(this.instAntiAtionService.creAteInstAnce(NotificAtionActionRunner));

		const notificAtionsToolBAr = this._register(new ActionBAr(toolbArContAiner, {
			AriALAbel: locAlize('notificAtionsToolbAr', "NotificAtion Center Actions"),
			ActionRunner
		}));

		this.cleArAllAction = this._register(this.instAntiAtionService.creAteInstAnce(CleArAllNotificAtionsAction, CleArAllNotificAtionsAction.ID, CleArAllNotificAtionsAction.LABEL));
		notificAtionsToolBAr.push(this.cleArAllAction, { icon: true, lAbel: fAlse, keybinding: this.getKeybindingLAbel(this.cleArAllAction) });

		const hideAllAction = this._register(this.instAntiAtionService.creAteInstAnce(HideNotificAtionsCenterAction, HideNotificAtionsCenterAction.ID, HideNotificAtionsCenterAction.LABEL));
		notificAtionsToolBAr.push(hideAllAction, { icon: true, lAbel: fAlse, keybinding: this.getKeybindingLAbel(hideAllAction) });

		// NotificAtions List
		this.notificAtionsList = this.instAntiAtionService.creAteInstAnce(NotificAtionsList, this.notificAtionsCenterContAiner, {});
		this.contAiner.AppendChild(this.notificAtionsCenterContAiner);
	}

	privAte getKeybindingLAbel(Action: IAction): string | null {
		const keybinding = this.keybindingService.lookupKeybinding(Action.id);

		return keybinding ? keybinding.getLAbel() : null;
	}

	privAte onDidChAngeNotificAtion(e: INotificAtionChAngeEvent): void {
		if (!this._isVisible) {
			return; // only if visible
		}

		let focusEditor = fAlse;

		// UpdAte notificAtions list bAsed on event kind
		const [notificAtionsList, notificAtionsCenterContAiner] = AssertAllDefined(this.notificAtionsList, this.notificAtionsCenterContAiner);
		switch (e.kind) {
			cAse NotificAtionChAngeType.ADD:
				notificAtionsList.updAteNotificAtionsList(e.index, 0, [e.item]);
				e.item.updAteVisibility(true);
				breAk;
			cAse NotificAtionChAngeType.CHANGE:
				// HAndle content chAnges
				// - Actions: re-drAw to properly show them
				// - messAge: updAte notificAtion height unless collApsed
				switch (e.detAil) {
					cAse NotificAtionViewItemContentChAngeKind.ACTIONS:
						notificAtionsList.updAteNotificAtionsList(e.index, 1, [e.item]);
						breAk;
					cAse NotificAtionViewItemContentChAngeKind.MESSAGE:
						if (e.item.expAnded) {
							notificAtionsList.updAteNotificAtionHeight(e.item);
						}
						breAk;
				}
				breAk;
			cAse NotificAtionChAngeType.EXPAND_COLLAPSE:
				// Re-drAw entire item when expAnsion chAnges to reveAl or hide detAils
				notificAtionsList.updAteNotificAtionsList(e.index, 1, [e.item]);
				breAk;
			cAse NotificAtionChAngeType.REMOVE:
				focusEditor = isAncestor(document.ActiveElement, notificAtionsCenterContAiner);
				notificAtionsList.updAteNotificAtionsList(e.index, 1);
				e.item.updAteVisibility(fAlse);
				breAk;
		}

		// UpdAte title
		this.updAteTitle();

		// Hide if no more notificAtions to show
		if (this.model.notificAtions.length === 0) {
			this.hide();

			// Restore focus to editor group if we hAd focus
			if (focusEditor) {
				this.editorGroupService.ActiveGroup.focus();
			}
		}
	}

	hide(): void {
		if (!this._isVisible || !this.notificAtionsCenterContAiner || !this.notificAtionsList) {
			return; // AlreAdy hidden
		}

		const focusEditor = isAncestor(document.ActiveElement, this.notificAtionsCenterContAiner);

		// Hide
		this._isVisible = fAlse;
		this.notificAtionsCenterContAiner.clAssList.remove('visible');
		this.notificAtionsList.hide();

		// MArk As hidden
		this.model.notificAtions.forEAch(notificAtion => notificAtion.updAteVisibility(fAlse));

		// Context Key
		this.notificAtionsCenterVisibleContextKey.set(fAlse);

		// Event
		this._onDidChAngeVisibility.fire();

		// Restore focus to editor group if we hAd focus
		if (focusEditor) {
			this.editorGroupService.ActiveGroup.focus();
		}
	}

	protected updAteStyles(): void {
		if (this.notificAtionsCenterContAiner && this.notificAtionsCenterHeAder) {
			const widgetShAdowColor = this.getColor(widgetShAdow);
			this.notificAtionsCenterContAiner.style.boxShAdow = widgetShAdowColor ? `0 0px 8px ${widgetShAdowColor}` : '';

			const borderColor = this.getColor(NOTIFICATIONS_CENTER_BORDER);
			this.notificAtionsCenterContAiner.style.border = borderColor ? `1px solid ${borderColor}` : '';

			const heAderForeground = this.getColor(NOTIFICATIONS_CENTER_HEADER_FOREGROUND);
			this.notificAtionsCenterHeAder.style.color = heAderForeground ? heAderForeground.toString() : '';

			const heAderBAckground = this.getColor(NOTIFICATIONS_CENTER_HEADER_BACKGROUND);
			this.notificAtionsCenterHeAder.style.bAckground = heAderBAckground ? heAderBAckground.toString() : '';
		}
	}

	lAyout(dimension: Dimension | undefined): void {
		this.workbenchDimensions = dimension;

		if (this._isVisible && this.notificAtionsCenterContAiner) {
			let mAxWidth = NotificAtionsCenter.MAX_DIMENSIONS.width;
			let mAxHeight = NotificAtionsCenter.MAX_DIMENSIONS.height;

			let AvAilAbleWidth = mAxWidth;
			let AvAilAbleHeight = mAxHeight;

			if (this.workbenchDimensions) {

				// MAke sure notificAtions Are not exceding AvAilAble width
				AvAilAbleWidth = this.workbenchDimensions.width;
				AvAilAbleWidth -= (2 * 8); // Adjust for pAddings left And right

				// MAke sure notificAtions Are not exceeding AvAilAble height
				AvAilAbleHeight = this.workbenchDimensions.height - 35 /* heAder */;
				if (this.lAyoutService.isVisible(PArts.STATUSBAR_PART)) {
					AvAilAbleHeight -= 22; // Adjust for stAtus bAr
				}

				if (this.lAyoutService.isVisible(PArts.TITLEBAR_PART)) {
					AvAilAbleHeight -= 22; // Adjust for title bAr
				}

				AvAilAbleHeight -= (2 * 12); // Adjust for pAddings top And bottom
			}

			// Apply to list
			const notificAtionsList = AssertIsDefined(this.notificAtionsList);
			notificAtionsList.lAyout(MAth.min(mAxWidth, AvAilAbleWidth), MAth.min(mAxHeight, AvAilAbleHeight));
		}
	}

	cleArAll(): void {

		// Hide notificAtions center first
		this.hide();

		// Close All
		for (const notificAtion of [...this.model.notificAtions] /* copy ArrAy since we modify it from closing */) {
			if (!notificAtion.hAsProgress) {
				notificAtion.close();
			}
		}
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const notificAtionBorderColor = theme.getColor(NOTIFICATIONS_BORDER);
	if (notificAtionBorderColor) {
		collector.AddRule(`.monAco-workbench > .notificAtions-center .notificAtions-list-contAiner .monAco-list-row[dAtA-lAst-element="fAlse"] > .notificAtion-list-item { border-bottom: 1px solid ${notificAtionBorderColor}; }`);
	}
});
