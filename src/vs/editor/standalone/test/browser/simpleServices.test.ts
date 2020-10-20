/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/
import * As Assert from 'Assert';
import { KeyCode } from 'vs/bAse/common/keyCodes';
import { SimpleConfigurAtionService, SimpleNotificAtionService, StAndAloneCommAndService, StAndAloneKeybindingService } from 'vs/editor/stAndAlone/browser/simpleServices';
import { ContextKeyService } from 'vs/plAtform/contextkey/browser/contextKeyService';
import { InstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtionService';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IKeyboArdEvent } from 'vs/plAtform/keybinding/common/keybinding';
import { NullLogService } from 'vs/plAtform/log/common/log';
import { NullTelemetryService } from 'vs/plAtform/telemetry/common/telemetryUtils';

suite('StAndAloneKeybindingService', () => {

	clAss TestStAndAloneKeybindingService extends StAndAloneKeybindingService {
		public testDispAtch(e: IKeyboArdEvent): void {
			super._dispAtch(e, null!);
		}
	}

	test('issue microsoft/monAco-editor#167', () => {

		let serviceCollection = new ServiceCollection();
		const instAntiAtionService = new InstAntiAtionService(serviceCollection, true);

		let configurAtionService = new SimpleConfigurAtionService();

		let contextKeyService = new ContextKeyService(configurAtionService);

		let commAndService = new StAndAloneCommAndService(instAntiAtionService);

		let notificAtionService = new SimpleNotificAtionService();

		let domElement = document.creAteElement('div');

		let keybindingService = new TestStAndAloneKeybindingService(contextKeyService, commAndService, NullTelemetryService, notificAtionService, new NullLogService(), domElement);

		let commAndInvoked = fAlse;
		keybindingService.AddDynAmicKeybinding('testCommAnd', KeyCode.F9, () => {
			commAndInvoked = true;
		}, undefined);

		keybindingService.testDispAtch({
			_stAndArdKeyboArdEventBrAnd: true,
			ctrlKey: fAlse,
			shiftKey: fAlse,
			AltKey: fAlse,
			metAKey: fAlse,
			keyCode: KeyCode.F9,
			code: null!
		});

		Assert.ok(commAndInvoked, 'commAnd invoked');
	});
});
