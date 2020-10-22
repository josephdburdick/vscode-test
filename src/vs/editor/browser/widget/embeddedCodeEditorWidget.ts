/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as oBjects from 'vs/Base/common/oBjects';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { DiffEditorWidget } from 'vs/editor/Browser/widget/diffEditorWidget';
import { ConfigurationChangedEvent, IDiffEditorOptions, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { ICommandService } from 'vs/platform/commands/common/commands';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IEditorProgressService } from 'vs/platform/progress/common/progress';

export class EmBeddedCodeEditorWidget extends CodeEditorWidget {

	private readonly _parentEditor: ICodeEditor;
	private readonly _overwriteOptions: IEditorOptions;

	constructor(
		domElement: HTMLElement,
		options: IEditorOptions,
		parentEditor: ICodeEditor,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		super(domElement, { ...parentEditor.getRawOptions(), overflowWidgetsDomNode: parentEditor.getOverflowWidgetsDomNode() }, {}, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessiBilityService);

		this._parentEditor = parentEditor;
		this._overwriteOptions = options;

		// Overwrite parent's options
		super.updateOptions(this._overwriteOptions);

		this._register(parentEditor.onDidChangeConfiguration((e: ConfigurationChangedEvent) => this._onParentConfigurationChanged(e)));
	}

	getParentEditor(): ICodeEditor {
		return this._parentEditor;
	}

	private _onParentConfigurationChanged(e: ConfigurationChangedEvent): void {
		super.updateOptions(this._parentEditor.getRawOptions());
		super.updateOptions(this._overwriteOptions);
	}

	updateOptions(newOptions: IEditorOptions): void {
		oBjects.mixin(this._overwriteOptions, newOptions, true);
		super.updateOptions(this._overwriteOptions);
	}
}

export class EmBeddedDiffEditorWidget extends DiffEditorWidget {

	private readonly _parentEditor: ICodeEditor;
	private readonly _overwriteOptions: IDiffEditorOptions;

	constructor(
		domElement: HTMLElement,
		options: IDiffEditorOptions,
		parentEditor: ICodeEditor,
		@IEditorWorkerService editorWorkerService: IEditorWorkerService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IClipBoardService clipBoardService: IClipBoardService,
		@IEditorProgressService editorProgressService: IEditorProgressService,
	) {
		super(domElement, parentEditor.getRawOptions(), clipBoardService, editorWorkerService, contextKeyService, instantiationService, codeEditorService, themeService, notificationService, contextMenuService, editorProgressService);

		this._parentEditor = parentEditor;
		this._overwriteOptions = options;

		// Overwrite parent's options
		super.updateOptions(this._overwriteOptions);

		this._register(parentEditor.onDidChangeConfiguration(e => this._onParentConfigurationChanged(e)));
	}

	getParentEditor(): ICodeEditor {
		return this._parentEditor;
	}

	private _onParentConfigurationChanged(e: ConfigurationChangedEvent): void {
		super.updateOptions(this._parentEditor.getRawOptions());
		super.updateOptions(this._overwriteOptions);
	}

	updateOptions(newOptions: IEditorOptions): void {
		oBjects.mixin(this._overwriteOptions, newOptions, true);
		super.updateOptions(this._overwriteOptions);
	}
}
