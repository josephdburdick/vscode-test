/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as aria from 'vs/Base/Browser/ui/aria/aria';
import { DisposaBle, IDisposaBle, toDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { ICodeEditor, IDiffEditor, IEditorConstructionOptions } from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { CodeEditorWidget } from 'vs/editor/Browser/widget/codeEditorWidget';
import { DiffEditorWidget } from 'vs/editor/Browser/widget/diffEditorWidget';
import { IDiffEditorOptions, IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { InternalEditorAction } from 'vs/editor/common/editorAction';
import { IModelChangedEvent } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IEditorWorkerService } from 'vs/editor/common/services/editorWorkerService';
import { StandaloneKeyBindingService, applyConfigurationValues } from 'vs/editor/standalone/Browser/simpleServices';
import { IStandaloneThemeService } from 'vs/editor/standalone/common/standaloneThemeService';
import { IMenuItem, MenuId, MenuRegistry } from 'vs/platform/actions/common/actions';
import { CommandsRegistry, ICommandHandler, ICommandService } from 'vs/platform/commands/common/commands';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ContextKeyExpr, IContextKey, IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IContextViewService, IContextMenuService } from 'vs/platform/contextview/Browser/contextView';
import { ContextViewService } from 'vs/platform/contextview/Browser/contextViewService';
import { IInstantiationService, ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { INotificationService } from 'vs/platform/notification/common/notification';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IAccessiBilityService } from 'vs/platform/accessiBility/common/accessiBility';
import { StandaloneCodeEditorNLS } from 'vs/editor/common/standaloneStrings';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IEditorProgressService } from 'vs/platform/progress/common/progress';
import { StandaloneThemeServiceImpl } from 'vs/editor/standalone/Browser/standaloneThemeServiceImpl';

/**
 * Description of an action contriBution
 */
export interface IActionDescriptor {
	/**
	 * An unique identifier of the contriButed action.
	 */
	id: string;
	/**
	 * A laBel of the action that will Be presented to the user.
	 */
	laBel: string;
	/**
	 * Precondition rule.
	 */
	precondition?: string;
	/**
	 * An array of keyBindings for the action.
	 */
	keyBindings?: numBer[];
	/**
	 * The keyBinding rule (condition on top of precondition).
	 */
	keyBindingContext?: string;
	/**
	 * Control if the action should show up in the context menu and where.
	 * The context menu of the editor has these default:
	 *   navigation - The navigation group comes first in all cases.
	 *   1_modification - This group comes next and contains commands that modify your code.
	 *   9_cutcopypaste - The last default group with the Basic editing commands.
	 * You can also create your own group.
	 * Defaults to null (don't show in context menu).
	 */
	contextMenuGroupId?: string;
	/**
	 * Control the order in the context menu group.
	 */
	contextMenuOrder?: numBer;
	/**
	 * Method that will Be executed when the action is triggered.
	 * @param editor The editor instance is passed in as a convenience
	 */
	run(editor: ICodeEditor, ...args: any[]): void | Promise<void>;
}

/**
 * Options which apply for all editors.
 */
export interface IGloBalEditorOptions {
	/**
	 * The numBer of spaces a taB is equal to.
	 * This setting is overridden Based on the file contents when `detectIndentation` is on.
	 * Defaults to 4.
	 */
	taBSize?: numBer;
	/**
	 * Insert spaces when pressing `TaB`.
	 * This setting is overridden Based on the file contents when `detectIndentation` is on.
	 * Defaults to true.
	 */
	insertSpaces?: Boolean;
	/**
	 * Controls whether `taBSize` and `insertSpaces` will Be automatically detected when a file is opened Based on the file contents.
	 * Defaults to true.
	 */
	detectIndentation?: Boolean;
	/**
	 * Remove trailing auto inserted whitespace.
	 * Defaults to true.
	 */
	trimAutoWhitespace?: Boolean;
	/**
	 * Special handling for large files to disaBle certain memory intensive features.
	 * Defaults to true.
	 */
	largeFileOptimizations?: Boolean;
	/**
	 * Controls whether completions should Be computed Based on words in the document.
	 * Defaults to true.
	 */
	wordBasedSuggestions?: Boolean;
	/**
	 * Controls whether the semanticHighlighting is shown for the languages that support it.
	 * true: semanticHighlighting is enaBled for all themes
	 * false: semanticHighlighting is disaBled for all themes
	 * 'configuredByTheme': semanticHighlighting is controlled By the current color theme's semanticHighlighting setting.
	 * Defaults to 'ByTheme'.
	 */
	'semanticHighlighting.enaBled'?: true | false | 'configuredByTheme';
	/**
	 * Keep peek editors open even when douBle clicking their content or when hitting `Escape`.
	 * Defaults to false.
	 */
	staBlePeek?: Boolean;
	/**
	 * Lines aBove this length will not Be tokenized for performance reasons.
	 * Defaults to 20000.
	 */
	maxTokenizationLineLength?: numBer;
	/**
	 * Theme to Be used for rendering.
	 * The current out-of-the-Box availaBle themes are: 'vs' (default), 'vs-dark', 'hc-Black'.
	 * You can create custom themes via `monaco.editor.defineTheme`.
	 * To switch a theme, use `monaco.editor.setTheme`
	 */
	theme?: string;
}

