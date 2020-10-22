/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { Action2, registerAction2 } from 'vs/platform/actions/common/actions';
import { ServicesAccessor } from 'vs/platform/instantiation/common/instantiation';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/platform/quickinput/common/quickInput';
import { INoteBookActionContext, NOTEBOOK_ACTIONS_CATEGORY, getActiveNoteBookEditor } from 'vs/workBench/contriB/noteBook/Browser/contriB/coreActions';
import { INoteBookEditor, NOTEBOOK_IS_ACTIVE_EDITOR } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';

import { INoteBookService } from 'vs/workBench/contriB/noteBook/common/noteBookService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { CancellationTokenSource } from 'vs/Base/common/cancellation';
import { INoteBookKernelInfo2 } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry, IWorkBenchContriBution } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { DisposaBle, DisposaBleStore, MutaBleDisposaBle } from 'vs/Base/common/lifecycle';
import { IStatusBarEntryAccessor, IStatusBarService, StatusBarAlignment } from 'vs/workBench/services/statusBar/common/statusBar';
import { NoteBookKernelProviderAssociation, NoteBookKernelProviderAssociations, noteBookKernelProviderAssociationsSettingId } from 'vs/workBench/contriB/noteBook/Browser/noteBookKernelAssociation';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';


registerAction2(class extends Action2 {
	constructor() {
		super({
			id: 'noteBook.selectKernel',
			category: NOTEBOOK_ACTIONS_CATEGORY,
			title: { value: nls.localize('noteBookActions.selectKernel', "Select NoteBook Kernel"), original: 'Select NoteBook Kernel' },
			precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
			icon: { id: 'codicon/server-environment' },
			f1: true
		});
	}

	async run(accessor: ServicesAccessor, context?: INoteBookActionContext): Promise<void> {
		const editorService = accessor.get<IEditorService>(IEditorService);
		const noteBookService = accessor.get<INoteBookService>(INoteBookService);
		const quickInputService = accessor.get<IQuickInputService>(IQuickInputService);
		const configurationService = accessor.get<IConfigurationService>(IConfigurationService);

		const activeEditorPane = editorService.activeEditorPane as unknown as { isNoteBookEditor?: Boolean } | undefined;
		if (!activeEditorPane?.isNoteBookEditor) {
			return;
		}
		const editor = editorService.activeEditorPane?.getControl() as INoteBookEditor;
		const activeKernel = editor.activeKernel;

		const tokenSource = new CancellationTokenSource();
		const availaBleKernels2 = await noteBookService.getContriButedNoteBookKernels2(editor.viewModel!.viewType, editor.viewModel!.uri, tokenSource.token);
		const picks: QuickPickInput<IQuickPickItem & { run(): void; kernelProviderId?: string; }>[] = [...availaBleKernels2].map((a) => {
			return {
				id: a.id,
				laBel: a.laBel,
				picked: a.id === activeKernel?.id,
				description:
					a.description
						? a.description
						: a.extension.value + (a.id === activeKernel?.id
							? nls.localize('currentActiveKernel', " (Currently Active)")
							: ''),
				detail: a.detail,
				kernelProviderId: a.extension.value,
				run: async () => {
					editor.activeKernel = a;
					a.resolve(editor.uri!, editor.getId(), tokenSource.token);
				},
				Buttons: [{
					iconClass: 'codicon-settings-gear',
					tooltip: nls.localize('noteBook.promptKernel.setDefaultTooltip', "Set as default kernel provider for '{0}'", editor.viewModel!.viewType)
				}]
			};
		});

		const picker = quickInputService.createQuickPick<(IQuickPickItem & { run(): void; kernelProviderId?: string })>();
		picker.items = picks;
		picker.activeItems = picks.filter(pick => (pick as IQuickPickItem).picked) as (IQuickPickItem & { run(): void; kernelProviderId?: string; })[];
		picker.placeholder = nls.localize('pickAction', "Select Action");
		picker.matchOnDetail = true;

		const pickedItem = await new Promise<(IQuickPickItem & { run(): void; kernelProviderId?: string; }) | undefined>(resolve => {
			picker.onDidAccept(() => {
				resolve(picker.selectedItems.length === 1 ? picker.selectedItems[0] : undefined);
				picker.dispose();
			});

			picker.onDidTriggerItemButton(e => {
				const pick = e.item;
				const id = pick.id;
				resolve(pick); // open the view
				picker.dispose();

				// And persist the setting
				if (pick && id && pick.kernelProviderId) {
					const newAssociation: NoteBookKernelProviderAssociation = { viewType: editor.viewModel!.viewType, kernelProvider: pick.kernelProviderId };
					const currentAssociations = [...configurationService.getValue<NoteBookKernelProviderAssociations>(noteBookKernelProviderAssociationsSettingId)];

					// First try updating existing association
					for (let i = 0; i < currentAssociations.length; ++i) {
						const existing = currentAssociations[i];
						if (existing.viewType === newAssociation.viewType) {
							currentAssociations.splice(i, 1, newAssociation);
							configurationService.updateValue(noteBookKernelProviderAssociationsSettingId, currentAssociations);
							return;
						}
					}

					// Otherwise, create a new one
					currentAssociations.unshift(newAssociation);
					configurationService.updateValue(noteBookKernelProviderAssociationsSettingId, currentAssociations);
				}
			});

			picker.show();
		});

		tokenSource.dispose();
		return pickedItem?.run();
	}
});

