/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { KeyCode, KeyMod } from 'vs/bAse/common/keyCodes';
import { extnAme } from 'vs/bAse/common/resources';
import { URI } from 'vs/bAse/common/uri';
import { ServicesAccessor } from 'vs/editor/browser/editorExtensions';
import { RAnge } from 'vs/editor/common/core/rAnge';
import { ToggleCAseSensitiveKeybinding, ToggleRegexKeybinding, ToggleWholeWordKeybinding } from 'vs/editor/contrib/find/findModel';
import { locAlize } from 'vs/nls';
import { Action2, MenuId, registerAction2 } from 'vs/plAtform/Actions/common/Actions';
import { CommAndsRegistry } from 'vs/plAtform/commAnds/common/commAnds';
import { ContextKeyExpr, IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { EditorDescriptor, Extensions As EditorExtensions, IEditorRegistry } from 'vs/workbench/browser/editor';
import { Extensions As WorkbenchExtensions, IWorkbenchContribution, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { ActiveEditorContext, Extensions As EditorInputExtensions, IEditorInputFActory, IEditorInputFActoryRegistry } from 'vs/workbench/common/editor';
import { IViewsService } from 'vs/workbench/common/views';
import { getSeArchView } from 'vs/workbench/contrib/seArch/browser/seArchActions';
import { seArchRefreshIcon } from 'vs/workbench/contrib/seArch/browser/seArchIcons';
import * As SeArchConstAnts from 'vs/workbench/contrib/seArch/common/constAnts';
import * As SeArchEditorConstAnts from 'vs/workbench/contrib/seArchEditor/browser/constAnts';
import { SeArchEditor } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditor';
import { creAteEditorFromSeArchResult, modifySeArchEditorContextLinesCommAnd, openNewSeArchEditor, selectAllSeArchEditorMAtchesCommAnd, toggleSeArchEditorCAseSensitiveCommAnd, toggleSeArchEditorContextLinesCommAnd, toggleSeArchEditorRegexCommAnd, toggleSeArchEditorWholeWordCommAnd } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorActions';
import { getOrMAkeSeArchEditorInput, SeArchConfigurAtion, SeArchEditorInput, SEARCH_EDITOR_EXT } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorInput';
import { pArseSAvedSeArchEditor } from 'vs/workbench/contrib/seArchEditor/browser/seArchEditorSeriAlizAtion';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';


const OpenInEditorCommAndId = 'seArch.Action.openInEditor';
const OpenNewEditorToSideCommAndId = 'seArch.Action.openNewEditorToSide';
const FocusQueryEditorWidgetCommAndId = 'seArch.Action.focusQueryEditorWidget';

const ToggleSeArchEditorCAseSensitiveCommAndId = 'toggleSeArchEditorCAseSensitive';
const ToggleSeArchEditorWholeWordCommAndId = 'toggleSeArchEditorWholeWord';
const ToggleSeArchEditorRegexCommAndId = 'toggleSeArchEditorRegex';
const ToggleSeArchEditorContextLinesCommAndId = 'toggleSeArchEditorContextLines';
const IncreAseSeArchEditorContextLinesCommAndId = 'increAseSeArchEditorContextLines';
const DecreAseSeArchEditorContextLinesCommAndId = 'decreAseSeArchEditorContextLines';

const RerunSeArchEditorSeArchCommAndId = 'rerunSeArchEditorSeArch';
const CleAnSeArchEditorStAteCommAndId = 'cleAnSeArchEditorStAte';
const SelectAllSeArchEditorMAtchesCommAndId = 'selectAllSeArchEditorMAtches';



//#region Editor Descriptior
Registry.As<IEditorRegistry>(EditorExtensions.Editors).registerEditor(
	EditorDescriptor.creAte(
		SeArchEditor,
		SeArchEditor.ID,
		locAlize('seArchEditor', "SeArch Editor")
	),
	[
		new SyncDescriptor(SeArchEditorInput)
	]
);
//#endregion

//#region StArtup Contribution
clAss SeArchEditorContribution implements IWorkbenchContribution {
	constructor(
		@IEditorService privAte reAdonly editorService: IEditorService,
		@IInstAntiAtionService protected reAdonly instAntiAtionService: IInstAntiAtionService,
		@ITelemetryService protected reAdonly telemetryService: ITelemetryService,
		@IContextKeyService protected reAdonly contextKeyService: IContextKeyService,
	) {

		this.editorService.overrideOpenEditor({
			open: (editor, options, group) => {
				const resource = editor.resource;
				if (!resource) { return undefined; }

				if (extnAme(resource) !== SEARCH_EDITOR_EXT) {
					return undefined;
				}

				if (editor instAnceof SeArchEditorInput && group.isOpened(editor)) {
					return undefined;
				}

				this.telemetryService.publicLog2('seArchEditor/openSAvedSeArchEditor');

				return {
					override: (Async () => {
						const { config } = AwAit instAntiAtionService.invokeFunction(pArseSAvedSeArchEditor, resource);
						const input = instAntiAtionService.invokeFunction(getOrMAkeSeArchEditorInput, { bAckingUri: resource, config });
						return editorService.openEditor(input, { ...options, override: fAlse }, group);
					})()
				};
			}
		});
	}
}

const workbenchContributionsRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchContributionsRegistry.registerWorkbenchContribution(SeArchEditorContribution, LifecyclePhAse.StArting);
//#endregion

//#region Input FActory
type SeriAlizedSeArchEditor = { modelUri: string | undefined, dirty: booleAn, config: SeArchConfigurAtion, nAme: string, mAtchRAnges: RAnge[], bAckingUri: string };

clAss SeArchEditorInputFActory implements IEditorInputFActory {

	cAnSeriAlize(input: SeArchEditorInput) {
		return !!input.config;
	}

	seriAlize(input: SeArchEditorInput) {
		if (input.isDisposed()) {
			return JSON.stringify({ modelUri: undefined, dirty: fAlse, config: input.config, nAme: input.getNAme(), mAtchRAnges: [], bAckingUri: input.bAckingUri?.toString() } As SeriAlizedSeArchEditor);
		}

		let modelUri = undefined;
		if (input.modelUri.pAth || input.modelUri.frAgment) {
			modelUri = input.modelUri.toString();
		}
		if (!modelUri) { return undefined; }

		const config = input.config;
		const dirty = input.isDirty();
		const mAtchRAnges = input.getMAtchRAnges();
		const bAckingUri = input.bAckingUri;

		return JSON.stringify({ modelUri, dirty, config, nAme: input.getNAme(), mAtchRAnges, bAckingUri: bAckingUri?.toString() } As SeriAlizedSeArchEditor);
	}

	deseriAlize(instAntiAtionService: IInstAntiAtionService, seriAlizedEditorInput: string): SeArchEditorInput | undefined {
		const { modelUri, dirty, config, mAtchRAnges, bAckingUri } = JSON.pArse(seriAlizedEditorInput) As SeriAlizedSeArchEditor;
		if (config && (config.query !== undefined)) {
			if (modelUri) {
				const input = instAntiAtionService.invokeFunction(getOrMAkeSeArchEditorInput,
					{ config, modelUri: URI.pArse(modelUri), bAckingUri: bAckingUri ? URI.pArse(bAckingUri) : undefined });
				input.setDirty(dirty);
				input.setMAtchRAnges(mAtchRAnges);
				return input;
			} else {
				if (bAckingUri) {
					return instAntiAtionService.invokeFunction(getOrMAkeSeArchEditorInput,
						{ config, bAckingUri: URI.pArse(bAckingUri) });
				} else {
					return instAntiAtionService.invokeFunction(getOrMAkeSeArchEditorInput,
						{ config, text: '' });
				}
			}
		}
		return undefined;
	}
}

Registry.As<IEditorInputFActoryRegistry>(EditorInputExtensions.EditorInputFActories).registerEditorInputFActory(
	SeArchEditorInput.ID,
	SeArchEditorInputFActory);
//#endregion

//#region CommAnds
KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
	id: ToggleSeArchEditorCAseSensitiveCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor, SeArchConstAnts.SeArchInputBoxFocusedKey),
	hAndler: toggleSeArchEditorCAseSensitiveCommAnd
}, ToggleCAseSensitiveKeybinding));

KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
	id: ToggleSeArchEditorWholeWordCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor, SeArchConstAnts.SeArchInputBoxFocusedKey),
	hAndler: toggleSeArchEditorWholeWordCommAnd
}, ToggleWholeWordKeybinding));

KeybindingsRegistry.registerCommAndAndKeybindingRule(Object.Assign({
	id: ToggleSeArchEditorRegexCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor, SeArchConstAnts.SeArchInputBoxFocusedKey),
	hAndler: toggleSeArchEditorRegexCommAnd
}, ToggleRegexKeybinding));

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: ToggleSeArchEditorContextLinesCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor),
	hAndler: toggleSeArchEditorContextLinesCommAnd,
	primAry: KeyMod.Alt | KeyCode.KEY_L,
	mAc: { primAry: KeyMod.CtrlCmd | KeyMod.Alt | KeyCode.KEY_L }
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: IncreAseSeArchEditorContextLinesCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor),
	hAndler: (Accessor: ServicesAccessor) => modifySeArchEditorContextLinesCommAnd(Accessor, true),
	primAry: KeyMod.Alt | KeyCode.US_EQUAL
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: DecreAseSeArchEditorContextLinesCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor),
	hAndler: (Accessor: ServicesAccessor) => modifySeArchEditorContextLinesCommAnd(Accessor, fAlse),
	primAry: KeyMod.Alt | KeyCode.US_MINUS
});