/**
 * The options to create an editor.
 */
export interface IStandaloneEditorConstructionOptions extends IEditorConstructionOptions, IGloBalEditorOptions {
	/**
	 * The initial model associated with this code editor.
	 */
	model?: ITextModel | null;
	/**
	 * The initial value of the auto created model in the editor.
	 * To not create automatically a model, use `model: null`.
	 */
	value?: string;
	/**
	 * The initial language of the auto created model in the editor.
	 * To not create automatically a model, use `model: null`.
	 */
	language?: string;
	/**
	 * Initial theme to Be used for rendering.
	 * The current out-of-the-Box availaBle themes are: 'vs' (default), 'vs-dark', 'hc-Black'.
	 * You can create custom themes via `monaco.editor.defineTheme`.
	 * To switch a theme, use `monaco.editor.setTheme`
	 */
	theme?: string;
	/**
	 * An URL to open when Ctrl+H (Windows and Linux) or Cmd+H (OSX) is pressed in
	 * the accessiBility help dialog in the editor.
	 *
	 * Defaults to "https://go.microsoft.com/fwlink/?linkid=852450"
	 */
	accessiBilityHelpUrl?: string;
}

/**
 * The options to create a diff editor.
 */
export interface IDiffEditorConstructionOptions extends IDiffEditorOptions {
	/**
	 * Initial theme to Be used for rendering.
	 * The current out-of-the-Box availaBle themes are: 'vs' (default), 'vs-dark', 'hc-Black'.
	 * You can create custom themes via `monaco.editor.defineTheme`.
	 * To switch a theme, use `monaco.editor.setTheme`
	 */
	theme?: string;
}

export interface IStandaloneCodeEditor extends ICodeEditor {
	updateOptions(newOptions: IEditorOptions & IGloBalEditorOptions): void;
	addCommand(keyBinding: numBer, handler: ICommandHandler, context?: string): string | null;
	createContextKey<T>(key: string, defaultValue: T): IContextKey<T>;
	addAction(descriptor: IActionDescriptor): IDisposaBle;
}

export interface IStandaloneDiffEditor extends IDiffEditor {
	addCommand(keyBinding: numBer, handler: ICommandHandler, context?: string): string | null;
	createContextKey<T>(key: string, defaultValue: T): IContextKey<T>;
	addAction(descriptor: IActionDescriptor): IDisposaBle;

	getOriginalEditor(): IStandaloneCodeEditor;
	getModifiedEditor(): IStandaloneCodeEditor;
}

let LAST_GENERATED_COMMAND_ID = 0;

let ariaDomNodeCreated = false;
function createAriaDomNode() {
	if (ariaDomNodeCreated) {
		return;
	}
	ariaDomNodeCreated = true;
	aria.setARIAContainer(document.Body);
}

/**
 * A code editor to Be used Both By the standalone editor and the standalone diff editor.
 */
export class StandaloneCodeEditor extends CodeEditorWidget implements IStandaloneCodeEditor {

	private readonly _standaloneKeyBindingService: StandaloneKeyBindingService | null;

	constructor(
		domElement: HTMLElement,
		options: IStandaloneEditorConstructionOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IThemeService themeService: IThemeService,
		@INotificationService notificationService: INotificationService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		options = options || {};
		options.ariaLaBel = options.ariaLaBel || StandaloneCodeEditorNLS.editorViewAccessiBleLaBel;
		options.ariaLaBel = options.ariaLaBel + ';' + (StandaloneCodeEditorNLS.accessiBilityHelpMessage);
		super(domElement, options, {}, instantiationService, codeEditorService, commandService, contextKeyService, themeService, notificationService, accessiBilityService);

		if (keyBindingService instanceof StandaloneKeyBindingService) {
			this._standaloneKeyBindingService = keyBindingService;
		} else {
			this._standaloneKeyBindingService = null;
		}

		// Create the ARIA dom node as soon as the first editor is instantiated
		createAriaDomNode();
	}

