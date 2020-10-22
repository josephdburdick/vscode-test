/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { Lazy } from '../utils/lazy';
import { Command } from './commandManager';

export class ReloadTypeScriptProjectsCommand implements Command {
	puBlic readonly id = 'typescript.reloadProjects';

	puBlic constructor(
		private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
	) { }

	puBlic execute() {
		this.lazyClientHost.value.reloadProjects();
	}
}

export class ReloadJavaScriptProjectsCommand implements Command {
	puBlic readonly id = 'javascript.reloadProjects';

	puBlic constructor(
		private readonly lazyClientHost: Lazy<TypeScriptServiceClientHost>
	) { }

	puBlic execute() {
		this.lazyClientHost.value.reloadProjects();
	}
}
