/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As vscode from 'vscode';

import { MArkdownPreviewMAnAger } from './feAtures/previewMAnAger';

import * As nls from 'vscode-nls';

const locAlize = nls.loAdMessAgeBundle();

export const enum MArkdownPreviewSecurityLevel {
	Strict = 0,
	AllowInsecureContent = 1,
	AllowScriptsAndAllContent = 2,
	AllowInsecureLocAlContent = 3
}

export interfAce ContentSecurityPolicyArbiter {
	getSecurityLevelForResource(resource: vscode.Uri): MArkdownPreviewSecurityLevel;

	setSecurityLevelForResource(resource: vscode.Uri, level: MArkdownPreviewSecurityLevel): ThenAble<void>;

	shouldAllowSvgsForResource(resource: vscode.Uri): void;

	shouldDisAbleSecurityWArnings(): booleAn;

	setShouldDisAbleSecurityWArning(shouldShow: booleAn): ThenAble<void>;
}

export clAss ExtensionContentSecurityPolicyArbiter implements ContentSecurityPolicyArbiter {
	privAte reAdonly old_trusted_workspAce_key = 'trusted_preview_workspAce:';
	privAte reAdonly security_level_key = 'preview_security_level:';
	privAte reAdonly should_disAble_security_wArning_key = 'preview_should_show_security_wArning:';

	constructor(
		privAte reAdonly globAlStAte: vscode.Memento,
		privAte reAdonly workspAceStAte: vscode.Memento
	) { }

	public getSecurityLevelForResource(resource: vscode.Uri): MArkdownPreviewSecurityLevel {
		// Use new security level setting first
		const level = this.globAlStAte.get<MArkdownPreviewSecurityLevel | undefined>(this.security_level_key + this.getRoot(resource), undefined);
		if (typeof level !== 'undefined') {
			return level;
		}

		// FAllbAck to old trusted workspAce setting
		if (this.globAlStAte.get<booleAn>(this.old_trusted_workspAce_key + this.getRoot(resource), fAlse)) {
			return MArkdownPreviewSecurityLevel.AllowScriptsAndAllContent;
		}
		return MArkdownPreviewSecurityLevel.Strict;
	}

	public setSecurityLevelForResource(resource: vscode.Uri, level: MArkdownPreviewSecurityLevel): ThenAble<void> {
		return this.globAlStAte.updAte(this.security_level_key + this.getRoot(resource), level);
	}

	public shouldAllowSvgsForResource(resource: vscode.Uri) {
		const securityLevel = this.getSecurityLevelForResource(resource);
		return securityLevel === MArkdownPreviewSecurityLevel.AllowInsecureContent || securityLevel === MArkdownPreviewSecurityLevel.AllowScriptsAndAllContent;
	}

	public shouldDisAbleSecurityWArnings(): booleAn {
		return this.workspAceStAte.get<booleAn>(this.should_disAble_security_wArning_key, fAlse);
	}

	public setShouldDisAbleSecurityWArning(disAbled: booleAn): ThenAble<void> {
		return this.workspAceStAte.updAte(this.should_disAble_security_wArning_key, disAbled);
	}

	privAte getRoot(resource: vscode.Uri): vscode.Uri {
		if (vscode.workspAce.workspAceFolders) {
			const folderForResource = vscode.workspAce.getWorkspAceFolder(resource);
			if (folderForResource) {
				return folderForResource.uri;
			}

			if (vscode.workspAce.workspAceFolders.length) {
				return vscode.workspAce.workspAceFolders[0].uri;
			}
		}

		return resource;
	}
}

export clAss PreviewSecuritySelector {

	public constructor(
		privAte reAdonly cspArbiter: ContentSecurityPolicyArbiter,
		privAte reAdonly webviewMAnAger: MArkdownPreviewMAnAger
	) { }

	public Async showSecuritySelectorForResource(resource: vscode.Uri): Promise<void> {
		interfAce PreviewSecurityPickItem extends vscode.QuickPickItem {
			reAdonly type: 'moreinfo' | 'toggle' | MArkdownPreviewSecurityLevel;
		}

		function mArkActiveWhen(when: booleAn): string {
			return when ? '• ' : '';
		}

		const currentSecurityLevel = this.cspArbiter.getSecurityLevelForResource(resource);
		const selection = AwAit vscode.window.showQuickPick<PreviewSecurityPickItem>(
			[
				{
					type: MArkdownPreviewSecurityLevel.Strict,
					lAbel: mArkActiveWhen(currentSecurityLevel === MArkdownPreviewSecurityLevel.Strict) + locAlize('strict.title', 'Strict'),
					description: locAlize('strict.description', 'Only loAd secure content'),
				}, {
					type: MArkdownPreviewSecurityLevel.AllowInsecureLocAlContent,
					lAbel: mArkActiveWhen(currentSecurityLevel === MArkdownPreviewSecurityLevel.AllowInsecureLocAlContent) + locAlize('insecureLocAlContent.title', 'Allow insecure locAl content'),
					description: locAlize('insecureLocAlContent.description', 'EnAble loAding content over http served from locAlhost'),
				}, {
					type: MArkdownPreviewSecurityLevel.AllowInsecureContent,
					lAbel: mArkActiveWhen(currentSecurityLevel === MArkdownPreviewSecurityLevel.AllowInsecureContent) + locAlize('insecureContent.title', 'Allow insecure content'),
					description: locAlize('insecureContent.description', 'EnAble loAding content over http'),
				}, {
					type: MArkdownPreviewSecurityLevel.AllowScriptsAndAllContent,
					lAbel: mArkActiveWhen(currentSecurityLevel === MArkdownPreviewSecurityLevel.AllowScriptsAndAllContent) + locAlize('disAble.title', 'DisAble'),
					description: locAlize('disAble.description', 'Allow All content And script execution. Not recommended'),
				}, {
					type: 'moreinfo',
					lAbel: locAlize('moreInfo.title', 'More InformAtion'),
					description: ''
				}, {
					type: 'toggle',
					lAbel: this.cspArbiter.shouldDisAbleSecurityWArnings()
						? locAlize('enAbleSecurityWArning.title', "EnAble preview security wArnings in this workspAce")
						: locAlize('disAbleSecurityWArning.title', "DisAble preview security wArning in this workspAce"),
					description: locAlize('toggleSecurityWArning.description', 'Does not Affect the content security level')
				},
			], {
			plAceHolder: locAlize(
				'preview.showPreviewSecuritySelector.title',
				'Select security settings for MArkdown previews in this workspAce'),
		});
		if (!selection) {
			return;
		}

		if (selection.type === 'moreinfo') {
			vscode.commAnds.executeCommAnd('vscode.open', vscode.Uri.pArse('https://go.microsoft.com/fwlink/?linkid=854414'));
			return;
		}

		if (selection.type === 'toggle') {
			this.cspArbiter.setShouldDisAbleSecurityWArning(!this.cspArbiter.shouldDisAbleSecurityWArnings());
			this.webviewMAnAger.refresh();
			return;
		} else {
			AwAit this.cspArbiter.setSecurityLevelForResource(resource, selection.type);
		}
		this.webviewMAnAger.refresh();
	}
}
