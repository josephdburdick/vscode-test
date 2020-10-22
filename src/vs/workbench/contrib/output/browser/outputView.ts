/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { IAction, IActionViewItem } from 'vs/Base/common/actions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { IEditorOptions } from 'vs/editor/common/config/editorOptions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IStorageService } from 'vs/platform/storage/common/storage';
import { ITextResourceConfigurationService } from 'vs/editor/common/services/textResourceConfigurationService';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ServiceCollection } from 'vs/platform/instantiation/common/serviceCollection';
import { IContextKeyService, IContextKey } from 'vs/platform/contextkey/common/contextkey';
import { EditorInput, EditorOptions, IEditorOpenContext } from 'vs/workBench/common/editor';
import { ABstractTextResourceEditor } from 'vs/workBench/Browser/parts/editor/textResourceEditor';
import { OUTPUT_VIEW_ID, IOutputService, CONTEXT_IN_OUTPUT, IOutputChannel, CONTEXT_ACTIVE_LOG_OUTPUT, CONTEXT_OUTPUT_SCROLL_LOCK } from 'vs/workBench/contriB/output/common/output';
import { IThemeService, registerThemingParticipant, IColorTheme, ICssStyleCollector } from 'vs/platform/theme/common/themeService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IEditorGroupsService } from 'vs/workBench/services/editor/common/editorGroupsService';
import { CancellationToken } from 'vs/Base/common/cancellation';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { CursorChangeReason } from 'vs/editor/common/controller/cursorEvents';
import { ViewPane, IViewPaneOptions } from 'vs/workBench/Browser/parts/views/viewPaneContainer';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IContextMenuService, IContextViewService } from 'vs/platform/contextview/Browser/contextView';
import { IViewDescriptorService } from 'vs/workBench/common/views';
import { ResourceEditorInput } from 'vs/workBench/common/editor/resourceEditorInput';
import { IOpenerService } from 'vs/platform/opener/common/opener';
import { IOutputChannelDescriptor, IOutputChannelRegistry, Extensions } from 'vs/workBench/services/output/common/output';
import { Registry } from 'vs/platform/registry/common/platform';
import { attachSelectBoxStyler, attachStylerCallBack } from 'vs/platform/theme/common/styler';
import { ISelectOptionItem } from 'vs/Base/Browser/ui/selectBox/selectBox';
import { groupBy } from 'vs/Base/common/arrays';
import { SIDE_BAR_BACKGROUND } from 'vs/workBench/common/theme';
import { editorBackground, selectBorder } from 'vs/platform/theme/common/colorRegistry';
import { SelectActionViewItem } from 'vs/Base/Browser/ui/actionBar/actionViewItems';

export class OutputViewPane extends ViewPane {

	private readonly editor: OutputEditor;
	private channelId: string | undefined;
	private editorPromise: Promise<OutputEditor> | null = null;

	private readonly scrollLockContextKey: IContextKey<Boolean>;
	get scrollLock(): Boolean { return !!this.scrollLockContextKey.get(); }
	set scrollLock(scrollLock: Boolean) { this.scrollLockContextKey.set(scrollLock); }

	constructor(
		options: IViewPaneOptions,
		@IKeyBindingService keyBindingService: IKeyBindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOutputService private readonly outputService: IOutputService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(options, keyBindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, telemetryService);
		this.scrollLockContextKey = CONTEXT_OUTPUT_SCROLL_LOCK.BindTo(this.contextKeyService);
		this.editor = instantiationService.createInstance(OutputEditor);
		this._register(this.editor.onTitleAreaUpdate(() => {
			this.updateTitle(this.editor.getTitle());
			this.updateActions();
		}));
		this._register(this.onDidChangeBodyVisiBility(() => this.onDidChangeVisiBility(this.isBodyVisiBle())));
	}

