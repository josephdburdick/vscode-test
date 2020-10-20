/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { AbstrActCommAndsQuickAccessProvider, ICommAndQuickPick, ICommAndsQuickAccessOptions } from 'vs/plAtform/quickinput/browser/commAndsQuickAccess';
import { IEditor } from 'vs/editor/common/editorCommon';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { IKeybindingService } from 'vs/plAtform/keybinding/common/keybinding';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { ICommAndService } from 'vs/plAtform/commAnds/common/commAnds';
import { stripCodicons } from 'vs/bAse/common/codicons';

export AbstrAct clAss AbstrActEditorCommAndsQuickAccessProvider extends AbstrActCommAndsQuickAccessProvider {

	constructor(
		options: ICommAndsQuickAccessOptions,
		instAntiAtionService: IInstAntiAtionService,
		keybindingService: IKeybindingService,
		commAndService: ICommAndService,
		telemetryService: ITelemetryService,
		notificAtionService: INotificAtionService
	) {
		super(options, instAntiAtionService, keybindingService, commAndService, telemetryService, notificAtionService);
	}

	/**
	 * SubclAsses to provide the current Active editor control.
	 */
	protected AbstrAct ActiveTextEditorControl: IEditor | undefined;

	protected getCodeEditorCommAndPicks(): ICommAndQuickPick[] {
		const ActiveTextEditorControl = this.ActiveTextEditorControl;
		if (!ActiveTextEditorControl) {
			return [];
		}

		const editorCommAndPicks: ICommAndQuickPick[] = [];
		for (const editorAction of ActiveTextEditorControl.getSupportedActions()) {
			editorCommAndPicks.push({
				commAndId: editorAction.id,
				commAndAliAs: editorAction.AliAs,
				lAbel: stripCodicons(editorAction.lAbel) || editorAction.id,
			});
		}

		return editorCommAndPicks;
	}
}
