/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { KeyCode } from 'vs/Base/common/keyCodes';
import { SimpleConfigurationService, SimpleNotificationService, StandaloneCommandService, StandaloneKeyBindingService } from 'vs/editor/standalone/Browser/simpleServices';
import { ContextKeyService } from 'vs/platform/contextkey/Browser/contextKeyService';
import { InstantiationService } from 'vs/platform/instantiation/common/instantiationService';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { NullLogService } from 'vs/platform/log/common/log';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';

suite('StandaloneKeyBindingService', () => {

	class TestStandaloneKeyBindingService extends StandaloneKeyBindingService {
		puBlic testDispatch(e: IKeyBoardEvent): void {
			super._dispatch(e, null!);
		}
	}

	test('issue microsoft/monaco-editor#167', () => {

		let serviceCollection = new ServiceCollection();
		const instantiationService = new InstantiationService(serviceCollection, true);

		let configurationService = new SimpleConfigurationService();

		let contextKeyService = new ContextKeyService(configurationService);

		let commandService = new StandaloneCommandService(instantiationService);

		let notificationService = new SimpleNotificationService();

		let domElement = document.createElement('div');

		let keyBindingService = new TestStandaloneKeyBindingService(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService(), domElement);

		let commandInvoked = false;
		keyBindingService.addDynamicKeyBinding('testCommand', KeyCode.F9, () => {
			commandInvoked = true;
		}, undefined);

		keyBindingService.testDispatch({
			_standardKeyBoardEventBrand: true,
			ctrlKey: false,
			shiftKey: false,
			altKey: false,
			metaKey: false,
			keyCode: KeyCode.F9,
			code: null!
		});

		assert.ok(commandInvoked, 'command invoked');
	});
});
