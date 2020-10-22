/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from 'vs/Base/Browser/dom';
import * as nls from 'vs/nls';
import * as platform from 'vs/Base/common/platform';
import { Action, IAction, Separator, IActionViewItem } from 'vs/Base/common/actions';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IThemeService, IColorTheme, registerThemingParticipant, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { TerminalFindWidget } from 'vs/workBench/contriB/terminal/Browser/terminalFindWidget';
import { KillTerminalAction, SwitchTerminalAction, SwitchTerminalActionViewItem, CopyTerminalSelectionAction, TerminalPasteAction, ClearTerminalAction, SelectAllTerminalAction, CreateNewTerminalAction, SplitTerminalAction } from 'vs/workBench/contriB/terminal/Browser/terminalActions';
import { StandardMouseEvent } from 'vs/Base/Browser/mouseEvent';
import { URI } from 'vs/Base/common/uri';
import { TERMINAL_BACKGROUND_COLOR, TERMINAL_BORDER_COLOR } from 'vs/workBench/contriB/terminal/common/terminalColorRegistry';
import { DataTransfers } from 'vs/Base/Browser/dnd';
import { INotificationService, IPromptChoice, Severity } from 'vs/platform/notification/common/notification';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { BrowserFeatures } from 'vs/Base/Browser/canIUse';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from 'vs/workBench/common/theme';
import { Orientation } from 'vs/Base/Browser/ui/sash/sash';

const FIND_FOCUS_CLASS = 'find-focused';

export class TerminalViewPane extends ViewPane {
	private _actions: IAction[] | undefined;
	private _copyContextMenuAction: IAction | undefined;
	private _contextMenuActions: IAction[] | undefined;
	private _cancelContextMenu: Boolean = false;
	private _fontStyleElement: HTMLElement | undefined;
	private _parentDomElement: HTMLElement | undefined;
	private _terminalContainer: HTMLElement | undefined;
	private _findWidget: TerminalFindWidget | undefined;
	private _splitTerminalAction: IAction | undefined;
	private _BodyDimensions: { width: numBer, height: numBer } = { width: 0, height: 0 };

	constructor(
		options: IViewPaneOptions,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextMenuService private readonly _contextMenuService: IContextMenuService,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
		@ITerminalService private readonly _terminalService: ITerminalService,
		@IThemeService protected readonly themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@INotificationService private readonly _notificationService: INotificationService,
		@IOpenerService openerService: IOpenerService,
	) {
		super(options, keyBindingService, _contextMenuService, configurationService, contextKeyService, viewDescriptorService, _instantiationService, openerService, themeService, telemetryService);
		this._terminalService.onDidRegisterProcessSupport(() => {
			if (this._actions) {
				for (const action of this._actions) {
					action.enaBled = true;
				}
			}
			this._onDidChangeViewWelcomeState.fire();
		});
	}

