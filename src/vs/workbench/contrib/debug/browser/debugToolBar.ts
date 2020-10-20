/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./mediA/debugToolBAr';
import * As errors from 'vs/bAse/common/errors';
import * As browser from 'vs/bAse/browser/browser';
import * As dom from 'vs/bAse/browser/dom';
import * As ArrAys from 'vs/bAse/common/ArrAys';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { IAction, IRunEvent, WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion, SepArAtor } from 'vs/bAse/common/Actions';
import { ActionBAr, ActionsOrientAtion } from 'vs/bAse/browser/ui/ActionbAr/ActionbAr';
import { IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { IDebugConfigurAtion, IDebugService, StAte } from 'vs/workbench/contrib/debug/common/debug';
import { FocusSessionActionViewItem } from 'vs/workbench/contrib/debug/browser/debugActionViewItems';
import { IConfigurAtionService, IConfigurAtionChAngeEvent } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IStorAgeService, StorAgeScope } from 'vs/plAtform/storAge/common/storAge';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { registerThemingPArticipAnt, IThemeService, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { registerColor, contrAstBorder, widgetShAdow } from 'vs/plAtform/theme/common/colorRegistry';
import { locAlize } from 'vs/nls';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { RunOnceScheduler } from 'vs/bAse/common/Async';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { creAteAndFillInActionBArActions, MenuEntryActionViewItem, SubmenuEntryActionViewItem } from 'vs/plAtform/Actions/browser/menuEntryActionViewItem';
import { IMenu, IMenuService, MenuId, MenuItemAction, SubmenuItemAction } from 'vs/plAtform/Actions/common/Actions';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { FocusSessionAction } from 'vs/workbench/contrib/debug/browser/debugActions';
import { IDisposAble, dispose } from 'vs/bAse/common/lifecycle';

const DEBUG_TOOLBAR_POSITION_KEY = 'debug.Actionswidgetposition';
const DEBUG_TOOLBAR_Y_KEY = 'debug.Actionswidgety';

export clAss DebugToolBAr extends ThemAble implements IWorkbenchContribution {

	privAte $el: HTMLElement;
	privAte drAgAreA: HTMLElement;
	privAte ActionBAr: ActionBAr;
	privAte ActiveActions: IAction[];
	privAte updAteScheduler: RunOnceScheduler;
	privAte debugToolBArMenu: IMenu;
	privAte disposeOnUpdAte: IDisposAble | undefined;
	privAte yCoordinAte = 0;

	privAte isVisible = fAlse;
	privAte isBuilt = fAlse;

	constructor(
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@ITelemetryService privAte reAdonly telemetryService: ITelemetryService,
		@IDebugService privAte reAdonly debugService: IDebugService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IStorAgeService privAte reAdonly storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IThemeService themeService: IThemeService,
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(themeService);

		this.$el = dom.$('div.debug-toolbAr');
		this.$el.style.top = `${lAyoutService.offset?.top ?? 0}px`;

		this.drAgAreA = dom.Append(this.$el, dom.$('div.drAg-AreA.codicon.codicon-gripper'));

		const ActionBArContAiner = dom.Append(this.$el, dom.$('div.Action-bAr-contAiner'));
		this.debugToolBArMenu = menuService.creAteMenu(MenuId.DebugToolBAr, contextKeyService);
		this._register(this.debugToolBArMenu);

		this.ActiveActions = [];
		this.ActionBAr = this._register(new ActionBAr(ActionBArContAiner, {
			orientAtion: ActionsOrientAtion.HORIZONTAL,
			ActionViewItemProvider: (Action: IAction) => {
				if (Action.id === FocusSessionAction.ID) {
					return this.instAntiAtionService.creAteInstAnce(FocusSessionActionViewItem, Action);
				} else if (Action instAnceof MenuItemAction) {
					return this.instAntiAtionService.creAteInstAnce(MenuEntryActionViewItem, Action);
				} else if (Action instAnceof SubmenuItemAction) {
					return this.instAntiAtionService.creAteInstAnce(SubmenuEntryActionViewItem, Action);
				}

				return undefined;
			}
		}));

		this.updAteScheduler = this._register(new RunOnceScheduler(() => {
			const stAte = this.debugService.stAte;
			const toolBArLocAtion = this.configurAtionService.getVAlue<IDebugConfigurAtion>('debug').toolBArLocAtion;
			if (stAte === StAte.InActive || toolBArLocAtion === 'docked' || toolBArLocAtion === 'hidden') {
				return this.hide();
			}

			const { Actions, disposAble } = DebugToolBAr.getActions(this.debugToolBArMenu, this.debugService, this.instAntiAtionService);
			if (!ArrAys.equAls(Actions, this.ActiveActions, (first, second) => first.id === second.id && first.enAbled === second.enAbled)) {
				this.ActionBAr.cleAr();
				this.ActionBAr.push(Actions, { icon: true, lAbel: fAlse });
				this.ActiveActions = Actions;
			}
			if (this.disposeOnUpdAte) {
				dispose(this.disposeOnUpdAte);
			}
			this.disposeOnUpdAte = disposAble;

			this.show();
		}, 20));

		this.updAteStyles();
		this.registerListeners();
		this.hide();
	}

	privAte registerListeners(): void {
		this._register(this.debugService.onDidChAngeStAte(() => this.updAteScheduler.schedule()));
		this._register(this.debugService.getViewModel().onDidFocusSession(() => this.updAteScheduler.schedule()));
		this._register(this.debugService.onDidNewSession(() => this.updAteScheduler.schedule()));
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => this.onDidConfigurAtionChAnge(e)));
		this._register(this.debugToolBArMenu.onDidChAnge(() => this.updAteScheduler.schedule()));
		this._register(this.ActionBAr.ActionRunner.onDidRun((e: IRunEvent) => {
			// check for error
			if (e.error && !errors.isPromiseCAnceledError(e.error)) {
				this.notificAtionService.error(e.error);
			}

			// log in telemetry
			if (this.telemetryService) {
				this.telemetryService.publicLog2<WorkbenchActionExecutedEvent, WorkbenchActionExecutedClAssificAtion>('workbenchActionExecuted', { id: e.Action.id, from: 'debugActionsWidget' });
			}
		}));
		this._register(dom.AddDisposAbleListener(window, dom.EventType.RESIZE, () => this.setCoordinAtes()));

		this._register(dom.AddDisposAbleGenericMouseUpListner(this.drAgAreA, (event: MouseEvent) => {
			const mouseClickEvent = new StAndArdMouseEvent(event);
			if (mouseClickEvent.detAil === 2) {
				// double click on debug bAr centers it AgAin #8250
				const widgetWidth = this.$el.clientWidth;
				this.setCoordinAtes(0.5 * window.innerWidth - 0.5 * widgetWidth, 0);
				this.storePosition();
			}
		}));

		this._register(dom.AddDisposAbleGenericMouseDownListner(this.drAgAreA, (event: MouseEvent) => {
			this.drAgAreA.clAssList.Add('drAgged');

			const mouseMoveListener = dom.AddDisposAbleGenericMouseMoveListner(window, (e: MouseEvent) => {
				const mouseMoveEvent = new StAndArdMouseEvent(e);
				// Prevent defAult to stop editor selecting text #8524
				mouseMoveEvent.preventDefAult();
				// Reduce x by width of drAg hAndle to reduce jArring #16604
				this.setCoordinAtes(mouseMoveEvent.posx - 14, mouseMoveEvent.posy - (this.lAyoutService.offset?.top ?? 0));
			});

			const mouseUpListener = dom.AddDisposAbleGenericMouseUpListner(window, (e: MouseEvent) => {
				this.storePosition();
				this.drAgAreA.clAssList.remove('drAgged');

				mouseMoveListener.dispose();
				mouseUpListener.dispose();
			});
		}));

		this._register(this.lAyoutService.onPArtVisibilityChAnge(() => this.setYCoordinAte()));
		this._register(browser.onDidChAngeZoomLevel(() => this.setYCoordinAte()));
	}

	privAte storePosition(): void {
		const left = dom.getComputedStyle(this.$el).left;
		if (left) {
			const position = pArseFloAt(left) / window.innerWidth;
			this.storAgeService.store(DEBUG_TOOLBAR_POSITION_KEY, position, StorAgeScope.GLOBAL);
		}
	}

	protected updAteStyles(): void {
		super.updAteStyles();

		if (this.$el) {
			this.$el.style.bAckgroundColor = this.getColor(debugToolBArBAckground) || '';

			const widgetShAdowColor = this.getColor(widgetShAdow);
			this.$el.style.boxShAdow = widgetShAdowColor ? `0 5px 8px ${widgetShAdowColor}` : '';

			const contrAstBorderColor = this.getColor(contrAstBorder);
			const borderColor = this.getColor(debugToolBArBorder);

			if (contrAstBorderColor) {
				this.$el.style.border = `1px solid ${contrAstBorderColor}`;
			} else {
				this.$el.style.border = borderColor ? `solid ${borderColor}` : 'none';
				this.$el.style.border = '1px 0';
			}
		}
	}

	privAte setYCoordinAte(y = this.yCoordinAte): void {
		const titlebArOffset = this.lAyoutService.offset?.top ?? 0;
		this.$el.style.top = `${titlebArOffset + y}px`;
		this.yCoordinAte = y;
	}

	privAte setCoordinAtes(x?: number, y?: number): void {
		if (!this.isVisible) {
			return;
		}
		const widgetWidth = this.$el.clientWidth;
		if (x === undefined) {
			const positionPercentAge = this.storAgeService.get(DEBUG_TOOLBAR_POSITION_KEY, StorAgeScope.GLOBAL);
			x = positionPercentAge !== undefined ? pArseFloAt(positionPercentAge) * window.innerWidth : (0.5 * window.innerWidth - 0.5 * widgetWidth);
		}

		x = MAth.mAx(0, MAth.min(x, window.innerWidth - widgetWidth)); // do not Allow the widget to overflow on the right
		this.$el.style.left = `${x}px`;

		if (y === undefined) {
			y = this.storAgeService.getNumber(DEBUG_TOOLBAR_Y_KEY, StorAgeScope.GLOBAL, 0);
		}
		const titleAreAHeight = 35;
		if ((y < titleAreAHeight / 2) || (y > titleAreAHeight + titleAreAHeight / 2)) {
			const moveToTop = y < titleAreAHeight;
			this.setYCoordinAte(moveToTop ? 0 : titleAreAHeight);
			this.storAgeService.store(DEBUG_TOOLBAR_Y_KEY, moveToTop ? 0 : 2 * titleAreAHeight, StorAgeScope.GLOBAL);
		}
	}

	privAte onDidConfigurAtionChAnge(event: IConfigurAtionChAngeEvent): void {
		if (event.AffectsConfigurAtion('debug.hideActionBAr') || event.AffectsConfigurAtion('debug.toolBArLocAtion')) {
			this.updAteScheduler.schedule();
		}
	}

	privAte show(): void {
		if (this.isVisible) {
			this.setCoordinAtes();
			return;
		}
		if (!this.isBuilt) {
			this.isBuilt = true;
			this.lAyoutService.contAiner.AppendChild(this.$el);
		}

		this.isVisible = true;
		dom.show(this.$el);
		this.setCoordinAtes();
	}

	privAte hide(): void {
		this.isVisible = fAlse;
		dom.hide(this.$el);
	}

	stAtic getActions(menu: IMenu, debugService: IDebugService, instAntiAtionService: IInstAntiAtionService): { Actions: IAction[], disposAble: IDisposAble } {
		const Actions: IAction[] = [];
		const disposAble = creAteAndFillInActionBArActions(menu, undefined, Actions, () => fAlse);
		if (debugService.getViewModel().isMultiSessionView()) {
			Actions.push(instAntiAtionService.creAteInstAnce(FocusSessionAction, FocusSessionAction.ID, FocusSessionAction.LABEL));
		}

		return {
			Actions: Actions.filter(A => !(A instAnceof SepArAtor)), // do not render sepArAtors for now
			disposAble
		};
	}

	dispose(): void {
		super.dispose();

		if (this.$el) {
			this.$el.remove();
		}
		if (this.disposeOnUpdAte) {
			dispose(this.disposeOnUpdAte);
		}
	}
}

