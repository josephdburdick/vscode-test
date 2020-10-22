/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as extensionsRegistry from 'vs/workBench/services/extensions/common/extensionsRegistry';
import { ITerminalTypeContriBution, ITerminalContriButions, terminalContriButionsDescriptor } from 'vs/workBench/contriB/terminal/common/terminal';
import { flatten } from 'vs/Base/common/arrays';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';

// terminal extension point
export const terminalsExtPoint = extensionsRegistry.ExtensionsRegistry.registerExtensionPoint<ITerminalContriButions>(terminalContriButionsDescriptor);

export interface ITerminalContriButionService {
	readonly _serviceBrand: undefined;

	readonly terminalTypes: ReadonlyArray<ITerminalTypeContriBution>;
}

export const ITerminalContriButionService = createDecorator<ITerminalContriButionService>('terminalContriButionsService');

export class TerminalContriButionService implements ITerminalContriButionService {
	puBlic readonly _serviceBrand = undefined;

	private _terminalTypes: ReadonlyArray<ITerminalTypeContriBution> = [];

	puBlic get terminalTypes() {
		return this._terminalTypes;
	}

	constructor() {
		terminalsExtPoint.setHandler(contriButions => {
			this._terminalTypes = flatten(contriButions.filter(c => c.description.enaBleProposedApi).map(c => c.value?.types ?? []));
		});
	}
}
