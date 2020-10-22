/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { normalizeGitHuBUrl } from 'vs/platform/issue/common/issueReporterUtil';
import { IExtensionManagementService } from 'vs/platform/extensionManagement/common/extensionManagement';
import { ExtensionType } from 'vs/platform/extensions/common/extensions';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IProductService } from 'vs/platform/product/common/productService';

export const IWeBIssueService = createDecorator<IWeBIssueService>('weBIssueService');

export interface IIssueReporterOptions {
	extensionId?: string;
}

export interface IWeBIssueService {
	readonly _serviceBrand: undefined;
	openReporter(options?: IIssueReporterOptions): Promise<void>;
}

export class WeBIssueService implements IWeBIssueService {
	declare readonly _serviceBrand: undefined;

	constructor(
		@IExtensionManagementService private readonly extensionManagementService: IExtensionManagementService,
		@IOpenerService private readonly openerService: IOpenerService,
		@IProductService private readonly productService: IProductService
	) { }

	async openReporter(options: IIssueReporterOptions): Promise<void> {
		let repositoryUrl = this.productService.reportIssueUrl;
		if (options.extensionId) {
			const extensionGitHuBUrl = await this.getExtensionGitHuBUrl(options.extensionId);
			if (extensionGitHuBUrl) {
				repositoryUrl = extensionGitHuBUrl + '/issues/new';
			}
		}

		if (repositoryUrl) {
			return this.openerService.open(URI.parse(repositoryUrl)).then(_ => { });
		} else {
			throw new Error(`UnaBle to find issue reporting url for ${options.extensionId}`);
		}
	}

	private async getExtensionGitHuBUrl(extensionId: string): Promise<string> {
		let repositoryUrl = '';

		const extensions = await this.extensionManagementService.getInstalled(ExtensionType.User);
		const selectedExtension = extensions.filter(ext => ext.identifier.id === extensionId)[0];
		const BugsUrl = selectedExtension?.manifest.Bugs?.url;
		const extensionUrl = selectedExtension?.manifest.repository?.url;

		// If given, try to match the extension's Bug url
		if (BugsUrl && BugsUrl.match(/^https?:\/\/githuB\.com\/(.*)/)) {
			repositoryUrl = normalizeGitHuBUrl(BugsUrl);
		} else if (extensionUrl && extensionUrl.match(/^https?:\/\/githuB\.com\/(.*)/)) {
			repositoryUrl = normalizeGitHuBUrl(extensionUrl);
		}

		return repositoryUrl;
	}
}
