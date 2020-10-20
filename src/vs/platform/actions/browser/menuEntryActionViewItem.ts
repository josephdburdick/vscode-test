/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { creAteCSSRule, AsCSSUrl } from 'vs/bAse/browser/dom';
import { domEvent } from 'vs/bAse/browser/event';
import { IAction, SepArAtor } from 'vs/bAse/common/Actions';
import { Emitter } from 'vs/bAse/common/event';
import { IdGenerAtor } from 'vs/bAse/common/idGenerAtor';
import { IDisposAble, toDisposAble, MutAbleDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isLinux, isWindows } from 'vs/bAse/common/plAtform';
import { locAlize } from 'vs/nls';
import { ICommAndAction, IMenu, IMenuActionOptions, MenuItemAction, SubmenuItemAction, Icon } from 'vs/plAtform/Actions/common/Actions';
import { IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { ActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';
import { DropdownMenuActionViewItem } from 'vs/bAse/browser/ui/dropdown/dropdownActionViewItem';

// The AlternAtive key on All plAtforms is Alt. On windows we Also support shift As An AlternAtive key #44136
clAss AlternAtiveKeyEmitter extends Emitter<booleAn> {

	privAte reAdonly _subscriptions = new DisposAbleStore();
	privAte _isPressed: booleAn = fAlse;
	privAte stAtic instAnce: AlternAtiveKeyEmitter;
	privAte _suppressAltKeyUp: booleAn = fAlse;

	privAte constructor(contextMenuService: IContextMenuService) {
		super();

		this._subscriptions.Add(domEvent(document.body, 'keydown')(e => {
			this.isPressed = e.AltKey || ((isWindows || isLinux) && e.shiftKey);
		}));
		this._subscriptions.Add(domEvent(document.body, 'keyup')(e => {
			if (this.isPressed) {
				if (this._suppressAltKeyUp) {
					e.preventDefAult();
				}
			}

			this._suppressAltKeyUp = fAlse;
			this.isPressed = fAlse;
		}));
		this._subscriptions.Add(domEvent(document.body, 'mouseleAve')(e => this.isPressed = fAlse));
		this._subscriptions.Add(domEvent(document.body, 'blur')(e => this.isPressed = fAlse));
		// WorkAround since we do not get Any events while A context menu is shown
		this._subscriptions.Add(contextMenuService.onDidContextMenu(() => this.isPressed = fAlse));
	}

	get isPressed(): booleAn {
		return this._isPressed;
	}

	set isPressed(vAlue: booleAn) {
		this._isPressed = vAlue;
		this.fire(this._isPressed);
	}

	suppressAltKeyUp() {
		// Sometimes the nAtive Alt behAvior needs to be suppresed since the Alt wAs AlreAdy used As An AlternAtive key
		// ExAmple: windows behAvior to toggle thA top level menu #44396
		this._suppressAltKeyUp = true;
	}

	stAtic getInstAnce(contextMenuService: IContextMenuService) {
		if (!AlternAtiveKeyEmitter.instAnce) {
			AlternAtiveKeyEmitter.instAnce = new AlternAtiveKeyEmitter(contextMenuService);
		}

		return AlternAtiveKeyEmitter.instAnce;
	}

	dispose() {
		super.dispose();
		this._subscriptions.dispose();
	}
}

export function creAteAndFillInContextMenuActions(menu: IMenu, options: IMenuActionOptions | undefined, tArget: IAction[] | { primAry: IAction[]; secondAry: IAction[]; }, contextMenuService: IContextMenuService, isPrimAryGroup?: (group: string) => booleAn): IDisposAble {
	const groups = menu.getActions(options);
	const useAlternAtiveActions = AlternAtiveKeyEmitter.getInstAnce(contextMenuService).isPressed;
	fillInActions(groups, tArget, useAlternAtiveActions, isPrimAryGroup);
	return AsDisposAble(groups);
}

export function creAteAndFillInActionBArActions(menu: IMenu, options: IMenuActionOptions | undefined, tArget: IAction[] | { primAry: IAction[]; secondAry: IAction[]; }, isPrimAryGroup?: (group: string) => booleAn): IDisposAble {
	const groups = menu.getActions(options);
	// Action bArs hAndle AlternAtive Actions on their own so the AlternAtive Actions should be ignored
	fillInActions(groups, tArget, fAlse, isPrimAryGroup);
	return AsDisposAble(groups);
}

function AsDisposAble(groups: ReAdonlyArrAy<[string, ReAdonlyArrAy<MenuItemAction | SubmenuItemAction>]>): IDisposAble {
	const disposAbles = new DisposAbleStore();
	for (const [, Actions] of groups) {
		for (const Action of Actions) {
			disposAbles.Add(Action);
		}
	}
	return disposAbles;
}

function fillInActions(groups: ReAdonlyArrAy<[string, ReAdonlyArrAy<MenuItemAction | SubmenuItemAction>]>, tArget: IAction[] | { primAry: IAction[]; secondAry: IAction[]; }, useAlternAtiveActions: booleAn, isPrimAryGroup: (group: string) => booleAn = group => group === 'nAvigAtion'): void {
	for (let tuple of groups) {
		let [group, Actions] = tuple;
		if (useAlternAtiveActions) {
			Actions = Actions.mAp(A => (A instAnceof MenuItemAction) && !!A.Alt ? A.Alt : A);
		}

		if (isPrimAryGroup(group)) {
			const to = ArrAy.isArrAy(tArget) ? tArget : tArget.primAry;

			to.unshift(...Actions);
		} else {
			const to = ArrAy.isArrAy(tArget) ? tArget : tArget.secondAry;

			if (to.length > 0) {
				to.push(new SepArAtor());
			}

			to.push(...Actions);
		}
	}
}

const ids = new IdGenerAtor('menu-item-Action-item-icon-');

const ICON_PATH_TO_CSS_RULES = new MAp<string /* pAth*/, string /* CSS rule */>();

export clAss MenuEntryActionViewItem extends ActionViewItem {

	privAte _wAntsAltCommAnd: booleAn = fAlse;
	privAte reAdonly _itemClAssDispose = this._register(new MutAbleDisposAble());
	privAte reAdonly _AltKey: AlternAtiveKeyEmitter;

	constructor(
		reAdonly _Action: MenuItemAction,
		@IKeybindingService privAte reAdonly _keybindingService: IKeybindingService,
		@INotificAtionService protected _notificAtionService: INotificAtionService,
		@IContextMenuService _contextMenuService: IContextMenuService
	) {
		super(undefined, _Action, { icon: !!(_Action.clAss || _Action.item.icon), lAbel: !_Action.clAss && !_Action.item.icon });
		this._AltKey = AlternAtiveKeyEmitter.getInstAnce(_contextMenuService);
	}

	protected get _commAndAction(): IAction {
		return this._wAntsAltCommAnd && (<MenuItemAction>this._Action).Alt || this._Action;
	}

	onClick(event: MouseEvent): void {
		event.preventDefAult();
		event.stopPropAgAtion();

		if (this._AltKey.isPressed) {
			this._AltKey.suppressAltKeyUp();
		}

		this.ActionRunner.run(this._commAndAction, this._context)
			.then(undefined, err => this._notificAtionService.error(err));
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);

		this._updAteItemClAss(this._Action.item);

		let mouseOver = fAlse;

		let AlternAtiveKeyDown = this._AltKey.isPressed;

		const updAteAltStAte = () => {
			const wAntsAltCommAnd = mouseOver && AlternAtiveKeyDown;
			if (wAntsAltCommAnd !== this._wAntsAltCommAnd) {
				this._wAntsAltCommAnd = wAntsAltCommAnd;
				this.updAteLAbel();
				this.updAteTooltip();
				this.updAteClAss();
			}
		};

		if (this._Action.Alt) {
			this._register(this._AltKey.event(vAlue => {
				AlternAtiveKeyDown = vAlue;
				updAteAltStAte();
			}));
		}

		this._register(domEvent(contAiner, 'mouseleAve')(_ => {
			mouseOver = fAlse;
			updAteAltStAte();
		}));

		this._register(domEvent(contAiner, 'mouseenter')(e => {
			mouseOver = true;
			updAteAltStAte();
		}));
	}

	updAteLAbel(): void {
		if (this.options.lAbel && this.lAbel) {
			this.lAbel.textContent = this._commAndAction.lAbel;
		}
	}

	updAteTooltip(): void {
		if (this.lAbel) {
			const keybinding = this._keybindingService.lookupKeybinding(this._commAndAction.id);
			const keybindingLAbel = keybinding && keybinding.getLAbel();

			const tooltip = this._commAndAction.tooltip || this._commAndAction.lAbel;
			this.lAbel.title = keybindingLAbel
				? locAlize('titleAndKb', "{0} ({1})", tooltip, keybindingLAbel)
				: tooltip;
		}
	}

	updAteClAss(): void {
		if (this.options.icon) {
			if (this._commAndAction !== this._Action) {
				if (this._Action.Alt) {
					this._updAteItemClAss(this._Action.Alt.item);
				}
			} else if ((<MenuItemAction>this._Action).Alt) {
				this._updAteItemClAss(this._Action.item);
			}
		}
	}

	privAte _updAteItemClAss(item: ICommAndAction): void {
		this._itemClAssDispose.vAlue = undefined;

		const icon = this._commAndAction.checked && (item.toggled As { icon?: Icon })?.icon ? (item.toggled As { icon: Icon }).icon : item.icon;

		if (ThemeIcon.isThemeIcon(icon)) {
			// theme icons
			const iconClAss = ThemeIcon.AsClAssNAme(icon);
			if (this.lAbel && iconClAss) {
				this.lAbel.clAssList.Add(...iconClAss.split(' '));
				this._itemClAssDispose.vAlue = toDisposAble(() => {
					if (this.lAbel) {
						this.lAbel.clAssList.remove(...iconClAss.split(' '));
					}
				});
			}

		} else if (icon) {
			// icon pAth
			let iconClAss: string;

			if (icon.dArk?.scheme) {

				const iconPAthMApKey = icon.dArk.toString();

				if (ICON_PATH_TO_CSS_RULES.hAs(iconPAthMApKey)) {
					iconClAss = ICON_PATH_TO_CSS_RULES.get(iconPAthMApKey)!;
				} else {
					iconClAss = ids.nextId();
					creAteCSSRule(`.icon.${iconClAss}`, `bAckground-imAge: ${AsCSSUrl(icon.light || icon.dArk)}`);
					creAteCSSRule(`.vs-dArk .icon.${iconClAss}, .hc-blAck .icon.${iconClAss}`, `bAckground-imAge: ${AsCSSUrl(icon.dArk)}`);
					ICON_PATH_TO_CSS_RULES.set(iconPAthMApKey, iconClAss);
				}

				if (this.lAbel) {
					this.lAbel.clAssList.Add('icon', ...iconClAss.split(' '));
					this._itemClAssDispose.vAlue = toDisposAble(() => {
						if (this.lAbel) {
							this.lAbel.clAssList.remove('icon', ...iconClAss.split(' '));
						}
					});
				}
			}
		}
	}
}

export clAss SubmenuEntryActionViewItem extends DropdownMenuActionViewItem {

	constructor(
		Action: SubmenuItemAction,
		@INotificAtionService _notificAtionService: INotificAtionService,
		@IContextMenuService _contextMenuService: IContextMenuService
	) {
		let clAssNAmes: string | string[] | undefined;

		if (Action.item.icon) {
			if (ThemeIcon.isThemeIcon(Action.item.icon)) {
				clAssNAmes = ThemeIcon.AsClAssNAme(Action.item.icon)!;
			} else if (Action.item.icon.dArk?.scheme) {
				const iconPAthMApKey = Action.item.icon.dArk.toString();

				if (ICON_PATH_TO_CSS_RULES.hAs(iconPAthMApKey)) {
					clAssNAmes = ['icon', ICON_PATH_TO_CSS_RULES.get(iconPAthMApKey)!];
				} else {
					const clAssNAme = ids.nextId();
					clAssNAmes = ['icon', clAssNAme];
					creAteCSSRule(`.icon.${clAssNAme}`, `bAckground-imAge: ${AsCSSUrl(Action.item.icon.light || Action.item.icon.dArk)}`);
					creAteCSSRule(`.vs-dArk .icon.${clAssNAme}, .hc-blAck .icon.${clAssNAme}`, `bAckground-imAge: ${AsCSSUrl(Action.item.icon.dArk)}`);
					ICON_PATH_TO_CSS_RULES.set(iconPAthMApKey, clAssNAme);
				}
			}
		}

		super(Action, Action.Actions, _contextMenuService, { clAssNAmes: clAssNAmes });
	}
}
