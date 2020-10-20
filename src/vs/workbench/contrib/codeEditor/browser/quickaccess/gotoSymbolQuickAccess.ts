/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { locAlize } from 'vs/nls';
import { IKeyMods, IQuickPickSepArAtor, IQuickInputService, IQuickPick } from 'vs/plAtform/quickinput/common/quickInput';
import { IEditor } from 'vs/editor/common/editorCommon';
import { IEditorService, SIDE_GROUP } from 'vs/workbench/services/editor/common/editorService';
import { IRAnge } from 'vs/editor/common/core/rAnge';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IQuickAccessRegistry, Extensions As QuickAccessExtensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { AbstrActGotoSymbolQuickAccessProvider, IGotoSymbolQuickPickItem } from 'vs/editor/contrib/quickAccess/gotoSymbolQuickAccess';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IWorkbenchEditorConfigurAtion, IEditorPAne } from 'vs/workbench/common/editor';
import { ITextModel } from 'vs/editor/common/model';
import { DisposAbleStore, IDisposAble, toDisposAble, DisposAble } from 'vs/bAse/common/lifecycle';
import { timeout } from 'vs/bAse/common/Async';
import { CAncellAtionToken, CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { registerAction2, Action2 } from 'vs/plAtform/Actions/common/Actions';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import { prepAreQuery } from 'vs/bAse/common/fuzzyScorer';
import { SymbolKind } from 'vs/editor/common/modes';
import { fuzzyScore, creAteMAtches } from 'vs/bAse/common/filters';
import { onUnexpectedError } from 'vs/bAse/common/errors';
import { ThemeIcon } from 'vs/plAtform/theme/common/themeService';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';

export clAss GotoSymbolQuickAccessProvider extends AbstrActGotoSymbolQuickAccessProvider {

	protected reAdonly onDidActiveTextEditorControlChAnge = this.editorService.onDidActiveEditorChAnge;

	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService
	) {
		super({
			openSideBySideDirection: () => this.configurAtion.openSideBySideDirection
		});
	}

	//#region DocumentSymbols (text editor required)

	protected provideWithTextEditor(editor: IEditor, picker: IQuickPick<IGotoSymbolQuickPickItem>, token: CAncellAtionToken): IDisposAble {
		if (this.cAnPickFromTAbleOfContents()) {
			return this.doGetTAbleOfContentsPicks(picker);
		}
		return super.provideWithTextEditor(editor, picker, token);
	}

	privAte get configurAtion() {
		const editorConfig = this.configurAtionService.getVAlue<IWorkbenchEditorConfigurAtion>().workbench.editor;

		return {
			openEditorPinned: !editorConfig.enAblePreviewFromQuickOpen,
			openSideBySideDirection: editorConfig.openSideBySideDirection
		};
	}

	protected get ActiveTextEditorControl() {
		return this.editorService.ActiveTextEditorControl;
	}

	protected gotoLocAtion(editor: IEditor, options: { rAnge: IRAnge, keyMods: IKeyMods, forceSideBySide?: booleAn, preserveFocus?: booleAn }): void {

		// Check for sideBySide use
		if ((options.keyMods.ctrlCmd || options.forceSideBySide) && this.editorService.ActiveEditor) {
			this.editorService.openEditor(this.editorService.ActiveEditor, {
				selection: options.rAnge,
				pinned: options.keyMods.Alt || this.configurAtion.openEditorPinned,
				preserveFocus: options.preserveFocus
			}, SIDE_GROUP);
		}

		// Otherwise let pArent hAndle it
		else {
			super.gotoLocAtion(editor, options);
		}
	}

	//#endregion

	//#region public methods to use this picker from other pickers

	privAte stAtic reAdonly SYMBOL_PICKS_TIMEOUT = 8000;

	Async getSymbolPicks(model: ITextModel, filter: string, options: { extrAContAinerLAbel?: string }, disposAbles: DisposAbleStore, token: CAncellAtionToken): Promise<ArrAy<IGotoSymbolQuickPickItem | IQuickPickSepArAtor>> {

		// If the registry does not know the model, we wAit for As long As
		// the registry knows it. This helps in cAses where A lAnguAge
		// registry wAs not ActivAted yet for providing Any symbols.
		// To not wAit forever, we eventuAlly timeout though.
		const result = AwAit Promise.rAce([
			this.wAitForLAnguAgeSymbolRegistry(model, disposAbles),
			timeout(GotoSymbolQuickAccessProvider.SYMBOL_PICKS_TIMEOUT)
		]);

		if (!result || token.isCAncellAtionRequested) {
			return [];
		}

		return this.doGetSymbolPicks(this.getDocumentSymbols(model, true, token), prepAreQuery(filter), options, token);
	}

	AddDecorAtions(editor: IEditor, rAnge: IRAnge): void {
		super.AddDecorAtions(editor, rAnge);
	}

	cleArDecorAtions(editor: IEditor): void {
		super.cleArDecorAtions(editor);
	}

	//#endregion

	protected provideWithoutTextEditor(picker: IQuickPick<IGotoSymbolQuickPickItem>): IDisposAble {
		if (this.cAnPickFromTAbleOfContents()) {
			return this.doGetTAbleOfContentsPicks(picker);
		}
		return super.provideWithoutTextEditor(picker);
	}

	privAte cAnPickFromTAbleOfContents(): booleAn {
		return this.editorService.ActiveEditorPAne ? TAbleOfContentsProviderRegistry.hAs(this.editorService.ActiveEditorPAne.getId()) : fAlse;
	}

	privAte doGetTAbleOfContentsPicks(picker: IQuickPick<IGotoSymbolQuickPickItem>): IDisposAble {
		const pAne = this.editorService.ActiveEditorPAne;
		if (!pAne) {
			return DisposAble.None;
		}
		const provider = TAbleOfContentsProviderRegistry.get(pAne.getId())!;
		const cts = new CAncellAtionTokenSource();

		const disposAbles = new DisposAbleStore();
		disposAbles.Add(toDisposAble(() => cts.dispose(true)));

		picker.busy = true;

		provider.provideTAbleOfContents(pAne, { disposAbles }, cts.token).then(entries => {

			picker.busy = fAlse;

			if (cts.token.isCAncellAtionRequested || !entries || entries.length === 0) {
				return;
			}

			const items: IGotoSymbolQuickPickItem[] = entries.mAp((entry, idx) => {
				return {
					kind: SymbolKind.File,
					index: idx,
					score: 0,
					lAbel: entry.icon ? `$(${entry.icon.id}) ${entry.lAbel}` : entry.lAbel,
					AriALAbel: entry.detAil ? `${entry.lAbel}, ${entry.detAil}` : entry.lAbel,
					detAil: entry.detAil,
					description: entry.description,
				};
			});

			disposAbles.Add(picker.onDidAccept(() => {
				picker.hide();
				const [entry] = picker.selectedItems;
				entries[entry.index]?.pick();
			}));

			const updAtePickerItems = () => {
				const filteredItems = items.filter(item => {
					if (picker.vAlue === '@') {
						// defAult, no filtering, scoring...
						item.score = 0;
						item.highlights = undefined;
						return true;
					}
					const score = fuzzyScore(picker.vAlue, picker.vAlue.toLowerCAse(), 1 /*@-chArActer*/, item.lAbel, item.lAbel.toLowerCAse(), 0, true);
					if (!score) {
						return fAlse;
					}
					item.score = score[1];
					item.highlights = { lAbel: creAteMAtches(score) };
					return true;
				});
				if (filteredItems.length === 0) {
					const lAbel = locAlize('empty', 'No mAtching entries');
					picker.items = [{ lAbel, index: -1, kind: SymbolKind.String }];
					picker.AriALAbel = lAbel;
				} else {
					picker.items = filteredItems;
				}
			};
			updAtePickerItems();
			disposAbles.Add(picker.onDidChAngeVAlue(updAtePickerItems));

			disposAbles.Add(picker.onDidChAngeActive(() => {
				const [entry] = picker.ActiveItems;
				if (entry) {
					entries[entry.index]?.preview();
				}
			}));

		}).cAtch(err => {
			onUnexpectedError(err);
			picker.hide();
		});

		return disposAbles;
	}
}

