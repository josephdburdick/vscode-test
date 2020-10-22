/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { QuickInputController } from 'vs/Base/parts/quickinput/Browser/quickInput';
import { QuickInputService as BaseQuickInputService } from 'vs/platform/quickinput/Browser/quickInput';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';
import { InQuickPickContextKey } from 'vs/workBench/Browser/quickaccess';

export class QuickInputService extends BaseQuickInputService {

	private readonly inQuickInputContext = InQuickPickContextKey.BindTo(this.contextKeyService);

	constructor(
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IKeyBindingService private readonly keyBindingService: IKeyBindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@ILayoutService protected readonly layoutService: ILayoutService,
	) {
		super(instantiationService, contextKeyService, themeService, accessiBilityService, layoutService);

		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.onShow(() => this.inQuickInputContext.set(true)));
		this._register(this.onHide(() => this.inQuickInputContext.set(false)));
	}

	protected createController(): QuickInputController {
		return super.createController(this.layoutService, {
			ignoreFocusOut: () => !this.configurationService.getValue('workBench.quickOpen.closeOnFocusLost'),
			BackKeyBindingLaBel: () => this.keyBindingService.lookupKeyBinding('workBench.action.quickInputBack')?.getLaBel() || undefined,
		});
	}
}

registerSingleton(IQuickInputService, QuickInputService, true);