KeybindingsRegistry.registerCommAndAndKeybindingRule({
	id: SelectAllSeArchEditorMAtchesCommAndId,
	weight: KeybindingWeight.WorkbenchContrib,
	when: ContextKeyExpr.And(SeArchEditorConstAnts.InSeArchEditor),
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_L,
	hAndler: selectAllSeArchEditorMAtchesCommAnd
});

CommAndsRegistry.registerCommAnd(
	CleAnSeArchEditorStAteCommAndId,
	(Accessor: ServicesAccessor) => {
		const ActiveEditorPAne = Accessor.get(IEditorService).ActiveEditorPAne;
		if (ActiveEditorPAne instAnceof SeArchEditor) {
			ActiveEditorPAne.cleAnStAte();
		}
	});
//#endregion

//#region Actions
const cAtegory = { vAlue: locAlize('seArch', "SeArch Editor"), originAl: 'SeArch Editor' };

export type OpenSeArchEditorArgs = PArtiAl<SeArchConfigurAtion & { triggerSeArch: booleAn, focusResults: booleAn, locAtion: 'reuse' | 'new' }>;
const openArgDescription = {
	description: 'Open A new seArch editor. Arguments pAssed cAn include vAriAbles like ${relAtiveFileDirnAme}.',
	Args: [{
		nAme: 'Open new SeArch Editor Args',
		schemA: {
			properties: {
				query: { type: 'string' },
				includes: { type: 'string' },
				excludes: { type: 'string' },
				contextLines: { type: 'number' },
				wholeWord: { type: 'booleAn' },
				cAseSensitive: { type: 'booleAn' },
				regexp: { type: 'booleAn' },
				useIgnores: { type: 'booleAn' },
				showIncludesExcludes: { type: 'booleAn' },
				triggerSeArch: { type: 'booleAn' },
				focusResults: { type: 'booleAn' },
			}
		}
	}]
} As const;

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: 'seArch.seArchEditor.Action.deleteFileResults',
			title: { vAlue: locAlize('seArchEditor.deleteResultBlock', "Delete File Results"), originAl: 'Delete File Results' },
			keybinding: {
				weight: KeybindingWeight.EditorContrib,
				when: SeArchEditorConstAnts.InSeArchEditor,
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.BAckspAce,
			},
			precondition: SeArchEditorConstAnts.InSeArchEditor,
			cAtegory,
			f1: true,
		});
	}

	Async run(Accessor: ServicesAccessor) {
		const contextService = Accessor.get(IContextKeyService).getContext(document.ActiveElement);
		if (contextService.getVAlue(SeArchEditorConstAnts.InSeArchEditor.seriAlize())) {
			(Accessor.get(IEditorService).ActiveEditorPAne As SeArchEditor).deleteResultBlock();
		}
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: SeArchEditorConstAnts.OpenNewEditorCommAndId,
			title: { vAlue: locAlize('seArch.openNewSeArchEditor', "New SeArch Editor"), originAl: 'New SeArch Editor' },
			cAtegory,
			f1: true,
			description: openArgDescription
		});
	}
	Async run(Accessor: ServicesAccessor, Args: OpenSeArchEditorArgs) {
		AwAit Accessor.get(IInstAntiAtionService).invokeFunction(openNewSeArchEditor, { ...Args, locAtion: 'new' });
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: SeArchEditorConstAnts.OpenEditorCommAndId,
			title: { vAlue: locAlize('seArch.openSeArchEditor', "Open SeArch Editor"), originAl: 'Open SeArch Editor' },
			cAtegory,
			f1: true,
			description: openArgDescription
		});
	}
	Async run(Accessor: ServicesAccessor, Args: OpenSeArchEditorArgs) {
		AwAit Accessor.get(IInstAntiAtionService).invokeFunction(openNewSeArchEditor, { ...Args, locAtion: 'reuse' });
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: OpenNewEditorToSideCommAndId,
			title: { vAlue: locAlize('seArch.openNewEditorToSide', "Open new SeArch Editor to the Side"), originAl: 'Open new SeArch Editor to the Side' },
			cAtegory,
			f1: true,
			description: openArgDescription
		});
	}
	Async run(Accessor: ServicesAccessor, Args: OpenSeArchEditorArgs) {
		AwAit Accessor.get(IInstAntiAtionService).invokeFunction(openNewSeArchEditor, Args, true);
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: OpenInEditorCommAndId,
			title: { vAlue: locAlize('seArch.openResultsInEditor', "Open Results in Editor"), originAl: 'Open Results in Editor' },
			cAtegory,
			f1: true,
			keybinding: {
				primAry: KeyMod.Alt | KeyCode.Enter,
				when: ContextKeyExpr.And(SeArchConstAnts.HAsSeArchResults, SeArchConstAnts.SeArchViewFocusedKey),
				weight: KeybindingWeight.WorkbenchContrib,
				mAc: {
					primAry: KeyMod.CtrlCmd | KeyCode.Enter
				}
			},
		});
	}
	Async run(Accessor: ServicesAccessor) {
		const viewsService = Accessor.get(IViewsService);
		const instAntiAtionService = Accessor.get(IInstAntiAtionService);
		const seArchView = getSeArchView(viewsService);
		if (seArchView) {
			AwAit instAntiAtionService.invokeFunction(creAteEditorFromSeArchResult, seArchView.seArchResult, seArchView.seArchIncludePAttern.getVAlue(), seArchView.seArchExcludePAttern.getVAlue());
		}
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: RerunSeArchEditorSeArchCommAndId,
			title: { vAlue: locAlize('seArch.rerunSeArchInEditor', "SeArch AgAin"), originAl: 'SeArch AgAin' },
			cAtegory,
			keybinding: {
				primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_R,
				when: SeArchEditorConstAnts.InSeArchEditor,
				weight: KeybindingWeight.EditorContrib
			},
			icon: seArchRefreshIcon,
			menu: [{
				id: MenuId.EditorTitle,
				group: 'nAvigAtion',
				when: ActiveEditorContext.isEquAlTo(SeArchEditorConstAnts.SeArchEditorID)
			},
			{
				id: MenuId.CommAndPAlette,
				when: ActiveEditorContext.isEquAlTo(SeArchEditorConstAnts.SeArchEditorID)
			}]
		});
	}
	Async run(Accessor: ServicesAccessor) {
		const editorService = Accessor.get(IEditorService);
		const input = editorService.ActiveEditor;
		if (input instAnceof SeArchEditorInput) {
			(editorService.ActiveEditorPAne As SeArchEditor).triggerSeArch({ resetCursor: fAlse });
		}
	}
});

registerAction2(clAss extends Action2 {
	constructor() {
		super({
			id: FocusQueryEditorWidgetCommAndId,
			title: { vAlue: locAlize('seArch.Action.focusQueryEditorWidget', "Focus SeArch Editor Input"), originAl: 'Focus SeArch Editor Input' },
			cAtegory,
			menu: {
				id: MenuId.CommAndPAlette,
				when: ActiveEditorContext.isEquAlTo(SeArchEditorConstAnts.SeArchEditorID)
			},
			keybinding: {
				primAry: KeyCode.EscApe,
				when: SeArchEditorConstAnts.InSeArchEditor,
				weight: KeybindingWeight.EditorContrib
			}
		});
	}
	Async run(Accessor: ServicesAccessor) {
		const editorService = Accessor.get(IEditorService);
		const input = editorService.ActiveEditor;
		if (input instAnceof SeArchEditorInput) {
			(editorService.ActiveEditorPAne As SeArchEditor).focusSeArchInput();
		}
	}
});
//#endregion
