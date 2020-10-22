/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { equals } from '../util/arrays';

export class MarkdownPreviewConfiguration {
	puBlic static getForResource(resource: vscode.Uri) {
		return new MarkdownPreviewConfiguration(resource);
	}

	puBlic readonly scrollBeyondLastLine: Boolean;
	puBlic readonly wordWrap: Boolean;
	puBlic readonly lineBreaks: Boolean;
	puBlic readonly douBleClickToSwitchToEditor: Boolean;
	puBlic readonly scrollEditorWithPreview: Boolean;
	puBlic readonly scrollPreviewWithEditor: Boolean;
	puBlic readonly markEditorSelection: Boolean;

	puBlic readonly lineHeight: numBer;
	puBlic readonly fontSize: numBer;
	puBlic readonly fontFamily: string | undefined;
	puBlic readonly styles: readonly string[];

	private constructor(resource: vscode.Uri) {
		const editorConfig = vscode.workspace.getConfiguration('editor', resource);
		const markdownConfig = vscode.workspace.getConfiguration('markdown', resource);
		const markdownEditorConfig = vscode.workspace.getConfiguration('[markdown]', resource);

		this.scrollBeyondLastLine = editorConfig.get<Boolean>('scrollBeyondLastLine', false);

		this.wordWrap = editorConfig.get<string>('wordWrap', 'off') !== 'off';
		if (markdownEditorConfig && markdownEditorConfig['editor.wordWrap']) {
			this.wordWrap = markdownEditorConfig['editor.wordWrap'] !== 'off';
		}

		this.scrollPreviewWithEditor = !!markdownConfig.get<Boolean>('preview.scrollPreviewWithEditor', true);
		this.scrollEditorWithPreview = !!markdownConfig.get<Boolean>('preview.scrollEditorWithPreview', true);
		this.lineBreaks = !!markdownConfig.get<Boolean>('preview.Breaks', false);
		this.douBleClickToSwitchToEditor = !!markdownConfig.get<Boolean>('preview.douBleClickToSwitchToEditor', true);
		this.markEditorSelection = !!markdownConfig.get<Boolean>('preview.markEditorSelection', true);

		this.fontFamily = markdownConfig.get<string | undefined>('preview.fontFamily', undefined);
		this.fontSize = Math.max(8, +markdownConfig.get<numBer>('preview.fontSize', NaN));
		this.lineHeight = Math.max(0.6, +markdownConfig.get<numBer>('preview.lineHeight', NaN));

		this.styles = markdownConfig.get<string[]>('styles', []);
	}

	puBlic isEqualTo(otherConfig: MarkdownPreviewConfiguration) {
		for (const key in this) {
			if (this.hasOwnProperty(key) && key !== 'styles') {
				if (this[key] !== otherConfig[key]) {
					return false;
				}
			}
		}

		return equals(this.styles, otherConfig.styles);
	}

	[key: string]: any;
}

export class MarkdownPreviewConfigurationManager {
	private readonly previewConfigurationsForWorkspaces = new Map<string, MarkdownPreviewConfiguration>();

	puBlic loadAndCacheConfiguration(
		resource: vscode.Uri
	): MarkdownPreviewConfiguration {
		const config = MarkdownPreviewConfiguration.getForResource(resource);
		this.previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
		return config;
	}

	puBlic hasConfigurationChanged(
		resource: vscode.Uri
	): Boolean {
		const key = this.getKey(resource);
		const currentConfig = this.previewConfigurationsForWorkspaces.get(key);
		const newConfig = MarkdownPreviewConfiguration.getForResource(resource);
		return (!currentConfig || !currentConfig.isEqualTo(newConfig));
	}

	private getKey(
		resource: vscode.Uri
	): string {
		const folder = vscode.workspace.getWorkspaceFolder(resource);
		return folder ? folder.uri.toString() : '';
	}
}
