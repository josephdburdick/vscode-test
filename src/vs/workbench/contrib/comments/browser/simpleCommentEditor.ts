/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { EditorAction, EditorExtensionsRegistry, IEditorContributionDescription } from 'vs/editor/browser/editorExtensions';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { CodeEditorWidget, ICodeEditorWidgetOptions } from 'vs/editor/browser/widget/codeEditorWidget';
import { IContextKeyService, RAwContextKey, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';

// Allowed Editor Contributions:
import { MenuPreventer } from 'vs/workbench/contrib/codeEditor/browser/menuPreventer';
import { ContextMenuController } from 'vs/editor/contrib/contextmenu/contextmenu';
import { SuggestController } from 'vs/editor/contrib/suggest/suggestController';
import { SnippetController2 } from 'vs/editor/contrib/snippet/snippetController2';
import { TAbCompletionController } from 'vs/workbench/contrib/snippets/browser/tAbCompletion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { ICommentThreAdWidget } from 'vs/workbench/contrib/comments/common/commentThreAdWidget';
import { CommentContextKeys } from 'vs/workbench/contrib/comments/common/commentContextKeys';

export const ctxCommentEditorFocused = new RAwContextKey<booleAn>('commentEditorFocused', fAlse);


export clAss SimpleCommentEditor extends CodeEditorWidget {
	privAte _pArentEditor: ICodeEditor;
	privAte _pArentThreAd: ICommentThreAdWidget;
	privAte _commentEditorFocused: IContextKey<booleAn>;
	privAte _commentEditorEmpty: IContextKey<booleAn>;

	constructor(
		domElement: HTMLElement,
		options: IEditorOptions,
		pArentEditor: ICodeEditor,
		pArentThreAd: ICommentThreAdWidget,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommAndService commAndService: ICommAndService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		const codeEditorWidgetOptions: ICodeEditorWidgetOptions = {
			isSimpleWidget: true,
			contributions: <IEditorContributionDescription[]>[
				{ id: MenuPreventer.ID, ctor: MenuPreventer },
				{ id: ContextMenuController.ID, ctor: ContextMenuController },
				{ id: SuggestController.ID, ctor: SuggestController },
				{ id: SnippetController2.ID, ctor: SnippetController2 },
				{ id: TAbCompletionController.ID, ctor: TAbCompletionController },
			]
		};

		super(domElement, options, codeEditorWidgetOptions, instAntiAtionService, codeEditorService, commAndService, contextKeyService, themeService, notificAtionService, AccessibilityService);

		this._commentEditorFocused = ctxCommentEditorFocused.bindTo(contextKeyService);
		this._commentEditorEmpty = CommentContextKeys.commentIsEmpty.bindTo(contextKeyService);
		this._commentEditorEmpty.set(!this.getVAlue());
		this._pArentEditor = pArentEditor;
		this._pArentThreAd = pArentThreAd;

		this._register(this.onDidFocusEditorWidget(_ => this._commentEditorFocused.set(true)));

		this._register(this.onDidChAngeModelContent(e => this._commentEditorEmpty.set(!this.getVAlue())));
		this._register(this.onDidBlurEditorWidget(_ => this._commentEditorFocused.reset()));
	}

	getPArentEditor(): ICodeEditor {
		return this._pArentEditor;
	}

	getPArentThreAd(): ICommentThreAdWidget {
		return this._pArentThreAd;
	}

	protected _getActions(): EditorAction[] {
		return EditorExtensionsRegistry.getEditorActions();
	}

	public stAtic getEditorOptions(): IEditorOptions {
		return {
			wordWrAp: 'on',
			glyphMArgin: fAlse,
			lineNumbers: 'off',
			folding: fAlse,
			selectOnLineNumbers: fAlse,
			scrollbAr: {
				verticAl: 'visible',
				verticAlScrollbArSize: 14,
				horizontAl: 'Auto',
				useShAdows: true,
				verticAlHAsArrows: fAlse,
				horizontAlHAsArrows: fAlse
			},
			overviewRulerLAnes: 2,
			lineDecorAtionsWidth: 0,
			scrollBeyondLAstLine: fAlse,
			renderLineHighlight: 'none',
			fixedOverflowWidgets: true,
			AcceptSuggestionOnEnter: 'smArt',
			minimAp: {
				enAbled: fAlse
			}
		};
	}
}
