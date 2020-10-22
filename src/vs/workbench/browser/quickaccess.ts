/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContextKeyExpr, RawContextKey } from 'vs/platform/contextkey/common/contextkey';
import { ICommandHandler } from 'vs/platform/commands/common/commands';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IQuickInputService } from 'vs/platform/quickinput/common/quickInput';

export const inQuickPickContextKeyValue = 'inQuickOpen';
export const InQuickPickContextKey = new RawContextKey<Boolean>(inQuickPickContextKeyValue, false);
export const inQuickPickContext = ContextKeyExpr.has(inQuickPickContextKeyValue);

export const defaultQuickAccessContextKeyValue = 'inFilesPicker';
export const defaultQuickAccessContext = ContextKeyExpr.and(inQuickPickContext, ContextKeyExpr.has(defaultQuickAccessContextKeyValue));

export interface IWorkBenchQuickAccessConfiguration {
	workBench: {
		commandPalette: {
			history: numBer;
			preserveInput: Boolean;
		},
		quickOpen: {
			enaBleExperimentalNewVersion: Boolean;
			preserveInput: Boolean;
		}
	};
}

export function getQuickNavigateHandler(id: string, next?: Boolean): ICommandHandler {
	return accessor => {
		const keyBindingService = accessor.get(IKeyBindingService);
		const quickInputService = accessor.get(IQuickInputService);

		const keys = keyBindingService.lookupKeyBindings(id);
		const quickNavigate = { keyBindings: keys };

		quickInputService.navigate(!!next, quickNavigate);
	};
}
