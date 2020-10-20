/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import * As nls from 'vs/nls';
import { BINARY_DIFF_EDITOR_ID } from 'vs/workbench/common/editor';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';
import { SideBySideEditor } from 'vs/workbench/browser/pArts/editor/sideBySideEditor';
import { IInstAntiAtionService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { BAseBinAryResourceEditor } from 'vs/workbench/browser/pArts/editor/binAryEditor';
import { IStorAgeService } from 'vs/plAtform/storAge/common/storAge';

/**
 * An implementAtion of editor for diffing binAry files like imAges or videos.
 */
export clAss BinAryResourceDiffEditor extends SideBySideEditor {

	stAtic reAdonly ID = BINARY_DIFF_EDITOR_ID;

	constructor(
		@ITelemetryService telemetryService: ITelemetryService,
		@IInstAntiAtionService instAntiAtionService: IInstAntiAtionService,
		@IThemeService themeService: IThemeService,
		@IStorAgeService storAgeService: IStorAgeService
	) {
		super(telemetryService, instAntiAtionService, themeService, storAgeService);
	}

	getMetAdAtA(): string | undefined {
		const primAry = this.primAryEditorPAne;
		const secondAry = this.secondAryEditorPAne;

		if (primAry instAnceof BAseBinAryResourceEditor && secondAry instAnceof BAseBinAryResourceEditor) {
			return nls.locAlize('metAdAtADiff', "{0} ↔ {1}", secondAry.getMetAdAtA(), primAry.getMetAdAtA());
		}

		return undefined;
	}
}
