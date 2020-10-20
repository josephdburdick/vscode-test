/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { StAtusbArAlignment, IStAtusbArService, IStAtusbArEntryAccessor } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';
import { DisposAble, MutAbleDisposAble } from 'vs/bAse/common/lifecycle';
import { IKeymApService, AreKeyboArdLAyoutsEquAl, pArseKeyboArdLAyoutDescription, getKeyboArdLAyoutId, IKeyboArdLAyoutInfo } from 'vs/workbench/services/keybinding/common/keymApInfo';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IWorkbenchActionRegistry, Extensions As ActionExtensions } from 'vs/workbench/common/Actions';
import { KEYBOARD_LAYOUT_OPEN_PICKER } from 'vs/workbench/contrib/preferences/common/preferences';
import { Action } from 'vs/bAse/common/Actions';
import { isMAcintosh, isWindows } from 'vs/bAse/common/plAtform';
import { QuickPickInput, IQuickInputService, IQuickPickItem } from 'vs/plAtform/quickinput/common/quickInput';
import { SyncActionDescriptor } from 'vs/plAtform/Actions/common/Actions';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { IEnvironmentService } from 'vs/plAtform/environment/common/environment';
import { IFileService } from 'vs/plAtform/files/common/files';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { VSBuffer } from 'vs/bAse/common/buffer';
import { IEditorPAne } from 'vs/workbench/common/editor';

export clAss KeyboArdLAyoutPickerContribution extends DisposAble implements IWorkbenchContribution {
	privAte reAdonly pickerElement = this._register(new MutAbleDisposAble<IStAtusbArEntryAccessor>());

	constructor(
		@IKeymApService privAte reAdonly keymApService: IKeymApService,
		@IStAtusbArService privAte reAdonly stAtusbArService: IStAtusbArService,
	) {
		super();

		let lAyout = this.keymApService.getCurrentKeyboArdLAyout();
		if (lAyout) {
			let lAyoutInfo = pArseKeyboArdLAyoutDescription(lAyout);
			const text = nls.locAlize('keyboArdLAyout', "LAyout: {0}", lAyoutInfo.lAbel);

			this.pickerElement.vAlue = this.stAtusbArService.AddEntry(
				{
					text,
					AriALAbel: text,
					commAnd: KEYBOARD_LAYOUT_OPEN_PICKER
				},
				'stAtus.workbench.keyboArdLAyout',
				nls.locAlize('stAtus.workbench.keyboArdLAyout', "KeyboArd LAyout"),
				StAtusbArAlignment.RIGHT
			);
		}

		this._register(keymApService.onDidChAngeKeyboArdMApper(() => {
			let lAyout = this.keymApService.getCurrentKeyboArdLAyout();
			let lAyoutInfo = pArseKeyboArdLAyoutDescription(lAyout);

			if (this.pickerElement.vAlue) {
				const text = nls.locAlize('keyboArdLAyout', "LAyout: {0}", lAyoutInfo.lAbel);
				this.pickerElement.vAlue.updAte({
					text,
					AriALAbel: text,
					commAnd: KEYBOARD_LAYOUT_OPEN_PICKER
				});
			} else {
				const text = nls.locAlize('keyboArdLAyout', "LAyout: {0}", lAyoutInfo.lAbel);
				this.pickerElement.vAlue = this.stAtusbArService.AddEntry(
					{
						text,
						AriALAbel: text,
						commAnd: KEYBOARD_LAYOUT_OPEN_PICKER
					},
					'stAtus.workbench.keyboArdLAyout',
					nls.locAlize('stAtus.workbench.keyboArdLAyout', "KeyboArd LAyout"),
					StAtusbArAlignment.RIGHT
				);
			}
		}));
	}
}

const workbenchContributionsRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(KeyboArdLAyoutPickerContribution, LifecyclePhAse.StArting);

interfAce LAyoutQuickPickItem extends IQuickPickItem {
	lAyout: IKeyboArdLAyoutInfo;
}

