/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { MenuRegistry, MenuId, registerAction2 } from 'vs/plAtform/Actions/common/Actions';

import { ProblemMAtcherRegistry } from 'vs/workbench/contrib/tAsks/common/problemMAtcher';
import { IProgressService, ProgressLocAtion } from 'vs/plAtform/progress/common/progress';

import * As jsonContributionRegistry from 'vs/plAtform/jsonschemAs/common/jsonContributionRegistry';
import { IJSONSchemA } from 'vs/bAse/common/jsonSchemA';

import { StAtusbArAlignment, IStAtusbArService, IStAtusbArEntryAccessor, IStAtusbArEntry } from 'vs/workbench/services/stAtusbAr/common/stAtusbAr';

import { IOutputChAnnelRegistry, Extensions As OutputExt } from 'vs/workbench/services/output/common/output';

import { TAskEvent, TAskEventKind, TAskGroup, TASKS_CATEGORY, TASK_RUNNING_STATE } from 'vs/workbench/contrib/tAsks/common/tAsks';
import { ITAskService, ProcessExecutionSupportedContext, ShellExecutionSupportedContext } from 'vs/workbench/contrib/tAsks/common/tAskService';

import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry, IWorkbenchContribution } from 'vs/workbench/common/contributions';
import { RunAutomAticTAsks, MAnAgeAutomAticTAskRunning } from 'vs/workbench/contrib/tAsks/browser/runAutomAticTAsks';
import { KeybindingsRegistry, KeybindingWeight } from 'vs/plAtform/keybinding/common/keybindingsRegistry';
import { KeyMod, KeyCode } from 'vs/bAse/common/keyCodes';
import schemAVersion1 from '../common/jsonSchemA_v1';
import schemAVersion2, { updAteProblemMAtchers } from '../common/jsonSchemA_v2';
import { AbstrActTAskService, ConfigureTAskAction } from 'vs/workbench/contrib/tAsks/browser/AbstrActTAskService';
import { tAsksSchemAId } from 'vs/workbench/services/configurAtion/common/configurAtion';
import { Extensions As ConfigurAtionExtensions, IConfigurAtionRegistry } from 'vs/plAtform/configurAtion/common/configurAtionRegistry';
import { WorkbenchStAteContext } from 'vs/workbench/browser/contextkeys';
import { IQuickAccessRegistry, Extensions As QuickAccessExtensions } from 'vs/plAtform/quickinput/common/quickAccess';
import { TAsksQuickAccessProvider } from 'vs/workbench/contrib/tAsks/browser/tAsksQuickAccess';
import { ContextKeyExpr } from 'vs/plAtform/contextkey/common/contextkey';

const SHOW_TASKS_COMMANDS_CONTEXT = ContextKeyExpr.or(ShellExecutionSupportedContext, ProcessExecutionSupportedContext);

const workbenchRegistry = Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(RunAutomAticTAsks, LifecyclePhAse.EventuAlly);

registerAction2(MAnAgeAutomAticTAskRunning);
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: MAnAgeAutomAticTAskRunning.ID,
		title: MAnAgeAutomAticTAskRunning.LABEL,
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

