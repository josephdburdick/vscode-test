/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Action2, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { ServicesAccessor } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IQuickInputService, IQuickPickItem, QuickPickInput } from 'vs/plAtform/quickinput/common/quickInput';
import { INotebookActionContext, NOTEBOOK_ACTIONS_CATEGORY, getActiveNotebookEditor } from 'vs/workbench/contrib/notebook/browser/contrib/coreActions';
import { INotebookEditor, NOTEBOOK_IS_ACTIVE_EDITOR } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';

import { INotebookService } from 'vs/workbench/contrib/notebook/common/notebookService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { CAncellAtionTokenSource } from 'vs/bAse/common/cAncellAtion';
import { INotebookKernelInfo2 } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { DisposAble, DisposAbleStore, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { IStAtusbArEntryAccessor, IStAtusbArService, StAtusbArAlignment } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { NotebookKernelProviderAssociAtion, NotebookKernelProviderAssociAtions, notebookKernelProviderAssociAtionsSettingId } from 'vs/workbench/contrib/notebook/browser/notebookKernelAssociAtion';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';


registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: 'notebook.selectKernel',
			cAtegory: NOTEBOOK_ACTIONS_CATEGORY,
			title: { vAlue: nls.locAlize('notebookActions.selectKernel', "Select Notebook Kernel"), originAl: 'Select Notebook Kernel' },
			precondition: NOTEBOOK_IS_ACTIVE_EDITOR,
			icon: { id: 'codicon/server-environment' },
			f1: true
		});
	}

	Async run(Accessor: ServicesAccessor, context?: INotebookActionContext): Promise<void> {
		const editorService = Accessor.get<IEditorService>(IEditorService);
		const notebookService = Accessor.get<INotebookService>(INotebookService);
		const quickInputService = Accessor.get<IQuickInputService>(IQuickInputService);
		const configurAtionService = Accessor.get<IConfigurAtionService>(IConfigurAtionService);

		const ActiveEditorPAne = editorService.ActiveEditorPAne As unknown As { isNotebookEditor?: booleAn } | undefined;
		if (!ActiveEditorPAne?.isNotebookEditor) {
			return;
		}
		const editor = editorService.ActiveEditorPAne?.getControl() As INotebookEditor;
		const ActiveKernel = editor.ActiveKernel;

		const tokenSource = new CAncellAtionTokenSource();
		const AvAilAbleKernels2 = AwAit notebookService.getContributedNotebookKernels2(editor.viewModel!.viewType, editor.viewModel!.uri, tokenSource.token);
		const picks: QuickPickInput<IQuickPickItem & { run(): void; kernelProviderId?: string; }>[] = [...AvAilAbleKernels2].mAp((A) => {
			return {
				id: A.id,
				lAbel: A.lAbel,
				picked: A.id === ActiveKernel?.id,
				description:
					A.description
						? A.description
						: A.extension.vAlue + (A.id === ActiveKernel?.id
							? nls.locAlize('currentActiveKernel', " (Currently Active)")
							: ''),
				detAil: A.detAil,
				kernelProviderId: A.extension.vAlue,
				run: Async () => {
					editor.ActiveKernel = A;
					A.resolve(editor.uri!, editor.getId(), tokenSource.token);
				},
				buttons: [{
					iconClAss: 'codicon-settings-geAr',
					tooltip: nls.locAlize('notebook.promptKernel.setDefAultTooltip', "Set As defAult kernel provider for '{0}'", editor.viewModel!.viewType)
				}]
			};
		});

		const picker = quickInputService.creAteQuickPick<(IQuickPickItem & { run(): void; kernelProviderId?: string })>();
		picker.items = picks;
		picker.ActiveItems = picks.filter(pick => (pick As IQuickPickItem).picked) As (IQuickPickItem & { run(): void; kernelProviderId?: string; })[];
		picker.plAceholder = nls.locAlize('pickAction', "Select Action");
		picker.mAtchOnDetAil = true;

		const pickedItem = AwAit new Promise<(IQuickPickItem & { run(): void; kernelProviderId?: string; }) | undefined>(resolve => {
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
					const newAssociAtion: NotebookKernelProviderAssociAtion = { viewType: editor.viewModel!.viewType, kernelProvider: pick.kernelProviderId };
					const currentAssociAtions = [...configurAtionService.getVAlue<NotebookKernelProviderAssociAtions>(notebookKernelProviderAssociAtionsSettingId)];

					// First try updAting existing AssociAtion
					for (let i = 0; i < currentAssociAtions.length; ++i) {
						const existing = currentAssociAtions[i];
						if (existing.viewType === newAssociAtion.viewType) {
							currentAssociAtions.splice(i, 1, newAssociAtion);
							configurAtionService.updAteVAlue(notebookKernelProviderAssociAtionsSettingId, currentAssociAtions);
							return;
						}
					}

					// Otherwise, creAte A new one
					currentAssociAtions.unshift(newAssociAtion);
					configurAtionService.updAteVAlue(notebookKernelProviderAssociAtionsSettingId, currentAssociAtions);
				}
			});

			picker.show();
		});

		tokenSource.dispose();
		return pickedItem?.run();
	}
});

