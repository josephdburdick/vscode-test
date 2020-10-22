/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IAccessiBilityService, AccessiBilitySupport, CONTEXT_ACCESSIBILITY_MODE_ENABLED } from 'vs/platform/accessiBility/common/accessiBility';
import { Event, Emitter } from 'vs/Base/common/event';
import { IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';

export class AccessiBilityService extends DisposaBle implements IAccessiBilityService {
	declare readonly _serviceBrand: undefined;

	private _accessiBilityModeEnaBledContext: IContextKey<Boolean>;
	protected _accessiBilitySupport = AccessiBilitySupport.Unknown;
	protected readonly _onDidChangeScreenReaderOptimized = new Emitter<void>();

	constructor(
		@IContextKeyService private readonly _contextKeyService: IContextKeyService,
		@IConfigurationService protected readonly _configurationService: IConfigurationService,
	) {
		super();
		this._accessiBilityModeEnaBledContext = CONTEXT_ACCESSIBILITY_MODE_ENABLED.BindTo(this._contextKeyService);
		const updateContextKey = () => this._accessiBilityModeEnaBledContext.set(this.isScreenReaderOptimized());
		this._register(this._configurationService.onDidChangeConfiguration(e => {
			if (e.affectsConfiguration('editor.accessiBilitySupport')) {
				updateContextKey();
				this._onDidChangeScreenReaderOptimized.fire();
			}
		}));
		updateContextKey();
		this.onDidChangeScreenReaderOptimized(() => updateContextKey());
	}

	get onDidChangeScreenReaderOptimized(): Event<void> {
		return this._onDidChangeScreenReaderOptimized.event;
	}

	isScreenReaderOptimized(): Boolean {
		const config = this._configurationService.getValue('editor.accessiBilitySupport');
		return config === 'on' || (config === 'auto' && this._accessiBilitySupport === AccessiBilitySupport.EnaBled);
	}

	getAccessiBilitySupport(): AccessiBilitySupport {
		return this._accessiBilitySupport;
	}

	alwaysUnderlineAccessKeys(): Promise<Boolean> {
		return Promise.resolve(false);
	}

	setAccessiBilitySupport(accessiBilitySupport: AccessiBilitySupport): void {
		if (this._accessiBilitySupport === accessiBilitySupport) {
			return;
		}

		this._accessiBilitySupport = accessiBilitySupport;
		this._onDidChangeScreenReaderOptimized.fire();
	}
}
