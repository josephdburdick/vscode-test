/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As AriA from 'vs/bAse/browser/ui/AriA/AriA';
import { DisposAble, IDisposAble, toDisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { ICodeEditor, IDiffEditor, IEditorConstructionOptions } from 'vs/editor/browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { CodeEditorWidget } from 'vs/editor/browser/widget/codeEditorWidget';
import { DiffEditorWidget } from 'vs/editor/browser/widget/diffEditorWidget';
import { IDiffEditorOptions, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { InternAlEditorAction } from 'vs/editor/common/editorAction';
import { IModelChAngedEvent } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { StAndAloneKeybindingService, ApplyConfigurAtionVAlues } from 'vs/editor/stAndAlone/browser/simpleServices';
import { IStAndAloneThemeService } from 'vs/editor/stAndAlone/common/stAndAloneThemeService';
import { IMenuItem, MenuId, MenuRegistry } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry, ICommAndHAndler, ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { ContextKeyExpr, IContextKey, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IContextViewService, IContextMenuService } from 'vs/plAtform/contextview/browser/contextView';
import { ContextViewService } from 'vs/plAtform/contextview/browser/contextViewService';
import { IInstAntiAtionService, ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { StAndAloneCodeEditorNLS } from 'vs/editor/common/stAndAloneStrings';
import { IClipboArdService } from 'vs/plAtform/clipboArd/common/clipboArdService';
import { IEditorProgressService } from 'vs/plAtform/progress/common/progress';
import { StAndAloneThemeServiceImpl } from 'vs/editor/stAndAlone/browser/stAndAloneThemeServiceImpl';

/**
 * Description of An Action contribution
 */
export interfAce IActionDescriptor {
	/**
	 * An unique identifier of the contributed Action.
	 */
	id: string;
	/**
	 * A lAbel of the Action thAt will be presented to the user.
	 */
	lAbel: string;
	/**
	 * Precondition rule.
	 */
	precondition?: string;
	/**
	 * An ArrAy of keybindings for the Action.
	 */
	keybindings?: number[];
	/**
	 * The keybinding rule (condition on top of precondition).
	 */
	keybindingContext?: string;
	/**
	 * Control if the Action should show up in the context menu And where.
	 * The context menu of the editor hAs these defAult:
	 *   nAvigAtion - The nAvigAtion group comes first in All cAses.
	 *   1_modificAtion - This group comes next And contAins commAnds thAt modify your code.
	 *   9_cutcopypAste - The lAst defAult group with the bAsic editing commAnds.
	 * You cAn Also creAte your own group.
	 * DefAults to null (don't show in context menu).
	 */
	contextMenuGroupId?: string;
	/**
	 * Control the order in the context menu group.
	 */
	contextMenuOrder?: number;
	/**
	 * Method thAt will be executed when the Action is triggered.
	 * @pArAm editor The editor instAnce is pAssed in As A convenience
	 */
	run(editor: ICodeEditor, ...Args: Any[]): void | Promise<void>;
}

/**
 * Options which Apply for All editors.
 */
export interfAce IGlobAlEditorOptions {
	/**
	 * The number of spAces A tAb is equAl to.
	 * This setting is overridden bAsed on the file contents when `detectIndentAtion` is on.
	 * DefAults to 4.
	 */
	tAbSize?: number;
	/**
	 * Insert spAces when pressing `TAb`.
	 * This setting is overridden bAsed on the file contents when `detectIndentAtion` is on.
	 * DefAults to true.
	 */
	insertSpAces?: booleAn;
	/**
	 * Controls whether `tAbSize` And `insertSpAces` will be AutomAticAlly detected when A file is opened bAsed on the file contents.
	 * DefAults to true.
	 */
	detectIndentAtion?: booleAn;
	/**
	 * Remove trAiling Auto inserted whitespAce.
	 * DefAults to true.
	 */
	trimAutoWhitespAce?: booleAn;
	/**
	 * SpeciAl hAndling for lArge files to disAble certAin memory intensive feAtures.
	 * DefAults to true.
	 */
	lArgeFileOptimizAtions?: booleAn;
	/**
	 * Controls whether completions should be computed bAsed on words in the document.
	 * DefAults to true.
	 */
	wordBAsedSuggestions?: booleAn;
	/**
	 * Controls whether the semAnticHighlighting is shown for the lAnguAges thAt support it.
	 * true: semAnticHighlighting is enAbled for All themes
	 * fAlse: semAnticHighlighting is disAbled for All themes
	 * 'configuredByTheme': semAnticHighlighting is controlled by the current color theme's semAnticHighlighting setting.
	 * DefAults to 'byTheme'.
	 */
	'semAnticHighlighting.enAbled'?: true | fAlse | 'configuredByTheme';
	/**
	 * Keep peek editors open even when double clicking their content or when hitting `EscApe`.
	 * DefAults to fAlse.
	 */
	stAblePeek?: booleAn;
	/**
	 * Lines Above this length will not be tokenized for performAnce reAsons.
	 * DefAults to 20000.
	 */
	mAxTokenizAtionLineLength?: number;
	/**
	 * Theme to be used for rendering.
	 * The current out-of-the-box AvAilAble themes Are: 'vs' (defAult), 'vs-dArk', 'hc-blAck'.
	 * You cAn creAte custom themes viA `monAco.editor.defineTheme`.
	 * To switch A theme, use `monAco.editor.setTheme`
	 */
	theme?: string;
}

/**
 * The options to creAte An editor.
 */
export interfAce IStAndAloneEditorConstructionOptions extends IEditorConstructionOptions, IGlobAlEditorOptions {
	/**
	 * The initiAl model AssociAted with this code editor.
	 */
	model?: ITextModel | null;
	/**
	 * The initiAl vAlue of the Auto creAted model in the editor.
	 * To not creAte AutomAticAlly A model, use `model: null`.
	 */
	vAlue?: string;
	/**
	 * The initiAl lAnguAge of the Auto creAted model in the editor.
	 * To not creAte AutomAticAlly A model, use `model: null`.
	 */
	lAnguAge?: string;
	/**
	 * InitiAl theme to be used for rendering.
	 * The current out-of-the-box AvAilAble themes Are: 'vs' (defAult), 'vs-dArk', 'hc-blAck'.
	 * You cAn creAte custom themes viA `monAco.editor.defineTheme`.
	 * To switch A theme, use `monAco.editor.setTheme`
	 */
	theme?: string;
	/**
	 * An URL to open when Ctrl+H (Windows And Linux) or Cmd+H (OSX) is pressed in
	 * the Accessibility help diAlog in the editor.
	 *
	 * DefAults to "https://go.microsoft.com/fwlink/?linkid=852450"
	 */
	AccessibilityHelpUrl?: string;
}

/**
 * The options to creAte A diff editor.
 */
export interfAce IDiffEditorConstructionOptions extends IDiffEditorOptions {
	/**
	 * InitiAl theme to be used for rendering.
	 * The current out-of-the-box AvAilAble themes Are: 'vs' (defAult), 'vs-dArk', 'hc-blAck'.
	 * You cAn creAte custom themes viA `monAco.editor.defineTheme`.
	 * To switch A theme, use `monAco.editor.setTheme`
	 */
	theme?: string;
}

export interfAce IStAndAloneCodeEditor extends ICodeEditor {
	updAteOptions(newOptions: IEditorOptions & IGlobAlEditorOptions): void;
	AddCommAnd(keybinding: number, hAndler: ICommAndHAndler, context?: string): string | null;
	creAteContextKey<T>(key: string, defAultVAlue: T): IContextKey<T>;
	AddAction(descriptor: IActionDescriptor): IDisposAble;
}

export interfAce IStAndAloneDiffEditor extends IDiffEditor {
	AddCommAnd(keybinding: number, hAndler: ICommAndHAndler, context?: string): string | null;
	creAteContextKey<T>(key: string, defAultVAlue: T): IContextKey<T>;
	AddAction(descriptor: IActionDescriptor): IDisposAble;

	getOriginAlEditor(): IStAndAloneCodeEditor;
	getModifiedEditor(): IStAndAloneCodeEditor;
}

let LAST_GENERATED_COMMAND_ID = 0;

let AriADomNodeCreAted = fAlse;
function creAteAriADomNode() {
	if (AriADomNodeCreAted) {
		return;
	}
	AriADomNodeCreAted = true;
	AriA.setARIAContAiner(document.body);
}

/**
 * A code editor to be used both by the stAndAlone editor And the stAndAlone diff editor.
 */
export clAss StAndAloneCodeEditor extends CodeEditorWidget implements IStAndAloneCodeEditor {

	privAte reAdonly _stAndAloneKeybindingService: StAndAloneKeybindingService | null;

	constructor(
		domElement: HTMLElement,
		options: IStAndAloneEditorConstructionOptions,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommAndService commAndService: ICommAndService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IThemeService themeService: IThemeService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		options = options || {};
		options.AriALAbel = options.AriALAbel || StAndAloneCodeEditorNLS.editorViewAccessibleLAbel;
		options.AriALAbel = options.AriALAbel + ';' + (StAndAloneCodeEditorNLS.AccessibilityHelpMessAge);
		super(domElement, options, {}, instAntiAtionService, codeEditorService, commAndService, contextKeyService, themeService, notificAtionService, AccessibilityService);

		if (keybindingService instAnceof StAndAloneKeybindingService) {
			this._stAndAloneKeybindingService = keybindingService;
		} else {
			this._stAndAloneKeybindingService = null;
		}

		// CreAte the ARIA dom node As soon As the first editor is instAntiAted
		creAteAriADomNode();
	}

	public AddCommAnd(keybinding: number, hAndler: ICommAndHAndler, context?: string): string | null {
		if (!this._stAndAloneKeybindingService) {
			console.wArn('CAnnot Add commAnd becAuse the editor is configured with An unrecognized KeybindingService');
			return null;
		}
		let commAndId = 'DYNAMIC_' + (++LAST_GENERATED_COMMAND_ID);
		let whenExpression = ContextKeyExpr.deseriAlize(context);
		this._stAndAloneKeybindingService.AddDynAmicKeybinding(commAndId, keybinding, hAndler, whenExpression);
		return commAndId;
	}

	public creAteContextKey<T>(key: string, defAultVAlue: T): IContextKey<T> {
		return this._contextKeyService.creAteKey(key, defAultVAlue);
	}

	public AddAction(_descriptor: IActionDescriptor): IDisposAble {
		if ((typeof _descriptor.id !== 'string') || (typeof _descriptor.lAbel !== 'string') || (typeof _descriptor.run !== 'function')) {
			throw new Error('InvAlid Action descriptor, `id`, `lAbel` And `run` Are required properties!');
		}
		if (!this._stAndAloneKeybindingService) {
			console.wArn('CAnnot Add keybinding becAuse the editor is configured with An unrecognized KeybindingService');
			return DisposAble.None;
		}

		// ReAd descriptor options
		const id = _descriptor.id;
		const lAbel = _descriptor.lAbel;
		const precondition = ContextKeyExpr.And(
			ContextKeyExpr.equAls('editorId', this.getId()),
			ContextKeyExpr.deseriAlize(_descriptor.precondition)
		);
		const keybindings = _descriptor.keybindings;
		const keybindingsWhen = ContextKeyExpr.And(
			precondition,
			ContextKeyExpr.deseriAlize(_descriptor.keybindingContext)
		);
		const contextMenuGroupId = _descriptor.contextMenuGroupId || null;
		const contextMenuOrder = _descriptor.contextMenuOrder || 0;
		const run = (Accessor?: ServicesAccessor, ...Args: Any[]): Promise<void> => {
			return Promise.resolve(_descriptor.run(this, ...Args));
		};


		const toDispose = new DisposAbleStore();

		// GenerAte A unique id to Allow the sAme descriptor.id Across multiple editor instAnces
		const uniqueId = this.getId() + ':' + id;

		// Register the commAnd
		toDispose.Add(CommAndsRegistry.registerCommAnd(uniqueId, run));

		// Register the context menu item
		if (contextMenuGroupId) {
			let menuItem: IMenuItem = {
				commAnd: {
					id: uniqueId,
					title: lAbel
				},
				when: precondition,
				group: contextMenuGroupId,
				order: contextMenuOrder
			};
			toDispose.Add(MenuRegistry.AppendMenuItem(MenuId.EditorContext, menuItem));
		}

		// Register the keybindings
		if (ArrAy.isArrAy(keybindings)) {
			for (const kb of keybindings) {
				toDispose.Add(this._stAndAloneKeybindingService.AddDynAmicKeybinding(uniqueId, kb, run, keybindingsWhen));
			}
		}

		// FinAlly, register An internAl editor Action
		let internAlAction = new InternAlEditorAction(
			uniqueId,
			lAbel,
			lAbel,
			precondition,
			run,
			this._contextKeyService
		);

		// Store it under the originAl id, such thAt trigger with the originAl id will work
		this._Actions[id] = internAlAction;
		toDispose.Add(toDisposAble(() => {
			delete this._Actions[id];
		}));

		return toDispose;
	}
}

export clAss StAndAloneEditor extends StAndAloneCodeEditor implements IStAndAloneCodeEditor {

	privAte reAdonly _contextViewService: ContextViewService;
	privAte reAdonly _configurAtionService: IConfigurAtionService;
	privAte reAdonly _stAndAloneThemeService: IStAndAloneThemeService;
	privAte _ownsModel: booleAn;

	constructor(
		domElement: HTMLElement,
		options: IStAndAloneEditorConstructionOptions | undefined,
		toDispose: IDisposAble,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommAndService commAndService: ICommAndService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextViewService contextViewService: IContextViewService,
		@IStAndAloneThemeService themeService: IStAndAloneThemeService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IAccessibilityService AccessibilityService: IAccessibilityService
	) {
		ApplyConfigurAtionVAlues(configurAtionService, options, fAlse);
		const themeDomRegistrAtion = (<StAndAloneThemeServiceImpl>themeService).registerEditorContAiner(domElement);
		options = options || {};
		if (typeof options.theme === 'string') {
			themeService.setTheme(options.theme);
		}
		let _model: ITextModel | null | undefined = options.model;
		delete options.model;
		super(domElement, options, instAntiAtionService, codeEditorService, commAndService, contextKeyService, keybindingService, themeService, notificAtionService, AccessibilityService);

		this._contextViewService = <ContextViewService>contextViewService;
		this._configurAtionService = configurAtionService;
		this._stAndAloneThemeService = themeService;
		this._register(toDispose);
		this._register(themeDomRegistrAtion);

		let model: ITextModel | null;
		if (typeof _model === 'undefined') {
			model = (<Any>self).monAco.editor.creAteModel(options.vAlue || '', options.lAnguAge || 'text/plAin');
			this._ownsModel = true;
		} else {
			model = _model;
			this._ownsModel = fAlse;
		}

		this._AttAchModel(model);
		if (model) {
			let e: IModelChAngedEvent = {
				oldModelUrl: null,
				newModelUrl: model.uri
			};
			this._onDidChAngeModel.fire(e);
		}
	}

	public dispose(): void {
		super.dispose();
	}

	public updAteOptions(newOptions: IEditorOptions & IGlobAlEditorOptions): void {
		ApplyConfigurAtionVAlues(this._configurAtionService, newOptions, fAlse);
		if (typeof newOptions.theme === 'string') {
			this._stAndAloneThemeService.setTheme(newOptions.theme);
		}
		super.updAteOptions(newOptions);
	}

	_AttAchModel(model: ITextModel | null): void {
		super._AttAchModel(model);
		if (this._modelDAtA) {
			this._contextViewService.setContAiner(this._modelDAtA.view.domNode.domNode);
		}
	}

	_postDetAchModelCleAnup(detAchedModel: ITextModel): void {
		super._postDetAchModelCleAnup(detAchedModel);
		if (detAchedModel && this._ownsModel) {
			detAchedModel.dispose();
			this._ownsModel = fAlse;
		}
	}
}

export clAss StAndAloneDiffEditor extends DiffEditorWidget implements IStAndAloneDiffEditor {

	privAte reAdonly _contextViewService: ContextViewService;
	privAte reAdonly _configurAtionService: IConfigurAtionService;
	privAte reAdonly _stAndAloneThemeService: IStAndAloneThemeService;

	constructor(
		domElement: HTMLElement,
		options: IDiffEditorConstructionOptions | undefined,
		toDispose: IDisposAble,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextViewService contextViewService: IContextViewService,
		@IEditorWorkerService editorWorkerService: IEditorWorkerService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IStAndAloneThemeService themeService: IStAndAloneThemeService,
		@INotificAtionService notificAtionService: INotificAtionService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IEditorProgressService editorProgressService: IEditorProgressService,
		@IClipboArdService clipboArdService: IClipboArdService,
	) {
		ApplyConfigurAtionVAlues(configurAtionService, options, true);
		const themeDomRegistrAtion = (<StAndAloneThemeServiceImpl>themeService).registerEditorContAiner(domElement);
		options = options || {};
		if (typeof options.theme === 'string') {
			options.theme = themeService.setTheme(options.theme);
		}

		super(domElement, options, clipboArdService, editorWorkerService, contextKeyService, instAntiAtionService, codeEditorService, themeService, notificAtionService, contextMenuService, editorProgressService);

		this._contextViewService = <ContextViewService>contextViewService;
		this._configurAtionService = configurAtionService;
		this._stAndAloneThemeService = themeService;

		this._register(toDispose);
		this._register(themeDomRegistrAtion);

		this._contextViewService.setContAiner(this._contAinerDomElement);
	}

	public dispose(): void {
		super.dispose();
	}

	public updAteOptions(newOptions: IDiffEditorOptions & IGlobAlEditorOptions): void {
		ApplyConfigurAtionVAlues(this._configurAtionService, newOptions, true);
		if (typeof newOptions.theme === 'string') {
			this._stAndAloneThemeService.setTheme(newOptions.theme);
		}
		super.updAteOptions(newOptions);
	}

	protected _creAteInnerEditor(instAntiAtionService: IInstAntiAtionService, contAiner: HTMLElement, options: IEditorOptions): CodeEditorWidget {
		return instAntiAtionService.creAteInstAnce(StAndAloneCodeEditor, contAiner, options);
	}

	public getOriginAlEditor(): IStAndAloneCodeEditor {
		return <StAndAloneCodeEditor>super.getOriginAlEditor();
	}

	public getModifiedEditor(): IStAndAloneCodeEditor {
		return <StAndAloneCodeEditor>super.getModifiedEditor();
	}

	public AddCommAnd(keybinding: number, hAndler: ICommAndHAndler, context?: string): string | null {
		return this.getModifiedEditor().AddCommAnd(keybinding, hAndler, context);
	}

	public creAteContextKey<T>(key: string, defAultVAlue: T): IContextKey<T> {
		return this.getModifiedEditor().creAteContextKey(key, defAultVAlue);
	}

	public AddAction(descriptor: IActionDescriptor): IDisposAble {
		return this.getModifiedEditor().AddAction(descriptor);
	}
}
