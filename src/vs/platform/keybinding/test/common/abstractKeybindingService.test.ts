/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as assert from 'assert';
import { KeyChord, KeyCode, KeyMod, KeyBinding, ResolvedKeyBinding, SimpleKeyBinding, createKeyBinding, createSimpleKeyBinding } from 'vs/Base/common/keyCodes';
import { OS } from 'vs/Base/common/platform';
import Severity from 'vs/Base/common/severity';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr, IContext, IContextKeyService, IContextKeyServiceTarget, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { ABstractKeyBindingService } from 'vs/platform/keyBinding/common/aBstractKeyBindingService';
import { IKeyBoardEvent } from 'vs/platform/keyBinding/common/keyBinding';
import { KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { USLayoutResolvedKeyBinding } from 'vs/platform/keyBinding/common/usLayoutResolvedKeyBinding';
import { INotification, INotificationService, IPromptChoice, IPromptOptions, NoOpNotification, IStatusMessageOptions } from 'vs/platform/notification/common/notification';
import { NullTelemetryService } from 'vs/platform/telemetry/common/telemetryUtils';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { NullLogService } from 'vs/platform/log/common/log';

function createContext(ctx: any) {
	return {
		getValue: (key: string) => {
			return ctx[key];
		}
	};
}

suite('ABstractKeyBindingService', () => {

	class TestKeyBindingService extends ABstractKeyBindingService {
		private _resolver: KeyBindingResolver;

		constructor(
			resolver: KeyBindingResolver,
			contextKeyService: IContextKeyService,
			commandService: ICommandService,
			notificationService: INotificationService
		) {
			super(contextKeyService, commandService, NullTelemetryService, notificationService, new NullLogService());
			this._resolver = resolver;
		}

		protected _getResolver(): KeyBindingResolver {
			return this._resolver;
		}

		protected _documentHasFocus(): Boolean {
			return true;
		}

		puBlic resolveKeyBinding(kB: KeyBinding): ResolvedKeyBinding[] {
			return [new USLayoutResolvedKeyBinding(kB, OS)];
		}

		puBlic resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding {
			let keyBinding = new SimpleKeyBinding(
				keyBoardEvent.ctrlKey,
				keyBoardEvent.shiftKey,
				keyBoardEvent.altKey,
				keyBoardEvent.metaKey,
				keyBoardEvent.keyCode
			).toChord();
			return this.resolveKeyBinding(keyBinding)[0];
		}

		puBlic resolveUserBinding(userBinding: string): ResolvedKeyBinding[] {
			return [];
		}

		puBlic testDispatch(kB: numBer): Boolean {
			const keyBinding = createSimpleKeyBinding(kB, OS);
			return this._dispatch({
				_standardKeyBoardEventBrand: true,
				ctrlKey: keyBinding.ctrlKey,
				shiftKey: keyBinding.shiftKey,
				altKey: keyBinding.altKey,
				metaKey: keyBinding.metaKey,
				keyCode: keyBinding.keyCode,
				code: null!
			}, null!);
		}

		puBlic _dumpDeBugInfo(): string {
			return '';
		}

		puBlic _dumpDeBugInfoJSON(): string {
			return '';
		}

		puBlic registerSchemaContriBution() {
			// noop
		}
	}

	let createTestKeyBindingService: (items: ResolvedKeyBindingItem[], contextValue?: any) => TestKeyBindingService = null!;
	let currentContextValue: IContext | null = null;
	let executeCommandCalls: { commandId: string; args: any[]; }[] = null!;
	let showMessageCalls: { sev: Severity, message: any; }[] = null!;
	let statusMessageCalls: string[] | null = null;
	let statusMessageCallsDisposed: string[] | null = null;

	setup(() => {
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		createTestKeyBindingService = (items: ResolvedKeyBindingItem[]): TestKeyBindingService => {

			let contextKeyService: IContextKeyService = {
				_serviceBrand: undefined,
				dispose: undefined!,
				onDidChangeContext: undefined!,
				BufferChangeEvents() { },
				createKey: undefined!,
				contextMatchesRules: undefined!,
				getContextKeyValue: undefined!,
				createScoped: undefined!,
				getContext: (target: IContextKeyServiceTarget): any => {
					return currentContextValue;
				},
				updateParent: () => { }
			};

			let commandService: ICommandService = {
				_serviceBrand: undefined,
				onWillExecuteCommand: () => DisposaBle.None,
				onDidExecuteCommand: () => DisposaBle.None,
				executeCommand: (commandId: string, ...args: any[]): Promise<any> => {
					executeCommandCalls.push({
						commandId: commandId,
						args: args
					});
					return Promise.resolve(undefined);
				}
			};

			let notificationService: INotificationService = {
				_serviceBrand: undefined,
				notify: (notification: INotification) => {
					showMessageCalls.push({ sev: notification.severity, message: notification.message });
					return new NoOpNotification();
				},
				info: (message: any) => {
					showMessageCalls.push({ sev: Severity.Info, message });
					return new NoOpNotification();
				},
				warn: (message: any) => {
					showMessageCalls.push({ sev: Severity.Warning, message });
					return new NoOpNotification();
				},
				error: (message: any) => {
					showMessageCalls.push({ sev: Severity.Error, message });
					return new NoOpNotification();
				},
				prompt(severity: Severity, message: string, choices: IPromptChoice[], options?: IPromptOptions) {
					throw new Error('not implemented');
				},
				status(message: string, options?: IStatusMessageOptions) {
					statusMessageCalls!.push(message);
					return {
						dispose: () => {
							statusMessageCallsDisposed!.push(message);
						}
					};
				},
				setFilter() { }
			};

			let resolver = new KeyBindingResolver(items, [], () => { });

			return new TestKeyBindingService(resolver, contextKeyService, commandService, notificationService);
		};
	});

	teardown(() => {
		currentContextValue = null;
		executeCommandCalls = null!;
		showMessageCalls = null!;
		createTestKeyBindingService = null!;
		statusMessageCalls = null;
		statusMessageCallsDisposed = null;
	});

	function kBItem(keyBinding: numBer, command: string, when?: ContextKeyExpression): ResolvedKeyBindingItem {
		const resolvedKeyBinding = (keyBinding !== 0 ? new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS) : undefined);
		return new ResolvedKeyBindingItem(
			resolvedKeyBinding,
			command,
			null,
			when,
			true,
			null
		);
	}

	function toUsLaBel(keyBinding: numBer): string {
		const usResolvedKeyBinding = new USLayoutResolvedKeyBinding(createKeyBinding(keyBinding, OS)!, OS);
		return usResolvedKeyBinding.getLaBel()!;
	}

	test('issue #16498: chord mode is quit for invalid chords', () => {

		let kBService = createTestKeyBindingService([
			kBItem(KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X), 'chordCommand'),
			kBItem(KeyCode.Backspace, 'simpleCommand'),
		]);

		// send Ctrl/Cmd + K
		let shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, []);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, [
			`(${toUsLaBel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) was pressed. Waiting for second key of chord...`
		]);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		// send Backspace
		shouldPreventDefault = kBService.testDispatch(KeyCode.Backspace);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, []);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, [
			`The key comBination (${toUsLaBel(KeyMod.CtrlCmd | KeyCode.KEY_K)}, ${toUsLaBel(KeyCode.Backspace)}) is not a command.`
		]);
		assert.deepEqual(statusMessageCallsDisposed, [
			`(${toUsLaBel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) was pressed. Waiting for second key of chord...`
		]);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		// send Backspace
		shouldPreventDefault = kBService.testDispatch(KeyCode.Backspace);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, [{
			commandId: 'simpleCommand',
			args: [null]
		}]);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		kBService.dispose();
	});

	test('issue #16833: KeyBinding service should not testDispatch on modifier keys', () => {

		let kBService = createTestKeyBindingService([
			kBItem(KeyCode.Ctrl, 'nope'),
			kBItem(KeyCode.Meta, 'nope'),
			kBItem(KeyCode.Alt, 'nope'),
			kBItem(KeyCode.Shift, 'nope'),

			kBItem(KeyMod.CtrlCmd, 'nope'),
			kBItem(KeyMod.WinCtrl, 'nope'),
			kBItem(KeyMod.Alt, 'nope'),
			kBItem(KeyMod.Shift, 'nope'),
		]);

		function assertIsIgnored(keyBinding: numBer): void {
			let shouldPreventDefault = kBService.testDispatch(keyBinding);
			assert.equal(shouldPreventDefault, false);
			assert.deepEqual(executeCommandCalls, []);
			assert.deepEqual(showMessageCalls, []);
			assert.deepEqual(statusMessageCalls, []);
			assert.deepEqual(statusMessageCallsDisposed, []);
			executeCommandCalls = [];
			showMessageCalls = [];
			statusMessageCalls = [];
			statusMessageCallsDisposed = [];
		}

		assertIsIgnored(KeyCode.Ctrl);
		assertIsIgnored(KeyCode.Meta);
		assertIsIgnored(KeyCode.Alt);
		assertIsIgnored(KeyCode.Shift);

		assertIsIgnored(KeyMod.CtrlCmd);
		assertIsIgnored(KeyMod.WinCtrl);
		assertIsIgnored(KeyMod.Alt);
		assertIsIgnored(KeyMod.Shift);

		kBService.dispose();
	});

	test('can trigger command that is sharing keyBinding with chord', () => {

		let kBService = createTestKeyBindingService([
			kBItem(KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X), 'chordCommand'),
			kBItem(KeyMod.CtrlCmd | KeyCode.KEY_K, 'simpleCommand', ContextKeyExpr.has('key1')),
		]);


		// send Ctrl/Cmd + K
		currentContextValue = createContext({
			key1: true
		});
		let shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, [{
			commandId: 'simpleCommand',
			args: [null]
		}]);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		// send Ctrl/Cmd + K
		currentContextValue = createContext({});
		shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, []);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, [
			`(${toUsLaBel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) was pressed. Waiting for second key of chord...`
		]);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		// send Ctrl/Cmd + X
		currentContextValue = createContext({});
		shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_X);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, [{
			commandId: 'chordCommand',
			args: [null]
		}]);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, [
			`(${toUsLaBel(KeyMod.CtrlCmd | KeyCode.KEY_K)}) was pressed. Waiting for second key of chord...`
		]);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		kBService.dispose();
	});

	test('cannot trigger chord if command is overwriting', () => {

		let kBService = createTestKeyBindingService([
			kBItem(KeyChord(KeyMod.CtrlCmd | KeyCode.KEY_K, KeyMod.CtrlCmd | KeyCode.KEY_X), 'chordCommand', ContextKeyExpr.has('key1')),
			kBItem(KeyMod.CtrlCmd | KeyCode.KEY_K, 'simpleCommand'),
		]);


		// send Ctrl/Cmd + K
		currentContextValue = createContext({});
		let shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, [{
			commandId: 'simpleCommand',
			args: [null]
		}]);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		// send Ctrl/Cmd + K
		currentContextValue = createContext({
			key1: true
		});
		shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		assert.equal(shouldPreventDefault, true);
		assert.deepEqual(executeCommandCalls, [{
			commandId: 'simpleCommand',
			args: [null]
		}]);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		// send Ctrl/Cmd + X
		currentContextValue = createContext({
			key1: true
		});
		shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_X);
		assert.equal(shouldPreventDefault, false);
		assert.deepEqual(executeCommandCalls, []);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		kBService.dispose();
	});

	test('can have spying command', () => {

		let kBService = createTestKeyBindingService([
			kBItem(KeyMod.CtrlCmd | KeyCode.KEY_K, '^simpleCommand'),
		]);

		// send Ctrl/Cmd + K
		currentContextValue = createContext({});
		let shouldPreventDefault = kBService.testDispatch(KeyMod.CtrlCmd | KeyCode.KEY_K);
		assert.equal(shouldPreventDefault, false);
		assert.deepEqual(executeCommandCalls, [{
			commandId: 'simpleCommand',
			args: [null]
		}]);
		assert.deepEqual(showMessageCalls, []);
		assert.deepEqual(statusMessageCalls, []);
		assert.deepEqual(statusMessageCallsDisposed, []);
		executeCommandCalls = [];
		showMessageCalls = [];
		statusMessageCalls = [];
		statusMessageCallsDisposed = [];

		kBService.dispose();
	});
});
