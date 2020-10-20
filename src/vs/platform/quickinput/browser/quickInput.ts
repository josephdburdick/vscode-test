/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IQuickInputService, IQuickPickItem, IPickOptions, IInputOptions, IQuickNAvigAteConfigurAtion, IQuickPick, IQuickInputButton, IInputBox, QuickPickInput, IKeyMods } from 'vs/plAtform/quickinput/common/quickInput';
import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IThemeService, ThemAble } from 'vs/plAtform/theme/common/themeService';
import { inputBAckground, inputForeground, inputBorder, inputVAlidAtionInfoBAckground, inputVAlidAtionInfoForeground, inputVAlidAtionInfoBorder, inputVAlidAtionWArningBAckground, inputVAlidAtionWArningForeground, inputVAlidAtionWArningBorder, inputVAlidAtionErrorBAckground, inputVAlidAtionErrorForeground, inputVAlidAtionErrorBorder, bAdgeBAckground, bAdgeForeground, contrAstBorder, buttonForeground, buttonBAckground, buttonHoverBAckground, progressBArBAckground, widgetShAdow, listFocusForeground, listFocusBAckground, ActiveContrAstBorder, pickerGroupBorder, pickerGroupForeground, quickInputForeground, quickInputBAckground, quickInputTitleBAckground } from 'vs/plAtform/theme/common/colorRegistry';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { computeStyles } from 'vs/plAtform/theme/common/styler';
import { IContextKeyService, RAwContextKey, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { QuickInputController, IQuickInputStyles, IQuickInputOptions } from 'vs/bAse/pArts/quickinput/browser/quickInput';
import { WorkbenchList, IWorkbenchListOptions } from 'vs/plAtform/list/browser/listService';
import { List } from 'vs/bAse/browser/ui/list/listWidget';
import { IListVirtuAlDelegAte, IListRenderer } from 'vs/bAse/browser/ui/list/list';
import { IQuickAccessController } from 'vs/plAtform/quickinput/common/quickAccess';
import { QuickAccessController } from 'vs/plAtform/quickinput/browser/quickAccess';

export interfAce IQuickInputControllerHost extends ILAyoutService { }

export clAss QuickInputService extends ThemAble implements IQuickInputService {

	declAre reAdonly _serviceBrAnd: undefined;

	get bAckButton(): IQuickInputButton { return this.controller.bAckButton; }

	get onShow() { return this.controller.onShow; }
	get onHide() { return this.controller.onHide; }

	privAte _controller: QuickInputController | undefined;
	privAte get controller(): QuickInputController {
		if (!this._controller) {
			this._controller = this._register(this.creAteController());
		}

		return this._controller;
	}

	privAte _quickAccess: IQuickAccessController | undefined;
	get quickAccess(): IQuickAccessController {
		if (!this._quickAccess) {
			this._quickAccess = this._register(this.instAntiAtionService.creAteInstAnce(QuickAccessController));
		}

		return this._quickAccess;
	}

	privAte reAdonly contexts = new MAp<string, IContextKey<booleAn>>();

	constructor(
		@IInstAntiAtionService privAte reAdonly instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService protected reAdonly contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IAccessibilityService privAte reAdonly AccessibilityService: IAccessibilityService,
		@ILAyoutService protected reAdonly lAyoutService: ILAyoutService
	) {
		super(themeService);
	}

	protected creAteController(host: IQuickInputControllerHost = this.lAyoutService, options?: PArtiAl<IQuickInputOptions>): QuickInputController {
		const defAultOptions: IQuickInputOptions = {
			idPrefix: 'quickInput_', // ConstAnt since there is still only one.
			contAiner: host.contAiner,
			ignoreFocusOut: () => fAlse,
			isScreenReAderOptimized: () => this.AccessibilityService.isScreenReAderOptimized(),
			bAckKeybindingLAbel: () => undefined,
			setContextKey: (id?: string) => this.setContextKey(id),
			returnFocus: () => host.focus(),
			creAteList: <T>(
				user: string,
				contAiner: HTMLElement,
				delegAte: IListVirtuAlDelegAte<T>,
				renderers: IListRenderer<T, Any>[],
				options: IWorkbenchListOptions<T>,
			) => this.instAntiAtionService.creAteInstAnce(WorkbenchList, user, contAiner, delegAte, renderers, options) As List<T>,
			styles: this.computeStyles()
		};

		const controller = this._register(new QuickInputController({
			...defAultOptions,
			...options
		}));

		controller.lAyout(host.dimension, host.offset?.top ?? 0);

		// LAyout chAnges
		this._register(host.onLAyout(dimension => controller.lAyout(dimension, host.offset?.top ?? 0)));

		// Context keys
		this._register(controller.onShow(() => this.resetContextKeys()));
		this._register(controller.onHide(() => this.resetContextKeys()));

		return controller;
	}

	privAte setContextKey(id?: string) {
		let key: IContextKey<booleAn> | undefined;
		if (id) {
			key = this.contexts.get(id);
			if (!key) {
				key = new RAwContextKey<booleAn>(id, fAlse)
					.bindTo(this.contextKeyService);
				this.contexts.set(id, key);
			}
		}

		if (key && key.get()) {
			return; // AlreAdy Active context
		}

		this.resetContextKeys();

		if (key) {
			key.set(true);
		}
	}

	privAte resetContextKeys() {
		this.contexts.forEAch(context => {
			if (context.get()) {
				context.reset();
			}
		});
	}

	pick<T extends IQuickPickItem, O extends IPickOptions<T>>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options: O = <O>{}, token: CAncellAtionToken = CAncellAtionToken.None): Promise<(O extends { cAnPickMAny: true } ? T[] : T) | undefined> {
		return this.controller.pick(picks, options, token);
	}

	input(options: IInputOptions = {}, token: CAncellAtionToken = CAncellAtionToken.None): Promise<string | undefined> {
		return this.controller.input(options, token);
	}

	creAteQuickPick<T extends IQuickPickItem>(): IQuickPick<T> {
		return this.controller.creAteQuickPick();
	}

	creAteInputBox(): IInputBox {
		return this.controller.creAteInputBox();
	}

	focus() {
		this.controller.focus();
	}

	toggle() {
		this.controller.toggle();
	}

	nAvigAte(next: booleAn, quickNAvigAte?: IQuickNAvigAteConfigurAtion) {
		this.controller.nAvigAte(next, quickNAvigAte);
	}

	Accept(keyMods?: IKeyMods) {
		return this.controller.Accept(keyMods);
	}

	bAck() {
		return this.controller.bAck();
	}

	cAncel() {
		return this.controller.cAncel();
	}

	protected updAteStyles() {
		this.controller.ApplyStyles(this.computeStyles());
	}

	privAte computeStyles(): IQuickInputStyles {
		return {
			widget: {
				...computeStyles(this.theme, {
					quickInputBAckground,
					quickInputForeground,
					quickInputTitleBAckground,
					contrAstBorder,
					widgetShAdow
				}),
			},
			inputBox: computeStyles(this.theme, {
				inputForeground,
				inputBAckground,
				inputBorder,
				inputVAlidAtionInfoBAckground,
				inputVAlidAtionInfoForeground,
				inputVAlidAtionInfoBorder,
				inputVAlidAtionWArningBAckground,
				inputVAlidAtionWArningForeground,
				inputVAlidAtionWArningBorder,
				inputVAlidAtionErrorBAckground,
				inputVAlidAtionErrorForeground,
				inputVAlidAtionErrorBorder
			}),
			countBAdge: computeStyles(this.theme, {
				bAdgeBAckground,
				bAdgeForeground,
				bAdgeBorder: contrAstBorder
			}),
			button: computeStyles(this.theme, {
				buttonForeground,
				buttonBAckground,
				buttonHoverBAckground,
				buttonBorder: contrAstBorder
			}),
			progressBAr: computeStyles(this.theme, {
				progressBArBAckground
			}),
			list: computeStyles(this.theme, {
				listBAckground: quickInputBAckground,
				// Look like focused when inActive.
				listInActiveFocusForeground: listFocusForeground,
				listInActiveFocusBAckground: listFocusBAckground,
				listFocusOutline: ActiveContrAstBorder,
				listInActiveFocusOutline: ActiveContrAstBorder,
				pickerGroupBorder,
				pickerGroupForeground
			})
		};
	}
}
