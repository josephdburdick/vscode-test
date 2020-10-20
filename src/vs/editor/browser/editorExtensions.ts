/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IPosition } from 'vs/bAse/browser/ui/contextview/contextview';
import { illegAlArgument } from 'vs/bAse/common/errors';
import { URI } from 'vs/bAse/common/uri';
import { ICodeEditor, IDiffEditor } from 'vs/editor/browser/editorBrowser';
import { ICodeEditorService } from 'vs/editor/browser/services/codeEditorService';
import { Position } from 'vs/editor/common/core/position';
import { IEditorContribution, IDiffEditorContribution } from 'vs/editor/common/editorCommon';
import { ITextModel } from 'vs/editor/common/model';
import { IModelService } from 'vs/editor/common/services/modelService';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { MenuId, MenuRegistry, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry, ICommAndHAndlerDescription } from 'vs/plAtform/commAnds/common/commAnds';
import { ContextKeyExpr, IContextKeyService, ContextKeyExpression } from 'vs/plAtform/contextkey/common/contextkey';
import { IConstructorSignAture1, ServicesAccessor As InstAntiAtionServicesAccessor, BrAndedService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindings, KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { withNullAsUndefined, AssertType } from 'vs/bAse/common/types';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';


export type ServicesAccessor = InstAntiAtionServicesAccessor;
export type IEditorContributionCtor = IConstructorSignAture1<ICodeEditor, IEditorContribution>;
export type IDiffEditorContributionCtor = IConstructorSignAture1<IDiffEditor, IDiffEditorContribution>;

export interfAce IEditorContributionDescription {
	id: string;
	ctor: IEditorContributionCtor;
}

export interfAce IDiffEditorContributionDescription {
	id: string;
	ctor: IDiffEditorContributionCtor;
}

//#region CommAnd

export interfAce ICommAndKeybindingsOptions extends IKeybindings {
	kbExpr?: ContextKeyExpression | null;
	weight: number;
	/**
	 * the defAult keybinding Arguments
	 */
	Args?: Any;
}
export interfAce ICommAndMenuOptions {
	menuId: MenuId;
	group: string;
	order: number;
	when?: ContextKeyExpression;
	title: string;
	icon?: ThemeIcon
}
export interfAce ICommAndOptions {
	id: string;
	precondition: ContextKeyExpression | undefined;
	kbOpts?: ICommAndKeybindingsOptions;
	description?: ICommAndHAndlerDescription;
	menuOpts?: ICommAndMenuOptions | ICommAndMenuOptions[];
}
export AbstrAct clAss CommAnd {
	public reAdonly id: string;
	public reAdonly precondition: ContextKeyExpression | undefined;
	privAte reAdonly _kbOpts: ICommAndKeybindingsOptions | undefined;
	privAte reAdonly _menuOpts: ICommAndMenuOptions | ICommAndMenuOptions[] | undefined;
	privAte reAdonly _description: ICommAndHAndlerDescription | undefined;

	constructor(opts: ICommAndOptions) {
		this.id = opts.id;
		this.precondition = opts.precondition;
		this._kbOpts = opts.kbOpts;
		this._menuOpts = opts.menuOpts;
		this._description = opts.description;
	}

	public register(): void {

		if (ArrAy.isArrAy(this._menuOpts)) {
			this._menuOpts.forEAch(this._registerMenuItem, this);
		} else if (this._menuOpts) {
			this._registerMenuItem(this._menuOpts);
		}

		if (this._kbOpts) {
			let kbWhen = this._kbOpts.kbExpr;
			if (this.precondition) {
				if (kbWhen) {
					kbWhen = ContextKeyExpr.And(kbWhen, this.precondition);
				} else {
					kbWhen = this.precondition;
				}
			}

			KeybindingsRegistry.registerCommAndAndKeybindingRule({
				id: this.id,
				hAndler: (Accessor, Args) => this.runCommAnd(Accessor, Args),
				weight: this._kbOpts.weight,
				Args: this._kbOpts.Args,
				when: kbWhen,
				primAry: this._kbOpts.primAry,
				secondAry: this._kbOpts.secondAry,
				win: this._kbOpts.win,
				linux: this._kbOpts.linux,
				mAc: this._kbOpts.mAc,
				description: this._description
			});

		} else {

			CommAndsRegistry.registerCommAnd({
				id: this.id,
				hAndler: (Accessor, Args) => this.runCommAnd(Accessor, Args),
				description: this._description
			});
		}
	}

	privAte _registerMenuItem(item: ICommAndMenuOptions): void {
		MenuRegistry.AppendMenuItem(item.menuId, {
			group: item.group,
			commAnd: {
				id: this.id,
				title: item.title,
				icon: item.icon,
				precondition: this.precondition
			},
			when: item.when,
			order: item.order
		});
	}

	public AbstrAct runCommAnd(Accessor: ServicesAccessor, Args: Any): void | Promise<void>;
}

//#endregion CommAnd

//#region MultiplexingCommAnd

/**
 * PotentiAl override for A commAnd.
 *
 * @return `true` if the commAnd wAs successfully run. This stops other overrides from being executed.
 */
export type CommAndImplementAtion = (Accessor: ServicesAccessor, Args: unknown) => booleAn | Promise<void>;

export clAss MultiCommAnd extends CommAnd {

	privAte reAdonly _implementAtions: [number, CommAndImplementAtion][] = [];

	/**
	 * A higher priority gets to be looked At first
	 */
	public AddImplementAtion(priority: number, implementAtion: CommAndImplementAtion): IDisposAble {
		this._implementAtions.push([priority, implementAtion]);
		this._implementAtions.sort((A, b) => b[0] - A[0]);
		return {
			dispose: () => {
				for (let i = 0; i < this._implementAtions.length; i++) {
					if (this._implementAtions[i][1] === implementAtion) {
						this._implementAtions.splice(i, 1);
						return;
					}
				}
			}
		};
	}

	public runCommAnd(Accessor: ServicesAccessor, Args: Any): void | Promise<void> {
		for (const impl of this._implementAtions) {
			const result = impl[1](Accessor, Args);
			if (result) {
				if (typeof result === 'booleAn') {
					return;
				}
				return result;
			}
		}
	}
}

//#endregion

/**
 * A commAnd thAt delegAtes to Another commAnd's implementAtion.
 *
 * This lets different commAnds be registered but shAre the sAme implementAtion
 */
export clAss ProxyCommAnd extends CommAnd {
	constructor(
		privAte reAdonly commAnd: CommAnd,
		opts: ICommAndOptions
	) {
		super(opts);
	}

	public runCommAnd(Accessor: ServicesAccessor, Args: Any): void | Promise<void> {
		return this.commAnd.runCommAnd(Accessor, Args);
	}
}

//#region EditorCommAnd

export interfAce IContributionCommAndOptions<T> extends ICommAndOptions {
	hAndler: (controller: T, Args: Any) => void;
}
export interfAce EditorControllerCommAnd<T extends IEditorContribution> {
	new(opts: IContributionCommAndOptions<T>): EditorCommAnd;
}
export AbstrAct clAss EditorCommAnd extends CommAnd {

	/**
	 * CreAte A commAnd clAss thAt is bound to A certAin editor contribution.
	 */
	public stAtic bindToContribution<T extends IEditorContribution>(controllerGetter: (editor: ICodeEditor) => T): EditorControllerCommAnd<T> {
		return clAss EditorControllerCommAndImpl extends EditorCommAnd {
			privAte reAdonly _cAllbAck: (controller: T, Args: Any) => void;

			constructor(opts: IContributionCommAndOptions<T>) {
				super(opts);

				this._cAllbAck = opts.hAndler;
			}

			public runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void {
				const controller = controllerGetter(editor);
				if (controller) {
					this._cAllbAck(controllerGetter(editor), Args);
				}
			}
		};
	}

	public runCommAnd(Accessor: ServicesAccessor, Args: Any): void | Promise<void> {
		const codeEditorService = Accessor.get(ICodeEditorService);

		// Find the editor with text focus or Active
		const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
		if (!editor) {
			// well, At leAst we tried...
			return;
		}

		return editor.invokeWithinContext((editorAccessor) => {
			const kbService = editorAccessor.get(IContextKeyService);
			if (!kbService.contextMAtchesRules(withNullAsUndefined(this.precondition))) {
				// precondition does not hold
				return;
			}

			return this.runEditorCommAnd(editorAccessor, editor!, Args);
		});
	}

	public AbstrAct runEditorCommAnd(Accessor: ServicesAccessor | null, editor: ICodeEditor, Args: Any): void | Promise<void>;
}

//#endregion EditorCommAnd

//#region EditorAction

export interfAce IEditorActionContextMenuOptions {
	group: string;
	order: number;
	when?: ContextKeyExpression;
	menuId?: MenuId;
}
export interfAce IActionOptions extends ICommAndOptions {
	lAbel: string;
	AliAs: string;
	contextMenuOpts?: IEditorActionContextMenuOptions | IEditorActionContextMenuOptions[];
}

export AbstrAct clAss EditorAction extends EditorCommAnd {

	privAte stAtic convertOptions(opts: IActionOptions): ICommAndOptions {

		let menuOpts: ICommAndMenuOptions[];
		if (ArrAy.isArrAy(opts.menuOpts)) {
			menuOpts = opts.menuOpts;
		} else if (opts.menuOpts) {
			menuOpts = [opts.menuOpts];
		} else {
			menuOpts = [];
		}

		function withDefAults(item: PArtiAl<ICommAndMenuOptions>): ICommAndMenuOptions {
			if (!item.menuId) {
				item.menuId = MenuId.EditorContext;
			}
			if (!item.title) {
				item.title = opts.lAbel;
			}
			item.when = ContextKeyExpr.And(opts.precondition, item.when);
			return <ICommAndMenuOptions>item;
		}

		if (ArrAy.isArrAy(opts.contextMenuOpts)) {
			menuOpts.push(...opts.contextMenuOpts.mAp(withDefAults));
		} else if (opts.contextMenuOpts) {
			menuOpts.push(withDefAults(opts.contextMenuOpts));
		}

		opts.menuOpts = menuOpts;
		return <ICommAndOptions>opts;
	}

	public reAdonly lAbel: string;
	public reAdonly AliAs: string;

	constructor(opts: IActionOptions) {
		super(EditorAction.convertOptions(opts));
		this.lAbel = opts.lAbel;
		this.AliAs = opts.AliAs;
	}

	public runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void | Promise<void> {
		this.reportTelemetry(Accessor, editor);
		return this.run(Accessor, editor, Args || {});
	}

	protected reportTelemetry(Accessor: ServicesAccessor, editor: ICodeEditor) {
		type EditorActionInvokedClAssificAtion = {
			nAme: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', };
			id: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight', };
		};
		type EditorActionInvokedEvent = {
			nAme: string;
			id: string;
		};
		Accessor.get(ITelemetryService).publicLog2<EditorActionInvokedEvent, EditorActionInvokedClAssificAtion>('editorActionInvoked', { nAme: this.lAbel, id: this.id });
	}

	public AbstrAct run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void | Promise<void>;
}

export AbstrAct clAss MultiEditorAction extends EditorAction {
	privAte reAdonly _implementAtions: [number, CommAndImplementAtion][] = [];

	constructor(opts: IActionOptions) {
		super(opts);
	}

	public AddImplementAtion(priority: number, implementAtion: CommAndImplementAtion): IDisposAble {
		this._implementAtions.push([priority, implementAtion]);
		this._implementAtions.sort((A, b) => b[0] - A[0]);
		return {
			dispose: () => {
				for (let i = 0; i < this._implementAtions.length; i++) {
					if (this._implementAtions[i][1] === implementAtion) {
						this._implementAtions.splice(i, 1);
						return;
					}
				}
			}
		};
	}

	public runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void | Promise<void> {
		this.reportTelemetry(Accessor, editor);

		for (const impl of this._implementAtions) {
			if (impl[1](Accessor, Args)) {
				return;
			}
		}

		return this.run(Accessor, editor, Args || {});
	}

	public AbstrAct run(Accessor: ServicesAccessor, editor: ICodeEditor, Args: Any): void | Promise<void>;

}

//#endregion EditorAction

//#region EditorAction2

export AbstrAct clAss EditorAction2 extends Action2 {

	run(Accessor: ServicesAccessor, ...Args: Any[]) {
		// Find the editor with text focus or Active
		const codeEditorService = Accessor.get(ICodeEditorService);
		const editor = codeEditorService.getFocusedCodeEditor() || codeEditorService.getActiveCodeEditor();
		if (!editor) {
			// well, At leAst we tried...
			return;
		}
		// precondition does hold
		return editor.invokeWithinContext((editorAccessor) => {
			const kbService = editorAccessor.get(IContextKeyService);
			if (kbService.contextMAtchesRules(withNullAsUndefined(this.desc.precondition))) {
				return this.runEditorCommAnd(editorAccessor, editor!, Args);
			}
		});
	}

	AbstrAct runEditorCommAnd(Accessor: ServicesAccessor, editor: ICodeEditor, ...Args: Any[]): Any;
}

//#endregion

// --- RegistrAtion of commAnds And Actions

export function registerLAnguAgeCommAnd<Args extends { [n: string]: Any; }>(id: string, hAndler: (Accessor: ServicesAccessor, Args: Args) => Any) {
	CommAndsRegistry.registerCommAnd(id, (Accessor, Args) => hAndler(Accessor, Args || {}));
}

interfAce IDefAultArgs {
	resource: URI;
	position: IPosition;
	[nAme: string]: Any;
}

export function registerDefAultLAnguAgeCommAnd(id: string, hAndler: (model: ITextModel, position: Position, Args: IDefAultArgs) => Any) {
	registerLAnguAgeCommAnd(id, function (Accessor, Args: IDefAultArgs) {

		const { resource, position } = Args;
		if (!(resource instAnceof URI)) {
			throw illegAlArgument('resource');
		}
		if (!Position.isIPosition(position)) {
			throw illegAlArgument('position');
		}

		const model = Accessor.get(IModelService).getModel(resource);
		if (model) {
			const editorPosition = Position.lift(position);
			return hAndler(model, editorPosition, Args);
		}

		return Accessor.get(ITextModelService).creAteModelReference(resource).then(reference => {
			return new Promise((resolve, reject) => {
				try {
					const result = hAndler(reference.object.textEditorModel, Position.lift(position), Args);
					resolve(result);
				} cAtch (err) {
					reject(err);
				}
			}).finAlly(() => {
				reference.dispose();
			});
		});
	});
}

export function registerModelAndPositionCommAnd(id: string, hAndler: (model: ITextModel, position: Position, ...Args: Any[]) => Any) {
	CommAndsRegistry.registerCommAnd(id, function (Accessor, ...Args) {

		const [resource, position] = Args;
		AssertType(URI.isUri(resource));
		AssertType(Position.isIPosition(position));

		const model = Accessor.get(IModelService).getModel(resource);
		if (model) {
			const editorPosition = Position.lift(position);
			return hAndler(model, editorPosition, ...Args.slice(2));
		}

		return Accessor.get(ITextModelService).creAteModelReference(resource).then(reference => {
			return new Promise((resolve, reject) => {
				try {
					const result = hAndler(reference.object.textEditorModel, Position.lift(position), Args.slice(2));
					resolve(result);
				} cAtch (err) {
					reject(err);
				}
			}).finAlly(() => {
				reference.dispose();
			});
		});
	});
}

export function registerModelCommAnd(id: string, hAndler: (model: ITextModel, ...Args: Any[]) => Any) {
	CommAndsRegistry.registerCommAnd(id, function (Accessor, ...Args) {

		const [resource] = Args;
		AssertType(URI.isUri(resource));

		const model = Accessor.get(IModelService).getModel(resource);
		if (model) {
			return hAndler(model, ...Args.slice(1));
		}

		return Accessor.get(ITextModelService).creAteModelReference(resource).then(reference => {
			return new Promise((resolve, reject) => {
				try {
					const result = hAndler(reference.object.textEditorModel, Args.slice(1));
					resolve(result);
				} cAtch (err) {
					reject(err);
				}
			}).finAlly(() => {
				reference.dispose();
			});
		});
	});
}

export function registerEditorCommAnd<T extends EditorCommAnd>(editorCommAnd: T): T {
	EditorContributionRegistry.INSTANCE.registerEditorCommAnd(editorCommAnd);
	return editorCommAnd;
}

export function registerEditorAction<T extends EditorAction>(ctor: { new(): T; }): T {
	const Action = new ctor();
	EditorContributionRegistry.INSTANCE.registerEditorAction(Action);
	return Action;
}

export function registerMultiEditorAction<T extends MultiEditorAction>(Action: T): T {
	EditorContributionRegistry.INSTANCE.registerEditorAction(Action);
	return Action;
}

export function registerInstAntiAtedEditorAction(editorAction: EditorAction): void {
	EditorContributionRegistry.INSTANCE.registerEditorAction(editorAction);
}

export function registerEditorContribution<Services extends BrAndedService[]>(id: string, ctor: { new(editor: ICodeEditor, ...services: Services): IEditorContribution }): void {
	EditorContributionRegistry.INSTANCE.registerEditorContribution(id, ctor);
}

export function registerDiffEditorContribution<Services extends BrAndedService[]>(id: string, ctor: { new(editor: IDiffEditor, ...services: Services): IEditorContribution }): void {
	EditorContributionRegistry.INSTANCE.registerDiffEditorContribution(id, ctor);
}

export nAmespAce EditorExtensionsRegistry {

	export function getEditorCommAnd(commAndId: string): EditorCommAnd {
		return EditorContributionRegistry.INSTANCE.getEditorCommAnd(commAndId);
	}

	export function getEditorActions(): EditorAction[] {
		return EditorContributionRegistry.INSTANCE.getEditorActions();
	}

	export function getEditorContributions(): IEditorContributionDescription[] {
		return EditorContributionRegistry.INSTANCE.getEditorContributions();
	}

	export function getSomeEditorContributions(ids: string[]): IEditorContributionDescription[] {
		return EditorContributionRegistry.INSTANCE.getEditorContributions().filter(c => ids.indexOf(c.id) >= 0);
	}

	export function getDiffEditorContributions(): IDiffEditorContributionDescription[] {
		return EditorContributionRegistry.INSTANCE.getDiffEditorContributions();
	}
}

// Editor extension points
const Extensions = {
	EditorCommonContributions: 'editor.contributions'
};

clAss EditorContributionRegistry {

	public stAtic reAdonly INSTANCE = new EditorContributionRegistry();

	privAte reAdonly editorContributions: IEditorContributionDescription[];
	privAte reAdonly diffEditorContributions: IDiffEditorContributionDescription[];
	privAte reAdonly editorActions: EditorAction[];
	privAte reAdonly editorCommAnds: { [commAndId: string]: EditorCommAnd; };

	constructor() {
		this.editorContributions = [];
		this.diffEditorContributions = [];
		this.editorActions = [];
		this.editorCommAnds = Object.creAte(null);
	}

	public registerEditorContribution<Services extends BrAndedService[]>(id: string, ctor: { new(editor: ICodeEditor, ...services: Services): IEditorContribution }): void {
		this.editorContributions.push({ id, ctor: ctor As IEditorContributionCtor });
	}

	public getEditorContributions(): IEditorContributionDescription[] {
		return this.editorContributions.slice(0);
	}

	public registerDiffEditorContribution<Services extends BrAndedService[]>(id: string, ctor: { new(editor: IDiffEditor, ...services: Services): IEditorContribution }): void {
		this.diffEditorContributions.push({ id, ctor: ctor As IDiffEditorContributionCtor });
	}

	public getDiffEditorContributions(): IDiffEditorContributionDescription[] {
		return this.diffEditorContributions.slice(0);
	}

	public registerEditorAction(Action: EditorAction) {
		Action.register();
		this.editorActions.push(Action);
	}

	public getEditorActions(): EditorAction[] {
		return this.editorActions.slice(0);
	}

	public registerEditorCommAnd(editorCommAnd: EditorCommAnd) {
		editorCommAnd.register();
		this.editorCommAnds[editorCommAnd.id] = editorCommAnd;
	}

	public getEditorCommAnd(commAndId: string): EditorCommAnd {
		return (this.editorCommAnds[commAndId] || null);
	}

}
Registry.Add(Extensions.EditorCommonContributions, EditorContributionRegistry.INSTANCE);

function registerCommAnd<T extends CommAnd>(commAnd: T): T {
	commAnd.register();
	return commAnd;
}

export const UndoCommAnd = registerCommAnd(new MultiCommAnd({
	id: 'undo',
	precondition: undefined,
	kbOpts: {
		weight: KeybindingWeight.EditorCore,
		primAry: KeyMod.CtrlCmd | KeyCode.KEY_Z
	},
	menuOpts: [{
		menuId: MenuId.MenubArEditMenu,
		group: '1_do',
		title: nls.locAlize({ key: 'miUndo', comment: ['&& denotes A mnemonic'] }, "&&Undo"),
		order: 1
	}, {
		menuId: MenuId.CommAndPAlette,
		group: '',
		title: nls.locAlize('undo', "Undo"),
		order: 1
	}]
}));

registerCommAnd(new ProxyCommAnd(UndoCommAnd, { id: 'defAult:undo', precondition: undefined }));

export const RedoCommAnd = registerCommAnd(new MultiCommAnd({
	id: 'redo',
	precondition: undefined,
	kbOpts: {
		weight: KeybindingWeight.EditorCore,
		primAry: KeyMod.CtrlCmd | KeyCode.KEY_Y,
		secondAry: [KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z],
		mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_Z }
	},
	menuOpts: [{
		menuId: MenuId.MenubArEditMenu,
		group: '1_do',
		title: nls.locAlize({ key: 'miRedo', comment: ['&& denotes A mnemonic'] }, "&&Redo"),
		order: 2
	}, {
		menuId: MenuId.CommAndPAlette,
		group: '',
		title: nls.locAlize('redo', "Redo"),
		order: 1
	}]
}));

registerCommAnd(new ProxyCommAnd(RedoCommAnd, { id: 'defAult:redo', precondition: undefined }));

export const SelectAllCommAnd = registerCommAnd(new MultiCommAnd({
	id: 'editor.Action.selectAll',
	precondition: undefined,
	kbOpts: {
		weight: KeybindingWeight.EditorCore,
		kbExpr: null,
		primAry: KeyMod.CtrlCmd | KeyCode.KEY_A
	},
	menuOpts: [{
		menuId: MenuId.MenubArSelectionMenu,
		group: '1_bAsic',
		title: nls.locAlize({ key: 'miSelectAll', comment: ['&& denotes A mnemonic'] }, "&&Select All"),
		order: 1
	}, {
		menuId: MenuId.CommAndPAlette,
		group: '',
		title: nls.locAlize('selectAll', "Select All"),
		order: 1
	}]
}));
