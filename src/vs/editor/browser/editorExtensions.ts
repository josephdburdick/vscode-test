/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IPosition } from 'vs/Base/Browser/ui/contextview/contextview';
import { illegalArgument } from 'vs/Base/common/errors';
import { URI } from 'vs/Base/common/uri';
import { ICodeEditor, IDiffEditor } from 'vs/editor/Browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/Browser/services/codeEditorService';
import { Position } from 'vs/editor/common/core/position';
import { IEditorContriBution, IDiffEditorContriBution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { MenuId, MenuRegistry, Action2 } from 'vs/platform/actions/common/actions';
import { CommandsRegistry, ICommandHandlerDescription } from 'vs/platform/commands/common/commands';
import { ContextKeyExpr, IContextKeyService, ContextKeyExpression } from 'vs/platform/contextkey/common/contextkey';
import { IConstructorSignature1, ServicesAccessor as InstantiationServicesAccessor, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindings, KeyBindingsRegistry, KeyBindingWeight } from 'vs/platform/keyBinding/common/keyBindingsRegistry';
import { Registry } from 'vs/platform/registry/common/platform';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { withNullAsUndefined, assertType } from 'vs/Base/common/types';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { IDisposaBle } from 'vs/Base/common/lifecycle';
import { KeyMod, KeyCode } from 'vs/Base/common/keyCodes';


export type ServicesAccessor = InstantiationServicesAccessor;
export type IEditorContriButionCtor = IConstructorSignature1<ICodeEditor, IEditorContriBution>;
export type IDiffEditorContriButionCtor = IConstructorSignature1<IDiffEditor, IDiffEditorContriBution>;

export interface IEditorContriButionDescription {
	id: string;
	ctor: IEditorContriButionCtor;
}

export interface IDiffEditorContriButionDescription {
	id: string;
	ctor: IDiffEditorContriButionCtor;
}

//#region Command

export interface ICommandKeyBindingsOptions extends IKeyBindings {
	kBExpr?: ContextKeyExpression | null;
	weight: numBer;
	/**
	 * the default keyBinding arguments
	 */
	args?: any;
}
export interface ICommandMenuOptions {
	menuId: MenuId;
	group: string;
	order: numBer;
	when?: ContextKeyExpression;
	title: string;
	icon?: ThemeIcon
}
export interface ICommandOptions {
	id: string;
	precondition: ContextKeyExpression | undefined;
	kBOpts?: ICommandKeyBindingsOptions;
	description?: ICommandHandlerDescription;
	menuOpts?: ICommandMenuOptions | ICommandMenuOptions[];
}
export aBstract class Command {
	puBlic readonly id: string;
	puBlic readonly precondition: ContextKeyExpression | undefined;
	private readonly _kBOpts: ICommandKeyBindingsOptions | undefined;
	private readonly _menuOpts: ICommandMenuOptions | ICommandMenuOptions[] | undefined;
	private readonly _description: ICommandHandlerDescription | undefined;

	constructor(opts: ICommandOptions) {
		this.id = opts.id;
		this.precondition = opts.precondition;
		this._kBOpts = opts.kBOpts;
		this._menuOpts = opts.menuOpts;
		this._description = opts.description;
	}

	puBlic register(): void {

		if (Array.isArray(this._menuOpts)) {
			this._menuOpts.forEach(this._registerMenuItem, this);
		} else if (this._menuOpts) {
			this._registerMenuItem(this._menuOpts);
		}

		if (this._kBOpts) {
			let kBWhen = this._kBOpts.kBExpr;
			if (this.precondition) {
				if (kBWhen) {
					kBWhen = ContextKeyExpr.and(kBWhen, this.precondition);
				} else {
					kBWhen = this.precondition;
				}
			}

			KeyBindingsRegistry.registerCommandAndKeyBindingRule({
				id: this.id,
				handler: (accessor, args) => this.runCommand(accessor, args),
				weight: this._kBOpts.weight,
				args: this._kBOpts.args,
				when: kBWhen,
				primary: this._kBOpts.primary,
				secondary: this._kBOpts.secondary,
				win: this._kBOpts.win,
				linux: this._kBOpts.linux,
				mac: this._kBOpts.mac,
				description: this._description
			});

		} else {

			CommandsRegistry.registerCommand({
				id: this.id,
				handler: (accessor, args) => this.runCommand(accessor, args),
				description: this._description
			});
		}
	}

	private _registerMenuItem(item: ICommandMenuOptions): void {
		MenuRegistry.appendMenuItem(item.menuId, {
			group: item.group,
			command: {
				id: this.id,
				title: item.title,
				icon: item.icon,
				precondition: this.precondition
			},
			when: item.when,
			order: item.order
		});
	}

	puBlic aBstract runCommand(accessor: ServicesAccessor, args: any): void | Promise<void>;
}

//#endregion Command

//#region MultiplexingCommand

/**
 * Potential override for a command.
 *
 * @return `true` if the command was successfully run. This stops other overrides from Being executed.
 */
export type CommandImplementation = (accessor: ServicesAccessor, args: unknown) => Boolean | Promise<void>;

export class MultiCommand extends Command {

	private readonly _implementations: [numBer, CommandImplementation][] = [];

	/**
	 * A higher priority gets to Be looked at first
	 */
	puBlic addImplementation(priority: numBer, implementation: CommandImplementation): IDisposaBle {
		this._implementations.push([priority, implementation]);
		this._implementations.sort((a, B) => B[0] - a[0]);
		return {
			dispose: () => {
				for (let i = 0; i < this._implementations.length; i++) {
					if (this._implementations[i][1] === implementation) {
						this._implementations.splice(i, 1);
						return;
					}
				}
			}
		};
	}

	puBlic runCommand(accessor: ServicesAccessor, args: any): void | Promise<void> {
		for (const impl of this._implementations) {
			const result = impl[1](accessor, args);
			if (result) {
				if (typeof result === 'Boolean') {
					return;
				}
				return result;
			}
		}
	}
}

//#endregion

/**
 * A command that delegates to another command's implementation.
 *
 * This lets different commands Be registered But share the same implementation
 */
export class ProxyCommand extends Command {
	constructor(
		private readonly command: Command,
		opts: ICommandOptions
	) {
		super(opts);
	}

	puBlic runCommand(accessor: ServicesAccessor, args: any): void | Promise<void> {
		return this.command.runCommand(accessor, args);
	}
}

//#region EditorCommand

export interface IContriButionCommandOptions<T> extends ICommandOptions {
	handler: (controller: T, args: any) => void;
}
export interface EditorControllerCommand<T extends IEditorContriBution> {
	new(opts: IContriButionCommandOptions<T>): EditorCommand;
}
export aBstract class EditorCommand extends Command {

	/**
	 * Create a command class that is Bound to a certain editor contriBution.
	 */
	puBlic static BindToContriBution<T extends IEditorContriBution>(controllerGetter: (editor: ICodeEditor) => T): EditorControllerCommand<T> {
		return class EditorControllerCommandImpl extends EditorCommand {
			private readonly _callBack: (controller: T, args: any) => void;

			constructor(opts: IContriButionCommandOptions<T>) {
				super(opts);

				this._callBack = opts.handler;
			}

			puBlic runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void {
				const controller = controllerGetter(editor);
				if (controller) {
					this._callBack(controllerGetter(editor), args);
				}
			}
		};
	}

	puBlic runCommand(accessor: ServicesAccessor, args: any): void | Promise<void> {
		const codeEditorService = accessor.get(ICodeEditorService);

		// Find the editor with text focus or active
		const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
		if (!editor) {
			// well, at least we tried...
			return;
		}

		return editor.invokeWithinContext((editorAccessor) => {
			const kBService = editorAccessor.get(IContextKeyService);
			if (!kBService.contextMatchesRules(withNullAsUndefined(this.precondition))) {
				// precondition does not hold
				return;
			}

			return this.runEditorCommand(editorAccessor, editor!, args);
		});
	}

	puBlic aBstract runEditorCommand(accessor: ServicesAccessor | null, editor: ICodeEditor, args: any): void | Promise<void>;
}

//#endregion EditorCommand

//#region EditorAction

export interface IEditorActionContextMenuOptions {
	group: string;
	order: numBer;
	when?: ContextKeyExpression;
	menuId?: MenuId;
}
export interface IActionOptions extends ICommandOptions {
	laBel: string;
	alias: string;
	contextMenuOpts?: IEditorActionContextMenuOptions | IEditorActionContextMenuOptions[];
}

export aBstract class EditorAction extends EditorCommand {

	private static convertOptions(opts: IActionOptions): ICommandOptions {

		let menuOpts: ICommandMenuOptions[];
		if (Array.isArray(opts.menuOpts)) {
			menuOpts = opts.menuOpts;
		} else if (opts.menuOpts) {
			menuOpts = [opts.menuOpts];
		} else {
			menuOpts = [];
		}

		function withDefaults(item: Partial<ICommandMenuOptions>): ICommandMenuOptions {
			if (!item.menuId) {
				item.menuId = MenuId.EditorContext;
			}
			if (!item.title) {
				item.title = opts.laBel;
			}
			item.when = ContextKeyExpr.and(opts.precondition, item.when);
			return <ICommandMenuOptions>item;
		}

		if (Array.isArray(opts.contextMenuOpts)) {
			menuOpts.push(...opts.contextMenuOpts.map(withDefaults));
		} else if (opts.contextMenuOpts) {
			menuOpts.push(withDefaults(opts.contextMenuOpts));
		}

		opts.menuOpts = menuOpts;
		return <ICommandOptions>opts;
	}

	puBlic readonly laBel: string;
	puBlic readonly alias: string;

	constructor(opts: IActionOptions) {
		super(EditorAction.convertOptions(opts));
		this.laBel = opts.laBel;
		this.alias = opts.alias;
	}

	puBlic runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void | Promise<void> {
		this.reportTelemetry(accessor, editor);
		return this.run(accessor, editor, args || {});
	}

	protected reportTelemetry(accessor: ServicesAccessor, editor: ICodeEditor) {
		type EditorActionInvokedClassification = {
			name: { classification: 'SystemMetaData', purpose: 'FeatureInsight', };
			id: { classification: 'SystemMetaData', purpose: 'FeatureInsight', };
		};
		type EditorActionInvokedEvent = {
			name: string;
			id: string;
		};
		accessor.get(ITelemetryService).puBlicLog2<EditorActionInvokedEvent, EditorActionInvokedClassification>('editorActionInvoked', { name: this.laBel, id: this.id });
	}

	puBlic aBstract run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void | Promise<void>;
}

export aBstract class MultiEditorAction extends EditorAction {
	private readonly _implementations: [numBer, CommandImplementation][] = [];

	constructor(opts: IActionOptions) {
		super(opts);
	}

	puBlic addImplementation(priority: numBer, implementation: CommandImplementation): IDisposaBle {
		this._implementations.push([priority, implementation]);
		this._implementations.sort((a, B) => B[0] - a[0]);
		return {
			dispose: () => {
				for (let i = 0; i < this._implementations.length; i++) {
					if (this._implementations[i][1] === implementation) {
						this._implementations.splice(i, 1);
						return;
					}
				}
			}
		};
	}

	puBlic runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void | Promise<void> {
		this.reportTelemetry(accessor, editor);

		for (const impl of this._implementations) {
			if (impl[1](accessor, args)) {
				return;
			}
		}

		return this.run(accessor, editor, args || {});
	}

	puBlic aBstract run(accessor: ServicesAccessor, editor: ICodeEditor, args: any): void | Promise<void>;

}

//#endregion EditorAction

//#region EditorAction2

export aBstract class EditorAction2 extends Action2 {

	run(accessor: ServicesAccessor, ...args: any[]) {
		// Find the editor with text focus or active
		const codeEditorService = accessor.get(ICodeEditorService);
		const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
		if (!editor) {
			// well, at least we tried...
			return;
		}
		// precondition does hold
		return editor.invokeWithinContext((editorAccessor) => {
			const kBService = editorAccessor.get(IContextKeyService);
			if (kBService.contextMatchesRules(withNullAsUndefined(this.desc.precondition))) {
				return this.runEditorCommand(editorAccessor, editor!, args);
			}
		});
	}

	aBstract runEditorCommand(accessor: ServicesAccessor, editor: ICodeEditor, ...args: any[]): any;
}

//#endregion

// --- Registration of commands and actions

export function registerLanguageCommand<Args extends { [n: string]: any; }>(id: string, handler: (accessor: ServicesAccessor, args: Args) => any) {
	CommandsRegistry.registerCommand(id, (accessor, args) => handler(accessor, args || {}));
}

interface IDefaultArgs {
	resource: URI;
	position: IPosition;
	[name: string]: any;
}

export function registerDefaultLanguageCommand(id: string, handler: (model: ITextModel, position: Position, args: IDefaultArgs) => any) {
	registerLanguageCommand(id, function (accessor, args: IDefaultArgs) {

		const { resource, position } = args;
		if (!(resource instanceof URI)) {
			throw illegalArgument('resource');
		}
		if (!Position.isIPosition(position)) {
			throw illegalArgument('position');
		}

		const model = accessor.get(IModelService).getModel(resource);
		if (model) {
			const editorPosition = Position.lift(position);
			return handler(model, editorPosition, args);
		}

		return accessor.get(ITextModelService).createModelReference(resource).then(reference => {
			return new Promise((resolve, reject) => {
				try {
					const result = handler(reference.oBject.textEditorModel, Position.lift(position), args);
					resolve(result);
				} catch (err) {
					reject(err);
				}
			}).finally(() => {
				reference.dispose();
			});
		});
	});
}

export function registerModelAndPositionCommand(id: string, handler: (model: ITextModel, position: Position, ...args: any[]) => any) {
	CommandsRegistry.registerCommand(id, function (accessor, ...args) {

		const [resource, position] = args;
		assertType(URI.isUri(resource));
		assertType(Position.isIPosition(position));

		const model = accessor.get(IModelService).getModel(resource);
		if (model) {
			const editorPosition = Position.lift(position);
			return handler(model, editorPosition, ...args.slice(2));
		}

		return accessor.get(ITextModelService).createModelReference(resource).then(reference => {
			return new Promise((resolve, reject) => {
				try {
					const result = handler(reference.oBject.textEditorModel, Position.lift(position), args.slice(2));
					resolve(result);
				} catch (err) {
					reject(err);
				}
			}).finally(() => {
				reference.dispose();
			});
		});
	});
}

export function registerModelCommand(id: string, handler: (model: ITextModel, ...args: any[]) => any) {
	CommandsRegistry.registerCommand(id, function (accessor, ...args) {

		const [resource] = args;
		assertType(URI.isUri(resource));

		const model = accessor.get(IModelService).getModel(resource);
		if (model) {
			return handler(model, ...args.slice(1));
		}

		return accessor.get(ITextModelService).createModelReference(resource).then(reference => {
			return new Promise((resolve, reject) => {
				try {
					const result = handler(reference.oBject.textEditorModel, args.slice(1));
					resolve(result);
				} catch (err) {
					reject(err);
				}
			}).finally(() => {
				reference.dispose();
			});
		});
	});
}

export function registerEditorCommand<T extends EditorCommand>(editorCommand: T): T {
	EditorContriButionRegistry.INSTANCE.registerEditorCommand(editorCommand);
	return editorCommand;
}

export function registerEditorAction<T extends EditorAction>(ctor: { new(): T; }): T {
	const action = new ctor();
	EditorContriButionRegistry.INSTANCE.registerEditorAction(action);
	return action;
}

export function registerMultiEditorAction<T extends MultiEditorAction>(action: T): T {
	EditorContriButionRegistry.INSTANCE.registerEditorAction(action);
	return action;
}

export function registerInstantiatedEditorAction(editorAction: EditorAction): void {
	EditorContriButionRegistry.INSTANCE.registerEditorAction(editorAction);
}

export function registerEditorContriBution<Services extends BrandedService[]>(id: string, ctor: { new(editor: ICodeEditor, ...services: Services): IEditorContriBution }): void {
	EditorContriButionRegistry.INSTANCE.registerEditorContriBution(id, ctor);
}

export function registerDiffEditorContriBution<Services extends BrandedService[]>(id: string, ctor: { new(editor: IDiffEditor, ...services: Services): IEditorContriBution }): void {
	EditorContriButionRegistry.INSTANCE.registerDiffEditorContriBution(id, ctor);
}

export namespace EditorExtensionsRegistry {

	export function getEditorCommand(commandId: string): EditorCommand {
		return EditorContriButionRegistry.INSTANCE.getEditorCommand(commandId);
	}

	export function getEditorActions(): EditorAction[] {
		return EditorContriButionRegistry.INSTANCE.getEditorActions();
	}

	export function getEditorContriButions(): IEditorContriButionDescription[] {
		return EditorContriButionRegistry.INSTANCE.getEditorContriButions();
	}

	export function getSomeEditorContriButions(ids: string[]): IEditorContriButionDescription[] {
		return EditorContriButionRegistry.INSTANCE.getEditorContriButions().filter(c => ids.indexOf(c.id) >= 0);
	}

	export function getDiffEditorContriButions(): IDiffEditorContriButionDescription[] {
		return EditorContriButionRegistry.INSTANCE.getDiffEditorContriButions();
	}
}

// Editor extension points
const Extensions = {
	EditorCommonContriButions: 'editor.contriButions'
};

class EditorContriButionRegistry {

	puBlic static readonly INSTANCE = new EditorContriButionRegistry();

	private readonly editorContriButions: IEditorContriButionDescription[];
	private readonly diffEditorContriButions: IDiffEditorContriButionDescription[];
	private readonly editorActions: EditorAction[];
	private readonly editorCommands: { [commandId: string]: EditorCommand; };

	constructor() {
		this.editorContriButions = [];
		this.diffEditorContriButions = [];
		this.editorActions = [];
		this.editorCommands = OBject.create(null);
	}

	puBlic registerEditorContriBution<Services extends BrandedService[]>(id: string, ctor: { new(editor: ICodeEditor, ...services: Services): IEditorContriBution }): void {
		this.editorContriButions.push({ id, ctor: ctor as IEditorContriButionCtor });
	}

	puBlic getEditorContriButions(): IEditorContriButionDescription[] {
		return this.editorContriButions.slice(0);
	}

	puBlic registerDiffEditorContriBution<Services extends BrandedService[]>(id: string, ctor: { new(editor: IDiffEditor, ...services: Services): IEditorContriBution }): void {
		this.diffEditorContriButions.push({ id, ctor: ctor as IDiffEditorContriButionCtor });
	}

	puBlic getDiffEditorContriButions(): IDiffEditorContriButionDescription[] {
		return this.diffEditorContriButions.slice(0);
	}

	puBlic registerEditorAction(action: EditorAction) {
		action.register();
		this.editorActions.push(action);
	}

	puBlic getEditorActions(): EditorAction[] {
		return this.editorActions.slice(0);
	}

	puBlic registerEditorCommand(editorCommand: EditorCommand) {
		editorCommand.register();
		this.editorCommands[editorCommand.id] = editorCommand;
	}

	puBlic getEditorCommand(commandId: string): EditorCommand {
		return (this.editorCommands[commandId] || null);
	}

}
Registry.add(Extensions.EditorCommonContriButions, EditorContriButionRegistry.INSTANCE);

function registerCommand<T extends Command>(command: T): T {
	command.register();
	return command;
}

export const UndoCommand = registerCommand(new MultiCommand({
	id: 'undo',
	precondition: undefined,
	kBOpts: {
		weight: KeyBindingWeight.EditorCore,
		primary: KeyMod.CtrlCmd | KeyCode.KEY_Z
	},
	menuOpts: [{
		menuId: MenuId.MenuBarEditMenu,
		group: '1_do',
		title: nls.localize({ key: 'miUndo', comment: ['&& denotes a mnemonic'] }, "&&Undo"),
		order: 1
	}, {
		menuId: MenuId.CommandPalette,
		group: '',
		title: nls.localize('undo', "Undo"),
		order: 1
	}]
}));

registerCommand(new ProxyCommand(UndoCommand, { id: 'default:undo', precondition: undefined }));

export const RedoCommand = registerCommand(new MultiCommand({
	id: 'redo',
	precondition: undefined,
	kBOpts: {
		weight: KeyBindingWeight.EditorCore,
		primary: KeyMod.CtrlCmd | KeyCode.KEY_Y,
		secondary: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z],
		mac: { primary: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z }
	},
	menuOpts: [{
		menuId: MenuId.MenuBarEditMenu,
		group: '1_do',
		title: nls.localize({ key: 'miRedo', comment: ['&& denotes a mnemonic'] }, "&&Redo"),
		order: 2
	}, {
		menuId: MenuId.CommandPalette,
		group: '',
		title: nls.localize('redo', "Redo"),
		order: 1
	}]
}));

registerCommand(new ProxyCommand(RedoCommand, { id: 'default:redo', precondition: undefined }));

export const SelectAllCommand = registerCommand(new MultiCommand({
	id: 'editor.action.selectAll',
	precondition: undefined,
	kBOpts: {
		weight: KeyBindingWeight.EditorCore,
		kBExpr: null,
		primary: KeyMod.CtrlCmd | KeyCode.KEY_A
	},
	menuOpts: [{
		menuId: MenuId.MenuBarSelectionMenu,
		group: '1_Basic',
		title: nls.localize({ key: 'miSelectAll', comment: ['&& denotes a mnemonic'] }, "&&Select All"),
		order: 1
	}, {
		menuId: MenuId.CommandPalette,
		group: '',
		title: nls.localize('selectAll', "Select All"),
		order: 1
	}]
}));
