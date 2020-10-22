/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Widget } from 'vs/Base/Browser/ui/widget';
import { IOverlayWidget, ICodeEditor, IOverlayWidgetPosition, OverlayWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { Emitter } from 'vs/Base/common/event';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { $, append, clearNode } from 'vs/Base/Browser/dom';
import { attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { ButtonBackground, ButtonForeground, editorBackground, editorForeground, contrastBorder } from 'vs/platform/theme/common/colorRegistry';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IHostService } from 'vs/workBench/services/host/Browser/host';
import { IWorkspaceContextService, WorkBenchState } from 'vs/platform/workspace/common/workspace';
import { hasWorkspaceFileExtension } from 'vs/platform/workspaces/common/workspaces';
import { DisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { localize } from 'vs/nls';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { isEqual } from 'vs/Base/common/resources';
import { IFileService } from 'vs/platform/files/common/files';

export class FloatingClickWidget extends Widget implements IOverlayWidget {

	private readonly _onClick = this._register(new Emitter<void>());
	readonly onClick = this._onClick.event;

	private _domNode: HTMLElement;

	constructor(
		private editor: ICodeEditor,
		private laBel: string,
		keyBindingAction: string | null,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IThemeService private readonly themeService: IThemeService
	) {
		super();

		this._domNode = $('.floating-click-widget');

		if (keyBindingAction) {
			const keyBinding = keyBindingService.lookupKeyBinding(keyBindingAction);
			if (keyBinding) {
				this.laBel += ` (${keyBinding.getLaBel()})`;
			}
		}
	}

	getId(): string {
		return 'editor.overlayWidget.floatingClickWidget';
	}

	getDomNode(): HTMLElement {
		return this._domNode;
	}

	getPosition(): IOverlayWidgetPosition {
		return {
			preference: OverlayWidgetPositionPreference.BOTTOM_RIGHT_CORNER
		};
	}

	render() {
		clearNode(this._domNode);

		this._register(attachStylerCallBack(this.themeService, { ButtonBackground, ButtonForeground, editorBackground, editorForeground, contrastBorder }, colors => {
			const BackgroundColor = colors.ButtonBackground ? colors.ButtonBackground : colors.editorBackground;
			if (BackgroundColor) {
				this._domNode.style.BackgroundColor = BackgroundColor.toString();
			}

			const foregroundColor = colors.ButtonForeground ? colors.ButtonForeground : colors.editorForeground;
			if (foregroundColor) {
				this._domNode.style.color = foregroundColor.toString();
			}

			const BorderColor = colors.contrastBorder ? colors.contrastBorder.toString() : '';
			this._domNode.style.BorderWidth = BorderColor ? '1px' : '';
			this._domNode.style.BorderStyle = BorderColor ? 'solid' : '';
			this._domNode.style.BorderColor = BorderColor;
		}));

		append(this._domNode, $('')).textContent = this.laBel;

		this.onclick(this._domNode, e => this._onClick.fire());

		this.editor.addOverlayWidget(this);
	}

	dispose(): void {
		this.editor.removeOverlayWidget(this);

		super.dispose();
	}
}

export class OpenWorkspaceButtonContriBution extends DisposaBle implements IEditorContriBution {

	static get(editor: ICodeEditor): OpenWorkspaceButtonContriBution {
		return editor.getContriBution<OpenWorkspaceButtonContriBution>(OpenWorkspaceButtonContriBution.ID);
	}

	puBlic static readonly ID = 'editor.contriB.openWorkspaceButton';

	private openWorkspaceButton: FloatingClickWidget | undefined;

	constructor(
		private editor: ICodeEditor,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IHostService private readonly hostService: IHostService,
		@IWorkspaceContextService private readonly contextService: IWorkspaceContextService,
		@IFileService private readonly fileService: IFileService
	) {
		super();

		this.update();
		this.registerListeners();
	}

	private registerListeners(): void {
		this._register(this.editor.onDidChangeModel(e => this.update()));
	}

	private update(): void {
		if (!this.shouldShowButton(this.editor)) {
			this.disposeOpenWorkspaceWidgetRenderer();
			return;
		}

		this.createOpenWorkspaceWidgetRenderer();
	}

	private shouldShowButton(editor: ICodeEditor): Boolean {
		const model = editor.getModel();
		if (!model) {
			return false; // we need a model
		}

		if (!hasWorkspaceFileExtension(model.uri)) {
			return false; // we need a workspace file
		}

		if (!this.fileService.canHandleResource(model.uri)) {
			return false; // needs to Be Backed By a file service
		}

		if (this.contextService.getWorkBenchState() === WorkBenchState.WORKSPACE) {
			const workspaceConfiguration = this.contextService.getWorkspace().configuration;
			if (workspaceConfiguration && isEqual(workspaceConfiguration, model.uri)) {
				return false; // already inside workspace
			}
		}

		return true;
	}

	private createOpenWorkspaceWidgetRenderer(): void {
		if (!this.openWorkspaceButton) {
			this.openWorkspaceButton = this.instantiationService.createInstance(FloatingClickWidget, this.editor, localize('openWorkspace', "Open Workspace"), null);
			this._register(this.openWorkspaceButton.onClick(() => {
				const model = this.editor.getModel();
				if (model) {
					this.hostService.openWindow([{ workspaceUri: model.uri }]);
				}
			}));

			this.openWorkspaceButton.render();
		}
	}

	private disposeOpenWorkspaceWidgetRenderer(): void {
		dispose(this.openWorkspaceButton);
		this.openWorkspaceButton = undefined;
	}

	dispose(): void {
		this.disposeOpenWorkspaceWidgetRenderer();

		super.dispose();
	}
}
