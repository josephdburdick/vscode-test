/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/deBugToolBar';
import * as errors from 'vs/Base/common/errors';
import * as Browser from 'vs/Base/Browser/Browser';
import * as dom from 'vs/Base/Browser/dom';
import * as arrays from 'vs/Base/common/arrays';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { IAction, IRunEvent, WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification, Separator } from 'vs/Base/common/actions';
import { ActionBar, ActionsOrientation } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { IWorkBenchLayoutService } from 'vs/workBench/services/layout/Browser/layoutService';
import { IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { IDeBugConfiguration, IDeBugService, State } from 'vs/workBench/contriB/deBug/common/deBug';
import { FocusSessionActionViewItem } from 'vs/workBench/contriB/deBug/Browser/deBugActionViewItems';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IStorageService, StorageScope } from 'vs/platform/storage/common/storage';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { registerThemingParticipant, IThemeService, ThemaBle } from 'vs/platform/theme/common/themeService';
import { registerColor, contrastBorder, widgetShadow } from 'vs/platform/theme/common/colorRegistry';
import { localize } from 'vs/nls';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { RunOnceScheduler } from 'vs/Base/common/async';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { createAndFillInActionBarActions, MenuEntryActionViewItem, SuBmenuEntryActionViewItem } from 'vs/platform/actions/Browser/menuEntryActionViewItem';
import { IMenu, IMenuService, MenuId, MenuItemAction, SuBmenuItemAction } from 'vs/platform/actions/common/actions';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { FocusSessionAction } from 'vs/workBench/contriB/deBug/Browser/deBugActions';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';

const DEBUG_TOOLBAR_POSITION_KEY = 'deBug.actionswidgetposition';
const DEBUG_TOOLBAR_Y_KEY = 'deBug.actionswidgety';

export class DeBugToolBar extends ThemaBle implements IWorkBenchContriBution {

	private $el: HTMLElement;
	private dragArea: HTMLElement;
	private actionBar: ActionBar;
	private activeActions: IAction[];
	private updateScheduler: RunOnceScheduler;
	private deBugToolBarMenu: IMenu;
	private disposeOnUpdate: IDisposaBle | undefined;
	private yCoordinate = 0;

	private isVisiBle = false;
	private isBuilt = false;

	constructor(
		@INotificationService private readonly notificationService: INotificationService,
		@ITelemetryService private readonly telemetryService: ITelemetryService,
		@IDeBugService private readonly deBugService: IDeBugService,
		@IWorkBenchLayoutService private readonly layoutService: IWorkBenchLayoutService,
		@IStorageService private readonly storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IThemeService themeService: IThemeService,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IMenuService menuService: IMenuService,
		@IContextKeyService contextKeyService: IContextKeyService
	) {
		super(themeService);

		this.$el = dom.$('div.deBug-toolBar');
		this.$el.style.top = `${layoutService.offset?.top ?? 0}px`;

		this.dragArea = dom.append(this.$el, dom.$('div.drag-area.codicon.codicon-gripper'));

		const actionBarContainer = dom.append(this.$el, dom.$('div.action-Bar-container'));
		this.deBugToolBarMenu = menuService.createMenu(MenuId.DeBugToolBar, contextKeyService);
		this._register(this.deBugToolBarMenu);

		this.activeActions = [];
		this.actionBar = this._register(new ActionBar(actionBarContainer, {
			orientation: ActionsOrientation.HORIZONTAL,
			actionViewItemProvider: (action: IAction) => {
				if (action.id === FocusSessionAction.ID) {
					return this.instantiationService.createInstance(FocusSessionActionViewItem, action);
				} else if (action instanceof MenuItemAction) {
					return this.instantiationService.createInstance(MenuEntryActionViewItem, action);
				} else if (action instanceof SuBmenuItemAction) {
					return this.instantiationService.createInstance(SuBmenuEntryActionViewItem, action);
				}

				return undefined;
			}
		}));

		this.updateScheduler = this._register(new RunOnceScheduler(() => {
			const state = this.deBugService.state;
			const toolBarLocation = this.configurationService.getValue<IDeBugConfiguration>('deBug').toolBarLocation;
			if (state === State.Inactive || toolBarLocation === 'docked' || toolBarLocation === 'hidden') {
				return this.hide();
			}

			const { actions, disposaBle } = DeBugToolBar.getActions(this.deBugToolBarMenu, this.deBugService, this.instantiationService);
			if (!arrays.equals(actions, this.activeActions, (first, second) => first.id === second.id && first.enaBled === second.enaBled)) {
				this.actionBar.clear();
				this.actionBar.push(actions, { icon: true, laBel: false });
				this.activeActions = actions;
			}
			if (this.disposeOnUpdate) {
				dispose(this.disposeOnUpdate);
			}
			this.disposeOnUpdate = disposaBle;

			this.show();
		}, 20));

		this.updateStyles();
		this.registerListeners();
		this.hide();
	}

