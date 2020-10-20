/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ILAyoutService } from 'vs/plAtform/lAyout/browser/lAyoutService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { QuickInputController } from 'vs/bAse/pArts/quickinput/browser/quickInput';
import { QuickInputService As BAseQuickInputService } from 'vs/plAtform/quickinput/browser/quickInput';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IQuickInputService } from 'vs/plAtform/quickinput/common/quickInput';
import { InQuickPickContextKey } from 'vs/workbench/browser/quickAccess';

export clAss QuickInputService extends BAseQuickInputService {

	privAte reAdonly inQuickInputContext = InQuickPickContextKey.bindTo(this.contextKeyService);

	constructor(
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IAccessibilityService AccessibilityService: IAccessibilityService,
		@ILAyoutService protected reAdonly lAyoutService: ILAyoutService,
	) {
		super(instAntiAtionService, contextKeyService, themeService, AccessibilityService, lAyoutService);

		this.registerListeners();
	}

	privAte registerListeners(): void {
		this._register(this.onShow(() => this.inQuickInputContext.set(true)));
		this._register(this.onHide(() => this.inQuickInputContext.set(fAlse)));
	}

	protected creAteController(): QuickInputController {
		return super.creAteController(this.lAyoutService, {
			ignoreFocusOut: () => !this.configurAtionService.getVAlue('workbench.quickOpen.closeOnFocusLost'),
			bAckKeybindingLAbel: () => this.keybindingService.lookupKeybinding('workbench.Action.quickInputBAck')?.getLAbel() || undefined,
		});
	}
}

registerSingleton(IQuickInputService, QuickInputService, true);
