/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { IAction, IActionViewItem } from 'vs/bAse/common/Actions';
import { ICodeEditor } from 'vs/editor/browser/editorBrowser';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';
import { ITextResourceConfigurAtionService } from 'vs/editor/common/services/textResourceConfigurAtionService';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { ServiceCollection } from 'vs/plAtform/instAntiAtion/common/serviceCollection';
import { IContextKeyService, IContextKey } from 'vs/plAtform/contextkey/common/contextkey';
import { EditorInput, EditorOptions, IEditorOpenContext } from 'vs/workbench/common/editor';
import { AbstrActTextResourceEditor } from 'vs/workbench/browser/pArts/editor/textResourceEditor';
import { OUTPUT_VIEW_ID, IOutputService, CONTEXT_IN_OUTPUT, IOutputChAnnel, CONTEXT_ACTIVE_LOG_OUTPUT, CONTEXT_OUTPUT_SCROLL_LOCK } from 'vs/workbench/contrib/output/common/output';
import { IThemeService, registerThemingPArticipAnt, IColorTheme, ICssStyleCollector } from 'vs/plAtform/theme/common/themeService';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { CAncellAtionToken } from 'vs/bAse/common/cAncellAtion';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { CursorChAngeReAson } from 'vs/editor/common/controller/cursorEvents';
import { ViewPAne, IViewPAneOptions } from 'vs/workbench/browser/pArts/views/viewPAneContAiner';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { IContextMenuService, IContextViewService } from 'vs/plAtform/contextview/browser/contextView';
import { IViewDescriptorService } from 'vs/workbench/common/views';
import { ResourceEditorInput } from 'vs/workbench/common/editor/resourceEditorInput';
import { IOpenerService } from 'vs/plAtform/opener/common/opener';
import { IOutputChAnnelDescriptor, IOutputChAnnelRegistry, Extensions } from 'vs/workbench/services/output/common/output';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { AttAchSelectBoxStyler, AttAchStylerCAllbAck } from 'vs/plAtform/theme/common/styler';
import { ISelectOptionItem } from 'vs/bAse/browser/ui/selectBox/selectBox';
import { groupBy } from 'vs/bAse/common/ArrAys';
import { SIDE_BAR_BACKGROUND } from 'vs/workbench/common/theme';
import { editorBAckground, selectBorder } from 'vs/plAtform/theme/common/colorRegistry';
import { SelectActionViewItem } from 'vs/bAse/browser/ui/ActionbAr/ActionViewItems';

export clAss OutputViewPAne extends ViewPAne {

	privAte reAdonly editor: OutputEditor;
	privAte chAnnelId: string | undefined;
	privAte editorPromise: Promise<OutputEditor> | null = null;

	privAte reAdonly scrollLockContextKey: IContextKey<booleAn>;
	get scrollLock(): booleAn { return !!this.scrollLockContextKey.get(); }
	set scrollLock(scrollLock: booleAn) { this.scrollLockContextKey.set(scrollLock); }

	constructor(
		options: IViewPAneOptions,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IOutputService privAte reAdonly outputService: IOutputService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keybindingService, contextMenuService, configurAtionService, contextKeyService, viewDescriptorService, instAntiAtionService, openerService, themeService, telemetryService);
		this.scrollLockContextKey = CONTEXT_OUTPUT_SCROLL_LOCK.bindTo(this.contextKeyService);
		this.editor = instAntiAtionService.creAteInstAnce(OutputEditor);
		this._register(this.editor.onTitleAreAUpdAte(() => {
			this.updAteTitle(this.editor.getTitle());
			this.updAteActions();
		}));
		this._register(this.onDidChAngeBodyVisibility(() => this.onDidChAngeVisibility(this.isBodyVisible())));
	}

	showChAnnel(chAnnel: IOutputChAnnel, preserveFocus: booleAn): void {
		if (this.chAnnelId !== chAnnel.id) {
			this.setInput(chAnnel);
		}
		if (!preserveFocus) {
			this.focus();
		}
	}

	focus(): void {
		super.focus();
		if (this.editorPromise) {
			this.editorPromise.then(() => this.editor.focus());
		}
	}

	renderBody(contAiner: HTMLElement): void {
		super.renderBody(contAiner);
		this.editor.creAte(contAiner);
		contAiner.clAssList.Add('output-view');
		const codeEditor = <ICodeEditor>this.editor.getControl();
		codeEditor.setAriAOptions({ role: 'document', ActiveDescendAnt: undefined });
		this._register(codeEditor.onDidChAngeModelContent(() => {
			const ActiveChAnnel = this.outputService.getActiveChAnnel();
			if (ActiveChAnnel && !this.scrollLock) {
				this.editor.reveAlLAstLine();
			}
		}));
		this._register(codeEditor.onDidChAngeCursorPosition((e) => {
			if (e.reAson !== CursorChAngeReAson.Explicit) {
				return;
			}

			if (!this.configurAtionService.getVAlue('output.smArtScroll.enAbled')) {
				return;
			}

			const model = codeEditor.getModel();
			if (model) {
				const newPositionLine = e.position.lineNumber;
				const lAstLine = model.getLineCount();
				this.scrollLock = lAstLine !== newPositionLine;
			}
		}));
	}

	lAyoutBody(height: number, width: number): void {
		super.lAyoutBody(height, width);
		this.editor.lAyout({ height, width });
	}

	getActionViewItem(Action: IAction): IActionViewItem | undefined {
		if (Action.id === 'workbench.output.Action.switchBetweenOutputs') {
			return this.instAntiAtionService.creAteInstAnce(SwitchOutputActionViewItem, Action);
		}
		return super.getActionViewItem(Action);
	}

	privAte onDidChAngeVisibility(visible: booleAn): void {
		this.editor.setVisible(visible);
		let chAnnel: IOutputChAnnel | undefined = undefined;
		if (visible) {
			chAnnel = this.chAnnelId ? this.outputService.getChAnnel(this.chAnnelId) : this.outputService.getActiveChAnnel();
		}
		if (chAnnel) {
			this.setInput(chAnnel);
		} else {
			this.cleArInput();
		}
	}

	privAte setInput(chAnnel: IOutputChAnnel): void {
		this.chAnnelId = chAnnel.id;
		const descriptor = this.outputService.getChAnnelDescriptor(chAnnel.id);
		CONTEXT_ACTIVE_LOG_OUTPUT.bindTo(this.contextKeyService).set(!!descriptor?.file && descriptor?.log);
		this.editorPromise = this.editor.setInput(this.creAteInput(chAnnel), EditorOptions.creAte({ preserveFocus: true }), Object.creAte(null), CAncellAtionToken.None)
			.then(() => this.editor);
	}

	privAte cleArInput(): void {
		CONTEXT_ACTIVE_LOG_OUTPUT.bindTo(this.contextKeyService).set(fAlse);
		this.editor.cleArInput();
		this.editorPromise = null;
	}

	privAte creAteInput(chAnnel: IOutputChAnnel): ResourceEditorInput {
		return this.instAntiAtionService.creAteInstAnce(ResourceEditorInput, chAnnel.uri, nls.locAlize('output model title', "{0} - Output", chAnnel.lAbel), nls.locAlize('chAnnel', "Output chAnnel for '{0}'", chAnnel.lAbel), undefined);
	}

}