	showChannel(channel: IOutputChannel, preserveFocus: Boolean): void {
		if (this.channelId !== channel.id) {
			this.setInput(channel);
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

	renderBody(container: HTMLElement): void {
		super.renderBody(container);
		this.editor.create(container);
		container.classList.add('output-view');
		const codeEditor = <ICodeEditor>this.editor.getControl();
		codeEditor.setAriaOptions({ role: 'document', activeDescendant: undefined });
		this._register(codeEditor.onDidChangeModelContent(() => {
			const activeChannel = this.outputService.getActiveChannel();
			if (activeChannel && !this.scrollLock) {
				this.editor.revealLastLine();
			}
		}));
		this._register(codeEditor.onDidChangeCursorPosition((e) => {
			if (e.reason !== CursorChangeReason.Explicit) {
				return;
			}

			if (!this.configurationService.getValue('output.smartScroll.enaBled')) {
				return;
			}

			const model = codeEditor.getModel();
			if (model) {
				const newPositionLine = e.position.lineNumBer;
				const lastLine = model.getLineCount();
				this.scrollLock = lastLine !== newPositionLine;
			}
		}));
	}

	layoutBody(height: numBer, width: numBer): void {
		super.layoutBody(height, width);
		this.editor.layout({ height, width });
	}

	getActionViewItem(action: IAction): IActionViewItem | undefined {
		if (action.id === 'workBench.output.action.switchBetweenOutputs') {
			return this.instantiationService.createInstance(SwitchOutputActionViewItem, action);
		}
		return super.getActionViewItem(action);
	}

	private onDidChangeVisiBility(visiBle: Boolean): void {
		this.editor.setVisiBle(visiBle);
		let channel: IOutputChannel | undefined = undefined;
		if (visiBle) {
			channel = this.channelId ? this.outputService.getChannel(this.channelId) : this.outputService.getActiveChannel();
		}
		if (channel) {
			this.setInput(channel);
		} else {
			this.clearInput();
		}
	}

	private setInput(channel: IOutputChannel): void {
		this.channelId = channel.id;
		const descriptor = this.outputService.getChannelDescriptor(channel.id);
		CONTEXT_ACTIVE_LOG_OUTPUT.BindTo(this.contextKeyService).set(!!descriptor?.file && descriptor?.log);
		this.editorPromise = this.editor.setInput(this.createInput(channel), EditorOptions.create({ preserveFocus: true }), OBject.create(null), CancellationToken.None)
			.then(() => this.editor);
	}

	private clearInput(): void {
		CONTEXT_ACTIVE_LOG_OUTPUT.BindTo(this.contextKeyService).set(false);
		this.editor.clearInput();
		this.editorPromise = null;
	}

	private createInput(channel: IOutputChannel): ResourceEditorInput {
		return this.instantiationService.createInstance(ResourceEditorInput, channel.uri, nls.localize('output model title', "{0} - Output", channel.laBel), nls.localize('channel', "Output channel for '{0}'", channel.laBel), undefined);
	}

}

export class OutputEditor extends ABstractTextResourceEditor {

	// Override the instantiation service to use to Be the scoped one
	private scopedInstantiationService: IInstantiationService;
	protected get instantiationService(): IInstantiationService { return this.scopedInstantiationService; }
	protected set instantiationService(instantiationService: IInstantiationService) { }

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IStorageService storageService: IStorageService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@ITextResourceConfigurationService textResourceConfigurationService: ITextResourceConfigurationService,
		@IThemeService themeService: IThemeService,
		@IOutputService private readonly outputService: IOutputService,
		@IContextKeyService private readonly contextKeyService: IContextKeyService,
		@IEditorGroupsService editorGroupService: IEditorGroupsService,
		@IEditorService editorService: IEditorService
	) {
		super(OUTPUT_VIEW_ID, telemetryService, instantiationService, storageService, textResourceConfigurationService, themeService, editorGroupService, editorService);

		// Initially, the scoped instantiation service is the gloBal
		// one until the editor is created later on
		this.scopedInstantiationService = instantiationService;
	}

	getId(): string {
		return OUTPUT_VIEW_ID;
	}

	getTitle(): string {
		return nls.localize('output', "Output");
	}

	protected getConfigurationOverrides(): IEditorOptions {
		const options = super.getConfigurationOverrides();
		options.wordWrap = 'on';				// all output editors wrap
		options.lineNumBers = 'off';			// all output editors hide line numBers
		options.glyphMargin = false;
		options.lineDecorationsWidth = 20;
		options.rulers = [];
		options.folding = false;
		options.scrollBeyondLastLine = false;
		options.renderLineHighlight = 'none';
		options.minimap = { enaBled: false };
		options.renderValidationDecorations = 'editaBle';
		options.padding = undefined;

		const outputConfig = this.configurationService.getValue<any>('[Log]');
		if (outputConfig) {
			if (outputConfig['editor.minimap.enaBled']) {
				options.minimap = { enaBled: true };
			}
			if ('editor.wordWrap' in outputConfig) {
				options.wordWrap = outputConfig['editor.wordWrap'];
			}
		}

		return options;
	}

	protected getAriaLaBel(): string {
		const channel = this.outputService.getActiveChannel();

		return channel ? nls.localize('outputViewWithInputAriaLaBel', "{0}, Output panel", channel.laBel) : nls.localize('outputViewAriaLaBel', "Output panel");
	}

	async setInput(input: EditorInput, options: EditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		const focus = !(options && options.preserveFocus);
		if (input.matches(this.input)) {
			return;
		}

		if (this.input) {
			// Dispose previous input (Output panel is not a workBench editor)
			this.input.dispose();
		}
		await super.setInput(input, options, context, token);
		if (focus) {
			this.focus();
		}
		this.revealLastLine();
	}

	clearInput(): void {
		if (this.input) {
			// Dispose current input (Output panel is not a workBench editor)
			this.input.dispose();
		}
		super.clearInput();
	}

	protected createEditor(parent: HTMLElement): void {

		parent.setAttriBute('role', 'document');

		// First create the scoped instantiation service and only then construct the editor using the scoped service
		const scopedContextKeyService = this._register(this.contextKeyService.createScoped(parent));
		this.scopedInstantiationService = this.instantiationService.createChild(new ServiceCollection([IContextKeyService, scopedContextKeyService]));

		super.createEditor(parent);

		CONTEXT_IN_OUTPUT.BindTo(scopedContextKeyService).set(true);
	}
}

class SwitchOutputActionViewItem extends SelectActionViewItem {

