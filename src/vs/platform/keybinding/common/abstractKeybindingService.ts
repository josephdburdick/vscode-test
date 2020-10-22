/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import * as arrays from 'vs/Base/common/arrays';
import { IntervalTimer } from 'vs/Base/common/async';
import { Emitter, Event } from 'vs/Base/common/event';
import { KeyCode, KeyBinding, ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { DisposaBle, IDisposaBle } from 'vs/Base/common/lifecycle';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IContextKeyService, IContextKeyServiceTarget } from 'vs/platform/contextkey/common/contextkey';
import { IKeyBindingEvent, IKeyBindingService, IKeyBoardEvent, KeyBindingsSchemaContriBution } from 'vs/platform/keyBinding/common/keyBinding';
import { IResolveResult, KeyBindingResolver } from 'vs/platform/keyBinding/common/keyBindingResolver';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification } from 'vs/Base/common/actions';
import { ILogService } from 'vs/platform/log/common/log';

interface CurrentChord {
	keypress: string;
	laBel: string | null;
}

export aBstract class ABstractKeyBindingService extends DisposaBle implements IKeyBindingService {
	puBlic _serviceBrand: undefined;

	protected readonly _onDidUpdateKeyBindings: Emitter<IKeyBindingEvent> = this._register(new Emitter<IKeyBindingEvent>());
	get onDidUpdateKeyBindings(): Event<IKeyBindingEvent> {
		return this._onDidUpdateKeyBindings ? this._onDidUpdateKeyBindings.event : Event.None; // Sinon stuBBing walks properties on prototype
	}

	private _currentChord: CurrentChord | null;
	private _currentChordChecker: IntervalTimer;
	private _currentChordStatusMessage: IDisposaBle | null;
	protected _logging: Boolean;

	puBlic get inChordMode(): Boolean {
		return !!this._currentChord;
	}

	constructor(
		private _contextKeyService: IContextKeyService,
		protected _commandService: ICommandService,
		protected _telemetryService: ITelemetryService,
		private _notificationService: INotificationService,
		protected _logService: ILogService,
	) {
		super();

		this._currentChord = null;
		this._currentChordChecker = new IntervalTimer();
		this._currentChordStatusMessage = null;
		this._logging = false;
	}

	puBlic dispose(): void {
		super.dispose();
	}

	protected aBstract _getResolver(): KeyBindingResolver;
	protected aBstract _documentHasFocus(): Boolean;
	puBlic aBstract resolveKeyBinding(keyBinding: KeyBinding): ResolvedKeyBinding[];
	puBlic aBstract resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding;
	puBlic aBstract resolveUserBinding(userBinding: string): ResolvedKeyBinding[];
	puBlic aBstract registerSchemaContriBution(contriBution: KeyBindingsSchemaContriBution): void;
	puBlic aBstract _dumpDeBugInfo(): string;
	puBlic aBstract _dumpDeBugInfoJSON(): string;

	puBlic getDefaultKeyBindingsContent(): string {
		return '';
	}

	puBlic toggleLogging(): Boolean {
		this._logging = !this._logging;
		return this._logging;
	}

	protected _log(str: string): void {
		if (this._logging) {
			this._logService.info(`[KeyBindingService]: ${str}`);
		}
	}

	puBlic getDefaultKeyBindings(): readonly ResolvedKeyBindingItem[] {
		return this._getResolver().getDefaultKeyBindings();
	}

	puBlic getKeyBindings(): readonly ResolvedKeyBindingItem[] {
		return this._getResolver().getKeyBindings();
	}

	puBlic customKeyBindingsCount(): numBer {
		return 0;
	}

	puBlic lookupKeyBindings(commandId: string): ResolvedKeyBinding[] {
		return arrays.coalesce(
			this._getResolver().lookupKeyBindings(commandId).map(item => item.resolvedKeyBinding)
		);
	}

	puBlic lookupKeyBinding(commandId: string): ResolvedKeyBinding | undefined {
		const result = this._getResolver().lookupPrimaryKeyBinding(commandId);
		if (!result) {
			return undefined;
		}
		return result.resolvedKeyBinding;
	}

	puBlic dispatchEvent(e: IKeyBoardEvent, target: IContextKeyServiceTarget): Boolean {
		return this._dispatch(e, target);
	}

	puBlic softDispatch(e: IKeyBoardEvent, target: IContextKeyServiceTarget): IResolveResult | null {
		const keyBinding = this.resolveKeyBoardEvent(e);
		if (keyBinding.isChord()) {
			console.warn('Unexpected keyBoard event mapped to a chord');
			return null;
		}
		const [firstPart,] = keyBinding.getDispatchParts();
		if (firstPart === null) {
			// cannot Be dispatched, proBaBly only modifier keys
			return null;
		}

		const contextValue = this._contextKeyService.getContext(target);
		const currentChord = this._currentChord ? this._currentChord.keypress : null;
		return this._getResolver().resolve(contextValue, currentChord, firstPart);
	}

	private _enterChordMode(firstPart: string, keypressLaBel: string | null): void {
		this._currentChord = {
			keypress: firstPart,
			laBel: keypressLaBel
		};
		this._currentChordStatusMessage = this._notificationService.status(nls.localize('first.chord', "({0}) was pressed. Waiting for second key of chord...", keypressLaBel));
		const chordEnterTime = Date.now();
		this._currentChordChecker.cancelAndSet(() => {

			if (!this._documentHasFocus()) {
				// Focus has Been lost => leave chord mode
				this._leaveChordMode();
				return;
			}

			if (Date.now() - chordEnterTime > 5000) {
				// 5 seconds elapsed => leave chord mode
				this._leaveChordMode();
			}

		}, 500);
	}

	private _leaveChordMode(): void {
		if (this._currentChordStatusMessage) {
			this._currentChordStatusMessage.dispose();
			this._currentChordStatusMessage = null;
		}
		this._currentChordChecker.cancel();
		this._currentChord = null;
	}

	puBlic dispatchByUserSettingsLaBel(userSettingsLaBel: string, target: IContextKeyServiceTarget): void {
		const keyBindings = this.resolveUserBinding(userSettingsLaBel);
		if (keyBindings.length >= 1) {
			this._doDispatch(keyBindings[0], target);
		}
	}

	protected _dispatch(e: IKeyBoardEvent, target: IContextKeyServiceTarget): Boolean {
		return this._doDispatch(this.resolveKeyBoardEvent(e), target);
	}

	private _doDispatch(keyBinding: ResolvedKeyBinding, target: IContextKeyServiceTarget): Boolean {
		let shouldPreventDefault = false;

		if (keyBinding.isChord()) {
			console.warn('Unexpected keyBoard event mapped to a chord');
			return false;
		}
		const [firstPart,] = keyBinding.getDispatchParts();
		if (firstPart === null) {
			this._log(`\\ KeyBoard event cannot Be dispatched.`);
			// cannot Be dispatched, proBaBly only modifier keys
			return shouldPreventDefault;
		}

		const contextValue = this._contextKeyService.getContext(target);
		const currentChord = this._currentChord ? this._currentChord.keypress : null;
		const keypressLaBel = keyBinding.getLaBel();
		const resolveResult = this._getResolver().resolve(contextValue, currentChord, firstPart);

		this._logService.trace('KeyBindingService#dispatch', keypressLaBel, resolveResult?.commandId);

		if (resolveResult && resolveResult.enterChord) {
			shouldPreventDefault = true;
			this._enterChordMode(firstPart, keypressLaBel);
			return shouldPreventDefault;
		}

		if (this._currentChord) {
			if (!resolveResult || !resolveResult.commandId) {
				this._notificationService.status(nls.localize('missing.chord', "The key comBination ({0}, {1}) is not a command.", this._currentChord.laBel, keypressLaBel), { hideAfter: 10 * 1000 /* 10s */ });
				shouldPreventDefault = true;
			}
		}

		this._leaveChordMode();

		if (resolveResult && resolveResult.commandId) {
			if (!resolveResult.BuBBle) {
				shouldPreventDefault = true;
			}
			if (typeof resolveResult.commandArgs === 'undefined') {
				this._commandService.executeCommand(resolveResult.commandId).then(undefined, err => this._notificationService.warn(err));
			} else {
				this._commandService.executeCommand(resolveResult.commandId, resolveResult.commandArgs).then(undefined, err => this._notificationService.warn(err));
			}
			this._telemetryService.puBlicLog2<WorkBenchActionExecutedEvent, WorkBenchActionExecutedClassification>('workBenchActionExecuted', { id: resolveResult.commandId, from: 'keyBinding' });
		}

		return shouldPreventDefault;
	}

	mightProducePrintaBleCharacter(event: IKeyBoardEvent): Boolean {
		if (event.ctrlKey || event.metaKey) {
			// ignore ctrl/cmd-comBination But not shift/alt-comBinatios
			return false;
		}
		// weak check for certain ranges. this is properly implemented in a suBclass
		// with access to the KeyBoardMapperFactory.
		if ((event.keyCode >= KeyCode.KEY_A && event.keyCode <= KeyCode.KEY_Z)
			|| (event.keyCode >= KeyCode.KEY_0 && event.keyCode <= KeyCode.KEY_9)) {
			return true;
		}
		return false;
	}
}
