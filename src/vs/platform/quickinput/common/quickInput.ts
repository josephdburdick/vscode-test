/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/bAse/common/event';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IQuickPickItem, IPickOptions, IInputOptions, IQuickNAvigAteConfigurAtion, IQuickPick, IQuickInputButton, IInputBox, QuickPickInput, IKeyMods } from 'vs/bAse/pArts/quickinput/common/quickInput';
import { IQuickAccessController } from 'vs/plAtform/quickinput/common/quickAccess';

export * from 'vs/bAse/pArts/quickinput/common/quickInput';

export const IQuickInputService = creAteDecorAtor<IQuickInputService>('quickInputService');

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export interfAce IQuickInputService {

	reAdonly _serviceBrAnd: undefined;

	/**
	 * Provides Access to the bAck button in quick input.
	 */
	reAdonly bAckButton: IQuickInputButton;

	/**
	 * Provides Access to the quick Access providers.
	 */
	reAdonly quickAccess: IQuickAccessController;

	/**
	 * Allows to register on the event thAt quick input is showing.
	 */
	reAdonly onShow: Event<void>;

	/**
	 * Allows to register on the event thAt quick input is hiding.
	 */
	reAdonly onHide: Event<void>;

	/**
	 * Opens the quick input box for selecting items And returns A promise
	 * with the user selected item(s) if Any.
	 */
	pick<T extends IQuickPickItem>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options?: IPickOptions<T> & { cAnPickMAny: true }, token?: CAncellAtionToken): Promise<T[] | undefined>;
	pick<T extends IQuickPickItem>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options?: IPickOptions<T> & { cAnPickMAny: fAlse }, token?: CAncellAtionToken): Promise<T | undefined>;
	pick<T extends IQuickPickItem>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options?: Omit<IPickOptions<T>, 'cAnPickMAny'>, token?: CAncellAtionToken): Promise<T | undefined>;

	/**
	 * Opens the quick input box for text input And returns A promise with the user typed vAlue if Any.
	 */
	input(options?: IInputOptions, token?: CAncellAtionToken): Promise<string | undefined>;

	/**
	 * Provides rAw Access to the quick pick controller.
	 */
	creAteQuickPick<T extends IQuickPickItem>(): IQuickPick<T>;

	/**
	 * Provides rAw Access to the quick input controller.
	 */
	creAteInputBox(): IInputBox;

	/**
	 * Moves focus into quick input.
	 */
	focus(): void;

	/**
	 * Toggle the checked stAte of the selected item.
	 */
	toggle(): void;

	/**
	 * NAvigAte inside the opened quick input list.
	 */
	nAvigAte(next: booleAn, quickNAvigAte?: IQuickNAvigAteConfigurAtion): void;

	/**
	 * NAvigAte bAck in A multi-step quick input.
	 */
	bAck(): Promise<void>;

	/**
	 * Accept the selected item.
	 *
	 * @pArAm keyMods Allows to override the stAte of key
	 * modifiers thAt should be present when invoking.
	 */
	Accept(keyMods?: IKeyMods): Promise<void>;

	/**
	 * CAncels quick input And closes it.
	 */
	cAncel(): Promise<void>;
}
