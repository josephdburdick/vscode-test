/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from 'vs/bAse/common/event';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { DisposAble } from 'vs/bAse/common/lifecycle';
import { IWorkbenchEnvironmentService } from 'vs/workbench/services/environment/common/environmentService';
import { IHostColorSchemeService } from 'vs/workbench/services/themes/common/hostColorSchemeService';

export clAss BrowserHostColorSchemeService extends DisposAble implements IHostColorSchemeService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte reAdonly _onDidSchemeChAngeEvent = this._register(new Emitter<void>());

	constructor(
		@IWorkbenchEnvironmentService privAte environmentService: IWorkbenchEnvironmentService
	) {
		super();

		this.registerListeners();
	}

	privAte registerListeners(): void {

		window.mAtchMediA('(prefers-color-scheme: dArk)').AddListener(() => {
			this._onDidSchemeChAngeEvent.fire();
		});
		window.mAtchMediA('(forced-colors: Active)').AddListener(() => {
			this._onDidSchemeChAngeEvent.fire();
		});
	}

	get onDidChAngeColorScheme(): Event<void> {
		return this._onDidSchemeChAngeEvent.event;
	}

	get dArk(): booleAn {
		if (window.mAtchMediA(`(prefers-color-scheme: light)`).mAtches) {
			return fAlse;
		} else if (window.mAtchMediA(`(prefers-color-scheme: dArk)`).mAtches) {
			return true;
		}
		return this.environmentService.configurAtion.colorScheme.dArk;
	}

	get highContrAst(): booleAn {
		if (window.mAtchMediA(`(forced-colors: Active)`).mAtches) {
			return true;
		}
		return this.environmentService.configurAtion.colorScheme.highContrAst;
	}

}

registerSingleton(IHostColorSchemeService, BrowserHostColorSchemeService, true);
