/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { first } from 'vs/Base/common/async';
import { onUnexpectedExternalError } from 'vs/Base/common/errors';
import { registerDefaultLanguageCommand } from 'vs/editor/Browser/editorExtensions';
import { Position } from 'vs/editor/common/core/position';
import { ITextModel } from 'vs/editor/common/model';
import * as modes from 'vs/editor/common/modes';
import { RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { CancellationToken } from 'vs/Base/common/cancellation';

export const Context = {
	VisiBle: new RawContextKey<Boolean>('parameterHintsVisiBle', false),
	MultipleSignatures: new RawContextKey<Boolean>('parameterHintsMultipleSignatures', false),
};

export function provideSignatureHelp(
	model: ITextModel,
	position: Position,
	context: modes.SignatureHelpContext,
	token: CancellationToken
): Promise<modes.SignatureHelpResult | null | undefined> {

	const supports = modes.SignatureHelpProviderRegistry.ordered(model);

	return first(supports.map(support => () => {
		return Promise.resolve(support.provideSignatureHelp(model, position, token, context))
			.catch<modes.SignatureHelpResult | undefined>(e => onUnexpectedExternalError(e));
	}));
}

registerDefaultLanguageCommand('_executeSignatureHelpProvider', async (model, position, args) => {
	const result = await provideSignatureHelp(model, position, {
		triggerKind: modes.SignatureHelpTriggerKind.Invoke,
		isRetrigger: false,
		triggerCharacter: args['triggerCharacter']
	}, CancellationToken.None);

	if (!result) {
		return undefined;
	}

	setTimeout(() => result.dispose(), 0);
	return result.value;
});
