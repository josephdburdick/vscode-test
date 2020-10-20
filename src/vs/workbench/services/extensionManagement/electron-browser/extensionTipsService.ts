/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IShAredProcessService } from 'vs/plAtform/ipc/electron-browser/shAredProcessService';
import { IChAnnel } from 'vs/bAse/pArts/ipc/common/ipc';
import { IExtensionTipsService, IExecutAbleBAsedExtensionTip, IWorkspAceTips, IConfigBAsedExtensionTip } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { URI } from 'vs/bAse/common/uri';
import { ExtensionTipsService } from 'vs/plAtform/extensionMAnAgement/common/extensionTipsService';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IProductService } from 'vs/plAtform/product/common/productService';
import { IRequestService } from 'vs/plAtform/request/common/request';
import { ILogService } from 'vs/plAtform/log/common/log';
import { SchemAs } from 'vs/bAse/common/network';

clAss NAtiveExtensionTipsService extends ExtensionTipsService implements IExtensionTipsService {

	_serviceBrAnd: Any;

	privAte reAdonly chAnnel: IChAnnel;

	constructor(
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@IShAredProcessService shAredProcessService: IShAredProcessService
	) {
		super(fileService, productService, requestService, logService);
		this.chAnnel = shAredProcessService.getChAnnel('extensionTipsService');
	}

	getConfigBAsedTips(folder: URI): Promise<IConfigBAsedExtensionTip[]> {
		if (folder.scheme === SchemAs.file) {
			return this.chAnnel.cAll<IConfigBAsedExtensionTip[]>('getConfigBAsedTips', [folder]);
		}
		return super.getConfigBAsedTips(folder);
	}

	getImportAntExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]> {
		return this.chAnnel.cAll<IExecutAbleBAsedExtensionTip[]>('getImportAntExecutAbleBAsedTips');
	}

	getOtherExecutAbleBAsedTips(): Promise<IExecutAbleBAsedExtensionTip[]> {
		return this.chAnnel.cAll<IExecutAbleBAsedExtensionTip[]>('getOtherExecutAbleBAsedTips');
	}

	getAllWorkspAcesTips(): Promise<IWorkspAceTips[]> {
		return this.chAnnel.cAll<IWorkspAceTips[]>('getAllWorkspAcesTips');
	}

}

registerSingleton(IExtensionTipsService, NAtiveExtensionTipsService);