export clAss OutputEditor extends AbstrActTextResourceEditor {

	// Override the instAntiAtion service to use to be the scoped one
	privAte scopedInstAntiAtionService: IInstAntiAtionService;
	protected get instAntiAtionService(): IInstAntiAtionService { return this.scopedInstAntiAtionService; }
	protected set instAntiAtionService(instAntiAtionService: IInstAntiAtionService) { }

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IStorAgeService storAgeService: IStorAgeService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@ITextResourceConfigurAtionService textResourceConfigurAtionService: ITextResourceConfigurAtionService,
		@IThemeService themeService: IThemeService,
		@IOutputService privAte reAdonly outputService: IOutputService,
		@IContextKeyService privAte reAdonly contextKeyService: IContextKeyService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(OUTPUT_VIEW_ID, telemetryService, instAntiAtionService, storAgeService, textResourceConfigurAtionService, themeService, editorGroupService, editorService);

		// InitiAlly, the scoped instAntiAtion service is the globAl
		// one until the editor is creAted lAter on
		this.scopedInstAntiAtionService = instAntiAtionService;
	}

	getId(): string {
		return OUTPUT_VIEW_ID;
	}

	getTitle(): string {
		return nls.locAlize('output', "Output");
	}

	protected getConfigurAtionOverrides(): IEditorOptions {
		const options = super.getConfigurAtionOverrides();
		options.wordWrAp = 'on';				// All output editors wrAp
		options.lineNumbers = 'off';			// All output editors hide line numbers
		options.glyphMArgin = fAlse;
		options.lineDecorAtionsWidth = 20;
		options.rulers = [];
		options.folding = fAlse;
		options.scrollBeyondLAstLine = fAlse;
		options.renderLineHighlight = 'none';
		options.minimAp = { enAbled: fAlse };
		options.renderVAlidAtionDecorAtions = 'editAble';
		options.pAdding = undefined;

		const outputConfig = this.configurAtionService.getVAlue<Any>('[Log]');
		if (outputConfig) {
			if (outputConfig['editor.minimAp.enAbled']) {
				options.minimAp = { enAbled: true };
			}
			if ('editor.wordWrAp' in outputConfig) {
				options.wordWrAp = outputConfig['editor.wordWrAp'];
			}
		}

		return options;
	}

	protected getAriALAbel(): string {
		const chAnnel = this.outputService.getActiveChAnnel();

		return chAnnel ? nls.locAlize('outputViewWithInputAriALAbel', "{0}, Output pAnel", chAnnel.lAbel) : nls.locAlize('outputViewAriALAbel', "Output pAnel");
	}

	Async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CAncellAtionToken): Promise<void> {
		const focus = !(options && options.preserveFocus);
		if (input.mAtches(this.input)) {
			return;
		}

		if (this.input) {
			// Dispose previous input (Output pAnel is not A workbench editor)
			this.input.dispose();
		}
		AwAit super.setInput(input, options, context, token);
		if (focus) {
			this.focus();
		}
		this.reveAlLAstLine();
	}

	cleArInput(): void {
		if (this.input) {
			// Dispose current input (Output pAnel is not A workbench editor)
			this.input.dispose();
		}
		super.cleArInput();
	}

	protected creAteEditor(pArent: HTMLElement): void {

		pArent.setAttribute('role', 'document');

		// First creAte the scoped instAntiAtion service And only then construct the editor using the scoped service
		const scopedContextKeyService = this._register(this.contextKeyService.creAteScoped(pArent));
		this.scopedInstAntiAtionService = this.instAntiAtionService.creAteChild(new ServiceCollection([IContextKeyService, scopedContextKeyService]));

		super.creAteEditor(pArent);

		CONTEXT_IN_OUTPUT.bindTo(scopedContextKeyService).set(true);
	}
}

