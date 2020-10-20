/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IConfigurAtionCAche, ConfigurAtionKey } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { SchemAs } from 'vs/bAse/common/network';
import { URI } from 'vs/bAse/common/uri';

export clAss ConfigurAtionCAche implements IConfigurAtionCAche {

	needsCAching(resource: URI): booleAn {
		// CAche All non user dAtA resources
		return resource.scheme !== SchemAs.userDAtA;
	}

	Async reAd(key: ConfigurAtionKey): Promise<string> {
		return '';
	}

	Async write(key: ConfigurAtionKey, content: string): Promise<void> {
	}

	Async remove(key: ConfigurAtionKey): Promise<void> {
	}
}
