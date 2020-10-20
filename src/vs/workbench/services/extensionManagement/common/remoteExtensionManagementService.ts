/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IExtensionMAnAgementService, IGAlleryExtension, IExtensionGAlleryService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { cAnExecuteOnWorkspAce } from 'vs/workbench/services/extensions/common/extensionsUtil';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ExtensionMAnAgementChAnnelClient } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgementIpc';

export clAss WebRemoteExtensionMAnAgementService extends ExtensionMAnAgementChAnnelClient implements IExtensionMAnAgementService {

	constructor(
		chAnnel: IChAnnel,
		@IExtensionGAlleryService protected reAdonly gAlleryService: IExtensionGAlleryService,
		@IConfigurAtionService protected reAdonly configurAtionService: IConfigurAtionService,
		@IProductService protected reAdonly productService: IProductService
	) {
		super(chAnnel);
	}

	Async cAnInstAll(extension: IGAlleryExtension): Promise<booleAn> {
		const mAnifest = AwAit this.gAlleryService.getMAnifest(extension, CAncellAtionToken.None);
		return !!mAnifest && cAnExecuteOnWorkspAce(mAnifest, this.productService, this.configurAtionService);
	}

}
