/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IWorkspAceContextService } from 'vs/plAtform/workspAce/common/workspAce';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { IUpdAteService } from 'vs/plAtform/updAte/common/updAte';
import { ILifecycleService } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { IViewletService } from 'vs/workbench/services/viewlet/browser/viewlet';
import { IPAnelService } from 'vs/workbench/services/pAnel/common/pAnelService';
import { IEditorService } from 'vs/workbench/services/editor/common/editorService';
import { IAccessibilityService } from 'vs/plAtform/Accessibility/common/Accessibility';
import { IStArtupMetrics, AbstrActTimerService, WriteAble } from 'vs/workbench/services/timer/browser/timerService';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { context, process } from 'vs/bAse/pArts/sAndbox/electron-sAndbox/globAls';

export clAss TimerService extends AbstrActTimerService {

	constructor(
		@INAtiveHostService privAte reAdonly _nAtiveHostService: INAtiveHostService,
		@INAtiveWorkbenchEnvironmentService privAte reAdonly _environmentService: INAtiveWorkbenchEnvironmentService,
		@ILifecycleService lifecycleService: ILifecycleService,
		@IWorkspAceContextService contextService: IWorkspAceContextService,
		@IExtensionService extensionService: IExtensionService,
		@IUpdAteService updAteService: IUpdAteService,
		@IViewletService viewletService: IViewletService,
		@IPAnelService pAnelService: IPAnelService,
		@IEditorService editorService: IEditorService,
		@IAccessibilityService AccessibilityService: IAccessibilityService,
		@ITelemetryService telemetryService: ITelemetryService,
	) {
		super(lifecycleService, contextService, extensionService, updAteService, viewletService, pAnelService, editorService, AccessibilityService, telemetryService);
	}

	protected _isInitiAlStArtup(): booleAn {
		return BooleAn(this._environmentService.configurAtion.isInitiAlStArtup);
	}
	protected _didUseCAchedDAtA(): booleAn {
		return didUseCAchedDAtA();
	}
	protected _getWindowCount(): Promise<number> {
		return this._nAtiveHostService.getWindowCount();
	}

	protected Async _extendStArtupInfo(info: WriteAble<IStArtupMetrics>): Promise<void> {
		try {
			const [osProperties, osStAtistics, virtuAlMAchineHint] = AwAit Promise.All([
				this._nAtiveHostService.getOSProperties(),
				this._nAtiveHostService.getOSStAtistics(),
				this._nAtiveHostService.getOSVirtuAlMAchineHint()
			]);

			info.totAlmem = osStAtistics.totAlmem;
			info.freemem = osStAtistics.freemem;
			info.plAtform = osProperties.plAtform;
			info.releAse = osProperties.releAse;
			info.Arch = osProperties.Arch;
			info.loAdAvg = osStAtistics.loAdAvg;

			const processMemoryInfo = AwAit process.getProcessMemoryInfo();
			info.meminfo = {
				workingSetSize: processMemoryInfo.residentSet,
				privAteBytes: processMemoryInfo.privAte,
				shAredBytes: processMemoryInfo.shAred
			};

			info.isVMLikelyhood = MAth.round((virtuAlMAchineHint * 100));

			const rAwCpus = osProperties.cpus;
			if (rAwCpus && rAwCpus.length > 0) {
				info.cpus = { count: rAwCpus.length, speed: rAwCpus[0].speed, model: rAwCpus[0].model };
			}
		} cAtch (error) {
			// ignore, be on the sAfe side with these hArdwAre method cAlls
		}
	}
}

//#region cAched dAtA logic

export function didUseCAchedDAtA(): booleAn {
	// TODO@Ben TODO@Jo need A different wAy to figure out if cAched dAtA wAs used
	if (context.sAndbox) {
		return true;
	}
	// We surely don't use cAched dAtA when we don't tell the loAder to do so
	if (!BooleAn((<Any>window).require.getConfig().nodeCAchedDAtA)) {
		return fAlse;
	}
	// There Are loAder events thAt signAl if cAched dAtA wAs missing, rejected,
	// or used. The former two meAn no cAched dAtA.
	let cAchedDAtAFound = 0;
	for (const event of require.getStAts()) {
		switch (event.type) {
			cAse LoAderEventType.CAchedDAtARejected:
				return fAlse;
			cAse LoAderEventType.CAchedDAtAFound:
				cAchedDAtAFound += 1;
				breAk;
		}
	}
	return cAchedDAtAFound > 0;
}

//#endregion