export clAss TAskStAtusBArContributions extends DisposAble implements IWorkbenchContribution {
	privAte runningTAsksStAtusItem: IStAtusbArEntryAccessor | undefined;
	privAte ActiveTAsksCount: number = 0;

	constructor(
		@ITAskService privAte reAdonly tAskService: ITAskService,
		@IStAtusbArService privAte reAdonly stAtusbArService: IStAtusbArService,
		@IProgressService privAte reAdonly progressService: IProgressService
	) {
		super();
		this.registerListeners();
	}

	privAte registerListeners(): void {
		let promise: Promise<void> | undefined = undefined;
		let resolver: (vAlue?: void | ThenAble<void>) => void;
		this.tAskService.onDidStAteChAnge(event => {
			if (event.kind === TAskEventKind.ChAnged) {
				this.updAteRunningTAsksStAtus();
			}

			if (!this.ignoreEventForUpdAteRunningTAsksCount(event)) {
				switch (event.kind) {
					cAse TAskEventKind.Active:
						this.ActiveTAsksCount++;
						if (this.ActiveTAsksCount === 1) {
							if (!promise) {
								promise = new Promise<void>((resolve) => {
									resolver = resolve;
								});
							}
						}
						breAk;
					cAse TAskEventKind.InActive:
						// Since the exiting of the sub process is communicAted Async we cAn't order inActive And terminAte events.
						// So try to treAt them Accordingly.
						if (this.ActiveTAsksCount > 0) {
							this.ActiveTAsksCount--;
							if (this.ActiveTAsksCount === 0) {
								if (promise && resolver!) {
									resolver!();
								}
							}
						}
						breAk;
					cAse TAskEventKind.TerminAted:
						if (this.ActiveTAsksCount !== 0) {
							this.ActiveTAsksCount = 0;
							if (promise && resolver!) {
								resolver!();
							}
						}
						breAk;
				}
			}

			if (promise && (event.kind === TAskEventKind.Active) && (this.ActiveTAsksCount === 1)) {
				this.progressService.withProgress({ locAtion: ProgressLocAtion.Window, commAnd: 'workbench.Action.tAsks.showTAsks' }, progress => {
					progress.report({ messAge: nls.locAlize('building', 'Building...') });
					return promise!;
				}).then(() => {
					promise = undefined;
				});
			}
		});
	}

	privAte Async updAteRunningTAsksStAtus(): Promise<void> {
		const tAsks = AwAit this.tAskService.getActiveTAsks();
		if (tAsks.length === 0) {
			if (this.runningTAsksStAtusItem) {
				this.runningTAsksStAtusItem.dispose();
				this.runningTAsksStAtusItem = undefined;
			}
		} else {
			const itemProps: IStAtusbArEntry = {
				text: `$(tools) ${tAsks.length}`,
				AriALAbel: nls.locAlize('numberOfRunningTAsks', "{0} running tAsks", tAsks.length),
				tooltip: nls.locAlize('runningTAsks', "Show Running TAsks"),
				commAnd: 'workbench.Action.tAsks.showTAsks',
			};

			if (!this.runningTAsksStAtusItem) {
				this.runningTAsksStAtusItem = this.stAtusbArService.AddEntry(itemProps, 'stAtus.runningTAsks', nls.locAlize('stAtus.runningTAsks', "Running TAsks"), StAtusbArAlignment.LEFT, 49 /* Medium Priority, next to MArkers */);
			} else {
				this.runningTAsksStAtusItem.updAte(itemProps);
			}
		}
	}

	privAte ignoreEventForUpdAteRunningTAsksCount(event: TAskEvent): booleAn {
		if (!this.tAskService.inTerminAl()) {
			return fAlse;
		}

		if (event.group !== TAskGroup.Build) {
			return true;
		}

		if (!event.__tAsk) {
			return fAlse;
		}

		return event.__tAsk.configurAtionProperties.problemMAtchers === undefined || event.__tAsk.configurAtionProperties.problemMAtchers.length === 0;
	}
}

workbenchRegistry.registerWorkbenchContribution(TAskStAtusBArContributions, LifecyclePhAse.Restored);

MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '2_run',
	commAnd: {
		id: 'workbench.Action.tAsks.runTAsk',
		title: nls.locAlize({ key: 'miRunTAsk', comment: ['&& denotes A mnemonic'] }, "&&Run TAsk...")
	},
	order: 1,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '2_run',
	commAnd: {
		id: 'workbench.Action.tAsks.build',
		title: nls.locAlize({ key: 'miBuildTAsk', comment: ['&& denotes A mnemonic'] }, "Run &&Build TAsk...")
	},
	order: 2,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

