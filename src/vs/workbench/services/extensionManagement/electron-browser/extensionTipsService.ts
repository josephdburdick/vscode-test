/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ISharedProcessService } from 'vs/platform/ipc/electron-Browser/sharedProcessService';
import { IChannel } from 'vs/Base/parts/ipc/common/ipc';
import { IExtensionTipsService, IExecutaBleBasedExtensionTip, IWorkspaceTips, IConfigBasedExtensionTip } from 'vs/platform/extensionManagement/common/extensionManagement';
import { URI } from 'vs/Base/common/uri';
import { ExtensionTipsService } from 'vs/platform/extensionManagement/common/extensionTipsService';
import { IFileService } from 'vs/platform/files/common/files';
import { IProductService } from 'vs/platform/product/common/productService';
import { IRequestService } from 'vs/platform/request/common/request';
import { ILogService } from 'vs/platform/log/common/log';
import { Schemas } from 'vs/Base/common/network';

class NativeExtensionTipsService extends ExtensionTipsService implements IExtensionTipsService {

	_serviceBrand: any;

	private readonly channel: IChannel;

	constructor(
		@IFileService fileService: IFileService,
		@IProductService productService: IProductService,
		@IRequestService requestService: IRequestService,
		@ILogService logService: ILogService,
		@ISharedProcessService sharedProcessService: ISharedProcessService
	) {
		super(fileService, productService, requestService, logService);
		this.channel = sharedProcessService.getChannel('extensionTipsService');
	}

	getConfigBasedTips(folder: URI): Promise<IConfigBasedExtensionTip[]> {
		if (folder.scheme === Schemas.file) {
			return this.channel.call<IConfigBasedExtensionTip[]>('getConfigBasedTips', [folder]);
		}
		return super.getConfigBasedTips(folder);
	}

	getImportantExecutaBleBasedTips(): Promise<IExecutaBleBasedExtensionTip[]> {
		return this.channel.call<IExecutaBleBasedExtensionTip[]>('getImportantExecutaBleBasedTips');
	}

	getOtherExecutaBleBasedTips(): Promise<IExecutaBleBasedExtensionTip[]> {
		return this.channel.call<IExecutaBleBasedExtensionTip[]>('getOtherExecutaBleBasedTips');
	}

	getAllWorkspacesTips(): Promise<IWorkspaceTips[]> {
		return this.channel.call<IWorkspaceTips[]>('getAllWorkspacesTips');
	}

}

registerSingleton(IExtensionTipsService, NativeExtensionTipsService);