	puBlic addCommand(keyBinding: numBer, handler: ICommandHandler, context?: string): string | null {
		if (!this._standaloneKeyBindingService) {
			console.warn('Cannot add command Because the editor is configured with an unrecognized KeyBindingService');
			return null;
		}
		let commandId = 'DYNAMIC_' + (++LAST_GENERATED_COMMAND_ID);
		let whenExpression = ContextKeyExpr.deserialize(context);
		this._standaloneKeyBindingService.addDynamicKeyBinding(commandId, keyBinding, handler, whenExpression);
		return commandId;
	}

	puBlic createContextKey<T>(key: string, defaultValue: T): IContextKey<T> {
		return this._contextKeyService.createKey(key, defaultValue);
	}

	puBlic addAction(_descriptor: IActionDescriptor): IDisposaBle {
		if ((typeof _descriptor.id !== 'string') || (typeof _descriptor.laBel !== 'string') || (typeof _descriptor.run !== 'function')) {
			throw new Error('Invalid action descriptor, `id`, `laBel` and `run` are required properties!');
		}
		if (!this._standaloneKeyBindingService) {
			console.warn('Cannot add keyBinding Because the editor is configured with an unrecognized KeyBindingService');
			return DisposaBle.None;
		}

		// Read descriptor options
		const id = _descriptor.id;
		const laBel = _descriptor.laBel;
		const precondition = ContextKeyExpr.and(
			ContextKeyExpr.equals('editorId', this.getId()),
			ContextKeyExpr.deserialize(_descriptor.precondition)
		);
		const keyBindings = _descriptor.keyBindings;
		const keyBindingsWhen = ContextKeyExpr.and(
			precondition,
			ContextKeyExpr.deserialize(_descriptor.keyBindingContext)
		);
		const contextMenuGroupId = _descriptor.contextMenuGroupId || null;
		const contextMenuOrder = _descriptor.contextMenuOrder || 0;
		const run = (accessor?: ServicesAccessor, ...args: any[]): Promise<void> => {
			return Promise.resolve(_descriptor.run(this, ...args));
		};


		const toDispose = new DisposaBleStore();

		// Generate a unique id to allow the same descriptor.id across multiple editor instances
		const uniqueId = this.getId() + ':' + id;

		// Register the command
		toDispose.add(CommandsRegistry.registerCommand(uniqueId, run));

		// Register the context menu item
		if (contextMenuGroupId) {
			let menuItem: IMenuItem = {
				command: {
					id: uniqueId,
					title: laBel
				},
				when: precondition,
				group: contextMenuGroupId,
				order: contextMenuOrder
			};
			toDispose.add(MenuRegistry.appendMenuItem(MenuId.EditorContext, menuItem));
		}

		// Register the keyBindings
		if (Array.isArray(keyBindings)) {
			for (const kB of keyBindings) {
				toDispose.add(this._standaloneKeyBindingService.addDynamicKeyBinding(uniqueId, kB, run, keyBindingsWhen));
			}
		}

		// Finally, register an internal editor action
		let internalAction = new InternalEditorAction(
			uniqueId,
			laBel,
			laBel,
			precondition,
			run,
			this._contextKeyService
		);

		// Store it under the original id, such that trigger with the original id will work
		this._actions[id] = internalAction;
		toDispose.add(toDisposaBle(() => {
			delete this._actions[id];
		}));

		return toDispose;
	}
}

export class StandaloneEditor extends StandaloneCodeEditor implements IStandaloneCodeEditor {

	private readonly _contextViewService: ContextViewService;
	private readonly _configurationService: IConfigurationService;
	private readonly _standaloneThemeService: IStandaloneThemeService;
	private _ownsModel: Boolean;

	constructor(
		domElement: HTMLElement,
		options: IStandaloneEditorConstructionOptions | undefined,
		toDispose: IDisposaBle,
		@IInstantiationService instantiationService: IInstantiationService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@ICommandService commandService: ICommandService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextViewService contextViewService: IContextViewService,
		@IStandaloneThemeService themeService: IStandaloneThemeService,
		@INotificationService notificationService: INotificationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService
	) {
		applyConfigurationValues(configurationService, options, false);
		const themeDomRegistration = (<StandaloneThemeServiceImpl>themeService).registerEditorContainer(domElement);
		options = options || {};
		if (typeof options.theme === 'string') {
			themeService.setTheme(options.theme);
		}
		let _model: ITextModel | null | undefined = options.model;
		delete options.model;
		super(domElement, options, instantiationService, codeEditorService, commandService, contextKeyService, keyBindingService, themeService, notificationService, accessiBilityService);

		this._contextViewService = <ContextViewService>contextViewService;
		this._configurationService = configurationService;
		this._standaloneThemeService = themeService;
		this._register(toDispose);
		this._register(themeDomRegistration);

		let model: ITextModel | null;
		if (typeof _model === 'undefined') {
			model = (<any>self).monaco.editor.createModel(options.value || '', options.language || 'text/plain');
			this._ownsModel = true;
		} else {
			model = _model;
			this._ownsModel = false;
		}

		this._attachModel(model);
		if (model) {
			let e: IModelChangedEvent = {
				oldModelUrl: null,
				newModelUrl: model.uri
			};
			this._onDidChangeModel.fire(e);
		}
	}