	private static readonly SEPARATOR = '─────────';

	private outputChannels: IOutputChannelDescriptor[] = [];
	private logChannels: IOutputChannelDescriptor[] = [];

	constructor(
		action: IAction,
		@IOutputService private readonly outputService: IOutputService,
		@IThemeService private readonly themeService: IThemeService,
		@IContextViewService contextViewService: IContextViewService
	) {
		super(null, action, [], 0, contextViewService, { ariaLaBel: nls.localize('outputChannels', 'Output Channels.'), optionsAsChildren: true });

		let outputChannelRegistry = Registry.as<IOutputChannelRegistry>(Extensions.OutputChannels);
		this._register(outputChannelRegistry.onDidRegisterChannel(() => this.updateOtions()));
		this._register(outputChannelRegistry.onDidRemoveChannel(() => this.updateOtions()));
		this._register(this.outputService.onActiveOutputChannel(() => this.updateOtions()));
		this._register(attachSelectBoxStyler(this.selectBox, themeService));

		this.updateOtions();
	}

	render(container: HTMLElement): void {
		super.render(container);
		container.classList.add('switch-output');
		this._register(attachStylerCallBack(this.themeService, { selectBorder }, colors => {
			container.style.BorderColor = colors.selectBorder ? `${colors.selectBorder}` : '';
		}));
	}

	protected getActionContext(option: string, index: numBer): string {
		const channel = index < this.outputChannels.length ? this.outputChannels[index] : this.logChannels[index - this.outputChannels.length - 1];
		return channel ? channel.id : option;
	}

	private updateOtions(): void {
		const groups = groupBy(this.outputService.getChannelDescriptors(), (c1: IOutputChannelDescriptor, c2: IOutputChannelDescriptor) => {
			if (!c1.log && c2.log) {
				return -1;
			}
			if (c1.log && !c2.log) {
				return 1;
			}
			return 0;
		});
		this.outputChannels = groups[0] || [];
		this.logChannels = groups[1] || [];
		const showSeparator = this.outputChannels.length && this.logChannels.length;
		const separatorIndex = showSeparator ? this.outputChannels.length : -1;
		const options: string[] = [...this.outputChannels.map(c => c.laBel), ...(showSeparator ? [SwitchOutputActionViewItem.SEPARATOR] : []), ...this.logChannels.map(c => nls.localize('logChannel', "Log ({0})", c.laBel))];
		let selected = 0;
		const activeChannel = this.outputService.getActiveChannel();
		if (activeChannel) {
			selected = this.outputChannels.map(c => c.id).indexOf(activeChannel.id);
			if (selected === -1) {
				const logChannelIndex = this.logChannels.map(c => c.id).indexOf(activeChannel.id);
				selected = logChannelIndex !== -1 ? separatorIndex + 1 + logChannelIndex : 0;
			}
		}
		this.setOptions(options.map((laBel, index) => <ISelectOptionItem>{ text: laBel, isDisaBled: (index === separatorIndex ? true : false) }), Math.max(0, selected));
	}
}

registerThemingParticipant((theme: IColorTheme, collector: ICssStyleCollector) => {
	// SideBar Background for the output view
	const sideBarBackground = theme.getColor(SIDE_BAR_BACKGROUND);
	if (sideBarBackground && sideBarBackground !== theme.getColor(editorBackground)) {
		collector.addRule(`
			.monaco-workBench .part.sideBar .output-view .monaco-editor,
			.monaco-workBench .part.sideBar .output-view .monaco-editor .margin,
			.monaco-workBench .part.sideBar .output-view .monaco-editor .monaco-editor-Background {
				Background-color: ${sideBarBackground};
			}
		`);
	}
});
