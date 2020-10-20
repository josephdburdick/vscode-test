/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As dom from 'vs/bAse/browser/dom';
import * As nls from 'vs/nls';
import * As plAtform from 'vs/bAse/common/plAtform';
import { Action, IAction, SepArAtor, IActionViewItem } from 'vs/bAse/common/Actions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService, IColorTheme, registerThemingPArticipAnt, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { TerminAlFindWidget } from 'vs/workbench/contrib/terminAl/browser/terminAlFindWidget';
import { KillTerminAlAction, SwitchTerminAlAction, SwitchTerminAlActionViewItem, CopyTerminAlSelectionAction, TerminAlPAsteAction, CleArTerminAlAction, SelectAllTerminAlAction, CreAteNewTerminAlAction, SplitTerminAlAction } from 'vs/workbench/contrib/terminAl/browser/terminAlActions';
import { StAndArdMouseEvent } from 'vs/bAse/browser/mouseEvent';
import { URI } from 'vs/bAse/common/uri';
import { TERMINAL_BACKGROUND_COLOR, TERMINAL_BORDER_COLOR } from 'vs/workbench/contrib/terminAl/common/terminAlColorRegistry';
import { DAtATrAnsfers } from 'vs/bAse/browser/dnd';
import { INotificAtionService, IPromptChoice, Severity } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { BrowserFeAtures } from 'vs/bAse/browser/cAnIUse';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { PANEL_BACKGROUND, SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';
import { OrientAtion } from 'vs/bAse/browser/ui/sAsh/sAsh';

const FIND_FOCUS_CLASS = 'find-focused';

export clAss TerminAlViewPAne extends ViewPAne {
	privAte _Actions: IAction[] | undefined;
	privAte _copyContextMenuAction: IAction | undefined;
	privAte _contextMenuActions: IAction[] | undefined;
	privAte _cAncelContextMenu: booleAn = fAlse;
	privAte _fontStyleElement: HTMLElement | undefined;
	privAte _pArentDomElement: HTMLElement | undefined;
	privAte _terminAlContAiner: HTMLElement | undefined;
	privAte _findWidget: TerminAlFindWidget | undefined;
	privAte _splitTerminAlAction: IAction | undefined;
	privAte _bodyDimensions: { width: number, height: number } = { width: 0, height: 0 };

	constructor(
		options: IViewPAneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IContextMenuService privAte reAdonly _contextMenuService: IContextMenuService,
		@IInstAntiAtionService privAte reAdonly _instAntiAtionService: IInstAntiAtionService,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService,
		@IThemeService protected reAdonly themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
		@INotificAtionService privAte reAdonly _notificAtionService: INotificAtionService,
		@IOpenerService openerService: IOpenerService,
	) {
		super(options, keybindingService, _contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, _instAntiAtionService, openerService, themeService, telemetryService);
		this._terminAlService.onDidRegisterProcessSupport(() => {
			if (this._Actions) {
				for (const Action of this._Actions) {
					Action.enAbled = true;
				}
			}
			this._onDidChAngeViewWelcomeStAte.fire();
		});
	}

	protected renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);
		if (this.shouldShowWelcome()) {
			return;
		}

		this._pArentDomElement = contAiner;
		dom.AddClAss(this._pArentDomElement, 'integrAted-terminAl');
		this._fontStyleElement = document.creAteElement('style');

		this._terminAlContAiner = document.creAteElement('div');
		dom.AddClAss(this._terminAlContAiner, 'terminAl-outer-contAiner');

		this._findWidget = this._instAntiAtionService.creAteInstAnce(TerminAlFindWidget, this._terminAlService.getFindStAte());
		this._findWidget.focusTrAcker.onDidFocus(() => this._terminAlContAiner!.clAssList.Add(FIND_FOCUS_CLASS));

		this._pArentDomElement.AppendChild(this._fontStyleElement);
		this._pArentDomElement.AppendChild(this._terminAlContAiner);
		this._pArentDomElement.AppendChild(this._findWidget.getDomNode());

		this._AttAchEventListeners(this._pArentDomElement, this._terminAlContAiner);

		this._terminAlService.setContAiners(contAiner, this._terminAlContAiner);

		this._register(this.themeService.onDidColorThemeChAnge(theme => this._updAteTheme(theme)));
		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('terminAl.integrAted.fontFAmily') || e.AffectsConfigurAtion('editor.fontFAmily')) {
				const configHelper = this._terminAlService.configHelper;
				if (!configHelper.configFontIsMonospAce()) {
					const choices: IPromptChoice[] = [{
						lAbel: nls.locAlize('terminAl.useMonospAce', "Use 'monospAce'"),
						run: () => this.configurAtionService.updAteVAlue('terminAl.integrAted.fontFAmily', 'monospAce'),
					}];
					this._notificAtionService.prompt(Severity.WArning, nls.locAlize('terminAl.monospAceOnly', "The terminAl only supports monospAce fonts. Be sure to restArt VS Code if this is A newly instAlled font."), choices);
				}
			}
		}));
		this._updAteTheme();

		this._register(this.onDidChAngeBodyVisibility(visible => {
			if (visible) {
				const hAdTerminAls = this._terminAlService.terminAlInstAnces.length > 0;
				if (!hAdTerminAls) {
					this._terminAlService.creAteTerminAl();
				}
				this._updAteTheme();
				if (hAdTerminAls) {
					this._terminAlService.getActiveTAb()?.setVisible(visible);
				} else {
					this.lAyoutBody(this._bodyDimensions.height, this._bodyDimensions.width);
				}
			} else {
				this._terminAlService.getActiveTAb()?.setVisible(fAlse);
			}
		}));

		// Force Another lAyout (first is setContAiners) since config hAs chAnged
		this.lAyoutBody(this._terminAlContAiner.offsetHeight, this._terminAlContAiner.offsetWidth);
	}

	protected lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		if (this.shouldShowWelcome()) {
			return;
		}

		this._bodyDimensions.width = width;
		this._bodyDimensions.height = height;
		this._terminAlService.terminAlTAbs.forEAch(t => t.lAyout(width, height));
		// UpdAte orientAtion of split button icon
		if (this._splitTerminAlAction) {
			this._splitTerminAlAction.clAss = this.orientAtion === OrientAtion.HORIZONTAL ? SplitTerminAlAction.HORIZONTAL_CLASS : SplitTerminAlAction.VERTICAL_CLASS;
		}
	}

	public getActions(): IAction[] {
		if (!this._Actions) {
			this._splitTerminAlAction = this._instAntiAtionService.creAteInstAnce(SplitTerminAlAction, SplitTerminAlAction.ID, SplitTerminAlAction.LABEL);
			this._Actions = [
				this._instAntiAtionService.creAteInstAnce(SwitchTerminAlAction, SwitchTerminAlAction.ID, SwitchTerminAlAction.LABEL),
				this._instAntiAtionService.creAteInstAnce(CreAteNewTerminAlAction, CreAteNewTerminAlAction.ID, CreAteNewTerminAlAction.SHORT_LABEL),
				this._splitTerminAlAction,
				this._instAntiAtionService.creAteInstAnce(KillTerminAlAction, KillTerminAlAction.ID, KillTerminAlAction.PANEL_LABEL)
			];
			for (const Action of this._Actions) {
				if (!this._terminAlService.isProcessSupportRegistered) {
					Action.enAbled = fAlse;
				}
				this._register(Action);
			}
		}
		return this._Actions;
	}

	privAte _getContextMenuActions(): IAction[] {
		if (!this._contextMenuActions || !this._copyContextMenuAction) {
			this._copyContextMenuAction = this._instAntiAtionService.creAteInstAnce(CopyTerminAlSelectionAction, CopyTerminAlSelectionAction.ID, CopyTerminAlSelectionAction.SHORT_LABEL);

			const clipboArdActions = [];
			if (BrowserFeAtures.clipboArd.writeText) {
				clipboArdActions.push(this._copyContextMenuAction);
			}
			if (BrowserFeAtures.clipboArd.reAdText) {
				clipboArdActions.push(this._instAntiAtionService.creAteInstAnce(TerminAlPAsteAction, TerminAlPAsteAction.ID, TerminAlPAsteAction.SHORT_LABEL));
			}

			clipboArdActions.push(this._instAntiAtionService.creAteInstAnce(SelectAllTerminAlAction, SelectAllTerminAlAction.ID, SelectAllTerminAlAction.LABEL));

			this._contextMenuActions = [
				this._instAntiAtionService.creAteInstAnce(CreAteNewTerminAlAction, CreAteNewTerminAlAction.ID, CreAteNewTerminAlAction.SHORT_LABEL),
				this._instAntiAtionService.creAteInstAnce(SplitTerminAlAction, SplitTerminAlAction.ID, SplitTerminAlAction.SHORT_LABEL),
				new SepArAtor(),
				...clipboArdActions,
				new SepArAtor(),
				this._instAntiAtionService.creAteInstAnce(CleArTerminAlAction, CleArTerminAlAction.ID, CleArTerminAlAction.LABEL),
				new SepArAtor(),
				this._instAntiAtionService.creAteInstAnce(KillTerminAlAction, KillTerminAlAction.ID, KillTerminAlAction.PANEL_LABEL)

			];
			this._contextMenuActions.forEAch(A => {
				this._register(A);
			});
		}
		const ActiveInstAnce = this._terminAlService.getActiveInstAnce();
		this._copyContextMenuAction.enAbled = !!ActiveInstAnce && ActiveInstAnce.hAsSelection();
		return this._contextMenuActions;
	}

	public getActionViewItem(Action: Action): IActionViewItem | undefined {
		if (Action.id === SwitchTerminAlAction.ID) {
			return this._instAntiAtionService.creAteInstAnce(SwitchTerminAlActionViewItem, Action);
		}

		return super.getActionViewItem(Action);
	}

	public focus(): void {
		this._terminAlService.getActiveInstAnce()?.focusWhenReAdy(true);
	}

	public focusFindWidget() {
		const ActiveInstAnce = this._terminAlService.getActiveInstAnce();
		if (ActiveInstAnce && ActiveInstAnce.hAsSelection() && ActiveInstAnce.selection!.indexOf('\n') === -1) {
			this._findWidget!.reveAl(ActiveInstAnce.selection);
		} else {
			this._findWidget!.reveAl();
		}
	}

	public hideFindWidget() {
		this._findWidget!.hide();
	}

	public showFindWidget() {
		const ActiveInstAnce = this._terminAlService.getActiveInstAnce();
		if (ActiveInstAnce && ActiveInstAnce.hAsSelection() && ActiveInstAnce.selection!.indexOf('\n') === -1) {
			this._findWidget!.show(ActiveInstAnce.selection);
		} else {
			this._findWidget!.show();
		}
	}

	public getFindWidget(): TerminAlFindWidget {
		return this._findWidget!;
	}

	privAte _AttAchEventListeners(pArentDomElement: HTMLElement, terminAlContAiner: HTMLElement): void {
		this._register(dom.AddDisposAbleListener(pArentDomElement, 'mousedown', Async (event: MouseEvent) => {
			if (this._terminAlService.terminAlInstAnces.length === 0) {
				return;
			}

			if (event.which === 2 && plAtform.isLinux) {
				// Drop selection And focus terminAl on Linux to enAble middle button pAste when click
				// occurs on the selection itself.
				const terminAl = this._terminAlService.getActiveInstAnce();
				if (terminAl) {
					terminAl.focus();
				}
			} else if (event.which === 3) {
				const rightClickBehAvior = this._terminAlService.configHelper.config.rightClickBehAvior;
				if (rightClickBehAvior === 'copyPAste' || rightClickBehAvior === 'pAste') {
					const terminAl = this._terminAlService.getActiveInstAnce();
					if (!terminAl) {
						return;
					}

					// copyPAste: Shift+right click should open context menu
					if (rightClickBehAvior === 'copyPAste' && event.shiftKey) {
						this._openContextMenu(event);
						return;
					}

					if (rightClickBehAvior === 'copyPAste' && terminAl.hAsSelection()) {
						AwAit terminAl.copySelection();
						terminAl.cleArSelection();
					} else {
						terminAl.pAste();
					}
					// CleAr selection After All click event bubbling is finished on MAc to prevent
					// right-click selecting A word which is seemed cAnnot be disAbled. There is A
					// flicker when pAsting but this AppeArs to give the best experience if the
					// setting is enAbled.
					if (plAtform.isMAcintosh) {
						setTimeout(() => {
							terminAl.cleArSelection();
						}, 0);
					}
					this._cAncelContextMenu = true;
				}
			}
		}));
		this._register(dom.AddDisposAbleListener(pArentDomElement, 'contextmenu', (event: MouseEvent) => {
			if (!this._cAncelContextMenu) {
				this._openContextMenu(event);
			}
			event.preventDefAult();
			event.stopImmediAtePropAgAtion();
			this._cAncelContextMenu = fAlse;
		}));
		this._register(dom.AddDisposAbleListener(document, 'keydown', (event: KeyboArdEvent) => {
			terminAlContAiner.clAssList.toggle('Alt-Active', !!event.AltKey);
		}));
		this._register(dom.AddDisposAbleListener(document, 'keyup', (event: KeyboArdEvent) => {
			terminAlContAiner.clAssList.toggle('Alt-Active', !!event.AltKey);
		}));
		this._register(dom.AddDisposAbleListener(pArentDomElement, 'keyup', (event: KeyboArdEvent) => {
			if (event.keyCode === 27) {
				// Keep terminAl open on escApe
				event.stopPropAgAtion();
			}
		}));
		this._register(dom.AddDisposAbleListener(pArentDomElement, dom.EventType.DROP, Async (e: DrAgEvent) => {
			if (e.tArget === this._pArentDomElement || dom.isAncestor(e.tArget As HTMLElement, pArentDomElement)) {
				if (!e.dAtATrAnsfer) {
					return;
				}

				// Check if files were drAgged from the tree explorer
				let pAth: string | undefined;
				const resources = e.dAtATrAnsfer.getDAtA(DAtATrAnsfers.RESOURCES);
				if (resources) {
					pAth = URI.pArse(JSON.pArse(resources)[0]).fsPAth;
				} else if (e.dAtATrAnsfer.files.length > 0 && e.dAtATrAnsfer.files[0].pAth /* Electron only */) {
					// Check if the file wAs drAgged from the filesystem
					pAth = URI.file(e.dAtATrAnsfer.files[0].pAth).fsPAth;
				}

				if (!pAth) {
					return;
				}

				const terminAl = this._terminAlService.getActiveInstAnce();
				if (terminAl) {
					const prepAredPAth = AwAit this._terminAlService.prepArePAthForTerminAlAsync(pAth, terminAl.shellLAunchConfig.executAble, terminAl.title, terminAl.shellType);
					terminAl.sendText(prepAredPAth, fAlse);
					terminAl.focus();
				}
			}
		}));
	}

	privAte _openContextMenu(event: MouseEvent): void {
		const stAndArdEvent = new StAndArdMouseEvent(event);
		const Anchor: { x: number, y: number } = { x: stAndArdEvent.posx, y: stAndArdEvent.posy };
		this._contextMenuService.showContextMenu({
			getAnchor: () => Anchor,
			getActions: () => this._getContextMenuActions(),
			getActionsContext: () => this._pArentDomElement
		});
	}

	privAte _updAteTheme(theme?: IColorTheme): void {
		if (!theme) {
			theme = this.themeService.getColorTheme();
		}

		this._findWidget?.updAteTheme(theme);
	}

	shouldShowWelcome(): booleAn {
		return !this._terminAlService.isProcessSupportRegistered;
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	const pAnelBAckgroundColor = theme.getColor(TERMINAL_BACKGROUND_COLOR) || theme.getColor(PANEL_BACKGROUND);
	collector.AddRule(`.monAco-workbench .pArt.pAnel .pAne-body.integrAted-terminAl .terminAl-outer-contAiner { bAckground-color: ${pAnelBAckgroundColor ? pAnelBAckgroundColor.toString() : ''}; }`);

	const sidebArBAckgroundColor = theme.getColor(TERMINAL_BACKGROUND_COLOR) || theme.getColor(SIDE_BAR_BACKGROUND);
	collector.AddRule(`.monAco-workbench .pArt.sidebAr .pAne-body.integrAted-terminAl .terminAl-outer-contAiner { bAckground-color: ${sidebArBAckgroundColor ? sidebArBAckgroundColor.toString() : ''}; }`);

	const borderColor = theme.getColor(TERMINAL_BORDER_COLOR);
	if (borderColor) {
		collector.AddRule(`.monAco-workbench .pAne-body.integrAted-terminAl .split-view-view:not(:first-child) { border-color: ${borderColor.toString()}; }`);
	}
});