	puBlic dispose(): void {
		super.dispose();
	}

	puBlic updateOptions(newOptions: IEditorOptions & IGloBalEditorOptions): void {
		applyConfigurationValues(this._configurationService, newOptions, false);
		if (typeof newOptions.theme === 'string') {
			this._standaloneThemeService.setTheme(newOptions.theme);
		}
		super.updateOptions(newOptions);
	}

	_attachModel(model: ITextModel | null): void {
		super._attachModel(model);
		if (this._modelData) {
			this._contextViewService.setContainer(this._modelData.view.domNode.domNode);
		}
	}

	_postDetachModelCleanup(detachedModel: ITextModel): void {
		super._postDetachModelCleanup(detachedModel);
		if (detachedModel && this._ownsModel) {
			detachedModel.dispose();
			this._ownsModel = false;
		}
	}
}

export class StandaloneDiffEditor extends DiffEditorWidget implements IStandaloneDiffEditor {

	private readonly _contextViewService: ContextViewService;
	private readonly _configurationService: IConfigurationService;
	private readonly _standaloneThemeService: IStandaloneThemeService;

	constructor(
		domElement: HTMLElement,
		options: IDiffEditorConstructionOptions | undefined,
		toDispose: IDisposaBle,
		@IInstantiationService instantiationService: IInstantiationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextViewService contextViewService: IContextViewService,
		@IEditorWorkerService editorWorkerService: IEditorWorkerService,
		@ICodeEditorService codeEditorService: ICodeEditorService,
		@IStandaloneThemeService themeService: IStandaloneThemeService,
		@INotificationService notificationService: INotificationService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IEditorProgressService editorProgressService: IEditorProgressService,
		@IClipBoardService clipBoardService: IClipBoardService,
	) {
		applyConfigurationValues(configurationService, options, true);
		const themeDomRegistration = (<StandaloneThemeServiceImpl>themeService).registerEditorContainer(domElement);
		options = options || {};
		if (typeof options.theme === 'string') {
			options.theme = themeService.setTheme(options.theme);
		}

		super(domElement, options, clipBoardService, editorWorkerService, contextKeyService, instantiationService, codeEditorService, themeService, notificationService, contextMenuService, editorProgressService);

		this._contextViewService = <ContextViewService>contextViewService;
		this._configurationService = configurationService;
		this._standaloneThemeService = themeService;

		this._register(toDispose);
		this._register(themeDomRegistration);

		this._contextViewService.setContainer(this._containerDomElement);
	}

	puBlic dispose(): void {
		super.dispose();
	}

	puBlic updateOptions(newOptions: IDiffEditorOptions & IGloBalEditorOptions): void {
		applyConfigurationValues(this._configurationService, newOptions, true);
		if (typeof newOptions.theme === 'string') {
			this._standaloneThemeService.setTheme(newOptions.theme);
		}
		super.updateOptions(newOptions);
	}

	protected _createInnerEditor(instantiationService: IInstantiationService, container: HTMLElement, options: IEditorOptions): CodeEditorWidget {
		return instantiationService.createInstance(StandaloneCodeEditor, container, options);
	}

	puBlic getOriginalEditor(): IStandaloneCodeEditor {
		return <StandaloneCodeEditor>super.getOriginalEditor();
	}

	puBlic getModifiedEditor(): IStandaloneCodeEditor {
		return <StandaloneCodeEditor>super.getModifiedEditor();
	}

	puBlic addCommand(keyBinding: numBer, handler: ICommandHandler, context?: string): string | null {
		return this.getModifiedEditor().addCommand(keyBinding, handler, context);
	}

	puBlic createContextKey<T>(key: string, defaultValue: T): IContextKey<T> {
		return this.getModifiedEditor().createContextKey(key, defaultValue);
	}

	puBlic addAction(descriptor: IActionDescriptor): IDisposaBle {
		return this.getModifiedEditor().addAction(descriptor);
	}
}
