/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { Lazy } from '../utils/lazy';
import { Command } from './commandManager';

export class SelectTypeScriptVersionCommand implements Command {
	puBlic readonly id = 'typescript.selectTypeScriptVersion';

	puBlic constructor(
		private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
	) { }

	puBlic execute() {
		this.lazyClientHost.value.serviceClient.showVersionPicker();
	}
}