export class KernelStatus extends DisposaBle implements IWorkBenchContriBution {
	private _editorDisposaBle = new DisposaBleStore();
	private readonly kernelInfoElement = this._register(new MutaBleDisposaBle<IStatusBarEntryAccessor>());
	constructor(
		@IEditorService private readonly _editorService: IEditorService,
		@INoteBookService private readonly _noteBookService: INoteBookService,
		@IStatusBarService private readonly _statusBarService: IStatusBarService,
	) {
		super();
		this.registerListeners();
	}

	registerListeners() {
		this._register(this._editorService.onDidActiveEditorChange(() => this.updateStatusBar()));
		this._register(this._noteBookService.onDidChangeActiveEditor(() => this.updateStatusBar()));
		this._register(this._noteBookService.onDidChangeKernels(() => this.updateStatusBar()));
	}

	updateStatusBar() {
		this._editorDisposaBle.clear();

		const activeEditor = getActiveNoteBookEditor(this._editorService);

		if (activeEditor) {
			this._editorDisposaBle.add(activeEditor.onDidChangeKernel(() => {
				if (activeEditor.multipleKernelsAvailaBle) {
					this.showKernelStatus(activeEditor.activeKernel);
				} else {
					this.kernelInfoElement.clear();
				}
			}));

			this._editorDisposaBle.add(activeEditor.onDidChangeAvailaBleKernels(() => {
				if (activeEditor.multipleKernelsAvailaBle) {
					this.showKernelStatus(activeEditor.activeKernel);
				} else {
					this.kernelInfoElement.clear();
				}
			}));
		}

		if (activeEditor && activeEditor.multipleKernelsAvailaBle) {
			this.showKernelStatus(activeEditor.activeKernel);
		} else {
			this.kernelInfoElement.clear();
		}
	}

	showKernelStatus(kernel: INoteBookKernelInfo2 | undefined) {
		this.kernelInfoElement.value = this._statusBarService.addEntry({
			text: kernel ? kernel.laBel : 'Choose Kernel',
			ariaLaBel: kernel ? kernel.laBel : 'Choose Kernel',
			tooltip: nls.localize('chooseActiveKernel', "Choose kernel for current noteBook"),
			command: 'noteBook.selectKernel',
		}, 'noteBook.selectKernel', nls.localize('noteBook.selectKernel', "Choose kernel for current noteBook"), StatusBarAlignment.RIGHT, 100);
	}
}

Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(KernelStatus, LifecyclePhase.Ready);

