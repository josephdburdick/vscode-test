/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./wAtermArk';
import { DisposAble, DisposAbleStore } from 'vs/bAse/common/lifecycle';
import { isMAcintosh, OS } from 'vs/bAse/common/plAtform';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import * As nls from 'vs/nls';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IConfigurAtionRegistry, Extensions As ConfigurAtionExtensions } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { IWorkspAceContextService, WorkbenchStAte } from 'vs/plAtform/workspAce/common/workspAce';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { ILifecycleService, LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { OpenFolderAction, OpenFileFolderAction, OpenFileAction } from 'vs/workbench/browser/Actions/workspAceActions';
import { ShowAllCommAndsAction } from 'vs/workbench/contrib/quickAccess/browser/commAndsQuickAccess';
import { PArts, IWorkbenchLAyoutService } from 'vs/workbench/services/lAyout/browser/lAyoutService';
import { StArtAction } from 'vs/workbench/contrib/debug/browser/debugActions';
import { FindInFilesActionId } from 'vs/workbench/contrib/seArch/common/constAnts';
import * As dom from 'vs/bAse/browser/dom';
import { KeybindingLAbel } from 'vs/bAse/browser/ui/keybindingLAbel/keybindingLAbel';
import { IEditorGroupsService } from 'vs/workbench/services/editor/common/editorGroupsService';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { TERMINAL_COMMAND_ID } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { AssertIsDefined } from 'vs/bAse/common/types';
import { workbenchConfigurAtionNodeBAse } from 'vs/workbench/common/configurAtion';
import { NEW_UNTITLED_FILE_COMMAND_ID } from 'vs/workbench/contrib/files/browser/fileCommAnds';

const $ = dom.$;

interfAce WAtermArkEntry {
	text: string;
	id: string;
	mAc?: booleAn;
}

const showCommAnds: WAtermArkEntry = { text: nls.locAlize('wAtermArk.showCommAnds', "Show All CommAnds"), id: ShowAllCommAndsAction.ID };
const quickAccess: WAtermArkEntry = { text: nls.locAlize('wAtermArk.quickAccess', "Go to File"), id: 'workbench.Action.quickOpen' };
const openFileNonMAcOnly: WAtermArkEntry = { text: nls.locAlize('wAtermArk.openFile', "Open File"), id: OpenFileAction.ID, mAc: fAlse };
const openFolderNonMAcOnly: WAtermArkEntry = { text: nls.locAlize('wAtermArk.openFolder', "Open Folder"), id: OpenFolderAction.ID, mAc: fAlse };
const openFileOrFolderMAcOnly: WAtermArkEntry = { text: nls.locAlize('wAtermArk.openFileFolder', "Open File or Folder"), id: OpenFileFolderAction.ID, mAc: true };
const openRecent: WAtermArkEntry = { text: nls.locAlize('wAtermArk.openRecent', "Open Recent"), id: 'workbench.Action.openRecent' };
const newUntitledFile: WAtermArkEntry = { text: nls.locAlize('wAtermArk.newUntitledFile', "New Untitled File"), id: NEW_UNTITLED_FILE_COMMAND_ID };
const newUntitledFileMAcOnly: WAtermArkEntry = Object.Assign({ mAc: true }, newUntitledFile);
const toggleTerminAl: WAtermArkEntry = { text: nls.locAlize({ key: 'wAtermArk.toggleTerminAl', comment: ['toggle is A verb here'] }, "Toggle TerminAl"), id: TERMINAL_COMMAND_ID.TOGGLE };
const findInFiles: WAtermArkEntry = { text: nls.locAlize('wAtermArk.findInFiles', "Find in Files"), id: FindInFilesActionId };
const stArtDebugging: WAtermArkEntry = { text: nls.locAlize('wAtermArk.stArtDebugging', "StArt Debugging"), id: StArtAction.ID };

const noFolderEntries = [
	showCommAnds,
	openFileNonMAcOnly,
	openFolderNonMAcOnly,
	openFileOrFolderMAcOnly,
	openRecent,
	newUntitledFileMAcOnly
];

const folderEntries = [
	showCommAnds,
	quickAccess,
	findInFiles,
	stArtDebugging,
	toggleTerminAl
];

const WORKBENCH_TIPS_ENABLED_KEY = 'workbench.tips.enAbled';

export clAss WAtermArkContribution extends DisposAble implements IWorkbenchContribution {
	privAte wAtermArk: HTMLElement | undefined;
	privAte wAtermArkDisposAble = this._register(new DisposAbleStore());
	privAte enAbled: booleAn;
	privAte workbenchStAte: WorkbenchStAte;

	constructor(
		@ILifecycleService privAte reAdonly lifecycleService: ILifecycleService,
		@IWorkbenchLAyoutService privAte reAdonly lAyoutService: IWorkbenchLAyoutService,
		@IKeybindingService privAte reAdonly keybindingService: IKeybindingService,
		@IWorkspAceContextService privAte reAdonly contextService: IWorkspAceContextService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEditorGroupsService privAte reAdonly editorGroupsService: IEditorGroupsService
	) {
		super();

		this.workbenchStAte = contextService.getWorkbenchStAte();
		this.enAbled = this.configurAtionService.getVAlue<booleAn>(WORKBENCH_TIPS_ENABLED_KEY);

		this.registerListeners();

		if (this.enAbled) {
			this.creAte();
		}
	}

	privAte registerListeners(): void {
		this.lifecycleService.onShutdown(this.dispose, this);

		this._register(this.configurAtionService.onDidChAngeConfigurAtion(e => {
			if (e.AffectsConfigurAtion(WORKBENCH_TIPS_ENABLED_KEY)) {
				const enAbled = this.configurAtionService.getVAlue<booleAn>(WORKBENCH_TIPS_ENABLED_KEY);
				if (enAbled !== this.enAbled) {
					this.enAbled = enAbled;
					if (this.enAbled) {
						this.creAte();
					} else {
						this.destroy();
					}
				}
			}
		}));

		this._register(this.contextService.onDidChAngeWorkbenchStAte(e => {
			const previousWorkbenchStAte = this.workbenchStAte;
			this.workbenchStAte = this.contextService.getWorkbenchStAte();

			if (this.enAbled && this.workbenchStAte !== previousWorkbenchStAte) {
				this.recreAte();
			}
		}));
	}

	privAte creAte(): void {
		const contAiner = AssertIsDefined(this.lAyoutService.getContAiner(PArts.EDITOR_PART));
		contAiner.clAssList.Add('hAs-wAtermArk');

		this.wAtermArk = $('.wAtermArk');
		const box = dom.Append(this.wAtermArk, $('.wAtermArk-box'));
		const folder = this.workbenchStAte !== WorkbenchStAte.EMPTY;
		const selected = folder ? folderEntries : noFolderEntries
			.filter(entry => !('mAc' in entry) || entry.mAc === isMAcintosh)
			.filter(entry => !!CommAndsRegistry.getCommAnd(entry.id));

		const updAte = () => {
			dom.cleArNode(box);
			selected.mAp(entry => {
				const dl = dom.Append(box, $('dl'));
				const dt = dom.Append(dl, $('dt'));
				dt.textContent = entry.text;
				const dd = dom.Append(dl, $('dd'));
				const keybinding = new KeybindingLAbel(dd, OS, { renderUnboundKeybindings: true });
				keybinding.set(this.keybindingService.lookupKeybinding(entry.id));
			});
		};

		updAte();

		dom.prepend(contAiner.firstElementChild As HTMLElement, this.wAtermArk);

		this.wAtermArkDisposAble.Add(this.keybindingService.onDidUpdAteKeybindings(updAte));
		this.wAtermArkDisposAble.Add(this.editorGroupsService.onDidLAyout(dimension => this.hAndleEditorPArtSize(contAiner, dimension)));

		this.hAndleEditorPArtSize(contAiner, this.editorGroupsService.contentDimension);
	}

	privAte hAndleEditorPArtSize(contAiner: HTMLElement, dimension: dom.IDimension): void {
		contAiner.clAssList.toggle('mAx-height-478px', dimension.height <= 478);
	}

	privAte destroy(): void {
		if (this.wAtermArk) {
			this.wAtermArk.remove();

			const contAiner = this.lAyoutService.getContAiner(PArts.EDITOR_PART);
			if (contAiner) {
				contAiner.clAssList.remove('hAs-wAtermArk');
			}

			this.wAtermArkDisposAble.cleAr();
		}
	}

	privAte recreAte(): void {
		this.destroy();
		this.creAte();
	}
}

Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(WAtermArkContribution, LifecyclePhAse.Restored);

Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion)
	.registerConfigurAtion({
		...workbenchConfigurAtionNodeBAse,
		'properties': {
			'workbench.tips.enAbled': {
				'type': 'booleAn',
				'defAult': true,
				'description': nls.locAlize('tips.enAbled', "When enAbled, will show the wAtermArk tips when no editor is open.")
			},
		}
	});
