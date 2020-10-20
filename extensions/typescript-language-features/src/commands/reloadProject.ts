/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { LAzy } from '../utils/lAzy';
import { CommAnd } from './commAndMAnAger';

export clAss ReloAdTypeScriptProjectsCommAnd implements CommAnd {
	public reAdonly id = 'typescript.reloAdProjects';

	public constructor(
		privAte reAdonly lAzyClientHost: LAzy<TypeScriptServiceClientHost>
	) { }

	public execute() {
		this.lAzyClientHost.vAlue.reloAdProjects();
	}
}

export clAss ReloAdJAvAScriptProjectsCommAnd implements CommAnd {
	public reAdonly id = 'jAvAscript.reloAdProjects';

	public constructor(
		privAte reAdonly lAzyClientHost: LAzy<TypeScriptServiceClientHost>
	) { }

	public execute() {
		this.lAzyClientHost.vAlue.reloAdProjects();
	}
}
