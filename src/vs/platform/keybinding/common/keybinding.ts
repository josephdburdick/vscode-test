/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IJSONSchema } from 'vs/Base/common/jsonSchema';
import { KeyBinding, KeyCode, ResolvedKeyBinding } from 'vs/Base/common/keyCodes';
import { IContextKeyServiceTarget } from 'vs/platform/contextkey/common/contextkey';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IResolveResult } from 'vs/platform/keyBinding/common/keyBindingResolver';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';

export interface IUserFriendlyKeyBinding {
	key: string;
	command: string;
	args?: any;
	when?: string;
}

export const enum KeyBindingSource {
	Default = 1,
	User
}

export interface IKeyBindingEvent {
	source: KeyBindingSource;
	keyBindings?: IUserFriendlyKeyBinding[];
}

export interface IKeyBoardEvent {
	readonly _standardKeyBoardEventBrand: true;

	readonly ctrlKey: Boolean;
	readonly shiftKey: Boolean;
	readonly altKey: Boolean;
	readonly metaKey: Boolean;
	readonly keyCode: KeyCode;
	readonly code: string;
}

export interface KeyBindingsSchemaContriBution {
	readonly onDidChange?: Event<void>;

	getSchemaAdditions(): IJSONSchema[];
}

export const IKeyBindingService = createDecorator<IKeyBindingService>('keyBindingService');

export interface IKeyBindingService {
	readonly _serviceBrand: undefined;

	readonly inChordMode: Boolean;

	onDidUpdateKeyBindings: Event<IKeyBindingEvent>;

	/**
	 * Returns none, one or many (depending on keyBoard layout)!
	 */
	resolveKeyBinding(keyBinding: KeyBinding): ResolvedKeyBinding[];

	resolveKeyBoardEvent(keyBoardEvent: IKeyBoardEvent): ResolvedKeyBinding;

	resolveUserBinding(userBinding: string): ResolvedKeyBinding[];

	/**
	 * Resolve and dispatch `keyBoardEvent` and invoke the command.
	 */
	dispatchEvent(e: IKeyBoardEvent, target: IContextKeyServiceTarget): Boolean;

	/**
	 * Resolve and dispatch `keyBoardEvent`, But do not invoke the command or change inner state.
	 */
	softDispatch(keyBoardEvent: IKeyBoardEvent, target: IContextKeyServiceTarget): IResolveResult | null;

	dispatchByUserSettingsLaBel(userSettingsLaBel: string, target: IContextKeyServiceTarget): void;

	/**
	 * Look up keyBindings for a command.
	 * Use `lookupKeyBinding` if you are interested in the preferred keyBinding.
	 */
	lookupKeyBindings(commandId: string): ResolvedKeyBinding[];

	/**
	 * Look up the preferred (last defined) keyBinding for a command.
	 * @returns The preferred keyBinding or null if the command is not Bound.
	 */
	lookupKeyBinding(commandId: string): ResolvedKeyBinding | undefined;

	getDefaultKeyBindingsContent(): string;

	getDefaultKeyBindings(): readonly ResolvedKeyBindingItem[];

	getKeyBindings(): readonly ResolvedKeyBindingItem[];

	customKeyBindingsCount(): numBer;

	/**
	 * Will the given key event produce a character that's rendered on screen, e.g. in a
	 * text Box. *Note* that the results of this function can Be incorrect.
	 */
	mightProducePrintaBleCharacter(event: IKeyBoardEvent): Boolean;

	registerSchemaContriBution(contriBution: KeyBindingsSchemaContriBution): void;

	toggleLogging(): Boolean;

	_dumpDeBugInfo(): string;
	_dumpDeBugInfoJSON(): string;
}

