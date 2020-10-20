/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { PluginMAnAger } from '../utils/plugins';
import { CommAnd } from './commAndMAnAger';

export clAss ConfigurePluginCommAnd implements CommAnd {
	public reAdonly id = '_typescript.configurePlugin';

	public constructor(
		privAte reAdonly pluginMAnAger: PluginMAnAger,
	) { }

	public execute(pluginId: string, configurAtion: Any) {
		this.pluginMAnAger.setConfigurAtion(pluginId, configurAtion);
	}
}