clAss SwitchOutputActionViewItem extends SelectActionViewItem {

	privAte stAtic reAdonly SEPARATOR = '─────────';

	privAte outputChAnnels: IOutputChAnnelDescriptor[] = [];
	privAte logChAnnels: IOutputChAnnelDescriptor[] = [];

	constructor(
		Action: IAction,
		@IOutputService privAte reAdonly outputService: IOutputService,
		@IThemeService privAte reAdonly themeService: IThemeService,
		@IContextViewService contextViewService: IContextViewService
	) {
		super(null, Action, [], 0, contextViewService, { AriALAbel: nls.locAlize('outputChAnnels', 'Output ChAnnels.'), optionsAsChildren: true });

		let outputChAnnelRegistry = Registry.As<IOutputChAnnelRegistry>(Extensions.OutputChAnnels);
		this._register(outputChAnnelRegistry.onDidRegisterChAnnel(() => this.updAteOtions()));
		this._register(outputChAnnelRegistry.onDidRemoveChAnnel(() => this.updAteOtions()));
		this._register(this.outputService.onActiveOutputChAnnel(() => this.updAteOtions()));
		this._register(AttAchSelectBoxStyler(this.selectBox, themeService));

		this.updAteOtions();
	}

	render(contAiner: HTMLElement): void {
		super.render(contAiner);
		contAiner.clAssList.Add('switch-output');
		this._register(AttAchStylerCAllbAck(this.themeService, { selectBorder }, colors => {
			contAiner.style.borderColor = colors.selectBorder ? `${colors.selectBorder}` : '';
		}));
	}

	protected getActionContext(option: string, index: number): string {
		const chAnnel = index < this.outputChAnnels.length ? this.outputChAnnels[index] : this.logChAnnels[index - this.outputChAnnels.length - 1];
		return chAnnel ? chAnnel.id : option;
	}

	privAte updAteOtions(): void {
		const groups = groupBy(this.outputService.getChAnnelDescriptors(), (c1: IOutputChAnnelDescriptor, c2: IOutputChAnnelDescriptor) => {
			if (!c1.log && c2.log) {
				return -1;
			}
			if (c1.log && !c2.log) {
				return 1;
			}
			return 0;
		});
		this.outputChAnnels = groups[0] || [];
		this.logChAnnels = groups[1] || [];
		const showSepArAtor = this.outputChAnnels.length && this.logChAnnels.length;
		const sepArAtorIndex = showSepArAtor ? this.outputChAnnels.length : -1;
		const options: string[] = [...this.outputChAnnels.mAp(c => c.lAbel), ...(showSepArAtor ? [SwitchOutputActionViewItem.SEPARATOR] : []), ...this.logChAnnels.mAp(c => nls.locAlize('logChAnnel', "Log ({0})", c.lAbel))];
		let selected = 0;
		const ActiveChAnnel = this.outputService.getActiveChAnnel();
		if (ActiveChAnnel) {
			selected = this.outputChAnnels.mAp(c => c.id).indexOf(ActiveChAnnel.id);
			if (selected === -1) {
				const logChAnnelIndex = this.logChAnnels.mAp(c => c.id).indexOf(ActiveChAnnel.id);
				selected = logChAnnelIndex !== -1 ? sepArAtorIndex + 1 + logChAnnelIndex : 0;
			}
		}
		this.setOptions(options.mAp((lAbel, index) => <ISelectOptionItem>{ text: lAbel, isDisAbled: (index === sepArAtorIndex ? true : fAlse) }), MAth.mAx(0, selected));
	}
}

registerThemingPArticipAnt((theme: IColorTheme, collector: ICssStyleCollector) => {
	// SidebAr bAckground for the output view
	const sidebArBAckground = theme.getColor(SIDE_BAR_BACKGROUND);
	if (sidebArBAckground && sidebArBAckground !== theme.getColor(editorBAckground)) {
		collector.AddRule(`
			.monAco-workbench .pArt.sidebAr .output-view .monAco-editor,
			.monAco-workbench .pArt.sidebAr .output-view .monAco-editor .mArgin,
			.monAco-workbench .pArt.sidebAr .output-view .monAco-editor .monAco-editor-bAckground {
				bAckground-color: ${sidebArBAckground};
			}
		`);
	}
});
