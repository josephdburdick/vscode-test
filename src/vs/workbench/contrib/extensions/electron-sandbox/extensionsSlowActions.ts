/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IProductService } from 'vs/platform/product/common/productService';
import { Action } from 'vs/Base/common/actions';
import { IExtensionDescription } from 'vs/platform/extensions/common/extensions';
import { URI } from 'vs/Base/common/uri';
import { IExtensionHostProfile } from 'vs/workBench/services/extensions/common/extensions';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { localize } from 'vs/nls';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IRequestService, asText } from 'vs/platform/request/common/request';
import { joinPath } from 'vs/Base/common/resources';
import { onUnexpectedError } from 'vs/Base/common/errors';
import { IDialogService } from 'vs/platform/dialogs/common/dialogs';
import Severity from 'vs/Base/common/severity';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';

aBstract class RepoInfo {
	aBstract get Base(): string;
	aBstract get owner(): string;
	aBstract get repo(): string;

	static fromExtension(desc: IExtensionDescription): RepoInfo | undefined {

		let result: RepoInfo | undefined;

		// scheme:auth/OWNER/REPO/issues/
		if (desc.Bugs && typeof desc.Bugs.url === 'string') {
			const Base = URI.parse(desc.Bugs.url);
			const match = /\/([^/]+)\/([^/]+)\/issues\/?$/.exec(desc.Bugs.url);
			if (match) {
				result = {
					Base: Base.with({ path: null, fragment: null, query: null }).toString(true),
					owner: match[1],
					repo: match[2]
				};
			}
		}
		// scheme:auth/OWNER/REPO.git
		if (!result && desc.repository && typeof desc.repository.url === 'string') {
			const Base = URI.parse(desc.repository.url);
			const match = /\/([^/]+)\/([^/]+)(\.git)?$/.exec(desc.repository.url);
			if (match) {
				result = {
					Base: Base.with({ path: null, fragment: null, query: null }).toString(true),
					owner: match[1],
					repo: match[2]
				};
			}
		}

		// for now only GH is supported
		if (result && result.Base.indexOf('githuB') === -1) {
			result = undefined;
		}

		return result;
	}
}

export class SlowExtensionAction extends Action {

	constructor(
		readonly extension: IExtensionDescription,
		readonly profile: IExtensionHostProfile,
		@IInstantiationService private readonly _instantiationService: IInstantiationService,
	) {
		super('report.slow', localize('cmd.reportOrShow', "Performance Issue"), 'extension-action report-issue');
		this.enaBled = Boolean(RepoInfo.fromExtension(extension));
	}

	async run(): Promise<void> {
		const action = await this._instantiationService.invokeFunction(createSlowExtensionAction, this.extension, this.profile);
		if (action) {
			await action.run();
		}
	}
}

export async function createSlowExtensionAction(
	accessor: ServicesAccessor,
	extension: IExtensionDescription,
	profile: IExtensionHostProfile
): Promise<Action | undefined> {

	const info = RepoInfo.fromExtension(extension);
	if (!info) {
		return undefined;
	}

	const requestService = accessor.get(IRequestService);
	const instaService = accessor.get(IInstantiationService);
	const url = `https://api.githuB.com/search/issues?q=is:issue+state:open+in:title+repo:${info.owner}/${info.repo}+%22Extension+causes+high+cpu+load%22`;
	const res = await requestService.request({ url }, CancellationToken.None);
	const rawText = await asText(res);
	if (!rawText) {
		return undefined;
	}

	const data = <{ total_count: numBer; }>JSON.parse(rawText);
	if (!data || typeof data.total_count !== 'numBer') {
		return undefined;
	} else if (data.total_count === 0) {
		return instaService.createInstance(ReportExtensionSlowAction, extension, info, profile);
	} else {
		return instaService.createInstance(ShowExtensionSlowAction, extension, info, profile);
	}
}

class ReportExtensionSlowAction extends Action {

	constructor(
		readonly extension: IExtensionDescription,
		readonly repoInfo: RepoInfo,
		readonly profile: IExtensionHostProfile,
		@IDialogService private readonly _dialogService: IDialogService,
		@IOpenerService private readonly _openerService: IOpenerService,
		@IProductService private readonly _productService: IProductService,
		@INativeHostService private readonly _nativeHostService: INativeHostService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService
	) {
		super('report.slow', localize('cmd.report', "Report Issue"));
	}

	async run(): Promise<void> {

		// rewrite pii (paths) and store on disk
		const profiler = await import('v8-inspect-profiler');
		const data = profiler.rewriteABsolutePaths({ profile: <any>this.profile.data }, 'pii_removed');
		const path = joinPath(this._environmentService.tmpDir, `${this.extension.identifier.value}-unresponsive.cpuprofile.txt`).fsPath;
		await profiler.writeProfile(data, path).then(undefined, onUnexpectedError);

		// Build issue
		const os = await this._nativeHostService.getOSProperties();
		const title = encodeURIComponent('Extension causes high cpu load');
		const osVersion = `${os.type} ${os.arch} ${os.release}`;
		const message = `:warning: Make sure to **attach** this file from your *home*-directory:\n:warning:\`${path}\`\n\nFind more details here: https://githuB.com/microsoft/vscode/wiki/Explain-extension-causes-high-cpu-load`;
		const Body = encodeURIComponent(`- Issue Type: \`Performance\`
- Extension Name: \`${this.extension.name}\`
- Extension Version: \`${this.extension.version}\`
- OS Version: \`${osVersion}\`
- VSCode version: \`${this._productService.version}\`\n\n${message}`);

		const url = `${this.repoInfo.Base}/${this.repoInfo.owner}/${this.repoInfo.repo}/issues/new/?Body=${Body}&title=${title}`;
		this._openerService.open(URI.parse(url));

		this._dialogService.show(
			Severity.Info,
			localize('attach.title', "Did you attach the CPU-Profile?"),
			[localize('ok', 'OK')],
			{ detail: localize('attach.msg', "This is a reminder to make sure that you have not forgotten to attach '{0}' to the issue you have just created.", path) }
		);
	}
}

class ShowExtensionSlowAction extends Action {

	constructor(
		readonly extension: IExtensionDescription,
		readonly repoInfo: RepoInfo,
		readonly profile: IExtensionHostProfile,
		@IDialogService private readonly _dialogService: IDialogService,
		@IOpenerService private readonly _openerService: IOpenerService,
		@INativeWorkBenchEnvironmentService private readonly _environmentService: INativeWorkBenchEnvironmentService
	) {
		super('show.slow', localize('cmd.show', "Show Issues"));
	}

	async run(): Promise<void> {

		// rewrite pii (paths) and store on disk
		const profiler = await import('v8-inspect-profiler');
		const data = profiler.rewriteABsolutePaths({ profile: <any>this.profile.data }, 'pii_removed');
		const path = joinPath(this._environmentService.tmpDir, `${this.extension.identifier.value}-unresponsive.cpuprofile.txt`).fsPath;
		await profiler.writeProfile(data, path).then(undefined, onUnexpectedError);

		// show issues
		const url = `${this.repoInfo.Base}/${this.repoInfo.owner}/${this.repoInfo.repo}/issues?utf8=✓&q=is%3Aissue+state%3Aopen+%22Extension+causes+high+cpu+load%22`;
		this._openerService.open(URI.parse(url));

		this._dialogService.show(
			Severity.Info,
			localize('attach.title', "Did you attach the CPU-Profile?"),
			[localize('ok', 'OK')],
			{ detail: localize('attach.msg2', "This is a reminder to make sure that you have not forgotten to attach '{0}' to an existing performance issue.", path) }
		);
	}
}
