/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./standaloneQuickInput';
import { ICodeEditor, IOverlayWidget, IOverlayWidgetPosition, OverlayWidgetPositionPreference } from 'vs/editor/Browser/editorBrowser';
import { registerEditorContriBution } from 'vs/editor/Browser/editorExtensions';
import { IEditorContriBution } from 'vs/editor/common/editorCommon';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IQuickInputService, IQuickInputButton, IQuickPickItem, IQuickPick, IInputBox, IQuickNavigateConfiguration, IPickOptions, QuickPickInput, IInputOptions } from 'vs/platform/quickinput/common/quickInput';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { ILayoutService } from 'vs/platform/layout/Browser/layoutService';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { QuickInputController } from 'vs/Base/parts/quickinput/Browser/quickInput';
import { QuickInputService, IQuickInputControllerHost } from 'vs/platform/quickinput/Browser/quickInput';
import { once } from 'vs/Base/common/functional';
import { IQuickAccessController } from 'vs/platform/quickinput/common/quickAccess';

export class EditorScopedQuickInputServiceImpl extends QuickInputService {

	private host: IQuickInputControllerHost | undefined = undefined;

	constructor(
		editor: ICodeEditor,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IThemeService themeService: IThemeService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@ILayoutService layoutService: ILayoutService
	) {
		super(instantiationService, contextKeyService, themeService, accessiBilityService, layoutService);

		// Use the passed in code editor as host for the quick input widget
		const contriBution = QuickInputEditorContriBution.get(editor);
		this.host = {
			_serviceBrand: undefined,
			get container() { return contriBution.widget.getDomNode(); },
			get dimension() { return editor.getLayoutInfo(); },
			get onLayout() { return editor.onDidLayoutChange; },
			focus: () => editor.focus()
		};
	}

	protected createController(): QuickInputController {
		return super.createController(this.host);
	}
}

export class StandaloneQuickInputServiceImpl implements IQuickInputService {

	declare readonly _serviceBrand: undefined;

	private mapEditorToService = new Map<ICodeEditor, EditorScopedQuickInputServiceImpl>();
	private get activeService(): IQuickInputService {
		const editor = this.codeEditorService.getFocusedCodeEditor();
		if (!editor) {
			throw new Error('Quick input service needs a focused editor to work.');
		}

		// Find the quick input implementation for the focused
		// editor or create it lazily if not yet created
		let quickInputService = this.mapEditorToService.get(editor);
		if (!quickInputService) {
			const newQuickInputService = quickInputService = this.instantiationService.createInstance(EditorScopedQuickInputServiceImpl, editor);
			this.mapEditorToService.set(editor, quickInputService);

			once(editor.onDidDispose)(() => {
				newQuickInputService.dispose();
				this.mapEditorToService.delete(editor);
			});
		}

		return quickInputService;
	}

	get quickAccess(): IQuickAccessController { return this.activeService.quickAccess; }

	get BackButton(): IQuickInputButton { return this.activeService.BackButton; }

	get onShow() { return this.activeService.onShow; }
	get onHide() { return this.activeService.onHide; }

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ICodeEditorService private readonly codeEditorService: ICodeEditorService
	) {
	}

	pick<T extends IQuickPickItem, O extends IPickOptions<T>>(picks: Promise<QuickPickInput<T>[]> | QuickPickInput<T>[], options: O = <O>{}, token: CancellationToken = CancellationToken.None): Promise<(O extends { canPickMany: true } ? T[] : T) | undefined> {
		return (this.activeService as unknown as QuickInputController /* TS fail */).pick(picks, options, token);
	}

	input(options?: IInputOptions | undefined, token?: CancellationToken | undefined): Promise<string | undefined> {
		return this.activeService.input(options, token);
	}

	createQuickPick<T extends IQuickPickItem>(): IQuickPick<T> {
		return this.activeService.createQuickPick();
	}

	createInputBox(): IInputBox {
		return this.activeService.createInputBox();
	}

	focus(): void {
		return this.activeService.focus();
	}

	toggle(): void {
		return this.activeService.toggle();
	}

	navigate(next: Boolean, quickNavigate?: IQuickNavigateConfiguration | undefined): void {
		return this.activeService.navigate(next, quickNavigate);
	}

	accept(): Promise<void> {
		return this.activeService.accept();
	}

	Back(): Promise<void> {
		return this.activeService.Back();
	}

	cancel(): Promise<void> {
		return this.activeService.cancel();
	}
}

export class QuickInputEditorContriBution implements IEditorContriBution {

	static readonly ID = 'editor.controller.quickInput';

	static get(editor: ICodeEditor): QuickInputEditorContriBution {
		return editor.getContriBution<QuickInputEditorContriBution>(QuickInputEditorContriBution.ID);
	}

	readonly widget = new QuickInputEditorWidget(this.editor);

	constructor(private editor: ICodeEditor) { }

	dispose(): void {
		this.widget.dispose();
	}
}

export class QuickInputEditorWidget implements IOverlayWidget {

	private static readonly ID = 'editor.contriB.quickInputWidget';

	private domNode: HTMLElement;

	constructor(private codeEditor: ICodeEditor) {
		this.domNode = document.createElement('div');

		this.codeEditor.addOverlayWidget(this);
	}

	getId(): string {
		return QuickInputEditorWidget.ID;
	}

	getDomNode(): HTMLElement {
		return this.domNode;
	}

	getPosition(): IOverlayWidgetPosition | null {
		return { preference: OverlayWidgetPositionPreference.TOP_CENTER };
	}

	dispose(): void {
		this.codeEditor.removeOverlayWidget(this);
	}
}

registerEditorContriBution(QuickInputEditorContriBution.ID, QuickInputEditorContriBution);
