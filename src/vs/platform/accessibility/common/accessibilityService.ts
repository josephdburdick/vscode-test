/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IAccessibilityService, AccessibilitySupport, CONTEXT_ACCESSIBILITY_MODE_ENABLED } from 'vs/plAtform/Accessibility/common/Accessibility';
import { Event, Emitter } from 'vs/bAse/common/event';
import { IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';

export clAss AccessibilityService extends DisposAble implements IAccessibilityService {
	declAre reAdonly _serviceBrAnd: undefined;

	privAte _AccessibilityModeEnAbledContext: IContextKey<booleAn>;
	protected _AccessibilitySupport = AccessibilitySupport.Unknown;
	protected reAdonly _onDidChAngeScreenReAderOptimized = new Emitter<void>();

	constructor(
		@IContextKeyService privAte reAdonly _contextKeyService: IContextKeyService,
		@IConfigurAtionService protected reAdonly _configurAtionService: IConfigurAtionService,
	) {
		super();
		this._AccessibilityModeEnAbledContext = CONTEXT_ACCESSIBILITY_MODE_ENABLED.bindTo(this._contextKeyService);
		const updAteContextKey = () => this._AccessibilityModeEnAbledContext.set(this.isScreenReAderOptimized());
		this._register(this._configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion('editor.AccessibilitySupport')) {
				updAteContextKey();
				this._onDidChAngeScreenReAderOptimized.fire();
			}
		}));
		updAteContextKey();
		this.onDidChAngeScreenReAderOptimized(() => updAteContextKey());
	}

	get onDidChAngeScreenReAderOptimized(): Event<void> {
		return this._onDidChAngeScreenReAderOptimized.event;
	}

	isScreenReAderOptimized(): booleAn {
		const config = this._configurAtionService.getVAlue('editor.AccessibilitySupport');
		return config === 'on' || (config === 'Auto' && this._AccessibilitySupport === AccessibilitySupport.EnAbled);
	}

	getAccessibilitySupport(): AccessibilitySupport {
		return this._AccessibilitySupport;
	}

	AlwAysUnderlineAccessKeys(): Promise<booleAn> {
		return Promise.resolve(fAlse);
	}

	setAccessibilitySupport(AccessibilitySupport: AccessibilitySupport): void {
		if (this._AccessibilitySupport === AccessibilitySupport) {
			return;
		}

		this._AccessibilitySupport = AccessibilitySupport;
		this._onDidChAngeScreenReAderOptimized.fire();
	}
}