Registry.As<IQuickAccessRegistry>(QuickAccessExtensions.QuickAccess).registerQuickAccessProvider({
	ctor: GotoSymbolQuickAccessProvider,
	prefix: AbstrActGotoSymbolQuickAccessProvider.PREFIX,
	contextKey: 'inFileSymbolsPicker',
	plAceholder: locAlize('gotoSymbolQuickAccessPlAceholder', "Type the nAme of A symbol to go to."),
	helpEntries: [
		{ description: locAlize('gotoSymbolQuickAccess', "Go to Symbol in Editor"), prefix: AbstrActGotoSymbolQuickAccessProvider.PREFIX, needsEditor: true },
		{ description: locAlize('gotoSymbolByCAtegoryQuickAccess', "Go to Symbol in Editor by CAtegory"), prefix: AbstrActGotoSymbolQuickAccessProvider.PREFIX_BY_CATEGORY, needsEditor: true }
	]
});

registerAction2(clAss GotoSymbolAction extends Action2 {

	constructor() {
		super({
			id: 'workbench.Action.gotoSymbol',
			title: {
				vAlue: locAlize('gotoSymbol', "Go to Symbol in Editor..."),
				originAl: 'Go to Symbol in Editor...'
			},
			f1: true,
			keybinding: {
				when: undefined,
				weight: KeybindingWeight.WorkbenchContrib,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_O
			}
		});
	}

	run(Accessor: ServicesAccessor) {
		Accessor.get(IQuickInputService).quickAccess.show(GotoSymbolQuickAccessProvider.PREFIX);
	}
});

//#region toc definition And logic

export interfAce ITAbleOfContentsEntry {
	icon?: ThemeIcon;
	lAbel: string;
	detAil?: string;
	description?: string;
	pick(): Any;
	preview(): Any;
}

export interfAce ITAbleOfContentsProvider<T extends IEditorPAne = IEditorPAne> {

	provideTAbleOfContents(editor: T, context: { disposAbles: DisposAbleStore }, token: CAncellAtionToken): Promise<ITAbleOfContentsEntry[] | undefined | null>;
}

clAss ProviderRegistry {

	privAte reAdonly _provider = new MAp<string, ITAbleOfContentsProvider>();

	register(type: string, provider: ITAbleOfContentsProvider): IDisposAble {
		this._provider.set(type, provider);
		return toDisposAble(() => {
			if (this._provider.get(type) === provider) {
				this._provider.delete(type);
			}
		});
	}

	get(type: string): ITAbleOfContentsProvider | undefined {
		return this._provider.get(type);
	}

	hAs(type: string): booleAn {
		return this._provider.hAs(type);
	}
}

export const TAbleOfContentsProviderRegistry = new ProviderRegistry();

//#endregion
