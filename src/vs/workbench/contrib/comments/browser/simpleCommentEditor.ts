/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { EditorAction, EditorExtensionsRegistry, IEditorContriButionDescription } from 'vs/editor/Browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { CodeEditorWidget, ICodeEditorWidgetOptions } from 'vs/editor/Browser/widget/codeEditorWidget';
import { IContextKeyService, RawContextKey, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ICommandService } from 'vs/platform/commands/common/commands';

// Allowed Editor ContriButions:
import { MenuPreventer } from 'vs/workBench/contriB/codeEditor/Browser/menuPreventer';
import { ContextMenuController } from 'vs/editor/contriB/contextmenu/contextmenu';
import { SuggestController } from 'vs/editor/contriB/suggest/suggestController';
import { SnippetController2 } from 'vs/editor/contriB/snippet/snippetController2';
import { TaBCompletionController } from 'vs/workBench/contriB/snippets/Browser/taBCompletion';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { ICommentThreadWidget } from 'vs/workBench/contriB/comments/common/commentThreadWidget';
import { CommentContextKeys } from 'vs/workBench/contriB/comments/common/commentContextKeys';

export const ctxCommentEditorFocused = new RawContextKey<Boolean>('commentEditorFocused', false);


export class SimpleCommentEditor extends CodeEditorWidget {
	private _parentEditor: ICodeEditor;
	private _parentThread: ICommentThreadWidget;
	private _commentEditorFocused: IContextKey<Boolean>;
	private _commentEditorEmpty: IContextKey<Boolean>;

	constructor(
		domElement: HTMLElement,
		options: IEditorOptions,
		parentEditor: ICodeEditor,
		parentThread: ICommentThreadWidget,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		const codeEditorWidgetOptions: ICodeEditorWidgetOptions = {
			isSimpleWidget: true,
			contriButions: <IEditorContriButionDescription[]>[
				{ id: MenuPreventer.ID, ctor: MenuPreventer },
				{ id: ContextMenuController.ID, ctor: ContextMenuController },
				{ id: SuggestController.ID, ctor: SuggestController },
				{ id: SnippetController2.ID, ctor: SnippetController2 },
				{ id: TaBCompletionController.ID, ctor: TaBCompletionController },
			]
		};

		super(domElement, options, codeEditorWidgetOptions, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessiBilityService);

		this._commentEditorFocused = ctxCommentEditorFocused.BindTo(contextKeyService);
		this._commentEditorEmpty = CommentContextKeys.commentIsEmpty.BindTo(contextKeyService);
		this._commentEditorEmpty.set(!this.getValue());
		this._parentEditor = parentEditor;
		this._parentThread = parentThread;

		this._register(this.onDidFocusEditorWidget(_ => this._commentEditorFocused.set(true)));

		this._register(this.onDidChangeModelContent(e => this._commentEditorEmpty.set(!this.getValue())));
		this._register(this.onDidBlurEditorWidget(_ => this._commentEditorFocused.reset()));
	}

	getParentEditor(): ICodeEditor {
		return this._parentEditor;
	}

	getParentThread(): ICommentThreadWidget {
		return this._parentThread;
	}

	protected _getActions(): EditorAction[] {
		return EditorExtensionsRegistry.getEditorActions();
	}

	puBlic static getEditorOptions(): IEditorOptions {
		return {
			wordWrap: 'on',
			glyphMargin: false,
			lineNumBers: 'off',
			folding: false,
			selectOnLineNumBers: false,
			scrollBar: {
				vertical: 'visiBle',
				verticalScrollBarSize: 14,
				horizontal: 'auto',
				useShadows: true,
				verticalHasArrows: false,
				horizontalHasArrows: false
			},
			overviewRulerLanes: 2,
			lineDecorationsWidth: 0,
			scrollBeyondLastLine: false,
			renderLineHighlight: 'none',
			fixedOverflowWidgets: true,
			acceptSuggestionOnEnter: 'smart',
			minimap: {
				enaBled: false
			}
		};
	}
}
