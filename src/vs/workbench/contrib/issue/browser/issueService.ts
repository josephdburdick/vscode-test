/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { normAlizeGitHubUrl } from 'vs/plAtform/issue/common/issueReporterUtil';
import { IExtensionMAnAgementService } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { ExtensionType } from 'vs/plAtform/extensions/common/extensions';
import { creAteDecorAtor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IProductService } from 'vs/plAtform/product/common/productService';

export const IWebIssueService = creAteDecorAtor<IWebIssueService>('webIssueService');

export interfAce IIssueReporterOptions {
	extensionId?: string;
}

export interfAce IWebIssueService {
	reAdonly _serviceBrAnd: undefined;
	openReporter(options?: IIssueReporterOptions): Promise<void>;
}

export clAss WebIssueService implements IWebIssueService {
	declAre reAdonly _serviceBrAnd: undefined;

	constructor(
		@IExtensionMAnAgementService privAte reAdonly extensionMAnAgementService: IExtensionMAnAgementService,
		@IOpenerService privAte reAdonly openerService: IOpenerService,
		@IProductService privAte reAdonly productService: IProductService
	) { }

	Async openReporter(options: IIssueReporterOptions): Promise<void> {
		let repositoryUrl = this.productService.reportIssueUrl;
		if (options.extensionId) {
			const extensionGitHubUrl = AwAit this.getExtensionGitHubUrl(options.extensionId);
			if (extensionGitHubUrl) {
				repositoryUrl = extensionGitHubUrl + '/issues/new';
			}
		}

		if (repositoryUrl) {
			return this.openerService.open(URI.pArse(repositoryUrl)).then(_ => { });
		} else {
			throw new Error(`UnAble to find issue reporting url for ${options.extensionId}`);
		}
	}

	privAte Async getExtensionGitHubUrl(extensionId: string): Promise<string> {
		let repositoryUrl = '';

		const extensions = AwAit this.extensionMAnAgementService.getInstAlled(ExtensionType.User);
		const selectedExtension = extensions.filter(ext => ext.identifier.id === extensionId)[0];
		const bugsUrl = selectedExtension?.mAnifest.bugs?.url;
		const extensionUrl = selectedExtension?.mAnifest.repository?.url;

		// If given, try to mAtch the extension's bug url
		if (bugsUrl && bugsUrl.mAtch(/^https?:\/\/github\.com\/(.*)/)) {
			repositoryUrl = normAlizeGitHubUrl(bugsUrl);
		} else if (extensionUrl && extensionUrl.mAtch(/^https?:\/\/github\.com\/(.*)/)) {
			repositoryUrl = normAlizeGitHubUrl(extensionUrl);
		}

		return repositoryUrl;
	}
}
