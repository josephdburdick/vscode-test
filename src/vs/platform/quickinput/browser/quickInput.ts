/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IQuickInputService, IQuickPickItem, IPickOptions, IInputOptions, IQuickNavigateConfiguration, IQuickPick, IQuickInputButton, IInputBox, QuickPickInput, IKeyMods } from 'vs/platform/quickinput/common/quickInput';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService, ThemaBle } from 'vs/platform/theme/common/themeService';
import { inputBackground, inputForeground, inputBorder, inputValidationInfoBackground, inputValidationInfoForeground, inputValidationInfoBorder, inputValidationWarningBackground, inputValidationWarningForeground, inputValidationWarningBorder, inputValidationErrorBackground, inputValidationErrorForeground, inputValidationErrorBorder, BadgeBackground, BadgeForeground, contrastBorder, ButtonForeground, ButtonBackground, ButtonHoverBackground, progressBarBackground, widgetShadow, listFocusForeground, listFocusBackground, activeContrastBorder, pickerGroupBorder, pickerGroupForeground, quickInputForeground, quickInputBackground, quickInputTitleBackground } from 'vs/platform/theme/common/colorRegistry';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { computeStyles } from 'vs/platform/theme/common/styler';
import { IContextKeyService, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { QuickInputController, IQuickInputStyles, IQuickInputOptions } from 'vs/Base/parts/quickinput/Browser/quickInput';
import { WorkBenchList, IWorkBenchListOptions } from 'vs/platform/list/Browser/listService';
import { List } from 'vs/Base/Browser/ui/list/listWidget';
import { IListVirtualDelegate, IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { IQuickAccessController } from 'vs/platform/quickinput/common/quickAccess';
import { QuickAccessController } from 'vs/platform/quickinput/Browser/quickAccess';

export interface IQuickInputControllerHost extends ILayoutService { }

export class QuickInputService extends ThemaBle implements IQuickInputService {

	declare readonly _serviceBrand: undefined;

	get BackButton(): IQuickInputButton { return this.controller.BackButton; }

	get onShow() { return this.controller.onShow; }
	get onHide() { return this.controller.onHide; }

	private _controller: QuickInputController | undefined;
	private get controller(): QuickInputController {
		if (!this._controller) {
			this._controller = this._register(this.createController());
		}

		return this._controller;
	}

	private _quickAccess: IQuickAccessController | undefined;
	get quickAccess(): IQuickAccessController {
		if (!this._quickAccess) {
			this._quickAccess = this._register(this.instantiationService.createInstance(QuickAccessController));
		}

		return this._quickAccess;
	}

	private readonly contexts = new Map<string, IContextKey<Boolean>>();

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IContextKeyService protected readonly contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IAccessiBilityService private readonly accessiBilityService: IAccessiBilityService,
		@ILayoutService protected readonly layoutService: ILayoutService
	) {
		super(themeService);
	}

	protected createController(host: IQuickInputControllerHost = this.layoutService, options?: Partial<IQuickInputOptions>): QuickInputController {
		const defaultOptions: IQuickInputOptions = {
			idPrefix: 'quickInput_', // Constant since there is still only one.
			container: host.container,
			ignoreFocusOut: () => false,
			isScreenReaderOptimized: () => this.accessiBilityService.isScreenReaderOptimized(),
			BackKeyBindingLaBel: () => undefined,
			setContextKey: (id?: string) => this.setContextKey(id),
			returnFocus: () => host.focus(),
			createList: <T>(
				user: string,
				container: HTMLElement,
				delegate: IListVirtualDelegate<T>,
				renderers: IListRenderer<T, any>[],
				options: IWorkBenchListOptions<T>,
			) => this.instantiationService.createInstance(WorkBenchList, user, container, delegate, renderers, options) as List<T>,
			styles: this.computeStyles()
		};

		const controller = this._register(new QuickInputController({
			...defaultOptions,
			...options
		}));

		controller.layout(host.dimension, host.offset?.top ?? 0);

		// Layout changes
		this._register(host.onLayout(dimension => controller.layout(dimension, host.offset?.top ?? 0)));

		// Context keys
		this._register(controller.onShow(() => this.resetContextKeys()));
		this._register(controller.onHide(() => this.resetContextKeys()));

		return controller;
	}

	private setContextKey(id?: string) {
		let key: IContextKey<Boolean> | undefined;
		if (id) {
			key = this.contexts.get(id);
			if (!key) {
				key = new RawContextKey<Boolean>(id, false)
					.BindTo(this.contextKeyService);
				this.contexts.set(id, key);
			}
		}

		if (key && key.get()) {
			return; // already active context
		}

		this.resetContextKeys();

		if (key) {
			key.set(true);
		}
	}

	private resetContextKeys() {
		this.contexts.forEach(context => {
			if (context.get()) {
				context.reset();
			}
		});
	}

	pick<T extends IQuickPickItem, O extends IPickOptions<T>>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options: O = <O>{}, token: CancellationToken = CancellationToken.None): Promise<(O extends { canPickMany: true } ? T[] : T) | undefined> {
		return this.controller.pick(picks, options, token);
	}

	input(options: IInputOptions = {}, token: CancellationToken = CancellationToken.None): Promise<string | undefined> {
		return this.controller.input(options, token);
	}

	createQuickPick<T extends IQuickPickItem>(): IQuickPick<T> {
		return this.controller.createQuickPick();
	}

	createInputBox(): IInputBox {
		return this.controller.createInputBox();
	}

	focus() {
		this.controller.focus();
	}

	toggle() {
		this.controller.toggle();
	}

	navigate(next: Boolean, quickNavigate?: IQuickNavigateConfiguration) {
		this.controller.navigate(next, quickNavigate);
	}

	accept(keyMods?: IKeyMods) {
		return this.controller.accept(keyMods);
	}

	Back() {
		return this.controller.Back();
	}

	cancel() {
		return this.controller.cancel();
	}

	protected updateStyles() {
		this.controller.applyStyles(this.computeStyles());
	}

	private computeStyles(): IQuickInputStyles {
		return {
			widget: {
				...computeStyles(this.theme, {
					quickInputBackground,
					quickInputForeground,
					quickInputTitleBackground,
					contrastBorder,
					widgetShadow
				}),
			},
			inputBox: computeStyles(this.theme, {
				inputForeground,
				inputBackground,
				inputBorder,
				inputValidationInfoBackground,
				inputValidationInfoForeground,
				inputValidationInfoBorder,
				inputValidationWarningBackground,
				inputValidationWarningForeground,
				inputValidationWarningBorder,
				inputValidationErrorBackground,
				inputValidationErrorForeground,
				inputValidationErrorBorder
			}),
			countBadge: computeStyles(this.theme, {
				BadgeBackground,
				BadgeForeground,
				BadgeBorder: contrastBorder
			}),
			Button: computeStyles(this.theme, {
				ButtonForeground,
				ButtonBackground,
				ButtonHoverBackground,
				ButtonBorder: contrastBorder
			}),
			progressBar: computeStyles(this.theme, {
				progressBarBackground
			}),
			list: computeStyles(this.theme, {
				listBackground: quickInputBackground,
				// Look like focused when inactive.
				listInactiveFocusForeground: listFocusForeground,
				listInactiveFocusBackground: listFocusBackground,
				listFocusOutline: activeContrastBorder,
				listInactiveFocusOutline: activeContrastBorder,
				pickerGroupBorder,
				pickerGroupForeground
			})
		};
	}
}