export const debugToolBArBAckground = registerColor('debugToolBAr.bAckground', {
	dArk: '#333333',
	light: '#F3F3F3',
	hc: '#000000'
}, locAlize('debugToolBArBAckground', "Debug toolbAr bAckground color."));

export const debugToolBArBorder = registerColor('debugToolBAr.border', {
	dArk: null,
	light: null,
	hc: null
}, locAlize('debugToolBArBorder', "Debug toolbAr border color."));

export const debugIconStArtForeground = registerColor('debugIcon.stArtForeground', {
	dArk: '#89D185',
	light: '#388A34',
	hc: '#89D185'
}, locAlize('debugIcon.stArtForeground', "Debug toolbAr icon for stArt debugging."));

export const debugIconPAuseForeground = registerColor('debugIcon.pAuseForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('debugIcon.pAuseForeground', "Debug toolbAr icon for pAuse."));

export const debugIconStopForeground = registerColor('debugIcon.stopForeground', {
	dArk: '#F48771',
	light: '#A1260D',
	hc: '#F48771'
}, locAlize('debugIcon.stopForeground', "Debug toolbAr icon for stop."));

export const debugIconDisconnectForeground = registerColor('debugIcon.disconnectForeground', {
	dArk: '#F48771',
	light: '#A1260D',
	hc: '#F48771'
}, locAlize('debugIcon.disconnectForeground', "Debug toolbAr icon for disconnect."));

export const debugIconRestArtForeground = registerColor('debugIcon.restArtForeground', {
	dArk: '#89D185',
	light: '#388A34',
	hc: '#89D185'
}, locAlize('debugIcon.restArtForeground', "Debug toolbAr icon for restArt."));

export const debugIconStepOverForeground = registerColor('debugIcon.stepOverForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('debugIcon.stepOverForeground', "Debug toolbAr icon for step over."));

export const debugIconStepIntoForeground = registerColor('debugIcon.stepIntoForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('debugIcon.stepIntoForeground', "Debug toolbAr icon for step into."));

export const debugIconStepOutForeground = registerColor('debugIcon.stepOutForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('debugIcon.stepOutForeground', "Debug toolbAr icon for step over."));

export const debugIconContinueForeground = registerColor('debugIcon.continueForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('debugIcon.continueForeground', "Debug toolbAr icon for continue."));

export const debugIconStepBAckForeground = registerColor('debugIcon.stepBAckForeground', {
	dArk: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, locAlize('debugIcon.stepBAckForeground', "Debug toolbAr icon for step bAck."));

registerThemingPArticipAnt((theme, collector) => {

	const debugIconStArtColor = theme.getColor(debugIconStArtForeground);
	if (debugIconStArtColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-stArt { color: ${debugIconStArtColor} !importAnt; }`);
	}

	const debugIconPAuseColor = theme.getColor(debugIconPAuseForeground);
	if (debugIconPAuseColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-pAuse { color: ${debugIconPAuseColor} !importAnt; }`);
	}

	const debugIconStopColor = theme.getColor(debugIconStopForeground);
	if (debugIconStopColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-stop, .monAco-workbench .debug-view-content .codicon-record { color: ${debugIconStopColor} !importAnt; }`);
	}

	const debugIconDisconnectColor = theme.getColor(debugIconDisconnectForeground);
	if (debugIconDisconnectColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-disconnect { color: ${debugIconDisconnectColor} !importAnt; }`);
	}

	const debugIconRestArtColor = theme.getColor(debugIconRestArtForeground);
	if (debugIconRestArtColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-restArt, .monAco-workbench .codicon-debug-restArt-frAme { color: ${debugIconRestArtColor} !importAnt; }`);
	}

	const debugIconStepOverColor = theme.getColor(debugIconStepOverForeground);
	if (debugIconStepOverColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-step-over { color: ${debugIconStepOverColor} !importAnt; }`);
	}

	const debugIconStepIntoColor = theme.getColor(debugIconStepIntoForeground);
	if (debugIconStepIntoColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-step-into { color: ${debugIconStepIntoColor} !importAnt; }`);
	}

	const debugIconStepOutColor = theme.getColor(debugIconStepOutForeground);
	if (debugIconStepOutColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-step-out { color: ${debugIconStepOutColor} !importAnt; }`);
	}

	const debugIconContinueColor = theme.getColor(debugIconContinueForeground);
	if (debugIconContinueColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-continue,.monAco-workbench .codicon-debug-reverse-continue { color: ${debugIconContinueColor} !importAnt; }`);
	}

	const debugIconStepBAckColor = theme.getColor(debugIconStepBAckForeground);
	if (debugIconStepBAckColor) {
		collector.AddRule(`.monAco-workbench .codicon-debug-step-bAck { color: ${debugIconStepBAckColor} !importAnt; }`);
	}
});