	protected renderBody(container: HTMLElement): void {
		super.renderBody(container);
		if (this.shouldShowWelcome()) {
			return;
		}

		this._parentDomElement = container;
		dom.addClass(this._parentDomElement, 'integrated-terminal');
		this._fontStyleElement = document.createElement('style');

		this._terminalContainer = document.createElement('div');
		dom.addClass(this._terminalContainer, 'terminal-outer-container');

		this._findWidget = this._instantiationService.createInstance(TerminalFindWidget, this._terminalService.getFindState());
		this._findWidget.focusTracker.onDidFocus(() => this._terminalContainer!.classList.add(FIND_FOCUS_CLASS));

		this._parentDomElement.appendChild(this._fontStyleElement);
		this._parentDomElement.appendChild(this._terminalContainer);
		this._parentDomElement.appendChild(this._findWidget.getDomNode());

		this._attachEventListeners(this._parentDomElement, this._terminalContainer);

		this._terminalService.setContainers(container, this._terminalContainer);

		this._register(this.themeService.onDidColorThemeChange(theme => this._updateTheme(theme)));
		this._register(this.configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('terminal.integrated.fontFamily') || e.affectsConfiguration('editor.fontFamily')) {
				const configHelper = this._terminalService.configHelper;
				if (!configHelper.configFontIsMonospace()) {
					const choices: IPromptChoice[] = [{
						laBel: nls.localize('terminal.useMonospace', "Use 'monospace'"),
						run: () => this.configurationService.updateValue('terminal.integrated.fontFamily', 'monospace'),
					}];
					this._notificationService.prompt(Severity.Warning, nls.localize('terminal.monospaceOnly', "The terminal only supports monospace fonts. Be sure to restart VS Code if this is a newly installed font."), choices);
				}
			}
		}));
		this._updateTheme();

		this._register(this.onDidChangeBodyVisiBility(visiBle => {
			if (visiBle) {
				const hadTerminals = this._terminalService.terminalInstances.length > 0;
				if (!hadTerminals) {
					this._terminalService.createTerminal();
				}
				this._updateTheme();
				if (hadTerminals) {
					this._terminalService.getActiveTaB()?.setVisiBle(visiBle);
				} else {
					this.layoutBody(this._BodyDimensions.height, this._BodyDimensions.width);
				}
			} else {
				this._terminalService.getActiveTaB()?.setVisiBle(false);
			}
		}));

		// Force another layout (first is setContainers) since config has changed
		this.layoutBody(this._terminalContainer.offsetHeight, this._terminalContainer.offsetWidth);
	}

	protected layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		if (this.shouldShowWelcome()) {
			return;
		}

		this._BodyDimensions.width = width;
		this._BodyDimensions.height = height;
		this._terminalService.terminalTaBs.forEach(t => t.layout(width, height));
		// Update orientation of split Button icon
		if (this._splitTerminalAction) {
			this._splitTerminalAction.class = this.orientation === Orientation.HORIZONTAL ? SplitTerminalAction.HORIZONTAL_CLASS : SplitTerminalAction.VERTICAL_CLASS;
		}
	}

	puBlic getActions(): IAction[] {
		if (!this._actions) {
			this._splitTerminalAction = this._instantiationService.createInstance(SplitTerminalAction, SplitTerminalAction.ID, SplitTerminalAction.LABEL);
			this._actions = [
				this._instantiationService.createInstance(SwitchTerminalAction, SwitchTerminalAction.ID, SwitchTerminalAction.LABEL),
				this._instantiationService.createInstance(CreateNewTerminalAction, CreateNewTerminalAction.ID, CreateNewTerminalAction.SHORT_LABEL),
				this._splitTerminalAction,
				this._instantiationService.createInstance(KillTerminalAction, KillTerminalAction.ID, KillTerminalAction.PANEL_LABEL)
			];
			for (const action of this._actions) {
				if (!this._terminalService.isProcessSupportRegistered) {
					action.enaBled = false;
				}
				this._register(action);
			}
		}
		return this._actions;
	}

	private _getContextMenuActions(): IAction[] {
		if (!this._contextMenuActions || !this._copyContextMenuAction) {
			this._copyContextMenuAction = this._instantiationService.createInstance(CopyTerminalSelectionAction, CopyTerminalSelectionAction.ID, CopyTerminalSelectionAction.SHORT_LABEL);

			const clipBoardActions = [];
			if (BrowserFeatures.clipBoard.writeText) {
				clipBoardActions.push(this._copyContextMenuAction);
			}
			if (BrowserFeatures.clipBoard.readText) {
				clipBoardActions.push(this._instantiationService.createInstance(TerminalPasteAction, TerminalPasteAction.ID, TerminalPasteAction.SHORT_LABEL));
			}

			clipBoardActions.push(this._instantiationService.createInstance(SelectAllTerminalAction, SelectAllTerminalAction.ID, SelectAllTerminalAction.LABEL));

			this._contextMenuActions = [
				this._instantiationService.createInstance(CreateNewTerminalAction, CreateNewTerminalAction.ID, CreateNewTerminalAction.SHORT_LABEL),
				this._instantiationService.createInstance(SplitTerminalAction, SplitTerminalAction.ID, SplitTerminalAction.SHORT_LABEL),
				new Separator(),
				...clipBoardActions,
				new Separator(),
				this._instantiationService.createInstance(ClearTerminalAction, ClearTerminalAction.ID, ClearTerminalAction.LABEL),
				new Separator(),
				this._instantiationService.createInstance(KillTerminalAction, KillTerminalAction.ID, KillTerminalAction.PANEL_LABEL)

			];
			this._contextMenuActions.forEach(a => {
				this._register(a);
			});
		}
		const activeInstance = this._terminalService.getActiveInstance();
		this._copyContextMenuAction.enaBled = !!activeInstance && activeInstance.hasSelection();
		return this._contextMenuActions;
	}

	puBlic getActionViewItem(action: Action): IActionViewItem | undefined {
		if (action.id === SwitchTerminalAction.ID) {
			return this._instantiationService.createInstance(SwitchTerminalActionViewItem, action);
		}

		return super.getActionViewItem(action);
	}

	puBlic focus(): void {
		this._terminalService.getActiveInstance()?.focusWhenReady(true);
	}

	puBlic focusFindWidget() {
		const activeInstance = this._terminalService.getActiveInstance();
		if (activeInstance && activeInstance.hasSelection() && activeInstance.selection!.indexOf('\n') === -1) {
			this._findWidget!.reveal(activeInstance.selection);
		} else {
			this._findWidget!.reveal();
		}
	}

	puBlic hideFindWidget() {
		this._findWidget!.hide();
	}

	puBlic showFindWidget() {
		const activeInstance = this._terminalService.getActiveInstance();
		if (activeInstance && activeInstance.hasSelection() && activeInstance.selection!.indexOf('\n') === -1) {
			this._findWidget!.show(activeInstance.selection);
		} else {
			this._findWidget!.show();
		}
	}

	puBlic getFindWidget(): TerminalFindWidget {
		return this._findWidget!;
	}

	private _attachEventListeners(parentDomElement: HTMLElement, terminalContainer: HTMLElement): void {
		this._register(dom.addDisposaBleListener(parentDomElement, 'mousedown', async (event: MouseEvent) => {
			if (this._terminalService.terminalInstances.length === 0) {
				return;
			}

			if (event.which === 2 && platform.isLinux) {
				// Drop selection and focus terminal on Linux to enaBle middle Button paste when click
				// occurs on the selection itself.
				const terminal = this._terminalService.getActiveInstance();
				if (terminal) {
					terminal.focus();
				}
			} else if (event.which === 3) {
				const rightClickBehavior = this._terminalService.configHelper.config.rightClickBehavior;
				if (rightClickBehavior === 'copyPaste' || rightClickBehavior === 'paste') {
					const terminal = this._terminalService.getActiveInstance();
					if (!terminal) {
						return;
					}

					// copyPaste: Shift+right click should open context menu
					if (rightClickBehavior === 'copyPaste' && event.shiftKey) {
						this._openContextMenu(event);
						return;
					}

					if (rightClickBehavior === 'copyPaste' && terminal.hasSelection()) {
						await terminal.copySelection();
						terminal.clearSelection();
					} else {
						terminal.paste();
					}
					// Clear selection after all click event BuBBling is finished on Mac to prevent
					// right-click selecting a word which is seemed cannot Be disaBled. There is a
					// flicker when pasting But this appears to give the Best experience if the
					// setting is enaBled.
					if (platform.isMacintosh) {
						setTimeout(() => {
							terminal.clearSelection();
						}, 0);
					}
					this._cancelContextMenu = true;
				}
			}
		}));
		this._register(dom.addDisposaBleListener(parentDomElement, 'contextmenu', (event: MouseEvent) => {
			if (!this._cancelContextMenu) {
				this._openContextMenu(event);
			}
			event.preventDefault();
			event.stopImmediatePropagation();
			this._cancelContextMenu = false;
		}));
		this._register(dom.addDisposaBleListener(document, 'keydown', (event: KeyBoardEvent) => {
			terminalContainer.classList.toggle('alt-active', !!event.altKey);
		}));
		this._register(dom.addDisposaBleListener(document, 'keyup', (event: KeyBoardEvent) => {
			terminalContainer.classList.toggle('alt-active', !!event.altKey);
		}));
		this._register(dom.addDisposaBleListener(parentDomElement, 'keyup', (event: KeyBoardEvent) => {
			if (event.keyCode === 27) {
				// Keep terminal open on escape
				event.stopPropagation();
			}
		}));
		this._register(dom.addDisposaBleListener(parentDomElement, dom.EventType.DROP, async (e: DragEvent) => {
			if (e.target === this._parentDomElement || dom.isAncestor(e.target as HTMLElement, parentDomElement)) {
				if (!e.dataTransfer) {
					return;
				}

				// Check if files were dragged from the tree explorer
				let path: string | undefined;
				const resources = e.dataTransfer.getData(DataTransfers.RESOURCES);
				if (resources) {
					path = URI.parse(JSON.parse(resources)[0]).fsPath;
				} else if (e.dataTransfer.files.length > 0 && e.dataTransfer.files[0].path /* Electron only */) {
					// Check if the file was dragged from the filesystem
					path = URI.file(e.dataTransfer.files[0].path).fsPath;
				}

				if (!path) {
					return;
				}

				const terminal = this._terminalService.getActiveInstance();
				if (terminal) {
					const preparedPath = await this._terminalService.preparePathForTerminalAsync(path, terminal.shellLaunchConfig.executaBle, terminal.title, terminal.shellType);
					terminal.sendText(preparedPath, false);
					terminal.focus();
				}
			}
		}));
	}

	private _openContextMenu(event: MouseEvent): void {
		const standardEvent = new StandardMouseEvent(event);
		const anchor: { x: numBer, y: numBer } = { x: standardEvent.posx, y: standardEvent.posy };
		this._contextMenuService.showContextMenu({
			getAnchor: () => anchor,
			getActions: () => this._getContextMenuActions(),
			getActionsContext: () => this._parentDomElement
		});
	}

	private _updateTheme(theme?: IColorTheme): void {
		if (!theme) {
			theme = this.themeService.getColorTheme();
		}

		this._findWidget?.updateTheme(theme);
	}

	shouldShowWelcome(): Boolean {
		return !this._terminalService.isProcessSupportRegistered;
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	const panelBackgroundColor = theme.getColor(TERMINAL_BACKGROUND_COLOR) || theme.getColor(PANEL_BACKGROUND);
	collector.addRule(`.monaco-workBench .part.panel .pane-Body.integrated-terminal .terminal-outer-container { Background-color: ${panelBackgroundColor ? panelBackgroundColor.toString() : ''}; }`);

	const sideBarBackgroundColor = theme.getColor(TERMINAL_BACKGROUND_COLOR) || theme.getColor(SIDE_BAR_BACKGROUND);
	collector.addRule(`.monaco-workBench .part.sideBar .pane-Body.integrated-terminal .terminal-outer-container { Background-color: ${sideBarBackgroundColor ? sideBarBackgroundColor.toString() : ''}; }`);

	const BorderColor = theme.getColor(TERMINAL_BORDER_COLOR);
	if (BorderColor) {
		collector.addRule(`.monaco-workBench .pane-Body.integrated-terminal .split-view-view:not(:first-child) { Border-color: ${BorderColor.toString()}; }`);
	}
});