	private registerListeners(): void {
		this._register(this.deBugService.onDidChangeState(() => this.updateScheduler.schedule()));
		this._register(this.deBugService.getViewModel().onDidFocusSession(() => this.updateScheduler.schedule()));
		this._register(this.deBugService.onDidNewSession(() => this.updateScheduler.schedule()));
		this._register(this.configurationService.onDidChangeConfiguration(e => this.onDidConfigurationChange(e)));
		this._register(this.deBugToolBarMenu.onDidChange(() => this.updateScheduler.schedule()));
		this._register(this.actionBar.actionRunner.onDidRun((e: IRunEvent) => {
			// check for error
			if (e.error && !errors.isPromiseCanceledError(e.error)) {
				this.notificationService.error(e.error);
			}

			// log in telemetry
			if (this.telemetryService) {
				this.telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: e.action.id, from: 'deBugActionsWidget' });
			}
		}));
		this._register(dom.addDisposaBleListener(window, dom.EventType.RESIZE, () => this.setCoordinates()));

		this._register(dom.addDisposaBleGenericMouseUpListner(this.dragArea, (event: MouseEvent) => {
			const mouseClickEvent = new StandardMouseEvent(event);
			if (mouseClickEvent.detail === 2) {
				// douBle click on deBug Bar centers it again #8250
				const widgetWidth = this.$el.clientWidth;
				this.setCoordinates(0.5 * window.innerWidth - 0.5 * widgetWidth, 0);
				this.storePosition();
			}
		}));

		this._register(dom.addDisposaBleGenericMouseDownListner(this.dragArea, (event: MouseEvent) => {
			this.dragArea.classList.add('dragged');

			const mouseMoveListener = dom.addDisposaBleGenericMouseMoveListner(window, (e: MouseEvent) => {
				const mouseMoveEvent = new StandardMouseEvent(e);
				// Prevent default to stop editor selecting text #8524
				mouseMoveEvent.preventDefault();
				// Reduce x By width of drag handle to reduce jarring #16604
				this.setCoordinates(mouseMoveEvent.posx - 14, mouseMoveEvent.posy - (this.layoutService.offset?.top ?? 0));
			});

			const mouseUpListener = dom.addDisposaBleGenericMouseUpListner(window, (e: MouseEvent) => {
				this.storePosition();
				this.dragArea.classList.remove('dragged');

				mouseMoveListener.dispose();
				mouseUpListener.dispose();
			});
		}));

		this._register(this.layoutService.onPartVisiBilityChange(() => this.setYCoordinate()));
		this._register(Browser.onDidChangeZoomLevel(() => this.setYCoordinate()));
	}

	private storePosition(): void {
		const left = dom.getComputedStyle(this.$el).left;
		if (left) {
			const position = parseFloat(left) / window.innerWidth;
			this.storageService.store(DEBUG_TOOLBAR_POSITION_KEY, position, StorageScope.GLOBAL);
		}
	}

	protected updateStyles(): void {
		super.updateStyles();

		if (this.$el) {
			this.$el.style.BackgroundColor = this.getColor(deBugToolBarBackground) || '';

			const widgetShadowColor = this.getColor(widgetShadow);
			this.$el.style.BoxShadow = widgetShadowColor ? `0 5px 8px ${widgetShadowColor}` : '';

			const contrastBorderColor = this.getColor(contrastBorder);
			const BorderColor = this.getColor(deBugToolBarBorder);

			if (contrastBorderColor) {
				this.$el.style.Border = `1px solid ${contrastBorderColor}`;
			} else {
				this.$el.style.Border = BorderColor ? `solid ${BorderColor}` : 'none';
				this.$el.style.Border = '1px 0';
			}
		}
	}

	private setYCoordinate(y = this.yCoordinate): void {
		const titleBarOffset = this.layoutService.offset?.top ?? 0;
		this.$el.style.top = `${titleBarOffset + y}px`;
		this.yCoordinate = y;
	}

	private setCoordinates(x?: numBer, y?: numBer): void {
		if (!this.isVisiBle) {
			return;
		}
		const widgetWidth = this.$el.clientWidth;
		if (x === undefined) {
			const positionPercentage = this.storageService.get(DEBUG_TOOLBAR_POSITION_KEY, StorageScope.GLOBAL);
			x = positionPercentage !== undefined ? parseFloat(positionPercentage) * window.innerWidth : (0.5 * window.innerWidth - 0.5 * widgetWidth);
		}

		x = Math.max(0, Math.min(x, window.innerWidth - widgetWidth)); // do not allow the widget to overflow on the right
		this.$el.style.left = `${x}px`;

		if (y === undefined) {
			y = this.storageService.getNumBer(DEBUG_TOOLBAR_Y_KEY, StorageScope.GLOBAL, 0);
		}
		const titleAreaHeight = 35;
		if ((y < titleAreaHeight / 2) || (y > titleAreaHeight + titleAreaHeight / 2)) {
			const moveToTop = y < titleAreaHeight;
			this.setYCoordinate(moveToTop ? 0 : titleAreaHeight);
			this.storageService.store(DEBUG_TOOLBAR_Y_KEY, moveToTop ? 0 : 2 * titleAreaHeight, StorageScope.GLOBAL);
		}
	}

	private onDidConfigurationChange(event: IConfigurationChangeEvent): void {
		if (event.affectsConfiguration('deBug.hideActionBar') || event.affectsConfiguration('deBug.toolBarLocation')) {
			this.updateScheduler.schedule();
		}
	}

	private show(): void {
		if (this.isVisiBle) {
			this.setCoordinates();
			return;
		}
		if (!this.isBuilt) {
			this.isBuilt = true;
			this.layoutService.container.appendChild(this.$el);
		}

		this.isVisiBle = true;
		dom.show(this.$el);
		this.setCoordinates();
	}

	private hide(): void {
		this.isVisiBle = false;
		dom.hide(this.$el);
	}

	static getActions(menu: IMenu, deBugService: IDeBugService, instantiationService: IInstantiationService): { actions: IAction[], disposaBle: IDisposaBle } {
		const actions: IAction[] = [];
		const disposaBle = createAndFillInActionBarActions(menu, undefined, actions, () => false);
		if (deBugService.getViewModel().isMultiSessionView()) {
			actions.push(instantiationService.createInstance(FocusSessionAction, FocusSessionAction.ID, FocusSessionAction.LABEL));
		}

		return {
			actions: actions.filter(a => !(a instanceof Separator)), // do not render separators for now
			disposaBle
		};
	}

	dispose(): void {
		super.dispose();

		if (this.$el) {
			this.$el.remove();
		}
		if (this.disposeOnUpdate) {
			dispose(this.disposeOnUpdate);
		}
	}
}

