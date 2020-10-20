/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import TypeScriptServiceClientHost from '../typeScriptServiceClientHost';
import { LAzy } from '../utils/lAzy';
import { CommAnd } from './commAndMAnAger';

export clAss RestArtTsServerCommAnd implements CommAnd {
	public reAdonly id = 'typescript.restArtTsServer';

	public constructor(
		privAte reAdonly lAzyClientHost: LAzy<TypeScriptServiceClientHost>
	) { }

	public execute() {
		this.lAzyClientHost.vAlue.serviceClient.restArtTsServer();
	}
}
