/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

import { MarkdownPreviewManager } from './features/previewManager';

import * as nls from 'vscode-nls';

const localize = nls.loadMessageBundle();

export const enum MarkdownPreviewSecurityLevel {
	Strict = 0,
	AllowInsecureContent = 1,
	AllowScriptsAndAllContent = 2,
	AllowInsecureLocalContent = 3
}

export interface ContentSecurityPolicyArBiter {
	getSecurityLevelForResource(resource: vscode.Uri): MarkdownPreviewSecurityLevel;

	setSecurityLevelForResource(resource: vscode.Uri, level: MarkdownPreviewSecurityLevel): ThenaBle<void>;

	shouldAllowSvgsForResource(resource: vscode.Uri): void;

	shouldDisaBleSecurityWarnings(): Boolean;

	setShouldDisaBleSecurityWarning(shouldShow: Boolean): ThenaBle<void>;
}

export class ExtensionContentSecurityPolicyArBiter implements ContentSecurityPolicyArBiter {
	private readonly old_trusted_workspace_key = 'trusted_preview_workspace:';
	private readonly security_level_key = 'preview_security_level:';
	private readonly should_disaBle_security_warning_key = 'preview_should_show_security_warning:';

	constructor(
		private readonly gloBalState: vscode.Memento,
		private readonly workspaceState: vscode.Memento
	) { }

	puBlic getSecurityLevelForResource(resource: vscode.Uri): MarkdownPreviewSecurityLevel {
		// Use new security level setting first
		const level = this.gloBalState.get<MarkdownPreviewSecurityLevel | undefined>(this.security_level_key + this.getRoot(resource), undefined);
		if (typeof level !== 'undefined') {
			return level;
		}

		// FallBack to old trusted workspace setting
		if (this.gloBalState.get<Boolean>(this.old_trusted_workspace_key + this.getRoot(resource), false)) {
			return MarkdownPreviewSecurityLevel.AllowScriptsAndAllContent;
		}
		return MarkdownPreviewSecurityLevel.Strict;
	}

	puBlic setSecurityLevelForResource(resource: vscode.Uri, level: MarkdownPreviewSecurityLevel): ThenaBle<void> {
		return this.gloBalState.update(this.security_level_key + this.getRoot(resource), level);
	}

	puBlic shouldAllowSvgsForResource(resource: vscode.Uri) {
		const securityLevel = this.getSecurityLevelForResource(resource);
		return securityLevel === MarkdownPreviewSecurityLevel.AllowInsecureContent || securityLevel === MarkdownPreviewSecurityLevel.AllowScriptsAndAllContent;
	}

	puBlic shouldDisaBleSecurityWarnings(): Boolean {
		return this.workspaceState.get<Boolean>(this.should_disaBle_security_warning_key, false);
	}

	puBlic setShouldDisaBleSecurityWarning(disaBled: Boolean): ThenaBle<void> {
		return this.workspaceState.update(this.should_disaBle_security_warning_key, disaBled);
	}

	private getRoot(resource: vscode.Uri): vscode.Uri {
		if (vscode.workspace.workspaceFolders) {
			const folderForResource = vscode.workspace.getWorkspaceFolder(resource);
			if (folderForResource) {
				return folderForResource.uri;
			}

			if (vscode.workspace.workspaceFolders.length) {
				return vscode.workspace.workspaceFolders[0].uri;
			}
		}

		return resource;
	}
}

export class PreviewSecuritySelector {

	puBlic constructor(
		private readonly cspArBiter: ContentSecurityPolicyArBiter,
		private readonly weBviewManager: MarkdownPreviewManager
	) { }

	puBlic async showSecuritySelectorForResource(resource: vscode.Uri): Promise<void> {
		interface PreviewSecurityPickItem extends vscode.QuickPickItem {
			readonly type: 'moreinfo' | 'toggle' | MarkdownPreviewSecurityLevel;
		}

		function markActiveWhen(when: Boolean): string {
			return when ? '• ' : '';
		}

		const currentSecurityLevel = this.cspArBiter.getSecurityLevelForResource(resource);
		const selection = await vscode.window.showQuickPick<PreviewSecurityPickItem>(
			[
				{
					type: MarkdownPreviewSecurityLevel.Strict,
					laBel: markActiveWhen(currentSecurityLevel === MarkdownPreviewSecurityLevel.Strict) + localize('strict.title', 'Strict'),
					description: localize('strict.description', 'Only load secure content'),
				}, {
					type: MarkdownPreviewSecurityLevel.AllowInsecureLocalContent,
					laBel: markActiveWhen(currentSecurityLevel === MarkdownPreviewSecurityLevel.AllowInsecureLocalContent) + localize('insecureLocalContent.title', 'Allow insecure local content'),
					description: localize('insecureLocalContent.description', 'EnaBle loading content over http served from localhost'),
				}, {
					type: MarkdownPreviewSecurityLevel.AllowInsecureContent,
					laBel: markActiveWhen(currentSecurityLevel === MarkdownPreviewSecurityLevel.AllowInsecureContent) + localize('insecureContent.title', 'Allow insecure content'),
					description: localize('insecureContent.description', 'EnaBle loading content over http'),
				}, {
					type: MarkdownPreviewSecurityLevel.AllowScriptsAndAllContent,
					laBel: markActiveWhen(currentSecurityLevel === MarkdownPreviewSecurityLevel.AllowScriptsAndAllContent) + localize('disaBle.title', 'DisaBle'),
					description: localize('disaBle.description', 'Allow all content and script execution. Not recommended'),
				}, {
					type: 'moreinfo',
					laBel: localize('moreInfo.title', 'More Information'),
					description: ''
				}, {
					type: 'toggle',
					laBel: this.cspArBiter.shouldDisaBleSecurityWarnings()
						? localize('enaBleSecurityWarning.title', "EnaBle preview security warnings in this workspace")
						: localize('disaBleSecurityWarning.title', "DisaBle preview security warning in this workspace"),
					description: localize('toggleSecurityWarning.description', 'Does not affect the content security level')
				},
			], {
			placeHolder: localize(
				'preview.showPreviewSecuritySelector.title',
				'Select security settings for Markdown previews in this workspace'),
		});
		if (!selection) {
			return;
		}

		if (selection.type === 'moreinfo') {
			vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('https://go.microsoft.com/fwlink/?linkid=854414'));
			return;
		}

		if (selection.type === 'toggle') {
			this.cspArBiter.setShouldDisaBleSecurityWarning(!this.cspArBiter.shouldDisaBleSecurityWarnings());
			this.weBviewManager.refresh();
			return;
		} else {
			await this.cspArBiter.setSecurityLevelForResource(resource, selection.type);
		}
		this.weBviewManager.refresh();
	}
}