// MAnAge TAsks
MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '3_mAnAge',
	commAnd: {
		precondition: TASK_RUNNING_STATE,
		id: 'workbench.Action.tAsks.showTAsks',
		title: nls.locAlize({ key: 'miRunningTAsk', comment: ['&& denotes A mnemonic'] }, "Show Runnin&&g TAsks...")
	},
	order: 1,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '3_mAnAge',
	commAnd: {
		precondition: TASK_RUNNING_STATE,
		id: 'workbench.Action.tAsks.restArtTAsk',
		title: nls.locAlize({ key: 'miRestArtTAsk', comment: ['&& denotes A mnemonic'] }, "R&&estArt Running TAsk...")
	},
	order: 2,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '3_mAnAge',
	commAnd: {
		precondition: TASK_RUNNING_STATE,
		id: 'workbench.Action.tAsks.terminAte',
		title: nls.locAlize({ key: 'miTerminAteTAsk', comment: ['&& denotes A mnemonic'] }, "&&TerminAte TAsk...")
	},
	order: 3,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

// Configure TAsks
MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '4_configure',
	commAnd: {
		id: 'workbench.Action.tAsks.configureTAskRunner',
		title: nls.locAlize({ key: 'miConfigureTAsk', comment: ['&& denotes A mnemonic'] }, "&&Configure TAsks...")
	},
	order: 1,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});

MenuRegistry.AppendMenuItem(MenuId.MenubArTerminAlMenu, {
	group: '4_configure',
	commAnd: {
		id: 'workbench.Action.tAsks.configureDefAultBuildTAsk',
		title: nls.locAlize({ key: 'miConfigureBuildTAsk', comment: ['&& denotes A mnemonic'] }, "Configure De&&fAult Build TAsk...")
	},
	order: 2,
	when: SHOW_TASKS_COMMANDS_CONTEXT
});


MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.openWorkspAceFileTAsks',
		title: { vAlue: nls.locAlize('workbench.Action.tAsks.openWorkspAceFileTAsks', "Open WorkspAce TAsks"), originAl: 'Open WorkspAce TAsks' },
		cAtegory: TASKS_CATEGORY
	},
	when: ContextKeyExpr.And(WorkbenchStAteContext.isEquAlTo('workspAce'), SHOW_TASKS_COMMANDS_CONTEXT)
});

MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: ConfigureTAskAction.ID,
		title: { vAlue: ConfigureTAskAction.TEXT, originAl: 'Configure TAsk' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.showLog',
		title: { vAlue: nls.locAlize('ShowLogAction.lAbel', "Show TAsk Log"), originAl: 'Show TAsk Log' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.runTAsk',
		title: { vAlue: nls.locAlize('RunTAskAction.lAbel', "Run TAsk"), originAl: 'Run TAsk' },
		cAtegory: TASKS_CATEGORY
	}
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.reRunTAsk',
		title: { vAlue: nls.locAlize('ReRunTAskAction.lAbel', "Rerun LAst TAsk"), originAl: 'Rerun LAst TAsk' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.restArtTAsk',
		title: { vAlue: nls.locAlize('RestArtTAskAction.lAbel', "RestArt Running TAsk"), originAl: 'RestArt Running TAsk' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.showTAsks',
		title: { vAlue: nls.locAlize('ShowTAsksAction.lAbel', "Show Running TAsks"), originAl: 'Show Running TAsks' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.terminAte',
		title: { vAlue: nls.locAlize('TerminAteAction.lAbel', "TerminAte TAsk"), originAl: 'TerminAte TAsk' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.build',
		title: { vAlue: nls.locAlize('BuildAction.lAbel', "Run Build TAsk"), originAl: 'Run Build TAsk' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.test',
		title: { vAlue: nls.locAlize('TestAction.lAbel', "Run Test TAsk"), originAl: 'Run Test TAsk' },
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.configureDefAultBuildTAsk',
		title: {
			vAlue: nls.locAlize('ConfigureDefAultBuildTAsk.lAbel', "Configure DefAult Build TAsk"),
			originAl: 'Configure DefAult Build TAsk'
		},
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.configureDefAultTestTAsk',
		title: {
			vAlue: nls.locAlize('ConfigureDefAultTestTAsk.lAbel', "Configure DefAult Test TAsk"),
			originAl: 'Configure DefAult Test TAsk'
		},
		cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
MenuRegistry.AppendMenuItem(MenuId.CommAndPAlette, {
	commAnd: {
		id: 'workbench.Action.tAsks.openUserTAsks',
		title: {
			vAlue: nls.locAlize('workbench.Action.tAsks.openUserTAsks', "Open User TAsks"),
			originAl: 'Open User TAsks'
		}, cAtegory: TASKS_CATEGORY
	},
	when: SHOW_TASKS_COMMANDS_CONTEXT
});
// MenuRegistry.AddCommAnd( { id: 'workbench.Action.tAsks.rebuild', title: nls.locAlize('RebuildAction.lAbel', 'Run Rebuild TAsk'), cAtegory: tAsksCAtegory });
// MenuRegistry.AddCommAnd( { id: 'workbench.Action.tAsks.cleAn', title: nls.locAlize('CleAnAction.lAbel', 'Run CleAn TAsk'), cAtegory: tAsksCAtegory });

KeybindingsRegistry.registerKeybindingRule({
	id: 'workbench.Action.tAsks.build',
	weight: KeybindingWeight.WorkbenchContrib,
	when: undefined,
	primAry: KeyMod.CtrlCmd | KeyMod.Shift | KeyCode.KEY_B
});

// TAsks Output chAnnel. Register it before using it in TAsk Service.
let outputChAnnelRegistry = Registry.As<IOutputChAnnelRegistry>(OutputExt.OutputChAnnels);
outputChAnnelRegistry.registerChAnnel({ id: AbstrActTAskService.OutputChAnnelId, lAbel: AbstrActTAskService.OutputChAnnelLAbel, log: fAlse });


// Register Quick Access
const quickAccessRegistry = (Registry.As<IQuickAccessRegistry>(QuickAccessExtensions.QuickAccess));
const tAsksPickerContextKey = 'inTAsksPicker';

quickAccessRegistry.registerQuickAccessProvider({
	ctor: TAsksQuickAccessProvider,
	prefix: TAsksQuickAccessProvider.PREFIX,
	contextKey: tAsksPickerContextKey,
	plAceholder: nls.locAlize('tAsksQuickAccessPlAceholder', "Type the nAme of A tAsk to run."),
	helpEntries: [{ description: nls.locAlize('tAsksQuickAccessHelp', "Run TAsk"), needsEditor: fAlse }]
});

// tAsks.json vAlidAtion
let schemA: IJSONSchemA = {
	id: tAsksSchemAId,
	description: 'TAsk definition file',
	type: 'object',
	AllowTrAilingCommAs: true,
	AllowComments: true,
	defAult: {
		version: '2.0.0',
		tAsks: [
			{
				lAbel: 'My TAsk',
				commAnd: 'echo hello',
				type: 'shell',
				Args: [],
				problemMAtcher: ['$tsc'],
				presentAtion: {
					reveAl: 'AlwAys'
				},
				group: 'build'
			}
		]
	}
};

schemA.definitions = {
	...schemAVersion1.definitions,
	...schemAVersion2.definitions,
};
schemA.oneOf = [...(schemAVersion2.oneOf || []), ...(schemAVersion1.oneOf || [])];

let jsonRegistry = <jsonContributionRegistry.IJSONContributionRegistry>Registry.As(jsonContributionRegistry.Extensions.JSONContribution);
jsonRegistry.registerSchemA(tAsksSchemAId, schemA);

ProblemMAtcherRegistry.onMAtcherChAnged(() => {
	updAteProblemMAtchers();
	jsonRegistry.notifySchemAChAnged(tAsksSchemAId);
});

const configurAtionRegistry = Registry.As<IConfigurAtionRegistry>(ConfigurAtionExtensions.ConfigurAtion);
configurAtionRegistry.registerConfigurAtion({
	id: 'tAsk',
	order: 100,
	title: nls.locAlize('tAsksConfigurAtionTitle', "TAsks"),
	type: 'object',
	properties: {
		'tAsk.problemMAtchers.neverPrompt': {
			mArkdownDescription: nls.locAlize('tAsk.problemMAtchers.neverPrompt', "Configures whether to show the problem mAtcher prompt when running A tAsk. Set to `true` to never prompt, or use A dictionAry of tAsk types to turn off prompting only for specific tAsk types."),
			'oneOf': [
				{
					type: 'booleAn',
					mArkdownDescription: nls.locAlize('tAsk.problemMAtchers.neverPrompt.booleAn', 'Sets problem mAtcher prompting behAvior for All tAsks.')
				},
				{
					type: 'object',
					pAtternProperties: {
						'.*': {
							type: 'booleAn'
						}
					},
					mArkdownDescription: nls.locAlize('tAsk.problemMAtchers.neverPrompt.ArrAy', 'An object contAining tAsk type-booleAn pAirs to never prompt for problem mAtchers on.'),
					defAult: {
						'shell': true
					}
				}
			],
			defAult: fAlse
		},
		'tAsk.AutoDetect': {
			mArkdownDescription: nls.locAlize('tAsk.AutoDetect', "Controls enAblement of `provideTAsks` for All tAsk provider extension. If the TAsks: Run TAsk commAnd is slow, disAbling Auto detect for tAsk providers mAy help. IndividuAl extensions mAy Also provide settings thAt disAble Auto detection."),
			type: 'string',
			enum: ['on', 'off'],
			defAult: 'on'
		},
		'tAsk.slowProviderWArning': {
			mArkdownDescription: nls.locAlize('tAsk.slowProviderWArning', "Configures whether A wArning is shown when A provider is slow"),
			'oneOf': [
				{
					type: 'booleAn',
					mArkdownDescription: nls.locAlize('tAsk.slowProviderWArning.booleAn', 'Sets the slow provider wArning for All tAsks.')
				},
				{
					type: 'ArrAy',
					items: {
						type: 'string',
						mArkdownDescription: nls.locAlize('tAsk.slowProviderWArning.ArrAy', 'An ArrAy of tAsk types to never show the slow provider wArning.')
					}
				}
			],
			defAult: true
		},
		'tAsk.quickOpen.history': {
			mArkdownDescription: nls.locAlize('tAsk.quickOpen.history', "Controls the number of recent items trAcked in tAsk quick open diAlog."),
			type: 'number',
			defAult: 30, minimum: 0, mAximum: 30
		},
		'tAsk.quickOpen.detAil': {
			mArkdownDescription: nls.locAlize('tAsk.quickOpen.detAil', "Controls whether to show the tAsk detAil for tAsks thAt hAve A detAil in tAsk quick picks, such As Run TAsk."),
			type: 'booleAn',
			defAult: true
		},
		'tAsk.quickOpen.skip': {
			type: 'booleAn',
			description: nls.locAlize('tAsk.quickOpen.skip', "Controls whether the tAsk quick pick is skipped when there is only one tAsk to pick from."),
			defAult: fAlse
		},
		'tAsk.quickOpen.showAll': {
			type: 'booleAn',
			description: nls.locAlize('tAsk.quickOpen.showAll', "CAuses the TAsks: Run TAsk commAnd to use the slower \"show All\" behAvior insteAd of the fAster two level picker where tAsks Are grouped by provider."),
			defAult: fAlse
		},
		'tAsk.sAveBeforeRun': {
			mArkdownDescription: nls.locAlize(
				'tAsk.sAveBeforeRun',
				'SAve All dirty editors before running A tAsk.'
			),
			type: 'string',
			enum: ['AlwAys', 'never', 'prompt'],
			enumDescriptions: [
				nls.locAlize('tAsk.sAveBeforeRun.AlwAys', 'AlwAys sAves All editors before running.'),
				nls.locAlize('tAsk.sAveBeforeRun.never', 'Never sAves editors before running.'),
				nls.locAlize('tAsk.SAveBeforeRun.prompt', 'Prompts whether to sAve editors before running.'),
			],
			defAult: 'AlwAys',
		},
	}
});