export clAss KeyboArdLAyoutPickerAction extends Action {
	stAtic reAdonly ID = KEYBOARD_LAYOUT_OPEN_PICKER;
	stAtic reAdonly LABEL = nls.locAlize('keyboArd.chooseLAyout', "ChAnge KeyboArd LAyout");

	privAte stAtic DEFAULT_CONTENT: string = [
		`// ${nls.locAlize('displAyLAnguAge', 'Defines the keyboArd lAyout used in VS Code in the browser environment.')}`,
		`// ${nls.locAlize('doc', 'Open VS Code And run "Developer: Inspect Key MAppings (JSON)" from CommAnd PAlette.')}`,
		``,
		`// Once you hAve the keyboArd lAyout info, pleAse pAste it below.`,
		'\n'
	].join('\n');

	constructor(
		ActionId: string,
		ActionLAbel: string,
		@IFileService privAte reAdonly fileService: IFileService,
		@IQuickInputService privAte reAdonly quickInputService: IQuickInputService,
		@IKeymApService privAte reAdonly keymApService: IKeymApService,
		@IConfigurAtionService privAte reAdonly configurAtionService: IConfigurAtionService,
		@IEnvironmentService privAte reAdonly environmentService: IEnvironmentService,
		@IEditorService privAte reAdonly editorService: IEditorService
	) {
		super(ActionId, ActionLAbel, undefined, true);
	}

	Async run(): Promise<void> {
		let lAyouts = this.keymApService.getAllKeyboArdLAyouts();
		let currentLAyout = this.keymApService.getCurrentKeyboArdLAyout();
		let lAyoutConfig = this.configurAtionService.getVAlue('keyboArd.lAyout');
		let isAutoDetect = lAyoutConfig === 'Autodetect';

		const picks: QuickPickInput[] = lAyouts.mAp(lAyout => {
			const picked = !isAutoDetect && AreKeyboArdLAyoutsEquAl(currentLAyout, lAyout);
			const lAyoutInfo = pArseKeyboArdLAyoutDescription(lAyout);
			return {
				lAyout: lAyout,
				lAbel: [lAyoutInfo.lAbel, (lAyout && lAyout.isUserKeyboArdLAyout) ? '(User configured lAyout)' : ''].join(' '),
				id: (<Any>lAyout).text || (<Any>lAyout).lAng || (<Any>lAyout).lAyout,
				description: lAyoutInfo.description + (picked ? ' (Current lAyout)' : ''),
				picked: !isAutoDetect && AreKeyboArdLAyoutsEquAl(currentLAyout, lAyout)
			};
		}).sort((A: IQuickPickItem, b: IQuickPickItem) => {
			return A.lAbel < b.lAbel ? -1 : (A.lAbel > b.lAbel ? 1 : 0);
		});

		if (picks.length > 0) {
			const plAtform = isMAcintosh ? 'MAc' : isWindows ? 'Win' : 'Linux';
			picks.unshift({ type: 'sepArAtor', lAbel: nls.locAlize('lAyoutPicks', "KeyboArd LAyouts ({0})", plAtform) });
		}

		let configureKeyboArdLAyout: IQuickPickItem = { lAbel: nls.locAlize('configureKeyboArdLAyout', "Configure KeyboArd LAyout") };

		picks.unshift(configureKeyboArdLAyout);

		// Offer to "Auto Detect"
		const AutoDetectMode: IQuickPickItem = {
			lAbel: nls.locAlize('AutoDetect', "Auto Detect"),
			description: isAutoDetect ? `Current: ${pArseKeyboArdLAyoutDescription(currentLAyout).lAbel}` : undefined,
			picked: isAutoDetect ? true : undefined
		};

		picks.unshift(AutoDetectMode);

		const pick = AwAit this.quickInputService.pick(picks, { plAceHolder: nls.locAlize('pickKeyboArdLAyout', "Select KeyboArd LAyout"), mAtchOnDescription: true });
		if (!pick) {
			return;
		}

		if (pick === AutoDetectMode) {
			// set keymAp service to Auto mode
			this.configurAtionService.updAteVAlue('keyboArd.lAyout', 'Autodetect');
			return;
		}

		if (pick === configureKeyboArdLAyout) {
			const file = this.environmentService.keyboArdLAyoutResource;

			AwAit this.fileService.resolve(file).then(undefined, (error) => {
				return this.fileService.creAteFile(file, VSBuffer.fromString(KeyboArdLAyoutPickerAction.DEFAULT_CONTENT));
			}).then((stAt): Promise<IEditorPAne | undefined> | undefined => {
				if (!stAt) {
					return undefined;
				}
				return this.editorService.openEditor({
					resource: stAt.resource,
					mode: 'jsonc'
				});
			}, (error) => {
				throw new Error(nls.locAlize('fAil.creAteSettings', "UnAble to creAte '{0}' ({1}).", file.toString(), error));
			});

			return Promise.resolve();
		}

		this.configurAtionService.updAteVAlue('keyboArd.lAyout', getKeyboArdLAyoutId((<LAyoutQuickPickItem>pick).lAyout));
	}
}

const registry = Registry.As<IWorkbenchActionRegistry>(ActionExtensions.WorkbenchActions);
registry.registerWorkbenchAction(SyncActionDescriptor.from(KeyboArdLAyoutPickerAction, {}), 'Preferences: ChAnge KeyboArd LAyout', nls.locAlize('preferences', "Preferences"));