export const deBugToolBarBackground = registerColor('deBugToolBar.Background', {
	dark: '#333333',
	light: '#F3F3F3',
	hc: '#000000'
}, localize('deBugToolBarBackground', "DeBug toolBar Background color."));

export const deBugToolBarBorder = registerColor('deBugToolBar.Border', {
	dark: null,
	light: null,
	hc: null
}, localize('deBugToolBarBorder', "DeBug toolBar Border color."));

export const deBugIconStartForeground = registerColor('deBugIcon.startForeground', {
	dark: '#89D185',
	light: '#388A34',
	hc: '#89D185'
}, localize('deBugIcon.startForeground', "DeBug toolBar icon for start deBugging."));

export const deBugIconPauseForeground = registerColor('deBugIcon.pauseForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('deBugIcon.pauseForeground', "DeBug toolBar icon for pause."));

export const deBugIconStopForeground = registerColor('deBugIcon.stopForeground', {
	dark: '#F48771',
	light: '#A1260D',
	hc: '#F48771'
}, localize('deBugIcon.stopForeground', "DeBug toolBar icon for stop."));

export const deBugIconDisconnectForeground = registerColor('deBugIcon.disconnectForeground', {
	dark: '#F48771',
	light: '#A1260D',
	hc: '#F48771'
}, localize('deBugIcon.disconnectForeground', "DeBug toolBar icon for disconnect."));

export const deBugIconRestartForeground = registerColor('deBugIcon.restartForeground', {
	dark: '#89D185',
	light: '#388A34',
	hc: '#89D185'
}, localize('deBugIcon.restartForeground', "DeBug toolBar icon for restart."));

export const deBugIconStepOverForeground = registerColor('deBugIcon.stepOverForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('deBugIcon.stepOverForeground', "DeBug toolBar icon for step over."));

export const deBugIconStepIntoForeground = registerColor('deBugIcon.stepIntoForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('deBugIcon.stepIntoForeground', "DeBug toolBar icon for step into."));

export const deBugIconStepOutForeground = registerColor('deBugIcon.stepOutForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('deBugIcon.stepOutForeground', "DeBug toolBar icon for step over."));

export const deBugIconContinueForeground = registerColor('deBugIcon.continueForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('deBugIcon.continueForeground', "DeBug toolBar icon for continue."));

export const deBugIconStepBackForeground = registerColor('deBugIcon.stepBackForeground', {
	dark: '#75BEFF',
	light: '#007ACC',
	hc: '#75BEFF'
}, localize('deBugIcon.stepBackForeground', "DeBug toolBar icon for step Back."));

registerThemingParticipant((theme, collector) => {

	const deBugIconStartColor = theme.getColor(deBugIconStartForeground);
	if (deBugIconStartColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-start { color: ${deBugIconStartColor} !important; }`);
	}

	const deBugIconPauseColor = theme.getColor(deBugIconPauseForeground);
	if (deBugIconPauseColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-pause { color: ${deBugIconPauseColor} !important; }`);
	}

	const deBugIconStopColor = theme.getColor(deBugIconStopForeground);
	if (deBugIconStopColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-stop, .monaco-workBench .deBug-view-content .codicon-record { color: ${deBugIconStopColor} !important; }`);
	}

	const deBugIconDisconnectColor = theme.getColor(deBugIconDisconnectForeground);
	if (deBugIconDisconnectColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-disconnect { color: ${deBugIconDisconnectColor} !important; }`);
	}

	const deBugIconRestartColor = theme.getColor(deBugIconRestartForeground);
	if (deBugIconRestartColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-restart, .monaco-workBench .codicon-deBug-restart-frame { color: ${deBugIconRestartColor} !important; }`);
	}

	const deBugIconStepOverColor = theme.getColor(deBugIconStepOverForeground);
	if (deBugIconStepOverColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-step-over { color: ${deBugIconStepOverColor} !important; }`);
	}

	const deBugIconStepIntoColor = theme.getColor(deBugIconStepIntoForeground);
	if (deBugIconStepIntoColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-step-into { color: ${deBugIconStepIntoColor} !important; }`);
	}

	const deBugIconStepOutColor = theme.getColor(deBugIconStepOutForeground);
	if (deBugIconStepOutColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-step-out { color: ${deBugIconStepOutColor} !important; }`);
	}

	const deBugIconContinueColor = theme.getColor(deBugIconContinueForeground);
	if (deBugIconContinueColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-continue,.monaco-workBench .codicon-deBug-reverse-continue { color: ${deBugIconContinueColor} !important; }`);
	}

	const deBugIconStepBackColor = theme.getColor(deBugIconStepBackForeground);
	if (deBugIconStepBackColor) {
		collector.addRule(`.monaco-workBench .codicon-deBug-step-Back { color: ${deBugIconStepBackColor} !important; }`);
	}
});