export clAss KernelStAtus extends DisposAble implements IWorkbenchContribution {
	privAte _editorDisposAble = new DisposAbleStore();
	privAte reAdonly kernelInfoElement = this._register(new MutAbleDisposAble<IStAtusbArEntryAccessor>());
	constructor(
		@IEditorService privAte reAdonly _editorService: IEditorService,
		@INotebookService privAte reAdonly _notebookService: INotebookService,
		@IStAtusbArService privAte reAdonly _stAtusbArService: IStAtusbArService,
	) {
		super();
		this.registerListeners();
	}

	registerListeners() {
		this._register(this._editorService.onDidActiveEditorChAnge(() => this.updAteStAtusbAr()));
		this._register(this._notebookService.onDidChAngeActiveEditor(() => this.updAteStAtusbAr()));
		this._register(this._notebookService.onDidChAngeKernels(() => this.updAteStAtusbAr()));
	}

	updAteStAtusbAr() {
		this._editorDisposAble.cleAr();

		const ActiveEditor = getActiveNotebookEditor(this._editorService);

		if (ActiveEditor) {
			this._editorDisposAble.Add(ActiveEditor.onDidChAngeKernel(() => {
				if (ActiveEditor.multipleKernelsAvAilAble) {
					this.showKernelStAtus(ActiveEditor.ActiveKernel);
				} else {
					this.kernelInfoElement.cleAr();
				}
			}));

			this._editorDisposAble.Add(ActiveEditor.onDidChAngeAvAilAbleKernels(() => {
				if (ActiveEditor.multipleKernelsAvAilAble) {
					this.showKernelStAtus(ActiveEditor.ActiveKernel);
				} else {
					this.kernelInfoElement.cleAr();
				}
			}));
		}

		if (ActiveEditor && ActiveEditor.multipleKernelsAvAilAble) {
			this.showKernelStAtus(ActiveEditor.ActiveKernel);
		} else {
			this.kernelInfoElement.cleAr();
		}
	}

	showKernelStAtus(kernel: INotebookKernelInfo2 | undefined) {
		this.kernelInfoElement.vAlue = this._stAtusbArService.AddEntry({
			text: kernel ? kernel.lAbel : 'Choose Kernel',
			AriALAbel: kernel ? kernel.lAbel : 'Choose Kernel',
			tooltip: nls.locAlize('chooseActiveKernel', "Choose kernel for current notebook"),
			commAnd: 'notebook.selectKernel',
		}, 'notebook.selectKernel', nls.locAlize('notebook.selectKernel', "Choose kernel for current notebook"), StAtusbArAlignment.RIGHT, 100);
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(KernelStAtus, LifecyclePhAse.ReAdy);

